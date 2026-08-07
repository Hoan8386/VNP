/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/url', 'N/search',
        '../common/scv_common_ui',
        '../lib/scv_lib_utils.js'], (url, search, comUI, libUtils) => {
    // TODO(BA-Q1): Chọn mẫu theo ngân hàng tài khoản chi tiền và xử lý ngân hàng thứ 4.
    // coChiNhanhNguoiTra / coChiNhanhNguoiHuong: khong dung trong UE (chi timNganHang
    // qua tuKhoa la duoc dung o day), nhung giu dong bo field voi dictionary ben
    // scv_sl_unc_print.js theo dung quy uoc "lap co chu y, sua phai sua ca 2 cho".
    const NganHang = {
        TPBANK: {
            tuKhoa: ['TPBANK', 'TIENPHONGBANK'],
            printfile: 'scv_render_unc_tpbank_pdf',
            coTinhTP: true, coChiNhanhNguoiTra: false, coChiNhanhNguoiHuong: true
        },
        VIETINBANK: {
            // 'VIETTINBANK' 2 chu T: ke toan dang go sai chinh ta tren 3 tai khoan
            // that (id 145, 147, 802). Thieu tu khoa nay la 3 tai khoan do khong
            // bao gio ra button.
            tuKhoa: ['VIETINBANK', 'VIETTINBANK', 'CONGTHUONG'],
            printfile: 'scv_render_unc_vietinbank_pdf',
            coTinhTP: false, coChiNhanhNguoiTra: true, coChiNhanhNguoiHuong: true
        },
        SHB: {
            tuKhoa: ['SHB', 'SAIGONHANOI'],
            printfile: 'scv_render_unc_shb_pdf',
            coTinhTP: false, coChiNhanhNguoiTra: true, coChiNhanhNguoiHuong: true
        }
    };

    const chuanHoa=s=>libUtils.removeVietnameseTones(s||'').toUpperCase().replace(/[^A-Z0-9]/g,'')

    const timNganHang = (ten) => {
        const tenDaChuanHoa = chuanHoa(ten);
        return Object.keys(NganHang).find((maNganHang) =>
            NganHang[maNganHang].tuKhoa.some((tuKhoa) => tenDaChuanHoa.includes(tuKhoa)));
    };

    // Them button in UNC. Loi o day KHONG duoc chan viec mo chung tu: nut in la
    // tien ich, con xem chung tu la nghiep vu. Nuot loi va ghi log, khong throw.
    const beforeLoad = (scriptContext) => {
        try {
            themButtonUNC(scriptContext);
        } catch (e) {
            log.error({title: 'scv_ue_unc_print', details: e});
        }
    };

    const themButtonUNC = (scriptContext) => {
        if (scriptContext.type !== scriptContext.UserEventType.VIEW) {
            return;
        }
        const recType = scriptContext.newRecord.type;
        const recId = scriptContext.newRecord.id;
        // TODO(BA-Q8): Xác nhận field account có đúng trên cả ba loại chứng từ.
        const accountValue = search.lookupFields({
            type: recType, id: recId, columns: ['account']
        }).account;
        const accId = Array.isArray(accountValue) ? accountValue[0]?.value :
            accountValue?.value || accountValue;
        if (!accId) {
            return;
        }
        // TODO(BA-Q11): custrecord_scv_acc_bank_name hien rong tren 100% tai khoan,
        // nen tam do them ten tai khoan de dinh tuyen. Bo 'name' khi ke toan da
        // dien du field. Chi dung de AN/HIEN button, khong in ra chung tu.
        const accFields = search.lookupFields({
            type: 'account', id: accId,
            columns: ['custrecord_scv_acc_bank_name', 'name']
        });
        const layChuoi = (v) => Array.isArray(v) ?
            v[0]?.text || v[0]?.value || '' : v?.text || v?.value || v || '';
        const tenNganHang = layChuoi(accFields.custrecord_scv_acc_bank_name) ||
            layChuoi(accFields.name);
        const maNganHang = timNganHang(tenNganHang);
        // TODO(BA-Q1): Không khớp thì ẩn button và mở form bình thường.
        if (!maNganHang) {
            return;
        }
        const urlSl = url.resolveScript({
            scriptId: 'customscript_scv_sl_unc_print',
            deploymentId: 'customdeploy_scv_sl_unc_print',
            params: {recid: recId, rectype: recType}
        });
        scriptContext.form.addButton({
            id: 'custpage_scv_btn_unc_pdf',
            label: 'Print UNC', // TODO(BA-Q2): BA xác nhận nhãn button.
            functionName: "window.open('" + urlSl + "');"
        });
        comUI.addIconToButton(scriptContext.form);
    };

    return {beforeLoad};
});
