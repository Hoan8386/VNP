/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  25 Jun 2025         Huy Pham			    Init, create file
 */
define(['N/query', 'N/runtime', 'N/search',
	'../cons/scv_cons_search.js'
],
function(query, runtime, search,
	constSearch
	) {
	const FIELD = {
		ID: "id",
		INACTIVE: "isinactive",
		NAME: "name"
	}

	const SUBLIST = {
		
	}

	const RECORDS = {
		
	}

	const getInfoLocationById = (_locationsId) => {
		if(!_locationsId) return [];

		var resultSQL = query.runSuiteQL({
			query: `SELECT id, name, usebins, fullname, mainaddress, BUILTIN.DF(mainaddress) as mainaddress_display
			FROM location
			where id IN (${_locationsId.toString()})
			order by id asc`
		});
		return resultSQL.asMappedResults();
	}

	/*
	LOTNUMBEREDINVENTORY
	INVENTORY
	INVENTORYCOUNT
	INVENTORYSTATUS
	SERIALIZEDINVENTORY
	ADVBINSERIALLOTMGMT
	ADVINVENTORYMGMT
	BINMANAGEMENT
	*/
	const isInventory = () =>{
		let isValid = true;
		try{
			//in server
			isValid = runtime.isFeatureInEffect({feature:'INVENTORY'})
		}catch(err){
			//in Client
			isValid = _dynamicData.reflet.features.INVENTORY == 'INVENTORY' ? true : false;
		}

		return isValid;
	}

	const isLotNumberInventory = () =>{
		let isValid = true;
		try{
			//in server
			isValid = runtime.isFeatureInEffect({feature:'LOTNUMBEREDINVENTORY'})
		}catch(err){
			//in Client
			isValid = _dynamicData.reflet.features.LOTNUMBEREDINVENTORY == 'LOTNUMBEREDINVENTORY' ? true : false;
		}

		return isValid;
	}

	const isBinManagement = () =>{
		let isValid = true;
		try{
			//in server
			isValid = runtime.isFeatureInEffect({feature:'BINMANAGEMENT'})
		}catch(err){
			//in Client
			isValid = _dynamicData.reflet.features.BINMANAGEMENT == 'BINMANAGEMENT' ? true : false;
		}

		return isValid;
	}

	const getDataSource = (_filters) => {
		let resultSearch =  constSearch.createSearchWithFilter({
			type: "location",
			filters:
			[
				["isinactive","is","F"]
			],
			columns:
			[
				"internalid",
				"name", "subsidiary", "namenohierarchy"
			]
		}, _filters);
		
		let arrResult = constSearch.fetchResultSearchRunEach(resultSearch, function(_objTmpl, _column){
			let objResTmpl = constSearch.getObjResultFromSearchByKey(_objTmpl, _column, [
				"internalid",
				"name", "subsidiary", "namenohierarchy"
			]);

			return objResTmpl;
		});
		
		return arrResult;
	}

	const getEntityGroupById = (locationsId) => {
		let sql = `SELECT id, groupname FROM entitygroup
			WHERE custentity_mfgmob_wclocation IS NOT NULL AND isinactive = 'F'`;

		if(locationsId){
			sql += ` AND custentity_mfgmob_wclocation = ${locationsId}`;
		}

		let resultSQL = query.runSuiteQL({
			query: sql
		});
		let resultQuery = resultSQL.asMappedResults();
		return resultQuery;
	}

	const isUseBins = (_internalid, _isRtnBoolean = true)	=> {
		let usesbins = search.lookupFields({type: "location", id: _internalid, columns: ["usesbins"]}).usesbins;

		if(_isRtnBoolean){
			return usesbins;
		}
		else{
			return usesbins ? "T" : "F";
		}
	}

	const queryBinsByLocationId = (locationId) => {
		let resultSQL = query.runSuiteQL({
			query: `
				SELECT id, binnumber
				FROM bin
				WHERE isinactive = 'F' and
					location = ${locationId}
				ORDER BY binnumber ASC
			`
		});
		return resultSQL.asMappedResults();
	}

    return {
		TYPE: "location",
		FIELD,
		SUBLIST,
		RECORDS,
		getInfoLocationById,
		isInventory,
		isLotNumberInventory,
		isBinManagement,
		getDataSource,
		getEntityGroupById,
		isUseBins,
		queryBinsByLocationId
    };
    
});
