
function customizeGlImpact(transactionRecord, standardLines, customLines, book) {	
	var transactionId = transactionRecord.id;
	//nlapiLogExecution("DEBUG", 'transactionId', transactionId);
	if(!!transactionId) {
		var tranid = transactionRecord.getFieldValue('tranid');
		var type =  transactionRecord.getRecordType();
		if(type !== 'purchaseorder' && type !== 'salesorder' && type !== 'vendorreturnauthorization' && type !== 'returnauthorization' && type !== 'opportunity') {
			var recCtc = nlapiCreateRecord('customrecord_scv_contra_trans_change');
			recCtc.setFieldValue('name', tranid || transactionId);
			recCtc.setFieldValue('custrecord_scv_ctc_transid', transactionId);
			recCtc.setFieldValue('custrecord_scv_ctc_transtype', type);
			nlapiSubmitRecord(recCtc);
		}
	}
}    