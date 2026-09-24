/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  11 Sep 2026         Huy Pham                Init & create file, Deploy chức năng Custom Import, from ms.Tâm(https://app.clickup.com/t/3773072/14yhnhmfg32)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/url',

    '../cons/scv_cons_datastore.js',
    '../cons/scv_cons_import.js',
    '../cons/scv_cons_importline.js'
],
(currentRecord, url,

    constDataStore,
    constImport,
    constImportLine
) => {
    const pageInit = (scriptContext) => {
        let fieldUpload = document.getElementById("scvUpload");
        fieldUpload.addEventListener("change", onChangeFieldUploadFile);
    }

    const onChangeFieldUploadFile = async(_event) =>{
        let files = _event.target.files;

        _scvForm.showLoadingDialog(true);

        let curRec = _scvForm.currentRecord;
        let params = getObjParams(curRec);
        params.moment_formatdate = window.dateformat.replaceAll("fm","");

        let arrFieldTemplate = constImport.getListFieldTemplateColumn(params.custpage_import, params.custpage_import_line, params.custpage_chk_importheader);

        let importResWorker = new Worker(_scvForm.webWorker.workerImport);

        importResWorker.postMessage({
            params: params,
            importFile: files[0],
            webWorker: _scvForm.webWorker,
            arrFieldTemplate: arrFieldTemplate
        });

        importResWorker.onmessage = (e) => {
            let receivedData = e.data;

            if (receivedData.isCompleted == false) {
                _scvForm.updateProgessStatus(receivedData.msg || "Processing");
            } else {
                constDataStore.setDataStore("arrFieldMapping", receivedData.arrFieldMapping);
                constDataStore.setDataStore("arrResultUpload", receivedData.arrResultUpload);
    
                _scvDx.setDataSource("grdDataUpload", receivedData.arrResult);
                _scvDx.setColumns("grdDataUpload", receivedData.arrColumn);
                _scvDx.getInstanceDx("grdDataUpload").refresh();

                let arrFieldMappingNotFound = receivedData.arrFieldMapping.filter(e => e.isMapped == "F");
    
                if(arrFieldMappingNotFound.length > 0){
                    let arrLabel = arrFieldMappingNotFound.map(e => `(${e.letterColExcel}) ` + e.labelColExcel);
                    _scvForm.showMsgError(`Cột "${arrLabel.toString()}" chưa được tự động mapping.`);
                }

                importResWorker.terminate();
                _scvForm.showLoadingDialog(false);
            }
        };
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    const fieldChanged = (scriptContext) => {
        let curRec = scriptContext.currentRecord;
        switch(scriptContext.fieldId){
            case "custpage_import":
                let importId = curRec.getValue("custpage_import");
                let importLineField = curRec.getField("custpage_import_line");

                constImportLine.initLoadFieldByCriteriaQuery(importLineField, {
                    custrecord_scv_import_line_rectype: importId??""
                }, false);
            break;
        }
    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    const saveRecord = (scriptContext) => {
        return false;
    }

    const onDownload = async () => {
        window.onbeforeunload = null;
        let curRec = currentRecord.get();
        
        let isValid = _scvForm.validateFieldMandatory(["custpage_import"]);
        if(!isValid){
            return;
        };

        let params = getObjParams(curRec);

        let workbook = new ExcelJS.Workbook();

        let pageSetup = {
            pageSetup: { paperSize: 9, orientation: 'landscape', scale: 100 }
        };

        let worksheet = workbook.addWorksheet("Template Import", pageSetup);

        let arrFieldTemplate = constImport.getListFieldTemplateColumn(params.custpage_import, params.custpage_import_line, params.custpage_chk_importheader);
        
        let idxRowFieldLabel = 1, idxRowFieldGuide = 2;
        let idxCurrentColumn = 1;
        for(let i = 0; i < arrFieldTemplate.length; i++){
            let cellFieldLabel = worksheet.getCell(idxRowFieldLabel, idxCurrentColumn);
            let cellFieldGuide = worksheet.getCell(idxRowFieldGuide, idxCurrentColumn);

            cellFieldLabel.value = arrFieldTemplate[i].label;
            cellFieldGuide.value = arrFieldTemplate[i].guideNote||"";

            worksheet.getColumn(idxCurrentColumn).width = 20;
            idxCurrentColumn++;
        }

        _scvExcelJS.saveWorkbook(workbook, curRec.getText("custpage_import") + ".xlsx");
    }

    const onRefresh = () => {
        window.onbeforeunload = null;
        window.location.reload();
    }

    const getObjParams = (_curRec) => {
        let params = _scvForm.getParameter();

        let paramsOfUrl = _scvForm.getUrlParams();

        if(paramsOfUrl.isPopup == "T"){
            params.isPopup = "T"
        }
        return params;
    }

    const onImportResult = async () =>{
        window.onbeforeunload = null;
            
        let curRec = currentRecord.get();

        let isValid = _scvForm.validateFieldMandatory(["custpage_import"]);
        if(!isValid) return;

        let arrLines = _scvDx.getDataSource("grdDataUpload");
        if(arrLines.length == 0){
            _scvForm.showMsgError("Phải tồn tại ít nhất 1 line để import.");
            return;
        }

        _scvForm.showLoadingDialog(true);

        let params = getObjParams(curRec);

        let objReqBody = {...params};
        objReqBody.arrLines = arrLines;

        _scvForm.ajax.postAsync(_scvForm.serviceScript.url, {
            action: "importDataUpload", body: JSON.stringify(objReqBody)
        }, function(_res, _paramsCallback){
            _scvForm.showLoadingDialog(false);

            let objRes = _res.data;

            if(objRes.isSuccess == true){
                if(params.isPopup == "T"){
                    window.getParent().location.reload();
                    onCancelPopup();
                }
                else{
                    let N_Message = _scvForm.modul.ui.message;

                    N_Message.create({
                        title: "Confirm",
                        message: "Completed.",
                        type: N_Message.Type.CONFIRMATION
                    }).show({duration: 10000});

                    /* if(!!objRes.internalid){
                        let arrInternalId = objRes.internalid.split(",");
                        for(let i = 0; i < arrInternalId.length; i++){
                            let urlRecord = url.resolveRecord({
                                recordType: objRes.recordType,
                                recordId: arrInternalId[i]
                            });
    
                            window.open(urlRecord);
                        }
                    } */

                    //onRefresh();
                }
            }
            else{
                _scvForm.showMsgError("Error: " + objRes.message??"");
            }
            
        },function(request, status, error, _paramsCallback){
            _scvForm.showMsgError(error.message||status)

            _scvForm.showLoadingDialog(false);
        });
    }

    const onMappingField = () =>{
        let curRec = currentRecord.get();

        let arrFieldMapping = constDataStore.getDataStore("arrFieldMapping");

        let params = getObjParams(curRec);
        params.sizeRow = arrFieldMapping.length;

        

        let urlScript = url.resolveScript({
            scriptId: 'customscript_scv_sl_import_popup_map',
            deploymentId: 'customdeploy_scv_sl_import_popup_map',
            params: params
        });

        nlExtOpenWindow(urlScript, 'popupFieldMap', screen.width - 300, screen.height - 300, this, true, "Import Mapping Field");
    }

    const onCancelPopup = () => {
        window.onbeforeunload = null;
        closePopup(true); 
    }

    window._scvGetDataFieldMapping = () =>{
        return constDataStore.getDataStore("arrFieldMapping");
    }

    window._scvGetDataParams = () =>{
        let curRec = currentRecord.get();

        return getObjParams(curRec);
    }

    window._scvUpdateFieldMapping = () =>{
        let arrFieldMapping = constDataStore.getDataStore("arrFieldMapping");
        let arrResultUpload = constDataStore.getDataStore("arrResultUpload");

        let arrColumn = [], arrResult = [];

        for(let i = 0; i < arrFieldMapping.length; i++){
            let objFieldMapping = arrFieldMapping[i];

            if(objFieldMapping.isMapped != "T") continue;

            arrColumn.push({
                dataField: objFieldMapping.id, caption: objFieldMapping.label, 
                dataType: "string", width: 150, 
                idxColExcel: objFieldMapping.idxColExcel,
                letterColExcel: objFieldMapping.letterColExcel
            });
        }

        for(let i = 0; i < arrResultUpload.length; i++){
            let objResUpload = arrResultUpload[i];

            let objRes = {};
            for(let idxCol = 0; idxCol < arrColumn.length; idxCol++){
                let objColumn = arrColumn[idxCol];

                objRes[objColumn.dataField] = objResUpload[objColumn.letterColExcel];
            }

            arrResult.push(objRes);
        }

        _scvDx.setDataSource("grdDataUpload", arrResult);
        _scvDx.setColumns("grdDataUpload", arrColumn);
        _scvDx.getInstanceDx("grdDataUpload").refresh();
    }

    const openStatusQueue = (_urlPopup, _width, _height, _title) =>{
        nlExtOpenWindow(_urlPopup, 'popupStatusQueue', _width, _height, this, true, _title);
    }

    return {
        pageInit,
        fieldChanged,
        onDownload,
        onRefresh,
        saveRecord,
        onImportResult,
        onMappingField,
        onCancelPopup,
        openStatusQueue
    };
    
});
