/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
    'N/search',
    '../lib/scv_lib_cs.js',
],
function(
    search,
    libCS, 
) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) { 
        pageInit_FromBtnRefund(scriptContext);
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {

    }

    const pageInit_FromBtnRefund = (scriptContext) => {
        let curRec = scriptContext.currentRecord;
        let mode = scriptContext.mode;
        let params = libCS.getObjParamsUrl(curRec);

        if(mode === 'copy' && params.transform === 'rtnauth' && params.memdoc == 0) {
            let reasonId = curRec.getValue("custbody_scv_rea_reason");
            let itemReason = getItemReason(reasonId);
            insertLineItem(curRec, itemReason);
        }
    }

    const insertLineItem = async (curRec, itemReason) => {
        if(!itemReason) return;
        const DEFAULT_ZERO_VALUES = 0;
        let sl = 'item';
        libCS.showLoadingDialog(true);

        await libCS.delay(100);
        try {
            let arrSublist = getDataSublistItem(curRec, sl, itemReason);
            let lc = curRec.getLineCount(sl);
            for(let i = 0; i < lc; i++) {
                curRec.selectLine(sl, i);
                curRec.setCurrentSublistValue(sl, 'rate', DEFAULT_ZERO_VALUES);
                curRec.setCurrentSublistValue(sl, 'amount', DEFAULT_ZERO_VALUES);
                curRec.setCurrentSublistValue(sl, 'tax1amt', DEFAULT_ZERO_VALUES);
                curRec.setCurrentSublistValue(sl, 'grossamt', DEFAULT_ZERO_VALUES);
                curRec.commitLine(sl);
            }

            await addLineItemNoneAsyn(curRec, arrSublist, sl);
        } catch (err) {
            console.log(err.message);
            libCS.showLoadingDialog(false);
        }
    }

    const addLineItemNoneAsyn = async (curRec, arrLine, sublistId) => {
        if(arrLine.length > 0){
            let objLine = arrLine[0];
            arrLine.shift();

            curRec.selectNewLine({sublistId: sublistId});

            curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "item", value: objLine.item});
            curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custcol_scv_discount_per", value: objLine.custcol_scv_discount_per});
            curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custcol_scv_item_upccode", value: objLine.custcol_scv_item_upccode});
            curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "price", value: objLine.price});
            curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custcol_scv_remove_issue_einv", value: objLine.custcol_scv_remove_issue_einv});
            curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custcol_scv_item", value: objLine.custcol_scv_item});
            curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custcol_scv_origin_line_num", value: objLine.custcol_scv_origin_line_num});
            
            await libCS.delay(500);
            curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "quantity", value: objLine.quantity});
            curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "rate", value: objLine.rate});
            curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "taxcode", value: objLine.taxcode});

            await libCS.delay(500);
            curRec.commitLine({sublistId: sublistId});

            await addLineItemNoneAsyn(curRec, arrLine, sublistId);
        } else {
            await libCS.delay(300);
            let eleField = document.getElementById('entity_display');
            if(!!eleField) {
                eleField.focus();
            }

            libCS.showLoadingDialog(false);
        }
    }

    const getDataSublistItem = (curRec, sl, itemReason) => {
        const PRICE_CUSTOM = -1;
        let arrResult = [];
        let lc = curRec.getLineCount(sl);
        for(let i = 0; i < lc; i++) {
            arrResult.push({
                item: itemReason,
                custcol_scv_item: curRec.getSublistValue(sl, 'item', i),
                custcol_scv_origin_line_num: curRec.getSublistValue(sl, 'custcol_scv_origin_line_num', i) || "",
                custcol_scv_discount_per: curRec.getSublistValue(sl, 'custcol_scv_discount_per', i) || "",
                custcol_scv_item_upccode: curRec.getSublistValue(sl, 'custcol_scv_item_upccode', i) || "", 
                quantity: curRec.getSublistValue(sl, 'quantity', i) * 1,
                price: PRICE_CUSTOM,
                rate: curRec.getSublistValue(sl, 'rate', i) * 1,
                amount: curRec.getSublistValue(sl, 'amount', i) * 1,
                taxcode: curRec.getSublistValue(sl, 'taxcode', i) * 1,
                tax1amt: curRec.getSublistValue(sl, 'tax1amt', i) * 1,
                grossamt: curRec.getSublistValue(sl, 'grossamt', i) * 1,
                custcol_scv_remove_issue_einv: true	
            });
        }
        return arrResult;
    }

    const getItemReason = (reasonId) => {
        if(!reasonId) return null;

        let errorCateLKF = search.lookupFields({
            type: 'customrecord_scv_error_category',
            id: reasonId,
            columns: ['custrecord_scv_error_cate_item']
        });

        let itemId = errorCateLKF?.custrecord_scv_error_cate_item?.[0]?.value || null;
        return itemId;
    }

    return {
        pageInit: pageInit,
        // fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // saveRecord: saveRecord
    };
    
});
