/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  12 Aug 2026         Khanh Tran              Init, create file. Chức năng tạo Phiếu kiểm nhận from ms. Thủy(https://app.clickup.com/t/3773072/86d40b1jh)
 */
define(['N/format', 'N/record', 'N/url',
    '../lib/scv_lib_function.js',
    '../cons/scv_cons_specificationunit.js'
], (format, record, url,
    lbf,
    constSpecificationUnit
) => {
    const getColumnsTcn = () => {
        let columns = [
            { dataField: 'custpage_col_tieuchi', caption: 'Tiêu chí', dataType: 'string', width: 500, allowEditing: false, },
            { dataField: 'custpage_col_ketqua', caption: 'Kết quả', dataType: 'boolean', width: 500, allowEditing: true, },
        ];

        return columns;
    };

    const getColumnsResult = () => {
        let columns = [
            { dataField: "is_check", caption: "Create", dataType: "boolean", allowEditing: true, width: 100, fixed: true, },
            { dataField: 'custpage_col_item', caption: 'Item', dataType: 'string', width: 300, allowEditing: false, },
            { dataField: 'custpage_col_description', caption: 'Description', dataType: 'string', width: 400, allowEditing: false, },
            { dataField: 'custpage_col_units', caption: 'Units', dataType: 'string', width: 200, allowEditing: false, },
            { dataField: 'custpage_col_remaningquantity', caption: 'Remaning Quantity', dataType: 'number', format: "#,##0.####", width: 200, allowEditing: false, },
            { dataField: 'custpage_col_quantity', caption: 'Quantity', dataType: 'number', format: "#,##0.####", width: 200, allowEditing: true, },
        ];

        return columns;
    };

    const getDataResult = (params, dataInput) => {
        let { arrTranToPkn01 = [], arrTotalQtyPkn02 = [], arrTcnData03 = [], arrItemTck04 = [], arrTcnHangHoa05 = [] } = dataInput;

        let arrTCN_NH = arrTcnHangHoa05.map(objTcn => ({ tieuchinhan: objTcn.id }));

        let objResult = {
            arrChiTiet: [],
            arrTcn: []
        };

        arrTranToPkn01.forEach(objSS01 => {
            let objSS02 = arrTotalQtyPkn02.find(e => e.item == objSS01.item && e.createdfrom == objSS01.createdfrom && e.originallineid == objSS01.originallineid) || {
                quantity: 0
            };

            let remaningquantity = objSS01.quantityorder - objSS02.quantity*1
            if (remaningquantity == 0) return;

            let arrTCK_KH = arrItemTck04.filter(objTck => objTck.itemid == objSS01.item);
            arrTCK_KH = arrTCK_KH.map(objTck => ({ tieuchikiem: objTck.tieuchikiem, gtkc: objTck.gtkc }));

            let objChiTiet = {
                subsidiary: objSS01.subsidiary,
                entity: objSS01.entity,
                location: objSS01.location,
                item: objSS01.item,
                unitid: objSS01.unitid,
                originallineid: objSS01.originallineid,
                arrTCK_KH: arrTCK_KH,
                arrTCN_NH: arrTCN_NH,
            };

            objChiTiet.is_check = false;
            objChiTiet.custpage_col_item = objSS01.item_display;
            objChiTiet.custpage_col_description = objSS01.description;
            objChiTiet.custpage_col_units = objSS01.unit;
            objChiTiet.custpage_col_remaningquantity = remaningquantity;
            objChiTiet.custpage_col_quantity = remaningquantity;

            objResult.arrChiTiet.push(objChiTiet);
        });

        arrTcnData03.forEach(objSS03 => {
            let objTcn = {
                tieuchinhan: objSS03.id
            };

            objTcn.custpage_col_tieuchi = objSS03.tieuchinhan;
            objTcn.custpage_col_ketqua = false;

            objResult.arrTcn.push(objTcn);
        });

        return objResult;
    };

    const createPhieuKiemNhan = (objReqBody) => {
        let pknRec = record.create({
            type: 'customrecord_scv_inspection_header', isDynamic: true
        });

        let custrecord_scv_insp_h_invoicedate = '';
        if (objReqBody.custpage_invoicedate) {
            custrecord_scv_insp_h_invoicedate = format.parse({
                value: objReqBody.custpage_invoicedate, type: format.Type.DATE
            });
        }

        let specificationUnitId = getSpecificationUnitId(objReqBody.unitid, objReqBody.item);
        
        lbf.setValueData(pknRec, [
            "custrecord_scv_insp_h_sub",
            "custrecord_scv_insp_h_createdfrom",
            "custrecord_scv_insp_h_entity",
            "custrecord_scv_insp_h_invoiceserial",
            "custrecord_scv_insp_h_invoicenumber",
            "custrecord_scv_insp_h_invoicedate",
            "custrecord_scv_insp_h_location",
            "custrecord_scv_insp_h_item",
            "custrecord_scv_insp_h_unit",
            "custrecord_scv_insp_h_qty",
            "custrecord_scv_insp_h_ori_line_id"
        ], [
            objReqBody.subsidiary,
            objReqBody.custpage_createdfrom,
            objReqBody.entity,
            objReqBody.custpage_invoiceserial,
            objReqBody.custpage_invoicenumber,
            custrecord_scv_insp_h_invoicedate,
            objReqBody.location,
            objReqBody.item,
            specificationUnitId,
            objReqBody.custpage_col_quantity,
            objReqBody.originallineid,
        ]);

        //Sublist: TCN - Chứng từ
        let arrTCN_CT = objReqBody.arrTCN_CT || [];
        let slTcnChungTu = 'recmachcustrecord_scv_insp_d_header';
        for (let objTcn of arrTCN_CT) {
            pknRec.selectNewLine({sublistId: slTcnChungTu});
            pknRec.setCurrentSublistValue({sublistId: slTcnChungTu, fieldId: "custrecord_scv_insp_d_criteria", value: objTcn.tieuchinhan});
            pknRec.setCurrentSublistValue({sublistId: slTcnChungTu, fieldId: "custrecord_scv_insp_d_result", value: objTcn.custpage_col_ketqua});
            pknRec.commitLine({sublistId: slTcnChungTu});
        }

        //Sublist: Chi tiết lô
        let slChiTietLo = 'recmachcustrecord_scv_insp_n_header';
        pknRec.selectNewLine({sublistId: slChiTietLo});
        setCurrentChiTietLo(pknRec);
        pknRec.commitLine({sublistId: slChiTietLo});

        
        //Sublist: TCK - Kiem hang
        let arrTCK_KH = objReqBody.arrTCK_KH || [];
        addTieuChiKiem(pknRec, arrTCK_KH);

        //Sublist: TCN - Nhan hang
        let arrTCN_NH = objReqBody.arrTCN_NH || [];
        addTieuChiNhanHang(pknRec, arrTCN_NH);

        return pknRec.save({ enableSourcing: false, ignoreMandatoryFields: true }) 
    }

    const setCurrentChiTietLo = (curRec) => {
        let objChiTietLo = {};
        objChiTietLo.subsidiary = curRec.getValue({fieldId: 'custrecord_scv_insp_h_sub'});
        objChiTietLo.location = curRec.getValue({fieldId: 'custrecord_scv_insp_h_location'});
        objChiTietLo.item = curRec.getValue({fieldId: 'custrecord_scv_insp_h_item'});
        objChiTietLo.unit = curRec.getValue({fieldId: 'custrecord_scv_insp_h_unit'});
        objChiTietLo.originallineid = curRec.getValue({fieldId: 'custrecord_scv_insp_h_ori_line_id'});

        let slChiTietLo = 'recmachcustrecord_scv_insp_n_header';
        curRec.setCurrentSublistValue({sublistId: slChiTietLo, fieldId: "custrecord_scv_insp_n_sub", value: objChiTietLo.subsidiary});
        curRec.setCurrentSublistValue({sublistId: slChiTietLo, fieldId: "custrecord_scv_insp_n_location", value: objChiTietLo.location});
        curRec.setCurrentSublistValue({sublistId: slChiTietLo, fieldId: "custrecord_scv_insp_n_item", value: objChiTietLo.item});
        curRec.setCurrentSublistValue({sublistId: slChiTietLo, fieldId: "custrecord_scv_insp_n_unit", value: objChiTietLo.unit});
        curRec.setCurrentSublistValue({sublistId: slChiTietLo, fieldId: "custrecord_scv_insp_n_ori_line_id", value: objChiTietLo.originallineid});
    }

    const getSpecificationUnitId = (unitId, itemId) => {
        if (!unitId || !itemId) return '';

        let specificationUnit = constSpecificationUnit.getDataSource({
            unitid: unitId,
            item: itemId,
        });

        return specificationUnit[0]?.id || '';
    }

    const addTieuChiKiem = (curRec, arrTCK_KH) => {
        let slTckKiemHang = 'recmachcustrecord_scv_insp_l_header';
        arrTCK_KH.forEach(objTCK => {
            curRec.selectNewLine({sublistId: slTckKiemHang});
            curRec.setCurrentSublistValue({sublistId: slTckKiemHang, fieldId: "custrecord_scv_insp_l_criteria", value: objTCK.tieuchikiem});
            curRec.setCurrentSublistValue({sublistId: slTckKiemHang, fieldId: "custrecord_scv_insp_l_pre_result", value: objTCK.gtkc});
            curRec.commitLine({sublistId: slTckKiemHang});
        });
    }

    const addTieuChiNhanHang = (curRec, arrTCN_NH) => {
        let slTcnNhanHang = 'recmachcustrecord_scv_insp_i_header';
        arrTCN_NH.forEach(objTCNHH => {
            curRec.selectNewLine({sublistId: slTcnNhanHang});
            curRec.setCurrentSublistValue({sublistId: slTcnNhanHang, fieldId: "custrecord_scv_insp_i_criteria", value: objTCNHH.tieuchinhan});
            curRec.commitLine({sublistId: slTcnNhanHang});
        });
    }

    const addButtonCreatePkn = (scriptContext) => {
        let newRecord = scriptContext.newRecord;
        let statusRef = newRecord.getValue({fieldId: 'statusRef'});
        let allowedStatusByType = {
            purchaseorder: ['pendingReceipt', 'partiallyBilled', 'pendingBillPartReceived', 'partiallyReceived'],
            returnauthorization: ['pendingReceipt'],
            transferorder: ['pendingReceipt'],
        };

        if (!allowedStatusByType[newRecord.type]?.includes(statusRef)) return;

        let suiteletUrl = url.resolveScript({
            scriptId: 'customscript_scv_sl_create_pkn',
            deploymentId: 'customdeploy_scv_sl_create_pkn',
            returnExternalUrl: false,
            params: {
                custpage_createdfrom: newRecord.id,
            }
        });

        scriptContext.form.addButton({
            id: 'custpage_btn_create_pkn',
            label: 'Tạo P. Kiểm nhận',
            functionName: "window.location.replace('" + suiteletUrl + "');",
        });
    }

    return {
        getColumnsResult,
        getColumnsTcn,
        getDataResult,
        createPhieuKiemNhan,
        setCurrentChiTietLo,
        addTieuChiKiem,
        addTieuChiNhanHang,
        addButtonCreatePkn
    };
});
