/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  15 Sep 2026         Khanh Tran              Init, create file.
 */
define(['N/search',
    '../cons/scv_cons_search.js',
], (
    search,
    constSearch,
) => {
    const ID = 'customsearch_scv_inb_itr';
    const TYPE = 'inboundshipment';
    const RECORDS = {};

    const getDataSource = (params) => {
        let filters = addFilter(params);
        return constSearch.getDataSource_Mixed(ID, filters, [], RECORDS);
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

        return filters;
    };

    return {
        ID,
        TYPE,
        getDataSource,
    };
});
