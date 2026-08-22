/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    'N/url', 'N/search', 'N/log',
    '../lib/scv_lib_utils.js',
    '../common/scv_common_ui'
], (
    url, search, log,
    libUtils, comUI
) => {
    // TODO(BA-Q1): Chọn mẫu theo ngân hàng tài khoản chi tiền và xử lý ngân hàng thứ 4.
    // printfile / logoFile / coChiNhanh* / coTinhTP: khong dung trong UE (o day chi
    // can timNganHang qua tuKhoa de quyet dinh HIEN hay AN button), nhung giu dong bo
    // field voi dictionary ben scv_sl_unc_print.js theo dung quy uoc "lap co chu y,
    // sua phai sua ca 2 cho".
    const NganHang = {
        TPBANK: {
            tuKhoa: ['TPBANK', 'TIENPHONGBANK'],
            printfile: 'scv_render_unc_tpbank_pdf',
            logoFile: 'Logo-TPBank.png',
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

    // Them button in UNC. Loi o day KHONG duoc chan viec mo chung tu: nut in la
    // tien ich, con xem chung tu la nghiep vu. Nuot loi va ghi log, khong throw.
    const beforeLoad = (scriptContext) => {
        try {
            themButtonUNC(scriptContext);
        } catch (error) {
            log.error({title: 'scv_ue_unc_print', details: error});
        }
    };

    const themButtonUNC = (scriptContext) => {
        if (scriptContext.type !== scriptContext.UserEventType.VIEW) {
            return;
        }
        const transactionType = scriptContext.newRecord.type;
        const transactionId = scriptContext.newRecord.id;
        // TODO(BA-Q8): Xác nhận field account có đúng trên cả ba loại chứng từ.
        const accountValue = search.lookupFields({
            type: transactionType, id: transactionId, columns: ['account']
        }).account;
        const accountId = Array.isArray(accountValue) ? accountValue[0]?.value :
            accountValue?.value || accountValue;
        if (!accountId) {
            return;
        }
        // TODO(BA-Q11): custrecord_scv_acc_bank_name hien rong tren 100% tai khoan,
        // nen tam do them ten tai khoan de dinh tuyen. Bo 'name' khi ke toan da
        // dien du field. Chi dung de AN/HIEN button, khong in ra chung tu.
        const accountFields = search.lookupFields({
            type: 'account', id: accountId,
            columns: ['custrecord_scv_acc_bank_name', 'name']
        });
        const layChuoi = (fieldValue) => Array.isArray(fieldValue) ?
            fieldValue[0]?.text || fieldValue[0]?.value || '' :
                fieldValue?.text || fieldValue?.value || fieldValue || '';
        const tenNganHang = layChuoi(accountFields.custrecord_scv_acc_bank_name) ||
            layChuoi(accountFields.name);
        const maNganHang = timNganHang(tenNganHang);
        // TODO(BA-Q1): Không khớp thì ẩn button và mở form bình thường.
        if (!maNganHang) {
            return;
        }
        const urlSl = url.resolveScript({
            scriptId: 'customscript_scv_sl_unc_print',
            deploymentId: 'customdeploy_scv_sl_unc_print',
            params: {recid: transactionId, rectype: transactionType}
        });
        scriptContext.form.addButton({
            id: 'custpage_scv_btn_unc_pdf',
            label: 'Print UNC', // TODO(BA-Q2): BA xác nhận nhãn button.
            functionName: "window.open('" + urlSl + "');"
        });
        comUI.addIconToButton(scriptContext.form);
    };

    const timNganHang = (tenNganHang) => {
        const tenDaChuanHoa = chuanHoa(tenNganHang);
        return Object.keys(NganHang).find((maNganHang) =>
            NganHang[maNganHang].tuKhoa.some((tuKhoa) => tenDaChuanHoa.includes(tuKhoa)));
    };

    const chuanHoa = (tenNganHang) =>
        libUtils.removeVietnameseTones(tenNganHang || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

    return {beforeLoad};
});
