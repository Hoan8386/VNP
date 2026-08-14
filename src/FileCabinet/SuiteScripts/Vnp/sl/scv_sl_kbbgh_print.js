/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
        'N/render', 'N/search', 'N/record', 'N/query',
        '../lib/scv_lib_pdf.js'
    ],
    (
        render, search, record, query,
        libPdf
    ) => {
        const renderRecordToPdfWithTemplate = (id, type, printfile) => {
            if (!printfile) throw "Chưa có setup file xml!";
            let renderer = libPdf.renderTemplateWithXml(printfile);
            let rec = addDefaultRecordRender(renderer, type, id);
            printKBBGH(rec, renderer);
            return renderer.renderAsPdf();
        }

        const printKBBGH = (rec, renderer) => {
            let dataJson = getDataKBBGH(rec);

            renderer.addCustomDataSource({
                format: render.DataSource.OBJECT,
                alias: "dataJson",
                data: dataJson
            })
        }

        const getDataKBBGH = (rec) => {
            let subsidiaryInfo = getSubsidiaryInfo(rec.getValue({fieldId: 'subsidiary'}));
            let entityId = rec.getValue({fieldId: 'entity'});
            let entityName = getCustomerLegalName(
                entityId,
                rec.getText({fieldId: 'entity'}) || ''
            );
            let tranDateVal = rec.getValue({fieldId: 'trandate'});
            let tranday = tranDateVal ? ('0' + tranDateVal.getDate()).slice(-2) : '';
            let tranmonth = tranDateVal ? ('0' + (tranDateVal.getMonth() + 1)).slice(-2) : '';
            let tranyear = tranDateVal ? tranDateVal.getFullYear() : '';

            return {
                legalname: libPdf.formatDataXML(subsidiaryInfo.legalname),
                mainaddress_text: libPdf.formatDataXML(subsidiaryInfo.mainaddress_text),
                tranday: tranday,
                tranmonth: tranmonth,
                tranyear: tranyear,
                receiver: libPdf.formatDataXML(
                    rec.getValue({fieldId: 'custbody_scv_receiver'}) || ''
                ),
                entityName: libPdf.formatDataXML(entityName),
                shipaddress: libPdf.formatDataXML(
                    rec.getValue({fieldId: 'shipaddress'}) || ''
                ),
                lines: getLineDataKBBGH(rec)
            };
        }

        const getSubsidiaryInfo = (subsidiaryId) => {
            if (!subsidiaryId) return {legalname: '', mainaddress_text: ''};

            let results = query.runSuiteQL({
                query: 'select s.legalname, BUILTIN.DF(s.mainaddress) as mainaddress_text ' +
                    'from subsidiary s where s.id = ?',
                params: [subsidiaryId]
            }).asMappedResults();

            return {
                legalname: results[0]?.legalname || '',
                mainaddress_text: results[0]?.mainaddress_text || ''
            };
        }

        const getCustomerLegalName = (entityId, fallbackName) => {
            if (!entityId) return fallbackName || '';

            try {
                let fields = search.lookupFields({
                    type: search.Type.CUSTOMER,
                    id: entityId,
                    columns: ['custentity_scv_legal_name']
                });
                return getLookupValue(fields.custentity_scv_legal_name) || fallbackName || '';
            } catch (e) {
                return fallbackName || '';
            }
        }

        // TODO(BA-Q): mockup chỉ có số < 1000, chưa xác nhận dấu phân cách hàng nghìn.
        const formatQuantity = (quantity) => {
            let numericQuantity = Number(quantity);
            if (!Number.isFinite(numericQuantity)) numericQuantity = 0;

            let parts = numericQuantity.toFixed(2).split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return parts.join('.');
        }

        const getLineDataKBBGH = (rec) => {
            let lineData = [];
            let itemInfoById = {};
            let lineCount = rec.getLineCount({sublistId: 'item'});

            for (let i = 0; i < lineCount; i++) {
                let itemId = rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                let itemInfo = getItemInfo(itemId, itemInfoById);
                let description = rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'description',
                    line: i
                }) || '';
                let unitsdisplay = rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'unitsdisplay',
                    line: i
                }) || '';
                let dvt = unitsdisplay || rec.getSublistText({
                    sublistId: 'item',
                    fieldId: 'units',
                    line: i
                }) || '';
                let quantity = rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i
                }) || 0;

                lineData.push({
                    tenHang: libPdf.formatDataXML(description || itemInfo.displayName),
                    dvt: libPdf.formatDataXML(dvt),
                    soLuong: formatQuantity(quantity)
                });
            }

            return lineData;
        }

        const getItemInfo = (itemId, itemInfoById) => {
            if (!itemId) return {displayName: ''};
            if (itemInfoById[itemId]) return itemInfoById[itemId];

            try {
                let results = query.runSuiteQL({
                    query: 'select i.displayname from item i where i.id = ?',
                    params: [itemId]
                }).asMappedResults();
                itemInfoById[itemId] = {
                    displayName: results[0]?.displayname || ''
                };
            } catch (e) {
                itemInfoById[itemId] = {displayName: ''};
            }

            return itemInfoById[itemId];
        }

        const getLookupValue = (value) => {
            if (Array.isArray(value)) {
                return value.map((item) => item.text || item.value || '').join(', ');
            }
            if (value && typeof value === 'object') return value.text || value.value || '';
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

            let pdfFile = renderRecordToPdfWithTemplate(
                params.recid,
                params.rectype,
                params.printfile
            );
            response.writeFile(pdfFile, true);
        }

        return {
            onRequest,
            renderRecordToPdfWithTemplate
        }
    }
);
