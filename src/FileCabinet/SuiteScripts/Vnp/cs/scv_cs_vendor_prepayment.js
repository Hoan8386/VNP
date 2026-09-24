/**
 *
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/search'], (search) => {

    const PAYR_RECORD = 'customrecord_scv_paymentrequest';
    const AMOUNT_FIELD = 'custrecord_scv_payment_amount';

    const pageInit = (scriptContext) => {
        try {
            if (scriptContext.mode !== 'create') return;

            const curRec = scriptContext.currentRecord;
            const payrId = curRec.getValue({fieldId: 'custbody_scv_payment_number'});
            if (!payrId) return;

            const fields = search.lookupFields({
                type: PAYR_RECORD,
                id: payrId,
                columns: [AMOUNT_FIELD]
            });
            const amount = fields[AMOUNT_FIELD];
            if (amount === null || amount === undefined || amount === '') return;

            curRec.setValue({
                fieldId: 'payment',
                value: amount,
                ignoreFieldChange: true
            });
        } catch (e) {
            console.log('pageInit scv_cs_vendor_prepayment:' + JSON.stringify(e));
        }
    };

    return {pageInit};
});
