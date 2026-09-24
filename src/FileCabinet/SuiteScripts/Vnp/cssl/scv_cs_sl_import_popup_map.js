/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  11 Sep 2026         Huy Pham                Init & create file, Deploy chức năng Custom Import, from ms.Tâm(https://app.clickup.com/t/3773072/14yhnhmfg32)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord',

    '../cons/scv_cons_datastore.js',
    '../cons/scv_cons_import.js',
],(currentRecord,

    constDataStore,
    constImport,
) => {
    let windowParent = window.getParent();
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    const pageInit = (scriptContext) => {
        
        let paramsParent = windowParent._scvGetDataParams();
        let arrFieldTemplate = constImport.getListFieldTemplateColumn(paramsParent.custpage_import, paramsParent.custpage_import_line, paramsParent.custpage_chk_importheader);
        
        constDataStore.setDataStore("arrFieldTemplate", arrFieldTemplate);

        onLoadDataSublist(scriptContext.currentRecord);
    }

    const onLoadDataSublist = (_curRec) => {
        let sublistId = "custpage_sl_result";

        let arrDataFieldMapping = windowParent._scvGetDataFieldMapping();
        
        for(let i = 0; i < arrDataFieldMapping.length; i++){
            let objDataFieldMapping = arrDataFieldMapping[i];
            
            jQuery("#lbl_" + i + "_letterexcel")[0].innerText = objDataFieldMapping.letterColExcel;
            jQuery("#lbl_" + i + "_labelexcel")[0].innerText = objDataFieldMapping.labelColExcel;

            _curRec.selectLine(sublistId, i);

            if(!!objDataFieldMapping.sublistId){
                _curRec.setCurrentSublistValue(sublistId, "custpage_col_sublist", objDataFieldMapping.sublistId);
            }

            if(!!objDataFieldMapping.id){
                _curRec.setCurrentSublistValue(sublistId, "custpage_col_fieldlabel", objDataFieldMapping.id);
            }
            
            _curRec.commitLine(sublistId);
            //jQuery("#lbl_" + i + "_fieldid")[0].innerText = objDataFieldMapping.fieldId;
        }
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    const fieldChanged = (scriptContext) => {
        let curRec = scriptContext.currentRecord;
        let sublistId = scriptContext.sublistId;
        let line = scriptContext.line;

        switch(scriptContext.fieldId){
            case "custpage_col_sublist":
                let custpage_col_sublist = curRec.getCurrentSublistValue(sublistId, "custpage_col_sublist");
                let fieldLabelField = curRec.getCurrentSublistField(sublistId, "custpage_col_fieldlabel");

                loadDataColField(fieldLabelField, custpage_col_sublist);
            break;
            case "custpage_col_fieldlabel":
                let arrFieldTemplate = constDataStore.getDataStore("arrFieldTemplate");
                let custpage_col_fieldlabel = curRec.getCurrentSublistValue(sublistId, "custpage_col_fieldlabel");
                
                let objFieldTemplate_find = arrFieldTemplate.find(e => e.id == custpage_col_fieldlabel);
                if(!!objFieldTemplate_find){
                    jQuery("#lbl_" + line + "_fieldid")[0].innerText = objFieldTemplate_find.fieldId;
                }
                else{
                    jQuery("#lbl_" + line + "_fieldid")[0].innerText = "";
                }
            break;
        }
    }

    const loadDataColField = ( _field, _sublistId)=>{
        _field.removeSelectOption({value : null});
        _field.insertSelectOption({value : '', text : ''});

        let arrFieldTemplate = constDataStore.getDataStore("arrFieldTemplate");
        let arrResult = [];
        if(!!_sublistId){
            arrResult = arrFieldTemplate.filter(e => e.sublistId == _sublistId);
        }
        else{
            arrResult = arrFieldTemplate.filter(e => !e.sublistId);
        }

        arrResult.forEach(_obj =>{
            _field.insertSelectOption({value: _obj.id, text: _obj.fieldLabel});
        })
    }

    const onCancelPopup = () => {
        window.onbeforeunload = null;
        closePopup(true); 
    }

    const onSubmitResult = () =>{
        debugger
        let curRec = currentRecord.get();
        let sublistId = "custpage_sl_result";

        let arrDataFieldMapping = windowParent._scvGetDataFieldMapping();
        let arrFieldTemplate = constDataStore.getDataStore("arrFieldTemplate");

        for(let i = 0; i < arrDataFieldMapping.length; i++){
            let objDataFieldMapping = arrDataFieldMapping[i]

            let id = curRec.getSublistValue(sublistId, "custpage_col_fieldlabel", i);
            let objFieldTemplate_find = arrFieldTemplate.find(e => e.id == id);

            if(!!objFieldTemplate_find){
                objDataFieldMapping.id = objFieldTemplate_find.id;
                objDataFieldMapping.label = objFieldTemplate_find.label;
                objDataFieldMapping.sublistId = objFieldTemplate_find.sublistId;
                objDataFieldMapping.fieldId = objFieldTemplate_find.fieldId;
                objDataFieldMapping.isMapped = "T";
            }else{
                objDataFieldMapping.id = "";
                objDataFieldMapping.label = "";
                objDataFieldMapping.sublistId = "";
                objDataFieldMapping.fieldId = "";
                objDataFieldMapping.isMapped = "F";
            }
        }

        windowParent._scvUpdateFieldMapping();
        onCancelPopup(true); 
    }

    return {
        pageInit,
        fieldChanged,
        //saveRecord
        onCancelPopup,
        onSubmitResult
    };
    
});
