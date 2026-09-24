/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * Shared constants for the BCTHKN Suitelet and client script.
 */
define(['../common/scv_common_bcthkn.js'], (common) => {
    const STATUS_BAND_SIZE = 6;
    const NUMBER_FORMAT_INTEGER = '#,##0;-#,##0;"-"';
    const FILE_NAME = `${common.TEXT.REPORT_TITLE}.xlsx`;
    const SHEET = Object.freeze({EXPORT: 'Export', DIAGNOSTICS: 'Diagnostics'});
    const ROW = Object.freeze({TITLE: 3, SUBSIDIARY: 4, DEPARTMENT: 5, DATE_SCOPE: 6,
        HEADER_PARENT: 11, HEADER_CHILD: 12, DATA_START: 13});
    const COLUMN = Object.freeze({FIRST: 2, STT: 2, AUDIT: 3, RANK: 4, FINDING_COUNT: 5,
        FIRST_NUMBER: 5, TIMED_START: 6, TIMED_TOTAL: 12, UNTIMED_START: 13,
        UNTIMED_TOTAL: 19, GRAND_TOTAL: 20, LAST: 20, META_START: 2, META_END: 20,
        DIAGNOSTIC_LAST: 5});
    const ROW_HEIGHT = Object.freeze({TITLE: 24, META: 20, HEADER_PARENT: 38,
        HEADER_CHILD: 76, DATA: 36});
    const COLUMN_WIDTHS = Object.freeze({2: 7, 3: 28, 4: 19, 5: 15, 6: 17, 7: 17,
        8: 21, 9: 21, 10: 12, 11: 17, 12: 12, 13: 17, 14: 17, 15: 21, 16: 21,
        17: 12, 18: 17, 19: 12, 20: 13});

    const PHANLOAI = Object.freeze({CO_QUY_DINH: 'CO_QUY_DINH', KHONG_QUY_DINH: 'KHONG_QUY_DINH'});
    const KQTH = Object.freeze({CHUA_BAT_DAU: 'CHUA_BAT_DAU', DANG_TRIEN_KHAI: 'DANG_TRIEN_KHAI',
        HOAN_THANH_CHUA_XAC_NHAN: 'HOAN_THANH_CHUA_XAC_NHAN', HOAN_THANH_DA_XAC_NHAN: 'HOAN_THANH_DA_XAC_NHAN',
        HUY_BO: 'HUY_BO', TU_CHOI: 'TU_CHOI'});

    const PHANLOAI_VALUE_MAP = Object.freeze({
        'co quy dinh': PHANLOAI.CO_QUY_DINH,
        'co quy dinh thoi gian': PHANLOAI.CO_QUY_DINH,
        'co quy dinh thoi gian thuc hien': PHANLOAI.CO_QUY_DINH,
        'khong quy dinh': PHANLOAI.KHONG_QUY_DINH,
        'khong co quy dinh': PHANLOAI.KHONG_QUY_DINH,
        'khong quy dinh thoi gian': PHANLOAI.KHONG_QUY_DINH,
        'khong quy dinh thoi gian thuc hien': PHANLOAI.KHONG_QUY_DINH,
        'khong co quy dinh thoi gian thuc hien': PHANLOAI.KHONG_QUY_DINH,
    });
    const KQTH_VALUE_MAP = Object.freeze({
        'chua bat dau': KQTH.CHUA_BAT_DAU,
        'chua bat dau trien khai': KQTH.CHUA_BAT_DAU,
        'dang trien khai': KQTH.DANG_TRIEN_KHAI,
        'da hoan thanh nhung chua xac nhan': KQTH.HOAN_THANH_CHUA_XAC_NHAN,
        'hoan thanh chua xac nhan': KQTH.HOAN_THANH_CHUA_XAC_NHAN,
        'da hoan thanh va da xac nhan': KQTH.HOAN_THANH_DA_XAC_NHAN,
        'hoan thanh da xac nhan': KQTH.HOAN_THANH_DA_XAC_NHAN,
        'huy bo': KQTH.HUY_BO,
        'tu choi': KQTH.TU_CHOI,
        'tu choi trien khai': KQTH.TU_CHOI,
    });

    // Khác nhau CÓ CHỦ ĐÍCH — FDD sheet Detail và sheet Export viết khác nhau. Xem CODEX_GOAL_bcthkn_scaffold.md dòng 68, 122, 126. Đừng "thống nhất" lại.
    const GRID_BAND_UNTIMED = 'Khuyến nghị không quy định thời gian thực hiện';
    const EXPORT_BAND_UNTIMED = 'Khuyến nghị không có quy định thời gian thực hiện';
    // Khác nhau CÓ CHỦ ĐÍCH — FDD sheet Detail và sheet Export viết khác nhau. Xem CODEX_GOAL_bcthkn_scaffold.md dòng 68, 122, 126. Đừng "thống nhất" lại.
    const FILTER_LABEL = Object.freeze({
        FROM_DATE: 'From Date',
        TO_DATE: 'To Date', // TODO(BA): FDD §1.2 ghi "To date"; giữ nguyên code đã chạy thật.
    });
    const EXPORT_META = Object.freeze({FROM_DATE: 'From date', TO_DATE: 'to date'});

    // Tách đôi CÓ CHỦ ĐÍCH: grid và Excel có tập nhãn khác nhau. Đừng gộp thành một object.
    const GRID_TEXT = Object.freeze({
        FILTERS: 'Filters', SEARCH: 'Search', EXPORT: 'Export',
        SUBSIDIARY: common.TEXT.SUBSIDIARY, DEPARTMENT: common.TEXT.DEPARTMENT,
        STT: common.TEXT.STT, AUDIT: common.TEXT.AUDIT, RANK: common.TEXT.RANK,
        FINDING_COUNT: common.TEXT.FINDING_COUNT,
        TIMED_BAND: common.TEXT.TIMED_BAND,
        GRAND_TOTAL: common.TEXT.GRAND_TOTAL,
    });
    const EXPORT_TEXT = Object.freeze({REPORT_TITLE: common.TEXT.REPORT_TITLE,
        TIMED_BAND: common.TEXT.TIMED_BAND, STT: common.TEXT.STT,
        AUDIT: common.TEXT.AUDIT, RANK: common.TEXT.RANK,
        FINDING_COUNT: common.TEXT.FINDING_COUNT, TOTAL: common.TEXT.TOTAL,
        GRAND_TOTAL: common.TEXT.GRAND_TOTAL, DIAGNOSTICS_TITLE: 'BCTHKN Diagnostics',
        WARNINGS: 'Warnings', ASSUMPTIONS: 'Assumptions',
        ISSUES: 'Issue samples (max 10)'});

    const FIELD = common.REPORT_FIELD;
    const STATUS_DEFINITIONS = Object.freeze([
        {kqth: KQTH.CHUA_BAT_DAU, caption: common.STATUS_CAPTIONS[0]}, {kqth: KQTH.DANG_TRIEN_KHAI, caption: common.STATUS_CAPTIONS[1]},
        {kqth: KQTH.HOAN_THANH_CHUA_XAC_NHAN, caption: common.STATUS_CAPTIONS[2]}, {kqth: KQTH.HOAN_THANH_DA_XAC_NHAN, caption: common.STATUS_CAPTIONS[3]},
        {kqth: KQTH.HUY_BO, caption: common.STATUS_CAPTIONS[4]}, {kqth: KQTH.TU_CHOI, caption: common.STATUS_CAPTIONS[5]},
    ]);
    const STATUS_GROUPS = Object.freeze([
        {phanloai: PHANLOAI.CO_QUY_DINH, dataFields: [FIELD.CO_CHUA, FIELD.CO_DANG, FIELD.CO_HT_CXN, FIELD.CO_HT_DXN, FIELD.CO_HUY, FIELD.CO_TU_CHOI]},
        {phanloai: PHANLOAI.KHONG_QUY_DINH, dataFields: [FIELD.KHONG_CHUA, FIELD.KHONG_DANG, FIELD.KHONG_HT_CXN, FIELD.KHONG_HT_DXN, FIELD.KHONG_HUY, FIELD.KHONG_TU_CHOI]},
    ]);
    const STATUS_COLUMNS = [];
    for (const group of STATUS_GROUPS) {
        for (let index = 0; index < STATUS_DEFINITIONS.length; index++) { const definition = STATUS_DEFINITIONS[index]; STATUS_COLUMNS.push({phanloai: group.phanloai, kqth: definition.kqth, dataField: group.dataFields[index], caption: definition.caption}); }
    }
    Object.freeze(STATUS_COLUMNS);
    const RANKS = Object.freeze([{key: 'cao', text: 'Cao', order: 0}, {key: 'trung binh', text: 'Trung bình', order: 1}, {key: 'thap', text: 'Thấp', order: 2}]);
    const NUMERIC_EXPORT_FIELDS = [FIELD.FINDING_COUNT];
    for (let index = 0; index < STATUS_COLUMNS.length; index++) {
        if (index === STATUS_BAND_SIZE) NUMERIC_EXPORT_FIELDS.push(FIELD.TONG_CO);
        NUMERIC_EXPORT_FIELDS.push(STATUS_COLUMNS[index].dataField);
    }
    NUMERIC_EXPORT_FIELDS.push(FIELD.TONG_KHONG, FIELD.TONG_CONG);
    Object.freeze(NUMERIC_EXPORT_FIELDS);

    const TODO_BA = 'Một khuyến nghị có nhiều kết quả thực hiện thì đếm thế nào — '
        + 'chỉ lấy kết quả mới nhất, hay đếm hết vào từng trạng thái?';
    const DIAGNOSTIC_METRICS = Object.freeze(['ss1RowCount', 'ss2RowCount', 'distinctYkknCount', 'acceptedObservationCount', 'pivotBucketSum', 'selectedSourceQuantitySum', 'delta',
        'blankKeyMappingCount', 'blankRankCount', 'orphanCount', 'unknownCount', 'unknownPhanloaiCount', 'unknownKqthCount', 'blankValueCount', 'invalidNumberCount',
        'duplicateSs1GrainCount', 'mismatch']);
    const DIAGNOSTIC_STRUCTURE = Object.freeze(['sourceColumnKeys', 'soYkknByKeyMapping', 'serverDebug']);
    const DIAGNOSTIC_ISSUE_HEADERS = Object.freeze(['issueTypes', 'keyMapping', 'rank', 'sourceIndex', 'statuses']);
    const HEADER_PARENT_VALUES = Object.freeze([{column: COLUMN.STT, caption: EXPORT_TEXT.STT}, {column: COLUMN.AUDIT, caption: EXPORT_TEXT.AUDIT},
        {column: COLUMN.RANK, caption: EXPORT_TEXT.RANK}, {column: COLUMN.FINDING_COUNT, caption: EXPORT_TEXT.FINDING_COUNT},
        {column: COLUMN.TIMED_START, caption: EXPORT_TEXT.TIMED_BAND}, {column: COLUMN.UNTIMED_START, caption: EXPORT_BAND_UNTIMED},
        {column: COLUMN.GRAND_TOTAL, caption: EXPORT_TEXT.GRAND_TOTAL}]);

    return {
        STATUS_BAND_SIZE,
        NUMBER_FORMAT_INTEGER,
        FILE_NAME,
        SHEET,
        ROW,
        COLUMN,
        ROW_HEIGHT,
        COLUMN_WIDTHS,
        PHANLOAI,
        KQTH,
        PHANLOAI_VALUE_MAP,
        KQTH_VALUE_MAP,
        GRID_BAND_UNTIMED,
        EXPORT_BAND_UNTIMED,
        FILTER_LABEL,
        EXPORT_META,
        GRID_TEXT,
        EXPORT_TEXT,
        STATUS_COLUMNS,
        RANKS,
        NUMERIC_EXPORT_FIELDS,
        TODO_BA,
        DIAGNOSTIC_METRICS,
        DIAGNOSTIC_STRUCTURE,
        DIAGNOSTIC_ISSUE_HEADERS,
        HEADER_PARENT_VALUES,
    };
});
