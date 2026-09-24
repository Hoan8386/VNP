/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  07 Sep 2026         Khanh Tran              Init & create file
 */
define(['N/search',
    '../cons/scv_cons_search.js',
], (
    search,
    constSearch,
) => {
    const ID = 'customsearch_scv_check_dkkd';
    const TYPE = 'customrecord_scv_legal_file';
    const RECORDS = {};

    const getDataSource = (params) => {
        let filters = addFilter(params);

        return constSearch.getDataSource_Mixed(ID, filters, [], null);
    };

    const getDataSourceFetchPage = (params) => {
        let filters = addFilter(params);
        return constSearch.getDataSourceFetchPage_Mixed(ID, filters, params, [], RECORDS);
    };

    const addFilter = (params) => {
        let filters = [];

        if (params.custpage_legalfile_entity) {
            filters.push(
                search.createFilter({
                    name: "custrecord_scv_legalfile_entity", operator: "anyof", values: params.custpage_legalfile_entity,
                })
            );
        }

        if (params.custpage_legalfile_type) {
            filters.push(
                search.createFilter({
                    name: "custrecord_scv_legalfile_type", operator: "anyof", values: params.custpage_legalfile_type,
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
