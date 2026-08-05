/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/url', '../lib/scv_lib_function.js'],

    (record, search, url, libFunc) => {

        const RecordType = {
            VENDOR_CREDIT: 'vendorcredit'
        };

        // Account số bắt đầu bằng 111/112 -> tạo Check; bắt đầu bằng 341 -> tạo JRL
        const AccountPrefix = {
            CHECK: ['111', '112'],
            JOURNAL: ['341']
        };

        const SCRIPT_ID = 'customscript_scv_sl_vendor_credit';
        const DEPLOY_ID = 'customdeploy_scv_sl_vendor_credit';

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
                if (newRecord.type !== RecordType.VENDOR_CREDIT) return;

                let accountId = newRecord.getValue({fieldId: 'custbody_scv_account'});
                if (!accountId) return;

                let accountNumber = search.lookupFields({
                    type: search.Type.ACCOUNT,
                    id: accountId,
                    columns: ['number']
                }).number || '';

                let isCheckAccount = AccountPrefix.CHECK.some(prefix => accountNumber.startsWith(prefix));
                let isJournalAccount = AccountPrefix.JOURNAL.some(prefix => accountNumber.startsWith(prefix));
                if (!isCheckAccount && !isJournalAccount) return;

                libFunc.addCssPleaseWait(scriptContext.form);

                let relatedTransaction = newRecord.getValue({fieldId: 'custbody_scv_related_transaction'});
                let recordId = newRecord.id;
                let transactionType = isCheckAccount ? record.Type.CHECK : record.Type.JOURNAL_ENTRY;
                let urlSuitelet = url.resolveScript({
                    scriptId: SCRIPT_ID,
                    deploymentId: DEPLOY_ID,
                    params: {vendorcreditId: recordId, transactionType: transactionType}
                });

                let form = scriptContext.form;
                if (relatedTransaction) {
                    addButtonHandel(form, 'custpage_scv_update', isCheckAccount ? 'Update Check' : 'Update JRL', urlSuitelet, recordId);
                } else {
                    let labelButton = isCheckAccount ? 'Create Check' : 'Create JRL';
                    addButtonHandel(form, 'custpage_scv_create', labelButton, urlSuitelet, recordId);
                }
            } catch (e) {
                log.error('beforeLoad error', e);
            }
        }

        const addButtonHandel = (form, idButton, labelButton, urlSuitelet, recordId) => {
            form.addButton({
                id: idButton,
                label: labelButton,
                functionName: `require([], () => {
                        const clickedFlagKey = '__scv_clicked_${idButton}';
                        if (window[clickedFlagKey]) { return; }

                        const lockKey = 'scv_lock_${idButton}_${recordId}';
                        const lockTtlMs = 10000;
                        let lockRaw = localStorage.getItem(lockKey);
                        if (lockRaw && (Date.now() - Number(lockRaw)) < lockTtlMs) {
                            alert('Yêu cầu đang được xử lý (có thể đang mở ở tab/cửa sổ khác), vui lòng đợi hoặc tải lại trang.');
                            return;
                        }
                        localStorage.setItem(lockKey, String(Date.now()));
                        window[clickedFlagKey] = true;

                        const disabledButton = (buttonId) => {let button = document.getElementById(buttonId); if (button) button.disabled = true;};
                        const enabledButton = (buttonId) => {let button = document.getElementById(buttonId); if (button) button.disabled = false;};
                        disabledButton('${idButton}');
                        disabledButton('secondary${idButton}');
                        document.getElementById('fullscreen-spinner').style.display = 'block';                        
                        let success = false;

                        try {
                            let resCall = nlapiRequestURL('${urlSuitelet}', {});
                            let resBody = resCall.getBody();
                            if(resBody) {                                
                                success = true;                                
                                window.location.reload();
                            } 
                        } finally {
                            if (!success) {
                                window[clickedFlagKey] = false;
                                localStorage.removeItem(lockKey);
                                enabledButton('${idButton}');
                                enabledButton('secondary${idButton}');
                                document.getElementById('fullscreen-spinner').style.display = 'none';
                            }
                        }
                    })
                `
            });
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
