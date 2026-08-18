/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  17 Aug 2026         Khanh Tran              Init, create file. Tạo Item Receipt từ dữ liệu Purchase Order, Return Authorization, Transfer Order from ms. Thủy(https://app.clickup.com/t/3773072/86d41eg08)
 */
define(['N/url',
], (url,
) => {
    const getColumnsResult = () => {
        let columns = [
            { id: "custpage_col_create", label: "Create", type: "checkbox", displayType: "normal", },
            { id: 'custpage_col_item', label: 'Item', type: 'select', source: 'item', },
            { id: 'custpage_col_description', label: 'Description', type: 'text', },
            { id: 'custpage_col_entity', label: 'Entity', type: 'text', },
            { id: 'custpage_col_receivelocation', label: 'Receive Location', type: 'select', source: 'location', displayType: 'normal', },
            { id: 'custpage_col_units', label: 'Units', type: 'text', },
            { id: 'custpage_col_quantityorder', label: 'Quantity Order', type: 'float', },
            { id: 'custpage_col_quantityreceived', label: 'Quantity Received', type: 'float', },
            { id: 'custpage_col_quantitytobereceived', label: 'Quantity To Be Received', type: 'float', displayType: 'normal', },
            { id: 'custpage_col_inventorydetail', label: 'Inventory Detail', type: 'text', },
        ];

        return columns;
    };

    const getDataResult = (params, dataInput) => {
        let { arrDataSource = [] } = dataInput;
        let arrResult = [];

        arrDataSource.forEach(objData => {
            let objResult = {};

            objResult.custpage_col_create = objData.is_check ? 'T' : 'F';
            objResult.custpage_col_item = objData.shipmentitem || objData.item;
            objResult.custpage_col_description = objData.description;
            objResult.custpage_col_entity = objData.entity_display || objData.entity;
            objResult.custpage_col_receivelocation = objData.receivinglocation || objData.location;
            objResult.custpage_col_units = objData.units || objData.unit;
            objResult.custpage_col_quantityorder = objData.quantityorder || objData.qtyorder;
            objResult.custpage_col_quantityreceived = objData.quantityreceived || objData.qtyreceived;
            objResult.custpage_col_quantitytobereceived = objData.quantitytobereceived || objData.qtyremaining;
            objResult.original_line_id = objData.original_line_id || objData.originallineid;
            objResult.lineid_inboundshipment = objData.lineid_inboundshipment;

            if (objData.inventorydetail) {
                objResult.inventorydetail = objData.inventorydetail;
            }

            arrResult.push(objResult);
        });

        return arrResult;
    };

    const addButtonCreateItr = (scriptContext) => {
        let newRecord = scriptContext.newRecord;
        let statusRef = newRecord.getValue({fieldId: 'statusRef'});
        let allowedStatusByType = {
            purchaseorder: ['pendingReceipt', 'pendingBillPartReceived'],
            returnauthorization: ['pendingReceipt'],
            transferorder: ['pendingReceipt'],
        };

        if (!allowedStatusByType[newRecord.type]?.includes(statusRef)) return;

        let suiteletUrl = url.resolveScript({
            scriptId: 'customscript_scv_sl_receiveorder',
            deploymentId: 'customdeploy_scv_sl_receiveorder',
            returnExternalUrl: false,
            params: {
                custpage_ordernumber: newRecord.id,
            }
        });

        scriptContext.form.addButton({
            id: 'custpage_btn_create_itr',
            label: 'Create ITR',
            functionName: "window.location.replace('" + suiteletUrl + "');",
        });
    }

    return {
        getColumnsResult,
        getDataResult,
        addButtonCreateItr
    };
});
