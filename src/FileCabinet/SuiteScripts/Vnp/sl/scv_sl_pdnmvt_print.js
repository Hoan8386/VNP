/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
// Loads purchase requisition data and renders the PDF template.
define(['N/query', 'N/render', '../lib/scv_lib_pdf.js'], (query, render, libPdf) => {
    const HEADER_QUERY = `
        SELECT
            t.tranid AS so_phieu,
            TO_CHAR(t.trandate, 'DD/MM/YYYY') AS ngay_phieu,
            TO_CHAR(t.custbody_scv_exp_receipt_date, 'DD/MM/YYYY') AS thoi_gian_can,
            sub.legalname AS ten_cong_ty
        FROM transaction t
        LEFT JOIN transactionline tl
            ON tl.transaction = t.id
           AND tl.mainline = 'T'
        LEFT JOIN subsidiary sub ON sub.id = tl.subsidiary
        WHERE t.id = ?`;

    const LINES_QUERY = [
        'SELECT',
        // TODO(BA-Q8): UI Description chưa có Field ID; không dò thêm.
        '    NVL(tl.memo, BUILTIN.DF(tl.item)) AS ten_hang,',
        '    BUILTIN.DF(tl.units) AS dvt,',
        '    tl.custcol_scv_quantity AS so_luong,',
        '    tl.linesequencenumber AS line_sequence',
        'FROM transactionline tl',
        'WHERE tl.transaction = ?',
        "  AND tl.mainline = 'F'",
        "  AND tl.taxline = 'F'",
        "  AND tl.iscogs = 'F'",
        'ORDER BY tl.linesequencenumber'
    ].join('\n');

    // Converts nullable SuiteQL values to template-safe text.
    const asText = (value) => value === null || value === undefined ? '' : String(value);

    // Converts a quantity value to a finite number before summing.
    const asNumber = (value) => {
        const numberValue = Number(value);
        return Number.isFinite(numberValue) ? numberValue : 0;
    };

    // Loads exactly one header row through the mainline subsidiary join.
    const getHeader = (recid) => {
        const rows = query.runSuiteQL({query: HEADER_QUERY, params: [recid]}).asMappedResults();
        if (rows.length !== 1) {
            throw new Error('Không tìm thấy header của phiếu đề nghị mua vật tư.');
        }
        return rows[0];
    };

    // Loads non-mainline, non-tax detail rows in sequence order.
    const getLines = (recid) => query.runSuiteQL({
        query: LINES_QUERY,
        params: [recid]
    }).asMappedResults();

    // Maps query rows into the data contract consumed by FreeMarker.
    const buildDataJson = (header, rows) => {
        if (!rows.length) {
            throw new Error('Phiếu đề nghị mua vật tư không có dòng hàng hóa.');
        }
        const dateParts = asText(header.ngay_phieu).split('/');
        let total = 0;
        const lines = rows.map((row) => {
            const quantity = asNumber(row.so_luong);
            total += quantity;
            return {
                tenHang: asText(row.ten_hang),
                quyCach: '',
                dvt: asText(row.dvt),
                soLuong: libPdf.formatNumber(quantity),
                ghiChu: ''
            };
        });
        const legalName = asText(header.ten_cong_ty);
        const separator = ' - ';
        const separatorIndex = legalName.lastIndexOf(separator);
        let tenCongTyDong1 = legalName;
        let tenCongTyDong2 = '';
        // Bảng quy đổi viết tắt loại hình doanh nghiệp sang tên đầy đủ theo mockup FDD.
        // TODO(BA-Q7): mở rộng khi có subsidiary khác; nếu legalname được sửa thành tên
        // đầy đủ thì bỏ bảng này và dùng thẳng phần sau dấu gạch.
        const LOAI_HINH = {
            'CTCP': 'CÔNG TY CỔ PHẦN'
        };
        if (separatorIndex >= 0) {
            tenCongTyDong1 = legalName.slice(0, separatorIndex).trim();
            const loaiHinhVietTat = legalName.slice(separatorIndex + separator.length).trim();
            tenCongTyDong2 = LOAI_HINH[loaiHinhVietTat] || loaiHinhVietTat;
        }
        return {
            tenCongTy: legalName,
            tenCongTyDong1,
            tenCongTyDong2,
            soPhieu: asText(header.so_phieu),
            ngay: dateParts[0] || '',
            thang: dateParts[1] || '',
            nam: dateParts[2] || '',
            thoiGianCan: asText(header.thoi_gian_can),
            lines,
            tongSoLuong: libPdf.formatNumber(total)
        };
    };

    /**
     * Builds the data object and renders the requested PDF template.
     * @param {Object} scriptContext
     * @returns {void}
     */
    const onRequest = (scriptContext) => {
        const params = scriptContext.request.parameters;
        if (!params.recid) {
            throw new Error('Thiếu recid của phiếu đề nghị mua vật tư.');
        }
        if (!params.printfile) {
            throw new Error('Thiếu printfile của mẫu PDF.');
        }
        const dataJson = buildDataJson(getHeader(params.recid), getLines(params.recid));
        const renderer = libPdf.renderTemplateWithXml(params.printfile);
        renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: 'dataJson',
            data: dataJson
        });
        scriptContext.response.writeFile({
            file: renderer.renderAsPdf(),
            isInline: true
        });
    };

    return {onRequest};
});
