/**
 * Nội dung: Áp dụng cho màn hình Phiếu Kiểm Kê, KSCL
 * Key: customrecord_scv_invcount_h
 * =======================================================================================
 *  Date                Author                  Description
 *  23 Sep 2026         Khanh Tran              Init, create file. Xử lý nghiệp vụ Phiếu Kiểm Kê, KSCL from ms.Thủy(https://app.clickup.com/t/3773072/14yhnhmfvg8)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    '../common/scv_common_invcount.js',
], (
    commonInvcount,
) => {
    const beforeSubmit = (scriptContext) => {
        let triggerType = scriptContext.type;
        if (triggerType === 'create' || triggerType === 'edit') {
            let curRec = scriptContext.newRecord;
            commonInvcount.setLineNumber(curRec);
        }
    };

    return {
        beforeSubmit,
    };
});
