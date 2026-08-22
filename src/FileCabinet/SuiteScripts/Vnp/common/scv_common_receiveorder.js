/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  17 Aug 2026         Khanh Tran              Init, create file. Tạo Item Receipt từ dữ liệu Purchase Order, Return Authorization, Transfer Order from ms. Thủy(https://app.clickup.com/t/3773072/86d41eg08)
 */
define(['N/url', 'N/record', 'N/search', 'N/format',
], (url, record, search, format,
) => {
    const getColumnsResult = () => {
        let columns = [
            { id: "custpage_col_create", label: "Create", type: "checkbox", displayType: "entry", },
            { id: 'custpage_col_item', label: 'Item', type: 'select', source: 'item', },
            { id: 'custpage_col_description', label: 'Description', type: 'text', },
            { id: 'custpage_col_entity', label: 'Entity', type: 'text', },
            { id: 'custpage_col_receivelocation', label: 'Receive Location', type: 'select', source: 'location' },
            { id: 'custpage_col_units', label: 'Units', type: 'text', },
            { id: 'custpage_col_quantityorder', label: 'Quantity Order', type: 'float', },
            { id: 'custpage_col_quantityreceived', label: 'Quantity Received', type: 'float', },
            { id: 'custpage_col_quantitytobereceived', label: 'Quantity To Be Received', type: 'float', displayType: 'entry', },
            { id: 'custpage_col_inventorydetail', label: 'Inventory Detail', type: 'text', },
            { id: 'custpage_col_originallineid', label: 'Original Line ID', type: 'text', displayType: 'hidden', },
            { id: 'custpage_col_lineidinboundshipment', label: 'ID Line Inbound Shipment', type: 'text', displayType: 'hidden', },
        ];

        return columns;
    };

    const getDataResult = (params, dataInput) => {
        let {
            arrReceiveOrderDetail = [],
            arrInventoryDetail = [],
        } = dataInput;
        let arrResult = [];

        arrReceiveOrderDetail.forEach(objData => {
            let objResult = {};

            objResult.custpage_col_create = objData.is_check ? 'T' : 'F';
            objResult.custpage_col_item = objData.item;
            objResult.custpage_col_description = objData.description;
            objResult.custpage_col_entity = objData.entity;
            objResult.custpage_col_receivelocation = objData.location;
            objResult.custpage_col_units = objData.unit;
            objResult.custpage_col_quantityorder = objData.qtyorder;
            objResult.custpage_col_quantityreceived = objData.qtyreceived;
            objResult.custpage_col_quantitytobereceived = objData.qtyremaining;
            objResult.custpage_col_originallineid = objData.originallineid;
            objResult.custpage_col_lineidinboundshipment = objData.lineid_inboundshipment;

            let arrSS2 = arrInventoryDetail.filter(e => e.item == objData.item && e.originallineid == objData.originallineid);

            if (arrSS2.length > 0) {
                objResult.inventorydetail = {
                    custpage_item: objData.item,
                    quantity: objData.qtyremaining,
                    custpage_location: objData.location,
                    inventoryassignment: arrSS2.map(e => ({
                        custpage_inventorynumber: e.lotnumber,
                        custpage_binnumber: e.lotbin,
                        custpage_inventorystatus: e.lotstatus,
                        custpage_expirationdate: e.lotexpirationdate,
                        custpage_quantity: e.lotqty,
                    })),
                };
            }

            arrResult.push(objResult);
        });

        return arrResult;
    };

    const updateInspectionReceived = (arrInspectionIds) => {
        arrInspectionIds.forEach(inspectionId => {
            record.submitFields({
                type: 'customrecord_scv_inspection_header',
                id: inspectionId,
                values: {
                    custrecord_scv_insp_h_check_itr: true,
                },
                options: {
                    enableSourcing: false, ignoreMandatoryFields: true,
                },
            });
        });
    };

    const createReceiveInboundShipment = (params, arrLines) => {
        let receiveInboundShipmentRec = record.load({
            type: 'receiveinboundshipment',
            id: params.custpage_inboundshipment,
            isDynamic: true,
        });

        receiveInboundShipmentRec.setValue({fieldId: 'trandate', value: format.parse({value: params.custpage_trandate, type: format.Type.DATE})});

        let receiveSublistId = 'receiveitems';
        let lineCount = receiveInboundShipmentRec.getLineCount({sublistId: receiveSublistId});
        for (let i = 0; i < lineCount; i++) {
            let lineId = receiveInboundShipmentRec.getSublistValue({sublistId: receiveSublistId, fieldId: 'id', line: i});
            let objLine = arrLines.find(e => e.lineid_inboundshipment == lineId);

            receiveInboundShipmentRec.selectLine({sublistId: receiveSublistId, line: i});

            if (objLine) {
                receiveInboundShipmentRec.setCurrentSublistValue({sublistId: receiveSublistId, fieldId: 'receiveitem', value: true});
                receiveInboundShipmentRec.setCurrentSublistValue({sublistId: receiveSublistId, fieldId: 'receivinglocation', value: objLine.location});
                receiveInboundShipmentRec.setCurrentSublistValue({sublistId: receiveSublistId, fieldId: 'quantitytobereceived', value: Number(objLine.quantity)});

                let inventorydetailavail = receiveInboundShipmentRec.getCurrentSublistValue({sublistId: receiveSublistId, fieldId: 'inventorydetailavail'});
                if (inventorydetailavail === true || inventorydetailavail === 'T') {
                    let inventoryDetailRec = receiveInboundShipmentRec.getCurrentSublistSubrecord({
                        sublistId: receiveSublistId,
                        fieldId: 'inventorydetail',
                    });
                    let assignmentSublistId = 'inventoryassignment';
                    let arrAssignment = objLine.inventorydetail?.inventoryassignment || [];
                    arrAssignment.forEach(objAssignment => {
                        inventoryDetailRec.selectNewLine({sublistId: assignmentSublistId});
                        inventoryDetailRec.setCurrentSublistValue({sublistId: assignmentSublistId, fieldId: 'receiptinventorynumber', value: objAssignment.custpage_inventorynumber});
                        inventoryDetailRec.setCurrentSublistValue({sublistId: assignmentSublistId, fieldId: 'quantity', value: Number(objAssignment.custpage_quantity)});
                        if (objAssignment.custpage_binnumber) inventoryDetailRec.setCurrentSublistValue({sublistId: assignmentSublistId, fieldId: 'binnumber', value: objAssignment.custpage_binnumber});
                        if (objAssignment.custpage_inventorystatus) inventoryDetailRec.setCurrentSublistValue({sublistId: assignmentSublistId, fieldId: 'inventorystatus', value: objAssignment.custpage_inventorystatus});
                        if (objAssignment.custpage_expirationdate) inventoryDetailRec.setCurrentSublistValue({sublistId: assignmentSublistId, fieldId: 'expirationdate', value: format.parse({value: objAssignment.custpage_expirationdate, type: format.Type.DATE})});
                        inventoryDetailRec.commitLine({sublistId: assignmentSublistId});
                    });
                }
            }
            else {
                receiveInboundShipmentRec.setCurrentSublistValue({sublistId: receiveSublistId, fieldId: 'receiveitem', value: false});
            }

            receiveInboundShipmentRec.commitLine({sublistId: receiveSublistId});
        }

        return receiveInboundShipmentRec.save();
    };

    const createItemReceiptCase2 = (params, arrLines, arrSS2) => {
        let tranLkf = search.lookupFields({
            type: search.Type.TRANSACTION,
            id: params.custpage_ordernumber,
            columns: ['recordtype'],
        });
        let firstLine = arrLines[0];
        let objSS2 = arrSS2.find(e => e.item == firstLine.item && e.originallineid == firstLine.originallineid) || {};

        let itemReceiptRec = record.transform({
            fromType: tranLkf.recordtype,
            fromId: params.custpage_ordernumber,
            toType: record.Type.ITEM_RECEIPT,
            isDynamic: true,
        });

        itemReceiptRec.setValue({fieldId: 'trandate', value: format.parse({value: params.custpage_trandate, type: format.Type.DATE})});
        itemReceiptRec.setValue({fieldId: 'custbody_scv_invoice_serial', value: objSS2.invoiceserial || ''});
        itemReceiptRec.setValue({fieldId: 'custbody_scv_invoice_number', value: objSS2.invoicenumber || ''});
        if (objSS2.invoicedate) itemReceiptRec.setValue({fieldId: 'custbody_scv_invoice_date', value: format.parse({value: objSS2.invoicedate, type: format.Type.DATE})});

        let sublistId = 'item';
        let arrInspectionIds = [];
        let lineCount = itemReceiptRec.getLineCount({sublistId});
        for (let i = 0; i < lineCount; i++) {
            let originallineid = itemReceiptRec.getSublistValue({sublistId, fieldId: 'custcol_scv_origin_line_num', line: i});
            let objLine = arrLines.find(e => e.originallineid == originallineid);

            itemReceiptRec.selectLine({sublistId, line: i});

            if (objLine) {
                let objInspection = arrSS2.find(e => e.item == objLine.item && e.originallineid == objLine.originallineid);
                itemReceiptRec.setCurrentSublistValue({sublistId, fieldId: 'itemreceive', value: true});
                itemReceiptRec.setCurrentSublistValue({sublistId, fieldId: 'quantity', value: Number(objLine.quantity)});
                itemReceiptRec.setCurrentSublistValue({sublistId, fieldId: 'custcol_scv_origin_line_num', value: objLine.originallineid});
                if (objInspection?.id) {
                    itemReceiptRec.setCurrentSublistValue({sublistId, fieldId: 'custcol_scv_inspection_number', value: objInspection.id});
                    if (!arrInspectionIds.includes(objInspection.id)) arrInspectionIds.push(objInspection.id);
                }

                let inventorydetailavail = itemReceiptRec.getCurrentSublistValue({sublistId, fieldId: 'inventorydetailavail'});
                if (inventorydetailavail === true || inventorydetailavail === 'T') {
                    let inventoryDetailRec = itemReceiptRec.getCurrentSublistSubrecord({
                        sublistId,
                        fieldId: 'inventorydetail',
                    });
                    let assignmentSublistId = 'inventoryassignment';
                    let assignmentCount = inventoryDetailRec.getLineCount({sublistId: assignmentSublistId});
                    for (let j = assignmentCount - 1; j >= 0; j--) {
                        inventoryDetailRec.removeLine({sublistId: assignmentSublistId, line: j});
                    }

                    let arrAssignment = objLine.inventorydetail?.inventoryassignment || [];
                    arrAssignment.forEach(objAssignment => {
                        inventoryDetailRec.selectNewLine({sublistId: assignmentSublistId});
                        inventoryDetailRec.setCurrentSublistValue({sublistId: assignmentSublistId, fieldId: 'receiptinventorynumber', value: objAssignment.custpage_inventorynumber});
                        inventoryDetailRec.setCurrentSublistValue({sublistId: assignmentSublistId, fieldId: 'quantity', value: Number(objAssignment.custpage_quantity)});
                        if (objAssignment.custpage_binnumber) inventoryDetailRec.setCurrentSublistValue({sublistId: assignmentSublistId, fieldId: 'binnumber', value: objAssignment.custpage_binnumber});
                        if (objAssignment.custpage_inventorystatus) inventoryDetailRec.setCurrentSublistValue({sublistId: assignmentSublistId, fieldId: 'inventorystatus', value: objAssignment.custpage_inventorystatus});
                        if (objAssignment.custpage_expirationdate) inventoryDetailRec.setCurrentSublistValue({sublistId: assignmentSublistId, fieldId: 'expirationdate', value: format.parse({value: objAssignment.custpage_expirationdate, type: format.Type.DATE})});
                        inventoryDetailRec.commitLine({sublistId: assignmentSublistId});
                    });
                }
            }
            else {
                itemReceiptRec.setCurrentSublistValue({sublistId, fieldId: 'itemreceive', value: false});
            }

            itemReceiptRec.commitLine({sublistId});
        }

        let itemReceiptId = itemReceiptRec.save({enableSourcing: false, ignoreMandatoryFields: true});
        updateInspectionReceived(arrInspectionIds);

        return itemReceiptId;
    };

    const createItemReceiptCase3 = (params, arrLines, arrSS2) => {
        let tranLkf = search.lookupFields({
            type: search.Type.TRANSACTION,
            id: params.custpage_ordernumber,
            columns: ['recordtype'],
        });

        let itemReceiptRec = record.transform({
            fromType: tranLkf.recordtype,
            fromId: params.custpage_ordernumber,
            toType: record.Type.ITEM_RECEIPT,
            isDynamic: true,
            defaultValues: {
                itemfulfillment: params.custpage_itemfulfillment,
            },
        });

        itemReceiptRec.setValue({fieldId: 'trandate', value: format.parse({value: params.custpage_trandate, type: format.Type.DATE})});
        if (arrLines[0].location) itemReceiptRec.setValue({fieldId: 'location', value: arrLines[0].location});

        let sublistId = 'item';
        let arrInspectionIds = [];
        let lineCount = itemReceiptRec.getLineCount({sublistId});
        for (let i = 0; i < lineCount; i++) {
            let originallineid = itemReceiptRec.getSublistValue({sublistId, fieldId: 'custcol_scv_origin_line_num', line: i}) + '';
            let objLine = arrLines.find(e => e.originallineid == originallineid);

            itemReceiptRec.selectLine({sublistId, line: i});

            if (objLine) {
                let objInspection = arrSS2.find(e => e.item == objLine.item && e.originallineid == objLine.originallineid);
                itemReceiptRec.setCurrentSublistValue({sublistId, fieldId: 'itemreceive', value: true});
                itemReceiptRec.setCurrentSublistValue({sublistId, fieldId: 'quantity', value: Number(objLine.quantity)});
                itemReceiptRec.setCurrentSublistValue({sublistId, fieldId: 'custcol_scv_origin_line_num', value: objLine.originallineid});
                if (objInspection?.id) {
                    itemReceiptRec.setCurrentSublistValue({sublistId, fieldId: 'custcol_scv_inspection_number', value: objInspection.id});
                    if (!arrInspectionIds.includes(objInspection.id)) arrInspectionIds.push(objInspection.id);
                }

                let inventorydetailavail = itemReceiptRec.getCurrentSublistValue({sublistId, fieldId: 'inventorydetailavail'});
                if (inventorydetailavail === true || inventorydetailavail === 'T') {
                    let inventoryDetailRec = itemReceiptRec.getCurrentSublistSubrecord({
                        sublistId,
                        fieldId: 'inventorydetail',
                    });
                    let assignmentSublistId = 'inventoryassignment';
                    let assignmentCount = inventoryDetailRec.getLineCount({sublistId: assignmentSublistId});
                    for (let j = assignmentCount - 1; j >= 0; j--) {
                        inventoryDetailRec.removeLine({sublistId: assignmentSublistId, line: j});
                    }

                    let arrAssignment = objLine.inventorydetail?.inventoryassignment || [];
                    arrAssignment.forEach(objAssignment => {
                        inventoryDetailRec.selectNewLine({sublistId: assignmentSublistId});
                        inventoryDetailRec.setCurrentSublistValue({sublistId: assignmentSublistId, fieldId: 'receiptinventorynumber', value: objAssignment.custpage_inventorynumber});
                        inventoryDetailRec.setCurrentSublistValue({sublistId: assignmentSublistId, fieldId: 'quantity', value: Number(objAssignment.custpage_quantity)});
                        if (objAssignment.custpage_binnumber) inventoryDetailRec.setCurrentSublistValue({sublistId: assignmentSublistId, fieldId: 'binnumber', value: objAssignment.custpage_binnumber});
                        if (objAssignment.custpage_inventorystatus) inventoryDetailRec.setCurrentSublistValue({sublistId: assignmentSublistId, fieldId: 'inventorystatus', value: objAssignment.custpage_inventorystatus});
                        if (objAssignment.custpage_expirationdate) inventoryDetailRec.setCurrentSublistValue({sublistId: assignmentSublistId, fieldId: 'expirationdate', value: format.parse({value: objAssignment.custpage_expirationdate, type: format.Type.DATE})});
                        inventoryDetailRec.commitLine({sublistId: assignmentSublistId});
                    });
                }
            }
            else {
                itemReceiptRec.setCurrentSublistValue({sublistId, fieldId: 'itemreceive', value: false});
            }

            itemReceiptRec.commitLine({sublistId});
        }

        let itemReceiptId = itemReceiptRec.save({enableSourcing: false, ignoreMandatoryFields: true});
        updateInspectionReceived(arrInspectionIds);

        return itemReceiptId;
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
        updateInspectionReceived,
        createReceiveInboundShipment,
        createItemReceiptCase2,
        createItemReceiptCase3,
        addButtonCreateItr
    };
});
