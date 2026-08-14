/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/render', 'N/record', 'N/query', '../lib/scv_lib_pdf.js'],
    (render, record, query, libPdf) => {
        const renderRecordToPdfWithTemplate = (id, type, printfile) => {
            if (!printfile) throw "Chưa có setup file xml!";
            let renderer = libPdf.renderTemplateWithXml(printfile);
            let rec = addDefaultRecordRender(renderer, type, id);
            printDDH(rec, renderer);
            return renderer.renderAsPdf();
        }

        const printDDH = (rec, renderer) => {
            let dataJson = getDataDDH(rec);

            renderer.addCustomDataSource({
                format: render.DataSource.OBJECT,
                alias: "dataJson",
                data: dataJson
            })
        }

        const getDataDDH = (rec) => {
            let subsidiaryInfo = getSubsidiaryInfo(rec.getValue({fieldId: 'subsidiary'}));
            let entityId = rec.getValue({fieldId: 'entity'});
            let fallbackVendorName = rec.getText({fieldId: 'entity'}) || '';
            let vendorInfo = getVendorInfo(entityId);
            let currency = getCurrency(
                rec.getValue({fieldId: 'currency'}),
                rec.getText({fieldId: 'currency'})
            );
            let lineData = getLineDataDDH(rec);

            return {
                legalname: libPdf.formatDataXML(subsidiaryInfo.legalname),
                mainaddress_text: libPdf.formatDataXML(subsidiaryInfo.mainaddress_text),
                tranid: libPdf.formatDataXML(rec.getValue({fieldId: 'tranid'}) || ''),
                vendorName: libPdf.formatDataXML(vendorInfo.legalname || fallbackVendorName),
                // TODO(BA-Q2): FDD ghi "entity.addr1"; mockup lại hiện chuỗi địa chỉ đầy đủ. Nếu BA muốn full address thì đổi sang billaddress của PO.
                vendorAddress: libPdf.formatDataXML(
                    vendorInfo.addr1 || rec.getValue({fieldId: 'billaddress'}) || ''
                ),
                vendorPhone: libPdf.formatDataXML(vendorInfo.phoneno || ''),
                currency: libPdf.formatDataXML(currency),
                lines: lineData.lines,
                cong: lineData.cong,
                vat: lineData.vat,
                tong: lineData.tong
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

        const getVendorInfo = (entityId) => {
            if (!entityId) return {legalname: '', phoneno: '', addr1: ''};

            try {
                let results = query.runSuiteQL({
                    query: 'select v.custentity_scv_legal_name as legalname, ' +
                        'v.custentity_scv_phone_no as phoneno, ' +
                        'ea.addr1 as addr1, eab.defaultbilling as defaultbilling ' +
                        'from vendor v ' +
                        'left join entityAddressbook eab on eab.entity = v.id ' +
                        'left join entityAddress ea on ea.nkey = eab.addressbookaddress ' +
                        'where v.id = ?',
                    params: [entityId]
                }).asMappedResults();

                let firstRow = results[0] || {};
                let defaultBillingRow = results.find((row) => row.defaultbilling === 'T');
                let addressRow = defaultBillingRow || results.find((row) => row.addr1);

                return {
                    legalname: firstRow.legalname || '',
                    phoneno: firstRow.phoneno || '',
                    addr1: addressRow?.addr1 || ''
                };
            } catch (e) {
                return {legalname: '', phoneno: '', addr1: ''};
            }
        }

        const getCurrency = (currencyId, fallbackCurrency) => {
            let currency = '';

            if (currencyId) {
                try {
                    let results = query.runSuiteQL({
                        query: 'select c.symbol from currency c where c.id = ?',
                        params: [currencyId]
                    }).asMappedResults();
                    currency = results[0]?.symbol || '';
                } catch (e) {
                    currency = '';
                }
            }

            return (currency || fallbackCurrency || 'VND').toUpperCase();
        }

        // TODO(BA-Q4): mockup dùng dấu phân cách kiểu EN (1,234.56), khác các mẫu VN khác trong hệ thống.
        const toNumber = (value) => {
            let numericValue = Number(value);
            return Number.isFinite(numericValue) ? numericValue : 0;
        }

        // TODO(BA-Q6): FDD task07 chỉ có ví dụ VND. Số chữ số thập phân của rate (tối đa 8) và
        // quy tắc 0-hay-2 chữ số thập phân cho cột tiền là suy luận từ dữ liệu thật POR010011/POR010016,
        // chưa được BA xác nhận.
        const formatRate = (value) => {
            let parts = toNumber(value).toFixed(8).split('.');
            parts[1] = parts[1].replace(/0+$/, '');
            if (parts[1].length < 2) {
                parts[1] = parts[1].padEnd(2, '0');
            }
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return parts.join('.');
        }

        // TODO(BA-Q6): FDD task07 chỉ có ví dụ VND. Số chữ số thập phân của rate (tối đa 8) và
        // quy tắc 0-hay-2 chữ số thập phân cho cột tiền là suy luận từ dữ liệu thật POR010011/POR010016,
        // chưa được BA xác nhận.
        const formatMoney = (value, decimalPlaces) => {
            let parts = toNumber(value).toFixed(decimalPlaces).split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return decimalPlaces > 0 ? parts.join('.') : parts[0];
        }

        const formatQty = (value) => {
            let formattedValue = toNumber(value).toFixed(2).replace(/\.?0+$/, '');
            let parts = formattedValue.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            return parts.join('.');
        }

        const getLineDataDDH = (rec) => {
            let lines = [];
            let itemInfoById = {};
            let cong = 0;
            let vat = 0;
            let tong = 0;
            let hasTax1Amt = false;
            let hasGrossAmt = false;
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
                let dvt = rec.getSublistText({
                    sublistId: 'item',
                    fieldId: 'units',
                    line: i
                }) || '';
                let quantity = rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    line: i
                });
                let rate = rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'rate',
                    line: i
                });
                let amount = rec.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'amount',
                    line: i
                });
                let tax1amt = getSublistValueSafe(rec, 'tax1amt', i);
                let grossamt = getSublistValueSafe(rec, 'grossamt', i);

                cong += toNumber(amount);
                if (tax1amt !== null && tax1amt !== undefined && tax1amt !== '') {
                    hasTax1Amt = true;
                    vat += toNumber(tax1amt);
                }
                if (grossamt !== null && grossamt !== undefined && grossamt !== '') {
                    hasGrossAmt = true;
                    tong += toNumber(grossamt);
                }

                lines.push({
                    maHH: libPdf.formatDataXML(itemInfo.upccode),
                    tenHang: libPdf.formatDataXML(description || itemInfo.displayName),
                    dvt: libPdf.formatDataXML(dvt),
                    soLuong: formatQty(quantity),
                    donGia: formatRate(rate),
                    thanhTien: toNumber(amount)
                });
            }

            if (!hasTax1Amt && !hasGrossAmt) {
                vat = 0;
                tong = cong;
                // TODO(BA-Q3): tax1amt/grossamt rỗng -> account đang dùng SuiteTax, cần BA chốt lấy taxtotal/total ở header.
            }

            let moneyValues = lines.map((line) => line.thanhTien).concat([cong, vat, tong]);
            let hasMoneyFraction = moneyValues.some((value) => {
                let numericValue = toNumber(value);
                return Math.abs(numericValue - Math.round(numericValue)) > 0.000001;
            });
            let moneyDecimalPlaces = hasMoneyFraction ? 2 : 0;

            lines.forEach((line) => {
                line.thanhTien = formatMoney(line.thanhTien, moneyDecimalPlaces);
            });
            cong = formatMoney(cong, moneyDecimalPlaces);
            vat = formatMoney(vat, moneyDecimalPlaces);
            tong = formatMoney(tong, moneyDecimalPlaces);

            return {lines, cong, vat, tong};
        }

        const getSublistValueSafe = (rec, fieldId, line) => {
            try {
                return rec.getSublistValue({
                    sublistId: 'item',
                    fieldId,
                    line
                });
            } catch (e) {
                return undefined;
            }
        }

        const getItemInfo = (itemId, itemInfoById) => {
            if (!itemId) return {upccode: '', displayName: ''};
            if (itemInfoById[itemId]) return itemInfoById[itemId];

            try {
                let results = query.runSuiteQL({
                    query: 'select i.upccode, i.displayname from item i where i.id = ?',
                    params: [itemId]
                }).asMappedResults();
                itemInfoById[itemId] = {
                    upccode: results[0]?.upccode || '',
                    displayName: results[0]?.displayname || ''
                };
            } catch (e) {
                itemInfoById[itemId] = {upccode: '', displayName: ''};
            }

            return itemInfoById[itemId];
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
