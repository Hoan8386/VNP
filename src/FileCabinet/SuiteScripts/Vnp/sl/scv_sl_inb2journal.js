/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  15 Sep 2026         Khanh Tran			    Init, create file. Chức năng phân bổ chi phí mua hàng, from ms.Thủy(https://app.clickup.com/t/)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/redirect',
    '../common/scv_common_inboundshipment.js',
], (redirect,
    cmInboundShipment,
) => {
    const onRequest = (scriptContext) => {
        let params = scriptContext.request.parameters;
        let resultParams = {custpage_vat_journal_success: 'F', custpage_vat_journal_message: ''};
        try {
            cmInboundShipment.createVatJournal(params);
            resultParams.custpage_vat_journal_success = 'T';
            resultParams.custpage_vat_journal_message = 'Success';
        } catch (error) {
            log.error('ERROR-createVatJournal', error);
            resultParams.custpage_vat_journal_message = error.message;
        }
        redirect.toRecord({
            type: 'inboundshipment',
            id: params.custpage_inboundshipment,
            parameters: resultParams,
        });
    };

    return {onRequest};
});
