/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * Nội dung: Bill Credit - Tạo/Update Check hoặc JRL từ màn hình record (VNP_FDD.xlsx - mục 2)
 *           Chứa phần thêm button lên form theo record type, dùng chung cho UE ../ue/scv_ue_vendor_credit.js.
 * =======================================================================================
 *  Date                Author                  Description
 *  04 Sep 2026          SuiteCloud              Init & create file
 */
define(['N/record', 'N/search', 'N/url', '../lib/scv_lib_function.js'],

    (record, search, url, libFunc) => {

        const RecordType = {
            VENDOR_CREDIT: 'vendorcredit'
        };

        // Account số bắt đầu bằng 111/112 -> tạo Check; bắt đầu bằng 341 -> tạo JRL
        const AccountPrefix = {
            CHECK: ['111', '112'],
            JOURNAL: ['341']
        };

        const SCRIPT_ID = 'customscript_scv_sl_vendor_credit';
        const DEPLOY_ID = 'customdeploy_scv_sl_vendor_credit';

        const DEFAULT_ACCOUNT_FIELD = 'custbody_scv_account';
        const DEFAULT_RELATED_TRANSACTION_FIELD = 'custbody_scv_related_transaction';

        /**
         * Thêm button Create/Update Check hoặc JRL lên form theo record type đang xem.
         * Record type có handler riêng trong ButtonHandlerByRecordType (hiện chỉ Vendor Credit) thì dùng handler đó;
         * record type khác dùng chung addButtonJournalOnly (chỉ Create/Update JRL, không có Create Check).
         * @param {Form} form
         * @param {Record} newRecord
         * @param {Object} [options] - tùy chọn cho addButtonJournalOnly khi record type chưa có handler riêng
         * @param {string} [options.accountFieldId] - default custbody_scv_account
         * @param {string} [options.relatedTransactionFieldId] - default custbody_scv_related_transaction
         */
        const addButtonByRecordType = (form, newRecord, options) => {
            let handler = ButtonHandlerByRecordType[newRecord.type];
            if (handler) {
                handler(form, newRecord);
            } else {
                addButtonJournalOnly(form, newRecord, options);
            }
        }

        /**
         * Vendor Credit (Bill Credit): account custbody_scv_account bắt đầu 111/112 -> Create/Update Check;
         * bắt đầu 341 -> Create/Update JRL. Đã có related transaction thì đổi label sang Update.
         * @param {Form} form
         * @param {Record} newRecord
         */
        const addButtonVendorCredit = (form, newRecord) => {
            let accountId = newRecord.getValue({fieldId: 'custbody_scv_account'});
            if (!accountId) return;

            let accountNumber = search.lookupFields({
                type: search.Type.ACCOUNT,
                id: accountId,
                columns: ['number']
            }).number || '';

            let isCheckAccount = AccountPrefix.CHECK.some(prefix => accountNumber.startsWith(prefix));
            let isJournalAccount = AccountPrefix.JOURNAL.some(prefix => accountNumber.startsWith(prefix));
            if (!isCheckAccount && !isJournalAccount) return;

            libFunc.addCssPleaseWait(form);

            let relatedTransaction = newRecord.getValue({fieldId: 'custbody_scv_related_transaction'});
            let recordId = newRecord.id;
            let transactionType = isCheckAccount ? record.Type.CHECK : record.Type.JOURNAL_ENTRY;
            let urlSuitelet = url.resolveScript({
                scriptId: SCRIPT_ID,
                deploymentId: DEPLOY_ID,
                params: {vendorcreditId: recordId, vendorcreditType: newRecord.type, transactionType: transactionType}
            });

            if (relatedTransaction) {
                libFunc.addButtonHandel(form, 'custpage_scv_update', isCheckAccount ? 'Update Check' : 'Update JRL', urlSuitelet, recordId);
            } else {
                let labelButton = isCheckAccount ? 'Create Check' : 'Create JRL';
                libFunc.addButtonHandel(form, 'custpage_scv_create', labelButton, urlSuitelet, recordId);
            }
        }

        /**
         * Dùng chung cho các record type khác Vendor Credit chưa có handler riêng: chỉ hỗ trợ
         * Create/Update JRL (không có Create Check như addButtonVendorCredit) - account phải bắt đầu 341.
         * Field account / related transaction lấy mặc định custbody_scv_account /
         * custbody_scv_related_transaction, có thể override qua options nếu record type dùng field id khác.
         * @param {Form} form
         * @param {Record} newRecord
         * @param {Object} [options]
         * @param {string} [options.accountFieldId]
         * @param {string} [options.relatedTransactionFieldId]
         */
        const addButtonJournalOnly = (form, newRecord, options) => {
            options = options || {};
            let accountFieldId = options.accountFieldId || DEFAULT_ACCOUNT_FIELD;
            let relatedTransactionFieldId = options.relatedTransactionFieldId || DEFAULT_RELATED_TRANSACTION_FIELD;

            let accountId = newRecord.getValue({fieldId: accountFieldId});
            if (!accountId) return;

            let accountNumber = search.lookupFields({
                type: search.Type.ACCOUNT,
                id: accountId,
                columns: ['number']
            }).number || '';

            let isJournalAccount = AccountPrefix.JOURNAL.some(prefix => accountNumber.startsWith(prefix));
            if (!isJournalAccount) return;

            libFunc.addCssPleaseWait(form);

            let relatedTransaction = newRecord.getValue({fieldId: relatedTransactionFieldId});
            let recordId = newRecord.id;
            let urlSuitelet = url.resolveScript({
                scriptId: SCRIPT_ID,
                deploymentId: DEPLOY_ID,
                params: {vendorcreditId: recordId, vendorcreditType: newRecord.type, transactionType: record.Type.JOURNAL_ENTRY}
            });

            if (relatedTransaction) {
                libFunc.addButtonHandel(form, 'custpage_scv_update', 'Update JRL', urlSuitelet, recordId);
            } else {
                libFunc.addButtonHandel(form, 'custpage_scv_create', 'Create JRL', urlSuitelet, recordId);
            }
        }

        // Record type nào cần logic riêng (khác addButtonJournalOnly mặc định) thì khai báo handler ở đây.
        // Định nghĩa sau addButtonVendorCredit vì đây là const (không hoisting như function declaration).
        const ButtonHandlerByRecordType = {
            [RecordType.VENDOR_CREDIT]: addButtonVendorCredit
        };

        return {
            RecordType,
            AccountPrefix,
            SCRIPT_ID,
            DEPLOY_ID,
            addButtonByRecordType
        };

    });
