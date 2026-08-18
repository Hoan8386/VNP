/**
 * Nội dung: 
 * Version: 1.260526.5
 * =======================================================================================
 *  Date                Author                  Description
 *  28 Mar 2025         Huy Pham                Init & create file
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/format',
    '../cons/scv_cons_record.js',
    '../cons/scv_cons_datastore.js',
    '../cons/scv_cons_format.js',
    '../cons/scv_cons_inventorydetail.js'
],

    function(currentRecord, format,
        constRecord,
        constDataStore,
        constFormat,
        constInventoryDetail
    ) {
        let windowParent = window.getParent();
        let paramsUrl = _scvForm.getUrlParams();
        let detailSublistId = "custpage_inventoryassignment";
        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {
            paramsUrl = _scvForm.getUrlParams();

            _scvForm.mainKeyInventoryDetail = paramsUrl.mainKey;
            _scvInventoryDetail.mainKey = paramsUrl.mainKey;
            _scvInventoryDetail.currentScript = {..._scvForm.currentScript};
            _scvInventoryDetail.serviceScript = {..._scvForm.serviceScript};

            if(paramsUrl.isedit == "T"){
                switch(paramsUrl.action_type){
                    case "receipt":
                    case "receipt_so2cccl":
                        pageInit_Receipt(scriptContext);
                    break;
                    case "issue":
                        pageInit_Issue(scriptContext);
                    break;
                    case "transferorder":
                        pageInit_TransferOrder(scriptContext);
                    break;
                }
            }

            windowParent._scvCallBackPageInit?.({
                scriptContextPopup: scriptContext,
                parentSublistId: paramsUrl.sublistid,
                parentFieldId: paramsUrl.fieldid,
                parentLine: paramsUrl.line
            })
        }

        function fieldChanged(scriptContext) {
            switch(paramsUrl.action_type){
                case "issue":
                    fieldChanged_Issue(scriptContext);
                break;
                case "transferorder":
                    fieldChanged_TransferOrder(scriptContext);
                break;
            }

            windowParent._scvCallBackFieldChange?.({
                scriptContextPopup: scriptContext,
                parentSublistId: paramsUrl.sublistid,
                parentFieldId: paramsUrl.fieldid,
                parentLine: paramsUrl.line
            })
        }

        function getObjParams(_curRec){
            let params = {
                custpage_item: _curRec.getValue("custpage_item"),
                custpage_description: _curRec.getValue("custpage_description"),
                custpage_units: _curRec.getValue("custpage_units"),
                custpage_quantity: _curRec.getValue("custpage_quantity"),
                custpage_location: _curRec.getValue("custpage_location"),
                action_type: paramsUrl.action_type,
                parentSublistId: paramsUrl.sublistid,
                parentFieldId: paramsUrl.fieldid,
                parentLine: paramsUrl.line,
                conversionRate: paramsUrl.conversionrate||1
            };
            return params;
        }

        const onSubmitResult = () =>{
            window.onbeforeunload = null;
            let isValid = true;

            let curRec = currentRecord.get();
            let params = getObjParams(curRec);

            isValid = windowParent._scvCallBackSubmitResult?.({
                currentRecord: currentRecord.get(),
                parentSublistId: paramsUrl.sublistid,
                parentFieldId: paramsUrl.fieldid,
                parentLine: paramsUrl.line
            })
            isValid = isValid??true;

            if(["receipt", "receipt_so2cccl"].includes(params.action_type)){
                isValid = onSubmitResult_Receipt(curRec, params);
            }
            else if(params.action_type == "issue"){
                isValid = onSubmitResult_Issue(curRec, params);
            }
            else if(params.action_type == "transferorder"){
                isValid = onSubmitResult_TransferOrder(curRec, params);
            }

            onSubmitResult_Completed();

            if(isValid){
                closePopup(true);
            }
            
        }

        const onSubmitResult_Completed = () =>{
            windowParent._scvCallBackSubmitResult_Completed?.({
                currentRecord: currentRecord.get(),
                parentSublistId: paramsUrl.sublistid,
                parentFieldId: paramsUrl.fieldid,
                parentLine: paramsUrl.line
            })
        }

        const onCancel = () =>{
            windowParent._scvCallBackCancel?.({
                currentRecord: currentRecord.get(),
                parentSublistId: paramsUrl.sublistid,
                parentFieldId: paramsUrl.fieldid,
                parentLine: paramsUrl.line
            })

            closePopup(true);
        }

        /**
         * Function to be executed after line is selected.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        function lineInit(scriptContext) {
            switch(paramsUrl.action_type){
                case "issue":
                    lineInit_Issue(scriptContext);
                break;
            }
        }

        const quickFindInventoryStatus = (curRec, sublistId) =>{
            let lotNoId = curRec.getCurrentSublistValue(sublistId, "custpage_issueinventorynumber");

            let arrInventoryStatus = constDataStore.getDataStore("arrInventoryStatus")||[];
            let arrInventoryStatusOfLot = arrInventoryStatus.filter(e => e.inventorynumber == lotNoId);
            
            constRecord.initQuickFindSublistFieldSelect(curRec, sublistId, "custpage_inventorystatus", -1, {
                data: arrInventoryStatusOfLot,
                displayExpr: "status_display",
                valueExpr: "status"
            });
        }

        //#region Issue
        const pageInit_Issue = (scriptContext) =>{
            let curRec = scriptContext.currentRecord;

            let params = getObjParams(curRec);

            let arrDataOnhand = constInventoryDetail.getDataItemOnhand({
                location: params.custpage_location,
                item: params.custpage_item
            });
            constDataStore.setDataStore("arrInventoryStatus", arrDataOnhand);
            
            let parentLine = params.parentLine * 1 + 1;

            let keyStore =  windowParent.nlapiGetLineItemValue(params.parentSublistId, _scvInventoryDetail.getStoreFieldId(params.parentFieldId), parentLine);
            let inventoryDetailStore = _scvInventoryDetail.getDataStoreInventoryClientSide(keyStore);
            if(!inventoryDetailStore) return;

            let arrLine = inventoryDetailStore.inventoryassignment;
            
            for(let i = 0; i < arrLine.length; i++){
                let objLine = arrLine[i];
                
                let objDataOnhand = arrDataOnhand.find(e => e.inventorynumber == objLine.custpage_issueinventorynumber
                    && (!objLine.custpage_binnumber || e.binnumber == objLine.custpage_binnumber)
                );
                
                curRec.selectNewLine(detailSublistId);
                curRec.setCurrentSublistValue({
                    sublistId: detailSublistId, fieldId: "custpage_issueinventorynumber",
                    value: objLine.custpage_issueinventorynumber, ignoreFieldChange: true
                })

                if(!!objLine.custpage_expirationdate){
                    curRec.setCurrentSublistValue({
                        sublistId: detailSublistId, fieldId: "custpage_expirationdate",
                        value: nlapiStringToDate(objLine.custpage_expirationdate), ignoreFieldChange: true
                    })
                }
                if(!!objLine.custpage_binnumber){
                    curRec.setCurrentSublistValue({
                        sublistId: detailSublistId, fieldId: "custpage_binnumber",
                        value: objLine.custpage_binnumber, ignoreFieldChange: true
                    })
                }
                if(!!objLine.custpage_inventorystatus){
                    curRec.setCurrentSublistValue({
                        sublistId: detailSublistId, fieldId: "custpage_inventorystatus",
                        value: objLine.custpage_inventorystatus, ignoreFieldChange: true
                    })
                }

                if(!!objDataOnhand){
                    curRec.setCurrentSublistValue({
                        sublistId: detailSublistId, fieldId: "custpage_lotquantityavailable",
                        value: objDataOnhand.available, ignoreFieldChange: true
                    })
                }

                curRec.setCurrentSublistValue({
                    sublistId: detailSublistId, fieldId: "custpage_quantity",
                    value: objLine.custpage_quantity, ignoreFieldChange: true
                })
                
                curRec.commitLine(detailSublistId);
            }
        }

        const fieldChanged_Issue = (scriptContext) =>{
            let curRec = scriptContext.currentRecord;
            let fieldId = scriptContext.fieldId;
            let sublistId = scriptContext.sublistId;

            let params = getObjParams(curRec);
            let conversionRate = (params.conversionRate||1) * 1;

            let hasBin = hasBinColumn(sublistId);

            let expiredt = "", qtyavai = 0, qty = 0, inventorystatus = "";
            let lotNoId = "";
            let bindId = "";

            let arrDetail = []

            switch(fieldId){
                case "custpage_issueinventorynumber"://to-do
                case "custpage_binnumber":
                    lotNoId = curRec.getCurrentSublistValue(sublistId, "custpage_issueinventorynumber");
                    bindId = curRec.getCurrentSublistValue(sublistId, "custpage_binnumber");
                    
                    if(!!lotNoId){
                        arrDetail = constInventoryDetail.getDataItemOnhand({
                            inventorynumber: lotNoId,
                            location: params.custpage_location,
                            item: params.custpage_item
                        });
                        if(hasBin && !!bindId){
                            arrDetail = arrDetail.filter(e => e.binnumber == bindId);
                        }
                        
                        if(arrDetail.length > 0){
                            expiredt = arrDetail[0].expirationdate;
                            qtyavai = arrDetail[0].available * 1;
                            inventorystatus = arrDetail[0].status;
                            bindId = arrDetail[0].binnumber;
                        }
                    }

                    qtyavai = qtyavai / conversionRate;

                    if(!!expiredt){
                        expiredt = format.parse({value: expiredt, type: "date"});
                    }

                    if(hasBin){
                        curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custpage_binnumber", value: bindId, ignoreFieldChange: true});
                    }
                    
                    curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custpage_inventorystatus", value: inventorystatus, ignoreFieldChange: true});
                    curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custpage_expirationdate", value: expiredt, ignoreFieldChange: true});
                    curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custpage_lotquantityavailable", value: qtyavai, ignoreFieldChange: true});
                    curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custpage_quantity", value: qty, ignoreFieldChange: true});

                    quickFindInventoryStatus(curRec, sublistId);
                break;
                case "custpage_inventorystatus":
                    lotNoId = curRec.getCurrentSublistValue(sublistId, "custpage_issueinventorynumber");
                    bindId = curRec.getCurrentSublistValue(sublistId, "custpage_binnumber");
                    inventorystatus = curRec.getCurrentSublistValue(sublistId, fieldId);
                    arrDetail = constInventoryDetail.getDataItemOnhand({
                        inventorynumber: lotNoId,
                        location: params.custpage_location,
                        item: params.custpage_item,
                        status: inventorystatus
                    });
                    if(hasBin && !!bindId){
                        arrDetail = arrDetail.filter(e => e.binnumber == bindId);
                    }
                    if(arrDetail.length > 0){
                        expiredt = arrDetail[0].expirationdate;
                        qtyavai = arrDetail[0].available * 1;
                        inventorystatus = arrDetail[0].status;
                    }

                    qtyavai = qtyavai / conversionRate;

                    if(!!expiredt){
                        expiredt = format.parse({value: expiredt, type: "date"});
                    }

                    curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custpage_expirationdate", value: expiredt, ignoreFieldChange: true});
                    curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custpage_lotquantityavailable", value: qtyavai, ignoreFieldChange: true});
                    curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custpage_quantity", value: qty, ignoreFieldChange: true});

                break;
                case "custpage_quantity":
                    qty = curRec.getCurrentSublistValue(sublistId, fieldId) * 1;
                    qtyavai = curRec.getCurrentSublistValue(sublistId, "custpage_lotquantityavailable") * 1;

                    if(qty > qtyavai){
                        alert("Quantity can not greater than Quantity Available.");
                        curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custpage_quantity", value: qtyavai, ignoreFieldChange: true});

                        return;
                    }
                break;
            }
        }

        const lineInit_Issue = (scriptContext) =>{
            let curRec = scriptContext.currentRecord;
            let sublistId = scriptContext.sublistId;
            
            quickFindInventoryStatus(curRec, sublistId);
        }

        const onSubmitResult_Issue = (_curRec, _params) =>{
            let sizeSublist = _curRec.getLineCount(detailSublistId);
            
            let total_quantity = 0;
            let arrLines = [];

            let arrLineValidate = [];
            for(let i = 0; i < sizeSublist; i++){
                _curRec.selectLine(detailSublistId, i);

                let qty = _curRec.getCurrentSublistValue(detailSublistId, "custpage_quantity") * 1;

                total_quantity += qty;

                let objLine = {};
                objLine.custpage_issueinventorynumber = _curRec.getCurrentSublistValue(detailSublistId,"custpage_issueinventorynumber");
                objLine.custpage_issueinventorynumber_display = _curRec.getCurrentSublistText(detailSublistId,"custpage_issueinventorynumber");
                objLine.custpage_expirationdate = _curRec.getCurrentSublistText(detailSublistId,"custpage_expirationdate");
                objLine.custpage_binnumber = _curRec.getCurrentSublistValue(detailSublistId,"custpage_binnumber");
                objLine.custpage_inventorystatus = _curRec.getCurrentSublistValue(detailSublistId,"custpage_inventorystatus");
                objLine.custpage_quantity = _curRec.getCurrentSublistValue(detailSublistId,"custpage_quantity") * 1;
                objLine.custpage_lotquantityavailable = _curRec.getCurrentSublistValue(detailSublistId,"custpage_lotquantityavailable") * 1;

                arrLines.push(objLine);

                let objLineVaidate = arrLineValidate.find(e => e.issueinventorynumber == objLine.custpage_issueinventorynumber);
                if(!!objLineVaidate){
                    objLineVaidate.quantity += objLine.custpage_quantity;

                    objLineVaidate.quantity = constFormat.roundNumber(objLineVaidate.quantity, 6);

                    if(objLineVaidate.quantity > objLineVaidate.lotquantityavailable){
                        alert(`Total Quantity of Lot (${objLineVaidate.issueinventorynumber_display}) can not greater than Quantity Available (${objLineVaidate.lotquantityavailable}).`);
                        return false;
                    }
                }
                else{
                    arrLineValidate.push({...objLine});
                }

                _curRec.commitLine(detailSublistId);
            }

            total_quantity = constFormat.roundNumber(total_quantity, 6);

            if(total_quantity != _params.custpage_quantity){
                alert("Phải nhập đủ số lượng " + _params.custpage_quantity);
                return false;
            }
            
            let inventoryDetailStore = {
                item: _params.custpage_item,
                itemdescription: _params.custpage_description,
                unit: "",
                unit_display: _params.custpage_units,
                quantity: _params.custpage_quantity,
                location: _params.custpage_location,
                inventoryassignment: arrLines
            };

            let parentLine = _params.parentLine * 1 + 1;
            let keyStoreNew = _scvInventoryDetail.setDataStoreInventoryClientSide(inventoryDetailStore);
            windowParent.nlapiSetLineItemValue(_params.parentSublistId, _scvInventoryDetail.getStoreFieldId(_params.parentFieldId), parentLine , keyStoreNew);

            let isNeeded = arrLines.length == 0 ? true : false;
            windowParent.nlapiSetLineItemValue(_params.parentSublistId, _scvInventoryDetail.getNeededFieldId(_params.parentFieldId), parentLine, isNeeded);
            
            return true;
        }
        //#endregion

        //#region Receipt
        const pageInit_Receipt = (scriptContext) =>{
            let curRec = scriptContext.currentRecord;

            let params = getObjParams(curRec);
            let parentLine = params.parentLine * 1 + 1;

            let keyStore =  windowParent.nlapiGetLineItemValue(params.parentSublistId, _scvInventoryDetail.getStoreFieldId(params.parentFieldId), parentLine);
            let inventoryDetailStore = _scvInventoryDetail.getDataStoreInventoryClientSide(keyStore);
            if(!inventoryDetailStore) return;

            let arrLine = inventoryDetailStore.inventoryassignment;

            for(let i = 0; i < arrLine.length; i++){
                let objLine = arrLine[i];
                
                curRec.selectNewLine(detailSublistId);
                curRec.setCurrentSublistValue(detailSublistId,"custpage_inventorynumber", objLine.custpage_inventorynumber)

                if(!!objLine.custpage_expirationdate){
                    curRec.setCurrentSublistValue(detailSublistId,"custpage_expirationdate", nlapiStringToDate(objLine.custpage_expirationdate))
                }
                if(!!objLine.custpage_binnumber){
                    curRec.setCurrentSublistValue(detailSublistId,"custpage_binnumber", objLine.custpage_binnumber)
                }
                if(!!objLine.custpage_inventorystatus){
                    curRec.setCurrentSublistValue(detailSublistId,"custpage_inventorystatus", objLine.custpage_inventorystatus)
                }
                curRec.setCurrentSublistValue(detailSublistId,"custpage_quantity", objLine.custpage_quantity);
                
                curRec.commitLine(detailSublistId);
            }
        }

        const onSubmitResult_Receipt = (_curRec, _params) =>{
            let sizeSublist = _curRec.getLineCount(detailSublistId);
            
            let total_quantity = 0;
            let arrLines = [];

            for(let i = 0; i < sizeSublist; i++){
                _curRec.selectLine(detailSublistId, i);

                let qty = _curRec.getCurrentSublistValue(detailSublistId, "custpage_quantity") * 1;

                total_quantity += qty;

                let objLine = {};
                objLine.custpage_inventorynumber = _curRec.getCurrentSublistValue(detailSublistId,"custpage_inventorynumber");
                objLine.custpage_inventorynumber_display = _curRec.getCurrentSublistValue(detailSublistId,"custpage_inventorynumber");
                objLine.custpage_expirationdate = _curRec.getCurrentSublistText(detailSublistId,"custpage_expirationdate");
                objLine.custpage_binnumber = _curRec.getCurrentSublistValue(detailSublistId,"custpage_binnumber");
                objLine.custpage_inventorystatus = _curRec.getCurrentSublistValue(detailSublistId,"custpage_inventorystatus");
                objLine.custpage_quantity = _curRec.getCurrentSublistValue(detailSublistId,"custpage_quantity") * 1;

                arrLines.push(objLine);

                _curRec.commitLine(detailSublistId);
            }

            total_quantity = constFormat.roundNumber(total_quantity, 6);

            if(total_quantity != _params.custpage_quantity){
                alert("Phải nhập đủ số lượng " + _params.custpage_quantity);
                return false;
            }
            
            let inventoryDetailStore = {
                item: _params.custpage_item,
                itemdescription: _params.custpage_description,
                unit: "",
                unit_display: _params.custpage_units,
                quantity: _params.custpage_quantity,
                location: _params.custpage_location,
                inventoryassignment: arrLines
            };

            let parentLine = _params.parentLine * 1 + 1;
            let keyStoreNew = _scvInventoryDetail.setDataStoreInventoryClientSide(inventoryDetailStore);
            windowParent.nlapiSetLineItemValue(_params.parentSublistId, _scvInventoryDetail.getStoreFieldId(_params.parentFieldId), parentLine , keyStoreNew);

            let isNeeded = arrLines.length == 0 ? true : false;
            windowParent.nlapiSetLineItemValue(_params.parentSublistId, _scvInventoryDetail.getNeededFieldId(_params.parentFieldId), parentLine, isNeeded);
            
            return true;
        }
        //#endregion

        //#region TransferOrder
        const pageInit_TransferOrder = (scriptContext) =>{
            let curRec = scriptContext.currentRecord;

            let params = getObjParams(curRec);
            let parentLine = params.parentLine * 1 + 1;

            let keyStore =  windowParent.nlapiGetLineItemValue(params.parentSublistId, _scvInventoryDetail.getStoreFieldId(params.parentFieldId), parentLine);
            let inventoryDetailStore = _scvInventoryDetail.getDataStoreInventoryClientSide(keyStore);
            if(!inventoryDetailStore) return;

            let arrLine = inventoryDetailStore.inventoryassignment;

            for(let i = 0; i < arrLine.length; i++){
                let objLine = arrLine[i];
                
                curRec.selectNewLine(detailSublistId);
                curRec.setCurrentSublistValue(detailSublistId,"custpage_issueinventorynumber", objLine.custpage_issueinventorynumber)

                if(!!objLine.custpage_expirationdate){
                    curRec.setCurrentSublistValue(detailSublistId,"custpage_expirationdate", nlapiStringToDate(objLine.custpage_expirationdate))
                }
                curRec.setCurrentSublistValue(detailSublistId,"custpage_quantity", objLine.custpage_quantity);
                
                curRec.commitLine(detailSublistId);
            }
        }

        const fieldChanged_TransferOrder = (scriptContext) =>{
            let curRec = scriptContext.currentRecord;
            let fieldId = scriptContext.fieldId;
            let sublistId = scriptContext.sublistId;

            let params = getObjParams(curRec);
            let conversionRate = (params.conversionRate||1) * 1;

            let expiredt = "", qtyavai = 0, qty = 0, inventorystatus = "";
            let lotNoId = "";

            let arrDetail = []

            switch(fieldId){
                case "custpage_issueinventorynumber":
                    lotNoId = curRec.getCurrentSublistValue(sublistId, fieldId);
                    if(!!lotNoId){
                        arrDetail = constInventoryDetail.getDataItemOnhand({
                            inventorynumber: lotNoId,
                            location: params.custpage_location,
                            item: params.custpage_item
                        });
                        if(arrDetail.length > 0){
                            expiredt = arrDetail[0].expirationdate;
                            qtyavai = arrDetail[0].quantityavailable;
                        }
                    }

                    qtyavai = qtyavai / conversionRate;

                    if(!!expiredt){
                        expiredt = format.parse({value: expiredt, type: "date"});
                    }

                    curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custpage_expirationdate", value: expiredt, ignoreFieldChange: true});
                    curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custpage_lotquantityavailable", value: qtyavai, ignoreFieldChange: true});
                    curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custpage_quantity", value: qty, ignoreFieldChange: true});
                break;
                case "custpage_inventorystatus":
                    lotNoId = curRec.getCurrentSublistValue(sublistId, "custpage_issueinventorynumber");
                    inventorystatus = curRec.getCurrentSublistValue(sublistId, fieldId);

                    arrDetail = constInventoryDetail.getDataItemOnhand({
                        inventorynumber: lotNoId,
                        location: params.custpage_location,
                        item: params.custpage_item,
                        status: inventorystatus
                    });
                    if(arrDetail.length > 0){
                        expiredt = arrDetail[0].expirationdate;
                        qtyavai = arrDetail[0].available * 1;
                    }

                    qtyavai = qtyavai / conversionRate;

                    if(!!expiredt){
                        expiredt = format.parse({value: expiredt, type: "date"});
                    }

                    curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custpage_expirationdate", value: expiredt, ignoreFieldChange: true});
                    curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custpage_lotquantityavailable", value: qtyavai, ignoreFieldChange: true});
                    curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custpage_quantity", value: qty, ignoreFieldChange: true});

                break;
                case "custpage_quantity":
                    qty = curRec.getCurrentSublistValue(sublistId, fieldId) * 1;
                    qtyavai = curRec.getCurrentSublistValue(sublistId, "custpage_lotquantityavailable") * 1;

                    if(qty > qtyavai){
                        alert("Quantity can not greater than Quantity Available.");
                        curRec.setCurrentSublistValue({sublistId: sublistId, fieldId: "custpage_quantity", value: qtyavai, ignoreFieldChange: true});

                        return;
                    }
                break;
            }
        }

        const onSubmitResult_TransferOrder = (_curRec, _params) =>{
            let sizeSublist = _curRec.getLineCount(detailSublistId);
            
            let total_quantity = 0;
            let arrLines = [];

            let arrLineValidate = [];
            for(let i = 0; i < sizeSublist; i++){
                _curRec.selectLine(detailSublistId, i);

                let qty = _curRec.getCurrentSublistValue(detailSublistId, "custpage_quantity") * 1;

                total_quantity += qty;

                let objLine = {};
                objLine.custpage_issueinventorynumber = _curRec.getCurrentSublistValue(detailSublistId,"custpage_issueinventorynumber");
                objLine.custpage_issueinventorynumber_display = _curRec.getCurrentSublistText(detailSublistId,"custpage_issueinventorynumber");
                objLine.custpage_expirationdate = _curRec.getCurrentSublistText(detailSublistId,"custpage_expirationdate");
                objLine.custpage_quantity = _curRec.getCurrentSublistValue(detailSublistId,"custpage_quantity") * 1;
                objLine.custpage_lotquantityavailable = _curRec.getCurrentSublistValue(detailSublistId,"custpage_lotquantityavailable") * 1;

                arrLines.push(objLine);

                let objLineVaidate = arrLineValidate.find(e => e.issueinventorynumber == objLine.custpage_issueinventorynumber);
                if(!!objLineVaidate){
                    objLineVaidate.quantity += objLine.custpage_quantity;

                    objLineVaidate.quantity = constFormat.roundNumber(objLineVaidate.quantity, 6);

                    if(objLineVaidate.quantity > objLineVaidate.lotquantityavailable){
                        alert(`Total Quantity of Lot (${objLineVaidate.issueinventorynumber_display}) can not greater than Quantity Available (${objLineVaidate.lotquantityavailable}).`);
                        return false;
                    }
                }
                else{
                    arrLineValidate.push({...objLine});
                }

                _curRec.commitLine(detailSublistId);
            }

            total_quantity = constFormat.roundNumber(total_quantity, 6);

            if(total_quantity != _params.custpage_quantity){
                alert("Phải nhập đủ số lượng " + _params.custpage_quantity);
                return false;
            }
            
            let inventoryDetailStore = {
                item: _params.custpage_item,
                itemdescription: _params.custpage_description,
                unit: "",
                unit_display: _params.custpage_units,
                quantity: _params.custpage_quantity,
                location: _params.custpage_location,
                inventoryassignment: arrLines
            };

            let parentLine = _params.parentLine * 1 + 1;
            let keyStoreNew = _scvInventoryDetail.setDataStoreInventoryClientSide(inventoryDetailStore);
            windowParent.nlapiSetLineItemValue(_params.parentSublistId, _scvInventoryDetail.getStoreFieldId(_params.parentFieldId), parentLine , keyStoreNew);

            let isNeeded = arrLines.length == 0 ? true : false;
            windowParent.nlapiSetLineItemValue(_params.parentSublistId, _scvInventoryDetail.getNeededFieldId(_params.parentFieldId), parentLine, isNeeded);
            
            return true;
        }
        //#endregion
        
        const hasBinColumn = (_sublistId) =>{
            let binField = _scvForm.currentRecord.getCurrentSublistField(_sublistId, "custpage_binnumber");
            if(!binField) return false;

            return binField.isDisplay;

        }
        return {
            pageInit,
            fieldChanged,
            lineInit,
            onSubmitResult,
            onCancel
        };

    });
