/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['../lib/scv_lib_purchase_contract_calc'],
    (libCalc) => {

        /**
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            try {
                if (scriptContext.type !== 'create' && scriptContext.type !== 'edit') return;
                libCalc.recalcAllLines(scriptContext.newRecord);
            } catch (e) {
                log.error('Error beforeSubmit', e);
            }
        }

        return {beforeSubmit}

    });
