/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/redirect', 'N/search', '../lib/scv_lib_debitloan.js'],
    (record, redirect, search, libLoa) => {

        const F = libLoa.LOA_FIELD;
        // custrecord_scv_loa_amount đã là số tiền quy đổi ra base currency (= Foreign Amount x Exchange Rate).
        // Chứng từ (Invoice/Bill/Check) lại set currency = loa.currency (thường là ngoại tệ, VD USD), nên
        // dòng chứng từ phải nhận amount THEO NGOẠI TỆ (custrecord_scv_foreign_amt) - NetSuite sẽ tự nhân
        // exchangerate để ra GL impact. Nếu dùng nhầm custrecord_scv_loa_amount (đã quy đổi VND) làm amount
        // dòng ngoại tệ, tỷ giá bị áp 2 lần (giá trị GL sai gấp exchangerate lần, số quá lớn còn gây crash
        // "An unexpected SuiteScript error has occurred" khi save).
        const F_FOREIGN_AMOUNT = 'custrecord_scv_foreign_amt';

        // Lấy taxcode từ Tax Schedule của item (item -> taxschedule -> nexuses[0].salestaxcode),
        // nhất quán với cách lấy default tax code ở các lib mua hàng khác trong repo VNP.
        // Không dùng libLoa.DEFAULT_TAXCODE ('5' = UNDEF-VN - mã dự phòng hệ thống khi NetSuite
        // không xác định được tax code), vì gán mã này trực tiếp cho dòng chứng từ gây lỗi
        // "An unexpected SuiteScript error has occurred" khi save.
        const getTaxCodeFromItem = (itemId) => {
            if (!itemId) return '';
            const lkItem = search.lookupFields({type: search.Type.ITEM, id: itemId, columns: ['recordtype']});
            const itemType = lkItem.recordtype;
            if (!itemType) return '';
            const lkSchedule = search.lookupFields({type: itemType, id: itemId, columns: ['taxschedule']});
            const taxScheduleId = lkSchedule.taxschedule?.[0]?.value;
            if (!taxScheduleId) return '';
            const recSchedule = record.load({type: 'taxschedule', id: taxScheduleId});
            return recSchedule.getSublistValue({sublistId: 'nexuses', fieldId: 'salestaxcode', line: 0}) || '';
        };

        // Trả về số tiền theo đúng currency của chứng từ (loa.currency). Ưu tiên Foreign Amount nếu có giá
        // trị khác 0; nếu LOA không có ngoại tệ (Foreign Amount rỗng/0, currency = base currency) thì dùng
        // thẳng custrecord_scv_loa_amount.
        const getTxnAmount = (loa) => {
            const foreignAmount = loa.getValue({fieldId: F_FOREIGN_AMOUNT});
            if (foreignAmount !== '' && foreignAmount !== null && Number(foreignAmount) !== 0) {
                return foreignAmount;
            }
            return loa.getValue({fieldId: F.AMOUNT});
        };

        // scv_ue_loan_borrow_prepayment.js (UE deploy trên Invoice/Vendor Bill/Deposit/Check...) đọc
        // custbody_scv_loa trong afterSubmit và tự load+save lại record Debit/Loan Agreement (updateLoa).
        // Nếu set custbody_scv_loa TRƯỚC khi save chứng từ mới, save đó của UE script kia bị lồng bên
        // trong save() của mình -> đụng độ với lần load+save loa khác (CUSTOM_RECORD_COLLISION / lỗi
        // chung chung "An unexpected SuiteScript error has occurred"). Nên save chứng từ trước, set
        // custbody_scv_loa sau bằng submitFields riêng để tránh nested save.
        const setLoaAfterSave = (type, id, loaId) => {
            record.submitFields({
                type: type,
                id: id,
                values: {[libLoa.TXN_FIELD.LOA]: loaId},
                options: {enableSourcing: false, ignoreMandatoryFields: true}
            });
            return id;
        };

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

            redirect.toRecord({type: libLoa.RECORD_TYPE.DEBIT_LOAN_AGREEMENT, id: loaId, isEditMode: false});
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

            redirect.toRecord({type: libLoa.RECORD_TYPE.DEBIT_LOAN_AGREEMENT, id: loaId, isEditMode: false});
        };

        const createBill = (loa) => {
            let memo = libLoa.buildMemo(loa, 'Ghi nhận công nợ khoản vay');
            let interItem = loa.getValue({fieldId: F.INTER_ITEM});
            if (!interItem) throw new Error('Missing Interest Item on Debit/Loan Agreement.');

            let rec = record.create({type: record.Type.VENDOR_BILL, isDynamic: true});
            rec.setValue({fieldId: 'entity', value: loa.getValue({fieldId: F.ENTITY})});
            rec.setValue({fieldId: libLoa.TXN_FIELD.REPORT_ENTITY_NAME, value: loa.getValue({fieldId: F.ENTITY})});
            rec.setValue({fieldId: 'subsidiary', value: loa.getValue({fieldId: F.SUBSIDIARY})});
            rec.setValue({fieldId: 'account', value: loa.getValue({fieldId: F.ACCOUNT_DEBITLOAN})});
            rec.setValue({fieldId: 'currency', value: loa.getValue({fieldId: F.CURRENCY})});
            rec.setValue({fieldId: 'exchangerate', value: loa.getValue({fieldId: F.EXCHANGE_RATE})});
            rec.setValue({fieldId: 'memo', value: memo});
            rec.setValue({fieldId: 'trandate', value: new Date()});
            rec.setValue({fieldId: libLoa.TXN_FIELD.PROJECT, value: loa.getValue({fieldId: F.PROJECT})});

            rec.selectNewLine({sublistId: 'item'});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: interItem});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: 1});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: getTxnAmount(loa)});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: getTxnAmount(loa)});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'taxcode', value: getTaxCodeFromItem(interItem)});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'memo', value: memo});
            rec.commitLine({sublistId: 'item'});

            let id = rec.save({ignoreMandatoryFields: true});
            return setLoaAfterSave(record.Type.VENDOR_BILL, id, loa.id);
        };

        const createDeposit = (loa) => {
            let memo = libLoa.buildMemo(loa, 'Ghi nhận công nợ khoản vay');

            let rec = record.create({type: record.Type.DEPOSIT, isDynamic: true});
            rec.setValue({fieldId: libLoa.TXN_FIELD.REPORT_ENTITY_NAME, value: loa.getValue({fieldId: F.ENTITY})});
            rec.setValue({fieldId: 'subsidiary', value: loa.getValue({fieldId: F.SUBSIDIARY})});
            rec.setValue({fieldId: 'account', value: loa.getValue({fieldId: F.ACCOUNT_BANK})});
            rec.setValue({fieldId: 'currency', value: loa.getValue({fieldId: F.CURRENCY})});
            rec.setValue({fieldId: 'exchangerate', value: loa.getValue({fieldId: F.EXCHANGE_RATE})});
            rec.setValue({fieldId: 'memo', value: memo});
            rec.setValue({fieldId: 'trandate', value: new Date()});
            rec.setValue({fieldId: libLoa.TXN_FIELD.PROJECT, value: loa.getValue({fieldId: F.PROJECT})});

            rec.selectNewLine({sublistId: 'other'});
            rec.setCurrentSublistValue({sublistId: 'other', fieldId: 'entity', value: loa.getValue({fieldId: F.ENTITY})});
            rec.setCurrentSublistValue({sublistId: 'other', fieldId: 'account', value: loa.getValue({fieldId: F.INTER_ACCOUNT})});
            rec.setCurrentSublistValue({sublistId: 'other', fieldId: 'amount', value: getTxnAmount(loa)});
            rec.setCurrentSublistValue({sublistId: 'other', fieldId: 'memo', value: memo});
            rec.commitLine({sublistId: 'other'});

            let id = rec.save({ignoreMandatoryFields: true});
            return setLoaAfterSave(record.Type.DEPOSIT, id, loa.id);
        };

        const createInvoice = (loa) => {
            let memo = libLoa.buildMemo(loa, 'Ghi nhận công nợ');
            let interItem = loa.getValue({fieldId: F.INTER_ITEM});
            if (!interItem) throw new Error('Missing Interest Item on Debit/Loan Agreement.');

            let rec = record.create({type: record.Type.INVOICE, isDynamic: true});
            rec.setValue({fieldId: 'entity', value: loa.getValue({fieldId: F.ENTITY})});
            rec.setValue({fieldId: libLoa.TXN_FIELD.REPORT_ENTITY_NAME, value: loa.getValue({fieldId: F.ENTITY})});
            rec.setValue({fieldId: 'subsidiary', value: loa.getValue({fieldId: F.SUBSIDIARY})});
            rec.setValue({fieldId: 'account', value: loa.getValue({fieldId: F.ACCOUNT_DEBITLOAN})});
            rec.setValue({fieldId: 'currency', value: loa.getValue({fieldId: F.CURRENCY})});
            rec.setValue({fieldId: 'exchangerate', value: loa.getValue({fieldId: F.EXCHANGE_RATE})});
            rec.setValue({fieldId: 'memo', value: memo});
            rec.setValue({fieldId: 'trandate', value: new Date()});
            // FDD không liệt kê Projects ở Header Invoice

            rec.selectNewLine({sublistId: 'item'});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'item', value: interItem});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'quantity', value: 1});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'rate', value: getTxnAmount(loa)});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'amount', value: getTxnAmount(loa)});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'taxcode', value: getTaxCodeFromItem(interItem)});
            rec.setCurrentSublistValue({sublistId: 'item', fieldId: 'description', value: memo});
            rec.commitLine({sublistId: 'item'});

            let id = rec.save({ignoreMandatoryFields: true});
            return setLoaAfterSave(record.Type.INVOICE, id, loa.id);
        };

        const createCheck = (loa) => {
            let memo = libLoa.buildMemo(loa, 'Ghi nhận công nợ');
            let interItem = loa.getValue({fieldId: F.INTER_ITEM});

            let rec = record.create({type: record.Type.CHECK, isDynamic: true});
            rec.setValue({fieldId: 'entity', value: loa.getValue({fieldId: F.ENTITY})});
            rec.setValue({fieldId: libLoa.TXN_FIELD.REPORT_ENTITY_NAME, value: loa.getValue({fieldId: F.ENTITY})});
            rec.setValue({fieldId: 'subsidiary', value: loa.getValue({fieldId: F.SUBSIDIARY})});
            rec.setValue({fieldId: 'account', value: loa.getValue({fieldId: F.ACCOUNT_BANK})});
            rec.setValue({fieldId: 'currency', value: loa.getValue({fieldId: F.CURRENCY})});
            rec.setValue({fieldId: 'exchangerate', value: loa.getValue({fieldId: F.EXCHANGE_RATE})});
            rec.setValue({fieldId: 'memo', value: memo});
            rec.setValue({fieldId: 'trandate', value: new Date()});

            rec.selectNewLine({sublistId: 'expense'});
            rec.setCurrentSublistValue({sublistId: 'expense', fieldId: 'account', value: loa.getValue({fieldId: F.INTER_ACCOUNT})});
            rec.setCurrentSublistValue({sublistId: 'expense', fieldId: 'amount', value: getTxnAmount(loa)});
            rec.setCurrentSublistValue({sublistId: 'expense', fieldId: 'taxcode', value: getTaxCodeFromItem(interItem)});
            rec.setCurrentSublistValue({sublistId: 'expense', fieldId: 'memo', value: memo});
            rec.commitLine({sublistId: 'expense'});

            let id = rec.save({ignoreMandatoryFields: true});
            return setLoaAfterSave(record.Type.CHECK, id, loa.id);
        };

        return {onRequest};
    });
