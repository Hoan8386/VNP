/**
 * Nội dung:
 * Key word:
 * =======================================================================================
 *  Date                Author                  Description
 *  ?                   ?                       ?
 *  13 Aug 2026         Khanh Tran              Init, create file
 *  13 Aug 2026         Khanh Tran              Add button 'Tạo P. Kiểm nhận' tại [purchaseorder, returnauthorization, transferorder] from ms. Thủy (https://app.clickup.com/t/86d40b1jh)
 *  17 Aug 2026         Khanh Tran              Add button 'Create ITR' tại [purchaseorder, returnauthorization, transferorder] from ms. Thủy (https://app.clickup.com/t/86d41eg08)
 *  20 Aug 2026         Khanh Tran              Add button 'Update INB Info' tại [itemreceipt] from ms. Thủy (https://app.clickup.com/t/86d42geh8)
 *  10 Sep 2026         Khanh Tran              Add button 'Fill Info Ori Lot' tại [itemreceipt, inventoryadjustment] from ms. Thủy (https://app.clickup.com/t/14yhnhmfdfg)
 *  17 Sep 2026         Phu Pham                Thêm bttuon phiếu đánh giá from ms. Thuỷ (https://app.clickup.com/t/3773072/14yhnhmfkte)
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
    '../common/scv_common_receiveorder.js',
   '../common/scv_common_itemreceipt.js',
    '../common/scv_common_bcthkn.js',
    '../common/scv_common_check_dkkd.js',
    '../common/scv_common_tran2lot.js',
], (
    url,
    record,
    query,
    runtime,
    lbf,
    libHtml,

    commonCreatePkn,
    commonReceiveorder,
    commonItemreceipt,
    commonBcthkn,
    commonCheckDkkd,
    commonTran2Lot,
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
        commonReceiveorder.addButtonCreateItr(scriptContext);
        commonCheckDkkd.addButtonCheckDkkd(scriptContext);
        commonTran2Lot.addButtonFillLot(scriptContext);

        switch (newRec.type) {
            case 'itemreceipt':
                commonItemreceipt.addButtonUpdateInbInfo(scriptContext);
                break;
            case 'customrecord_scv_xu_ly_kien_nghi':
                commonBcthkn.addButtonViewReport(scriptContext);
                break;
            case 'vendor':
                addBtnEvaluationEntity(form, newRec);
                break;
            case 'customer':
                addBtnEvaluationEntity(form, newRec);
                break;
        }

        libHtml.addIconButtonExport(form, arrBtnPrint, 'custpage_add_icon_prt');
    };

    const addBtnEvaluationEntity = (form, newRec) => {
        const slUrl = url.resolveScript({
            scriptId: 'customscript_scv_sl_evaluation_entity',
            deploymentId: 'customdeploy_scv_sl_evaluation_entity',
            returnExternalUrl: false,
            params: {
                custpage_entity: newRec.id
            }
        });
        form.addButton({
            id: 'custpage_btn_eval_entity',
            label: 'Phiếu đánh giá',
            functionName: `window.location.replace('${slUrl}');`,
        });
    }

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
