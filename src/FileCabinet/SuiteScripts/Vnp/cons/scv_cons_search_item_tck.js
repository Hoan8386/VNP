/**
 * Nội dung:
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
    const ID = 'customsearch_scv_search_item_tck';
    const TYPE = 'item';
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

        if (params.custpage_loaikiemnhap) {
            filters.push(
                search.createFilter({
                    name: "custrecord_scv_iip_type", join: 'custrecord_scv_iip_item', operator: "anyof", values: params.custpage_loaikiemnhap,
                })
            );
        }

        if (params.custpage_item) {
            filters.push(
                search.createFilter({
                    name: "internalid", operator: "anyof", values: params.custpage_item,
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
