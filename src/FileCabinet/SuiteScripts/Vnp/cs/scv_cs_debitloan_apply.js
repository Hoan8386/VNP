/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * Nội dung: Auto tick Apply trên Bill Payment / Customer Payment khi tạo từ Debit/Loan Agreement (FDD 2.1.2 / 2.2.2)
 * Ghi chú: chạy song song với bước tick phía server (scv_ue_loan_borrow_prepayment.js) để đề phòng trường hợp
 * sublist "apply" chỉ được NetSuite nạp xong ở phía client (sau khi entity được set) chứ không có sẵn lúc beforeLoad.
 * Version: 1.0
 */
define(['N/search'],
    (search) => {

        const TRAN_TYPE = {
            VENDOR_PAYMENT: 'vendorpayment',
            CUSTOMER_PAYMENT: 'customerpayment'
        };

        const MAX_RETRY = 15;
        const RETRY_DELAY_MS = 400;

        const pageInit = (scriptContext) => {
            try {
                let currentRecord = scriptContext.currentRecord;
                let recType = currentRecord.type;
                if (recType !== TRAN_TYPE.VENDOR_PAYMENT && recType !== TRAN_TYPE.CUSTOMER_PAYMENT) return;

                let params = getUrlParams();
                if (params.createdrectype !== 'customrecord_scv_loa' || !params.createdfromid) return;

                let targetType = recType === TRAN_TYPE.VENDOR_PAYMENT ? 'VendBill' : 'Invoice';
                let targetId = findLatestRelatedTransaction(params.createdfromid, targetType);
                if (!targetId) return;

                tryTickApply(currentRecord, targetId, 0);
            } catch (e) {
                console.error('scv_cs_debitloan_apply pageInit error', e);
            }
        };

        const getUrlParams = () => {
            let result = {};
            let query = window.location.search.substring(1);
            query.split('&').forEach(pair => {
                if (!pair) return;
                let idx = pair.indexOf('=');
                let key = decodeURIComponent(idx === -1 ? pair : pair.substring(0, idx));
                let value = decodeURIComponent(idx === -1 ? '' : pair.substring(idx + 1));
                result[key] = value;
            });
            return result;
        };

        const findLatestRelatedTransaction = (loaId, transactionType) => {
            let s = search.create({
                type: search.Type.TRANSACTION,
                filters: [
                    ['custbody_scv_loa', 'anyof', loaId],
                    'and', ['type', 'anyof', transactionType],
                    'and', ['mainline', 'is', 'T']
                ],
                columns: [search.createColumn({name: 'internalid', sort: search.Sort.DESC})]
            });
            let r = s.run().getRange({start: 0, end: 1});
            return r.length > 0 ? r[0].id : '';
        };

        const tryTickApply = (currentRecord, targetId, attempt) => {
            let lineCount = currentRecord.getLineCount({sublistId: 'apply'});
            if (lineCount === 0 && attempt < MAX_RETRY) {
                setTimeout(() => tryTickApply(currentRecord, targetId, attempt + 1), RETRY_DELAY_MS);
                return;
            }
            for (let i = 0; i < lineCount; i++) {
                let docId = currentRecord.getSublistValue({sublistId: 'apply', fieldId: 'internalid', line: i});
                if (!docId) {
                    docId = currentRecord.getSublistValue({sublistId: 'apply', fieldId: 'doc', line: i});
                }
                if (String(docId) === String(targetId)) {
                    let applied = currentRecord.getSublistValue({sublistId: 'apply', fieldId: 'apply', line: i});
                    if (!applied) {
                        currentRecord.selectLine({sublistId: 'apply', line: i});
                        currentRecord.setCurrentSublistValue({sublistId: 'apply', fieldId: 'apply', value: true});
                        currentRecord.commitLine({sublistId: 'apply'});
                    }
                    return;
                }
            }
        };

        return {pageInit};
    });
