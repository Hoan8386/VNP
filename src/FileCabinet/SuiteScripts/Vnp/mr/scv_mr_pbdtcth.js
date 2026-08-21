/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  19 Aug 2026         Thanh Hoan              Init, create file. Chức năng phân bổ doanh thu chưa thực hiên from ms. Tâm(https://app.clickup.com/t/3773072/86d40yedc)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/runtime',

	'../common/scv_common_pbdtcth.js',
],
	(runtime, 

		commonPbdtcth,
	) => {
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
            let params = currentScript.getParameter({name: 'custscript_scv_mr_pbdtcth_param'});
			params = params ? JSON.parse(params) : {};
			
			const arrResultCreate = commonPbdtcth.getDataSourceCreate(params);
            const arrResultDelete = commonPbdtcth.getDataSourceDelete(params);

            const arrResult = arrResultCreate.concat(arrResultDelete);

			arrResult.forEach(objRes => {
				objRes.params = {...params};
			});

			return arrResult;
		}
		
		/**
		 * Executes when the map entry point is triggered and applies to each key/value pair.
		 *
		 * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
		 * @since 2015.1
		 */
		const map = (context) => {
			try{
				let valueInput = JSON.parse(context.value);

				if(valueInput.action === "delete"){
                    commonPbdtcth.deleteJournalOld(valueInput.params, valueInput);
                }
                else if(valueInput.action === "create"){
                    commonPbdtcth.createJournal(valueInput.params, valueInput);
                }
			}
			catch(err){
				log.error("Error: Try.catch.map", err)
			}
		}
		
		return {
			getInputData,
			map,
		};
		
	});
