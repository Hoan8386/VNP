/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define([
    '../lib/scv_lib_cs_xls.js',
    '../lib/scv_lib_cs_dx_merge.js',
    '../lib/scv_lib_utils.js',
    '../cons/scv_cons_format.js',
    '../common/scv_common_bcthkn.js',
    '../cons/scv_cons_bcthkn.js',
], (libCsXLS, libCsDxMerge, libUtils, constFormat, common, consBcthkn) => {
    const URL_DATA = '/app/site/hosting/scriptlet.nl?script=' + common.SCRIPT.ID
        + '&deploy=' + common.SCRIPT.DEPLOYMENT_DATA;
    const BLOCK_EXPORT_ON_MISMATCH = false; const REQUIRE_MANDATORY_FILTERS = true;
    const FIXED_RANK_ROWS = true;
    // TODO(BA): Đang chờ BA vì hai nguồn FDD mâu thuẫn về khối Tổng Excel.
    // Đổi thành true là khối Tổng quay lại y như cũ.
    const EXPORT_TOTAL_ROWS = false;
    const SOURCE_SHAPE_STATE = {ss1Logged: false, ss2Logged: false};
    const {STATUS_BAND_SIZE, NUMBER_FORMAT_INTEGER, FILE_NAME, SHEET, ROW, COLUMN,
        ROW_HEIGHT, COLUMN_WIDTHS, PHANLOAI, KQTH, PHANLOAI_VALUE_MAP,
        KQTH_VALUE_MAP, STATUS_COLUMNS, RANKS, NUMERIC_EXPORT_FIELDS, EXPORT_META,
        TODO_BA, DIAGNOSTIC_METRICS, DIAGNOSTIC_STRUCTURE, DIAGNOSTIC_ISSUE_HEADERS,
        HEADER_PARENT_VALUES} = consBcthkn;
    const FIELD = common.REPORT_FIELD;
    const TEXT = consBcthkn.EXPORT_TEXT;
    // Giả định hiện tại: ba cột Tổng luôn hiện để giữ khung cấu trúc và mốc đối chiếu.
    const ALWAYS_VISIBLE_NUMERIC_FIELDS = Object.freeze([
        FIELD.TONG_CO, FIELD.TONG_KHONG, FIELD.TONG_CONG,
    ]);
    const GRID_NUMERIC_FIELDS = Object.freeze([FIELD.STT, ...NUMERIC_EXPORT_FIELDS]);
    const GRID_MERGE_OPTIONS = Object.freeze({
        targetDataFields: Object.freeze([FIELD.STT, FIELD.AUDIT]),
        getGroupKey: visibleRow => visibleRow.data && visibleRow.data.auditKey,
    });
    let mergeGridInstance = null;

    /** Applies presentation-only row spans to the current grid view. @returns {void} */
    const onGridContentReady = (event) => {
        try {
            libCsDxMerge.mergeVisibleRowsByKey(event.component, GRID_MERGE_OPTIONS);
        } catch (error) {
            console.error('[BCTHKN] grid merge failed', error);
        }
    };

    /** Binds exactly one merge handler to the current grid instance. @returns {void} */
    const bindGridMergeHandler = () => {
        const gridInstance = _scvDx.getInstanceDx(common.GRID.ID);
        if (!gridInstance) {
            return;
        }
        if (mergeGridInstance && mergeGridInstance !== gridInstance) {
            mergeGridInstance.off('contentReady', onGridContentReady);
        }
        gridInstance.off('contentReady', onGridContentReady);
        gridInstance.on('contentReady', onGridContentReady);
        mergeGridInstance = gridInstance;
    };

    /**
     * Computes zero-only rows and columns from the complete canonical result.
     * Pure projection: does not inspect grid state or mutate canonical rows.
     * @returns {{hiddenRowIndexes:Set<number>, hiddenFields:Set<string>}}
     */
    const getZeroVisibility = (rows) => {
        const canonicalRows = Array.isArray(rows) ? rows : [];
        const hiddenRowIndexes = new Set();
        const hiddenFields = new Set();
        if (canonicalRows.length === 0) {
            return {hiddenRowIndexes, hiddenFields};
        }
        const allZeroByIndex = canonicalRows.map(row => Boolean(row)
            && NUMERIC_EXPORT_FIELDS.every(field => row[field] === 0));
        const indexesByAudit = new Map();
        canonicalRows.forEach((row, index) => {
            const auditKey = row && row.auditKey;
            const indexes = indexesByAudit.get(auditKey);
            if (indexes) {
                indexes.push(index);
            } else {
                indexesByAudit.set(auditKey, [index]);
            }
        });
        indexesByAudit.forEach((indexes) => {
            const hasNonZeroRow = indexes.some(index => !allZeroByIndex[index]);
            if (hasNonZeroRow) {
                indexes.forEach((index) => {
                    if (allZeroByIndex[index]) {
                        hiddenRowIndexes.add(index);
                    }
                });
            } else {
                indexes.slice(1).forEach(index => hiddenRowIndexes.add(index));
            }
        });
        NUMERIC_EXPORT_FIELDS.forEach((field) => {
            if (ALWAYS_VISIBLE_NUMERIC_FIELDS.includes(field)) {
                return;
            }
            if (canonicalRows.every(row => Boolean(row) && row[field] === 0)) {
                hiddenFields.add(field);
            }
        });
        return {hiddenRowIndexes, hiddenFields};
    };

    /** Resets numeric grid columns then hides the current zero-only columns. @returns {void} */
    const setGridZeroVisibility = (hiddenFields) => {
        const gridInstance = _scvDx.getInstanceDx(common.GRID.ID);
        if (!gridInstance || typeof gridInstance.columnOption !== 'function') {
            return;
        }
        GRID_NUMERIC_FIELDS.forEach(field => gridInstance.columnOption(field, 'visible', true));
        if (!(hiddenFields instanceof Set)) {
            return;
        }
        hiddenFields.forEach((field) => {
            if (field === FIELD.STT || ALWAYS_VISIBLE_NUMERIC_FIELDS.includes(field)) {
                return;
            }
            gridInstance.columnOption(field, 'visible', false);
        });
    };
    /**
     * NetSuite client entry point.
     * @param {Object} scriptContext NetSuite client context.
     * @returns {void}
     */
    function pageInit(scriptContext) {
        // No page-init side effects are required.
    }

    /**
     * Loads both saved searches, maps canonical rows and optionally exports one workbook.
     * @param {string} isExport 'T' for Export, otherwise Search.
     * @returns {Promise<void>}
     */
    const onSearchResult = async (isExport) => {
        if (!validateMandatoryFilters()) {
            return;
        }
        setGridZeroVisibility();
        const params = _scvForm.getParameter();
        notifyDateScope(params);
        _scvForm.showLoadingDialog(true);
        const requestState = createRequestState(params, isExport);
        try {
            startSearchRequests(requestState);
        } catch (error) {
            finishWithError(error, 'request setup');
        }
    };

    /** Validates only the mandatory subsidiary filter. @returns {boolean} */
    const validateMandatoryFilters = () => !REQUIRE_MANDATORY_FILTERS
        || _scvForm.validateFieldMandatory([common.PARAM.SUBSIDIARY]);

    /** Shows the known date-scope limitation as information, not an error. @returns {void} */
    const notifyDateScope = (params) => {
        if (hasValue(params[common.PARAM.FROM_DATE]) || hasValue(params[common.PARAM.TO_DATE])) {
            _scvForm.showMsgInfo(common.MESSAGE.DATE_SCOPE_WARNING);
        }
    };

    /**
     * Creates mutable state shared by asynchronous request callbacks.
     * @param {Object} params Form parameters.
     * @param {string} isExport Export flag.
     * @returns {Object} Request state.
     */
    const createRequestState = (params, isExport) => ({
        params, isExport, completed: false, errors: [], errorKeys: new Set(), serverDebug: [],
        actions: [
            createSearchAction(common.ACTION.GET_CTPH, params),
            createSearchAction(common.ACTION.GET_YKKN, params),
        ],
    });

    /** Creates one paged request action. @returns {Object} */
    const createSearchAction = (action, params) => ({
        action,
        params: {...params, page: 0, rangePageFetch: 1},
        data: [],
    });

    /**
     * Starts the framework's multi-page saved-search request flow.
     * @param {Object} state Request state.
     * @returns {void}
     */
    const startSearchRequests = (state) => {
        libCsXLS.asyncPostMultiRequestFetchSSPageByAjax(
            URL_DATA,
            state.actions,
            actions => completeSearchRequests(state, actions),
            (response, callbackParams) => handleRequestSuccess(state, response, callbackParams),
            (request, status, error, callbackParams) => {
                handleRequestFailure(state, request, status, error, callbackParams);
            },
        );
    };

    /**
     * Captures response diagnostics and structured server errors.
     * @param {Object} state Request state.
     * @param {Object} response Server response.
     * @param {Object} callbackParams Request parameters.
     * @returns {void}
     */
    const handleRequestSuccess = (state, response, callbackParams) => {
        if (response && response.debug) {
            state.serverDebug.push(response.debug);
            console.log('[BCTHKN] server debug:', response.debug);
        }
        if (response && response.isSuccess === false) {
            addRequestError(state, response.msg || 'saved search trả lỗi', callbackParams);
        }
    };

    /** Records one transport error without duplicating the same page error. @returns {void} */
    const handleRequestFailure = (state, request, status, error, callbackParams) => {
        const detail = error && error.message ? error.message : (error || status);
        addRequestError(state, detail, callbackParams);
        console.error('[BCTHKN] request error', request, status, error);
    };

    /** Adds one unique action/page error to request state. @returns {void} */
    const addRequestError = (state, message, callbackParams) => {
        const action = callbackParams && callbackParams.action;
        const page = callbackParams && callbackParams.page;
        const fullMessage = `${action || 'BCTHKN'} (page ${page || 0}): ${message}`;
        if (!state.errorKeys.has(fullMessage)) {
            state.errorKeys.add(fullMessage);
            state.errors.push(fullMessage);
        }
    };

    /**
     * Completes the report exactly once after all saved-search pages return.
     * @param {Object} state Request state.
     * @param {Array} actions Completed request actions.
     * @returns {Promise<void>}
     */
    const completeSearchRequests = async (state, actions) => {
        if (state.completed) {
            return;
        }
        state.completed = true;
        try {
            if (showRequestErrors(state.errors)) {
                return;
            }
            const mapped = getDataResultMapped(state.params, actions);
            mapped.diagnostics.serverDebug = state.serverDebug;
            const zeroVisibility = getZeroVisibility(mapped.rows);
            const gridRows = Array.isArray(mapped.rows)
                ? mapped.rows.filter((row, index) => !zeroVisibility.hiddenRowIndexes.has(index))
                : [];
            bindGridMergeHandler();
            setGridZeroVisibility(zeroVisibility.hiddenFields);
            _scvDx.setDataSource(common.GRID.ID, gridRows);
            showMappingWarnings(mapped);
            if (String(state.isExport) === 'T'
                && !(mapped.mismatch && BLOCK_EXPORT_ON_MISMATCH)) {
                // Excel dùng đúng dòng đã lọc của grid (không ghi rồi ẩn) để merge B:C không
                // trùm lên dòng ẩn; cột toàn 0 vẫn ẩn theo cùng hiddenFields với grid.
                await onExportExcel(gridRows, state.params, mapped.diagnostics,
                    zeroVisibility.hiddenFields);
            }
        } catch (error) {
            reportClientError(error, 'mapping/export');
        } finally {
            _scvForm.showLoadingDialog(false);
        }
    };

    /** Displays request errors and clears the grid. @returns {boolean} */
    const showRequestErrors = (errors) => {
        if (errors.length === 0) {
            return false;
        }
        bindGridMergeHandler();
        setGridZeroVisibility();
        _scvDx.setDataSource(common.GRID.ID, []);
        errors.forEach(message => _scvForm.showMsgError(message));
        return true;
    };

    /** Shows reconciliation warnings without presenting them as failures. @returns {void} */
    const showMappingWarnings = (mapped) => {
        if (!mapped.mismatch) {
            return;
        }
        const message = buildMismatchMessage(mapped.diagnostics);
        console.warn('[BCTHKN] ' + message);
        _scvForm.showMsgInfo(message);
    };

    /** Handles a synchronous request setup failure. @returns {void} */
    const finishWithError = (error, stage) => {
        _scvForm.showLoadingDialog(false);
        reportClientError(error, stage);
    };

    /** Logs and displays one client-side error. @returns {void} */
    const reportClientError = (error, stage) => {
        const message = error && error.message ? error.message : String(error);
        console.error(`[BCTHKN] ${stage}: ${message}`, error);
        _scvForm.showMsgError(message);
    };

    /**
     * Maps SS1-root data and grouped SS2 quantities into canonical report rows.
     * SS2 is already grouped at source; the client cannot select a latest KQKN.
     * @param {Object} params Form parameters.
     * @param {Array} sourceResult Completed saved-search actions.
     * @returns {{rows:Array, diagnostics:Object, mismatch:boolean}}
     */
    const getDataResultMapped = (params, sourceResult) => {
        // Không dùng được libUtils.joinTwoArrayObject vì hàm đó quét lồng O(N×M)
        // và gắn cờ trực tiếp lên phần tử nguồn; báo cáo cần Map/Set O(N+M), bất biến nguồn.
        const ss1Rows = getActionRows(sourceResult, common.ACTION.GET_CTPH);
        const ss2Rows = getActionRows(sourceResult, common.ACTION.GET_YKKN);
        const diagnostics = createDiagnostics(ss1Rows.length, ss2Rows.length, params);
        logSourceShapeOnce(ss1Rows, ss2Rows);
        const sourceKeys = resolveSourceColumnKeys(ss1Rows, ss2Rows);
        diagnostics.sourceColumnKeys = sourceKeys;
        const ss1Index = buildSs1Index(ss1Rows, sourceKeys.ss1, diagnostics);
        const pivot = pivotSs2ByStatus(ss2Rows, sourceKeys.ss2, ss1Index, diagnostics);
        const rows = joinAndBuildRows(ss1Index, pivot);
        completeDiagnostics(diagnostics, pivot);
        return {rows, diagnostics, mismatch: diagnostics.mismatch};
    };

    /**
     * Collects all pages belonging to one action.
     * @param {Array} sourceResult Completed request actions.
     * @param {string} actionName Action to collect.
     * @returns {Array} Flattened source rows.
     */
    const getActionRows = (sourceResult, actionName) => {
        const rows = [];
        if (!Array.isArray(sourceResult)) {
            return rows;
        }
        sourceResult.forEach((action) => {
            if (!action || action.action !== actionName) {
                return;
            }
            const data = action.data;
            const pageRows = data && Array.isArray(data.arrResult) ? data.arrResult : data;
            if (Array.isArray(pageRows)) {
                pageRows.forEach(row => rows.push(row));
            }
        });
        return rows;
    };

    /** Logs Object.keys of the first real row from each source once. @returns {void} */
    const logSourceShapeOnce = (ss1Rows, ss2Rows) => {
        logOneSourceShape('SS1', ss1Rows, 'ss1Logged');
        logOneSourceShape('SS2', ss2Rows, 'ss2Logged');
    };

    /** Logs one source row count and first-row keys. @returns {void} */
    const logOneSourceShape = (label, rows, stateKey) => {
        console.log(`[BCTHKN] ${label} rows=${rows.length}`);
        if (!SOURCE_SHAPE_STATE[stateKey] && rows.length > 0 && rows[0]) {
            SOURCE_SHAPE_STATE[stateKey] = true;
            console.log(`[BCTHKN] ${label} first row keys:`, Object.keys(rows[0]));
        }
    };

    /**
     * Resolves only the two columns that have no saved-search custom label.
     * @returns {Object} Runtime source keys.
     */
    const resolveSourceColumnKeys = (ss1Rows, ss2Rows) => ({
        ss1: resolveSs1Columns(ss1Rows),
        ss2: resolveSs2Columns(ss2Rows),
    });

    /** Resolves the known SS1 risk-rank column. @returns {Object} */
    const resolveSs1Columns = (rows) => {
        assertKnownColumns(rows, 'SS1', [common.SOURCE_COLUMN.KEY_MAPPING,
            common.SOURCE_COLUMN.AUDIT_NAME, common.SOURCE_COLUMN.RANK_SS1,
            common.SOURCE_COLUMN.RANK_SS1_DISPLAY, common.SOURCE_COLUMN.FINDING_COUNT]);
        return {
            rankKey: common.SOURCE_COLUMN.RANK_SS1,
        };
    };

    /** Resolves the known SS2 classification column. @returns {Object} */
    const resolveSs2Columns = (rows) => {
        assertKnownColumns(rows, 'SS2', [common.SOURCE_COLUMN.KEY_MAPPING,
            common.SOURCE_COLUMN.AUDIT_NAME, common.SOURCE_COLUMN.RANK_SS2,
            common.SOURCE_COLUMN.PHANLOAI, common.SOURCE_COLUMN.IMPLEMENTATION_RESULT,
            common.SOURCE_COLUMN.RECOMMENDATION_COUNT]);
        return {
            classificationKey: common.SOURCE_COLUMN.PHANLOAI,
        };
    };

    /** Throws a named error when a measured custom label is absent. @returns {void} */
    const assertKnownColumns = (rows, sourceName, labels) => {
        if (rows.length === 0) {
            return;
        }
        labels.forEach((label) => {
            if (!Object.prototype.hasOwnProperty.call(rows[0], label)) {
                throw new Error(`BCTHKN: thiếu custom label bắt buộc ${sourceName}.${label}; `
                    + `keys=${JSON.stringify(Object.keys(rows[0]))}`);
            }
        });
    };

    /**
     * Indexes SS1 by normalized (key_mapping, mdrr) and preserves audit order.
     * @param {Array} rows SS1 rows.
     * @param {Object} sourceKeys Runtime SS1 keys.
     * @param {Object} diagnostics Mutable diagnostics.
     * @returns {{grainMap:Map,auditMap:Map,audits:Array}}
     */
    const buildSs1Index = (rows, sourceKeys, diagnostics) => {
        const index = {grainMap: new Map(), auditMap: new Map(), audits: []};
        rows.forEach((sourceRow, sourceOrder) => {
            const mapping = toKey(getKnownValue(sourceRow, common.SOURCE_COLUMN.KEY_MAPPING));
            const rankRaw = getKnownDisplayValue(sourceRow, sourceKeys.rankKey);
            const rank = getRankInfo(rankRaw);
            if (!mapping || !rank.key) {
                recordMissingSs1Key(diagnostics, mapping, rankRaw, sourceOrder);
                return;
            }
            const group = createSs1Group(sourceRow, mapping, rank, sourceOrder, diagnostics);
            const grainKey = makeCompositeKey(mapping, rank.key);
            if (index.grainMap.has(grainKey)) {
                diagnostics.duplicateSs1GrainCount++;
                addWarning(diagnostics, `SS1 trùng grain ${mapping}/${rank.key}; giữ dòng đầu.`);
                return;
            }
            index.grainMap.set(grainKey, group);
            addGroupToAuditIndex(index, group);
        });
        return index;
    };

    /** Creates one normalized SS1 group. @returns {Object} */
    const createSs1Group = (row, mapping, rank, sourceOrder, diagnostics) => ({
        keyMapping: mapping,
        auditKey: mapping,
        auditText: valueToText(getKnownDisplayValue(row, common.SOURCE_COLUMN.AUDIT_NAME)),
        rankKey: rank.key,
        rankText: rank.text || valueToText(rank.raw),
        rankOrder: rank.order,
        sourceOrder,
        soCtph: parseSourceNumber(getKnownValue(row, common.SOURCE_COLUMN.FINDING_COUNT),
            diagnostics, common.SOURCE_COLUMN.FINDING_COUNT,
            {keyMapping: mapping, rank: rank.key}),
    });

    /** Records a missing SS1 mapping or rank without manufacturing a key. @returns {void} */
    const recordMissingSs1Key = (diagnostics, mapping, rankRaw, sourceOrder) => {
        if (!mapping) {
            diagnostics.blankKeyMappingCount++;
        }
        if (!normalizeToken(rankRaw)) {
            diagnostics.blankRankCount++;
        }
        addIssueSample(diagnostics, ['missingSs1Grain'], {
            keyMapping: mapping, rank: rankRaw, sourceIndex: sourceOrder,
        });
    };

    /** Adds a group to its audit while preserving first-source order. @returns {void} */
    const addGroupToAuditIndex = (index, group) => {
        let audit = index.auditMap.get(group.auditKey);
        if (!audit) {
            audit = {auditKey: group.auditKey, auditText: group.auditText,
                sourceOrder: group.sourceOrder, groups: []};
            index.auditMap.set(group.auditKey, audit);
            index.audits.push(audit);
        }
        audit.groups.push(group);
    };

    /**
     * Pivots every grouped SS2 row directly; no YKKN/KQKN latest selection is possible.
     * @param {Array} rows SS2 grouped rows.
     * @param {Object} sourceKeys Runtime SS2 keys.
     * @param {Object} ss1Index SS1 grain index.
     * @param {Object} diagnostics Mutable diagnostics.
     * @returns {Object} Pivot maps and quantity reconciliation.
     */
    const pivotSs2ByStatus = (rows, sourceKeys, ss1Index, diagnostics) => {
        const pivot = {byGrain: new Map(), quantityByMapping: new Map(),
            sourceQuantitySum: 0, bucketSum: 0};
        rows.forEach((row, sourceIndex) => {
            const observation = readSs2Observation(row, sourceKeys, diagnostics, sourceIndex);
            addSourceQuantity(pivot, observation);
            if (!isPivotableObservation(observation, ss1Index, diagnostics)) {
                return;
            }
            const statusColumn = getStatusColumn(observation.phanloai, observation.kqth);
            const grainKey = makeCompositeKey(observation.keyMapping, observation.rankKey);
            const buckets = getOrCreateBuckets(pivot.byGrain, grainKey);
            buckets[statusColumn.dataField] += observation.quantity;
            pivot.bucketSum += observation.quantity;
            diagnostics.acceptedObservationCount++;
        });
        return pivot;
    };

    /**
     * Reads and normalizes one grouped SS2 row.
     * @param {Object} row SS2 row.
     * @param {Object} sourceKeys Runtime SS2 keys.
     * @param {Object} diagnostics Mutable diagnostics.
     * @param {number} sourceIndex Source row index.
     * @returns {Object} Normalized observation.
     */
    const readSs2Observation = (row, sourceKeys, diagnostics, sourceIndex) => {
        const keyMapping = toKey(getKnownValue(row, common.SOURCE_COLUMN.KEY_MAPPING));
        const rankRaw = getKnownDisplayValue(row, common.SOURCE_COLUMN.RANK_SS2);
        const context = {keyMapping, rank: rankRaw, sourceIndex};
        const phanloaiRaw = getKnownDisplayValue(row, sourceKeys.classificationKey);
        const kqthRaw = getKnownDisplayValue(row, common.SOURCE_COLUMN.IMPLEMENTATION_RESULT);
        return {
            keyMapping,
            rankKey: normalizeToken(rankRaw),
            phanloai: normalizePhanloai(phanloaiRaw, diagnostics, context),
            kqth: normalizeKqth(kqthRaw, diagnostics, context),
            quantity: parseSourceNumber(
                getKnownValue(row, common.SOURCE_COLUMN.RECOMMENDATION_COUNT),
                diagnostics, common.SOURCE_COLUMN.RECOMMENDATION_COUNT, context),
            phanloaiRaw,
            kqthRaw,
            sourceIndex,
        };
    };

    /** Adds every valid SS2 quantity to the A4 diagnostic totals. @returns {void} */
    const addSourceQuantity = (pivot, observation) => {
        if (observation.quantity === null) {
            return;
        }
        const mapping = observation.keyMapping || '(blank key_mapping)';
        const current = pivot.quantityByMapping.get(mapping) || 0;
        pivot.quantityByMapping.set(mapping, current + observation.quantity);
        pivot.sourceQuantitySum += observation.quantity;
    };

    /**
     * Validates that an observation belongs to one real SS1 grain.
     * @param {Object} observation Normalized SS2 observation.
     * @param {Object} ss1Index SS1 grain index.
     * @param {Object} diagnostics Mutable diagnostics.
     * @returns {boolean} Whether the observation can be pivoted.
     */
    const isPivotableObservation = (observation, ss1Index, diagnostics) => {
        if (!observation.keyMapping) {
            diagnostics.blankKeyMappingCount++;
            addIssueSample(diagnostics, ['blankKeyMapping'], observation);
            return false;
        }
        if (!observation.rankKey) {
            diagnostics.blankRankCount++;
            addIssueSample(diagnostics, ['blankRank'], observation);
            return false;
        }
        if (!observation.phanloai || !observation.kqth || observation.quantity === null) {
            return false;
        }
        const grainKey = makeCompositeKey(observation.keyMapping, observation.rankKey);
        if (!ss1Index.grainMap.has(grainKey)) {
            diagnostics.orphanCount++;
            addIssueSample(diagnostics, ['orphanSs2Grain'], observation);
            return false;
        }
        return true;
    };

    /** Returns existing pivot buckets or creates numeric zero buckets. @returns {Object} */
    const getOrCreateBuckets = (pivotMap, grainKey) => {
        if (!pivotMap.has(grainKey)) {
            pivotMap.set(grainKey, createZeroBuckets());
        }
        return pivotMap.get(grainKey);
    };

    /**
     * Joins SS1 to SS2 pivot maps and assigns canonical STT values.
     * @returns {Array} Canonical rows without rowspan metadata.
     */
    const joinAndBuildRows = (ss1Index, pivot) => {
        const rows = [];
        ss1Index.audits.forEach((audit, auditIndex) => {
            const groups = getCanonicalAuditGroups(audit);
            groups.forEach((group) => {
                const grainKey = makeCompositeKey(group.keyMapping, group.rankKey);
                const buckets = pivot.byGrain.get(grainKey) || createZeroBuckets();
                rows.push(makeCanonicalRow(group, buckets, auditIndex + 1));
            });
        });
        return rows;
    };

    /**
     * Returns fixed canonical ranks followed by any unknown source ranks.
     * @param {Object} audit Indexed audit.
     * @returns {Array} Canonically ordered groups.
     */
    const getCanonicalAuditGroups = (audit) => {
        const sourceByRank = new Map();
        audit.groups.forEach(group => sourceByRank.set(group.rankKey, group));
        const result = [];
        if (FIXED_RANK_ROWS) {
            RANKS.forEach((rank) => result.push(sourceByRank.get(rank.key)
                || createSyntheticGroup(audit, rank)));
        }
        audit.groups.forEach((group) => {
            if (!isCanonicalRank(group.rankKey) || !FIXED_RANK_ROWS) {
                result.push(group);
            }
        });
        result.sort(compareGroups);
        return result;
    };

    /** Creates a zero-valued missing canonical rank. @returns {Object} */
    const createSyntheticGroup = (audit, rank) => ({
        keyMapping: audit.auditKey, auditKey: audit.auditKey, auditText: audit.auditText,
        rankKey: rank.key, rankText: rank.text, rankOrder: rank.order,
        sourceOrder: audit.sourceOrder, soCtph: 0, isSynthetic: true,
    });

    /** Returns true for Cao/Trung bình/Thấp. @returns {boolean} */
    const isCanonicalRank = rankKey => RANKS.some(rank => rank.key === rankKey);

    /** Sorts ranks canonically while preserving source order for unknown ranks. @returns {number} */
    const compareGroups = (left, right) => (left.rankOrder - right.rankOrder)
        || (left.sourceOrder - right.sourceOrder);

    /**
     * Builds one canonical row and computes its two subtotals and grand total.
     * @param {Object} group SS1 group.
     * @param {Object} sourceBuckets Pivot buckets.
     * @param {number} stt Audit sequence number.
     * @returns {Object} Canonical report row.
     */
    const makeCanonicalRow = (group, sourceBuckets, stt) => {
        const buckets = {...sourceBuckets};
        computeTotals(buckets);
        return {
            rowKey: `${group.keyMapping}\u0000${group.rankKey}`,
            auditKey: group.auditKey,
            // FIELD.AUDIT/FIELD.RANK là dataField grid; auditText/rankText là tên nội bộ export.
            [FIELD.AUDIT]: group.auditText,
            auditText: group.auditText,
            [FIELD.STT]: stt,
            rankKey: group.rankKey,
            [FIELD.RANK]: group.rankText,
            rankText: group.rankText,
            rankOrder: group.rankOrder,
            sourceOrder: group.sourceOrder,
            [FIELD.FINDING_COUNT]: group.soCtph,
            ...buckets,
        };
    };

    /** Creates the twelve number buckets and three totals. @returns {Object} */
    const createZeroBuckets = () => {
        const buckets = {};
        STATUS_COLUMNS.forEach(column => { buckets[column.dataField] = 0; });
        buckets[FIELD.TONG_CO] = 0;
        buckets[FIELD.TONG_KHONG] = 0;
        buckets[FIELD.TONG_CONG] = 0;
        return buckets;
    };

    /** Computes both status-band totals and the grand total. @returns {Object} */
    const computeTotals = (buckets) => {
        buckets[FIELD.TONG_CO] = sumStatusRange(buckets, 0, STATUS_BAND_SIZE);
        buckets[FIELD.TONG_KHONG] = sumStatusRange(
            buckets, STATUS_BAND_SIZE, STATUS_COLUMNS.length);
        buckets[FIELD.TONG_CONG] = buckets[FIELD.TONG_CO] + buckets[FIELD.TONG_KHONG];
        return buckets;
    };

    /** Sums a contiguous status range. @returns {number} */
    const sumStatusRange = (buckets, start, end) => {
        let total = 0;
        for (let index = start; index < end; index++) {
            total += buckets[STATUS_COLUMNS[index].dataField];
        }
        return total;
    };

    /** Finalizes reconciliation and the unavoidable A4 business warning. @returns {void} */
    const completeDiagnostics = (diagnostics, pivot) => {
        diagnostics.pivotBucketSum = pivot.bucketSum;
        diagnostics.selectedSourceQuantitySum = pivot.sourceQuantitySum;
        diagnostics.delta = pivot.bucketSum - pivot.sourceQuantitySum;
        diagnostics.mismatch = diagnostics.delta !== 0 || diagnostics.orphanCount > 0
            || diagnostics.unknownCount > 0 || diagnostics.invalidNumberCount > 0;
        diagnostics.soYkknByKeyMapping = mapToObject(pivot.quantityByMapping);
        if (diagnostics.ss2RowCount > 0) {
            addWarning(diagnostics, 'SS2 không có ID YKKN ổn định; không thể tính số YKKN '
                + 'phân biệt hoặc kiểm tra đếm trùng một cách đáng tin.');
            // TODO(BA): Một khuyến nghị có nhiều kết quả thực hiện thì đếm thế nào — chỉ lấy
            // kết quả mới nhất, hay đếm hết vào từng trạng thái?
            addWarning(diagnostics, `TODO(BA): ${TODO_BA}`);
        }
    };

    /** Converts a string-keyed Map into a diagnostic object. @returns {Object} */
    const mapToObject = (sourceMap) => {
        const result = {};
        sourceMap.forEach((value, key) => { result[key] = value; });
        return result;
    };

    /**
     * Creates diagnostics for source shape, mapping and export.
     * @param {number} ss1RowCount SS1 row count.
     * @param {number} ss2RowCount SS2 row count.
     * @param {Object} params Form parameters.
     * @returns {Object} Initial diagnostics.
     */
    const createDiagnostics = (ss1RowCount, ss2RowCount, params) => {
        const diagnostics = {
            ss1RowCount, ss2RowCount, distinctYkknCount: null,
            acceptedObservationCount: 0, pivotBucketSum: 0, selectedSourceQuantitySum: 0,
            delta: 0, blankKeyMappingCount: 0, blankRankCount: 0, orphanCount: 0,
            unknownCount: 0, unknownPhanloaiCount: 0, unknownKqthCount: 0,
            blankValueCount: 0, invalidNumberCount: 0, duplicateSs1GrainCount: 0,
            mismatch: false, sourceColumnKeys: {}, soYkknByKeyMapping: {}, serverDebug: [],
            warnings: [], assumptions: [
                'SS1 là gốc; grain join là key_mapping + mdrr đã chuẩn hoá.',
                'SS2 đã group theo kqth ở saved search; client không chọn latest KQKN.',
                'Canonical row không mang rowspan; export projection mới merge cột B/C.',
                `FIXED_RANK_ROWS=${FIXED_RANK_ROWS}.`,
            ], issueSamples: [],
        };
        if (hasValue(params[common.PARAM.FROM_DATE]) || hasValue(params[common.PARAM.TO_DATE])) {
            addWarning(diagnostics, common.MESSAGE.DATE_SCOPE_WARNING);
        }
        return diagnostics;
    };

    /** Adds a warning once. @returns {void} */
    const addWarning = (diagnostics, message) => {
        if (message && diagnostics.warnings.indexOf(message) === -1) {
            diagnostics.warnings.push(message);
        }
    };

    /** Adds at most ten compact source issue samples. @returns {void} */
    const addIssueSample = (diagnostics, issueTypes, context) => {
        if (diagnostics.issueSamples.length >= 10) {
            return;
        }
        diagnostics.issueSamples.push({
            issueTypes: (Array.isArray(issueTypes) ? issueTypes : [issueTypes]).join(', '),
            keyMapping: valueToText(context && context.keyMapping),
            rank: valueToText(context && (context.rank || context.rankKey)),
            sourceIndex: context && context.sourceIndex !== undefined ? context.sourceIndex : '',
            statuses: valueToText(context && (context.kqthRaw || context.phanloaiRaw)),
        });
    };

    /** Normalizes risk rank text for cross-search grain matching. @returns {Object} */
    const getRankInfo = (raw) => {
        const normalized = normalizeToken(raw);
        for (let index = 0; index < RANKS.length; index++) {
            if (RANKS[index].key === normalized) {
                return {...RANKS[index], raw};
            }
        }
        return {key: normalized, text: valueToText(raw), order: 99, raw};
    };

    /**
     * Maps measured classification values to report enums.
     * @param {*} rawValue Source classification.
     * @param {Object} diagnostics Mutable diagnostics.
     * @param {Object} context Source context.
     * @returns {string|null} Classification enum.
     */
    const normalizePhanloai = (rawValue, diagnostics, context) => {
        const normalized = normalizeToken(rawValue);
        if (PHANLOAI_VALUE_MAP[normalized]) {
            return PHANLOAI_VALUE_MAP[normalized];
        }
        recordUnknownValue('phanloai', rawValue, diagnostics, context);
        return null;
    };

    /**
     * Maps measured implementation-result values to report enums.
     * @param {*} rawValue Source result.
     * @param {Object} diagnostics Mutable diagnostics.
     * @param {Object} context Source context.
     * @returns {string|null} Result enum.
     */
    const normalizeKqth = (rawValue, diagnostics, context) => {
        const normalized = normalizeToken(rawValue);
        if (KQTH_VALUE_MAP[normalized]) {
            return KQTH_VALUE_MAP[normalized];
        }
        recordUnknownValue('kqth', rawValue, diagnostics, context);
        return null;
    };

    /** Logs the exact unknown source value and updates diagnostics. @returns {void} */
    const recordUnknownValue = (field, rawValue, diagnostics, context) => {
        console.warn(`[BCTHKN] unknown ${field}:`, rawValue);
        diagnostics.unknownCount++;
        diagnostics[field === 'phanloai' ? 'unknownPhanloaiCount' : 'unknownKqthCount']++;
        addIssueSample(diagnostics, [`unknown:${field}`], {
            ...context, statuses: rawValue,
            [field === 'phanloai' ? 'phanloaiRaw' : 'kqthRaw']: rawValue,
        });
    };

    /** Finds the target pivot column for one normalized status pair. @returns {Object|null} */
    const getStatusColumn = (phanloai, kqth) => {
        for (let index = 0; index < STATUS_COLUMNS.length; index++) {
            const column = STATUS_COLUMNS[index];
            if (column.phanloai === phanloai && column.kqth === kqth) {
                return column;
            }
        }
        return null;
    };

    /**
     * Parses a saved-search number while preserving blank, invalid and numeric zero states.
     * @param {*} value Source value.
     * @param {Object} diagnostics Mutable diagnostics.
     * @param {string} fieldName Source field name.
     * @param {Object} context Source context.
     * @returns {number|null} Parsed number or null when source data is absent/invalid.
     */
    const parseSourceNumber = (value, diagnostics, fieldName, context) => {
        if (value === null || value === undefined
            || (typeof value === 'string' && value.trim() === '')) {
            diagnostics.blankValueCount++;
            addIssueSample(diagnostics, [`blankNumber:${fieldName}`], context);
            return null;
        }
        // libUtils.convertToFloat dùng !!input nên chỉ trả null sai với số 0 dạng number;
        // chuỗi "0" vẫn được thư viện parse đúng thành 0.
        if (typeof value === 'number' && value === 0) {
            return 0;
        }
        const normalizedValue = typeof value === 'string' ? value.replace(/,/g, '').trim() : value;
        const parsed = libUtils.convertToFloat(normalizedValue);
        if (parsed === null || !Number.isFinite(parsed)) {
            diagnostics.invalidNumberCount++;
            addIssueSample(diagnostics, [`invalidNumber:${fieldName}`], context);
            return null;
        }
        return parsed;
    };

    /** Gets a known label value without runtime inference. @returns {*} */
    const getKnownValue = (row, label) => row ? row[label] : undefined;

    /** Gets display text for a known saved-search label. @returns {*} */
    const getKnownDisplayValue = (row, label) => {
        const displayKey = label === common.SOURCE_COLUMN.PHANLOAI
            ? common.SOURCE_COLUMN.PHANLOAI_DISPLAY : `${label}_display`;
        const display = row ? row[displayKey] : undefined;
        return hasValue(display) ? display : getKnownValue(row, label);
    };

    /** Normalizes text using the repository utility. @returns {string} */
    const normalizeToken = value => libUtils.removeAccents(valueToText(value))
        .toLowerCase().trim().replace(/\s+/g, ' ');

    /**
     * Returns whether a source value is present.
     * Không dùng được libCsXLS.isContainValue vì chuỗi chỉ có khoảng trắng vẫn được coi là có.
     * @returns {boolean}
     */
    const hasValue = value => value !== null && value !== undefined
        && !(typeof value === 'string' && value.trim() === '');

    /** Converts a nullable source value to text. @returns {string} */
    const valueToText = value => value === null || value === undefined ? '' : String(value);

    /** Converts a source value to a stable nonblank key. @returns {string|null} */
    const toKey = value => hasValue(value) && valueToText(value).trim() !== ''
        ? valueToText(value).trim() : null;

    /** Creates a collision-safe two-part map key. @returns {string} */
    const makeCompositeKey = (left, right) => `${left}\u0000${right}`;

    /** Builds a concise reconciliation warning. @returns {string} */
    const buildMismatchMessage = diagnostics => [
        'BCTHKN có cảnh báo đối chiếu; vẫn export vì BLOCK_EXPORT_ON_MISMATCH=false.',
        `pivotBucketSum=${diagnostics.pivotBucketSum}`,
        `selectedSourceQuantitySum=${diagnostics.selectedSourceQuantitySum}`,
        `delta=${diagnostics.delta}`,
        `orphanCount=${diagnostics.orphanCount}`,
        `unknownCount=${diagnostics.unknownCount}`,
    ].join('; ');

    /**
     * Creates exactly one ExcelJS workbook and saves exactly one XLSX file.
     * @param {Array} rows Canonical report rows.
     * @param {Object} params Form parameters.
     * @param {Object} diagnostics Mapping diagnostics.
     * @param {Set<string>} hiddenFields Zero-only numeric fields hidden on the grid.
     * @returns {Promise<void>}
     */
    const onExportExcel = async (rows, params, diagnostics, hiddenFields) => {
        const workbook = new ExcelJS.Workbook();
        const exportSheet = workbook.addWorksheet(SHEET.EXPORT);
        const exportRows = Array.isArray(rows) ? rows : [];
        const exportDiagnostics = diagnostics || createDiagnostics(0, 0, {});
        exportSheet.views = [{showGridLines: false}];
        exportSheet.pageSetup = {orientation: 'landscape', fitToPage: true,
            fitToWidth: 1, fitToHeight: 0, paperSize: 9};
        renderExportMeta(exportSheet, params || {});
        renderHeaderExport(exportSheet);
        renderDataExport(exportSheet, exportRows, exportDiagnostics);
        hideZeroColumnsExport(exportSheet, hiddenFields);
        await libCsXLS.saveWorkbook(workbook, FILE_NAME);
    };

    /**
     * Renders subsidiary, report title and filter text.
     * @param {Object} sheet Export worksheet.
     * @param {Object} params Form parameters.
     * @returns {void}
     */
    const renderExportMeta = (sheet, params) => {
        const subsidiary = formatFilterDisplay(params[common.PARAM.SUBSIDIARY_DISPLAY]);
        const department = formatFilterDisplay(params[common.PARAM.DEPARTMENT_DISPLAY]);
        sheet.getColumn(1).width = 3;
        sheet.getCell('A1').value = subsidiary;
        mergeAndSet(sheet, ROW.TITLE, COLUMN.META_START, ROW.TITLE, COLUMN.META_END,
            TEXT.REPORT_TITLE);
        mergeAndSet(sheet, ROW.SUBSIDIARY, COLUMN.META_START, ROW.SUBSIDIARY,
            COLUMN.META_END, `${common.TEXT.SUBSIDIARY}: ${subsidiary}`);
        mergeAndSet(sheet, ROW.DEPARTMENT, COLUMN.META_START, ROW.DEPARTMENT,
            COLUMN.META_END, `${common.TEXT.DEPARTMENT}: ${department}`);
        mergeAndSet(sheet, ROW.DATE_SCOPE, COLUMN.META_START, ROW.DATE_SCOPE,
            COLUMN.META_END, `${EXPORT_META.FROM_DATE}: ${formatDateForExport(
            params[common.PARAM.FROM_DATE])} ${EXPORT_META.TO_DATE}: ${formatDateForExport(
            params[common.PARAM.TO_DATE])}`);
        libCsXLS.createFontsWithRange(sheet, 'A1', 'A1', {bold: true, size: 12});
        const titleCell = {row: ROW.TITLE, col: COLUMN.META_START};
        const metaStart = {row: ROW.SUBSIDIARY, col: COLUMN.META_START};
        const metaEnd = {row: ROW.DATE_SCOPE, col: COLUMN.META_START};
        libCsXLS.createFontsWithRange(sheet, titleCell, titleCell, {bold: true, size: 14});
        libCsXLS.createFontsWithRange(sheet, metaStart, metaEnd, {size: 11});
        applyAlignmentWithRange(sheet, 'A1', 'A1', {horizontal: 'left', vertical: 'middle'});
        applyAlignmentWithRange(sheet, titleCell, metaEnd,
            {horizontal: 'center', vertical: 'middle'});
        [ROW.TITLE, ROW.SUBSIDIARY, ROW.DEPARTMENT, ROW.DATE_SCOPE].forEach(row => {
            sheet.getRow(row).height = row === ROW.TITLE ? ROW_HEIGHT.TITLE : ROW_HEIGHT.META;
        });
    };

    /** Merges one region with the repository helper and sets its top-left value. @returns {void} */
    const mergeAndSet = (sheet, startRow, startColumn, endRow, endColumn, value) => {
        libCsXLS.mergeCell(sheet, startRow, startColumn, endRow, endColumn);
        sheet.getCell(startRow, startColumn).value = value;
    };

    /** Formats multiselect text returned by _scvForm.getParameter. @returns {string} */
    const formatFilterDisplay = value => valueToText(value).split('||').join(', ');

    /** Formats a NetSuite date as dd/mm/yyyy through the existing format utility. @returns {string} */
    const formatDateForExport = (value) => {
        if (!hasValue(value)) {
            return '';
        }
        try {
            const date = value instanceof Date ? value : constFormat.parseDate(value);
            if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
                return valueToText(value);
            }
            return `${String(date.getDate()).padStart(2, '0')}/`
                + `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        } catch (error) {
            return valueToText(value);
        }
    };

    /**
     * Renders and styles the two-level B:T header.
     * @param {Object} sheet Export worksheet.
     * @returns {void}
     */
    const renderHeaderExport = (sheet) => {
        Object.keys(COLUMN_WIDTHS).forEach(column => {
            sheet.getColumn(Number(column)).width = COLUMN_WIDTHS[column];
        });
        mergeHeaderCells(sheet);
        writeHeaderValues(sheet);
        sheet.getRow(ROW.HEADER_PARENT).height = ROW_HEIGHT.HEADER_PARENT;
        sheet.getRow(ROW.HEADER_CHILD).height = ROW_HEIGHT.HEADER_CHILD;
        const start = {row: ROW.HEADER_PARENT, col: COLUMN.FIRST};
        const end = {row: ROW.HEADER_CHILD, col: COLUMN.LAST};
        libCsXLS.createFontsWithRange(sheet, start, end, {bold: true});
        libCsXLS.createFillWithRange(sheet, start, end,
            {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFFFFFFF'}});
        libCsXLS.createBorderWithRange(sheet, start, end, 'thin',
            {rowStyle: 'thin', colStyle: 'thin'});
        applyAlignmentWithRange(sheet, start, end,
            {horizontal: 'center', vertical: 'middle', wrapText: true});
    };

    /** Merges vertical base columns and the two seven-column bands. @returns {void} */
    const mergeHeaderCells = (sheet) => {
        [COLUMN.STT, COLUMN.AUDIT, COLUMN.RANK, COLUMN.FINDING_COUNT,
            COLUMN.GRAND_TOTAL].forEach(column => libCsXLS.mergeCell(sheet,
            ROW.HEADER_PARENT, column, ROW.HEADER_CHILD, column));
        libCsXLS.mergeCell(sheet, ROW.HEADER_PARENT, COLUMN.TIMED_START,
            ROW.HEADER_PARENT, COLUMN.TIMED_TOTAL);
        libCsXLS.mergeCell(sheet, ROW.HEADER_PARENT, COLUMN.UNTIMED_START,
            ROW.HEADER_PARENT, COLUMN.UNTIMED_TOTAL);
    };

    /** Writes all parent and child header captions. @returns {void} */
    const writeHeaderValues = (sheet) => {
        HEADER_PARENT_VALUES.forEach((header) => {
            sheet.getCell(ROW.HEADER_PARENT, header.column).value = header.caption;
        });
        for (let index = 0; index < STATUS_BAND_SIZE; index++) {
            sheet.getCell(ROW.HEADER_CHILD, COLUMN.TIMED_START + index).value =
                STATUS_COLUMNS[index].caption;
            sheet.getCell(ROW.HEADER_CHILD, COLUMN.UNTIMED_START + index).value =
                STATUS_COLUMNS[index + STATUS_BAND_SIZE].caption;
        }
        sheet.getCell(ROW.HEADER_CHILD, COLUMN.TIMED_TOTAL).value = TEXT.TOTAL;
        sheet.getCell(ROW.HEADER_CHILD, COLUMN.UNTIMED_TOTAL).value = TEXT.TOTAL;
    };

    /**
     * Hides zero-only status columns, then grows the band header row so its caption
     * still fits when only a few columns of the band remain visible.
     * @returns {void}
     */
    const hideZeroColumnsExport = (sheet, hiddenFields) => {
        if (!(hiddenFields instanceof Set)) {
            return;
        }
        hiddenFields.forEach((field) => {
            if (ALWAYS_VISIBLE_NUMERIC_FIELDS.includes(field)) {
                return;
            }
            const fieldIndex = NUMERIC_EXPORT_FIELDS.indexOf(field);
            if (fieldIndex >= 0) {
                sheet.getColumn(COLUMN.FIRST_NUMBER + fieldIndex).hidden = true;
            }
        });
        const bandLines = [[COLUMN.TIMED_START, COLUMN.TIMED_TOTAL],
            [COLUMN.UNTIMED_START, COLUMN.UNTIMED_TOTAL]].map(([start, end]) => {
            let visibleWidth = 0;
            for (let column = start; column <= end; column++) {
                if (!sheet.getColumn(column).hidden) {
                    visibleWidth += COLUMN_WIDTHS[column] || 0;
                }
            }
            const caption = valueToText(sheet.getCell(ROW.HEADER_PARENT, start).value);
            // Chữ đậm ~1.15 đơn vị độ rộng/ký tự; ước lượng số dòng sau wrapText.
            return Math.ceil(caption.length * 1.15 / Math.max(visibleWidth, 1));
        });
        const lines = Math.max(...bandLines, 1);
        sheet.getRow(ROW.HEADER_PARENT).height = Math.max(ROW_HEIGHT.HEADER_PARENT,
            lines * 15 + 8);
    };

    /**
     * Writes canonical data, applies table style and merges audit spans.
     * @param {Object} sheet Export worksheet.
     * @param {Array} rows Canonical rows.
     * @param {Object} diagnostics Export diagnostics to receive reconciliation warnings.
     * @returns {void}
     */
    const renderDataExport = (sheet, rows, diagnostics) => {
        const spans = getAuditSpans(rows);
        const firstIndexes = new Set(spans.map(span => span.startIndex));
        rows.forEach((sourceRow, index) => {
            writeExportRow(sheet, sourceRow, index, firstIndexes.has(index));
        });
        // Khối Tổng Excel đang TẮT bằng EXPORT_TOTAL_ROWS trong lúc chờ BA:
        // ảnh PNG của FDD có khối Tổng, còn sheet Export của FDD không có.
        const totalRows = buildExportTotalRows(rows);
        if (EXPORT_TOTAL_ROWS) {
            totalRows.forEach((totalRow, index) => {
                writeExportRow(sheet, totalRow, rows.length + index, true);
            });
        }
        const lastRow = ROW.DATA_START + rows.length
            + (EXPORT_TOTAL_ROWS ? totalRows.length : 0) - 1;
        libCsXLS.createBorderWithRange(sheet,
            {row: ROW.DATA_START, col: COLUMN.FIRST}, {row: lastRow, col: COLUMN.LAST},
            'thin', {rowStyle: 'thin', colStyle: 'thin'});
        applyAlignmentWithRange(sheet,
            {row: ROW.DATA_START, col: COLUMN.FIRST}, {row: lastRow, col: COLUMN.LAST},
            {horizontal: 'center', vertical: 'middle', wrapText: true});
        // Không dùng được libCsXLS.getNumberAccountingFormatXls vì format kế toán của
        // thư viện khác định dạng khoá Đ7B: #,##0;-#,##0;"-".
        libCsXLS.createNumFmtWithRange(sheet,
            {row: ROW.DATA_START, col: COLUMN.FIRST_NUMBER},
            {row: lastRow, col: COLUMN.LAST}, NUMBER_FORMAT_INTEGER);
        mergeAuditSpans(sheet, spans);
        if (EXPORT_TOTAL_ROWS) {
            mergeExportTotalAudit(sheet, rows.length, totalRows.length);
        }
        checkExportGrandTotal(rows, totalRows, diagnostics);
    };

    /** Builds the three export-only rank total rows from canonical rows. @returns {Array} */
    const buildExportTotalRows = (rows) => {
        const totalsByRank = new Map();
        RANKS.forEach(rank => totalsByRank.set(rank.key, createExportTotalRow(rank)));
        rows.forEach(sourceRow => addRowToExportTotal(totalsByRank, sourceRow));
        return RANKS.map(rank => totalsByRank.get(rank.key));
    };

    /** Creates one blank numeric total row for a canonical rank. @returns {Object} */
    const createExportTotalRow = rank => {
        const totalRow = {
            [FIELD.STT]: null,
            [FIELD.AUDIT]: TEXT.TOTAL,
            auditText: TEXT.TOTAL,
            rankKey: rank.key,
            [FIELD.RANK]: rank.text,
            rankText: rank.text,
        };
        NUMERIC_EXPORT_FIELDS.forEach(field => { totalRow[field] = 0; });
        return totalRow;
    };

    /** Adds one canonical row's numeric fields to its rank total. @returns {void} */
    const addRowToExportTotal = (totalsByRank, sourceRow) => {
        const totalRow = totalsByRank.get(sourceRow.rankKey);
        if (!totalRow) {
            return;
        }
        NUMERIC_EXPORT_FIELDS.forEach(field => {
            const value = toExportNumber(sourceRow[field]);
            if (value !== null) {
                totalRow[field] += value;
            }
        });
    };

    /** Merges the export-only Tổng label across its three rank rows. @returns {void} */
    const mergeExportTotalAudit = (sheet, dataRowCount, totalRowCount) => {
        if (totalRowCount <= 1) {
            return;
        }
        const startRow = ROW.DATA_START + dataRowCount;
        const endRow = startRow + totalRowCount - 1;
        libCsXLS.mergeCell(sheet, startRow, COLUMN.AUDIT, endRow, COLUMN.AUDIT);
    };

    /** Checks the Tổng grand total against every canonical data row. @returns {void} */
    const checkExportGrandTotal = (rows, totalRows, diagnostics) => {
        const dataGrandTotal = sumExportField(rows, FIELD.TONG_CONG);
        const totalGrandTotal = sumExportField(totalRows, FIELD.TONG_CONG);
        if (dataGrandTotal !== totalGrandTotal) {
            addWarning(diagnostics, `BCTHKN: lệch kiểm tra khối Tổng; `
                + `data=${dataGrandTotal}; total=${totalGrandTotal}.`);
        }
    };

    /** Sums one numeric export field without converting missing values to zero. @returns {number} */
    const sumExportField = (rows, field) => rows.reduce((sum, sourceRow) => {
        const value = toExportNumber(sourceRow[field]);
        return value === null ? sum : sum + value;
    }, 0);

    /** Writes one B:T data row with true numeric values. @returns {void} */
    const writeExportRow = (sheet, sourceRow, index, isFirstInAudit) => {
        const rowNumber = ROW.DATA_START + index;
        const values = [isFirstInAudit ? sourceRow.stt : null,
            isFirstInAudit ? sourceRow.auditText : null, sourceRow.rankText];
        NUMERIC_EXPORT_FIELDS.forEach(field => values.push(toExportNumber(sourceRow[field])));
        values.forEach((value, valueIndex) => {
            sheet.getCell(rowNumber, COLUMN.FIRST + valueIndex).value = value;
        });
        sheet.getRow(rowNumber).height = ROW_HEIGHT.DATA;
    };

    /** Ô thiếu số ghi 0 để numFmt hiện "-" như FDD; không ghi chuỗi "-". @returns {number} */
    const toExportNumber = value => typeof value === 'number' && Number.isFinite(value)
        ? value : 0;

    /** Scans consecutive canonical rows into export-only audit spans. @returns {Array} */
    const getAuditSpans = (rows) => {
        const spans = [];
        let startIndex = 0;
        while (startIndex < rows.length) {
            const auditKey = rows[startIndex].auditKey;
            let endIndex = startIndex;
            while (endIndex + 1 < rows.length && rows[endIndex + 1].auditKey === auditKey) {
                endIndex++;
            }
            spans.push({startIndex, endIndex, groupSize: endIndex - startIndex + 1});
            startIndex = endIndex + 1;
        }
        return spans;
    };

    /** Merges B/C only for audit groups containing more than one row. @returns {void} */
    const mergeAuditSpans = (sheet, spans) => {
        spans.forEach((span) => {
            if (span.groupSize <= 1) {
                return;
            }
            const startRow = ROW.DATA_START + span.startIndex;
            const endRow = ROW.DATA_START + span.endIndex;
            libCsXLS.mergeCell(sheet, startRow, COLUMN.STT, endRow, COLUMN.STT);
            libCsXLS.mergeCell(sheet, startRow, COLUMN.AUDIT, endRow, COLUMN.AUDIT);
        });
    };

    /** Creates the Diagnostics sheet and delegates its sections. @returns {void} */
    const renderDiagnosticsSheet = (workbook, diagnostics) => {
        const sheet = workbook.addWorksheet(SHEET.DIAGNOSTICS);
        sheet.views = [{showGridLines: false}];
        setDiagnosticWidths(sheet);
        mergeAndSet(sheet, 1, 1, 1, COLUMN.DIAGNOSTIC_LAST, TEXT.DIAGNOSTICS_TITLE);
        let rowNumber = writeDiagnosticMetrics(sheet, diagnostics, 3);
        rowNumber = writeDiagnosticWarnings(sheet, diagnostics, rowNumber);
        rowNumber = writeDiagnosticAssumptions(sheet, diagnostics, rowNumber);
        rowNumber = writeDiagnosticIssues(sheet, diagnostics, rowNumber);
        styleDiagnostics(sheet, rowNumber - 1);
    };

    /** Sets diagnostic column widths. @returns {void} */
    const setDiagnosticWidths = (sheet) => {
        [38, 72, 24, 22, 36].forEach((width, index) => {
            sheet.getColumn(index + 1).width = width;
        });
    };

    /**
     * Writes scalar diagnostics and structured source information.
     * @param {Object} sheet Diagnostics worksheet.
     * @param {Object} diagnostics Mapping diagnostics.
     * @param {number} startRow First output row.
     * @returns {number} Next available row.
     */
    const writeDiagnosticMetrics = (sheet, diagnostics, startRow) => {
        let row = startRow;
        DIAGNOSTIC_METRICS.forEach((name) => {
            sheet.getCell(row, 1).value = name;
            sheet.getCell(row, 2).value = diagnosticCellValue(diagnostics[name]);
            row++;
        });
        DIAGNOSTIC_STRUCTURE.forEach((name) => {
            sheet.getCell(row, 1).value = name;
            sheet.getCell(row, 2).value = diagnosticCellValue(diagnostics[name]);
            row++;
        });
        sheet.getCell(row, 1).value = 'BLOCK_EXPORT_ON_MISMATCH';
        sheet.getCell(row, 2).value = BLOCK_EXPORT_ON_MISMATCH;
        return row + 1;
    };

    /** Writes warning messages including date scope and TODO(BA). @returns {number} */
    const writeDiagnosticWarnings = (sheet, diagnostics, startRow) => {
        sheet.getCell(startRow, 1).value = TEXT.WARNINGS;
        let row = startRow + 1;
        diagnostics.warnings.forEach((warning) => {
            sheet.getCell(row, 2).value = warning;
            row++;
        });
        return row;
    };

    /** Writes mapper assumptions. @returns {number} */
    const writeDiagnosticAssumptions = (sheet, diagnostics, startRow) => {
        sheet.getCell(startRow, 1).value = TEXT.ASSUMPTIONS;
        let row = startRow + 1;
        diagnostics.assumptions.forEach((assumption) => {
            sheet.getCell(row, 2).value = assumption;
            row++;
        });
        return row;
    };

    /** Writes at most ten issue samples. @returns {number} */
    const writeDiagnosticIssues = (sheet, diagnostics, startRow) => {
        sheet.getCell(startRow, 1).value = TEXT.ISSUES;
        DIAGNOSTIC_ISSUE_HEADERS.forEach((header, index) => {
            sheet.getCell(startRow + 1, index + 1).value = header;
        });
        let row = startRow + 2;
        diagnostics.issueSamples.forEach((sample) => {
            DIAGNOSTIC_ISSUE_HEADERS.forEach((header, index) => {
                sheet.getCell(row, index + 1).value = diagnosticCellValue(sample[header]);
            });
            row++;
        });
        return row;
    };

    /** Applies reusable font/border helpers and one centralized alignment helper. @returns {void} */
    const styleDiagnostics = (sheet, lastRow) => {
        libCsXLS.createFontsWithRange(sheet, 'A1', 'A1', {bold: true, size: 14});
        libCsXLS.createFontsWithRange(sheet, {row: 1, col: 1}, {row: lastRow, col: 1},
            {bold: true});
        libCsXLS.createBorderWithRange(sheet, {row: 1, col: 1},
            {row: lastRow, col: COLUMN.DIAGNOSTIC_LAST},
            'thin', {rowStyle: 'thin', colStyle: 'thin'});
        applyAlignmentWithRange(sheet, {row: 1, col: 1},
            {row: lastRow, col: COLUMN.DIAGNOSTIC_LAST},
            {horizontal: 'left', vertical: 'top', wrapText: true});
        applyAlignmentWithRange(sheet, 'A1', 'A1',
            {horizontal: 'center', vertical: 'middle'});
    };

    /** Converts a diagnostic object/nullable value to a worksheet-safe value. @returns {*} */
    const diagnosticCellValue = value => value === null || value === undefined
        ? 'N/A' : (typeof value === 'object' ? JSON.stringify(value) : value);

    /**
     * Applies alignment to a range.
     * Không dùng được libCsXLS.assignStyle/assignStyleColumn vì assignStyle chỉ chụp style
     * từ template, còn workbook BCTHKN được dựng mới và libCsXLS không có helper alignment.
     * @returns {void}
     */
    const applyAlignmentWithRange = (sheet, start, end, alignment) => {
        const startCell = libCsXLS.getPositionCell(sheet, start);
        const endCell = libCsXLS.getPositionCell(sheet, end);
        for (let row = startCell.row; row <= endCell.row; row++) {
            for (let column = startCell.col; column <= endCell.col; column++) {
                sheet.getCell(row, column).alignment = {...alignment};
            }
        }
    };

    return {pageInit, onSearchResult};
});
