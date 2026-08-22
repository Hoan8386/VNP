/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/url', '../lib/scv_lib_create_purchase_order'],
    (url, libCreatePo) => {

        // FDD (FIN) - Chức năng tạo Payment Request từ PC, PO - sheet "Từ PO"
        const PAYR_RECORD = 'customrecord_scv_paymentrequest';
        const APPROVED = '2';
        const ITEM_SUBLIST = 'item';

        function beforeLoad(scriptContext) {
            try {
                if (scriptContext.type !== scriptContext.UserEventType.VIEW) return;
                addPaymentRequestButtons(scriptContext.form, scriptContext.newRecord);
            } catch (e) {
                log.error('beforeLoad Purchase Order Payment Request buttons', e);
            }
        }

        function addPaymentRequestButtons(form, rec) {
            const approvalStatus = String(rec.getValue('approvalstatus') || '');
            if (approvalStatus !== APPROVED) return;

            const totals = sumItemLines(rec);

            // 2.1 Prepayment Request: chưa xuất hoá đơn hết số lượng đặt hàng
            if (totals.quantity !== totals.quantitybilled) {
                addRedirectButton(form, rec, 'custpage_scv_po_prepayment_request', 'Prepayment Request', 'po_to_prepayment');
            }

            // 2.2 Payment Request: đã nhận hàng đủ số lượng đã xuất hoá đơn
            if (totals.quantityreceived >= totals.quantitybilled) {
                addRedirectButton(form, rec, 'custpage_scv_po_payment_request', 'Payment Request', 'po_to_payable');
            }
        }

        function sumItemLines(rec) {
            const totals = {quantity: 0, quantitybilled: 0, quantityreceived: 0};
            const lineCount = rec.getLineCount({sublistId: ITEM_SUBLIST});
            for (let i = 0; i < lineCount; i++) {
                totals.quantity += toNumber(rec.getSublistValue({sublistId: ITEM_SUBLIST, fieldId: 'quantity', line: i}));
                totals.quantitybilled += toNumber(rec.getSublistValue({sublistId: ITEM_SUBLIST, fieldId: 'quantitybilled', line: i}));
                totals.quantityreceived += toNumber(rec.getSublistValue({sublistId: ITEM_SUBLIST, fieldId: 'quantityreceived', line: i}));
            }
            return totals;
        }

        function addRedirectButton(form, rec, id, label, typeFunc) {
            const resolvedUrl = url.resolveRecord({
                recordType: PAYR_RECORD,
                recordId: null,
                isEditMode: true,
                params: {id_rec: rec.id, id_type: rec.type, type_func: typeFunc}
            });
            form.addButton({
                id,
                label,
                functionName: `window.open("${resolvedUrl}")`
            });
        }

        function toNumber(value) {
            const number = parseFloat(value || 0);
            return isNaN(number) ? 0 : number;
        }

        function beforeSubmit(scriptContext) {
            try {
                if (scriptContext.type !== scriptContext.UserEventType.DELETE) return;
                libCreatePo.rollbackDeletedPurchaseOrder(scriptContext.oldRecord);
            } catch (e) {
                log.error('Rollback Create PO Quantity Error', e);
                throw e;
            }
        }

        return {beforeLoad, beforeSubmit};
    });
