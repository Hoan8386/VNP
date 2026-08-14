/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  12 Aug 2026         Khanh Tran              Init, create file.
 */
define(['N/search',
    '../cons/scv_cons_search.js',
], (
    search,
    constSearch,
) => {
    const ID = 'customsearch_scv_trans_to_pkn';
    const TYPE = 'transaction';
    const RECORDS = {};

    const getDataSource = (params) => {
        let filters = addFilter(params);
        return constSearch.getDataSource_Mixed(ID, filters, [], RECORDS);
    };

    const getDataSourceFetchPage = (params) => {
        let filters = addFilter(params);
        return constSearch.getDataSourceFetchPage_Mixed(ID, filters, params, [], RECORDS);
    };

    const addFilter = (params) => {
        let filters = [];

        if (params.custpage_createdfrom) {
            filters.push(
                search.createFilter({
                    name: "internalid", operator: "anyof", values: params.custpage_createdfrom,
                })
            );
        }
        
        return filters;
    };

    return {
        ID,
        TYPE,
        getDataSource,
        getDataSourceFetchPage,
    };
});
