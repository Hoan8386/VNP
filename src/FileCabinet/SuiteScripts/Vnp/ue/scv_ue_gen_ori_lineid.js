/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['../lib/scv_lib_function'],
    (libFn) => {

        const SUBLIST_ID = 'item';
        const FIELD_ID = 'custcol_scv_origin_line_num';

        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            try {
                if (scriptContext.type === 'copy') {
                    clearOriLineId(scriptContext.newRecord);
                }
            } catch (e) {
                log.error('Error beforeLoad', e);
            }
        }

        function clearOriLineId(curRec) {
            const lc = curRec.getLineCount(SUBLIST_ID);
            for (let i = 0; i < lc; i++) {
                curRec.setSublistValue({
                    sublistId: SUBLIST_ID,
                    fieldId: FIELD_ID,
                    line: i,
                    value: ''
                });
            }
        }

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
                if (scriptContext.type === 'create' || scriptContext.type === 'edit') {
                    libFn.generateUniqueIdForMultiLines(scriptContext.newRecord, SUBLIST_ID, FIELD_ID);
                }
            } catch (e) {
                log.error('Error beforeSubmit', e);
            }
        }

        return {beforeLoad, beforeSubmit}

    });
