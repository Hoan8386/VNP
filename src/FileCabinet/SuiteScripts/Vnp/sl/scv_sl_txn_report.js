/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/ui/serverWidget',
        '../common/scv_common_txn_exe.js', '../lib/scv_lib_report.js', '../lib/scv_lib_report_custom.js'],
    
    (runtime, serverWidget, cmTxnExe, libRep, libRpCustom) => {
        
        const SavedSearch = {
            TXN_MAPPING_CONFIG_FILTER: 'customsearch_scv_txn_mapping_config_ft'
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
                let form = createForm(parameters);
                libRpCustom.addFieldIncludeDxGrid(form);
                libRpCustom.addFieldDxGridResult(form, "scvTabsContainer");
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
                    listDataJoinSource = cmTxnExe.buildJoinSourceReport(listTxnMappingConfig[0], listTxnMappingConfigSource, objDataFromSource);
                } catch (e) {
                    log.error('getDataExport exception', e);
                    listDataJoinSource = e;
                }
            }
            return {listDataJoinSource};
        }
        
        const createForm = (parameters) => {
            let form = serverWidget.createForm({
                title: 'TXN REPORT'
            });
            form.clientScriptModulePath = '../cssl/scv_cs_sl_txn_report.js';
            
            let filterGroupId = 'custpage_mailgroup';
            form.addFieldGroup({id: filterGroupId, label: 'Main'});
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
            
            let fieldTxnConfig = form.addField({
                id: 'custpage_txn_config',
                type: serverWidget.FieldType.SELECT,
                label: 'Txn Type',
                container: filterGroupId,
            });
            fieldTxnConfig.isMandatory = true;
            let sqlTxnConfig = `SELECT cf.id value, cf.name text, cf.custrecord_scv_txcf_rp_column, cf.custrecord_scv_txcf_rp_temp, cf.custrecord_scv_txcf_header_field, cf.custrecord_scv_txcf_line_field, f.url temp_url FROM ${cmTxnExe.RecordType.TXN_MAPPING_CONFIG} cf left join file f  on cf.custrecord_scv_txcf_rp_temp = f.id  WHERE cf.isinactive = 'F' and cf.custrecord_scv_txcf_config_type = '${cmTxnExe.ConfigType.REPORT}'`;
            let listTxnConfig = [];
            libRep.doSearchSqlAll(listTxnConfig, sqlTxnConfig, []);
            libRep.addSelectType(fieldTxnConfig, parameters.custpage_txn_config, listTxnConfig, false);
            let txn_config = parameters.custpage_txn_config || fieldTxnConfig.getSelectOptions()[0]?.value;
            listTxnConfig = listTxnConfig.filter(o => String(o.value) === String(txn_config));
            fieldDataFieldConfig.defaultValue = JSON.stringify(listTxnConfig);
            form.title = `TXN REPORT - ${listTxnConfig[0]?.text || ''}`;
            
            let fieldDataFilterConfig = form.addField({
                id: 'custpage_data_filter_config',
                type: serverWidget.FieldType.LONGTEXT,
                label: 'Data Filter Config',
                container: filterGroupId,
            });
            fieldDataFilterConfig.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            
            let listTxnConfigFilters = [];
            if (txn_config) {
                let filterTxnConfigFilter = [{
                    name: 'custrecord_scv_txn_cfcr_parent',
                    operator: 'anyof',
                    values: txn_config
                }];
                libRep.doSearchSSRangeLabelId(SavedSearch.TXN_MAPPING_CONFIG_FILTER, 1000, listTxnConfigFilters, filterTxnConfigFilter);
                fieldDataFilterConfig.defaultValue = JSON.stringify(listTxnConfigFilters);
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
                    if (objFilter.saved_search) {
                        let listSavedSearchData = [];
                        let criterias = null, isDoSearchCriteria = true;
                        if (objFilter.criteria) {
                            criterias = JSON.parse(objFilter.criteria);
                            for (let criteria of criterias) {
                                criteria.values = criteria.operator === 'anyof' ? parameters[criteria.values].split(',') : parameters[criteria.values];
                                if(!criteria.values) {
                                    isDoSearchCriteria = false;
                                }
                            }
                        }
                        if(isDoSearchCriteria) {
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
                                    if(criteria.operator === 'in') {
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

            let userEmail = runtime.getCurrentUser().email;
            if (userEmail && userEmail.endsWith('suitecloud.vn')) {
                form.addButton({
                    id: 'custpage_export_raw_data',
                    label: 'Export Raw Data',
                    functionName: 'exportRawData()'
                });
            }
            return form;
        }
        
        return {onRequest}
        
    });
