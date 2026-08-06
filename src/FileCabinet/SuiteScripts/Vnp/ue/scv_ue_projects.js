/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/url', '../lib/scv_lib_function.js', '../common/scv_common_itg_vietstock.js'],

    (url, libFunc, vietStock) => {

        const RecordType = {
            PROJECT: 'customrecord_cseg_inv_portfolio'
        };

        const SCRIPT_ID = 'customscript_scv_sl_itg_vietstock';
        const DEPLOY_ID = 'customdeploy_scv_sl_itg_vietstock';

        // Suitelet màn hình nhập tham số đồng bộ Financial info (scv_sl_itg_vietstock_form.js)
        const SCRIPT_ID_FORM = 'customscript_scv_sl_itg_vietstock_form';
        const DEPLOY_ID_FORM = 'customdeploy_scv_sl_itg_vietstock_form';

        /**
         * Tách Stock Code từ tên Project, lấy phần cuối cùng sau dấu "-".
         * VD: "ASC-CTCP DP Imexpharm - IMP" -> "IMP"
         */
        const getStockCodeFromName = (name) => {
            if (!name) return '';
            let parts = name.split('-');
            return parts[parts.length - 1].trim();
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
            try {
                if (scriptContext.type !== 'view') return;

                let newRecord = scriptContext.newRecord;
                if (newRecord.type !== RecordType.PROJECT) return;

                let projectName = newRecord.getValue({fieldId: 'name'});
                let stockCode = newRecord.getValue('custrecord_scv_proj_stockcode') || getStockCodeFromName(projectName);
                if (!stockCode) return;
                libFunc.addCssPleaseWait(scriptContext.form);

                let recordId = newRecord.id;
                let urlSuitelet = url.resolveScript({
                    scriptId: SCRIPT_ID,
                    deploymentId: DEPLOY_ID,
                    params: {projectId: recordId, stockCode: stockCode, type: vietStock.SyncType.STOCK_TRADING}
                });

                libFunc.addButtonHandel(scriptContext.form, 'custpage_scv_sync_stocktrading', 'Sync Stock Trading', urlSuitelet, recordId);

                // Mở màn hình nhập tham số (Project, Từ ngày - Đến ngày, Loại báo cáo, TermType) rồi mới đồng bộ
                let urlSuiteletForm = url.resolveScript({
                    scriptId: SCRIPT_ID_FORM,
                    deploymentId: DEPLOY_ID_FORM,
                    params: {projectId: recordId, stockCode: stockCode}
                });

                scriptContext.form.addButton({
                    id: 'custpage_scv_sync_financialinfo',
                    label: 'Sync Financial Info',
                    functionName: `nlExtOpenWindow('${urlSuiteletForm}', 'syncFinancialinfo', screen.width - 100, screen.height - 100, this, true, 'Sync Financial Info');`
                });
            } catch (e) {
                log.error('beforeLoad error', e);
            }
        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {

        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
