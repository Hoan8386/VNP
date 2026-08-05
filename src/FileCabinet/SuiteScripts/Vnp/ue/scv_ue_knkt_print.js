/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/url', '../common/scv_common_ui'], (url, comUI) => {
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
            // TODO(BA-Q4): Confirm whether the button should also appear on EDIT or CREATE.
            if (scriptContext.type === scriptContext.UserEventType.VIEW) {
                const urlSl = url.resolveScript({
                    scriptId: 'customscript_scv_sl_knkt_print',
                    deploymentId: 'customdeploy_scv_sl_knkt_print',
                    returnExternalUrl: false,
                    params: {
                        recid: scriptContext.newRecord.id,
                        printfile: 'scv_render_knkt_pdf'
                    }
                });

                scriptContext.form.addButton({
                    id: 'custpage_scv_btn_knkt_pdf',
                    label: 'Print KNKT',
                    functionName: "window.open('" + urlSl + "');"
                });
                comUI.addIconToButton(scriptContext.form);
            }
        }

        return {beforeLoad}

    });
