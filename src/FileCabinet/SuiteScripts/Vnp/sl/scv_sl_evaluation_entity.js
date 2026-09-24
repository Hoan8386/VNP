/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/runtime', 'N/file', 'N/record', 'N/redirect',
    'N/query', 'N/ui/message',
    '../lib/scv_lib_function.js',
    '../cons/scv_cons_form.js',
    '../cons/scv_cons_format.js',
    '../cons/scv_cons_evaluation_entity.js',
    '../cons/scv_cons_queue_job.js',
    '../cons/scv_cons_queue_job_status.js',
    '../cons/scv_cons_search_tieuchi_danhgia.js',
    '../cons/scv_cons_search_evaluation_entity_print.js',
],
    (
        runtime, file, record, redirect, 
        query, message,
        lbf,
        constForm,
        constFormat,
        constEvalEntity,
        constQueueJob,
        constQueueJobStatus,
        searchTieuChiDanhGia,
        searchEvalEntityPrint,
    ) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */

        const CurScript = {
            ID: "customscript_scv_sl_evaluation_entity",
            DEPLOYID_UI: "customdeploy_scv_sl_evaluation_entity",
            DEPLOYID_SVC: "customdeploy_scv_sl_evaluationentity_svc",
        };

        const EntityType = {
            CUSTOMER: {
                ID: 2,
                NAME: "Customer"
            },
            VENDOR: {
                ID: 1,
                NAME: "Vendor"
            }
        };

        const FormType = {
            Create: {
                ID: "create",
                NAME: "Tạo mới",
            },
            Print: {
                ID: "print",
                NAME: "Mẫu in",
            }
        };

        const ScheduledScript = {
            ID: 'customscript_scv_ss_evaluation_entity',
            DEPLOYMENT: 'customdeploy_scv_ss_evaluation_entity',
            INPUT_PARAM: 'custscript_scv_inpt_evaluation_entity'
        };

        const onRequest = (scriptContext) => {
            constForm.setContext(scriptContext);
            constForm.setServiceScript(CurScript.ID, CurScript.DEPLOYID_SVC);

            let request = scriptContext.request;
            let params = request.parameters;
            let curScript = runtime.getCurrentScript();

            if(!!params.custpage_entity) {
                let entTypeId = lbf.getEntityType(params.custpage_entity);
                params.custpage_entity_type = EntityType[entTypeId.toUpperCase()].ID;
            }

            if(curScript.deploymentId == CurScript.DEPLOYID_SVC) {
                let objResponse = {data: []};

                switch(params.action) {
                    case "runFilterSS":
                        let objDataExport = handleDataExportEvalEntity(params);
                        objResponse = {
                            entity_type: params.custpage_entity_type,
                            ...objDataExport
                        };
                        break;
				}

                constForm.write(objResponse);
            } else {
                if(request.method == "GET"){
                    onCreateFormUI(params);
                    if(params.isrun === "T") {
                        let arrResult = runFilterSS(params);
                        constForm.setDataOfSublist("custpage_sl_result", arrResult);
                    }
                    constForm.writePage();
                } else {
                    const arrSublist = constForm.getDataOfSublist("custpage_sl_result", [
                        "stt", "id", "mota", "diemtoida", "diemdanhgia"
                    ]);
                    const objParams = getDataObjParams(params);
                    
                    let isQueueJob = "F", queueJobId = "";
                    if(arrSublist.length > 15) {
                        isQueueJob = "T";

                        let objRes = {
                            params: objParams,
                            arrSublist
                        };

                        queueJobId = constQueueJob.createQueueJob("SCHEDULED_SCRIPT", ScheduledScript.ID, ScheduledScript.DEPLOYMENT, ScheduledScript.INPUT_PARAM, JSON.stringify(objRes));
                        constQueueJob.processQueueJob(ScheduledScript.ID, ScheduledScript.DEPLOYMENT);
                    } else {
                        for(let obj of arrSublist) {
                            constEvalEntity.createEvaluationEntity({
                                custrecord_scv_eva_entity: params.custpage_entity,
                                custrecord_scv_eva_date: constFormat.parseDate(params.custpage_evalution_date),
                                custrecord_scv_eva_criteria: obj.id,
                                custrecord_scv_eva_max_score: obj.diemtoida,
                                custrecord_scv_eva_score: obj.diemdanhgia
                            });
                        }
                    }

                    // redirect
                    redirect.toSuitelet({
                        scriptId: CurScript.ID, deploymentId: CurScript.DEPLOYID_UI,
                        parameters: {
                            custpage_entity: params.custpage_entity,
                            isQueueJob,
                            queueJobId
                        }
                    });
                }
            }
        }

        const getDataObjParams = (params) => {
            return {
                custpage_entity: params.custpage_entity,
                custpage_evalution_date: params.custpage_evalution_date,
            };
        }

        const handleDataExportEvalEntity = (params) => {
            const arrResult = runFilterSS(params);
            const objFirstLine = arrResult[0] || {};

            let template = null, fileName = null;

            let objResult = {
                ma_so: "",
                evalution_date: getEvaluationDate(objFirstLine.date),
                evalution_entity: objFirstLine.legalname || "",
                entity_address: objFirstLine.address || "",
                entity_phone: objFirstLine.phone || "",
            };

            if(params.custpage_entity_type == EntityType.CUSTOMER.ID) {
                template = getUrlFile('../docx/scv_evaluation_customer.docx');
                fileName = "BM.02.QT.KDXNK.41 Phiếu đánh giá khách hàng.docx";

                objResult.ma_so = "BM.02.QT.KDXNK.41";
                objResult.total_ddg = arrResult.reduce((a, b) => a + Number(b.diemdanhgia), 0);
                objResult.data = arrResult;
            } 
            else if(params.custpage_entity_type == EntityType.VENDOR.ID) {
                fileName = "BM.01.QT.KDXNK.14 Phiếu đánh giá NCC.docx";
                template = getUrlFile('../docx/scv_evaluation_vendor.docx');

                objResult.ma_so = "BM.01.QT.KDXNK.14";
                objResult.total_ddg = arrResult.reduce((a, b) => a + Number(b.diemdanhgia), 0);
                
                for(let obj of arrResult) {
                    const keyStt = obj.stt?.toString()?.replaceAll(".", "_");
                    objResult["chitieu_" + keyStt] = obj.diemdanhgia;
                }
            }

            return {
                template,
                fileName,
                objResult,
                objSubsidiary: getDataInfoSubsidiary(objFirstLine.subsidiary),
            };
        }

        const getDataInfoSubsidiary = (subsidiary) => {
            if(!subsidiary) return {};

            const subRec = record.load({type: record.Type.SUBSIDIARY, id: subsidiary});
            const logo = subRec.getValue({ fieldId: "logo" });

            const objSubsidiary = {
                legalname: subRec.getValue("legalname"),
                logoUrl: logo ? getUrlFile(logo) : ""
            };
            return objSubsidiary;
        }

        const getEvaluationDate = (date) => {
            if(!date) {
                let today = new Date();
                return "Ngày     tháng     năm " + today.getFullYear();
            }

            let objInfoDate = constFormat.getInfoDate(date);
            return `Ngày ${objInfoDate.dd} tháng ${objInfoDate.mm} năm ${objInfoDate.yyyy}`;
        }

        const runFilterSS = (params) => {
            if(!params.custpage_entity) return [];

            let arrResult = [];
            switch(params.custpage_form_type) {
                case FormType.Create.ID:
                    arrResult = getDataSSTieuChiDanhGia(params);
                    break;
                case FormType.Print.ID:
                    arrResult = getDataSSEvalEntityPrint(params);
                    break;
            }

            return arrResult;
        }

        const getUrlFile = (_fileId) => {
            return file.load({id: _fileId}).url;
        }

        const getDataSSTieuChiDanhGia = (params) => {
            return searchTieuChiDanhGia.getDataSource(params);
        }

        const getDataSSEvalEntityPrint = (params) => {
            return searchEvalEntityPrint.getDataSource(params);
        }

        const onCreateFormUI = (params) =>{
            defaultParams(params);
            constForm.createForm({title: "Phiếu đánh giá"}, "../cssl/scv_cs_sl_evaluation_entity.js");

            constForm.addPageLink([searchTieuChiDanhGia.ID, searchEvalEntityPrint.ID]);
            constForm.addSubmitButton("Create");
            constForm.addButton({id: "custpage_btn_search", label: "Search", functionName: "onSearchResult('F')"});
            constForm.addButton({id: "custpage_btn_print", label: "Print", functionName: "onSearchResult('T')"});

            addMsgCreateEvalEntity(params);

            // add library
            constForm.addLibaryInclude([
                "../olib/pizzip.js", 
                "../olib/pizzip-utils.js",
                // "../olib/FileSaver.min@2.0.5.js", // đã khai báo trong scv_cons_form
                "../olib/docxtemplater.min.js",
                "../olib/imagemodule-docx.js",
                "../scripts/scv_docxtemplater.js",
            ]);

            let mainGrp = constForm.addFieldGroup({id: "fieldgrp_main", label: "Filter"});

            // data
            let arrFormType = getDataFormType();

            // add field
            constForm.addField({
                id: 'custpage_form_type', label: 'Type', container: mainGrp.id,
                type: "select"
            }, true, {
                defaultValue: params.custpage_form_type,
                lookup: {
                    data: arrFormType
                }
            });

            constForm.addField({
                id: 'custpage_entity', label: 'Entity', container: mainGrp.id,
                type: "select", source: "-9"
            }, true, {
                defaultValue: params.custpage_entity,
            });

            constForm.addField({
                id: 'custpage_evalution_date', label: 'Ngày đánh giá', container: mainGrp.id,
                type: "date",
            }, true, {
                defaultValue: getToday(params.custpage_evalution_date)
            });

            // add sublist
            const columns = getDataColumns(params.custpage_form_type);
            let sublist = constForm.addSublist({
                id: "custpage_sl_result",
                type: "LIST",
                label: 'Result',
            });
            // sublist.addMarkAllButtons();

            constForm.addFieldOfSublist("custpage_sl_result", columns);
        }

        const addMsgCreateEvalEntity = (params) => {
            if(!!params.isQueueJob && !!params.custpage_entity) {
                const resultQuery = query.runSuiteQL({
                    query: `SELECT id, fullname FROM entity WHERE id = ?`,
                    params: [params.custpage_entity]
                }).asMappedResults();

                const objEntity = resultQuery[0] || {};
                let isConFirmation = true;
                
                if(params.isQueueJob === "T") {
                    let objQueueJob = getQueueJobStatus(params.queueJobId);
                    isConFirmation = objQueueJob.status == constQueueJobStatus.Records.Completed.ID;

                    if(!isConFirmation) {
                        constForm.addPageInitMessage({
                            type: message.Type.INFORMATION, 
                            message: "Trạng thái tạo phiếu đánh giá cho Entity " + (objEntity.fullname || "") + ": " + objQueueJob.status_display,
                            duration: -1
                        });
                    }
                }

                if(isConFirmation === true) {
                    constForm.addPageInitMessage({
                        type: message.Type.CONFIRMATION, 
                        message: "Tạo thành công phiếu đánh giá cho Entity " + (objEntity.fullname || "") + ".",
                        duration: -1
                    });
                }
            }
        }

        const getDataColumns = (formType) => {
            let columns = [];

            if(formType == FormType.Print.ID) {
                columns = [
                    {id: "stt", label: "STT", type: "text"},
                    {id: "tieuchi", label: "Tiêu chí", type: "text", displayType: "hidden" },
                    {id: "tieuchi_display", label: "Tiêu chí", type: "text"},
                    {id: "mota", label: "Mô tả", type: "text"},
                    {id: "diemtoida", label: "Điểm tối đa", type: "integer"},
                    {id: "diemdanhgia", label: "Điểm đánh giá", type: "integer", displayType: "inline" },
                ];
            } else {
                columns = [
                    {id: "stt", label: "STT", type: "text"},
                    {id: "id", label: "Tiêu chí", type: "text", displayType: "hidden" },
                    {id: "tieuchi", label: "Tiêu chí", type: "text"},
                    {id: "mota", label: "Mô tả", type: "text"},
                    {id: "diemtoida", label: "Điểm tối đa", type: "integer"},
                    {id: "diemdanhgia", label: "Điểm đánh giá", type: "integer", displayType: "entry" },
                ];
            }

            return columns;
        }

        const getDataFormType = () => {
            const arrResult = [];

            for(let key in FormType) {
                arrResult.push({
                    id: FormType[key].ID,
                    name: FormType[key].NAME,
                });
            }

            return arrResult;
        }

        const defaultParams = (params) => {
            if(!('custpage_form_type' in params)) params.custpage_form_type = FormType.Create.ID;
        }

        const getQueueJobStatus = (queueJobId) => {
            if(!queueJobId) return {};

            let resultQuery = query.runSuiteQL({query: `
                SELECT 
                    id, custrecord_scv_queue_job_status as status, 
                    BUILTIN.DF(custrecord_scv_queue_job_status) as status_display
                FROM customrecord_scv_queue_job
                WHERE isinactive = 'F' and id = ${queueJobId}'
            `}).asMappedResults();

            return resultQuery?.[0] || {};
        }

        const getToday = (date) => {
            if(!!date) {
                return date;
            }

            return constFormat.parseDate(new Date());
        }

        return {onRequest}

    });
