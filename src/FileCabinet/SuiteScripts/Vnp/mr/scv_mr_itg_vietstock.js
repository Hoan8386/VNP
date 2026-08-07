/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/runtime', '../common/scv_common_itg_vietstock.js'],

    (runtime, vietStock) => {

        const getScriptParameter = (name) => {
            return runtime.getCurrentScript().getParameter({name: name});
        }

        /**
         * Nhận danh sách requestBody customrecord_scv_dgdt do syncFinancialInfo đẩy sang qua script parameter
         * (phần vượt quá DIRECT_SYNC_LIMIT dòng chạy trực tiếp).
         * @param {Object} inputContext
         * @returns {Array} danh sách requestBody, mỗi phần tử là một key-value cho map stage
         * @since 2015.2
         */
        const getInputData = (inputContext) => {
            try {
                let strRequestBodies = getScriptParameter(vietStock.MapReduce.PARAM_REQUEST_BODIES);
                if (!strRequestBodies) return [];

                let requestBodies = JSON.parse(strRequestBodies);
                log.audit('getInputData', `Số dòng chỉ tiêu cần xử lý: ${requestBodies.length}`);
                return requestBodies;
            } catch (e) {
                log.error('getInputData error', e);
                return [];
            }
        }

        /**
         * Mỗi key-value là một requestBody: chưa có record thì tạo mới, đã có thì cập nhật - cùng logic với
         * phần chạy trực tiếp ở syncFinancialInfo.
         * @param {Object} mapContext
         * @param {string} mapContext.key
         * @param {string} mapContext.value
         * @since 2015.2
         */
        const map = (mapContext) => {
            log.error('mapContext.value', mapContext.value);
            try {
                let requestBody = JSON.parse(mapContext.value);
                let stockCode = requestBody.fields.custrecord_scv_dgdt_stockcode;
                let {ids, errors} = vietStock.processDgdtRequestBodies([requestBody], stockCode);
                if (errors.length > 0) {
                    mapContext.write({key: 'error', value: JSON.stringify(errors[0])});
                } else {
                    mapContext.write({key: 'success', value: String(ids[0])});
                }
            } catch (e) {
                log.error('map error ' + mapContext.key, e);
                mapContext.write({key: 'error', value: e.message || String(e)});
            }
        }

        /**
         * Gom số dòng thành công/lỗi để ghi log tổng hợp ở summarize.
         * @param {Object} reduceContext
         * @since 2015.2
         */
        const reduce = (reduceContext) => {
            reduceContext.write({key: reduceContext.key, value: reduceContext.values.length});
        }

        /**
         * Ghi log kết quả toàn bộ lần chạy.
         * @param {Object} summaryContext
         * @since 2015.2
         */
        const summarize = (summaryContext) => {
            let summary = {};
            summaryContext.output.iterator().each((key, value) => {
                summary[key] = value;
                return true;
            });
            log.audit('summarize', summary);

            summaryContext.mapSummary.errors.iterator().each((key, error) => {
                log.error('map error ' + key, error);
                return true;
            });
        }

        return {getInputData, map, reduce, summarize}

    });