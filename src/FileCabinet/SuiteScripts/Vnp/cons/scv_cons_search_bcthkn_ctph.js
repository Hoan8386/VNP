
define([
    '../cons/scv_cons_search.js',
], (
    constSearch,
) => {
    const ID = 'customsearch_scv_ctph_detail';

    const getDataSourceFetchPage = (filters, params) => {
        return constSearch.getDataSourceFetchPage(ID, filters, params);
    };

    return {
        ID,
        getDataSourceFetchPage,
    };
});
