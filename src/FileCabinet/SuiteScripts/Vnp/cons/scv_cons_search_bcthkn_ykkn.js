
define([
    '../cons/scv_cons_search.js',
], (
    constSearch,
) => {
    const ID = 'customsearch_scv_ykkn_detail';

    // Canonical tokens only; NetSuite values remain a Lát B verification input.
    const PHANLOAI = Object.freeze({
        CO_QUY_DINH: 'CO_QUY_DINH',
        KHONG_QUY_DINH: 'KHONG_QUY_DINH',
    });

    const KQTH = Object.freeze({
        CHUA_BAT_DAU: 'CHUA_BAT_DAU',
        DANG_TRIEN_KHAI: 'DANG_TRIEN_KHAI',
        HOAN_THANH_CHUA_XAC_NHAN: 'HOAN_THANH_CHUA_XAC_NHAN',
        HOAN_THANH_DA_XAC_NHAN: 'HOAN_THANH_DA_XAC_NHAN',
        HUY_BO: 'HUY_BO',
        TU_CHOI: 'TU_CHOI',
    });

    // TODO(verify): A2.1/A2.2 will provide the real source fields and values.
    const getDataSourceFetchPage = (filters, params) => {
        return constSearch.getDataSourceFetchPage(ID, filters, params);
    };

    return {
        ID,
        PHANLOAI,
        KQTH,
        getDataSourceFetchPage,
    };
});
