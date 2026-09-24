/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  07 Sep 2026         Khanh Tran              Init & create file. Chức năng kiểm tra điều kiện kinh doanh from ms. Thủy(https://app.clickup.com/t/3773072/14yhnhmexrx)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/redirect', 'N/runtime',

    '../common/scv_common_check_dkkd.js',

    '../cons/scv_cons_form.js',
], (
    redirect, runtime,

    commonCheckDkkd,

    constForm,
) => {
    const CurrentScript = {
        ID: 'customscript_scv_sl_check_dkkd',
        DEPLOYID_UI: 'customdeploy_scv_sl_check_dkkd',
        DEPLOYID_DATA: 'customdeploy_scv_sl_check_dkkd_svc',
    };

    const onRequest = (scriptContext) => {
        constForm.setContext(scriptContext);
        constForm.setServiceScript(CurrentScript.ID, CurrentScript.DEPLOYID_DATA);

        let params = scriptContext.request.parameters;
        let curScript = runtime.getCurrentScript();

        if (curScript.deploymentId == CurrentScript.DEPLOYID_DATA) {
            let objData = null;
            switch (params.action) {
                case 'checkDkkdKhachHang':
                    objData = commonCheckDkkd.getDataDkkdKhachHang(params);
                    break;
                case 'checkDkkdNhaCungCap':
                    objData = commonCheckDkkd.getDataDkkdNhaCungCap(params);
                    break;
            };
            if (objData) commonCheckDkkd.updRecord(params, objData);

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
