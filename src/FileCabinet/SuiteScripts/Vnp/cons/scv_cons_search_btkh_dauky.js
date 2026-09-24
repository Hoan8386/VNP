/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  27 Sep 2024         Khanh Tran              Init & create file
 */
define(['N/search',
	'../cons/scv_cons_search.js',
],
function(search,
	constSearch
) {
	const ID = "customsearch_scv_btkh_dauky";

	const RECORDS = {
		type: "customrecord_ncfar_deprhistory",
		title: "SCV FA_Thông tin khấu hao TS/CCDC đầu kỳ (don't update)",
		id: ID,
		isPublic: true,
		filters:
		[
			["custrecord_deprhisttype","anyof","2"], 
			"AND", 
			["isinactive","is","F"], 
			"AND", 
			["custrecord_deprhistamount","notequalto","0.00"]
		],
		columns:
		[
			search.createColumn({
				name: "name",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "ID"
			}),
			search.createColumn({name: "custrecord_deprhistamount", label: "Transaction Amount"}),
			search.createColumn({
				name: "custrecord_assetstatus",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "Asset Status"
			}),
			search.createColumn({name: "custrecord_deprhistdate", label: "Date"})
		]
	};

	const getDataSourceFetchPage = (filters, params) =>{
		let resultSearch = constSearch.loadSearchWithFilter(ID, filters, RECORDS);
		resultSearch = resultSearch.runPaged({pageSize: 1000});
		let objRes = constSearch.fetchResultSearchPage(resultSearch, params, function(obj, column){
			return getObjResultFromSearch(obj, column);
		})

		return objRes;
	}

	const getObjResultFromSearch = (objSearch, myColumns) =>{
		let objRes = {};
		objRes.asset_id = objSearch.getValue(myColumns[0]);
        objRes.transaction_amount = objSearch.getValue(myColumns[1]) * 1;
		return objRes;
	}

    return {
		ID: ID,
		TYPE: "customrecord_ncfar_deprhistory",
		RECORDS: RECORDS,
		getDataSourceFetchPage: getDataSourceFetchPage
    };
    
});
