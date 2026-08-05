/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['../lib/scv_lib_tender_calc'],
    (libCalc) => {

        /**
         * Defines the function definition that is executed when a new line is initialized.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @since 2015.2
         */
        function lineInit(scriptContext) {
            debugger;
            try {
                if (scriptContext.sublistId !== libCalc.SUBLIST_ITEM) return;
                libCalc.setLineDefaults(scriptContext.currentRecord);
            } catch (e) {
                log.error('Error lineInit', e);
            }
        }

        /**
         * Defines the function definition that is executed after sublist is inserted, removed, or edited.
         * Sublist Item hiển thị dạng List nên fieldChanged không bắt theo từng field khi gõ,
         * do đó tính lại toàn bộ dòng (Tax Code/Tax Rate + 3 bộ dt/tt/custom) và tổng header mỗi khi commit dòng.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @param {string} scriptContext.operation - Operation type
         * @since 2015.2
         */
        const sublistChanged = (scriptContext) => {
            debugger;
            try {
                if (scriptContext.sublistId !== libCalc.SUBLIST_ITEM) return;
                libCalc.recalcAllLines(scriptContext.currentRecord);
            } catch (e) {
                log.error('Error sublistChanged', e);
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
            debugger;
            try {
                const sublistId = scriptContext.sublistId;
                if (sublistId !== libCalc.SUBLIST_ITEM) return;

                const curRec = scriptContext.currentRecord;
                const fieldId = scriptContext.fieldId;
                const currencyId = curRec.getValue('currency');

                if (fieldId === libCalc.FIELD_ITEM) {
                    libCalc.setTaxCodeFromItem(curRec);
                    libCalc.setTaxRateFromTaxCode(curRec);
                    libCalc.recalcAllGroups(curRec, currencyId);
                    libCalc.updateAllGroupTotals(curRec);
                    return;
                }
                if (fieldId === libCalc.FIELD_TAX_CODE) {
                    libCalc.setTaxRateFromTaxCode(curRec);
                    libCalc.recalcAllGroups(curRec, currencyId);
                    libCalc.updateAllGroupTotals(curRec);
                    return;
                }
                if (fieldId === libCalc.FIELD_TAX_RATE) {
                    libCalc.recalcAllGroups(curRec, currencyId);
                    libCalc.updateAllGroupTotals(curRec);
                    return;
                }

                const group = libCalc.getGroupByField(fieldId);
                if (group) {
                    libCalc.recalcGroupLine(curRec, group, fieldId, currencyId);
                    libCalc.updateGroupTotal(curRec, group);
                }
            } catch (e) {
                console.log('Error fieldChanged', e);
            }
        }

        return {
            lineInit: lineInit,
            fieldChanged: fieldChanged,
            sublistChanged: sublistChanged
        }

    });
