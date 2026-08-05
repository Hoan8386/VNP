/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record'],
	
	(record) => {
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
			let tgType = scriptContext.type;//log.error('tgType', tgType);
			let newRecord = scriptContext.newRecord;
			if(tgType === 'create' || tgType === 'copy' || tgType === 'transform') {
				createContraTransChange(newRecord, tgType);
			} else if(tgType === 'delete') {
				let oldRecord = scriptContext.oldRecord;
				createContraTransChange(oldRecord, tgType);
			} else if(tgType === 'edit') {
				newRecord = scriptContext.newRecord;
				let recType = newRecord.type;
				if(recType === 'journalentry') {
					createContraTransChange(newRecord, tgType);
				}
			}
		}
		
		const createContraTransChange = (newRecord, tgType) => {
			let listtype_in = ['vendorbill', 'vendorcredit', 'vendorprepaymentapplication', 'vendorpayment', 'customerdeposit', 'invoice', 'creditmemo'
				, 'depositapplication', 'customerpayment', 'cashsale', 'check', 'deposit', 'inventoryadjustment', 'inventorytransfer', 'itemfulfillment'
				, 'itemreceipt', 'expensereport'
				,'customtransaction_scv_closing_entry', 'journalentry', 'fxreval', 'customtransaction_fam_depr_jrn'
				,'assemblybuild'];
			
			let type = newRecord.type;
			let postingperiod = newRecord.getValue('postingperiod');
			let listtype = ['salesorder', 'vendorreturnauthorization', 'returnauthorization'];
			if(!listtype.includes(type) && (postingperiod || listtype_in.includes(type))) {
				let recCtc = record.create({type: 'customrecord_scv_contra_trans_change'});
				recCtc.setValue('name', tgType + '_' + (newRecord.getValue('tranid') || newRecord.id));
				recCtc.setValue('custrecord_scv_ctc_transid', newRecord.id);
				recCtc.setValue('custrecord_scv_ctc_transtype', newRecord.type);
				recCtc.save();
			}
		}
		
		return {
			afterSubmit
		};
		
	});
