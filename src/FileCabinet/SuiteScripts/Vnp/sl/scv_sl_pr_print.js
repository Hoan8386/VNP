/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(
    [
        'N/query',
        'N/render',
        '../lib/scv_lib_pdf.js',
        '../lib/scv_lib_amount_in_word.js'
    ],
    (query, render, libPdf, libAmount) => {
        // Payment Request PDF retrieval, validation, and rendering.
        const PAYMENT_REQUEST_LINE_RECORD = 'customrecord_scv_payment_detail'; // TODO(BA-Q3)
        // Map từ customlist_scv_htth (internal id 308) sang 2 ô tick trên mẫu giấy.
        // TODO(BA-Q9): 6 giá trị còn lại (2 CTCN, 3 Khuyến mại, 4 Khác, 5 Không thu tiền,
        // 6 COD, 10 Tạm ứng hàng) hiện in trống CẢ HAI ô. Hỏi BA muốn tick thế nào.
        const HinhThucThanhToan = {
            '1': 'CHUYEN_KHOAN',
            '7': 'TIEN_MAT',
            '8': 'CA_HAI',
            '9': 'CA_HAI'
        };
        // TODO(BA-Q13): phủ mọi cách account có thể ghi symbol của đồng Việt Nam.
        // Symbol lạ sẽ ném lỗi kèm giá trị thật, đọc message là biết cần thêm gì.
        const MaTienTeTheoSymbol = {VND: 'VND', 'VNĐ': 'VND', '₫': 'VND', 'đ': 'VND'};
        // Nhãn đơn vị tiền in trên chứng từ. Mẫu giấy ghi "Đồng", không phải mã ISO.
        // Tiền tệ chưa có trong bảng thì dùng tên hiển thị của NetSuite.
        const TenDonViTien = {VND: 'Đồng'};
        const MauIn = {
            dntu: {
                types: [4],
                printfile: 'scv_render_dntu_pdf',
                coThoiHan: true,
                mauSo: '01',
                tieuDe: 'GIẤY ĐỀ NGHỊ TẠM ỨNG',
                nhan: {
                    nguoiDeNghi: 'Tên tôi là',
                    noiDung: 'Lý do tạm ứng',
                    hinhThuc: 'Hình thức tạm ứng',
                    chuTaiKhoan: 'Chủ tài khoản',
                    soTaiKhoan: 'Số tài khoản',
                    nganHang: 'Tại Ngân hàng',
                    cauDan: 'Kính đề nghị tạm ứng các nội dung sau:',
                    donViTien: 'Đơn vị'
                }
            },
            dntt: {
                // TODO(BA-Q6): all listed payment types currently use one template.
                types: [1, 2, 3, 5, 6],
                printfile: 'scv_render_dntt_pdf',
                coThoiHan: false,
                mauSo: '03',
                tieuDe: 'GIẤY ĐỀ NGHỊ THANH TOÁN',
                nhan: {
                    nguoiDeNghi: 'Người đề nghị thanh toán',
                    noiDung: 'Nội dung thanh toán',
                    hinhThuc: 'Hình thức thanh toán',
                    chuTaiKhoan: 'Đơn vị thụ hưởng',
                    soTaiKhoan: 'Số TK',
                    nganHang: 'Ngân hàng',
                    cauDan: 'Kính đề nghị thanh toán các nội dung sau:',
                    donViTien: 'Đơn vị tính'
                }
            }
        };
        // so_tien_header chưa dùng: giữ để dự phòng nếu BA chốt Q2 ngược lại,
        // tức DNTU lấy 1 dòng từ field header thay vì từ record con. Đừng xoá.
        const HeaderQuery = `
            SELECT
                pr.id,
                pr.custrecord_scv_payment_type AS payment_type,
                sub.legalname AS ten_cong_ty,
                BUILTIN.DF(pr.custrecord_scv_payment_department) AS don_vi,
                TO_CHAR(pr.custrecord_scv_payment_date, 'DD/MM/YYYY') AS ngay_thanh_toan,
                TO_CHAR(pr.custrecord_scv_payment_due_date, 'DD/MM/YYYY') AS thoi_han,
                pr.custrecord_scv_payment_memo AS noi_dung,
                pr.custrecord_scv_payment_amount AS so_tien_header,
                pr.custrecord_scv_payment_method AS hinh_thuc_id,
                pr.custrecord_scv_payment_nguoi_thu_huong AS chu_tai_khoan,
                pr.custrecord_scv_payment_bankaccount AS so_tai_khoan,
                BUILTIN.DF(pr.custrecord_scv_payment_bankname) AS ngan_hang,
                BUILTIN.DF(pr.custrecord_scv_payment_currency) AS ten_tien_te,
                cur.symbol AS ma_tien_te,
                req.custentity_scv_legal_name AS nguoi_de_nghi,
                ap5.custentity_scv_legal_name AS tong_giam_doc,
                ap4.custentity_scv_legal_name AS ke_toan_truong,
                ap3.custentity_scv_legal_name AS pho_truong_phong_tckt,
                ap2.custentity_scv_legal_name AS ke_toan_thanh_toan,
                ap1.custentity_scv_legal_name AS truong_don_vi
            FROM customrecord_scv_paymentrequest pr
            LEFT JOIN subsidiary sub ON sub.id = pr.custrecord_scv_payr_subs
            LEFT JOIN currency cur ON cur.id = pr.custrecord_scv_payment_currency
            LEFT JOIN employee req ON req.id = pr.custrecord_scv_payment_ngycau
            LEFT JOIN employee ap5 ON ap5.id = pr.custrecord_scv_payment_approver5
            LEFT JOIN employee ap4 ON ap4.id = pr.custrecord_scv_payment_approver4
            LEFT JOIN employee ap3 ON ap3.id = pr.custrecord_scv_payment_approver3
            LEFT JOIN employee ap2 ON ap2.id = pr.custrecord_scv_payment_approver2
            LEFT JOIN employee ap1 ON ap1.id = pr.custrecord_scv_payment_approver1
            WHERE pr.id = ?
        `;

        // Converts nullish query values to the string-only template contract.
        const asText = (value) => (value === null || value === undefined ? '' : String(value));

        // Converts a raw amount to a safe number before totals are calculated.
        const toAmount = (value) => {
            const amount = Number(value);
            return Number.isFinite(amount) ? amount : 0;
        };

        // Đổi symbol tiền tệ của account sang mã ISO mà DocTienBangChu cần.
        const getCurrencyCode = (symbol) => {
            const value = asText(symbol);
            const code = MaTienTeTheoSymbol[value];
            if (!code) {
                // TODO(BA-Q13): ném lỗi thay vì đoán. Sai mã tiền tệ làm phần
                // "số tiền bằng chữ" sai trên chứng từ kế toán mà không ai thấy.
                throw new Error('Chưa map mã tiền tệ cho symbol: ' + value);
            }
            return code;
        };

        // Đổi id hình thức thanh toán thành 2 dấu tick độc lập của mẫu giấy.
        const getTickHinhThuc = (hinhThucId) => {
            const ma = HinhThucThanhToan[asText(hinhThucId)] || '';
            return {
                tickTienMat: (ma === 'TIEN_MAT' || ma === 'CA_HAI') ? 'X' : '',
                tickChuyenKhoan: (ma === 'CHUYEN_KHOAN' || ma === 'CA_HAI') ? 'X' : ''
            };
        };

        // Chặn in khi câu hỏi BA còn treo — thà không in còn hơn in sai chứng từ.
        const assertHinhThucDaMap = () => {
            if (Object.keys(HinhThucThanhToan).length === 0) {
                throw new Error('Chưa map hình thức thanh toán. TODO(BA-Q9).');
            }
        };

        // Splits the SQL-formatted payment date for the document header.
        const splitDate = (value) => {
            const parts = asText(value).split('/');
            return {ngay: parts[0] || '', thang: parts[1] || '', nam: parts[2] || ''};
        };

        // Validates the requested document configuration before any record data is rendered.
        const getPrintConfig = (params) => {
            const config = MauIn[params.mau];
            if (!config || params.printfile !== config.printfile) {
                throw new Error('Mẫu in không hợp lệ.');
            }
            return config;
        };

        // Retrieves exactly one Payment Request header with its signing and currency data.
        const getHeader = (recid) => {
            const rows = query.runSuiteQL({
                query: HeaderQuery,
                params: [recid]
            }).asMappedResults();
            if (rows.length !== 1) {
                throw new Error('Không tìm thấy đề nghị thanh toán cần in.');
            }
            return rows[0];
        };

        // Confirms that the header payment type belongs to the requested document form.
        const validatePaymentType = (header, config) => {
            const paymentType = Number(header.payment_type);
            if (!Number.isInteger(paymentType) || !config.types.includes(paymentType)) {
                throw new Error('Loại đề nghị không khớp với mẫu in đã yêu cầu.');
            }
        };

        // Retrieves active detail rows separately to avoid repeating header joins per row.
        const getDetailRows = (recid) => {
            if (PAYMENT_REQUEST_LINE_RECORD === 'TBD_AFTER_DEPLOY') {
                throw new Error('Chưa có internal id record dòng chi tiết. TODO(BA-Q3).');
            }
            // TODO(BA-Q5): detail amounts use the gross field mapped in the FDD.
            const lineQuery = `
                SELECT
                    id,
                    custrecord_scv_pay_detail_des AS dien_giai,
                    custrecord_scv_pay_detail_gr_amt AS so_tien
                FROM ${PAYMENT_REQUEST_LINE_RECORD}
                WHERE custrecord_scv_pay = ?
                  AND isinactive = 'F'
                ORDER BY id
            `;
            return query.runSuiteQL({
                query: lineQuery,
                params: [recid]
            }).asMappedResults();
        };

        // Maps detail rows and calculates the total from raw numeric values.
        const buildLines = (rows) => {
            let total = 0;
            const lines = rows.map((row, index) => {
                const amount = toAmount(row.so_tien);
                total += amount;
                return {
                    stt: String(index + 1),
                    dienGiai: asText(row.dien_giai),
                    soTien: libPdf.formatNumber(amount)
                };
            });
            return {lines, total};
        };

        // Builds the shared string-only data contract for both PDF layouts.
        const buildDataJson = (header, detailRows, config) => {
            // TODO(BA-Q2): both forms currently use active detail rows from the approved mockup.
            const date = splitDate(header.ngay_thanh_toan);
            const detail = buildLines(detailRows);
            const currencyCode = getCurrencyCode(header.ma_tien_te);
            const tick = getTickHinhThuc(header.hinh_thuc_id);
            return {
                mauSo: config.mauSo,
                tieuDe: config.tieuDe,
                nhan: config.nhan,
                tenCongTy: asText(header.ten_cong_ty),
                donVi: asText(header.don_vi),
                ngay: date.ngay,
                thang: date.thang,
                nam: date.nam,
                nguoiDeNghi: asText(header.nguoi_de_nghi),
                noiDung: asText(header.noi_dung),
                thoiHan: config.coThoiHan ? asText(header.thoi_han) : '',
                tickTienMat: tick.tickTienMat,
                tickChuyenKhoan: tick.tickChuyenKhoan,
                chuTaiKhoan: asText(header.chu_tai_khoan),
                soTaiKhoan: asText(header.so_tai_khoan),
                nganHang: asText(header.ngan_hang),
                tenTienTe: TenDonViTien[currencyCode] || asText(header.ten_tien_te),
                lines: detail.lines,
                tongCong: libPdf.formatNumber(detail.total),
                tongCongBangChu: libAmount.DocTienBangChu(detail.total, currencyCode),
                kyDuyet: {
                    tongGiamDoc: asText(header.tong_giam_doc),
                    keToanTruong: asText(header.ke_toan_truong),
                    phoTruongPhongTCKT: asText(header.pho_truong_phong_tckt),
                    keToanThanhToan: asText(header.ke_toan_thanh_toan),
                    truongDonVi: asText(header.truong_don_vi),
                    nguoiDeNghi: asText(header.nguoi_de_nghi)
                }
            };
        };

        // Renders the configured XML template with the completed payment data contract.
        const renderPdf = (response, config, dataJson) => {
            const renderer = libPdf.renderTemplateWithXml(config.printfile);
            renderer.addCustomDataSource({
                format: render.DataSource.OBJECT,
                alias: 'dataJson',
                data: dataJson
            });
            response.writeFile({
                file: renderer.renderAsPdf(),
                isInline: true
            });
        };

        /**
         * Serves the validated Payment Request PDF.
         * @param {Object} scriptContext
         * @returns {void}
         */
        const onRequest = (scriptContext) => {
            const params = scriptContext.request.parameters;
            if (!params.recid) {
                throw new Error('Thiếu mã đề nghị thanh toán để in.');
            }
            const config = getPrintConfig(params);
            const header = getHeader(params.recid);
            validatePaymentType(header, config);
            assertHinhThucDaMap();
            const detailRows = getDetailRows(params.recid);
            const dataJson = buildDataJson(header, detailRows, config);
            renderPdf(scriptContext.response, config, dataJson);
        };

        return {onRequest};
    }
);
