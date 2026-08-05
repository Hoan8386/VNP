/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/config', 'N/format', 'N/record', 'N/runtime', 'N/search', '../lib/scv_lib_report.js', '../lib/scv_lib_utils.js'],
	
	(config, format, record, runtime, search, libRep, libUtil) => {
		
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
			let cc_runfrom = currentScript.getParameter({name : 'custscript_scv_mr_cc_runfrom'});
			let list_c = [], pageinfo = null, params = [];
			let sql = "select t.id, t.tranid, t.recordtype, to_number(to_char(t.lastmodifieddate,'YYYYMMDDHH24Miss')) lastmodifieddate, t.voided from transaction t where (t.recordtype in ('fxreval','transfer') or t.voided = 'T' or t.isreversal = 'T') ";//t.status = 'V'
			let sql1 = "select t.id, t.tranid, t.recordtype  from transactionline tl join transaction t on tl.transaction = t.id where tl.isrevrectransaction = 'T' and tl.mainline = 'T' "
			if(!!cc_runfrom) {
				//sql = sql + " and t.trandate >= '" + format.format({type: format.Type.DATE, value: cc_runfrom}) + "'";
				let lastmodifieddate = getStringdate(cc_runfrom);
				sql = sql + " and to_number(to_char(t.lastmodifieddate,'YYYYMMDDHH24Miss')) >= '" + lastmodifieddate + "'";
				sql1 = sql1 + " and to_number(to_char(t.lastmodifieddate,'YYYYMMDDHH24Miss')) >= '" + lastmodifieddate + "'";
			} else {
				let lastmodifieddate = getStringdate(getDateNowForQuery());
				sql = sql + " and to_number(to_char(t.lastmodifieddate,'YYYYMMDDHH24Miss')) >= " + lastmodifieddate + "";
				sql1 = sql1 + " and to_number(to_char(t.lastmodifieddate,'YYYYMMDDHH24Miss')) >= '" + lastmodifieddate + "'";
			}
			sql1 = sql1 + " group by t.id, t.tranid, t.recordtype";
			log.debug('sql', sql);
			log.debug('sql1', sql1);
			libRep.doSearchSql(list_c, pageinfo, sql, params);
			libRep.doSearchSql(list_c, pageinfo, sql1, params);
			return list_c;
		}
		
		const getStringdate = (dateip) => {
			let strdate = '';
			if(!!dateip) {
				strdate = dateip.getFullYear() + '' + ((dateip.getMonth() + 1) + '').padStart(2, '0') + (dateip.getDate() + '').padStart(2, '0')
					+ (dateip.getHours() + '').padStart(2, '0') + (dateip.getMinutes() + '').padStart(2, '0') + (dateip.getSeconds() + '').padStart(2, '0');
			}
			return strdate;
		}
		
		/**
		 * Executes when the map entry point is triggered and applies to each key/value pair.
		 *
		 * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
		 * @since 2015.1
		 */
		const map = (context) => {
			let obj = JSON.parse(context.value);log.debug('obj', obj);
			let recTC = record.create({type: 'customrecord_scv_contra_trans_change'});
			recTC.setValue('name', obj.voided === 'T' ? 'delete_' : '' + obj.tranid);
			recTC.setValue('custrecord_scv_ctc_transid', obj.id);
			recTC.setValue('custrecord_scv_ctc_transtype', obj.recordtype);
			recTC.save({enableSourcing: true, ignoreMandatoryFields : true});
		}
		
		/**
		 * Executes when the reduce entry point is triggered and applies to each group.
		 *
		 * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
		 * @since 2015.1
		 */
		const reduce = (context) => {
		
		}
		
		
		/**
		 * Executes when the summarize entry point is triggered and applies to the result set.
		 *
		 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
		 * @since 2015.1
		 */
		const summarize = (summary) => {
		
		}
		
		const getDateNowForQuery = () => {
			let now = new Date();
			let sdate = now.toString();
			let p1 = sdate.substring(28,29);
			let p2 = sdate.substring(29,31);
			let tcurr = getCurrentGmt();
			if(p1 === '-') {
				tcurr = tcurr + 1 * p2;
			} else {
				tcurr = tcurr - 1 * p2;
			}
			return new Date(now.getTime() + ((tcurr - 0.45) * 3600000));
		}
		
		const getCurrentGmt = () => {
			let u = config.load({type: config.Type.USER_PREFERENCES});
			let tz = u.getValue('TIMEZONE')
			return libUtil.getObjGmtWithTz()[tz];
		}
		
		return {
			getInputData,
			map,
			reduce,
			summarize
		};
		
	});
