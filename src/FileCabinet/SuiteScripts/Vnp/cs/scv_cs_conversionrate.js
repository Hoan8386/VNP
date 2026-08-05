/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['../common/scv_common_conversionrate.js'],
    
    function (comConRate) {
        
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
            // console.log(scriptContext.fieldId);
            // let sublistId = scriptContext.sublistId;
            // let fieldId = scriptContext.fieldId;
            // if(sublistId) {
            //     let currentRecord = scriptContext.currentRecord;
            //     let objBaseField = comConRate.getBaseField(currentRecord.type);
            //     if(fieldId === objBaseField.unitconversion) {
            //         comConRate.setCurrentConversionRate(currentRecord, sublistId, objBaseField);
            //     }
            // if(fieldId === 'units') {
            //     let units = currentRecord.getCurrentSublistValue({sublistId: sublistId, fieldId: 'units'});
            //     let resCall = nlapiRequestURL('/app/site/hosting/scriptlet.nl?script=customscript_scv_sl_conversionrate&deploy=customdeploy_scv_sl_conversionrate', {onlyone: 'T', units: units});
            //     let conversionrate = resCall.getBody();
            //     currentRecord.setCurrentSublistValue({sublistId: sublistId, fieldId: 'custcol_scv_conversion_rate', value: conversionrate});
            // }
            // }
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
            let sublistId = scriptContext.sublistId;
            let fieldId = scriptContext.fieldId;
            if (sublistId) {
                let currentRecord = scriptContext.currentRecord;
                if ('units' === fieldId) {
                    comConRate.setCurrentConversionRate(currentRecord, sublistId, null);
                }
            }
        }
        
        return {
            fieldChanged: fieldChanged,
            postSourcing: postSourcing,
        };
        
    });
