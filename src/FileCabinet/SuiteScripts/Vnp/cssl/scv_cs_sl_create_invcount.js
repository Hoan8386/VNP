/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  22 Sep 2026         Khanh Tran              Init, create file. Màn hình suitelet tạo Phiếu kiểm kê, KSCL from ms.Thủy(https://app.clickup.com/t/3773072/14yhnhmfvg9)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define([
    '../common/scv_common_create_invcount.js',
    '../cons/scv_cons_record.js',
], (
    commonCreateInvcount,
    constRecord,
) => {
    const fieldChanged = (scriptContext) => {
        if (scriptContext.fieldId != 'custpage_subsidiary') return;

        let subsidiary = scriptContext.currentRecord.getValue({ fieldId: 'custpage_subsidiary' });
        let locationField = scriptContext.currentRecord.getField({ fieldId: 'custpage_location' });

        constRecord.initLoadFieldClient(locationField, { data: [] }, true);
        _scvDx.setDataSource('custpage_sl_result', []);

        let arrActionFunc = [
            { action: 'getLocations', params: { custpage_subsidiary: subsidiary }, data: [] },
        ];

        _scvForm.ajax.postAsyncMulti(_scvForm.serviceScript.url, arrActionFunc, (arrResponse) => {
            constRecord.initLoadFieldClient(locationField, { data: arrResponse[0].data }, true);
        });
    };

    const searchResult = () => {
        _scvForm.clearMessages();
        
        let params = _scvForm.getParameter();
        if (!_scvForm.validateFieldMandatory(['custpage_subsidiary', 'custpage_location'])) return;

        _scvForm.showLoadingDialog(true);

        let arrActionFunc = [
            { action: 'inv_pkk_01', params: { ...params }, data: [] },
        ];

        _scvForm.ajax.postAsyncMultiFetchSSPage(_scvForm.serviceScript.url, arrActionFunc, (arrResponse) => {
            let dataInput = {
                arrInventory: _scvForm.getResultActionPage(arrResponse, 'inv_pkk_01'),
            };

            let arrResult = commonCreateInvcount.getDataResult(params, dataInput);

            _scvDx.setDataSource('custpage_sl_result', arrResult);
            _scvForm.showLoadingDialog(false);
        });
    };

    const onSubmit = async () => {
        _scvForm.clearMessages();

        let params = _scvForm.getParameter();
        if (!_scvForm.validateFieldMandatory(['custpage_subsidiary', 'custpage_location'])) return;

        let arrResultLine = _scvDx.getDataSource("custpage_sl_result");
        let arrResultSelected = arrResultLine.filter((e) => e.is_check);
        if (arrResultSelected.length == 0) {
            _scvForm.showMsgError("No data to submit");
            return;
        }

        _scvForm.showLoadingDialog(true);

        let objReqBody = {...params, arrResultSelected};
        _scvForm.ajax.postAsync(_scvForm.serviceScript.url, {
            action: "onSubmitCreateInvcount",
            body: JSON.stringify(objReqBody),
        }, (response) => {
            if (response?.data?.success) {
                _scvForm.showMsgConfirmation(`Phiếu kiểm kê, KSCL đã được tạo thành công. <a href="${response.data.recUrl}" target="_blank">IVC${response.data.recId}</a>`, -1);
                _scvDx.setDataSource("custpage_sl_result", []);
            }
            else {
                _scvForm.showMsgError(response.data.msg, 60000);
            }

            _scvForm.showLoadingDialog(false);
        }, (request, status, error) => {
            _scvForm.showMsgError(error, 60000);
            _scvForm.showLoadingDialog(false);
        });
    };

    return {
        fieldChanged,
        searchResult,
        onSubmit,
    };
});
