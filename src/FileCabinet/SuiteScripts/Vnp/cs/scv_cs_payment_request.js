/**
 * Nội dung:
 * =======================================================================================
 *  Date                Author                  Description
 *  5 Apr 2024              Duy Nguyen               Script Update data line and body
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', '../common/scv_common_duplicate.js', '../olib/clib.js', '../olib/lodash.min.js'],

    (currentRecord, duplicateCheck, clib, _) => {

        let sstax;
        let paymentAmountManuallyChanged = false;

        const staticTransType = {
            PAYMENT_REQUEST: 'customrecord_scv_paymentrequest'
        };

        const staticFields = {
            [staticTransType.PAYMENT_REQUEST]: {
                'recmachcustrecord_scv_pay': {
                    QUANTITY: 'custrecord_scv_pay_detail_qty',
                    RATE: 'custrecord_scv_pay_detail_rate',
                    TAX_RATE: 'custrecord_scv_pay_detail_taxrate',
                    AMOUNT: 'custrecord_scv_pay_detail_amt',
                    TAX_CODE: 'custrecord_scv_pay_detail_taxcode',
                    TAX_AMOUNT: 'custrecord_scv_pay_detail_taxamt',
                    GROSS_AMOUNT: 'custrecord_scv_pay_detail_gr_amt'
                },
                CURRENCY: 'custrecord_scv_payment_currency',
                SUM_AMOUNT: 'custrecord_scv_payment_amt',
                SUM_TAX_AMT: 'custrecord_scv_payment_amounttax',
                SUM_GROSS_AMT: 'custrecord_scv_payment_amount',
                listSublist: ['recmachcustrecord_scv_pay']
            }
        }


        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        const pageInit = (scriptContext) => {
            try {
                paymentAmountManuallyChanged = false;
                sstax = clib.searchData('customsearch_scv_taxcode_search', [], []);
                // console.log(sstax);
            } catch (e) {
                console.log('pageInit:' + JSON.stringify(e));
            }
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
        const fieldChanged = (scriptContext) => {
            try {
                let curRec = scriptContext.currentRecord;
                let typeRec = curRec.type;
                if (typeRec === staticTransType.PAYMENT_REQUEST) {
                    if (!scriptContext.sublistId && scriptContext.fieldId === staticFields[typeRec].SUM_GROSS_AMT) {
                        paymentAmountManuallyChanged = true;
                        return;
                    }
                    updateDataInLine(scriptContext);
                }

            } catch (e) {
                console.log('fieldChanged:' + JSON.stringify(e));

            }
        }


        const updateDataInLine = (scriptContext) => {
            try {
                let currentRecord = scriptContext.currentRecord;
                // let currency = currentRecord.getValue('custrecord_scv_payment_currency')
                let sublistId = scriptContext.sublistId || '';
                let transType = currentRecord.type;
                if (transType !== staticTransType.PAYMENT_REQUEST || !staticFields[transType]) return;
                let listSublistId = staticFields[transType].listSublist;
                // Return do not Sublist
                if (listSublistId.indexOf(sublistId) === -1) return;
                let grossAmount = 0, taxamt = 0, amount = 0;
                // Return list fields record
                let factorCurrency = getFactorCurrency(currentRecord);
                let staticFieldsRecord = staticFields[transType][sublistId];
                if (scriptContext.fieldId === staticFieldsRecord.TAX_CODE) {
                    let taxcode = currentRecord.getCurrentSublistValue({
                        sublistId: scriptContext.sublistId,
                        fieldId: staticFieldsRecord.TAX_CODE
                    });
                    let f = _.find(sstax, {'Internal ID': taxcode});
                    let rate = f.Rate;
                    funcSetCurrentLineValue(currentRecord, scriptContext.sublistId, staticFieldsRecord.TAX_RATE, _.replace(rate, '%', ''));
                }

                if (scriptContext.fieldId === staticFieldsRecord?.RATE || scriptContext.fieldId === staticFieldsRecord?.QUANTITY) {
                    let quantity = currentRecord.getCurrentSublistValue({
                        sublistId: scriptContext.sublistId,
                        fieldId: staticFieldsRecord.QUANTITY
                    });
                    let rate = currentRecord.getCurrentSublistValue({
                        sublistId: scriptContext.sublistId,
                        fieldId: staticFieldsRecord.RATE
                    });
                    if (isNotNull(quantity) && isNotNull(rate)) {
                        amount = quantity * rate;
                        funcSetCurrentLineValue(currentRecord, scriptContext.sublistId, staticFieldsRecord.AMOUNT, roundValue(amount, factorCurrency), {
                            ignoreFieldChange: false,
                            forceSyncSourcing: false
                        });
                    }
                }

                if (scriptContext.fieldId === staticFieldsRecord.TAX_CODE || scriptContext.fieldId === staticFieldsRecord.AMOUNT) {
                    if (staticFieldsRecord.AMOUNT) {
                        amount = currentRecord.getCurrentSublistValue({
                            sublistId: scriptContext.sublistId,
                            fieldId: staticFieldsRecord.AMOUNT
                        });
                    }
                    if (staticFieldsRecord.TAX_CODE) {
                        let taxcode = currentRecord.getCurrentSublistValue({
                            sublistId: scriptContext.sublistId,
                            fieldId: staticFieldsRecord.TAX_CODE
                        });
                        let f = _.find(sstax, {'Internal ID': taxcode});
                        let rate = _.replace(f.Rate, '%', '');
                        taxamt = _.round(rate * amount / 100);
                    }
                    funcSetCurrentLineValue(currentRecord, scriptContext.sublistId, staticFieldsRecord.TAX_AMOUNT, roundValue(taxamt, factorCurrency));
                    grossAmount = taxamt + amount;
                    funcSetCurrentLineValue(currentRecord, scriptContext.sublistId, staticFieldsRecord.GROSS_AMOUNT, roundValue(grossAmount, factorCurrency));
                }

                if (scriptContext.fieldId === staticFieldsRecord.TAX_AMOUNT) {
                    amount = currentRecord.getCurrentSublistValue({
                        sublistId: scriptContext.sublistId,
                        fieldId: staticFieldsRecord.AMOUNT
                    });
                    taxamt = currentRecord.getCurrentSublistValue({
                        sublistId: scriptContext.sublistId,
                        fieldId: staticFieldsRecord.TAX_AMOUNT
                    });
                    grossAmount = taxamt + amount;
                    funcSetCurrentLineValue(currentRecord, scriptContext.sublistId, staticFieldsRecord.GROSS_AMOUNT, roundValue(grossAmount, factorCurrency));
                }

                updateSumGrossAmount(scriptContext, grossAmount, amount, taxamt, scriptContext.lineNum)

            } catch (e) {
                log.error("Error update Data In Line Expense: ", e);
            }
        }

        const roundValue = (val, factor) => {
            return Math.round(val * factor) / factor;
        }

        const getFactorCurrency = (curRec) => {
            let recType = curRec.type;
            if (!staticFields[recType]) return 1;
            let staticFieldCurrency = staticFields[recType].CURRENCY;
            if (staticFieldCurrency) {
                let currencyId = curRec.getValue(staticFieldCurrency);
                return (currencyId === '1' || !currencyId) ? 1 : 100;
            } else {
                return 1E5;
            }
        }

        /**
         * @param curRec
         * @param sublistId
         * @param fieldId
         * @param value
         * @param options
         */
        const funcSetCurrentLineValue = (curRec, sublistId, fieldId, value, options) => {
            if (fieldId) {
                let objValues = {
                    sublistId: sublistId,
                    fieldId: fieldId,
                    value: value,
                    ignoreFieldChange: options?.ignoreFieldChange ?? true,
                    forceSyncSourcing: options?.forceSyncSourcing ?? true
                };
                curRec.setCurrentSublistValue(objValues);
            }
        }

        const updateSumGrossAmount = (scriptContext, grossAmount, amount, taxAmt, lineId) => {
            let curRec = currentRecord.get();
            let transType = curRec.type;
            let sublistId = scriptContext.sublistId;
            let sublistFieldChanged = scriptContext.sublistId;
            if (transType !== staticTransType.PAYMENT_REQUEST || !staticFields[transType]) return;
            const listSublist = staticFields[transType].listSublist;
            if (listSublist.indexOf(sublistId) === -1) return;
            const objAmt = funcGetTotalAmount(curRec, sublistFieldChanged, 1, grossAmount, amount, taxAmt, lineId);
            updateAmountMain(curRec, transType, objAmt);
        }

        /**
         * Update the amount fields in the given record based on the transaction type and the amount object
         * @param {Record} curRec - The current record to update
         * @param {string} transType - The transaction type
         * @param {Object} objAmt - The amount object containing totalAmount, totalGrossAmt, and totalTaxAmt
         */
        const updateAmountMain = (curRec, transType, objAmt) => {
            let factorNumber = getFactorCurrency(curRec);
            if (staticFields[transType].SUM_AMOUNT) {
                curRec.setValue(staticFields[transType].SUM_AMOUNT, roundValue(objAmt.totalAmount, factorNumber), true);
            }
            if (staticFields[transType].SUM_GROSS_AMT && !paymentAmountManuallyChanged) {
                curRec.setValue(staticFields[transType].SUM_GROSS_AMT, roundValue(objAmt.totalGrossAmt, factorNumber), true);
            }
            if (staticFields[transType].SUM_TAX_AMT) {
                curRec.setValue(staticFields[transType].SUM_TAX_AMT, roundValue(objAmt.totalTaxAmt, factorNumber), true);
            }
        }


        /**
         * Function to be executed after sublist is inserted, removed, or edited.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         *
         * @since 2015.2
         */
        const sublistChanged = (scriptContext) => {
            let curRec = scriptContext.currentRecord;
            let typeRec = curRec.type;
            const factor = getFactor(scriptContext.operation);
            if (typeRec === staticTransType.PAYMENT_REQUEST) {
                updateSumGrossAmountSublistChanged(scriptContext, factor)
            }
        }

        const getFactor = (operation) => {
            switch (operation) {
                case 'remove':
                    return -1;
                default:
                    return 1;
            }
        }

        const updateSumGrossAmountSublistChanged = (scriptContext, factor = 1) => {
            let curRecLine = scriptContext.currentRecord;
            let sublistId = scriptContext.sublistId;
            let transType = curRecLine.type;
            if (transType !== staticTransType.PAYMENT_REQUEST || !staticFields[transType]) return;
            const listSublist = staticFields[transType].listSublist;
            if (listSublist.indexOf(sublistId) === -1) return;
            let grossAmount = 0, amount = 0, taxAmt = 0;
            if (staticFields[transType][sublistId].GROSS_AMOUNT) {
                grossAmount = curRecLine.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: staticFields[transType][sublistId].GROSS_AMOUNT
                }) * 1;
            }
            if (staticFields[transType][sublistId].AMOUNT) {
                amount = curRecLine.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: staticFields[transType][sublistId].AMOUNT
                }) * 1;
            }
            if (staticFields[transType][sublistId].TAX_AMOUNT) {
                taxAmt = curRecLine.getCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: staticFields[transType][sublistId].TAX_AMOUNT
                }) * 1;
            }
            const lineId = curRecLine.getCurrentSublistIndex({sublistId: sublistId});
            let curRec = currentRecord.get();
            const objAmt = funcGetTotalAmount(curRec, sublistId, factor, grossAmount, amount, taxAmt, lineId);
            updateAmountMain(curRec, transType, objAmt);
        }

        /**
         * Calculate the total gross amount, total amount, and total tax amount based on the given record and sublist field changes.
         * @param {Object} curRec - The current record object
         * @param {string} sublistFieldChanged - The changed sublist field
         * @param {number} factor - The factor to be applied
         * @param {number} grossAmount - The gross amount
         * @param {number} amount - The amount
         * @param {number} taxAmt - The tax amount
         * @param {number} lineId - The line ID
         * @returns {Object} - An object containing the total gross amount, total amount, and total tax amount
         */
        const funcGetTotalAmount = (curRec, sublistFieldChanged = '', factor = 1, grossAmount = 0, amount = 0, taxAmt = 0, lineId = '') => {
            let totalGrossAmt = 0, totalTaxAmt = 0, totalAmount = 0;
            const transType = curRec.type;
            if (transType !== staticTransType.PAYMENT_REQUEST || !staticFields[transType]) return {
                totalGrossAmt,
                totalAmount,
                totalTaxAmt
            };
            const listSublist = staticFields[transType].listSublist;
            const npSL = listSublist.length;
            const currentLine = Number(lineId);
            for (let i = 0; i < npSL; i++) {
                const curSublistId = listSublist[i];
                const objFieldSublist = staticFields[transType][curSublistId];
                const lineCount = curRec.getLineCount(curSublistId);
                for (let j = 0; j < lineCount; j++) {
                    let lineGrossAmount = 0, lineAmount = 0, lineTaxAmt = 0;
                    if (j === currentLine && sublistFieldChanged === curSublistId) {
                        lineGrossAmount = grossAmount * factor;
                        lineAmount = amount * factor;
                        lineTaxAmt = taxAmt * factor;
                    } else {
                        if (objFieldSublist.GROSS_AMOUNT) {
                            lineGrossAmount = curRec.getSublistValue({
                                sublistId: curSublistId,
                                fieldId: objFieldSublist.GROSS_AMOUNT,
                                line: j
                            }) * 1;
                        }
                        if (objFieldSublist.AMOUNT) {
                            lineAmount = curRec.getSublistValue({
                                sublistId: curSublistId,
                                fieldId: objFieldSublist.AMOUNT,
                                line: j
                            }) * 1;
                        }
                        if (objFieldSublist.TAX_AMOUNT) {
                            lineTaxAmt = curRec.getSublistValue({
                                sublistId: curSublistId,
                                fieldId: objFieldSublist.TAX_AMOUNT,
                                line: j
                            }) * 1;
                        }
                    }
                    totalGrossAmt += lineGrossAmount;
                    totalAmount += lineAmount;
                    totalTaxAmt += lineTaxAmt;
                }

                if (currentLine === lineCount) {
                    totalGrossAmt += grossAmount * factor;
                    totalAmount += amount * factor;
                    totalTaxAmt += taxAmt * factor;
                }
            }
            return {totalGrossAmt, totalAmount, totalTaxAmt};
        }

        const isNotNull = (obj) => {
            return obj !== null && obj !== undefined && obj !== "";
        }

        /**
         * Function to be executed when record is saved.
         * Check trùng thông tin hóa đơn trên PayR, show cảnh báo nếu trùng, cho user chọn tiếp tục lưu hay không.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         *
         * @returns {boolean}
         * @since 2015.2
         */
        const saveRecord = (scriptContext) => {
            try {
                let curRec = scriptContext.currentRecord;
                if (curRec.type !== staticTransType.PAYMENT_REQUEST) return true;
                if (duplicateCheck.isDuplicateInvoicePayR(curRec)) {
                    return confirm(duplicateCheck.WARNING_MESSAGE);
                }
                return true;
            } catch (e) {
                console.log('saveRecord:' + JSON.stringify(e));
                return true;
            }
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            sublistChanged: sublistChanged,
            saveRecord: saveRecord
        };

    });
