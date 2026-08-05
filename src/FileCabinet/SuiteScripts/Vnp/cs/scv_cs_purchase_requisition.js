/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['../lib/scv_lib_purchase_requisition_calc'],
    (libCalc) => {

        let originalLineCount = -1;

        /**
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @since 2015.2
         */
        const pageInit = (scriptContext) => {
            try {
                originalLineCount = scriptContext.currentRecord.getLineCount({sublistId: libCalc.SUBLIST_ITEM});
            } catch (e) {
                log.error('Error pageInit', e);
            }
        }

        /**
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @since 2015.2
         */
        const lineInit = (scriptContext) => {
            try {
                if (scriptContext.sublistId !== libCalc.SUBLIST_ITEM) return;
                const curRec = scriptContext.currentRecord;
                libCalc.setLineDefaults(curRec);
                // lines beyond the line count captured at page load are new this session
                // (typed in fresh, or duplicated via make-copy) and must get their own origin line id on save
                const currentIndex = curRec.getCurrentSublistIndex({sublistId: libCalc.SUBLIST_ITEM});
                if (originalLineCount >= 0 && currentIndex >= originalLineCount) {
                    libCalc.clearCurrentLineOriginId(curRec);
                }
            } catch (e) {
                log.error('Error lineInit', e);
            }
        }

        /**
         * Defines the function definition that is executed after a sourced field is filled in.
         * NetSuite tự động source Rate/Amount/Quantity từ giá mặc định của Item khi chọn Item -
         * cần ép lại về 0 ngay sau khi NetSuite source xong, vì lúc này fieldChanged('item') đã chạy trước đó.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @since 2015.2
         */
        const postSourcing = (scriptContext) => {
            try {
                if (scriptContext.sublistId !== libCalc.SUBLIST_ITEM) return;
                if (['item', 'quantity', 'rate', 'amount'].includes(scriptContext.fieldId)) {
                    libCalc.setLineDefaults(scriptContext.currentRecord);
                }
            } catch (e) {
                log.error('Error postSourcing', e);
            }
        }

        /**
         * Defines the function definition that is executed when field is changed.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.fieldId - Field name
         * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
         * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
         * @since 2015.2
         */
        const fieldChanged = (scriptContext) => {
            try {
                const sublistId = scriptContext.sublistId;
                if (sublistId !== libCalc.SUBLIST_ITEM) return;

                const curRec = scriptContext.currentRecord;
                const fieldId = scriptContext.fieldId;
                const currencyId = curRec.getValue('currency');

                if (fieldId === libCalc.FIELD_ITEM) {
                    libCalc.setTaxCodeFromItemCurrent(curRec);
                    libCalc.setTaxRateFromTaxCodeCurrent(curRec);
                    libCalc.recalcCurrentLine(curRec, currencyId);
                    return;
                }
                if (fieldId === libCalc.FIELD_TAX_CODE) {
                    libCalc.setTaxRateFromTaxCodeCurrent(curRec);
                    libCalc.recalcCurrentLine(curRec, currencyId);
                    return;
                }
                if (fieldId === libCalc.FIELD_TAX_RATE || libCalc.CALC_TRIGGER_FIELDS.includes(fieldId)) {
                    libCalc.recalcCurrentLine(curRec, currencyId);
                }
            } catch (e) {
                log.error('Error fieldChanged', e);
            }
        }

        /**
         * Defines the function definition that is executed after sublist is inserted, removed, or edited.
         * Sublist Item hiển thị dạng List nên fieldChanged không bắt theo từng field khi gõ,
         * do đó tính lại toàn bộ dòng mỗi khi commit dòng.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.operation - Operation type
         * @since 2015.2
         */
        const sublistChanged = (scriptContext) => {
            try {
                if (scriptContext.sublistId !== libCalc.SUBLIST_ITEM) return;
                libCalc.recalcAllLines(scriptContext.currentRecord);
            } catch (e) {
                log.error('Error sublistChanged', e);
            }
        }

        return {pageInit, lineInit, postSourcing, fieldChanged, sublistChanged}

    });
