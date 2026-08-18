/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  17 Aug 2026         Khanh Tran              Init, create file. Tạo Item Receipt từ dữ liệu Purchase Order, Return Authorization, Transfer Order from ms. Thủy(https://app.clickup.com/t/3773072/86d41eg08)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/url', 'N/format', 'N/record',
    '../common/scv_common_receiveorder.js',

    '../cons/scv_cons_form.js',
    '../cons/scv_cons_search_receiveorder_01.js',
    '../cons/scv_cons_search_receiveorder_02.js',
    '../cons/scv_cons_search_receiveorder_03.js',
    '../cons/scv_cons_search_receiveorder_04.js',
], (
    runtime, url, format, record,
    commonReceiveorder,

    constForm,
    cSearchReceiveorder01,
    cSearchReceiveorder02,
    cSearchReceiveorder03,
    cSearchReceiveorder04,
) => {
    const CurrentScript = {
        ID: 'customscript_scv_sl_receiveorder',
        DEPLOYID_UI: 'customdeploy_scv_sl_receiveorder',
        DEPLOYID_DATA: 'customdeploy_scv_sl_receiveorder_svc',
    };

    const onRequest = (scriptContext) => {
        constForm.setContext(scriptContext);
        constForm.setServiceScript(CurrentScript.ID, CurrentScript.DEPLOYID_DATA);

        let params = scriptContext.request.parameters;
        let curScript = runtime.getCurrentScript();

        if (curScript.deploymentId == CurrentScript.DEPLOYID_DATA) {
            let objResponse = { data: [] };
            switch (params.action) {
                case 'get_data_inboundshipment':
                    objResponse.data = getDataInboundShipment(params);
                    break;
                case 'get_data_itemfulfillment':
                    objResponse.data = getDataItemFulfillment(params);
                    break;
                case 'get_data_source_trans_create_itr_01':
                    objResponse.data = cSearchReceiveorder01.getDataSource(params);
                    break;
                case 'onSubmitReceiveorder':
                    objResponse.data = onSubmitReceiveorder(params);
                    break;
            }

            constForm.write(objResponse);

        }
        else if (scriptContext.request.method == 'GET') {
            onCreateFormUI(params);
        }
    };

    const onCreateFormUI = (params) => {
        defaultParams(params);

        let hasOrderNumber= !!params?.custpage_ordernumber;
        let arrINB = getDataINB03(params);
        let arrITF = getDataITF04(params);

        constForm.createForm('Receive Order', '../cssl/scv_cs_sl_receiveorder.js');

        constForm.addPageLink([
            cSearchReceiveorder01.ID,
            cSearchReceiveorder02.ID,
            cSearchReceiveorder03.ID,
            cSearchReceiveorder04.ID,
        ], true);

        constForm.addButton({
            id: 'custpage_btn_search',
            label: 'Search',
            functionName: 'searchResult()',
        });

        constForm.addButton({
            id: 'custpage_btn_submit',
            label: 'Submit',
            functionName: 'onSubmit()',
        }, { styleSubmit: true });

        constForm.addButton({
            id: "custpage_btn_back",
            label: "Cancel",
            // functionName: "onBackForm('" + getUrlRedirectToBack(params) + "')"
        });
        
        let mainGrp = constForm.addFieldGroup({ id: 'fieldgrp_main', label: 'Main' });

        constForm.addField({
            id: 'custpage_ordernumber',
            type: 'select',
            source: "transaction",
            label: 'Order Number',
            container: mainGrp.id,
        }, true, {
            defaultValue: params?.custpage_ordernumber,
            displayType: hasOrderNumber ? 'disabled' : null,
        });

        constForm.addField({
            id: 'custpage_trandate',
            type: 'date',
            label: 'Date',
            container: mainGrp.id,
        }, true, {
            defaultValue: params?.custpage_trandate,
            layoutType: "startrow"
        });

        constForm.addField({
            id: 'custpage_inboundshipment',
            type: 'select',
            label: 'Inbound Shipment',
            container: mainGrp.id,
        }, false, {
            defaultValue: params?.custpage_inboundshipment,
            lookup: {
                data: arrINB,
                valueExpr: "id",
                displayExpr: "documentnumber"
            },
        });

        constForm.addField({
            id: 'custpage_itemfulfillment',
            type: 'select',
            label: 'Item Fulfillment',
            container: mainGrp.id,
        }, false, {
            defaultValue: params?.custpage_itemfulfillment,
            lookup: {
                data: arrITF,
                valueExpr: "id",
                displayExpr: "documentnumber"
            },
        });

        constForm.addSublist({
            id: 'custpage_sl_result',
            type: 'list',
            label: 'Result',
        });

        constForm.addFieldOfSublist('custpage_sl_result', commonReceiveorder.getColumnsResult());

        constForm.addInventoryDetailOfSublist(
            'custpage_sl_result',
            'custpage_col_inventorydetail',
            {
                type: 'receipt',
                isEditable: true,
                item: 'custpage_col_item',
                quantity: 'custpage_col_quantitytobereceived',
                description: 'custpage_col_description',
                unit: 'custpage_col_units',
                location: 'custpage_col_receivelocation',
            }
        );

        let arrDataSource = [];
        if (params.custpage_inboundshipment) {
            arrDataSource = getDataInboundShipment(params);
        }
        else if (params.custpage_itemfulfillment) {
            arrDataSource = getDataItemFulfillment(params);
        }
        else if (params.custpage_ordernumber) {
            arrDataSource = cSearchReceiveorder01.getDataSource(params);
        }

        let arrResult = commonReceiveorder.getDataResult(params, {arrDataSource});
        constForm.setDataOfSublist('custpage_sl_result', arrResult);

        constForm.writePage();
    };
    
    const defaultParams = (params) => {
        if(!('custpage_trandate' in params)) {
            let today = new Date();

            params.custpage_trandate = today;
            
            // let formatToday = format.format({value: today, type: format.Type.DATETIME});
            // let parseToday = format.parse({ value: formatToday, type: format.Type.DATETIME });
        }
    }
    
    const getDataInboundShipment = (params) =>{
        if(!params.custpage_inboundshipment) return [];
        
        let inboundShipmentRec = record.load({
            type: "inboundShipment",
            id: params.custpage_inboundshipment
        });

        let sublistId = "items";
        let sizeSublist = inboundShipmentRec.getLineCount(sublistId);
        let arrResult = [];

        for (let i = 0; i < sizeSublist; i++) {
            let objRes = {};

            let quantityexpected = inboundShipmentRec.getSublistValue(sublistId, "quantityexpected", i);
            let quantityreceived = inboundShipmentRec.getSublistValue(sublistId, "quantityreceived", i);
            if (quantityexpected - quantityreceived <= 0) continue;

            objRes.item = inboundShipmentRec.getSublistValue(sublistId, "itemid", i);
            objRes.description = inboundShipmentRec.getSublistValue(sublistId, "shipmentitemdescription", i);
            objRes.entity = inboundShipmentRec.getSublistValue(sublistId, "povendor", i);
            objRes.receivinglocation = inboundShipmentRec.getSublistValue(sublistId, "receivinglocation", i);
            objRes.units = inboundShipmentRec.getSublistText(sublistId, "unit", i);
            objRes.quantityorder = quantityexpected;
            objRes.quantityreceived = quantityreceived;
            objRes.quantitytobereceived = quantityexpected;

            objRes.original_line_id = inboundShipmentRec.getSublistValue(sublistId, "custrecord_scv_original_line_id", i);
            objRes.lineid_inboundshipment = inboundShipmentRec.getSublistValue(sublistId, "id", i);
            objRes.shipmentitem = inboundShipmentRec.getSublistValue(sublistId, "shipmentitem", i);

            arrResult.push(objRes)
        }
        
        return arrResult;
    }
    
    const getDataItemFulfillment = (params) =>{
        if(!params.custpage_itemfulfillment) return [];
        
        let itfRec = record.load({
            type: "itemfulfillment",
            id: params.custpage_itemfulfillment
        });

        let sublistId = "item";
        let sizeSublist = itfRec.getLineCount(sublistId);
        let arrResult = [];

        for (let i = 0; i < sizeSublist; i++) {
            let objRes = {};

            objRes.item = itfRec.getSublistValue(sublistId, "item", i);
            objRes.description = itfRec.getSublistValue(sublistId, "description", i);
            objRes.entity = "";//
            objRes.receivinglocation = itfRec.getValue("transferlocation");
            objRes.units = itfRec.getSublistText(sublistId, "unitsdisplay", i);
            objRes.quantityorder = itfRec.getSublistValue(sublistId, "quantity", i);
            objRes.quantityreceived = "";//
            objRes.quantitytobereceived = itfRec.getSublistValue(sublistId, "quantity", i);
            objRes.original_line_id = itfRec.getSublistValue(sublistId, "custcol_scv_origin_line_num", i);

            arrResult.push(objRes)
        }
        
        return arrResult;
    }

    const getDataINB03 = (params) => {
        return cSearchReceiveorder03.getDataSource(params);
    }

    const getDataITF04 = (params) => {
        return cSearchReceiveorder04.getDataSource(params);
        
    }

    const getUrlRedirectToBack = (_params) =>{
        return url.resolveRecord({
            recordType: "customsale_scv_shipment_request",
            recordId: _params.custpage_shipment_request
        });
    }

    const onSubmitReceiveorder = (params) => {
        // TODO: Map params and process submit logic.
        return { success: true, message: 'Success.' };
    };

    return { onRequest };
});
