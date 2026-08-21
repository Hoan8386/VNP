/**
 * Noi dung: Payment Request buttons, numbering, and transaction back-reference.
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/url'],
    (record, search, url) => {

        const PAYR_RECORD = 'customrecord_scv_paymentrequest';
        const DETAIL_SUBLIST = 'recmachcustrecord_scv_pay';

        const FIELD = {
            TYPE: 'custrecord_scv_payment_type',
            DETAIL_TYPE: 'custrecord_scv_payr_detail_type',
            STATUS: 'custrecord_scv_payment_status',
            AMOUNT: 'custrecord_scv_payment_amount',
            PAID_AMOUNT: 'custrecord_scv_payr_paid_amt',
            RELATED: 'custrecord_scv_payment_related',
            DATE: 'custrecord_scv_payment_date',
            SUBSIDIARY: 'custrecord_scv_payr_subs',
            PO: 'custrecord_scv_payment_po'
        };

        const PAYMENT_TYPE = {
            VENDOR_PREPAYMENT: '1',
            PAYABLE_PAYMENT: '2',
            OTHER_PAYMENT: '3',
            EMPLOYEE_ADVANCE: '4',
            PREPAID_EXPENSE: '5',
            CUSTOMER_REFUND: '7',
            EXPENSE_REPORT: '9',
            INVESTMENT: '10'
        };

        const STATUS = {
            APPROVED: '6',
            APPROVED_ALT: '3',
            IN_PROGRESS: '8',
            PARTIALLY_PAID: '9'
        };

        const REASON_CODE = {
            INVEST_IN: 'A01',
            INVEST_OUT: 'B01'
        };

        const DEFAULT_SEQUENCE_DIGITS = 6;

        const beforeLoad = (context) => {
            try {
                const rec = context.newRecord;
                if (rec.type !== PAYR_RECORD || context.type !== context.UserEventType.VIEW) return;

                addPaymentButtons(context.form, rec);
            } catch (e) {
                log.error('beforeLoad Payment Request', e);
            }
        };

        const beforeSubmit = (context) => {
            try {
                const rec = context.newRecord;
                if (rec.type !== PAYR_RECORD || context.type === context.UserEventType.DELETE) return;
                if (context.type === context.UserEventType.CREATE || context.type === context.UserEventType.COPY) {
                    setPaymentRequestNumber(rec);
                } else {
                    log.error('PAYR_AUTO_NO_DIAG skip numbering', {
                        reason: 'context is not create/copy',
                        contextType: context.type,
                        recordType: rec.type
                    });
                }
            } catch (e) {
                log.error('beforeSubmit Payment Request', e);
            }
        };

        const afterSubmit = (context) => {
            try {
                const rec = context.newRecord;
                if (context.type === context.UserEventType.DELETE) return;

                if (rec.type === PAYR_RECORD) {
                    ensurePaymentRequestNumberAfterSubmit(context);
                    updatePaymentRequestAmount(context);
                    return;
                }

                updatePaymentRequestFromTransaction(rec);
            } catch (e) {
                log.error('afterSubmit Payment Request', e);
            }
        };

        function addPaymentButtons(form, rec) {
            const type = String(rec.getValue(FIELD.TYPE) || '');
            const status = String(rec.getValue(FIELD.STATUS) || '');
            const amount = toNumber(rec.getValue(FIELD.AMOUNT));
            const paidAmount = toNumber(rec.getValue(FIELD.PAID_AMOUNT));
            const hasRemaining = amount > paidAmount;

            if (status === STATUS.APPROVED && type === PAYMENT_TYPE.EMPLOYEE_ADVANCE && hasRemaining) {
                addRedirectButton(form, rec, 'custpage_scv_payr_check_advance', 'Check', 'check', 'payment_to_check_tam_ung');
            }

            if (status === STATUS.APPROVED && type === PAYMENT_TYPE.OTHER_PAYMENT && hasRemaining) {
                addRedirectButton(form, rec, 'custpage_scv_payr_check_other', 'Check', 'check', 'payment_to_check_chi_khac');
            }

            if (status === STATUS.APPROVED && type === PAYMENT_TYPE.VENDOR_PREPAYMENT && hasRemaining) {
                if (getPurchaseOrderType(rec.getValue('custrecord_scv_payment_po')) === '4') {
                    addRedirectButton(form, rec, 'custpage_scv_payr_bill_credit', 'Bill Credit', 'vendorcredit', 'payment_to_bill_credit');
                } else {
                    addRedirectButton(form, rec, 'custpage_scv_payr_vendor_prepay', 'Vendor Prepayment', 'vendorprepayment', 'payment_to_vendor_prepayment');
                }
            }

            if (status === STATUS.APPROVED_ALT && type === PAYMENT_TYPE.CUSTOMER_REFUND && hasRemaining) {
                addRedirectButton(form, rec, 'custpage_scv_payr_customer_refund', 'Customer Refund', 'customerrefund', 'payment_to_customer_refund');
            }

            if (isBillStatus(status) && type === PAYMENT_TYPE.PAYABLE_PAYMENT && !rec.getValue(FIELD.PO) && !hasRelatedType(rec, 'vendorbill')) {
                addRedirectButton(form, rec, 'custpage_scv_payr_vendor_bill', 'Enter Bill', 'vendorbill', 'payment_to_vendor_bill');
            }

            if (status === STATUS.APPROVED && type === PAYMENT_TYPE.PAYABLE_PAYMENT && hasRemaining) {
                addRedirectButton(form, rec, 'custpage_scv_payr_vendor_payment', 'Bill Payment', 'vendorpayment', 'payment_to_bill_payment');
            }

            if (status === STATUS.APPROVED && type === PAYMENT_TYPE.EXPENSE_REPORT && !hasRelatedType(rec, 'expensereport')) {
                addRedirectButton(form, rec, 'custpage_scv_payr_expense_report', 'Enter Expense Report', 'expensereport', 'payment_to_expense_report');
            }

            if (status === STATUS.APPROVED && type === PAYMENT_TYPE.PREPAID_EXPENSE && !hasRelatedType(rec, 'journalentry')) {
                addRedirectButton(form, rec, 'custpage_scv_payr_journal_prepaid', 'Make Journal Entry', 'journalentry', 'payment_to_journal_prepaid');
            }

            if (type === PAYMENT_TYPE.INVESTMENT && status === STATUS.APPROVED) {
                const reasonCode = getReasonCode(rec);

                if (reasonCode === REASON_CODE.INVEST_IN && hasRemaining) {
                    addRedirectButton(form, rec, 'custpage_scv_payr_invest_check', 'Check', 'check', 'payment_to_check_investment');
                    addRedirectButton(form, rec, 'custpage_scv_payr_invest_jrl_in', 'Create JRL', 'journalentry', 'payment_to_journal_invest_in');
                }

                if (reasonCode === REASON_CODE.INVEST_OUT) {
                    addRedirectButton(form, rec, 'custpage_scv_payr_invest_deposit', 'Deposit', 'deposit', 'payment_to_deposit_investment');

                    if (!hasRelatedType(rec, 'journalentry')) {
                        addRedirectButton(form, rec, 'custpage_scv_payr_invest_jrl_out', 'Create JRL', 'journalentry', 'payment_to_journal_invest_out');
                    }
                }
            }
        }

        function addRedirectButton(form, rec, id, label, recordType, typeFunc) {
            const resolvedUrl = url.resolveRecord({
                recordType,
                recordId: null,
                isEditMode: true,
                params: {
                    id_rec: rec.id,
                    type_func: typeFunc
                }
            });
            form.addButton({
                id,
                label,
                functionName: `window.open("${resolvedUrl}")`
            });
        }

        function setPaymentRequestNumber(rec) {
            const numberInfo = buildPaymentRequestNumber(rec);
            rec.setValue({
                fieldId: 'autoname',
                value: false
            });
            rec.setValue({
                fieldId: 'name',
                value: numberInfo.nextName
            });
        }

        function ensurePaymentRequestNumberAfterSubmit(context) {
            if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.COPY) return;

            const rec = context.newRecord;
            const fields = search.lookupFields({
                type: PAYR_RECORD,
                id: rec.id,
                columns: ['name']
            });
            const persistedName = fields.name || '';
            if (persistedName) return;

            const numberInfo = buildPaymentRequestNumber(rec);
            const payrRec = record.load({
                type: PAYR_RECORD,
                id: rec.id,
                isDynamic: false
            });
            payrRec.setValue({
                fieldId: 'autoname',
                value: false
            });
            payrRec.setValue({
                fieldId: 'name',
                value: numberInfo.nextName
            });
            const savedId = payrRec.save({
                enableSourcing: false,
                ignoreMandatoryFields: true
            });
            const verifyFields = search.lookupFields({
                type: PAYR_RECORD,
                id: rec.id,
                columns: ['name']
            });
        }

        function buildPaymentRequestNumber(rec) {
            const paymentDate = rec.getValue(FIELD.DATE) || new Date();
            const year = String(paymentDate.getFullYear()).slice(-2);
            const subsidiaryId = rec.getValue(FIELD.SUBSIDIARY);
            const subsidiaryPrefix = getSubsidiaryPrefix(subsidiaryId);
            const prefix = `PayR${subsidiaryPrefix}${year}/`;
            const nextSeq = getNextPaymentRequestSeq(prefix);
            const nextName = `${prefix}${padSeq(nextSeq)}`;
            return {
                paymentDate,
                year,
                subsidiaryId,
                subsidiaryPrefix,
                prefix,
                nextSeq,
                nextName
            };
        }

        function getNextPaymentRequestSeq(prefix) {
            const colSeq = search.createColumn({
                name: 'formulanumeric',
                summary: search.Summary.MAX,
                formula: "TO_NUMBER(SUBSTR({name}, INSTR({name}, '/') + 1))"
            });
            const payrSearch = search.create({
                type: PAYR_RECORD,
                filters: [
                    ['isinactive', 'is', 'F'],
                    'AND',
                    ['idtext', 'startswith', prefix]
                ],
                columns: [colSeq]
            });
            const result = payrSearch.run().getRange({start: 0, end: 1})[0];
            const maxSeq = result ? (toNumber(result.getValue(colSeq)) || 0) : 0;
            return maxSeq + 1;
        }

        function updatePaymentRequestAmount(context) {
            const rec = context.newRecord;
            if (context.type === context.UserEventType.EDIT) return;

            const totalGrossAmount = sumSublist(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_gr_amt');

            if (!rec.id) return;

            if (totalGrossAmount === 0) return;

            record.submitFields({
                type: PAYR_RECORD,
                id: rec.id,
                values: {
                    [FIELD.AMOUNT]: totalGrossAmount
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
        }

        function updatePaymentRequestFromTransaction(txnRec) {
            const payrId = txnRec.getValue('custbody_scv_payment_number');
            if (!payrId) return;

            const paidAmount = getPaymentRequestPaidAmount(payrId);
            const related = getRelatedTransactionIds(payrId);
            related.add(String(txnRec.id));

            record.submitFields({
                type: PAYR_RECORD,
                id: payrId,
                values: {
                    [FIELD.PAID_AMOUNT]: paidAmount,
                    [FIELD.RELATED]: Array.from(related)
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
        }

        function getPaymentRequestPaidAmount(payrId) {
            const amountFromSavedSearch = getPaidAmountFromSavedSearch(payrId);
            if (amountFromSavedSearch !== null) return amountFromSavedSearch;

            let amount = 0;
            search.create({
                type: search.Type.TRANSACTION,
                filters: [
                    ['custbody_scv_payment_number', 'anyof', payrId],
                    'AND',
                    ['mainline', 'is', 'T']
                ],
                columns: ['total']
            }).run().each(result => {
                amount += toNumber(result.getValue('total'));
                return true;
            });
            return amount;
        }

        function getPaidAmountFromSavedSearch(payrId) {
            try {
                const loadedSearch = search.load({id: 'customsearch_scv_payr_paid_amt'});
                loadedSearch.filters.push(search.createFilter({
                    name: 'custbody_scv_payment_number',
                    operator: search.Operator.ANYOF,
                    values: payrId
                }));
                const result = loadedSearch.run().getRange({start: 0, end: 1})[0];
                if (!result) return 0;
                const columns = result.columns || [];
                for (let i = 0; i < columns.length; i++) {
                    const value = toNumber(result.getValue(columns[i]));
                    if (value) return value;
                }
                return 0;
            } catch (e) {
                log.debug('customsearch_scv_payr_paid_amt unavailable', e.message || e);
                return null;
            }
        }

        function getRelatedTransactionIds(payrId) {
            const fields = search.lookupFields({
                type: PAYR_RECORD,
                id: payrId,
                columns: [FIELD.RELATED]
            });
            const values = fields[FIELD.RELATED] || [];
            return new Set(values.map(value => String(value.value || value)).filter(Boolean));
        }

        function hasRelatedType(rec, recordType) {
            const related = rec.getValue(FIELD.RELATED);
            const ids = Array.isArray(related) ? related : (related ? [related] : []);
            if (!ids.length) return false;

            let found = false;
            search.create({
                type: search.Type.TRANSACTION,
                filters: [
                    ['internalid', 'anyof', ids],
                    'AND',
                    ['mainline', 'is', 'T']
                ],
                columns: ['recordtype']
            }).run().each(result => {
                if (String(result.getValue('recordtype') || '').toLowerCase() === recordType) {
                    found = true;
                    return false;
                }
                return true;
            });
            return found;
        }

        function getReasonCode(rec) {
            if (!rec.id) return '';
            let reasonCode = '';
            search.create({
                type: PAYR_RECORD,
                filters: [['internalid', 'anyof', rec.id]],
                columns: [search.createColumn({
                    name: 'custrecord_scv_reasonttdt_code',
                    join: 'custrecord_scv_payr_detail_type'
                })]
            }).run().each(result => {
                reasonCode = result.getValue(result.columns[0]) || '';
                return false;
            });
            return reasonCode;
        }

        function getPurchaseOrderType(poId) {
            if (!poId) return '';
            const fields = search.lookupFields({
                type: search.Type.PURCHASE_ORDER,
                id: poId,
                columns: ['custbody_scv_order_type']
            });
            return (fields.custbody_scv_order_type || [])[0]?.value || '';
        }

        function getSubsidiaryPrefix(subsidiaryId) {
            if (!subsidiaryId) {
                log.error('PAYR_AUTO_NO_DIAG subsidiary prefix', {
                    subsidiaryId,
                    tranprefix: '',
                    reason: 'missing subsidiary'
                });
                return '';
            }
            const fields = search.lookupFields({
                type: search.Type.SUBSIDIARY,
                id: subsidiaryId,
                columns: ['tranprefix']
            });
            log.error('PAYR_AUTO_NO_DIAG subsidiary prefix', {
                subsidiaryId,
                tranprefix: fields.tranprefix || '',
                rawFields: fields
            });
            return fields.tranprefix || '';
        }

        function isBillStatus(status) {
            return [STATUS.APPROVED, STATUS.APPROVED_ALT, STATUS.IN_PROGRESS, STATUS.PARTIALLY_PAID].indexOf(status) !== -1;
        }

        function sumSublist(rec, sublistId, fieldId) {
            let total = 0;
            let count = 0;
            try {
                count = rec.getLineCount({sublistId});
            } catch (e) {
                return 0;
            }
            for (let i = 0; i < count; i++) {
                total += toNumber(rec.getSublistValue({sublistId, fieldId, line: i}));
            }
            return total;
        }

        function toNumber(value) {
            const number = parseFloat(value || 0);
            return isNaN(number) ? 0 : number;
        }

        function padSeq(seq) {
            const length = seq > 99999 ? String(seq).length : DEFAULT_SEQUENCE_DIGITS;
            return String(seq).padStart(length, '0');
        }

        return {
            beforeLoad,
            beforeSubmit,
            afterSubmit
        };
    });
