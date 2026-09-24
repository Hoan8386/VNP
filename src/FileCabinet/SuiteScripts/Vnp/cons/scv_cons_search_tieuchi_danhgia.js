/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  16 Sep 2026         Phu Pham			    Init, create file
 */
define([
    "N/search",
    "../cons/scv_cons_search.js"
], function (
    search,
    constSearch
) {
    const TYPE = "customrecord_scv_evaluation_criteria";
    const ID = "customsearch_scv_tieuchi_danhgia";

    const Records = {};

    const getDataSource = (_params) => {
        const filters = createFilters(_params);
        return constSearch.getDataSource_Mixed(ID, filters, [], Records);
    };

    const getDataSourceFetchPage = (_params) => {
        const filters = createFilters(_params);
        return constSearch.getDataSourceFetchPage_Mixed(ID, filters, _params, [], Records);
    };

    const createFilters = (params = {}) => {
        let filters = [];

        if(!!params.custpage_entity_type) {
            filters.push(search.createFilter({
                name: "custrecord_scv_eve_criteria_apply_type", 
                operator: "anyof", 
                values: params.custpage_entity_type,
            }));
        }

        return filters;
    };

    return {
        ID,
        TYPE,
        Records,
        getDataSource,
        getDataSourceFetchPage,
    };
});
