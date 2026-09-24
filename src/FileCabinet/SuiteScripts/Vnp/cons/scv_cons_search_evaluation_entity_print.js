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
    const TYPE = "customrecord_scv_evaluation_entity";
    const ID = "customsearch_scv_evaluation_entity_print";

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

        if(!!params.custpage_entity) {
            filters.push(search.createFilter({
                name: "custrecord_scv_eva_entity", 
                operator: "anyof", 
                values: params.custpage_entity,
            }));
        }

        if(!!params.custpage_evalution_date) {
            filters.push(search.createFilter({
                name: "custrecord_scv_eva_date", 
                operator: "on", 
                values: params.custpage_evalution_date,
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
