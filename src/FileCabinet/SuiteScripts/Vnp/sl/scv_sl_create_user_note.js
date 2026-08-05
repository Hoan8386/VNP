/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/search', 'N/ui/serverWidget', 'N/query', 'N/redirect', 'N/url'],
    
    (record, search, serverWidget, query, redirect, url) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            var request = scriptContext.request;
            var params = request.parameters;
            if(request.method == 'GET'){
                var MainForm = onCreateFormUI(params);
                scriptContext.response.writePage(MainForm.form);
            } else if(request.method == 'POST'){
                var recType = params.custpage_recordtype;
                if(recType.slice(0, 12) == 'customrecord'){
                    createUserNoteFromCustomRecord(params);
                } else {
                    createUserNoteFromTransaction(params);
                }
                // set giá trị tại màn hình nhấn nút
                if(params.custpage_workflow == 'scv_wf_create_user_note'){
                    var getFieldRecord = searchUserNoteConfig(params.custpage_recordtype);
                    if(Object.keys(getFieldRecord).length){
                        var objValues = {};
                        if(getFieldRecord.fieldId){
                            objValues[getFieldRecord.fieldId] = params.custpage_description;
                        }
                        if(getFieldRecord.statusFieldId){
                            objValues[getFieldRecord.statusFieldId] = getFieldRecord.statusValueId;
                        }
                        // if(params.custpage_recordtype == "customrecord_scv_payment_request") {
                            var recRecord = record.load({
                                type: params.custpage_recordtype,
                                id: params.custpage_recid,
                            });
                            for(var property in objValues) {
                                recRecord.setValue(property, objValues[property]);
                            }
                            recRecord.save({enableSourcing: false, ignoreMandatoryFields : true});
                        // } 
                        // else {
                        //     record.submitFields({
                        //         type: params.custpage_recordtype,
                        //         id: params.custpage_recid,
                        //         values: objValues
                        //     });
                        // }
                    }
                }
                // redirect
                redirect.toRecord({
                    type: params.custpage_recordtype,
                    id: params.custpage_recid
                });
            }
        }
        const onCreateFormUI = (_params) => {
            var mainForm = serverWidget.createForm({title: "Note"});
            mainForm.addSubmitButton("Save");
            // button cancel quay lại màn hình record
            var urlDC = url.resolveRecord({
                recordType: _params.recordtype,
                recordId: _params.recid
            });
            mainForm.addButton({
                id: "custpage_btn_cancel",
                label: "Cancel",
                functionName: `window.location.replace('${urlDC}');`
            });
            var mainGrp = addFieldGroup(mainForm, "fieldgrp_main","Main");
            var custpage_description = mainForm.addField({
                id: "custpage_description",
                type: serverWidget.FieldType.LONGTEXT,
                label: "Nội dung",
                container: mainGrp.id
            });
            custpage_description.isMandatory = true;
            var custpage_entity = mainForm.addField({
                id: "custpage_entity",
                type: serverWidget.FieldType.MULTISELECT,
                label: "Gửi tới",
                // source: "-9",
                container: mainGrp.id
            });
            onLoadEntitySource(custpage_entity, _params);
            var custpage_workflow = mainForm.addField({
                id: "custpage_workflow",
                type: serverWidget.FieldType.TEXT,
                label: "Workflow",
                container: mainGrp.id
            }).updateDisplayType({displayType: "hidden"});
            custpage_workflow.defaultValue = _params.workflow;
            var custpage_recordtype = mainForm.addField({
                id: "custpage_recordtype",
                type: serverWidget.FieldType.TEXT,
                label: "Record Type",
                container: mainGrp.id
            }).updateDisplayType({displayType: "hidden"});
            custpage_recordtype.defaultValue = _params.recordtype;
            var custpage_recordname = mainForm.addField({
                id: "custpage_recordname",
                type: serverWidget.FieldType.TEXT,
                label: "Record Name",
                container: mainGrp.id
            }).updateDisplayType({displayType: "hidden"});
            custpage_recordname.defaultValue = _params.recordname;
            var custpage_rectype = mainForm.addField({
                id: "custpage_rectype",
                type: serverWidget.FieldType.TEXT,
                label: "Rec Type",
                container: mainGrp.id
            }).updateDisplayType({displayType: "hidden"});
            custpage_rectype.defaultValue = _params.rectype;
            var custpage_recid = mainForm.addField({
                id: "custpage_recid",
                type: serverWidget.FieldType.TEXT,
                label: "Record Id",
                container: mainGrp.id
            }).updateDisplayType({displayType: "hidden"});
            custpage_recid.defaultValue = _params.recid;
            return { form: mainForm, sublist_1: "" };
        }
        const createUserNoteFromCustomRecord = (params) => {
            // tạo note
            var newNote = record.create({type: "note"});
            newNote.setValue("note", params.custpage_description);
            newNote.setValue("recordtype", params.custpage_rectype);
            newNote.setValue("record", params.custpage_recid);
            var urlRecord = url.resolveRecord({
                recordType: params.custpage_recordtype,
                recordId: params.custpage_recid
            });
            newNote.setValue("custrecord_scv_recordlink", urlRecord);
            newNote.setValue("custrecord_scv_chatto", params.custpage_entity);
            // newNote.setValue("custrecord_scv_note_recordtype", params.custpage_recordname);
            newNote.save();
        }
        const createUserNoteFromTransaction = (params) => {
            var listEntity = ["customer", "contact", "vendor", "employee", "job"];
            var listActivity = ["supportcase", "task", "calendarevent", "cashsale", "vendorbill", "opportunity"];
            var recType = params.custpage_recordtype;
            var newNote = record.create({type: "note"});
            newNote.setValue("note", params.custpage_description);
            if(listEntity.includes(recType)){
                newNote.setValue("entity", params.custpage_recid);
            } else if(listActivity.includes(recType)) {
                newNote.setValue("activity", params.custpage_recid);
            } else {
                newNote.setValue("transaction", params.custpage_recid);
            }
            var urlRecord = url.resolveRecord({
                recordType: recType,
                recordId: params.custpage_recid
            });
            newNote.setValue("custrecord_scv_recordlink", urlRecord);
            newNote.setValue("custrecord_scv_chatto", params.custpage_entity);
            // newNote.setValue("custrecord_scv_note_recordtype", params.custpage_recordname);
            newNote.save();
        }
        // search partner and customer 
        const onLoadEntitySource = (_entityField, _params) => {
            var entity_field = getEntityFieldRecSetup(_params.recordtype);
            var entityid = getEntityRecord(_params, entity_field);
            var arrEntity = getDataEntity(entityid);
            // add select options
            _entityField.addSelectOption({ value : "", text : "" });
            arrEntity.forEach(e => {
                _entityField.addSelectOption({ value : e.value, text : e.text, isSelected: e.isSelected });
            });
        }
        const getEntityFieldRecSetup = (_rectype) => {
            var sqlQuery = `SELECT custrecord_scv_slusernote_requestor, id FROM customrecord_scv_slussernote_config
            WHERE custrecord_scv_recordtype = '${_rectype}' and isinactive = 'F'`;

            var resultQuery = query.runSuiteQL({
                query: sqlQuery
            });
            resultQuery = resultQuery.asMappedResults();

            return resultQuery?.[0]?.custrecord_scv_slusernote_requestor;
        }

        const getEntityRecord = (_params, _entity_field) => {
            let recordLKF = search.lookupFields({
                type: _params.recordtype,
                id: _params.recid,
                columns: [_entity_field]
            });
            let entityid = recordLKF?.[_entity_field]?.[0]?.value || null;
            return entityid;
        }
        const getDataEntity = (_entityid) => {
            var arrResult = [];
            var entitySearchObj = search.create({
                type: "entity",
                filters:
                [
                   ["isinactive","is","F"],
                   "and",
                   ["type", "anyof", ["Employee","Partner"]]
                ],
                columns:
                [
                    "entityid", "type", "altname"
                ]
            });
            var myColumns = entitySearchObj.columns;
            entitySearchObj = entitySearchObj.runPaged({pageSize:1000});
            for(var i = 0; i < entitySearchObj.pageRanges.length; i++){
                var currentPage = entitySearchObj.fetch({index : i}).data;
                for(var idx = 0; idx < currentPage.length; idx++){
                    var obj = {
                        text: currentPage[idx].getValue(myColumns[0]) + " " + currentPage[idx].getValue(myColumns[2]),
                        value: currentPage[idx].id,
                        isSelected: false
                    };

                    if(_entityid == currentPage[idx].id) {
                        obj.isSelected = true;
                        arrResult.unshift(obj);
                    } else {
                        arrResult.push(obj);
                    }
                }
            }
            return arrResult;
        }
        // search record config
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
                    search.createColumn({name: "custrecord_scv_slusernote_statusvalue_id", label: "Status Value"})
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
            }
            return objField;
        }
        function addFieldGroup(_form, _id,_label){
            var _obj = {id: _id, label: _label}
            _form.addFieldGroup(_obj);
            return _obj;
        }
        return {onRequest}

    });
