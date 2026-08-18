/**
 * Nội dung: 
 * Version: 1.251024.5
 * =======================================================================================
 *  Date                Author                  Description
 *  25 Jun 2025         Huy Pham                Init & create file
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/file', 'N/search','N/runtime', 
    '../olib/alasql/alasql.min@4.6.6.js',

    '../cons/scv_cons_form.js',
    '../cons/scv_cons_inventorydetail.js',

    '../cons/scv_cons_location.js',
    '../cons/scv_cons_bin.js',
    '../cons/scv_cons_item.js',
    '../cons/scv_cons_inventorynumber.js',
],
    function(file, search,runtime, 
        alasql,

        constForm,
        constInventoryDetail,

        constLocation,
        constBin,
        constItem,
        constInventoryNumber
        ) {
            
        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context) {
            constForm.setContext(context);
            constForm.setServiceScript(constInventoryDetail.RECORDS.serviceScript.id, constInventoryDetail.RECORDS.serviceScript.deploymentId);

            constInventoryDetail.initModulServer({
                file: file
            });
            
            let request = context.request;
            let params = request.parameters;
            let curScript = runtime.getCurrentScript();
            
            constInventoryDetail.setMainKey(params.mainKey);

            if(curScript.deploymentId == constInventoryDetail.RECORDS.serviceScript.deploymentId){
                let objResponse = {data: []};
        
				switch(params.action){
                    case "setStoreInventoryDetail":
						objResponse.data = constInventoryDetail.setStoreInventoryDetail(JSON.parse(params.dataStore), true);
						break;
                    case "getStoreInventoryDetail":
						objResponse.data = constInventoryDetail.getStoreInventoryDetail(params.keyStore);
						break;
				}

                constForm.write(objResponse);
            }else{
                if(context.request.method == "GET"){
                    onCreateFormUI(params);
                    
                    constForm.writePage();
                }
            }
            
        }

        const onCreateFormUI = (_params) => {
            constForm.createForm("Inventory Detail", '../cssl/scv_cs_sl_invdetail_p.js');

            constForm.addButton({
                id: "custpage_scv_submit", label: "OK", functionName: "onSubmitResult()"
            }, {
                styleSubmit: true
            });
            constForm.addButton({id: "custpage_scv_cancel", label: "Close", functionName: "onCancel()"});

            let infoGrp = constForm.addFieldGroup({id: "fieldgrp_info", label: "Information"});

            let itemLKF = search.lookupFields({type: "item", id: _params.item, columns: ["description", "stockunit"]});
            _params.description = itemLKF.description;
            _params.unit_display = itemLKF.stockunit[0].text;

            constForm.addField({
                id: 'custpage_item', label: 'Item',
                type: "select", source: "item",
                container: infoGrp.id,
            }, false, {
                displayType: "inline",
                defaultValue: _params.item??""
            });

            constForm.addField({
                id: 'custpage_description', label: 'Description',
                type: "text",
                container: infoGrp.id,
            }, false, {
                displayType: "inline",
                defaultValue: _params.description??""
            });

            constForm.addField({
                id: 'custpage_quantity', label: 'Quantity',
                type: "float",
                container: infoGrp.id,
            }, false, {
                displayType: "inline",
                defaultValue: _params.quantity||0
            });

            constForm.addField({
                id: 'custpage_units', label: 'Units',
                type: "text",
                container: infoGrp.id,
            }, false, {
                displayType: "inline",
                defaultValue: _params.unit_display??""
            });

            constForm.addField({
                id: 'custpage_location', label: 'Location',
                type: "select", source: "location",
                container: infoGrp.id,
            }, false, {
                displayType: "inline",
                defaultValue: _params.location??""
            });
            
            constForm.addSublist({
                id: 'custpage_inventoryassignment',
                type: _params.isedit == "T" ? "inlineeditor" : "list",
                label: 'Inventory Detail'
            });

            onCreateItemSublistColumn(_params);

            if(_params.isedit == "F"){
                constForm.removeButton('custpage_scv_submit');

                let objResInvDetail = constInventoryDetail.getStoreInventoryDetail(_params.keystore);
                
                constForm.setDataOfSublist("custpage_inventoryassignment", objResInvDetail.inventoryassignment);
            }
        }

        const onCreateItemSublistColumn = (_params) => {
            let arrColumn = [];

            let isUseBin = constLocation.isUseBins(_params.location);
            isUseBin = isUseBin ? constItem.isUseBins(_params.item) : false;

            let isLotNo = constItem.isLotItem(_params.item);

            if(_params.action_type == "receipt"){
                arrColumn = [
                    {id: 'custpage_inventorynumber', label: 'Serial/Lot Number', type: 'text', isMandatory: true, displayType: isLotNo ? "entry" : "hidden"},
                    {id: 'custpage_expirationdate', label: 'Expiration Date', type: 'date', displayType: "entry" },
                    {id: 'custpage_binnumber', label: 'Bins', type: 'select', displayType: isUseBin ? "entry" : "hidden"},
                    {id: 'custpage_inventorystatus', label: 'Status', type: 'select', source: "inventorystatus", displayType: "entry" },
                    {id: 'custpage_quantity', label: 'Quantity to be Received', type: 'float', isMandatory: true, displayType: "entry" },
                ]
            }
            else if(_params.action_type == "issue"){
                arrColumn = [
                    {id: 'custpage_issueinventorynumber', label: 'Serial/Lot Number', type: 'select', isMandatory: true, displayType: isLotNo ? "entry" : "hidden" },
                    {id: 'custpage_binnumber', label: 'Bins', type: 'select', displayType: isUseBin ? "entry" : "hidden"},
                    {id: 'custpage_inventorystatus', label: 'Status', type: 'select', source: "inventorystatus", displayType: "entry"},
                    {id: 'custpage_expirationdate', label: 'Expiration Date', type: 'date', displayType: "disabled"},
                    {id: 'custpage_lotquantityavailable', label: 'Quantity Available', type: 'float', displayType: "disabled"},
                    {id: 'custpage_quantity', label: 'Quantity', type: 'float', isMandatory: true, displayType: "entry" },
                ]
            }
            else if(["transferorder"].includes(_params.action_type)){
                arrColumn = [
                    {id: 'custpage_issueinventorynumber', label: 'Serial/Lot Number', type: 'select', isMandatory: true, displayType: isLotNo ? "entry" : "hidden" },
                    {id: 'custpage_expirationdate', label: 'Expiration Date', type: 'date', displayType: "entry" },
                    {id: 'custpage_lotquantityavailable', label: 'Quantity Available', type: 'float', displayType: "disabled"},
                    {id: 'custpage_quantity', label: 'Quantity', type: 'float', isMandatory: true, displayType: "entry" },
                ]
            }
            else if(_params.action_type == "receipt_so2cccl"){
                arrColumn = [
                    {id: 'custpage_inventorynumber', label: 'Serial/Lot Number', type: 'text', isMandatory: true, displayType: isLotNo ? "entry" : "hidden"},
                    {id: 'custpage_quantity', label: 'Quantity to be Received', type: 'float', isMandatory: true, displayType: "entry" },
                ]
            }
            else{
                arrColumn = [
                    {id: 'custpage_inventorynumber', label: 'Supplier Lot Number', type: 'text', displayType: "entry" },
                ]
            }

            arrColumn.forEach(objCol => {
                if(isUseBin && objCol.id == "custpage_binnumber"){
                    objCol.lookup = {
                        displayExpr: "binnumber",
                        valueExpr: "internalid",
                        data: constBin.getDataSource(search.createFilter({
                            name: 'location', 
                            operator: "anyof", 
                            values: _params.location
                        }))
                    };
                }
                else if(objCol.id == "custpage_issueinventorynumber"){
                    objCol.lookup = {
                        displayExpr: "inventorynumber",
                        valueExpr: "internalid",
                        data: constInventoryNumber.getDataSource([
                            search.createFilter({name: 'quantityavailable', operator: "greaterthan", values: 0}),
                            search.createFilter({name: 'location', operator: "anyof", values: _params.location}),
                            search.createFilter({name: 'item', operator: "anyof", values: _params.item})
                        ])
                    };
                }
                else if(_params.action_type == "issue" && objCol.id == "custpage_inventorystatus" && !isLotNo){
                    let arrDetail = constInventoryDetail.getDataItemOnhand({
                        location: _params.location,
                        item: _params.item
                    });
                    let arrDataStatus = alasql(`SELECT DISTINCT status, status_display FROM ?`, [arrDetail]);

                    objCol.source = null;
                    objCol.lookup = {
                        displayExpr: "status_display",
                        valueExpr: "status",
                        data: arrDataStatus
                    };
                }

                if(_params.isedit == "F"){
                    objCol.displayType = "inline";
                }
            });

            constForm.addFieldOfSublist("custpage_inventoryassignment", arrColumn);
        }

        return {
            onRequest
        };

    });
