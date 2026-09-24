/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  23 Sep 2026         Khanh Tran              Init, create file. Xử lý nghiệp vụ Phiếu Kiểm Kê, KSCL from ms.Thủy(https://app.clickup.com/t/3773072/14yhnhmfvg8)
 */
define([

], (

) => {

    const setLineNumber = (curRec) => {
        let sublistId = 'recmachcustrecord_scv_ic_idheader_l';
        let lineCount = curRec.getLineCount({sublistId});

        for (let i = 0; i < lineCount; i++) {
            curRec.setSublistValue({
                sublistId: sublistId, fieldId: 'custrecord_scv_ic_linenumber_l', line: i, value: i + 1,
            });
        }
    };

    const calcSoLuongChenhLech = (curRec, sublistId) => {
        let actualQuantity = curRec.getCurrentSublistValue({sublistId: sublistId, fieldId: 'custrecord_scv_ic_actualquantity_l'}) * 1;
        let stockQuantity = curRec.getCurrentSublistValue({sublistId: sublistId, fieldId: 'custrecord_scv_ic_stockqtyincount_l'}) * 1;
        let diffQuantity = actualQuantity - stockQuantity;

        curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: 'custrecord_scv_ic_diffquantity_l', value: diffQuantity});
    };

    const calcSoLuongThucTeKiemKe = (curRec, sublistId) => {
        let quantityByTransportUnit = curRec.getCurrentSublistValue({sublistId: sublistId, fieldId: 'custrecord_scv_ic_qtybytranspunit_l'}) * 1;
        let convertByTransportUnit = curRec.getCurrentSublistValue({sublistId: sublistId, fieldId: 'custrecord_scv_ic_converbytranspunit_l'}) * 1;
        let oddQuantity = curRec.getCurrentSublistValue({sublistId: sublistId, fieldId: 'custrecord_scv_ic_oddquantity_l'}) * 1;
        let actualQuantity = quantityByTransportUnit * convertByTransportUnit + oddQuantity;

        curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: 'custrecord_scv_ic_actualquantity_l', value: actualQuantity});
    };

    const setHeaderValueToCurrentLine = (curRec, sublistId) => {
        let item = curRec.getCurrentSublistValue({sublistId: sublistId,  fieldId: 'custrecord_scv_ic_item_l'});
        if (!item) return;
        
        let custrecord_scv_ic_subsidiary_l = curRec.getValue({fieldId: 'custrecord_scv_ic_subsidiary_h'});
        let custrecord_scv_ic_location_l = curRec.getValue({fieldId: 'custrecord_scv_ic_location_h'});
        
        curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: 'custrecord_scv_ic_subsidiary_l', value: custrecord_scv_ic_subsidiary_l});
        curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: 'custrecord_scv_ic_location_l', value: custrecord_scv_ic_location_l});
    };

    return {
        calcSoLuongChenhLech,
        calcSoLuongThucTeKiemKe,
        setHeaderValueToCurrentLine,
        setLineNumber,
    };
});
