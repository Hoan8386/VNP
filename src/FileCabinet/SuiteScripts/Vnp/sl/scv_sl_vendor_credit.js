/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/search', '../common/scv_common_internal.js'],

    (record, search, commonInternal) => {

        const RecordType = {
            VENDOR_CREDIT: 'vendorcredit'
        };

        const GL_IMPACT_JRL_SEARCH = 'customsearch_scv_gl_impact_crete_jrl';

        const GlImpactColumnLabel = {
            ACCOUNT_DEBIT: 'AccountDebit',
            ACCOUNT_CREDIT: 'AccountCredit',
            AMOUNT: 'Amount'
        };

        // Mặc định VND = 1, mặc định exchange rate = 1 (theo VNP_FDD.xlsx mục 2.2)
        const DEFAULT_CURRENCY_VND = '1';
        const APPROVAL_STATUS_APPROVED = '2';

        // Các field không được phép update lại sau khi chứng từ đã tạo
        const NonUpdatableFields = ['subsidiary', 'currency'];

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            let parameters = scriptContext.request.parameters;
            let vendorcreditId = parameters.vendorcreditId;
            let transactionType = parameters.transactionType;
            let transactionId = null;

            try {
                let recBillCredit = record.load({type: RecordType.VENDOR_CREDIT, id: vendorcreditId});
                let relatedTransactionId = recBillCredit.getValue({fieldId: 'custbody_scv_related_transaction'});

                let requestBody = transactionType === record.Type.CHECK
                    ? buildCheckRequestBody(recBillCredit)
                    : buildJournalRequestBody(recBillCredit);

                if (relatedTransactionId) {
                    requestBody.action = 'update';
                    requestBody.internalid = relatedTransactionId;
                    NonUpdatableFields.forEach(fieldId => delete requestBody.fields[fieldId]);
                    transactionId = commonInternal.updateRecord(requestBody, requestBody.type);
                } else {
                    transactionId = commonInternal.addRecord(requestBody, requestBody.type);

                    record.submitFields({
                        type: RecordType.VENDOR_CREDIT,
                        id: vendorcreditId,
                        values: {custbody_scv_related_transaction: transactionId},
                        options: {enableSourcing: false, ignoreMandatoryFields: true}
                    });
                }
            } catch (e) {
                log.error('onRequest error', e);
            }

            scriptContext.response.setHeader({name: 'Content-Type', value: 'application/json'});
            scriptContext.response.write(JSON.stringify({transactionId}));
        }

        /**
         * 2.1 Tạo Check - mapping theo VNP_FDD.xlsx (mục 2.1, màn hình Bill Credit).
         * @param {Record} recBillCredit
         * @returns {Object} requestBody theo mẫu {action, type, fields, sublists}
         */
        const buildCheckRequestBody = (recBillCredit) => {
            let getVal = (fieldId) => recBillCredit.getValue({fieldId});

            let fields = {
                entity: getVal('entity'),
                subsidiary: getVal('subsidiary'),
                account: getVal('custbody_scv_account'),
                currency: getVal('currency'),
                exchangerate: getVal('exchangerate'),
                memo: getVal('memo'),
                trandate: {text: recBillCredit.getText({fieldId: 'trandate'})},
                custbody_scv_purchase_contract: getVal('custbody_scv_purchase_contract'),
                custbody_scv_beneficiary: getVal('custbody_scv_beneficiary'),
                custbody_scv_beneficiary_bank: getVal('custbody_scv_beneficiary_bank'),
                custbody_scv_bank_account: getVal('custbody_scv_bank_account'),
                custbody_scv_bank_name: getVal('custbody_scv_bank_name'),
                custbody_scv_bank_branch: getVal('custbody_scv_bank_branch'),
                custbody_scv_payment_number: getVal('custbody_scv_payment_number'),
                custbody_scv_related_transaction: recBillCredit.id,
                custbody_scv_sales_contract: getVal('custbody_scv_sales_contract'),
                custbody_scv_tb_entity_name: getVal('custbody_scv_tb_entity_name')
            };

            let sublists = {expense: buildCheckExpenseLines(recBillCredit)};

            return {action: 'add', type: record.Type.CHECK, fields, sublists};
        }

        const buildCheckExpenseLines = (recBillCredit) => {
            let sublistId = 'expense';
            let lineCount = recBillCredit.getLineCount({sublistId});
            let lines = [];
            for (let line = 0; line < lineCount; line++) {
                let getLineVal = (fieldId) => recBillCredit.getSublistValue({sublistId, fieldId, line});
                lines.push({
                    account: getLineVal('account'),
                    memo: getLineVal('memo'),
                    amount: getLineVal('amount'),
                    taxcode: getLineVal('taxcode'),
                    taxrate1: getLineVal('taxrate1'),
                    tax1amt: getLineVal('tax1amt'),
                    grossamt: getLineVal('grossamt'),
                    depatment: getLineVal('department')
                });
            }
            return lines;
        }

        /**
         * 2.2 Tạo Journal - mapping theo VNP_FDD.xlsx (mục 2.2, màn hình Bill Credit).
         * Line lấy từ ss SCV GL Impact _Create JRL (DONT UPDATE) - customsearch_scv_gl_impact_crete_jrl.
         * @param {Record} recBillCredit
         * @returns {Object} requestBody theo mẫu {action, type, fields, sublists}
         */
        const buildJournalRequestBody = (recBillCredit) => {
            let getVal = (fieldId) => recBillCredit.getValue({fieldId});

            let loaId = getVal('custbody_scv_loa');
            let bodyMemo = getVal('memo');
            let memo = loaId ? `Ghi nhận công nợ khoản vay_${recBillCredit.getText({fieldId: 'custbody_scv_loa'})}` : bodyMemo;
            let entity = getLoaEntity(loaId);

            let fields = {
                subsidiary: getVal('subsidiary'),
                currency: DEFAULT_CURRENCY_VND,
                exchangerate: 1,
                memo: memo,
                trandate: {text: recBillCredit.getText({fieldId: 'trandate'})},
                approvalstatus: APPROVAL_STATUS_APPROVED,
                custbody_scv_purchase_contract: getVal('custbody_scv_purchase_contract'),
                custbody_scv_payment_number: getVal('custbody_scv_payment_number'),
                custbody_scv_loa: loaId,
                custbody_scv_related_transaction: recBillCredit.id
            };

            let sublists = {line: buildJournalLines(recBillCredit.id, memo, entity)};

            return {action: 'add', type: record.Type.JOURNAL_ENTRY, fields, sublists};
        }

        const getLoaEntity = (loaId) => {
            if (!loaId) return '';
            let lkLoa = search.lookupFields({
                type: 'customrecord_scv_loa',
                id: loaId,
                columns: ['custrecord_scv_loa_entity']
            });
            let entity = lkLoa.custrecord_scv_loa_entity;
            return entity && entity.length > 0 ? entity[0].value : '';
        }

        /**
         * Mỗi dòng của ss GL Impact trả về 1 cặp Account Debit/Account Credit + Amount -> sinh 2 line JE (debit/credit).
         */
        const buildJournalLines = (billCreditId, memo, entity) => {
            let lines = [];
            let glSearch = search.load({id: GL_IMPACT_JRL_SEARCH});
            let filters = glSearch.filters;
            filters.push(search.createFilter({
                name: 'internalid',
                operator: search.Operator.ANYOF,
                values: [billCreditId]
            }));
            glSearch.filters = filters;

            let columnDebit = findColumnByLabel(glSearch.columns, GlImpactColumnLabel.ACCOUNT_DEBIT);
            let columnCredit = findColumnByLabel(glSearch.columns, GlImpactColumnLabel.ACCOUNT_CREDIT);
            let columnAmount = findColumnByLabel(glSearch.columns, GlImpactColumnLabel.AMOUNT);

            glSearch.run().each((result) => {
                let amount = columnAmount ? result.getValue(columnAmount) : '';
                let accountDebit = columnDebit ? result.getValue(columnDebit) : '';
                let accountCredit = columnCredit ? result.getValue(columnCredit) : '';
                if (accountDebit && amount) {
                    lines.push({account: accountDebit, debit: amount, memo: memo, entity: entity});
                }
                if (accountCredit && amount) {
                    lines.push({account: accountCredit, credit: amount, memo: memo, entity: entity});
                }
                return true;
            });

            return lines;
        }

        const findColumnByLabel = (columns, label) => columns.find(column => column.label === label);

        return {onRequest}

    });