/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/url'],
    (url) => {

        const APPROVAL_STATUS_APPROVED = '6';
        const CREATE_SO_SUITELET = {
            SCRIPT_ID: 'customscript_scv_sl_create_so',
            DEPLOYMENT_ID: 'customdeploy_scv_sl_create_so'
        };

        /**
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            try {
                if (scriptContext.type !== scriptContext.UserEventType.VIEW) return;
                addCreateSalesOrderButton(scriptContext.form, scriptContext.newRecord);
            } catch (e) {
                log.error('beforeLoad Sales Contract buttons', e);
            }
        }

        function addCreateSalesOrderButton(form, rec) {
            const approvalStatus = String(rec.getValue('custbody_scv_approval_status') || '');
            if (approvalStatus !== APPROVAL_STATUS_APPROVED) return;

            const resolvedUrl = url.resolveScript({
                scriptId: CREATE_SO_SUITELET.SCRIPT_ID,
                deploymentId: CREATE_SO_SUITELET.DEPLOYMENT_ID,
                returnExternalUrl: false,
                params: {
                    custpage_created_from: 'sc',
                    custpage_subsidiary: rec.getValue('subsidiary') || '',
                    custpage_customer_filter: rec.getValue('entity') || '',
                    custpage_customer: rec.getValue('entity') || '',
                    custpage_sales_contract: rec.id || '',
                    custpage_is_search: 'T'
                }
            });
            form.addButton({
                id: 'custpage_scv_create_so',
                label: 'Create SO',
                functionName: `window.open("${resolvedUrl}", "_self")`
            });
        }

        /**
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            try {
                // if (scriptContext.type !== 'create' && scriptContext.type !== 'edit') return;
                // libCalc.recalcTotalFromAllLines(scriptContext.newRecord);
            } catch (e) {
                log.error('Error beforeSubmit', e);
            }
        }

        return {beforeLoad, beforeSubmit}

    });
