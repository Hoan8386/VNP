/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['../common/scv_common_conversionrate.js'],
    
    (comConRate) => {
        
        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            let trType = scriptContext.type;
            if (trType === 'create' || trType === 'edit' || trType === 'copy') {
                comConRate.setConversionRateNewRecord(scriptContext.newRecord);
            }
        }
        
        return {beforeSubmit}//beforeLoad, beforeSubmit, afterSubmit
        
    });
