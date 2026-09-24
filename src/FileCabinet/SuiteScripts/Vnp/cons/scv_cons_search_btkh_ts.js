/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  10 Dec 2024         Khanh Tran              Init & create file
 */
define(['N/search',
	'../cons/scv_cons_search.js',
],
function(search,
	constSearch
) {
	const ID = "customsearch_scv_btkh_2";

	const RECORDS = {
		type: "customrecord_ncfar_deprhistory",
		title: "SCV FA_Thông tin biến động TS/CCDC (don't update)",
		id: ID,
		isPublic: true,
		filters:
		[
			["custrecord_deprhisttype","anyof","1","2","5","7","4","6","8"], 
			"AND", 
			["isinactive","is","F"], 
			"AND", 
			["custrecord_deprhistamount","notequalto","0.00"]
		],
		columns:
		[
			search.createColumn({
				name: "custrecord_assetsubsidiary",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "Subsidiary"
			}),
			search.createColumn({name: "custrecord_deprhistassettype", label: "Asset Type"}),
			search.createColumn({
				name: "custrecord_scv_assetcategory",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "Category"
			}),
			search.createColumn({
				name: "name",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "ID"
			}),
			search.createColumn({
				name: "custrecord_scv_assetoldcode",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "FA Code"
			}),
			search.createColumn({
				name: "altname",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "Name"
			}),
			search.createColumn({
				name: "formulatext",
				formula: "{custrecord_deprhistasset.custrecord_scv_assetdepartused}",
				label: "Physical Location Name"
			}),
			search.createColumn({
				name: "custrecord_assetdeprstartdate",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "Depreciation Start Date"
			}),
			search.createColumn({
				name: "formuladate",
				formula: "nvl({custrecord_deprhistasset.custrecord_scv_depre_enddate},{custrecord_deprhistasset.custrecord_assetdeprenddate})",
				label: "Depreciation End Date"
			}),
			search.createColumn({
				name: "custrecord_assetcost",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "Asset Original Cost"
			}),
			search.createColumn({
				name: "custrecord_assetcurrentcost",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "Asset Current Cost"
			}),
			search.createColumn({name: "custrecord_deprhistdate", label: "Date"}),
			search.createColumn({name: "custrecord_deprhisttype", label: "Transaction Type"}),
			search.createColumn({
				name: "formulatext",
				formula: "case when {custrecord_deprhisttype} = 'Depreciation' and {custrecord_deprhistamount} > 0 then 'KH.T' when {custrecord_deprhisttype} = 'Depreciation' and {custrecord_deprhistamount} < 0 then 'KH.G' when {custrecord_deprhisttype} in ('Disposal','Sale') then 'NG.G' when {custrecord_deprhisttype} in ('Revaluation','Acquisition','Transfer') then 'NG.T' else null end",
				label: "Trans Type"
			}),
			search.createColumn({
				name: "formulanumeric",
				formula: "case when {custrecord_deprhisttype.id} in (8,4) then -{custrecord_deprhistamount} when {custrecord_deprhisttype.id} in (2) and {custrecord_deprhistjournal} like 'Fixed Asset Transfer Entry%' then 0 when {custrecord_deprhisttype.id} in (2) and {custrecord_deprhistjournal} not like 'Fixed Asset Transfer Entry%' and {custrecord_deprhistamount} < 0 then -{custrecord_deprhistamount} else {custrecord_deprhistamount} end",
				label: "Transaction Amount"
			}),
			search.createColumn({
				name: "custrecord_scv_assetmainaccnumber",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "Asset Account"
			}),
			search.createColumn({
				name: "custrecord_scv_assetdepraccnumber",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "Depreciation Account"
			}),
			search.createColumn({
				name: "custrecord_scv_assetdeprchargeaccnumber",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "Charge Account"
			}),
			search.createColumn({
				name: "custrecord_scv_assetcategroup",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "Category Group"
			}),
			search.createColumn({
				name: "custrecord_assetdepartment",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "Department"
			}),
			search.createColumn({
				name: "custrecord_assetlocation",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "Location"
			}),
			search.createColumn({
				name: "custrecord_assetclass",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "Class"
			}),
			search.createColumn({
				name: "custrecord_scv_assetlocationused",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "PHYSICAL_LOCATION_ID"
			}),
			search.createColumn({
				name: "custrecord_assetstatus",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "Asset Status"
			}),
			search.createColumn({
				name: "cseg_scv_bu_center",
				join: "CUSTRECORD_DEPRHISTASSET",
				label: "Business Center"
			}),
			search.createColumn({
				name: "formulanumeric",
				formula: "case when {custrecord_deprhisttype.id} in (6,7,8,4) then -{custrecord_deprhistamount} when {custrecord_deprhisttype.id} in (2) and {custrecord_deprhistjournal} like 'Fixed Asset Transfer Entry%' then 0 else {custrecord_deprhistamount} end",
				label: "Amount (Check)"
			})
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
		objRes.asset_id = objSearch.getValue(myColumns[3]);
        objRes.ma_bfo = objSearch.getValue(myColumns[4]);
        objRes.ten_ts = objSearch.getValue(myColumns[5]);
        objRes.pbql = objSearch.getValue(myColumns[6]);
        objRes.tgsd = objSearch.getValue(myColumns[7]);
        objRes.nkt_khpb = objSearch.getValue(myColumns[8]);
        objRes.asset_ori_cost = objSearch.getValue(myColumns[9]) * 1;
        objRes.date = objSearch.getValue(myColumns[11]);
        objRes.tran_type = objSearch.getValue(myColumns[13]);
        objRes.transaction_amount = objSearch.getValue(myColumns[14]) * 1;
        objRes.asset_account = objSearch.getValue(myColumns[15]);
        objRes.depreciation_account = objSearch.getValue(myColumns[16]);
        objRes.charge_account = objSearch.getValue(myColumns[17]);
        objRes.category_group = objSearch.getText(myColumns[18]);
		return objRes;
	}

    return {
		ID: ID,
		TYPE: "customrecord_ncfar_deprhistory",
		RECORDS: RECORDS,
		getDataSourceFetchPage: getDataSourceFetchPage
    };
    
});
