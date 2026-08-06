/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  6 Aug 2026          Thanh Hoan			    Init, create file.
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['../common/scv_common_inherit_ITR.js',],
    (commonInheritIRC) => {

        /**
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            try {
                if (scriptContext.type === 'create') {
                    commonInheritIRC.inheritInfoFromITR(scriptContext.newRecord);
                }
            } catch (e) {
                log.error('Error beforeSubmit', e);
            }
        }

        return {beforeLoad}

    });
