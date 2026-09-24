/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    'N/url',
    '../common/scv_common_ui',
    '../cons/scv_cons_print.js'
],
    /**
 * @param{url} url
 */
    (url, comUI, consPrint) => {
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
            if (scriptContext.type !== scriptContext.UserEventType.VIEW) return;

            const rec = scriptContext.newRecord;
            const params = {};
            params[consPrint.UrlParameter.RECORD_ID] = rec.id;
            params[consPrint.UrlParameter.RECORD_TYPE] = rec.type;
            params[consPrint.UrlParameter.PRINT_FILE] = consPrint.Pnk.PRINT_FILE;
            const suiteletUrl = url.resolveScript({
                scriptId: 'customscript_scv_sl_pnk_print',
                deploymentId: 'customdeploy_scv_sl_pnk_print',
                returnExternalUrl: false,
                params
            });

            scriptContext.form.addButton({
                id: 'custpage_scv_btn_pnk_pdf',
                label: 'PNK',
                functionName: "window.open('" + suiteletUrl + "');"
            });
            comUI.addIconToButton(
                scriptContext.form,
                'custpage_scv_field_icons_pnk'
            );
        }

        return {beforeLoad}

    });
