/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'
    ],

    (record, search) => {

        const CustomApprovalStatus = {
            DA_PHE_DUYET: '6'
        }

        const ApprovalStatus = {
            APPROVAL: '2',
        }

        const PAYMENT_TYPES = ['vendorpayment', 'vendorprepayment', 'customerrefund', 'check', 'cashrefund'];
        const DEPOSIT_TYPES = ['deposit', 'customerdeposit', 'cashsale', 'customerpayment'];
        const AP_TYPES = ['vendorbill', 'expensereport', 'vendorcredit', 'vendorprepaymentapplication'];
        const AR_TYPES = ['invoice', 'creditmemo', 'depositapplication'];
        const JOURNAL_TYPES = ['journalentry', 'customtransaction_fam_depr_jrn', 'customtransaction_fam_disp_jrn'
            , 'customtransaction_fam_revaluation_jrn', 'customtransaction_fam_transfer_jrn'];
        const SIMPLE_PREFIX_BY_TYPE = [
            ['itemreceipt', 'PN'],
            ['itemfulfillment', 'PX'],
            ['inventorytransfer', 'IT'],
            ['inventoryadjustment', 'IA'],
            ['purchasecontract', 'PC'],
            ['purchaserequisition', 'PR']
        ];

        const lookupAccountPrefix3 = (accountId) => {
            let lkAcc = search.lookupFields({type: search.Type.ACCOUNT, id: accountId, columns: ['number']});
            return lkAcc.number.substring(0, 3);
        };

        const lookupSubsidiaryTranPrefix = (subsidiary) => {
            if (!subsidiary) {
                return '';
            }
            let lkSub = search.lookupFields({type: 'subsidiary', id: subsidiary, columns: ['tranprefix']});
            return lkSub.tranprefix;
        };

        const isBlockedByMemorizedDoc = (newRecord) => {
            let memdoc = newRecord.getValue('memdoc');
            if (!memdoc) {
                return false;
            }
            if (!newRecord.id) {
                return true;
            }
            let lkT = search.lookupFields({type: newRecord.type, id: newRecord.id, columns: ['memorized']});
            return lkT.memorized === true || lkT.memorized === 'T';
        };

        const resolvePrefix = (newRecord, recType, account, approval_status) => {
            let prefix = '', accountnumber = '';
            if (PAYMENT_TYPES.includes(recType)) {
                if (account !== undefined && isNaN(account) === false && !!account) {
                    if (recType === 'check' || (recType !== 'check' && approval_status === CustomApprovalStatus.DA_PHE_DUYET)) {
                        accountnumber = lookupAccountPrefix3(account);
                        if (accountnumber === '111') {
                            prefix = 'PC';
                        } else if (accountnumber === '112') {
                            prefix = 'BN';//prefix = 'BC';
                        }
                    }
                }
            } else if (DEPOSIT_TYPES.includes(recType)) {
                if (newRecord.getValue('undepfunds') === 'T') {
                    if (recType === record.Type.CUSTOMER_PAYMENT || recType === record.Type.CASH_SALE) {
                        account = undefined;
                    }
                    if (recType === record.Type.DEPOSIT || recType === record.Type.CUSTOMER_PAYMENT || recType === record.Type.CUSTOMER_DEPOSIT) {
                        prefix = 'GL';
                    }
                }
                if (account !== undefined && isNaN(account) === false && !!account) {
                    accountnumber = lookupAccountPrefix3(account);
                    if (accountnumber === '111') {
                        prefix = 'PT';
                    } else if (accountnumber === '112') {
                        prefix = 'BC';//prefix = 'BN';
                    } else if (recType === record.Type.DEPOSIT || recType === record.Type.CUSTOMER_PAYMENT || recType === record.Type.CUSTOMER_DEPOSIT) {
                        prefix = 'GL';
                    }
                }
            } else if (AP_TYPES.includes(recType) || AR_TYPES.includes(recType) || JOURNAL_TYPES.includes(recType)) {
                prefix = 'GL';//prefix = 'AP' / 'AR'
            } else {
                let simplePrefixEntry = SIMPLE_PREFIX_BY_TYPE.find((entry) => entry[0] === recType);
                if (simplePrefixEntry) {
                    prefix = simplePrefixEntry[1];
                }
            }

            /**
             * PQH 20241023: fix lỗi trùng số do các GL đang create theo Account Number,
             *    nhưng document number lại không sử dụng Account Number làm prefix
             */
            if (prefix === 'GL') {
                accountnumber = '';
            }

            return {prefix, accountnumber};
        };

        const makeDocNumber = (newRecord) => {
            let doc_number = newRecord.getValue('custbody_scv_doc_number');
            let recType = newRecord.type;
            let trandate = newRecord.getValue('trandate');
            if (!trandate) {
                return false;
            }

            let postingperiod = newRecord.getValue('postingperiod');
            let approvalstatus = newRecord.getValue('approvalstatus');
            let isNumberable = doc_number !== undefined && !doc_number
                && (!!postingperiod || recType === record.Type.EXPENSE_REPORT)
                && (!approvalstatus || approvalstatus === ApprovalStatus.APPROVAL);
            if (!isNumberable) {
                return doc_number;
            }

            if (isBlockedByMemorizedDoc(newRecord)) {
                return doc_number;
            }

            let account = newRecord.getValue('account');
            let approval_status = newRecord.getValue('custbody_scv_approval_status');
            let {prefix, accountnumber} = resolvePrefix(newRecord, recType, account, approval_status);
            if (!prefix) {
                return doc_number;
            }

            let subsidiary = newRecord.getValue('subsidiary');
            let prefix_sub = lookupSubsidiaryTranPrefix(subsidiary);
            let year_month = trandate.getFullYear().toString().substring(2, 4);
            let type = 'ACCOUNTINGVOUCHER';

            doc_number = getDocNumber(subsidiary, type, accountnumber, prefix, prefix_sub, year_month, 0);
            try {
                newRecord.setValue('custbody_scv_doc_number', doc_number);
            } catch (e) {
                log.error('set doc number failed', e);
            }

            return doc_number;
        };

        const getDocNumber = (subsidiary, type, accountnumber, prefix, prefix_sub, year_month, times) => {
            if (times >= 5) {
                return '';
            }

            let {nextnumber} = searchDocNumber(subsidiary, type, accountnumber, prefix, year_month);
            let doc_number = `${prefix}${prefix_sub}${year_month}${(nextnumber + '').padStart(5, '0')}`;

            let recGcUnq = record.create({type: 'customrecord_scv_rcnumberunq'});
            recGcUnq.setValue('name', `${type}${doc_number}`);
            recGcUnq.setValue('externalid', `${type}${doc_number}`);
            try {
                recGcUnq.save();
            } catch (e) {
                log.error('exception', e);
                return getDocNumber(subsidiary, type, accountnumber, prefix, prefix_sub, year_month, times + 1);
            }
            return doc_number;
        };

        const buildAnyOfFilter = (fieldName, value, emptyValue) => {
            return search.createFilter({name: fieldName, operator: 'anyof', values: value || emptyValue});
        };

        const buildExactFilter = (fieldName, value) => {
            return value
                ? search.createFilter({name: fieldName, operator: 'is', values: value})
                : search.createFilter({name: fieldName, operator: search.Operator.ISEMPTY, values: ''});
        };

        const searchDocNumber = (subsidiary, type, accountnumber, prefix, year_month) => {
            let filters = [
                buildAnyOfFilter('custrecord_scv_rcn_subsidiary', subsidiary, '@NONE@'),
                buildExactFilter('custrecord_scv_rcn_type', type),
                buildExactFilter('custrecord_scv_rcn_accountnumber', accountnumber),
                buildExactFilter('custrecord_scv_rcn_prefix', prefix),
                buildExactFilter('custrecord_scv_rcn_yearmonth', year_month)
            ];

            let searchVN = search.create({
                type: 'customrecord_scv_rcnumber',
                filters: filters,
                columns: ['custrecord_scv_rcn_currentnumber']
            });
            let resultsVN = searchVN.run().getRange({start: 0, end: 1});

            let nextnumber = 1;
            let recDocNumId = '';

            if (resultsVN.length > 0) {
                let result = resultsVN[0];
                nextnumber = result.getValue('custrecord_scv_rcn_currentnumber') * 1 + 1;
                recDocNumId = result.id;

                record.submitFields({
                    type: 'customrecord_scv_rcnumber', id: result.id
                    , values: {custrecord_scv_rcn_currentnumber: nextnumber}
                    , options: {enableSourcing: false, ignoreMandatoryFields: true}
                });
            } else {
                recDocNumId = createDocNumber(subsidiary, type, accountnumber, prefix, year_month);
            }

            return {nextnumber: nextnumber, internalid: recDocNumId};
        };

        const createDocNumber = (subsidiary, type, accountnumber, prefix, year_month) => {
            let prefix_sub = lookupSubsidiaryTranPrefix(subsidiary);
            let recDocNum = record.create({type: 'customrecord_scv_rcnumber'});
            recDocNum.setValue('name', `${type}${prefix_sub}${prefix}${year_month}`);
            recDocNum.setValue('custrecord_scv_rcn_subsidiary', subsidiary);
            recDocNum.setValue('custrecord_scv_rcn_type', type);
            recDocNum.setValue('custrecord_scv_rcn_accountnumber', accountnumber);
            recDocNum.setValue('custrecord_scv_rcn_prefix', prefix);
            recDocNum.setValue('custrecord_scv_rcn_yearmonth', year_month);
            recDocNum.setValue('custrecord_scv_rcn_currentnumber', 1);
            return recDocNum.save();
        };

        return {
            makeDocNumber,
            searchDocNumber
        };

    });