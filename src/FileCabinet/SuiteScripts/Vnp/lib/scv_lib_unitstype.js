/**
 * Nội dung: Chỉ sử dụng cho màn hình Units Type
 * * =======================================================================================
 *  Date                    Author                  Description
 *  06 May 2024           	Khanh Tran				- Init, create script. Tự động tạo ngầm Unit Custom From ms. Hoa(https://app.clickup.com/t/86cv6qcbv)
 */
define(['N/query', '../lib/scv_lib_function.js', 'N/record'],
function (query, lbf, record) {
    const getObjTableQuery = (_table, _arrColumns, _condition) => {
        var sql = `SELECT ` + _arrColumns.join(',') + ` 
            FROM ` + _table + `
            WHERE ` + _condition;
        var resultSearch = query.runSuiteQL({
            query: sql
        });
        resultSearch = resultSearch.asMappedResults();

        return resultSearch.length > 0 ? resultSearch : [];
    }
    const getRecSpecUnitByOriId = (arrData, recId) => {
        let arrOriId = [];
        arrData.forEach(obj => arrOriId.push(recId.toString() + obj.unitId));
        if(arrOriId.length < 0) return; 
        let arrSpecUnit = getObjTableQuery('customrecord_scv_specificaiton_unit', ['id', 'custrecord_scv_item_unit'], 
        `custrecord_scv_item_unit_unitstype = ${recId} and custrecord_scv_item_unit_originalid in (${arrOriId.join(',')})`);
        return arrSpecUnit;
    }
    const onDelSpecUnit = (arrDel, recId) => {
        let arrSpecUnit = getRecSpecUnitByOriId(arrDel, recId);
        arrSpecUnit.forEach(obj => {
            record.delete({type: 'customrecord_scv_specificaiton_unit', id: obj.id});
        })
    }
    const resolveItemIdForUnitsType = (recId) => {
        let objSpecUnit = getObjTableQuery('customrecord_scv_specificaiton_unit', ['custrecord_scv_item_specification'],
            `custrecord_scv_item_unit_unitstype = ${recId} and custrecord_scv_item_specification is not null`)[0];
        if(objSpecUnit && objSpecUnit.custrecord_scv_item_specification) return objSpecUnit.custrecord_scv_item_specification;
        let objItem = getObjTableQuery('item', ['id', 'displayname'], `unitstype = ${recId}`)[0];
        return objItem ? objItem.id : '';
    }

    const activateItemIfInactive = (itemId) => {
        if (!itemId) return false;
        try {
            let recordType = lbf.getItemRecordType(itemId);
            if (!recordType) return false;
            let lkItem = lbf.lookFields(recordType, itemId, ['isinactive']);
            let isInactive = lkItem?.isinactive === true || lkItem?.isinactive === 'T';
            if (!isInactive) return false;
            record.submitFields({
                type: recordType,
                id: itemId,
                values: {isinactive: false},
                options: {enableSourcing: false, ignoreMandatoryFields: true}
            });
            return true;
        } catch (e) {
            log.error('Error activateItemIfInactive: ', e);
            return false;
        }
    }

    const deactivateItem = (itemId) => {
        if (!itemId) return;
        try {
            let recordType = lbf.getItemRecordType(itemId);
            if (!recordType) return;
            record.submitFields({
                type: recordType,
                id: itemId,
                values: {isinactive: true},
                options: {enableSourcing: false, ignoreMandatoryFields: true}
            });
        } catch (e) {
            log.error('Error deactivateItem: ', e);
        }
    }

    const onCrtSpecUnit = (params) => {
        let objData = params.objData;
        let recId = params.recId;
        let specUnitRec = record.create({type: 'customrecord_scv_specificaiton_unit', isDynamic: true});
        lbf.setValueData(specUnitRec, [
            'name', 'custrecord_scv_item_unit', 'custrecord_scv_item_unit_unitstype',
            'custrecord_scv_item_unit_convert_qty', 'custrecord_scv_item_unit_base', 'custrecord_scv_item_unit_originalid'
        ], [
            objData.unitname, objData.unitId, recId,
            objData.conversionrate, objData.baseunit, recId + objData.unitId || ''
        ]);
        if(params.itemId){
            specUnitRec.setValue('custrecord_scv_item_specification', params.itemId);
        }
        let specUnitRec_id = specUnitRec.save(); log.error('specUnitRec_id', specUnitRec_id);
        return;
    }

    const afterSubmit_crtSpecUnit = (recId) => {
        let unitRec = record.load({type: 'unitstype', id: recId});
        let arrSL = getDataSL(unitRec);
        if(arrSL.length === 0) return;
        let itemId = resolveItemIdForUnitsType(recId);
        if(itemId) activateItemIfInactive(itemId);
        try {
            arrSL.forEach(obj => onCrtSpecUnit({objData: obj, recId, itemId}));
        } finally {
            if(itemId) deactivateItem(itemId);
        }
    }

    const afterSubmit_editItem_crtSpecUnit = (recId, itemId) => {
        let unitRec = record.load({type: 'unitstype', id: recId});
        let arrSL = getDataSL(unitRec);
        if(arrSL.length === 0) return;
        let wasActivated = itemId ? activateItemIfInactive(itemId) : false;
        try {
            arrSL.forEach(obj => onCrtSpecUnit({objData: obj, recId, itemId}));
        } finally {
            if(wasActivated) deactivateItem(itemId);
        }
    }

    const getDataSL = (rec) => {
        let arrSL = [];
        let sl = 'uom';
        for(let i = 0; i < rec.getLineCount(sl); i++){
            arrSL.push({
                abbreviation: rec.getSublistValue(sl, 'abbreviation', i),
                baseunit: rec.getSublistValue(sl, 'baseunit', i),
                conversionrate: rec.getSublistValue(sl, 'conversionrate', i),
                unitId: rec.getSublistValue(sl, 'internalid', i) || '',
                inuse: rec.getSublistValue(sl, 'inuse', i),
                pluralabbreviation: rec.getSublistValue(sl, 'pluralabbreviation', i),
                pluralname: rec.getSublistValue(sl, 'pluralname', i),
                unitname: rec.getSublistValue(sl, 'unitname', i),
            })
        }
        return arrSL
    }
    const onUpdSpecUnit = (arrUpd, recId) => {
        let arrSpecUnit = getRecSpecUnitByOriId(arrUpd, recId);
        arrUpd.forEach(obj => {
            obj.unitId == arrSpecUnit.custrecord_scv_item_unit
        })
        arrSpecUnit.forEach(obj => {
            let objUpd = arrUpd.find(e => e.unitId == obj.custrecord_scv_item_unit);
            if(objUpd && objUpd.unitId){
                record.submitFields({
                    type: 'customrecord_scv_specificaiton_unit',
                    id: obj.id,
                    values: objUpd,
                });
            }
        })
    }
    const afterSubmit_CRUD = (scriptContext) => {
        let newRec = scriptContext.newRecord;
        let unitRec = record.load({type: 'unitstype', id: newRec.id});
        let arrSLNew = getDataSL(unitRec);
        let arrSLOld = getDataSL(scriptContext.oldRecord);
        let arrCrt = [];
        let arrDel = [];
        let arrUpd = [];
        arrSLNew.forEach(obj => {
            let unitId = arrSLOld.find(e => e.unitId == obj.unitId)?.unitId;
            if(!unitId) arrCrt.push(obj);
        })
        arrSLOld.forEach(obj => {
            let unitId = arrSLNew.find(e => e.unitId == obj.unitId)?.unitId;
            if(!unitId) arrDel.push(obj);
        })
        arrSLNew.forEach(objCur => {
            if(!objCur.unitId) return;
            let objOld = arrSLOld.find(e => e.unitId == objCur.unitId);
            if(objOld && objOld.unitId){
                let obj = {}
                if(objOld.unitname != objCur.unitname) obj.name = objCur.unitname;
                if(objOld.conversionrate != objCur.conversionrate) obj.custrecord_scv_item_unit_convert_qty = objCur.conversionrate;
                if(objOld.baseunit != objCur.baseunit) obj.custrecord_scv_item_unit_base = objCur.baseunit;
                if(Object.keys(obj).length > 0){
                    obj.unitId = objCur.unitId;
                    arrUpd.push(obj)
                }
            }
        })
        if(arrCrt.length > 0) {
            let itemId = resolveItemIdForUnitsType(newRec.id);
            let wasActivated = itemId ? activateItemIfInactive(itemId) : false;
            try {
                arrCrt.forEach(obj => onCrtSpecUnit({objData: obj, recId: newRec.id, itemId}));
            } finally {
                if(wasActivated) deactivateItem(itemId);
            }
        }
        if(arrDel.length > 0) onDelSpecUnit(arrDel, newRec.id)
        if(arrUpd.length > 0) onUpdSpecUnit(arrUpd,  newRec.id)
    }
    const addLineUnitType = (scriptContext) => {
        let newRec = scriptContext.newRecord;
        let objData = getDataSpecUnit(newRec);
        if(!objData.name) return;
        if(!objData.item_specification) return;
        if(!objData.unitstype) return;
        if(!objData.convert_qty) return;
        if(objData.item_unit) return;
        if(objData.originalid) return;
        let unitRec = record.load({type: 'unitstype', id: objData.unitstype, isDynamic: true});
        let sl = 'uom';
        let lc = unitRec.getLineCount(sl);
        let arrSLOld = [];
        for(let i = 0; i < lc; i++){
            let lineId = unitRec.getSublistValue(sl, 'internalid', i);
            arrSLOld.push(lineId);
        }
        unitRec.selectNewLine({sublistId: sl, line: lc});
        unitRec.setCurrentSublistValue({sublistId: sl, fieldId: 'unitname', value: objData.name});
        unitRec.setCurrentSublistValue({sublistId: sl, fieldId: 'pluralname', value: objData.name});
        unitRec.setCurrentSublistValue({sublistId: sl, fieldId: 'pluralabbreviation', value: objData.name});
        unitRec.setCurrentSublistValue({sublistId: sl, fieldId: 'abbreviation', value: objData.name});
        unitRec.setCurrentSublistValue({sublistId: sl, fieldId: 'conversionrate', value: objData.convert_qty});
        unitRec.commitLine({sublistId: sl});
        unitRec.save();
        unitRec = record.load({type: 'unitstype', id: objData.unitstype, isDynamic: true});
        lc = unitRec.getLineCount(sl);
        let newLineId = '';
        for(let i = 0; i < lc; i++){
            let lineId = unitRec.getSublistValue(sl, 'internalid', i);
            if(!arrSLOld.includes(lineId)){
                newLineId = lineId;
                break;
            }
        }
        if(newLineId){
            newRec.setValue('custrecord_scv_item_unit', newLineId);
            newRec.setValue('custrecord_scv_item_unit_originalid', objData.unitstype + newLineId);
        }
    }
    const getDataSpecUnit = (newRec) => {
        return {
            name: newRec.getValue('name'),
            item_specification: newRec.getValue('custrecord_scv_item_specification'),
            unitstype: newRec.getValue('custrecord_scv_item_unit_unitstype'),
            convert_qty: newRec.getValue('custrecord_scv_item_unit_convert_qty'),
            unit_base: newRec.getValue('custrecord_scv_item_unit_base'),
            item_unit: newRec.getValue('custrecord_scv_item_unit'),
            originalid: newRec.getValue('custrecord_scv_item_unit_originalid'),
        }
    }
    const getDataUpd = (newRec_data, scriptContext) => {
        let result = {};
        let oldRec = scriptContext.oldRecord;
        let oldRec_data = getDataSpecUnit(oldRec);
        if(newRec_data.name !== oldRec_data.name) result.name = newRec_data.name;
        if(newRec_data.convert_qty !== oldRec_data.convert_qty) result.convert_qty = newRec_data.convert_qty;
        if(Object.keys(result).length > 0){
            result.originalid = newRec_data.originalid;
            result.unitstype = newRec_data.unitstype;
        }
        return result;
    }
    const updLineUnitType = (scriptContext) => {
        let newRec = scriptContext.newRecord;
        let newRec_data = getDataSpecUnit(newRec);
        if(!newRec_data.unitstype) return;
        if(!newRec_data.convert_qty) return;
        if(!newRec_data.originalid) return;
        let objData = getDataUpd(newRec_data, scriptContext);
        if(Object.keys(objData).length == 0) return;
        let unitRec = record.load({type: 'unitstype', id: objData.unitstype, isDynamic: true});
        let sl = 'uom';
        let lc = unitRec.getLineCount(sl);
        for(let i = 0; i < lc; i++){
            let lineId = unitRec.getSublistValue(sl, 'internalid', i);
            let originalid = objData.unitstype + lineId;
            if(originalid !== objData.originalid) continue;
            unitRec.selectLine({sublistId: sl, line: i});
            unitRec.setCurrentSublistValue({sublistId: sl, fieldId: 'unitname', value: objData.name});
            unitRec.setCurrentSublistValue({sublistId: sl, fieldId: 'pluralname', value: objData.name});
            unitRec.setCurrentSublistValue({sublistId: sl, fieldId: 'pluralabbreviation', value: objData.name});
            unitRec.setCurrentSublistValue({sublistId: sl, fieldId: 'abbreviation', value: objData.name});
            unitRec.setCurrentSublistValue({sublistId: sl, fieldId: 'conversionrate', value: objData.convert_qty});
            unitRec.commitLine({sublistId: sl});
            unitRec.save();
            return;
        }
    }
    return {
		afterSubmit_crtSpecUnit,
		afterSubmit_editItem_crtSpecUnit,
        afterSubmit_CRUD,
        addLineUnitType,
        updLineUnitType
    };
    
});
