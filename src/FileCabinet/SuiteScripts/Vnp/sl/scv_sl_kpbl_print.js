/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
        'N/render', 'N/search', 'N/record', 'N/query', 'N/config',
        '../lib/scv_lib_pdf.js', '../olib/lodash.min', '../lib/scv_lib_function',
        'N/runtime', '../lib/scv_lib_amount_in_word',
    ],
    (
        render, search, record, query, config,
        libPdf, _, lfunc, runtime, libAmount
    ) => {
        // /**
        //  * Defines the Suitelet script trigger point.
        //  * @param {Object} scriptContext
        //  * @param {ServerRequest} scriptContext.request - Incoming request
        //  * @param {ServerResponse} scriptContext.response - Suitelet response
        //  * @since 2015.2
        //  */

        const renderRecordToPdfWithTemplate = (id, type, printfile) => {
            if (!printfile) throw "Chưa có setup file xml!";
            let renderer = libPdf.renderTemplateWithXml(printfile);
            let rec = addDefaultRecordRender(renderer, type, id);
            printKPBL(rec, renderer, id);
            return renderer.renderAsPdf();
        }

        const printKPBL = (rec, renderer, id) => {
            let dataJson = getDataKPBL(rec);

            renderer.addCustomDataSource({
                format: render.DataSource.OBJECT,
                alias: "dataJson",
                data: dataJson
            })
        }

        const getDataKPBL = (rec) => {
            let subsidiaryInfo = getSubsidiaryInfo(rec.getValue({fieldId: 'subsidiary'}));
            let customerInfo = getCustomerInfo(rec.getValue({fieldId: 'entity'}));
            let tranDateVal = rec.getValue({fieldId: 'trandate'});
            let tranday = tranDateVal ? tranDateVal.getDate() : '';
            let tranmonth = tranDateVal ? (tranDateVal.getMonth() + 1) : '';
            let tranyear = tranDateVal ? tranDateVal.getFullYear() : '';

            return {
                legalname: subsidiaryInfo.legalname,
                mainaddress_text: subsidiaryInfo.mainaddress_text,
                trandate: rec.getText({fieldId: 'trandate'}) || rec.getValue({fieldId: 'trandate'}) || '',
                tranday: tranday,
                tranmonth: tranmonth,
                tranyear: tranyear,
                tranid: rec.getValue({fieldId: 'tranid'}) || '',
                receiver: rec.getValue({fieldId: 'custbody_scv_receiver'}) || '',
                customerLegalName: customerInfo.legalName,
                entityLegalName: customerInfo.legalName,
                shipaddress: rec.getValue({fieldId: 'shipaddress'}) || '',
                memo: rec.getValue({fieldId: 'memo'}) || '',
                lines: getLineDataKPBL(rec),
                totalAmountText: '',
                attachmentText: ''
            };
        }

        const getSubsidiaryInfo = (subsidiaryId) => {
            if (!subsidiaryId) return {legalname: '', mainaddress_text: ''};

            let results = query.runSuiteQL({
                query: `
                    select s.legalname, BUILTIN.DF(s.mainaddress) as mainaddress_text
                    from subsidiary s
                    where s.id = ?
                `,
                params: [subsidiaryId]
            }).asMappedResults();

            return {
                legalname: results[0]?.legalname || '',
                mainaddress_text: results[0]?.mainaddress_text || ''
            };
        }

        const getCustomerInfo = (entityId) => {
            if (!entityId) return {legalName: ''};

            try {
                let fields = search.lookupFields({
                    type: search.Type.CUSTOMER,
                    id: entityId,
                    columns: ['custentity_scv_legal_name']
                });

                return {legalName: getLookupValue(fields.custentity_scv_legal_name)};
            } catch (e) {
                return {legalName: ''};
            }
        }

        const getLineDataKPBL = (rec) => {
            let lineData = [];
            let itemInfoById = {};
            let lineCount = rec.getLineCount({sublistId: 'item'});
            let stt = 1;

            for (let i = 0; i < lineCount; i++) {
                let itemId = rec.getSublistValue({sublistId: 'item', fieldId: 'item', line: i});
                let itemInfo = getItemInfo(itemId, itemInfoById);
                let baseLine = {
                    description: rec.getSublistValue({sublistId: 'item', fieldId: 'description', line: i}) || '',
                    quyCachDongGoi: itemInfo.quyCachDongGoi,
                    nhaSanXuat: itemInfo.nhaSanXuat,
                    unitsdisplay: rec.getSublistValue({sublistId: 'item', fieldId: 'unitsdisplay', line: i}) || '',
                    quantity: rec.getSublistValue({sublistId: 'item', fieldId: 'quantity', line: i}) || '',
                    donGia: '',
                    thanhTien: ''
                };
                let inventoryAssignments = getInventoryAssignments(rec, i);

                if (inventoryAssignments.length === 0) {
                    let qty = baseLine.quantity;
                    lineData.push(Object.assign({}, baseLine, {
                        stt: stt++,
                        soLo: '',
                        quantity: libPdf.formatNumber(qty || 0),
                        thucXuat: libPdf.formatNumber(qty || 0)
                    }));
                    continue;
                }

                inventoryAssignments.forEach((assignment) => {
                    lineData.push(Object.assign({}, baseLine, {
                        stt: stt++,
                        soLo: assignment.inventoryNumber,
                        quantity: libPdf.formatNumber(assignment.quantity || 0),
                        thucXuat: libPdf.formatNumber(assignment.quantity || 0)
                    }));
                });
            }

            return lineData;
        }

        const getItemInfo = (itemId, itemInfoById) => {
            if (!itemId) return {quyCachDongGoi: '', nhaSanXuat: ''};
            if (itemInfoById[itemId]) return itemInfoById[itemId];

            try {
                let results = query.runSuiteQL({
                    query: `
                        select
                            i.custitem_scv_quy_cach_dong_goi as quy_cach_dong_goi,
                            BUILTIN.DF(i.custitem_scv_quy_cach_dong_goi) as quy_cach_dong_goi_text,
                            i.custitem_scv_nhasx as nha_san_xuat,
                            BUILTIN.DF(i.custitem_scv_nhasx) as nha_san_xuat_text
                        from item i
                        where i.id = ?
                    `,
                    params: [itemId]
                }).asMappedResults();
                let itemData = results[0] || {};

                itemInfoById[itemId] = {
                    quyCachDongGoi: itemData.quy_cach_dong_goi_text || itemData.quy_cach_dong_goi || '',
                    nhaSanXuat: itemData.nha_san_xuat_text || itemData.nha_san_xuat || ''
                };
            } catch (e) {
                itemInfoById[itemId] = {quyCachDongGoi: '', nhaSanXuat: ''};
            }

            return itemInfoById[itemId];
        }

        const getInventoryAssignments = (rec, line) => {
            let assignments = [];

            try {
                let inventoryDetail = rec.getSublistSubrecord({
                    sublistId: 'item',
                    fieldId: 'inventorydetail',
                    line: line
                });
                let assignmentCount = inventoryDetail.getLineCount({sublistId: 'inventoryassignment'});

                for (let i = 0; i < assignmentCount; i++) {
                    assignments.push({
                        inventoryNumber: inventoryDetail.getSublistText({
                            sublistId: 'inventoryassignment',
                            fieldId: 'issueinventorynumber',
                            line: i
                        }) || inventoryDetail.getSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'issueinventorynumber',
                            line: i
                        }) || '',
                        quantity: inventoryDetail.getSublistValue({
                            sublistId: 'inventoryassignment',
                            fieldId: 'quantity',
                            line: i
                        }) || ''
                    });
                }
            } catch (e) {
                return assignments;
            }

            return assignments;
        }

        const getLookupValue = (value) => {
            if (Array.isArray(value)) return value.map((item) => item.text || item.value || '').join(', ');
            return value || '';
        }

        const addDefaultRecordRender = (renderer, type, id) => {
            let rec = record.load({
                type: type,
                id: id,
                isDynamic: false
            });
            renderer.addRecord('record', rec);
            return rec;
        }

        const onRequest = (scriptContext) => {
            let request = scriptContext.request;
            let response = scriptContext.response;
            let params = request.parameters;

            let pdfFile = renderRecordToPdfWithTemplate(params.recid, params.rectype, params.printfile);
            response.writeFile(pdfFile, true);

        }

        return {
            onRequest,
            renderRecordToPdfWithTemplate
        }

    }
);
