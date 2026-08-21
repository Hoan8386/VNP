/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  14 Aug 2026         Thanh Hoan              Init, create file. Chức năng phân bổ doanh thu chưa thực hiên from ms. Tâm(https://app.clickup.com/t/3773072/86d40yedc)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define([
    '../common/scv_common_pbdtcth.js',
], (
    commonPbdtcth,
) => {
    function pageInit(scriptContext) {

    }
    const searchResult = async () => {
        let isValidate = _scvForm.validateFieldMandatory(["custpage_subsidiary", "custpage_date"]);
        if (!isValidate) return;

        _scvForm.showLoadingDialog(true);

        let params = _scvForm.getParameter(); 
        
        let requestData = {
            action: 'getDataSource',
            ...params
        };

        _scvForm.ajax.postAsync(_scvForm.serviceScript.url, requestData, (response) => {

            _scvDx.setDataSource("custpage_sl_result", response.data);

            _scvForm.showLoadingDialog(false);

        });
    };

    return {
        pageInit,
        searchResult,

    };
});
