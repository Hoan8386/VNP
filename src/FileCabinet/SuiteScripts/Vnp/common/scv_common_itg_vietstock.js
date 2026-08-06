/**
 * @NApiVersion 2.1
 */
define(['N/http', 'N/https', 'N/query', 'N/search', 'N/task', './scv_common_internal.js'],

    (http, https, query, search, task, commonInternal) => {

        const RecordType = {
            VIETSTOCK_CONFIG: 'customrecord_scv_itg_vietstock_config',
            MARKET_PRICE: 'customrecord_scv_market_price',
            DGDT: 'customrecord_scv_dgdt'
        };

        const Field = {
            BASE_URL: 'custrecord_scv_itg_vtc_baseurl'
        };

        // Map/Reduce chạy nền phần dữ liệu vượt quá DIRECT_SYNC_LIMIT (scv_mr_itg_vietstock.js)
        const MapReduce = {
            SCRIPT_ID: 'customscript_scv_mr_itg_vietstock',
            DEPLOY_ID: 'customdeploy_scv_mr_itg_vietstock',
            PARAM_REQUEST_BODIES: 'custscript_scv_vtc_requestbodies'
        };

        // Số dòng chỉ tiêu được tạo/cập nhật ngay tại script gọi, phần còn lại đẩy sang Map/Reduce
        const DIRECT_SYNC_LIMIT = 20;

        // Loại đồng bộ - dùng chung giữa scv_ue_projects.js (nơi tạo params) và scv_sl_itg_vietstock.js (nơi xử lý)
        const SyncType = {
            STOCK_TRADING: 'stocktrading',
            FINANCIAL_INFO: 'financialinfo'
        };

        // Tham số Type của endpoint /financeinfo - dùng cho dropdown "Loại báo cáo" trên màn hình đồng bộ
        const FinanceInfoType = {
            CSTC: 'CSTC',   // 1.2 - Chỉ số tài chính -> Đánh giá khoản đầu tư
            BCTC: 'BCTC',   // 1.3 - Báo cáo tài chính -> Statistical Journal
            KQKD: 'KQKD',   // 1.3 - Kết quả kinh doanh
            LCTT: 'LCTT',   // 1.3 - Lưu chuyển tiền tệ
            BCTT: 'BCTT',   // 1.3 - Báo cáo tài chính tóm tắt
            CDKT: 'CDKT'    // 1.3 - Cân đối kế toán
        };

        const FinanceInfoTypeText = {
            CSTC: 'CSTC - Chỉ số tài chính',
            BCTC: 'BCTC - Báo cáo tài chính',
            KQKD: 'KQKD - Kết quả kinh doanh',
            LCTT: 'LCTT - Lưu chuyển tiền tệ',
            BCTT: 'BCTT - Báo cáo tài chính tóm tắt',
            CDKT: 'CDKT - Cân đối kế toán'
        };

        // Tham số TermType của endpoint /financeinfo (N: năm, Q: quý)
        const TermType = {
            N: 'N',
            Q: 'Q'
        };

        const TermTypeText = {
            N: 'N - Năm',
            Q: 'Q - Quý'
        };

        const UnitFinancialStatement = {
            'HN': '1',
            'ĐL': '2',
            'CTM': '3'
        };

        const AuditedStatus = {
            KT: '1',
            SX: '2',
            CKT: '3',
            DT: '4'
        };

        // Mapping theo FDD_Vietstock.xlsx - sheet "1.1. Stock Trading Info IMP"
        const MarketPriceField = {
            PROJECT: 'custrecord_scv_mp_proj',
            STOCK_CODE: 'custrecord_scv_mp_stock_code',
            TRADING_DATE: 'custrecord_scv_mp_trading_date',
            PRIOR_CLOSE_PRICE: 'custrecord_scv_mp_prior_closeprice',
            CEILING_PRICE: 'custrecord_scv_mp_ceilingprice',
            FLOOR_PRICE: 'custrecord_scv_mp_floorprice',
            TOTAL_VOL: 'custrecord_scv_mp_total_vol',
            TOTAL_VAL: 'custrecord_scv_mp_total_val',
            TOTALPUT_VOL: 'custrecord_scv_mp_totalput_vol',
            TOTALPUT_VAL: 'custrecord_scv_mp_totalput_val',
            HIGHEST_PRICE: 'custrecord_scv_mp_highest_price',
            LOWEST_PRICE: 'custrecord_scv_mp_lowest_price',
            OPEN_PRICE: 'custrecord_scv_mp_open_price',
            LAST_PRICE: 'custrecord_scv_mp_last_price',
            AVR_PRICE: 'custrecord_scv_mp_avr_price',
            CHANGE: 'custrecord_scv_mp_change',
            PER_CHANGE: 'custrecord_scv_mp_per_change',
            PRICE_STATUS: 'custrecord_scv_mp_price_status',
            TOTAL_ADJ_RATE: 'custrecord_scv_mp_total_adj_rate',
            CLOSE_PRICE: 'custrecord_scv_mp_close_price'
        };

        // Mapping theo FDD_Vietstock.xlsx - sheet "1.2. Financial info Đánh giá đầu tư" (customrecord_scv_dgdt)
        const DgdtField = {
            PROJECT: 'custrecord_scv_dgdt_proj',
            STOCK_CODE: 'custrecord_scv_dgdt_stockcode',
            DATE: 'custrecord_scv_dgdt_date',
            YEAR_PERIOD: 'custrecord_scv_dgdt_year_period',
            TERM_CODE: 'custrecord_scv_dgdt_term_code',
            TERM_NAME: 'custrecord_scv_dgdt_term_name',
            UNIT_FIN_STATE: 'custrecord_scv_dgdt_unitfinstate',
            AUDIT_STATUS: 'custrecord_scv_dgdt_audit_status',
            PERIOD_BEGIN: 'custrecord_scv_dgdt_period_begin',
            PERIOD_BEGIN_GL: 'custrecord_scv_dgdt_period_begin_gl',
            PERIOD_END: 'custrecord_scv_dgdt_period_end',
            PERIOD_END_GL: 'custrecord_scv_dgdt_period_end_gl',
            REPORT_DATE: 'custrecord_scv_dgdt_report_date',
            CREATED_DATE: 'custrecord_scv_dgdt_created_date',
            LAST_UPDATE: 'custrecord_scv_dgdt_last_update',
            DATE_PUB_DEPARTMENT: 'custrecord_scv_dgdt_date_pub_department',
            METRIC: 'custrecord_scv_dgdt_metric',
            METRIC_GR: 'custrecord_scv_dgdt_metric_gr',
            INDEX: 'custrecord_scv_dgdt_index',
            INDUSTRY_AVR: 'custrecord_scv_dgdt_industry_avr',
            UNIT: 'custrecord_scv_dgdt_unit'
        };

        // customlist_scv_price_market_status - mapping ColorId trả về từ API sang label của list
        const PriceMarketStatusText = {
            '2': 'Ceiling Price',
            '1': 'Increase',
            '0': 'Stable',
            '-1': 'Decrease',
            '-2': 'Floor Price'
        };

        const EndPoint = {
            STOCK_TRADING: '/stocktrading',
            FINANCE_INFO: '/financeinfo',
            COMPANY_INFO: '/companyinfo',
            ANNOUNCED_INFORMATION: '/AnnouncedInformation'
        }

        const callApiPost = (urlPost, headers, strBody, times = 0) => {
            let protocol = getProtocol(urlPost);
            let resCall;
            try {
                resCall = protocol.post({
                    url: urlPost,
                    headers: headers,
                    body: strBody
                });
            } catch (e) {
                log.error('callApiPost exception', e);//, 'SSS_REQUEST_TIME_EXCEEDED'
                if (['SSS_CONNECTION_TIME_OUT', 'SSS_INVALID_HOST_CERT'].includes(e.name) && times < 5) {
                    resCall = callApiPost(urlPost, headers, strBody, times + 1);
                } else {
                    throw e;
                }
            }

            return {resCall}
        }

        const callApiGet = (urlGet, headers, times = 0) => {
            let protocol = getProtocol(urlGet);
            let resCall;
            try {
                resCall = protocol.get({
                    url: urlGet,
                    headers: headers
                });
            } catch (e) {
                log.error('callApiGet exception', e);
                if (['SSS_CONNECTION_TIME_OUT', 'SSS_INVALID_HOST_CERT'].includes(e.name) && times < 5) {
                    resCall = callApiGet(urlGet, headers, times + 1);
                } else {
                    throw e;
                }
            }
            return {resCall}
        }

        const getProtocol = (baseurl) => {
            let protocol = http;
            if (baseurl.substring(0, 5) === 'https') {
                protocol = https;
            }
            return protocol;
        }

        /**
         * Lấy thông tin customrecord_scv_itg_vietstock_config bằng search.lookupFields.
         * @param {number|string} configId - internal id của customrecord_scv_itg_vietstock_config
         * @returns {Object} {id, name, baseurl}
         */
        const getVietstockConfigByLookupFields = (configId) => {
            let fieldOfConfig = search.lookupFields({
                type: RecordType.VIETSTOCK_CONFIG,
                id: configId,
                columns: ['name', Field.BASE_URL]
            });
            return {
                id: configId,
                name: fieldOfConfig.name,
                baseurl: fieldOfConfig[Field.BASE_URL]
            };
        }

        /**
         * Lấy thông tin customrecord_scv_itg_vietstock_config bằng N/query (SuiteQL), lấy bản ghi active đầu tiên.
         * @returns {Object|null} {id, name, baseurl}
         */
        const getVietstockConfigByQuery = () => {
            let sql = `select id, name, ${Field.BASE_URL} baseurl from ${RecordType.VIETSTOCK_CONFIG} where isinactive = 'F'`;
            let results = query.runSuiteQL({query: sql}).asMappedResults();
            return results[0] || null;
        }

        /**
         * 1.1 Stock Trading Info IMP - GET {baseurl}/stocktrading?code={stockCode} (theo FDD_Vietstock.xlsx mục Request).
         * @param {string} baseurl - custrecord_scv_itg_vtc_baseurl của customrecord_scv_itg_vietstock_config
         * @param {Object} headers
         * @param {string} stockCode - Mã chứng khoán, VD: VNM
         * @returns {Object} data trả về theo mẫu file stocktrading
         */
        const getStockTrading = (baseurl, headers, stockCode) => {
            let urlGet = `${baseurl}${EndPoint.STOCK_TRADING}?code=${stockCode}`;
            let {resCall} = callApiGet(urlGet, headers);
            return resCall.body ? JSON.parse(resCall.body) : null;
        }

        /**
         * Build object {action, type, fields} cho customrecord_scv_market_price theo mẫu file temp,
         * mapping theo FDD_Vietstock.xlsx - sheet "1.1. Stock Trading Info IMP".
         * Field "Project" (custrecord_scv_mp_proj) không có trong response, phải truyền projectId vào
         * (xác định qua business logic đối chiếu Stock Code với danh mục khoản đầu tư ở nơi gọi).
         * @param {Object} stockTradingData - data trả về từ getStockTrading (theo mẫu file stocktrading)
         * @param {number|string} projectId - internal id của Project tương ứng với Stock Code
         * @returns {Object} requestBody theo mẫu {action, type, fields}
         */
        const buildMarketPriceRequestBody = (stockTradingData, projectId) => {
            let fields = {
                [MarketPriceField.PROJECT]: projectId,
                [MarketPriceField.STOCK_CODE]: stockTradingData.StockCode,
                [MarketPriceField.TRADING_DATE]: stockTradingData.TradingDate,
                [MarketPriceField.PRIOR_CLOSE_PRICE]: stockTradingData.PriorClosePrice,
                [MarketPriceField.CEILING_PRICE]: stockTradingData.CeilingPrice,
                [MarketPriceField.FLOOR_PRICE]: stockTradingData.FloorPrice,
                [MarketPriceField.TOTAL_VOL]: stockTradingData.TotalVol,
                [MarketPriceField.TOTAL_VAL]: stockTradingData.TotalVal,
                [MarketPriceField.TOTALPUT_VOL]: stockTradingData.TotalPutVol,
                [MarketPriceField.TOTALPUT_VAL]: stockTradingData.TotalPutVal,
                [MarketPriceField.HIGHEST_PRICE]: stockTradingData.HighestPrice,
                [MarketPriceField.LOWEST_PRICE]: stockTradingData.LowestPrice,
                [MarketPriceField.OPEN_PRICE]: stockTradingData.OpenPrice,
                [MarketPriceField.LAST_PRICE]: stockTradingData.LastPrice,
                [MarketPriceField.AVR_PRICE]: stockTradingData.AvrPrice,
                [MarketPriceField.CHANGE]: stockTradingData.Change,
                [MarketPriceField.PER_CHANGE]: stockTradingData.PerChange,
                [MarketPriceField.PRICE_STATUS]: {text: PriceMarketStatusText[String(stockTradingData.ColorId)]},
                [MarketPriceField.TOTAL_ADJ_RATE]: stockTradingData.TotalAdjustRate,
                [MarketPriceField.CLOSE_PRICE]: stockTradingData.ClosePrice
            };

            return {action: 'add', type: RecordType.MARKET_PRICE, fields};
        }

        /**
         * Tìm record customrecord_scv_market_price đã tồn tại theo khoá đối chiếu (Stock Code + Trading Date).
         * @returns {string|null}
         */
        const findMarketPriceId = (stockCode, tradingDate) => {
            let searchMarketPrice = search.create({
                type: RecordType.MARKET_PRICE,
                filters: [
                    [MarketPriceField.STOCK_CODE, search.Operator.IS, stockCode],
                    'and',
                    [MarketPriceField.TRADING_DATE, search.Operator.IS, tradingDate]
                ],
                columns: ['internalid']
            });
            let result = searchMarketPrice.run().getRange({start: 0, end: 1});
            return result.length > 0 ? result[0].id : null;
        }

        /**
         * Đồng bộ Stock Trading Info theo mã CK: gọi API lấy data, đối chiếu (Stock Code + Trading Date) -
         * nếu chưa có record thì tạo mới, nếu đã có thì cập nhật (theo FDD_Vietstock.xlsx mục 1.1).
         * @param {string} baseurl
         * @param {Object} headers
         * @param {string} stockCode
         * @param {number|string} projectId - internal id của Project tương ứng với Stock Code
         * @returns {string} internalid của record customrecord_scv_market_price
         */
        const syncStockTrading = (baseurl, headers, stockCode, projectId) => {
            let stockTradingData = getStockTrading(baseurl, headers, stockCode);
            if (!stockTradingData) return null;

            let requestBody = buildMarketPriceRequestBody(stockTradingData, projectId);

            let existingId = findMarketPriceId(stockTradingData.StockCode, stockTradingData.TradingDate);
            if (existingId) {
                requestBody.action = 'update';
                requestBody.internalid = existingId;
                return commonInternal.updateRecord(requestBody, requestBody.type);
            }
            return commonInternal.addRecord(requestBody, requestBody.type);
        }

        /**
         * 1.2 Financial info -> Đánh giá khoản đầu tư - GET {baseurl}/financeinfo?Type=CSTC&Code={stockCode}
         * (theo FDD_Vietstock.xlsx mục Request).
         * @param {string} baseurl - custrecord_scv_itg_vtc_baseurl của customrecord_scv_itg_vietstock_config
         * @param {Object} headers
         * @param {string} stockCode - Mã chứng khoán, VD: VNM
         * @param {Object} [options] - Tham số lọc thêm (không bắt buộc)
         * @param {string} [options.termType] - Kỳ báo cáo, xem TermType (N: năm, Q: quý)
         * @param {string} [options.fromDate] - Từ ngày, định dạng yyyy-MM-dd
         * @param {string} [options.toDate] - Đến ngày, định dạng yyyy-MM-dd
         * @param {string} [options.lastUpdate] - Chỉ lấy dữ liệu có LastUpdate mới hơn
         * @returns {Object} data trả về theo mẫu file financialinfo {Audit, Unit, Head, Content}
         */
        const getFinancialInfo = (baseurl, headers, stockCode, options = {}) => {
            let urlGet = `${baseurl}${EndPoint.FINANCE_INFO}?Type=${FinanceInfoType.CSTC}&Code=${stockCode}`;
            let paramByName = {
                TermType: options.termType,
                FromDate: options.fromDate,
                ToDate: options.toDate,
                LastUpdate: options.lastUpdate
            };
            Object.keys(paramByName).forEach(name => {
                if (paramByName[name]) {
                    urlGet += `&${name}=${encodeURIComponent(paramByName[name])}`;
                }
            });

            let {resCall} = callApiGet(urlGet, headers);
            return resCall.body ? JSON.parse(resCall.body) : null;
        }

        /**
         * Convert Period begin/Period end dạng YYYYMM (VD: 202010) sang thời điểm để set vào field ngày
         * Period begin (GL)/Period end (GL).
         * Lấy giờ 12h trưa để việc quy đổi timezone khi set giá trị không làm lệch sang ngày khác.
         * @param {string|number} yyyymm - VD: 202010
         * @param {boolean} isEndOfMonth - true: lấy ngày cuối tháng (Period end), false: lấy ngày đầu tháng (Period begin)
         * @returns {number|null} timestamp, null nếu chuỗi không đúng định dạng YYYYMM
         */
        const convertPeriodToTime = (yyyymm, isEndOfMonth) => {
            let strPeriod = String(yyyymm === null || yyyymm === undefined ? '' : yyyymm).trim();
            if (!/^\d{6}$/.test(strPeriod)) return null;

            let year = Number(strPeriod.substring(0, 4));
            let month = Number(strPeriod.substring(4, 6));  // 1 - 12
            if (month < 1 || month > 12) return null;

            // Ngày đầu tháng: (year, month - 1, 1) | Ngày cuối tháng: (year, month, 0) - ngày 0 của tháng sau
            let date = isEndOfMonth ? new Date(year, month, 0, 12) : new Date(year, month - 1, 1, 12);
            return date.getTime();
        }

        /**
         * Khoá đối chiếu record customrecord_scv_dgdt: Mã chứng khoán + Chỉ tiêu đánh giá khoản đầu tư + kỳ báo cáo
         * (Year period + Period begin + Period end) - theo FDD_Vietstock.xlsx mục 1.2.
         * @param {string} stockCode
         * @param {string} metricName
         * @param {Object} period - {yearPeriod, periodBegin, periodEnd} của kỳ báo cáo (Head)
         */
        const makeDgdtKey = (stockCode, metricName, period) => {
            return `${stockCode}|${metricName}|${period.yearPeriod}|${period.periodBegin}|${period.periodEnd}`;
        }

        /**
         * Lấy phần kỳ báo cáo của khoá đối chiếu từ fields của một requestBody.
         * @returns {Object} {yearPeriod, periodBegin, periodEnd}
         */
        const getPeriodOfFields = (fields) => {
            return {
                yearPeriod: fields[DgdtField.YEAR_PERIOD],
                periodBegin: fields[DgdtField.PERIOD_BEGIN],
                periodEnd: fields[DgdtField.PERIOD_END]
            };
        }

        /**
         * Build danh sách object {action, type, fields} cho customrecord_scv_dgdt, mapping theo FDD_Vietstock.xlsx -
         * sheet "1.2. Financial info Đánh giá đầu tư".
         * Mỗi record = 1 kỳ báo cáo (phần tử Head) x 1 chỉ tiêu (phần tử trong Content), trong đó Chỉ số lấy theo
         * Value{n} với n là thứ tự của kỳ báo cáo trong Head (Value1 ứng với Head[0], ...).
         * Period begin (GL)/Period end (GL) không do API trả về mà quy đổi từ Period begin/Period end (YYYYMM)
         * ra ngày đầu tháng/ngày cuối tháng, tính theo từng kỳ báo cáo (Head).
         * Các field không có trong response nên không set ở đây:
         * - custrecord_scv_dgdt_metric_gr: cấu hình sourcing theo Chỉ tiêu đánh giá đầu tư
         * - custrecord_scv_dgdt_industry_avr: chỉ số trung bình ngành, không do API trả về
         * @param {Object} financialInfoData - data trả về từ getFinancialInfo (theo mẫu file financialinfo)
         * @param {number|string} projectId - internal id của Project tương ứng với Stock Code
         * @param {string} stockCode - Mã chứng khoán đã truy vấn (response không trả về Code)
         * @returns {Array<Object>} danh sách requestBody theo mẫu {action, type, fields}
         */
        const buildDgdtRequestBodies = (financialInfoData, projectId, stockCode) => {
            let requestBodies = [];
            let heads = financialInfoData.Head || [];
            let contents = financialInfoData.Content || {};
            let syncTime = new Date().getTime();

            heads.forEach((head) => {
                let valueField = `Value${head.ID}`;
                // Period begin/end (GL) quy đổi từ Period begin/end (YYYYMM) - tính theo từng kỳ báo cáo (Head)
                let periodBeginTime = convertPeriodToTime(head.PeriodBegin, false);
                let periodEndTime = convertPeriodToTime(head.PeriodEnd, true);

                Object.keys(contents).forEach(groupName => {
                    (contents[groupName] || []).forEach(item => {
                        // Chỉ tiêu không có số liệu ở kỳ này (dòng tiêu đề nhóm) thì bỏ qua
                        if (item[valueField] === null || item[valueField] === undefined) return;

                        let fields = {
                            [DgdtField.PROJECT]: projectId,
                            [DgdtField.STOCK_CODE]: stockCode,
                            [DgdtField.DATE]: syncTime,
                            [DgdtField.YEAR_PERIOD]: head.YearPeriod === null || head.YearPeriod === undefined ? '' : String(head.YearPeriod),
                            [DgdtField.TERM_CODE]: head.TermCode,
                            [DgdtField.TERM_NAME]: head.TermName,
                            [DgdtField.UNIT_FIN_STATE]: UnitFinancialStatement[head.United],
                            [DgdtField.AUDIT_STATUS]: AuditedStatus[head.AuditedStatus],
                            [DgdtField.PERIOD_BEGIN]: head.PeriodBegin,
                            [DgdtField.PERIOD_END]: head.PeriodEnd,
                            [DgdtField.REPORT_DATE]: head.ReportDate,
                            [DgdtField.CREATED_DATE]: head.CreatedDate,
                            [DgdtField.LAST_UPDATE]: head.LastUpdate,
                            [DgdtField.DATE_PUB_DEPARTMENT]: head.DatePubDepartment,
                            [DgdtField.METRIC]: {text: item.Name},
                            [DgdtField.INDEX]: item[valueField]
                        };
                        if (periodBeginTime) {
                            fields[DgdtField.PERIOD_BEGIN_GL] = periodBeginTime;
                        }
                        if (periodEndTime) {
                            fields[DgdtField.PERIOD_END_GL] = periodEndTime;
                        }
                        if (item.Unit) {
                            fields[DgdtField.UNIT] = {text: item.Unit};
                        }

                        requestBodies.push({action: 'add', type: RecordType.DGDT, fields});
                    });
                });
            });

            return requestBodies;
        }

        /**
         * Lấy record customrecord_scv_dgdt hiện có của một mã CK, trả về map {khoá đối chiếu: internalid}
         * để không phải search lại cho từng dòng chỉ tiêu.
         * @param {string} stockCode
         * @param {Object} [period] - {yearPeriod, periodBegin, periodEnd} lọc thêm theo kỳ báo cáo để thu hẹp kết quả
         * @returns {Object} {`stockCode|metricName|yearPeriod|periodBegin|periodEnd`: internalid}
         */
        const findDgdtIdMap = (stockCode, period) => {
            let mapId = {};
            let filters = [[DgdtField.STOCK_CODE, search.Operator.IS, stockCode]];
            if (period) {
                let filterByField = {
                    [DgdtField.YEAR_PERIOD]: period.yearPeriod,
                    [DgdtField.PERIOD_BEGIN]: period.periodBegin,
                    [DgdtField.PERIOD_END]: period.periodEnd
                };
                Object.keys(filterByField).forEach(fieldId => {
                    if (filterByField[fieldId]) {
                        filters.push('and', [fieldId, search.Operator.IS, filterByField[fieldId]]);
                    }
                });
            }

            let searchDgdt = search.create({
                type: RecordType.DGDT,
                filters: filters,
                columns: ['internalid', DgdtField.METRIC, DgdtField.YEAR_PERIOD, DgdtField.PERIOD_BEGIN, DgdtField.PERIOD_END]
            });
            let pagedData = searchDgdt.runPaged({pageSize: 1000});
            pagedData.pageRanges.forEach(pageRange => {
                pagedData.fetch({index: pageRange.index}).data.forEach(result => {
                    let metricName = result.getText({name: DgdtField.METRIC});
                    let periodOfRow = {
                        yearPeriod: result.getValue({name: DgdtField.YEAR_PERIOD}),
                        periodBegin: result.getValue({name: DgdtField.PERIOD_BEGIN}),
                        periodEnd: result.getValue({name: DgdtField.PERIOD_END})
                    };
                    mapId[makeDgdtKey(stockCode, metricName, periodOfRow)] = result.id;
                });
            });
            return mapId;
        }

        /**
         * Tìm internalid customrecord_scv_dgdt theo khoá đối chiếu của một dòng chỉ tiêu.
         * @param {string} stockCode
         * @param {string} metricName
         * @param {Object} period - {yearPeriod, periodBegin, periodEnd}
         * @returns {string|null}
         */
        const findDgdtId = (stockCode, metricName, period) => {
            let mapId = findDgdtIdMap(stockCode, period);
            return mapId[makeDgdtKey(stockCode, metricName, period)] || null;
        }

        /**
         * Xử lý danh sách requestBody customrecord_scv_dgdt: chưa có record thì tạo mới, đã có thì cập nhật.
         * Lỗi một dòng chỉ tiêu chỉ được ghi log, không làm dừng cả lần đồng bộ.
         * @param {Array<Object>} requestBodies - kết quả của buildDgdtRequestBodies
         * @param {string} stockCode
         * @param {Object} [mapId] - map khoá đối chiếu đã tra sẵn; không truyền thì tự tra theo từng dòng
         * @returns {Object} {ids, errors}
         */
        const processDgdtRequestBodies = (requestBodies, stockCode, mapId) => {
            let ids = [], errors = [];

            requestBodies.forEach(requestBody => {
                let metricName = requestBody.fields[DgdtField.METRIC].text;
                let period = getPeriodOfFields(requestBody.fields);
                let key = makeDgdtKey(stockCode, metricName, period);
                try {
                    let existingId = mapId ? mapId[key] : findDgdtId(stockCode, metricName, period);
                    if (existingId) {
                        requestBody.action = 'update';
                        requestBody.internalid = existingId;
                        ids.push(commonInternal.updateRecord(requestBody, requestBody.type));
                    } else {
                        let newId = commonInternal.addRecord(requestBody, requestBody.type);
                        if (mapId) mapId[key] = newId;
                        ids.push(newId);
                    }
                } catch (e) {
                    log.error('processDgdtRequestBodies error ' + key, e);
                    errors.push({key, message: e.message || String(e)});
                }
            });

            return {ids, errors};
        }

        /**
         * Đẩy phần requestBody còn lại sang Map/Reduce scv_mr_itg_vietstock để chạy nền.
         * @param {Array<Object>} requestBodies
         * @param {string} stockCode
         * @returns {string|null} taskId của Map/Reduce, null nếu submit thất bại
         */
        const submitDgdtMapReduce = (requestBodies, stockCode) => {
            let mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: MapReduce.SCRIPT_ID,
                deploymentId: MapReduce.DEPLOY_ID
            });
            mrTask.params = {
                [MapReduce.PARAM_REQUEST_BODIES]: JSON.stringify(requestBodies)
            };
            return mrTask.submit();
        }

        /**
         * Đồng bộ Financial info (chỉ số tài chính) theo mã CK: gọi API lấy data, đối chiếu
         * (Mã chứng khoán + Chỉ tiêu đánh giá khoản đầu tư + Year period + Period begin + Period end) -
         * nếu chưa có record thì tạo mới, nếu đã có thì cập nhật (theo FDD_Vietstock.xlsx mục 1.2).
         * Chỉ DIRECT_SYNC_LIMIT dòng đầu tiên được tạo/cập nhật ngay để không vượt governance của script gọi,
         * phần còn lại đẩy sang Map/Reduce scv_mr_itg_vietstock chạy nền.
         * @param {string} baseurl
         * @param {Object} headers
         * @param {string} stockCode
         * @param {number|string} projectId - internal id của Project tương ứng với Stock Code
         * @param {Object} [options] - Tham số lọc thêm, xem getFinancialInfo {termType, fromDate, toDate, lastUpdate}
         * @returns {Object} {ids, errors, remaining, mrTaskId} - remaining là số dòng đã đẩy sang Map/Reduce
         */
        const syncFinancialInfo = (baseurl, headers, stockCode, projectId, options = {}) => {
            let financialInfoData = getFinancialInfo(baseurl, headers, stockCode, options);
            if (!financialInfoData) return {ids: [], errors: [], remaining: 0, mrTaskId: null};

            let requestBodies = buildDgdtRequestBodies(financialInfoData, projectId, stockCode);
            let mapId = findDgdtIdMap(stockCode);

            // Phần chạy ngay
            let {ids, errors} = processDgdtRequestBodies(requestBodies.slice(0, DIRECT_SYNC_LIMIT), stockCode, mapId);

            // Phần còn lại đẩy sang Map/Reduce
            let remainingBodies = requestBodies.slice(DIRECT_SYNC_LIMIT);
            let mrTaskId = null;
            if (remainingBodies.length > 0) {
                try {
                    mrTaskId = submitDgdtMapReduce(remainingBodies, stockCode);
                } catch (e) {
                    log.error('syncFinancialInfo submit map/reduce error', e);
                    errors.push({key: 'map/reduce', message: e.message || String(e)});
                }
            }

            return {ids, errors, remaining: remainingBodies.length, mrTaskId};
        }

        return {
            EndPoint,
            MapReduce,
            DIRECT_SYNC_LIMIT,
            SyncType,
            FinanceInfoType,
            FinanceInfoTypeText,
            TermType,
            TermTypeText,
            callApiPost,
            callApiGet,
            getProtocol,
            getVietstockConfigByLookupFields,
            getVietstockConfigByQuery,
            getStockTrading,
            buildMarketPriceRequestBody,
            syncStockTrading,
            getFinancialInfo,
            buildDgdtRequestBodies,
            findDgdtId,
            processDgdtRequestBodies,
            syncFinancialInfo
        }

    });
