/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/url', '../common/scv_common_ui'], (url, comUI) => {
    // Payment Request PDF button configuration.
    const MauIn = {
        DNTU: {
            types: [4],
            buttonId: 'custpage_scv_btn_dntu_pdf',
            label: 'ĐNTƯ',
            printfile: 'scv_render_dntu_pdf',
            mau: 'dntu'
        },
        DNTT: {
            // TODO(BA-Q6): all listed payment types currently use one template.
            types: [1, 2, 3, 5, 6],
            buttonId: 'custpage_scv_btn_dntt_pdf',
            label: 'ĐNTT',
            printfile: 'scv_render_dntt_pdf',
            mau: 'dntt'
        }
    };

    /**
     * Adds the appropriate PDF button while viewing a Payment Request.
     * @param {Object} scriptContext
     * @returns {void}
     */
    const beforeLoad = (scriptContext) => {
        if (scriptContext.type !== scriptContext.UserEventType.VIEW) {
            return;
        }
        const paymentType = Number(scriptContext.newRecord.getValue({
            fieldId: 'custrecord_scv_payment_type'
        }));
        const mauIn = Object.values(MauIn).find((item) => item.types.includes(paymentType));
        if (!mauIn) {
            return;
        }
        const suiteletUrl = url.resolveScript({
            scriptId: 'customscript_scv_sl_pr_print',
            deploymentId: 'customdeploy_scv_sl_pr_print',
            params: {
                recid: scriptContext.newRecord.id,
                printfile: mauIn.printfile,
                mau: mauIn.mau
            }
        });
        scriptContext.form.addButton({
            id: mauIn.buttonId,
            label: mauIn.label,
            functionName: "window.open('" + suiteletUrl + "');"
        });
        comUI.addIconToButton(scriptContext.form);
    };

    return {beforeLoad};
});
