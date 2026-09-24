/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  17 Sep 2026         Khanh Tran			    Init, create file. Chức năng add line Item theo Order Type, from ms.Tâm(https://app.clickup.com/t/14yhnhmfn4f)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search', 
    'N/record',
],

function(search, 
    record,
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
        loadDataFromSO(scriptContext);
    }

    const loadDataFromSO = (scriptContext) => {
        if(scriptContext.mode !== 'copy') return;

        let curRec = scriptContext.currentRecord;
        let params = getObjParamsUrl(curRec);
        if(params.transform != 'salesord') return;

        let order_type = curRec.getValue('custbody_scv_order_type');
        if(!order_type) return;

        let lkOrderType = search.lookupFields({type: 'customrecord_scv_order_type', id: order_type, columns: ['custrecord_scv_ot_item_am']});
        let ot_item = lkOrderType.custrecord_scv_ot_item_am?.[0]?.value;
        if(!ot_item) return;

        let sl = 'item';
        let soRec = record.load({type: 'salesorder', id: params.id, isDynamic: false});
        let ttl_tax1amt = 0;
        for (let i = 0; i < curRec.getLineCount(sl); i++) {
            let tax1amt = soRec.getSublistValue(sl, 'tax1amt', i) * 1;
            ttl_tax1amt += tax1amt;
        }
    
        let rate = ttl_tax1amt * -1;
        curRec.selectNewLine(sl)
        curRec.setCurrentSublistValue({sublistId: sl, fieldId: 'item', value: ot_item, forceSyncSourcing: true});
        curRec.setCurrentSublistValue({sublistId: sl, fieldId: 'quantity', value: 1});
        curRec.setCurrentSublistValue({sublistId: sl, fieldId: 'rate', value: rate});
        curRec.setCurrentSublistValue({sublistId: sl, fieldId: 'amount', value: rate});
        curRec.setCurrentSublistValue({sublistId: sl, fieldId: 'custcol_scv_remove_issue_einv', value: true});
    }

    const getObjParamsUrl = (_curRec) =>{
        let objParams = {};
        let arrKeyValue = _curRec.getValue("entryformquerystring").split("&");
        arrKeyValue.forEach(key_value => objParams[key_value.split("=")[0]] = key_value.split("=")[1]);
        return objParams;
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

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {

    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {

    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {

    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {

    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // sublistChanged: sublistChanged,
        // lineInit: lineInit,
        // validateField: validateField,
        // validateLine: validateLine,
        // validateInsert: validateInsert,
        // validateDelete: validateDelete,
        // saveRecord: saveRecord
    };
    
});
