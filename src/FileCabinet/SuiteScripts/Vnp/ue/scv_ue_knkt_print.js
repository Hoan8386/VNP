/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/url', 'N/query', '../common/scv_common_ui'], (url, query, comUI) => {
        const PRINT_FILE = 'scv_render_knkt_pdf';
        const PRINT_FILE_LAN_2 = 'scv_render_knkt_pdf_l2';
        const WORD_PRINT_FILE = 'scv_render_knkt_word';
        const WORD_PRINT_FILE_LAN_2 = 'scv_render_knkt_word_l2';
        // Chỉ cần biết có hay không, nên dừng ở 1 dòng đầu tiên.
        const CO_KHUYEN_NGHI_2_KET_QUA_QUERY = `
            SELECT kn.id AS kn_id
            FROM customrecord_scv_ketquakhuyennghi kq
                INNER JOIN customrecord_scv_ykienkiennghi kn
                    ON kq.custrecord_scv_kqkn_ykienkhuyennghi = kn.id
                   AND kn.isinactive = 'F'
                INNER JOIN customrecord_scv_chitietkiennghi ph
                    ON kn.custrecord_scv_ykkn_chitietkhuyennghi = ph.id
                   AND ph.isinactive = 'F'
            WHERE ph.custrecord_scv_ctph_phieukn = ?
              AND kq.isinactive = 'F'
            GROUP BY kn.id
            HAVING COUNT(kq.id) >= 2
        `;

        // Returns true when at least one khuyến nghị of this record has 2+ results.
        const coKhuyenNghi2KetQua = (recid) => {
            return query.runSuiteQL({
                query: CO_KHUYEN_NGHI_2_KET_QUA_QUERY,
                params: [recid]
            }).results.length > 0;
        }

        // Adds one print button pointing at the KNKT Suitelet with the given template.
        const themButtonIn = (scriptContext, buttonId, label, printfile, format) => {
            const urlSl = url.resolveScript({
                scriptId: 'customscript_scv_sl_knkt_print',
                deploymentId: 'customdeploy_scv_sl_knkt_print',
                returnExternalUrl: false,
                params: {
                    recid: scriptContext.newRecord.id,
                    printfile: printfile,
                    format: format
                }
            });

            scriptContext.form.addButton({
                id: buttonId,
                label: label,
                functionName: "window.open('" + urlSl + "');"
            });
        }

        // Giữ nguyên button ID có hậu tố `_pdf`, nhưng hiển thị icon Word cho 2 nút KNKT.
        const addWordIconToKnktButtons = (form) => {
            form.addField({
                id: 'custpage_scv_field_knkt_word_icons',
                type: 'INLINEHTML',
                label: 'Add Word icons to KNKT buttons'
            }).defaultValue = `<script>
                (() => {
                    const wordIconUrl = 'https://img.icons8.com/color/24/microsoft-word-2019--v2.png';
                    const buttonIds = [
                        'custpage_scv_btn_knkt_pdf',
                        'secondarycustpage_scv_btn_knkt_pdf',
                        'custpage_scv_btn_knkt_pdf_l2',
                        'secondarycustpage_scv_btn_knkt_pdf_l2'
                    ];
                    const applyWordIcon = () => {
                        buttonIds.forEach((buttonId) => {
                            const buttonElement = document.getElementById(buttonId);
                            if (!buttonElement) {
                                return;
                            }

                            buttonElement.style.setProperty('padding-left', '24px', 'important');
                            buttonElement.style.setProperty(
                                'background-image',
                                \`url('\${wordIconUrl}')\`,
                                'important'
                            );
                            buttonElement.style.setProperty(
                                'background-repeat',
                                'no-repeat',
                                'important'
                            );
                        });
                    };

                    applyWordIcon();
                    setTimeout(applyWordIcon, 0);
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', applyWordIcon);
                    }
                })();
            </script>`;
        }

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
            if (scriptContext.type === scriptContext.UserEventType.VIEW) {
                // Giữ theo FDD v1 — khách đổi sang Word 12/08/2026; bỏ comment để bật lại nút PDF.
                // themButtonIn(scriptContext, 'custpage_scv_btn_knkt_pdf', 'Print KNKT', PRINT_FILE, 'pdf');
                themButtonIn(
                    scriptContext,
                    'custpage_scv_btn_knkt_pdf',
                    'Print KNKT',
                    WORD_PRINT_FILE,
                    'word'
                );

                // Button lần 2 chỉ hiện khi có khuyến nghị đủ 2 kết quả (chốt với BA).
                if (coKhuyenNghi2KetQua(scriptContext.newRecord.id)) {
                    // themButtonIn(scriptContext, 'custpage_scv_btn_knkt_pdf_l2', 'Print KNKT lần 2', PRINT_FILE_LAN_2, 'pdf');
                    themButtonIn(
                        scriptContext,
                        'custpage_scv_btn_knkt_pdf_l2',
                        'Print KNKT lần 2',
                        WORD_PRINT_FILE_LAN_2,
                        'word'
                    );
                }

                comUI.addIconToButton(scriptContext.form);
                addWordIconToKnktButtons(scriptContext.form);
            }
        }

        return {beforeLoad}

    });
