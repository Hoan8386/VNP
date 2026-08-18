/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/record', 'N/search',
    '../cons/scv_cons_search.js'
],
    
    (
        record, search,
        constSearch
    ) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            const newRecord = record.load({type: "customrecord_ncfar_assetproposal", id: 1101});
            let propsourceid = newRecord.getValue({
                fieldId: 'custrecord_propsourceid'
            });

            let propsourceline = newRecord.getValue({
                fieldId: 'custrecord_propsourceline'
            });

            const filters = [
                search.createFilter({
                    name: "internalid",
                    operator: "anyof",
                    values: propsourceid
                }),
                search.createFilter({
                    name: "line",
                    operator: "equalto",
                    values: propsourceline
                }),
            ];
            const a = constSearch.getDataSource_Mixed("customsearch_scv_upd_proposal", filters, [], {});
            log.error("a", a);
        }

        return {onRequest}

    });
