/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * Nội dung: Tạo đồng thời chứng từ hạch toán gốc từ Debit/Loan Agreement (FDD 14/08/2026)
 *  - action=enterloanprincipal    : TH Đi vay          -> tạo Bill + Deposit
 *  - action=enterdepositprincipal : TH Cho vay/Tiết kiệm -> tạo Invoice + Check
 * Version: 1.0
 */
define(['N/record', 'N/redirect', '../lib/scv_lib_debitloan.js'],
    (record, redirect, libLoa) => {

        const F = libLoa.LOA_FIELD;

        const onRequest = (scriptContext) => {
            try {
                let params = scriptContext.request.parameters;
                let loaId = params.recid;
                let action = params.action;

                if (!loaId || !action) {
                    scriptContext.response.write('Missing recid/action');
                    return;
                }

                if (action === libLoa.SL_ACTION.ENTER_LOAN_PRINCIPAL) {
                    enterLoanPrincipal(loaId);
                } else if (action === libLoa.SL_ACTION.ENTER_DEPOSIT_PRINCIPAL) {
                    enterDepositPrincipal(loaId);
                } else {
                    scriptContext.response.write('Unknown action: ' + action);
                }
            } catch (e) {
                log.error('scv_sl_debitloan_agreement error', e);
                scriptContext.response.write('Error: ' + (e.message || e.toString()));
            }
        };

        // FDD 2.1.1 - Enter Loan Principal: tạo đồng thời Bill + Deposit
        const enterLoanPrincipal = (loaId) => {
            let loa = record.load({type: libLoa.RECORD_TYPE.DEBIT_LOAN_AGREEMENT, id: loaId});

            let billId = createBill(loa);
            let depositId = createDeposit(loa);

            let loaEdit = record.load({type: libLoa.RECORD_TYPE.DEBIT_LOAN_AGREEMENT, id: loaId});
            libLoa.appendMultiSelect(loaEdit, F.RELATED_TRANSACTION, billId);
            libLoa.appendMultiSelect(loaEdit, F.RELATED_TRANSACTION, depositId);
            loaEdit.save({enableSourcing: false, ignoreMandatoryFields: true});

            redirect.toRecord({type: record.Type.VENDOR_BILL, id: billId, isEditMode: false});
        };

        // FDD 2.2.1 - Enter Deposit Principal: tạo đồng thời Invoice + Check
        const enterDepositPrincipal = (loaId) => {
            let loa = record.load({type: libLoa.RECORD_TYPE.DEBIT_LOAN_AGREEMENT, id: loaId});

            let invoiceId = createInvoice(loa);
            let checkId = createCheck(loa);

            let loaEdit = record.load({type: libLoa.RECORD_TYPE.DEBIT_LOAN_AGREEMENT, id: loaId});
            libLoa.appendMultiSelect(loaEdit, F.RELATED_TRANSACTION, invoiceId);
            libLoa.appendMultiSelect(loaEdit, F.RELATED_TRANSACTION, checkId);
            loaEdit.save({enableSourcing: false, ignoreMandatoryFields: true});

            redirect.toRecord({type: record.Type.INVOICE, id: invoiceId, isEditMode: false});
        };

        const createBill = (loa) => {
            let memo = libLoa.buildMemo(loa, 'Ghi nhận công nợ khoản vay');

            let rec = record.create({type: record.Type.VENDOR_BILL, isDynamic: true});
            rec.setValue({fieldId: 'entity', value: loa.getValue({fieldId: F.ENTITY})});
            rec.setValue({fieldId: libLoa.TXN_FIELD.REPORT_ENTITY_NAME, value: loa.getText({fieldId: F.ENTITY})});
            rec.setValue({fieldId: 'subsidiary', value: loa.getValue({fieldId: F.SUBSIDIARY})});
            rec.setValue({fieldId: 'account', value: loa.getValue({fieldId: F.ACCOUNT_DEBITLOAN})});
            rec.setValue({fieldId: 'currency', value: loa.getValue({fieldId: F.CURRENCY})});
            rec.setValue({fieldId: 'exchangerate', value: loa.getValue({fieldId: F.EXCHANGE_RATE})});
            rec.setValue({fieldId: 'memo', value: memo});
            rec.setValue({fieldId: 'trandate', value: new Date()});
            rec.setValue({fieldId: libLoa.TXN_FIELD.LOA, value: loa.id});
            rec.setValue({fieldId: libLoa.TXN_FIELD.PROJECT, value: loa.getValue({fieldId: F.PROJECT})});

            rec.selectNewLine({sublistId: 'item'});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: loa.getValue({fieldId: F.INTER_ITEM})});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: 1});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: loa.getValue({fieldId: F.AMOUNT})});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: loa.getValue({fieldId: F.AMOUNT})});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'taxcode', value: libLoa.DEFAULT_TAXCODE});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'memo', value: memo});
            rec.commitLine({sublistId: 'item'});

            return rec.save({ignoreMandatoryFields: true});
        };

        const createDeposit = (loa) => {
            let memo = libLoa.buildMemo(loa, 'Ghi nhận công nợ khoản vay');

            let rec = record.create({type: record.Type.DEPOSIT, isDynamic: true});
            rec.setValue({fieldId: libLoa.TXN_FIELD.REPORT_ENTITY_NAME, value: loa.getText({fieldId: F.ENTITY})});
            rec.setValue({fieldId: 'subsidiary', value: loa.getValue({fieldId: F.SUBSIDIARY})});
            rec.setValue({fieldId: 'account', value: loa.getValue({fieldId: F.ACCOUNT_BANK})});
            rec.setValue({fieldId: 'currency', value: loa.getValue({fieldId: F.CURRENCY})});
            rec.setValue({fieldId: 'exchangerate', value: loa.getValue({fieldId: F.EXCHANGE_RATE})});
            rec.setValue({fieldId: 'memo', value: memo});
            rec.setValue({fieldId: 'trandate', value: new Date()});
            rec.setValue({fieldId: libLoa.TXN_FIELD.LOA, value: loa.id});
            rec.setValue({fieldId: libLoa.TXN_FIELD.PROJECT, value: loa.getValue({fieldId: F.PROJECT})});

            rec.selectNewLine({sublistId: 'other'});
            rec.setCurrentSublistValue({sublistId: 'other', fieldId: 'entity', value: loa.getValue({fieldId: F.ENTITY})});
            rec.setCurrentSublistValue({sublistId: 'other', fieldId: 'account', value: loa.getValue({fieldId: F.INTER_ACCOUNT})});
            rec.setCurrentSublistValue({sublistId: 'other', fieldId: 'amount', value: loa.getValue({fieldId: F.AMOUNT})});
            rec.setCurrentSublistValue({sublistId: 'other', fieldId: 'memo', value: memo});
            rec.commitLine({sublistId: 'other'});

            return rec.save({ignoreMandatoryFields: true});
        };

        const createInvoice = (loa) => {
            let memo = libLoa.buildMemo(loa, 'Ghi nhận công nợ');

            let rec = record.create({type: record.Type.INVOICE, isDynamic: true});
            rec.setValue({fieldId: 'entity', value: loa.getValue({fieldId: F.ENTITY})});
            rec.setValue({fieldId: libLoa.TXN_FIELD.REPORT_ENTITY_NAME, value: loa.getText({fieldId: F.ENTITY})});
            rec.setValue({fieldId: 'subsidiary', value: loa.getValue({fieldId: F.SUBSIDIARY})});
            rec.setValue({fieldId: 'account', value: loa.getValue({fieldId: F.ACCOUNT_DEBITLOAN})});
            rec.setValue({fieldId: 'currency', value: loa.getValue({fieldId: F.CURRENCY})});
            rec.setValue({fieldId: 'exchangerate', value: loa.getValue({fieldId: F.EXCHANGE_RATE})});
            rec.setValue({fieldId: 'memo', value: memo});
            rec.setValue({fieldId: 'trandate', value: new Date()});
            rec.setValue({fieldId: libLoa.TXN_FIELD.LOA, value: loa.id});
            // FDD không liệt kê Projects ở Header Invoice

            rec.selectNewLine({sublistId: 'item'});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: loa.getValue({fieldId: F.INTER_ITEM})});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: 1});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: loa.getValue({fieldId: F.AMOUNT})});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: loa.getValue({fieldId: F.AMOUNT})});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'taxcode', value: libLoa.DEFAULT_TAXCODE});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'description', value: memo});
            rec.commitLine({sublistId: 'item'});

            return rec.save({ignoreMandatoryFields: true});
        };

        const createCheck = (loa) => {
            let memo = libLoa.buildMemo(loa, 'Ghi nhận công nợ');

            let rec = record.create({type: record.Type.CHECK, isDynamic: true});
            rec.setValue({fieldId: 'entity', value: loa.getValue({fieldId: F.ENTITY})});
            rec.setValue({fieldId: libLoa.TXN_FIELD.REPORT_ENTITY_NAME, value: loa.getText({fieldId: F.ENTITY})});
            rec.setValue({fieldId: 'subsidiary', value: loa.getValue({fieldId: F.SUBSIDIARY})});
            rec.setValue({fieldId: 'account', value: loa.getValue({fieldId: F.ACCOUNT_BANK})});
            rec.setValue({fieldId: 'currency', value: loa.getValue({fieldId: F.CURRENCY})});
            rec.setValue({fieldId: 'exchangerate', value: loa.getValue({fieldId: F.EXCHANGE_RATE})});
            rec.setValue({fieldId: 'memo', value: memo});
            rec.setValue({fieldId: 'trandate', value: new Date()});
            rec.setValue({fieldId: libLoa.TXN_FIELD.LOA, value: loa.id});

            rec.selectNewLine({sublistId: 'expense'});
            rec.setCurrentSublistValue({sublistId: 'expense', fieldId: 'account', value: loa.getValue({fieldId: F.INTER_ACCOUNT})});
            rec.setCurrentSublistValue({sublistId: 'expense', fieldId: 'amount', value: loa.getValue({fieldId: F.AMOUNT})});
            rec.setCurrentSublistValue({sublistId: 'expense', fieldId: 'taxcode', value: libLoa.DEFAULT_TAXCODE});
            rec.setCurrentSublistValue({sublistId: 'expense', fieldId: 'memo', value: memo});
            rec.commitLine({sublistId: 'expense'});

            return rec.save({ignoreMandatoryFields: true});
        };

        return {onRequest};
    });
