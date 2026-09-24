/**
 * @NApiVersion 2.1
 */
define(['N/url'], (url) => {
    const SCRIPT = Object.freeze({
        ID: 'customscript_scv_sl_bcthkn',
        DEPLOYMENT_UI: 'customdeploy_scv_sl_bcthkn',
        DEPLOYMENT_DATA: 'customdeploy_scv_sl_bcthkn_data',
    });

    const ACTION = Object.freeze({
        GET_CTPH: 'getDataSS_ctph',
        GET_YKKN: 'getDataSS_ykkn',
    });

    const PARAM = Object.freeze({
        ACTION: 'action',
        SUBSIDIARY: 'custpage_subsidiary',
        SUBSIDIARY_DISPLAY: 'custpage_subsidiary_display',
        DEPARTMENT: 'custpage_department',
        DEPARTMENT_DISPLAY: 'custpage_department_display',
        FROM_DATE: 'custpage_fromdt',
        TO_DATE: 'custpage_todt',
    });

    const GRID = Object.freeze({ID: 'grdData'});

    const SOURCE_COLUMN = Object.freeze({
        KEY_MAPPING: 'key_mapping',
        AUDIT_NAME: 'tckt',
        RANK_SS1: 'muc_do_rui_ro',
        RANK_SS1_DISPLAY: 'muc_do_rui_ro_display',
        RANK_SS2: 'mdrr',
        // Khác nhau vì SS1 có Summary Label trên cột Count, SS2 để trống.
        // Với cột summary, NetSuite lấy column.label từ Summary Label.
        FINDING_COUNT: 'so_ctph',
        PHANLOAI: 'phan_loai',
        PHANLOAI_DISPLAY: 'phan_loai_display',
        IMPLEMENTATION_RESULT: 'kqth',
        RECOMMENDATION_COUNT: 'internal_id',
    });

    // SOURCE_COLUMN = key từ saved search. REPORT_FIELD = dataField của grid/Excel.
    // Hai thứ khác nhau, đừng nối lại.
    const REPORT_FIELD = Object.freeze({
        STT: 'stt',
        AUDIT: 'tckt',
        RANK: 'mdrr',
        FINDING_COUNT: 'so_ctph',
        CO_CHUA: 'co_chua_bat_dau',
        CO_DANG: 'co_dang_trien_khai',
        CO_HT_CXN: 'co_hoan_thanh_chua_xac_nhan',
        CO_HT_DXN: 'co_hoan_thanh_da_xac_nhan',
        CO_HUY: 'co_huy_bo',
        CO_TU_CHOI: 'co_tu_choi',
        TONG_CO: 'tong_co',
        KHONG_CHUA: 'khong_chua_bat_dau',
        KHONG_DANG: 'khong_dang_trien_khai',
        KHONG_HT_CXN: 'khong_hoan_thanh_chua_xac_nhan',
        KHONG_HT_DXN: 'khong_hoan_thanh_da_xac_nhan',
        KHONG_HUY: 'khong_huy_bo',
        KHONG_TU_CHOI: 'khong_tu_choi',
        TONG_KHONG: 'tong_khong',
        TONG_CONG: 'tong_cong',
    });

    const TEXT = Object.freeze({
        REPORT_TITLE: 'Báo cáo tổng hợp khuyến nghị kiểm toán',
        SUBSIDIARY: 'Subsidiary',
        DEPARTMENT: 'Department',
        STT: 'STT',
        AUDIT: 'Cuộc kiểm toán',
        RANK: 'Xếp hạng phát hiện',
        FINDING_COUNT: 'Số lượng phát hiện',
        TIMED_BAND: 'Khuyến nghị có quy định thời gian thực hiện',
        TOTAL: 'Tổng',
        GRAND_TOTAL: 'Tổng cộng',
    });

    const STATUS_CAPTIONS = Object.freeze([
        'Chưa bắt đầu triển khai',
        'Đang triển khai',
        'Đã hoàn thành nhưng chưa xác nhận',
        'Đã hoàn thành và đã xác nhận',
        'Huỷ bỏ',
        'Từ chối triển khai',
    ]);

    const MESSAGE = Object.freeze({
        DATE_SCOPE_WARNING: 'Bộ lọc ngày chỉ áp dụng cho số lượng khuyến nghị; '
            + `cột "${TEXT.FINDING_COUNT}" không bị lọc theo ngày.`,
    });

    /**
     * Adds the BCTHKN navigation button to an XLKN record in view mode.
     * @param {Object} scriptContext User-event context.
     * @returns {void}
     */
    const addButtonViewReport = (scriptContext) => {
        if (scriptContext.type !== 'view') {
            return;
        }
        const currentRecord = scriptContext.newRecord;
        const reportUrl = url.resolveScript({
            scriptId: SCRIPT.ID,
            deploymentId: SCRIPT.DEPLOYMENT_UI,
            returnExternalUrl: false,
            params: buildReportUrlParams(currentRecord),
        });
        scriptContext.form.addButton({
            id: 'custpage_btn_view_bcthkn',
            label: 'View báo cáo',
            functionName: `window.open('${reportUrl}');`,
        });
    };

    /**
     * Builds the URL filters from the current XLKN record.
     * @param {Record} currentRecord Current NetSuite record.
     * @returns {Object} URL parameter values.
     */
    const buildReportUrlParams = (currentRecord) => ({
        [PARAM.SUBSIDIARY]: currentRecord.getValue({
            fieldId: 'custrecord_scv_xlkn_subs',
        }),
        [PARAM.DEPARTMENT]: currentRecord.getValue({
            fieldId: 'custrecord_scv_xlkn_department',
        }),
    });

    return {
        SCRIPT,
        ACTION,
        PARAM,
        GRID,
        SOURCE_COLUMN,
        REPORT_FIELD,
        TEXT,
        STATUS_CAPTIONS,
        MESSAGE,
        addButtonViewReport,
    };
});
