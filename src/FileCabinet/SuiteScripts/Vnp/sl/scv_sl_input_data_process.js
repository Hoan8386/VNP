/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['../common/scv_common_input_data.js', '../lib/scv_lib_function.js', '../lib/scv_lib_report.js'],

    (commonData, libFunc, libRep) => {

        // Bỏ dấu tiếng Việt + viết thường + gộp khoảng trắng, để dò cột/tiêu đề không phụ thuộc dấu
        const stripAccent = (s) => String(s == null ? '' : s)
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .toLowerCase().replace(/\s+/g, ' ').trim();

        // Chuyển giá trị ô về số (bỏ dấu phân cách ngăn cách hàng nghìn). Trả null nếu không phải số
        const toNumber = (v) => {
            if (typeof v === 'number') return v;
            if (v == null || String(v).trim() === '') return null;
            const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
            return isNaN(n) ? null : n;
        };

        /**
         * Dò các cột động của sheet (key do SheetJS tự sinh) dựa theo dòng tiêu đề
         * chứa "Năm nay" / "Năm trước" / "Chỉ tiêu" / "Mã số" / "Thuyết minh".
         * @returns {{chiTieu, maSo, thuyetMinh, current, previous, headerIdx}}
         */
        const detectColumns = (listData) => {
            const cols = {headerIdx: -1};
            for (let i = 0; i < listData.length; i++) {
                const row = listData[i];
                for (const k in row) {
                    const v = stripAccent(row[k]);
                    if (v === 'nam nay') cols.current = k;
                    else if (v === 'nam truoc') cols.previous = k;
                    else if (v === 'chi tieu') cols.chiTieu = k;
                    else if (v === 'ma so') cols.maSo = k;
                    else if (v === 'thuyet minh') cols.thuyetMinh = k;
                }
                if (cols.current && cols.previous) {
                    cols.headerIdx = i;
                    break;
                }
            }
            return cols;
        };

        /**
         * Lấy Từ ngày / Đến ngày từ dòng có dạng "Từ ngày dd/mm/yyyy đến ngày dd/mm/yyyy".
         * @returns {{fromDate: string, toDate: string}}
         */
        const extractDates = (listData) => {
            for (const row of listData) {
                for (const k in row) {
                    const raw = String(row[k] == null ? '' : row[k]);
                    const norm = stripAccent(raw);
                    if (norm.indexOf('tu ngay') !== -1 && norm.indexOf('den ngay') !== -1) {
                        const dates = raw.match(/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/g) || [];
                        return {fromDate: dates[0] || '', toDate: dates[1] || ''};
                    }
                }
            }
            return {fromDate: '', toDate: ''};
        };

        // Mã số "01" -> "1"; giữ lại "0" nếu chuỗi toàn số 0
        const stripLeadingZeros = (v) => String(v == null ? '' : v).trim().replace(/^0+(?=\d)/, '');

        // Tạo 1 dòng line theo mẫu (file mau)
        const makeLine = (accountId, value, periodType, dates) => ({
            account: accountId,
            debit: value,
            lineunit: 1,
            custcol_scv_fs_period_type: periodType,
            custcol_scv_from_date: {text: dates.fromDate},
            custcol_scv_to_date: {text: dates.toDate}
        });

        /**
         * Parse dữ liệu PL Report từ sheet → build theo mẫu { fields, line }.
         * Mỗi chỉ tiêu sinh 2 line: cột "Năm nay" (period CURRENT) và "Năm trước" (period PREVIOUS).
         */
        const parsePLReport = (subsidiary, listData, listAccount) => {
            const cols = detectColumns(listData);
            const dates = extractDates(listData);
            const lines = [];

            if (cols.headerIdx === -1 || !cols.chiTieu) {
                return {fields: buildFields(subsidiary), lines: lines};
            }

            for (let i = cols.headerIdx + 1; i < listData.length; i++) {
                const row = listData[i];
                const chiTieu = row[cols.chiTieu];

                // Chỉ nhận line có tên chỉ tiêu là chuỗi (bỏ dòng số thứ tự cột, dòng trống, chữ ký...)
                if (typeof chiTieu !== 'string' || !chiTieu.trim()) continue;
                // Bắt buộc có Mã số mới là dòng dữ liệu
                const maSo = cols.maSo ? row[cols.maSo] : '';
                if (maSo == null || String(maSo).trim() === '') continue;

                const curVal = cols.current ? toNumber(row[cols.current]) : null;
                const prevVal = cols.previous ? toNumber(row[cols.previous]) : null;

                const prefix = commonData.AccountPrefix.PL_REPORT;
                let accountId = listAccount.find(o => o.acctnumber === `${prefix}_${stripLeadingZeros(maSo)}`)?.id;
                if(accountId) {
                    if (curVal !== null) lines.push(makeLine(accountId, curVal, commonData.PeriodType.CURRENT, dates));
                    if (prevVal !== null) lines.push(makeLine(accountId, prevVal, commonData.PeriodType.PREVIOUS, dates));
                }
            }

            return {fields: buildFields(subsidiary), lines: lines};
        };

        /**
         * Dò cột động của sheet BS Report dựa theo dòng tiêu đề chứa
         * "TÀI SẢN" / "Mã số" / "Thuyết minh" / "Số cuối năm" / "Số đầu năm".
         * @returns {{chiTieu, maSo, thuyetMinh, current, previous, headerIdx}}
         */
        const detectBSColumns = (listData) => {
            const cols = {headerIdx: -1};
            for (let i = 0; i < listData.length; i++) {
                const row = listData[i];
                for (const k in row) {
                    const v = stripAccent(row[k]);
                    if (v === 'so cuoi nam') cols.current = k;
                    else if (v === 'so dau nam') cols.previous = k;
                    else if (v === 'tai san') cols.chiTieu = k;
                    else if (v === 'ma so') cols.maSo = k;
                    else if (v === 'thuyet minh') cols.thuyetMinh = k;
                }
                if (cols.current && cols.previous) {
                    cols.headerIdx = i;
                    break;
                }
            }
            return cols;
        };

        /**
         * Lấy Đến ngày từ dòng "Tại ngày 18 tháng 6 năm 2026";
         * Từ ngày là ngày đầu năm của Đến ngày.
         * @returns {{fromDate: string, toDate: string}}
         */
        const extractBSDates = (listData) => {
            const pad2 = (v) => String(v).padStart(2, '0');
            for (const row of listData) {
                for (const k in row) {
                    const norm = stripAccent(row[k]);
                    const m = norm.match(/tai ngay (\d{1,2}) thang (\d{1,2}) nam (\d{4})/);
                    if (m) {
                        return {fromDate: `01/01/${m[3]}`, toDate: `${pad2(m[1])}/${pad2(m[2])}/${m[3]}`};
                    }
                }
            }
            return {fromDate: '', toDate: ''};
        };

        /**
         * Parse dữ liệu BS Report từ sheet → build theo mẫu { fields, lines }.
         * Mỗi chỉ tiêu sinh 2 line: "Số cuối năm" (CURRENT) và "Số đầu năm" (PREVIOUS).
         */
        const parseBSReport = (subsidiary, listData, listAccount) => {
            const cols = detectBSColumns(listData);
            const dates = extractBSDates(listData);
            const lines = [];

            if (cols.headerIdx === -1 || !cols.chiTieu) {
                return {fields: buildFields(subsidiary), lines: lines};
            }

            for (let i = cols.headerIdx + 1; i < listData.length; i++) {
                const row = listData[i];
                const chiTieu = row[cols.chiTieu];

                // Chỉ nhận line có tên chỉ tiêu là chuỗi (bỏ dòng số thứ tự cột, dòng trống, chữ ký...)
                if (typeof chiTieu !== 'string' || !chiTieu.trim()) continue;
                // Bắt buộc có Mã số mới là dòng dữ liệu
                const maSo = cols.maSo ? row[cols.maSo] : '';
                if (maSo == null || String(maSo).trim() === '') continue;

                const curVal = cols.current ? toNumber(row[cols.current]) : null;
                const prevVal = cols.previous ? toNumber(row[cols.previous]) : null;

                const prefix = commonData.AccountPrefix.BS_REPORT;
                let accountId = listAccount.find(o => o.acctnumber === `${prefix}_${stripLeadingZeros(maSo)}`)?.id;
                if (accountId) {
                    if (curVal !== null) lines.push(makeLine(accountId, curVal, commonData.PeriodType.CURRENT, dates));
                    if (prevVal !== null) lines.push(makeLine(accountId, prevVal, commonData.PeriodType.PREVIOUS, dates));
                }
            }

            return {fields: buildFields(subsidiary), lines: lines};
        };

        /**
         * Dò cột động của sheet Lưu chuyển tiền tệ (trực tiếp & gián tiếp) dựa theo dòng tiêu đề
         * chứa "CHỈ TIÊU" / "Mã số" / "Thuyết minh" / "Claris" (kỳ này) / "Kỳ trước".
         * @returns {{chiTieu, maSo, thuyetMinh, current, previous, headerIdx}}
         */
        const detectLCTTColumns = (listData) => {
            const cols = {headerIdx: -1};
            for (let i = 0; i < listData.length; i++) {
                const row = listData[i];
                for (const k in row) {
                    const v = stripAccent(row[k]);
                    if (v === 'claris') cols.current = k;
                    else if (v === 'ky truoc') cols.previous = k;
                    else if (v === 'chi tieu') cols.chiTieu = k;
                    else if (v === 'ma so') cols.maSo = k;
                    else if (v === 'thuyet minh') cols.thuyetMinh = k;
                }
                if (cols.current && cols.previous) {
                    cols.headerIdx = i;
                    break;
                }
            }
            return cols;
        };

        /**
         * Parse dữ liệu Lưu chuyển tiền tệ gián tiếp từ sheet → build theo mẫu { fields, lines }.
         * Mỗi chỉ tiêu sinh 2 line: "Claris" (CURRENT) và "Kỳ trước" (PREVIOUS).
         */
        const parseLCTTGTReport = (subsidiary, listData, listAccount) => {
            const cols = detectLCTTColumns(listData);
            const dates = extractDates(listData);
            const lines = [];

            if (cols.headerIdx === -1 || !cols.chiTieu) {
                return {fields: buildFields(subsidiary), lines: lines};
            }

            for (let i = cols.headerIdx + 1; i < listData.length; i++) {
                const row = listData[i];
                const chiTieu = row[cols.chiTieu];

                // Chỉ nhận line có tên chỉ tiêu là chuỗi (bỏ dòng số thứ tự cột, dòng trống, chữ ký...)
                if (typeof chiTieu !== 'string' || !chiTieu.trim()) continue;
                // Bắt buộc có Mã số mới là dòng dữ liệu
                const maSo = cols.maSo ? row[cols.maSo] : '';
                if (maSo == null || String(maSo).trim() === '') continue;

                const curVal = cols.current ? toNumber(row[cols.current]) : null;
                const prevVal = cols.previous ? toNumber(row[cols.previous]) : null;

                const prefix = commonData.AccountPrefix.BAO_CAO_LUU_CHUYEN_TIEN_TE_GIAN_TIEP;
                let accountId = listAccount.find(o => o.acctnumber === `${prefix}_${stripLeadingZeros(maSo)}`)?.id;
                if (accountId) {
                    if (curVal !== null) lines.push(makeLine(accountId, curVal, commonData.PeriodType.CURRENT, dates));
                    if (prevVal !== null) lines.push(makeLine(accountId, prevVal, commonData.PeriodType.PREVIOUS, dates));
                }
            }

            return {fields: buildFields(subsidiary), lines: lines};
        };

        /**
         * Parse dữ liệu Lưu chuyển tiền tệ trực tiếp từ sheet → build theo mẫu { fields, lines }.
         * Mỗi chỉ tiêu sinh 2 line: "Claris" (CURRENT) và "Kỳ trước" (PREVIOUS).
         */
        const parseLCTTTTReport = (subsidiary, listData, listAccount) => {
            const cols = detectLCTTColumns(listData);
            const dates = extractDates(listData);
            const lines = [];

            if (cols.headerIdx === -1 || !cols.chiTieu) {
                return {fields: buildFields(subsidiary), lines: lines};
            }

            for (let i = cols.headerIdx + 1; i < listData.length; i++) {
                const row = listData[i];
                const chiTieu = row[cols.chiTieu];

                // Chỉ nhận line có tên chỉ tiêu là chuỗi (bỏ dòng số thứ tự cột, dòng trống, chữ ký...)
                if (typeof chiTieu !== 'string' || !chiTieu.trim()) continue;
                // Bắt buộc có Mã số mới là dòng dữ liệu
                const maSo = cols.maSo ? row[cols.maSo] : '';
                if (maSo == null || String(maSo).trim() === '') continue;

                const curVal = cols.current ? toNumber(row[cols.current]) : null;
                const prevVal = cols.previous ? toNumber(row[cols.previous]) : null;

                const prefix = commonData.AccountPrefix.BAO_CAO_LUU_CHUYEN_TIEN_TE_TRUC_TIEP;
                let accountId = listAccount.find(o => o.acctnumber === `${prefix}_${stripLeadingZeros(maSo)}`)?.id;
                if (accountId) {
                    if (curVal !== null) lines.push(makeLine(accountId, curVal, commonData.PeriodType.CURRENT, dates));
                    if (prevVal !== null) lines.push(makeLine(accountId, prevVal, commonData.PeriodType.PREVIOUS, dates));
                }
            }

            return {fields: buildFields(subsidiary), lines: lines};
        };

        // ===================== PARSE FILE WORD (BCTC giữa niên độ) =====================
        // File Word là 1 tài liệu BCTC đầy đủ gồm 4 báo cáo (BS, PL, LCTT, TM). Dữ liệu đã
        // được bóc tách thành mảng phẳng data.paragraphs (mỗi phần tử là 1 đoạn text).
        // Mỗi "dòng" bảng nằm rải trên nhiều phần tử liên tiếp.

        // Ghép ngày dạng "01/06/2025"
        const pad2 = (v) => String(v).padStart(2, '0');

        // Chuỗi có chứa ký tự chữ (kể cả có dấu tiếng Việt) => coi là nhãn (chỉ tiêu), không phải số
        const wordHasLetter = (s) => /[A-Za-zÀ-ỹ]/.test(String(s == null ? '' : s));

        // Token giá trị số cho BS/PL/LCTT: số (có dấu . , phân tách), số âm trong ngoặc, hoặc "-"
        const wordIsValueTok = (s) => {
            const t = String(s == null ? '' : s).trim();
            if (t === '-') return true;
            return /^\(?-?[\d.,]+\)?$/.test(t);
        };

        // Token 1 ô của bảng TM: như trên nhưng chấp nhận thêm % và ký hiệu chú thích (i)(ii)... để giữ đúng vị trí cột
        const wordIsCellTok = (s) => {
            const t = String(s == null ? '' : s).trim();
            if (t === '-') return true;
            if (/^\(?-?[\d.,]+\)?%?$/.test(t)) return true;
            return /^\([ivxIVX]+\)$/.test(t);
        };

        // Chuyển value của Word sang số: bỏ hết dấu . , ; ngoặc () => số âm; "-" => null
        const wordToNumber = (v) => {
            if (v == null) return null;
            const s = String(v).trim();
            if (s === '' || s === '-') return null;
            const neg = /^\(.*\)$/.test(s) || s.indexOf('-') === 0;
            const digits = s.replace(/[^0-9]/g, '');
            if (digits === '') return null;
            const n = Number(digits);
            return neg ? -n : n;
        };

        // Chuyển "65,41%" / "100%" -> số thập phân (65.41 / 100). Trả null nếu không phải dạng %
        const wordToPercent = (v) => {
            const s = String(v == null ? '' : v).trim();
            const m = s.match(/^(-?[\d.,]+)%$/);
            if (!m) return null;
            const n = Number(m[1].replace(/\./g, '').replace(',', '.'));
            return isNaN(n) ? null : n;
        };

        // Rút ngày (dd/mm/yyyy) từ 1 đoạn: "Ngày 30 tháng 6 năm 2025" hoặc "... 30/6/2025"
        const wordExtractDate = (s) => {
            const raw = String(s == null ? '' : s);
            let m = stripAccent(raw).match(/(\d{1,2}) thang (\d{1,2}) nam (\d{4})/);
            if (m) return `${pad2(m[1])}/${pad2(m[2])}/${m[3]}`;
            m = raw.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
            if (m) return `${pad2(m[1])}/${pad2(m[2])}/${m[3]}`;
            return '';
        };

        // Tìm cặp ngày liền nhau đầu tiên trong [start, end): dòng cột trước (Current) & cột sau (Previous).
        // @returns {{fromDate, toDate, dateEnd}} - dateEnd = index dòng ngày thứ 2 (-1 nếu không có)
        const extractWordDatePair = (paragraphs, start, end) => {
            for (let i = start; i < end - 1; i++) {
                const d1 = wordExtractDate(paragraphs[i]);
                if (!d1) continue;
                const d2 = wordExtractDate(paragraphs[i + 1]);
                if (d2) return {fromDate: d2, toDate: d1, dateEnd: i + 1};
            }
            return {fromDate: '', toDate: '', dateEnd: -1};
        };

        // Vị trí (index) đầu tiên chứa đúng tiêu đề in hoa của 1 báo cáo (mục lục dùng title-case nên không trùng)
        const findWordSection = (paragraphs, upperTitle) => {
            for (let i = 0; i < paragraphs.length; i++) {
                if (String(paragraphs[i] == null ? '' : paragraphs[i]).indexOf(upperTitle) !== -1) return i;
            }
            return -1;
        };

        // Line cơ bản cho BS/PL/LCTT (theo yêu cầu 1-3: account theo Mã số, debit, period type, từ/đến ngày)
        const makeWordFsLine = (accountId, value, periodType, dates) => ({
            account: accountId,
            debit: value,
            lineunit: 1,
            custcol_scv_fs_period_type: periodType,
            custcol_scv_from_date: {text: dates.fromDate},
            custcol_scv_to_date: {text: dates.toDate}
        });

        /**
         * Quét các dòng của 1 báo cáo BS/PL/LCTT trong mảng paragraphs [start, end).
         * Mỗi dòng có dạng: [Mã số] [Chỉ tiêu] [(Thuyết minh?)] [Current] [Previous].
         * Mã số = số nguyên đứng ngay trước 1 nhãn (chỉ tiêu). Current/Previous là 2 token số cuối cùng.
         */
        const scanWordFsRows = (paragraphs, start, end, prefix, listAccount) => {
            const P = paragraphs;
            const lines = [];
            // Ngày cột trước (Current) -> from_date; cột sau (Previous) -> to_date
            const dates = extractWordDatePair(P, start, end);
            const isMaSo = (i) => /^\d{1,4}$/.test(String(P[i] == null ? '' : P[i]).trim()) && wordHasLetter(P[i + 1]);
            let i = start;
            while (i < end) {
                if (!isMaSo(i)) { i++; continue; }
                const maSo = String(P[i]).trim();
                let j = i + 2;
                const vals = [];
                while (j < end && !isMaSo(j) && wordIsValueTok(P[j])) { vals.push(P[j]); j++; }
                if (vals.length >= 2) {
                    const curVal = wordToNumber(vals[vals.length - 2]);
                    const prevVal = wordToNumber(vals[vals.length - 1]);
                    const accountId = listAccount.find(o => o.acctnumber === `${prefix}_${stripLeadingZeros(maSo)}`)?.id;
                    if (accountId) {
                        if (curVal !== null) lines.push(makeWordFsLine(accountId, curVal, commonData.PeriodType.CURRENT, dates));
                        if (prevVal !== null) lines.push(makeWordFsLine(accountId, prevVal, commonData.PeriodType.PREVIOUS, dates));
                    }
                }
                i = j;
            }
            return lines;
        };

        // Yêu cầu 1: Bảng cân đối kế toán giữa niên độ (prefix BS)
        const parseBSWordReport = (paragraphs, start, end, listAccount) =>
            scanWordFsRows(paragraphs, start, end, commonData.AccountPrefix.BS_REPORT, listAccount);

        // Yêu cầu 2: Báo cáo kết quả hoạt động kinh doanh giữa niên độ (prefix PL)
        const parsePLWordReport = (paragraphs, start, end, listAccount) =>
            scanWordFsRows(paragraphs, start, end, commonData.AccountPrefix.PL_REPORT, listAccount);

        // Yêu cầu 3: Báo cáo lưu chuyển tiền tệ giữa niên độ (dạng gián tiếp -> prefix LCTT GT)
        const parseLCTTWordReport = (paragraphs, start, end, listAccount) =>
            scanWordFsRows(paragraphs, start, end, commonData.AccountPrefix.BAO_CAO_LUU_CHUYEN_TIEN_TE_GIAN_TIEP, listAccount);

        // Prefix account cho phần Thuyết minh
        const TM_PREFIX = commonData.AccountPrefix.BANG_THUYET_MINH_BAO_CAO_TAI_CHINH; // 'TM BCTC'
        // Mã fallback khi không map được với thuyết minh
        const TM_FALLBACK = 'Z00';

        /**
         * Cấu hình từng bảng thuyết minh, KEY = TÊN bảng con (theo file yeucau / header trong document).
         * Lookup theo tên header (bỏ dấu) nên không phụ thuộc mã số.
         * - cols 'std'    : 2 cột (Current=0, Previous=1)
         * - cols 'giagoc' : nhiều cột, lấy 2 cột "Giá gốc" (hoặc cột 0 & 2) làm Current/Previous
         * - cols 'col'    : chỉ định cứng chỉ số cột cur/prev (prev=null nếu chỉ có Current)
         * - cols 'matrix' : bảng ma trận (TSCĐ hữu hình/vô hình) - đi qua parseTMMatrixTable,
         *                   các tuỳ chọn dưới đây KHÔNG áp dụng
         * cols chỉ nói về các cột SỐ; số cột NHÃN khai riêng:
         * - labels        : số cột nhãn của bảng (mặc định 1). Vd bảng bên liên quan = 2
         *                   ([bên liên quan][nội dung nghiệp vụ]). Word gộp ô khi trùng dòng trên,
         *                   dòng thiếu ô sẽ tự lấy lại nhãn của dòng trước.
         * - labelCol      : cột nhãn dùng làm memo, đánh số từ 1. Mặc định lấy cột cuối.
         * - account       : remap về note cha bằng TÊN note cha (vd "Vay ngân hàng" -> "Vay ngắn hạn")
         * - entity        : có map entity theo tên chỉ tiêu (getEntity); luôn map theo cột nhãn 1
         * Các mục "(chưa mapping)" (TSCĐ hữu hình/vô hình, Vốn chủ sở hữu tổng, Dữ liệu tương ứng...) => không khai báo => bỏ qua.
         * Lưu ý: "Vay ngắn hạn" có cột ngày không liền nhau — cấu trúc bất quy tắc, cần xử lý riêng
         *        nếu nghiệp vụ yêu cầu.
         */
        const TM_CONFIG = {
            'tiền': {cols: 'std'},
            'phải thu ngắn hạn của khách hàng': {cols: 'std', account: 'phải thu khách hàng và trả trước cho người bán ngắn hạn'},
            'trả trước cho người bán ngắn hạn': {cols: 'std', account: 'phải thu khách hàng và trả trước cho người bán ngắn hạn'},
            'nợ xấu': {cols: 'giagoc', entity: true},
            'hàng tồn kho': {cols: 'giagoc'},
            'thuế và các khoản phải thu, phải nộp nhà nước': {cols: 'std'},
            'tài sản cố định hữu hình': {cols: 'matrix'},
            'tài sản cố định vô hình': {cols: 'matrix'},
            'chi phí xây dựng cơ bản dở dang': {cols: 'std'},
            'đầu tư tài chính dài hạn': {cols: 'col', cur: 1, prev: null, entity: true},
            'chi phí trả trước': {cols: 'std'},
            'phải trả người bán ngắn hạn': {cols: 'giagoc', entity: true, account: 'phải trả cho người bán và người mua trả tiền trước ngắn hạn'},
            'người mua trả tiền trước ngắn hạn': {cols: 'giagoc', entity: true, account: 'phải trả cho người bán và người mua trả tiền trước ngắn hạn'},
            'chi phí phải trả ngắn hạn': {cols: 'std'},
            'phải trả khác': {cols: 'std'},
            'vay ngắn hạn': {cols: 'col', cur: 0, prev: 4},
            'vay ngân hàng': {cols: 'std', account: 'vay ngắn hạn'},
            'vay cá nhân': {cols: 'std', account: 'vay ngắn hạn'},
            'quỹ khen thưởng, phúc lợi': {cols: 'std'},
            'tình hình tăng, giảm vốn chủ sở hữu': {cols: 'tanggiamvcsh', account: 'vốn chủ sở hữu'},//
            'chi tiết vốn đầu tư của chủ sở hữu': {cols: 'chitietdautuvcsh', account: 'vốn chủ sở hữu'},//
            'các giao dịch về vốn với các chủ sở hữu và phân phối cổ tức, lợi nhuận': {cols: 'std', account: 'vốn chủ sở hữu'},
            'cổ tức': {cols: 'std', account: 'vốn chủ sở hữu'},
            'cổ phiếu': {cols: 'col', cur: 0, prev: 2, account: 'vốn chủ sở hữu'},
            'các khoản mục ngoài bảng cân đối kế toán': {cols: 'std'},
            'doanh thu bán hàng và cung cấp dịch vụ': {cols: 'std', account: 'doanh thu'},
            'doanh thu hoạt động tài chính': {cols: 'std', account: 'doanh thu'},
            'giá vốn hàng bán và dịch vụ cung cấp': {cols: 'std'},
            'chi phí tài chính': {cols: 'std'},
            'chi phí bán hàng và chi phí quản lý doanh nghiệp': {cols: 'std'},
            'thu nhập và chi phí khác': {cols: 'std'},
            'chi phí kinh doanh theo yếu tố': {cols: 'std'},
            'chi phí thuế tndn': {cols: 'std', account: 'thuế thu nhập doanh nghiệp'},
            'dưới đây là đối chiếu giữa chi phí thuế tndn và lợi nhuận kế toán trước thuế nhân với thuế suất áp dụng cho công ty': {cols: 'std', account: 'chi phí thuế tndn'},
            'tài sản thuế thu nhập hoãn lại': {cols: 'std', account: 'thuế thu nhập doanh nghiệp'},
            'nghiệp vụ với các bên liên quan': {cols: 'std', labels: 2, entity: true},
            // memo = cột 2 (nội dung nghiệp vụ) vì 1 bên liên quan có thể có nhiều dòng (vd Cổ tức công bố / Cổ tức đã trả)
            'những giao dịch trọng yếu của công ty với các bên liên quan trong kỳ này và kỳ trước bao gồm': {cols: 'std', labels: 2, labelCol: 1, entity: true, account: 'nghiệp vụ với các bên liên quan'},
            // memo = cột 1 (tên bên liên quan) vì mỗi bên chỉ có 1 dòng, nội dung nghiệp vụ đều là "Mua hàng hóa"
            'vào ngày kết thúc kỳ kế toán, số dư các khoản phải thu và phải trả với các bên liên quan như sau': {cols: 'std', labels: 2, labelCol: 1, entity: true, account: 'nghiệp vụ với các bên liên quan'},
            'tiền lương, thù lao của các thành viên hội đồng quản trị (“hđqt”) và ban tổng giám đốc': {cols: 'std', account: 'nghiệp vụ với các bên liên quan'},
            'tiền lương và chi phí hoạt động của ban kiểm soát': {cols: 'std', account: 'nghiệp vụ với các bên liên quan'},
            'các cam kết': {cols: 'std'},
            'công ty hiện đang cho thuê tài sản theo hợp đồng thuê hoạt động. vào ngày kết thúc kỳ kế toán, các khoản tiền thuê tối thiểu trong tương lai theo hợp đồng thuê hoạt động được trình bày như sau': {cols: 'std', account: 'các cam kết'},
            'lãi trên cổ phiếu': {cols: 'std'}
        };
        // Tra cứu config theo tên đã bỏ dấu (khớp bền vững với header trong document)
        const TM_CONFIG_BY_NAME = {};
        for (const _name in TM_CONFIG) TM_CONFIG_BY_NAME[stripAccent(_name)] = {cfg: TM_CONFIG[_name], name: _name};

        /**
         * Các bảng thuyết minh có tiêu đề là CÂU DẪN, không đánh số thứ tự ở đầu nên headerRe
         * (số + tab) không bắt được. Liệt kê ở đây để parseTMBCWordReport nhận diện thêm.
         * Tên phải trùng KEY trong TM_CONFIG (không kể dấu câu cuối câu).
         */
        const TM_TEXT_HEADS = {};
        [
            'Dưới đây là đối chiếu giữa chi phí thuế TNDN và lợi nhuận kế toán trước thuế nhân với thuế suất áp dụng cho Công ty',
            'Những giao dịch trọng yếu của Công ty với các bên liên quan trong kỳ này và kỳ trước bao gồm',
            'Vào ngày kết thúc kỳ kế toán, số dư các khoản phải thu và phải trả với các bên liên quan như sau',
            'Tiền lương, thù lao của các thành viên Hội đồng Quản trị (“HĐQT”) và Ban Tổng Giám đốc',
            'Tiền lương và chi phí hoạt động của Ban kiểm soát',
            'Công ty hiện đang cho thuê tài sản theo hợp đồng thuê hoạt động. Vào ngày kết thúc kỳ kế toán, các khoản tiền thuê tối thiểu trong tương lai theo hợp đồng thuê hoạt động được trình bày như sau'
        ].forEach(n => { TM_TEXT_HEADS[stripAccent(n)] = true; });

        // Tiêu đề cột của bảng TM (không phải dữ liệu, không phải entity) -> bỏ qua, đọc dòng kế tiếp
        const TM_NOISE_LABELS = {};
        ['Tên']
            .forEach(n => { TM_NOISE_LABELS[stripAccent(n)] = true; });

        /**
         * Dòng chữ KHÔNG có ô số đi kèm: là tiêu đề cột ("Tên") hay tiêu đề phụ
         * ("Phải trả người bán ngắn hạn (Thuyết minh số 14)") -> bỏ qua, đọc dòng kế tiếp.
         * Lưu ý chỉ áp cho dòng không có giá trị: dòng dữ liệu thật cũng có thể mang hậu tố
         * "(Thuyết minh số N)" (vd "Doanh thu đối với bên liên quan (Thuyết minh số 28)").
         */
        const isTMNoiseLabel = (nLabel) =>
            !!TM_NOISE_LABELS[nLabel] || /\(thuyet minh so \d+\)/.test(nLabel);

        // Xác định chỉ số cột Current/Previous dựa theo cấu hình + tiêu đề cột con
        const resolveTMCols = (cfg, subHeaders, nVals) => {
            if (cfg.cols === 'col') return {cur: cfg.cur, prev: cfg.prev};
            if (cfg.cols === 'giagoc') {
                const gi = [];
                subHeaders.forEach((s, idx) => { if (s === 'gia goc') gi.push(idx); });
                if (gi.length >= 2) return {cur: gi[0], prev: gi[1]};
                return {cur: 0, prev: nVals >= 3 ? 2 : 1};
            }
            return {cur: 0, prev: nVals >= 2 ? 1 : null, cols: cfg.cols}; // std
        };

        // "dd/mm/yyyy" -> "yyyymmdd" để so sánh 2 mốc ngày bằng phép so chuỗi
        const wordDateSortKey = (d) => {
            const m = String(d == null ? '' : d).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            return m ? `${m[3]}${m[2]}${m[1]}` : '';
        };

        /**
         * Map account của 1 bảng thuyết minh: acctnumber bắt đầu bằng "TM BCTC", acctname khớp
         * tên note (vd "4. TIỀN" -> "tiền"). Không khớp thì rơi về "TM BCTC_Z00".
         * @param {string} noteName - TÊN note, đã resolve về note cha nếu cfg.account có remap
         * @returns {string|undefined} id account, undefined nếu cả fallback cũng không có
         */
        const findTMAccount = (noteName, listAccount) => {
            const keyName = (s) => String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
            const nameKey = keyName(noteName);
            const id = listAccount.find(o =>
                String(o.acctnumber == null ? '' : o.acctnumber).indexOf(TM_PREFIX) === 0
                && keyName(o.acctname) === nameKey
            )?.id;
            return id || listAccount.find(o => o.acctnumber === `${TM_PREFIX}_${TM_FALLBACK}`)?.id;
        };

        // Line cho phần TM (thêm memo, ngày từ/đến, entity)
        const makeTMLine = (accountId, value, periodType, memo, dates, entityId) => {
            const line = {
                account: accountId,
                debit: value,
                lineunit: 1,
                custcol_scv_fs_period_type: periodType,
                memo: memo,
                custcol_scv_from_date: {text: dates.fromDate},
                custcol_scv_to_date: {text: dates.toDate}
            };
            if (entityId) line.entity = entityId;
            return line;
        };

        /**
         * Parse 1 bảng thuyết minh [start, end): tìm 2 dòng tiêu đề ngày (Current/Previous),
         * các tiêu đề cột con, rồi từng dòng dữ liệu [các ô nhãn][các ô giá trị]. Bỏ dòng "TỔNG CỘNG"
         * và dừng khi gặp bảng phụ ("Chi tiết tình hình..." / "Đơn vị tính" thứ 2).
         * @param {Array<string>} paragraphs - toàn bộ paragraph của file Word (mỗi ô bảng là 1 phần tử)
         * @param {number} start - index bắt đầu quét, ngay SAU dòng header của bảng
         * @param {number} end - index kết thúc (không bao gồm), thường là index header của bảng kế tiếp
         * @param {{cfg: Object, name: string}} hit - 1 entry của TM_CONFIG_BY_NAME.
         *        cfg = cấu hình bảng (cols/labels/labelCol/entity/account - xem mô tả ở TM_CONFIG),
         *        name = TÊN bảng đúng như KEY trong TM_CONFIG, dùng làm account khi cfg.account trống.
         * @param {Array<{id: string, acctnumber: string, acctname: string}>} listAccount - account
         *        Statistical; map theo acctname, fallback về "TM BCTC_Z00" nếu không khớp tên nào
         * @param {Array<{id: string, entityid: string}>} listEntity - danh sách entity để map cột nhãn 1;
         *        chỉ dùng khi cfg.entity = true, truyền null nếu bảng không cần map entity
         * @returns {Array} các line của bảng (rỗng nếu bảng không có dữ liệu / không map được account)
         */
        const parseTMSubTable = (paragraphs, start, end, hit, listAccount, listEntity) => {
            const P = paragraphs;
            const cfg = hit.cfg;
            // account: remap về note cha (cfg.account) hoặc dùng chính tên bảng
            const noteName = cfg.account || hit.name;
            const lines = [];

            // 1) Tìm cặp ngày liền nhau (Current, Previous)
            const dates = extractWordDatePair(P, start, end);
            if (dates.dateEnd === -1) return lines; // bảng chỉ có chữ hoặc cấu trúc bất quy tắc -> bỏ qua

            // 2) Tiêu đề cột con = chuỗi các dòng chữ tới khi gặp dòng chữ mà ngay sau là 1 ô số (dòng dữ liệu đầu tiên).
            // Bảng nhiều cột nhãn thì tiêu đề cột nằm TRƯỚC 2 dòng ngày, dữ liệu bắt đầu ngay sau dateEnd;
            // quét subHeaders ở đây sẽ nuốt mất các ô nhãn của dòng dữ liệu đầu tiên.
            let k = dates.dateEnd + 1;
            const subHeaders = [];
            if ((cfg.labels || 1) === 1) {
                while (k < end && wordHasLetter(P[k]) && !wordIsCellTok(P[k + 1])) {
                    subHeaders.push(stripAccent(P[k]));
                    k++;
                }
            }

            const accountId = findTMAccount(noteName, listAccount);
            if (!accountId) return lines;

            // 3) Từng dòng dữ liệu = [1..N ô nhãn][1..M ô số]; nhãn và số gom cùng một cách.
            const nLabels = cfg.labels || 1;   // số cột nhãn của bảng
            let carry = [];                    // nhãn dòng trước - dùng lại cho cột bị gộp ô
            let stopped = false;
            while (k < end && !stopped) {
                if (!wordHasLetter(P[k])) { k++; continue; }

                // Gom ô nhãn: các dòng chữ liên tiếp, bỏ tiêu đề cột / tiêu đề phụ xen giữa
                let j = k;
                const labelCols = [];
                while (j < end && wordHasLetter(P[j]) && !wordIsCellTok(P[j])) {
                    const t = stripAccent(P[j]);
                    // Gặp bảng phụ khác -> dừng cả bảng
                    if (t.indexOf('don vi tinh') !== -1 || t.indexOf('chi tiet tinh hinh') !== -1) { stopped = true; break; }
                    if (!isTMNoiseLabel(t)) labelCols.push(P[j]);
                    j++;
                }
                if (stopped) break;

                // Gom ô số
                const vals = [];
                while (j < end && wordIsCellTok(P[j])) { vals.push(P[j]); j++; }

                k = j > k ? j : k + 1;
                // khối chữ thuần (ghi chú, diễn giải) hoặc ô số không có nhãn -> bỏ
                if (labelCols.length === 0 || vals.length === 0) continue;
                if (stripAccent(labelCols[labelCols.length - 1]) === 'tong cong') continue; // bỏ dòng tổng cộng

                // Căn phải các ô nhãn đọc được vào nLabels cột: dòng thiếu ô ở cột đầu
                // (Word gộp ô khi trùng dòng trên) thì lấy lại nhãn của dòng trước.
                const take = labelCols.slice(-nLabels);
                const row = carry.slice(0, nLabels);
                take.forEach((t, x) => { row[nLabels - take.length + x] = t; });
                carry = row;

                const cols = resolveTMCols(cfg, subHeaders, vals.length);
                // cfg.labelCol (đánh số từ 1) chọn cột nhãn làm memo; mặc định lấy cột cuối.
                const rowLabel = row[(cfg.labelCol || nLabels) - 1] || row[nLabels - 1] || '';
                // entity luôn map theo cột nhãn 1, độc lập với memo
                const entityId = (cfg.entity && listEntity)
                    ? (listEntity.find(e => stripAccent(e.entityid) === stripAccent(row[0]))?.id || null)
                    : null;
                if (cols.cur != null && vals[cols.cur] !== undefined) {
                    const c = wordToNumber(vals[cols.cur]);
                    if (c !== null) lines.push(makeTMLine(accountId, c, commonData.PeriodType.CURRENT, rowLabel, dates, entityId));
                }
                if (cols.prev != null && vals[cols.prev] !== undefined) {
                    const p = wordToNumber(vals[cols.prev]);
                    if (p !== null) lines.push(makeTMLine(accountId, p, commonData.PeriodType.PREVIOUS, rowLabel, dates, entityId));
                }
            }
            return lines;
        };

        // Rút ngày từ ô nhãn dạng "Vào ngày 31/12/2024" / "Vào ngày 30/6/2025". Trả '' nếu không phải
        const tmMatrixDate = (s) => {
            const raw = String(s == null ? '' : s);
            return stripAccent(raw).indexOf('vao ngay') === 0 ? wordExtractDate(raw) : '';
        };

        // Rút ngày kết thúc kỳ từ ô nhãn dạng "Cho giai đoạn 6 tháng kết thúc 30/6/2025". Trả '' nếu không phải
        const tmPeriodDate = (s) => {
            const raw = String(s == null ? '' : s);
            return stripAccent(raw).indexOf('cho giai doan') === 0 ? wordExtractDate(raw) : '';
        };

        /**
         * Parse bảng thuyết minh dạng MA TRẬN (TSCĐ hữu hình / vô hình): cột = loại tài sản
         * (số cột động theo bảng), dòng = mốc "Vào ngày dd/mm/yyyy", nhóm theo từng cụm
         * ("Nguyên giá:", "Giá trị khấu hao lũy kế:", "Giá trị còn lại:").
         *
         * Quy tắc (file yeucau):
         * - Cột: các dòng chữ sau "Đơn vị tính: VND" cho tới cụm đầu tiên. Bỏ cột "Tổng cộng".
         * - Chỉ lấy dòng có ô nhãn bắt đầu bằng "Vào ngày" (bỏ "Trong đó: Đã khấu hao hết",
         *   "Khấu hao trong kỳ"...), ghép 2 dòng "Vào ngày" liền nhau thành 1 cặp:
         *   ngày nhỏ hơn -> PREVIOUS, ngày lớn hơn -> CURRENT, rồi kết thúc cặp.
         * - Mỗi cột trong cặp sinh 1 line CURRENT + 1 line PREVIOUS, memo = "<cụm> - <tên cột>"
         *   (kèm tên cụm vì 1 cột xuất hiện ở cả 3 cụm với giá trị khác nhau).
         * @param {Array<string>} paragraphs - toàn bộ paragraph của file Word
         * @param {number} start - index bắt đầu quét, ngay SAU dòng header của bảng
         * @param {number} end - index kết thúc (không bao gồm)
         * @param {{cfg: Object, name: string}} hit - 1 entry của TM_CONFIG_BY_NAME
         * @param {Array<{id: string, acctnumber: string, acctname: string}>} listAccount - account Statistical
         * @returns {Array} các line của bảng (rỗng nếu không đọc được cột / không map được account)
         */
        const parseTMMatrixTable = (paragraphs, start, end, hit, listAccount) => {
            const P = paragraphs;
            const lines = [];

            const accountId = findTMAccount(hit.cfg.account || hit.name, listAccount);
            if (!accountId) return lines;

            // 1) Tên cột: các dòng chữ sau "Đơn vị tính" cho tới khi gặp cụm đầu tiên (nhãn kết thúc bằng ':')
            let k = start;
            while (k < end && stripAccent(P[k]).indexOf('don vi tinh') === -1) k++;
            k++;
            const colNames = [];
            while (k < end && wordHasLetter(P[k]) && !wordIsCellTok(P[k]) && String(P[k]).trim().slice(-1) !== ':') {
                colNames.push(P[k]);
                k++;
            }
            if (colNames.length === 0) return lines;
            // "Tổng cộng" là cột cuối - vẫn cần giữ để căn đúng vị trí ô số, nhưng không sinh line
            const nCols = colNames.length;

            // 2) Duyệt từng dòng [ô nhãn][nCols ô số], gom các dòng "Vào ngày" theo cụm hiện tại
            let group = '';       // tên cụm gần nhất ("Nguyên giá:"...)
            let pending = null;   // dòng "Vào ngày" đầu của cặp đang chờ ghép
            while (k < end) {
                if (!wordHasLetter(P[k]) || wordIsCellTok(P[k])) { k++; continue; }
                const label = String(P[k]).trim();

                let j = k + 1;
                const vals = [];
                while (j < end && wordIsCellTok(P[j])) { vals.push(P[j]); j++; }
                k = j > k ? j : k + 1;

                if (vals.length === 0) {                 // dòng chữ đứng riêng -> tên cụm mới, mở cặp mới
                    group = label;
                    pending = null;
                    continue;
                }
                const date = tmMatrixDate(label);
                if (!date) continue;                     // dòng không phải mốc "Vào ngày" -> bỏ

                if (!pending) { pending = {date: date, vals: vals}; continue; }

                // Đủ cặp: ngày nhỏ hơn = Previous, lớn hơn = Current
                const asc = wordDateSortKey(pending.date) <= wordDateSortKey(date);
                const prevRow = asc ? pending : {date: date, vals: vals};
                const curRow = asc ? {date: date, vals: vals} : pending;
                const dates = {fromDate: prevRow.date, toDate: curRow.date};
                pending = null;

                colNames.forEach((name, c) => {
                    if (c === nCols - 1 && stripAccent(name) === 'tong cong') return; // bỏ cột Tổng cộng
                    const memo = `${group} - ${name}`;
                    const cur = wordToNumber(curRow.vals[c]);
                    const prev = wordToNumber(prevRow.vals[c]);
                    if (cur !== null) lines.push(makeTMLine(accountId, cur, commonData.PeriodType.CURRENT, memo, dates, null));
                    if (prev !== null) lines.push(makeTMLine(accountId, prev, commonData.PeriodType.PREVIOUS, memo, dates, null));
                });
            }
            return lines;
        };

        /**
         * Parse bảng thuyết minh "Chi tiết vốn đầu tư của chủ sở hữu" (cols 'chitietdautuvcsh'):
         * cấu trúc riêng, không theo 'std' - 1 cột nhãn (tên chủ sở hữu) + nhiều cột số, trong đó
         * có đúng 2 cột "Tổng số (dd/mm/yyyy)" (Current/Previous theo mốc ngày) và 1 cột "Tỷ lệ sở hữu".
         * Các cột số khác (vd "Cổ phiếu thường") chưa có yêu cầu mapping -> bỏ qua.
         * @param {Array<string>} paragraphs - toàn bộ paragraph của file Word
         * @param {number} start - index bắt đầu quét, ngay SAU dòng header của bảng
         * @param {number} end - index kết thúc (không bao gồm)
         * @param {{cfg: Object, name: string}} hit - 1 entry của TM_CONFIG_BY_NAME
         * @param {Array<{id: string, acctnumber: string, acctname: string}>} listAccount - account Statistical
         * @returns {Array} các line của bảng (rỗng nếu không đọc được cột / không map được account)
         */
        const parseTMOwnershipTable = (paragraphs, start, end, hit, listAccount) => {
            const P = paragraphs;
            const lines = [];

            const accountId = findTMAccount(hit.cfg.account || hit.name, listAccount);
            if (!accountId) return lines;

            // 1) Tên cột: các dòng chữ sau "Đơn vị tính" cho tới ô số đầu tiên. Bảng chỉ có 1 cột nhãn
            // nên dòng chữ CUỐI trong khối gom được chính là nhãn của dòng dữ liệu đầu tiên, không phải tiêu đề cột.
            let k = start;
            while (k < end && stripAccent(P[k]).indexOf('don vi tinh') === -1) k++;
            k++;
            const block = [];
            while (k < end && wordHasLetter(P[k]) && !wordIsCellTok(P[k])) { block.push(P[k]); k++; }
            if (block.length < 2) return lines;
            let rowLabel = block.pop();
            const colHeaders = block;
            const nCols = colHeaders.length;

            // 2) Xác định vị trí cột: "Tỷ lệ sở hữu" và 2 cột "Tổng số (ngày)" - so ngày để biết Current/Previous
            const percentIdx = colHeaders.findIndex(h => stripAccent(h) === 'ty le so huu');
            const dateCols = colHeaders
                .map((h, idx) => ({idx: idx, date: wordExtractDate(h)}))
                .filter(x => x.date);
            if (dateCols.length < 2) return lines;
            dateCols.sort((a, b) => wordDateSortKey(a.date) < wordDateSortKey(b.date) ? -1 : 1);
            const prevCol = dateCols[0];
            const curCol = dateCols[dateCols.length - 1];
            const dates = {fromDate: prevCol.date, toDate: curCol.date};

            // 3) Từng dòng dữ liệu = [1 ô nhãn][nCols ô số]. Bỏ dòng "TỔNG CỘNG".
            while (k < end && rowLabel) {
                const vals = [];
                while (k < end && wordIsCellTok(P[k]) && vals.length < nCols) { vals.push(P[k]); k++; }

                if (vals.length === nCols && stripAccent(rowLabel) !== 'tong cong') {
                    const percentVal = percentIdx !== -1 ? wordToPercent(vals[percentIdx]) : null;
                    const curVal = wordToNumber(vals[curCol.idx]);
                    const prevVal = wordToNumber(vals[prevCol.idx]);
                    if (curVal !== null) {
                        const line = makeTMLine(accountId, curVal, commonData.PeriodType.CURRENT, rowLabel, dates, null);
                        if (percentVal !== null) line.custcol_scv_tylesohuu = percentVal;
                        lines.push(line);
                    }
                    if (prevVal !== null) {
                        const line = makeTMLine(accountId, prevVal, commonData.PeriodType.PREVIOUS, rowLabel, dates, null);
                        if (percentVal !== null) line.custcol_scv_tylesohuu = percentVal;
                        lines.push(line);
                    }
                }

                // Đọc nhãn dòng kế tiếp
                rowLabel = null;
                while (k < end && wordHasLetter(P[k]) && !wordIsCellTok(P[k])) { rowLabel = P[k]; k++; }
            }
            return lines;
        };

        /**
         * Parse bảng thuyết minh "Tình hình tăng, giảm vốn chủ sở hữu" (cols 'tanggiamvcsh'):
         * gần giống parseTMMatrixTable (nhiều cột động, đọc sau "Đơn vị tính") nhưng khác ở chỗ
         * NHÓM theo dòng "Cho giai đoạn ... kết thúc dd/mm/yyyy" (không có ô số) thay vì theo cụm
         * "Vào ngày" ghép cặp: mỗi cụm "Cho giai đoạn" gồm nhiều dòng dữ liệu phía sau (Vào ngày.../
         * Lợi nhuận.../ Chia cổ tức...), mỗi dòng đều có nCols ô số và đều thuộc cùng 1 kỳ với cụm.
         * Cụm có ngày kết thúc NHỎ HƠN -> Previous (lấy vào from_date); cụm có ngày kết thúc LỚN HƠN
         * -> Current (lấy vào to_date). Mỗi ô số sinh 1 line, memo = "<nhãn dòng> - <tên cột>".
         * @param {Array<string>} paragraphs - toàn bộ paragraph của file Word
         * @param {number} start - index bắt đầu quét, ngay SAU dòng header của bảng
         * @param {number} end - index kết thúc (không bao gồm)
         * @param {{cfg: Object, name: string}} hit - 1 entry của TM_CONFIG_BY_NAME
         * @param {Array<{id: string, acctnumber: string, acctname: string}>} listAccount - account Statistical
         * @returns {Array} các line của bảng (rỗng nếu không đọc được cột / không đủ 2 kỳ / không map được account)
         */
        const parseTMEquityChangeTable = (paragraphs, start, end, hit, listAccount) => {
            const P = paragraphs;
            const lines = [];

            const accountId = findTMAccount(hit.cfg.account || hit.name, listAccount);
            if (!accountId) return lines;

            // 1) Tên cột: các dòng chữ sau "Đơn vị tính" cho tới cụm "Cho giai đoạn" đầu tiên
            let k = start;
            while (k < end && stripAccent(P[k]).indexOf('don vi tinh') === -1) k++;
            k++;
            const colNames = [];
            while (k < end && wordHasLetter(P[k]) && !wordIsCellTok(P[k]) && !tmPeriodDate(P[k])) {
                colNames.push(P[k]);
                k++;
            }
            if (colNames.length === 0) return lines;
            const nCols = colNames.length;

            // 2) Duyệt từng dòng: dòng "Cho giai đoạn..." mở 1 kỳ mới (không sinh line), các dòng
            // [nhãn][nCols ô số] kế tiếp thuộc về kỳ đang mở, gom lại chờ xác định Current/Previous
            let period = null;    // ngày kết thúc kỳ của cụm hiện tại
            const seenDates = []; // tất cả mốc ngày các cụm đã gặp -> xác định min/max
            const rows = [];      // {label, vals, period} chờ đến khi biết đủ periodType
            while (k < end) {
                if (!wordHasLetter(P[k]) || wordIsCellTok(P[k])) { k++; continue; }
                const label = String(P[k]).trim();

                let j = k + 1;
                const vals = [];
                while (j < end && wordIsCellTok(P[j])) { vals.push(P[j]); j++; }
                k = j > k ? j : k + 1;

                const pDate = tmPeriodDate(label);
                if (pDate) { period = pDate; seenDates.push(pDate); continue; } // mở cụm "Cho giai đoạn" mới
                if (vals.length === 0 || !period) continue; // dòng chữ đứng riêng / chưa vào cụm -> bỏ

                rows.push({label: label, vals: vals, period: period});
            }
            if (seenDates.length < 2) return lines; // không đủ 2 mốc kỳ để so sánh Current/Previous

            seenDates.sort((a, b) => wordDateSortKey(a) < wordDateSortKey(b) ? -1 : 1);
            const prevDate = seenDates[0];
            const curDate = seenDates[seenDates.length - 1];
            const dates = {fromDate: prevDate, toDate: curDate};

            rows.forEach(row => {
                const periodType = row.period === curDate ? commonData.PeriodType.CURRENT
                    : row.period === prevDate ? commonData.PeriodType.PREVIOUS : null;
                if (!periodType) return;
                colNames.forEach((name, c) => {
                    if (c === nCols - 1 && stripAccent(name) === 'tong cong') return; // bỏ cột Tổng cộng
                    const val = wordToNumber(row.vals[c]);
                    if (val !== null) lines.push(makeTMLine(accountId, val, periodType, `${row.label} - ${name}`, dates, null));
                });
            });

            return lines;
        };

        /**
         * Yêu cầu 4: Thuyết minh báo cáo tài chính giữa niên độ.
         * Tách thành các bảng con theo header ("4.\tTIỀN", "5.1\t...") rồi tra TM_CONFIG theo TÊN bảng.
         */
        const parseTMBCWordReport = (paragraphs, start, end, listAccount, listEntity) => {
            const P = paragraphs;
            const lines = [];
            const headerRe = /^(\d{1,2}(?:\.\d{1,2})?)\.?\t(.+)$/;
            const heads = [];
            for (let i = start; i < end; i++) {
                const raw = String(P[i] == null ? '' : P[i]).replace(/\(tiếp theo\)/gi, '').trim();
                // name = phần tên sau số, bỏ hậu tố "(tiếp theo)"
                const m = raw.match(headerRe);
                if (m) { heads.push({idx: i, name: m[2].trim()}); continue; }
                // Header dạng câu dẫn, không đánh số ở đầu -> bỏ dấu câu cuối rồi tra TM_TEXT_HEADS.
                // Ngay sau header luôn là "Đơn vị tính"/tiêu đề cột, KHÔNG bao giờ là ô số; nhờ vậy
                // loại được dòng dữ liệu trùng tên header (vd "Tiền lương ... Ban kiểm soát" vừa là
                // header vừa là chỉ tiêu duy nhất của bảng) - nếu nhận nhầm sẽ cắt mất dữ liệu.
                const plain = raw.replace(/[:;.\s]+$/, '').trim();
                if (plain && TM_TEXT_HEADS[stripAccent(plain)] && !wordIsCellTok(P[i + 1])) heads.push({idx: i, name: plain});
            }
            heads.push({idx: end, name: null});
            for (let h = 0; h < heads.length - 1; h++) {
                const hit = heads[h].name ? TM_CONFIG_BY_NAME[stripAccent(heads[h].name).toLowerCase()] : null;
                if (!hit) continue; // mục chưa mapping -> bỏ qua
                const from = heads[h].idx + 1;
                const to = heads[h + 1].idx;
                // Bảng ma trận (TSCĐ hữu hình/vô hình) có cấu trúc khác hẳn -> parser riêng
                if (hit.cfg.cols === 'matrix') lines.push(...parseTMMatrixTable(P, from, to, hit, listAccount));
                // Bảng "Chi tiết vốn đầu tư của chủ sở hữu" cũng có cấu trúc khác -> parser riêng
                else if (hit.cfg.cols === 'chitietdautuvcsh') lines.push(...parseTMOwnershipTable(P, from, to, hit, listAccount));
                // Bảng "Tình hình tăng, giảm vốn chủ sở hữu" cũng có cấu trúc khác -> parser riêng
                else if (hit.cfg.cols === 'tanggiamvcsh') lines.push(...parseTMEquityChangeTable(P, from, to, hit, listAccount));
                else lines.push(...parseTMSubTable(P, from, to, hit, listAccount, listEntity));
            }
            return lines;
        };

        /**
         * Parse toàn bộ file Word BCTC giữa niên độ -> build { fields, lines }.
         * Gộp line của cả 4 báo cáo (BS, PL, LCTT, TM) vào 1 record.
         */
        const parseBCTMTCReport = (subsidiary, paragraphs, listAccount, listEntity) => {
            const P = paragraphs || [];
            const lines = [];
            const bsIdx = findWordSection(P, 'BẢNG CÂN ĐỐI KẾ TOÁN GIỮA NIÊN ĐỘ');
            const plIdx = findWordSection(P, 'BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH GIỮA NIÊN ĐỘ');
            const lcttIdx = findWordSection(P, 'BÁO CÁO LƯU CHUYỂN TIỀN TỆ GIỮA NIÊN ĐỘ');
            const tmIdx = findWordSection(P, 'THUYẾT MINH BÁO CÁO TÀI CHÍNH GIỮA NIÊN ĐỘ');

            if (bsIdx !== -1 && plIdx !== -1) lines.push(...parseBSWordReport(P, bsIdx, plIdx, listAccount));
            if (plIdx !== -1 && lcttIdx !== -1) lines.push(...parsePLWordReport(P, plIdx, lcttIdx, listAccount));
            if (lcttIdx !== -1 && tmIdx !== -1) lines.push(...parseLCTTWordReport(P, lcttIdx, tmIdx, listAccount));
            if (tmIdx !== -1) lines.push(...parseTMBCWordReport(P, tmIdx, P.length, listAccount, listEntity));

            return {fields: buildFields(subsidiary), lines: lines};
        };

        /**
         * Lấy danh sách account loại Statistical.
         * @returns {Array<{id: string, acctnumber: string}>}
         */
        const getStatAccounts = () => {
            const sql = "select ac.id, ac.acctnumber, LOWER(TRIM(REGEXP_REPLACE(ac.accountsearchdisplaynamecopy, '^TM\\s*', ''))) AS acctname from account ac where ac.accttype = ?";
            const records = [];
            libRep.doSearchSqlAll(records, sql, ['Stat']);
            return records;
        };

        /**
         * Lấy danh sách entity (id + entityid).
         * @returns {Array<{id: string, entityid: string}>}
         */
        const getEntity = () => {
            const sql = "select en.id, en.entityid from entity en where en.isinactive = ?";
            const records = [];
            libRep.doSearchSqlAll(records, sql, ['F']);
            return records;
        };

        const buildFields = (subsidiary) => ({
            subsidiary: subsidiary || commonData.Subsidiary.VINAPHARM,
            unitstype: 1
        });

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            let body = JSON.parse(scriptContext.request.body);
            let subsidiary = body.subsidiary;
            let data = body.data;
            let result = null;
            let listAccount = getStatAccounts();
            let sjId = '';
            if (data.kind === commonData.FileKind.XLSX && data.sheets) {
                let keys = Object.keys(data.sheets);
                let key = keys[0];
                let listData = data.sheets[key];
                if (listData && util.isArray(listData)) {
                    if (body.reportType === commonData.ReportType.PL_REPORT) {
                        result = parsePLReport(subsidiary, listData, listAccount);
                    } else if (body.reportType === commonData.ReportType.BS_REPORT) {
                        result = parseBSReport(subsidiary, listData, listAccount);
                    } else if (body.reportType === commonData.ReportType.BAO_CAO_LUU_CHUYEN_TIEN_TE_GIAN_TIEP) {
                        result = parseLCTTGTReport(subsidiary, listData, listAccount);
                    } else if (body.reportType === commonData.ReportType.BAO_CAO_LUU_CHUYEN_TIEN_TE_TRUC_TIEP) {
                        result = parseLCTTTTReport(subsidiary, listData, listAccount);
                    }

                    if (result) {
                        result.fields.custbody_scv_fs_report_type = commonData.ReportTypeToReportList[body.reportType];
                        sjId = libFunc.createRecord(commonData.RecordType.STATISTICAL_JOURNALENTRY, commonData.Sublist.LINE, result.fields, result.lines);
                    }
                }
            } else if (data.kind === commonData.FileKind.WORD && data.paragraphs) {
                // File Word BCTC giữa niên độ (gồm BS, PL, LCTT, TM) -> 1 record thống kê
                let listEntity = getEntity();
                result = parseBCTMTCReport(subsidiary, data.paragraphs, listAccount, listEntity);
                if (result) {
                    result.fields.custbody_scv_fs_report_type = commonData.ReportTypeToReportList[body.reportType];log.error('commonData.ReportTypeToReportList', commonData.ReportTypeToReportList[body.reportType]);
                    sjId = libFunc.createRecord(commonData.RecordType.STATISTICAL_JOURNALENTRY, commonData.Sublist.LINE, result.fields, result.lines);
                }
            }

            log.error('sjId', sjId);
            scriptContext.response.write({output: JSON.stringify({sjId: sjId})});
        }

        return {onRequest}

    });