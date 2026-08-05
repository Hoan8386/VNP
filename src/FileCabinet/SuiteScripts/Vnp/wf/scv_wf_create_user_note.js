/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(['N/record', 'N/search', 'N/email', 'N/runtime', 'N/file', 'N/redirect'],

    (record, search, email, runtime, file, redirect) => {
        /**
         * Defines the WorkflowAction script trigger point.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
         * @param {string} scriptContext.type - Event type
         * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
         * @since 2016.1
         */
        const onAction = (scriptContext) => {
            var form = scriptContext.form;
            var newRecord = scriptContext.newRecord;
            var triggerType = scriptContext.type;
            if(triggerType == "button"){
                var recordname = "", rectype = "";
                if(newRecord.type.slice(0, 12) == 'customrecord'){
                    recordname = newRecord.getText("rectype");
                    rectype = newRecord.getValue("rectype");
                } else {
                    recordname = newRecord.getText("ntype");
                    rectype = newRecord.getValue("ntype");
                    // if(!recordname){
                    //     recordname = hardCodeRecordName(newRecord.type);
                    // }
                }
                redirect.toSuitelet({
                    scriptId: "customscript_scv_sl_create_user_note",
                    deploymentId: "customdeploy_scv_sl_create_user_note",
                    parameters: {
                        workflow: "scv_wf_create_user_note",
                        recordtype: newRecord.type,
                        rectype: rectype,
                        recordname: recordname,
                        recid: newRecord.id
                    }
                });
            }
        }
        const hardCodeRecordName = (_rectype) => {
            var name = '';
            if(_rectype == 'customsale_scv_ot_yc_xvt'){
                name = 'Yêu cầu nhập xuất kho';
            } else if(_rectype == 'customsale_scv_sales_plan_custom'){
                name = 'Sales Plan';
            }
            return name;
        }
        return {onAction};
    });
