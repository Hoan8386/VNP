/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 * Nội dung: Client script cho Suitelet Debit/Loan Agreement Schedule (scv_sl_db_payment_schdule.js)
 * =======================================================================================
 *  Date                Author                  Description
 *  14 Aug 2026         SuiteCloud              Init & create file
 */
define(['N/currentRecord', 'N/url'],

    (currentRecord, url) => {

        const pageInit = (scriptContext) => {

        }

        const fieldChanged = (scriptContext) => {

        }

        const searchPaymentSchedule = () => {
            window.onbeforeunload = null;
            let currRecord = currentRecord.get();
            let debitloan = currRecord.getValue('custpage_debitloan');

            // lấy script/deploy của chính Suitelet đang mở để không phải hardcode id
            let currentParams = new URLSearchParams(window.location.search);
            let urlSearch = url.resolveScript({
                scriptId: currentParams.get('script'),
                deploymentId: currentParams.get('deploy'),
                returnExternalUrl: false,
                params: {
                    custpage_debitloan: debitloan || '',
                    custpage_is_search: 'T'
                }
            });
            window.location.replace(urlSearch);
        }

        return {
            pageInit,
            fieldChanged,
            searchPaymentSchedule
        };

    });