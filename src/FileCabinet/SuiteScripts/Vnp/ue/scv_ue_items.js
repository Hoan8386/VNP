/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
/**
 * Nội dung: Chỉ sử dụng cho các Loại Item
 * * =======================================================================================
 *  Date                    Author                  Description
 *  22 Apr 2024			    Duy Nguyen				- Init, create script,task CPC1
 *  22 Apr 2024			    Duy Nguyen	            - Tạo Unit Type từ màn hình tạo Item (Chi màn Inventory, Lot Inventory), BA.Viet(https://app.clickup.com/t/86cv59xuy),
 *  23 Apr 2024			    Duy Nguyen	            - CPC1 - Sinh mã tự động Item, BA.Huy (https://app.clickup.com/t/86cv6kt8z)
 *  05 May 2024			    Duy Nguyen	            - Thêm usecase khi use edit thay đổi displayname, upccode is empty
 *  07 May 2024				Khanh Tran	            - Tự động tạo ngầm Unit Custom From ms. Hoa(https://app.clickup.com/t/86cv6qcbv)
 *  23 May 2024			    Duy Nguyen	            - Đổi displayname => custitem_scv_abb, skype Ba. HuyND
 *  23 May 2024			    Duy Nguyen	            - Thêm thông báo khi view, CPC1 - Chức năng set Sales Tax Code theo Purchase Tax Code, from BA. Huy(https://app.clickup.com/t/86cvfdf43)
 *  31 May 2024			    Duy Nguyen	            - Thêm logic khong update UPCCODE khi edit field display name chi update ItemId, from BA. Huy(https://app.clickup.com/t/86cvfdf43) (Skype)
 *  10 Jun 2024			    Duy Nguyen	            - Update Logic sinh Unit Type ngầm và tự đọng sinh số tự động, from Ms. Ngoc (Skype)
 *  23 Jun 2024			    Duy Nguyen	            - CPC1 - Make copy Item, from BA. Huy (https://app.clickup.com/t/86cvqnx8k)
 *  01 Jul 2024			    Duy Nguyen	            - Update clone lại Dơn vi Quy cách Item gốc, CPC1 - Make copy Item, from BA. Hoa (https://app.clickup.com/t/86cvqnx8k)
 *  11 Sep 2024			    Duy Nguyen	            - Default field trên màn hình Item, from BA. Thuy (https://app.clickup.com/t/86cwevjmt)
 *  15 Apr 2025             Thanh Ngo               - Default field custitem_scv_item_base_unit trên màn hình Item, from BA. Tam (https://app.clickup.com/t/86cwevjmt)
 */
