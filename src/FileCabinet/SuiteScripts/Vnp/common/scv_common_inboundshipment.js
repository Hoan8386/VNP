/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  15 Sep 2026         Khanh Tran			    Init, create file. Chức năng phân bổ chi phí mua hàng, from ms.Thủy(https://app.clickup.com/t/)
 */
define(['N/record', 'N/search', 'N/runtime', 'N/url', 'N/ui/message',

    '../lib/scv_lib_function.js',
    
    '../cons/scv_cons_costcategory.js',
    '../cons/scv_cons_currency.js',
    '../cons/scv_cons_order_type.js',
    '../cons/scv_cons_role.js',
    '../cons/scv_cons_search.js',

    '../cons/scv_cons_search_inb_itr.js',
], (record, search, runtime, url, message,

    lbf,

    constCostCategory,
    constCurrency,
    constOrderType,
    constRole,
    constSearch,

    constSearchInbItr,
) => {
    const ApprovalStatus = {
        APPROVED: 2
    };

    const addButtonDoAllocate = (scriptContext) => {
        scriptContext.form.addButton({
            id: 'custpage_btn_do_allocate',
            label: 'Do Allocate',
            functionName: "doAllocateInboundShipment()",
        });
    }

    const doAllocateInboundShipment = (inboundShipmentRec) => {
        // B1: Lấy data Landed Cost và Item .
        let arrLandedCost = getLineLandedCostInboundShipment(inboundShipmentRec);
        let idxLandedCostImportTax = arrLandedCost.findIndex(e => e.landedcostcostcategory == constCostCategory.RECORDS._03_LC_THUE_NHAPKHAU.ID);
        let arrItem = getLineItemInboundShipment(inboundShipmentRec);
        let shipmentitemexchangerate = arrItem.length == 0 ? 0 : arrItem[0].shipmentitemexchangerate;
        let arrCostCategory = [];

        // B2: Phân bổ chi phí từng Item trong Associated Items.
        for (let objLandedCost of arrLandedCost) {
            if (!objLandedCost.landedcostcostcategory || objLandedCost.landedcostallocationmethod != "VALUE") continue;

            let costCategoryLKF = constSearch.getDataLookupFieldsStore(arrCostCategory, "costcategory", objLandedCost.landedcostcostcategory, ["account"]);
            let account_name = costCategoryLKF.account?.[0]?.text || "";
            if (account_name.indexOf("333") == 0) continue;

            let arrAssociatedItem = [];
            let totalItemValue = 0;
            for (let itemId of objLandedCost.landedcostshipmentitems) {
                let objItem = arrItem.find(e => e.id == itemId);
                if (!objItem) continue;

                arrAssociatedItem.push(objItem);
                totalItemValue += objItem.itemvalue_allocate;
            }
            if (totalItemValue == 0 || shipmentitemexchangerate == 0) continue;

            // Quy đổi theo tỷ giá theo Item đầu tiên, dồn phần dư vao Item cuối.
            let costAmountAllocate = roundNumber(objLandedCost.landedcostamount * objLandedCost.landedcostexchangerate / shipmentitemexchangerate, 9);
            let allocatedAmount = 0;
            for (let j = 0; j < arrAssociatedItem.length; j++) {
                let objItem = arrAssociatedItem[j];
                let itemCostAmount = roundNumber(costAmountAllocate * objItem.itemvalue_allocate / totalItemValue, 9);
                if (j == arrAssociatedItem.length - 1) {
                    itemCostAmount = roundNumber(costAmountAllocate - allocatedAmount, 9);
                }
                allocatedAmount += itemCostAmount;
                objItem.total_cost_allocate += itemCostAmount;
                objItem.is_allocate = true;
            }
        }

        // B3: Cập nhật data.
        let itemSublistId = "items", landedCostSublistId = "landedcost";
        for (let i = 0; i < arrItem.length; i++) {
            let objItem = arrItem[i];
            if (!objItem.is_allocate) continue;

            let rate_allocate = objItem.quantityexpected == 0 ? 0 : roundNumber(objItem.total_cost_allocate / objItem.quantityexpected, 9);

            inboundShipmentRec.selectLine(itemSublistId, i);
            inboundShipmentRec.setCurrentSublistValue(itemSublistId, "custrecord_scv_inb_landcost", rate_allocate);
            inboundShipmentRec.commitLine(itemSublistId);
        }

        if (idxLandedCostImportTax == -1) {
            arrItem = getLineItemInboundShipment(inboundShipmentRec);
            for (let objItem of arrItem) {

                if (objItem.custrecord_scv_inb_importtax_amount <= 0) continue;

                inboundShipmentRec.selectNewLine(landedCostSublistId);

                lbf.setCurrentSublistValueData(inboundShipmentRec, landedCostSublistId, [
                    "landedcostcostcategory", "landedcostamount", "landedcostallocationmethod",
                    "landedcostcurrency", "landedcostexchangerate", "landedcostshipmentitems"
                ], [
                    constCostCategory.RECORDS._03_LC_THUE_NHAPKHAU.ID, objItem.custrecord_scv_inb_importtax_amount, "VALUE",
                    constCurrency.RECORDS.VND.ID, 1, objItem.id
                ])

                inboundShipmentRec.commitLine(landedCostSublistId);
            }
        }
    }

    const getLineLandedCostInboundShipment = (inboundShipmentRec) => {
        let sublistId = "landedcost";
        let sizeSublist = inboundShipmentRec.getLineCount(sublistId);
        let arrResult = []
        
        for (let i = 0; i < sizeSublist; i++) {
            let objRes = {};

            inboundShipmentRec.selectLine(sublistId, i);
            objRes.landedcostcostcategory = inboundShipmentRec.getCurrentSublistValue(sublistId, "landedcostcostcategory");
            objRes.landedcostamount = inboundShipmentRec.getCurrentSublistValue(sublistId, "landedcostamount") * 1;
            objRes.landedcostexchangerate = inboundShipmentRec.getCurrentSublistValue(sublistId, "landedcostexchangerate") * 1;
            objRes.landedcostshipmentitems = inboundShipmentRec.getCurrentSublistValue(sublistId, "landedcostshipmentitems");
            objRes.landedcostid = inboundShipmentRec.getCurrentSublistValue(sublistId, "landedcostid")||(i * (-1));
            objRes.landedcostallocationmethod = inboundShipmentRec.getCurrentSublistValue(sublistId, "landedcostallocationmethod");
            
            arrResult.push(objRes)
        }
        
        return arrResult;
    }

    const getLineItemInboundShipment = (inboundShipmentRec) => {
        let sublistId = "items";
        let sizeSublist = inboundShipmentRec.getLineCount(sublistId);
        let arrResult = []
        
        for (let i = 0; i < sizeSublist; i++) {
            let objRes = {};
            
            inboundShipmentRec.selectLine(sublistId, i);
            objRes.id = inboundShipmentRec.getCurrentSublistValue(sublistId, "id");
            objRes.shipmentitemexchangerate = inboundShipmentRec.getCurrentSublistValue(sublistId, "shipmentitemexchangerate") * 1;
            objRes.quantityexpected = inboundShipmentRec.getCurrentSublistValue(sublistId, "quantityexpected") * 1;
            objRes.custrecord_scv_inb_rate_cus = inboundShipmentRec.getCurrentSublistValue(sublistId, "custrecord_scv_inb_rate_cus");
            objRes.custrecord_scv_inb_importtax_amount = inboundShipmentRec.getCurrentSublistValue(sublistId, "custrecord_scv_inb_importtax_amount") * 1;
            objRes.expectedrate = inboundShipmentRec.getCurrentSublistValue(sublistId, "expectedrate") * 1;
            objRes.base_rate = lbf.isContainValue(objRes.custrecord_scv_inb_rate_cus) ? objRes.custrecord_scv_inb_rate_cus * 1 : objRes.expectedrate;
            objRes.itemvalue_allocate = objRes.quantityexpected * objRes.base_rate;
            objRes.total_cost_allocate = 0;
            objRes.is_allocate = false;
            arrResult.push(objRes)
        }
        
        return arrResult;
    }

    const getVatJournalCondition = (inboundShipmentRec) => {
        let poId = inboundShipmentRec.getValue({fieldId: 'custrecord_scv_inb_po'});
        if (!poId) return;

        let lkPO = search.lookupFields({type: 'purchaseorder', id: poId, columns: ['custbody_scv_order_type']});
        let custbody_scv_order_type = lkPO.custbody_scv_order_type?.[0]?.value;
        if (custbody_scv_order_type == constOrderType.RECORDS.UyThac.ID) return;
    
        let vatAmount = inboundShipmentRec.getValue({fieldId: 'custrecord_scv_imp_vatamt'}) * 1;
        let importTaxAmount = inboundShipmentRec.getValue({fieldId: 'custrecord_scv_importtax_amount'}) * 1;
        if (!(vatAmount > 0 || importTaxAmount > 0)) return;

        if (runtime.getCurrentUser().role == constRole.RECORDS.ADMINISTRATOR.ID) {
            return true;
        }
        else {
            let arrInbItr = constSearchInbItr.getDataSource({custpage_inboundshipment: inboundShipmentRec.id});
            if (arrInbItr.length == 0) return true;
            else return false;
        }
    }

    const addButtonCreateVatJournal = (scriptContext) => {
        if (scriptContext.type != 'view') return;
        let params = scriptContext.request?.parameters || {};
        if (params.custpage_vat_journal_message) {
            scriptContext.form.addPageInitMessage({
                type: params.custpage_vat_journal_success == 'T' ? message.Type.CONFIRMATION : message.Type.ERROR,
                title: 'Create VAT Journal',
                message: params.custpage_vat_journal_message,
            });
        }

        if (!getVatJournalCondition(scriptContext.newRecord)) return;

        let relatedJournalId = scriptContext.newRecord.getValue({fieldId: 'custrecord_scv_inb_related_trans'});
        let suiteletUrl = url.resolveScript({
            scriptId: 'customscript_scv_sl_inb2journal',
            deploymentId: 'customdeploy_scv_sl_inb2journal',
            params: {
                custpage_inboundshipment: scriptContext.newRecord.id,
                custpage_replace_journal: relatedJournalId || ''
            },
            returnExternalUrl: false
        });
        let functionName = "(function(){ window.location.replace('" + suiteletUrl + "'); })";
        if (relatedJournalId) {
            functionName = "(function(){ if(confirm('Đã có Journal liên quan. Nhấn OK để đồng ý tạo mới. Nhấn Cancel để hủy tạo mới.')){ window.location.replace('" + suiteletUrl + "'); } })";
        }
        scriptContext.form.addButton({
            id: 'custpage_btn_create_vat_journal',
            label: 'Create VAT Journal',
            functionName: functionName
        });
    }

    const createVatJournal = (objReqBody) => {
        let slItems = 'items', slJournalLine = 'line';
        let inboundShipmentRec = record.load({
            type: 'inboundshipment', id: objReqBody.custpage_inboundshipment, isDynamic: false
        });
        let relatedJournalId = inboundShipmentRec.getValue({fieldId: 'custrecord_scv_inb_related_trans'});
        if (relatedJournalId && relatedJournalId != objReqBody.custpage_replace_journal) {
            throw new Error('Đã có Journal liên quan. Vui lòng tải lại Inbound Shipment và xác nhận tạo mới.');
        }

        let poId = inboundShipmentRec.getValue({fieldId: 'custrecord_scv_inb_po'});
        let lkPO = search.lookupFields({type: 'purchaseorder', id: poId, columns: ['entity']});
        let vendor = lkPO.entity?.[0]?.value || '';
        let totalVatAmount = inboundShipmentRec.getValue({fieldId: 'custrecord_scv_imp_vatamt'}) * 1;
        let totalImportTaxAmount = inboundShipmentRec.getValue({fieldId: 'custrecord_scv_importtax_amount'}) * 1;
        let clearanceDate = inboundShipmentRec.getValue({fieldId: 'custrecord_scv_custom_clearance_date'});
        let invoiceDate = inboundShipmentRec.getValue({fieldId: 'custrecord_scv_inb_invoice_date'});
        let invoiceNumber = inboundShipmentRec.getValue({fieldId: 'custrecord_scv_inb_invoice_number'});
        let subsidiary = '';
        let location = inboundShipmentRec.getSublistValue({sublistId: slItems, fieldId: 'receivinglocation', line: 0});
        if (location) {
            let locationRec = record.load({type: 'location', id: location });
            subsidiary = locationRec.getValue('subsidiary');
        }

        let journalRec = record.create({
            type: 'journalentry', isDynamic: true
        });

        lbf.setValueData(journalRec, [
            "subsidiary",
            "memo",
            "custbody_scv_inbound_shipment",
            "custbody_scv_itr_custom_no",
            "custbody_scv_for_location",
            "custbody_scv_tb_entity_name",
            "approvalstatus"
        ], [
            subsidiary,
            inboundShipmentRec.getText({fieldId: 'custrecord_scv_custom_clearence_no'}),
            inboundShipmentRec.id,
            inboundShipmentRec.getValue({fieldId: 'custrecord_scv_custom_clearence_no'}),
            inboundShipmentRec.getValue({fieldId: 'custrecord_scv_ibs_location'}),
            vendor,
            ApprovalStatus.APPROVED
        ]);
        
        if (clearanceDate) journalRec.setValue({fieldId: 'trandate', value: clearanceDate});

        let arrVatAmount = [];
        let vatAmountSum = 0, importTaxAmountSum = 0;
        
        let sizeItemSublist = inboundShipmentRec.getLineCount({sublistId: slItems});
        for (let i = 0; i < sizeItemSublist; i++) {
            let vatAmount = inboundShipmentRec.getSublistValue({sublistId: slItems, fieldId: 'custrecord_scv_inb_tax_amount', line: i}) * 1;
            let importTaxAmount = inboundShipmentRec.getSublistValue({sublistId: slItems, fieldId: 'custrecord_scv_inb_importtax_amount', line: i}) * 1;
            let taxCode = inboundShipmentRec.getSublistValue({sublistId: slItems, fieldId: 'custrecord_inb_tax_code', line: i});

            vatAmountSum += vatAmount;
            importTaxAmountSum += importTaxAmount;

            let objVatAmount = arrVatAmount.find(e => e.taxcode == taxCode);
            if (!objVatAmount) {
                objVatAmount = {taxcode: taxCode, amount: 0};
                arrVatAmount.push(objVatAmount);
            }

            objVatAmount.amount += vatAmount;
        }

        let arrJournalLine = [];
        if (totalVatAmount > 0) {
            for (let objVatAmount of arrVatAmount) {
                arrJournalLine.push(
                    {account: 112, debit: 0, credit: 0, taxcode: objVatAmount.taxcode, tax1amt: objVatAmount.amount}
                );
            }
            arrJournalLine.push(
                {account: 136, debit: 0, credit: vatAmountSum, taxcode: '5', tax1amt: 0}
            );
        }

        if (totalImportTaxAmount > 0) {
            arrJournalLine.push(
                {account: 112, debit: importTaxAmountSum, credit: 0},
                {account: 907, debit: 0, credit: importTaxAmountSum}
            );
        }
        
        for (let objLine of arrJournalLine) {
            journalRec.selectNewLine({sublistId: slJournalLine});
            lbf.setCurrentSublistValueData(journalRec, slJournalLine, [
                "account",
                "debit",
                "credit",
                "location",
                "custcol_scv_invoice_date",
                "custcol_scv_invoice_number"
            ], [
                objLine.account,
                objLine.debit,
                objLine.credit,
                location,
                invoiceDate,
                invoiceNumber
            ]);

            if (objLine.taxcode) {
                lbf.setCurrentSublistValueData(journalRec, slJournalLine, ['taxcode', 'tax1amt'], [objLine.taxcode, objLine.tax1amt]);
            }

            journalRec.commitLine({sublistId: slJournalLine});
        }

        if (relatedJournalId) {
            record.delete({type: 'journalentry', id: relatedJournalId});
        }
        let journalId = journalRec.save({enableSourcing: false, ignoreMandatoryFields: true});

        inboundShipmentRec.setValue({fieldId: 'custrecord_scv_inb_related_trans', value: journalId});
        inboundShipmentRec.save({enableSourcing: false, ignoreMandatoryFields: true});

        return journalId;
    }

    const roundNumber = (_number, _precision = 2) => {
        let precision = Math.pow(10, _precision);
        return Math.round(_number * precision) / precision;
    }

    return {
        addButtonCreateVatJournal,
        createVatJournal,
        addButtonDoAllocate,
        doAllocateInboundShipment
    };
});
