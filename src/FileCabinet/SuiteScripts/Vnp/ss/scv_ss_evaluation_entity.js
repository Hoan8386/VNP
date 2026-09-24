/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define([
    'N/runtime', 'N/format',
    '../cons/scv_cons_format.js',
    '../cons/scv_cons_evaluation_entity.js',
    '../cons/scv_cons_queue_job.js',
],
    (
        runtime, format,
        constFormat,
        constEvalEntity,
        constQueueJob,
    ) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */

        const ScheduledScript = {
            ID: 'customscript_scv_ss_evaluation_entity',
            DEPLOYMENT: 'customdeploy_scv_ss_evaluation_entity',
            INPUT_PARAM: 'custscript_scv_inpt_evaluation_entity'
        };

        const execute = (scriptContext) => {
            let curScript = runtime.getCurrentScript();

            let scriptParams = curScript.getParameter({ name: ScheduledScript.INPUT_PARAM });
            let objRes = !!scriptParams ? JSON.parse(scriptParams) : {};

            let { params, arrSublist } = objRes;

            let msg_note = "Thời gian Tạo phiếu đánh giá: " + getToday();
            msg_note += "\nTổng số phiếu đánh giá: " + arrSublist.length + " (records)";
            constQueueJob.updateNoteQueueJob(curScript.id, curScript.deploymentId, msg_note);

            for(let obj of arrSublist) {
                try {
                    constEvalEntity.createEvaluationEntity({
                        custrecord_scv_eva_entity: params.custpage_entity,
                        custrecord_scv_eva_date: constFormat.parseDate(params.custpage_evalution_date),
                        custrecord_scv_eva_criteria: obj.id,
                        custrecord_scv_eva_max_score: obj.diemtoida,
                        custrecord_scv_eva_score: obj.diemdanhgia
                    });
                } catch (err) {
                    log.error("ERROR constEvalEntity.createEvaluationEntity", err);

                    constQueueJob.updateNoteQueueJob(curScript.id, curScript.deploymentId, "Create Evaluation Entity Error: " + err.message);
                }
            }
            
            constQueueJob.completeQueueJob(curScript.id, curScript.deploymentId, "\nThời gian hoàn thành tạo phiếu đánh giá: " + getToday());
        }

        const getToday = () => {
            let today = format.format({
                value: new Date(),
                type: format.Type.DATETIME,
                timezone: format.Timezone.ASIA_BANGKOK
            });

            return today;
        }

        return {execute}

    });
