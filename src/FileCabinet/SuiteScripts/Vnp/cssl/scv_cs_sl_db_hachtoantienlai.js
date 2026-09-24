/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 * Nội dung: Client script cho Suitelet Create JRL Interest (scv_sl_db_hachtoantienlai.js)
 *           Hằng số id field/cột và SQL Debit-Loan Agreement dùng chung ở
 *           ../common/scv_common_db_hachtoantienlai.js
 * =======================================================================================
 *  Date                Author                  Description
 *  27 Aug 2026         SuiteCloud              Init & create file
 */
define(['N/currentRecord', 'N/url', '../common/scv_common_db_hachtoantienlai.js', '../lib/scv_lib_cs.js'],

    (currentRecord, url, cmInterest, libCs) => {

        const Field = cmInterest.Field;
        const Column = cmInterest.Column;
        const SUBLIST_ID = cmInterest.SUBLIST_ID;

        const pageInit = (scriptContext) => {

        }

        /**
         * Bấm Create JRL: phải tick ít nhất 1 dòng ở cột Mark mới cho submit,
         * tránh post lên Suitelet rồi mới báo lỗi (mất luôn phần user đang chỉnh trên sublist).
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        const saveRecord = (scriptContext) => {
            let currRecord = scriptContext.currentRecord;
            let lineCount = currRecord.getLineCount({sublistId: SUBLIST_ID});

            if (lineCount <= 0) {
                alert('Chưa có dữ liệu để tạo bút toán hạch toán lãi. Vui lòng bấm Search.');
                return false;
            }

            let isMarked = false;
            for (let i = 0; i < lineCount; i++) {
                let mark = currRecord.getSublistValue({sublistId: SUBLIST_ID, fieldId: Column.MARK, line: i});
                if (mark === true) {
                    isMarked = true;
                    break;
                }
            }

            if (!isMarked) {
                alert('Vui lòng chọn ít nhất một dòng ở cột Mark để tạo bút toán hạch toán lãi.');
                return false;
            }

            // Qua hết validate mới submit - tạo Journal chạy lâu nên hiện loading cho người dùng
            libCs.showPleaseWait();
            return true;
        }

        const fieldChanged = (scriptContext) => {
            if (scriptContext.sublistId) return;

            if (scriptContext.fieldId === Field.SUBSIDIARY) {
                loadDebitLoanOption(scriptContext.currentRecord);
            }
        }

        /**
         * Đổi Subsidiary -> nạp lại option của Debit/Loan Agreement theo subsidiary mới
         * (dùng chung câu SQL với Suitelet qua cmInterest.getSqlDebitLoan).
         */
        const loadDebitLoanOption = (currRecord) => {
            let fieldDebitLoan = currRecord.getField({fieldId: Field.DEBIT_LOAN});
            if (!fieldDebitLoan) return;

            // bỏ khế ước đang chọn vì có thể không còn thuộc subsidiary mới
            currRecord.setValue({fieldId: Field.DEBIT_LOAN, value: [], ignoreFieldChange: true});
            fieldDebitLoan.removeSelectOption({value: null});

            let subsidiary = currRecord.getValue({fieldId: Field.SUBSIDIARY});
            if (!subsidiary) return;

            let objSql = cmInterest.getSqlDebitLoan(subsidiary);
            libCs.insertSelectionViaSql(fieldDebitLoan, objSql.sql, objSql.params, false, null);
        }

        /**
         * Bấm Search -> load lại chính Suitelet kèm bộ lọc đang chọn.
         */
        const searchInterestJournal = () => {
            let currRecord = currentRecord.get();
            let subsidiary = currRecord.getValue(Field.SUBSIDIARY);
            let date = currRecord.getText(Field.DATE);
            let debitloan = currRecord.getValue(Field.DEBIT_LOAN);

            if (!subsidiary) {
                alert('Vui lòng chọn Subsidiary.');
                return;
            }
            if (!date) {
                alert('Vui lòng chọn Date.');
                return;
            }

            window.onbeforeunload = null;

            // lấy script/deploy của chính Suitelet đang mở để không phải hardcode id
            let currentParams = new URLSearchParams(window.location.search);
            let urlSearch = url.resolveScript({
                scriptId: currentParams.get('script'),
                deploymentId: currentParams.get('deploy'),
                returnExternalUrl: false,
                params: {
                    [Field.SUBSIDIARY]: subsidiary || '',
                    [Field.DATE]: date || '',
                    [Field.DEBIT_LOAN]: cmInterest.toList(debitloan).join(','),
                    [Field.IS_SEARCH]: 'T'
                }
            });
            window.location.replace(urlSearch);
        }

        /**
         * Tick / bỏ tick toàn bộ cột Mark của sublist Results.
         */
        const markAllInterestJournal = (isMark) => {
            let currRecord = currentRecord.get();
            let lineCount = currRecord.getLineCount({sublistId: SUBLIST_ID});
            for (let i = 0; i < lineCount; i++) {
                currRecord.selectLine({sublistId: SUBLIST_ID, line: i});
                currRecord.setCurrentSublistValue({
                    sublistId: SUBLIST_ID,
                    fieldId: Column.MARK,
                    value: !!isMark,
                    ignoreFieldChange: true
                });
                currRecord.commitLine({sublistId: SUBLIST_ID});
            }
        }

        return {
            pageInit,
            saveRecord,
            fieldChanged,
            searchInterestJournal,
            markAllInterestJournal
        };

    });
