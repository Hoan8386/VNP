/**
 * Nội dung:
 * Key word:
 * =======================================================================================
 *  Date                Author                  Description
 *  ?                   ?                       ?
 *  13 Aug 2026         Khanh Tran              Init, create file
 *  13 Aug 2026         Khanh Tran              Add button 'Tạo P. Kiểm nhận' tại [purchaseorder, returnauthorization, transferorder] from ms. Thủy (https://app.clickup.com/t/86d40b1jh)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    'N/url',
    'N/record',
    'N/query', 
    'N/runtime',
    '../lib/scv_lib_function.js',
    '../lib/scv_lib_common_html.js',
    '../common/scv_common_create_pkn.js',
], (
    url,
    record,
    query,
    runtime,
    lbf,
    libHtml,

    commonCreatePkn,
) => {
    let arrBtnPrint = [];
    let _currentRecord = null;

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
        addButtonTypeView(scriptContext);
    };

    const addButtonTypeView = (scriptContext) => {
        if (scriptContext.type != 'view') return;

        let form = scriptContext.form;
        let newRec = scriptContext.newRecord;

        commonCreatePkn.addButtonCreatePkn(scriptContext);

        switch (newRec.type) {
            case 'customrecord_scv_planning':
                break;
        }

        libHtml.addIconButtonExport(form, arrBtnPrint, 'custpage_add_icon_prt');
    };

    const getCurrentRecord = (scriptContext) => {
        let newRec = scriptContext.newRecord;
        let curRec = _currentRecord;

        if (!curRec && newRec.id) {
            _currentRecord = record.load({
                type: newRec.type,
                id: newRec.id,
            });

            curRec = _currentRecord;
        } else {
            curRec = newRec;
        }

        return curRec;
    };

    return { beforeLoad };
});
