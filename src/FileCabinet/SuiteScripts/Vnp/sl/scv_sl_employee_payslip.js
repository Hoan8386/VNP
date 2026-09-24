/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/runtime', 'N/redirect', 'N/cache', 'N/ui/message', 'N/task',
    '../lib/scv_lib_function.js',
    '../cons/scv_cons_form.js',
    '../cons/scv_cons_subsidiary.js',
    '../cons/scv_cons_search_emp_payslip.js',
    '../cons/scv_cons_search_data_print_payslip.js',
    '../common/scv_common_employee_payslip.js',
],
    (
        runtime, redirect, cache, message, task,
        lbf,
        constForm,
        constSubsidiary,
        searchEmpPayslip,
        searchDataPrintPayslip,
        commonEmpPayslip,
    ) => {

        const Sublist = {
            RESULT: "custpage_sl_result"
        };

        const CurScript = {
            ID: "customscript_scv_sl_employee_payslip",
            DEPLOYID_UI: "customdeploy_scv_sl_employee_payslip",
            DEPLOYID_SVC: "customdeploy_scv_sl_employee_payslip_svc",
        };

        const MapReduce = {
            ID: "customscript_scv_mr_employee_payslip",
            DEPLOYID: "customdeploy_scv_mr_employee_payslip",
            INPUT_PARAM: "custscript_scv_mr_inpt_emp_payslip",
        };

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            constForm.setContext(scriptContext);
            constForm.setServiceScript(CurScript.ID, CurScript.DEPLOYID_SVC);

            let request = scriptContext.request;
            let params = request.parameters;
            let curScript = runtime.getCurrentScript();

            if(curScript.deploymentId == CurScript.DEPLOYID_SVC) {
                let objResponse = {data: []};

                switch(params.action) {
                    case "getDataDepartmentBySub":
                        objResponse.data = commonEmpPayslip.getDataDepartmentBySub(params.custpage_subsidiary);
                        break;
                    case "createFileEmpPayslip":
                        objResponse.data = commonEmpPayslip.createFileEmpPayslip(params);
                        break;
				}

                constForm.write(objResponse);
            } else {
                let myCache = cache.getCache({ name: 'cUpdateStt', scope: cache.Scope.PRIVATE });

                if(request.method == "GET"){
                    onCreateFormUI(params, myCache);
                    if(params.isrun === "T") {
                        let arrResult = getDataResultEmpPayslip(params);
                        constForm.setDataOfSublist(Sublist.RESULT, arrResult);
                    }
                    constForm.writePage();
                } else {
                    const arrSublist = getDataSublistResult(params);
                    const objParams = getDataObjParams(params);
                    
                    let isSendMail = 'F';
                    if(arrSublist.length > 5) {
                        let mrTask = task.create({
                            taskType: task.TaskType.MAP_REDUCE,
                            scriptId: MapReduce.ID,
                            deploymentId: MapReduce.DEPLOYID
                        });

                        mrTask.params = {
                            [MapReduce.INPUT_PARAM]: JSON.stringify(arrSublist),
                        };

                        let mrTaskId = mrTask.submit();
                        myCache.put({ key: 'mrTaskId', value: mrTaskId });
                    } else {
                        isSendMail = 'T';
                        for(let obj of arrSublist) {
                            commonEmpPayslip.sendPayslipEmailToEMP(obj);
                        }
                    }

                    // redirect
                    redirect.toSuitelet({
                        scriptId: CurScript.ID, deploymentId: CurScript.DEPLOYID_UI,
                        parameters: {
                            ...objParams,
                            isSendMail
                        }
                    });
                }
            }
        }

        const getDataSublistResult = (params) => {
            let payslip_sender = commonEmpPayslip.getDataHR_PayslipSender(params.custpage_subsidiary);

            let arrSublist = constForm.getDataOfSublist("custpage_sl_result", [
                "select", "internalid", "employee_display", "department_display", "email", 
                "legalnamesub", "thangnam", "emplegalname", "jobtitle", "dataprint"
            ]);
            arrSublist = arrSublist.filter(e => e.select === 'T');
            
            return arrSublist.map(e => {
                let {dataprint, ...data} = e;
                let objPayslip = JSON.parse(dataprint);

                return {
                    ...data, 
                    ...objPayslip,
                    payslip_sender
                };
            })
        }

        const getDataObjParams = (params) => {
            return {
                custpage_subsidiary: params.custpage_subsidiary,
                custpage_department: params.custpage_department,
                custpage_employee: params.custpage_employee,
                custpage_period: params.custpage_period,
            };
        }

        const getDataResultEmpPayslip = (params) => {
            const arrEmpPayslip = searchEmpPayslip.getDataSource(params);
            const arrPrintPayslip = searchDataPrintPayslip.getDataSource(params);

            const arrResult = [];
            for(let objEmpPayslip of arrEmpPayslip) {
                let objPrintPayslip = arrPrintPayslip.find(e => e.subsidiary == objEmpPayslip.subsidiary && e.employee == objEmpPayslip.employee && e.period == objEmpPayslip.period) || {};
                
                const objPrint = {
                    ngaycong: (objPrintPayslip.ngaycong || 0) * 1,
                    luongngaycong: (objPrintPayslip.luongngaycong || 0) * 1,
                    phucapthamnien: (objPrintPayslip.phucapthamnien || 0) * 1,
                    phucapdienthoai: (objPrintPayslip.phucapdienthoai || 0) * 1,
                    phucaplaixe: (objPrintPayslip.phucaplaixe || 0) * 1,
                    thunhapkhac: (objPrintPayslip.thunhapkhac || 0) * 1,
                    tienantrua: (objPrintPayslip.tienantrua || 0) * 1,
                    bhxh: (objPrintPayslip.bhxh || 0) * 1,
                    thuetncn: (objPrintPayslip.thuetncn || 0) * 1,
                };

                const objRes = {
                    ...objEmpPayslip,
                    dataprint: JSON.stringify(objPrint)
                };
                arrResult.push(objRes);
            }

            return arrResult;
        }

        const onCreateFormUI = (params, myCache) =>{
            defaultParams(params);
            constForm.createForm({title: "Phiếu lương"}, "../cssl/scv_cs_sl_employee_payslip.js");

            constForm.addPageLink([searchEmpPayslip.ID, searchDataPrintPayslip.ID]);
            constForm.addSubmitButton("Send Mail");
            constForm.addButton({id: "custpage_btn_search", label: "Search", functionName: "onSearchResult()"});
            constForm.addButton({id: "custpage_btn_print", label: "Print", functionName: "onPrint('PDF')"});

            let mainGrp = constForm.addFieldGroup({id: "fieldgrp_main", label: "Filter"});
            onShowMessage(params, myCache);
            // data
            let arrSubsidiary = constSubsidiary.getDataSubsidiaryByUserRole();
            let arrDepartment = commonEmpPayslip.getDataDepartmentBySub(params.custpage_subsidiary);

            // add field
            constForm.addField({
                id: 'custpage_subsidiary', label: 'Subsidiary', container: mainGrp.id,
                type: "select"
            }, true, {
                defaultValue: params.custpage_subsidiary,
                lookup: {
                    data: arrSubsidiary,
                    valueExpr: "id",
                    displayExpr: "namenohierarchy"
                }
            });

            constForm.addField({
                id: 'custpage_department', label: 'Department', type: "select", 
                container: mainGrp.id,
            }, false, {
                defaultValue: params.custpage_department,
                lookup: {
                    data: arrDepartment,
                    valueExpr: "internalid", displayExpr: "name"
                }
            });

            constForm.addField({
                id: 'custpage_employee', label: 'Employee', container: mainGrp.id,
                type: "select", source: "employee"
            }, false, {
                defaultValue: params.custpage_employee,
            });

            constForm.addField({
                id: 'custpage_period', label: 'Period', container: mainGrp.id,
                type: "select", source: "accountingperiod"
            }, true, {
                defaultValue: params.custpage_period,
            });

            // add sublist
            const columns = commonEmpPayslip.getDataColumns(params.custpage_form_type);
            let sublist = constForm.addSublist({
                id: Sublist.RESULT,
                type: "LIST",
                label: 'Result',
            });
            sublist.addMarkAllButtons();
            constForm.addFieldOfSublist(Sublist.RESULT, columns);
        }

        const onShowMessage = (params, myCache) => {
            const Notification = {
                SUCCESS: "Gửi thành công phiếu lương cho các nhân viên được chọn.",
                BY_TASK_STATUS: "Trạng thái gửi phiếu lương cho các nhân viên là: ",
            };

            if(params.isSendMail === 'T') {
                constForm.addPageInitMessage({
                    type: message.Type.CONFIRMATION,
                    message: Notification.SUCCESS,
                    duration: -1
                });
            } else {
                // update status task
                let mrTaskId = params.mrTaskId;
                if (lbf.isContainValue(mrTaskId) == false) {
                    mrTaskId = myCache.get({
                        key: 'mrTaskId',
                        loader: 'loader'
                    });
                }
                
                if (lbf.isContainValue(mrTaskId)) {
                    let taskStatus = task.checkStatus(mrTaskId);
                    let messageInfo = Notification.BY_TASK_STATUS + taskStatus.status;

                    constForm.addPageInitMessage({
                        type: taskStatus.status == 'COMPLETE' ? message.Type.CONFIRMATION : message.Type.INFORMATION,
                        message: taskStatus.status == 'COMPLETE' ? Notification.SUCCESS : messageInfo,
                        duration: -1
                    });

                    if(taskStatus.status == 'COMPLETE') {
                        myCache.remove({ key: 'mrTaskId' });
                    }
                }
            }
        }

        const defaultParams = (params) => {
            let curUser = runtime.getCurrentUser();
            if(!('custpage_subsidiary' in params)) params.custpage_subsidiary = curUser.subsidiary.toString();
        }
        
        return {onRequest}
    });
