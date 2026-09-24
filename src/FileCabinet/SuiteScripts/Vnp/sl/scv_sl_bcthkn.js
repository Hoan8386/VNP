/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/runtime',
    'N/search',
    '../cons/scv_cons_form.js',
    '../cons/scv_cons_subsidiary.js',
    '../cons/scv_cons_search_bcthkn_ctph.js',
    '../cons/scv_cons_search_bcthkn_ykkn.js',
    '../common/scv_common_bcthkn.js',
    '../cons/scv_cons_bcthkn.js',
], (
    runtime,
    search,
    constForm,
    constSubsidiary,
    constSearchCtph,
    constSearchYkkn,
    common,
    consBcthkn,
) => {
    const {GRID_BAND_UNTIMED, FILTER_LABEL} = consBcthkn;
    const TEXT = consBcthkn.GRID_TEXT;
    const STATUS_CAPTIONS = Object.freeze([...common.STATUS_CAPTIONS, common.TEXT.TOTAL]);

    /**
     * Routes UI requests and the two saved-search data actions.
     * @param {Object} scriptContext Suitelet context.
     * @returns {void}
     */
    const onRequest = (scriptContext) => {
        constForm.setContext(scriptContext);
        constForm.setServiceScript(common.SCRIPT.ID, common.SCRIPT.DEPLOYMENT_DATA);
        const request = scriptContext.request;
        const params = request.parameters || {};
        const currentScript = runtime.getCurrentScript();
        if (currentScript.deploymentId === common.SCRIPT.DEPLOYMENT_DATA) {
            handleDataRequest(params);
            return;
        }
        if (request.method === 'GET') {
            onCreateFormUI(params);
        }
    };

    const FILTER_UNSUPPORTED = Object.freeze({unsupported: true});
    const FILTER_FIELD = Object.freeze({
        CTPH: Object.freeze({
            SUBSIDIARY: Object.freeze({
                name: 'custrecord_scv_xlkn_subs',
                join: 'custrecord_scv_ctph_phieukn',
            }),
            DEPARTMENT: Object.freeze({
                name: 'custrecord_scv_xlkn_department',
                join: 'custrecord_scv_ctph_phieukn',
            }),
            IMPLEMENTATION_DATE: FILTER_UNSUPPORTED,
        }),
        YKKN: Object.freeze({
            SUBSIDIARY: Object.freeze({
                name: 'custrecord_scv_xlkn_subs',
                join: 'custrecord_scv_ykkn_phieukn',
            }),
            DEPARTMENT: Object.freeze({
                name: 'custrecord_scv_xlkn_department',
                join: 'custrecord_scv_ykkn_phieukn',
            }),
            IMPLEMENTATION_DATE: Object.freeze({
                name: 'custrecord_scv_kqkn_ngaythuchien',
                join: 'custrecord_scv_kqkn_ykienkhuyennghi',
            }),
        }),
    });

    const REPORT = Object.freeze({
        TITLE: common.TEXT.REPORT_TITLE,
        CLIENT_SCRIPT: '../cssl/scv_cs_sl_bcthkn.js',
        FILTER_GROUP_ID: 'fieldgrp_main',
        GRID_LABEL: 'Result',
        SEARCH_BUTTON_ID: 'custpage_btn_search',
        EXPORT_BUTTON_ID: 'custpage_btn_export',
        GRID_PAGE_SIZE: 500,
        NUMBER_FORMAT: '###,###,##0',
        GRID_STYLE_FIELD_ID: 'custpage_bcthkn_grid_style',
    });

    // Độ rộng tối thiểu (px): cột vẫn giãn đầy grid khi cột 0 bị ẩn, nhưng không bị ép vỡ chữ.
    const GRID_COLUMN_WIDTH = Object.freeze({
        [common.REPORT_FIELD.STT]: 55,
        [common.REPORT_FIELD.AUDIT]: 220,
        [common.REPORT_FIELD.RANK]: 110,
        [common.REPORT_FIELD.FINDING_COUNT]: 100,
        [common.REPORT_FIELD.TONG_CO]: 75,
        [common.REPORT_FIELD.TONG_KHONG]: 75,
        [common.REPORT_FIELD.TONG_CONG]: 90,
    });
    const GRID_STATUS_COLUMN_WIDTH = 100;

    // Header và cell căn giữa theo chiều dọc (DevExtreme mặc định căn trên/dưới).
    const GRID_STYLE = `<style>
        #${common.GRID.ID} .dx-datagrid-headers .dx-header-row > td {
            vertical-align: middle !important; font-weight: bold;
            white-space: normal; word-break: normal; }
        #${common.GRID.ID} .dx-datagrid-rowsview .dx-row > td {
            vertical-align: middle !important; }
    </style>`;

    /**
     * Executes one data action and always serialises a structured response.
     * @param {Object} params Request parameters.
     * @returns {void}
     */
    const handleDataRequest = (params) => {
        const response = createDataResponse(params);
        try {
            if (params[common.PARAM.ACTION] === common.ACTION.GET_CTPH) {
                response.data = getDataSS_ctph(params, response.debug);
            } else if (params[common.PARAM.ACTION] === common.ACTION.GET_YKKN) {
                response.data = getDataSS_ykkn(params, response.debug);
            } else {
                throw new Error('BCTHKN: data deployment chỉ nhận hai action đã khai báo.');
            }
        } catch (error) {
            response.data = [];
            response.isSuccess = false;
            response.msg = error && error.message ? error.message : String(error);
        }
        constForm.write(response);
    };

    /**
     * Creates the initial response including filter diagnostics.
     * @param {Object} params Request parameters.
     * @returns {Object} Response payload.
     */
    const createDataResponse = (params) => ({
        data: [],
        isSuccess: true,
        msg: '',
        debug: {
            action: params[common.PARAM.ACTION],
            receivedParams: getReceivedFilters(params),
            // null means filter construction threw; 0 means construction completed with no filters.
            appliedFilterCount: null,
            skippedFilters: [],
        },
    });

    /**
     * Copies report filters into the debug payload without changing values.
     * @param {Object} params Request parameters.
     * @returns {Object} Filter snapshot.
     */
    const getReceivedFilters = (params) => ({
        [common.PARAM.SUBSIDIARY]: params[common.PARAM.SUBSIDIARY] || null,
        [common.PARAM.DEPARTMENT]: params[common.PARAM.DEPARTMENT] || null,
        [common.PARAM.FROM_DATE]: params[common.PARAM.FROM_DATE] || null,
        [common.PARAM.TO_DATE]: params[common.PARAM.TO_DATE] || null,
    });

    /**
     * Fetches SS1 with its supported filters.
     * @param {Object} params Request parameters.
     * @param {Object} debug Mutable diagnostics.
     * @returns {Object} Paged saved-search result.
     */
    const getDataSS_ctph = (params, debug) => {
        const result = getFiltersForSearch(FILTER_FIELD.CTPH, params, 'SS1 CTPH', 'CTPH');
        applyFilterDebug(debug, result);
        return constSearchCtph.getDataSourceFetchPage(result.filters, params);
    };

    /**
     * Fetches SS2 with its supported filters.
     * @param {Object} params Request parameters.
     * @param {Object} debug Mutable diagnostics.
     * @returns {Object} Paged saved-search result.
     */
    const getDataSS_ykkn = (params, debug) => {
        const result = getFiltersForSearch(FILTER_FIELD.YKKN, params, 'SS2 YKKN', 'YKKN');
        applyFilterDebug(debug, result);
        return constSearchYkkn.getDataSourceFetchPage(result.filters, params);
    };

    /**
     * Applies completed filter diagnostics to the response.
     * @param {Object} debug Mutable diagnostics.
     * @param {Object} result Filter result.
     * @returns {void}
     */
    const applyFilterDebug = (debug, result) => {
        debug.appliedFilterCount = result.filters.length;
        debug.skippedFilters = result.skippedFilters;
    };

    /**
     * Creates the report form, filters, buttons and result grid.
     * @param {Object} params Request parameters.
     * @returns {void}
     */
    const onCreateFormUI = (params) => {
        const subsidiaries = constSubsidiary.getDataSubsidiaryByUserRole();
        const currentUser = runtime.getCurrentUser();
        const currentSubsidiary = currentUser && currentUser.subsidiary
            ? String(currentUser.subsidiary) : undefined;
        const selectedSubsidiary = params[common.PARAM.SUBSIDIARY]
            ? String(params[common.PARAM.SUBSIDIARY]) : currentSubsidiary;
        constForm.createForm(REPORT.TITLE, REPORT.CLIENT_SCRIPT);
        constForm.addPageLink([constSearchCtph.ID, constSearchYkkn.ID], true);
        addReportButtons();
        const filterGroup = constForm.addFieldGroup({
            id: REPORT.FILTER_GROUP_ID,
            label: TEXT.FILTERS,
        });
        addReportFilters(filterGroup.id, params, subsidiaries, selectedSubsidiary);
        constForm.addField({id: REPORT.GRID_STYLE_FIELD_ID, type: 'inlinehtml',
            label: 'Hidden'}, false, {defaultValue: GRID_STYLE});
        constForm.addGridDx({
            id: common.GRID.ID,
            type: 'grid',
            label: REPORT.GRID_LABEL,
            columns: getDataColumnGrid(),
            optionsDx: onCreateDxGrid(),
        });
        constForm.writePage();
    };

    /** Adds Search and Export buttons. @returns {void} */
    const addReportButtons = () => {
        constForm.addButton({id: REPORT.SEARCH_BUTTON_ID, label: TEXT.SEARCH,
            functionName: "onSearchResult('F')"});
        constForm.addButton({id: REPORT.EXPORT_BUTTON_ID, label: TEXT.EXPORT,
            functionName: "onSearchResult('T')"});
    };

    /**
     * Adds the four report filter fields.
     * @param {string} groupId Field group ID.
     * @param {Object} params Request parameters.
     * @param {Array} subsidiaries Allowed subsidiaries.
     * @param {string} selectedSubsidiary Default subsidiary.
     * @returns {void}
     */
    const addReportFilters = (groupId, params, subsidiaries, selectedSubsidiary) => {
        addSubsidiaryField(groupId, subsidiaries, selectedSubsidiary);
        constForm.addField({id: common.PARAM.DEPARTMENT, type: 'select',
            label: TEXT.DEPARTMENT, source: 'department', container: groupId}, false,
        {defaultValue: params[common.PARAM.DEPARTMENT]});
        constForm.addField({id: common.PARAM.FROM_DATE, type: 'date',
            label: FILTER_LABEL.FROM_DATE, container: groupId}, false,
        {layoutType: 'STARTROW', defaultValue: params[common.PARAM.FROM_DATE]});
        constForm.addField({id: common.PARAM.TO_DATE, type: 'date',
            label: FILTER_LABEL.TO_DATE, container: groupId}, false,
        {layoutType: 'ENDROW', defaultValue: params[common.PARAM.TO_DATE]});
    };

    /** Adds the role-scoped subsidiary selector. @returns {void} */
    const addSubsidiaryField = (groupId, subsidiaries, selectedSubsidiary) => {
        constForm.addField({id: common.PARAM.SUBSIDIARY, type: 'select',
            label: TEXT.SUBSIDIARY, container: groupId}, false, {
            lookup: {data: subsidiaries, valueExpr: 'id', displayExpr: 'namenohierarchy'},
            defaultValue: selectedSubsidiary,
        });
    };

    /** Returns DevExtreme options with native export disabled. @returns {Object} */
    const onCreateDxGrid = () => ({
        exportExcelEnable: false, export: {enabled: false},
        repaintChangesOnly: false, columnFixing: {enabled: false},
        scrolling: {mode: 'standard', rowRenderingMode: 'standard',
            columnRenderingMode: 'standard'},
        searchPanel: {visible: true}, sorting: {mode: 'multiple'},
        headerFilter: {visible: true, search: {enabled: true}},
        columnChooser: {enabled: false}, filterRow: {visible: false},
        rowAlternationEnabled: false, wordWrapEnabled: true,
        showBorders: true, showColumnLines: true, showRowLines: true,
        // 'auto': bảng co theo số dòng thay vì mặc định cao bằng cửa sổ (scv_dx_init.getHeight).
        height: 'auto',
        paging: {pageSize: REPORT.GRID_PAGE_SIZE}, groupPanel: {visible: false},
        allowColumnResizing: true,
    });

    /** Builds the four base columns and two status bands. @returns {Array} */
    const getDataColumnGrid = () => [
        createGridColumn(TEXT.STT, common.REPORT_FIELD.STT, 'number'),
        createGridColumn(TEXT.AUDIT, common.REPORT_FIELD.AUDIT, 'string'),
        createGridColumn(TEXT.RANK, common.REPORT_FIELD.RANK, 'string'),
        createGridColumn(TEXT.FINDING_COUNT, common.REPORT_FIELD.FINDING_COUNT, 'number'),
        {caption: TEXT.TIMED_BAND, alignment: 'center', columns: getTimedColumns()},
        {caption: GRID_BAND_UNTIMED, alignment: 'center',
            columns: getUntimedColumns()},
        createGridColumn(TEXT.GRAND_TOTAL, common.REPORT_FIELD.TONG_CONG, 'number'),
    ];

    /** Returns columns for recommendations with a deadline. @returns {Array} */
    const getTimedColumns = () => createStatusGridColumns([
        common.REPORT_FIELD.CO_CHUA, common.REPORT_FIELD.CO_DANG,
        common.REPORT_FIELD.CO_HT_CXN, common.REPORT_FIELD.CO_HT_DXN,
        common.REPORT_FIELD.CO_HUY, common.REPORT_FIELD.CO_TU_CHOI,
        common.REPORT_FIELD.TONG_CO,
    ]);

    /** Returns columns for recommendations without a deadline. @returns {Array} */
    const getUntimedColumns = () => createStatusGridColumns([
        common.REPORT_FIELD.KHONG_CHUA, common.REPORT_FIELD.KHONG_DANG,
        common.REPORT_FIELD.KHONG_HT_CXN, common.REPORT_FIELD.KHONG_HT_DXN,
        common.REPORT_FIELD.KHONG_HUY, common.REPORT_FIELD.KHONG_TU_CHOI,
        common.REPORT_FIELD.TONG_KHONG,
    ]);

    /** Maps status fields to the seven child captions. @returns {Array} */
    const createStatusGridColumns = (fields) => {
        return fields.map((field, index) => createGridColumn(
            STATUS_CAPTIONS[index], field, 'number'));
    };

    /** Displays numeric zero as a dash without changing the underlying value. @returns {string} */
    const customizeGridNumberText = cellInfo => cellInfo.value === 0 ? '-' : cellInfo.valueText;

    /** Creates one read-only grid column. @returns {Object} */
    const createGridColumn = (caption, dataField, dataType) => ({
        caption, dataField, dataType, allowEditing: false, alignment: 'center',
        minWidth: GRID_COLUMN_WIDTH[dataField] || GRID_STATUS_COLUMN_WIDTH,
        ...(dataType === 'number' ? {
            format: REPORT.NUMBER_FORMAT,
            ...(dataField === common.REPORT_FIELD.STT ? {}
                : {customizeText: customizeGridNumberText}),
        } : {}),
    });

    /**
     * Builds all supported filters and records intentionally skipped filters.
     * @param {Object} descriptor Search descriptor group.
     * @param {Object} params Request parameters.
     * @param {string} searchLabel Diagnostic search name.
     * @param {string} descriptorGroup Descriptor group name.
     * @returns {{filters:Array, skippedFilters:Array}}
     */
    const getFiltersForSearch = (descriptor, params, searchLabel, descriptorGroup) => {
        const result = {filters: [], skippedFilters: []};
        const configs = getFilterConfigs(descriptor);
        configs.forEach((config) => {
            const value = params[config.parameterName];
            if (!hasFilterValue(value)) {
                return;
            }
            if (config.descriptor && config.descriptor.unsupported === true) {
                result.skippedFilters.push({parameterName: config.parameterName,
                    descriptor: `${descriptorGroup}.${config.descriptorKey}`});
                return;
            }
            assertVerifiedDescriptor(config, searchLabel, descriptorGroup);
            result.filters.push(createSearchFilter(config, value));
        });
        return result;
    };

    /** Returns filter metadata with NetSuite operators. @returns {Array} */
    const getFilterConfigs = (descriptor) => [
        {descriptor: descriptor.SUBSIDIARY, descriptorKey: 'SUBSIDIARY',
            parameterName: common.PARAM.SUBSIDIARY, operator: search.Operator.ANYOF, isList: true},
        {descriptor: descriptor.DEPARTMENT, descriptorKey: 'DEPARTMENT',
            parameterName: common.PARAM.DEPARTMENT, operator: search.Operator.ANYOF, isList: true},
        {descriptor: descriptor.IMPLEMENTATION_DATE, descriptorKey: 'IMPLEMENTATION_DATE',
            parameterName: common.PARAM.FROM_DATE, operator: search.Operator.ONORAFTER},
        {descriptor: descriptor.IMPLEMENTATION_DATE, descriptorKey: 'IMPLEMENTATION_DATE',
            parameterName: common.PARAM.TO_DATE, operator: search.Operator.ONORBEFORE},
    ];

    /** Returns true when a request filter has a nonblank value. @returns {boolean} */
    const hasFilterValue = (value) => value !== undefined && value !== null
        && String(value).trim() !== '';

    /** Throws when an active filter descriptor has not been verified. @returns {void} */
    const assertVerifiedDescriptor = (config, searchLabel, descriptorGroup) => {
        if (config.descriptor && config.descriptor.name) {
            return;
        }
        throw new Error(`BCTHKN: thiếu descriptor ${descriptorGroup}.${config.descriptorKey} `
            + `cho ${config.parameterName} trên ${searchLabel}; từ chối chạy search.`);
    };

    /** Creates one NetSuite saved-search filter. @returns {search.Filter} */
    const createSearchFilter = (config, value) => {
        const options = {name: config.descriptor.name, operator: config.operator,
            values: config.isList ? [String(value)] : value};
        if (config.descriptor.join) {
            options.join = config.descriptor.join;
        }
        return search.createFilter(options);
    };

    return {onRequest};
});
