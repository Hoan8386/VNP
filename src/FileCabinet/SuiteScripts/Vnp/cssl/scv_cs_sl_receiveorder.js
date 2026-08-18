/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  17 Aug 2026         Khanh Tran              Init, create file. Tạo Item Receipt từ dữ liệu Purchase Order, Return Authorization, Transfer Order from ms. Thủy(https://app.clickup.com/t/3773072/86d41eg08)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define([
    '../common/scv_common_receiveorder.js',
], (
    commonReceiveorder,
) => {
    const pageInit = (scriptContext) => {
        // TODO: Initialize the page.
    };

    const searchResult = () => {
        if (!_scvForm.validateFieldMandatory([
            'custpage_ordernumber', 'custpage_trandate',
        ])) return;

        _scvForm.showLoadingDialog(true);

        let params = _scvForm.getParameter();

        let arrActionFunc = [];
        if (params.custpage_inboundshipment) {
            arrActionFunc.push({
                action: 'get_data_inboundshipment', params: { ...params }
            })
        }
        else {
            if (params.custpage_itemfulfillment) {
                arrActionFunc.push({
                    action: 'get_data_itemfulfillment', params: { ...params }
                })
            }
            else {
                arrActionFunc.push({
                    action: 'get_data_source_trans_create_itr_01', params: { ...params }
                })
            }
        }

        _scvForm.ajax.postAsyncMultiFetchSSPage(_scvForm.serviceScript.url, arrActionFunc, (arrResponse) => {
            let dataInput = {
                arrDataSource: _scvForm.getResultActionPage(arrResponse, 'search_receiveorder'),
            };

            let arrResult = commonReceiveorder.getDataResult(params, dataInput);

            _scvDx.setDataSource('custpage_sl_result', arrResult);
            _scvForm.showLoadingDialog(false);
        });
    };

    const onSubmit = () => {
        let params = _scvForm.getParameter();
        _scvForm.showLoadingDialog(true);
        _scvForm.ajax.postAsync(_scvForm.serviceScript.url, {
            ...params,
            action: 'onSubmitReceiveorder',
        }, (response) => {
            // TODO: Map the submit response.
            _scvForm.showLoadingDialog(false);
        });
    };

    return {
        pageInit,
        searchResult,
        onSubmit,
    };
});
