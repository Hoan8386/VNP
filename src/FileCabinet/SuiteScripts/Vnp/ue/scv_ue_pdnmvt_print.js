/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
// Adds the PDF print button for the custom purchase requisition.
define([
    'N/log', 'N/url',
    '../common/scv_common_ui'
], (
    log, url,
    comUI
) => {
    const BUTTON_LABEL = 'Phiếu ĐN mua VT-HH-TB'; // TODO(BA-Q1): chốt tên button.

    /**
     * Adds the PDF button when the custom purchase requisition is viewed.
     * @param {Object} scriptContext
     * @returns {void}
     */
    const beforeLoad = (scriptContext) => {
        try {
            log.audit({
                title: 'PDNMVT beforeLoad entered',
                details: {
                    type: scriptContext.type,
                    id: scriptContext.newRecord.id,
                    recordType: scriptContext.newRecord.type
                }
            });
            if (scriptContext.type !== scriptContext.UserEventType.VIEW) {
                return;
            }
            const suiteletUrl = url.resolveScript({
                scriptId: 'customscript_scv_sl_pdnmvt_print',
                deploymentId: 'customdeploy_scv_sl_pdnmvt_print',
                params: {
                    recid: scriptContext.newRecord.id,
                    printfile: 'scv_render_pdnmvt_pdf'
                }
            });
            log.audit({
                title: 'PDNMVT suitelet URL resolved',
                details: suiteletUrl
            });
            scriptContext.form.addButton({
                id: 'custpage_scv_btn_pdnmvt_pdf',
                label: BUTTON_LABEL,
                functionName: "window.open('" + suiteletUrl + "');"
            });
            log.audit({
                title: 'PDNMVT print button added',
                details: {
                    id: 'custpage_scv_btn_pdnmvt_pdf',
                    label: BUTTON_LABEL
                }
            });
            comUI.addIconToButton(scriptContext.form, 'custpage_scv_field_icons_pdnmvt');
        } catch (error) {
            log.error({
                title: 'PDNMVT beforeLoad failed',
                details: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }
            });
        }
    };

    return {beforeLoad};
});
