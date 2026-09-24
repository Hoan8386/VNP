/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * Nội dung: Create JRL Interest - phần dùng chung của Suitelet sl/scv_sl_db_hachtoantienlai.js
 *           và Client script cssl/scv_cs_sl_db_hachtoantienlai.js
 *           (hằng số id field/cột, SQL Debit-Loan Agreement, filter SS, build object Journal, helper).
 *
 *           LƯU Ý: file được Client script load nên chỉ được require module chạy được cả 2 phía
 *           (N/format, N/search). Không đưa N/ui/serverWidget, N/record, scv_lib_report.js... vào đây.
 * =======================================================================================
 *  Date                Author                  Description
 *  27 Aug 2026         SuiteCloud              Init & create file
 */
define(['N/format', 'N/search'],

    (format, search) => {

        const SavedSearch = {
            INTEREST_SCHEDULE: 'customsearch_scv_interest_sch'
        };

        const Record = {
            SHEET: 'customrecord_scv_prinandintersheet',     // Payment Schedule
            DEBIT_LOAN: 'customrecord_scv_loa',
            JOURNAL: 'journalentry'
        };

        // Field của Payment Schedule / Debit-Loan Agreement dùng để lọc và cập nhật
        const SheetField = {
            STATUS: 'custrecord_scv_db_status',
            SUBSIDIARY: 'custrecord_scv_loa_subsidiary',     // join CUSTRECORD_SCV_DB_SHEET
            DEBIT_LOAN: 'custrecord_scv_db_sheet',
            PAYMENT_DATE: 'custrecord_scv_dbsheet_paymentdate'
        };

        // Join từ Payment Schedule sang Debit/Loan Agreement
        const JOIN_DEBIT_LOAN = 'CUSTRECORD_SCV_DB_SHEET';

        // custrecord_scv_db_status: Approved => 2
        const SheetStatus = {
            APPROVED: '2'
        };

        // Field bộ lọc trên Suitelet
        const Field = {
            SUBSIDIARY: 'custpage_subsidiary',
            DATE: 'custpage_date',
            DEBIT_LOAN: 'custpage_debitloan',
            IS_SEARCH: 'custpage_is_search'
        };

        const SUBLIST_ID = 'custpage_sublist_interest';

        // Id cột của sublist Results, cũng là key của object kết quả search (xem MappingColumn)
        const Column = {
            MARK: 'col_mark',
            ID: 'col_id',
            NAME: 'col_name',
            SUBSIDIARY: 'col_subsidiary',
            SUBSIDIARY_TEXT: 'col_subsidiary_display',
            ENTITY: 'col_entity',
            ENTITY_TEXT: 'col_entity_display',
            DEBIT_LOAN: 'col_debitloan',
            DEBIT_LOAN_TEXT: 'col_debitloan_display',
            TYPE: 'col_type',
            DATE: 'col_date',
            RATE: 'col_rate',
            AMOUNT: 'col_amount',
            INTEREST_ACC: 'col_interest_acc',
            INCOME_ACC: 'col_income_acc'
        };

        // FDD: Currency set default VND, Exchange Rate set default = 1
        const DEFAULT_CURRENCY = '1';
        const DEFAULT_EXCHANGE_RATE = 1;

        // Số Journal tạo ngay tại Suitelet, dư ra thì đẩy vào hàng đợi cho Map/Reduce
        const MAX_CREATE_ON_SUITELET = 5;

        // Label cột của SS customsearch_scv_interest_sch -> đúng id cột của sublist,
        // để kết quả search dùng thẳng cho sublist không phải map lại.
        // Cột dạng select được libRep bổ sung thêm key <id>_display chứa text.
        const MappingColumn = {
            'Internal ID': Column.ID,
            'Name': Column.NAME,
            'Subsidiary': Column.SUBSIDIARY,
            'Entity': Column.ENTITY,
            'Debit/loan Agreement': Column.DEBIT_LOAN,
            'Debit/Loan Agreement': Column.DEBIT_LOAN,
            'Type': Column.TYPE,
            'Date': Column.DATE,
            'Interest Rate': Column.RATE,
            'Amount': Column.AMOUNT,
            'Accural Interest Account': Column.INTEREST_ACC,
            'Accural Interest Acc': Column.INTEREST_ACC,
            'Income/Expense Account': Column.INCOME_ACC,
            'Income/Expense Acc': Column.INCOME_ACC
        };

        // ---------------------------------------------------------------------------------
        // Bộ lọc (FDD 2.2.1)
        // ---------------------------------------------------------------------------------
        /**
         * SQL lấy option Debit/Loan Agreement theo subsidiary.
         * Suitelet dùng với libRep.addSelectionViaSql, Client script dùng với libCs.insertSelectionViaSql.
         * @param {Array<string>|string} subsidiary
         * @returns {{sql: string, params: Array<string>}}
         */
        const getSqlDebitLoan = (subsidiary) => {
            let listSubsidiaryId = toList(subsidiary);
            let params = [];
            let strWhere = '';
            if (listSubsidiaryId.length) {
                strWhere = ` and loa.${SheetField.SUBSIDIARY} in (${listSubsidiaryId.map(() => '?').join(',')})`;
                params = listSubsidiaryId;
            }
            let sql = `select loa.id value, loa.name text
                       from ${Record.DEBIT_LOAN} loa
                       where loa.isinactive = 'F' ${strWhere}
                       order by loa.name`;
            return {sql: sql, params: params};
        }

        /**
         * Filter bổ sung cho SS customsearch_scv_interest_sch.
         * @param {Array<string>} listSubsidiaryId
         * @param {string} strDate - Date chọn trên Suitelet (chỉ lấy MMYYYY để so sánh Payment Date)
         * @param {Array<string>} listDebitLoanId
         * @returns {Array<Filter>}
         */
        const buildFilter = (listSubsidiaryId, strDate, listDebitLoanId) => {
            let listFilter = [];

            // Lọc theo {custrecord_scv_loa_subsidiary} của Debit/Loan Agreement
            if (listSubsidiaryId && listSubsidiaryId.length) {
                listFilter.push(search.createFilter({
                    name: SheetField.SUBSIDIARY,
                    join: JOIN_DEBIT_LOAN,
                    operator: search.Operator.ANYOF,
                    values: listSubsidiaryId
                }));
            }

            // MMYYYY của Date chọn lọc = MMYYYY của {custrecord_scv_dbsheet_paymentdate}
            let strPeriod = getPeriod(strDate);
            if (strPeriod) {
                listFilter.push(search.createFilter({
                    name: 'formulanumeric',
                    operator: search.Operator.EQUALTO,
                    values: 1,
                    formula: `CASE WHEN TO_CHAR({${SheetField.PAYMENT_DATE}}, 'MMYYYY') = '${strPeriod}' THEN 1 ELSE 0 END`
                }));
            }

            if (listDebitLoanId && listDebitLoanId.length) {
                listFilter.push(search.createFilter({
                    name: SheetField.DEBIT_LOAN,
                    operator: search.Operator.ANYOF,
                    values: listDebitLoanId
                }));
            }

            return listFilter;
        }

        // ---------------------------------------------------------------------------------
        // Build chứng từ hạch toán lãi (FDD 2.2.3)
        // ---------------------------------------------------------------------------------
        /**
         * Build list object theo mẫu {fields, lines} (../common/temp) để đưa vào libFunc.createRecord.
         * Group theo {custbody_scv_loa} + Period MMYYYY -> mỗi nhóm 1 Journal.
         * 1 dòng Suitelet -> 2 dòng Journal: Debit vào Accural Interest Acc, Credit vào Income/Expense Acc.
         * updates: các Payment Schedule cần set {custrecord_scv_db_status} = 2 sau khi tạo Journal.
         * @param {Array<Object>} listData - các dòng đã Mark
         * @param {string} strDate - Date chọn trên Suitelet -> trandate của Journal
         * @returns {Array<{fields: Object, lines: Array<Object>, updates: Array<Object>}>}
         */
        const buildListJournal = (listData, strDate) => {
            let strPeriod = getPeriod(strDate);
            let mapObject = {};
            let listObject = [];
            let listSkip = [];

            for (let objData of listData) {
                // thiếu 1 trong 2 account thì bút toán không cân -> bỏ dòng, ghi log để user biết
                if (!objData[Column.INTEREST_ACC] || !objData[Column.INCOME_ACC]) {
                    listSkip.push(objData[Column.NAME] || objData[Column.ID]);
                    continue;
                }

                let key = `${objData[Column.DEBIT_LOAN] || ''}|${strPeriod}`;
                let object = mapObject[key];
                if (!object) {
                    object = {
                        fields: buildFields(objData, strDate),
                        lines: [],
                        updates: []
                    };
                    mapObject[key] = object;
                    listObject.push(object);
                }

                let amount = toNumber(objData[Column.AMOUNT]);
                let memo = buildMemo(objData);

                // dòng Debit: Accural Interest Acc
                object.lines.push(makeLine(objData[Column.INTEREST_ACC], 'debit', amount, memo, objData[Column.ENTITY]));
                // dòng Credit: Income/Expense Acc
                object.lines.push(makeLine(objData[Column.INCOME_ACC], 'credit', amount, memo, objData[Column.ENTITY]));

                // Journal tạo xong -> Payment Schedule chuyển sang Approved
                if (objData[Column.ID]) {
                    object.updates.push({
                        type: Record.SHEET,
                        id: String(objData[Column.ID]),
                        values: {[SheetField.STATUS]: SheetStatus.APPROVED}
                    });
                }
            }

            if (listSkip.length) {
                log.error('buildListJournal - bỏ dòng thiếu Account', listSkip.join(' | '));
            }
            return listObject;
        }

        const makeLine = (account, side, amount, memo, entity) => {
            let line = {account: account};
            line[side] = amount;
            if (memo) line.memo = memo;
            if (entity) line.entity = entity;
            return line;
        }

        const buildFields = (objData, strDate) => {
            let fields = {
                subsidiary: objData[Column.SUBSIDIARY],
                currency: DEFAULT_CURRENCY,
                exchangerate: DEFAULT_EXCHANGE_RATE,
                memo: buildMemo(objData)
            };
            if (strDate) fields.trandate = {text: strDate};
            if (objData[Column.DEBIT_LOAN]) fields.custbody_scv_loa = objData[Column.DEBIT_LOAN];
            return fields;
        }

        // FDD: Set default "Ghi nhận lãi_<Debit/Loan Agreement>", vd: Ghi nhận lãi_HDTG09584
        const buildMemo = (objData) => {
            let strDebitLoan = String(objData[Column.DEBIT_LOAN_TEXT] || '').trim();
            return strDebitLoan ? `Ghi nhận lãi_${strDebitLoan}` : 'Ghi nhận lãi';
        }

        // ---------------------------------------------------------------------------------
        // Helper
        // ---------------------------------------------------------------------------------
        // Field MULTISELECT: submit trả về chuỗi nối bằng \u0005, truyền qua url thì nối bằng ','
        const parseMultiValue = (value) => {
            if (!value) return [];
            if (util.isArray(value)) return value.map(o => String(o)).filter(o => o);
            return String(value).split(/[\u0005,]/).map(o => o.trim()).filter(o => o);
        }

        // Nhận cả 1 giá trị lẫn mảng -> luôn trả về mảng chuỗi đã bỏ giá trị rỗng
        const toList = (value) => {
            if (util.isArray(value)) return value.map(o => String(o)).filter(o => o);
            return value || value === 0 ? [String(value)] : [];
        }

        // Đưa giá trị về số (bỏ dấu phân cách hàng nghìn). Trả 0 nếu không phải số
        const toNumber = (value) => {
            if (typeof value === 'number') return value;
            if (value === null || value === undefined || String(value).trim() === '') return 0;

            let s = String(value).trim().replace(/[^0-9.,\-]/g, '');
            if (!s) return 0;
            // Dấu . hoặc , cuối cùng: nếu sau nó không phải nhóm 3 chữ số thì là dấu thập phân
            const lastSep = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
            if (lastSep !== -1 && s.length - lastSep - 1 !== 3) {
                s = s.slice(0, lastSep).replace(/[.,]/g, '') + '.' + s.slice(lastSep + 1);
            } else {
                s = s.replace(/[.,]/g, '');
            }

            const n = Number(s);
            return isNaN(n) ? 0 : n;
        }

        // Date chọn trên Suitelet -> chuỗi MMYYYY dùng để so sánh Payment Date / group Journal
        const getPeriod = (strDate) => {
            if (!strDate) return '';
            try {
                let objDate = format.parse({value: strDate, type: format.Type.DATE});
                if (!objDate) return '';
                return ('0' + (objDate.getMonth() + 1)).slice(-2) + objDate.getFullYear();
            } catch (e) {
                log.error('getPeriod', {strDate: strDate, e: e});
                return '';
            }
        }

        return {
            SavedSearch,
            Record,
            SheetField,
            SheetStatus,
            JOIN_DEBIT_LOAN,
            Field,
            SUBLIST_ID,
            Column,
            DEFAULT_CURRENCY,
            DEFAULT_EXCHANGE_RATE,
            MAX_CREATE_ON_SUITELET,
            MappingColumn,
            getSqlDebitLoan,
            buildFilter,
            buildListJournal,
            buildFields,
            buildMemo,
            makeLine,
            parseMultiValue,
            toList,
            toNumber,
            getPeriod
        }

    });
