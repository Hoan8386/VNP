/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  09 Sept 2026        Khanh Tran              Init, create file.  Chức năng tự động điền thông tin cho Lot Number Record from ms.Thủy(https://app.clickup.com/t/3773072/14yhnhmfdfg)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/redirect', 'N/record',

    '../common/scv_common_tran2lot.js',

    '../cons/scv_cons_form.js',
], (
    runtime, redirect, record,

    commonTran2Lot,

    constForm
) => {
    const CurrentScript = {
        ID: 'customscript_scv_sl_tran2lot',
        DEPLOYID_UI: 'customdeploy_scv_sl_tran2lot',
        DEPLOYID_DATA: 'customdeploy_scv_sl_tran2lot_svc',
    };

    const onRequest = (scriptContext) => {
        constForm.setContext(scriptContext);
        constForm.setServiceScript(CurrentScript.ID, CurrentScript.DEPLOYID_DATA);

        let params = scriptContext.request.parameters;
        let curScript = runtime.getCurrentScript();

        if (curScript.deploymentId == CurrentScript.DEPLOYID_DATA) {
            commonTran2Lot.fillInfoLot(params);

            redirect.toRecord({
                type: params.recordtype,
                id: params.recid,
            });
        }
        else if (scriptContext.request.method == 'GET') {
           
        }
    };

    return { onRequest };
});
