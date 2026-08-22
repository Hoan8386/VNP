/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/search',
    'N/render',
    'N/file',
    'N/encode',
    'N/log',
    'N/record',
    'N/format',
    '../lib/scv_lib_pdf.js',
    '../lib/scv_lib_print_format.js',
    '../common/scv_common_print_lookup.js',
    '../cons/scv_cons_file.js',
    '../cons/scv_cons_print.js'
], (
    search,
    render,
    file,
    encode,
    log,
    record,
    format,
    libPdf,
    libPrintFormat,
    printLookup,
    consFile,
    consPrint
) => {
    const UrlParameter = consPrint.UrlParameter;
    const Template = consPrint.Template;
    const Knkt = consPrint.Knkt;

    const addDefaultRecordRender = (renderer, recordType, recordId) => {
        const rec = record.load({
            type: recordType,
            id: recordId,
            isDynamic: false
        });
        renderer.addRecord(Template.RECORD_ALIAS, rec);
        return rec;
    };

    const getResultText = (result, fieldId) => {
        try {
            return result.getText({name: fieldId}) || result.getValue({name: fieldId});
        } catch (error) {
            return result.getValue({name: fieldId});
        }
    };

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

    const runTierSearch = (type, filters, columns, mapResult) => {
        const rows = [];
        search.create({type, filters, columns}).run().each((result) => {
            rows.push(mapResult(result));
            return true;
        });
        return rows;
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

    const keepLatestValue = (tracker, dateValue, dateSort) => {
        if (!dateSort || tracker.dateSort >= dateSort) {
            return;
        }
        tracker.date = dateValue;
        tracker.dateSort = dateSort;
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
        }
        if (previousResult) {
            recommendationEntry.output.tinhHinhThucHienTruoc =
                previousResult.tinhHinhThucHien;
            recommendationEntry.output.ketQuaThucHienTruoc =
                previousResult.ketQuaThucHien;
            keepLatestValue(
                recommendationEntry.findingEntry.previous,
                previousResult.ngayThucHien,
                previousResult.ngayThucHienSort
            );
        }
    };

    const buildPhatHienTree = (recordId) => {
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
                stt: String(findingEntry.output.khuyenNghiList.length + 1),
                khuyenNghi: row.text,
                thoiHanPhanHoi: row.dueDate,
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
            findingEntry.output.khuyenNghiList.push(output);
            recommendationEntries.push(entry);
        });

        const resultRows = getResultRows(recommendationEntries.map((entry) => entry.id));
        resultRows.forEach((row) => {
            const recommendationEntry = recommendationEntries.find(
                (entry) => entry.id === row.recommendationId
            );
            if (!recommendationEntry) {
                return;
            }
            recommendationEntry.resultRows.push(row);
            keepLatestValue(
                recommendationEntry.findingEntry.latest,
                row.ngayThucHien,
                row.ngayThucHienSort
            );
        });

        recommendationEntries.forEach((entry) => finalizeRecommendation(entry));
        findingEntries.forEach((entry) => {
            entry.output.ngayThucHien = entry.latest.date;
            entry.output.ngayThucHienTruoc = entry.previous.date;
        });

        const latest = {date: Knkt.EMPTY, dateSort: Knkt.EMPTY};
        resultRows.forEach((row) => {
            keepLatestValue(latest, row.ngayThucHien, row.ngayThucHienSort);
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

    const getDataKnkt = (rec, recordId) => {
        const tree = buildPhatHienTree(recordId);
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

    const printKnkt = (rec, renderer, recordId) => {
        const dataJson = getDataKnkt(rec, recordId);
        renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: Template.DATA_ALIAS,
            data: dataJson
        });
        return dataJson;
    };

    const getPdfPrintFile = (printFileName) => Knkt.PRINT_FILES.includes(printFileName)
        ? printFileName
        : Knkt.PRINT_FILE;

    const getWordPrintFile = (printFileName) => Knkt.WORD_PRINT_FILES.includes(printFileName)
        ? printFileName
        : Knkt.WORD_PRINT_FILE;

    const renderRecordToPdf = (recordId, printFileName) => {
        const renderer = libPdf.renderTemplateWithXml(getPdfPrintFile(printFileName));
        const rec = addDefaultRecordRender(renderer, Knkt.RECORD_TYPE, recordId);
        printKnkt(rec, renderer, recordId);
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
        const dataJson = printKnkt(rec, renderer, recordId);
        const wordFilePrefix = wordPrintFile === Knkt.WORD_PRINT_FILE_LAN_2
            ? Knkt.WORD_PREFIX_LAN_2
            : Knkt.WORD_PREFIX;
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

    return {onRequest, renderRecordToPdf, renderRecordToWord};
});
