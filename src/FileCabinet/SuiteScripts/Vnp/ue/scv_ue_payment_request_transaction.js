/**
 * Noi dung: Prefill transactions created from Payment Request.
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],
    (record, search) => {

        const PAYR_RECORD = 'customrecord_scv_paymentrequest';
        const DETAIL_SUBLIST = 'recmachcustrecord_scv_pay';

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
            custbody_scv_pur_contract_no: 'custrecord_scv_payment_pc',
            custbody_scv_salescontract: 'custrecord_scv_payment_sc',
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

        function prefillTransaction(targetRec, params) {
            const payrRec = record.load({
                type: PAYR_RECORD,
                id: params.id_rec
            });
            const header = readHeader(payrRec);
            header.custbody_scv_payment_number = params.id_rec;
            let purchaseOrderId = '';

            if (params.type_func === 'payment_to_vendor_prepayment') {
                purchaseOrderId = payrRec.getValue('custrecord_scv_payment_po');
                header.payment = payrRec.getValue('custrecord_scv_payment_amount');
                header.custbody_scv_created_transaction = purchaseOrderId;
            }

            setHeaderFields(targetRec, header);

            if (params.type_func === 'payment_to_vendor_prepayment') {
                setVendorPrepaymentPurchaseOrder(targetRec, purchaseOrderId);
                setVendorPrepaymentAccount(targetRec, payrRec);
            }

            if (params.type_func === 'payment_to_bill_payment') return;

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

            const useItem = targetRec.type === 'vendorbill';
            setTransactionLines(targetRec, payrRec, useItem ? 'item' : 'expense');
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
                account: '330',
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

        function setPrepaidJournalLines(targetRec, payrRec) {
            const creditAccount = getPaymentTypeAccount(payrRec);
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
            const amount = payrRec.getValue('custrecord_scv_payment_amount');
            setExpenseLine(targetRec, 'expense', 0, {
                account: getPaymentTypeAccount(payrRec),
                amount,
                taxcode: '5',
                taxrate1: '0.0%',
                tax1amt: 0,
                grossamt: amount,
                memo: payrRec.getValue('custrecord_scv_payment_memo'),
                customer: firstValue(payrRec.getValue('custrecord_scv_payment_entity')),
                department: payrRec.getValue('custrecord_scv_payment_department')
            });
            safeSetValue(targetRec, 'usertotal', amount);
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
            const typeAccount = getPaymentTypeAccount(payrRec);

            // direction 'in' (Nợ khoản đầu tư / Có tài khoản mặc định loại thanh toán):
            // direction 'out' (Nợ tài khoản mặc định loại thanh toán / Có khoản đầu tư) - reverse of 'in'.
            const debitAccount = direction === 'in' ? projectAccount : typeAccount;
            const creditAccount = direction === 'in' ? typeAccount : projectAccount;

            setExpenseLine(targetRec, 'line', 0, {
                account: debitAccount,
                debit: amount,
                memo,
                entity,
                department,
                cseg_inv_portfolio: projectId
            });
            setExpenseLine(targetRec, 'line', 1, {
                account: creditAccount,
                credit: amount,
                memo,
                entity,
                department,
                cseg_inv_portfolio: projectId
            });
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

        function getItemExpenseAccount(payrRec, line) {
            const itemId = payrRec.getSublistValue({
                sublistId: DETAIL_SUBLIST,
                fieldId: 'custrecord_scv_pay_detail_item',
                line
            });
            if (!itemId) return '';
            const itemType = getItemRecordType(itemId);
            const fields = search.lookupFields({
                type: itemType,
                id: itemId,
                columns: ['expenseaccount']
            });
            return (fields.expenseaccount || [])[0]?.value || '';
        }

        function getProjectAccount(payrRec) {
            const projectId = firstValue(payrRec.getValue('cseg_inv_portfolio'));
            if (!projectId) return '';
            try {
                const segmentFields = search.lookupFields({
                    type: 'cseg_inv_portfolio',
                    id: projectId,
                    columns: ['custrecord_scv_proj_type']
                });
                const projectTypeId = firstValue(segmentFields.custrecord_scv_proj_type);
                if (!projectTypeId) return '';
                const typeFields = search.lookupFields({
                    type: 'customrecord_scv_proj_type',
                    id: projectTypeId,
                    columns: ['custrecord_scv_projtype_account']
                });
                return firstValue(typeFields.custrecord_scv_projtype_account);
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
            const fields = search.lookupFields({
                type: 'customrecordcustrecord_scv_payment_list',
                id: typeId,
                columns: ['custrecord_scv_payr_type_ar_account']
            });
            return (fields.custrecord_scv_payr_type_ar_account || [])[0]?.value || '';
        }

        function getItemRecordType(itemId) {
            const fields = search.lookupFields({
                type: search.Type.ITEM,
                id: itemId,
                columns: ['recordtype']
            });
            return fields.recordtype || search.Type.ITEM;
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

        function safeSetSublistValue(rec, sublistId, fieldId, line, value) {
            if (value === null || value === undefined || value === '') return;
            try {
                rec.setSublistValue({sublistId, fieldId, line, value});
            } catch (e) {
                log.debug('skip line field ' + sublistId + '.' + fieldId, e.message || e);
            }
        }

        return {beforeLoad};
    });
