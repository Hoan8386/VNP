define(['N/record', 'N/search'],
	
	function(record, search) {
		function updateItergration(newRecord) {
			let even_unit = newRecord.getValue('custitem_scv_even_unit');
			let even_unit_converionrate = '', internalid = '', cvrate, pluralname;
			let unitstype = newRecord.getValue('unitstype');
			let saleunit = newRecord.getValue('saleunit');
			let stockunit = newRecord.getValue('stockunit');
			let purchaseunit = newRecord.getValue('purchaseunit');
			let consumptionunit = newRecord.getValue('consumptionunit');
			let saleconversionrate = 1, stockconversionrate = 1, purchaseconversionrate = 1, consumptionconversionrate = 1;
			if(unitstype) {
				let recUN = record.load({type: 'unitstype', id: unitstype});
				let sl = 'uom';
				let count = recUN.getLineCount({sublistId: sl});
				even_unit_converionrate = newRecord.getValue('custitem_scv_even_unit_converionrate');
				if(even_unit_converionrate) {
					for(let n = 0; n < count; n++) {
						cvrate = recUN.getSublistValue({sublistId: sl,fieldId: 'conversionrate',line: n});
						pluralname = recUN.getSublistValue({sublistId: sl,fieldId: 'pluralname',line: n});
						if(cvrate === even_unit_converionrate) {
							internalid = recUN.getSublistValue({sublistId: sl,fieldId: 'internalid',line: n});
							if(even_unit === internalid) {
								break;
							}
						}
					}
				} else {
					internalid = '';
				}
				if(internalid === '' && even_unit) {
					for(let n = 0; n < count; n++) {
						internalid = recUN.getSublistValue({sublistId: sl,fieldId: 'internalid',line: n});
						if(even_unit === internalid) {
							even_unit_converionrate = recUN.getSublistValue({sublistId: sl,fieldId: 'conversionrate',line: n});
							break;
						} else {
							internalid = '';
						}
					}

				}
				for(let n = 0; n < count; n++) {    					
					if(saleunit === recUN.getSublistValue({sublistId: sl,fieldId: 'internalid',line: n})) {
						saleconversionrate = recUN.getSublistValue({sublistId: sl,fieldId: 'conversionrate',line: n});						
					} 
					if(stockunit === recUN.getSublistValue({sublistId: sl,fieldId: 'internalid',line: n})) {
						stockconversionrate = recUN.getSublistValue({sublistId: sl,fieldId: 'conversionrate',line: n});	
					}
					if(purchaseunit === recUN.getSublistValue({sublistId: sl,fieldId: 'internalid',line: n})) {
						purchaseconversionrate = recUN.getSublistValue({sublistId: sl,fieldId: 'conversionrate',line: n});	
					}
					if(consumptionunit === recUN.getSublistValue({sublistId: sl,fieldId: 'internalid',line: n})) {
						consumptionconversionrate = recUN.getSublistValue({sublistId: sl,fieldId: 'conversionrate',line: n});	
					}
				}
			}
			/*let taxschedule = newRecord.getValue('taxschedule');
			let taxcode = '';
			if(taxschedule) {
				let slNexuses = 'nexuses';
				let recTemp = record.load({type: 'taxschedule', id: taxschedule});
				taxcode = recTemp.getSublistValue({sublistId: slNexuses, fieldId: 'salestaxcode', line: 0});
			}*/

			newRecord.setValue('custitem_scv_odd_unit', newRecord.getValue('baseunit'));
			newRecord.setValue('custitem_scv_even_unit', internalid);
			newRecord.setValue('custitem_scv_even_unit_converionrate', even_unit_converionrate);
			newRecord.setValue('custitem_scv_taxcode', newRecord.getValue('salestaxcode'));
			newRecord.setValue('custitem_scv_saleconversionrate', saleconversionrate);
			newRecord.setValue('custitem_scv_stockconversionrate', stockconversionrate);
			newRecord.setValue('custitem_scv_purchaseconversionrate', purchaseconversionrate);
			newRecord.setValue('custitem_scv_consumptionconversionrate', consumptionconversionrate);
			newRecord.setValue('custitem_scv_purchase_convert_rate', purchaseconversionrate);
		}

		function getTaxcodeFromTaxshedule(taxschedule) {
			let taxcode = '';
			if(taxschedule) {
				let slNexuses = 'nexuses';
				let recTemp = record.load({type: 'taxschedule', id: taxschedule});
				taxcode = recTemp.getSublistValue({sublistId: slNexuses, fieldId: 'salestaxcode', line: 0});
			}
			return taxcode;
		}

		function getTaxrate(taxcode) {
			let rate = 0;
			if(taxcode) {
				let lkF = search.lookupFields({type: 'salestaxitem', id: taxcode, columns: ['rate']});
				rate = lkF.rate.replace('%','') / 100;
			}
			return rate;
		}

		function getTaxrateFromTextTaxschedule(taxschedule) {
			let rate = 0;
			if(taxschedule.indexOf('VAT5') >= 0) {
				rate = 0.05;
			} else if(taxschedule.indexOf('VAT10') >= 0) {
				rate = 0.1;
			}
			return rate;
		}

		return {
			updateItergration: updateItergration,
			getTaxcodeFromTaxshedule: getTaxcodeFromTaxshedule,
			getTaxrate: getTaxrate,
			getTaxrateFromTextTaxschedule: getTaxrateFromTextTaxschedule
		};

	});
