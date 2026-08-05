/**
 * @NApiVersion 2.1
 * @NScriptType MassUpdateScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],
	
	(record, search) => {
		
		/**
		 * Definition of Mass Update trigger point.
		 *
		 * @param {Object} params
		 * @param {string} params.type - Record type of the record being processed by the mass update
		 * @param {number} params.id - ID of the record being processed by the mass update
		 *
		 * @since 2016.1
		 */
		const each = (params) => {
			let lkAcc = search.lookupFields({type: params.type.toLowerCase(), id: params.id, columns: ['isinactive', 'number']});
			let numAcc = lkAcc.number;
			if (numAcc) {
				let lNumAcc = numAcc.length;
				if (lNumAcc < 8 && lNumAcc > 0) {
					let rec = record.load({type: params.type.toLowerCase(), id: params.id});
					rec.setValue('issummary', true);
					rec.save();
				}
			}
		}
		
		return {
			each
		};
		
	});
