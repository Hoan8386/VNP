/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  12 Aug 2026         Khanh Tran              Init, create file. Chức năng tạo Phiếu kiểm nhận from ms. Thủy(https://app.clickup.com/t/3773072/86d40b1jh)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/search', "N/ui/message",
    '../common/scv_common_create_pkn.js',
], (search, message,
    commonCreatePkn,
) => {
    const pageInit = (scriptContext) => {
        let sourceFieldId = getSourceFieldId(scriptContext.currentRecord);
        let createdFrom = scriptContext.currentRecord.getValue({
            fieldId: sourceFieldId
        });

        if (createdFrom) {
            searchResult();
        }

        setOptionGridResult();
    };

    const getSourceFieldId = (curRec) => {
        return curRec.getField({fieldId: 'custpage_inboundshipment'}) ? 'custpage_inboundshipment' : 'custpage_createdfrom';
    };

    const setOptionGridResult = () => {
        _scvDx.setOption("custpage_sl_result", "onRowUpdating", function (event) {
            let fieldChangedId = Object.keys(event.newData)[0];
            let curData = event.oldData;
            let newValue = event.newData[fieldChangedId];

            if (fieldChangedId === "custpage_col_quantity") {
                if (newValue > curData.custpage_col_remaningquantity) {
                    alert("Quantity cannot exceed Remaining Quantity");
                    event.newData[fieldChangedId] = curData.custpage_col_remaningquantity;
                }

                if (newValue <= 0) {
                    alert("Quantity cannot be negative");
                    event.newData[fieldChangedId] = curData.custpage_col_remaningquantity;
                }
            }
        });
    };

    const searchResult = () => {
        clearMessages();

        let params = _scvForm.getParameter();
        let sourceFieldId = params.custpage_inboundshipment ? 'custpage_inboundshipment' : 'custpage_createdfrom';
        if (!_scvForm.validateFieldMandatory([sourceFieldId])) return;
        
        _scvForm.showLoadingDialog(true);

        let arrActionFunc = [];
        if (params.custpage_inboundshipment) {
            let lkInb = search.lookupFields({
                type: 'inboundshipment', id: params.custpage_inboundshipment, columns: ['custrecord_scv_inb_po.custbody_scv_loai_kiem_nhap']
            });
            let custpage_loaikiemnhap = lkInb['custrecord_scv_inb_po.custbody_scv_loai_kiem_nhap']?.[0]?.value || '';

            arrActionFunc = [
                { action: 'inb_to_pkn_06', params: { ...params }, data: [] },
                { action: 'total_qty_pkn_02', params: { ...params }, data: [] },
                { action: 'tcn_data_03', params: { ...params, custpage_loaikiemnhap }, data: [] },
                { action: 'item_tck_04', params: { ...params, custpage_loaikiemnhap }, data: [] },
                { action: 'tcn_hanghoa_05', params: { ...params, custpage_loaikiemnhap }, data: [] },
            ];
        }
        else {
            let lkTran = search.lookupFields({
                type: 'transaction', id: params.custpage_createdfrom, columns: ['custbody_scv_loai_kiem_nhap']
            });
            let custpage_loaikiemnhap = lkTran.custbody_scv_loai_kiem_nhap?.[0]?.value || '';

            arrActionFunc = [
                { action: 'trans_to_pkn_01', params: { ...params }, data: [] },
                { action: 'total_qty_pkn_02', params: { ...params }, data: [] },
                { action: 'tcn_data_03', params: { ...params, custpage_loaikiemnhap }, data: [] },
                { action: 'item_tck_04', params: { ...params, custpage_loaikiemnhap }, data: [] },
                { action: 'tcn_hanghoa_05', params: { ...params, custpage_loaikiemnhap }, data: [] },
            ];
        }

        _scvForm.ajax.postAsyncMultiFetchSSPage(_scvForm.serviceScript.url, arrActionFunc, (arrResponse) => {
            let dataInput = {
                arrTranToPkn01: _scvForm.getResultActionPage(arrResponse, 'trans_to_pkn_01'),
                arrTotalQtyPkn02: _scvForm.getResultActionPage(arrResponse, 'total_qty_pkn_02'),
                arrTcnData03: _scvForm.getResultActionPage(arrResponse, 'tcn_data_03'),
                arrItemTck04: _scvForm.getResultActionPage(arrResponse, 'item_tck_04'),
                arrTcnHangHoa05: _scvForm.getResultActionPage(arrResponse, 'tcn_hanghoa_05'),
                arrInbToPkn06: _scvForm.getResultActionPage(arrResponse, 'inb_to_pkn_06'),
            };

            let objResult = commonCreatePkn.getDataResult(params, dataInput);

            _scvDx.setDataSource('custpage_sl_result', objResult.arrChiTiet);
            _scvDx.setDataSource('custpage_sl_tcn', objResult.arrTcn);
            _scvForm.showLoadingDialog(false);
        });
    };

    const onSubmit = async () => {
        clearMessages();

        let params = _scvForm.getParameter();
        let sourceFieldId = params.custpage_inboundshipment ? 'custpage_inboundshipment' : 'custpage_createdfrom';
        if (!_scvForm.validateFieldMandatory([sourceFieldId])) return;

        let arrResultLine = _scvDx.getDataSource("custpage_sl_result");
        let arrResultSelected = arrResultLine.filter((e) => e.is_check);
        if (arrResultSelected.length == 0) {
            _scvForm.showMsgError("No data to submit");
            return;
        }

        _scvForm.showLoadingDialog(true);

        let arrTCN_CT = _scvDx.getDataSource("custpage_sl_tcn");

        let arrReqAction = arrResultSelected.map(objData => {
            let objReqBody = {...params, ...objData, arrTCN_CT};
            return {
                action: "onSubmitCreatePkn",
                params: {
                    body: JSON.stringify(objReqBody)
                }
            };
        });

        _scvForm.ajax.postAsyncMulti(_scvForm.serviceScript.url, arrReqAction, function(resAll){
            for (let res of resAll) {
                if (res?.data?.success) {
                    showResult(message.Type.CONFIRMATION, `<a href="${res.data.recUrl}" target="_blank">PKN${res.data.recId}</a>`, 60000);
                } else {
                    showResult(message.Type.ERROR, res.data.msg, 60000);
                }
            }

            _scvDx.setDataSource("custpage_sl_result", []);
            _scvDx.setDataSource("custpage_sl_tcn", []);

            _scvForm.showLoadingDialog(false);
        }, function(res, params){//complete
            
        }, function(req, status, err){//error
            console.log(err);
        });
    };
    
    let currentMessages = [];
    const showResult = (type, notes, time = -1) => {
        let msg = message.create({
            title: '',
            message: notes,
            type: type || message.Type.INFORMATION
        });

        msg.show({ duration: time });

        currentMessages.push(msg);
    };

    const clearMessages = () => {
        currentMessages.forEach(msg => {
            try {
                msg.hide();
            } catch (e) {}
        });
        currentMessages = [];
    };

    return {
        pageInit,
        searchResult,
        onSubmit,
    };
});
