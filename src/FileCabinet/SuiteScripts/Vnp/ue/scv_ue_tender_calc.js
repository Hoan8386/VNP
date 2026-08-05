/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['../lib/scv_lib_tender_calc'],
    (libCalc) => {

        /**
         * Defines the function definition that is executed before record is submitted.
         * Đảm bảo Bộ dự thầu/trúng thầu/custom được tính lại khi record được tạo/sửa
         * bằng đường khác ngoài UI (CSV Import, SuiteTalk/API, ...) - nơi Client Script không chạy.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            try {
                if (scriptContext.type !== 'create' && scriptContext.type !== 'edit') return;
                libCalc.recalcAllLines(scriptContext.newRecord);
            } catch (e) {
                log.error('Error beforeSubmit', e);
            }
        }

        return {beforeSubmit}

    });
