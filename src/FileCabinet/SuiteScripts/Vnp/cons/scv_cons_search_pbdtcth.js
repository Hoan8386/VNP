/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  17 Aug 2026         Thanh Hoan             Init, create file.
 */
define(['N/search',
    '../cons/scv_cons_search.js',
], (
    search,
    constSearch,
) => {
    const ID = 'customsearch_scv_pbdtcth';
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
                    name: 'subsidiary',
                    operator: search.Operator.ANYOF,
                    values: params.custpage_subsidiary
                })
            );
        }

        // if (params.custpage_date) {
        //     filters.push(
        //         search.createFilter({
        //             name: 'custbody_scv_from_date',
        //             operator: search.Operator.ONORBEFORE,
        //             values: params.custpage_date
        //         })
        //     );

        //     filters.push(
        //         search.createFilter({
        //             name: 'custbody_scv_to_date',
        //             operator: search.Operator.ONORAFTER,
        //             values: params.custpage_date
        //         })
        //     );
        // }

        if (params.custpage_debit) {
            filters.push(
                search.createFilter({
                    name: 'custbody_scv_loa',
                    operator: search.Operator.ANYOF,
                    values: params.custpage_debit
                })
            );
        }

        if (params.custpage_salecontract) {
            filters.push(
                search.createFilter({
                    name: 'custbody_scv_sales_contract',
                    operator: search.Operator.ANYOF,
                    values: params.custpage_salecontract
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
