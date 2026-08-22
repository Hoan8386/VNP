/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/render', 'N/record', 'N/query',
    '../lib/scv_lib_pdf.js',
    '../lib/scv_lib_print_format.js',
    '../common/scv_common_print_lookup.js',
    '../cons/scv_cons_print.js'
], (
    render, record, query,
    libPdf, libPrintFormat, printLookup, consPrint
) => {
    const UrlParameter = consPrint.UrlParameter;
    const Template = consPrint.Template;
    const Ddh = consPrint.Ddh;

    const onRequest = (scriptContext) => {
        const params = scriptContext.request.parameters;
        if (!params[UrlParameter.RECORD_ID]) {
            throw new Error('Missing purchase order record id.');
        }

        const pdfFile = renderRecordToPdfWithTemplate(
            params[UrlParameter.RECORD_ID],
            params[UrlParameter.RECORD_TYPE] || Ddh.DEFAULT_RECORD_TYPE,
            params[UrlParameter.PRINT_FILE]
        );
        scriptContext.response.writeFile({file: pdfFile, isInline: true});
    };

    const renderRecordToPdfWithTemplate = (recordId, recordType, printFile) => {
        const renderer = libPdf.renderTemplateWithXml(printFile || Ddh.PRINT_FILE);
        const rec = addDefaultRecordRender(
            renderer,
            recordType || Ddh.DEFAULT_RECORD_TYPE,
            recordId
        );
        printDdh(rec, renderer, recordId);
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

    const printDdh = (rec, renderer, recordId) => {
        const dataJson = getDataDdh(rec, recordId);
        renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: Template.DATA_ALIAS,
            data: dataJson
        });
    };

    const getDataDdh = (rec) => {
        const subsidiaryInfo = printLookup.getSubsidiaryInfo(
            rec.getValue({fieldId: Ddh.FIELD.SUBSIDIARY})
        );
        const vendorInfo = getVendorInfo(rec.getValue({fieldId: Ddh.FIELD.ENTITY}));
        const fallbackVendorName = rec.getText({fieldId: Ddh.FIELD.ENTITY});
        const currency = getCurrency(
            rec.getValue({fieldId: Ddh.FIELD.CURRENCY}),
            rec.getText({fieldId: Ddh.FIELD.CURRENCY})
        );
        const lineData = getLineDataDdh(rec);

        return {
            legalname: xmlText(subsidiaryInfo.legalname),
            mainaddress_text: xmlText(subsidiaryInfo.mainaddress_text),
            tranid: xmlText(rec.getValue({fieldId: Ddh.FIELD.TRANSACTION_ID})),
            vendorName: xmlText(vendorInfo.legalname || fallbackVendorName),
            // Keep the legacy BA-Q2 priority until the address rule is decided.
            vendorAddress: xmlText(
                vendorInfo.addr1 || rec.getValue({fieldId: Ddh.FIELD.BILL_ADDRESS})
            ),
            vendorPhone: xmlText(vendorInfo.phoneno),
            currency: xmlText(currency),
            lines: lineData.lines,
            cong: lineData.cong,
            vat: lineData.vat,
            tong: lineData.tong
        };
    };

    const getVendorInfo = (vendorId) => {
        if (!vendorId) {
            return {legalname: Ddh.EMPTY, phoneno: Ddh.EMPTY, addr1: Ddh.EMPTY};
        }

        try {
            const rows = query.runSuiteQL({
                query: Ddh.VENDOR_QUERY,
                params: [vendorId]
            }).asMappedResults();
            const firstRow = rows[0] || {};
            const defaultBillingRow = rows.find((row) =>
                row.defaultbilling === 'T' || row.defaultbilling === true
            );
            const addressRow = defaultBillingRow || rows.find((row) => row.addr1);
            return {
                legalname: libPrintFormat.asText(firstRow.legalname),
                phoneno: libPrintFormat.asText(firstRow.phoneno),
                addr1: libPrintFormat.asText(addressRow?.addr1)
            };
        } catch (error) {
            log.error({
                title: 'getVendorInfo',
                details: {vendorId, query: Ddh.VENDOR_QUERY, error}
            });
            return {legalname: Ddh.EMPTY, phoneno: Ddh.EMPTY, addr1: Ddh.EMPTY};
        }
    };

    const getCurrency = (currencyId, fallbackCurrency) => {
        const fallback = libPrintFormat.asText(fallbackCurrency);
        if (!currencyId) {
            return (fallback || Ddh.DEFAULT_CURRENCY).toUpperCase();
        }

        try {
            const rows = query.runSuiteQL({
                query: Ddh.CURRENCY_QUERY,
                params: [currencyId]
            }).asMappedResults();
            const symbol = libPrintFormat.asText(rows[0]?.symbol);
            return (symbol || fallback || Ddh.DEFAULT_CURRENCY).toUpperCase();
        } catch (error) {
            log.error({
                title: 'getCurrency',
                details: {currencyId, fallbackCurrency, query: Ddh.CURRENCY_QUERY, error}
            });
            return (fallback || Ddh.DEFAULT_CURRENCY).toUpperCase();
        }
    };

    const getLineDataDdh = (rec) => {
        const itemInfoById = Object.create(null);
        const lineCount = rec.getLineCount({sublistId: Ddh.SUBLIST_ID});
        let subtotalAmount = 0;
        let taxAmount = 0;
        let totalAmount = 0;
        let hasTaxAmount = false;
        let hasGrossAmount = false;
        const lines = [];

        for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
            const itemId = libPrintFormat.readSublistValue(
                rec, lineIndex, Ddh.LINE_FIELD.ITEM
            );
            const itemInfo = getItemInfo(itemId, itemInfoById);
            const description = libPrintFormat.readSublistValue(
                rec, lineIndex, Ddh.LINE_FIELD.DESCRIPTION
            );
            const unitText = libPrintFormat.readSublistText(
                rec, lineIndex, Ddh.LINE_FIELD.UNITS
            );
            const quantity = libPrintFormat.readSublistValue(
                rec, lineIndex, Ddh.LINE_FIELD.QUANTITY
            );
            const rate = libPrintFormat.readSublistValue(
                rec, lineIndex, Ddh.LINE_FIELD.RATE
            );
            const amount = libPrintFormat.asNumber(libPrintFormat.readSublistValue(
                rec, lineIndex, Ddh.LINE_FIELD.AMOUNT
            ));
            const taxValue = libPrintFormat.getSublistValueSafe(
                rec, Ddh.LINE_FIELD.TAX_AMOUNT, lineIndex
            );
            const grossValue = libPrintFormat.getSublistValueSafe(
                rec, Ddh.LINE_FIELD.GROSS_AMOUNT, lineIndex
            );

            subtotalAmount += amount;
            if (hasValue(taxValue)) {
                hasTaxAmount = true;
                taxAmount += libPrintFormat.asNumber(taxValue);
            }
            if (hasValue(grossValue)) {
                hasGrossAmount = true;
                totalAmount += libPrintFormat.asNumber(grossValue);
            }

            lines.push({
                maHH: itemInfo.upccode,
                tenHang: description || itemInfo.displayName,
                dvt: unitText,
                soLuong: formatQuantity(quantity),
                donGia: formatRate(rate),
                thanhTien: amount
            });
        }

        if (!hasTaxAmount && !hasGrossAmount) {
            taxAmount = 0;
            totalAmount = subtotalAmount;
        }

        const moneyValues = lines.map((line) => line.thanhTien)
            .concat([subtotalAmount, taxAmount, totalAmount]);
        const hasMoneyFraction = moneyValues.some((value) => {
            const numericValue = libPrintFormat.asNumber(value);
            return Math.abs(numericValue - Math.round(numericValue))
                > Ddh.MONEY_FRACTION_TOLERANCE;
        });
        const moneyDecimalPlaces = hasMoneyFraction ? Ddh.MONEY_DECIMAL_PLACES : 0;

        lines.forEach((line) => {
            line.maHH = xmlText(line.maHH);
            line.tenHang = xmlText(line.tenHang);
            line.dvt = xmlText(line.dvt);
            line.thanhTien = formatMoney(line.thanhTien, moneyDecimalPlaces);
        });

        return {
            lines,
            cong: formatMoney(subtotalAmount, moneyDecimalPlaces),
            vat: formatMoney(taxAmount, moneyDecimalPlaces),
            tong: formatMoney(totalAmount, moneyDecimalPlaces)
        };
    };

    const getItemInfo = (itemId, itemInfoById) => {
        const itemKey = libPrintFormat.asText(itemId);
        if (!itemKey) {
            return {upccode: Ddh.EMPTY, displayName: Ddh.EMPTY};
        }
        if (itemInfoById[itemKey]) {
            return itemInfoById[itemKey];
        }

        try {
            const rows = query.runSuiteQL({
                query: Ddh.ITEM_QUERY,
                params: [itemId]
            }).asMappedResults();
            const row = rows[0] || {};
            itemInfoById[itemKey] = {
                upccode: libPrintFormat.asText(row.upccode),
                displayName: libPrintFormat.asText(row.displayname)
            };
        } catch (error) {
            log.error({
                title: 'getItemInfo',
                details: {itemId, query: Ddh.ITEM_QUERY, error}
            });
            itemInfoById[itemKey] = {upccode: Ddh.EMPTY, displayName: Ddh.EMPTY};
        }

        return itemInfoById[itemKey];
    };

    const xmlText = (value) => libPdf.formatDataXML(libPrintFormat.asText(value));

    const formatRate = (value) => {
        const parts = libPrintFormat.asNumber(value)
            .toFixed(Ddh.RATE_DECIMAL_PLACES)
            .split(Ddh.DECIMAL_SEPARATOR);
        parts[1] = parts[1].replace(/0+$/, '').padEnd(2, '0');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, Ddh.THOUSANDS_SEPARATOR);
        return parts.join(Ddh.DECIMAL_SEPARATOR);
    };

    const formatMoney = (value, decimalPlaces) => {
        const parts = libPrintFormat.asNumber(value)
            .toFixed(decimalPlaces)
            .split(Ddh.DECIMAL_SEPARATOR);
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, Ddh.THOUSANDS_SEPARATOR);
        return decimalPlaces > 0
            ? parts.join(Ddh.DECIMAL_SEPARATOR)
            : parts[0];
    };

    const formatQuantity = (value) => {
        const formattedValue = libPrintFormat.asNumber(value)
            .toFixed(Ddh.QUANTITY_DECIMAL_PLACES)
            .replace(/\.?0+$/, '');
        const parts = formattedValue.split(Ddh.DECIMAL_SEPARATOR);
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, Ddh.THOUSANDS_SEPARATOR);
        return parts.join(Ddh.DECIMAL_SEPARATOR);
    };

    const hasValue = (value) => value !== null && value !== undefined && value !== Ddh.EMPTY;

    return {onRequest, renderRecordToPdfWithTemplate};
});
