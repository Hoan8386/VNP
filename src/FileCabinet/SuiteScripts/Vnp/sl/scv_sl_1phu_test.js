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
            log.error("res", searchUserNoteConfig('customerpayment'));
        }

        const searchUserNoteConfig = (_rectype) => {
            var userNoteSearch = search.create({
                type: "customrecord_scv_slussernote_config",
                filters: [
                    ["isinactive", "is", "F"],
                    "AND",
                    ["custrecord_scv_recordtype", search.Operator.CONTAINS, _rectype]
                ],
                columns:
                [
                    search.createColumn({name: "name", label: "Name"}),
                    search.createColumn({name: "custrecord_scv_recordtype", label: "Record type"}),
                    search.createColumn({name: "custrecord_scv_field_id", label: "Field ID"}),
                    search.createColumn({name: "custrecord_scv_slusernote_statusfield_id", label: "Status Field ID"}),
                    search.createColumn({name: "custrecord_scv_slusernote_statusvalue_id", label: "Status Value"}),
                    search.createColumn({name: "custrecord_scv_slusernote_void", label: "Is Void Record?"}),
                ]
            });
            var myColumns = userNoteSearch.columns;
            userNoteSearch = userNoteSearch.run().getRange({start: 0, end: 1});
            var objField = {};
            if(userNoteSearch.length > 0){
                objField.recType = userNoteSearch[0].getValue(myColumns[1]);
                objField.fieldId = userNoteSearch[0].getValue(myColumns[2]);
                objField.statusFieldId = userNoteSearch[0].getValue(myColumns[3]);
                objField.statusValueId = userNoteSearch[0].getValue(myColumns[4]);
                objField.isVoidRecord = userNoteSearch[0].getValue(myColumns[5]);
            }
            return objField;
        }

        return {onRequest}

    });
