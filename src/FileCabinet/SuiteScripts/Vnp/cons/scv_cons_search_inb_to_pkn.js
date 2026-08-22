/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  21 Aug 2026         Khanh Tran              Init, create file.
 */
define(['N/search',
    '../cons/scv_cons_search.js',
], (
    search,
    constSearch,
) => {
    const ID = 'customsearch_scv_inb_to_pkn';
    const TYPE = 'inboundshipment';
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

        if (params.custpage_inboundshipment) {
            filters.push(
                search.createFilter({
                    name: "internalid", operator: "anyof", values: params.custpage_inboundshipment,
                })
            );
        }

        if (params.custpage_purchaseorder) {
            filters.push(
                search.createFilter({
                    name: "custrecord_scv_inb_po", operator: "anyof", values: params.custpage_purchaseorder,
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
