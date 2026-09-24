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
            const vendorReturnAuthorization = scriptContext.newRecord;
            const urlSl = url.resolveScript({
                scriptId: 'customscript_scv_sl_bbth_print',
                deploymentId: 'customdeploy_scv_sl_bbth_print',
                returnExternalUrl: false,
                params: {
                    recid: vendorReturnAuthorization.id,
                    rectype: vendorReturnAuthorization.type,
                    printfile: 'scv_render_bbth_pdf'
                }
            });

            scriptContext.form.addButton({
                id: 'custpage_scv_btn_bbth_pdf',
                label: 'BB trả hàng',
                functionName: "window.open('" + urlSl + "');"
            });
            comUI.addIconToButton(
                scriptContext.form,
                'custpage_scv_field_icons_bbth'
            );
        }
    };

    return {beforeLoad};
});
