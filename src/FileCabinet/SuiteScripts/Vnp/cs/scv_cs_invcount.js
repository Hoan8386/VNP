/**
 * Nội dung: Áp dụng cho màn hình Phiếu Kiểm Kê, KSCL
 * Key: customrecord_scv_invcount_h
 * =======================================================================================
 *  Date                Author                  Description
 *  23 Sep 2026         Khanh Tran              Init, create file. Xử lý nghiệp vụ Phiếu Kiểm Kê, KSCL from ms.Thủy(https://app.clickup.com/t/3773072/14yhnhmfvg8)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
    '../common/scv_common_invcount.js',
],
function(
    commonInvcount
) {
    function fieldChanged(scriptContext) {
        let curRec = scriptContext.currentRecord;
        let sublistId = scriptContext.sublistId;
        let fieldId = scriptContext.fieldId;

        if (sublistId == 'recmachcustrecord_scv_ic_idheader_l') {
            if (fieldId == 'custrecord_scv_ic_item_l') {
                commonInvcount.setHeaderValueToCurrentLine(curRec, sublistId);
            }
            
            if (['custrecord_scv_ic_actualquantity_l', 'custrecord_scv_ic_stockqtyincount_l'].includes(fieldId)) {
                commonInvcount.calcSoLuongChenhLech(curRec, sublistId);
            }

            if (['custrecord_scv_ic_qtybytranspunit_l', 'custrecord_scv_ic_oddquantity_l', 'custrecord_scv_ic_converbytranspunit_l'].includes(fieldId)) {
                commonInvcount.calcSoLuongThucTeKiemKe(curRec, sublistId);
            }
        }
    }

    return {
        fieldChanged: fieldChanged,
    };
});
