/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/search', '../lib/scv_lib_function.js'],

    (record, runtime, search, libFunc) => {

        const searchRelatedTran = (id, sType) => {
            let idRelatedTran = null;
            if (id) {
                let sTran = search.create({
                    type: sType,
                    filters: [['custbody_scv_emp_number', search.Operator.ANYOF, id]
                    ],
                    columns: ['custbody_scv_emp_number']
                });
                let rTran = sTran.run().getRange({start: 0, end: 1});
                if (rTran.length > 0) {
                    idRelatedTran = rTran[0].id;
                }
            }
            return idRelatedTran;
        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @Since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            let newRecord = scriptContext.newRecord;
            let type = scriptContext.type;
            let form = scriptContext.form;
            let recType = newRecord.type;//log.debug('recType', recType);
            if (type === 'view') {
                let relatedId = newRecord.getValue('custbody_scv_related_transaction');
                if (relatedId !== undefined && (libFunc.isContainValue(relatedId) === false)) {
                    if (recType === record.Type.INVOICE || recType === record.Type.JOURNAL_ENTRY) {
                        let urlCheckReplace = "window.location.replace('/app/accounting/transactions/check.nl?createdfromid=" + newRecord.id + "&createdrectype=" + recType + "')";
                        if (recType === record.Type.INVOICE) {
                            form.addButton({id: 'custpage_bt_check', label: 'Check', functionName: urlCheckReplace});
                        }
                    }
                }
                if (recType === 'customrecord_scv_emp') {
                    let status = newRecord.getValue('custrecord_scv_emp_status');//Approved
                    let roleInfo = isPermission(status);
                    let roleCenter = roleInfo.roleCenter;//log.error('roleCenter', roleCenter);
                    let check_amount = newRecord.getValue('custrecord_scv_emp_check_amount');
                    let remaining_amount = newRecord.getValue('custrecord_scv_emp_remaining_amount');
                    let urlCheckReplace = "window.open('/app/accounting/transactions/check.nl?createdfromid=" + newRecord.id + "&createdrectype=" + recType + "')";
                    let emp_status = newRecord.getValue('custrecord_scv_emp_status');
                    if (emp_status === '11' && check_amount === 0) {//Approved
                        form.addButton({
                            id: 'custpage_bt_ep_check',
                            label: 'Check',
                            functionName: urlCheckReplace
                        });
                    }
                    if (remaining_amount > 0) {
                        urlCheckReplace = "window.location.replace('/app/accounting/transactions/exprept.nl?createdfromid=" + newRecord.id + "&createdrectype=" + recType + "')";
                        form.addButton({
                            id: 'custpage_bt_ep_expense_report',
                            label: 'Expense Report',
                            functionName: urlCheckReplace
                        });
                        urlCheckReplace = "window.location.replace('/app/accounting/transactions/deposit.nl?createdfromid=" + newRecord.id + "&createdrectype=" + recType + "')";
                        form.addButton({
                            id: 'custpage_bt_ep_deposit',
                            label: 'Deposit',
                            functionName: urlCheckReplace
                        });
                    }
                    if (remaining_amount !== 0) {
                        let urlJnReplace = "window.location.replace('/app/accounting/transactions/journal.nl?createdfromid=" + newRecord.id + "&createdrectype=" + recType + "')";
                        form.addButton({
                            id: 'custpage_bt_journal',
                            label: 'Journal',
                            functionName: urlJnReplace
                        });
                    }
                    //}
                    if (roleCenter === 'BASIC' || roleCenter === 'ACCOUNTCENTER' || roleCenter === 'SALESCENTER') {
                        let customer = newRecord.getValue('custrecord_scv_emp_customer');
                        if (libFunc.isContainValue(customer)) {
                            let readSublist = 'recmachcustrecord_scv_epl_prepayment';
                            let lCount = newRecord.getLineCount({sublistId: readSublist});
                            if (lCount === 0) {
                                newRecord = record.load({type: newRecord.type, id: newRecord.id});
                                lCount = newRecord.getLineCount({sublistId: readSublist});
                            }
                            /*let related_so = searchRelatedTran(newRecord.id, 'salesorder');
                            if (lCount > 0 && related_so == null) {
                                let urlSOReplace = "window.location.replace('/app/accounting/transactions/salesord.nl?createdfromid=" + newRecord.id + "&createdrectype=" + recType + "')";
                                form.addButton({
                                    id: 'custpage_bt_makeso',
                                    label: 'Make SO',
                                    functionName: urlSOReplace
                                });
                            }*/
                        }
                    }
                }
            } else if (type === 'copy') {
                libFunc.setValueData(newRecord, ['custbody_scv_created_transaction', 'custbody_scv_related_transaction', 'custbody_scv_doc_number'], ['', '', '', '']);
            } else if (type === 'create') {
                let request = scriptContext.request;
                if (libFunc.isContainValue(request) === false) {
                    return;
                }
                let param = request.parameters;
                let newRecrodType = newRecord.type;
                if (libFunc.isContainValue(param)) {
                    let trid = param.createdfromid;
                    let rectype = param.createdrectype;
                    if (libFunc.isContainValue(trid) && libFunc.isContainValue(rectype) && rectype !== 'customrecord_scv_emp' && rectype !== 'customrecord_scv_loa' && rectype !== 'inboundshipment') {
                        libFunc.setValueData(newRecord, ['custbody_scv_created_transaction', 'custbody_scv_related_transaction', 'custbody_scv_emp_number', 'custbody_scv_doc_number'], ['', '', '', '']);
                        if (newRecrodType === 'check') {
                            let readRecord = record.load({type: rectype, id: trid});
                            if (rectype === record.Type.INVOICE) {
                                let newFields = ['entity', 'subsidiary', 'location', 'department', 'class', 'currency', 'exchangerate', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj', 'memo'];
                                let readFields = ['entity', 'subsidiary', 'location', 'department', 'class', 'currency', 'exchangerate', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj', 'memo'];
                                libFunc.setValue(newRecord, readRecord, newFields, readFields);
                                let newSublist = 'expense';
                                let readSublist = 'item';
                                let lCount = readRecord.getLineCount({sublistId: readSublist});
                                let arrAcc = [], item = null, obj;
                                let newSublistFields = ['amount', 'taxcode', 'taxrate1', 'tax1amt', 'grossamt', 'memo', 'location', 'class', 'cseg_scv_seg_sc', 'custcol_scv_invoice_amount'];
                                let readSublistFields = ['amount', 'taxcode', 'taxrate1', 'tax1amt', 'grossamt', 'memo', 'location', 'class', 'cseg_scv_seg_sc', 'amount'];
                                for (let i = 0; i < lCount; i++) {
                                    item = readRecord.getSublistValue({
                                        sublistId: readSublist,
                                        fieldId: 'item',
                                        line: i
                                    });
                                    obj = libFunc.getObjFromArr(arrAcc, item);
                                    if (obj.id === undefined) {
                                        obj.id = item;
                                        obj.incomeaccount = getObjAccItem(item).incomeaccount;
                                        arrAcc.push(obj);
                                    }
                                    newRecord.insertLine({sublistId: newSublist, line: i});
                                    libFunc.setSublistValueData(newRecord, newSublist, ['account', 'department', 'custcol_scv_tax_type', 'memo', 'cseg_scv_sg_proj'], i, [obj.incomeaccount, 14, 1, readRecord.getValue('memo'), 1]);
                                    libFunc.setSublistValue(newRecord, readRecord, newSublist, readSublist, newSublistFields, readSublistFields, i);
                                }
                                libFunc.setValueData(newRecord, ['usertotal', 'taxtotal'], [readRecord.getValue('total'), readRecord.getValue('taxtotal')])

                            } else if (rectype === record.Type.VENDOR_CREDIT) {
                                let newFields = ['entity', 'subsidiary', 'location', 'department', 'class', 'currency', 'exchangerate', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj', 'memo'];
                                let readFields = ['entity', 'subsidiary', 'location', 'department', 'class', 'currency', 'exchangerate', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj', 'memo'];
                                libFunc.setValue(newRecord, readRecord, newFields, readFields);
                                let newSublist = 'expense';
                                let readSublist = 'expense';
                                let lCount = readRecord.getLineCount({sublistId: readSublist});
                                let newSublistFields = ['account', 'amount', 'taxcode', 'taxrate1', 'tax1amt', 'grossamt', 'memo', 'location', 'department', 'class', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj', 'custcol_scv_tax_type', 'custcol_scv_invoice_amount'];
                                let readSublistFields = ['account', 'amount', 'taxcode', 'taxrate1', 'tax1amt', 'grossamt', 'memo', 'location', 'department', 'class', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj', 'custcol_scv_tax_type', 'amount'];
                                for (let i = 0; i < lCount; i++) {
                                    newRecord.insertLine({sublistId: newSublist, line: i});
                                    libFunc.setSublistValue(newRecord, readRecord, newSublist, readSublist, newSublistFields, readSublistFields, i);
                                }
                                newRecord.setValue('usertotal', readRecord.getValue('usertotal'));
                            } else if (rectype === record.Type.JOURNAL_ENTRY) {
                                let newSublist = 'expense';
                                let readSublist = 'line';
                                let lCount = readRecord.getLineCount({sublistId: readSublist});
                                let account, amount, entity = '', cseg_scv_inter = '';//'subsidiary', 'location',
                                let newFields = ['department', 'class', 'currency', 'exchangerate', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj', 'memo'];
                                let readFields = ['department', 'class', 'currency', 'exchangerate', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj', 'memo'];
                                //33690001 1426
                                let tkTG = String(getAccountFlNumber('33690001'));
                                for (let i = 0; i < lCount; i++) {
                                    account = readRecord.getSublistValue({
                                        sublistId: readSublist,
                                        fieldId: 'account',
                                        line: i
                                    });
                                    if (account === tkTG) {
                                        entity = readRecord.getSublistValue({
                                            sublistId: readSublist,
                                            fieldId: 'entity',
                                            line: i
                                        });
                                        cseg_scv_inter = readRecord.getSublistValue({
                                            sublistId: readSublist,
                                            fieldId: 'cseg_scv_inter',
                                            line: i
                                        });
                                        break;
                                    }
                                }
                                let subsidiary = '';
                                if (libFunc.isContainValue(cseg_scv_inter)) {
                                    let lkInter = search.lookupFields({
                                        type: 'customrecord_cseg_scv_inter',
                                        id: cseg_scv_inter,
                                        columns: ['custrecord_scv_inter_subsidiary']
                                    });
                                    subsidiary = lkInter.custrecord_scv_inter_subsidiary;
                                    if (libFunc.isContainValue(subsidiary) && subsidiary.length > 0) {
                                        subsidiary = subsidiary[0].value;
                                    } else {
                                        subsidiary = '';
                                    }
                                }
                                let nf = ['entity'], ndata = [entity];
                                if (libFunc.isContainValue(subsidiary)) {
                                    nf.push('subsidiary');
                                    ndata.push(subsidiary);
                                }
                                let hsub = readRecord.getValue('subsidiary');
                                let linter = '';
                                let s = search.create({
                                    type: 'customrecord_cseg_scv_inter',
                                    filters: [['custrecord_scv_inter_subsidiary', 'anyof', hsub]],
                                    columns: ['internalid']
                                });
                                let r = s.run().getRange({start: 0, end: 1});
                                if (r.length > 0) {
                                    linter = r[0].id;
                                }

                                libFunc.setValueData(newRecord, nf, ndata);
                                libFunc.setValue(newRecord, readRecord, newFields, readFields);

                                let newSublistFields = ['account', 'amount', 'taxcode', 'taxrate1', 'tax1amt', 'grossamt', 'memo', 'location', 'department', 'class', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj', 'custcol_scv_tax_type', 'custcol_scv_invoice_amount'];
                                let readSublistFields = ['account', 'amount', 'taxcode', 'taxrate1', 'tax1amt', 'grossamt', 'memo', 'location', 'department', 'class', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj', 'custcol_scv_tax_type', 'amount'];

                                let j = 0, total = 0;
                                for (let i = 0; i < lCount; i++) {
                                    account = readRecord.getSublistValue({
                                        sublistId: readSublist,
                                        fieldId: 'account',
                                        line: i
                                    });
                                    if (account === tkTG) {
                                        amount = readRecord.getSublistValue({
                                            sublistId: readSublist,
                                            fieldId: 'credit',
                                            line: i
                                        });
                                        if (amount > 0) {
                                            readSublistFields[1] = 'credit';
                                            readSublistFields[13] = 'credit';
                                        } else {
                                            amount = readRecord.getSublistValue({
                                                sublistId: readSublist,
                                                fieldId: 'debit',
                                                line: i
                                            });
                                            readSublistFields[1] = 'debit';
                                            readSublistFields[13] = 'debit';
                                        }
                                        total = total + amount * 1;
                                        newRecord.insertLine({sublistId: newSublist, line: j});
                                        libFunc.setSublistValueDiff(newRecord, readRecord, newSublist, readSublist, newSublistFields, readSublistFields, j, i);
                                        libFunc.setSublistValueData(newRecord, newSublist, ['taxcode', 'taxrate1', 'tax1amt', 'grossamt', 'cseg_scv_inter'], j, [5, 0, 0, amount, linter]);
                                        j++;
                                    }
                                }
                                newRecord.setValue('usertotal', total);
                            }
                            libFunc.setValueData(newRecord, ['custbody_scv_created_transaction'], [trid]);
                        } else if (newRecrodType === record.Type.DEPOSIT) {
                            let readRecord = record.load({type: rectype, id: trid});
                            let location = readRecord.getValue('location');
                            let newFields = ['subsidiary', 'location', 'department', 'class', 'currency', 'exchangerate', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj', 'memo'];
                            let readFields = ['subsidiary', 'location', 'department', 'class', 'currency', 'exchangerate', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj', 'memo'];
                            libFunc.setValue(newRecord, readRecord, newFields, readFields);
                            let newSublist = 'other';
                            let readSublist = 'expense';
                            let lCount = readRecord.getLineCount({sublistId: readSublist});
                            let newSublistFields = ['account', 'amount', 'memo', 'department', 'class', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj'];
                            let readSublistFields = ['account', 'amount', 'memo', 'department', 'class', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj'];
                            let entity = readRecord.getValue('entity');
                            let i;
                            for (i = 0; i < lCount; i++) {
                                newRecord.insertLine({sublistId: newSublist, line: i});
                                libFunc.setSublistValueData(newRecord, newSublist, ['entity', 'location'], i, [entity, location]);
                                libFunc.setSublistValue(newRecord, readRecord, newSublist, readSublist, newSublistFields, readSublistFields, i);
                            }
                            readSublist = 'item';
                            lCount = readRecord.getLineCount({sublistId: readSublist});
                            newSublistFields = ['amount', 'memo', 'department', 'class', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj'];
                            readSublistFields = ['amount', 'memo', 'department', 'class', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj'];
                            let item, lkF, expenseaccount, temp;
                            for (let j = 0; j < lCount; j++) {
                                expenseaccount = '';
                                item = readRecord.getSublistValue({sublistId: readSublist, fieldId: 'item', line: j});
                                lkF = search.lookupFields({type: 'item', id: item, columns: ['expenseaccount']});
                                temp = lkF.expenseaccount;
                                if (libFunc.isContainValue(temp) && temp.length > 0) {
                                    expenseaccount = temp[0].value;
                                }
                                newRecord.insertLine({sublistId: newSublist, line: i});
                                libFunc.setSublistValueData(newRecord, newSublist, ['entity', 'account', 'location'], i, [entity, expenseaccount, location]);
                                libFunc.setSublistValueDiff(newRecord, readRecord, newSublist, readSublist, newSublistFields, readSublistFields, i, j);
                                i++;
                            }

                            libFunc.setValueData(newRecord, ['custbody_scv_created_transaction'], [trid]);
                        } else if (newRecrodType === record.Type.ADV_INTER_COMPANY_JOURNAL_ENTRY) {
                            let readRecord = record.load({type: rectype, id: trid});
                            let subsidiary = readRecord.getValue('subsidiary');
                            let exchangerate = readRecord.getValue('exchangerate');
                            let currency = readRecord.getValue('currency');

                            let newFields = ['subsidiary', 'currency', 'memo'];
                            let readFields = ['subsidiary', 'currency', 'memo'];
                            let newSublist = 'line';
                            let readSublist = 'item', fieldId = 'item', category;
                            if (rectype === record.Type.EXPENSE_REPORT) {
                                readSublist = 'expense';
                                fieldId = 'account';
                                readFields[1] = 'expensereportcurrency';
                                readFields[2] = 'expensereportexchangerate';
                                currency = readRecord.getValue('expensereportcurrency');
                                exchangerate = readRecord.getValue('expensereportexchangerate');
                            } else if (rectype === record.Type.JOURNAL_ENTRY) {
                                readSublist = 'line';
                                fieldId = 'account';
                            }
                            let memo = readRecord.getValue('memo');
                            libFunc.setValue(newRecord, readRecord, newFields, readFields);
                            let lCount = readRecord.getLineCount({sublistId: readSublist});
                            let newSublistData = ['linesubsidiary', 'linefxrate', 'account', 'custcol_scv_tax_type', 'cseg_scv_inter', 'linebasecurrency', 'custcol_scv_budget_item', 'memo'];
                            let budget_item; //tk3369 = 1426,
                            let tk3369 = getAccountFlNumber('33690001');
                            let newSublistFieldsDeb = ['debit', 'custcol_scv_invoice_amount', 'memo', 'department', 'class', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj', 'linetotalamt'];
                            let newSublistFieldsCre = ['credit', 'custcol_scv_invoice_amount', 'memo', 'department', 'class', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj', 'linetotalamt'];
                            let readSublistFields = ['amount', 'custcol_scv_invoice_amount', 'description', 'department', 'class', 'cseg_scv_seg_sc', 'cseg_scv_sg_proj', 'amount'];
                            if (rectype === record.Type.JOURNAL_ENTRY) {
                                let fieldAdds = ['amortizationtype', 'schedule', 'scheduletype', 'scheduletype', 'startdate', 'enddate'];
                                newSublistFieldsDeb = newSublistFieldsDeb.concat(fieldAdds);
                                newSublistFieldsCre = newSublistFieldsCre.concat(fieldAdds);
                                readSublistFields = readSublistFields.concat(fieldAdds);
                            }
                            let account, item, cseg_scv_inter, lkF, subinter, lkInter;
                            let line = 0, temp;
                            let s = search.create({
                                type: 'customrecord_cseg_scv_inter',
                                filters: [['custrecord_scv_inter_subsidiary', 'anyof', subsidiary]],
                                columns: ['internalid']
                            });
                            let r = s.run().getRange({start: 0, end: 1});
                            let intersub = '';
                            if (r.length > 0) {
                                intersub = r[0].id;
                            }

                            for (let i = 0; i < lCount; i++) {
                                budget_item = readRecord.getSublistValue({
                                    sublistId: readSublist,
                                    fieldId: 'custcol_scv_budget_item',
                                    line: i
                                });
                                cseg_scv_inter = readRecord.getSublistValue({
                                    sublistId: readSublist,
                                    fieldId: 'cseg_scv_inter',
                                    line: i
                                });
                                if (libFunc.isContainValue(cseg_scv_inter)) {
                                    if (fieldId === 'account') {
                                        account = readRecord.getSublistValue({
                                            sublistId: readSublist,
                                            fieldId: fieldId,
                                            line: i
                                        });
                                        if (rectype === record.Type.EXPENSE_REPORT && libFunc.isContainValue(account) === false) {
                                            category = readRecord.getSublistValue({
                                                sublistId: readSublist,
                                                fieldId: 'category',
                                                line: i
                                            });
                                            lkF = search.lookupFields({
                                                type: 'expensecategory',
                                                id: category,
                                                columns: ['account']
                                            });
                                            account = lkF.account[0].value;
                                        }
                                    } else {
                                        item = readRecord.getSublistValue({
                                            sublistId: readSublist,
                                            fieldId: fieldId,
                                            line: i
                                        });
                                        lkF = search.lookupFields({
                                            type: 'item',
                                            id: item,
                                            columns: ['expenseaccount', 'incomeaccount']
                                        });
                                        if (rectype === record.Type.CREDIT_MEMO) {
                                            account = lkF.incomeaccount[0].value;
                                        } else {
                                            account = lkF.expenseaccount[0].value;
                                        }
                                    }
                                    lkInter = search.lookupFields({
                                        type: 'customrecord_cseg_scv_inter',
                                        id: cseg_scv_inter,
                                        columns: ['custrecord_scv_inter_subsidiary']
                                    });
                                    subinter = lkInter.custrecord_scv_inter_subsidiary;
                                    if (libFunc.isContainValue(subinter) && subinter.length > 0) {
                                        subinter = subinter[0].value;
                                    } else {
                                        subinter = '';
                                        continue;
                                    }
                                    if (readSublist === 'line') {
                                        temp = readRecord.getSublistValue({
                                            sublistId: readSublist,
                                            fieldId: 'credit',
                                            line: i
                                        });
                                        if (libFunc.isContainValue(temp) && temp !== 0) {
                                            readSublistFields[0] = 'credit';
                                        } else {
                                            readSublistFields[0] = 'debit';
                                        }
                                    }

                                    newRecord.insertLine({sublistId: newSublist, line: line});
                                    libFunc.setSublistValueData(newRecord, newSublist, newSublistData, line, [subsidiary, exchangerate, tk3369, 1, cseg_scv_inter, currency, '', memo]);
                                    libFunc.setSublistValueDiff(newRecord, readRecord, newSublist, readSublist, newSublistFieldsDeb, readSublistFields, line, i);
                                    line++;
                                    newRecord.insertLine({sublistId: newSublist, line: line});
                                    libFunc.setSublistValueData(newRecord, newSublist, newSublistData, line, [subsidiary, exchangerate, account, 1, '', currency, budget_item, memo]);
                                    libFunc.setSublistValueDiff(newRecord, readRecord, newSublist, readSublist, newSublistFieldsCre, readSublistFields, line, i);
                                    line++;

                                    newRecord.insertLine({sublistId: newSublist, line: line});
                                    libFunc.setSublistValueData(newRecord, newSublist, newSublistData, line, [subinter, exchangerate, account, 1, '', currency, budget_item, memo]);
                                    libFunc.setSublistValueDiff(newRecord, readRecord, newSublist, readSublist, newSublistFieldsDeb, readSublistFields, line, i);
                                    line++;
                                    newRecord.insertLine({sublistId: newSublist, line: line});
                                    libFunc.setSublistValueData(newRecord, newSublist, newSublistData, line, [subinter, exchangerate, tk3369, 1, intersub, currency, '', memo]);
                                    libFunc.setSublistValueDiff(newRecord, readRecord, newSublist, readSublist, newSublistFieldsCre, readSublistFields, line, i);
                                    line++;
                                }
                            }
                            libFunc.setValueData(newRecord, ['custbody_scv_created_transaction'], [trid]);

                        } else if (newRecrodType === record.Type.JOURNAL_ENTRY) {
                            let readRecord = record.load({type: rectype, id: trid});
                            let vat_import = readRecord.getValue('custbody_scv_vat_import') || 0;
                            let newFields = ['subsidiary', 'location', 'department', 'class', 'trandate', 'postingperiod', 'memo', 'cseg_scv_projects', 'custbody_scv_itr_custom_no', 'custbody_scv_tb_entity_name'];//, 'currency', 'exchangerate'
                            let readFields = ['subsidiary', 'location', 'department', 'class', 'trandate', 'postingperiod', 'memo', 'cseg_scv_projects', 'custbody_scv_itr_custom_no', 'entity'];//, 'currency', 'exchangerate'
                            libFunc.setValue(newRecord, readRecord, newFields, readFields);
                            let tk3319 = getAccountFlNumber('33191001');
                            let tk3312 = getAccountFlNumber('33312001');
                            let newSublist = 'line';
                            let newSublistFieldsDb = ['account', 'taxcode', 'taxrate1', 'debit', 'tax1amt', 'grossamt'];
                            let newSublistFieldsCr = ['account', 'taxcode', 'taxrate1', 'credit'];

                            let import_code = readRecord.getValue('custbody_scv_vat_import_code') || 5;
                            let import_code_rate = 0;
                            if (!!import_code) {
                                let lkTx = search.lookupFields({
                                    type: 'salestaxitem',
                                    id: import_code,
                                    columns: ['rate']
                                });
                                import_code_rate = lkTx.rate;
                            }

                            let i = 0;
                            newRecord.insertLine({sublistId: newSublist, line: i});
                            libFunc.setSublistValueData(newRecord, newSublist, newSublistFieldsDb, i, [tk3319, import_code, import_code_rate, 0, vat_import, vat_import]);//207, 10
                            i++;
                            newRecord.insertLine({sublistId: newSublist, line: i});
                            libFunc.setSublistValueData(newRecord, newSublist, newSublistFieldsCr, i, [tk3312, 5, 0, vat_import]);

                            libFunc.setValueData(newRecord, ['custbody_scv_created_transaction', 'currency', 'exchangerate'], [trid, 1, 1]);
                        } else if (newRecrodType === rectype) {
                            copyRecordFromId(newRecord, trid, ['expense', 'item']);
                        }
                    } else if (newRecrodType === record.Type.VENDOR_PAYMENT) {
                        libFunc.setValueData(newRecord, ['custbody_scv_created_transaction', 'custbody_scv_related_transaction', 'custbody_scv_emp_number', 'custbody_scv_doc_number'], ['', '', '', '']);
                        /*let bill = param.bill;
                        let entity = param.entity;
                        if (libFunc.isContainValue(bill) && libFunc.isContainValue(entity)) {
                            let lkTran = search.lookupFields({
                                type: 'transaction',
                                id: bill,
                                columns: ['recordtype', 'custbody_scv_emp_number']
                            });
                            let emp_number = lkTran.custbody_scv_emp_number;
                            if (libFunc.isContainValue(emp_number) && emp_number.length > 0) {
                                emp_number = emp_number[0].value;
                            } else {
                                emp_number = '';
                            }
                            libFunc.setValueData(newRecord, ['custbody_scv_emp_number'], [emp_number]);
                        }*/
                    }

                    if (libFunc.isContainValue(trid) && rectype === 'customrecord_scv_emp') {
                        let readRecord = record.load({type: rectype, id: trid});
                        let emp = readRecord.getValue('custrecord_scv_emp_employee');
                        let emp_currency = readRecord.getValue('custrecord_scv_emp_currency');
                        libFunc.addButtonBack(scriptContext.form, trid, rectype);
                        let readEmp = record.load({type: record.Type.EMPLOYEE, id: emp});
                        let account = readEmp.getValue('custentity_scv_emp_prepayment_account');
                        if (libFunc.isContainValue(account) === false) {
                            account = getAccountFlNumber('141100001');//tam ung tien
                        }
                        libFunc.setValueData(newRecord, ['custbody_scv_emp_number'], [trid]);
                        if (newRecrodType === 'check') {
                            let newSublist = 'expense';//item
                            libFunc.setValueData(newRecord, ['entity', 'currency'], [emp, emp_currency]);
                            libFunc.setValue(newRecord, readRecord, ['duedate', 'memo', 'custbody_scv_beneficiary', 'usertotal'],
                                ['custrecord_scv_emp_due_date', 'custrecord_scv_emp_memo', 'custrecord_scv_emp_beb', 'custrecord_scv_emp_prepayment_amount']);
                            let slEmp = 'recmachcustrecord_scv_emp_line_amt_emp';
                            let line_fields = ['account', 'amount', 'memo', 'custcol_scv_invoice_amount'];
                            let line_fields_n = ['location', 'department', 'class', 'taxcode'];
                            let taxcode = '5', amount, linememo;//UNDEF
                            let lcEmp = readRecord.getLineCount(slEmp);
                            if (lcEmp > 0) {
                                for (let i = 0; i < lcEmp; i++) {
                                    newRecord.insertLine({sublistId: newSublist, line: i});
                                    amount = readRecord.getSublistValue({
                                        sublistId: slEmp,
                                        fieldId: 'custrecord_scv_emp_line_amt',
                                        line: i
                                    });
                                    linememo = readRecord.getSublistValue({
                                        sublistId: slEmp,
                                        fieldId: 'custrecord_scv_emp_line_amt_des',
                                        line: i
                                    });
                                    libFunc.setSublistValueData(newRecord, newSublist, line_fields, i, [account, amount, linememo, amount]);

                                    libFunc.setSublistValueData(newRecord, newSublist, line_fields_n, i,
                                        [readEmp.getValue('location'), readEmp.getValue('department'), readEmp.getValue('class'), taxcode]);
                                }
                            } else {
                                newRecord.insertLine({sublistId: newSublist, line: 0});
                                let amount = readRecord.getValue('custrecord_scv_emp_prepayment_amount');
                                libFunc.setSublistValueData(newRecord, newSublist, line_fields, 0, [account, amount, readRecord.getValue('custrecord_scv_emp_memo'), amount]);
                                libFunc.setSublistValueData(newRecord, newSublist, line_fields_n, 0,
                                    [readEmp.getValue('location'), readEmp.getValue('department'), readEmp.getValue('class'), taxcode]);
                            }
                        } else if (newRecrodType === record.Type.DEPOSIT) {
                            let newSublist = 'other';
                            libFunc.setValue(newRecord, readRecord, ['duedate', 'memo'], ['custrecord_scv_emp_due_date', 'custrecord_scv_emp_memo']);
                            newRecord.insertLine({sublistId: newSublist, line: 0});
                            libFunc.setSublistValueData(newRecord, newSublist, ['entity', 'account', 'amount'], 0, [emp, account, readRecord.getValue('custrecord_scv_emp_remaining_amount')]);
                            libFunc.setSublistValueData(newRecord, newSublist, ['location', 'department', 'class'], 0, [readEmp.getValue('location'), readEmp.getValue('department'), readEmp.getValue('class')]);
                        } else if (newRecrodType === record.Type.EXPENSE_REPORT) {
                            let form = scriptContext.form;
                            libFunc.setDisableFields(form, ['entity']);//, 'expensereportcurrency'
                            let recEmp = record.load({type: record.Type.EMPLOYEE, id: emp});
                            let currency = recEmp.getValue('currency');
                            libFunc.setValueData(newRecord, ['entity', 'expensereportcurrency', 'advanceaccount'], [emp, currency, account]);
                            libFunc.setValue(newRecord, readRecord, ['duedate', 'memo', 'advance'], ['custrecord_scv_emp_due_date', 'custrecord_scv_emp_memo', 'custrecord_scv_emp_remaining_amount']);
                        } else if (newRecrodType === record.Type.JOURNAL_ENTRY) {
                            libFunc.setValue(newRecord, readRecord, ['subsidiary', 'currency'], ['custrecord_scv_emp_subsidiary', 'custrecord_scv_emp_currency']);
                            libFunc.setValueData(newRecord, ['custbody_scv_emp_number'], [trid]);
                        }

                        //}
                    }
                    if (libFunc.isContainValue(trid) && rectype === 'customrecord_scv_loa') {
                        let form = scriptContext.form;
                        let principal = param.principal;
                        let readLoa = record.load({type: rectype, id: trid});
                        let newFields = ['entity', 'subsidiary', 'currency'];
                        let readFields = ['custrecord_scv_loa_entity', 'custrecord_scv_loa_subsidiary', 'custrecord_scv_loa_currency'];
                        libFunc.setValueData(newRecord, ['custbody_scv_loa'], [trid]);
                        libFunc.setValue(newRecord, readLoa, newFields, readFields);
                        libFunc.setDisableFields(form, ['entity', 'subsidiary', 'custbody_scv_loa']);//'currency',
                        if (newRecrodType === record.Type.VENDOR_BILL) {
                            if (principal === true || principal === 'true') {
                                libFunc.setValue(newRecord, readLoa, ['trandate', 'duedate'], ['custrecord_scv_loa_start_date', 'custrecord_scv_loa_end_date']);
                                libFunc.setDisableFields(form, ['trandate', 'duedate']);
                            } else {
                                libFunc.setValueData(newRecord, ['account'], [getItemFlNumber('34190001')]);//34190001
                            }
                        } else if (newRecrodType === record.Type.JOURNAL_ENTRY) {
                            //do nothing
                        } else if (newRecrodType === record.Type.INVOICE) {
                            if (principal === true || principal === 'true') {
                                libFunc.setValue(newRecord, readLoa, ['trandate', 'duedate'], ['custrecord_scv_loa_start_date', 'custrecord_scv_loa_end_date']);
                                libFunc.setDisableFields(form, ['trandate', 'duedate']);
                            } else {
                                libFunc.setValueData(newRecord, ['account'], [getItemFlNumber('13881101')]);//13881101
                            }
                        }
                    }
                }
            }
        }

        const getAccountFlNumber = (accNum) => {
            let s = search.create({
                type: 'account',
                columns: ['name'],
                filters: [['number', 'is', accNum]]
            });
            let r = s.run().getRange({start: 0, end: 1});
            let idAcc = '';
            if (r.length > 0) {
                idAcc = r[0].id;
            }
            return idAcc;
        }

        const getItemFlNumber = (accNum) => {
            let lacc = accNum.length;
            let s = search.create({
                type: 'item',
                columns: ['name'],
                filters: [["formulatext: substr({name}, 1, " + lacc + ")", 'is', accNum], 'and', ['isinactive', 'is', false]]
            });
            let r = s.run().getRange({start: 0, end: 1});
            let idAcc = '';
            if (r.length > 0) {
                idAcc = r[0].id;
            }
            return idAcc;
        }

        const isPermission = () => {
            return runtime.getCurrentUser();
        }

        const getObjAccItem = (item) => {
            let obj = {}, account;
            let recItem = search.lookupFields({type: search.Type.ITEM, id: item, columns: ['incomeaccount']});
            if (libFunc.isContainValue(recItem)) {
                account = recItem.incomeaccount;
                if (libFunc.isContainValue(account)) {
                    account = account[0].value;
                } else {
                    account = getAccountFlNumber('51120006'); //51120006
                }
            } else {
                account = getAccountFlNumber('51120006');
            }
            obj.incomeaccount = account;
            return obj;
        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            let tgType = scriptContext.type;
            if (tgType === 'create' || tgType === 'edit' || tgType === 'copy') {
                let newRecord = scriptContext.newRecord;
                let recType = newRecord.type;
                if (recType !== 'customrecord_scv_emp' && recType !== 'customrecord_scv_loa') {
                    let created_transaction = newRecord.getValue('custbody_scv_created_transaction');
                    if (libFunc.isContainValue(created_transaction)) {
                        let isUpdate = true;
                        let lkTran = search.lookupFields({
                            type: search.Type.TRANSACTION,
                            id: created_transaction,
                            columns: ['recordtype', 'custbody_scv_related_transaction']
                        });
                        let related_transaction = lkTran.custbody_scv_related_transaction;
                        if (tgType !== 'create') {
                            if (libFunc.isContainValue(related_transaction) && related_transaction.length > 0) {
                                related_transaction = related_transaction[0].value;
                                if (libFunc.isContainValue(related_transaction)) {
                                    isUpdate = false;
                                }
                            }
                        }
                        if (isUpdate) {
                            if (recType === "invoice" && lkTran.recordtype === "fulfillmentrequest") {
                                let frRec = record.load({
                                    type: lkTran.recordtype,
                                    id: created_transaction
                                });
                                frRec.setValue("custbody_scv_related_transaction", [newRecord.id])
                                frRec.save();
                            } else if (recType === "creditmemo" && lkTran.recordtype === "salesorder") {
                                let loaId = newRecord.getValue('custbody_scv_loa');
                                // BA. Tam Update 24/4/2024
                                if (loaId) {
                                    record.submitFields({
                                        type: lkTran.recordtype, id: created_transaction,
                                        values: {custbody_scv_related_trans_script: newRecord.id}
                                    });
                                }
                            } else {
                                record.submitFields({
                                    type: lkTran.recordtype, id: created_transaction,
                                    values: {custbody_scv_related_transaction: newRecord.id},
                                    options: {enableSourcing: false, ignoreMandatoryFields: true}
                                });
                            }
                        }
                    }
                }
                let empid = newRecord.getValue('entity');
                let emp_number = newRecord.getValue('custbody_scv_emp_number');
                if (recType === 'customrecord_scv_emp') {
                    emp_number = newRecord.id;
                    empid = newRecord.getValue('custrecord_scv_emp_employee');
                    if (tgType === 'edit') {
                        let oldRecord = scriptContext.oldRecord;
                        let o_empid = oldRecord.getValue('custrecord_scv_emp_employee');
                        if (empid !== o_empid) {
                            updateEmployee(emp_number, o_empid);
                        }
                    }
                }
                updateEmpNumber(emp_number);
                updateEmployee(emp_number, empid);

                let loa = newRecord.getValue('custbody_scv_loa');
                if (recType === 'customrecord_scv_loa') {
                    loa = newRecord.id;
                }

                updateLoa(loa);

                if (tgType === 'edit' && recType !== 'customrecord_scv_emp' && recType !== 'customrecord_scv_loa') {
                    let oldRecord = scriptContext.oldRecord;
                    let o_emp_number = newRecord.getValue('custbody_scv_emp_number');
                    let o_loa = oldRecord.getValue('custbody_scv_loa');
                    let o_empid = oldRecord.getValue('entity');
                    if (o_emp_number !== emp_number) {
                        updateEmpNumber(o_emp_number);
                        updateEmployee(o_emp_number, empid);
                        if (empid !== o_empid) {
                            updateEmployee(o_emp_number, o_empid);
                        }
                    } else if (empid !== o_empid) {
                        updateEmployee(o_emp_number, o_empid);
                    }
                    if (o_loa !== loa) {
                        updateLoa(o_loa);
                    }
                }

            } else if (tgType === 'delete') {
                let oldRecord = scriptContext.oldRecord;
                let emp_number = oldRecord.getValue('custbody_scv_emp_number');
                let empid = oldRecord.getValue('entity');
                updateEmpNumber(emp_number);
                updateEmployee(emp_number, empid);
                let loa = oldRecord.getValue('custbody_scv_loa');
                updateLoa(loa);
            }
        }


        const updateEmployee = (emp_number, empid) => {
            if (libFunc.isContainValue(emp_number)) {
                if (libFunc.isContainValue(empid) === false) {
                    let lkEmp = search.lookupFields({
                        type: 'customrecord_scv_emp',
                        id: emp_number,
                        columns: ['custrecord_scv_emp_employee']
                    });
                    empid = lkEmp.custrecord_scv_emp_employee[0].value;
                }
                let lkEmp = search.lookupFields({type: 'entity', id: empid, columns: ['recordtype']});
                let amount = getAmount('customsearch_scv_emp_remainingtotal', 0, empid, 'custrecord_scv_emp_employee');
                let recEmp = record.load({type: lkEmp.recordtype, id: empid});
                let creditAmount = recEmp.getValue('custentity_scv_creditlimit');
                recEmp.setValue('custentity_scv_remainingtotal', amount);
                recEmp.setValue('custentity_scv_emp_available', creditAmount - amount);
                recEmp.save({enableSourcing: false, ignoreMandatoryFields: true});
            }
        }

        const updateEmpNumber = (emp_number) => {
            if (libFunc.isContainValue(emp_number)) {
                let colFil = 'custbody_scv_emp_number';
                let checkAmount = getAmount('customsearch_scv_emp_precheck', 6, emp_number, colFil);
                let depositsAmount = getAmount('customsearch_scv_emp_deposits', 6, emp_number, colFil);
                let exprepAmount = getAmount('customsearch_scv_emp_exprep', 5, emp_number, colFil);
                let billPayAmount = getAmount('customsearch_scv_emp_billpayment', 6, emp_number, colFil);
                let remaining = checkAmount - depositsAmount - exprepAmount + billPayAmount;
                let recEmp = record.load({type: 'customrecord_scv_emp', id: emp_number});
                let fields = ['custrecord_scv_emp_check_amount', 'custrecord_scv_emp_deposit_amount', 'custrecord_scv_emp_exp',
                    'custrecord_scv_emp_billpayment', 'custrecord_scv_emp_remaining_amount'];
                libFunc.setValueData(recEmp, fields, [checkAmount, depositsAmount, exprepAmount, billPayAmount, remaining]);
                recEmp.save({enableSourcing: false, ignoreMandatoryFields: true});
            }
        }

        const updateLoa = (loa) => {
            if (libFunc.isContainValue(loa)) {
                let colFil = 'custbody_scv_loa';
                let principalAmount = getAmount('customsearch_scv_principal', 8, loa, colFil);
                let interestAmount = getAmount('customsearch_scv_interest', 8, loa, colFil);
                let addInterestPrincipalAmount = getAmount('customsearch_scv_add_interest', 9, loa, colFil);
                let principalPaidAmount = getAmount('customsearch_scv_principal_paid', 8, loa, colFil);
                let interestPaidAmount = getAmount('customsearch_scv_interest_paid', 8, loa, colFil);
                let paidAmount = principalPaidAmount + interestPaidAmount;
                let remainingAmount = principalAmount + interestAmount - paidAmount - addInterestPrincipalAmount;
                log.audit("Show value: ", {
                    principalAmount,
                    interestAmount,
                    addInterestPrincipalAmount,
                    principalPaidAmount,
                    interestPaidAmount
                });
                let recLoa = record.load({type: 'customrecord_scv_loa', id: loa});
                let fields = ['custrecord_scv_loa_principal_amount', 'custrecord_scv_loa_interest_amount', 'custrecord_scv_loa_payment_amount',
                    'custrecord_scv_loa_remaining_amount', 'custrecord_scv_loa_principal_paid_amount', 'custrecord_scv_loa_interest_paid_amount'
                    , 'custrecord_scv_loa_interest_to_principal'];
                libFunc.setValueData(recLoa, fields, [principalAmount, interestAmount, paidAmount, remainingAmount, principalPaidAmount, interestPaidAmount, addInterestPrincipalAmount]);
                recLoa.save({enableSourcing: false, ignoreMandatoryFields: true});
            }
        }

        const getAmount = (ssid, numCol, empNum, colFil) => {
            let s = search.load({id: ssid});
            let c = s.columns;
            let f = s.filters;
            f.push(search.createFilter({name: colFil, operator: search.Operator.ANYOF, values: empNum}));
            s.filters = f;
            let r = s.run().getRange({start: 0, end: 1000});
            let amount = 0;
            let l = r.length;
            for (i = 0; i < l; i++) {
                amount = amount + (r[i].getValue(c[numCol]) * 1 || 0)//new Number(r[i].getValue(c[numCol]));
            }
            return amount;
        }

        const copyRecordFromId = (newRecord, readid, sublists) => {
            let readReadcord = record.load({type: newRecord.type, id: readid});
            copyRecord(newRecord, readReadcord, sublists);
        }

        const copyRecord = (newRecord, readReadcord, sublists) => {
            let fields = ['entity', 'subsidiary', 'custbody_scv_order_type', 'account', 'department', 'class', 'currency', 'exchangerate', 'location'
                , 'cseg_scv_seg_sc', 'cseg_scv_sg_proj', 'memo', 'custbody_scv_memo2', 'usertotal', 'taxtotal'//, 'trandate', 'postingperiod'
                , 'createdfrom', 'custbody_scv_loa', 'cseg_scv_branch', 'custbody_scv_po_contract_no', 'custbody_scv_einvoice_code'
                , 'custbody_scv_contact_person', 'custbody_scv_pay_method', 'custbody_scv_invoice_pattern', 'custbody_scv_einvoice_legalname'
                , 'billaddresslist', 'custbody_scv_nguoi_mua_hang', 'custbody_scv_invoice_entity', 'custbody_scv_invoice_entity_legalname'
                , 'custbody_scv_invoice_entity_taxid', 'custbody_scv_invoice_entity_address', 'custbody_scv_invoice_entity_beb', 'cseg_scv_sg_pro_sta'
                , 'salesrep', 'custbody_scv_inv_subcustomer', 'custbody_scv_amount_in_word', 'custbody_scv_amount_in_word_en', 'custbody_scv_pay_method'
                , 'custbody_scv_invoice_pattern'];
            libFunc.setValue(newRecord, readReadcord, fields, fields);
            for (let i in sublists) {
                copySetLine(newRecord, readReadcord, sublists[i]);
            }
        }

        const copySetLine = (newRecord, readRecord, sublist) => {
            let lcSl = readRecord.getLineCount(sublist);
            let lineFields = ['account', 'category', 'amount', 'taxcode', 'taxrate1', 'tax1amt', 'grossamt', 'memo', 'department', 'class', 'cseg_scv_seg_sc'
                , 'cseg_scv_sg_proj', 'cseg_scv_branch', 'cseg_scv_sg_pro_sta', 'location', 'custcol_scv_invoice_taxreg', 'custcolscv_bill_custom_no'];
            let lineFieldsIt = ['item', 'itemtype', 'vendorname', 'custcol_scv_tc_item_code', 'description', 'price', 'quantity', 'units', 'rate', 'amount', 'taxcode', 'taxrate1'
                , 'tax1amt', 'grossamt', 'memo', 'department', 'class', 'cseg_scv_seg_sc'
                , 'cseg_scv_sg_proj', 'cseg_scv_branch', 'cseg_scv_sg_pro_sta', 'location', 'custcol_scv_invoice_taxreg'
                , 'custcolscv_bill_custom_no', 'custcol_scv_tax_type', 'custcol_scv_memo2', 'description', 'custcol_scv_free_gift_promo'
            ];
            for (let j = 0; j < lcSl; j++) {
                newRecord.insertLine({sublistId: sublist, line: j});
                libFunc.setSublistValue(newRecord, readRecord, sublist, sublist, lineFields, lineFields, j);
                libFunc.setSublistValue(newRecord, readRecord, sublist, sublist, lineFieldsIt, lineFieldsIt, j);
            }
        }

        return {
            beforeLoad,
            afterSubmit
        };

    });
