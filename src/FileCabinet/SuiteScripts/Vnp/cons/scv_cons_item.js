/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  13 Jan 2025         Phu Pham			    Init, create file
 */
define([
	'N/search', 'N/query',
],
function(
	search, query
) {
	const FIELD = {
		ID: "id",
		INACTIVE: "isinactive",
		ITEMID: "itemid"
	}

	const SUBLIST = {
		
	}

	const RECORDS = {
		SUB_TOTAL: {
			ID: -2,
			NAME: "Subtotal"
		},
		DESCRIPTION: {
			ID: -3,
			NAME: "Description"
		},
		ChiPhiVanChuyen: {
			ID: 3038,
			NAME: "Chi phí vận chuyển"
		}
	}

	const getDataQueryItems = (_filters =  {}) => {
		let strWhere = "WHERE isinactive = 'F' ";

		if(!!_filters?.id?.toString()){
			strWhere += ` AND id IN (${_filters.id.split(",").join(',')}) `;
		}

		if(!!_filters?.itemtype?.toString()){
			strWhere += ` AND itemtype IN ('${_filters.itemtype.split(",").join("','")}') `;
		}

		var resultSQL = query.runSuiteQL({
			query: `SELECT id,  itemtype
			from item
			(${strWhere})
			`
		});
		return resultSQL.asMappedResults();
	}

	const isUseBins = (_internalid, _isRtnBoolean = true)	=> {
		let usebins = search.lookupFields({type: "item", id: _internalid, columns: ["usebins"]}).usebins;

		if(_isRtnBoolean){
			return usebins;
		}
		else{
			return usebins ? "T" : "F";
		}
	}

	const isLotItem = (_internalid, _isRtnBoolean = true)	=> {
		let islotitem = search.lookupFields({type: "item", id: _internalid, columns: ["islotitem"]}).islotitem;

		if(_isRtnBoolean){
			return islotitem;
		}
		else{
			return islotitem ? "T" : "F";
		}
	}

	const hasInventoryDetailItem = (_internalid, _isRtnBoolean = true)	=> {
		let itemLkf = search.lookupFields({type: "item", id: _internalid, columns: ["type",  "islotitem"]});
		
		let itemType = itemLkf.type[0].value;
		let islotitem = itemLkf.islotitem;

		let isValidate = false;
		if(["InvtPart", "Assembly"].includes(itemType) || islotitem){
			isValidate = true;
		}

		if(_isRtnBoolean){
			return isValidate;
		}
		else{
			return isValidate ? "T" : "F";
		}
	}

    return {
		TYPE: "item",
		FIELD,
		SUBLIST,
		RECORDS,
		getDataQueryItems,
		isUseBins,
		isLotItem,
		hasInventoryDetailItem
    };
    
});
