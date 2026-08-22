/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/url', '../lib/scv_lib_purchase_contract_calc'],
    (url, libCalc) => {

        // FDD (FIN) - Chức năng tạo Payment Request từ PC, PO - sheet "Từ PC"
        const PAYR_RECORD = 'customrecord_scv_paymentrequest';
        const ALLOWED_ORDER_TYPES = ['1', '2', '3', '4', '5'];
        const APPROVAL_STATUS_APPROVED = '6';

        /**
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            try {
                if (scriptContext.type !== scriptContext.UserEventType.VIEW) return;
                addPaymentRequestButton(scriptContext.form, scriptContext.newRecord);
            } catch (e) {
                log.error('beforeLoad Purchase Contract Payment Request button', e);
            }
        }

        function addPaymentRequestButton(form, rec) {
            const orderType = String(rec.getValue('custbody_scv_order_type') || '');
            const approvalStatus = String(rec.getValue('custbody_scv_approval_status') || '');
            if (ALLOWED_ORDER_TYPES.indexOf(orderType) === -1) return;
            if (approvalStatus !== APPROVAL_STATUS_APPROVED) return;

            const resolvedUrl = url.resolveRecord({
                recordType: PAYR_RECORD,
                recordId: null,
                isEditMode: true,
                params: {id_rec: rec.id, id_type: rec.type, type_func: 'pc_to_payable'}
            });
            form.addButton({
                id: 'custpage_scv_pc_payment_request',
                label: 'Payment Request',
                functionName: `window.open("${resolvedUrl}")`
            });
        }

        /**
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            try {
                if (scriptContext.type !== 'create' && scriptContext.type !== 'edit') return;
                libCalc.recalcAllLines(scriptContext.newRecord);
            } catch (e) {
                log.error('Error beforeSubmit', e);
            }
        }

        return {beforeLoad, beforeSubmit}

    });
