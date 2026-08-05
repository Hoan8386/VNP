/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/https', '../common/scv_common_txn_exe.js'],
    
    (https, cmTxnExe) => {
        
        const SuiteletTxn = {
            scriptId: 'customscript_scv_sl_txn',
            deploymentId: 'customdeploy_scv_sl_txn'
        }
        
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            let tgType = scriptContext.type;
            if (tgType === 'view') {
                addPageInitMessage(scriptContext);
                addButonTaoGiaoDich(scriptContext);
                addButonExportDataRaw(scriptContext);
            }
        }
        
        const addPageInitMessage = (scriptContext) => {
            let params = {txn_config: scriptContext.newRecord.id, isCheckMessage: 'T'};
            let resBody = JSON.parse(https.requestSuitelet({
                scriptId: SuiteletTxn.scriptId,
                deploymentId: SuiteletTxn.deploymentId,
                body: params
            }).body);
            
            if (resBody.messageInfo) {
                let form = scriptContext.form;
                form.addPageInitMessage({
                    type: resBody.iscomplete ? 'confirmation' : 'warning',
                    title: 'Thông báo',
                    message: resBody.messageInfo
                });
            }
        }
        
        const addButonTaoGiaoDich = (scriptContext) => {
            if(scriptContext.newRecord.getValue('custrecord_scv_txcf_config_type') !== cmTxnExe.ConfigType.RECORD) {
                return;
            }
            let params = {txn_config: scriptContext.newRecord.id};
            scriptContext.form.addButton({
                id: 'custpage_auto_apply',
                label: 'Syn Transaction',
                functionName: `
                    require(['N/ui/dialog'], function(dialog) {
                        const URL_RQ = '/app/site/hosting/scriptlet.nl?script=${SuiteletTxn.scriptId}&deploy=${SuiteletTxn.deploymentId}';
                        let resCallData = nlapiRequestURL(URL_RQ, JSON.parse('${JSON.stringify(params)}'));
                        let objData = JSON.parse(resCallData.getBody());
                        dialog.alert({
                            title: 'Thông báo',
                            message: objData.messageInfo
                        });
                    })
                `
            });
        }
        
        const addButonExportDataRaw = (scriptContext) => {
            let params = {txn_config: scriptContext.newRecord.id, isExport: 'T'};
            scriptContext.form.addButton({
                id: 'custpage_export_raw_data',
                label: 'Export Raw Data',
                functionName: `
                    require([], function() {
                        const URL_RQ = '/app/site/hosting/scriptlet.nl?script=${SuiteletTxn.scriptId}&deploy=${SuiteletTxn.deploymentId}';
                        let resCallData = nlapiRequestURL(URL_RQ, JSON.parse('${JSON.stringify(params)}'));
                        
                        let content = resCallData.getBody();
                        let blob = new Blob([content], { type: "text/plain;charset=utf-8" });
                        let link = document.createElement("a");
                        link.href = window.URL.createObjectURL(blob);
                        link.download = "raw_data.txt";
                        link.click();
                    })
                `
            });
        }
        
        return {beforeLoad}
        
    });
