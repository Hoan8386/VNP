/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  09 Sept 2026        Khanh Tran              Init, create file.  Chức năng tự động điền thông tin cho Lot Number Record from ms.Thủy(https://app.clickup.com/t/3773072/14yhnhmfdfg)
 */
define(['N/record', 'N/search', 'N/url', 'N/runtime', 'N/format',
    '../lib/scv_lib_function.js',
    '../cons/scv_cons_search.js',
], (
    record, search, url, runtime, format,
    lbf,
    constSearch,
) => {
    const addButtonFillLot = (scriptContext) => {
        let newRecord = scriptContext.newRecord;
        let recordType = newRecord.type;
        if (!['itemreceipt', 'inventoryadjustment'].includes(recordType)) return;
        if (scriptContext.type != 'view') return;

        let currentUser = runtime.getCurrentUser();
        let lkEntity = search.lookupFields({type: 'employee', id: currentUser.id, columns: ['custentity_scv_fill_info_ori_lot']});
        if (!lkEntity.custentity_scv_fill_info_ori_lot) return;

        let suiteletUrl = url.resolveScript({
            scriptId: 'customscript_scv_sl_tran2lot',
            deploymentId: 'customdeploy_scv_sl_tran2lot_svc',
            returnExternalUrl: false,
            params: {
                recordtype: recordType,
                recid: newRecord.id,
            }
        });

        scriptContext.form.addButton({
            id: 'custpage_btn_fill_info_ori_lot',
            label: 'Fill Info Ori Lot',
            functionName: "window.location.replace('" + suiteletUrl + "');",
        });
    };

    const checkAutoUpdateLot = (curRec) => {
        if (curRec.getValue({fieldId: 'custbody_scv_not_fill_info_ori_lot'})) return false;
        if (curRec.type == 'itemreceipt') {
            let createdFrom = curRec.getValue({fieldId: 'createdfrom'});
            let createdFromType = lbf.getTranRecordType(createdFrom);
            if (createdFromType != 'purchaseorder') return false;
        }

        return true;
    };

    const getDataItem = (filters) => {
        let resultSearch = constSearch.createSearchWithFilter({
            type: 'item',
            columns: [
                'internalid',
                'islotitem',
                'custitem_scv_nhasx',
                'custitem_scv_cty_phan_phoi',
                'custitem_scv_visa_number',
                'custitem_scv_giahan_visa',
                'custitem_scv_so_gpnk',
            ],
        }, filters);
        resultSearch = resultSearch.runPaged({pageSize: 1000});

        let arrResult = constSearch.fetchResultSearchAllPage(resultSearch, function(_objSearch, _column){
            return constSearch.getObjResultFromSearchByKey(_objSearch, _column, [
                'internalid',
                'islotitem',
                'custitem_scv_nhasx',
                'custitem_scv_cty_phan_phoi',
                'custitem_scv_visa_number',
                'custitem_scv_giahan_visa',
                'custitem_scv_so_gpnk',
            ]);
        });

        return arrResult;
    };

    const getDataInventoryNumber = (filters) => {
        let resultSearch = constSearch.createSearchWithFilter({
            type: 'inventorynumber',
            columns: ['internalid', 'item', 'inventorynumber', 'custitemnumber_scv_lot_not_auto_upd'],
        }, filters);
        resultSearch = resultSearch.runPaged({pageSize: 1000});

        let arrResult = constSearch.fetchResultSearchAllPage(resultSearch, function(_objSearch, _column){
            return constSearch.getObjResultFromSearchByKey(_objSearch, _column, [
                'internalid',
                'item',
                'inventorynumber',
                'custitemnumber_scv_lot_not_auto_upd'
            ]);
        });

        return arrResult;
    };

    const getDataLot = (params) => {
        let { curRec, sublistId, quantityField } = params;
        let arrData = [];

        let arrLines = [];
        let arrItemId = [];
        let lineCount = curRec.getLineCount({sublistId: sublistId});
        for (let i = 0; i < lineCount; i++) {
            if (curRec.getSublistValue({sublistId: sublistId, fieldId: quantityField, line: i}) <= 0) continue;
            if (!curRec.hasSublistSubrecord({sublistId: sublistId, fieldId: 'inventorydetail', line: i})) continue;

            let itemId = curRec.getSublistValue({sublistId: sublistId, fieldId: 'item', line: i});
            let productGroup = curRec.getSublistValue({sublistId: sublistId, fieldId: 'custcol_scv_product_group', line: i});

            let inventoryDetail = curRec.getSublistSubrecord({sublistId: sublistId, fieldId: 'inventorydetail', line: i});
            let assignmentCount = inventoryDetail.getLineCount({sublistId: 'inventoryassignment'});
            let arrLineLotNumber = [];
            for (let j = 0; j < assignmentCount; j++) {
                let lotNumber = inventoryDetail.getSublistValue({sublistId: 'inventoryassignment', fieldId: 'receiptinventorynumber', line: j});
                if (!lotNumber || arrLineLotNumber.includes(lotNumber)) continue;

                arrLines.push({
                    item: itemId,
                    lotnumber: lotNumber,
                    productgroup: productGroup,
                });

                arrLineLotNumber.push(lotNumber);

                if (!arrItemId.includes(itemId)) arrItemId.push(itemId);
            }
        }
        if (arrLines.length == 0) return arrData;

        let arrItem = getDataItem([
            search.createFilter({
                name: 'internalid', operator: 'anyof', values: arrItemId
            }),
        ]);

        let arrLots = getDataInventoryNumber([
            search.createFilter({
                name: 'item', operator: 'anyof', values: arrItemId
            }),
        ]);

        for (let objLine of arrLines) {
            let itemInfo = arrItem.find(e => e.internalid == objLine.item);
            if (!itemInfo || !itemInfo.islotitem) continue;

            let objLot = arrLots.find(e => e.item == objLine.item && e.inventorynumber == objLine.lotnumber);
            if (!objLot) continue;
            
            arrData.push({
                id: objLot.internalid,
                custitemnumber_scv_lot_not_auto_upd: objLot.custitemnumber_scv_lot_not_auto_upd,
                custitemnumber_scv_mfg_name: itemInfo.custitem_scv_nhasx || '',
                custitemnumber_scv_distribution_entity: itemInfo.custitem_scv_cty_phan_phoi || '',
                custitemnumber_scv_item: objLine.item,
                custitemnumber_scv_product_group: objLine.productgroup || '',
                custitemnumber_scv_visa: itemInfo.custitem_scv_visa_number || '',
                custitemnumber_scv_giahan_visa: itemInfo.custitem_scv_giahan_visa || '',
                custitemnumber_import_license: itemInfo.custitem_scv_so_gpnk || '',
            });
        }

        return arrData;
    };

    const updateLotNumber = (params, arrData) => {
        for (let objData of arrData) {
            if (objData.custitemnumber_scv_lot_not_auto_upd) continue;

            let values = {
                custitemnumber_scv_mfg_name: objData.custitemnumber_scv_mfg_name,
                custitemnumber_scv_distribution_entity: objData.custitemnumber_scv_distribution_entity,
                custitemnumber_scv_item: objData.custitemnumber_scv_item,
                custitemnumber_scv_product_group: objData.custitemnumber_scv_product_group,
                custitemnumber_scv_visa: objData.custitemnumber_scv_visa,
                custitemnumber_scv_giahan_visa: objData.custitemnumber_scv_giahan_visa,
                custitemnumber_import_license: objData.custitemnumber_import_license,
                custitemnumber_scv_last_modify: new Date(),
            };

            record.submitFields({
                type: 'inventorynumber',
                id: objData.id,
                values: values,
            });
        }
    };

    const fillInfoLot = (params) => {
        let curRec = record.load({type: params.recordtype, id: params.recid});
        if (params.isAuto === true) {
            if (!checkAutoUpdateLot(curRec)) return;
        }

        let arrData = [];
        switch (params.recordtype) {
            case 'itemreceipt':
                arrData = getDataLot({
                    curRec: curRec,
                    sublistId: 'item',
                    quantityField: 'quantity',
                });
                break;

            case 'inventoryadjustment':
                arrData = getDataLot({
                    curRec: curRec,
                    sublistId: 'inventory',
                    quantityField: 'adjustqtyby',
                });
                break;
        };

        if (arrData.length > 0) updateLotNumber(params, arrData);
    };

    return {
        addButtonFillLot,
        fillInfoLot,
        updateLotNumber,
    };
});
