/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  22 Sep 2026         Khanh Tran              Init, create file.
 */
define(['N/search',
    '../cons/scv_cons_search.js',
], (
    search,
    constSearch,
) => {
    const ID = 'customsearch_scv_data_inv_pkk';
    const TYPE = 'inventorybalance';
    const RECORDS = {};

    const getDataSource = (params) => {
        let filters = addFilter(params);
        return constSearch.getDataSource_Mixed({ id: ID, type: TYPE }, filters, [], RECORDS);
    };

    const getDataSourceFetchPage = (params) => {
        let filters = addFilter(params);
        return constSearch.getDataSourceFetchPage_Mixed({ id: ID, type: TYPE }, filters, params, [], RECORDS);
    };

    const addFilter = (params) => {
        let filters = [];

        if (params.custpage_subsidiary) {
            filters.push(
                search.createFilter({
                    name: "subsidiary", join: "location", operator: "anyof", values: params.custpage_subsidiary,
                })
            );
        }

        if (params.custpage_location) {
            filters.push(
                search.createFilter({
                    name: "location", operator: "anyof", values: params.custpage_location,
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
