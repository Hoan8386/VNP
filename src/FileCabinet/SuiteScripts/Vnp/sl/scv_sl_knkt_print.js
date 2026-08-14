/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
/*
 * Print KNKT - Báo cáo kết quả thực hiện các khuyến nghị.
 */
define(['N/query', 'N/render', 'N/file', 'N/encode', 'N/log', '../lib/scv_lib_pdf.js'],
    (query, render, file, encode, log, libPdf) => {
        const PRINT_FILE = 'scv_render_knkt_pdf';
        // Whitelist: printfile đến từ URL param, không được phép load file XML tuỳ ý.
        const PRINT_FILE_LAN_2 = 'scv_render_knkt_pdf_l2';
        const PRINT_FILES = [PRINT_FILE, PRINT_FILE_LAN_2];
        const WORD_PRINT_FILE = 'scv_render_knkt_word';
        const WORD_PRINT_FILE_LAN_2 = 'scv_render_knkt_word_l2';
        const WORD_PRINT_FILES = [WORD_PRINT_FILE, WORD_PRINT_FILE_LAN_2];
        // Relative path resolved from this Suitelet's folder, giống cách scv_lib_pdf nạp XML.
        const WORD_TEMPLATE_FOLDER = '../xml/word/';
        // Việt Nam dùng UTC+7 cố định và không có DST, không phụ thuộc giờ Pacific.
        const VIET_NAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
        const DATA_QUERY = `
            SELECT
                p.custrecord_scv_xlkn_sobaocao                        AS so_bao_cao,
                BUILTIN.DF(p.custrecord_scv_xlkn_subs)                AS cong_ty,
                TO_CHAR(p.custrecord_scv_xlkn_date, 'DD/MM/YYYY')     AS ngay_phat_hanh,
                BUILTIN.DF(p.custrecord_scv_xlkn_department)          AS don_vi,
                ph.id                                                   AS ph_id,
                ph.custrecord_scv_ctph_chitietphathien                AS chi_tiet_phat_hien,
                kn.id                                                   AS kn_id,
                kn.custrecord_scv_ykkn_ykienkhuyennghi                AS khuyen_nghi,
                TO_CHAR(
                    kn.custrecord_scv_ykkn_thoigianphanhoi,
                    'DD/MM/YYYY'
                ) AS thoi_han_phan_hoi,
                kq.id                                                   AS kq_id,
                kq.custrecord_scv_kqkn_tinhhinhthuchien               AS tinh_hinh_thuc_hien,
                TO_CHAR(
                    kq.custrecord_scv_kqkn_ngaythuchien,
                    'DD/MM/YYYY'
                ) AS ngay_thuc_hien,
                TO_CHAR(
                    kq.custrecord_scv_kqkn_ngaythuchien,
                    'YYYYMMDD'
                ) AS ngay_thuc_hien_sort
            FROM customrecord_scv_xu_ly_kien_nghi p
                LEFT JOIN customrecord_scv_chitietkiennghi ph
                    ON ph.custrecord_scv_ctph_phieukn = p.id
                   AND ph.isinactive = 'F'
                LEFT JOIN customrecord_scv_ykienkiennghi kn
                    ON kn.custrecord_scv_ykkn_chitietkhuyennghi = ph.id
                   AND kn.isinactive = 'F'
                LEFT JOIN customrecord_scv_ketquakhuyennghi kq
                    ON kq.custrecord_scv_kqkn_ykienkhuyennghi = kn.id
                   AND kq.isinactive = 'F'
            WHERE p.id = ?
            ORDER BY ph.id, kn.id, kq.id
        `;

        // Ép giá trị SuiteQL về chuỗi; `== null` là có ý, bắt cả null và undefined.
        const toText = (value) => value == null ? '' : String(value);

        // Pads one date part to exactly two digits.
        const padHaiChuSo = (value) => String(value).padStart(2, '0');

        // Returns the current Vietnam date from epoch time, independent of server timezone.
        const getNgayKyVietNam = () => {
            const ngayVietNam = new Date(Date.now() + VIET_NAM_UTC_OFFSET_MS);

            return {
                ngayKy: padHaiChuSo(ngayVietNam.getUTCDate()),
                thangKy: padHaiChuSo(ngayVietNam.getUTCMonth() + 1),
                namKy: String(ngayVietNam.getUTCFullYear())
            };
        }

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            const params = scriptContext.request.parameters;
            if (!params.recid) {
                throw "Chưa có mã bản ghi để in!";
            }

            const format = params.format || 'word';
            if (format === 'pdf') {
                const pdfFile = renderRecordToPdf(params.recid, params.printfile);
                scriptContext.response.writeFile(pdfFile, true);
                return;
            }

            if (format !== 'word') {
                throw "Định dạng file không hợp lệ!";
            }

            try {
                const wordFile = renderRecordToWord(params.recid, params.printfile);
                scriptContext.response.writeFile({
                    file: wordFile,
                    isInline: false
                });
            } catch (error) {
                log.error({
                    title: 'KNKT_WORD_PRINT_ERROR',
                    details: JSON.stringify({
                        recid: params.recid,
                        printfile: params.printfile,
                        name: error && error.name,
                        message: error && error.message,
                        stack: error && error.stack
                    })
                });
                throw error;
            }
        }

        // Returns a safe template name; anything outside the whitelist falls back to lần 1.
        const getPrintFile = (printfile) => {
            return PRINT_FILES.indexOf(printfile) === -1 ? PRINT_FILE : printfile;
        }

        // Returns a safe Word template name; anything outside the whitelist falls back to lần 1.
        const getWordPrintFile = (printfile) => {
            return WORD_PRINT_FILES.indexOf(printfile) === -1 ? WORD_PRINT_FILE : printfile;
        }

        // Renders one KNKT record with the requested XML template and returns its PDF file.
        const renderRecordToPdf = (recid, printfile) => {
            const renderer = libPdf.renderTemplateWithXml(getPrintFile(printfile));
            renderer.addCustomDataSource({
                format: render.DataSource.OBJECT,
                alias: "dataJson",
                data: getDataKNKT(recid)
            });

            return renderer.renderAsPdf();
        }

        // Renders one KNKT record as HTML that Microsoft Word can open and edit.
        const renderRecordToWord = (recid, printfile) => {
            const templateFile = file.load({
                id: WORD_TEMPLATE_FOLDER + getWordPrintFile(printfile) + '.html'
            });
            const renderer = render.create();
            renderer.templateContent = templateFile.getContents();
            const dataJson = getDataKNKT(recid);
            renderer.addCustomDataSource({
                format: render.DataSource.OBJECT,
                alias: "dataJson",
                data: dataJson
            });

            const wordContent = renderer.renderAsString();
            const wordFileName = 'BaoCaoKNKT_' +
                dataJson.soBaoCao.replace(/[\\/:*?"<>|\u0000-\u001F\u007F]/g, '_') +
                '.doc';

            return file.create({
                name: wordFileName,
                fileType: file.Type.WORD,
                contents: encode.convert({
                    string: wordContent,
                    inputEncoding: encode.Encoding.UTF_8,
                    outputEncoding: encode.Encoding.BASE_64
                })
            });
        }

        // Returns one header object and the nested phát hiện/khuyến nghị tree for the template.
        const getDataKNKT = (recid) => {
            // TODO(BA-Q5): Confirm that custrecord_scv_xlkn_subs is the intended company field.
            // TODO(BA-Q6): Confirm that inactive child records must be excluded.
            // TODO(BA-Q7): Confirm that internal-id ascending is the intended child sequence.
            // TODO(BA-Q8): Xác nhận "Cập nhật đến" = ngày thực hiện lớn nhất
            // toàn báo cáo.
            // TODO(BA-Q10): Mockup vẫn để "Ngày … tháng … năm 2026" nhưng FDD ghi Current Date —
            // hiện điền đủ ngày/tháng/năm; nếu BA muốn giữ dấu chấm thì sửa lại 1 dòng trong XML.
            // TODO(BA-Q11): Xác nhận custrecord_scv_kqkn_ngaythuchien là kiểu Date
            // (đang dùng TO_CHAR).
            const rows = query.runSuiteQL({
                query: DATA_QUERY,
                params: [recid]
            }).asMappedResults();

            if (rows.length === 0) {
                throw "Không tìm thấy bản ghi cần in hoặc bạn không có quyền xem!";
            }

            if (rows.length >= 5000) {
                throw "Báo cáo quá lớn, vượt giới hạn 5.000 dòng của SuiteQL!";
            }

            const header = rows[0] || {};
            const ngayKyVietNam = getNgayKyVietNam();

            return {
                soBaoCao: toText(header.so_bao_cao),
                congTy: toText(header.cong_ty),
                ngayPhatHanh: toText(header.ngay_phat_hanh),
                donVi: toText(header.don_vi),
                ngayCapNhat: getLatestNgayThucHien(rows),
                ngayKy: ngayKyVietNam.ngayKy,
                thangKy: ngayKyVietNam.thangKy,
                namKy: ngayKyVietNam.namKy,
                phatHienList: buildPhatHienTree(rows)
            };
        }

        // Updates a tracker with one execution date if it is newer; returns nothing.
        const keepLatestValue = (tracker, ngayThucHien, ngayThucHienSort) => {
            if (ngayThucHienSort === '') {
                return;
            }

            if (tracker.ngayThucHienSort >= ngayThucHienSort) {
                return;
            }

            tracker.ngayThucHien = ngayThucHien;
            tracker.ngayThucHienSort = ngayThucHienSort;
        }

        // Updates a tracker with the newest execution date from one result row; returns nothing.
        const keepLatestNgayThucHien = (tracker, row) => {
            if (row.kq_id === null || row.kq_id === undefined) {
                return;
            }

            keepLatestValue(
                tracker,
                toText(row.ngay_thuc_hien),
                toText(row.ngay_thuc_hien_sort)
            );
        }

        // Returns the newest execution date across all flat SuiteQL rows.
        const getLatestNgayThucHien = (rows) => {
            const tracker = {ngayThucHien: '', ngayThucHienSort: ''};
            rows.forEach((row) => {
                keepLatestNgayThucHien(tracker, row);
            });

            return tracker.ngayThucHien;
        }

        // Stores one raw result row for date-aware finalization.
        const addKetQua = (khuyenNghiEntry, row) => {
            khuyenNghiEntry.ketQuaRows.push({
                ngayThucHien: toText(row.ngay_thuc_hien),
                ngayThucHienSort: toText(row.ngay_thuc_hien_sort),
                tinhHinhThucHien: toText(row.tinh_hinh_thuc_hien),
                kqId: Number(row.kq_id)
            });
        }

        // Sorts one recommendation's results and exposes the clean template contract.
        const finalizeKetQuaList = (khuyenNghiEntry) => {
            // TODO(BA-Q13): Dòng kết quả mới nhất có ngày nhưng Tình hình thực hiện rỗng —
            // hiện in trống theo đúng dữ liệu; xác nhận có cần lùi về dòng cũ hơn
            // có nội dung không.
            // TODO(BA-Q14): Hai kết quả trùng ngày thực hiện — hiện lấy dòng có id lớn hơn.
            khuyenNghiEntry.ketQuaRows.sort((left, right) => {
                if (left.ngayThucHienSort < right.ngayThucHienSort) {
                    return -1;
                }
                if (left.ngayThucHienSort > right.ngayThucHienSort) {
                    return 1;
                }

                return left.kqId - right.kqId;
            });

            // TODO(BA-Q16): Kết quả có ngày thực hiện rỗng đang bị coi là cũ nhất
            // nên rơi vào cột trái; xác nhận với BA.
            const ketQuaRows = khuyenNghiEntry.ketQuaRows;
            khuyenNghiEntry.khuyenNghi.ketQuaList = ketQuaRows.map((row) => ({
                ngayThucHien: row.ngayThucHien,
                tinhHinhThucHien: row.tinhHinhThucHien
            }));

            const ketQuaMoiNhat = ketQuaRows[ketQuaRows.length - 1];
            if (ketQuaMoiNhat) {
                khuyenNghiEntry.khuyenNghi.tinhHinhThucHien =
                    ketQuaMoiNhat.tinhHinhThucHien;
            }

            // TODO(BA-Q15): Khuyến nghị chỉ có 1 kết quả đang để trống cột trái;
            // xác nhận với BA có cần in dấu "…" không.
            const ketQuaTruoc = ketQuaRows[ketQuaRows.length - 2];
            if (ketQuaTruoc) {
                khuyenNghiEntry.khuyenNghi.tinhHinhThucHienTruoc =
                    ketQuaTruoc.tinhHinhThucHien;
                keepLatestValue(
                    khuyenNghiEntry.phatHienEntry.truoc,
                    ketQuaTruoc.ngayThucHien,
                    ketQuaTruoc.ngayThucHienSort
                );
            }
        }

        // Returns an existing or newly created recommendation entry for one query row.
        const getOrCreateKhuyenNghiEntry = (
            phatHienEntry,
            khuyenNghiEntries,
            row
        ) => {
            let khuyenNghiEntry = phatHienEntry.khuyenNghiById.get(row.kn_id);
            if (!khuyenNghiEntry) {
                const khuyenNghi = {
                    stt: phatHienEntry.phatHien.khuyenNghiList.length + 1,
                    khuyenNghi: toText(row.khuyen_nghi),
                    thoiHanPhanHoi: toText(row.thoi_han_phan_hoi),
                    // Nguồn của tinhHinhThucHien/tinhHinhThucHienTruoc; template lần 1
                    // bỏ qua danh sách này, lần 2 chỉ dùng 2 phần tử cuối.
                    ketQuaList: [],
                    tinhHinhThucHien: '',
                    tinhHinhThucHienTruoc: ''
                };
                khuyenNghiEntry = {
                    khuyenNghi: khuyenNghi,
                    phatHienEntry: phatHienEntry,
                    ketQuaRows: []
                };
                phatHienEntry.khuyenNghiById.set(row.kn_id, khuyenNghiEntry);
                phatHienEntry.phatHien.khuyenNghiList.push(khuyenNghi);
                khuyenNghiEntries.push(khuyenNghiEntry);
            }

            return khuyenNghiEntry;
        }

        // Returns an existing or newly created finding entry for one query row.
        const getOrCreatePhatHienEntry = (phatHienList, phatHienById, row) => {
            let phatHienEntry = phatHienById.get(row.ph_id);
            if (!phatHienEntry) {
                const phatHien = {
                    stt: phatHienList.length + 1,
                    chiTietPhatHien: toText(row.chi_tiet_phat_hien),
                    ngayThucHien: '',
                    ngayThucHienTruoc: '',
                    khuyenNghiList: []
                };
                phatHienEntry = {
                    phatHien: phatHien,
                    khuyenNghiById: new Map(),
                    ngayThucHien: '',
                    ngayThucHienSort: '',
                    // TODO(BA-Q17): Header cột trái đang lấy ngày lớn nhất trong tập
                    // giá trị được xếp vào cột trái, không phải ngày lớn thứ nhì của
                    // cả phát hiện; xác nhận với BA.
                    truoc: {ngayThucHien: '', ngayThucHienSort: ''}
                };
                phatHienById.set(row.ph_id, phatHienEntry);
                phatHienList.push(phatHien);
            }

            return phatHienEntry;
        }

        // Folds flat SuiteQL rows and returns the template's phát hiện/khuyến nghị tree.
        const buildPhatHienTree = (rows) => {
            const phatHienList = [];
            const phatHienById = new Map();
            const khuyenNghiEntries = [];

            rows.forEach((row) => {
                if (row.ph_id === null || row.ph_id === undefined) {
                    return;
                }

                const phatHienEntry = getOrCreatePhatHienEntry(
                    phatHienList,
                    phatHienById,
                    row
                );
                keepLatestNgayThucHien(phatHienEntry, row);
                phatHienEntry.phatHien.ngayThucHien = phatHienEntry.ngayThucHien;

                if (row.kn_id === null || row.kn_id === undefined) {
                    return;
                }

                const khuyenNghiEntry = getOrCreateKhuyenNghiEntry(
                    phatHienEntry,
                    khuyenNghiEntries,
                    row
                );

                if (row.kq_id !== null && row.kq_id !== undefined) {
                    // TODO(BA-Q9): Xác nhận header cột 4 lấy ngày thực hiện lớn nhất
                    // trong từng phát hiện, và khi không có kết quả nào thì in dấu "…".
                    addKetQua(khuyenNghiEntry, row);
                }
            });

            khuyenNghiEntries.forEach((khuyenNghiEntry) => {
                finalizeKetQuaList(khuyenNghiEntry);
            });

            phatHienById.forEach((phatHienEntry) => {
                phatHienEntry.phatHien.ngayThucHienTruoc =
                    phatHienEntry.truoc.ngayThucHien;
            });

            return phatHienList;
        }

        return {onRequest}

    });
