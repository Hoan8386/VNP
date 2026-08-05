/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  5 Aug 2026          Thanh Hoan			    Init, create file.
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['../common/scv_common_upd_proposal',],
    (commonUPDProposal) => {

        /**
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            try {
                if (scriptContext.type !== 'edit') return;
                commonUPDProposal.updateInformationForProposal(scriptContext.newRecord);
            } catch (e) {
                log.error('Error beforeSubmit', e);
            }
        }

        return {beforeSubmit}

    });
