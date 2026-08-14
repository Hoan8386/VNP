/**
 * Nội dung:
 * =======================================================================================
 * Date                 Author                  Description
 * 14 Aug 2026          Khanh Tran   		    Init, create file.
 * 14 Aug 2026          Khanh Tran              Tính toán field trên Inbound Shipment from ms. Thủy(https://app.clickup.com/t/86d413xaz)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search',
    '../lib/scv_lib_function.js',
    '../cons/scv_cons_search.js'
],

    function(search,
        lbf,
        constSearch
    ) {
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */

    function pageInit(scriptContext) {
        let curRec = scriptContext.currentRecord;
        let objRes = getTotalOfFieldsSublist(curRec, 'items', ['shipmentitemamount', 'custrecord_scv_ibs_custom_amt', 'custrecord_scv_inb_amt',
            'custrecord_scv_inb_amt_vnd', 'custrecord_scv_inb_importtax_amount', 'custrecord_scv_inb_tax_amount', 'custrecord_scv_inb_tax_total_item']);
        curRec.setValue('custrecord_scv_custom_amount', (objRes.shipmentitemamount * 1).toFixed(2));
        curRec.setValue('custrecord_scv_amt_good', (objRes.custrecord_scv_ibs_custom_amt * 1).toFixed(2));
        curRec.setValue('custrecord_scv_inb_exp_bh', objRes.custrecord_scv_inb_amt * 1);
        curRec.setValue('custrecord_scv_inb_total_amt_vnd', (objRes.custrecord_scv_inb_amt_vnd * 1).toFixed());
        curRec.setValue('custrecord_scv_importtax_amount', (objRes.custrecord_scv_inb_importtax_amount * 1).toFixed());
        curRec.setValue('custrecord_scv_imp_vatamt', (objRes.custrecord_scv_inb_tax_amount * 1).toFixed());
        curRec.setValue('custrecord_scv_inb_tax_total', (objRes.custrecord_scv_inb_tax_total_item * 1).toFixed());
    }
  
    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
        let curRec = scriptContext.currentRecord;
        let fieldId = scriptContext.fieldId; 
        let sl = scriptContext.sublistId;
        
        switch (fieldId) {
            case 'shipmentitemamount':
                setValueAmtVND(curRec, sl);//case 1
                setValueTtlAmtForeign(curRec, sl);//case 2
                setValH_custAmt(curRec, sl);//case 7
                break;
            case 'custrecord_scv_inb_decla_exr':
                fieldChanged_declaExr(curRec);//case 1,3
                break;
            case 'custrecord_scv_inb_amt':
                setValueTtlAmtVND(curRec, sl);//case 3
                setValH_ttlAmtForeign(curRec, sl);//case 9
                break;
            case 'custrecord_scv_inb_amt_vnd':
                setValueImpAmt(curRec, sl);//case 4
                setValueTaxAmt(curRec, sl);//case 5
                setValH_ttlAmtVND(curRec, sl);//case 10
                break;
            case 'custrecord_scv_inb_importtax_code':
                setValueImpAmt(curRec, sl);//case 4
                break;
            case 'custrecord_scv_inb_importtax_amount':
                setValueTaxAmt(curRec, sl);//case 5
                setValueTaxTotalItem(curRec, sl);//case 6
                setValH_ImpAmt(curRec, sl);//case 11
                break;
            case 'custrecord_inb_tax_code':
                setValueTaxAmt(curRec, sl);//case 5
                break;
            case 'custrecord_scv_inb_tax_amount':
                setValueTaxTotalItem(curRec, sl);//case 6
                setValH_taxAmt(curRec, sl);//case 12
                break;
            case 'custrecord_scv_ibs_custom_amt':
                setValH_amtVnd(curRec, sl);//case 8
                break;
            case 'custrecord_scv_inb_tax_total_item':
                setValH_taxTtl(curRec, sl);//case 13
                break;
            case 'custrecord_scv_inb_rate_cus':
            case 'custrecord_scv_inb_landcost':
                calcExpectedCustomRate(curRec, sl);
                setValueTtlAmtForeign(curRec, sl);//case 2
                break;
            case 'quantityexpected':
                setValueTtlAmtForeign(curRec, sl);//case 2
                break;
        }
    }

    const calcExpectedCustomRate = (_curRec, _sublistId) =>{
        let custrecord_scv_inb_rate_cus = _curRec.getCurrentSublistValue(_sublistId, "custrecord_scv_inb_rate_cus");
        let custrecord_scv_inb_landcost = _curRec.getCurrentSublistValue(_sublistId, "custrecord_scv_inb_landcost") * 1;
        let expectedrate = _curRec.getCurrentSublistValue(_sublistId, "expectedrate") * 1;
        let custrecord_scv_inb_expected_rate = 0;

        if(lbf.isContainValue(custrecord_scv_inb_rate_cus)){
            custrecord_scv_inb_expected_rate = custrecord_scv_inb_rate_cus * 1 + custrecord_scv_inb_landcost;
        }
        else{
            custrecord_scv_inb_expected_rate = expectedrate + custrecord_scv_inb_landcost;
        }
        custrecord_scv_inb_expected_rate = roundNumber(custrecord_scv_inb_expected_rate, 9);

        _curRec.setCurrentSublistValue(_sublistId, "custrecord_scv_inb_expected_rate", custrecord_scv_inb_expected_rate);
    }

    const fieldChanged_declaExr = (curRec) => {
        let decla_exr = curRec.getValue('custrecord_scv_inb_decla_exr') * 1; 
        let sl = 'items';
        for(let i = 0; i < curRec.getLineCount(sl); i++){
            curRec.selectLine(sl, i);
            
            let shipmentitemamount = curRec.getCurrentSublistValue(sl, 'shipmentitemamount');
            let amtVND = decla_exr * shipmentitemamount;
            curRec.setCurrentSublistValue({sublistId: sl, fieldId: 'custrecord_scv_ibs_custom_amt', value: (amtVND * 1).toFixed(2)});
            
            let amt = curRec.getCurrentSublistValue(sl, 'custrecord_scv_inb_amt');
            let ttlAmtVND =  decla_exr * amt;
            curRec.setCurrentSublistValue({sublistId: sl, fieldId: 'custrecord_scv_inb_amt_vnd', value: (ttlAmtVND * 1).toFixed(2)});

            curRec.commitLine(sl);
        }
    }

    const setValueTtlAmtVND = (curRec, sl) => {
        let decla_exr = curRec.getValue('custrecord_scv_inb_decla_exr') * 1; 
        let amt = curRec.getCurrentSublistValue(sl, 'custrecord_scv_inb_amt') * 1;
        let val = amt * decla_exr;
        curRec.setCurrentSublistValue({sublistId: sl, fieldId: 'custrecord_scv_inb_amt_vnd', value: (val * 1).toFixed(2)});
    }
        
    const setValueTtlAmtForeign = (curRec, sl) => {
        let custrecord_scv_inb_rate_cus = curRec.getCurrentSublistValue(sl, "custrecord_scv_inb_rate_cus") * 1;
        let custrecord_scv_inb_landcost = curRec.getCurrentSublistValue(sl, "custrecord_scv_inb_landcost") * 1;
        let val = 0;
        if(custrecord_scv_inb_rate_cus == 0 && custrecord_scv_inb_landcost == 0){
            let shipmentitemamount = curRec.getCurrentSublistValue(sl, 'shipmentitemamount') * 1;
            val = shipmentitemamount;
        }
        else{
            let quantityexpected = curRec.getCurrentSublistValue(sl, "quantityexpected") * 1;
            val = (custrecord_scv_inb_rate_cus + custrecord_scv_inb_landcost ) * quantityexpected;
        }
        
        curRec.setCurrentSublistValue({sublistId: sl, fieldId: 'custrecord_scv_inb_amt', value: val});
    }

    const setValueTaxAmt = (curRec, sl) => {
        let ttlAmtVND = curRec.getCurrentSublistValue(sl, 'custrecord_scv_inb_amt_vnd') * 1;
        let import_tax_amt = curRec.getCurrentSublistValue(sl, 'custrecord_scv_inb_importtax_amount') * 1;
    
        let taxCode_rate = 0;
        let taxCode = curRec.getCurrentSublistValue(sl, 'custrecord_inb_tax_code');
        if(taxCode){
            let objTaxCode = search.lookupFields({type: 'salestaxitem', id: taxCode, columns: ['rate']});
			taxCode_rate = objTaxCode.rate?.replace('%', '') * 1;
        }
        let val = (ttlAmtVND + import_tax_amt) * (taxCode_rate/100);
        curRec.setCurrentSublistValue({sublistId: sl, fieldId: 'custrecord_scv_inb_tax_amount', value: (val * 1).toFixed(2)});
    }

    const setValueImpAmt = (curRec, sl) => {
        let ttlAmtVND = curRec.getCurrentSublistValue(sl, 'custrecord_scv_inb_amt_vnd') * 1;
        let impTaxCode = curRec.getCurrentSublistValue(sl, 'custrecord_scv_inb_importtax_code') * 1;
        let val = ttlAmtVND * (impTaxCode/100);
        curRec.setCurrentSublistValue({sublistId: sl, fieldId: 'custrecord_scv_inb_importtax_amount', value: (val * 1).toFixed(2)});
    }

    const setValH_taxTtl = (curRec, sl) => {
        let val = getTotalOfFieldsSublist(curRec, sl, 'custrecord_scv_inb_tax_total_item');
        curRec.setValue('custrecord_scv_inb_tax_total', (val * 1).toFixed());
    }

    const setValH_taxAmt = (curRec, sl) => {
        let val = getTotalOfFieldsSublist(curRec, sl, 'custrecord_scv_inb_tax_amount');
        curRec.setValue('custrecord_scv_imp_vatamt', (val * 1).toFixed());
    }

    const setValH_ImpAmt = (curRec, sl) => {
        let val = getTotalOfFieldsSublist(curRec, sl, 'custrecord_scv_inb_importtax_amount');
        curRec.setValue('custrecord_scv_importtax_amount', (val * 1).toFixed());
    }

    const setValH_ttlAmtVND = (curRec, sl) => {
        let val = getTotalOfFieldsSublist(curRec, sl, 'custrecord_scv_inb_amt_vnd');
        curRec.setValue('custrecord_scv_inb_total_amt_vnd', (val * 1).toFixed());
    }

    const setValH_ttlAmtForeign = (curRec, sl) => {
        let val = getTotalOfFieldsSublist(curRec, sl, 'custrecord_scv_inb_amt');
        curRec.setValue('custrecord_scv_inb_exp_bh', val);
    }

    const setValH_custAmt = (curRec, sl) => {
        let val = getTotalOfFieldsSublist(curRec, sl, 'shipmentitemamount');
        curRec.setValue('custrecord_scv_custom_amount', (val * 1).toFixed(2));
    }

    const setValH_amtVnd = (curRec, sl) => {
        let val = getTotalOfFieldsSublist(curRec, sl, 'custrecord_scv_ibs_custom_amt');
        curRec.setValue('custrecord_scv_amt_good', (val * 1).toFixed(2));
    }

    const getTotalOfFieldsSublist = (_curRec, _sublistId, _fields) =>{
		if(!_fields.toString()) return 0;

		let isDynamic = _curRec.isDynamic;
		let idxCurrentLine = (isDynamic == "T" || isDynamic == true) ? _curRec.getCurrentSublistIndex(_sublistId) : -1;
		let objRes = {};
		let arrFields = (typeof(_fields) == "string") ? [_fields] : _fields;
		let sizeSublist = _curRec.getLineCount(_sublistId);
		for(let i = 0; i < arrFields.length; i++){
			let fieldId = arrFields[i];

			let val_current_field = (idxCurrentLine > -1) ? _curRec.getCurrentSublistValue(_sublistId, fieldId) * 1 : 0;

			objRes[fieldId] = val_current_field;

			for(let j = 0; j < sizeSublist; j++){

				if(idxCurrentLine == j) continue;

                let val = _curRec.getSublistValue(_sublistId, fieldId, j) * 1;
                if(fieldId == "custrecord_scv_ibs_custom_amt") val = val.toFixed() * 1;
                if(fieldId == "shipmentitemamount") val = val.toFixed(2) * 1;

				objRes[fieldId] += val;
			}
		}

		return arrFields.length == 1 ? objRes[arrFields[0]] : objRes;
	}

    const setValueTaxTotalItem = (curRec, sl) => {
        let import_tax_amt = curRec.getCurrentSublistValue(sl, 'custrecord_scv_inb_importtax_amount') * 1;
        let tax_amt = curRec.getCurrentSublistValue(sl, 'custrecord_scv_inb_tax_amount') * 1;
        let val = import_tax_amt + tax_amt;
        curRec.setCurrentSublistValue({sublistId: sl, fieldId: 'custrecord_scv_inb_tax_total_item', value: (val * 1).toFixed(2)});
    }

    const setValueAmtVND = (curRec, sl) => {
        let decla_exr = curRec.getValue('custrecord_scv_inb_decla_exr') * 1;
        let shipmentitemamount = curRec.getCurrentSublistValue(sl, 'shipmentitemamount');
        let val = decla_exr * shipmentitemamount;
        curRec.setCurrentSublistValue({sublistId: sl, fieldId: 'custrecord_scv_ibs_custom_amt', value: (val * 1).toFixed(2)});
    }
    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {
        let curRec = scriptContext.currentRecord;
        let objRes = getTotalOfFieldsSublist(curRec, 'items', ['shipmentitemamount', 'custrecord_scv_ibs_custom_amt', 'custrecord_scv_inb_amt',
            'custrecord_scv_inb_amt_vnd', 'custrecord_scv_inb_importtax_amount', 'custrecord_scv_inb_tax_amount', 'custrecord_scv_inb_tax_total_item']);
        curRec.setValue('custrecord_scv_custom_amount', (objRes.shipmentitemamount * 1).toFixed(2));
        curRec.setValue('custrecord_scv_amt_good', (objRes.custrecord_scv_ibs_custom_amt * 1).toFixed(2));
        curRec.setValue('custrecord_scv_inb_exp_bh', objRes.custrecord_scv_inb_amt * 1);
        curRec.setValue('custrecord_scv_inb_total_amt_vnd', (objRes.custrecord_scv_inb_amt_vnd * 1).toFixed());
        curRec.setValue('custrecord_scv_importtax_amount', (objRes.custrecord_scv_inb_importtax_amount * 1).toFixed());
        curRec.setValue('custrecord_scv_imp_vatamt', (objRes.custrecord_scv_inb_tax_amount * 1).toFixed());
        curRec.setValue('custrecord_scv_inb_tax_total', (objRes.custrecord_scv_inb_tax_total_item * 1).toFixed());
    }

    /**
     * Function to be executed after line is selected.
     *`
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {

    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {

    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {

    }

    const roundNumber = (_number, _precision = 2) => {
        let precision = Math.pow(10, _precision);
        return Math.round(_number * precision) / precision;
    }

    return {
        fieldChanged: fieldChanged,
        pageInit: pageInit,
        sublistChanged: sublistChanged
    };
    
});
