/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/https', 'N/url',
        '../lib/scv_lib_cs.js', '../lib/scv_lib_cs_xls.js', '../lib/scv_lib_report_custom.js', '../cons/scv_cons_record.js'],

    function (ccr, https, url, libCs, libCsXLS, libRpCustom, constRecord) {

        const refresh = () => {
            window.location.reload();
        }

        let listTxnConfigFilters = null;
        let listDataFieldConfig, datas = null, dataConfig = null, isDirty = true;

        function pageInit(scriptContext) {
            let currentRecord = scriptContext.currentRecord;
            listTxnConfigFilters = currentRecord.getValue('custpage_data_filter_config');
            if (listTxnConfigFilters) {
                listTxnConfigFilters = JSON.parse(listTxnConfigFilters);
                for (let objFilter of listTxnConfigFilters) {
                    if (objFilter.default_value) {
                        if ((objFilter.type_display === 'Date' || objFilter.type_display === 'Date/Time') && objFilter.default_value.indexOf(`"'`) !== -1) {
                            currentRecord.setText({
                                fieldId: objFilter.id,
                                text: eval(objFilter.default_value)
                            });
                        } else {
                            currentRecord.setValue({
                                fieldId: objFilter.id,
                                value: eval(objFilter.default_value)
                            });
                        }
                        if (objFilter.sql || objFilter.saved_search) {
                            initQuickFindFieldSelect(currentRecord, objFilter.id);
                        }
                    }
                }
            }
            listDataFieldConfig = currentRecord.getValue('custpage_data_field_config');
            libRpCustom.resizeGrid("scvTabsContainer");
            if (listDataFieldConfig) {
                listDataFieldConfig = JSON.parse(listDataFieldConfig);
                renderDxTabsWithDxGrid(listDataFieldConfig);
            }
        }

        const renderDxTabsWithDxGrid = (listDataFieldConfig) => {
            let objDataFieldConfig = listDataFieldConfig[0];
            let columns = objDataFieldConfig?.custrecord_scv_txcf_rp_column;
            columns = columns ? JSON.parse(columns) : [];
            let summary = null;
            if (!util.isArray(columns)) {
                summary = columns.summary;
                columns = columns.columns;
            }

            let items = [{
                title: objDataFieldConfig?.text,
                template: function () {
                    return $("<div>").dxDataGrid({
                        dataSource: datas,
                        columns: columns,
                        summary: summary,
                        showBorders: true,
                        rowAlternationEnabled: true,
                        onCellPrepared: function (e) {
                            if (e.rowType === "data" && e.data.typebold === "2") {
                                e.cellElement.css("font-weight", "bold");
                            }
                        }
                    });
                }
            }];

            $("#scvTabsContainer").dxTabPanel({items: items});
        }

        const initQuickFindFieldSelect = (currentRecord, fieldId) => {
            constRecord.initQuickFindFieldSelect(currentRecord, fieldId, {
                data: currentRecord.getField(fieldId).getSelectOptions(),
                valueExpr: "value",
                displayExpr: "text",
                reInsertOption: false
            }, false);
        }

        function fieldChanged(scriptContext) {
            let currentRecord = scriptContext.currentRecord;
            if (scriptContext.fieldId === 'custpage_txn_config') {
                window.onbeforeunload = null;
                let params = {custpage_txn_config: currentRecord.getValue('custpage_txn_config')};
                let urlTxnReport = getUrlSearch(params);
                window.location.replace(urlTxnReport);
            } else {
                isDirty = true;
                listTxnConfigFilters = currentRecord.getValue('custpage_data_filter_config');
                if (listTxnConfigFilters) {
                    listTxnConfigFilters = JSON.parse(listTxnConfigFilters);
                    let fieldId = scriptContext.fieldId;

                    let listChildFilter = listTxnConfigFilters.filter(o => o.criteria && (o.sql || o.saved_search));
                    for (let objFilter of listChildFilter) {
                        initFieldSelect(currentRecord, objFilter, fieldId);
                    }
                }
            }
        }

        const initFieldSelect = (currentRecord, objFilter, fieldId) => {
            let criterias = JSON.parse(objFilter.criteria);
            if (criterias.filter(o => o.values === fieldId).length > 0) {
                let fieldChild = currentRecord.getField(objFilter.id);
                fieldChild.removeSelectOption({value: null});
                if (objFilter.saved_search) {
                    for (let criteria of criterias) {
                        let fieldValue = currentRecord.getValue(criteria.values);
                        criteria.values = fieldValue && String(fieldValue) ? fieldValue : '-1';
                    }
                    libCs.insertSelectionViaSavedSearch([fieldChild], objFilter.saved_search, criterias, true, null);
                } else if (objFilter.sql) {
                    let strWhere = '';
                    for (let criteria of criterias) {
                        let fieldValue = currentRecord.getValue(criteria.values);
                        if (typeof criteria === 'string') {
                            strWhere += criteria;
                        } else {
                            if (criteria.operator === 'in') {
                                strWhere += ` ${criteria.name} ${criteria.operator} (${(fieldValue || '-1').split(',').map(v => `'${v}'`).join(',')})`;
                            } else {
                                strWhere += ` ${criteria.name} ${criteria.operator} '${fieldValue || -1}'`;
                            }
                        }
                    }
                    libCs.insertSelectionViaSql(fieldChild, objFilter.sql + strWhere, [], true, null);
                }
                initQuickFindFieldSelect(currentRecord, objFilter.id);
            }
        }

        const getUrlSearch = (params) => {
            return url.resolveScript({
                scriptId: 'customscript_scv_sl_txn_report',
                deploymentId: 'customdeploy_scv_sl_txn_report',
                returnExternalUrl: false,
                params: params
            })
        }

        const searchResult = () => {
            window.onbeforeunload = null;
            libCs.showLoadingDialog(true);
            let currentRecord = ccr.get();
            let {objaParams, message} = getParams(currentRecord);
            if (message) {
                alert(message);
                libCs.showLoadingDialog(false);
            } else {
                callToGetDatas(objaParams, handleSearchResult);
                isDirty = false;
            }
        }

        const handleSearchResult = (body) => {
            let resBody = JSON.parse(body);
            datas = resBody.listDataJoinSource.datas;
            dataConfig = resBody.listDataJoinSource.dataConfig;
            renderDxTabsWithDxGrid(listDataFieldConfig);
            libCs.showLoadingDialog(false);
        }

        const getParams = (currentRecord) => {
            let objaParams = {
                isExport: 'T',
                custpage_txn_config: currentRecord.getValue('custpage_txn_config')
            };
            let message = !objaParams.custpage_txn_config ? 'Please fill Txn Type' : '';
            if (listTxnConfigFilters) {
                for (let objFilter of listTxnConfigFilters) {
                    if (objFilter.type_display === 'Date' || objFilter.type_display === 'Date/Time') {
                        objaParams[objFilter.id] = currentRecord.getText(objFilter.id);
                    } else if (objFilter.type_display === 'Multiple Select') {
                        objaParams[objFilter.id] = currentRecord.getValue(objFilter.id).join(',');
                    } else {
                        objaParams[objFilter.id] = currentRecord.getValue(objFilter.id);
                    }
                    if (!objaParams[objFilter.id] && objFilter.is_mandatory === true) {
                        message = `Please fill ${objFilter.label}`;
                        break;
                    }
                }
            }
            return {objaParams, message};
        }

        const exportResult = async () => {
            window.onbeforeunload = null;
            libCs.showLoadingDialog(true);
            let currentRecord = ccr.get();
            let {objaParams, message} = getParams(currentRecord);
            if (message) {
                alert(message);
                libCs.showLoadingDialog(false);
            } else {
                if (isDirty || !datas) {
                    callToGetDatas(objaParams, handleExportResult, currentRecord);
                    isDirty = false;
                } else {
                    if (datas) {
                        exportExcel(objaParams, currentRecord, dataConfig, datas);
                    }
                    libCs.showLoadingDialog(false);
                }
            }
        }

        const handleExportResult = (body, objaParams, currentRecord) => {
            let resBody = JSON.parse(body);
            datas = resBody.listDataJoinSource.datas;
            dataConfig = resBody.listDataJoinSource.dataConfig;
            renderDxTabsWithDxGrid(listDataFieldConfig);

            exportExcel(objaParams, currentRecord, dataConfig, datas);
            libCs.showLoadingDialog(false);
        }

        const exportExcel = async (params, currentRecord, dataConfig, listDataResult) => {
            let objDataFieldConfig = listDataFieldConfig[0];
            const reportName = objDataFieldConfig.text;
            let workbook = await libCsXLS.loadWorkbookFromUrl(objDataFieldConfig.temp_url);
            let currentSheetFirst = workbook.worksheets[0];
            let headerFields = objDataFieldConfig.custrecord_scv_txcf_header_field ? JSON.parse(objDataFieldConfig.custrecord_scv_txcf_header_field) : {};
            let lineFields = objDataFieldConfig.custrecord_scv_txcf_line_field ? JSON.parse(objDataFieldConfig.custrecord_scv_txcf_line_field) : {};

            initDataHeaderSheet(currentSheetFirst, headerFields, params, dataConfig);
            updateDataToSheet(currentSheetFirst, lineFields, listDataResult);

            // Save File
            await libCsXLS.saveWorkbook(workbook, reportName + ".xlsx");
        }

        const updateDataToSheet = (currentSheet, lineFields, listData) => {
            let rowStart = lineFields.rowStart || 0;
            let rowMau = rowStart;
            let columnsNames = lineFields.columns;
            let columnsData = lineFields.columns_data;
            let columnsGroup = lineFields.columns_group;
            let columnsSummary = lineFields.columns_summary;

            if (columnsNames) {
                let objStype = {};
                for (let column of columnsNames) {
                    objStype[column + rowMau] = currentSheet.getCell(column + rowMau).style;
                }

                if (columnsData) {
                    currentSheet.spliceRows(rowStart, 1);
                    let rowInsert = rowStart;

                    // lineFields.style ({style, font}) is the default styling for group/total summary rows;
                    // fall back to bold so configs without a "style" param keep the old look
                    let summaryRowStyle = lineFields.style || {font: {bold: true}};
                    // per-field styles declared on each columns_summary entry (e.g. {"column": "doc_no", "style": {...}})
                    let summaryColumnStyles = getSummaryColumnStyles(columnsSummary);
                    // per-field styles for the group label columns, e.g. {"business_center": {"font": {"bold": true}}}
                    let groupColumnStyles = lineFields.columns_group_style || {};

                    const insertLineRow = (objDataLine, rowStyle) => {
                        currentSheet.insertRow(rowInsert);
                        for (let i = 0; i < columnsNames.length; i++) {
                            let column = columnsNames[i];
                            let cellInfo = currentSheet.getCell(column + rowInsert);
                            let cellStyle = null;
                            if (rowStyle) {
                                let objColumnData = columnsData[i];
                                let fieldName = typeof objColumnData === 'object' ? objColumnData.name : objColumnData;
                                // priority: columns_summary style, then columns_group_style, then the row-level lineFields.style
                                // (this same insertLineRow call also renders the final grand-total row, so it gets the same priority)
                                cellStyle = summaryColumnStyles[fieldName] || groupColumnStyles[fieldName] || rowStyle;
                            }
                            if (cellStyle) {
                                // clone the shared template style so the override isn't leaked onto other rows using the same style object
                                cellInfo.style = {...objStype[column + rowMau], ...cellStyle.style};
                                cellInfo.font = {...cellInfo.font, ...cellStyle.font};
                            } else {
                                cellInfo.style = objStype[column + rowMau];
                            }
                        }
                        setCellValue(currentSheet, columnsNames, columnsData, rowInsert, objDataLine);
                        rowInsert++;
                    };

                    const insertSummaryRow = (rows, groupField, groupValue) => {
                        let objSummaryLine = {};
                        if (groupField) {
                            objSummaryLine[groupField] = groupValue;
                        }
                        for (let objSummary of columnsSummary) {
                            objSummaryLine[objSummary.column] = calculateSummary(rows, objSummary.column, objSummary.summaryType);
                        }
                        insertLineRow(objSummaryLine, summaryRowStyle);
                    };

                    // listData must already be ordered by columnsGroup fields (outermost first) for the group breaks below to line up
                    if (columnsGroup && columnsGroup.length) {
                        let lengData = listData.length;
                        let levelStart = columnsGroup.map(() => 0);
                        let idx = 0;
                        while (idx < lengData) {
                            let end = idx + 1;
                            while (end < lengData && columnsGroup.every(field => listData[end][field] === listData[idx][field])) {
                                end++;
                            }
                            for (let i = idx; i < end; i++) {
                                insertLineRow(listData[i]);
                            }
                            // close the innermost group first, then cascade outward while each level also changes
                            for (let level = columnsGroup.length - 1; level >= 0; level--) {
                                let field = columnsGroup[level];
                                let levelChanged = end >= lengData || listData[end][field] !== listData[idx][field];
                                if (!levelChanged) {
                                    break;
                                }
                                if (columnsSummary && columnsSummary.length) {
                                    insertSummaryRow(listData.slice(levelStart[level], end), field, listData[idx][field]);
                                }
                                levelStart[level] = end;
                            }
                            idx = end;
                        }
                    } else {
                        for (let objDataLine of listData) {
                            insertLineRow(objDataLine);
                        }
                    }

                    if (columnsSummary && columnsSummary.length) {
                        let totalLabelField = columnsGroup && columnsGroup.length ? columnsGroup[0] : null;
                        insertSummaryRow(listData, totalLabelField, totalLabelField ? 'Tổng cộng' : null);
                    }
                }
            }
        }

        // maps each columns_summary entry's "style" ({style, font}) to the spreadsheet column letter
        // it belongs to, by matching its "column" field name against columns_data
        const getSummaryColumnStyles = (columnsSummary) => {
            let columnStyles = {};
            if (columnsSummary && columnsSummary.length) {
                for (let objSummary of columnsSummary) {
                    if (!objSummary.style) {
                        continue;
                    }
                    columnStyles[objSummary.column] = objSummary.style;
                }
            }
            return columnStyles;
        }

        const calculateSummary = (rows, field, summaryType) => {
            let values = rows.map(row => row[field]).filter(value => value !== null && value !== undefined && value !== '');
            switch (summaryType) {
                case 'count':
                    return values.length;
                case 'sum':
                    return values.reduce((total, value) => total + Number(value), 0);
                case 'max':
                    return values.length ? Math.max(...values.map(Number)) : null;
                case 'min':
                    return values.length ? Math.min(...values.map(Number)) : null;
                default:
                    return null;
            }
        }

        const setCellValue = (currentSheet, columnsNames, columnsData, rowNumber, objDataLine) => {
            for (let j = 0; j < columnsNames.length; j++) {
                let cellInfo = currentSheet.getCell(columnsNames[j] + rowNumber);
                let objColumnData = columnsData[j];
                let columnId = objColumnData;
                let tempValue = objDataLine[columnId] || null;
                if (typeof objColumnData === 'object') {
                    columnId = objColumnData.name;
                    tempValue = objDataLine[columnId] || null;
                    if (objColumnData.type === 'number' && tempValue) {
                        tempValue = Number(tempValue);
                    }
                }
                cellInfo.value = tempValue;
            }
        }

        const initDataHeaderSheet = (currentSheet, headerFields, params, dataConfig) => {
            let arrDataHeader = [];
            for (let key in headerFields) {
                let keysCell = headerFields[key];
                let values = params[keysCell];
                if (!values) {
                    let keyValueConfigs = keysCell.split('\.');
                    values = dataConfig;
                    for (let eKeyValueConfig of keyValueConfigs) {
                        values = values ? values[eKeyValueConfig] : null;
                        if (util.isArray(values)) {
                            values = values[0];
                        }
                    }
                }
                arrDataHeader.push({
                    addressCell: key,
                    keys: `{${keysCell}}`,
                    values: values
                });
            }
            libCsXLS.updMultiValueToCell(currentSheet, arrDataHeader);
        }

        const callToGetDatas = (objaParams, fnHandlePost, ...params) => {
            https.requestSuitelet.promise({
                scriptId: 'customscript_scv_sl_txn_report',
                deploymentId: 'customdeploy_scv_sl_txn_report',
                body: objaParams
            }).then(function (response) {
                if (fnHandlePost) {
                    fnHandlePost(response.body, objaParams, ...params);
                }
            }).catch(function onRejected(reason) {
                console.log('reason', reason)
                log.error('Invalid Get Request:', reason);
            });

        }

        const exportRawData = () => {
            window.onbeforeunload = null;
            libCs.showLoadingDialog(true);
            let currentRecord = ccr.get();
            let {objaParams, message} = getParams(currentRecord);
            if (message) {
                alert(message);
                libCs.showLoadingDialog(false);
            } else {
                callToGetDatas(objaParams, downloadRawData);
            }
        }

        const downloadRawData = (content) => {
            let blob = new Blob([content], {type: "text/plain;charset=utf-8"});
            let link = document.createElement("a");
            link.href = window.URL.createObjectURL(blob);
            link.download = "raw_data.txt";
            link.click();
            libCs.showLoadingDialog(false);
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            refresh,
            searchResult,
            exportResult,
            exportRawData
        };

    });
