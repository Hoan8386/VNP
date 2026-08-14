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
            cseg_inv_portfolio: 'cseg_inv_portfolio'
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

            if (params.type_func === 'payment_to_vendor_prepayment') {
                header.payment = payrRec.getValue('custrecord_scv_payment_amount');
                header.custbody_scv_created_transaction = payrRec.getValue('custrecord_scv_payment_po');
            }

            setHeaderFields(targetRec, header);

            if (params.type_func === 'payment_to_bill_payment') return;

            if (params.type_func === 'payment_to_check_tam_ung') {
                setCheckAdvanceLine(targetRec, payrRec);
                return;
            }

            if (params.type_func === 'payment_to_check_chi_khac') {
                setCheckOtherLines(targetRec, payrRec);
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
            setExpenseLine(targetRec, 0, {
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
                setExpenseLine(targetRec, 0, {
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
                setExpenseLine(targetRec, line, {
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

        function setExpenseLine(targetRec, line, values) {
            Object.keys(values).forEach(fieldId => {
                safeSetSublistValue(targetRec, 'expense', fieldId, line, values[fieldId]);
            });
        }

        function setHeaderFields(targetRec, values) {
            Object.keys(values).forEach(fieldId => {
                safeSetValue(targetRec, fieldId, values[fieldId]);
            });
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

        function safeSetValue(rec, fieldId, value) {
            if (value === null || value === undefined || value === '') return;
            try {
                rec.setValue({fieldId, value});
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
