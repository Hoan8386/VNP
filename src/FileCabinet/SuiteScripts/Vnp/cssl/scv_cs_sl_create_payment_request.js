/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/https', 'N/url', 'N/ui/dialog', 'N/ui/message'],
    (currentRecord, https, url, dialog, message) => {

        const FIELD = {
            TYPE: 'custpage_type',
            SUBSIDIARY: 'custpage_subsidiary',
            FROM_DATE: 'custpage_from_date',
            TO_DATE: 'custpage_to_date',
            PAYR: 'custpage_payr',
            IS_SEARCH: 'custpage_is_search'
        };

        const SUBLIST = 'custpage_result';

        function fieldChanged(scriptContext) {
            if (scriptContext.fieldId === FIELD.SUBSIDIARY || scriptContext.fieldId === FIELD.TYPE) {
                reloadWithoutResults(scriptContext.currentRecord);
            }
        }

        function reloadWithoutResults(rec) {
            const params = getParams(rec);
            params.custpage_is_search = '';
            params.custpage_payr = '';
            window.onbeforeunload = null;
            window.location.replace(resolveSuitelet(params));
        }

        function getParams(rec) {
            return {
                custpage_type: rec.getValue({fieldId: FIELD.TYPE}),
                custpage_subsidiary: rec.getValue({fieldId: FIELD.SUBSIDIARY}),
                custpage_from_date: rec.getText({fieldId: FIELD.FROM_DATE}),
                custpage_to_date: rec.getText({fieldId: FIELD.TO_DATE}),
                custpage_payr: rec.getValue({fieldId: FIELD.PAYR}),
                custpage_is_search: 'T'
            };
        }

        function getMissingFields(params) {
            const missing = [];
            if (!params.custpage_type) missing.push('Type');
            if (!params.custpage_subsidiary) missing.push('Subsidiary');
            if (!params.custpage_from_date) missing.push('From Date');
            if (!params.custpage_to_date) missing.push('To Date');
            return missing;
        }

        function showMissingFields(missing) {
            if (missing.length) {
                alert('Please fill: ' + missing.join(', '));
                return true;
            }
            return false;
        }

        function resolveSuitelet(params) {
            return url.resolveScript({
                scriptId: 'customscript_scv_sl_create_payr',
                deploymentId: 'customdeploy_scv_sl_create_payr',
                returnExternalUrl: false,
                params
            });
        }

        function searchResult() {
            const rec = currentRecord.get();
            const params = getParams(rec);
            if (showMissingFields(getMissingFields(params))) return;
            window.onbeforeunload = null;
            window.location.replace(resolveSuitelet(params));
        }

        function createPaymentRequest() {
            const rec = currentRecord.get();
            const params = getParams(rec);
            params.custpage_is_search = rec.getValue({fieldId: FIELD.IS_SEARCH});
            if (showMissingFields(getMissingFields(params))) return;

            let lines;
            try {
                lines = getSelectedLines(rec);
                validateSamePayr(lines);
            } catch (e) {
                alert(e.message || e.toString());
                return;
            }

            const processing = message.create({
                title: 'Processing',
                message: 'Đang mở Payment Request, vui lòng đợi...',
                type: message.Type.INFORMATION
            });
            processing.show();

            https.requestSuitelet.promise({
                scriptId: 'customscript_scv_sl_create_payr',
                deploymentId: 'customdeploy_scv_sl_create_payr',
                method: https.Method.POST,
                body: JSON.stringify({params, lines})
            }).then((response) => {
                const body = JSON.parse(response.body || '{}');
                if (!body.success) {
                    return dialog.alert({title: 'Error', message: body.message || 'Cannot create Payment Request.'});
                }
                window.onbeforeunload = null;
                window.location.href = body.url;
            }).catch((reason) => {
                dialog.alert({title: 'Error', message: reason.message || reason.toString()});
            }).finally(() => {
                processing.hide();
            });
        }

        function getSelectedLines(rec) {
            const lineCount = rec.getLineCount({sublistId: SUBLIST});
            const lines = [];
            for (let i = 0; i < lineCount; i++) {
                const selected = rec.getSublistValue({sublistId: SUBLIST, fieldId: 'custpage_select', line: i});
                if (selected !== true && selected !== 'T') continue;
                const lineJson = rec.getSublistValue({sublistId: SUBLIST, fieldId: 'custpage_line_json', line: i});
                if (lineJson) lines.push(JSON.parse(lineJson));
            }
            if (!lines.length) throw Error('Please select at least one line.');
            return lines;
        }

        function validateSamePayr(lines) {
            const payr = lines[0].payr || '';
            for (let i = 0; i < lines.length; i++) {
                if ((lines[i].payr || '') !== payr) {
                    throw Error('Only lines with the same PayR can be selected.');
                }
            }
        }

        return {
            fieldChanged,
            searchResult,
            createPaymentRequest
        };
    });
