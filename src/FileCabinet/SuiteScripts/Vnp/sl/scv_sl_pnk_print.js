/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/log', 'N/record', 'N/render',
    '../lib/scv_lib_pdf.js',
    '../lib/scv_lib_print_format.js',
    '../common/scv_common_print_lookup.js',
    '../cons/scv_cons_print.js'
], (log, record, render, libPdf, libPrintFormat, printLookup, consPrint) => {
    const {UrlParameter, Template, Pnk} = consPrint;

    // Giá trị coi như "chưa tick" mà KHÔNG cần diễn giải thêm: checkbox chưa check,
    // hoặc ô rỗng. Mọi giá trị khác không khớp bộ quy tắc truyền vào resolveMarks
    // đều được ghi vào chẩn đoán để đối chiếu với dữ liệu thật.
    const NEUTRAL_RESULTS = [false, 'F', '', null, undefined];

    const onRequest = (scriptContext) => {
        try {
            const params = scriptContext.request.parameters || {};
            const recordId = params[UrlParameter.RECORD_ID];
            const requestedPrintFile = params[UrlParameter.PRINT_FILE];
            const requestedRecordType = params[UrlParameter.RECORD_TYPE];
            if (!recordId) throw businessError('Thiếu ID Item Receipt.');
            if (requestedRecordType && requestedRecordType !== Pnk.DEFAULT_RECORD_TYPE) {
                log.error({title: 'PNK rejected record type', details: requestedRecordType});
                return writeError(scriptContext, 'Loại chứng từ không hợp lệ cho mẫu PNK.');
            }
            if (requestedPrintFile && requestedPrintFile !== Pnk.PRINT_FILE) {
                log.error({title: 'PNK rejected printfile', details: requestedPrintFile});
                return writeError(scriptContext, 'Tham số mẫu in không hợp lệ.');
            }
            const pdf = renderRecordToPdf(recordId);
            scriptContext.response.writeFile({file: pdf, isInline: true});
        } catch (error) {
            log.error({title: 'PNK print failed', details: error});
            writeError(scriptContext, error.userMessage || error.message || String(error));
        }
    };

    const renderRecordToPdf = (recordId) => {
        const ir = loadRequired(Pnk.DEFAULT_RECORD_TYPE, recordId, 'Item Receipt');
        const diagnostics = [];
        try {
            const pknCache = Object.create(null);
            const data = buildData(ir, diagnostics, pknCache);
            const renderer = libPdf.renderTemplateWithXml(Pnk.PRINT_FILE);
            renderer.addRecord(Template.RECORD_ALIAS, ir);
            renderer.addCustomDataSource({format: render.DataSource.OBJECT, alias: Template.DATA_ALIAS, data});
            // S\u1ed1 \u00f4 \u0111\u01b0\u1ee3c tick, ghi k\u00e8m ch\u1ea9n \u0111o\u00e1n: \u0111\u1ed1i chi\u1ebfu nhanh v\u1edbi b\u1ea3n in m\u00e0 kh\u00f4ng
            // ph\u1ea3i d\u1ef1ng l\u1ea1i to\u00e0n b\u1ed9 XML.
            diagnostics.push({
                field: 'tickCount',
                status: 'thong_ke',
                chungTu: data.chungTu.filter((row) => row.tick).length,
                hangHoa: data.hangHoa.reduce((total, row) => total
                    + row.tieuChi.filter((cell) => cell.tick || cell.untick).length, 0)
            });
            return renderer.renderAsPdf();
        } finally {
            logDiagnostics(diagnostics, recordId);
        }
    };

    const buildData = (ir, diagnostics, pknCache) => {
        const locations = new Set();
        const itemCache = {};
        const lines = [];
        const documentRows = [];
        const count = ir.getLineCount({sublistId: Pnk.SUBLIST_ID});

        for (let line = 0; line < count; line += 1) {
            const locationId = text(ir.getSublistValue({sublistId: Pnk.SUBLIST_ID, fieldId: Pnk.LINE_FIELD.LOCATION, line}));
            if (locationId) locations.add(locationId);
            const pknId = text(ir.getSublistValue({sublistId: Pnk.SUBLIST_ID, fieldId: Pnk.LINE_FIELD.INSPECTION_NUMBER, line}));
            let pkn = null;
            if (pknId) {
                pkn = pknCache[pknId] || (pknCache[pknId] = loadRequired(Pnk.PKN.RECORD_TYPE, pknId, 'Phiếu kiểm nhận'));
                mergeDocumentRows(documentRows, readDocumentRows(pkn, diagnostics), diagnostics);
            } else {
                diagnostics.push({
                    field: Pnk.LINE_FIELD.INSPECTION_NUMBER,
                    source: Pnk.SUBLIST_ID,
                    recordId: ir.id,
                    line,
                    status: 'rong'
                });
            }
            const itemId = text(ir.getSublistValue({sublistId: Pnk.SUBLIST_ID, fieldId: Pnk.LINE_FIELD.ITEM, line}));
            const itemName = itemId && (itemCache[itemId] || (itemCache[itemId] = safeField('item', itemId, 'displayname')));
            const assignments = readAssignments(ir, line, diagnostics);
            if (!assignments.length) {
                lines.push(makeLine(ir, line, itemName, '', '', pkn, diagnostics, ''));
            } else {
                assignments.forEach((a) => lines.push(makeLine(ir, line, itemName, a.lot, a.expiry, pkn, diagnostics, a.lot)));
            }
        }

        // Mẫu PNK chỉ in được địa chỉ và bốn khối chữ ký của MỘT kho. Nhiều kho trên
        // cùng phiếu là tình huống FDD chưa quy định — dừng, không chọn đại một kho.
        if (locations.size > 1) {
            diagnostics.push({
                field: Pnk.LINE_FIELD.LOCATION,
                source: Pnk.SUBLIST_ID,
                recordId: ir.id,
                status: 'nhieu_gia_tri',
                values: Array.from(locations)
            });
            throw businessError(
                'Item Receipt có nhiều Location khác nhau trên các dòng hàng (ID: '
                + Array.from(locations).join(', ')
                + '). Mẫu Phiếu nhập kho chỉ in được một kho — cần tách phiếu hoặc thống nhất Location.'
            );
        }
        if (locations.size === 0) {
            diagnostics.push({
                field: Pnk.LINE_FIELD.LOCATION,
                source: Pnk.SUBLIST_ID,
                recordId: ir.id,
                status: 'rong'
            });
        }

        const locationId = Array.from(locations)[0] || '';
        const locationData = {address: '', pharmacist: '', storekeeper: '', qualityControl: ''};
        if (locationId) {
            const location = loadRequired('location', locationId, 'Location');
            locationData.address = optional(location, Pnk.LOCATION.ADDRESS, diagnostics, 'Location', locationId);
            locationData.pharmacist = optional(location, Pnk.LOCATION.PHARMACIST, diagnostics, 'Location', locationId);
            locationData.storekeeper = optional(location, Pnk.LOCATION.STOREKEEPER, diagnostics, 'Location', locationId);
            locationData.qualityControl = optional(location, Pnk.LOCATION.QUALITY_CONTROL, diagnostics, 'Location', locationId);
        }
        const entityId = text(ir.getValue({fieldId: Pnk.FIELD.ENTITY}));
        let entityName = '';
        if (entityId) entityName = text(printLookup.getEntityLegalName(safeRequiredField('entity', entityId, 'recordtype'), entityId));
        const date = libPrintFormat.getDateParts(ir.getValue({fieldId: Pnk.FIELD.TRANSACTION_DATE}));

        const criteriaColumns = receiptCriteria(lines, diagnostics);
        alignLineCriteria(lines, criteriaColumns);

        return {
            ngay: date.ngay, thang: date.thang, nam: date.nam,
            soPhieu: text(ir.getValue({fieldId: Pnk.FIELD.TRANSACTION_ID})),
            benGiaoHang: entityName, kho: locationData,
            // Cùng lý do như line.tieuChi: đổi boolean thành chuỗi ở biên giới template.
            // Gộp/so sánh giữa các PKN đã xong ở mergeDocumentRows nên đổi ở đây là an toàn.
            chungTu: documentRows.map((row) => ({
                criteriaId: row.criteriaId,
                criteriaLabel: row.criteriaLabel,
                pknId: row.pknId,
                tick: row.tick ? Pnk.RESULT.TICK_GLYPH : '',
                untick: row.untick ? Pnk.RESULT.TICK_GLYPH : ''
            })),
            hangHoa: lines,
            tieuChiNhan: criteriaColumns,
            ketLuan: optional(ir, Pnk.FIELD.CONCLUSION, diagnostics, 'Item Receipt', ir.id),
            nguoiGiaoHang: ''
        };
    };

    const makeLine = (ir, line, itemName, lot, expiry, pkn, diagnostics, lotKey) => {
        const itemId = text(ir.getSublistValue({sublistId: Pnk.SUBLIST_ID, fieldId: Pnk.LINE_FIELD.ITEM, line}));
        return {
            stt: '',
            tenHang: text(ir.getSublistValue({sublistId: Pnk.SUBLIST_ID, fieldId: Pnk.LINE_FIELD.DESCRIPTION, line})) || itemName,
            nongDo: itemId ? safeField('item', itemId, 'custitem_scv_nongdo_hamluong') : '',
            dvt: text(ir.getSublistValue({sublistId: Pnk.SUBLIST_ID, fieldId: Pnk.LINE_FIELD.UNITS_DISPLAY, line})) || text(ir.getSublistText({sublistId: Pnk.SUBLIST_ID, fieldId: Pnk.LINE_FIELD.UNITS, line})),
            soLo: lot, hanDung: expiry,
            // Thứ tự gốc theo dòng sublist PKN — dùng để dựng thứ tự cột ở receiptCriteria().
            tieuChiRows: readReceiptCriteria(pkn, lotKey, diagnostics),
            tieuChi: [],
            pknId: pkn ? pkn.id : ''
        };
    };

    /**
     * Gom assignment theo số lô trong phạm vi MỘT dòng hàng.
     * Cùng lô + cùng hạn dùng => một dòng in (lô bị tách theo bin/status).
     * Cùng lô nhưng khác hạn dùng => giữ riêng, vì dữ liệu in đã khác nhau.
     */
    const readAssignments = (ir, line, diagnostics) => {
        let detail;
        try { detail = ir.getSublistSubrecord({sublistId: Pnk.SUBLIST_ID, fieldId: Pnk.SUBRECORD.INVENTORY_DETAIL, line}); }
        catch (e) { diagnostics.push({field: 'inventorydetail', status: 'khong_doc_duoc', line, error: String(e)}); return []; }
        if (!detail) { log.debug({title: 'PNK line has no inventory detail', details: line}); return []; }
        try {
            const count = detail.getLineCount({sublistId: Pnk.SUBRECORD.INVENTORY_ASSIGNMENT});
            const merged = [];
            for (let i = 0; i < count; i += 1) {
                const lot = text(detail.getSublistText({sublistId: Pnk.SUBRECORD.INVENTORY_ASSIGNMENT, fieldId: Pnk.SUBRECORD.RECEIPT_INVENTORY_NUMBER, line: i})) || text(detail.getSublistValue({sublistId: Pnk.SUBRECORD.INVENTORY_ASSIGNMENT, fieldId: Pnk.SUBRECORD.RECEIPT_INVENTORY_NUMBER, line: i}));
                const rawDate = text(detail.getSublistValue({sublistId: Pnk.SUBRECORD.INVENTORY_ASSIGNMENT, fieldId: Pnk.SUBRECORD.EXPIRATION_DATE, line: i}));
                const date = rawDate ? libPrintFormat.getDateParts(rawDate) : null;
                const expiry = date ? date.thang + '/' + date.nam : '';

                const sameLot = merged.filter((row) => row.lot === lot);
                if (!sameLot.length) { merged.push({lot, expiry}); continue; }
                if (sameLot.some((row) => row.expiry === expiry)) continue; // gộp: chỉ khác bin/status
                diagnostics.push({
                    field: Pnk.SUBRECORD.EXPIRATION_DATE,
                    source: Pnk.SUBRECORD.INVENTORY_ASSIGNMENT,
                    line,
                    lot,
                    status: 'lo_trung_khac_han_dung',
                    values: sameLot.map((row) => row.expiry).concat([expiry])
                });
                merged.push({lot, expiry});
            }
            return merged;
        } catch (e) {
            diagnostics.push({field: 'inventoryassignment', status: 'khong_doc_duoc', line, error: String(e)});
            return [];
        }
    };

    const readReceiptCriteria = (pkn, lotKey, diagnostics) => {
        const result = [];
        if (!pkn) return result;
        let count;
        try {
            count = pkn.getLineCount({sublistId: Pnk.PKN.RECEIPT_SUBLIST});
        } catch (e) {
            [Pnk.PKN.RECEIPT_RESULT, Pnk.PKN.RECEIPT_LOT].forEach((field) => diagnostics.push({
                field, source: Pnk.PKN.RECEIPT_SUBLIST, recordId: pkn.id,
                status: 'khong_doc_duoc', error: String(e)
            }));
            return result;
        }
        const resultField = resolveResultFieldId(pkn, Pnk.PKN.RECEIPT_SUBLIST, Pnk.PKN.RECEIPT_RESULT,
            Pnk.RESULT.RECEIPT_PASS_VALUES, Pnk.RESULT.RECEIPT_FAIL_VALUES, diagnostics);
        for (let line = 0; line < count; line += 1) {
            const criteriaId = text(pkn.getSublistValue({sublistId: Pnk.PKN.RECEIPT_SUBLIST, fieldId: Pnk.PKN.RECEIPT_CRITERIA, line}));
            const criteriaLabel = sublistLabel(pkn, Pnk.PKN.RECEIPT_SUBLIST, Pnk.PKN.RECEIPT_CRITERIA, line);
            const resultCell = optionalSublistCell(pkn, Pnk.PKN.RECEIPT_SUBLIST, resultField, line, diagnostics, pkn.id);
            const lotCell = optionalSublistCell(pkn, Pnk.PKN.RECEIPT_SUBLIST, Pnk.PKN.RECEIPT_LOT, line, diagnostics, pkn.id);
            // Quy tắc người dùng chốt: kết quả thuộc PKN của dòng Item Receipt,
            // áp dụng cho mọi lô của dòng đó. Lot Number chỉ giữ để chẩn đoán.
            const marks = resolveMarks(resultCell, resultField, Pnk.PKN.RECEIPT_SUBLIST, diagnostics, Pnk.RESULT.RECEIPT_PASS_VALUES, Pnk.RESULT.RECEIPT_FAIL_VALUES);
            diagnostics.push({
                kind: 'nhan_hang', pknId: pkn.id, line: line + 1, resultField,
                criteriaId, criteriaLabel, printLot: text(lotKey),
                resultStatus: resultCell.status, resultValue: resultCell.rawValue,
                resultType: resultCell.valueType, resultText: resultCell.text,
                lotStatus: lotCell.status, lotValue: lotCell.rawValue, lotText: lotCell.text,
                scope: 'pkn_cua_dong_hang', tick: marks.tick, untick: marks.untick,
                reason: markReason(resultCell, marks)
            });
            result.push({
                criteriaId,
                criteriaLabel: criteriaLabel || criteriaId,
                sourceLine: line,
                tick: marks.tick,
                untick: marks.untick
            });
        }
        return result;
    };

    const readDocumentRows = (pkn, diagnostics) => {
        const result = [];
        const count = pkn.getLineCount({sublistId: Pnk.PKN.DOCUMENT_SUBLIST});
        for (let line = 0; line < count; line += 1) {
            const criteriaId = text(pkn.getSublistValue({sublistId: Pnk.PKN.DOCUMENT_SUBLIST, fieldId: Pnk.PKN.DOCUMENT_CRITERIA, line}));
            const criteriaLabel = sublistLabel(pkn, Pnk.PKN.DOCUMENT_SUBLIST, Pnk.PKN.DOCUMENT_CRITERIA, line);
            const resultCell = optionalSublistCell(pkn, Pnk.PKN.DOCUMENT_SUBLIST, Pnk.PKN.DOCUMENT_RESULT, line, diagnostics, pkn.id);
            const marks = resolveMarks(resultCell, Pnk.PKN.DOCUMENT_RESULT, Pnk.PKN.DOCUMENT_SUBLIST, diagnostics, Pnk.RESULT.DOCUMENT_TICK_VALUES, []);
            diagnostics.push({
                kind: 'chung_tu', pknId: pkn.id, line: line + 1,
                criteriaId, criteriaLabel,
                resultStatus: resultCell.status, resultValue: resultCell.rawValue,
                resultType: resultCell.valueType, resultText: resultCell.text,
                tick: marks.tick, reason: markReason(resultCell, marks)
            });
            result.push({
                criteriaId,
                criteriaLabel: criteriaLabel || criteriaId,
                tick: marks.tick,
                untick: marks.untick,
                pknId: pkn.id
            });
        }
        return result;
    };

    /**
     * Gộp bảng chứng từ của nhiều PKN. Khoá gộp là ID tiêu chí, không phải nhãn.
     * Cùng tiêu chí mà khác kết quả => dừng, không tự tổng hợp.
     */
    const mergeDocumentRows = (target, source, diagnostics) => {
        source.forEach((row) => {
            const existing = target.filter((item) => item.criteriaId === row.criteriaId)[0];
            if (!existing) { target.push(row); return; }
            if (existing.tick === row.tick && existing.untick === row.untick) return;
            diagnostics.push({
                field: Pnk.PKN.DOCUMENT_RESULT,
                source: Pnk.PKN.DOCUMENT_SUBLIST,
                criteriaId: row.criteriaId,
                status: 'xung_dot_giua_cac_pkn',
                values: [
                    {pknId: existing.pknId, tick: existing.tick, untick: existing.untick},
                    {pknId: row.pknId, tick: row.tick, untick: row.untick}
                ]
            });
            throw businessError(
                'Các Phiếu kiểm nhận trên phiếu nhập này cho kết quả khác nhau ở tiêu chí "'
                + (row.criteriaLabel || row.criteriaId) + '": PKN ' + existing.pknId
                + ' và PKN ' + row.pknId + '. Cần thống nhất trước khi in.'
            );
        });
    };

    /**
     * Dựng danh sách cột tiêu chí nhận hàng TỪ DỮ LIỆU PKN.
     * Thứ tự theo dòng sublist của PKN đầu tiên đọc được; tiêu chí mới xuất hiện ở
     * PKN sau được nối vào cuối. Không dùng nhãn làm khoá.
     */
    const receiptCriteria = (lines, diagnostics) => {
        const columns = [];
        const seen = {};
        lines.forEach((line) => (line.tieuChiRows || []).forEach((row) => {
            if (!row.criteriaId || seen[row.criteriaId]) return;
            seen[row.criteriaId] = true;
            columns.push({
                id: row.criteriaId,
                label: row.criteriaLabel,
                positiveLabel: Pnk.RESULT.POSITIVE_LABEL_BY_CRITERIA[row.criteriaLabel]
                    || Pnk.RESULT.POSITIVE_LABEL,
                negativeLabel: Pnk.RESULT.NEGATIVE_LABEL
            });
        }));
        if (columns.length) return columns;

        diagnostics.push({
            field: Pnk.PKN.RECEIPT_CRITERIA,
            source: Pnk.PKN.RECEIPT_SUBLIST,
            status: 'dung_fallback_nhan_tieu_chi'
        });
        return Pnk.RECEIPT_CRITERIA_FALLBACK_LABELS.map((entry) => ({
            id: '',
            label: entry.label,
            positiveLabel: entry.positiveLabel || Pnk.RESULT.POSITIVE_LABEL,
            negativeLabel: Pnk.RESULT.NEGATIVE_LABEL
        }));
    };

    /** Xếp kết quả của từng dòng hàng đúng thứ tự cột, khớp bằng criteriaId. */
    const alignLineCriteria = (lines, columns) => {
        lines.forEach((line) => {
            const byId = Object.create(null);
            (line.tieuChiRows || []).forEach((row) => {
                const previous = byId[row.criteriaId];
                if (previous && (previous.tick !== row.tick || previous.untick !== row.untick)) {
                    throw businessError('PKN ' + line.pknId + ', lô ' + line.soLo
                        + ': tiêu chí "' + row.criteriaLabel + '" có kết quả trùng nhưng khác nhau.');
                }
                byId[row.criteriaId] = row;
            });
            // Ra khỏi đây là biên giới sang template: đổi boolean thành chuỗi.
            // render.DataSource.OBJECT nuốt mất field boolean (xem Pnk.RESULT.TICK_GLYPH).
            // Chuỗi rỗng vẫn falsy nên thống kê tickCount phía dưới không đổi nghĩa.
            line.tieuChi = columns.map((column) => {
                const row = column.id ? byId[column.id] : null;
                return {
                    tick: row && row.tick ? Pnk.RESULT.TICK_GLYPH : '',
                    untick: row && row.untick ? Pnk.RESULT.TICK_GLYPH : ''
                };
            });
            delete line.tieuChiRows;
        });
    };

    /**
     * Quyết định tick dựa trên danh sách giá trị khai tường minh trong cons.
     * KHÔNG dùng kiểm tra truthy. Giá trị lạ => không tick + ghi chẩn đoán.
     */
    const resolveMarks = (cell, fieldId, source, diagnostics, passValues, failValues) => {
        if (cell.status !== 'co_gia_tri') return {tick: false, untick: false};
        if (matchesAny(passValues, cell)) return {tick: true, untick: false};
        if (matchesAny(failValues, cell)) return {tick: false, untick: true};
        if (NEUTRAL_RESULTS.indexOf(cell.value) === -1) {
            noteUnknownResult(diagnostics, fieldId, source, cell);
        }
        return {tick: false, untick: false};
    };

    /**
     * Tìm field ID thật của cột "Kết quả" trên sublist.
     *
     * Lý do phải dò thay vì tin hằng số: ID trong cons lấy từ FDD và CHƯA từng
     * được xác minh trên account, mà FDD đã sai một lần rồi (mục "Số lô": FDD ghi
     * issueinventorynumber, hệ thống thật dùng receiptinventorynumber).
     *
     * Cách dò: ưu tiên ID đang cấu hình; nếu ID đó không đọc ra được giá trị nào
     * nhận diện được ("Đạt" / "Không đạt") thì liệt kê field của sublist và lấy
     * field đầu tiên có ô mang đúng một trong hai giá trị đó. ID dò được luôn được
     * ghi vào chẩn đoán để sau chốt cứng lại vào cons và bỏ hẳn bước dò này.
     */
    const resolveResultFieldId = (pkn, sublistId, configuredId, passValues, failValues, diagnostics) => {
        let count = 0;
        try { count = pkn.getLineCount({sublistId}); }
        catch (e) { return configuredId; }
        if (!count) return configuredId;

        const recognises = (fieldId) => {
            for (let line = 0; line < count; line += 1) {
                const cell = readSublistCell(pkn, sublistId, fieldId, line);
                if (cell.status !== 'co_gia_tri') continue;
                if (matchesAny(passValues, cell) || matchesAny(failValues, cell)) return true;
            }
            return false;
        };

        if (recognises(configuredId)) return configuredId;

        let fields = [];
        try { fields = pkn.getSublistFields({sublistId}) || []; }
        catch (e) {
            diagnostics.push({field: configuredId, source: sublistId, recordId: pkn.id,
                status: 'khong_liet_ke_duoc_field', error: String(e)});
            return configuredId;
        }
        // Loại các field đã biết vai trò để không nhầm cột tiêu chí thành cột kết quả.
        const skip = [configuredId, Pnk.PKN.RECEIPT_CRITERIA, Pnk.PKN.RECEIPT_LOT];
        const found = fields.filter((fieldId) =>
            String(fieldId).indexOf('custrecord') === 0 && skip.indexOf(fieldId) === -1
        ).find(recognises);

        diagnostics.push({
            field: configuredId, source: sublistId, recordId: pkn.id,
            status: found ? 'field_ket_qua_do_duoc' : 'field_ket_qua_khong_do_duoc',
            configuredId, resolvedId: found || '', sublistFields: fields
        });
        return found || configuredId;
    };

    const matchesAny = (candidates, cell) => (candidates || []).some((candidate) =>
        candidate === cell.value
        || String(candidate) === String(cell.value)
        || (cell.text !== '' && String(candidate) === String(cell.text)));

    const noteUnknownResult = (diagnostics, fieldId, source, cell) => {
        const signature = 'ket_qua_la|' + fieldId + '|' + String(cell.value) + '|' + String(cell.text);
        if (diagnostics.some((item) => item.signature === signature)) return;
        diagnostics.push({
            signature, field: fieldId, source,
            status: 'gia_tri_ket_qua_chua_biet',
            resultValue: cell.value, resultText: cell.text
        });
    };

    // Đọc một ô sublist, KHÔNG ghi chẩn đoán. Dùng cho vòng dò field ID ở
    // resolveResultFieldId() — nếu ghi chẩn đoán ở đó thì mỗi lần dò sẽ đẻ ra
    // hàng chục bản ghi rác che mất dòng cần đọc.
    const readSublistCell = (rec, sublistId, fieldId, line) => {
        try {
            const value = rec.getSublistValue({sublistId, fieldId, line});
            let label = '';
            let textError = '';
            try { label = text(rec.getSublistText({sublistId, fieldId, line})); }
            catch (error) { textError = String(error); }
            const status = value === null || value === undefined ? 'khong_doc_duoc' : (text(value) === '' ? 'rong' : 'co_gia_tri');
            return {
                value: status === 'khong_doc_duoc' ? '' : value,
                text: label,
                status,
                rawValue: value === undefined ? null : value,
                valueType: value === null ? 'null' : typeof value,
                textError
            };
        } catch (e) {
            return {value: '', text: '', status: 'khong_doc_duoc', rawValue: null, valueType: 'read_error', textError: '', error: String(e)};
        }
    };

    const optionalSublistCell = (rec, sublistId, fieldId, line, diagnostics, recordId) => {
        const cell = readSublistCell(rec, sublistId, fieldId, line);
        const entry = {field: fieldId, source: sublistId, recordId, line, status: cell.status,
            value: cell.rawValue, valueType: cell.valueType, text: cell.text, textError: cell.textError};
        if (cell.error) entry.error = cell.error;
        diagnostics.push(entry);
        return cell;
    };

    const sublistLabel = (rec, sublistId, fieldId, line) => {
        try { return text(rec.getSublistText({sublistId, fieldId, line})); }
        catch (e) { return ''; }
    };

    const optional = (rec, fieldId, diagnostics, source, recordId) => {
        try {
            const value = rec.getValue({fieldId});
            const label = rec.getText ? rec.getText({fieldId}) : '';
            const selected = text(label) && text(label) !== text(value) ? label : value;
            const status = selected === null || selected === undefined ? 'khong_doc_duoc' : (text(selected) === '' ? 'rong' : 'co_gia_tri');
            diagnostics.push({field: fieldId, source, recordId, status});
            return status === 'co_gia_tri' ? text(selected) : '';
        } catch (e) {
            diagnostics.push({field: fieldId, source, recordId, status: 'khong_doc_duoc', error: String(e)});
            return '';
        }
    };

    const safeField = (type, id, fieldId) => id ? text(libPrintFormat.getSafeFieldValue(type, id, fieldId)) : '';
    const safeRequiredField = (type, id, fieldId) => {
        const value = safeField(type, id, fieldId);
        if (!value) throw businessError('Không xác định được loại entity của bên giao hàng.');
        return value;
    };
    const loadRequired = (type, id, label) => {
        try { return record.load({type, id, isDynamic: false}); }
        catch (e) { throw businessError('Không thể đọc ' + label + ' (' + id + ').', e); }
    };
    const businessError = (message, cause) => { const e = new Error(message); e.userMessage = message; e.cause = cause; return e; };
    const markReason = (cell, marks) => {
        if (marks.tick) return 'tick_dat_hoac_da_chon';
        if (marks.untick) return 'tick_khong_dat';
        if (cell.status === 'khong_doc_duoc') return 'khong_doc_duoc_ket_qua';
        if (cell.status === 'rong') return 'ket_qua_rong';
        if (NEUTRAL_RESULTS.indexOf(cell.value) !== -1) return 'ket_qua_chua_chon';
        return 'ket_qua_chua_nhan_dien';
    };

    // Deployment giữ Error. Tách từng mục và giới hạn độ dài để không mất đuôi JSON.
    // run phân biệt các lần in; chỉ loại bản ghi trùng hoàn toàn trong cùng request.
    const logDiagnostics = (items, recordId) => {
        const run = text(recordId) + '-' + Date.now();
        const seen = new Set();
        items.forEach((item) => {
            const details = JSON.stringify(item);
            if (seen.has(details)) return;
            seen.add(details);
            const parts = Math.max(1, Math.ceil(details.length / 2800));
            for (let part = 0; part < parts; part += 1) {
                log.error({
                    title: 'PNK diag ' + run + ' #' + seen.size + ' ' + (part + 1) + '/' + parts,
                    details: details.slice(part * 2800, (part + 1) * 2800)
                });
            }
        });
    };
    const writeError = (context, message) => context.response.write('Không thể tạo Phiếu nhập kho: ' + text(message));
    const text = (value) => libPrintFormat.asText(value);

    return {onRequest, renderRecordToPdf};
});
