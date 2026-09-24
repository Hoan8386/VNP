/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/cache', 'N/redirect', 'N/runtime', 'N/search', 'N/task', 'N/ui/message', 'N/ui/serverWidget',
        '../common/scv_common_txn_exe.js', '../lib/scv_lib_report.js'],

    (cache, redirect, runtime, search, task, message, serverWidget, cmTxnExe, libRep) => {

        const SavedSearch = {
            TXN_MAPPING_CONFIG_FILTER: 'customsearch_scv_txn_mapping_config_ft',
            TXN_MAPPING_CONFIG_DEFAULT: 'customsearch_scv_txn_mapping_config_df'
        }

        const isSuitecloudUser = () => {
            let userEmail = runtime.getCurrentUser().email;
            return !!(userEmail && userEmail.endsWith('suitecloud.vn'));
        }
        
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            let parameters = scriptContext.request.parameters;
            if (parameters.isExport === 'T') {
                let bodyResponse = getDataExport(parameters);
                scriptContext.response.setHeader({
                    name: 'Content-Type',
                    value: 'application/json'
                });
                scriptContext.response.write(JSON.stringify(bodyResponse));
            } else {
                let {myCache, iscomplete, messageInfo} = getMessage(parameters);
                if (scriptContext.request.method === 'POST') {
                    ({messageInfo} = createTask(parameters, myCache, iscomplete));
                    let listTxnConfigFilters = parameters.custpage_data_filter_config;
                    let params = {custpage_txn_config: parameters.custpage_txn_config};
                    if (listTxnConfigFilters) {
                        listTxnConfigFilters = JSON.parse(listTxnConfigFilters);
                        for(let objFilter of listTxnConfigFilters) {
                            params[objFilter.id] = parameters[objFilter.id];
                        }
                    }
                    redirect.toSuitelet({
                        scriptId: 'customscript_scv_sl_txn_exe',
                        deploymentId: 'customdeploy_scv_sl_txn_exe',
                        isExternal: false,
                        parameters: params
                    });
                }
                
                let form = createForm(parameters, iscomplete);
                if (messageInfo) {
                    form.addPageInitMessage({type: message.Type.INFORMATION, message: messageInfo});
                }
                scriptContext.response.writePage(form);
            }
        }
        
        const getDataExport = (parameters) => {
            let txn_config = parameters.custpage_txn_config;
            let listTxnMappingConfig = cmTxnExe.getListTxnMappingConfig(txn_config);
            let objDataFromSource = null, listDataJoinSource = null;
            let listTxnMappingConfigSource = cmTxnExe.getListTxnMappingConfigSource(txn_config);
            if (listTxnMappingConfigSource.length > 0) {
                objDataFromSource = cmTxnExe.getDataFromTxnMappingConfigSource(listTxnMappingConfigSource, parameters);
                try {
                    listDataJoinSource = cmTxnExe.buildJoinSource(listTxnMappingConfig[0], listTxnMappingConfigSource, objDataFromSource, parameters);
                } catch (e) {
                    log.error('getDataExport exception', e);
                    listDataJoinSource = e;
                }
            }
            
            return {objDataFromSource, listDataJoinSource};
        }
        
        const createForm = (parameters, iscomplete) => {
            let formTitle = 'TXN EXCUTE FUNCTION';
            if (parameters.custpage_txn_group) {
                let txnGroupLKF = search.lookupFields({
                    type: 'customlist_scv_txcf_group_type',
                    id: parameters.custpage_txn_group,
                    columns: ['name']
                });
                if (txnGroupLKF && txnGroupLKF.name) {
                    formTitle = String(txnGroupLKF.name).toUpperCase();
                }
            }
            let form = serverWidget.createForm({
                title: formTitle
            });
            form.clientScriptModulePath = '../cssl/scv_cs_sl_txn_exe.js';
            
            let filterGroupId = 'custpage_mailgroup', defaultGroupId = 'custpage_defaultgroup';
            form.addFieldGroup({id: filterGroupId, label: 'Main'});
            form.addFieldGroup({id: defaultGroupId, label: 'Default Value'});
            if(iscomplete) {
                form.addSubmitButton({label: 'Submit'});
            }

            let fieldTxnGroup = form.addField({
                id: 'custpage_txn_group',
                type: serverWidget.FieldType.SELECT,
                label: 'Txn Group',
                container: filterGroupId,
                source: 'customlist_scv_txcf_group_type'
            });
            fieldTxnGroup.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});

            let fieldTxnConfig = form.addField({
                id: 'custpage_txn_config',
                type: serverWidget.FieldType.SELECT,
                label: 'Txn Type',
                container: filterGroupId,
                //source: cmTxnExe.RecordType.TXN_MAPPING_CONFIG
            });
            fieldTxnConfig.isMandatory = true;
            let sqlTxnConfig = `SELECT cf.id value, cf.name text, cf.custrecord_scv_txcf_rp_column, cf.custrecord_scv_txcf_rp_temp, cf.custrecord_scv_txcf_header_field, 
                cf.custrecord_scv_txcf_line_field, f.url temp_url FROM ${cmTxnExe.RecordType.TXN_MAPPING_CONFIG} cf left join file f  on cf.custrecord_scv_txcf_rp_temp = f.id  
                WHERE cf.isinactive = 'F' and cf.custrecord_scv_txcf_config_type = '${cmTxnExe.ConfigType.RECORD}'
                ${parameters.custpage_txn_group ? ' and cf.custrecord_scv_txcf_group_type = ?' : ''}
                order by cf.custrecord_scv_txcf_sort
            `;
            let listTxnConfig = [];
            let sqlParams = [];
            if (parameters.custpage_txn_group) {
                sqlParams.push(parameters.custpage_txn_group);
            }
            libRep.doSearchSqlAll(listTxnConfig, sqlTxnConfig, sqlParams);
            libRep.addSelectType(fieldTxnConfig, parameters.custpage_txn_config, listTxnConfig, false);
            let txn_config = parameters.custpage_txn_config || fieldTxnConfig.getSelectOptions()[0]?.value;
            listTxnConfig = listTxnConfig.filter(o => String(o.value) === String(txn_config));
            libRep.addFieldHidden(form, 'custpage_data_field_config', JSON.stringify(listTxnConfig), serverWidget.FieldType.LONGTEXT);
            
            let listTxnConfigFilters = [];
            if (txn_config) {
                let filterTxnConfigFilter = [{
                    name: 'custrecord_scv_txn_cfcr_parent',
                    operator: 'anyof',
                    values: txn_config
                }];
                libRep.doSearchSSRangeLabelId(SavedSearch.TXN_MAPPING_CONFIG_FILTER, 1000, listTxnConfigFilters, filterTxnConfigFilter);
                libRep.addFieldHidden(form, 'custpage_data_filter_config', JSON.stringify(listTxnConfigFilters), serverWidget.FieldType.LONGTEXT);
                addFieldMapping(form, parameters, listTxnConfigFilters, filterGroupId);
                
                let listTxnConfigDefaults = [];
                let filterTxnConfigDefault = [{
                    name: 'custrecord_scv_txn_cfdf_parent',
                    operator: 'anyof',
                    values: txn_config
                }];
                libRep.doSearchSSRangeLabelId(SavedSearch.TXN_MAPPING_CONFIG_DEFAULT, 1000, listTxnConfigDefaults, filterTxnConfigDefault);
                libRep.addFieldHidden(form, 'custpage_data_default_config', JSON.stringify(listTxnConfigDefaults), serverWidget.FieldType.LONGTEXT);
                addFieldMapping(form, parameters, listTxnConfigDefaults, defaultGroupId);
            }
            
            if (isSuitecloudUser()) {
                addButtonExportDataRaw(form);
            }
            return form;
        }
        
        const addFieldMapping = (form, parameters, listTxnConfigFilters, filterGroupId) => {
            for (let objFilter of listTxnConfigFilters) {
                let field = form.addField({
                    id: objFilter.id,
                    type: cmTxnExe.MappingFieldType[objFilter.type_display],
                    label: objFilter.label,
                    source: objFilter.source,
                    container: filterGroupId
                });
                if (objFilter.is_mandatory === true) {
                    field.isMandatory = true;
                }
                if (objFilter.display_type_display === 'Hidden') {
                    field.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
                } else if (objFilter.display_type_display === 'Disabled') {
                    field.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
                } else if (objFilter.display_type_display === 'Inline Text') {
                    field.updateDisplayType({displayType: serverWidget.FieldDisplayType.READONLY});
                }

                if (objFilter.saved_search) {
                    let listSavedSearchData = [];
                    let criterias = null, isDoSearchCriteria = true;
                    if (objFilter.criteria) {
                        criterias = JSON.parse(objFilter.criteria);
                        for (let criteria of criterias) {
                            criteria.values = criteria.operator === 'anyof' ? parameters[criteria.values]?.split(',') : parameters[criteria.values];
                            if (!criteria.values) {
                                isDoSearchCriteria = false;
                            }
                        }
                    }
                    if (isDoSearchCriteria) {
                        libRep.doSearchSSRangeLabelId(objFilter.saved_search, 1000, listSavedSearchData, criterias);
                    }
                    libRep.addSelectType(field, parameters[objFilter.id], listSavedSearchData, true);
                } else if (objFilter.sql) {
                    let strWhere = '';
                    if (objFilter.criteria) {
                        let criterias = JSON.parse(objFilter.criteria);
                        for (let criteria of criterias) {
                            if (typeof criteria === 'string') {
                                strWhere += criteria;
                            } else {
                                if (criteria.operator === 'in') {
                                    strWhere += ` ${criteria.name} ${criteria.operator} (${(parameters[criteria.values] || '-1').split(',').map(v => `'${v}'`).join(',')})`;
                                } else {
                                    strWhere += ` ${criteria.name} ${criteria.operator} '${parameters[criteria.values] || -1}'`;
                                }
                            }
                        }
                        if (strWhere && (objFilter.sql.endsWith(')') || objFilter.sql.toLowerCase().indexOf('where') === -1)) {
                            strWhere = ' where ' + strWhere;
                        }
                    }
                    libRep.addSelectionViaSql(field, objFilter.sql, [], true, parameters[objFilter.id]);
                } else {
                    field.defaultValue = parameters[objFilter.id];
                }
            }
        }
        
        const addButtonExportDataRaw = (form) => {
            form.addButton({
                id: 'custpage_export_raw_data',
                label: 'Export Raw Data',
                functionName: 'exportRawData()'
            });
        }
        
        const createTask = (parameters, myCache, iscomplete) => {
            let newParameters = JSON.parse(JSON.stringify(parameters));
            delete newParameters.custpage_data_default_config;
            delete newParameters.custpage_data_filter_config;
            delete newParameters.custpage_data_field_config;
            delete newParameters.whence;
            delete newParameters._csrf;
            delete newParameters.entryformquerystring;

            let txn_config = parameters.custpage_txn_config;
            let mrTaskId = '', messageInfo = '';
            if (iscomplete) {
                let listCachedTask = cmTxnExe.getCachedMrTaskList(myCache);
                let params = {
                    custscript_scv_mr_txn_exe_config: txn_config,
                    custscript_scv_mr_txn_exe_params: JSON.stringify(newParameters)
                };
                let result = cmTxnExe.submitMrTask(listCachedTask, txn_config, params,
                    () => 'customdeploy_scv_mr_txn_exe', 1, 1);
                cmTxnExe.putCachedMrTaskList(myCache, listCachedTask);
                mrTaskId = result.taskId || '';
                messageInfo = result.taskId ? 'Your request has been submitted. Task ID: ' + result.taskId : result.message;
            }

            return {mrTaskId, messageInfo, newParameters};
        }

        const getMessage = (parameters) => {
            let myCache = cache.getCache({
                name: 'cTxnExe',
                scope: cache.Scope.PUBLIC
            });
            let listCachedTask = cmTxnExe.getCachedMrTaskList(myCache);
            let mrTaskId = parameters.mrTaskId || listCachedTask[listCachedTask.length - 1]?.taskId;
            let iscomplete = true, messageInfo = parameters.messageInfo;
            if (mrTaskId) {
                let taskStatus = task.checkStatus(mrTaskId);
                if (taskStatus.status === 'COMPLETE' || taskStatus.status === 'FAILED' || taskStatus.status === 'CANCELED') {
                    messageInfo = 'Your request has been completed. Task ID: ' + mrTaskId;
                    cmTxnExe.putCachedMrTaskList(myCache, []);
                } else {
                    iscomplete = false;
                    messageInfo = `Your Task ID ${mrTaskId} is: ` + taskStatus.status;
                }
            }

            return {myCache, iscomplete, messageInfo};
        }
        
        return {onRequest}
        
    });
