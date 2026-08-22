/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/render', 'N/search', 'N/record',
    '../lib/scv_lib_pdf.js',
    '../lib/scv_lib_amount_in_word.js',
    '../lib/scv_lib_print_format.js',
    '../common/scv_common_print_lookup.js',
    '../cons/scv_cons_print.js'
], (
    render, search, record,
    libPdf, libAmount, libPrintFormat, printLookup, consPrint
) => {
    const UrlParameter = consPrint.UrlParameter;
    const Template = consPrint.Template;
    const Pr = consPrint.Pr;

    const onRequest = (scriptContext) => {
        const params = scriptContext.request.parameters;
        if (!params[UrlParameter.RECORD_ID]) {
            throw new Error('Missing payment request record id.');
        }
        const config = getPrintConfig(params);
        const pdfFile = renderRecordToPdfWithTemplate(
            params[UrlParameter.RECORD_ID],
            config
        );
        scriptContext.response.writeFile({file: pdfFile, isInline: true});
    };

    const renderRecordToPdfWithTemplate = (recordId, config) => {
        const renderer = libPdf.renderTemplateWithXml(config.PRINT_FILE);
        const rec = addDefaultRecordRender(renderer, Pr.RECORD_TYPE, recordId);
        printPr(rec, renderer, config);
        return renderer.renderAsPdf();
    };

    const addDefaultRecordRender = (renderer, recordType, recordId) => {
        const rec = record.load({
            type: recordType,
            id: recordId,
            isDynamic: false
        });
        renderer.addRecord(Template.RECORD_ALIAS, rec);
        return rec;
    };

    const printPr = (rec, renderer, config) => {
        const header = getHeaderFromRecord(rec);
        validatePaymentType(header, config);
        const dataJson = buildDataJson(header, getDetailRows(rec), config);
        renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: Template.DATA_ALIAS,
            data: dataJson
        });
    };

    const getPrintConfig = (params) => {
        const formKey = params[UrlParameter.FORM];
        const config = formKey === Pr.FORMS.DNTU.KEY
            ? Pr.FORMS.DNTU
            : formKey === Pr.FORMS.DNTT.KEY
                ? Pr.FORMS.DNTT
                : null;
        if (!config || params[UrlParameter.PRINT_FILE] !== config.PRINT_FILE) {
            throw new Error('Invalid payment request print form.');
        }
        return config;
    };

    const getHeaderFromRecord = (rec) => {
        const employeeIds = Pr.EMPLOYEE_FIELDS.map((fieldId) =>
            rec.getValue({fieldId})
        );
        const employeeLegalNames = getEmployeeLegalNames(employeeIds);
        const paymentDate = libPrintFormat.getDateParts(
            rec.getValue({fieldId: Pr.HEADER_FIELD.PAYMENT_DATE})
        );

        return {
            paymentType: rec.getValue({fieldId: Pr.HEADER_FIELD.PAYMENT_TYPE}),
            tenCongTy: printLookup.getSubsidiaryLegalName(
                rec.getValue({fieldId: Pr.HEADER_FIELD.SUBSIDIARY})
            ),
            donVi: rec.getText({fieldId: Pr.HEADER_FIELD.DEPARTMENT}),
            ngay: paymentDate.ngay,
            thang: paymentDate.thang,
            nam: paymentDate.nam,
            thoiHan: libPrintFormat.formatDate(
                rec.getValue({fieldId: Pr.HEADER_FIELD.DUE_DATE})
            ),
            noiDung: rec.getValue({fieldId: Pr.HEADER_FIELD.MEMO}),
            hinhThuc: rec.getValue({fieldId: Pr.HEADER_FIELD.PAYMENT_METHOD}),
            chuTaiKhoan: rec.getValue({fieldId: Pr.HEADER_FIELD.BENEFICIARY}),
            soTaiKhoan: rec.getValue({fieldId: Pr.HEADER_FIELD.BANK_ACCOUNT}),
            nganHang: rec.getText({fieldId: Pr.HEADER_FIELD.BANK_NAME}),
            tenTienTe: rec.getText({fieldId: Pr.HEADER_FIELD.CURRENCY}),
            maTienTe: printLookup.getCurrencySymbol(
                rec.getValue({fieldId: Pr.HEADER_FIELD.CURRENCY})
            ),
            nguoiDeNghi: employeeLegalNames[0],
            tongGiamDoc: employeeLegalNames[1],
            keToanTruong: employeeLegalNames[2],
            phoTruongPhongTckt: employeeLegalNames[3],
            keToanThanhToan: employeeLegalNames[4],
            truongDonVi: employeeLegalNames[5]
        };
    };

    const validatePaymentType = (header, config) => {
        const paymentType = Number(header.paymentType);
        if (!Number.isInteger(paymentType) || !config.TYPES.includes(paymentType)) {
            throw new Error('Payment request type does not match print form.');
        }
    };

    const getDetailRows = (rec) => {
        const lineCount = rec.getLineCount({sublistId: Pr.SUBLIST_ID});
        const lineRows = [];
        for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
            lineRows.push({
                internalId: Number(rec.getSublistValue({
                    sublistId: Pr.SUBLIST_ID,
                    fieldId: Pr.DETAIL_FIELD.INTERNAL_ID,
                    line: lineIndex
                })),
                dienGiai: libPrintFormat.asText(rec.getSublistValue({
                    sublistId: Pr.SUBLIST_ID,
                    fieldId: Pr.DETAIL_FIELD.DESCRIPTION,
                    line: lineIndex
                })),
                soTien: libPrintFormat.asText(rec.getSublistValue({
                    sublistId: Pr.SUBLIST_ID,
                    fieldId: Pr.DETAIL_FIELD.AMOUNT,
                    line: lineIndex
                }))
            });
        }
        lineRows.sort((left, right) => left.internalId - right.internalId);
        return lineRows.map((line) => ({
            dienGiai: line.dienGiai,
            soTien: line.soTien
        }));
    };

    const buildDataJson = (header, detailRows, config) => {
        const detailData = buildLines(detailRows);
        const currencyCode = getCurrencyCode(header.maTienTe);
        const paymentTicks = getPaymentMethodTicks(header.hinhThuc);
        const amountInWords = libPrintFormat.asText(
            libAmount.DocTienBangChu(detailData.total, currencyCode)
        );

        return {
            mauSo: config.FORM_NUMBER,
            tieuDe: config.TITLE,
            nhan: config.LABELS,
            tenCongTy: libPrintFormat.asText(header.tenCongTy),
            donVi: libPrintFormat.asText(header.donVi),
            ngay: libPrintFormat.asText(header.ngay),
            thang: libPrintFormat.asText(header.thang),
            nam: libPrintFormat.asText(header.nam),
            thoiHan: config.HAS_DUE_DATE ? libPrintFormat.asText(header.thoiHan) : Pr.EMPTY,
            noiDung: libPrintFormat.asText(header.noiDung),
            nguoiDeNghi: libPrintFormat.asText(header.nguoiDeNghi),
            chuTaiKhoan: libPrintFormat.asText(header.chuTaiKhoan),
            soTaiKhoan: libPrintFormat.asText(header.soTaiKhoan),
            nganHang: libPrintFormat.asText(header.nganHang),
            tenTienTe: libPrintFormat.asText(
                Pr.CURRENCY_NAMES[currencyCode] || header.tenTienTe
            ),
            tickTienMat: paymentTicks.tickTienMat,
            tickChuyenKhoan: paymentTicks.tickChuyenKhoan,
            lines: detailData.lines,
            tongCong: libPdf.formatNumber(detailData.total),
            tongCongBangChu: amountInWords,
            kyDuyet: {
                tongGiamDoc: libPrintFormat.asText(header.tongGiamDoc),
                keToanTruong: libPrintFormat.asText(header.keToanTruong),
                phoTruongPhongTCKT: libPrintFormat.asText(header.phoTruongPhongTckt),
                keToanThanhToan: libPrintFormat.asText(header.keToanThanhToan),
                truongDonVi: libPrintFormat.asText(header.truongDonVi),
                nguoiDeNghi: libPrintFormat.asText(header.nguoiDeNghi)
            }
        };
    };

    const getEmployeeLegalNames = (employeeIds) => employeeIds.map(
        (employeeId) => getEmployeeLegalName(employeeId)
    );

    const buildLines = (detailRows) => {
        let total = 0;
        const lines = detailRows.map((row, index) => {
            const amount = libPrintFormat.asNumber(row.soTien);
            total += amount;
            return {
                stt: String(index + 1),
                dienGiai: libPrintFormat.asText(row.dienGiai),
                soTien: libPdf.formatNumber(amount)
            };
        });
        return {lines, total};
    };

    const getEmployeeLegalName = (employeeId) => {
        if (employeeId === null || employeeId === undefined || employeeId === '') {
            return Pr.EMPTY;
        }

        try {
            const fields = search.lookupFields({
                type: Pr.EMPLOYEE_RECORD_TYPE,
                id: employeeId,
                columns: [Pr.EMPLOYEE_LEGAL_NAME_FIELD]
            });
            return libPrintFormat.asText(
                getLookupText(fields[Pr.EMPLOYEE_LEGAL_NAME_FIELD])
            );
        } catch (error) {
            log.error({
                title: 'getEmployeeLegalName',
                details: {
                    employeeId,
                    fieldId: Pr.EMPLOYEE_LEGAL_NAME_FIELD,
                    error
                }
            });
            return Pr.EMPTY;
        }
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

    const getCurrencyCode = (symbol) => {
        const currencySymbol = libPrintFormat.asText(symbol);
        const currencyCode = consPrint.Currency.SYMBOL_TO_CODE[currencySymbol];
        if (!currencyCode) {
            throw new Error('Unsupported payment request currency symbol.');
        }
        return currencyCode;
    };

    const getPaymentMethodTicks = (paymentMethodId) => {
        const methodCode = Pr.PAYMENT_METHOD_CODE[libPrintFormat.asText(paymentMethodId)]
            || Pr.EMPTY;
        return {
            tickTienMat: methodCode === 'CASH' || methodCode === 'BOTH' ? 'X' : Pr.EMPTY,
            tickChuyenKhoan: methodCode === 'TRANSFER' || methodCode === 'BOTH'
                ? 'X'
                : Pr.EMPTY
        };
    };

    return {onRequest, renderRecordToPdfWithTemplate};
});
