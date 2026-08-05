/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['../common/scv_common_import_data.js', '../lib/scv_lib_function.js', '../lib/scv_lib_report.js'],

    (commonData, libFunc, libRep) => {

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            let body = JSON.parse(scriptContext.request.body);
            let data = body.data;
            let sjId = '';
            if (data.kind === commonData.FileKind.XLSX && data.sheets) {

            } else if (data.kind === commonData.FileKind.WORD && data.paragraphs) {

            }

            log.error('sjId', sjId);
            scriptContext.response.write({output: JSON.stringify({sjId: sjId})});
        }

        return {onRequest}

    });