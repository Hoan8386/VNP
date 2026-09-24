/**
 * Nội dung: Đọc record hàng đợi customrecord_scv_import_data_process (id truyền từ Suitelet qua param,
 *           không có param thì quét các record còn active), tạo record tương ứng (bảng lương)
 *           rồi inactive record hàng đợi đã lấy ra.
 *           Được gọi từ sl/scv_sl_import_data_process.js sau khi Suitelet tạo record đầu tiên.
 * =======================================================================================
 *  Date                Author                  Description
 *  25 Aug 2026         SCV                     Init, create file.
 */
/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime',

    '../common/scv_common_import_data.js',
    '../lib/scv_lib_function.js',
    '../lib/scv_lib_report.js'
],
    (record, runtime,

        commonData,
        libFunc,
        libRep
    ) => {

        /**
         * Đọc record hàng đợi rồi trả về từng object cần tạo (1 object = 1 map).
         * Id record hàng đợi lấy từ param của Suitelet, không có thì quét toàn bộ record còn active.
         * @returns {Array<{dataProcessId: string, index: number, recordType: string, object: Object}>}
         */
        const getInputData = () => {
            let currentScript = runtime.getCurrentScript();
            let params = currentScript.getParameter({name: commonData.MapReduce.ImportDataProcess.PARAM});
            params = params ? JSON.parse(params) : {};

            const listDataProcessId = params.dataProcessId ? [String(params.dataProcessId)] : getListDataProcessId();
            const listInput = [];

            util.each(listDataProcessId, function (dataProcessId) {
                try {
                    const rec = record.load({type: commonData.RecordType.IMPORT_DATA_PROCESS, id: dataProcessId});

                    // Đã lấy ra xử lý rồi (chạy lại MR với param cũ còn lưu ở deployment) -> bỏ qua
                    if (rec.getValue({fieldId: 'isinactive'})) {
                        log.audit('getInputData', `Bỏ qua record hàng đợi ${dataProcessId} vì đã inactive`);
                        return;
                    }

                    const data = rec.getValue({fieldId: commonData.ImportDataProcessField.DATA});
                    const recordType = rec.getValue({fieldId: commonData.ImportDataProcessField.RECORD_TYPE});
                    const sublist = rec.getValue({fieldId: commonData.ImportDataProcessField.SUBLIST});

                    const dataParsed = data ? JSON.parse(data) : [];
                    const listObject = (util.isArray(dataParsed) ? dataParsed : [dataParsed]);

                    // Không có gì để xử lý -> inactive luôn, khỏi treo lại ở hàng đợi
                    if (!listObject.length) {
                        inactiveDataProcess(dataProcessId, '', 'Dữ liệu rỗng hoặc không có line');
                        return;
                    }

                    util.each(listObject, function (object, index) {
                        listInput.push({
                            dataProcessId: dataProcessId,
                            index: index,
                            recordType: recordType,
                            sublist: sublist,
                            object: object
                        });
                    });
                } catch (err) {
                    log.error('Error: getInputData', {dataProcessId: dataProcessId, err: err});
                    inactiveDataProcess(dataProcessId, '', String(err.message || err));
                }
            });

            log.audit('getInputData', `Record hàng đợi: ${listDataProcessId.length} | Số record cần tạo: ${listInput.length}`);
            return listInput;
        }

        /**
         * Mỗi object -> 1 record đích. Kết quả gom về reduce theo id record hàng đợi.
         *
         * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
         * @since 2015.1
         */
        const map = (context) => {
            const value = JSON.parse(context.value);
            try {
                const recordId = libFunc.createRecord(value.recordType, value.sublist, value.object.fields || {}, value.object.lines || []);
                commonData.applyUpdate(value.object.updates);
                context.write({key: value.dataProcessId, value: {index: value.index, recordId: recordId, message: ''}});
            } catch (err) {
                log.error('Error: Try.catch.map', err);
                context.write({key: value.dataProcessId, value: {index: value.index, recordId: '', message: String(err.message || err)}});
            }
        }

        /**
         * Xử lý xong toàn bộ object của 1 record hàng đợi -> inactive record đó,
         * ghi lại các internal id đã tạo và lỗi (nếu có).
         *
         * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
         * @since 2015.1
         */
        const reduce = (context) => {
            const dataProcessId = context.key;
            const listRecordId = [];
            const listMessage = [];

            util.each(context.values, function (v) {
                const result = JSON.parse(v);
                if (result.recordId) listRecordId.push(result.recordId);
                else listMessage.push(`Dòng ${result.index + 1}: ${result.message}`);
            });

            inactiveDataProcess(dataProcessId, listRecordId.join(','), listMessage.join('\n'));
            log.audit('reduce', `Hàng đợi ${dataProcessId}: tạo được ${listRecordId.length} record, lỗi ${listMessage.length}`);
        }

        /**
         * Lấy các record hàng đợi còn active (dùng khi chạy không có param, vd chạy tay theo lịch).
         * @returns {Array<string>}
         */
        const getListDataProcessId = () => {
            const sql = `select dp.id from ${commonData.RecordType.IMPORT_DATA_PROCESS} dp where dp.isinactive = 'F' order by dp.id`;
            const records = [];
            libRep.doSearchSqlAll(records, sql, []);
            return records.map(o => String(o.id));
        }

        /**
         * Đã lấy dữ liệu ra xử lý -> inactive record hàng đợi, ghi lại id record tạo được / lỗi.
         */
        const inactiveDataProcess = (dataProcessId, recordId, message) => {
            try {
                const values = {isinactive: true};
                values[commonData.ImportDataProcessField.RECORD_ID] = recordId ? String(recordId) : '';
                values[commonData.ImportDataProcessField.MESSAGE] = message || '';
                record.submitFields({
                    type: commonData.RecordType.IMPORT_DATA_PROCESS,
                    id: dataProcessId,
                    values: values,
                    options: {enableSourcing: false, ignoreMandatoryFields: true}
                });
            } catch (err) {
                log.error('Error: inactiveDataProcess', {dataProcessId: dataProcessId, err: err});
            }
        }

        /**
         * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
         * @since 2015.1
         */
        const summarize = (summary) => {
            summary.mapSummary.errors.iterator().each(function (key, error) {
                log.error(`Error map key ${key}`, error);
                return true;
            });
            summary.reduceSummary.errors.iterator().each(function (key, error) {
                log.error(`Error reduce key ${key}`, error);
                return true;
            });

            log.audit('summarize', `Usage: ${summary.usage} | Concurrency: ${summary.concurrency} | Yields: ${summary.yields}`);
        }

        return {
            getInputData,
            map,
            reduce,
            summarize
        };

    });
