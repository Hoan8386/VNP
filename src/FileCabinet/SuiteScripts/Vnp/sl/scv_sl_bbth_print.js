/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/record',
    'N/render',
    '../lib/scv_lib_pdf.js',
    '../lib/scv_lib_print_format.js',
    '../common/scv_common_print_lookup.js',
    '../cons/scv_cons_print.js'
], (
    record,
    render,
    libPdf,
    libPrintFormat,
    printLookup,
    consPrint
) => {
    const {UrlParameter, Template, Bbth} = consPrint;

    /**
     * Defines the Suitelet script trigger point.
     * @param {Object} scriptContext
     * @param {ServerRequest} scriptContext.request - Incoming request
     * @param {ServerResponse} scriptContext.response - Suitelet response
     * @since 2015.2
     */
    const onRequest = (scriptContext) => {
        const params = scriptContext.request.parameters;
        const recordId = params[UrlParameter.RECORD_ID];
        if (!recordId) {
            throw new Error('Missing vendor return authorization record id.');
        }

        const pdfFile = renderRecordToPdfWithTemplate(
            recordId,
            params[UrlParameter.PRINT_FILE]
        );
        scriptContext.response.writeFile({file: pdfFile, isInline: true});
    };

    const renderRecordToPdfWithTemplate = (recordId, printFile) => {
        const renderer = libPdf.renderTemplateWithXml(printFile || Bbth.PRINT_FILE);
        const rec = record.load({
            type: Bbth.DEFAULT_RECORD_TYPE,
            id: recordId,
            isDynamic: false
        });

        renderer.addRecord('record', rec);
        addEntityRecords(renderer, rec);

        const dataJson = getDataBbth(rec);
        renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: Template.DATA_ALIAS,
            data: dataJson
        });
        return renderer.renderAsPdf();
    };

    const addEntityRecords = (renderer, rec) => {
        const entityId = rec.getValue({fieldId: Bbth.FIELD.ENTITY});
        if (entityId) {
            const vendorRec = record.load({
                type: 'vendor',
                id: entityId,
                isDynamic: false
            });
            hydrateVendorLegalName(vendorRec, entityId);
            renderer.addRecord('vendor', vendorRec);
        }

        const subsidiaryId = rec.getValue({fieldId: Bbth.FIELD.SUBSIDIARY});
        if (subsidiaryId) {
            const subsidiaryRec = record.load({
                type: 'subsidiary',
                id: subsidiaryId,
                isDynamic: false
            });
            renderer.addRecord('subsidiary', subsidiaryRec);
        }
    };

    const hydrateVendorLegalName = (vendorRec, vendorId) => {
        let directLegalName = '';
        try {
            directLegalName = libPrintFormat.asText(
                vendorRec.getValue({fieldId: 'custentity_scv_legal_name'})
            );
        } catch (error) {
            directLegalName = '';
        }

        if (directLegalName) return;

        const fallbackLegalName = printLookup.getEntityLegalName('vendor', vendorId);
        if (!fallbackLegalName) return;

        try {
            vendorRec.setValue({
                fieldId: 'custentity_scv_legal_name',
                value: fallbackLegalName
            });
        } catch (error) {
            // The renderer still receives the native vendor record as the source of truth.
        }
    };

    const getDataBbth = (rec) => {
        const dateParts = libPrintFormat.getDateParts(
            rec.getValue({fieldId: Bbth.FIELD.TRANSACTION_DATE})
        );

        return {
            tranday: dateParts.ngay,
            tranmonth: dateParts.thang,
            tranyear: dateParts.nam,
            lines: getLineDataBbth(rec)
        };
    };

    const getLineDataBbth = (rec) => {
        const lineCount = rec.getLineCount({sublistId: Bbth.SUBLIST_ID});
        const lines = [];

        // TODO(BA-Q5): một item có nhiều inventoryassignment thì vòng này tách mỗi
        // assignment thành một dòng in riêng; item không có inventorydetail vẫn in
        // một dòng với SKS/HD rỗng. Chờ BA xác nhận có cần gộp nhiều lô vào một ô.
        for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
            const description = libPrintFormat.readSublistValue(
                rec, lineIndex, Bbth.LINE_FIELD.DESCRIPTION
            );
            const unitsDisplay = libPrintFormat.readSublistValue(
                rec, lineIndex, Bbth.LINE_FIELD.UNITS_DISPLAY
            );
            const unitsText = libPrintFormat.readSublistText(
                rec, lineIndex, Bbth.LINE_FIELD.UNITS
            );
            const quantity = libPrintFormat.readSublistValue(
                rec, lineIndex, Bbth.LINE_FIELD.QUANTITY
            );
            const assignments = libPrintFormat.readSublistSubrecordValues(
                rec,
                Bbth.SUBLIST_ID,
                Bbth.SUBRECORD.INVENTORY_DETAIL,
                lineIndex,
                Bbth.SUBRECORD.INVENTORY_ASSIGNMENT,
                // Hardcode 'quantity' because cons/ is out of scope; consolidate it there in the next round.
                [
                    Bbth.SUBRECORD.ISSUE_INVENTORY_NUMBER,
                    Bbth.SUBRECORD.EXPIRATION_DATE,
                    'quantity'
                ],
                [Bbth.SUBRECORD.ISSUE_INVENTORY_NUMBER]
            );
const unit = unitsDisplay || unitsText;

            if (assignments.length === 0) {
                lines.push(createLineData(
                    lines.length + 1,
                    description,
                    unit,
                    quantity,
                    Bbth.EMPTY,
                    Bbth.EMPTY
                ));
                continue;
            }

            assignments.forEach((assignment) => {
                lines.push(createLineData(
                    lines.length + 1,
                    description,
                    unit,
                    assignment['quantity'],
// Fallback to the internal ID when the inventory-number text is empty.
assignment[Bbth.SUBRECORD.ISSUE_INVENTORY_NUMBER + 'Text'] || assignment[Bbth.SUBRECORD.ISSUE_INVENTORY_NUMBER],
                    libPrintFormat.formatDate(
// TODO(BA-Q6): HD rỗng vì lot record không có Expiration Date — hỏi BA nguồn dữ liệu HD.
assignment[Bbth.SUBRECORD.EXPIRATION_DATE]
                    )
                ));
            });
        }

        return lines;
    };

    const createLineData = (lineNumber, description, unit, quantity, sks, hd) => ({
        stt: String(lineNumber).padStart(2, '0'),
        tenHang: formatLineValue(description),
        dvt: formatLineValue(unit),
        soLuong: formatLineValue(quantity),
        sks: formatLineValue(sks),
        hd: formatLineValue(hd)
    });

    const formatLineValue = (value) => libPdf.formatDataXML(
        libPrintFormat.asText(value)
    );

    return {onRequest, renderRecordToPdfWithTemplate};
});
