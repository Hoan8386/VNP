/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/render',
    'N/record',
    '../lib/scv_lib_pdf.js',
    '../lib/scv_lib_print_format.js',
    '../common/scv_common_print_lookup.js',
    '../cons/scv_cons_print.js'
], (render, record, libPdf, libPrintFormat, printLookup, consPrint) => {
    const UrlParameter = consPrint.UrlParameter;
    const Template = consPrint.Template;
    const Pdnmvt = consPrint.Pdnmvt;

    const addDefaultRecordRender = (renderer, recordType, recordId) => {
        const rec = record.load({
            type: recordType,
            id: recordId,
            isDynamic: false
        });
        renderer.addRecord(Template.RECORD_ALIAS, rec);
        return rec;
    };

    const isInternalIdText = (value) => {
        const text = libPrintFormat.asText(value).trim();
        return text !== Pdnmvt.EMPTY && /^\d+$/.test(text);
    };

    const getItemLines = (rec) => {
        const lineCount = rec.getLineCount({sublistId: Pdnmvt.SUBLIST_ID});
        let total = 0;
        const lines = [];

        for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
            const memo = libPrintFormat.readSublistValue(
                rec, lineIndex, Pdnmvt.LINE_FIELD.MEMO
            );
            const itemText = libPrintFormat.readSublistText(
                rec, lineIndex, Pdnmvt.LINE_FIELD.ITEM
            );
            const unitsText = libPrintFormat.readSublistText(
                rec, lineIndex, Pdnmvt.LINE_FIELD.UNITS
            );
            const unitsDisplay = libPrintFormat.readSublistValue(
                rec, lineIndex, Pdnmvt.LINE_FIELD.UNITS_DISPLAY
            );
            const quantity = libPrintFormat.asNumber(libPrintFormat.readSublistValue(
                rec, lineIndex, Pdnmvt.LINE_FIELD.QUANTITY
            ));
            const unitText = unitsText && !isInternalIdText(unitsText)
                ? unitsText
                : unitsDisplay;

            total += quantity;
            lines.push({
                tenHang: libPrintFormat.asText(memo || itemText),
                quyCach: Pdnmvt.EMPTY,
                dvt: libPrintFormat.asText(unitText),
                soLuong: libPdf.formatNumber(quantity),
                ghiChu: Pdnmvt.EMPTY
            });
        }

        return {lines, total};
    };

    const getCompanyNameLines = (legalNameValue) => {
        const legalName = libPrintFormat.asText(legalNameValue);
        const separatorIndex = legalName.lastIndexOf(Pdnmvt.COMPANY_NAME_SEPARATOR);
        if (separatorIndex < 0) {
            return {tenCongTyDong1: legalName, tenCongTyDong2: Pdnmvt.EMPTY};
        }

        const firstLine = legalName.slice(0, separatorIndex).trim();
        const shortCompanyType = legalName
            .slice(separatorIndex + Pdnmvt.COMPANY_NAME_SEPARATOR.length)
            .trim();
        return {
            tenCongTyDong1: firstLine,
            tenCongTyDong2: Pdnmvt.COMPANY_TYPE_NAMES[shortCompanyType] || shortCompanyType
        };
    };

    const getDataPdnmvt = (rec) => {
        const lineData = getItemLines(rec);
        const dateParts = libPrintFormat.getDateParts(
            rec.getValue({fieldId: Pdnmvt.FIELD.TRANSACTION_DATE})
        );
        const subsidiaryInfo = printLookup.getSubsidiaryInfo(
            rec.getValue({fieldId: Pdnmvt.FIELD.SUBSIDIARY})
        );

        return {
            ...getCompanyNameLines(subsidiaryInfo.legalname),
            soPhieu: libPrintFormat.asText(
                rec.getValue({fieldId: Pdnmvt.FIELD.TRANSACTION_ID})
            ),
            ngay: dateParts.ngay,
            thang: dateParts.thang,
            nam: dateParts.nam,
            thoiGianCan: libPrintFormat.formatDate(
                rec.getValue({fieldId: Pdnmvt.FIELD.REQUIRED_DATE})
            ),
            lines: lineData.lines,
            tongSoLuong: libPdf.formatNumber(lineData.total)
        };
    };

    const printPdnmvt = (rec, renderer, recordId) => {
        const dataJson = getDataPdnmvt(rec, recordId);
        renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: Template.DATA_ALIAS,
            data: dataJson
        });
    };

    const renderRecordToPdfWithTemplate = (recordId, recordType, printFile) => {
        const renderer = libPdf.renderTemplateWithXml(printFile || Pdnmvt.PRINT_FILE);
        const rec = addDefaultRecordRender(
            renderer,
            recordType || Pdnmvt.RECORD_TYPE,
            recordId
        );
        printPdnmvt(rec, renderer, recordId);
        return renderer.renderAsPdf();
    };

    const onRequest = (scriptContext) => {
        const params = scriptContext.request.parameters;
        if (!params[UrlParameter.RECORD_ID]) {
            throw new Error('Missing purchase requisition record id.');
        }

        const pdfFile = renderRecordToPdfWithTemplate(
            params[UrlParameter.RECORD_ID],
            Pdnmvt.RECORD_TYPE,
            params[UrlParameter.PRINT_FILE]
        );
        scriptContext.response.writeFile({file: pdfFile, isInline: true});
    };

    return {onRequest, renderRecordToPdfWithTemplate};
});
