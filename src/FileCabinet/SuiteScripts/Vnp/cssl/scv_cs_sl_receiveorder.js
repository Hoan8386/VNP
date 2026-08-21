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
define(['N/ui/message', 'N/search', 'N/url'
], (message, search, url
) => {
    const pageInit = (scriptContext) => {
        // TODO: Initialize the page.
    };

    const searchResult = () => {
        window.onbeforeunload = null;

        if (!_scvForm.validateFieldMandatory([
            'custpage_ordernumber', 'custpage_trandate',
        ])) return;

        let params = _scvForm.getParameter();
        let queryString = new URLSearchParams(params).toString();
        let urlSearch = _scvForm.currentScript.url + '&' + queryString;

        window.location.replace(urlSearch);
    };

    const onBackForm = () => {
        if (!_scvForm.validateFieldMandatory([
            'custpage_ordernumber',
        ])) return;

        let orderNumber = _scvForm.currentRecord.getValue({fieldId: 'custpage_ordernumber'});
        let tranLkf = search.lookupFields({
            type: search.Type.TRANSACTION,
            id: orderNumber,
            columns: ['recordtype'],
        });
        let urlBack = url.resolveRecord({
            recordType: tranLkf.recordtype,
            recordId: orderNumber,
        });

        window.onbeforeunload = null;
        window.location.replace(urlBack);
    };

    const onSubmit = () => {
        clearMessages();

        if (!confirm('Bạn có muốn tạo phiếu Item Receipt không?')) return;

        let currentRecord = _scvForm.currentRecord;
        let sublistId = 'custpage_sl_result';
        let inventoryDetailFieldId = 'custpage_col_inventorydetail';
        let lineCount = currentRecord.getLineCount({sublistId});
        let arrLines = [];

        for (let i = 0; i < lineCount; i++) {
            let isCreate = currentRecord.getSublistValue({sublistId, fieldId: 'custpage_col_create', line: i});
            if (isCreate !== true && isCreate !== 'T') continue;

            // try {
            //     if (!_scvInventoryDetail.validateLine(sublistId, inventoryDetailFieldId, i)) return;
            // } catch (error) {
            //     console.log('error-validateLine', error);
            //     alert(error.message.toString());
            //     return;
            // }

            let keyStore = currentRecord.getSublistValue({
                sublistId,
                fieldId: _scvInventoryDetail.getStoreFieldId(inventoryDetailFieldId),
                line: i,
            });

            arrLines.push({
                item: currentRecord.getSublistValue({sublistId, fieldId: 'custpage_col_item', line: i}),
                quantity: currentRecord.getSublistValue({sublistId, fieldId: 'custpage_col_quantitytobereceived', line: i}),
                location: currentRecord.getSublistValue({sublistId, fieldId: 'custpage_col_receivelocation', line: i}),
                originallineid: currentRecord.getSublistValue({sublistId, fieldId: 'custpage_col_originallineid', line: i}),
                lineid_inboundshipment: currentRecord.getSublistValue({sublistId, fieldId: 'custpage_col_lineidinboundshipment', line: i})*1,
                inventorydetail: _scvInventoryDetail.getDataStoreInventoryClientSide(keyStore),
            });
        }
        
        if (arrLines.length == 0) {
            alert('Vui lòng chọn ít nhất một dòng để tạo Item Receipt.');
            return;
        }

        let params = _scvForm.getParameter();
        let objReqBody = {...params, arrLines};

        _scvForm.showLoadingDialog(true);
        _scvForm.ajax.postAsync(_scvForm.serviceScript.url, {
            action: 'onSubmitReceiveorder',
            body: JSON.stringify(objReqBody),
        }, (response) => {
            if (response?.data?.success) {
                if (response.data.recUrl) {
                    window.onbeforeunload = null;
                    window.location.replace(response.data.recUrl);
                    return;
                }

                let resultLabel = objReqBody.custpage_inboundshipment ? 'Receive Inbound Shipment' : response.data.tranId;
                let result = response.data.recUrl ? `<a href="${response.data.recUrl}" target="_blank">${resultLabel}</a>` : resultLabel;
                showResult(message.Type.CONFIRMATION, result);
            }
            else {
                showResult(message.Type.ERROR, response.data.msg);
            }

            _scvForm.showLoadingDialog(false);
        });
    };

    let currentMessages = [];
    const showResult = (type, notes, time = -1) => {
        let msg = message.create({
            title: '',
            message: notes,
            type: type || message.Type.INFORMATION,
        });

        msg.show({duration: time});
        currentMessages.push(msg);
    };

    const clearMessages = () => {
        currentMessages.forEach(msg => {
            try {
                msg.hide();
            }
            catch (e) {}
        });
        currentMessages = [];
    };

    return {
        pageInit,
        searchResult,
        onBackForm,
        onSubmit,
    };
});
