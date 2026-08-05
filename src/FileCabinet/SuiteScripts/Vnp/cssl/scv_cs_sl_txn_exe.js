/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/https', 'N/url',
        '../lib/scv_lib_cs.js', '../cons/scv_cons_record.js'],
    
    function (ccr, https, url, libCs, constRecord) {
        
        const refresh = () => {
            window.location.reload();
        }
        
        let listTxnConfigFilters = null, listTxnConfigDefaults = null;
        let isDirty = true;
        
        function pageInit(scriptContext) {
            let currentRecord = scriptContext.currentRecord;
            listTxnConfigFilters = currentRecord.getValue('custpage_data_filter_config');
            if (listTxnConfigFilters) {
                listTxnConfigFilters = JSON.parse(listTxnConfigFilters);
                initTxnConfigField(currentRecord, listTxnConfigFilters);
            }
            listTxnConfigDefaults = currentRecord.getValue('custpage_data_default_config');
            if (listTxnConfigDefaults) {
                listTxnConfigDefaults = JSON.parse(listTxnConfigDefaults);
                initTxnConfigField(currentRecord, listTxnConfigDefaults);
            }
        }
        
        const initTxnConfigField = (currentRecord, listTxnConfigFilters) => {
            for (let objFilter of listTxnConfigFilters) {
                if (objFilter.default_value) {
                    if ((objFilter.type_display === 'Date' || objFilter.type_display === 'Date/Time') && objFilter.default_value.indexOf(`"'`) !== -1) {
                        currentRecord.setText({
                            fieldId: objFilter.id,
                            text: eval(objFilter.default_value)
                        });
                    } else {
                        currentRecord.setValue({
                            fieldId: objFilter.id,
                            value: eval(objFilter.default_value)
                        });
                    }
                    if (objFilter.sql || objFilter.saved_search) {
                        initQuickFindFieldSelect(currentRecord, objFilter.id);
                    }
                }
            }
        }
        
        const initQuickFindFieldSelect = (currentRecord, fieldId) => {
            constRecord.initQuickFindFieldSelect(currentRecord, fieldId, {
                data: currentRecord.getField(fieldId).getSelectOptions(),
                valueExpr: "value",
                displayExpr: "text",
                reInsertOption: false
            }, false);
        }
        
        function fieldChanged(scriptContext) {
            let currentRecord = scriptContext.currentRecord;
            if (scriptContext.fieldId === 'custpage_txn_config') {
                window.onbeforeunload = null;
                let params = {custpage_txn_config: currentRecord.getValue('custpage_txn_config')};
                let urlTxnExe = getUrlSearch(params);
                window.location.replace(urlTxnExe);
            } else {
                isDirty = true;
                listTxnConfigFilters = currentRecord.getValue('custpage_data_filter_config');
                if (listTxnConfigFilters) {
                    listTxnConfigFilters = JSON.parse(listTxnConfigFilters);
                    let fieldId = scriptContext.fieldId;
                    
                    let listChildFilter = listTxnConfigFilters.filter(o => o.criteria && (o.sql || o.saved_search));
                    for (let objFilter of listChildFilter) {
                        initFieldSelect(currentRecord, objFilter, fieldId);
                    }
                }
            }
        }
        
        const getUrlSearch = (params) => {
            return url.resolveScript({
                scriptId: 'customscript_scv_sl_txn_exe',
                deploymentId: 'customdeploy_scv_sl_txn_exe',
                returnExternalUrl: false,
                params: params
            })
        }
        
        const initFieldSelect = (currentRecord, objFilter, fieldId) => {
            let criterias = JSON.parse(objFilter.criteria);
            if (criterias.filter(o => o.values === fieldId).length > 0) {
                let fieldChild = currentRecord.getField(objFilter.id);
                fieldChild.removeSelectOption({value: null});
                if (objFilter.saved_search) {
                    for (let criteria of criterias) {
                        let fieldValue = currentRecord.getValue(criteria.values);
                        criteria.values = fieldValue && String(fieldValue) ? fieldValue : '-1';
                    }
                    libCs.insertSelectionViaSavedSearch([fieldChild], objFilter.saved_search, criterias, true, null);
                } else if (objFilter.sql) {
                    let strWhere = '';
                    for (let criteria of criterias) {
                        let fieldValue = currentRecord.getValue(criteria.values);
                        if (typeof criteria === 'string') {
                            strWhere += criteria;
                        } else {
                            if (criteria.operator === 'in') {
                                strWhere += ` ${criteria.name} ${criteria.operator} (${(fieldValue || '-1').split(',').map(v => `'${v}'`).join(',')})`;
                            } else {
                                strWhere += ` ${criteria.name} ${criteria.operator} '${fieldValue || -1}'`;
                            }
                        }
                    }
                    libCs.insertSelectionViaSql(fieldChild, objFilter.sql + strWhere, [], true, null);
                }
                initQuickFindFieldSelect(currentRecord, objFilter.id);
            }
        }
        
        const getParams = (currentRecord) => {
            let objaParams = {
                isExport: 'T',
                custpage_txn_config: currentRecord.getValue('custpage_txn_config')
            };
            let message = !objaParams.custpage_txn_config ? 'Please fill Txn Config' : '';
            if (listTxnConfigFilters) {
                for (let objFilter of listTxnConfigFilters) {
                    if (objFilter.type_display === 'Date' || objFilter.type_display === 'Date/Time') {
                        objaParams[objFilter.id] = currentRecord.getText(objFilter.id);
                    } else if (objFilter.type_display === 'Multiple Select') {
                        objaParams[objFilter.id] = currentRecord.getValue(objFilter.id).join(',');
                    } else {
                        objaParams[objFilter.id] = currentRecord.getValue(objFilter.id);
                    }
                    if (!objaParams[objFilter.id] && objFilter.is_mandatory === true) {
                        message = `Please fill ${objFilter.label}`;
                        break;
                    }
                }
            }
            return {objaParams, message};
        }
        
        const callToGetDatas = (objaParams, fnHandlePost, ...params) => {
            https.requestSuitelet.promise({
                scriptId: 'customscript_scv_sl_txn_exe',
                deploymentId: 'customdeploy_scv_sl_txn_exe',
                body: objaParams
            }).then(function (response) {
                if (fnHandlePost) {
                    fnHandlePost(response.body, objaParams, ...params);
                }
            }).catch(function onRejected(reason) {
                console.log('reason', reason)
                log.error('Invalid Get Request:', reason);
            });
            
        }
        
        const exportRawData = () => {
            window.onbeforeunload = null;
            libCs.showLoadingDialog(true);
            let currentRecord = ccr.get();
            let {objaParams, message} = getParams(currentRecord);
            if (message) {
                alert(message);
                libCs.showLoadingDialog(false);
            } else {
                callToGetDatas(objaParams, downloadRawData);
            }
        }
        
        const downloadRawData = (content) => {
            let blob = new Blob([content], {type: "text/plain;charset=utf-8"});
            let link = document.createElement("a");
            link.href = window.URL.createObjectURL(blob);
            link.download = "raw_data.txt";
            link.click();
            libCs.showLoadingDialog(false);
        }
        
        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            refresh,
            exportRawData
        };
        
    });
