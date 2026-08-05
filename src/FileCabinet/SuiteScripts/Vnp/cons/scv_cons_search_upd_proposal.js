/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  5 Aug 2026          Thanh Hoan			    Init, create file.
 */
define(["N/search",

    "../cons/scv_cons_search.js"
], function (search,
    
    constSearch
) {
    const TYPE = "transaction";
    const ID = "customsearch_scv_upd_proposal";

    const RECORDS = {};

    const getDataSource = (_params) => {
        let filters = getFiltersDefault(_params);

        return constSearch.getDataSource_Mixed(ID, filters, [], RECORDS);
    };

    const getDataSourceFetchPage = (_params) => {
        let filters = getFiltersDefault(_params);

        return constSearch.getDataSourceFetchPage_Mixed(ID, filters, _params, [], RECORDS);
    };

    const getFiltersDefault = (params = {}) => {
        let filters = [];

        if (params.custrecord_propsourceid) {
            filters.push(
                search.createFilter({
                    name: "internalid",
                    operator: "is",
                    values: params.custrecord_propsourceid,
                }),
            );
        }

        if (params.custrecord_propsourceline) {
            filters.push(
                search.createFilter({
                    name: "line",
                    operator: "is",
                    values: params.custrecord_propsourceline
                    ,
                }),
            );
        }

        return filters;
    };

    return {
        ID,
        TYPE,
        RECORDS,
        getDataSource,
        getDataSourceFetchPage,
        getFiltersDefault,
    };
});
