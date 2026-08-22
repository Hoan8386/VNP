/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * Nội dung: Lookup nghiệp vụ dùng chung cho mẫu in: tên pháp lý của subsidiary và
 *           symbol tiền tệ. getSubsidiaryInfo/getCurrencySymbol cố ý không try/catch,
 *           không cache: chứng từ thiếu tên công ty còn tệ hơn báo lỗi. Mỗi
 *           query.runSuiteQL tốn 10 governance units; hiện mỗi bản in gọi 1 lần.
 *           Không gọi các hàm này trong vòng lặp dòng hàng.
 * Dùng bởi: scv_sl_pdnmvt_print.js
 *           (sẽ thêm: scv_sl_kbbgh_print.js, scv_sl_ddh_print.js,
 *            scv_sl_pr_print.js, scv_sl_unc_print.js, scv_sl_knkt_print.js)
 * =======================================================================================
 *  Date                Author                  Description
 *  19 Aug 2026         Codex                   Init shared print lookup module
 */
define(['N/query', '../lib/scv_lib_print_format.js'], (query, libPrintFormat) => {
    const CURRENCY_QUERY = [
        'SELECT currency.symbol',
        'FROM currency currency',
        'WHERE currency.id = ?'
    ].join('\n');

    const SUBSIDIARY_QUERY = [
        'SELECT subsidiary.legalname, BUILTIN.DF(subsidiary.mainaddress) as mainaddress_text',
        'FROM subsidiary subsidiary',
        'WHERE subsidiary.id = ?'
    ].join('\n');

    /**
     * Gets the legal subsidiary name and main address display text in one query.
     * Deliberately has no try/catch or cache; do not call inside a line loop.
     * @param {string|number} subsidiaryId
     * @returns {{legalname: string, mainaddress_text: string}}
     */
    const getSubsidiaryInfo = (subsidiaryId) => {
        if (!subsidiaryId) return {legalname: '', mainaddress_text: ''};

        const results = query.runSuiteQL({
            query: SUBSIDIARY_QUERY,
            params: [subsidiaryId]
        }).asMappedResults();

        return {
            legalname: results[0]?.legalname || '',
            mainaddress_text: results[0]?.mainaddress_text || ''
        };
    };

    /**
     * Gets the legal subsidiary name through the shared subsidiary lookup.
     * @param {string|number} subsidiaryId
     * @returns {string}
     */
    const getSubsidiaryLegalName = (subsidiaryId) => getSubsidiaryInfo(subsidiaryId).legalname;

    /**
     * Gets the accounting currency symbol used by the print contract.
     * Deliberately has no try/catch or cache; do not call inside a line loop.
     * @param {string|number} currencyId
     * @returns {string}
     */
    const getCurrencySymbol = (currencyId) => {
        if (currencyId === null || currencyId === undefined || currencyId === '') {
            return '';
        }
        const rows = query.runSuiteQL({
            query: CURRENCY_QUERY,
            params: [currencyId]
        }).asMappedResults();
        return libPrintFormat.asText(rows[0]?.symbol);
    };

    return {
        getSubsidiaryInfo,
        getSubsidiaryLegalName,
        getCurrencySymbol
    };
});
