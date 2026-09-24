/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  11 Sep 2026         Huy Pham                Init & create file, Deploy chức năng Custom Import, from ms.Tâm(https://app.clickup.com/t/3773072/14yhnhmfg32)
 */
define(['N/record', 'N/query', 'N/runtime',
    '../lib/scv_lib_function.js', 
    '../cons/scv_cons_record.js',
    '../cons/scv_cons_search.js',
    '../cons/scv_cons_datastore.js',
    '../cons/scv_cons_importline.js',
    '../cons/scv_cons_import_detail.js',
	'../cons/scv_cons_valuetype.js',
	'../cons/scv_cons_unitstypeuom.js',
],
    (record, query, runtime,
        lbf, 
        constRecord,
        constSearch,
        constDataStore,
		constImportLine,
		constImportDetail,
		constValueType,
		constUnitsTypeUom,
    ) => {
        const TYPE = "customrecord_scv_import";
    
        const Records = {
            stores: {
                customsearch: {},
                custdataset: {},
                query: {}
            }
        }

        const NONE_Value = "@NONE@";

        let arrUnitTypeUom = [];
        
        const getDataSourceByCriteriaQuery = (_objDataFilter) => {
            let query_where = `WHERE isinactive = 'F' `;

            if(!!_objDataFilter.custrecord_scv_import_rectype?.toString()){
                query_where += ` AND custrecord_scv_import_rectype = '${_objDataFilter.custrecord_scv_import_rectype.toString()}' `
            }else{
                return [];
            }

            var resultQuery = query.runSuiteQL({
                query: `SELECT custrecord_scv_import_rectype, id, name
                FROM customrecord_scv_import
                ${query_where}`
            });
    
            let arrResult = resultQuery.asMappedResults();
            
            return arrResult;
        }

        const initLoadFieldByCriteriaQuery = (_field, _objDataFilter, _hasNull = true) =>{
            let arrResult = getDataSourceByCriteriaQuery(_objDataFilter);
    
            _field.removeSelectOption({value : null});
            constRecord.initLoadField(_field, {data: arrResult}, _hasNull);
    
            return arrResult;
        }
    
        const getListFieldTemplateColumn = (_importId, _importLineId, _hasMainField) =>{
            let arrFieldMain = getListFieldMain(_importId);
            let arrSublist = getListSublist(_importLineId);
            let arrFieldSublist = getListFieldSublist(_importLineId);

            if(_hasMainField != "T"){
                arrFieldMain = arrFieldMain.filter(e => e.custrecord_scv_import_d_valuetype == constValueType.Records.PK.ID)
            }

            let arrResult = [];

            for(let i = 0; i < arrFieldMain.length; i++){
                let objFieldMain = arrFieldMain[i];

                if(!objFieldMain.custrecord_scv_import_d_subrec_invdetail){
                    arrResult.push({
                        id: objFieldMain.custrecord_scv_import_d_fldid,
                        label: objFieldMain.custrecord_scv_import_d_lbl,
                        sublistId: "",
                        sublistLabel: "",
                        fieldId: objFieldMain.custrecord_scv_import_d_fldid,
                        fieldLabel: objFieldMain.custrecord_scv_import_d_lbl,
                        valueType: objFieldMain.custrecord_scv_import_d_valuetype,
                        guideNote: objFieldMain.custrecord_scv_import_d_note,
                        dataSource: objFieldMain.custrecord_scv_import_d_datasource,
                        isInventoryDetail: "F"
                    })
                }
                else{
                    let arrFieldsInvDetail = constImportDetail.getDataSourceByCriteriaQuery({
                        custrecord_scv_import_d_invdetail: objFieldMain.custrecord_scv_import_d_subrec_invdetail
                    });
                    for(let j = 0; j < arrFieldsInvDetail.length; j++){
                        let objField = arrFieldsInvDetail[j];

                        arrResult.push({
                            id: objFieldMain.custrecord_scv_import_d_fldid + "@" + objField.custrecord_scv_import_d_fldid,
                            label: objField.custrecord_scv_import_d_lbl,
                            sublistId: "",
                            sublistLabel: "",
                            fieldId: objField.custrecord_scv_import_d_fldid,
                            fieldLabel: objField.custrecord_scv_import_d_lbl,
                            valueType: objField.custrecord_scv_import_d_valuetype,
                            guideNote: objField.custrecord_scv_import_d_note,
                            dataSource: objField.custrecord_scv_import_d_datasource,
                            isInventoryDetail: "T",
                            inventoryDetailFieldId: objFieldMain.custrecord_scv_import_d_fldid
                        })
                    }
                }
                
            }

            for(let i = 0; i < arrSublist.length; i++){
                let objSublist = arrSublist[i];

                let arrFieldSublist_filter = arrFieldSublist.filter(e => e.custrecord_scv_import_line_d == objSublist.id);

                for(let j = 0; j < arrFieldSublist_filter.length; j++){
                    let objFieldSublist = arrFieldSublist_filter[j];

                    if(!objFieldSublist.custrecord_scv_import_d_subrec_invdetail){
                        arrResult.push({
                            id: objSublist.custrecord_scv_import_line_sublist + "@" + objFieldSublist.custrecord_scv_import_d_fldid,
                            label: objSublist.name + ": " + objFieldSublist.custrecord_scv_import_d_lbl,
                            sublistId: objSublist.custrecord_scv_import_line_sublist,
                            sublistLabel: objSublist.name,
                            fieldId: objFieldSublist.custrecord_scv_import_d_fldid,
                            fieldLabel: objFieldSublist.custrecord_scv_import_d_lbl,
                            valueType: objFieldSublist.custrecord_scv_import_d_valuetype,
                            guideNote: objFieldSublist.custrecord_scv_import_d_note,
                            dataSource: objFieldSublist.custrecord_scv_import_d_datasource,
                            isInventoryDetail: "F"
                        })
                    }
                    else{
                        let arrFieldsInvDetail = constImportDetail.getDataSourceByCriteriaQuery({
                            custrecord_scv_import_d_invdetail: objFieldSublist.custrecord_scv_import_d_subrec_invdetail
                        });
                        for(let z = 0; z < arrFieldsInvDetail.length; z++){
                            let objField = arrFieldsInvDetail[z];
        
                            arrResult.push({
                                id: objSublist.custrecord_scv_import_line_sublist + "@" + objFieldSublist.custrecord_scv_import_d_fldid + "@" + objField.custrecord_scv_import_d_fldid,
                                label: objSublist.name + ": " + objFieldSublist.custrecord_scv_import_d_lbl + ": " + objField.custrecord_scv_import_d_lbl,
                                sublistId: objSublist.custrecord_scv_import_line_sublist,
                                sublistLabel: objSublist.name,
                                fieldId: objField.custrecord_scv_import_d_fldid,
                                fieldLabel: objField.custrecord_scv_import_d_lbl,
                                valueType: objField.custrecord_scv_import_d_valuetype,
                                guideNote: objField.custrecord_scv_import_d_note,
                                dataSource: objField.custrecord_scv_import_d_datasource,
                                isInventoryDetail: "T",
                                inventoryDetailFieldId: objFieldSublist.custrecord_scv_import_d_fldid
                            })
                        }
                    }
                }
            }

            return arrResult;
        }

        const getListFieldMain = (_importId) =>{
            if(!_importId) return [];

            let arrFields = constImportDetail.getDataSourceByCriteriaQuery({custrecord_scv_import_d: _importId});

            return arrFields;
        }

        const getListSublist = (_importLineId) =>{
            if(!_importLineId) return [];

            let arrSublist = constImportLine.getDataSourceByCriteriaQuery({id: _importLineId});

            return arrSublist;
        }

        const getListFieldSublist = (_importLineId) =>{
            if(!_importLineId) return [];
            let arrFields = constImportDetail.getDataSourceByCriteriaQuery({custrecord_scv_import_line_d: _importLineId});

            return arrFields;
        }

        /**
         * HuyPQ 20241126: Thêm chức năng Inventory Detail ở dưới line đã xử lý, trên header thì chưa
         * @param {*} _arrRawData 
         * @param {*} _importId 
         * @param {*} _importLineId 
         * @param {*} _isImportHeader 
         * @returns 
         */
        const convertRawDataToRecordJson = (_arrRawData, _importId, _importLineId, _isImportHeader) =>{
            if(_arrRawData.length == 0) return [];

            let arrFieldIdUpload = Object.keys(_arrRawData[0])

            let arrFieldTemplate = getListFieldTemplateColumn(_importId, _importLineId, _isImportHeader);

            let arrFieldIdMainActual = [], arrFieldSublistActual = [];

            for(let i = 0; i < arrFieldIdUpload.length; i++){
                let fieldIdUpload = arrFieldIdUpload[i];

                let objFieldTemplate_find = arrFieldTemplate.find(e => e.id == fieldIdUpload);
                if(!objFieldTemplate_find) continue;

                if(!objFieldTemplate_find.sublistId){
                    arrFieldIdMainActual.push(objFieldTemplate_find.fieldId)
                }
                else{
                    arrFieldSublistActual.push({
                        id: objFieldTemplate_find.id,
                        sublistId: objFieldTemplate_find.sublistId,
                        fieldId: objFieldTemplate_find.fieldId,
                        valueType: objFieldTemplate_find.valueType,
                        inventoryDetailFieldId: objFieldTemplate_find.inventoryDetailFieldId
                    })
                }
            }
            //alasql sẽ lỗi ký tự đặc biệt.Ex: :
            let arrSublistIdActual = lbf.onGroupByArray(arrFieldSublistActual, ["sublistId"])//alasql(`SELECT DISTINCT sublistId FROM ?`, [arrFieldSublistActual])
            let arrResult = [];
            let arrMainGroup = lbf.onGroupByArray(_arrRawData, arrFieldIdMainActual)//alasql(`SELECT DISTINCT ${arrFieldIdMainActual.join(", ")} FROM ?`, [_arrRawData]);

            for(let i = 0; i < arrMainGroup.length; i++){
                let objRes = {...arrMainGroup[i]};

                objRes.sublists = {};

                let arrLines_filter = _arrRawData.filter(function(e){
                    for(let j = 0; j < arrFieldIdMainActual.length; j++){
                        let fieldId = arrFieldIdMainActual[j];

                        if(e[fieldId] != objRes[fieldId]) return false;
                    }
                    return true;
                })

                
                for(let idxSublist = 0; idxSublist < arrSublistIdActual.length; idxSublist++){
                    let sublistId = arrSublistIdActual[idxSublist].sublistId;

                    objRes.sublists[sublistId] = [];

                    let arrFieldSublistActual_filter = arrFieldSublistActual.filter(e => e.sublistId == sublistId);

                    for(let idxLine = 0; idxLine < arrLines_filter.length; idxLine++){
                        let objLine = arrLines_filter[idxLine];

                        let objLineRes = {};

                        let isValidPKUnique = false;
                        //arrFieldSublistActual_filter.forEach(_objField => objLineRes[_objField.fieldId] = objLine[_objField.id]);
                        for(let j = 0; j < arrFieldSublistActual_filter.length; j++){
                            let objFieldSublistActual = arrFieldSublistActual_filter[j];

                            let fieldId = objFieldSublistActual.fieldId;
                            if(!!objFieldSublistActual.inventoryDetailFieldId){
                                fieldId = objFieldSublistActual.inventoryDetailFieldId + "." + objFieldSublistActual.fieldId;
                            }

                            objLineRes[fieldId] = objLine[objFieldSublistActual.id];
                            
                            if([constValueType.Records.PK.ID, constValueType.Records.Unique.ID].includes(objFieldSublistActual.valueType * 1)  && !!objLine[objFieldSublistActual.id]){
                                isValidPKUnique = true;
                            }
                        }

                        if(!isValidPKUnique) continue;

                        objRes.sublists[sublistId].push(objLineRes);
                    }

                    let objFirstInvDetailField = arrFieldSublistActual_filter.find(e => !!e.inventoryDetailFieldId)
                    if(!!objFirstInvDetailField){
                        let arrFieldIdLineSublist = arrFieldSublistActual_filter.filter(e => !e.inventoryDetailFieldId).map(e => e.fieldId);
                        let arrLineSublist = lbf.onGroupByArray(objRes.sublists[sublistId], arrFieldIdLineSublist);
                        for(let j = 0; j < arrLineSublist.length; j++){
                            let objLineRes = arrLineSublist[j];
        
                            objLineRes.inventoryDetail = {
                                fieldId: objFirstInvDetailField.inventoryDetailFieldId,
                                inventoryAssignment: []
                            };
        
                            let arrInvDetailLine = objRes.sublists[sublistId].filter(function(e){
                                for(let z = 0; z < arrFieldIdLineSublist.length; z++){
                                    let fieldId = arrFieldIdLineSublist[z];
        
                                    if(e[fieldId] != objLineRes[fieldId]){
                                        return false;
                                    }
                                }
                                return true;
                            });
                            for(let z = 0; z < arrInvDetailLine.length; z++){
                                let objInvDetailLine = arrInvDetailLine[z];
                                let objLineAss = {};
                                Object.keys(objInvDetailLine).forEach(_keyId =>{

                                    if(!_keyId.includes(objFirstInvDetailField.inventoryDetailFieldId + ".")) return;

                                    let fieldId = _keyId.replace(objFirstInvDetailField.inventoryDetailFieldId +".", "");
                                    objLineAss[fieldId] = objInvDetailLine[_keyId];
                                });

                                objLineRes.inventoryDetail.inventoryAssignment.push(objLineAss);
                            }
                        }

                        objRes.sublists[sublistId] = arrLineSublist;
                    }
                }

                arrResult.push(objRes);
            }

            return arrResult;
        }

        const importDataFromRecordJson = (_objResRec, _arrFieldTemplate, _recType) =>{
            let arrFieldMain = _arrFieldTemplate.filter(e => !e.sublistId);

            let recId = "", recExternalId = "";
            let objFieldMainPK = arrFieldMain.find(e => e.valueType == constValueType.Records.PK.ID);
            let objFieldMainUnique = arrFieldMain.find(e => e.valueType == constValueType.Records.Unique.ID);
            let objFieldTransForm = arrFieldMain.find(e => e.valueType == constValueType.Records.TransactionTransformFrom.ID);
            
            if(!!objFieldMainPK){
                recId = _objResRec[objFieldMainPK.fieldId];
            }
            
            if(!recId && !!objFieldMainUnique){
                recExternalId = _objResRec[objFieldMainUnique.fieldId];
                if(!!recExternalId){
                    let resultSearch = constSearch.createSearchWithFilter({
                        type: _recType,
                        filters:
                        [
                            [objFieldMainUnique.fieldId,"is", recExternalId]
                        ],
                        columns:
                        [
                            {
                                name: "internalid",
                                summary: "GROUP",
                            }
                        ]
                    });

                    let arrResult = constSearch.fetchResultSearchRun(resultSearch, function(_objTmpl, _column){
                        let objResTmpl = constSearch.getObjResultFromSearchByKey(_objTmpl, _column, [
                            "internalid"
                        ]);
        
                        return objResTmpl;
                    });
                    
                    recId = arrResult.length > 0 ? arrResult[0].internalid : "";
                }
            }

            let curRec = null;
            let isTransform = false;

            if(!!recId){
                curRec = record.load({type: _recType, id: recId, isDynamic: true});
            }else{
                let objTransform = transformFrom(_recType, _objResRec, objFieldTransForm);
                if(!!objTransform){
                    curRec = record.transform({
                        fromType: objTransform.fromType,  fromId: objTransform.fromId,
                        toType: _recType, isDynamic: true
                    });
                    defaultValueTransForm(curRec);
                    isTransform = true;
                }
                else{
                    curRec = record.create({type: _recType, isDynamic: true});
                }
            }

            for(let i = 0; i < arrFieldMain.length; i++){
                let objFieldMain = arrFieldMain[i];
                
                let value_field = _objResRec[objFieldMain.fieldId];
                if(!lbf.isContainValue(value_field)) continue;

                if([constValueType.Records.PK.ID/* , constValueType.Records.Unique.ID */].includes(objFieldMain.valueType * 1)) continue;

                value_field = value_field.toString().trim().toUpperCase() == NONE_Value ? "" : value_field;

                if(objFieldMain.valueType == constValueType.Records.Value.ID){
                    curRec.setValue(objFieldMain.fieldId, value_field);
                }
                else if(objFieldMain.valueType == constValueType.Records.Text.ID){
                    let internalid_value_field = getInternalIDFromDataSource(objFieldMain, value_field);
                    if(!!internalid_value_field){
                        curRec.setValue(objFieldMain.fieldId, internalid_value_field)
                    }
                    else{
                        curRec.setText(objFieldMain.fieldId, value_field)
                    }
                }
                else if(objFieldMain.valueType == constValueType.Records.TransactionTransformFrom.ID){
                    //Không cần set value
                }
                else{
                    value_field = constValueType.formatDataValueType(objFieldMain.valueType, value_field);
                    curRec.setValue(objFieldMain.fieldId, value_field);
                }
            }
            
            let objSublist = _objResRec.sublists;
            let arrSublistId = [];
            if(!!objSublist){
                arrSublistId = Object.keys(objSublist);
            }
            for(let idxSublist = 0; idxSublist < arrSublistId.length; idxSublist++){
                let sublistId = arrSublistId[idxSublist];

                let arrSubistField = _arrFieldTemplate.filter(e => e.sublistId == sublistId);
                let objFieldSublistPK = arrSubistField.find(e => e.valueType == constValueType.Records.PK.ID);
                let objFieldSublistUnique = arrSubistField.find(e => e.valueType == constValueType.Records.Unique.ID);
                let arrSubistFieldId = arrSubistField.map(e => e.fieldId);

                let arrLineOrgRec = getDataLineOriginalOfSublist(curRec, sublistId, arrSubistFieldId);
                
                let arrLineData = objSublist[sublistId];
                
                for(let i = 0; i < arrLineData.length; i++){
                    let objLineData = arrLineData[i];

                    let linePK = "";
                    let lineUnique = "";
                    
                    if(!!objFieldSublistPK){
                        linePK = objLineData[objFieldSublistPK.fieldId];
                    }
                    if(!linePK && !!objFieldSublistUnique){
                        lineUnique = objLineData[objFieldSublistUnique.fieldId];

                        if(!!lineUnique){
                            let objLineOrg_find = arrLineOrgRec.find(e => e[objFieldSublistUnique.fieldId] == objLineData[objFieldSublistUnique.fieldId]);
                            if(!!objLineOrg_find){
                                objLineOrg_find._isMapped = "T";

                                linePK = objLineOrg_find[objFieldSublistUnique.fieldId];
                            }
                        }
                    }

                    if(!!linePK){
                        let keyFieldId = objFieldSublistPK?.fieldId||objFieldSublistUnique?.fieldId;
                        let objLineOrg_find = arrLineOrgRec.find(e => e[keyFieldId] == linePK);
                        if(!!objLineOrg_find){
                            objLineOrg_find._isMapped = "T";

                            curRec.selectLine(sublistId, objLineOrg_find.indexLine);

                            if(["itemfulfillment", "itemreceipt"].includes(_recType) && sublistId == "item"){
                                curRec.setCurrentSublistValue(sublistId, "itemreceive", true);
                            }
                        }
                        else{
                            curRec.selectNewLine(sublistId);
                            //continue;
                        }
                    }
                    else{
                        curRec.selectNewLine(sublistId);
                    }
                    
                    for(let j = 0; j < arrSubistField.length; j++){
                        let objSublistField = arrSubistField[j];

                        if(objSublistField.isInventoryDetail == "T") continue;

                        let value_field = objLineData[objSublistField.fieldId];

                        if(!lbf.isContainValue(value_field)) continue;

                        if([constValueType.Records.PK.ID/* , constValueType.Records.Unique.ID */].includes(objSublistField.valueType * 1)) continue;

                        value_field = value_field.toString().trim().toUpperCase() == NONE_Value ? "" : value_field;

                        if(typeof(value_field) == "string"){
                            value_field = value_field.trim();
                        }

                        if(objSublistField.valueType == constValueType.Records.Value.ID){
                            curRec.setCurrentSublistValue(sublistId, objSublistField.fieldId, value_field)
                        }
                        else if(objSublistField.valueType == constValueType.Records.Text.ID){
                            if(objSublistField.fieldId == "units"){
                                setUnitNameSublist(curRec, sublistId, objSublistField.fieldId, value_field);
                            }
                            else{
                                let internalid_value_field = getInternalIDFromDataSource(objSublistField, value_field);
                                if(!!internalid_value_field){
                                    curRec.setCurrentSublistValue(sublistId, objSublistField.fieldId, internalid_value_field)
                                }
                                else{
                                    try{
                                        curRec.setCurrentSublistText(sublistId, objSublistField.fieldId, value_field)
                                    }catch(err){
                                        curRec.setCurrentSublistValue(sublistId, objSublistField.fieldId + "_display", value_field)
                                    }
                                }
                            }
                        }
                        else{
                            value_field = constValueType.formatDataValueType(objSublistField.valueType, value_field);
                            curRec.setCurrentSublistValue(sublistId, objSublistField.fieldId, value_field);
                        }
                    }

                    if(!!objLineData?.inventoryDetail?.fieldId){
                        let invDetailFieldId = objLineData.inventoryDetail.fieldId;
                        let arrInvAss = objLineData.inventoryDetail.inventoryAssignment;
                        let arrSubistFieldInvDetail = arrSubistField.filter(e => e.isInventoryDetail == "T");
                        let assignmentSublistId = "inventoryassignment";

                        if(_recType == "inventorycount"){
                            assignmentSublistId = "inventorydetail";
                        }

                        let inventoryDetailRec = curRec.getCurrentSublistSubrecord(sublistId, invDetailFieldId);
                        
                        while(inventoryDetailRec.getLineCount(assignmentSublistId) > 0){
                            inventoryDetailRec.removeLine(assignmentSublistId, 0);
                        }
                        for(let idxAss = 0; idxAss < arrInvAss.length; idxAss++){
                            let objLineAssData = arrInvAss[idxAss];

                            inventoryDetailRec.selectNewLine(assignmentSublistId);

                            for(let j = 0; j < arrSubistFieldInvDetail.length; j++){
                                let objSublistField = arrSubistFieldInvDetail[j];
        
                                let value_field = objLineAssData[objSublistField.fieldId];
        
                                if(!lbf.isContainValue(value_field)) continue;

                                if([constValueType.Records.PK.ID/* , constValueType.Records.Unique.ID */].includes(objSublistField.valueType * 1)) continue;

                                value_field = value_field.toString().trim().toUpperCase() == NONE_Value ? "" : value_field;

                                if(typeof(value_field) == "string"){
                                    value_field = value_field.trim();
                                }
            
                                if(objSublistField.valueType == constValueType.Records.Value.ID){
                                    inventoryDetailRec.setCurrentSublistValue(assignmentSublistId, objSublistField.fieldId, value_field)
                                }
                                else if(objSublistField.valueType == constValueType.Records.Text.ID){
                                    let internalid_value_field = getInternalIDFromDataSource(objSublistField, value_field);
                                    if(!!internalid_value_field){
                                        inventoryDetailRec.setCurrentSublistValue(assignmentSublistId, objSublistField.fieldId, internalid_value_field)
                                    }
                                    else{
                                        try{
                                            inventoryDetailRec.setCurrentSublistText(assignmentSublistId, objSublistField.fieldId, value_field)
                                        }catch(err){
                                            inventoryDetailRec.setCurrentSublistValue(assignmentSublistId, objSublistField.fieldId + "_display", value_field)
                                        }
                                    }
                                }
                                else{
                                    value_field = constValueType.formatDataValueType(objSublistField.valueType, value_field);
                                    inventoryDetailRec.setCurrentSublistValue(assignmentSublistId, objSublistField.fieldId, value_field);
                                }
                            }

                            inventoryDetailRec.commitLine(assignmentSublistId);
                        }
                    }

                    curRec.commitLine(sublistId);
                }

                if(isTransform){
                    removeLineTransForm(curRec, sublistId, arrLineOrgRec);
                }
            }

            recId = curRec.save({enableSourcing: false, ignoreMandatoryFields: true});
            log.error("huy-import success", "ID: " + recId + ", Type: " + curRec.type);
            return recId;
        }

        const getDataLineOriginalOfSublist = (_curRec, _sublistId, _fields) =>{
            let arrResult = [];

            for(let i = 0; i < _curRec.getLineCount(_sublistId); i++){
                let objRes = {};
            
                objRes.indexLine = i;
                objRes._isMapped = "F";

                for(let j = 0; j < _fields.length; j++){
                    let fieldId = _fields[j];

                    objRes[fieldId] = _curRec.getSublistValue(_sublistId, fieldId, i);
                }

                arrResult.push(objRes);
            }
            return arrResult;
        }

        //Note: lưu ý trường hợp size >10mb
        const createFileJson = (nsFile, _arrResultRecord, _arrFieldTemplate, _recType) =>{
            let objResult = {
                recordType: _recType,
                arrFieldTemplate: _arrFieldTemplate,
                arrResultRecord: _arrResultRecord
            };

            let jsonFile = nsFile.create({
                name: lbf.uuidv4() + '.json',
                fileType: "JSON",
                contents: JSON.stringify(objResult),
                folder: constDataStore.getFolderIdByName(constDataStore.RECORDS.Folder.FileImport.NAME),
            });
            let jsonFileId = jsonFile.save();

            return jsonFileId;
        }

        const getContentsFileJson = (nsFile, _fileId) =>{
            let jsonFile = nsFile.load({id: _fileId});
            let contents = jsonFile.getContents();

            return JSON.parse(contents)
        }

        const transformFrom = (_importRecType, _objResRec, _objFieldTransForm) =>{
            if(!_objFieldTransForm) return null;

            
            let createdfromId = _objResRec[_objFieldTransForm.fieldId];
            if(!createdfromId) return null;

            let arrResCreatedFrom = query.runSuiteQL({
                query: `SELECT externalid, id
                from transaction
                where externalid = '${createdfromId}'`
            }).asMappedResults();
            if(arrResCreatedFrom.length > 0){
                createdfromId = arrResCreatedFrom[0].id;
            }

            let fromTransType = lbf.getTranRecordType(createdfromId);
            
            return {
                fromType: fromTransType,
                fromId: createdfromId,
                toType: _importRecType,
            };
        }

        const defaultValueTransForm = (_transFormRec) =>{
            
            let recType = _transFormRec.type;

            if(["itemfulfillment", "itemreceipt"].includes(recType)){
                let itemSublistId = "item";

                let sizeItemSublist = _transFormRec.getLineCount(itemSublistId);

                for(let i = 0; i < sizeItemSublist; i++){
                    _transFormRec.selectLine(itemSublistId, i);

                    _transFormRec.setCurrentSublistValue(itemSublistId, "itemreceive", false);

                    _transFormRec.commitLine(itemSublistId);
                }
            }
        }

        const removeLineTransForm = (_transFormRec, _sublistId, _arrLineOrgRec) =>{
            let arrLineNotYetMapped = _arrLineOrgRec.filter(e => e._isMapped == "F");

            if(arrLineNotYetMapped.length == 0) return;

            let infoSublist = _transFormRec.getSublist(_sublistId);
            if(["editor", "inlineeditor"].includes(infoSublist.type)){
                for(let i = arrLineNotYetMapped.length - 1; i >= 0; i--){
                    let objLineNotYetMapped = arrLineNotYetMapped[i];
                    
                    _transFormRec.removeLine({
                        sublistId: _sublistId, 
                        line: objLineNotYetMapped.indexLine, 
                        ignoreRecalc: true
                    });
                }
            }
        }

        //#region xử lý cho {units}
        const setUnitNameSublist = (_curRec, _sublistId, _fieldId, _unitName) =>{
            if(!_unitName) return;
            
            let unitId = "";

            let lstUnitTypeUom = getListDataUnitTypeUom();
            lstUnitTypeUom = lstUnitTypeUom.filter(e => e.unitname == _unitName);
            
            if(lstUnitTypeUom.length == 1){
                unitId = lstUnitTypeUom[0].internalid;
            }
            else{
                let unitslist = _curRec.getCurrentSublistValue(_sublistId, "unitslist");
                unitslist = !!unitslist ? unitslist.split("\u0005",",") : [];
                
                for(let i = 0; i < lstUnitTypeUom.length; i++){
                    let objUnitTypeUom = lstUnitTypeUom[i];

                    let idxUnitslist = unitslist.findIndex(_unitId => _unitId == objUnitTypeUom.internalid);
                    if(idxUnitslist > -1){
                        unitId = objUnitTypeUom.internalid;
                        break;
                    }
                }
            }
            
            if(unitId){
                _curRec.setCurrentSublistValue(_sublistId, _fieldId, unitId);
            }
        }

        const getListDataUnitTypeUom = () =>{
            if(arrUnitTypeUom.length > 0){
                return arrUnitTypeUom;
            }

            arrUnitTypeUom = constUnitsTypeUom.getDataSource();

            return arrUnitTypeUom;
        }
        //#endregion
        
        const getInternalIDFromDataSource = (_objField, _text)=>{
            if(!_objField.dataSource) return "";

            let dataSource = _objField.dataSource.toString().trim();

            let internalId = "";

            let arrResult = [];

            if(dataSource.startsWith("customsearch")){
                arrResult = Records.stores.customsearch[dataSource];
                if(!util.isArray(arrResult)){
                    arrResult = constSearch.getDataSource(dataSource);

                    Records.stores.customsearch[dataSource] = arrResult;
                }
            }
            else if(dataSource.startsWith("custdataset")){
                arrResult = Records.stores.custdataset[dataSource];
                if(!util.isArray(arrResult)){
                    let suiteQLResult = query.load({id: dataSource}).toSuiteQL();
                    arrResult = query.runSuiteQL({query: suiteQLResult}).asMappedResults();

                    Records.stores.custdataset[dataSource] = arrResult;
                }
            }
            else{
                let tempIdQuery = _objField.sublistId + "_" + _objField.fieldId;

                arrResult = Records.stores.query[tempIdQuery];
                if(!util.isArray(arrResult)){
                    arrResult = query.runSuiteQL({query: dataSource}).asMappedResults();

                    Records.stores.query[tempIdQuery] = arrResult;
                }
            }
            
            if(arrResult.length > 0){
                let objFirst = arrResult[0];

                let arrKey = Object.keys(objFirst);
                if(arrKey.length == 0) return "";

                for(let i = 0; i < arrKey.length; i++){
                    let keyId = arrKey[i];

                    let objRes_find = arrResult.find(e => e[keyId] == _text);
                    if(!objRes_find) continue;

                    internalId = objRes_find["internalid"]||objRes_find["internal_id"]||objRes_find["id"];
                    break;
                }
            }
            
            return internalId;
        }
        
        return {
            TYPE,
            Records,
            getDataSourceByCriteriaQuery,
            initLoadFieldByCriteriaQuery,
            getListFieldTemplateColumn,
            convertRawDataToRecordJson,
            importDataFromRecordJson,
            createFileJson,
            getContentsFileJson
        };
        
    });
    