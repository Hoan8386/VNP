/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  22 Sep 2026         Khanh Tran              Init, create file. Màn hình suitelet tạo Phiếu kiểm kê, KSCL from ms.Thủy(https://app.clickup.com/t/3773072/14yhnhmfvg9)
 */
define(['N/format', 'N/record', 'N/search',
    '../lib/scv_lib_function.js',
    '../cons/scv_cons_location.js',
], (format, record, search,
    lbf,
    constLocation,
) => {

    const getColumnsResult = () => {
        let columns = [
            { dataField: "is_check", caption: "Create", dataType: "boolean", allowEditing: true, width: 100, fixed: true, },
            { dataField: 'custpage_col_item', caption: 'Item', dataType: 'string', width: 350, allowEditing: false, },
            { dataField: 'custpage_col_units', caption: 'Units', dataType: 'string', width: 150, allowEditing: false, },
            { dataField: 'custpage_col_bin', caption: 'Bin', dataType: 'string', width: 150, allowEditing: false, },
            { dataField: 'custpage_col_lotnumber', caption: 'Lot Number', dataType: 'string', width: 150, allowEditing: false, },
            { dataField: 'custpage_col_expirationdate', caption: 'Expiration Date', dataType: 'string', width: 150, allowEditing: false, },
            { dataField: 'custpage_col_onhand', caption: 'Số lượng theo sổ sách', dataType: 'number', format: "#,##0.####", width: 150, allowEditing: false, },
            { dataField: 'custpage_col_quycach', caption: 'Quy cách', dataType: 'string', width: 250, allowEditing: false, },
        ];

        return columns;
    };

    const getLocations = (subsidiary) => {
        if (!subsidiary) return [];

        let filters = [
            search.createFilter({
                name: "subsidiary", operator: "anyof", values: subsidiary,
            })
        ];

        let arrLocation = constLocation.getDataSource(filters);
        return arrLocation.map(objLocation => ({
            id: objLocation.internalid,
            name: objLocation.namenohierarchy,
        }));
    };

    const getDataResult = (params, dataInput) => {
        let { arrInventory = [] } = dataInput;
        let arrResult = [];

        arrInventory.forEach(objInventory => {
            let objRes = {};

            objRes.is_check = false;
            objRes.custpage_col_item = objInventory.item_display;
            objRes.custpage_col_units = objInventory.unit_display;
            objRes.custpage_col_bin = objInventory.bin_display;
            objRes.custpage_col_lotnumber = objInventory.lotnumber_display;
            objRes.custpage_col_expirationdate = objInventory.expirationdate;
            objRes.custpage_col_quycach = objInventory.quycach;
            objRes.custpage_col_onhand = objInventory.onhand * 1;

            objRes.item = objInventory.item;
            objRes.unit = objInventory.unit;
            objRes.bin = objInventory.bin;
            objRes.lotnumber = objInventory.lotnumber;

            arrResult.push(objRes);
        });

        return arrResult;
    };

    const getCurrentVietnamDate = () => {
        let currentDateTime = new Date().getTime();
        let vietnamUtcOffsetMilliseconds = 7 * 60 * 60 * 1000;
        return new Date(currentDateTime + vietnamUtcOffsetMilliseconds);
    };

    const createPhieuKiemKe = (objReqBody) => {
        let invCountRec = record.create({
            type: 'customrecord_scv_invcount_h', isDynamic: true
        });

        let custpage_employee = objReqBody.custpage_employee ? objReqBody.custpage_employee.split(',') : [];
        let custpage_qc_employee = objReqBody.custpage_qc_employee ? objReqBody.custpage_qc_employee.split(',') : [];
        let objHeader = {};

        objHeader.custrecord_scv_ic_date_h = getCurrentVietnamDate();
        objHeader.custrecord_scv_ic_subsidiary_h = objReqBody.custpage_subsidiary;
        objHeader.custrecord_scv_ic_location_h = objReqBody.custpage_location;
        objHeader.custrecord_scv_ic_keeper_h = objReqBody.custpage_keeper;
        objHeader.custrecord_scv_ic_employee_h = custpage_employee;
        objHeader.custrecord_scv_ic_qc_keeper_h = objReqBody.custpage_qc_keeper;
        objHeader.custrecord_scv_ic_qc_emp_h = custpage_qc_employee;

        lbf.setValueData(invCountRec, [
            "custrecord_scv_ic_date_h",
            "custrecord_scv_ic_subsidiary_h",
            "custrecord_scv_ic_location_h",
            "custrecord_scv_ic_keeper_h",
            "custrecord_scv_ic_employee_h",
            "custrecord_scv_ic_qc_keeper_h",
            "custrecord_scv_ic_qc_emp_h",
        ], [
            objHeader.custrecord_scv_ic_date_h,
            objHeader.custrecord_scv_ic_subsidiary_h,
            objHeader.custrecord_scv_ic_location_h,
            objHeader.custrecord_scv_ic_keeper_h,
            objHeader.custrecord_scv_ic_employee_h,
            objHeader.custrecord_scv_ic_qc_keeper_h,
            objHeader.custrecord_scv_ic_qc_emp_h,
        ]);

        let arrResultSelected = objReqBody.arrResultSelected || [];
        let slChiTiet = 'recmachcustrecord_scv_ic_idheader_l';

        arrResultSelected.forEach(objResult => {
            let expirationDate = '';
            if (objResult.expirationdate) {
                expirationDate = format.parse({
                    value: objResult.expirationdate, type: format.Type.DATE
                });
            }

            let objLine = {};
            objLine.custrecord_scv_ic_subsidiary_l = objReqBody.custpage_subsidiary;
            objLine.custrecord_scv_ic_location_l = objReqBody.custpage_location;
            objLine.custrecord_scv_ic_item_l = objResult.item;
            objLine.custrecord_scv_ic_units_l = objResult.unit;
            objLine.custrecord_scv_ic_bin_l = objResult.bin;
            objLine.custrecord_scv_ic_inventorynumber_l = objResult.lotnumber;
            objLine.custrecord_scv_ic_expirationdate_l = expirationDate;
            objLine.custrecord_scv_ic_quycach_l = objResult.quycach;
            objLine.custrecord_scv_ic_stockqtyincount_l = objResult.onhand;

            invCountRec.selectNewLine({sublistId: slChiTiet});
            lbf.setCurrentSublistValueData(invCountRec, slChiTiet, [
                "custrecord_scv_ic_subsidiary_l",
                "custrecord_scv_ic_location_l",
                "custrecord_scv_ic_item_l",
                "custrecord_scv_ic_units_l",
                "custrecord_scv_ic_bin_l",
                "custrecord_scv_ic_inventorynumber_l",
                "custrecord_scv_ic_expirationdate_l",
                "custrecord_scv_ic_quycach_l",
                "custrecord_scv_ic_stockqtyincount_l",
            ], [
                objLine.custrecord_scv_ic_subsidiary_l,
                objLine.custrecord_scv_ic_location_l,
                objLine.custrecord_scv_ic_item_l,
                objLine.custrecord_scv_ic_units_l,
                objLine.custrecord_scv_ic_bin_l,
                objLine.custrecord_scv_ic_inventorynumber_l,
                objLine.custrecord_scv_ic_expirationdate_l,
                objLine.custrecord_scv_ic_quycach_l,
                objLine.custrecord_scv_ic_stockqtyincount_l,
            ]);
            invCountRec.commitLine({sublistId: slChiTiet});
        });

        return invCountRec.save({ enableSourcing: false, ignoreMandatoryFields: true });
    };

    return {
        getLocations,
        getDataResult,
        getColumnsResult,
        createPhieuKiemKe,
    };
});
