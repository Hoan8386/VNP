/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  11 Sep 2026         Huy Pham                Init & create file, Deploy chức năng Custom Import, from ms.Tâm(https://app.clickup.com/t/3773072/14yhnhmfg32)
 */
/**
* @NApiVersion 2.1
* @NScriptType ScheduledScript
*/
define(['N/file', 'N/runtime', 
    '../cons/scv_cons_format.js',
    '../cons/scv_cons_queue_job.js',
    '../cons/scv_cons_import.js',
],function (file, runtime, 
    constFormat,
    constQueueJob,
    constImport,
) {

    const execute = function(context){
        let curScript = runtime.getCurrentScript();

        let paramsInput = curScript.getParameter({name : "custscript_scv_ss_import_param"});
            
        paramsInput = !!paramsInput ? JSON.parse(paramsInput) : {};

        let objResContents = constImport.getContentsFileJson(file, paramsInput.fileImportId);
        let arrResultRecord = objResContents.arrResultRecord;

        let msg_note = "Start Date: " + constFormat.formatDateTime(new Date());
        msg_note += "\nCreate: " + arrResultRecord.length + " (records)";

        constQueueJob.updateNoteQueueJob(curScript.id, curScript.deploymentId, msg_note);

        let countCreated = 0, countErr = 0;
        for(let i = 0; i < arrResultRecord.length; i++){
            try{
                log.error("DEBUG: remainingUsage ", runtime.getCurrentScript().getRemainingUsage());
                constImport.importDataFromRecordJson(arrResultRecord[i], objResContents.arrFieldTemplate, objResContents.recordType);

                countCreated++;
            }catch(err){
                constQueueJob.updateNoteQueueJob(curScript.id, curScript.deploymentId, "Error: " + err.message);

                countErr++;

                log.error("ERROR: TRY-CATCH", err.message)
            }
            
        }

        msg_note = "Response: Create " + countCreated + " (records);  Error " + countErr + " (records)";
        msg_note += "\nEnd Date: " + constFormat.formatDateTime(new Date());
        constQueueJob.completeQueueJob(curScript.id, curScript.deploymentId, msg_note);
    }

    return {
        execute
    };
});