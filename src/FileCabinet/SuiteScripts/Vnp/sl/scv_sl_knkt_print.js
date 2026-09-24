/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/search', 'N/render', 'N/file', 'N/encode', 'N/log', 'N/record', 'N/format',
    '../lib/scv_lib_pdf.js',
    '../lib/scv_lib_print_format.js',
    '../common/scv_common_print_lookup.js',
    '../cons/scv_cons_file.js',
    '../cons/scv_cons_print.js'
], (
    search, render, file, encode, log, record, format,
    libPdf, libPrintFormat, printLookup, consFile, consPrint
) => {
    const UrlParameter = consPrint.UrlParameter;
    const Template = consPrint.Template;
    const Knkt = consPrint.Knkt;

    const onRequest = (scriptContext) => {
        const params = scriptContext.request.parameters;
        const recordId = params[UrlParameter.RECORD_ID];
        if (!recordId) {
            throw new Error('Missing internal audit recommendation report id.');
        }

        const outputFormat = params[UrlParameter.FORMAT] || Knkt.FORMAT_WORD;
        if (outputFormat === Knkt.FORMAT_PDF) {
            scriptContext.response.writeFile({
                file: renderRecordToPdf(recordId, params[UrlParameter.PRINT_FILE]),
                isInline: true
            });
            return;
        }
        if (outputFormat !== Knkt.FORMAT_WORD) {
            throw new Error('Invalid KNKT output format.');
        }

        try {
            scriptContext.response.writeFile({
                file: renderRecordToWord(recordId, params[UrlParameter.PRINT_FILE]),
                isInline: false
            });
        } catch (error) {
            log.error({
                title: 'KNKT_WORD_PRINT_ERROR',
                details: {
                    recordId,
                    printFile: params[UrlParameter.PRINT_FILE],
                    name: error && error.name,
                    message: error && error.message,
                    stack: error && error.stack
                }
            });
            throw error;
        }
    };

    const renderRecordToPdf = (recordId, printFileName) => {
        const renderer = libPdf.renderTemplateWithXml(getPdfPrintFile(printFileName));
        const rec = addDefaultRecordRender(renderer, Knkt.RECORD_TYPE, recordId);
        printKnkt(rec, renderer, recordId, {
            excludeCompleted: getPdfPrintFile(printFileName) === Knkt.PRINT_FILE_LAN_2
        });
        return renderer.renderAsPdf();
    };

    const renderRecordToWord = (recordId, printFileName) => {
        const wordPrintFile = getWordPrintFile(printFileName);
        const templatePath = consFile.getCurrentRootFolder() + '/' + Knkt.WORD_FOLDER
            + '/' + wordPrintFile + Knkt.WORD_EXTENSION;
        const templateFile = file.load({id: templatePath});
        const renderer = render.create();
        renderer.templateContent = templateFile.getContents();
        const rec = addDefaultRecordRender(renderer, Knkt.RECORD_TYPE, recordId);
        const wordTemplate = getWordTemplate(wordPrintFile);
        const dataJson = printKnkt(rec, renderer, recordId, {
            excludeCompleted: wordTemplate.excludeCompleted === true
        });
        const wordFilePrefix = wordTemplate.prefix;
        const wordFileName = wordFilePrefix
            + dataJson.soBaoCao.replace(/[\\/:*?"<>|\u0000-\u001F\u007F]/g, '_')
            + Knkt.DOC_EXTENSION;

        return file.create({
            name: wordFileName,
            fileType: file.Type.WORD,
            contents: encode.convert({
                string: renderer.renderAsString(),
                inputEncoding: encode.Encoding.UTF_8,
                outputEncoding: encode.Encoding.BASE_64
            })
        });
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

    const printKnkt = (rec, renderer, recordId, options) => {
        const dataJson = getDataKnkt(rec, recordId, options || {});
        renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: Template.DATA_ALIAS,
            data: dataJson
        });
        return dataJson;
    };

    const getDataKnkt = (rec, recordId, options) => {
        const tree = buildPhatHienTree(recordId, options);
        const ngayKy = getNgayKyVietNam();
        return {
            soBaoCao: libPrintFormat.asText(
                rec.getValue({fieldId: Knkt.HEADER_FIELD.REPORT_NUMBER})
            ),
            congTy: libPrintFormat.asText(
                printLookup.getSubsidiaryLegalName(
                    rec.getValue({fieldId: Knkt.HEADER_FIELD.SUBSIDIARY})
                )
            ),
            ngayPhatHanh: libPrintFormat.formatDate(
                rec.getValue({fieldId: Knkt.HEADER_FIELD.REPORT_DATE})
            ),
            donVi: libPrintFormat.asText(
                rec.getText({fieldId: Knkt.HEADER_FIELD.DEPARTMENT})
            ),
            ngayCapNhat: libPrintFormat.asText(tree.ngayCapNhat),
            ngayKy: ngayKy.ngayKy,
            thangKy: ngayKy.thangKy,
            namKy: ngayKy.namKy,
            phatHienList: tree.phatHienList
        };
    };

    const buildPhatHienTree = (recordId, options) => {
        const findingRows = getFindingRows(recordId);
        const findingEntries = findingRows.map((row, findingIndex) => ({
            id: row.id,
            output: {
                stt: String(findingIndex + 1),
                chiTietPhatHien: row.text,
                ngayThucHien: Knkt.EMPTY,
                ngayThucHienTruoc: Knkt.EMPTY,
                khuyenNghiList: []
            },
            recommendationById: new Map(),
            latest: {date: Knkt.EMPTY, dateSort: Knkt.EMPTY},
            previous: {date: Knkt.EMPTY, dateSort: Knkt.EMPTY}
        }));
        const findingById = new Map(
            findingEntries.map((entry) => [entry.id, entry])
        );
        const recommendationRows = getRecommendationRows(
            findingEntries.map((entry) => entry.id)
        );
        const recommendationEntries = [];

        recommendationRows.forEach((row) => {
            const findingEntry = findingById.get(row.findingId);
            if (!findingEntry) {
                return;
            }

            const output = {
                stt: Knkt.EMPTY,
                khuyenNghi: row.text,
                thoiHanPhanHoi: row.dueDate,
                ngayThucHien: Knkt.EMPTY,
                ngayThucHienTruoc: Knkt.EMPTY,
                tinhHinhThucHien: Knkt.EMPTY,
                tinhHinhThucHienTruoc: Knkt.EMPTY,
                ketQuaThucHien: Knkt.EMPTY,
                ketQuaThucHienTruoc: Knkt.EMPTY
            };
            const entry = {
                id: row.id,
                output,
                findingEntry,
                resultRows: []
            };
            findingEntry.recommendationById.set(row.id, entry);
            recommendationEntries.push(entry);
        });

        const resultRows = getResultRows(recommendationEntries.map((entry) => entry.id));
        resultRows.forEach((row) => {
            const recommendationEntry = recommendationEntries.find(
                (entry) => entry.id === row.recommendationId
            );
            if (recommendationEntry) {
                recommendationEntry.resultRows.push(row);
            }
        });

        recommendationEntries.forEach((entry) => finalizeRecommendation(entry));

        // FDD task06 Request List #6: bỏ khuyến nghị có kết quả mới nhất là
        // "đã hoàn thành". Lọc SAU finalize (cần biết kết quả mới nhất) và
        // TRƯỚC khi tính ngày/STT để các giá trị đó chỉ phản ánh dòng được in.
        const printedEntries = options && options.excludeCompleted
            ? recommendationEntries.filter((entry) => !isCompletedResult(entry.output.ketQuaThucHien))
            : recommendationEntries;

        const latest = {date: Knkt.EMPTY, dateSort: Knkt.EMPTY};
        printedEntries.forEach((entry) => {
            const findingEntry = entry.findingEntry;
            entry.output.stt = String(findingEntry.output.khuyenNghiList.length + 1);
            findingEntry.output.khuyenNghiList.push(entry.output);
            entry.resultRows.forEach((row) => {
                keepLatestValue(findingEntry.latest, row.ngayThucHien, row.ngayThucHienSort);
                keepLatestValue(latest, row.ngayThucHien, row.ngayThucHienSort);
            });
            if (entry.previousResult) {
                keepLatestValue(
                    findingEntry.previous,
                    entry.previousResult.ngayThucHien,
                    entry.previousResult.ngayThucHienSort
                );
            }
        });
        findingEntries.forEach((entry) => {
            entry.output.ngayThucHien = entry.latest.date;
            entry.output.ngayThucHienTruoc = entry.previous.date;
        });
        return {
            phatHienList: findingEntries.map((entry) => entry.output),
            ngayCapNhat: latest.date
        };
    };

    const getNgayKyVietNam = () => {
        const vietnamDate = new Date(Date.now() + Knkt.UTC_OFFSET_MILLISECONDS);
        return {
            ngayKy: libPrintFormat.padDatePart(vietnamDate.getUTCDate()),
            thangKy: libPrintFormat.padDatePart(vietnamDate.getUTCMonth() + 1),
            namKy: String(vietnamDate.getUTCFullYear())
        };
    };

    const getFindingRows = (recordId) => runTierSearch(
        Knkt.FINDING.RECORD_TYPE,
        [
            [Knkt.FINDING.PARENT, search.Operator.ANYOF, recordId],
            'AND',
            [Knkt.INACTIVE, search.Operator.IS, Knkt.ACTIVE_VALUE]
        ],
        [
            search.createColumn({name: Knkt.INTERNAL_ID, sort: search.Sort.ASC}),
            Knkt.FINDING.TEXT
        ],
        (result) => {
            const id = libPrintFormat.asText(result.getValue({name: Knkt.INTERNAL_ID}));
            return {
                id,
                sortId: toSortId(id),
                text: libPrintFormat.asText(result.getValue({name: Knkt.FINDING.TEXT}))
            };
        }
    );

    const getRecommendationRows = (findingIds) => {
        if (!findingIds.length) {
            return [];
        }

        return runTierSearch(
            Knkt.RECOMMENDATION.RECORD_TYPE,
            [
                [Knkt.RECOMMENDATION.PARENT, search.Operator.ANYOF, findingIds],
                'AND',
                [Knkt.INACTIVE, search.Operator.IS, Knkt.ACTIVE_VALUE]
            ],
            [
                search.createColumn({name: Knkt.INTERNAL_ID, sort: search.Sort.ASC}),
                Knkt.RECOMMENDATION.PARENT,
                Knkt.RECOMMENDATION.TEXT,
                Knkt.RECOMMENDATION.DUE_DATE
            ],
            (result) => {
                const id = libPrintFormat.asText(result.getValue({name: Knkt.INTERNAL_ID}));
                return {
                    id,
                    sortId: toSortId(id),
                    findingId: libPrintFormat.asText(
                        result.getValue({name: Knkt.RECOMMENDATION.PARENT})
                    ),
                    text: libPrintFormat.asText(
                        result.getValue({name: Knkt.RECOMMENDATION.TEXT})
                    ),
                    dueDate: normalizeSearchDate(
                        result.getValue({name: Knkt.RECOMMENDATION.DUE_DATE})
                    ).display
                };
            }
        );
    };

    const getResultRows = (recommendationIds) => {
        if (!recommendationIds.length) {
            return [];
        }

        return runTierSearch(
            Knkt.RESULT.RECORD_TYPE,
            [
                [Knkt.RESULT.PARENT, search.Operator.ANYOF, recommendationIds],
                'AND',
                [Knkt.INACTIVE, search.Operator.IS, Knkt.ACTIVE_VALUE]
            ],
            [
                search.createColumn({name: Knkt.INTERNAL_ID, sort: search.Sort.ASC}),
                Knkt.RESULT.PARENT,
                Knkt.RESULT.IMPLEMENTATION_STATUS,
                Knkt.RESULT.RESULT_TEXT,
                Knkt.RESULT.IMPLEMENTATION_DATE
            ],
            (result) => {
                const id = libPrintFormat.asText(result.getValue({name: Knkt.INTERNAL_ID}));
                const implementationDate = normalizeSearchDate(
                    result.getValue({name: Knkt.RESULT.IMPLEMENTATION_DATE})
                );
                return {
                    id,
                    sortId: toSortId(id),
                    recommendationId: libPrintFormat.asText(
                        result.getValue({name: Knkt.RESULT.PARENT})
                    ),
                    ngayThucHien: implementationDate.display,
                    ngayThucHienSort: implementationDate.sort,
                    tinhHinhThucHien: libPrintFormat.asText(
                        result.getValue({name: Knkt.RESULT.IMPLEMENTATION_STATUS})
                    ),
                    ketQuaThucHien: libPrintFormat.asText(
                        getResultText(result, Knkt.RESULT.RESULT_TEXT)
                    )
                };
            }
        );
    };

    const finalizeRecommendation = (recommendationEntry) => {
        const resultRows = recommendationEntry.resultRows.slice().sort((left, right) => {
            if (left.ngayThucHienSort !== right.ngayThucHienSort) {
                if (!left.ngayThucHienSort) return -1;
                if (!right.ngayThucHienSort) return 1;
                return left.ngayThucHienSort < right.ngayThucHienSort ? -1 : 1;
            }
            return left.sortId - right.sortId;
        });
        const latestResult = resultRows[resultRows.length - 1];
        const previousResult = resultRows[resultRows.length - 2];

        if (latestResult) {
            recommendationEntry.output.tinhHinhThucHien = latestResult.tinhHinhThucHien;
            recommendationEntry.output.ketQuaThucHien = latestResult.ketQuaThucHien;
            recommendationEntry.output.ngayThucHien = latestResult.ngayThucHien;
        }
        if (previousResult) {
            recommendationEntry.output.tinhHinhThucHienTruoc =
                previousResult.tinhHinhThucHien;
            recommendationEntry.output.ketQuaThucHienTruoc =
                previousResult.ketQuaThucHien;
            recommendationEntry.output.ngayThucHienTruoc = previousResult.ngayThucHien;
            recommendationEntry.previousResult = previousResult;
        }
    };

    const normalizeResultText = (value) => {
        const text = libPrintFormat.asText(value).trim().replace(/\s+/g, ' ').toLowerCase();
        return typeof text.normalize === 'function' ? text.normalize('NFC') : text;
    };

    const isCompletedResult = (ketQuaThucHien) =>
        Knkt.COMPLETED_RESULT_TEXTS.includes(normalizeResultText(ketQuaThucHien));

    const runTierSearch = (type, filters, columns, mapResult) => {
        const rows = [];
        search.create({type, filters, columns}).run().each((result) => {
            rows.push(mapResult(result));
            return true;
        });
        return rows;
    };

    const getPdfPrintFile = (printFileName) => Knkt.PRINT_FILES.includes(printFileName)
        ? printFileName
        : Knkt.PRINT_FILE;

    // Only a printfile registered in Knkt.WORD_TEMPLATE may be rendered; the
    // parameter comes from the query string, so an unknown value falls back to
    // the default template instead of reaching file.load().
    const getWordPrintFile = (printFileName) =>
        Object.prototype.hasOwnProperty.call(Knkt.WORD_TEMPLATE, printFileName)
            ? printFileName
            : Knkt.DEFAULT_WORD_PRINT_FILE;

    const getWordTemplate = (wordPrintFile) =>
        Knkt.WORD_TEMPLATE[wordPrintFile] || Knkt.WORD_TEMPLATE[Knkt.DEFAULT_WORD_PRINT_FILE];

    const toSortId = (value) => {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? numericValue : 0;
    };

    const normalizeSearchDate = (value) => {
        if (value === null || value === undefined || value === '') {
            return {display: Knkt.EMPTY, sort: Knkt.EMPTY};
        }

        if (value instanceof Date) {
            const dateParts = libPrintFormat.getDateParts(value);
            return {
                display: libPrintFormat.formatDate(value),
                sort: dateParts.nam + dateParts.thang + dateParts.ngay
            };
        }

        const text = libPrintFormat.asText(value).trim();
        try {
            const parsedDate = format.parse({
                value: text,
                type: format.Type.DATE
            });
            const dateParts = libPrintFormat.getDateParts(parsedDate);
            return {
                display: libPrintFormat.formatDate(parsedDate),
                sort: dateParts.nam + dateParts.thang + dateParts.ngay
            };
        } catch (error) {
            const parts = text.split(/[/-]/);
            if (parts.length !== 3) {
                return {display: text, sort: Knkt.EMPTY};
            }

            const yearFirst = parts[0].length === 4;
            const year = yearFirst ? parts[0] : parts[2];
            const month = yearFirst ? parts[1] : parts[1];
            const day = yearFirst ? parts[2] : parts[0];
            const paddedDay = libPrintFormat.padDatePart(day);
            const paddedMonth = libPrintFormat.padDatePart(month);
            return {
                display: paddedDay + '/' + paddedMonth + '/' + year,
                sort: year + paddedMonth + paddedDay
            };
        }
    };

    const getResultText = (result, fieldId) => {
        try {
            return result.getText({name: fieldId}) || result.getValue({name: fieldId});
        } catch (error) {
            return result.getValue({name: fieldId});
        }
    };

    const keepLatestValue = (tracker, dateValue, dateSort) => {
        if (!dateSort || tracker.dateSort >= dateSort) {
            return;
        }
        tracker.date = dateValue;
        tracker.dateSort = dateSort;
    };

    return {onRequest, renderRecordToPdf, renderRecordToWord};
});
