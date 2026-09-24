/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  22 Sep 2026         Phu Pham			    Init, create file
 */
define([
    "N/search",
    "../cons/scv_cons_search.js"
], function (
    search,
    constSearch
) {
    const TYPE = "transaction";
    const ID = "customsearch_scv_emp_payslip";

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

        if(!!params.custpage_subsidiary) {
            filters.push(search.createFilter({
                name: "subsidiary", 
                operator: "anyof", 
                values: params.custpage_subsidiary,
            }));
        }

        if(!!params.custpage_department) {
            filters.push(search.createFilter({
                name: "department", 
                operator: "anyof", 
                values: params.custpage_department,
            }));
        }

        if(!!params.custpage_period) {
            filters.push(search.createFilter({
                name: "postingperiod", 
                operator: "anyof", 
                values: params.custpage_period,
            }));
        }

        if(!!params.custpage_employee) {
            filters.push(search.createFilter({
                name: "custbody_scv_employee", 
                operator: "anyof", 
                values: params.custpage_employee,
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
