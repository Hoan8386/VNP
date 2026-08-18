/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * Nội dung: Debit/Loan Agreement Schedule - Tạm tính lãi hàng kỳ (https://app.clickup.com/t/3773072/86d41cen2 - mục 2.1)
 *           Chứa phần tính toán / query / lưu bảng tính, tách khỏi scv_sl_db_payment_schdule.js
 * =======================================================================================
 *  Date                Author                  Description
 *  14 Aug 2026         SuiteCloud              Init & create file
 */
define(['N/format', 'N/record', '../lib/scv_lib_report.js'],

    (format, record, libRep) => {

        const Record = {
            DEBIT_LOAN: 'customrecord_scv_loa',
            PRINCIPAL_DETAIL: 'customrecord_scv_db_principal_detail',
            INTEREST_DETAIL: 'customrecord_scv_interrestdetail',
            SHEET: 'customrecord_scv_prinandintersheet'
        };

        // customrecord_scv_loa_type
        const LoanType = {
            PRINCIPAL: 'Principal',
            INTEREST: 'Interest'
        };

        // custrecord_scv_db_sheet_type: Principal => 5, Interest => 4
        const SheetType = {
            CHO_VAY: '6',
            PRINCIPAL: '5',
            INTEREST: '4',
            TIET_KIEM: '2',
            VAY: '1'
        };

        // custrecord_scv_db_status: default Open
        const SheetStatus = {
            PENDING_APPROVAL: '1',
            APPROVED: '2',
            REJECTED: '3',
            OPEN: '11'
        };

        // Status còn cho phép ghi đè khi tính lại bảng; APPROVED thì giữ nguyên
        const UPDATABLE_STATUS = [SheetStatus.PENDING_APPROVAL, SheetStatus.OPEN, SheetStatus.REJECTED];

        // custrecord_scv_dl_inpaymentterm: id = 3 => +1 tháng, id = 2 => +3 tháng
        const InterestTerm = {
            QUARTERLY: '2',
            MONTHLY: '3'
        };

        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        const MAX_PERIOD = 600;             // chặn vòng lặp vô hạn khi dữ liệu khế ước sai

        // ---------------------------------------------------------------------------------
        // Bảng tính lãi vay (FDD 2.1.2)
        // ---------------------------------------------------------------------------------
        const buildScheduleData = (debitLoanId) => {
            let objLoan = queryDebitLoan(debitLoanId);
            if (!objLoan) return [];

            // Gốc vay: lấy từ customrecord_scv_db_principal_detail (SQL đã ORDER BY Payment Date)
            let principalDetails = queryPrincipalDetail(debitLoanId)
                .map(o => ({
                    date: toDate(o.paymentdate),
                    amount: toNumber(o.amount)
                }))
                .filter(o => !!o.date);

            // Bảng Interest Detail dùng để tra Interest Rate theo DateInterest
            let interestDetails = queryInterestDetail(debitLoanId);

            let listData = [];

            // ---- Dòng gốc vay ----
            for (let objDetail of principalDetails) {
                listData.push(buildRow(objLoan, objDetail.date, LoanType.PRINCIPAL, null,
                    round(objDetail.amount, objLoan.precision),
                    getOutstandingPrincipal(objLoan.amount, principalDetails, objDetail.date)));
            }

            // ---- Dòng lãi vay ----
            let interestDates = buildInterestDates(objLoan);
            if (!interestDates.length) {
                // thiếu 1 trong 2 mốc này thì không sinh được kỳ trả lãi nào
                log.audit('buildScheduleData - không sinh được kỳ trả lãi', {
                    debitLoanId: debitLoanId,
                    firstInterestDate: objLoan.firstInterestDate,   // custrecord_scv_inspaymentdate
                    endDate: objLoan.endDate,                       // custrecord_scv_loa_end_date
                    interestTerm: objLoan.interestTerm,             // custrecord_scv_dl_inpaymentterm
                    countInterestDetail: interestDetails.length
                });
            }
            let prevDate = null;
            interestDates.forEach((dateInterest, index) => {
                // Kỳ đầu tiên tính từ custrecord_scv_loa_start_date;
                // các kỳ sau tính từ ngày kế tiếp DateInterest kỳ trước (25/06 -> kỳ sau bắt đầu 26/06)
                let fromDate = (index === 0) ? objLoan.startDate : addDays(prevDate, 1);
                if (fromDate) {
                    listData.push(...buildInterestRows(objLoan, principalDetails, interestDetails,
                        dateInterest, fromDate));
                }
                prevDate = dateInterest;
            });

            // Kỳ cuối = từ ngày kế tiếp DateInterest gần nhất -> custrecord_scv_loa_end_date
            if (prevDate && objLoan.endDate && objLoan.endDate.getTime() > prevDate.getTime()) {
                listData.push(...buildInterestRows(objLoan, principalDetails, interestDetails,
                    objLoan.endDate, addDays(prevDate, 1)));
            }

            // trộn 2 nguồn gốc vay / lãi vay -> sắp xếp lại theo ngày,
            // cùng ngày thì Interest đứng trước Principal
            listData.sort((a, b) => {
                if (a.date_ms !== b.date_ms) return a.date_ms - b.date_ms;
                if (a.col_type === b.col_type) return 0;
                return a.col_type === LoanType.INTEREST ? -1 : 1;
            });

            // đánh số Name trùng: phải chạy SAU sort để dòng có ngày sớm hơn giữ tên gốc
            return numberDuplicateName(listData);
        }

        /**
         * Name sinh theo MMYYYY nên 1 tháng có thể ra nhiều dòng cùng tên khi trả gốc giữa kỳ
         * (VD kỳ 26/12 -> 25/01 bị cắt tại ngày trả gốc 10/01 => 2 dòng đều là ..._Interest_012026).
         * Dòng đầu của mỗi nhóm giữ tên gốc, các dòng sau thêm hậu tố _2, _3, ...
         * Bắt buộc phải unique vì saveScheduleSheet chống trùng theo Name.
         */
        const numberDuplicateName = (listData) => {
            let mapCount = {};
            for (let objData of listData) {
                let baseName = objData.col_name;
                mapCount[baseName] = (mapCount[baseName] || 0) + 1;
                if (mapCount[baseName] > 1) {
                    objData.col_name = `${baseName}_${mapCount[baseName]}`;
                }
            }
            return listData;
        }

        /**
         * Sinh danh sách DateInterest.
         *  - Kỳ trả lãi đầu tiên = custrecord_scv_inspaymentdate
         *  - custrecord_scv_dl_inpaymentterm.id = 3 => + 1 tháng, id = 2 => + 3 tháng
         *  - Thỏa mãn DateInterest <= custrecord_scv_loa_end_date
         */
        const buildInterestDates = (objLoan) => {
            let listDate = [];
            if (!objLoan.firstInterestDate || !objLoan.endDate) return listDate;

            let step = (objLoan.interestTerm === InterestTerm.QUARTERLY) ? 3 : 1;
            for (let i = 0; i < MAX_PERIOD; i++) {
                // cộng dồn từ mốc đầu tiên để không bị trôi ngày với các tháng thiếu ngày
                let dateInterest = addMonths(objLoan.firstInterestDate, step * i);
                if (dateInterest.getTime() > objLoan.endDate.getTime()) break;
                listDate.push(dateInterest);
            }
            return listDate;
        }

        /**
         * Một kỳ lãi được cắt thêm tại các ngày trả gốc nằm trong kỳ, vì dư nợ gốc đổi giữa kỳ.
         * VD kỳ 26/06 -> 25/07, có trả bớt gốc ngày 29/06 (1.000.000.000 -> 600.000.000):
         *   - dòng 26/06 -> 29/06 tính lãi theo gốc 1.000.000.000 (ngày trả gốc vẫn theo gốc cũ)
         *   - dòng 30/06 -> 25/07 tính lãi theo gốc 600.000.000
         * Kỳ không có trả gốc thì chỉ ra 1 dòng như cũ.
         */
        const buildInterestRows = (objLoan, principalDetails, interestDetails, dateTo, dateFrom) => {
            let mapBreak = {};
            for (let objDetail of principalDetails) {
                let timeBreak = objDetail.date.getTime();
                // trả gốc đúng ngày cuối kỳ thì không cắt: gốc mới đã thuộc kỳ sau
                if (timeBreak >= dateFrom.getTime() && timeBreak < dateTo.getTime()) {
                    mapBreak[timeBreak] = objDetail.date;
                }
            }

            let listEnd = Object.keys(mapBreak).sort((a, b) => a - b).map(k => mapBreak[k]);
            listEnd.push(dateTo);

            let listRow = [], subFrom = dateFrom;
            for (let subTo of listEnd) {
                // buildInterestRow trả null khi dư nợ gốc đã hết -> cắt dòng đó đi
                let objRow = buildInterestRow(objLoan, principalDetails, interestDetails, subTo, subFrom);
                if (objRow) listRow.push(objRow);
                subFrom = addDays(subTo, 1);
            }
            return listRow;
        }

        /**
         * Amount lãi vay = Dư nợ gốc * Số ngày tính lãi * Lãi suất / Số ngày tính lãi theo năm
         * Dư nợ gốc lấy tại dateTo nên khoản trả gốc đúng ngày dateTo chưa được trừ.
         * Trả null nếu dư nợ gốc tại dateTo đã về 0 / âm / không có giá trị -> hết nợ thì không còn lãi.
         */
        const buildInterestRow = (objLoan, principalDetails, interestDetails, dateTo, dateFrom) => {
            let outstanding = getOutstandingPrincipal(objLoan.amount, principalDetails, dateTo);
            if (!isFinite(outstanding) || outstanding <= 0) return null;

            let rate = getRateFromInterestDetail(interestDetails, dateTo);
            let days = diffDays(dateTo, dateFrom) + 1;
            let amount = outstanding * days * (rate / 100) / objLoan.daysOfYear;

            return buildRow(objLoan, dateTo, LoanType.INTEREST, rate,
                round(amount, objLoan.precision), outstanding);
        }

        /**
         * Dư nợ gốc giảm dần = Loan Amount - tổng Payment Amount của các Payment Date trước DateInterest
         */
        const getOutstandingPrincipal = (loanAmount, principalDetails, dateInterest) => {
            return principalDetails.reduce(
                (remain, o) => o.date.getTime() < dateInterest.getTime() ? remain - o.amount : remain,
                loanAmount
            );
        }

        /**
         * Tra Interest Rate: custrecord_scv_id_startdate <= DateInterest <= custrecord_scv_id_enddate
         * -> lấy custrecord_scv_id_rate (trả về dạng % , ví dụ 10.5)
         */
        const getRateFromInterestDetail = (interestDetails, dateInterest) => {
            let rate = 0;
            for (let objDetail of interestDetails) {
                let startDate = toDate(objDetail.startdate);
                let endDate = toDate(objDetail.enddate);
                if (startDate && dateInterest.getTime() < startDate.getTime()) continue;
                if (endDate && dateInterest.getTime() > endDate.getTime()) continue;
                if (!startDate && !endDate) continue;
                rate = strip(toNumber(objDetail.rate) * 100);
            }
            return rate;
        }

        /**
         * Name = Debit/Loan Agreement & "_" & Type & "_" & MMYYYY của Date
         * Ví dụ: HDĐTG09350_Principal_092026
         */
        const buildRow = (objLoan, date, type, rate, amount, outstanding) => {
            return {
                col_name: `${objLoan.name}_${type}_${formatMonthYear(date)}`,
                col_debitloan: objLoan.name,
                col_date: formatDate(date),
                col_type: type,
                // dư nợ gốc đầu kỳ tại Date (chỉ để hiển thị, đã làm tròn theo currency precision)
                col_outstanding: round(outstanding, objLoan.precision),
                col_rate: (rate || rate === 0) ? `${rate}%` : '',
                col_amount: amount,
                debitloan: objLoan.id,
                date_ms: date.getTime(),
                rate_value: rate
            };
        }

        // ---------------------------------------------------------------------------------
        // Lưu bảng tính vào customrecord_scv_prinandintersheet
        // ---------------------------------------------------------------------------------
        /**
         * Lưu bảng tính, chống trùng theo Name:
         *  - chưa có          -> tạo mới (status Open)
         *  - đã có, APPROVED  -> bỏ qua, không tạo cũng không update
         *  - đã có, PENDING_APPROVAL / OPEN / REJECTED -> update lại số liệu
         */
        const saveScheduleSheet = (listData) => {
            let countCreate = 0, countUpdate = 0, countSkip = 0, countError = 0;
            if (!listData.length) return {countCreate, countUpdate, countSkip, countError};

            // các dòng trong 1 bảng tính luôn thuộc cùng 1 khế ước
            let mapSheet = getSheetMapByName(listData[0].debitloan);

            for (let objData of listData) {
                let sheetName = String(objData.col_name || '').trim();
                try {
                    let objExist = mapSheet[sheetName];
                    if (!objExist) {
                        let sheetId = createScheduleSheet(objData);
                        // chặn trùng ngay trong cùng lô nếu bảng tính có 2 dòng cùng Name
                        mapSheet[sheetName] = {id: sheetId, status: SheetStatus.OPEN};
                        countCreate++;
                    } else if (objExist.status === SheetStatus.APPROVED) {
                        countSkip++;
                    } else if (UPDATABLE_STATUS.indexOf(objExist.status) >= 0) {
                        updateScheduleSheet(objExist.id, objData);
                        countUpdate++;
                    } else {
                        // status ngoài danh sách đã biết -> không tự ý ghi đè
                        countSkip++;
                        log.audit('saveScheduleSheet - bỏ qua status lạ',
                            {name: sheetName, id: objExist.id, status: objExist.status});
                    }
                } catch (e) {
                    countError++;
                    log.error('saveScheduleSheet error - ' + sheetName, e);
                }
            }
            return {countCreate, countUpdate, countSkip, countError};
        }

        const createScheduleSheet = (objData) => {
            let recSheet = record.create({type: Record.SHEET});
            recSheet.setValue({fieldId: 'name', value: objData.col_name});
            recSheet.setValue({fieldId: 'custrecord_scv_db_sheet', value: objData.debitloan});
            // col_date đang là text theo date format của user -> setText
            recSheet.setText({
                fieldId: 'custrecord_scv_dbsheet_paymentdate',
                text: objData.col_date
            });
            recSheet.setValue({
                fieldId: 'custrecord_scv_db_sheet_type',
                value: objData.col_type === LoanType.PRINCIPAL ? SheetType.PRINCIPAL : SheetType.INTEREST
            });
            if (objData.rate_value || objData.rate_value === 0) {
                recSheet.setValue({fieldId: 'custrecord_scv_sheet_rate', value: objData.rate_value});
            }
            recSheet.setValue({fieldId: 'custrecord_scv_sheet_amt', value: objData.col_amount});
            recSheet.setValue({fieldId: 'custrecord_scv_db_status', value: SheetStatus.OPEN});
            return recSheet.save({enableSourcing: false, ignoreMandatoryFields: true});
        }

        /**
         * Chỉ ghi đè số liệu tính lại; Name / khế ước / status giữ nguyên.
         * Dùng submitFields (2 đơn vị) thay cho load + save (~9) để đỡ governance khi bảng nhiều kỳ.
         */
        const updateScheduleSheet = (sheetId, objData) => {
            let values = {
                // date_ms do buildRow sinh ra -> dựng lại Date, không phải parse chuỗi
                custrecord_scv_dbsheet_paymentdate: new Date(objData.date_ms),
                custrecord_scv_db_sheet_type: objData.col_type === LoanType.PRINCIPAL
                    ? SheetType.PRINCIPAL : SheetType.INTEREST,
                custrecord_scv_sheet_amt: objData.col_amount
            };
            if (objData.rate_value || objData.rate_value === 0) {
                values.custrecord_scv_sheet_rate = objData.rate_value;
            }
            record.submitFields({
                type: Record.SHEET,
                id: sheetId,
                values: values,
                options: {enableSourcing: false, ignoreMandatoryFields: true}
            });
        }

        /**
         * Map Name -> {id, status} của các dòng đã có sẵn theo khế ước
         */
        const getSheetMapByName = (debitLoanId) => {
            let mapSheet = {};
            for (let objSheet of querySheetByDebitLoan(debitLoanId)) {
                mapSheet[String(objSheet.name || '').trim()] = {
                    id: objSheet.id,
                    status: objSheet.status ? String(objSheet.status) : ''
                };
            }
            return mapSheet;
        }

        // ---------------------------------------------------------------------------------
        // Query - dùng SuiteQL qua libRep.doSearchSqlAll
        // ---------------------------------------------------------------------------------

        /**
         * Thông tin khế ước vay + currency precision
         */
        const queryDebitLoan = (debitLoanId) => {
            let sql = `SELECT loa.name                              AS name,
                  loa.custrecord_scv_loa_amount         AS amount,
                  loa.custrecord_scv_loa_start_date     AS startdate,
                  loa.custrecord_scv_loa_end_date       AS enddate,
                  loa.custrecord_scv_inspaymentdate     AS firstinterestdate,
                  loa.custrecord_scv_dl_inpaymentterm   AS interestterm,
                  loa.custrecord_scv_db_formula         AS daysofyear,
                  loa.custrecord_scv_loa_currency       AS currency,
                  cur.currencyprecision                 AS currencyprecision
           FROM ${Record.DEBIT_LOAN} loa
                    LEFT JOIN currency cur ON cur.id = loa.custrecord_scv_loa_currency
           WHERE loa.id = ?`;

            let listData = [];
            doSearchSql(listData, sql, [debitLoanId], 'queryDebitLoan');
            let objData = listData[0];
            if (!objData) return null;

            return {
                id: debitLoanId,
                name: objData.name,
                amount: toNumber(objData.amount),
                startDate: toDate(objData.startdate),
                endDate: toDate(objData.enddate),
                firstInterestDate: toDate(objData.firstinterestdate),
                interestTerm: objData.interestterm ? String(objData.interestterm) : '',
                daysOfYear: toNumber(objData.daysofyear) || 365,
                currency: objData.currency,
                precision: objData.currencyprecision === null || objData.currencyprecision === undefined
                    ? 2 : toNumber(objData.currencyprecision)
            };
        }

        /**
         * Chi tiết trả gốc (gốc vay)
         */
        const queryPrincipalDetail = (debitLoanId) => {
            let sql = `SELECT pd.custrecord_scv_db_pd_start_date AS paymentdate,
                              pd.custrecord_scv_db_pd_amount     AS amount
                       FROM ${Record.PRINCIPAL_DETAIL} pd
                       WHERE pd.custrecord_scv_db_pd_debit_loan = ?
                       ORDER BY pd.custrecord_scv_db_pd_start_date`;

            let listData = [];
            doSearchSql(listData, sql, [debitLoanId], 'queryPrincipalDetail');
            return listData;
        }

        /**
         * Bảng Interest Detail để tra lãi suất theo kỳ (customrecord_scv_interrestdetail)
         */
        const queryInterestDetail = (debitLoanId) => {
            let sql = `SELECT itd.custrecord_scv_id_startdate AS startdate,
                              itd.custrecord_scv_id_enddate   AS enddate,
                              itd.custrecord_scv_id_rate      AS rate
                       FROM ${Record.INTEREST_DETAIL} itd
                       WHERE itd.custrecord_scv_interparent = ?
                       ORDER BY itd.custrecord_scv_id_startdate`;

            let listData = [];
            doSearchSql(listData, sql, [debitLoanId], 'queryInterestDetail');
            return listData;
        }

        /**
         * Các dòng bảng tính đã lưu của 1 khế ước, dùng để check trùng theo Name
         */
        const querySheetByDebitLoan = (debitLoanId) => {
            let sql = `SELECT sh.id                       AS id,
                              sh.name                     AS name,
                              sh.custrecord_scv_db_status AS status
                       FROM ${Record.SHEET} sh
                       WHERE sh.custrecord_scv_db_sheet = ?`;

            let listData = [];
            doSearchSql(listData, sql, [debitLoanId], 'querySheetByDebitLoan');
            return listData;
        }

        const doSearchSql = (listData, sql, params, fnName) => {
            try {
                libRep.doSearchSqlAll(listData, sql, params);
            } catch (e) {
                log.error(fnName + ' error', {sql, params, error: e});
            }
            return listData;
        }

        // ---------------------------------------------------------------------------------
        // Utils
        // ---------------------------------------------------------------------------------
        /**
         * SuiteQL (asMappedResults) trả cột date về dạng text theo date format của user,
         * nên dùng thẳng format.parse để ra Date; trả null nếu cột rỗng / sai định dạng.
         */
        const toDate = (value) => {
            if (!value) return null;
            if (value instanceof Date) return value;
            try {
                return format.parse({value: value, type: format.Type.DATE});
            } catch (e) {
                log.error('toDate error - ' + value, e);
                return null;
            }
        }

        /**
         * Date -> text theo date format của user (dùng cho hiển thị và setText)
         */
        const formatDate = (date) => {
            return format.format({value: date, type: format.Type.DATE});
        }

        const pad2 = (value) => ('0' + value).slice(-2);

        const formatMonthYear = (date) => {
            return `${pad2(date.getMonth() + 1)}${date.getFullYear()}`;
        }

        const addDays = (date, days) => {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
        }

        /**
         * Cộng tháng có kẹp ngày cuối tháng: 31/01 + 1 tháng = 28/02 (không nhảy sang 03/03)
         */
        const addMonths = (date, months) => {
            let year = date.getFullYear();
            let month = date.getMonth() + months;
            let lastDayOfMonth = new Date(year, month + 1, 0).getDate();
            return new Date(year, month, Math.min(date.getDate(), lastDayOfMonth));
        }

        /**
         * Số ngày chênh lệch; Math.round để không bị lệch bởi mốc đổi giờ (DST)
         */
        const diffDays = (dateTo, dateFrom) => {
            return Math.round((dateTo.getTime() - dateFrom.getTime()) / MS_PER_DAY);
        }

        const toNumber = (value) => {
            let num = parseFloat(value);
            return isNaN(num) ? 0 : num;
        }

        const strip = (number) => {
            return parseFloat(number.toPrecision(12));
        }

        /**
         * Làm tròn theo số lẻ thập phân, dịch số mũ để tránh sai số dấu phẩy động
         * của Math.round(x * 100) / 100 (ví dụ 1.005 -> 1.00 thay vì 1.01)
         */
        const round = (value, precision) => {
            if (!isFinite(value)) return 0;
            let digits = precision || 0;
            let pair = (value + 'e').split('e');
            let rounded = Math.round(Number(pair[0] + 'e' + (Number(pair[1]) + digits)));
            pair = (rounded + 'e').split('e');
            return Number(pair[0] + 'e' + (Number(pair[1]) - digits));
        }

        return {
            Record,
            LoanType,
            SheetType,
            SheetStatus,
            InterestTerm,
            buildScheduleData,
            buildInterestDates,
            buildInterestRows,
            buildInterestRow,
            numberDuplicateName,
            getOutstandingPrincipal,
            getRateFromInterestDetail,
            buildRow,
            saveScheduleSheet,
            queryDebitLoan,
            queryPrincipalDetail,
            queryInterestDetail,
            querySheetByDebitLoan,
            toDate,
            formatDate,
            formatMonthYear,
            addDays,
            addMonths,
            diffDays,
            toNumber,
            strip,
            round
        }

    });