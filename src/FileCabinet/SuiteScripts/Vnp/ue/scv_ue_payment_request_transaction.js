/**
 * Noi dung: Prefill transactions created from Payment Request.
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/format', 'N/record', 'N/search'],
    (format, record, search) => {

        const PAYR_RECORD = 'customrecord_scv_paymentrequest';
        const DETAIL_SUBLIST = 'recmachcustrecord_scv_pay';
        const DEFAULT_BILL_CREDIT_ACCOUNT = '1353';
        const DEFAULT_TAX_CODE = '5';

        const HEADER_MAP = {
            entity: 'custrecord_scv_payment_entity',
            subsidiary: 'custrecord_scv_payr_subs',
            department: 'custrecord_scv_payment_department',
            currency: 'custrecord_scv_payment_currency',
            exchangerate: 'custrecord_scv_payment_exchangerate',
            memo: 'custrecord_scv_payment_memo',
            trandate: 'custrecord_scv_payment_date',
            custbody_scv_related_transaction: 'custrecord_scv_payment_related',
            custbody_scv_payment_number: null,
            custbody_scv_tb_entity_name: 'custrecord_scv_payment_entity',
            custbody_scv_beneficiary: 'custrecord_scv_payment_beneficiary',
            custbody_scv_nguoithuhuong: 'custrecord_scv_payment_nguoi_thu_huong',
            custbody_scv_bank_account: 'custrecord_scv_payment_bankaccount',
            custbody_scv_bank_name: 'custrecord_scv_payment_bankname',
            custbody_scv_bank_branch: 'custrecord_scv_payment_bankbranch',
            custbody_scv_purchase_contract: 'custrecord_scv_payment_pc',
            custbody_scv_sales_contract: 'custrecord_scv_payment_sc',
            cseg_inv_portfolio: 'cseg_inv_portfolio',
            custbody_scv_ttdt: 'custrecord_scv_payr_ttdt'
        };

        const LINE_MAP = {
            item: {
                item: 'custrecord_scv_pay_detail_item',
                units: 'custrecord_scv_pay_detail_unit',
                quantity: 'custrecord_scv_pay_detail_qty',
                rate: 'custrecord_scv_pay_detail_rate',
                amount: 'custrecord_scv_pay_detail_amt',
                taxcode: 'custrecord_scv_pay_detail_taxcode',
                taxrate1: 'custrecord_scv_pay_detail_taxrate',
                tax1amt: 'custrecord_scv_pay_detail_taxamt',
                grossamt: 'custrecord_scv_pay_detail_gr_amt',
                description: 'custrecord_scv_pay_detail_des',
                department: 'custrecord_scv_pay_detail_department',
                custcol_scv_invoice_serial: 'custrecord_scv_pay_detail_inv_serial',
                custcol_scv_invoice_number: 'custrecord_scv_pay_detail_invoice_number',
                custcol_scv_invoice_date: 'custrecord_scv_pay_detail_invoice_date',
                custcol_scv_entity_name: 'custrecord_scv_pay_detail_entity_name',
                custcol_scv_invoice_taxreg: 'custrecord_scv_pay_detail_entity_tax',
                custcol_scv_entity_address: 'custrecord_scv_pay_detail_entity_addr',
                class: 'custrecord_scv_pay_detail_class',
                custcol_scv_payr_detail: 'id'
            },
            expense: {
                account: 'account',
                amount: 'custrecord_scv_pay_detail_amt',
                taxcode: 'custrecord_scv_pay_detail_taxcode',
                taxrate1: 'custrecord_scv_pay_detail_taxrate',
                tax1amt: 'custrecord_scv_pay_detail_taxamt',
                grossamt: 'custrecord_scv_pay_detail_gr_amt',
                memo: 'custrecord_scv_pay_detail_des',
                department: 'custrecord_scv_pay_detail_department',
                custcol_scv_invoice_serial: 'custrecord_scv_pay_detail_inv_serial',
                custcol_scv_invoice_number: 'custrecord_scv_pay_detail_invoice_number',
                custcol_scv_invoice_date: 'custrecord_scv_pay_detail_invoice_date',
                custcol_scv_entity_name: 'custrecord_scv_pay_detail_entity_name',
                custcol_scv_invoice_taxreg: 'custrecord_scv_pay_detail_entity_tax',
                custcol_scv_entity_address: 'custrecord_scv_pay_detail_entity_addr',
                class: 'custrecord_scv_pay_detail_class',
                custcol_scv_payr_detail: 'id'
            }
        };

        const beforeLoad = (context) => {
            try {
                if (context.type !== context.UserEventType.CREATE) return;
                const params = context.request?.parameters || {};
                if (!params.id_rec || !params.type_func) return;

                prefillTransaction(context.newRecord, params);
            } catch (e) {
                log.error('beforeLoad Payment Request transaction', e);
            }
        };

        const beforeSubmit = (context) => {
            try {
                if (context.type === context.UserEventType.DELETE) return;
                const rec = context.newRecord;
                if (rec.type !== record.Type.VENDOR_PREPAYMENT) return;

                const payrId = rec.getValue('custbody_scv_payment_number');
                if (!payrId) return;

                const payrRec = record.load({
                    type: PAYR_RECORD,
                    id: payrId
                });
                const amount = payrRec.getValue('custrecord_scv_payment_amount');
                safeSetValue(rec, 'payment', amount, {
                    ignoreFieldChange: true
                });
            } catch (e) {
                log.error('beforeSubmit Vendor Prepayment amount', e);
            }
        };

        function prefillTransaction(targetRec, params) {
            const payrRec = record.load({
                type: PAYR_RECORD,
                id: params.id_rec
            });
            const header = readHeader(payrRec);
            header.custbody_scv_payment_number = params.id_rec;
            let purchaseOrderId = '';
            let vendorPrepaymentAmount = '';
            let todayDateText = '';

            // Expense Report uses transaction-specific currency fields rather
            // than the generic currency/exchange-rate fields used elsewhere.
            if (params.type_func === 'payment_to_expense_report') {
                header.expensereportcurrency = header.currency;
                header.expensereportexchangerate = header.exchangerate;
                delete header.currency;
                delete header.exchangerate;
            }

            if (params.type_func === 'payment_to_vendor_prepayment') {
                purchaseOrderId = payrRec.getValue('custrecord_scv_payment_po');
                vendorPrepaymentAmount = payrRec.getValue('custrecord_scv_payment_amount');
                log.error('vendorPrepaymentAmount', vendorPrepaymentAmount)
                header.custbody_scv_created_transaction = purchaseOrderId;
            }

            if (params.type_func === 'payment_to_bill_credit') {
                const paymentRequestSource = getPaymentRequestSource(payrRec);
                header.custbody_scv_created_transaction = paymentRequestSource.purchaseOrder;
                header.custbody_scv_purchase_requisition = paymentRequestSource.purchaseRequisition;
                header.custbody_scv_purchase_contract = paymentRequestSource.purchaseContract;
                header.custbody_scv_sales_contract = paymentRequestSource.salesContract;
            }

            // Journal Entry date is always today's date, not the Payment
            // Request's date, and does not carry over the PayR's own
            // related-transaction reference (that link is written back onto
            // the Payment Request after submit, not onto the new Journal).
            if (isTodayDateTransaction(params.type_func)) {
                todayDateText = getTodayDateText();
            }
            if (params.type_func === 'payment_to_journal_prepaid') {
                delete header.custbody_scv_related_transaction;
            }

            setHeaderFields(targetRec, header);
            if (todayDateText) {
                safeSetText(targetRec, 'trandate', todayDateText);
            }

            if (params.type_func === 'payment_to_vendor_prepayment') {
                setVendorPrepaymentPurchaseOrder(targetRec, purchaseOrderId);
                setVendorPrepaymentAccount(targetRec, payrRec);
                log.error('vendorPrepaymentAmount_1', vendorPrepaymentAmount)
                safeSetValue(targetRec, 'payment', vendorPrepaymentAmount, {
                    ignoreFieldChange: true
                });
            }

            if (params.type_func === 'payment_to_bill_payment') return;

            if (params.type_func === 'payment_to_bill_credit') {
                setBillCreditLine(targetRec, payrRec);
                return;
            }

            if (params.type_func === 'payment_to_check_tam_ung') {
                setCheckAdvanceLine(targetRec, payrRec);
                return;
            }

            if (params.type_func === 'payment_to_check_chi_khac') {
                setCheckOtherLines(targetRec, payrRec);
                return;
            }

            if (params.type_func === 'payment_to_journal_prepaid') {
                setPrepaidJournalLines(targetRec, payrRec);
                return;
            }

            if (params.type_func === 'payment_to_check_investment') {
                setInvestmentAccountLine(targetRec, payrRec);
                return;
            }

            if (params.type_func === 'payment_to_deposit_investment') {
                setInvestmentDepositLine(targetRec, payrRec);
                return;
            }

            if (params.type_func === 'payment_to_journal_invest_in') {
                setInvestmentJournalLines(targetRec, payrRec, 'in');
                return;
            }

            if (params.type_func === 'payment_to_journal_invest_out') {
                setInvestmentJournalLines(targetRec, payrRec, 'out');
                return;
            }

            if (params.type_func === 'payment_to_expense_report') {
                setExpenseReportLines(targetRec, payrRec);
                return;
            }

            const useItem = targetRec.type === 'vendorbill';
            setTransactionLines(targetRec, payrRec, useItem ? 'item' : 'expense');
        }

        function getPaymentRequestSource(payrRec) {
            const purchaseOrder = payrRec.getValue('custrecord_scv_payment_po');
            return {
                purchaseOrder,
                purchaseRequisition: payrRec.getValue('custrecord_scv_payreq_pr') || getPurchaseOrderRequisition(purchaseOrder),
                purchaseContract: payrRec.getValue('custrecord_scv_payment_pc'),
                salesContract: payrRec.getValue('custrecord_scv_payment_sc')
            };
        }

        function getPurchaseOrderRequisition(purchaseOrderId) {
            if (!purchaseOrderId) return '';

            const bodyFields = ['custbody_scv_purchase_requisition', 'custbody_scv_pr_created_from'];
            for (let i = 0; i < bodyFields.length; i++) {
                const value = lookupTransactionField(purchaseOrderId, bodyFields[i]);
                if (value) return value;
            }

            try {
                let purchaseRequisition = '';
                search.create({
                    type: search.Type.PURCHASE_ORDER,
                    filters: [
                        ['internalid', 'anyof', purchaseOrderId],
                        'AND',
                        ['mainline', 'is', 'F'],
                        'AND',
                        ['custcol_scv_purchase_requisition', 'noneof', '@NONE@']
                    ],
                    columns: ['custcol_scv_purchase_requisition']
                }).run().each(result => {
                    purchaseRequisition = result.getValue('custcol_scv_purchase_requisition');
                    return false;
                });
                return purchaseRequisition;
            } catch (e) {
                log.debug('getPurchaseOrderRequisition line lookup failed', e.message || e);
                return '';
            }
        }

        function lookupTransactionField(transactionId, fieldId) {
            try {
                const fields = search.lookupFields({
                    type: search.Type.TRANSACTION,
                    id: transactionId,
                    columns: [fieldId]
                });
                return firstValue(fields[fieldId]);
            } catch (e) {
                return '';
            }
        }

        function readHeader(payrRec) {
            const values = {};
            Object.keys(HEADER_MAP).forEach(targetField => {
                const sourceField = HEADER_MAP[targetField];
                if (!sourceField) return;
                let value = payrRec.getValue(sourceField);
                if (Array.isArray(value)) value = value[0] || '';
                values[targetField] = value;
            });
            return values;
        }

        function setCheckAdvanceLine(targetRec, payrRec) {
            const amount = payrRec.getValue('custrecord_scv_payment_amount');
            const memo = payrRec.getValue('custrecord_scv_payment_memo');
            const department = payrRec.getValue('custrecord_scv_payment_department');
            setExpenseLine(targetRec, 'expense', 0, {
                account: '133',
                amount,
                taxcode: '5',
                taxrate1: '0.0%',
                tax1amt: 0,
                grossamt: amount,
                memo,
                department
            });
            safeSetValue(targetRec, 'usertotal', amount);
        }

        function setBillCreditLine(targetRec, payrRec) {
            const amount = payrRec.getValue('custrecord_scv_payment_amount');
            setExpenseLine(targetRec, 'expense', 0, {
                account: DEFAULT_BILL_CREDIT_ACCOUNT,
                amount,
                taxcode: DEFAULT_TAX_CODE,
                memo: payrRec.getValue('custrecord_scv_payment_memo'),
                department: payrRec.getValue('custrecord_scv_payment_department')
            });
            safeSetValue(targetRec, 'usertotal', amount);
        }

        function setCheckOtherLines(targetRec, payrRec) {
            const lineCount = payrRec.getLineCount({sublistId: DETAIL_SUBLIST});
            if (!lineCount) {
                const amount = payrRec.getValue('custrecord_scv_payment_amount');
                setExpenseLine(targetRec, 'expense', 0, {
                    account: getPaymentTypeAccount(payrRec),
                    amount,
                    grossamt: amount,
                    memo: payrRec.getValue('custrecord_scv_payment_memo'),
                    department: payrRec.getValue('custrecord_scv_payment_department')
                });
                safeSetValue(targetRec, 'usertotal', amount);
                return;
            }

            let total = 0;
            for (let line = 0; line < lineCount; line++) {
                const grossAmount = getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_gr_amt', line);
                total += toNumber(grossAmount);
                setExpenseLine(targetRec, 'expense', line, {
                    account: getExpenseAccount(payrRec, line),
                    amount: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_amt', line),
                    taxcode: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_taxcode', line),
                    taxrate1: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_taxrate', line),
                    tax1amt: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_taxamt', line),
                    grossamt: grossAmount,
                    memo: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_des', line),
                    department: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_department', line) || payrRec.getValue('custrecord_scv_payment_department'),
                    class: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_class', line),
                    custcol_scv_payr_detail: getPayrLineValue(payrRec, 'id', line)
                });
            }
            safeSetValue(targetRec, 'usertotal', total);
        }

        function setExpenseReportLines(targetRec, payrRec) {
            const lineCount = payrRec.getLineCount({sublistId: DETAIL_SUBLIST});
            const headerDepartment = payrRec.getValue('custrecord_scv_payment_department');

            for (let line = 0; line < lineCount; line++) {
                setExpenseLine(targetRec, 'expense', line, {
                    expenseaccount: getExpenseReportAccount(payrRec, line),
                    expensedate: new Date(),
                    amount: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_amt', line),
                    taxcode: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_taxcode', line),
                    taxrate1: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_taxrate', line),
                    tax1amt: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_taxamt', line),
                    grossamt: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_gr_amt', line),
                    memo: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_des', line),
                    department: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_department', line) || headerDepartment,
                    custcol_scv_invoice_serial: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_inv_serial', line),
                    custcol_scv_invoice_number: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_invoice_number', line),
                    custcol_scv_invoice_date: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_invoice_date', line),
                    custcol_scv_entity_name: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_entity_name', line),
                    custcol_scv_invoice_taxreg: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_entity_tax', line),
                    custcol_scv_entity_address: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_entity_addr', line),
                    class: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_class', line),
                    custcol_scv_payr_detail: getPayrLineValue(payrRec, 'id', line)
                });
            }
        }

        function setPrepaidJournalLines(targetRec, payrRec) {
            const creditAccount = getPaymentTypeDefaultAccount(payrRec);
            log.debug('creditAccount', creditAccount)
            const entity = firstValue(payrRec.getValue('custrecord_scv_payment_entity'));
            const headerDepartment = payrRec.getValue('custrecord_scv_payment_department');
            const lineCount = payrRec.getLineCount({sublistId: DETAIL_SUBLIST});

            let jLine = 0;
            for (let line = 0; line < lineCount; line++) {
                const debitAccount = getItemExpenseAccount(payrRec, line);
                const amount = getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_amt', line);
                const grossAmount = getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_gr_amt', line);
                const memo = getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_des', line);
                const department = getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_department', line) || headerDepartment;
                const cls = getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_class', line);
                const detailId = getPayrLineValue(payrRec, 'id', line);

                setExpenseLine(targetRec, 'line', jLine, {
                    account: debitAccount,
                    debit: amount,
                    taxcode: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_taxcode', line),
                    taxrate1: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_taxrate', line),
                    tax1amt: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_taxamt', line),
                    grossamt: grossAmount,
                    memo,
                    entity,
                    department,
                    class: cls,
                    custcol_scv_invoice_serial: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_inv_serial', line),
                    custcol_scv_invoice_number: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_invoice_number', line),
                    custcol_scv_invoice_date: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_invoice_date', line),
                    custcol_scv_entity_name: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_entity_name', line),
                    custcol_scv_invoice_taxreg: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_entity_tax', line),
                    custcol_scv_entity_address: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_entity_addr', line),
                    custcol_scv_payr_detail: detailId
                });
                jLine++;

                setExpenseLine(targetRec, 'line', jLine, {
                    account: creditAccount,
                    credit: grossAmount,
                    memo,
                    entity,
                    department,
                    class: cls,
                    custcol_scv_payr_detail: detailId
                });
                jLine++;
            }
        }

        function setInvestmentAccountLine(targetRec, payrRec) {
            const lineCount = payrRec.getLineCount({sublistId: DETAIL_SUBLIST});
            const account = getPaymentTypeAccountSafe(payrRec);
            const customer = firstValue(payrRec.getValue('custrecord_scv_payment_entity'));
            const headerDepartment = payrRec.getValue('custrecord_scv_payment_department');
            log.debug('Investment Check line prefill', {
                payrId: payrRec.id,
                lineCount,
                account,
                customer,
                headerDepartment
            });

            if (!lineCount) {
                const amount = payrRec.getValue('custrecord_scv_payment_amount');
                setExpenseLine(targetRec, 'expense', 0, {
                    account,
                    amount,
                    taxcode: '5',
                    taxrate1: '0.0%',
                    tax1amt: 0,
                    grossamt: amount,
                    memo: payrRec.getValue('custrecord_scv_payment_memo'),
                    customer,
                    department: headerDepartment
                });
                safeSetValue(targetRec, 'usertotal', amount);
                return;
            }

            let total = 0;
            for (let line = 0; line < lineCount; line++) {
                const grossAmount = getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_gr_amt', line);
                total += toNumber(grossAmount);
                setInvestmentCheckExpenseLine(targetRec, line, {
                    account,
                    amount: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_amt', line),
                    taxcode: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_taxcode', line) || DEFAULT_TAX_CODE,
                    taxrate1: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_taxrate', line),
                    tax1amt: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_taxamt', line),
                    grossamt: grossAmount,
                    memo: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_des', line),
                    customer,
                    department: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_department', line) || headerDepartment,
                    class: getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_class', line),
                    custcol_scv_payr_detail: getPayrLineValue(payrRec, 'id', line)
                });
            }
            safeSetValue(targetRec, 'usertotal', total);
        }

        function getPaymentTypeAccountSafe(payrRec) {
            try {
                return getPaymentTypeAccount(payrRec);
            } catch (e) {
                log.debug('getPaymentTypeAccountSafe failed', e.message || e);
                return '';
            }
        }

        function setInvestmentCheckExpenseLine(targetRec, line, values) {
            try {
                targetRec.insertLine({sublistId: 'expense', line});
                Object.keys(values).forEach(fieldId => {
                    safeSetSublistValue(targetRec, 'expense', fieldId, line, values[fieldId]);
                });
            } catch (e) {
                log.error('setInvestmentCheckExpenseLine failed', e.message || e);
            }
        }

        function setInvestmentDepositLine(targetRec, payrRec) {
            const amount = payrRec.getValue('custrecord_scv_payment_amount');
            setExpenseLine(targetRec, 'other', 0, {
                account: getPaymentTypeAccount(payrRec),
                entity: firstValue(payrRec.getValue('custrecord_scv_payment_entity')),
                amount,
                memo: payrRec.getValue('custrecord_scv_payment_memo')
            });
        }

        function setInvestmentJournalLines(targetRec, payrRec, direction) {
            const amount = payrRec.getValue('custrecord_scv_payment_amount');
            const memo = payrRec.getValue('custrecord_scv_payment_memo');
            const entity = firstValue(payrRec.getValue('custrecord_scv_payment_entity'));
            const department = payrRec.getValue('custrecord_scv_payment_department');
            const projectId = firstValue(payrRec.getValue('cseg_inv_portfolio'));
            const projectAccount = getProjectAccount(payrRec);
            const typeAccount = getPaymentTypeAccountSafe(payrRec);
            const lineCount = payrRec.getLineCount({sublistId: DETAIL_SUBLIST});
            if (!lineCount) {
                const debitAccount = direction === 'in' ? projectAccount : typeAccount;
                const creditAccount = direction === 'in' ? typeAccount : projectAccount;

                setInvestmentJournalLine(targetRec, 0, {
                    account: debitAccount,
                    debit: amount,
                    memo,
                    entity,
                    department,
                    cseg_inv_portfolio: projectId
                });
                setInvestmentJournalLine(targetRec, 1, {
                    account: creditAccount,
                    credit: amount,
                    memo,
                    entity,
                    department,
                    cseg_inv_portfolio: projectId
                });
                return;
            }

            let targetLine = 0;
            for (let line = 0; line < lineCount; line++) {
                const lineAmount = getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_amt', line);
                const lineMemo = getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_des', line) || memo;
                const lineDepartment = getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_department', line) || department;
                const lineClass = getPayrLineValue(payrRec, 'custrecord_scv_pay_detail_class', line);
                const detailId = getPayrLineValue(payrRec, 'id', line);
                const debitAccount = direction === 'in' ? projectAccount : typeAccount;
                const creditAccount = direction === 'in' ? typeAccount : projectAccount;

                setInvestmentJournalLine(targetRec, targetLine, {
                    account: debitAccount,
                    debit: lineAmount,
                    memo: lineMemo,
                    entity,
                    department: lineDepartment,
                    class: lineClass,
                    cseg_inv_portfolio: projectId,
                    custcol_scv_payr_detail: detailId
                });
                targetLine++;

                setInvestmentJournalLine(targetRec, targetLine, {
                    account: creditAccount,
                    credit: lineAmount,
                    memo: lineMemo,
                    entity,
                    department: lineDepartment,
                    class: lineClass,
                    cseg_inv_portfolio: projectId,
                    custcol_scv_payr_detail: detailId
                });
                targetLine++;
            }
        }

        function setInvestmentJournalLine(targetRec, line, values) {
            try {
                targetRec.insertLine({sublistId: 'line', line});
                Object.keys(values).forEach(fieldId => {
                    safeSetSublistValue(targetRec, 'line', fieldId, line, values[fieldId]);
                });
            } catch (e) {
                log.error('setInvestmentJournalLine failed', e.message || e);
            }
        }

        function setExpenseLine(targetRec, sublistId, line, values) {
            Object.keys(values).forEach(fieldId => {
                safeSetSublistValue(targetRec, sublistId, fieldId, line, values[fieldId]);
            });
        }

        function setHeaderFields(targetRec, values) {
            Object.keys(values).forEach(fieldId => {
                safeSetValue(targetRec, fieldId, values[fieldId]);
            });
        }

        function getTodayDateText() {
            const now = new Date();
            const vietnamOffsetMinutes = 7 * 60;
            const vietnamNow = new Date(now.getTime() + vietnamOffsetMinutes * 60 * 1000);
            const year = vietnamNow.getUTCFullYear();
            const month = vietnamNow.getUTCMonth();
            const date = vietnamNow.getUTCDate();

            return format.format({
                value: new Date(Date.UTC(year, month, date, 12, 0, 0)),
                type: format.Type.DATE
            });
        }

        function isTodayDateTransaction(typeFunc) {
            return [
                'payment_to_journal_prepaid',
                'payment_to_check_tam_ung',
                'payment_to_check_chi_khac',
                'payment_to_check_investment'
            ].includes(typeFunc);
        }

        function setVendorPrepaymentPurchaseOrder(targetRec, purchaseOrderId) {
            safeSetValue(targetRec, 'purchaseorder', purchaseOrderId, {
                ignoreFieldChange: false
            });
        }

        function setVendorPrepaymentAccount(targetRec, payrRec) {
            if (targetRec.getValue('prepaymentaccount')) return;

            const prepaymentAccount = getDefaultVendorPrepaymentAccount(payrRec);
            safeSetValue(targetRec, 'prepaymentaccount', prepaymentAccount);
        }

        function getDefaultVendorPrepaymentAccount(payrRec) {
            try {
                const tempRec = record.create({
                    type: record.Type.VENDOR_PREPAYMENT,
                    isDynamic: true
                });
                const sourceFields = [
                    ['entity', 'custrecord_scv_payment_entity'],
                    ['subsidiary', 'custrecord_scv_payr_subs'],
                    ['currency', 'custrecord_scv_payment_currency'],
                    ['trandate', 'custrecord_scv_payment_date'],
                    ['purchaseorder', 'custrecord_scv_payment_po']
                ];
                sourceFields.forEach(fieldMap => {
                    const value = payrRec.getValue(fieldMap[1]);
                    if (value !== null && value !== undefined && value !== '') {
                        tempRec.setValue({
                            fieldId: fieldMap[0],
                            value
                        });
                    }
                });
                return tempRec.getValue('prepaymentaccount');
            } catch (e) {
                log.debug('getDefaultVendorPrepaymentAccount failed', e.message || e);
                return '';
            }
        }

        function setTransactionLines(targetRec, payrRec, sublistId) {
            const map = LINE_MAP[sublistId];
            const lineCount = payrRec.getLineCount({sublistId: DETAIL_SUBLIST});
            for (let line = 0; line < lineCount; line++) {
                Object.keys(map).forEach(targetField => {
                    let value = map[targetField] === 'account'
                        ? getExpenseAccount(payrRec, line)
                        : getPayrLineValue(payrRec, map[targetField], line);
                    if (targetField === 'department' && !value) {
                        value = payrRec.getValue('custrecord_scv_payment_department');
                    }
                    safeSetSublistValue(targetRec, sublistId, targetField, line, value);
                });
            }
        }

        function getPayrLineValue(payrRec, fieldId, line) {
            if (fieldId === 'id') {
                return payrRec.getSublistValue({sublistId: DETAIL_SUBLIST, fieldId: 'id', line});
            }
            return payrRec.getSublistValue({sublistId: DETAIL_SUBLIST, fieldId, line});
        }

        function getExpenseAccount(payrRec, line) {
            const accountFromType = getPaymentTypeAccount(payrRec);
            if (accountFromType) return accountFromType;

            return getItemExpenseAccount(payrRec, line);
        }

        function getExpenseReportAccount(payrRec, line) {
            try {
                const accountFromType = getPaymentTypeAccount(payrRec);
                if (accountFromType) return accountFromType;
            } catch (e) {
                // The payment-type account field may not yet be deployed in
                // every NetSuite account. Keep Expense Report creation usable.
                log.debug('getExpenseReportAccount payment type lookup failed', e.message || e);
            }

            return getItemExpenseAccount(payrRec, line);
        }

        function getItemExpenseAccount(payrRec, line) {
            const itemId = payrRec.getSublistValue({
                sublistId: DETAIL_SUBLIST,
                fieldId: 'custrecord_scv_pay_detail_item',
                line
            });
            if (!itemId) return '';
            try {
                const fields = search.lookupFields({
                    type: search.Type.ITEM,
                    id: itemId,
                    columns: ['expenseaccount']
                });
                return firstValue(fields.expenseaccount);
            } catch (e) {
                log.debug('getItemExpenseAccount lookup failed', e.message || e);
                return '';
            }
        }

        function getProjectAccount(payrRec) {
            const projectId = firstValue(payrRec.getValue('cseg_inv_portfolio'));
            log.debug('getProjectAccount project from PayR', {
                payrId: payrRec.id,
                projectId
            });
            if (!projectId) return '';
            try {
                const projectRec = record.load({
                    type: 'customrecord_cseg_inv_portfolio',
                    id: projectId
                });
                const projectTypeId = projectRec.getValue('custrecord_scv_proj_type');
                log.debug('getProjectAccount project type from portfolio', {
                    projectId,
                    projectTypeId
                });
                if (!projectTypeId) return '';
                const projectTypeRec = record.load({
                    type: 'customrecord_scv_project_type',
                    id: projectTypeId
                });
                const account = projectTypeRec.getValue('custrecord_scv_projtype_account') || '';
                log.debug('getProjectAccount account from project type', {
                    projectId,
                    projectTypeId,
                    account
                });
                return account;
            } catch (e) {
                log.debug('getProjectAccount lookup failed', e.message || e);
                return '';
            }
        }

        function firstValue(value) {
            if (Array.isArray(value)) return (value[0] && (value[0].value || value[0])) || '';
            return value || '';
        }

        function getPaymentTypeAccount(payrRec) {
            const typeId = payrRec.getValue('custrecord_scv_payment_type');
            if (!typeId) return '';
            const paymentTypeRec = record.load({
                type: 'customrecordcustrecord_scv_payment_list',
                id: typeId
            });
            return paymentTypeRec.getValue('custrecord_scv_payr_type_dft_acc') || '';
        }

        function getPaymentTypeDefaultAccount(payrRec) {
            const typeId = payrRec.getValue('custrecord_scv_payment_type');
            if (!typeId) return '';
            const fields = search.lookupFields({
                type: 'customrecordcustrecord_scv_payment_list',
                id: typeId,
                columns: ['custrecord_scv_payr_type_dft_acc']
            });
            return (fields.custrecord_scv_payr_type_dft_acc || [])[0]?.value || '';
        }

        function toNumber(value) {
            const number = parseFloat(value || 0);
            return isNaN(number) ? 0 : number;
        }

        function safeSetValue(rec, fieldId, value, options = {}) {
            if (value === null || value === undefined || value === '') return;
            try {
                const setValueOptions = {
                    fieldId,
                    value
                };
                if (Object.prototype.hasOwnProperty.call(options, 'ignoreFieldChange')) {
                    setValueOptions.ignoreFieldChange = options.ignoreFieldChange;
                }
                rec.setValue(setValueOptions);
            } catch (e) {
                log.debug('skip body field ' + fieldId, e.message || e);
            }
        }

        function safeSetText(rec, fieldId, text) {
            if (text === null || text === undefined || text === '') return;
            try {
                rec.setText({fieldId, text});
            } catch (e) {
                log.debug('skip body text field ' + fieldId, e.message || e);
            }
        }

        function safeSetSublistValue(rec, sublistId, fieldId, line, value) {
            if (value === null || value === undefined || value === '') return;
            try {
                rec.setSublistValue({sublistId, fieldId, line, value});
            } catch (e) {
                log.debug('skip line field ' + sublistId + '.' + fieldId, e.message || e);
            }
        }

        return {beforeLoad, beforeSubmit};
    });
