/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  11 Sep 2026         Huy Pham                Init & create file, Deploy chức năng Custom Import, from ms.Tâm(https://app.clickup.com/t/3773072/14yhnhmfg32)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/ui/serverWidget',
    '../olib/alasql/alasql.min@4.6.6.js',
    '../cons/scv_cons_import.js',
],
    
    (serverWidget,
        alasql,
        constImport,
    ) => {

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            let request = scriptContext.request;
            let response = scriptContext.response;
            let params = request.parameters;

            if(request.method === "GET") {
                let MainForm = onCreateFormUI(params);
                
                response.writePage(MainForm.form);
            }
        }

        const onCreateFormUI = (_params) => {
            let mainForm = serverWidget.createForm({title: "Import Mapping Field", hideNavBar: true});
            mainForm.clientScriptModulePath = '../cssl/scv_cs_sl_import_popup_map.js';

            mainForm.addButton({id: "custpage_btn_submit", label: "OK", functionName: "onSubmitResult()"});
            mainForm.addButton({id: "custpage_btn_cancel", label: "Cancel", functionName: "onCancelPopup()"});

            let slResult = mainForm.addSublist({
                id : "custpage_sl_result",
                type : serverWidget.SublistType.LIST,
                label : 'Result'
            });

            onCreateSublistColumn(slResult, _params);

            
            let sizeRow = (_params.sizeRow||0) * 1;
            for (var i = 0; i < sizeRow; i++) {
                slResult.setSublistValue({id: "custpage_col_letterexcel", line: i, value: `<label id="lbl_` + i + `_letterexcel"></label>`})
                slResult.setSublistValue({id: "custpage_col_labelexcel", line: i, value: `<label id="lbl_` + i + `_labelexcel"></label>`})
                slResult.setSublistValue({id: "custpage_col_fieldid", line: i, value: `<label id="lbl_` + i + `_fieldid"></label>`})
            }

            return {form: mainForm};
        }

        const onCreateSublistColumn = (_sublist, _params) => {
            
            let arrFieldTemplate = constImport.getListFieldTemplateColumn(_params.custpage_import, _params.custpage_import_line, _params.custpage_chk_importheader);
            let arrFieldMain = arrFieldTemplate.filter(e => !e.sublistId);
            let arrSublist = arrFieldTemplate.filter(e => !!e.sublistId);
            arrSublist = alasql(`SELECT DISTINCT sublistId, sublistLabel FROM ?`, [arrSublist]);

            var arrColumn = [
                {id: "custpage_col_letterexcel", label: "Letter Column Xls", type: "text"},
                {id: "custpage_col_labelexcel", label: "Label Column Xls", type: "text"},
                {id: "custpage_col_sublist", label: "Sublist", type: "select", displayType: "entry"},
                {id: "custpage_col_fieldid", label: "Field ID Netsuite", type: "text"},
                {id: "custpage_col_fieldlabel", label: "Field Label Netsuite", type: "select", displayType: "entry"}
            ];
            for(var i = 0; i< arrColumn.length; i++){
                let objCol = arrColumn[i];

                if(objCol.id == "custpage_col_sublist" && arrSublist.length == 0){
                    continue;
                }

                let field = _sublist.addField({
                    id : objCol.id,
                    type : objCol.type,
                    source: objCol.source||null,
                    label : objCol.label
                }).updateDisplayType({displayType: objCol.displayType||"inline"});

                if(objCol.id == "custpage_col_sublist"){
                    field.addSelectOption({value: "", text: ""});
                    arrSublist.forEach(_obj=>{
                        field.addSelectOption({value: _obj.sublistId, text: _obj.sublistLabel});
                    })
                }
                else if(objCol.id == "custpage_col_fieldlabel"){
                    field.addSelectOption({value: "", text: ""});
                    arrFieldMain.forEach(_obj=>{
                        field.addSelectOption({value: _obj.id, text: _obj.fieldLabel});
                    })
                }
                
            }
        }
        return {onRequest}

    });
