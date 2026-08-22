/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description.
 *  20 Aug 2026         Khanh Tran	 	        Init, create file. 
 *  20 Aug 2026         Khanh Tran              Kế thừa thông tin từ Inbound Shipment sang Item Receipt from ms. Thủy(https://app.clickup.com/t/86d42geh8)
 */
define(["N/query", "N/search", "N/record", "N/url",
    '../common/scv_common_receiveorder.js',

    '../cons/scv_cons_search_pkn_inb_itr.js',
],
    function (query, search, record, url,
        commonReceiveorder,

        cSearchPknInbItr,
    ) {
        const _export = {};
        
        //Từ Chức năng Receive Inbound Shipment. Ở beforeSubmit không có inboundshipment lên phải làm ở afterSubmit-load lại mới có inboundshipment
        _export.updItemReceiptFromIB = function (curRec) {
            let irRec = record.load({
                type: 'itemreceipt', id: curRec.id
            });

            let inboundshipment = irRec.getValue('inboundshipment');
            if (!inboundshipment) return;

            let arrPknInbItr = cSearchPknInbItr.getDataSource({custpage_inboundshipment: inboundshipment});

            let inbRec = record.load({
                type: 'inboundShipment', id: inboundshipment
            });
            let slItems = 'items';
            let lcItems = inbRec.getLineCount(slItems);
            let objIB = {
                arrItem: []
            };

            for (let i = 0; i < lcItems; i++) {
                let objItem = {};
                
                objItem.custrecord_scv_original_line_id = inbRec.getSublistValue({ sublistId: slItems, fieldId: 'custrecord_scv_original_line_id', line: i });
                objItem.custrecord_scv_inb_importtax_code = inbRec.getSublistValue({ sublistId: slItems, fieldId: 'custrecord_scv_inb_importtax_code', line: i });
                objItem.custrecord_scv_inb_importtax_amount = inbRec.getSublistValue({ sublistId: slItems, fieldId: 'custrecord_scv_inb_importtax_amount', line: i });
                objItem.custrecord_inb_tax_code = inbRec.getSublistValue({ sublistId: slItems, fieldId: 'custrecord_inb_tax_code', line: i });
                objItem.custrecord_scv_inb_tax_amount = inbRec.getSublistValue({ sublistId: slItems, fieldId: 'custrecord_scv_inb_tax_amount', line: i });
                objItem.custrecord_scv_inb_landcost = inbRec.getSublistValue({ sublistId: slItems, fieldId: 'custrecord_scv_inb_landcost', line: i });
                objItem.unitlandedcost = inbRec.getSublistValue({ sublistId: slItems, fieldId: 'unitlandedcost', line: i });

                objIB.arrItem.push(objItem);
            };

            objIB.custrecord_scv_inb_cus_exr = inbRec.getValue({fieldId: 'custrecord_scv_inb_cus_exr'});
            objIB.custrecord_scv_imp_vatamt = inbRec.getValue({fieldId: 'custrecord_scv_imp_vatamt'});
            objIB.custrecord_inb_tax_code = objIB.arrItem?.[0]?.custrecord_inb_tax_code || '';
            objIB.custrecord_scv_importtax_amount = inbRec.getValue({fieldId: 'custrecord_scv_importtax_amount'});
            objIB.custrecord_scv_inb_invoice_date = inbRec.getValue({fieldId: 'custrecord_scv_inb_invoice_date'});
            objIB.custrecord_scv_inb_invoice_number = inbRec.getValue({fieldId: 'custrecord_scv_inb_invoice_number'});
            objIB.custrecord_scv_custom_clearence_no = inbRec.getValue({fieldId: 'custrecord_scv_custom_clearence_no'});
            objIB.custrecord_scv_inb_related_trans = inbRec.getValue({fieldId: 'custrecord_scv_inb_related_trans'});
            log.error('objIB', objIB)

            irRec.setValue({fieldId: 'custbody_scv_inb_cus_exr', value: objIB.custrecord_scv_inb_cus_exr});
            irRec.setValue({fieldId: 'custbody_scv_vat_import', value: objIB.custrecord_scv_imp_vatamt});
            irRec.setValue({fieldId: 'custbody_scv_vat_import_code', value: objIB.custrecord_inb_tax_code});
            irRec.setValue({fieldId: 'custbody_scv_importtax_amount', value: objIB.custrecord_scv_importtax_amount});
            irRec.setValue({fieldId: 'custbody_scv_invoice_date', value: objIB.custrecord_scv_inb_invoice_date});
            irRec.setValue({fieldId: 'custbody_scv_invoice_number', value: objIB.custrecord_scv_inb_invoice_number});
            irRec.setValue({fieldId: 'custbody_scv_itr_custom_no', value: objIB.custrecord_scv_custom_clearence_no});
            irRec.setValue({fieldId: 'custbody_scv_related_transaction', value: objIB.custrecord_scv_inb_related_trans});

            let slItem = 'item';
            let lcItem = irRec.getLineCount(slItem);
            let arrInspectionIds = [];
            for (let i = 0; i < lcItem; i++) {
                let custcol_scv_origin_line_num = irRec.getSublistValue({ sublistId: slItem, fieldId: 'custcol_scv_origin_line_num', line: i });
                let objItem = objIB.arrItem.find(e => e.custrecord_scv_original_line_id == custcol_scv_origin_line_num);
                if (!objItem) continue;
                
                let objPKn = arrPknInbItr.find(e => e.originallineid == custcol_scv_origin_line_num) || {internalid: ''};
                let inspectionId = objPKn.internalid;

                irRec.setSublistValue({ sublistId: slItem, fieldId: 'custcol_scv_inb_importtax_code', value: objItem.custrecord_scv_inb_importtax_code, line: i });
                irRec.setSublistValue({ sublistId: slItem, fieldId: 'custcol_scv_inb_importtax_amount', value: objItem.custrecord_scv_inb_importtax_amount, line: i });
                irRec.setSublistValue({ sublistId: slItem, fieldId: 'custcol_scv_inb_tax_code', value: objItem.custrecord_inb_tax_code, line: i });
                irRec.setSublistValue({ sublistId: slItem, fieldId: 'custcol_scv_inb_tax_amount', value: objItem.custrecord_scv_inb_tax_amount, line: i });
                irRec.setSublistValue({ sublistId: slItem, fieldId: 'custcol_scv_cus_unitlandedcost', value: objItem.custrecord_scv_inb_landcost, line: i });
                irRec.setSublistValue({ sublistId: slItem, fieldId: 'custcol_scv_inb_unitlandedcost', value: objItem.unitlandedcost, line: i });
                irRec.setSublistValue({ sublistId: slItem, fieldId: 'custcol_scv_inspection_number', value: inspectionId, line: i });

                if (inspectionId && !arrInspectionIds.includes(inspectionId)) arrInspectionIds.push(inspectionId);
            }

            irRec.save({ enableSourcing: false, ignoreMandatoryFields: true });
            commonReceiveorder.updateInspectionReceived(arrInspectionIds);
        }

        _export.addButtonUpdateInbInfo = function (scriptContext) {
            let curRec = scriptContext.newRecord;
            let inboundshipment = curRec.getValue({fieldId: 'inboundshipment'});
            if (!inboundshipment) return;

            let suiteletUrl = url.resolveScript({
                scriptId: 'customscript_scv_sl_receiveorder',
                deploymentId: 'customdeploy_scv_sl_receiveorder_svc',
                returnExternalUrl: false,
                params: {
                    action: 'updateInbInfo',
                    itemreceipt: curRec.id,
                }
            });

            scriptContext.form.addButton({
                id: 'custpage_btn_update_inb_info',
                label: 'Update INB Info',
                functionName: "window.location.replace('" + suiteletUrl + "');",
            });
        }

        return _export;

    });
