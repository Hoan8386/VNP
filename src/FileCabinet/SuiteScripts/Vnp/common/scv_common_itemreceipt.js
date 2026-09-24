/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description.
 *  20 Aug 2026         Khanh Tran	 	        Init, create file. 
 *  20 Aug 2026         Khanh Tran              Kế thừa thông tin từ Inbound Shipment sang Item Receipt from ms. Thủy(https://app.clickup.com/t/86d42geh8)
 */
define(["N/record", "N/url",
    '../common/scv_common_receiveorder.js',
    '../cons/scv_cons_search.js',

    '../cons/scv_cons_search_pkn_inb_itr.js',
],
    function (record, url,
        commonReceiveorder,
        constSearch,

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
                objItem.id = inbRec.getSublistValue({sublistId: slItems, fieldId: 'id', line: i});
                
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

            let removeLandedCost = irRec.getValue({fieldId: 'custbody_scv_remove_landed_cost'});
            if (removeLandedCost) {
                _export.removeLandedCost(irRec);
            }
            else {
                _export.updateLandedCostFromIB(irRec, inbRec, objIB.arrItem);
            }

            irRec.save({ enableSourcing: false, ignoreMandatoryFields: true });
            commonReceiveorder.updateInspectionReceived(arrInspectionIds);
        }

        _export.removeLandedCost = function (irRec) {
            let slItem = 'item';
            let lcItem = irRec.getLineCount({sublistId: slItem});
            for (let i = 0; i < lcItem; i++) {
                let landedcostset = irRec.getSublistValue({sublistId: slItem, fieldId: 'landedcostset', line: i});
                if (!landedcostset) continue;

                irRec.removeSublistSubrecord({sublistId: slItem, fieldId: 'landedcost', line: i});
            }
        }

        _export.updateLandedCostFromIB = function (irRec, inbRec, arrInbItem) {
            // B1: Lấy data Landed Cost và Item .
            let arrLandedCost = getLineLandedCostInboundShipment(inbRec);
            let arrItem = getLineItemItemReceipt(irRec, arrInbItem);
            let exchangeRate = irRec.getValue({fieldId: 'exchangerate'}) * 1;
            let arrCostCategory = [], arrCategoryId = [];

            // B2: Phân bổ chi phí từng Item trong Associated Items.
            for (let objLandedCost of arrLandedCost) {
                if (!objLandedCost.landedcostcostcategory || objLandedCost.landedcostallocationmethod != "VALUE") continue;

                let categoryId = objLandedCost.landedcostcostcategory;
                if (!arrCategoryId.includes(categoryId)) arrCategoryId.push(categoryId);
                let costCategoryLKF = constSearch.getDataLookupFieldsStore(arrCostCategory, "costcategory", categoryId, ["account"]);
                let account_name = costCategoryLKF.account?.[0]?.text || "";
                let isImportTax = account_name.indexOf("333") == 0;

                let arrAssociatedItem = [];
                let totalItemValue = 0;
                for (let itemId of objLandedCost.landedcostshipmentitems) {
                    let objItem = arrItem.find(e => e.id == itemId);
                    if (!objItem) continue;

                    arrAssociatedItem.push(objItem);
                    totalItemValue += objItem.itemvalue_allocate;
                }
                if (totalItemValue == 0 || exchangeRate == 0) continue;

                // Quy đổi theo tỷ giá theo Item đầu tiên, dồn phần dư vao Item cuối.
                let costAmountAllocate = roundNumber(objLandedCost.landedcostamount * objLandedCost.landedcostexchangerate / exchangeRate, 9);
                let allocatedAmount = 0;
                for (let j = 0; j < arrAssociatedItem.length; j++) {
                    let objItem = arrAssociatedItem[j];

                    let itemCostAmount = roundNumber(costAmountAllocate * objItem.itemvalue_allocate / totalItemValue, 9);
                    if (j == arrAssociatedItem.length - 1) {
                        itemCostAmount = roundNumber(costAmountAllocate - allocatedAmount, 9);
                    }

                    allocatedAmount += itemCostAmount;
                    let objCost = objItem.arrCost.find(e => e.categoryId == categoryId);
                    if (!objCost) {
                        objCost = {categoryId: categoryId, amount: 0};
                        objItem.arrCost.push(objCost);
                    }

                    objCost.amount += itemCostAmount;
                    if (isImportTax) objItem.importTaxAmount += itemCostAmount;

                    objItem.is_allocate = true;
                }
            }

            // B3: Cập nhật data.
            let slItem = 'item', slLandedCostData = 'landedcostdata';
            for (let objItem of arrItem) {
                if (!objItem.is_allocate) continue;

                let hasLandedCost = irRec.hasSublistSubrecord({sublistId: slItem, fieldId: 'landedcost', line: objItem.line});
                if (objItem.arrCost.length > 0 || hasLandedCost) {
                    let landedCostRec = irRec.getSublistSubrecord({sublistId: slItem, fieldId: 'landedcost', line: objItem.line});
                    let lcCost = landedCostRec.getLineCount({sublistId: slLandedCostData});

                    for (let i = lcCost - 1; i >= 0; i--) {
                        let categoryId = landedCostRec.getSublistValue({sublistId: slLandedCostData, fieldId: 'costcategory', line: i});
                        if (arrCategoryId.find(id => id == categoryId) == undefined) continue;
                        landedCostRec.removeLine({sublistId: slLandedCostData, line: i});
                    }
                    
                    for (let objCost of objItem.arrCost) {
                        let line = landedCostRec.getLineCount({sublistId: slLandedCostData});
                        landedCostRec.insertLine({sublistId: slLandedCostData, line: line});
                        landedCostRec.setSublistValue({sublistId: slLandedCostData, fieldId: 'costcategory', line: line, value: objCost.categoryId});
                        landedCostRec.setSublistValue({sublistId: slLandedCostData, fieldId: 'amount', line: line, value: objCost.amount});
                    }
                }

                // Thuế nhập khẩu trên mỗi đơn vị của dòng IR.
                let unitImportTax = objItem.quantity == 0 ? 0 : objItem.importTaxAmount / objItem.quantity;
                irRec.setSublistValue({sublistId: slItem, fieldId: 'custcol_scv_inb_unitlandedcost_imptax', line: objItem.line, value: unitImportTax});
            }
        }

        const getLineItemItemReceipt = (irRec, arrInbItem) => {
            let slItem = 'item';
            let lcItem = irRec.getLineCount({sublistId: slItem});
            let arrItem = [];
            for (let i = 0; i < lcItem; i++) {
                let originalLineId = irRec.getSublistValue({sublistId: slItem, fieldId: 'custcol_scv_origin_line_num', line: i});
                if (!originalLineId) continue;
                let objInbItem = arrInbItem.find(e => e.custrecord_scv_original_line_id == originalLineId);
                if (!objInbItem) continue;

                let objItem = {};
                objItem.id = objInbItem.id;
                objItem.line = i;
                objItem.quantity = irRec.getSublistValue({sublistId: slItem, fieldId: 'quantity', line: i}) * 1;
                objItem.rate = irRec.getSublistValue({sublistId: slItem, fieldId: 'rate', line: i}) * 1;
                objItem.itemvalue_allocate = objItem.quantity * objItem.rate;
                objItem.importTaxAmount = 0;
                objItem.arrCost = [];
                objItem.is_allocate = false;
                arrItem.push(objItem);
            }
            return arrItem;
        }

        const getLineLandedCostInboundShipment = (inbRec) => {
            let slLandedCost = 'landedcost';
            let lcLandedCost = inbRec.getLineCount({sublistId: slLandedCost});
            let arrLandedCost = [];
            for (let i = 0; i < lcLandedCost; i++) {
                let objLandedCost = {};
                objLandedCost.landedcostcostcategory = inbRec.getSublistValue({sublistId: slLandedCost, fieldId: 'landedcostcostcategory', line: i});
                objLandedCost.landedcostallocationmethod = inbRec.getSublistValue({sublistId: slLandedCost, fieldId: 'landedcostallocationmethod', line: i});
                objLandedCost.landedcostshipmentitems = inbRec.getSublistValue({sublistId: slLandedCost, fieldId: 'landedcostshipmentitems', line: i});
                objLandedCost.landedcostamount = inbRec.getSublistValue({sublistId: slLandedCost, fieldId: 'landedcostamount', line: i}) * 1;
                objLandedCost.landedcostexchangerate = inbRec.getSublistValue({sublistId: slLandedCost, fieldId: 'landedcostexchangerate', line: i}) * 1;
                arrLandedCost.push(objLandedCost);
            }
            return arrLandedCost;
        }

        const roundNumber = (_number, _precision = 2) => {
            let precision = Math.pow(10, _precision);
            return Math.round(_number * precision) / precision;
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
