/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/cache', 'N/runtime', 'N/search', 'N/ui/serverWidget',
        '../common/scv_common_txn_exe.js', '../lib/scv_lib_report.js', '../lib/scv_lib_report_custom.js'],

    (cache, runtime, search, serverWidget, cmTxnExe, libRep, libRpCustom) => {

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
            if (parameters.isSubmit === 'T') {
                let bodyResponse = getDataSubmit(parameters);
                scriptContext.response.setHeader({
                    name: 'Content-Type',
                    value: 'application/json'
                });
                scriptContext.response.write(JSON.stringify(bodyResponse));
            } else if (parameters.isExport === 'T') {
                let bodyResponse = getDataExport(parameters);
                scriptContext.response.setHeader({
                    name: 'Content-Type',
                    value: 'application/json'
                });
                scriptContext.response.write(JSON.stringify(bodyResponse));
            } else {
                let form = createForm(parameters);
                libRpCustom.addFieldIncludeDxGrid(form);
                libRpCustom.addFieldDxGridResult(form, "scvTabsContainer");
                scriptContext.response.writePage(form);
            }
        }

        const getDataExport = (parameters) => {
            let txn_config = parameters.custpage_txn_config;
            let listTxnMappingConfig = cmTxnExe.getListTxnMappingConfig(txn_config);
            let objDataFromSource = null, listDataJoinSource = null, listDataTab = [];
            let listTxnMappingConfigSource = cmTxnExe.getListTxnMappingConfigSource(txn_config);
            if (listTxnMappingConfigSource.length > 0) {
                objDataFromSource = cmTxnExe.getDataFromTxnMappingConfigSource(listTxnMappingConfigSource, parameters);
                try {
                    listDataJoinSource = cmTxnExe.buildJoinSourceReport(listTxnMappingConfig[0], listTxnMappingConfigSource, objDataFromSource, parameters);
                } catch (e) {
                    log.error('getDataExport exception', e);
                    listDataJoinSource = e;
                }

                let listTxnMappingTab = cmTxnExe.getListTxnMappingTab(txn_config);
                for (let txnMappingTab of listTxnMappingTab) {
                    try {
                        listDataTab.push(cmTxnExe.buildJoinSourceReport(txnMappingTab, listTxnMappingConfigSource, objDataFromSource, parameters));
                    } catch (e) {
                        log.error('getDataExport tab exception', e);
                    }
                }
            }
            return {listDataJoinSource, listDataTab};
        }

        const getDataSubmit = (parameters) => {
            let myCache = cache.getCache({
                name: 'cTxnExe',
                scope: cache.Scope.PUBLIC
            });
            let {mrTaskId, messageInfo} = createTask(parameters, myCache, true);
            return {mrTaskId, messageInfo};
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
            let listMrTaskId = [], listRunningMessage = [];
            if (iscomplete) {
                let txnConfigLKF = search.lookupFields({
                    type: cmTxnExe.RecordType.TXN_MAPPING_CONFIG,
                    id: txn_config,
                    columns: ['custrecord_scv_txcf_redirect_to_reccfg']
                });
                let listRedirectConfig = txnConfigLKF.custrecord_scv_txcf_redirect_to_reccfg || [];
                let listCachedTask = cmTxnExe.getCachedMrTaskList(myCache);
                let i = 1;
                for (let objRedirectConfig of listRedirectConfig) {
                    let params = {
                        custscript_scv_mr_txn_exe_config: objRedirectConfig.value,
                        custscript_scv_mr_txn_exe_params: JSON.stringify(newParameters)
                    };
                    let result = cmTxnExe.submitMrTask(listCachedTask, objRedirectConfig.value, params,
                        (idx) => `customdeploy_scv_mr_txn_exe_cfg_${idx}`, i);
                    i = result.nextIndex;
                    if (result.taskId) {
                        listMrTaskId.push(result.taskId);
                    } else if (result.message) {
                        listRunningMessage.push(result.message);
                    }
                }
                cmTxnExe.putCachedMrTaskList(myCache, listCachedTask);
            }

            let messageInfo = listMrTaskId.length ? 'Your request has been submitted. Task ID: ' + listMrTaskId.join(', ') : '';
            if (listRunningMessage.length) {
                messageInfo += (messageInfo ? ' ' : '') + listRunningMessage.join(' ');
            }

            return {mrTaskId: listMrTaskId, messageInfo, newParameters};
        }

        const createForm = (parameters) => {
            let formTitle = 'TXN REPORT';
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
            form.clientScriptModulePath = '../cssl/scv_cs_sl_txn_report.js';

            let filterGroupId = 'custpage_mailgroup', defaultGroupId = 'custpage_defaultgroup';
            form.addFieldGroup({id: filterGroupId, label: 'Main'});
            form.addFieldGroup({id: defaultGroupId, label: 'Default Value'});

            form.addButton({
                id: 'custpage_btn_search',
                label: 'Search',
                functionName: 'searchResult()'
            });
            form.addButton({
                id: 'custpage_btn_export_excel',
                label: 'Export Excel',
                functionName: 'exportResult()'
            });

            let fieldDataFieldConfig = form.addField({
                id: 'custpage_data_field_config',
                type: serverWidget.FieldType.LONGTEXT,
                label: 'Data Field Config',
                container: filterGroupId,
            });
            fieldDataFieldConfig.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});

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
            });
            fieldTxnConfig.isMandatory = true;
            let currentUser = runtime.getCurrentUser();
            let sqlTxnConfig = `SELECT cf.id value, cf.name text, cf.custrecord_scv_txcf_rp_column, cf.custrecord_scv_txcf_rp_temp,
                cf.custrecord_scv_txcf_header_field, cf.custrecord_scv_txcf_line_field, f.url temp_url,
                cf.custrecord_scv_txcf_label_button, cf.custrecord_scv_txcf_redirect_to_reccfg
                FROM ${cmTxnExe.RecordType.TXN_MAPPING_CONFIG} cf
                left join file f  on cf.custrecord_scv_txcf_rp_temp = f.id  WHERE cf.isinactive = 'F' and cf.custrecord_scv_txcf_config_type = '${cmTxnExe.ConfigType.REPORT}'
                and (cf.custrecord_scv_txcf_role_access is null or cf.custrecord_scv_txcf_role_access = ''
                    or instr(','||replace(cf.custrecord_scv_txcf_role_access, ' ', '')||',', ','||?||',') > 0)
                and (cf.custrecord_scv_txcf_emp_access is null or cf.custrecord_scv_txcf_emp_access = ''
                    or instr(','||replace(cf.custrecord_scv_txcf_emp_access, ' ', '')||',', ','||?||',') > 0)
                ${parameters.custpage_txn_group ? ' and cf.custrecord_scv_txcf_group_type = ?' : ''}
                order by cf.custrecord_scv_txcf_sort
            `;
            let listTxnConfig = [];
            let sqlParams = [currentUser.role, currentUser.id];
            if (parameters.custpage_txn_group) {
                sqlParams.push(parameters.custpage_txn_group);
            }
            libRep.doSearchSqlAll(listTxnConfig, sqlTxnConfig, sqlParams);
            libRep.addSelectType(fieldTxnConfig, parameters.custpage_txn_config, listTxnConfig, false);
            // if (!isSuitecloudUser()) {
            //     fieldTxnConfig.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});
            // }
            let txn_config = parameters.custpage_txn_config || fieldTxnConfig.getSelectOptions()[0]?.value;
            listTxnConfig = listTxnConfig.filter(o => String(o.value) === String(txn_config));
            fieldDataFieldConfig.defaultValue = JSON.stringify(listTxnConfig);
            let objTxnConfigTemp = listTxnConfig[0];
            form.title = `${objTxnConfigTemp?.text || 'TXN REPORT'}`;

            if (txn_config) {
                let listRedirectReport = [];
                let sqlRedirectReport = `SELECT id, custrecord_txn_rdrrp_label_button label_button, custrecord_txn_rdrrp_txn_report txn_report
                    FROM customrecord_scv_txn_redirect_report
                    WHERE isinactive = 'F' and custrecord_txn_rdrrp_parent = ?
                `;
                libRep.doSearchSqlAll(listRedirectReport, sqlRedirectReport, [txn_config]);
                for (let objRedirectReport of listRedirectReport) {
                    form.addButton({
                        id: `custpage_btn_redirect_${objRedirectReport.id}`,
                        label: objRedirectReport.label_button,
                        functionName: `redirectReport('${objRedirectReport.txn_report}')`
                    });
                }
            }

            if(objTxnConfigTemp && objTxnConfigTemp.custrecord_scv_txcf_label_button && objTxnConfigTemp.custrecord_scv_txcf_redirect_to_reccfg) {
                form.addButton({
                    id: 'custpage_btn_submit',
                    label: objTxnConfigTemp.custrecord_scv_txcf_label_button,
                    functionName: 'submitButton()'
                });
            }

            if (txn_config) {
                let filterTxnConfigFilter = [{
                    name: 'custrecord_scv_txn_cfcr_parent',
                    operator: 'anyof',
                    values: txn_config
                }];
                let listTxnConfigFilters = [];
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
                form.addButton({
                    id: 'custpage_export_raw_data',
                    label: 'Export Raw Data',
                    functionName: 'exportRawData()'
                });
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

        return {onRequest}

    });
