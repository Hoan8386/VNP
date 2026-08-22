/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    'N/url',
    '../common/scv_common_ui'
], (
    url,
    comUI
) => {
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
            if (scriptContext.type === scriptContext.UserEventType.VIEW) {
                let itemFulfillment = scriptContext.newRecord;
                let itemFulfillmentId = itemFulfillment.id;
                let itemFulfillmentType = itemFulfillment.type;

                let urlSlPrintPxk = url.resolveScript({
                    scriptId: 'customscript_scv_sl_kbbgh_print',
                    deploymentId: 'customdeploy_scv_sl_kbbgh_print',
                    returnExternalUrl: false,
                    params: {
                        recid: itemFulfillmentId,
                        rectype: itemFulfillmentType,
                        printfile: 'scv_render_kbbgh_pdf'
                    }
                });
                let form = scriptContext.form;
                form.addButton({
                    id: 'custpage_scv_btn_kbbgh_pdf',
                    label: 'PXK KBBGH',
                    functionName: "window.open('" + urlSlPrintPxk + "');"
                });
                comUI.addIconToButton(scriptContext.form, 'custpage_scv_field_icons_kbbgh');
            }
        }

        return {beforeLoad}

    });
