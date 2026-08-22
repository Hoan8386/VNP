/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/render',
    'N/search',
    'N/record',
    'N/query',
    '../lib/scv_lib_pdf.js',
    '../lib/scv_lib_print_format.js',
    '../common/scv_common_print_lookup.js',
    '../cons/scv_cons_print.js'
], (render, search, record, query, libPdf, libPrintFormat, printLookup, consPrint) => {
    const UrlParameter = consPrint.UrlParameter;
    const Template = consPrint.Template;
    const Kbbgh = consPrint.Kbbgh;

    const addDefaultRecordRender = (renderer, recordType, recordId) => {
        const rec = record.load({
            type: recordType,
            id: recordId,
            isDynamic: false
        });
        renderer.addRecord(Template.RECORD_ALIAS, rec);
        return rec;
    };

    const getLookupText = (value) => {
        if (Array.isArray(value)) {
            return value.map((entry) => entry.text || entry.value || '').join(', ');
        }
        if (value && typeof value === 'object') {
            return value.text || value.value || '';
        }
        return libPrintFormat.asText(value);
    };

    const getCustomerLegalName = (entityId, fallbackName) => {
        if (!entityId) {
            return libPrintFormat.asText(fallbackName);
        }

        try {
            const fields = search.lookupFields({
                type: Kbbgh.CUSTOMER_RECORD_TYPE,
                id: entityId,
                columns: [Kbbgh.CUSTOMER_LEGAL_NAME_FIELD]
            });
            return libPrintFormat.asText(
                getLookupText(fields[Kbbgh.CUSTOMER_LEGAL_NAME_FIELD]) || fallbackName
            );
        } catch (error) {
            log.error({
                title: 'getCustomerLegalName',
                details: {
                    entityId,
                    fieldId: Kbbgh.CUSTOMER_LEGAL_NAME_FIELD,
                    error
                }
            });
            return libPrintFormat.asText(fallbackName);
        }
    };

    const getItemInfo = (itemId, itemInfoById) => {
        const itemKey = libPrintFormat.asText(itemId);
        if (!itemKey) {
            return {displayName: Kbbgh.EMPTY};
        }
        if (itemInfoById[itemKey]) {
            return itemInfoById[itemKey];
        }

        try {
            const rows = query.runSuiteQL({
                query: Kbbgh.ITEM_QUERY,
                params: [itemId]
            }).asMappedResults();
            itemInfoById[itemKey] = {
                displayName: libPrintFormat.asText(rows[0]?.displayname)
            };
        } catch (error) {
            log.error({
                title: 'getItemInfo',
                details: {itemId, query: Kbbgh.ITEM_QUERY, error}
            });
            itemInfoById[itemKey] = {displayName: Kbbgh.EMPTY};
        }

        return itemInfoById[itemKey];
    };

    const formatQuantity = (value) => {
        const numericValue = Number(value);
        const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
        const parts = safeValue.toFixed(Kbbgh.QUANTITY_DECIMAL_PLACES).split(
            Kbbgh.DECIMAL_SEPARATOR
        );
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, Kbbgh.THOUSANDS_SEPARATOR);
        return parts.join(Kbbgh.DECIMAL_SEPARATOR);
    };

    const getLineDataKbbgh = (rec) => {
        const itemInfoById = Object.create(null);
        const lineCount = rec.getLineCount({sublistId: Kbbgh.SUBLIST_ID});
        const lines = [];

        for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
            const itemId = libPrintFormat.readSublistValue(
                rec, lineIndex, Kbbgh.LINE_FIELD.ITEM
            );
            const itemInfo = getItemInfo(itemId, itemInfoById);
            const description = libPrintFormat.readSublistValue(
                rec, lineIndex, Kbbgh.LINE_FIELD.DESCRIPTION
            );
            const unitsDisplay = libPrintFormat.readSublistValue(
                rec, lineIndex, Kbbgh.LINE_FIELD.UNITS_DISPLAY
            );
            const unitsText = libPrintFormat.readSublistText(
                rec, lineIndex, Kbbgh.LINE_FIELD.UNITS
            );
            const quantity = libPrintFormat.asNumber(libPrintFormat.readSublistValue(
                rec, lineIndex, Kbbgh.LINE_FIELD.QUANTITY
            ));

            lines.push({
                tenHang: libPdf.formatDataXML(
                    libPrintFormat.asText(description || itemInfo.displayName)
                ),
                dvt: libPdf.formatDataXML(
                    libPrintFormat.asText(unitsDisplay || unitsText)
                ),
                soLuong: formatQuantity(quantity)
            });
        }

        return lines;
    };

    const getDataKbbgh = (rec) => {
        const subsidiaryInfo = printLookup.getSubsidiaryInfo(
            rec.getValue({fieldId: Kbbgh.FIELD.SUBSIDIARY})
        );
        const entityName = getCustomerLegalName(
            rec.getValue({fieldId: Kbbgh.FIELD.ENTITY}),
            rec.getText({fieldId: Kbbgh.FIELD.ENTITY})
        );
        const dateParts = libPrintFormat.getDateParts(
            rec.getValue({fieldId: Kbbgh.FIELD.TRANSACTION_DATE})
        );

        return {
            legalname: libPdf.formatDataXML(
                libPrintFormat.asText(subsidiaryInfo.legalname)
            ),
            mainaddress_text: libPdf.formatDataXML(
                libPrintFormat.asText(subsidiaryInfo.mainaddress_text)
            ),
            entityName: libPdf.formatDataXML(entityName),
            receiver: libPdf.formatDataXML(
                libPrintFormat.asText(rec.getValue({fieldId: Kbbgh.FIELD.RECEIVER}))
            ),
            shipaddress: libPdf.formatDataXML(
                libPrintFormat.asText(rec.getValue({fieldId: Kbbgh.FIELD.SHIP_ADDRESS}))
            ),
            tranday: dateParts.ngay,
            tranmonth: dateParts.thang,
            tranyear: dateParts.nam,
            lines: getLineDataKbbgh(rec)
        };
    };

    const printKbbgh = (rec, renderer, recordId) => {
        const dataJson = getDataKbbgh(rec, recordId);
        renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: Template.DATA_ALIAS,
            data: dataJson
        });
    };

    const renderRecordToPdfWithTemplate = (recordId, recordType, printFile) => {
        const renderer = libPdf.renderTemplateWithXml(printFile || Kbbgh.PRINT_FILE);
        const rec = addDefaultRecordRender(
            renderer,
            recordType || Kbbgh.DEFAULT_RECORD_TYPE,
            recordId
        );
        printKbbgh(rec, renderer, recordId);
        return renderer.renderAsPdf();
    };

    const onRequest = (scriptContext) => {
        const params = scriptContext.request.parameters;
        if (!params[UrlParameter.RECORD_ID]) {
            throw new Error('Missing item fulfillment record id.');
        }

        const pdfFile = renderRecordToPdfWithTemplate(
            params[UrlParameter.RECORD_ID],
            params[UrlParameter.RECORD_TYPE] || Kbbgh.DEFAULT_RECORD_TYPE,
            params[UrlParameter.PRINT_FILE]
        );
        scriptContext.response.writeFile({file: pdfFile, isInline: true});
    };

    return {onRequest, renderRecordToPdfWithTemplate};
});
