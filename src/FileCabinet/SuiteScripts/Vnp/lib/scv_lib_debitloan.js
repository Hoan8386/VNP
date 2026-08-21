/**
 * Nội dung: Constants & helpers dùng chung cho chức năng tạo chứng từ hạch toán từ Debit/Loan Agreement (FDD 14/08/2026)
 * Version: 1.0
 */
define(['N/search', './scv_lib_function.js'],
    (search, libFunc) => {

        const RECORD_TYPE = {
            DEBIT_LOAN_AGREEMENT: 'customrecord_scv_loa'
        };

        // Theo FDD: Đi vay = 1, Cho vay/Tiết kiệm = 2 hoặc 6
        const LOA_TYPE = {
            DI_VAY: '1',
            CHO_VAY: '2',
            TIET_KIEM: '6'
        };

        const LOA_FIELD = {
            TYPE: 'custrecord_scv_loa_type',
            ENTITY: 'custrecord_scv_loa_entity',
            SUBSIDIARY: 'custrecord_scv_loa_subsidiary',
            ACCOUNT_DEBITLOAN: 'custrecord_scv_loa_account_debitloan',
            ACCOUNT_BANK: 'custrecord_scv_loa_account_bank',
            INTER_ACCOUNT: 'custrecord_scv_loa_inter_account',
            CURRENCY: 'custrecord_scv_loa_currency',
            EXCHANGE_RATE: 'custrecord_scv_loa_exchange_rate',
            AMOUNT: 'custrecord_scv_loa_amount',
            PRINCIPAL_AMOUNT: 'custrecord_scv_loa_principal_amount',
            PRINCIPAL_PAID_AMOUNT: 'custrecord_scv_loa_principal_paid_amount',
            INTER_ITEM: 'custrecord_scv_loan_inter_item',
            RELATED_TRANSACTION: 'custrecord_scv_lc_po',
            PROJECT: 'cseg_inv_portfolio'
        };

        const TXN_FIELD = {
            REPORT_ENTITY_NAME: 'custbody_scv_tb_entity_name',
            LOA: 'custbody_scv_loa',
            PROJECT: 'cseg_inv_portfolio'
        };

        const DEFAULT_TAXCODE = '5';

        const SL_ACTION = {
            ENTER_LOAN_PRINCIPAL: 'enterloanprincipal',
            ENTER_DEPOSIT_PRINCIPAL: 'enterdepositprincipal'
        };

        const buildMemo = (loaRecord, prefix) => {
            let name = loaRecord.getValue({fieldId: 'name'});
            if (!libFunc.isContainValue(name)) {
                name = loaRecord.getText({fieldId: 'name'}) || '';
            }
            return prefix + '_' + name;
        };

        // custrecord_scv_lc_po là multi-select: nối thêm id chứng từ mới tạo, không ghi đè giá trị cũ.
        const appendMultiSelect = (rec, fieldId, newId) => {
            if (!libFunc.isContainValue(newId)) return;

            let current = rec.getValue({fieldId: fieldId});
            let arr = [];
            if (Array.isArray(current)) {
                arr = current.slice();
            } else if (libFunc.isContainValue(current)) {
                arr = [current];
            }

            let strNewId = String(newId);
            let existed = arr.some(v => String(v) === strNewId);
            if (!existed) {
                arr.push(newId);
            }

            rec.setValue({fieldId: fieldId, value: arr});
        };

        // Tick auto Apply trên sublist 'apply' của Bill Payment / Customer Payment ứng với 1 chứng từ đích (Bill/Invoice)
        const tickApplyLine = (paymentRecord, targetTranId) => {
            if (!libFunc.isContainValue(targetTranId)) return false;

            let lineCount = paymentRecord.getLineCount({sublistId: 'apply'});
            for (let i = 0; i < lineCount; i++) {
                let docId = paymentRecord.getSublistValue({sublistId: 'apply', fieldId: 'internalid', line: i});
                if (!libFunc.isContainValue(docId)) {
                    docId = paymentRecord.getSublistValue({sublistId: 'apply', fieldId: 'doc', line: i});
                }
                if (String(docId) === String(targetTranId)) {
                    paymentRecord.setSublistValue({sublistId: 'apply', fieldId: 'apply', line: i, value: true});
                    return true;
                }
            }
            return false;
        };

        // Tìm chứng từ (Bill/Invoice...) mới nhất được tạo từ 1 Debit/Loan Agreement, dùng cho bước Apply.
        const findLatestRelatedTransaction = (loaId, transactionTypes) => {
            if (!libFunc.isContainValue(loaId)) return '';

            let s = search.create({
                type: search.Type.TRANSACTION,
                filters: [
                    ['custbody_scv_loa', 'anyof', loaId],
                    'and', ['type', 'anyof', transactionTypes],
                    'and', ['mainline', 'is', 'T']
                ],
                columns: [search.createColumn({name: 'internalid', sort: search.Sort.DESC})]
            });
            let r = s.run().getRange({start: 0, end: 1});
            return r.length > 0 ? r[0].id : '';
        };

        return {
            RECORD_TYPE,
            LOA_TYPE,
            LOA_FIELD,
            TXN_FIELD,
            DEFAULT_TAXCODE,
            SL_ACTION,
            buildMemo,
            appendMultiSelect,
            tickApplyLine,
            findLatestRelatedTransaction
        };
    });
