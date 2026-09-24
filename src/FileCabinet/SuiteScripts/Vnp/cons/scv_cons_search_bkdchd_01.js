/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  10 Sep 2026         Khanh Tran              Init & create file.
 */
/**
 * @NApiVersion 2.1
 */
define(['N/search',
    '../cons/scv_cons_search.js',
], (
    search,
    constSearch,
) => {
    const ID = 'customsearch_scv_bkhdmv';
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

        if (params.custpage_subsidiary) {
            filters.push(
                search.createFilter({
                    name: "subsidiary", operator: "anyof", values: params.custpage_subsidiary,
                })
            );
        }

        if (params.custpage_from_date) {
            filters.push(
                search.createFilter({
                    name: "trandate", operator: "onorafter", values: params.custpage_from_date,
                })
            );
        }

        if (params.custpage_to_date) {
            filters.push(
                search.createFilter({
                    name: "trandate", operator: "onorbefore", values: params.custpage_to_date,
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
