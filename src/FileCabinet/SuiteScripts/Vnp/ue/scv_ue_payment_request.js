/**
 * Noi dung: Payment Request buttons, numbering, and transaction back-reference.
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/cache', 'N/format', 'N/record', 'N/search', 'N/url', 'N/runtime', '../lib/scv_lib_create_payment_request'],
    (cache, format, record, search, url, runtime, libCreatePayr) => {

        const PAYR_RECORD = 'customrecord_scv_paymentrequest';
        const PAYR_DETAIL_RECORD = 'customrecord_scv_payment_detail';
        const DETAIL_SUBLIST = 'recmachcustrecord_scv_pay';
        const PAID_BY_PAYR_FIELD = 'custrecord_scv_payr_d_paid';
        const ACCRUAL_SOURCE_CACHE = 'scv_accrual_payr_source_lines';
        const ACCRUAL_SOURCE_CACHE_TTL = 900;

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

        const TIDT_RECORD = 'customrecord_scv_ttdt';
        const TIDT_FIELD = {
            REASON: 'custrecord_scv_ttdt_reason',
            PROJECT: 'custrecord_scv_ttdt_project',
            PROJECT_TYPE: 'custrecord_scv_ttdt_proj_type',
            QUANTITY: 'custrecord_scv_ttdt_quantity',
            UNIT_PRICE: 'custrecord_scv_ttdt_unit_price',
            TOTAL_PRICE: 'custrecord_scv_ttdt_total_price',
            RELATED_PAYR: 'custrecord_scv_related_payr'
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
                if (rec.type !== PAYR_RECORD) return;

                if (context.type === context.UserEventType.VIEW) {
                    reconcilePaymentRequestPaidAmount(rec);
                    addPaymentButtons(context.form, rec);
                    return;
                }

                if (context.type === context.UserEventType.CREATE) {
                    const params = context.request?.parameters || {};
                    if (params.type_func && (params.id_rec || params.cache_key)) {
                        prefillFromSource(rec, params);
                    }
                }
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
                const rec = context.type === context.UserEventType.DELETE ? context.oldRecord : context.newRecord;

                if (rec.type === PAYR_RECORD) {
                    if (context.type === context.UserEventType.DELETE) return;
                    ensurePaymentRequestNumberAfterSubmit(context);
                    updatePaymentRequestAmount(context);
                    updateAccrualSourceLines(context);
                    updateInvestmentInfoRelatedPayr(context);
                    return;
                }

                updatePaymentRequestFromTransaction(rec, context.type === context.UserEventType.DELETE);
            } catch (e) {
                log.error('afterSubmit Payment Request', e);
            }
        };

        function reconcilePaymentRequestPaidAmount(rec) {
            if (!rec.id) return;

            const paidAmount = getPaymentRequestPaidAmount(rec.id);
            if (toNumber(rec.getValue(FIELD.PAID_AMOUNT)) === paidAmount) return;

            record.submitFields({
                type: PAYR_RECORD,
                id: rec.id,
                values: {
                    [FIELD.PAID_AMOUNT]: paidAmount
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
            rec.setValue({
                fieldId: FIELD.PAID_AMOUNT,
                value: paidAmount,
                ignoreFieldChange: true
            });
        }

        function addPaymentButtons(form, rec) {
            const type = String(rec.getValue(FIELD.TYPE) || '');
            const status = String(rec.getValue(FIELD.STATUS) || '');
            const amount = toNumber(rec.getValue(FIELD.AMOUNT));
            const paidAmount = toNumber(rec.getValue(FIELD.PAID_AMOUNT));
            const hasRemaining = amount > paidAmount;

            addPlanActualBudgetButton(form, rec);

            if (status === STATUS.APPROVED && type === PAYMENT_TYPE.EMPLOYEE_ADVANCE && hasRemaining) {
                addRedirectButton(form, rec, 'custpage_scv_payr_check_advance', 'Check', 'check', 'payment_to_check_tam_ung', {check_recalc: 'T'});
            }

            if (status === STATUS.APPROVED && type === PAYMENT_TYPE.OTHER_PAYMENT && hasRemaining) {
                addRedirectButton(form, rec, 'custpage_scv_payr_check_other', 'Check', 'check', 'payment_to_check_chi_khac', {check_recalc: 'T'});
            }

            if (status === STATUS.APPROVED && type === PAYMENT_TYPE.VENDOR_PREPAYMENT && hasRemaining) {
                if (getPurchaseOrderType(rec.getValue('custrecord_scv_payment_po')) === '4') {
                    addRedirectButton(form, rec, 'custpage_scv_payr_bill_credit', 'Bill Credit', 'vendorcredit', 'payment_to_bill_credit');
                } else {
                    // purchaseorder is intentionally NOT passed as a URL param here: NetSuite
                    // applies URL-param field values client-side on page load and re-triggers
                    // native PO sourcing, which overwrites the 'payment' amount that
                    // prefillTransaction() sets from custrecord_scv_payment_amount. The PO is
                    // set server-side in prefillTransaction instead.
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
                    addRedirectButton(form, rec, 'custpage_scv_payr_invest_check', 'Check', 'check', 'payment_to_check_investment', {check_recalc: 'T'});
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

        function addPlanActualBudgetButton(form, rec) {
            const resolvedUrl = url.resolveScript({
                scriptId: 'customscript_scv_sl_rp_plan_actual',
                deploymentId: 'customdeploy_scv_sl_rp_plan_actual',
                params: {
                    rectype: rec.type,
                    recid: rec.id,
                    redirect: 'T',
                    typeFunc: 'create_budget_rp'
                }
            });
            form.addButton({
                id: 'custpage_btn_budget_rp',
                label: 'Budget Report',
                functionName: `window.location.replace("${resolvedUrl}")`
            });
        }

        function addRedirectButton(form, rec, id, label, recordType, typeFunc, extraParams = {}) {
            const params = {
                id_rec: rec.id,
                type_func: typeFunc
            };
            Object.keys(extraParams).forEach(paramId => {
                if (extraParams[paramId]) params[paramId] = extraParams[paramId];
            });
            const resolvedUrl = url.resolveRecord({
                recordType,
                recordId: null,
                isEditMode: true,
                params
            });
            form.addButton({
                id,
                label,
                functionName: `window.open("${resolvedUrl}")`
            });
        }

        // FDD (FIN) - Chức năng tạo Payment Request từ PC, PO
        const PO_ITEM_SUBLIST = 'item';
        const PC_ITEM_SUBLIST = 'item';
        const BILL_RELATED_TO_PO_SEARCH = 'customsearch_scv_bill_payr';

        function prefillFromSource(rec, params) {
            if (params.type_func === 'po_to_prepayment') {
                prefillFromPurchaseOrder(rec, params.id_rec, params.id_type || record.Type.PURCHASE_ORDER, 'prepayment');
            } else if (params.type_func === 'po_to_payable') {
                prefillFromPurchaseOrder(rec, params.id_rec, params.id_type || record.Type.PURCHASE_ORDER, 'payable');
            } else if (params.type_func === 'pc_to_payable') {
                prefillFromPurchaseContract(rec, params.id_rec, params.id_type);
            } else if (params.type_func === 'ttdt_to_investment_payr') {
                prefillFromInvestmentInfo(rec, params.id_rec, params.id_type || TIDT_RECORD, 'investment');
            } else if (params.type_func === 'ttdt_to_investment_payable') {
                prefillFromInvestmentInfo(rec, params.id_rec, params.id_type || TIDT_RECORD, 'payable');
            } else if (params.type_func === 'sl_accrual_payr') {
                prefillFromSuiteletPayload(rec, params.cache_key);
            }
        }

        function prefillFromSuiteletPayload(rec, cacheKey) {
            const payload = libCreatePayr.readCachedPayload(cacheKey);
            if (!payload) {
                log.error('Create PayR Suitelet payload not found', {cacheKey});
                return;
            }
            const header = payload.header || {};
            safeSetValue(rec, 'custrecord_scv_payment_ngycau', header.requestor);
            safeSetValue(rec, 'custrecord_scv_payment_department', header.department);
            safeSetValue(rec, FIELD.SUBSIDIARY, header.subsidiary);
            safeSetValue(rec, FIELD.TYPE, header.type);
            safeSetValue(rec, 'custrecord_scv_payment_ref_payr', header.refPayr);
            safeSetValue(rec, 'custrecord_scv_payment_entity', header.entity);
            safeSetValue(rec, 'custrecord_scv_payment_currency', header.currency);
            safeSetValue(rec, 'custrecord_scv_payment_exchangerate', header.exchangeRate);
            safeSetValue(rec, 'custrecord_scv_payment_amt', header.sumAmount);
            safeSetValue(rec, 'custrecord_scv_payment_amounttax', header.taxAmount);
            safeSetValue(rec, FIELD.AMOUNT, header.amount);
            safeSetValue(rec, 'custrecord_scv_payment_memo', header.memo);
            safeSetValue(rec, FIELD.DATE, parsePayloadDate(header.date));
            safeSetValue(rec, 'custrecord_scv_payment_method', header.paymentMethod);
            setSuiteletPayloadLines(rec, payload.lines || []);
            cacheAccrualSourceLines(header, payload.lines || []);
        }

        function setSuiteletPayloadLines(rec, lines) {
            lines.forEach((line, index) => {
                const lineNo = rec.getLineCount({sublistId: DETAIL_SUBLIST});
                try {
                    rec.insertLine({sublistId: DETAIL_SUBLIST, line: lineNo});
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_item', lineNo, line.item);
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_des', lineNo, line.description);
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_qty', lineNo, line.quantity);
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_rate', lineNo, line.rate);
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_amt', lineNo, line.amount);
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_taxcode', lineNo, line.taxCode);
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_taxrate', lineNo, line.taxRate);
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_taxamt', lineNo, line.taxAmount);
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_gr_amt', lineNo, line.grossAmount);
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_department', lineNo, line.department);
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_class', lineNo, line.expenseClass);
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_inv_serial', lineNo, line.invoiceSerial);
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_invoice_number', lineNo, line.invoiceNumber);
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_invoice_date', lineNo, parsePayloadDate(line.invoiceDate));
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_entity_tax', lineNo, line.invoiceTax);
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_entity_addr', lineNo, line.invoiceAddress);
                    safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_payr_d_related_trans', lineNo, line.relatedTransaction);
                } catch (e) {
                    log.error('Create PayR Suitelet set line failed', {
                        line: index,
                        sublistLine: lineNo,
                        message: e.message || e.toString()
                    });
                }
            });
        }

        function parsePayloadDate(value) {
            if (!value) return '';
            try {
                return libCreatePayr.parseDate(value);
            } catch (e) {
                log.debug('Create PayR Suitelet skip invalid date', {
                    value,
                    message: e.message || e.toString()
                });
                return '';
            }
        }

        function prefillFromPurchaseOrder(rec, poId, poType, mode) {
            const poRec = record.load({type: poType, id: poId});

            safeSetValue(rec, FIELD.TYPE, mode === 'prepayment' ? PAYMENT_TYPE.VENDOR_PREPAYMENT : PAYMENT_TYPE.PAYABLE_PAYMENT);
            safeSetValue(rec, 'custrecord_scv_payment_ngycau', poRec.getValue('custbody_scv_employee'));
            safeSetValue(rec, 'custrecord_scv_payment_department', poRec.getValue('department'));
            safeSetValue(rec, 'custrecord_scv_payment_entity', poRec.getValue('entity'));
            safeSetValue(rec, 'custrecord_scv_payment_currency', poRec.getValue('currency'));
            safeSetValue(rec, 'custrecord_scv_payment_exchangerate', poRec.getValue('exchangerate'));
            safeSetValue(rec, 'custrecord_scv_payment_memo', poRec.getValue('memo'));
            safeSetText(rec, FIELD.DATE, getTodayDateText());
            safeSetValue(rec, 'custrecord_scv_payr_subs', poRec.getValue('subsidiary'));
            safeSetValue(rec, FIELD.PO, poId);
            safeSetValue(rec, 'custrecord_scv_payreq_pr', getPurchaseOrderRequisition(poRec));
            safeSetValue(rec, 'custrecord_scv_payment_pc', poRec.getValue('custbody_scv_purchase_contract'));
            safeSetValue(rec, 'custrecord_scv_payment_sc', safeGetValue(poRec, 'custbody_scv_salescontract'));

            if (mode === 'prepayment') {
                copyPoItemLines(rec, poRec);
                return;
            }

            const bills = getBillsRelatedToPurchaseOrder(poId);
            setLinesFromBills(rec, bills);
            const relatedIds = bills.map(bill => bill.internalId).filter(Boolean);
            if (relatedIds.length) safeSetValue(rec, FIELD.RELATED, relatedIds);
        }

        function getPurchaseOrderRequisition(poRec) {
            const bodyFields = ['custbody_scv_purchase_requisition', 'custbody_scv_pr_created_from'];
            for (let i = 0; i < bodyFields.length; i++) {
                const value = safeGetValue(poRec, bodyFields[i]);
                if (value) return value;
            }

            const lineCount = poRec.getLineCount({sublistId: PO_ITEM_SUBLIST});
            for (let line = 0; line < lineCount; line++) {
                const value = safeGetSublistValue(poRec, {
                    sublistId: PO_ITEM_SUBLIST,
                    fieldId: 'custcol_scv_purchase_requisition',
                    line
                });
                if (value) return value;
            }
            return '';
        }

        function safeGetValue(rec, fieldId) {
            try {
                return firstValue(rec.getValue(fieldId));
            } catch (e) {
                return '';
            }
        }

        function safeGetSublistValue(rec, options) {
            try {
                return firstValue(rec.getSublistValue(options));
            } catch (e) {
                return '';
            }
        }

        function copyPoItemLines(rec, poRec) {
            const map = {
                custrecord_scv_pay_detail_item: 'item',
                custrecord_scv_pay_detail_des: 'description',
                custrecord_scv_pay_detail_qty: 'quantity',
                custrecord_scv_pay_detail_rate: 'rate',
                custrecord_scv_pay_detail_amt: 'amount',
                custrecord_scv_pay_detail_taxcode: 'taxcode',
                custrecord_scv_pay_detail_taxrate: 'taxrate1',
                custrecord_scv_pay_detail_taxamt: 'tax1amt',
                custrecord_scv_pay_detail_gr_amt: 'grossamt'
            };
            const lineCount = poRec.getLineCount({sublistId: PO_ITEM_SUBLIST});
            for (let i = 0; i < lineCount; i++) {
                rec.insertLine({sublistId: DETAIL_SUBLIST, line: i});
                Object.keys(map).forEach(targetField => {
                    const value = poRec.getSublistValue({sublistId: PO_ITEM_SUBLIST, fieldId: map[targetField], line: i});
                    safeSetSublistValue(rec, DETAIL_SUBLIST, targetField, i, normalizePayrLineValue(targetField, value));
                });
            }
        }

        function getBillsRelatedToPurchaseOrder(poId) {
            const rows = [];
            try {
                const loadedSearch = search.load({id: BILL_RELATED_TO_PO_SEARCH});
                loadedSearch.filters.push(search.createFilter({
                    name: 'createdfrom',
                    operator: search.Operator.ANYOF,
                    values: poId
                }));
                const columns = loadedSearch.columns;
                const colItem = findColumnByLabel(columns, 'ItemID');
                const colDesc = findColumnByLabel(columns, 'Description');
                const colUnit = findColumnByLabel(columns, 'Unit');
                const colAmt = findColumnByLabel(columns, 'AmountRemaining');
                const colInvNo = findColumnByLabel(columns, 'InvoiceNumber');
                const colInvDate = findColumnByLabel(columns, 'InvoiceDate');
                const colInvSerial = findColumnByLabel(columns, 'InvoiceSerial');
                const colInternalId = findColumnByLabel(columns, 'InternalID');

                loadedSearch.run().each(result => {
                    rows.push({
                        item: colItem ? result.getValue(colItem) : '',
                        description: colDesc ? result.getValue(colDesc) : '',
                        unit: colUnit ? result.getValue(colUnit) : '',
                        amountRemaining: colAmt ? result.getValue(colAmt) : 0,
                        invoiceNumber: colInvNo ? result.getValue(colInvNo) : '',
                        invoiceDate: colInvDate ? result.getValue(colInvDate) : '',
                        invoiceSerial: colInvSerial ? result.getValue(colInvSerial) : '',
                        internalId: colInternalId ? result.getValue(colInternalId) : result.id
                    });
                    return true;
                });
            } catch (e) {
                log.error('getBillsRelatedToPurchaseOrder failed', e);
            }
            return rows;
        }

        function setLinesFromBills(rec, bills) {
            bills.forEach((bill, index) => {
                rec.insertLine({sublistId: DETAIL_SUBLIST, line: index});
                safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_item', index, bill.item);
                safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_des', index, bill.description);
                safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_unit', index, bill.unit);
                safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_qty', index, 1);
                safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_rate', index, normalizePayrAmountValue(bill.amountRemaining));
                safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_amt', index, normalizePayrAmountValue(bill.amountRemaining));
                safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_taxcode', index, '5');
                safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_taxrate', index, '0%');
                safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_taxamt', index, 0);
                safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_gr_amt', index, normalizePayrAmountValue(bill.amountRemaining));
                safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_invoice_number', index, bill.invoiceNumber);
                safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_invoice_date', index, bill.invoiceDate);
                safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_inv_serial', index, bill.invoiceSerial);
            });
        }

        function normalizePayrLineValue(fieldId, value) {
            const amountFields = [
                'custrecord_scv_pay_detail_rate',
                'custrecord_scv_pay_detail_amt',
                'custrecord_scv_pay_detail_taxamt',
                'custrecord_scv_pay_detail_gr_amt'
            ];
            return amountFields.indexOf(fieldId) === -1 ? value : normalizePayrAmountValue(value);
        }

        function normalizePayrAmountValue(value) {
            if (value === null || value === undefined || value === '') return '';
            const number = Number(value);
            if (isNaN(number)) return toPlainNumberString(value);
            return toPlainNumberString(number.toFixed(10).replace(/\.?0+$/, ''));
        }

        function prefillFromPurchaseContract(rec, pcId, pcType) {
            if (!pcType) {
                log.error('prefillFromPurchaseContract missing id_type', {pcId});
                return;
            }
            const pcRec = record.load({type: pcType, id: pcId});

            safeSetValue(rec, FIELD.TYPE, PAYMENT_TYPE.PAYABLE_PAYMENT);
            safeSetValue(rec, 'custrecord_scv_payment_entity', pcRec.getValue('entity'));
            safeSetValue(rec, 'custrecord_scv_payment_ngycau', runtime.getCurrentUser().id);
            safeSetValue(rec, 'custrecord_scv_payment_department', pcRec.getValue('department'));
            safeSetValue(rec, 'custrecord_scv_payment_currency', pcRec.getValue('currency'));
            safeSetValue(rec, 'custrecord_scv_payment_exchangerate', pcRec.getValue('exchangerate'));
            safeSetValue(rec, 'custrecord_scv_payment_memo', pcRec.getValue('memo'));
            safeSetValue(rec, FIELD.DATE, new Date());
            safeSetValue(rec, 'custrecord_scv_payr_subs', pcRec.getValue('subsidiary'));
            safeSetValue(rec, 'custrecord_scv_payment_pc', pcId);
            safeSetValue(rec, 'custrecord_scv_payment_sc', safeGetValue(pcRec, 'custbody_scv_salescontract'));

            copyPcItemLines(rec, pcRec);
        }

        function copyPcItemLines(rec, pcRec) {
            const map = {
                custrecord_scv_pay_detail_item: 'item',
                custrecord_scv_pay_detail_des: 'description',
                custrecord_scv_pay_detail_unit: 'units',
                custrecord_scv_pay_detail_qty: 'custcol_scv_quantity',
                custrecord_scv_pay_detail_rate: 'custcol_scv_rate_custom',
                custrecord_scv_pay_detail_amt: 'custcol_scv_amt_custom',
                custrecord_scv_pay_detail_taxcode: 'custcol_scv_sumtrans_line_taxcode',
                custrecord_scv_pay_detail_taxrate: 'custcol_scv_sumtrans_line_taxrate',
                custrecord_scv_pay_detail_taxamt: 'custcol_scv_tax_amt_custom',
                custrecord_scv_pay_detail_gr_amt: 'custcol_scv_gross_amt_custom'
            };
            const lineCount = pcRec.getLineCount({sublistId: PC_ITEM_SUBLIST});
            for (let i = 0; i < lineCount; i++) {
                rec.insertLine({sublistId: DETAIL_SUBLIST, line: i});
                Object.keys(map).forEach(targetField => {
                    const value = pcRec.getSublistValue({sublistId: PC_ITEM_SUBLIST, fieldId: map[targetField], line: i});
                    safeSetSublistValue(rec, DETAIL_SUBLIST, targetField, i, value);
                });
            }
        }

        function prefillFromInvestmentInfo(rec, ttdtId, ttdtType, mode) {
            const ttdtRec = record.load({type: ttdtType, id: ttdtId});
            const projectId = ttdtRec.getValue(TIDT_FIELD.PROJECT);
            const projectFields = getProjectFields(projectId);
            const reasonText = ttdtRec.getText(TIDT_FIELD.REASON) || ttdtRec.getValue(TIDT_FIELD.REASON);
            const relatedPayr = ttdtRec.getValue(TIDT_FIELD.RELATED_PAYR);
            const entityId = firstValue(projectFields.custrecord_scv_proj_entity)
                || (mode === 'investment' ? getRelatedPaymentRequestEntity(relatedPayr) : '');
            log.error('entityId', entityId)
            safeSetValue(rec, FIELD.TYPE, PAYMENT_TYPE.INVESTMENT);
            safeSetValue(rec, FIELD.DETAIL_TYPE, ttdtRec.getValue(TIDT_FIELD.REASON));
            safeSetValue(rec, 'custrecord_scv_payment_ngycau', runtime.getCurrentUser().id);
            safeSetValue(rec, 'custrecord_scv_payment_department', runtime.getCurrentUser().department);
            safeSetValue(rec, FIELD.SUBSIDIARY, firstValue(projectFields.custrecord_scv_proj_sub));
            safeSetValue(rec, 'custrecord_scv_payment_entity', entityId);
            safeSetValue(rec, 'custrecord_scv_payment_currency', '1');
            safeSetValue(rec, 'custrecord_scv_payment_exchangerate', 1);
            safeSetValue(rec, 'custrecord_scv_payment_memo', reasonText);
            safeSetValue(rec, FIELD.DATE, new Date());
            safeSetValue(rec, 'custrecord_scv_payr_ttdt', ttdtId);
            safeSetValue(rec, 'cseg_inv_portfolio', projectId);
            safeSetValue(rec, FIELD.RELATED, relatedPayr);

            setInvestmentInfoLine(rec, ttdtRec, projectFields, mode, reasonText);
        }

        function setInvestmentInfoLine(rec, ttdtRec, projectFields, mode, reasonText) {
            const quantity = toNumber(ttdtRec.getValue(TIDT_FIELD.QUANTITY)) || 1;
            const totalPrice = toNumber(ttdtRec.getValue(TIDT_FIELD.TOTAL_PRICE));
            const unitPrice = toNumber(ttdtRec.getValue(TIDT_FIELD.UNIT_PRICE)) || totalPrice;
            const totalPriceText = toPlainNumberString(totalPrice);
            const unitPriceText = toPlainNumberString(unitPrice);
            const itemId = mode === 'payable'
                ? getInvestmentProjectTypeItem(ttdtRec, projectFields)
                : getPaymentTypeDefaultItem(rec.getValue(FIELD.TYPE));

            rec.insertLine({sublistId: DETAIL_SUBLIST, line: 0});
            safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_item', 0, itemId);
            safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_des', 0, reasonText);
            safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_qty', 0, quantity);
            safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_rate', 0, unitPriceText);
            safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_amt', 0, totalPriceText);
            safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_taxcode', 0, '5');
            safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_taxrate', 0, '0%');
            safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_taxamt', 0, 0);
            safeSetSublistValue(rec, DETAIL_SUBLIST, 'custrecord_scv_pay_detail_gr_amt', 0, totalPriceText);
        }

        function getProjectFields(projectId) {
            if (!projectId) return {};
            try {
                return search.lookupFields({
                    type: 'customrecord_cseg_inv_portfolio',
                    id: projectId,
                    columns: ['custrecord_scv_proj_sub', 'custrecord_scv_proj_entity', 'custrecord_scv_proj_type']
                });
            } catch (e) {
                log.debug('getProjectFields failed', e.message || e);
                return {};
            }
        }

        function getRelatedPaymentRequestEntity(relatedPayr) {
            const ids = Array.isArray(relatedPayr) ? relatedPayr : (relatedPayr ? [relatedPayr] : []);
            const payrId = firstValue(ids);
            if (!payrId) return '';
            try {
                const fields = search.lookupFields({
                    type: PAYR_RECORD,
                    id: payrId,
                    columns: ['custrecord_scv_payment_entity']
                });
                return firstValue(fields.custrecord_scv_payment_entity);
            } catch (e) {
                log.debug('getRelatedPaymentRequestEntity failed', e.message || e);
                return '';
            }
        }

        function getInvestmentProjectTypeItem(ttdtRec, projectFields) {
            const projectTypeId = ttdtRec.getValue(TIDT_FIELD.PROJECT_TYPE) || firstValue(projectFields.custrecord_scv_proj_type);
            if (!projectTypeId) return '';
            try {
                const fields = search.lookupFields({
                    type: 'customrecord_scv_proj_type',
                    id: projectTypeId,
                    columns: ['custrecord_scv_projtype_item']
                });
                return firstValue(fields.custrecord_scv_projtype_item);
            } catch (e) {
                log.debug('getInvestmentProjectTypeItem failed', e.message || e);
                return '';
            }
        }

        function getPaymentTypeDefaultItem(paymentTypeId) {
            try {
                const fields = search.lookupFields({
                    type: 'customrecordcustrecord_scv_payment_list',
                    id: paymentTypeId,
                    columns: ['custrecord_scv_payr_type_dft_item']
                });
                return firstValue(fields.custrecord_scv_payr_type_dft_item);
            } catch (e) {
                log.debug('getPaymentTypeDefaultItem failed', e.message || e);
                return '';
            }
        }

        function findColumnByLabel(columns, label) {
            return (columns || []).find(col => col.label === label);
        }

        function safeSetValue(rec, fieldId, value) {
            if (value === null || value === undefined || value === '') return;
            try {
                rec.setValue({fieldId, value});
            } catch (e) {
                log.debug('skip field ' + fieldId, e.message || e);
            }
        }

        function safeSetText(rec, fieldId, text) {
            if (text === null || text === undefined || text === '') return;
            try {
                rec.setText({fieldId, text});
            } catch (e) {
                log.debug('skip text field ' + fieldId, e.message || e);
            }
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

        function safeSetSublistValue(rec, sublistId, fieldId, line, value) {
            if (value === null || value === undefined || value === '') return;
            try {
                rec.setSublistValue({sublistId, fieldId, line, value});
            } catch (e) {
                log.debug('skip line field ' + sublistId + '.' + fieldId, e.message || e);
            }
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
            record.submitFields({
                type: PAYR_RECORD,
                id: rec.id,
                values: {
                    autoname: false,
                    name: numberInfo.nextName
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
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
            const paymentAmount = rec.getValue(FIELD.AMOUNT);

            if (!rec.id) return;

            if (paymentAmount !== null && paymentAmount !== undefined && paymentAmount !== '') return;

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

        function cacheAccrualSourceLines(header, lines) {
            const sourcePayrId = header.refPayr;
            const requestorId = header.requestor || runtime.getCurrentUser().id;
            const sourceDetailIds = Array.from(new Set((lines || []).map(line => String(line.sourceDetailId || '')).filter(Boolean)));
            if (!sourcePayrId || !requestorId || !sourceDetailIds.length) return;

            getAccrualSourceCache().put({
                key: getAccrualSourceCacheKey(requestorId, sourcePayrId),
                value: JSON.stringify({
                    sourcePayrId: String(sourcePayrId),
                    amount: toNumber(header.amount),
                    lineCount: (lines || []).length,
                    sourceDetailIds
                }),
                ttl: ACCRUAL_SOURCE_CACHE_TTL
            });
        }

        function readAccrualSourceLineIds(rec) {
            const sourcePayrId = rec.getValue('custrecord_scv_payment_ref_payr');
            const requestorId = rec.getValue('custrecord_scv_payment_ngycau') || runtime.getCurrentUser().id;
            if (!sourcePayrId || !requestorId) return [];

            try {
                const value = getAccrualSourceCache().get({
                    key: getAccrualSourceCacheKey(requestorId, sourcePayrId)
                });
                if (!value) return [];

                const payload = JSON.parse(value);
                if (String(payload.sourcePayrId || '') !== String(sourcePayrId)) return [];
                if (payload.lineCount && payload.lineCount !== rec.getLineCount({sublistId: DETAIL_SUBLIST})) return [];
                if (payload.amount && toNumber(payload.amount) !== toNumber(rec.getValue(FIELD.AMOUNT))) return [];
                return Array.from(new Set((payload.sourceDetailIds || []).map(id => String(id || '')).filter(Boolean)));
            } catch (e) {
                log.error('Create PayR read accrual source cache failed', {
                    sourcePayrId,
                    requestorId,
                    message: e.message || e.toString()
                });
                return [];
            }
        }

        function getAccrualSourceCache() {
            return cache.getCache({name: ACCRUAL_SOURCE_CACHE, scope: cache.Scope.PUBLIC});
        }

        function getAccrualSourceCacheKey(requestorId, sourcePayrId) {
            return [requestorId, sourcePayrId].map(String).join('_');
        }

        function updateAccrualSourceLines(context) {
            if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.COPY) return;

            const rec = context.newRecord;
            const sourcePayrId = rec.getValue('custrecord_scv_payment_ref_payr');
            if (!sourcePayrId || !rec.id) return;

            const sourceDetailIds = readAccrualSourceLineIds(rec);
            sourceDetailIds.forEach(sourceDetailId => {
                try {
                    record.submitFields({
                        type: PAYR_DETAIL_RECORD,
                        id: sourceDetailId,
                        values: {
                            [PAID_BY_PAYR_FIELD]: rec.id
                        },
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                } catch (e) {
                    log.error('Create PayR update accrual source line failed', {
                        payrId: rec.id,
                        sourcePayrId,
                        sourceDetailId,
                        message: e.message || e.toString()
                    });
                }
            });
        }

        function updateInvestmentInfoRelatedPayr(context) {
            if (context.type !== context.UserEventType.CREATE && context.type !== context.UserEventType.COPY) return;

            const rec = context.newRecord;
            const ttdtId = rec.getValue('custrecord_scv_payr_ttdt');
            if (!ttdtId || !rec.id) return;

            const related = getInvestmentInfoRelatedPayrIds(ttdtId);
            related.add(String(rec.id));

            record.submitFields({
                type: TIDT_RECORD,
                id: ttdtId,
                values: {
                    [TIDT_FIELD.RELATED_PAYR]: Array.from(related)
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
        }

        function getInvestmentInfoRelatedPayrIds(ttdtId) {
            try {
                const fields = search.lookupFields({
                    type: TIDT_RECORD,
                    id: ttdtId,
                    columns: [TIDT_FIELD.RELATED_PAYR]
                });
                const values = fields[TIDT_FIELD.RELATED_PAYR] || [];
                return new Set(values.map(value => String(value.value || value)).filter(Boolean));
            } catch (e) {
                log.debug('getInvestmentInfoRelatedPayrIds failed', e.message || e);
                return new Set();
            }
        }

        function updatePaymentRequestFromTransaction(txnRec, isDelete) {
            const directPayrId = txnRec.getValue('custbody_scv_payment_number');
            const fallbackPayrId = directPayrId ? '' : getPaymentRequestIdByRelatedTransaction(txnRec.id);
            const payrId = directPayrId || fallbackPayrId;

            if (!payrId) {
                return;
            }

            const paidAmount = getPaymentRequestPaidAmount(payrId);
            const related = getRelatedTransactionIds(payrId);
            if (isDelete) {
                related.delete(String(txnRec.id));
            } else {
                related.add(String(txnRec.id));
            }

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

        function getPaymentRequestIdByRelatedTransaction(transactionId) {
            if (!transactionId) return '';

            let payrId = '';
            search.create({
                type: PAYR_RECORD,
                filters: [
                    [FIELD.RELATED, 'anyof', transactionId]
                ],
                columns: ['internalid']
            }).run().each(result => {
                payrId = result.id;
                return false;
            });
            return payrId;
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
                const paidAmountColumn = columns.find(column =>
                    column.name === 'formulanumeric' &&
                    String(column.summary || '').toUpperCase() === search.Summary.SUM
                );
                return paidAmountColumn ? toNumber(result.getValue(paidAmountColumn)) : 0;
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

        function toPlainNumberString(value) {
            if (value === null || value === undefined || value === '') return '';
            const str = String(value);
            if (str.toLowerCase().indexOf('e') === -1) return str;

            const parts = str.toLowerCase().split('e');
            const coefficient = parts[0];
            const exponent = parseInt(parts[1], 10);
            if (isNaN(exponent)) return str;

            const isNegative = coefficient.charAt(0) === '-';
            const unsigned = isNegative ? coefficient.slice(1) : coefficient;
            const decimalIndex = unsigned.indexOf('.');
            const integerLength = decimalIndex === -1 ? unsigned.length : decimalIndex;
            const digits = unsigned.replace('.', '');
            const newDecimalIndex = integerLength + exponent;
            let plain;

            if (newDecimalIndex <= 0) {
                plain = '0.' + '0'.repeat(Math.abs(newDecimalIndex)) + digits;
            } else if (newDecimalIndex >= digits.length) {
                plain = digits + '0'.repeat(newDecimalIndex - digits.length);
            } else {
                plain = digits.slice(0, newDecimalIndex) + '.' + digits.slice(newDecimalIndex);
            }

            return (isNegative ? '-' : '') + plain;
        }

        function firstValue(value) {
            if (Array.isArray(value)) return (value[0] && (value[0].value || value[0])) || '';
            return value || '';
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
