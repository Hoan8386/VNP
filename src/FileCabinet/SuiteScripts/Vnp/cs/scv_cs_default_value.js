/**
 * Nội dung: 
 * * =======================================================================================
 *  Date                    Author                  Description
 *  28 Jul 2026			    Phu Pham				Init, move code from CPC1 from ms. Tâm (https://app.clickup.com/t/3773072/86d3ug2ne)
 *  28 Jul 2026			    Phu Pham				Điều chỉnh lại chức năng để apply cho VNP
 */

/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
    'N/query', 'N/record',
    '../lib/scv_lib_function.js',
],

function(
    query, record, lfunc
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
        fieldChangedEntitySublist(scriptContext);
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
        let curRec = scriptContext.currentRecord;
        let sublistId = scriptContext.sublistId;
        let fieldId = scriptContext.fieldId;

        if(!sublistId) {
            fieldChangedEntity(curRec, fieldId);
        }
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
        return true;
    }

    const setDefaultValueData = (curRec, sublistId, fieldId, value) => {
        let lc = curRec.getLineCount(sublistId);
        for(let i = 0; i < lc; i++) {
            nlapiSetLineItemValue(sublistId, fieldId, (i + 1), value);
        }
    }

    const setSublistValueField = (isChange, curRec, sublistId, fieldId, value) => {
        if(isChange === true) {
            curRec.setCurrentSublistValue(sublistId, fieldId, value);
        }
    }

    const defaultSublistField = (isDefault, sublistId, curRec, fieldDefault) => {
        if(!!isDefault) {
            let memo = curRec.getValue("memo");
            curRec.setCurrentSublistValue(sublistId, fieldDefault, memo);
        }
    }

    function fieldChangedEntitySublist(_scriptContext) {
        let curRec = _scriptContext.currentRecord;
        let sublistId = _scriptContext.sublistId;
        let fieldId = _scriptContext.fieldId;

        let recType = curRec.type;
        if(!['deposit'].includes(recType)) return;
        
        if(sublistId === 'other' && fieldId === 'entity') {
            let entity = curRec.getCurrentSublistValue(sublistId, fieldId);
            curRec.setValue("custbody_scv_tb_entity_name", entity);
        }
    }

    function fieldChangedEntity(_curRec, _fieldId) {
        let arrCustomer = ["customerpayment"];
        let arrChangeEntity = [
            "customerpayment", "vendorprepayment", "vendorpayment", "vendorbill", "vendorcredit",
            "check", "invoice", "creditmemo"
        ];

        let recType = _curRec.type;
        let entityField = !arrCustomer.includes(recType) ? "entity" : "customer";
        
        if(_fieldId === entityField && arrChangeEntity.includes(recType)) {
            let entity = _curRec.getValue(_fieldId);
            _curRec.setValue("custbody_scv_tb_entity_name", entity);
        } 
    }

    return {
        // pageInit: pageInit,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        // saveRecord: saveRecord
    };
    
});
