/**
 * Ná»i dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  13 Aug 2026         Khanh Tran              Init, create file.
 */
define(['N/search',
    '../cons/scv_cons_search.js',
], (
    search,
    constSearch,
) => {
    const ID = '';
    const TYPE = 'customrecord_scv_specificaiton_unit';
    const RECORDS = {
        type: TYPE,
        filters: [
            "isinactive","is","F"
        ],
        columns: [
            'internalid',
        ],
    };

    const getDataSource = (params) => {
        let filters = addFilter(params);
        let resultSearch = constSearch.createSearchWithFilter(RECORDS, filters);
        return constSearch.fetchResultSearchRun(resultSearch, objSearch => ({id: objSearch.id}));
    };

    const addFilter = (params) => {
        let filters = [];

        if (params.unitid) {
            filters.push(search.createFilter({
                name: 'custrecord_scv_item_unit', operator: 'anyof', values: params.unitid,
            }));
        }

        if (params.item) {
            filters.push(search.createFilter({
                name: 'custrecord_scv_item_specification', operator: 'anyof', values: params.item,
            }));
        }

        return filters;
    };

    return {
        ID,
        TYPE,
        getDataSource,
    };
});