define(['N/url', 'N/record', 'N/redirect', 'N/runtime', '../lib/scv_lib_function', 'N/search', 'N/query',
        '../lib/scv_lib_unitstype.js', 'N/ui/message', '../lib/scv_lib_logic_func.js', '../lib/scv_lib_item'],

    function(url, record, redirect, runtime, libFn, search, query,
     libUnitsType, message, logicFunc, libItem) {

        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        function beforeLoad(scriptContext) {
            try {
                beforeLoadMakeCopyItem(scriptContext);
                pageInitAlertPTCDiffSTC(scriptContext);
                // Step 1: Default Value
                beforeLoadDefaultValueItems(scriptContext);
                // Step 2 Run Show Unit Type
                beforeLoadShowWindowUnitsType(scriptContext);
            } catch (e) {
                log.error("Error beforeLoad: ", e);
            }
        }

        const beforeLoadMakeCopyItem = (scriptContext) => {
            try {
                const triggerType = scriptContext.type;
                const form = scriptContext.form;
                const request = scriptContext?.request;
                const newRecord = scriptContext.newRecord;
                const itemType = newRecord.type;
                if (itemType !== record.Type.LOT_NUMBERED_INVENTORY_ITEM && itemType !== record.Type.INVENTORY_ITEM) return;
                const params = request?.parameters || {};
                if (triggerType === 'view') {
                    const parentId = newRecord.getValue('custitem_scv_parent');
                    const blUT = newRecord.getValue('custitem_scv_ut');
                    // if (!parentId && !checkMark(blUT)) {
                    //     addBtnMakeCopyItem(form);
                    // }
                }
                if (triggerType === 'copy' && params?.e === 'T' && params?.cp === 'T' && params?.func === 'makecopyitem') {
                    initializeDataItemMakeCopy(newRecord, params.id);
                }
            } catch (e) {
                log.error('Error beforeLoadMakeCopyItem: ', e);
            }
        }

        const initializeDataItemMakeCopy = (curRec, oldItemId) => {
            const oldUpccode = curRec.getValue('upccode');
            const idPurTaxCode = curRec.getValue('purchasetaxcode');
            const idSaleTaxCode = curRec.getValue('salestaxcode');
            const objPurTaxCode = fetchDataTaxCode(idPurTaxCode);
            const utPurTaxCodeId = objPurTaxCode?.custrecord_scv_tax_ut || '';
            const objSaleTaxCode = fetchDataTaxCode(idSaleTaxCode);
            const utSaleTaxCodeId = objSaleTaxCode?.custrecord_scv_tax_ut || '';
            const newUpccode = getNewUPCItemUT(oldUpccode);
            const costingmethod = curRec.type === 'lotnumberedinventoryitem' ? 'FIFO' : curRec.getValue('costingmethod');//Lot Numbered
            const cogsaccount = 1148;//138992 TK Trung gian giá vốn
            const incomeaccount = 1147;//138991 TK Trung gian Doanh thu
            const assetaccount = 235;//158 Hàng hóa kho ủy thác
            let lkItSource = fetchDataInfoOldItem(oldItemId);
            let displayname = lkItSource.displayname;
            let salesdescription = lkItSource.salesdescription;
            let purchasedescription = lkItSource.purchasedescription;
            curRec.setValue('custitem_scv_dvt_vc', '');
            curRec.setValue('custitem_scv_dvt_vc_qd', '');
            libFn.setValueData(curRec,
                ['upccode', 'custitem_scv_parent', 'custitem_scv_ut', 'purchasetaxcode', 'salestaxcode', 'costingmethod', 'cogsaccount', 'incomeaccount', 'assetaccount', 'displayname', 'salesdescription', 'purchasedescription'],
                [newUpccode, oldItemId, true, utPurTaxCodeId, utSaleTaxCodeId, costingmethod, cogsaccount, incomeaccount, assetaccount, displayname, salesdescription, purchasedescription]);
        }

        const getNewUPCItemUT = (oldUpcCode) => {
            const preFixUPC = 'U';
            return preFixUPC + oldUpcCode;
        };

        const fetchDataInfoOldItem = (id) => {
            if (!id) return {unitstype: '', displayname: ''};
            let lkItSource = search.lookupFields({
                type: 'item',
                id: id,
                columns: ['unitstype', 'displayname', 'salesdescription', 'purchasedescription']
            })
            let unitstype = lkItSource.unitstype;
            return {
                unitstype: unitstype && unitstype.length > 0 ? unitstype[0].value : '',
                displayname: lkItSource.displayname,
                salesdescription: lkItSource.salesdescription || '',
                purchasedescription: lkItSource.purchasedescription || ''
            }
        };

        const fetchDataTaxCode = (id) => {
            let obj = {};
            if (!id) return obj;
            try {
                let searchTaxCode = search.lookupFields({
                    type: record.Type.SALES_TAX_ITEM,
                    id: id,
                    columns: [
                        'custrecord_scv_tax_ut'
                    ]
                });
                obj = {
                    custrecord_scv_tax_ut: searchTaxCode?.custrecord_scv_tax_ut?.[0]?.value || ''
                }
            } catch (e) {
                log.error('Error fetchDataTaxCode: ', e);
            }
            return obj;
        };


        const addBtnMakeCopyItem = (form) => {
            form.addButton({
                id: 'custpage_scv_btn_makecopyitem',
                label: 'Create Item UT',
                functionName: `require([], function(){window.location.replace(window.location.href + '&e=T&cp=T&func=makecopyitem');})`,
            });
        };


        const beforeLoadDefaultValueItems = (scriptContext) => {
            try {
                const triggerType = scriptContext.type;
                scriptContext.form.getField('displayname').isMandatory = true;
                const arrayEvents = ['create', 'copy'];
                if (arrayEvents.indexOf(triggerType) === -1) return;
                let newRecord = scriptContext.newRecord;
                // newRecord.setValue('itemid', 'To be generated');
                // scriptContext.form.getField('itemid').updateDisplayType({displayType: 'disabled'});
                // if (triggerType === 'create' && newRecord.type === record.Type.LOT_NUMBERED_INVENTORY_ITEM) {
                //     newRecord.setValue('custitem_scv_quota_purchase', ['1']);
                //     newRecord.setValue('custitem_scv_quota_sales', ['6']);
                // }
            } catch (e) {
                log.error("Error beforeLoadDefaultValueItems: ", e);
            }
        };

        const pageInitAlertPTCDiffSTC = (scriptContext) => {
            try {
                const triggerType = scriptContext.type;
                if (triggerType !== 'view') return;
                const form = scriptContext.form;
                const newRecord = scriptContext.newRecord;
                let isUT = newRecord.getValue('custitem_scv_ut');
                if (isUT === 'F' || isUT === false) return;
                let ptcValue = newRecord.getValue('purchasetaxcode');
                let stcValue = newRecord.getValue('salestaxcode');
                if (!ptcValue || !stcValue) return;
                if (ptcValue === stcValue) return;
                const messageInfo = 'Sales Tax Code đang khác Purchase Tax Code, người dùng kiểm tra lại thông tin';
                form.addPageInitMessage({type: message.Type.WARNING, message: messageInfo, duration: -1});
            } catch (e) {
                log.error("Error pageInitAlertPTCDiffSTC: ", e);
            }
        };

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {
            beforeSubmitGenerateItemCode(scriptContext);
            if (['create', 'edit', 'copy'].includes(scriptContext.type)) {
                libItem.updateItergration(scriptContext.newRecord);

                //thanhdev 15/4/2025
                beforeSubmitSetDefaultBaseUnit(scriptContext, scriptContext.newRecord);
                //---------------
            }
        }

        const beforeSubmitGenerateItemCode = (scriptContext) => {
            try {
                const trigerType = scriptContext.type;
                const eventCtrCode = ['create', 'edit'];
                // Stop if not create, edit, copy
                if (eventCtrCode.indexOf(trigerType) === -1) return;
                let newRecord = scriptContext.newRecord;
                const isGenItemCode = validItemTypeGenerateItemCode(newRecord.type);
                if (!isGenItemCode) return;
                const newDisplayName = newRecord.getValue('custitem_scv_abb');
                let itemid = '', uppcode = newRecord.getValue('upccode');
                if (typeof newDisplayName !== 'string' || newDisplayName.trim().length === 0) return;
                const options = getConfigGenItemCode(newRecord);
                // USE CASE 1: When import csv or create UI with upccode not Empty
                if (!!uppcode && trigerType === 'create') {
                    itemid = uppcode + options.delimiter + newDisplayName;
                }
                // USE CASE 2: When import csv or create UI with upccode Empty
                else if (trigerType === 'create') {
                    const resultAutoNumberItem = getElementRecordAutoNumberItem(options);
                    const maxNumber = resultAutoNumberItem.response.maxNumber;
                    const idRecItemNo = resultAutoNumberItem.response.idRecItemNo;
                    if (!resultAutoNumberItem.isSuccess) {
                        createRecordTrackAutoNumberItem({
                            prefix: options.prefix,
                            digit: options.digit,
                            maxNumber: maxNumber
                        });
                    } else {
                        updateAutoNumberItem({maxNumber: maxNumber, id: idRecItemNo});
                    }
                    uppcode = options.prefix + maxNumber.toString().padStart(options.digit, '0');
                    itemid = uppcode + options.delimiter + options.displayname;
                }
                // USE CASE 3: When edit
                else if (trigerType === 'edit') {
                    let oldRecord = scriptContext.oldRecord;
                    const oldDisplayName = oldRecord.getValue('custitem_scv_abb');
                    const oldUpccode = oldRecord.getValue('upccode');
                    uppcode = newRecord.getValue('upccode');
                    if (newDisplayName === oldDisplayName && uppcode === oldUpccode) return;
                    itemid = uppcode + options.delimiter + newDisplayName;
                }
                // Set Value Item Code
                newRecord.setValue('itemid', itemid);
                if (trigerType === 'create') newRecord.setValue('upccode', uppcode);

            } catch (e) {
                log.error("Error beforeSubmitGenerateItemCode: ", e);
            }
        }

        const validItemTypeGenerateItemCode = (itemType) => {
            return [
                record.Type.INVENTORY_ITEM,
                record.Type.LOT_NUMBERED_INVENTORY_ITEM,
                record.Type.SERVICE_ITEM,
                record.Type.NON_INVENTORY_ITEM,
                'servicepurchaseitem',
                'servicesaleitem',
                'serviceresaleitem'
            ].indexOf(itemType) !== -1;
        }

        const getConfigGenItemCode = (curRec) => {
            let result = {
                prefix: '',
                digit: 5,
                prefixNumber: 0,
                delimiter: '',
                suffix: '',
                displayname: ''
            };
            const displayname = curRec.getValue('custitem_scv_abb')?.trim();
            const noAccent = removeVietnameseTones(displayname);
            const prefix = noAccent.slice(0, 1).toUpperCase();

            result.displayname = displayname;
            result.isrun = 'T';
            result.recordType = curRec.type;
            result.prefix = prefix;
            result.digit = 5;
            result.delimiter = '_';
            result.prefixNumber = result.prefix.length;
            return result;
        };

        const removeVietnameseTones = (str) => {
            return str.normalize('NFD')
                .replace(/\p{Diacritic}/gu, '')
                .replace(/đ/g, 'd')
                .replace(/Đ/g, 'D');
        };

        const updateAutoNumberItem = (options) => {
            record.submitFields({
                type: 'customrecord_scv_item_no',
                id: options.id,
                values: {'custrecord_scv_itemno_current': options.maxNumber},
                options: {enableSourcing: false, ignoreMandatoryFields: true}
            });
        }

        const createRecordTrackAutoNumberItem = (options) => {
            const recItemNo = record.create({type: 'customrecord_scv_item_no',});
            const name = 'IT_'.concat(options.prefix);
            recItemNo.setValue('name', name);
            recItemNo.setValue('custrecord_scv_itemno_prefix', options.prefix);
            recItemNo.setValue('custrecord_scv_itemno_digit', options.digit);
            recItemNo.setValue('custrecord_scv_itemno_current', options.maxNumber);
            recItemNo.save({ignoreMandatoryFields: true});
        }

        const getElementRecordAutoNumberItem = (options) => {
            const prefix = options.prefix.toUpperCase();
            let results = {isSuccess: true, error: '', response: {maxNumber: 1, idRecItemNo: ''}};
            let searchObj = search.create({
                type: 'customrecord_scv_item_no',
                filters: [
                    search.createFilter({
                        name: 'custrecord_scv_itemno_prefix',
                        operator: 'is',
                        values: prefix
                    })
                ],
                columns: [
                    'name',
                    'custrecord_scv_itemno_prefix',
                    'custrecord_scv_itemno_digit',
                    'custrecord_scv_itemno_current'
                ]
            });
            let searchResults = searchObj.run().getRange(0, 1);
            if (searchResults.length) {
                results.response.maxNumber = (+searchResults[0].getValue('custrecord_scv_itemno_current') || 0) + 1;
                results.response.idRecItemNo = searchResults[0].id;
            } else {
                results.isSuccess = false;
                results.error = 'Not valid record Auto Number Item';
            }
            return results;
        }


        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        function afterSubmit(scriptContext) {
            try {
                afterSubmitMakeCopyItem(scriptContext);
                let newRecord = scriptContext.newRecord;
                log.error('Run afterSubmitCreateRecordUnitType');
                if ([record.Type.LOT_NUMBERED_INVENTORY_ITEM, record.Type.INVENTORY_ITEM].includes(newRecord.type)) {
                    log.error('Run afterSubmitCreateRecordUnitType');
                    afterSubmitCreateRecordUnitType(scriptContext);
                }
                afterSubmit_crtSpecUnit(scriptContext);
            } catch (e) {
                log.error("Error afterSubmit: ", e);
            }
        }

        const beforeSubmitSetDefaultBaseUnit = (scriptContext, newRecord) => {
            if(newRecord.id) {
                let newSearch = search.create({
                    type: 'customrecord_scv_specificaiton_unit',
                    filters: [
                        ['custrecord_scv_item_unit_base', 'is', true],
                        'AND',
                        ['custrecord_scv_item_specification', 'is', newRecord.id]
                    ],
                    columns: ['internalid', 'custrecord_scv_item_unit', 'custrecord_scv_item_unit_unitstype']
                }).run().getRange(0, 1);

                if(newSearch.length > 0) {
                    newRecord.setValue('custitem_scv_item_base_unit', newSearch[0]?.getValue('internalid'));
                }
            }
        }


        const afterSubmit_crtSpecUnit = (scriptContext) => {
            let triggerType = scriptContext.type;
            if (triggerType !== 'edit') return;
            let newRec = scriptContext.newRecord;
            let new_update_unit_custom = newRec.getValue('custitem_scv_update_unit_custom');
            if (!new_update_unit_custom) return;
            let oldRec = scriptContext.oldRecord;
            let old_update_unit_custom = oldRec.getValue('custitem_scv_update_unit_custom');
            if (old_update_unit_custom) return;
            let unitstype = newRec.getValue('unitstype');
            if (!unitstype) return;
            let arrSpecUnit = getObjTableQuery('customrecord_scv_specificaiton_unit', ['id', 'name'], `custrecord_scv_item_specification = ${newRec.id}`);
            if (arrSpecUnit.length > 0) return;
            libUnitsType.afterSubmit_editItem_crtSpecUnit(unitstype, newRec.id);
        };

        const afterSubmitMakeCopyItem = (scriptContext) => {
            try {
                const triggerType = scriptContext.type;
                const newRecord = scriptContext.newRecord;
                const itemType = newRecord.type;
                if (!isRunMakeCopyItemUT(newRecord, triggerType)) return;
                const itemOld = newRecord.getValue('custitem_scv_parent');
                record.submitFields({
                    type: libFn.getItemRecordType(itemOld),
                    id: itemOld,
                    values: {'custitem_scv_parent': newRecord.id},
                    options: {ignoreMandatoryFields: true}
                });
                const recid = newRecord.id;
                const lkItemOld = fetchDataInfoOldItem(itemOld);
                const unitsTypeIdOld = lkItemOld.unitstype;
                const resultsListLegalFile = getEleLegalFileAttachItem({itemId: itemOld});
                const resultsListPIC = getElePICAttachItem({itemId: itemOld});
                const resultsListTieuChiKiem  = getEleTieuChiKiemAttachItem({itemId: itemOld});
                const arrLegalFile = resultsListLegalFile.isSuccess ? resultsListLegalFile.response : [];
                const arrPic = resultsListPIC.isSuccess ? resultsListPIC.response : [];
                const arrTieuChiKiem = resultsListTieuChiKiem.isSuccess ? resultsListTieuChiKiem.response : [];
                const lenLegalFile = arrLegalFile.length;
                const lenPic = arrPic.length;
                const lenTieuChiKiem = arrTieuChiKiem.length;
                const lenData = lenLegalFile + lenPic + lenTieuChiKiem;
                const unitsTypeIdNew = copyRecUnitType(unitsTypeIdOld);
                updateUnitTypeInItem(itemType, recid, unitsTypeIdNew);
                makeCopyQuyCachDVTItemOld({
                    itemIdNew: recid,
                    itemIdOld: itemOld,
                    unitsTypeIdNew: unitsTypeIdNew,
                    unitsTypeIdOld: unitsTypeIdOld
                })
                const objUpd = {itemId: newRecord.id, arrLegalFile: arrLegalFile, arrPic: arrPic, arrTieuChiKiem : arrTieuChiKiem};
                if (lenData > 10) {
                    logicFunc.postServerNS('6', objUpd);
                } else {
                    logicFunc.afterMakeCopyItemUT(objUpd);
                }
            } catch (e) {
                log.error('Error afterSubmitMakeCopyItem: ', e);
            }
        }

        const isRunMakeCopyItemUT = (curRec, triggerType) => {
            const itemOld = curRec.getValue('custitem_scv_parent');
            const itemUT = curRec.getValue('custitem_scv_ut');
            const isItemUT = itemUT === true || itemUT === 'T';
            const isItemOld = !!itemOld;
            const isCreate = triggerType === 'create';
            const isTypeLotInvItem = curRec.type === record.Type.LOT_NUMBERED_INVENTORY_ITEM;
            return isItemOld && isCreate && isTypeLotInvItem && isItemUT;
        }

        const copyRecUnitType = (id) => {
            if (!id) return;
            let recUnitTypeCP = record.copy({
                type: record.Type.UNITS_TYPE,
                id: id,
                isDynamic: true
            });
            const oldName = recUnitTypeCP.getValue('name');
            const newName = getNewUPCItemUT(oldName);
            recUnitTypeCP.setValue('name', newName);
            return recUnitTypeCP.save();
        }

        const makeCopyQuyCachDVTItemOld = (options) => {
            const resultDVTQuyCachItemOld = getDataDVTItemOld(options.unitsTypeIdOld, options.itemIdOld);
            const arrDataDVTQuyCach = resultDVTQuyCachItemOld.isSuccess ? resultDVTQuyCachItemOld.response : [];
            const objMapUnitIdLine = getObjDataMapUnitIdLine(options.unitsTypeIdOld, options.unitsTypeIdNew);
            arrDataDVTQuyCach.forEach(obj => {
                const id = obj.id;
                let curQCDVT = record.copy({type: 'customrecord_scv_specificaiton_unit', id: id, isDynamic: true});
                const unitIdLineOLD = curQCDVT.getValue('custrecord_scv_item_unit');
                const unitIdLineNEW = objMapUnitIdLine[unitIdLineOLD];
                const originalId = options.unitsTypeIdNew + unitIdLineNEW;
                const nameUnitLine = curQCDVT.getText('custrecord_scv_item_unit');
                curQCDVT.setValue('name', nameUnitLine);
                curQCDVT.setValue('custrecord_scv_item_unit', unitIdLineNEW);
                curQCDVT.setValue('custrecord_scv_item_unit_unitstype', options.unitsTypeIdNew);
                curQCDVT.setValue('custrecord_scv_item_specification', options.itemIdNew);
                curQCDVT.setValue('custrecord_scv_item_unit_originalid', originalId);
                curQCDVT.save({enableSourcing: false, ignoreMandatoryFields: true});
            });
        }

        const getObjDataMapUnitIdLine = (unitsTypeIdOld, unitsTypeIdNew) => {
            const recUnitTypeOLD = record.load({type: record.Type.UNITS_TYPE, id: unitsTypeIdOld, isDynamic: true});
            const recUnitTypeNew = record.load({type: record.Type.UNITS_TYPE, id: unitsTypeIdNew, isDynamic: true});
            const sl = 'uom';
            const objMapUnitIdLine = {};
            const lc = recUnitTypeOLD.getLineCount(sl);
            for (let i = 0; i < lc; i++) {
                const idUnitOld = recUnitTypeOLD.getSublistValue(sl, 'internalid', i);
                objMapUnitIdLine[idUnitOld] = recUnitTypeNew.getSublistValue(sl, 'internalid', i);
            }
            return objMapUnitIdLine;
        }

        const getDataDVTItemOld = (unitTypeId, itemId) => {
            const sqlStr = `select id
                            from customrecord_scv_specificaiton_unit
                            where custrecord_scv_item_specification = '${itemId}'
                              and custrecord_scv_item_unit_unitstype = '${unitTypeId}'`;
            return libFn.callQuery(sqlStr);
        };

        const getEleLegalFileAttachItem = (options) => {
            let result = {isSuccess: true, response: [], error: ''};
            if (!options.itemId) return result;
            try {
                const LEGAL_FILE_TYPE = {ITEM: '1'};
                let filters = [];
                if (options.itemId) {
                    filters.push(search.createFilter({
                        name: 'custrecord_scv_legalfile_item',
                        operator: 'anyof',
                        values: options.itemId
                    }));
                }
                filters.push(search.createFilter({
                    name: 'custrecord_scv_legalfile_type',
                    operator: 'anyof',
                    values: LEGAL_FILE_TYPE.ITEM
                }));
                filters.push(search.createFilter({name: 'isinactive', operator: 'is', values: false}));
                let searchObj = search.create({
                    type: 'customrecord_scv_legal_file',
                    filters: filters,
                    columns: ['internalid']
                });
                let savedSearchList_1 = [];
                let pagedData = searchObj.runPaged({pageSize: 1000});
                for (let page in pagedData.pageRanges) {
                    let currentPage = pagedData.fetch(page);
                    currentPage.data.forEach(function (data) {
                        savedSearchList_1.push({
                            id: data.id.toString()
                        });
                    });
                }
                result.response = savedSearchList_1;
                result.isSuccess = true;

            } catch (e) {
                log.error('Error getEleLegalFileAttachItem: ', e);
            }
            return result;
        }

        const getElePICAttachItem = (options) => {
            let result = {isSuccess: true, response: [], error: ''};
            if (!options.itemId) return result;
            try {
                let filters = [];
                if (options.itemId) {
                    filters.push(search.createFilter({
                        name: 'custrecord_scv_pic_item',
                        operator: 'anyof',
                        values: options.itemId
                    }));
                }
                filters.push(search.createFilter({name: 'isinactive', operator: 'is', values: false}));
                let searchObj = search.create({
                    type: 'customrecord_scv_emp_in_charge',
                    filters: filters,
                    columns: ['internalid']
                });
                let savedSearchList_1 = [];
                let pagedData = searchObj.runPaged({pageSize: 1000});
                for (let page in pagedData.pageRanges) {
                    let currentPage = pagedData.fetch(page);
                    currentPage.data.forEach(function (data) {
                        savedSearchList_1.push({
                            id: data.id.toString()
                        });
                    });
                }
                result.response = savedSearchList_1;
                result.isSuccess = true;

            } catch (e) {
                log.error('Error getElePICAttachItem: ', e);
            }
            return result;
        };

        const getEleTieuChiKiemAttachItem = (options) => {
            let result = {isSuccess: true, response: [], error: ''};
            if (!options.itemId) return result;
            try {
                let filters = [];
                if (options.itemId) {
                    filters.push(search.createFilter({
                        name: 'custrecord_scv_iip_item',
                        operator: 'anyof',
                        values: options.itemId
                    }));
                }
                filters.push(search.createFilter({name: 'isinactive', operator: 'is', values: false}));
                let searchObj = search.create({
                    type: 'customrecord_scv_iteminspectplan',
                    filters: filters,
                    columns: ['internalid']
                });
                let savedSearchList_1 = [];
                let pagedData = searchObj.runPaged({pageSize: 1000});
                for (let page in pagedData.pageRanges) {
                    let currentPage = pagedData.fetch(page);
                    currentPage.data.forEach(function (data) {
                        savedSearchList_1.push({
                            id: data.id.toString()
                        });
                    });
                }
                result.response = savedSearchList_1;
                result.isSuccess = true;

            } catch (e) {
                log.error('Error getEleTieuChiKiemAttachItem: ', e);
            }
            return result;
        };

        const beforeLoadShowWindowUnitsType = (scriptContext) => {
            try {
                const triggerType = scriptContext.type;
                if (triggerType !== 'view') return;
                let newRecord = scriptContext.newRecord;
                if (!checkShowWindowUnitType(newRecord.type)) return;
                let form = scriptContext.form;
                let request = scriptContext.request;
                let objParams = request?.parameters || {};
                if (objParams?.showUnitTypeId) {
                    const idUnitType = objParams?.showUnitTypeId;
                    const urlLinkUnitType = url.resolveRecord({
                        recordType: record.Type.UNITS_TYPE,
                        recordId: idUnitType,
                        isEditMode: true,
                        params: {}
                    });
                    form.addField({
                        id: "custpage_scv_inline_showunittype",
                        type: "INLINEHTML",
                        label: "Script"
                    }).updateLayoutType({
                        layoutType: "OUTSIDEBELOW"
                    })
                        .defaultValue = getScriptShowUnitType({
                        link: urlLinkUnitType,
                        itemid: newRecord.id
                    });
                }
            } catch (e) {
                log.error("Error beforeLoadShowWindowUnitsType: ", e);
            }
        }

        const checkShowWindowUnitType = (itemType) => {
            return [
                record.Type.INVENTORY_ITEM,
                record.Type.LOT_NUMBERED_INVENTORY_ITEM
            ].indexOf(itemType) !== -1
        }

        /**
         * Get Script Show Unit Type
         * @param objParams
         * @returns {string}
         */
        function getScriptShowUnitType(objParams) {
            return `<script>
            var showUnitType = window.localStorage.getItem("showUnitType_${objParams.itemid}");
            if (showUnitType !== 'F') {
                nlOpenWindow('${objParams.link}', 'Unit Type');
                window.localStorage.setItem("showUnitType_${objParams.itemid}", 'F');
            } 
        </script>`;
        }

        const afterSubmitCreateRecordUnitType = (scriptContext) => {
            let triggerType = scriptContext.type;
            const runOnUI = executeContextOnUI();
            if (triggerType !== 'create') return;
            let newRecord = scriptContext.newRecord;
            if (isRunMakeCopyItemUT(newRecord, triggerType)) return;
            const upccode = newRecord.getValue('upccode');
            // const unitstype = newRecord.getValue('unitstype');
            // const runCtrUnitType = !ifNull(upccode) && ifNull(unitstype);
            const runCtrUnitType = !ifNull(upccode)
            if (runCtrUnitType) {
                const recid = newRecord.id;
                const rectype = newRecord.type;
                const resultsUnitType = createRecordUnitType(upccode);
                const idUnitType = resultsUnitType.idUnitType;
                updateAndCreateQTDVT(idUnitType, rectype, recid);
                if (runOnUI) {
                    redirect.toRecord({
                        type: rectype,
                        id: recid,
                        isEditMode: false,
                        parameters: {showUnitTypeId: idUnitType}
                    });
                }
            }

        }

        const updateAndCreateQTDVT = (idUnitType, rectype, recid) => {
            if (idUnitType) {
                updateUnitTypeInItem(rectype, recid, idUnitType);
                libUnitsType.afterSubmit_crtSpecUnit(idUnitType);
            }
        };

        const executeContextOnUI = () => runtime.executionContext === runtime.ContextType.USER_INTERFACE;

        const updateUnitTypeInItem = (rectype, recid, idUnitType) => {
            record.submitFields({
                type: rectype,
                id: recid,
                values: {unitstype: idUnitType},
                options: {enableSourcing: false, ignoreMandatoryFields: true}
            });
        };

        const createRecordUnitType = (upccode) => {
            let results = {isSuccess: true, error: '', idUnitType: ''};
            try {
                const recUnitType = record.create({type: record.Type.UNITS_TYPE, isDynamic: true});
                recUnitType.setValue('name', upccode);
                recUnitType.selectNewLine('uom');
                libFn.setCurrentSublistValueData(recUnitType, 'uom', ['abbreviation', 'baseunit', 'conversionrate', 'pluralabbreviation', 'pluralname', 'unitname'], [upccode, true, 1, upccode, upccode, upccode]);
                recUnitType.commitLine('uom');
                results.idUnitType = recUnitType.save({enableSourcing: false, ignoreMandatoryFields: true});
            } catch (e) {
                results.isSuccess = false;
                results.error = e;
                log.error("Error createRecordUnitType: ", e);
            }
            return results;
        }

        const getObjTableQuery = (_table, _arrColumns, _condition) => {
            let sql = `SELECT ` + _arrColumns.join(',') + ` 
                FROM ` + _table + `
                WHERE ` + _condition;
            let resultSearch = query.runSuiteQL({
                query: sql
            });
            resultSearch = resultSearch.asMappedResults();
            return resultSearch.length > 0 ? resultSearch : [];
        };

        const ifNull = (val) => val === null || val === '';

        const checkMark = (val) => val === 'T' || val === true

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        }

    });
