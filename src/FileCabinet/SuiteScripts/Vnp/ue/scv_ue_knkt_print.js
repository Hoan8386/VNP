/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    'N/url', 'N/query',
    '../common/scv_common_ui',
    '../cons/scv_cons_print.js'
], (
    url, query,
    comUI, consPrint
) => {
        const Knkt = consPrint.Knkt;
        // Chỉ cần biết có hay không, nên dừng ở 1 dòng đầu tiên.
        const CO_KHUYEN_NGHI_2_KET_QUA_QUERY = `
            SELECT yKienKienNghi.id AS kn_id
            FROM customrecord_scv_ketquakhuyennghi ketQuaKhuyenNghi
                INNER JOIN customrecord_scv_ykienkiennghi yKienKienNghi
                    ON ketQuaKhuyenNghi.custrecord_scv_kqkn_ykienkhuyennghi = yKienKienNghi.id
                   AND yKienKienNghi.isinactive = 'F'
                INNER JOIN customrecord_scv_chitietkiennghi chiTietKienNghi
                    ON yKienKienNghi.custrecord_scv_ykkn_chitietkhuyennghi = chiTietKienNghi.id
                   AND chiTietKienNghi.isinactive = 'F'
            WHERE chiTietKienNghi.custrecord_scv_ctph_phieukn = ?
              AND ketQuaKhuyenNghi.isinactive = 'F'
            GROUP BY yKienKienNghi.id
            HAVING COUNT(ketQuaKhuyenNghi.id) >= 2
        `;

        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            // TODO(BA-Q4): Confirm whether the button should also appear on EDIT or CREATE.
            if (scriptContext.type !== scriptContext.UserEventType.VIEW) {
                return;
            }

            // Giữ theo FDD v1 — khách đổi sang Word 12/08/2026; đổi format sang
            // Knkt.FORMAT_PDF (và printfile sang Knkt.PRINT_FILE*) để bật lại nút PDF.

            // Query 1 lần cho cả form, không chạy trong vòng lặp.
            // Chỉ query khi có template bật requiresTwoResults (hiện tại: không có).
            const canCheck2KetQua = Knkt.WORD_TEMPLATE_ORDER.some((printFile) =>
                Knkt.WORD_TEMPLATE[printFile].requiresTwoResults
            );
            const co2KetQua = canCheck2KetQua && coKhuyenNghi2KetQua(scriptContext.newRecord.id);
            const printFiles = Knkt.WORD_TEMPLATE_ORDER.filter((printFile) =>
                !Knkt.WORD_TEMPLATE[printFile].requiresTwoResults || co2KetQua
            );

            printFiles.forEach((printFile) => {
                const template = Knkt.WORD_TEMPLATE[printFile];
                themButtonIn(
                    scriptContext,
                    template.buttonId,
                    template.label,
                    printFile,
                    Knkt.FORMAT_WORD
                );
            });

            // Icon Word do comUI lo: id nút chứa 'word' nên helper tự chọn đúng
            // sprite. Trước đây id là '..._pdf' nên helper gán icon PDF, phải có
            // thêm một script ghi đè — nhưng helper retry 10 lần mỗi 500ms nên
            // luôn ghi đè ngược lại. Đổi id là hết, không cần script thứ hai.
            comUI.addIconToButton(scriptContext.form);
        }

        // Adds one print button pointing at the KNKT Suitelet with the given template.
        const themButtonIn = (scriptContext, buttonId, label, printFile, format) => {
            const urlSl = url.resolveScript({
                scriptId: 'customscript_scv_sl_knkt_print',
                deploymentId: 'customdeploy_scv_sl_knkt_print',
                returnExternalUrl: false,
                params: {
                    recid: scriptContext.newRecord.id,
                    printfile: printFile,
                    format: format
                }
            });

            scriptContext.form.addButton({
                id: buttonId,
                label: label,
                functionName: "window.open('" + urlSl + "');"
            });
        }

        // Returns true when at least one khuyến nghị of this record has 2+ results.
        const coKhuyenNghi2KetQua = (recordId) => {
            return query.runSuiteQL({
                query: CO_KHUYEN_NGHI_2_KET_QUA_QUERY,
                params: [recordId]
            }).results.length > 0;
        }

        return {beforeLoad}

    });
