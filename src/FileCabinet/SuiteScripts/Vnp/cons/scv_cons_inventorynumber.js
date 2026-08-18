/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  06 Jan 2025         Huy Pham                Init & create file
 */
define([
	'../cons/scv_cons_search.js',
],
function(
	constSearch,
) {
	const TYPE = "inventorynumber";
    const FIELD = {
        ID: "id",
        INACTIVE: "isinactive",
        NAME: "name"
    }

    const SUBLIST = {
        
    }

    const RECORDS = {
    }

    const getDataSource = (_filter) => {
        let resultSearch = constSearch.createSearchWithFilter({
            type: TYPE,
            columns: [
				"internalid", "inventorynumber", "item", "expirationdate", "quantityavailable"
			]
        }, _filter);
        
        resultSearch = resultSearch.runPaged({pageSize: 1000});

        let arrResult = constSearch.fetchResultSearchAllPage(resultSearch, function(_objSearch, _column){
            let objRes = constSearch.getObjResultFromSearchByKey(_objSearch, _column, [
                "internalid", "inventorynumber", "item", "expirationdate", "quantityavailable"
            ]);
			
            return objRes;
        });
        return arrResult;
    }

    return {
		TYPE,
        FIELD,
        SUBLIST,
        RECORDS,
        getDataSource
    };
    
});
