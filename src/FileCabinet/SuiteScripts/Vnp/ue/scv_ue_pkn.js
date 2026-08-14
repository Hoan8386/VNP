/**
 * Nội dung: Áp dụng cho màn hinh phiếu kiểm nhận
 * Key:customrecord_scv_inspection_header||PKN
 * =======================================================================================
 *  Date                Author                  Description
 *  13 Aug 2026         Khanh Tran              Init, create file. Button <Thêm Tiêu chí kiểm> ở tab TCK - Kiểm hàng mục (2.7.2) from ms. Thủy(https://app.clickup.com/t/3773072/86d40b1jh)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['../cons/scv_cons_form.js'], (constForm) => {
    const beforeLoad = (scriptContext) => {
        try {
            if (['create', 'edit'].includes(scriptContext.type)) {
                constForm.setForm(scriptContext.form);
                constForm.addCommonClientScript();

                addButtonTCK(scriptContext);
                addButtonTCNHH(scriptContext);
            }
        } catch (error) {
            log.error('beforeLoad', error);
        }
    };

    const addButtonTCK = (scriptContext) => {
        let slTckKiemHang = scriptContext.form.getSublist({
            id: 'recmachcustrecord_scv_insp_l_header'
        });

        slTckKiemHang.addButton({
            id: 'custpage_btn_add_tck',
            label: 'Thêm Tiêu chí kiểm',
            functionName: 'addTieuChiKiem()'
        });
    }

    const addButtonTCNHH = (scriptContext) => {
        let slTcnNhanHang = scriptContext.form.getSublist({
            id: 'recmachcustrecord_scv_insp_i_header'
        });

        slTcnNhanHang.addButton({
            id: 'custpage_btn_add_tcnnh',
            label: 'Thêm Tiêu chí nhận hàng',
            functionName: 'addTieuChiNhanHang()'
        });
    }

    return {beforeLoad};
});
