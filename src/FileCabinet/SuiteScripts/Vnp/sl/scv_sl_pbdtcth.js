/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  14 Aug 2026         Thanh Hoan              Init, create file. Chức năng phân bổ doanh thu chưa thực hiên from ms. Tâm(https://app.clickup.com/t/3773072/86d40yedc)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/redirect', 'N/search', 'N/task', 'N/ui/message',
    '../cons/scv_cons_form.js',
    '../common/scv_common_pbdtcth.js',
    
], (
    runtime, redirect, search, task, message,
    constForm,
    commonPbdtcth
) => {
    const CurrentScript = {
        ID: 'customscript_scv_sl_pbdtcth',
        DEPLOYID_UI: 'customdeploy_scv_sl_pbdtcth',
        DEPLOYID_DATA: 'customdeploy_scv_sl_pbdtcth_svc',
    };

    const onRequest = (scriptContext) => {
        constForm.setContext(scriptContext);
        constForm.setServiceScript(CurrentScript.ID, CurrentScript.DEPLOYID_DATA);

        let params = scriptContext.request.parameters;
        let curScript = runtime.getCurrentScript();

        if (curScript.deploymentId == CurrentScript.DEPLOYID_DATA) {
            let objResponse = { data: [] };
            switch (params.action) {
                case 'getDataSource':
                    objResponse.data = commonPbdtcth.getDataSource(params);
                    break;
            }
            
            constForm.write(objResponse);
            return;
        }
        else{
            if (scriptContext.request.method == 'GET') {
                onCreateFormUI(params);
                
                showMsgJournal(params);

                constForm.writePage();
            }

            if (scriptContext.request.method === 'POST') {
                const paramsExecute = {
                    custpage_subsidiary: params.custpage_subsidiary,
                    custpage_date: params.custpage_date,
                    custpage_debit: params.custpage_debit,
                    custpage_salecontract: params.custpage_salecontract,
                };

                const arrResultCreate = commonPbdtcth.getDataSourceCreate(paramsExecute);
                const arrResultDelete = commonPbdtcth.getDataSourceDelete(paramsExecute);

                const arrResult = arrResultCreate.concat(arrResultDelete);

                if(arrResult.length < 5){
                    const journalIds = [];

                    arrResult.forEach(objRes => {

                        if(objRes.action === "delete"){
                            commonPbdtcth.deleteJournalOld(paramsExecute, objRes);
                        }
                        else if(objRes.action === "create"){
                            let jeId = commonPbdtcth.createJournal(paramsExecute, objRes);

                            journalIds.push(jeId);
                        }
                    });

                    paramsExecute.journalIds = journalIds.join(",");
                }
                else{
                    let mrTask = task.create({
                        taskType: task.TaskType.MAP_REDUCE,
                        scriptId: "customscript_scv_mr_pbdtcth",
                        deploymentId: "customdeploy_scv_mr_pbdtcth",
                        params: {
                            custscript_scv_mr_pbdtcth_param: JSON.stringify(paramsExecute)
                        }
                    });
                    paramsExecute.mrTaskId = mrTask.submit();
                }

                redirect.toSuitelet({
                    scriptId: CurrentScript.ID,
                    deploymentId: CurrentScript.DEPLOYID_UI,
                    parameters: {...paramsExecute}
                });
            }   
        }
        
    };

    const onCreateFormUI = (params) => {
        constForm.createForm('Chức năng phân bổ doanh thu chưa thực hiên', '../cssl/scv_cs_sl_pbdtcth.js');

        constForm.addPageLink(commonPbdtcth.getListSavedSearchId(), true);

        constForm.addButton({
            id: 'custpage_btn_search',
            label: 'Search',
            functionName: 'searchResult()',
        });

        constForm.addSubmitButton({
            label: 'Create'
        });

        
        
        constForm.addField({
            id: "custpage_subsidiary",
            label: "Subsidiary",
            type: "select",
            source: "subsidiary",
        }, true, {
            defaultValue: params.custpage_subsidiary
        });


        constForm.addField({
            id: "custpage_date",
            label: "Date",
            type: "date",
        }, true, {
            defaultValue: params.custpage_date
        });


        constForm.addField({
            id: "custpage_debit",
            label: "Debit/loan Agreemnt",
            type: "select",
            source: "customrecord_scv_loa"
        }, false, {
            defaultValue: params.custpage_debit,
        })


        constForm.addField({
            id: "custpage_salecontract",
            label: "Sale Contract",
            type: "select",
            source: "customsale_scv_sales_contract"
        }, false, {
            defaultValue: params.custpage_salecontract
        });
        
        constForm.addGridDx({
            id: 'custpage_sl_result',
            type: 'grid',
            label: 'Chi tiết',
            columns: commonPbdtcth.getColumnsResult(),
        });
    };

    const showMsgJournal = (params) => {
        let msgContents = ``;

        if(params.mrTaskId){
            let taskStatus = task.checkStatus(params.mrTaskId).status;

            msgContents = "Map/Reduce: " + taskStatus;
        }
        else if(params.journalIds){
            let journalIds = params.journalIds.split(",");
            journalIds.forEach((_id, index) =>{
                if(index > 0){
                    msgContents += ", ";
                }

                let tranid = search.lookupFields({type: "journalentry", id: _id, columns: "tranid"}).tranid;

                msgContents += `<a href="/app/accounting/transactions/transaction.nl?id=${_id}" target="_blank">${tranid}</a>`;
            })
        }

        if(msgContents){
            constForm.addPageInitMessage( { type: message.Type.CONFIRMATION, message: msgContents, duration: 60000 })
        }
    }

    return { onRequest, };
});
