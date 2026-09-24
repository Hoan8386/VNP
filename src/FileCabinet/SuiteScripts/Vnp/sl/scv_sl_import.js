/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  11 Sep 2026         Huy Pham                Init & create file, Deploy chức năng Custom Import, from ms.Tâm(https://app.clickup.com/t/3773072/14yhnhmfg32)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/search', 'N/file', 
    '../cons/scv_cons_form.js',
    '../cons/scv_cons_import.js',
    '../cons/scv_cons_importline.js',
    '../cons/scv_cons_queue_job.js',
],
    
    (runtime, search, file, 
        constForm,
        constImport,
        constImportLine,
        constQueueJob
    ) => {
        const CurrentScript = Object.freeze({
            ID: "customscript_scv_sl_import",
            DEPLOYID_UI: "customdeploy_scv_sl_import",
            DEPLOYID_DATA: "customdeploy_scv_sl_import_data"
        })
        const JOB_SCRIPT = {
            ID: "customscript_scv_ss_import",
            DEPLOYID: "customdeploy_scv_ss_import",
            PARAMSID: "custscript_scv_ss_import_param"
        }
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            constForm.setContext(scriptContext);
            constForm.setServiceScript(CurrentScript.ID, CurrentScript.DEPLOYID_DATA);

            let request = scriptContext.request;
            let params = request.parameters;

            let curScript = runtime.getCurrentScript();

            if(curScript.deploymentId == CurrentScript.DEPLOYID_DATA) {
                let objResponse = {data: []};

                switch(params.action){
                    case "importDataUpload":
                        objResponse.data = importDataUpload(JSON.parse(params.body));
                    break;
				}

                constForm.write(objResponse);
            } else {
                if(request.method === "GET") {
                    onCreateFormUI(params);
                    
                    constForm.addWebWorker({
                        workerImport: "../worker/scv_worker_import.js"
                    });
                    
                    constForm.writePage();
                }
            }
        }

        const onCreateFormUI = (_params) => {
            constForm.createForm({
                title: "Import Data", hideNavBar: _params.isPopup == "T" ? true : false
            }, "../cssl/scv_cs_sl_import.js");

            let mainGrp = constForm.addFieldGroup({id: "fieldgrp_main", label: "Main"});
            let uploadGrp = constForm.addFieldGroup({id: "fieldgrp_upload", label: "Upload"});
            let dataUploadTab = constForm.addTab({id: "tab_uploaddata", label: "Data Update"});

            let objPopupQueue = constQueueJob.getPopupQueueJobStatus(JOB_SCRIPT.ID, JOB_SCRIPT.DEPLOYID);

            constForm.addButton({id: "custpage_btn_import", label: "Import", functionName: "onImportResult()"}, {
                styleSubmit: true
            });
            constForm.addButton({id: "custpage_btn_mapping", label: "Mapping", functionName: "onMappingField()"});
            constForm.addButton({id: "custpage_btn_download", label: "Download", functionName: "onDownload()"});
            constForm.addButton({id: "custpage_btn_refresh", label: "Refresh", functionName: "onRefresh()"});
            constForm.addButton({id: "custpage_btn_queue", label: "Queue Job", functionName: `openStatusQueue('${objPopupQueue.url}', ${objPopupQueue.width}, ${objPopupQueue.height}, '${objPopupQueue.title}')`});
            
            let arrImport = [];

            if(_params.isPopup == "T"){
                constForm.addButton({id: "custpage_btn_cancel", label: "Cancel", functionName: "onCancelPopup()"});

                if(!_params.custpage_chk_importheader) _params.custpage_chk_importheader = "F";

                arrImport = constImport.getDataSourceByCriteriaQuery({custrecord_scv_import_rectype: _params.custpage_rectype});
                if(arrImport.length == 0) throw "Record chưa được setup chức năng Import!";

                let objImport = arrImport[0];

                _params.custpage_import = objImport.id;
            }
            else{
                if(!_params.custpage_chk_importheader) _params.custpage_chk_importheader = "T";
            }

            constForm.addField({
                id: 'custpage_import', label: 'Import Record', container: mainGrp.id,
                type: 'select', source: 'customrecord_scv_import',
            }, true, {
                displayType: _params.isPopup == "T" ? "DISABLED" : "NORMAL",
                defaultValue: _params.custpage_import
            });

            constForm.addField({
                id: 'custpage_chk_importheader', label: 'Header', container: mainGrp.id,
                type: 'checkbox',
            }, false, {
                defaultValue: _params.custpage_chk_importheader
            });

            constForm.addField({
                id: 'custpage_import_line', label: 'Import Line', container: mainGrp.id,
                type: 'multiselect',
            }, false,{
                data: {
                    data: !!_params.custpage_import ? constImportLine.getDataSourceByCriteriaQuery({custrecord_scv_import_line_rectype: _params.custpage_import??""}) : [],
                },
                defaultValue: !!_params.custpage_import_line ? _params.custpage_import_line.split(",") : ""
            });

            constForm.addField({
                id: 'custpage_rectype', label: 'Rec Type', container: mainGrp.id,
                type: 'text',
            }, false, {
                displayType: "HIDDEN",
                defaultValue: _params.custpage_rectype
            });

            constForm.addField({
                id: 'custpage_recid', label: 'Rec ID', container: mainGrp.id,
                type: 'text',
            }, false, {
                displayType: "HIDDEN",
                defaultValue: _params.custpage_recid
            });


            constForm.addField({
                id: "custpage_uploadfile",
                type: "inlinehtml",
                label: "HTML",
                container: uploadGrp.id
            }).defaultValue = includesUploadFileHtml();

            constForm.addGridDx({
                id : "grdDataUpload",
                type : "grid",
                label : "Result Upload",
                tab: dataUploadTab.id,
                columns: [],
            });
        }

        const importDataUpload = (_reqBody) =>{
            let objResponse = {
                isSuccess: true,
                message: "",
                internalid: "",
                recordType: "",
                taskId: ""
            }
            
            try{
                let recType = search.lookupFields({
                    type: constImport.TYPE, id: _reqBody.custpage_import, 
                    columns: "custrecord_scv_import_rectype"
                }).custrecord_scv_import_rectype;

                objResponse.recordType = recType;

                let arrFieldTemplate = constImport.getListFieldTemplateColumn(_reqBody.custpage_import, _reqBody.custpage_import_line, _reqBody.custpage_chk_importheader);
                let arrResult = constImport.convertRawDataToRecordJson(_reqBody.arrLines, _reqBody.custpage_import, _reqBody.custpage_import_line, _reqBody.custpage_chk_importheader);
                
                log.error("huy-arrResult",arrResult)
                if(_reqBody.isPopup == "T"){
                    for(let i = 0; i < arrResult.length; i++){
                        let objRes = arrResult[i];
                        objRes.internalid = _reqBody.custpage_recid;
    
                        constImport.importDataFromRecordJson(objRes, arrFieldTemplate, recType);
                    }

                    objResponse.internalid = _reqBody.custpage_recid;
                }
                else if(arrResult.length <= 5){
                    let arrInternalId = [];

                    //Lưu file JSON để theo dõi trong giai đoạn test
                    constImport.createFileJson(file, arrResult, arrFieldTemplate, recType);

                    for(let i = 0; i < arrResult.length; i++){
                        let objRes = arrResult[i];
                        if(!!_reqBody.custpage_recid){
                            objRes.internalid = _reqBody.custpage_recid;
                        }
    
                        let createRecId = constImport.importDataFromRecordJson(objRes, arrFieldTemplate, recType);

                        arrInternalId.push(createRecId);
                    }
                    objResponse.internalid = arrInternalId.toString();
                }
                else{
                    constQueueJob.setInfoJobScript("SCHEDULED_SCRIPT", JOB_SCRIPT.ID, JOB_SCRIPT.DEPLOYID, JOB_SCRIPT.PARAMSID);
                    
                    let sizePage = 100;

                    if(recType.indexOf("customrecord") == 0){
                        sizePage = 200;
                    }

                    let totalPage = Math.ceil(arrResult.length / sizePage);
                    
                    for(let i = 0; i < totalPage; i++){
                        let arrDataPage = arrResult.slice(i*sizePage, (i+1)*sizePage);
                        
                        let jsonFileId = constImport.createFileJson(file, arrDataPage, arrFieldTemplate, recType, i+1);

                        constQueueJob.createQueueJobScript(JSON.stringify({fileImportId: jsonFileId}));
                    }

                    //HuyPQ: Không được sử dụng map/reduce
                    constQueueJob.processQueueJobScript();
                }

            }catch(err){
                objResponse.isSuccess = false;
                objResponse.message = err.message;

                log.error("ERROR: Try-Catch: importDataUpload", err)
            }

            return objResponse;
        }
        
        const includesUploadFileHtml = () =>{
            return `
            <div style="margin-top: 16px">
                <input id="scvUpload" type=file name="files[]" accept=".xls, .xlsx, .csv" required>
            </div>
            `;
        }

        return {onRequest}

    });