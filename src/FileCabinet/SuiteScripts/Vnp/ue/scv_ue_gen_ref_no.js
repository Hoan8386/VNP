/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['../lib/scv_lib_refno'],
    (libRefNo) => {

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            try {
                libRefNo.addRefNo(scriptContext.newRecord, scriptContext.type);
            } catch (e) {
                log.error('Error beforeSubmit', e);
            }
        }

        return {beforeSubmit}

    });
