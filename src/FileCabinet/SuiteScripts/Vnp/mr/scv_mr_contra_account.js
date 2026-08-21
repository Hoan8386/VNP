/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/format', 'N/query', 'N/record', 'N/runtime', 'N/search', '../lib/scv_lib_report.js', '../olib/alasql/alasql.min@4.6.6.js'],
	(format, query, record, runtime, search, libRep, alasql) => {
		
		/**
		 * Marks the beginning of the Map/Reduce process and generates input data.
		 *
		 * @typedef {Object} ObjectRef
		 * @property {number} id - Internal ID of the record instance
		 * @property {string} type - Record type id
		 *
		 * @return {Array|Object|Search|RecordRef} inputSummary
		 * @since 2015.1
		 */
		const getInputData = () => {
			let currentScript = runtime.getCurrentScript();
			let ca_runall = currentScript.getParameter({name : 'custscript_scv_mr_ca_runall'});
			let ca_runfrom = currentScript.getParameter({name : 'custscript_scv_mr_ca_runfrom'});
			let ca_runto = currentScript.getParameter({name : 'custscript_scv_mr_ca_runto'});
			let ca_runtransaction = currentScript.getParameter({name : 'custscript_scv_mr_ca_transaction'});
			let ca_savedsearch = currentScript.getParameter({name : 'custscript_scv_mr_ca_savedsearch'});
			let ca_sql = currentScript.getParameter({name : 'custscript_scv_mr_ca_sql'});
			let list_c = [], pageinfo = null, params = [];
			let sql = "select c.id, c.name, c.custrecord_scv_ctc_transid transid, c.custrecord_scv_ctc_transtype transtype from customrecord_scv_contra_trans_change c where c.isinactive = 'F'";
			if(ca_runall === true || ca_runall === 'T') {
				sql = "select t.id name, t.id transid, t.recordtype transtype from transaction t where t.posting = 'T' or t.recordtype = 'customtransaction_scv_closing_entry'";
			} else if(ca_runfrom && ca_runto) {
				ca_runfrom = format.format({type: format.Type.DATE, value: ca_runfrom});
				ca_runto = format.format({type: format.Type.DATE, value: ca_runto});
				sql = "select t.id name, t.id transid, t.recordtype transtype from transaction t where (t.posting = 'T' or t.recordtype = 'customtransaction_scv_closing_entry') and t.trandate >= '" + ca_runfrom + "' and t.trandate <= '" + ca_runto + "'";
			} else if(ca_runfrom) {
				ca_runfrom = format.format({type: format.Type.DATE, value: ca_runfrom});
				sql = "select t.id name, t.id transid, t.recordtype transtype from transaction t where (t.posting = 'T' or t.recordtype = 'customtransaction_scv_closing_entry') and t.trandate >= '" + ca_runfrom + "'";
			} else if(ca_runto) {
				ca_runto = format.format({type: format.Type.DATE, value: ca_runto});
				sql = "select t.id name, t.id transid, t.recordtype transtype from transaction t where (t.posting = 'T' or t.recordtype = 'customtransaction_scv_closing_entry') and t.trandate <= '" + ca_runto + "'";
			} else if(!!ca_runtransaction) {
				sql = "select t.id name, t.id transid, t.recordtype transtype from transaction t where (t.posting = 'T' or t.recordtype = 'customtransaction_scv_closing_entry') and t.id=" + ca_runtransaction;
			} else if(ca_savedsearch) {
				sql = '';
				let filters_ss = [];
				let col_ss = [['name', 1], ['transid', 0], ['transtype', 2]];
				libRep.doSearchSS(ca_savedsearch, 1000, list_c, filters_ss, col_ss);
			} else if(ca_sql) {
				sql = ca_sql;
			} else {
				let sqldlt = "select listagg(c.id, ',') lid, c.custrecord_scv_ctc_transid from customrecord_scv_contra_trans_change c where c.isinactive = 'F' group by c.custrecord_scv_ctc_transid having count(c.id) > 1";
				let objT, lid;
				//lrp.doSearchSql(list_d, pageinfo, sqldlt, []);
				let list_d = doSearchSQLMore(sqldlt, []);
				let options = {enableSourcing: false, ignoreMandatoryFields : true};
				for(let i in list_d) {
					objT = list_d[i];
					lid = objT.lid;
					lid = lid.split(',');
					for(let j in lid) {
						if(j > 0) {
							record.submitFields({type: 'customrecord_scv_contra_trans_change', id: lid[j], values: {isinactive: true}, options: options});
						}
					}
				}
			}
			if(sql) {
				log.debug('sql', sql);
				libRep.doSearchSql(list_c, pageinfo, sql, params);//log.debug('list_c', list_c);
				/*if(ca_sql) {
                    let recT = record.create({type: 'customrecord_scv_test'});
                    recT.setValue('name', 'Test');
                    recT.setValue('custrecord_scv_test_longtext', JSON.stringify(list_c));
                    recT.save();
                    return;
                }*/
			}
			return list_c;
		}
		
		const doSearchSQLMore = (sql, queryParams) => {
			return query.runSuiteQL({query: sql, params: queryParams}).asMappedResults();
		}
		
		/**
		 * Executes when the map entry point is triggered and applies to each key/value pair.
		 *
		 * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
		 * @since 2015.1
		 */
		const map = (context) => {
			let obj = JSON.parse(context.value);
			context.write({key: context.key, value: obj});
		}
		
		const deleteContra = (transactionid) => {
			let filtersh = [['custrecord_scv_contra_trans_h_createdid', 'is', transactionid], 'or', ['custrecord_scv_contra_trans_h_createfrom', 'anyof', transactionid]];
			let rCt = getRow1000('customrecord_scv_contra_trans', filtersh);
			let slContra = 'recmachcustrecord_scv_trans_l_header', recContra, lcContra;
			let isInsertContra = true;
			let listIdContra = [];
			for(let i in rCt) {
				recContra = record.load({type: 'customrecord_scv_contra_trans', id: rCt[i].id});
				let remove_exc = recContra.getValue('custrecord_scv_contra_trans_h_remove_exc');
				isInsertContra = !remove_exc;
				if(isInsertContra) {
					lcContra = recContra.getLineCount(slContra);
					if (lcContra > 0) {
						for (let j = 0; j < lcContra; j++) {
							recContra.removeLine({sublistId: slContra, line: 0});
						}
						recContra.save({enableSourcing: true, ignoreMandatoryFields: true});
						record.delete({type: recContra.type, id: rCt[i].id});
					}
				} else {
					listIdContra.push(rCt[i].id);
				}
			}
			let filters;
			if(listIdContra.length > 0) {
				isInsertContra = false;
			}
			if(isInsertContra) {
				filters = [['custrecord_scv_trans_l_id', 'is', transactionid], 'or', ['custrecord_scv_trans_l_created_from', 'anyof', transactionid]];
				deleteRecord('customrecord_scv_contra_trans_line', filters);
			}
			return isInsertContra;
		}
		
		const getRow1000 = (type, filters) => {
			let s = search.create({
				type: type,
				filters: filters,
				columns: ['internalid']
			});
			return s.run().getRange(0, 1000);
		}
		
		const deleteRecord = (type, filters, row) => {
			let r = row;
			if(!r) {
				r = getRow1000(type, filters);
			}
			for(let i in r) {
				record.delete({type: type, id: r[i].id});
			}
		}
		
		/**
		 * Executes when the reduce entry point is triggered and applies to each group.
		 *
		 * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
		 * @since 2015.1
		 */
		const reduce = (context) => {
			let vlS = context.values;
			if(vlS.length > 0) {
				let valueS = JSON.parse(vlS[0]);
				if(!!valueS.id) {
					let options = {enableSourcing: false, ignoreMandatoryFields : true};
					record.submitFields({type: 'customrecord_scv_contra_trans_change', id: valueS.id, values: {isinactive: true}, options: options});
				}
				let transtype = valueS.transtype;
				if(!!transtype) {
					let name = valueS.name + '';
					let splname = name.split('_')[0];
					let transid = valueS.transid;
					let isInsertContra = false;
					try {
						if(splname === 'create' || splname === 'copy' || splname === 'transform') {
							isInsertContra = deleteContra(transid);
						} else if(splname === 'delete') {
							deleteContra(transid);
						} else {
							isInsertContra = deleteContra(transid);
						}
						if(isInsertContra) {
							insertContra(transid, transtype);
						}
					} catch(exception) {
						log.debug('exception', exception);
						createLog(transid, JSON.stringify(exception));
					}
				}
			}
		}
		
		const createLog = (name, content) => {
			let recLog = record.create({type: 'customrecord_scv_log'});
			recLog.setValue('name', name);
			recLog.setValue('custrecord_scv_log_content', content);
			recLog.save();
		}
		
		const insertContra = (transid, transtype) => {
			let results = [], arrCol = null, pageinfo = null, vnone = '-None-', splice = null, isnotgetdisplay = true;
			//let list_segid = ['cseg_scv_sc', 'cseg_scv_sg_proj', 'cseg_scv_projects', 'cseg_scv_cus_group', 'cseg_scv_kmcp'];//'cseg_scv_sc', 'cseg_scv_sg_proj', 'cseg_scv_projects', 'cseg_scv_cus_group', 'cseg_scv_kmcp',
			let col_doituong = {name: 'formulatext', label: 'doituong', formula: `CASE
					WHEN {type} LIKE 'Expense Report'
						THEN NULL
					WHEN {account} LIKE '133%'
						 OR {account} LIKE '333%'
						THEN COALESCE(
							{customermain.entityid},
							{vendor.entityid},
							{vendorline.entityid},
							{entity}
						)
					ELSE COALESCE(
						{vendorline.entityid},
						{vendor.entityid},
						{customer.entityid},
						{customermain.entityid}
					)
				END`};
			let col_entity_id = {name: 'formulatext', label: 'entity_id', formula: `CASE
					WHEN {type} LIKE 'Expense Report'
						THEN NULL
					WHEN {account} LIKE '133%'
						 OR {account} LIKE '333%'
						THEN COALESCE(
							{customermain.internalid},
							{vendor.internalid},
							{vendorline.internalid},
							{entity.id}
						)
					ELSE COALESCE(
						{vendorline.internalid},
						{vendor.internalid},
						{customer.internalid},
						{customermain.internalid}
					)
				END`};
			let columns_add = ['tranid', 'currency'
				, 'debitfxamount', 'creditfxamount', 'exchangerate', 'trandate', 'postingperiod', 'memomain', 'line', 'amount', 'fxamount', 'accountmain', 'createdfrom', 'custbody_scv_doc_number'
				,{name: 'custrecord_scv_opposite_account', join: 'account'}, 'transactionnumber', 'custbody_scv_invoice_number', 'custbody_scv_invoice_date', 'custbody_scv_tax_report'
				,col_doituong, col_entity_id];
			let arrFilter = [search.createFilter({name: 'internalid', operator: search.Operator.IS, values: transid})];
			let totalRecord = libRep.doSearchSSOrgPage(-36, 1000, results, arrFilter, arrCol, pageinfo, vnone, columns_add, splice, isnotgetdisplay).totalRecord;
			log.debug(transtype, results);
			
			if(totalRecord > 0) {
				let obj0 = results[0];
				let recContra = record.create({type: 'customrecord_scv_contra_trans', isDynamic: true});
				let slContra = 'recmachcustrecord_scv_trans_l_header';
				recContra.setValue('custrecord_scv_contra_trans_h_subsidiary', obj0.subsidiary);
				recContra.setValue('custrecord_scv_contra_trans_h_createfrom', transid);
				recContra.setText({fieldId : 'custrecord_scv_contra_trans_h_date', text : obj0.trandate});
				recContra.setValue('custrecord_scv_contra_trans_h_period', obj0.postingperiod);
				recContra.setValue('custrecord_scv_contra_trans_h_createdid', transid);
				recContra.setValue('custrecord_scv_contra_trans_h_createdtid', obj0.tranid);
				
				let advanceaccount = null, accountmain = null;
				if('expensereport' === transtype) {
					let recExp = record.load({type: transtype, id: transid});
					advanceaccount = recExp.getValue('advanceaccount');//Lay advanceaccount phai load record khong lookupFields dc
					accountmain = recExp.getValue('account');
					if(advanceaccount) {
						results.map(o => o.accountmain = advanceaccount);
					}
				}
				
				let listtype1 = ['vendorbill', 'vendorcredit', 'vendorprepayment', 'vendorprepaymentapplication', 'vendorpayment', 'customerdeposit', 'invoice', 'creditmemo'
					, 'depositapplication', 'customerpayment', 'cashsale', 'check', 'deposit', 'inventoryadjustment', 'itemfulfillment', 'expensereport', 'customerrefund'
					,'cashrefund', 'transfer', 'workordercompletion'];
				let listtype2 = ['customtransaction_scv_closing_entry', 'customtransaction_scv_clos_entry_posting', 'journalentry', 'fxreval'
					, 'customtransaction_fam_depr_jrn', 'customtransaction_fam_disp_jrn', 'customtransaction_fam_revaluation_jrn'
					,'customtransaction_fam_transfer_jrn', 'workorderissue', 'assemblybuild', 'assemblyunbuild'];
				let listtype3 = [''];//'assemblyunbuild'
				let listtype4 = ['inventorytransfer'];
				let listtype5 = ['ownershiptransfer', 'bulkownershiptransfer'];
				
				if(transtype === 'itemreceipt') {
					let lkIr = search.lookupFields({type: transtype, id: transid, columns: ['createdfrom', 'createdfrom.type']});
					let createdtype = lkIr['createdfrom.type'][0].value;
					if(createdtype === 'TrnfrOrd') {
						listtype4.push(transtype);
					} else {
						listtype1.push(transtype);
					}
				}
				if(listtype1.includes(transtype)) {
					let res1 = alasql("SELECT * FROM ? where memo in('Cost of Sales','Cost of Sales Adjustment') and posting = true and (debitamount * 1 >= 0.5 or creditamount * 1 >= 0.5)", [results]);
					let res2 = alasql("SELECT * FROM ? where memo not in('Cost of Sales','Cost of Sales Adjustment') and posting = true and accountmain != account and (debitamount * 1 >= 1 or creditamount * 1 >= 1)", [results]);
					createLineOneOneAmountCompare(recContra, slContra, transid, res1);
					createLineOneTwoMain(recContra, slContra, transid, res2, false, advanceaccount, accountmain);
				} else if(listtype2.includes(transtype) || listtype5.includes(transtype)) {
					let list_source_debit, list_source_credit;
					let objLastRes = results[results.length - 1];
					let memomain = objLastRes.memomain;
					let account_adjust = null;
					if(memomain && memomain.substring(0,31) === 'Balance Location Costing Group:') {
						let lineMaxCredit = getMaxIndex(results, ['creditamount']);
						let lineMaxDebit = getMaxIndex(results, ['debitamount']);
						let lineMax = Number(results[lineMaxCredit]['creditamount']) >= Number(results[lineMaxDebit]['debitamount']) ? lineMaxCredit : lineMaxDebit;
						
						objLastRes = results[lineMax];
						account_adjust = objLastRes.account;
						createLineJournalAdjust(recContra, slContra, transid, results, account_adjust, objLastRes.debitamount, objLastRes.creditamount, lineMax);
						
					} else {
						if(transtype !== 'customtransaction_scv_closing_entry') {
							list_source_debit  = alasql("SELECT * FROM ? where posting = true and debitamount * 1 >= 0.5 order by debitamount * 1", [results]);
							list_source_credit = alasql("SELECT * FROM ? where posting = true and creditamount * 1 >= 0.5 order by creditamount * 1", [results]);
						} else {
							list_source_debit  = alasql("SELECT * FROM ? where debitamount * 1 >= 0.5 order by debitamount * 1", [results]);
							list_source_credit = alasql("SELECT * FROM ? where creditamount * 1 >= 0.5 order by creditamount * 1", [results]);
						}
						createLineJournal(recContra, slContra, transid, list_source_debit, list_source_credit, 0, 0);
					}
				} else if(listtype3.includes(transtype)) {
					let res1 = alasql("SELECT * FROM ? where posting = true and (custrecord_scv_opposite_account === '' or custrecord_scv_opposite_account is null)  and (debitamount * 1 >= 0.5 or creditamount * 1 >= 0.5)", [results]);//customscript
					let res2 = alasql("SELECT * FROM ? where posting = true and custrecord_scv_opposite_account != '' and (debitamount * 1 >= 0.5 or creditamount * 1 >= 0.5)", [results]);//log.debug('res1', res1);log.debug('res2', res2);
					if(!res2 || res2.length < 1) {
						createLineOneTwoMain(recContra, slContra, transid, res1, true);
					} else {
						createLineOneFourMain(recContra, slContra, transid, res1, res2);//log.debug('res1', res1);log.debug('res2', res2);
					}
				} else if(listtype4.includes(transtype)) {
					let list_source_debit  = alasql("SELECT * FROM ? where posting = true and debitamount * 1 >= 0.5 and (customscript is null or customscript = '')", [results]);
					let list_source_credit = alasql("SELECT * FROM ? where posting = true and creditamount * 1 >= 0.5 and (customscript is null or customscript = '')", [results]);
					let listCustomscriptDebit = alasql("SELECT * FROM ? where posting = true and debitamount * 1 >= 0.5 and customscript != ''", [results]);
					let listCustomscriptCredit = alasql("SELECT * FROM ? where posting = true and creditamount * 1 >= 0.5 and customscript != ''", [results]);
					
					if(listCustomscriptDebit.length > 0) {
						createLineInventoryTransfer(recContra, slContra, transid, list_source_debit, listCustomscriptCredit);
						createLineInventoryTransfer(recContra, slContra, transid, listCustomscriptDebit, list_source_credit);
					} else {
						createLineInventoryTransfer(recContra, slContra, transid, list_source_debit, list_source_credit);
					}
				} else {
					let res1 = alasql("SELECT * FROM ? where posting = true and (debitamount * 1 >= 0.5 or creditamount * 1 >= 0.5)", [results]);
					createLineOnlyOne(recContra, slContra, transid, res1);
					
				}
				recContra.save({enableSourcing: false, ignoreMandatoryFields : true});
			}
		}
		
		const getMaxIndex = (arr, fieldId) => {
			return arr.reduce((maxIdx, item, idx, array) => {
				return Number(item[fieldId]) > Number(array[maxIdx][fieldId]) ? idx : maxIdx;
			}, 0);
		}
		
		const DicCreatedFromCurrency = Object.create(null);
		
		const setCurrentCommonHead = (recContra, slContra, objSC, transid) => {
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_subsidiary', value: objSC.subsidiary});
			recContra.setCurrentSublistText({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_date', text: objSC.trandate});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_period', value: objSC.postingperiod});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_currency', value: objSC.currency});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_exchange_rate', value: objSC.exchangerate});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_memo_main', value: objSC.memomain ? objSC.memomain.substring(0,300) : ''});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_created_from', value: transid});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_id', value: transid});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_tranid', value: objSC.tranid});
			
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_status', value: objSC.posting ? 1 : 2});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_tran_number', value: objSC.transactionnumber});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_inv_number', value: objSC.custbody_scv_invoice_number});
			recContra.setCurrentSublistText({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_inv_date', text: objSC.custbody_scv_invoice_date});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_show_taxreport', value: objSC.custbody_scv_tax_report});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_original_number', value: objSC.createdfrom});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_acconting_number', value: objSC.custbody_scv_doc_number});
			
			let currencyId = null;
			if(objSC.createdfrom) {
				let objCurrency = DicCreatedFromCurrency[objSC.createdfrom];
				if(!objCurrency) {
					let lkFieldsOrginalTransaction = search.lookupFields({type: search.Type.TRANSACTION, id: objSC.createdfrom, columns: ['currency']});
					objCurrency = {currencyId: lkFieldsOrginalTransaction.currency[0]?.value};
					DicCreatedFromCurrency[objSC.createdfrom] = objCurrency;
				}
				currencyId = objCurrency.currencyId;
			}
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_original_currency', value: currencyId});
		}
		
		const setCurrentCommon = (recContra, slContra, objSC) => {
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_name', value: objSC.entity_id});//objSC.entity
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_name_2', value: objSC.doituong});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_location', value: objSC.location});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_department', value: objSC.department});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_class', value: objSC['class']});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_lineid', value: objSC.line});
		}
		
		const setCurrentCommonContra = (recContra, slContra, objSN) => {
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_contra_location', value: objSN.location});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_contra_department', value: objSN.department});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_contra_class', value: objSN['class']});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_contra_name', value: objSN.entity});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_lineid', value: objSN.line});
		}
		
		const createLineOneOneAmountCompare = (recContra, slContra, transid, list_source) => {
			let lLS = list_source.length, j = 1, lLSmnone = lLS - 1;
			for(let i = 0; i < lLS; i++) {
				if(i % 2 === 0 && i < lLSmnone) {
					j = i + 1;
				} else {
					j = i - 1;
				}
				//log.error('check: ' + j, objSN);
				let objSC = list_source[i];
				let objSN = list_source[j];
				recContra.selectNewLine(slContra);
				setCurrentCommonHead(recContra, slContra, objSC, transid);//log.debug('objSC', objSC);
				
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_account', value: objSC.account});
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_amount_nt', value: objSC.fxamount * 1});
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit', value: Math.round(objSC.debitamount)});
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit', value: Math.round(objSC.creditamount)});
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_memo', value: objSC.memo ? objSC.memo.substring(0,300) : ''});
				setCurrentCommon(recContra, slContra, objSC);
				
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit_nt', value: objSC.debitfxamount * 1});
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit_nt', value: objSC.creditfxamount * 1});
				
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_account', value: objSN.account});
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_amount_nt', value: objSC.fxamount * (-1)});
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_debit', value: Math.round(objSC.creditamount)});
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_credit', value: Math.round(objSC.debitamount)});
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_memo', value: objSC.memo ? objSC.memo.substring(0,300) : ''});
				setCurrentCommonContra(recContra, slContra, objSN);
				
				recContra.commitLine(slContra);
			}
		}
		
		const createLineJournal = (recContra, slContra, transid, list_source_debit, list_source_credit, istart, jstart) => {
			let lDb = list_source_debit.length, is = istart, j = jstart;//, lCr = list_source_credit.length;
			//let lFF = lDb > lCr ? lCr : lDb;
			let isrunagain = false;
			for(let i = istart; i < lDb; i++) {
				let objSC = list_source_debit[i];
				if(!objSC.ischoise) {
					let lContra = getObjContraJournal(list_source_credit, j);
					let objContra = lContra.objContra;
					if(!!objContra) {
						let fxamount = objSC.fxamount * 1;
						let amount = objSC.amount * 1;
						let debitamount = objSC.debitamount * 1;
						let creditamount = '';
						let debitfxamount = objSC.debitfxamount * 1;
						let creditfxamount = '';
						
						if(Math.abs(amount) === Math.abs(objContra.amount * 1)) {
							createLineValue(recContra, slContra, objSC, transid, objContra, objSC.account, fxamount, debitamount, creditamount, objSC.memo, objContra.account, objContra.memo, debitfxamount, creditfxamount);
							createLineValue(recContra, slContra, objContra, transid, objSC, objContra.account, fxamount * -1, creditamount, debitamount, objContra.memo, objSC.account, objSC.memo, creditfxamount, debitfxamount);
							objSC.ischoise = true;is++;j = lContra.j + 1;
							objContra.ischoise = true;
						} else {
							isrunagain = true;
							if(debitamount > (objContra.creditamount * 1)) {
								objContra.ischoise = true;
								fxamount = objContra.fxamount * (-1);
								amount = objContra.amount * (-1);
								debitamount = objContra.creditamount * 1;
								createLineValue(recContra, slContra, objSC, transid, objContra, objSC.account, fxamount, debitamount, creditamount, objSC.memo, objContra.account, objContra.memo, debitfxamount, creditfxamount);
								createLineValue(recContra, slContra, objContra, transid, objSC, objContra.account, fxamount * -1, creditamount, debitamount, objContra.memo, objSC.account, objSC.memo, creditfxamount, debitfxamount);
								objSC.fxamount = objSC.fxamount * 1 - fxamount;
								objSC.debitamount = objSC.debitamount * 1 - debitamount;
								objSC.debitfxamount = objSC.debitfxamount * 1 - debitfxamount;
								j = lContra.j + 1;
								i = i - 1;//Them
							} else {
								createLineValue(recContra, slContra, objSC, transid, objContra, objSC.account, fxamount, debitamount, creditamount, objSC.memo, objContra.account, objContra.memo, debitfxamount, creditfxamount);
								createLineValue(recContra, slContra, objContra, transid, objSC, objContra.account, fxamount * -1, creditamount, debitamount, objContra.memo, objSC.account, objSC.memo, creditfxamount, debitfxamount);
								objSC.ischoise = true;
								objContra.fxamount = objContra.fxamount * 1 + fxamount;
								objContra.amount = objContra.amount * 1 + amount;
								objContra.creditamount = objContra.creditamount - debitamount;
								objContra.creditfxamount = objContra.creditfxamount - debitfxamount;
								is++;
								j = lContra.j;
							}
						}
					}
				}
			}
			/*if(isrunagain) {
                createLineJournal(recContra, slContra, transid, list_source_debit, list_source_credit, is, j);
            }*/
		}
		
		const createLineJournalAdjust = (recContra, slContra, transid, results, account_adjust, debitamount_adjust, creditamount_adjust, line_adjust) => {
			let lRes = results.length;
			for(let i = 0; i < lRes; i++) {
				if(i === line_adjust) {
					continue;
				}
				let objSC = results[i];
				let objContra = objSC;
				let amountPlace = '';
				if(objSC.debitamount > 0) {
					createLineValue(recContra, slContra, objSC, transid, objContra, objSC.account, objSC.fxamount, objSC.debitamount, amountPlace, objSC.memo, account_adjust, objContra.memo, objSC.debitfxamount, amountPlace);
					if(debitamount_adjust > 0) {
						createLineValue(recContra, slContra, objContra, transid, objSC, account_adjust, objSC.fxamount * -1, objSC.debitamount * -1, amountPlace, objContra.memo, objSC.account, objSC.memo, objSC.debitfxamount * -1, amountPlace);
					} else {
						createLineValue(recContra, slContra, objContra, transid, objSC, account_adjust, objSC.fxamount * -1, amountPlace, objSC.debitamount, objContra.memo, objSC.account, objSC.memo, amountPlace, objSC.debitfxamount);
					}
				} else if (objSC.creditamount > 0) {
					createLineValue(recContra, slContra, objSC, transid, objContra, objSC.account, objSC.fxamount, amountPlace, objSC.creditamount, objSC.memo, account_adjust, objContra.memo, amountPlace, objSC.creditfxamount);
					if(creditamount_adjust > 0) {
						createLineValue(recContra, slContra, objContra, transid, objSC, account_adjust, objSC.fxamount * -1, amountPlace, objSC.creditamount * -1, objContra.memo, objSC.account, objSC.memo, amountPlace, objSC.creditfxamount * -1);
					} else {
						createLineValue(recContra, slContra, objContra, transid, objSC, account_adjust, objSC.fxamount * -1, objSC.creditamount, amountPlace, objContra.memo, objSC.account, objSC.memo, objSC.creditfxamount, amountPlace);
					}
				}
			}
		}
		
		const getObjContraJournal = (list_source_credit, j) => {
			let cj = j;
			let objContra = list_source_credit[j];
			if(!!objContra) {
				if(objContra.ischoise) {
					cj++;
					objContra = getObjContraJournal(list_source_credit, cj);
				}
			}
			return {objContra: objContra, j: cj}
		}
		
		const createLineValue = (recContra, slContra, objSC, transid, objContra, account, fxamount, debitamount, creditamount, memo, contraaccount, contramemo, debitfxamount, creditfxamount) => {
			recContra.selectNewLine(slContra);
			setCurrentCommonHead(recContra, slContra, objSC, transid);
			
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_account', value: account});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_amount_nt', value: fxamount});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit', value: debitamount});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit', value: creditamount});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_memo', value: memo ? memo.substring(0,300) : ''});
			setCurrentCommon(recContra, slContra, objSC);
			
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit_nt', value: debitfxamount});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit_nt', value: creditfxamount});
			
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_account', value: contraaccount});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_amount_nt', value: fxamount * (-1)});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_debit', value: creditamount});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_credit', value: debitamount});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_memo', value: contramemo ? contramemo.substring(0,300) : ''});
			setCurrentCommonContra(recContra, slContra, objContra);
			
			recContra.commitLine(slContra);
		}
		
		const createLineInventoryTransfer = (recContra, slContra, transid, list_source_debit, list_source_credit) => {
			createLineJournal(recContra, slContra, transid, list_source_debit, list_source_credit, 0, 0);
		}
		
		const createLineOneTwoMain = (recContra, slContra, transid, list_source, isnoteqaccmain, advanceaccount, accountmain) => {
			let lLS = list_source.length;
			for(let i = 0; i < lLS; i++) {
				let objSC = list_source[i];
				if(isnoteqaccmain || objSC.account !== objSC.accountmain) {
					createLineOneTwoMainSub(recContra, slContra, transid, objSC, advanceaccount, accountmain)
				}
			}
		}
		
		const createLineOneTwoMainSub = (recContra, slContra, transid, objSC, advanceaccount, accountmain) => {
			//Line 1
			recContra.selectNewLine(slContra);
			setCurrentCommonHead(recContra, slContra, objSC, transid);
			
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_account', value: objSC.account});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_amount_nt', value: objSC.fxamount * 1});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit', value: Math.round(objSC.debitamount)});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit', value: Math.round(objSC.creditamount)});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_memo', value: objSC.memo ? objSC.memo.substring(0,300) : ''});
			setCurrentCommon(recContra, slContra, objSC);
			
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit_nt', value: objSC.debitfxamount * 1});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit_nt', value: objSC.creditfxamount * 1});
			
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_account', value: objSC.accountmain});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_amount_nt', value: objSC.fxamount * (-1)});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_debit', value: Math.round(objSC.creditamount)});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_credit', value: Math.round(objSC.debitamount)});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_memo', value: objSC.memomain ? objSC.memomain.substring(0,300) : ''});
			setCurrentCommonContra(recContra, slContra, objSC);
			
			recContra.commitLine(slContra);
			
			//Line 2
			recContra.selectNewLine(slContra);
			setCurrentCommonHead(recContra, slContra, objSC, transid);
			
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_account', value: objSC.accountmain});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_amount_nt', value: objSC.fxamount * 1});
			if(advanceaccount && accountmain && objSC.accountmain === advanceaccount && objSC.account === accountmain) {
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit', value: Math.round(objSC.debitamount * -1)});
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit', value: Math.round(objSC.creditamount * -1)});
			} else {
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit', value: Math.round(objSC.creditamount)});
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit', value: Math.round(objSC.debitamount)});
			}
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_memo', value: objSC.memomain ? objSC.memomain.substring(0,300) : ''});
			setCurrentCommon(recContra, slContra, objSC);
			
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit_nt', value: objSC.creditfxamount * 1});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit_nt', value: objSC.debitfxamount * 1});
			
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_account', value: objSC.account});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_amount_nt', value: objSC.fxamount * (-1)});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_debit', value: Math.round(objSC.debitamount)});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_credit', value: Math.round(objSC.creditamount)});
			recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_memo', value: objSC.memo ? objSC.memo.substring(0,300) : ''});
			setCurrentCommonContra(recContra, slContra, objSC);
			
			recContra.commitLine(slContra);
		}
		
		const createLineOneFourMain = (recContra, slContra, transid, list_source, list_source2) => {
			let lLS = list_source.length;
			let lLS2 = list_source2.length;
			for(let i = 0; i < lLS2; i++) {
				let objSC = list_source2[i];
				if(objSC.account !== objSC.accountmain) {
					//Line 1
					recContra.selectNewLine(slContra);
					setCurrentCommonHead(recContra, slContra, objSC, transid);
					
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_account', value: objSC.account});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_amount_nt', value: objSC.fxamount * 1});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit', value: Math.round(objSC.debitamount)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit', value: Math.round(objSC.creditamount)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_memo', value: objSC.memo  ? objSC.memo.substring(0,300) : ''});
					setCurrentCommon(recContra, slContra, objSC);
					
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit_nt', value: objSC.debitfxamount * 1});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit_nt', value: objSC.creditfxamount * 1});
					
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_account', value: objSC.custrecord_scv_opposite_account});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_amount_nt', value: objSC.fxamount * (-1)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_debit', value: Math.round(objSC.creditamount)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_credit', value: Math.round(objSC.debitamount)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_memo', value: objSC.memo ? objSC.memo.substring(0,300) : ''});
					setCurrentCommonContra(recContra, slContra, objSC);
					
					recContra.commitLine(slContra);
					
					//Line 2
					recContra.selectNewLine(slContra);
					setCurrentCommonHead(recContra, slContra, objSC, transid);
					
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_account', value: objSC.custrecord_scv_opposite_account});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_amount_nt', value: objSC.fxamount * 1});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit', value: Math.round(objSC.creditamount)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit', value: Math.round(objSC.debitamount)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_memo', value: objSC.memo ? objSC.memo.substring(0,300) : ''});
					setCurrentCommon(recContra, slContra, objSC);
					
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit_nt', value: objSC.creditfxamount * 1});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit_nt', value: objSC.debitfxamount * 1});
					
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_account', value: objSC.account});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_amount_nt', value: objSC.fxamount * (-1)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_debit', value: Math.round(objSC.debitamount)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_credit', value: Math.round(objSC.creditamount)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_memo', value: objSC.memo ? objSC.memo.substring(0,300) : ''});
					setCurrentCommonContra(recContra, slContra, objSC);
					
					recContra.commitLine(slContra);
					
					//Line 3
					recContra.selectNewLine(slContra);
					setCurrentCommonHead(recContra, slContra, objSC, transid);
					
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_account', value: objSC.custrecord_scv_opposite_account});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_amount_nt', value: objSC.fxamount * 1});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit', value: Math.round(objSC.debitamount)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit', value: Math.round(objSC.creditamount)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_memo', value: objSC.memo ? objSC.memo.substring(0,300) : ''});
					setCurrentCommon(recContra, slContra, objSC);
					
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit_nt', value: objSC.debitfxamount * 1});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit_nt', value: objSC.creditfxamount * 1});
					
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_account', value: objSC.accountmain});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_amount_nt', value: objSC.fxamount * (-1)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_debit', value: Math.round(objSC.creditamount)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_credit', value: Math.round(objSC.debitamount)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_memo', value: objSC.memomain ? objSC.memomain.substring(0,300) : ''});
					setCurrentCommonContra(recContra, slContra, objSC);
					
					recContra.commitLine(slContra);
					
					//Line 4
					recContra.selectNewLine(slContra);
					setCurrentCommonHead(recContra, slContra, objSC, transid);
					
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_account', value: objSC.accountmain});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_amount_nt', value: objSC.fxamount * 1});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit', value: Math.round(objSC.creditamount)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit', value: Math.round(objSC.debitamount)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_memo', value: objSC.memomain ? objSC.memomain.substring(0,300) : ''});
					setCurrentCommon(recContra, slContra, objSC);
					
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit_nt', value: objSC.creditfxamount * 1});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit_nt', value: objSC.debitfxamount * 1});
					
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_account', value: objSC.custrecord_scv_opposite_account});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_amount_nt', value: objSC.fxamount * (-1)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_debit', value: Math.round(objSC.debitamount)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_credit', value: Math.round(objSC.creditamount)});
					recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_contra_trans_l_memo', value: objSC.memo ? objSC.memo.substring(0,300) : ''});
					setCurrentCommonContra(recContra, slContra, objSC);
					
					recContra.commitLine(slContra);
				}
			}
			for(let i = 0; i < lLS; i++) {
				let objSC = list_source[i];
				if(!objSC.customscript && objSC.account !== objSC.accountmain) {
					createLineOneTwoMainSub(recContra, slContra, transid, objSC)
				}
			}
		}
		
		const createLineOnlyOne = (recContra, slContra, transid, list_source) => {
			let lLS = list_source.length;
			for(let i = 0; i < lLS; i++) {
				let objSC = list_source[i];
				recContra.selectNewLine(slContra);
				setCurrentCommonHead(recContra, slContra, objSC, transid);
				
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_account', value: objSC.account});
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_amount_nt', value: objSC.fxamount * 1});
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit', value: Math.round(objSC.debitamount)});
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit', value: Math.round(objSC.creditamount)});
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_memo', value: objSC.memo ? objSC.memo.substring(0,300) : ''});
				setCurrentCommon(recContra, slContra, objSC);
				
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_debit_nt', value: objSC.debitfxamount * 1});
				recContra.setCurrentSublistValue({sublistId: slContra, fieldId: 'custrecord_scv_trans_l_credit_nt', value: objSC.creditfxamount * 1});
				
				recContra.commitLine(slContra);
			}
		}
		
		/**
		 * Executes when the summarize entry point is triggered and applies to the result set.
		 *
		 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
		 * @since 2015.1
		 */
		const summarize = (summary) => {
		
		}
		
		return {
			getInputData,
			map,
			reduce,
			summarize
		};
		
	});
