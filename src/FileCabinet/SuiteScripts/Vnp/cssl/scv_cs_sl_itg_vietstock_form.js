/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['../lib/scv_lib_cs.js'],

    function (libCs) {

        // Phải trùng với FormField của scv_sl_itg_vietstock_form.js
        const FormField = {
            FROM_DATE: 'custpage_scv_fromdate',
            TO_DATE: 'custpage_scv_todate',
            TERM_TYPE: 'custpage_scv_termtype'
        };

        const TermType = {
            N: 'N',
            Q: 'Q'
        };

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {

        }

        /**
         * Function to be executed when field is changed.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         *
         * @since 2015.2
         */
        function fieldChanged(scriptContext) {

        }

        /**
         * Quý của một ngày: 1 - 4.
         */
        function getQuarter(date) {
            return Math.floor(date.getMonth() / 3) + 1;
        }

        /**
         * Validation function to be executed when record is saved.
         * Kiểm tra Từ ngày - Đến ngày: phải nằm trong cùng một năm nếu Term Type = N, cùng một quý nếu Term Type = Q,
         * và Từ ngày phải nhỏ hơn Đến ngày.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {
            let currRecord = scriptContext.currentRecord;
            let fromDate = currRecord.getValue({fieldId: FormField.FROM_DATE});
            let toDate = currRecord.getValue({fieldId: FormField.TO_DATE});
            let termType = currRecord.getValue({fieldId: FormField.TERM_TYPE});

            // Chỉ kiểm tra khi nhập đủ cả hai ngày
            if (fromDate && toDate) {
                if (fromDate.getTime() >= toDate.getTime()) {
                    alert('Từ ngày phải nhỏ hơn Đến ngày.');
                    return false;
                }

                if (termType === TermType.N && fromDate.getFullYear() !== toDate.getFullYear()) {
                    alert('Term Type = N: Từ ngày và Đến ngày phải thuộc cùng một năm.');
                    return false;
                }

                if (termType === TermType.Q
                    && (fromDate.getFullYear() !== toDate.getFullYear() || getQuarter(fromDate) !== getQuarter(toDate))) {
                    alert('Term Type = Q: Từ ngày và Đến ngày phải thuộc cùng một quý.');
                    return false;
                }
            }

            // Qua hết validate mới submit - đồng bộ chạy lâu nên hiện loading cho người dùng
            libCs.showPleaseWait();
            return true;
        }

        const closePopupSuitelet = () => {
            window.onbeforeunload = null;
            closePopup(true);
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            saveRecord: saveRecord,
            closePopupSuitelet: closePopupSuitelet
        };

    });