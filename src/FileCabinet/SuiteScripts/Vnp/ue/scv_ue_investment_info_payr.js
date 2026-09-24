/**
 * Noi dung: Create Payment Request buttons from Thong tin dau tu.
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search', 'N/url'],
    (search, url) => {

        const PAYR_RECORD = 'customrecord_scv_paymentrequest';
        const APPROVED_STATUS = '6';
        const INVEST_IN_REASON_CODE = 'A01';

        const FIELD = {
            REASON: 'custrecord_scv_ttdt_reason',
            STATUS: 'custrecord_scv_ttdt_status',
            RELATED_PAYR: 'custrecord_scv_related_payr'
        };

        function beforeLoad(context) {
            try {
                if (context.type !== context.UserEventType.VIEW) return;
                addPaymentRequestButtons(context.form, context.newRecord);
            } catch (e) {
                log.error('beforeLoad Investment Info Payment Request buttons', e);
            }
        }

        function addPaymentRequestButtons(form, rec) {
            if (getReasonCode(rec) !== INVEST_IN_REASON_CODE) return;

            addRedirectButton(form, rec, 'custpage_scv_ttdt_invest_payr', 'Investment PayR', 'ttdt_to_investment_payr');

            if (String(rec.getValue(FIELD.STATUS) || '') === APPROVED_STATUS && hasApprovedRelatedPayr(rec)) {
                addRedirectButton(form, rec, 'custpage_scv_ttdt_invest_payable', 'Investment Payable Req', 'ttdt_to_investment_payable');
            }
        }

        function addRedirectButton(form, rec, id, label, typeFunc) {
            const resolvedUrl = url.resolveRecord({
                recordType: PAYR_RECORD,
                recordId: null,
                isEditMode: true,
                params: {
                    id_rec: rec.id,
                    id_type: rec.type,
                    type_func: typeFunc
                }
            });
            form.addButton({
                id,
                label,
                functionName: `window.open("${resolvedUrl}")`
            });
        }

        function getReasonCode(rec) {
            const reasonId = rec.getValue(FIELD.REASON);
            if (!reasonId) return '';
            try {
                const fields = search.lookupFields({
                    type: 'customrecord_scv_reasonttdt',
                    id: reasonId,
                    columns: ['custrecord_scv_reasonttdt_code']
                });
                return fields.custrecord_scv_reasonttdt_code || '';
            } catch (e) {
                log.debug('getReasonCode failed', e.message || e);
                return '';
            }
        }

        function hasApprovedRelatedPayr(rec) {
            const related = rec.getValue(FIELD.RELATED_PAYR);
            const ids = Array.isArray(related) ? related : (related ? [related] : []);
            if (!ids.length) return false;

            let found = false;
            search.create({
                type: PAYR_RECORD,
                filters: [
                    ['internalid', 'anyof', ids],
                    'AND',
                    ['custrecord_scv_payment_status', 'anyof', APPROVED_STATUS],
                    'AND',
                    ['isinactive', 'is', 'F']
                ],
                columns: ['internalid']
            }).run().each(() => {
                found = true;
                return false;
            });
            return found;
        }

        return {beforeLoad};
    });
