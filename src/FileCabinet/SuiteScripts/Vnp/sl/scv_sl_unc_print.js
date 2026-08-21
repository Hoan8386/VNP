/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/query', 'N/render', 'N/search',
        '../lib/scv_lib_pdf.js',
        '../lib/scv_lib_amount_in_word.js',
        '../lib/scv_lib_utils.js'], (query, render, search, libPdf, libAmount, libUtils) => {
    // TODO(BA-Q1): Chọn mẫu theo ngân hàng tài khoản chi tiền và xử lý ngân hàng thứ 4.
    // coChiNhanhNguoiTra / coChiNhanhNguoiHuong tach rieng vi FDD (sheet "UNC TP
    // Bank") quy dinh TPBank BAT DOI XUNG: ben tra (M11) chi lay bank_name, KHONG
    // ghep chi nhanh; ben huong (M18) lai ghep "bank_name - bank_branch". VietinBank
    // va SHB thi ca 2 ben deu ghep chi nhanh (doi xung) theo FDD tuong ung.
    const NganHang = {
        TPBANK: {
            tuKhoa: ['TPBANK', 'TIENPHONGBANK'],
            printfile: 'scv_render_unc_tpbank_pdf',
            logoFile: 'Logo-TPBank.png',
            bannerFile: 'Banner-TPBank.png',
            coTinhTP: true, coChiNhanhNguoiTra: false, coChiNhanhNguoiHuong: true
        },
        VIETINBANK: {
            // 'VIETTINBANK' 2 chu T: ke toan dang go sai chinh ta tren 3 tai khoan
            // that (id 145, 147, 802). Thieu tu khoa nay la 3 tai khoan do khong
            // bao gio ra button.
            tuKhoa: ['VIETINBANK', 'VIETTINBANK', 'CONGTHUONG'],
            printfile: 'scv_render_unc_vietinbank_pdf',
            logoFile: 'Logo-VietinBank.png',
            coTinhTP: false, coChiNhanhNguoiTra: true, coChiNhanhNguoiHuong: true
        },
        SHB: {
            tuKhoa: ['SHB', 'SAIGONHANOI'],
            printfile: 'scv_render_unc_shb_pdf',
            logoFile: 'Logo-SHB-EN.png',
            coTinhTP: false, coChiNhanhNguoiTra: true, coChiNhanhNguoiHuong: true
        }
    };

    // Logo ngan hang nam trong File Cabinet: Images / Unc.
    // CO Y khong hardcode internal id (1600/1601/1602) va cung khong hardcode URL:
    //  - id doi moi khi ai do xoa roi upload lai file -> tra theo TEN file thi khong gay.
    //  - URL cua File Cabinet co tham so &c=&h= sinh theo account, hardcode la khong
    //    mang sang account khac duoc.
    // Rang buoc CA folder lan folder cha de sau nay them Images/<task khac> thi file
    // trung ten o folder khac khong bi lay nham.
    const ThuMucLogo = {ten: 'Unc', cha: 'Images'};

    // BA-Q9 da chot bang SuiteQL tren account that: bang transaction CHI co cot
    // 'total'. 't.usertotal' va 't.payment' deu nem loi, du FDD ghi 2 ten do cho
    // man hinh Check va Vendor Prepayment - do la field id tren RECORD, khong phai
    // cot SuiteQL. Ca 3 loai chung tu deu lay ABS(t.total).
    // Dictionary nay gio chi con lam whitelist loai chung tu duoc phep in.
    const ManHinh = {check: true, vendorprepayment: true, vendorpayment: true};

    // TODO(BA-Q10): Bổ sung symbol tiền tệ khi NetSuite trả giá trị mới.
    const MaTienTeTheoSymbol = {VND: 'VND', 'VNĐ': 'VND', '₫': 'VND', 'đ': 'VND'};

    const chuanHoa=s=>libUtils.removeVietnameseTones(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'')

    const timNganHang = (ten) => {
        const tenDaChuanHoa = chuanHoa(ten);
        return Object.keys(NganHang).find((maNganHang) =>
            NganHang[maNganHang].tuKhoa.some((tuKhoa) => tenDaChuanHoa.includes(tuKhoa)));
    };

    const asText = (value) => (value == null ? '' : String(value));

    const layFieldAnToan = (type, id, fieldId) => {
        if (!id || !fieldId) return '';
        try {
            const fields = search.lookupFields({type, id, columns: [fieldId]}) || {};
            const value = fields[fieldId];
            if (Array.isArray(value)) {
                return asText(value[0]?.value ?? value[0]?.text);
            }
            if (value && typeof value === 'object') {
                return asText(value.value ?? value.text);
            }
            return asText(value);
        } catch (e) {
            log.error({
                title: 'UNC lookup field fallback: ' + fieldId,
                details: e
            });
            return '';
        }
    };

    const layFieldTextAnToan = (type, id, fieldId) => {
        if (!id || !fieldId) return '';
        try {
            const fields = search.lookupFields({type, id, columns: [fieldId]}) || {};
            const value = fields[fieldId];
            if (Array.isArray(value)) {
                return asText(value[0]?.text ?? value[0]?.value);
            }
            if (value && typeof value === 'object') {
                return asText(value.text ?? value.value);
            }
            return asText(value);
        } catch (e) {
            log.error({
                title: 'UNC lookup field fallback: ' + fieldId,
                details: e
            });
            return '';
        }
    };

    const getMaTienTe = (symbol) => {
        const giaTri = asText(symbol);
        const maTienTe = MaTienTeTheoSymbol[giaTri];
        if (!maTienTe) {
            log.audit({
                title: 'UNC fallback mã tiền tệ',
                details: 'Chưa map mã tiền tệ cho symbol: ' + giaTri
                    + '; dùng chính symbol làm mã tiền tệ.'
            });
            return giaTri;
        }
        return maTienTe;
    };

    const getTickTienTe = (maTienTe) => {
        // TODO(BA-Q6): BA xác nhận cách tick các mã tiền tệ ngoài VND, USD, EUR.
        return {
            tickVND: maTienTe === 'VND' ? 'X' : '',
            tickUSD: maTienTe === 'USD' ? 'X' : '',
            tickEUR: maTienTe === 'EUR' ? 'X' : '',
            tickKhac: !['VND', 'USD', 'EUR'].includes(maTienTe) ? 'X' : ''
        };
    };

    const getTickPhi = (maNganHang) => {
        // TODO(BA-Q7): BA xác nhận ô phí có hardcode hay lấy từ field nào.
        const tickTheoNganHang = {
            TPBANK: {
                tickPhiNguoiChuyen: 'X', tickPhiNguoiHuong: '',
                tickPhiTrong: '', tickPhiNgoai: ''
            },
            VIETINBANK: {
                tickPhiNguoiChuyen: '', tickPhiNguoiHuong: '',
                tickPhiTrong: '', tickPhiNgoai: 'X'
            },
            SHB: {
                tickPhiNguoiChuyen: '', tickPhiNguoiHuong: '',
                tickPhiTrong: '', tickPhiNgoai: ''
            }
        };
        return tickTheoNganHang[maNganHang];
    };

    // Tra URL logo theo TEN file trong dung folder Images/Unc.
    // libPdf co ham getFontUrl() lam y het viec nay nhung KHONG duoc export ra
    // ngoai, va lib/ thi cam sua -> viet lai o day theo cung pattern.
    // Khong tim thay logo thi tra '' de template tu bo qua the <img>: thieu logo
    // van in duoc chung tu, con nem loi thi ca ban in chet.
    const getLogoUrl = (tenFile) => {
        if (!tenFile) return '';
        try {
            const sql = `
                SELECT f.url
                FROM file f
                JOIN mediaitemfolder mf ON mf.id = f.folder
                LEFT JOIN mediaitemfolder mfp ON mfp.id = mf.parent
                WHERE UPPER(f.name) = UPPER(?)
                  AND UPPER(mf.name) = UPPER(?)
                  AND UPPER(mfp.name) = UPPER(?)
            `;
            const rows = query.runSuiteQL({
                query: sql,
                params: [tenFile, ThuMucLogo.ten, ThuMucLogo.cha]
            }).asMappedResults();
            return asText(rows[0]?.url);
        } catch (e) {
            log.error({title: 'getLogoUrl: khong tra duoc logo ' + tenFile, details: e});
            return '';
        }
    };

    const ghepNganHang = (ten, chiNhanh, coChiNhanh) => {
        const tenNganHang = asText(ten);
        const tenChiNhanh = asText(chiNhanh);
        if (!coChiNhanh) return tenNganHang;
        if (tenNganHang && tenChiNhanh) return tenNganHang + ' - ' + tenChiNhanh;
        return tenNganHang || tenChiNhanh;
    };

    const getHeader = (recid) => {
        const sql = `
            SELECT
                t.id,
                TO_CHAR(t.trandate, 'DD/MM/YYYY') AS ngay_ct,
                t.memo AS noi_dung,
                ABS(t.total) AS so_tien, -- BA-Q9: chi co cot 'total', va no am
                cur.symbol AS ma_tien_te,
                sub.legalname AS ten_nguoi_tra,
                acc.id AS id_tk_nguoi_tra,
                acc.custrecord_scv_acc_bank_acc AS stk_nguoi_tra, -- TODO(BA-Q3)
                acc.custrecord_scv_acc_bank_name AS nh_nguoi_tra, -- TODO(BA-Q3)
                -- Chi dung de DINH TUYEN mau in, KHONG in ra chung tu.
                -- custrecord_scv_acc_bank_name hien rong tren 100% tai khoan, nen
                -- tam do ten tai khoan. TODO(BA-Q11): TechLead chot lai.
                -- KHONG dung COALESCE: da test tren account that, tron custom field
                -- voi native field trong COALESCE lam ca cau query gay voi loi
                -- chung chung 'Invalid or unsupported search'. Ghep trong JS.
                acc.accountsearchdisplayname AS ten_tk_dinh_tuyen,
                acc.custrecord_scv_acc_bank_branch AS cn_nguoi_tra, -- TODO(BA-Q3)
                acc.custrecord_scv_acc_province AS tinh_nguoi_tra, -- TODO(BA-Q3)
                t.custbody_scv_beneficiary_bank AS ten_nguoi_huong, -- TODO(BA-Q4)
                t.custbody_scv_bank_account AS stk_nguoi_huong,
                t.custbody_scv_bank_name AS nh_nguoi_huong,
                t.custbody_scv_bank_branch AS cn_nguoi_huong,
                t.custbody_scv_province AS tinh_nguoi_huong,
                t.custbody_scv_beneficiary AS id_nguoi_huong
            FROM transaction t
            LEFT JOIN transactionline tl ON tl.transaction = t.id
                AND tl.mainline = 'T' -- TODO(BA-Q8)
            -- transactionline.account bi NOT_EXPOSED trong SuiteQL, phai di vong
            -- qua transactionaccountingline moi lay duoc tai khoan ngan hang.
            LEFT JOIN transactionaccountingline tal ON tal.transaction = t.id
                AND tal.transactionline = tl.id
            LEFT JOIN account acc ON acc.id = tal.account
            -- t.subsidiary cung bi NOT_EXPOSED, lay tu dong mainline.
            LEFT JOIN subsidiary sub ON sub.id = tl.subsidiary
            LEFT JOIN currency cur ON cur.id = t.currency
            WHERE t.id = ?
        `;
        const rows = query.runSuiteQL({query: sql, params: [recid]}).asMappedResults();
        if (rows.length !== 1) {
            throw new Error('Không tìm thấy chứng từ cần in.');
        }
        return rows[0];
    };

    const buildDataJson = (header, maNganHang, config, tenNhText) => {
        const soTien = Number(header.so_tien);
        const maTienTe = getMaTienTe(header.ma_tien_te);
        const soTienBangChu = libAmount.DocTienBangChu(soTien, maTienTe)
            .replace(/\.\/\s*$/, ''); // TODO(BA-Q12): mẫu ngân hàng không có đuôi ./
        const tickTienTe = getTickTienTe(maTienTe);
        const tickPhi = getTickPhi(maNganHang);
        const nhNguoiTra = ghepNganHang(
            tenNhText, header.cn_nguoi_tra, config.coChiNhanhNguoiTra
        );
        const nhNguoiHuong = ghepNganHang(
            header.nh_nguoi_huong, header.cn_nguoi_huong, config.coChiNhanhNguoiHuong
        );
        const diaChiNguoiHuong = layFieldAnToan(
            'customrecord_scv_beneficiary',
            header.id_nguoi_huong,
            'custrecord_scv_beb_bank_address'
        );
        return {
            logoUrl: getLogoUrl(config.logoFile),
            bannerUrl: config.bannerFile ? getLogoUrl(config.bannerFile) : '',
            ngayCT: asText(header.ngay_ct),
            tenNguoiTra: asText(header.ten_nguoi_tra),
            stkNguoiTra: asText(header.stk_nguoi_tra),
            nhNguoiTra,
            tinhNguoiTra: config.coTinhTP ? asText(header.tinh_nguoi_tra) : '',
            tenNguoiHuong: asText(header.ten_nguoi_huong),
            stkNguoiHuong: asText(header.stk_nguoi_huong),
            nhNguoiHuong,
            tinhNguoiHuong: config.coTinhTP ? asText(header.tinh_nguoi_huong) : '',
            diaChiNguoiHuong,
            soTien: libPdf.formatNumber(soTien),
            soTienBangChu,
            maTienTe,
            noiDung: asText(header.noi_dung),
            tickVND: tickTienTe.tickVND,
            tickUSD: tickTienTe.tickUSD,
            tickEUR: tickTienTe.tickEUR,
            tickKhac: tickTienTe.tickKhac,
            tickPhiNguoiChuyen: tickPhi.tickPhiNguoiChuyen,
            tickPhiNguoiHuong: tickPhi.tickPhiNguoiHuong,
            tickPhiTrong: tickPhi.tickPhiTrong,
            tickPhiNgoai: tickPhi.tickPhiNgoai
        };
    };

    const renderPdf = (response, config, dataJson) => {
        const renderer = libPdf.renderTemplateWithXml(config.printfile);
        renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: 'dataJson',
            data: dataJson
        });
        response.writeFile({file: renderer.renderAsPdf(), isInline: true});
    };

    const onRequest = (scriptContext) => {
        const params = scriptContext.request.parameters;
        if (!params.recid) {
            throw new Error('Thiếu mã chứng từ cần in.');
        }
        if (!ManHinh[params.rectype]) {
            throw new Error('Loại màn hình không hợp lệ: ' + asText(params.rectype));
        }
        const header = getHeader(params.recid);
        const tenNhText = header.nh_nguoi_tra
            ? layFieldTextAnToan('account', header.id_tk_nguoi_tra, 'custrecord_scv_acc_bank_name')
            : '';
        const tenTk = asText(header.ten_tk_dinh_tuyen);
        const maNganHang = timNganHang(tenNhText) || timNganHang(tenTk);
        // TODO(BA-Q1): Không có mẫu mặc định cho ngân hàng không khớp.
        if (!maNganHang) {
            throw new Error('Chưa có mẫu UNC cho ngân hàng. Tên NH: "' + tenNhText
                + '" | Tên TK: "' + tenTk + '"');
        }
        const config = NganHang[maNganHang];
        const dataJson = buildDataJson(header, maNganHang, config, tenNhText);
        renderPdf(scriptContext.response, config, dataJson);
    };

    return {onRequest};
});
