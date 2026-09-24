/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/url', '../lib/scv_lib_cs.js', '../lib/scv_lib_cs_xls', '../lib/scv_lib_utils'],

    function (currentRecord, url, lcs, libCsXLS, libUtils) {

        function fieldChanged(scriptContext) {
        }

        function onSearchResult() {
            window.onbeforeunload = null;
            let currRecord = currentRecord.get();
            if (!currRecord.getValue('custpage_fromdate')) {
                alert('Please enter a value for "Trans From Date".');
                return;
            }
            if (!currRecord.getValue('custpage_todate')) {
                alert('Please enter a value for "Trans To Date".');
                return;
            }
            let subsidiary = currRecord.getValue('custpage_subsidiary');
            let budget_class = currRecord.getValue('custpage_budget_class');
            let custpage_show_detail = currRecord.getValue('custpage_show_detail');
            let subsidiaryParam = Array.isArray(subsidiary) ? subsidiary.join(',') : subsidiary || '';
            let budgetClassParam = Array.isArray(budget_class) ? budget_class.join(',') : budget_class || '';
            if (!subsidiaryParam) {
                alert('Please enter a value for "Subsidiary".');
                return;
            }
            let urlDC = url.resolveScript({
                scriptId: 'customscript_scv_sl_rp_plan_actual',
                deploymentId: 'customdeploy_scv_sl_rp_plan_actual',
                params: {
                    custpage_subsidiary: subsidiaryParam,
                    custpage_budget_class: budgetClassParam,
                    custpage_fromdate: currRecord.getText('custpage_fromdate'),
                    custpage_todate: currRecord.getText('custpage_todate'),
                    custpage_show_detail: custpage_show_detail ? 'T' : 'F',
                }
            });
            window.location.replace(`${urlDC}&isSearch=T`);
        }

        const URL_RQ = '/app/site/hosting/scriptlet.nl?script=customscript_scv_sl_rp_plan_actual&deploy=customdeploy_scv_sl_rp_plan_actual';

        function exportReport() {
            window.onbeforeunload = null;
            let currRecord = currentRecord.get();
            let subsidiary = currRecord.getValue('custpage_subsidiary');
            let budget_class = currRecord.getValue('custpage_budget_class');
            let budget_class_text = currRecord.getText('custpage_budget_class');
            let subsidiaryParam = Array.isArray(subsidiary) ? subsidiary.join(',') : subsidiary || '';
            let budgetClassParam = Array.isArray(budget_class) ? budget_class.join(',') : budget_class || '';
            console.log('budgetClassParam', budgetClassParam)
            let budgetClassTextParam = Array.isArray(budget_class_text) ? budget_class_text.join(',') : budget_class_text || '';
            let params = getParam(currRecord, subsidiaryParam, budgetClassParam);
            params.isSearch = 'T';
            params.isgetdata = 'T';
            lcs.showLoadingDialog(true);

            let resCallData = nlapiRequestURL(URL_RQ, params);
            let objDataCol = JSON.parse(resCallData.getBody());
            let objDataConfig = JSON.parse(nlapiRequestURL(URL_RQ, {
                action: 'getUrlTemplate',
                custpage_subsidiary: subsidiaryParam,
                custpage_budget_class: budgetClassParam,
                custpage_fromdate: currRecord.getText('custpage_fromdate'),
                custpage_todate: currRecord.getText('custpage_todate'),
                custpage_show_detail: currRecord.getValue('custpage_show_detail') ? 'T' : 'F'
            }).getBody());
            try {
                exportExcel(params, currRecord, objDataConfig, objDataCol, subsidiaryParam, budgetClassTextParam);
            } catch (error) {
                console.log("error", error)
                lcs.showLoadingDialog(false);
            }
            // lcs.showLoadingDialog(false);
        }

        const exportExcel = async (params, currRecord, objDataConfig, objDataCol, subsidiaryParam, budgetClassTextParam) => {
            const reportName = 'Plan and Actual Budget Detail';
            try {
                let workbook = await libCsXLS.loadWorkbookFromUrl(objDataConfig.urlTemplate);
                let mergedData = objDataCol.mergedData;
                let currentSheet = workbook.worksheets[0];
                currentSheet.name = libUtils.removeVietnameseTones('Sheet 1').slice(0, 31);
                let budget_class = budgetClassTextParam;
                let current_fromdate = currRecord.getText('custpage_fromdate');
                let current_todate = currRecord.getText('custpage_todate');
                let department, location, project, last_fromdate = "               ";
                updateReportStaticHeaders(currentSheet);
                let startRow = 14;
                let endRow = startRow + mergedData.length - 1;
                let endColumn = updateSheetValues(currentSheet, mergedData, startRow, current_fromdate, current_todate);
                applyBordersToSheetCells(currentSheet, endRow, endColumn);
                updateHeader(currentSheet, department, location, project, budget_class, current_fromdate, current_todate, last_fromdate);
                await libCsXLS.saveWorkbook(workbook, reportName + ".xlsx");
            } catch (error) {
                console.log("error", error);
            } finally {
                lcs.showLoadingDialog(false);
            }
        };

        // Excel column index (1-based) -> letter(s), e.g. 1 -> "A", 26 -> "Z", 27 -> "AA"
        function getColumnLetter(colIndex) {
            let letter = '';
            while (colIndex > 0) {
                let remainder = (colIndex - 1) % 26;
                letter = String.fromCharCode(65 + remainder) + letter;
                colIndex = Math.floor((colIndex - remainder - 1) / 26);
            }
            return letter;
        }

        const updateSheetValues = (_currSheet, result, startRow, fromdate, todate) => {
            const [fromDay, fromMonth, fromYear] = fromdate.split("/").map(Number);
            const [toDay, toMonth, toYear] = todate.split("/").map(Number);
            let startDate = new Date(fromYear, fromMonth - 1, fromDay);
            let endDate = new Date(toYear, toMonth - 1, toDay);

                let columnIndex = 6;
            let headerRow = 12;
            let subHeaderRow = 13;
            let currentDate = new Date(startDate);

            while (currentDate <= endDate) {
                const periodLabel = `Period (T${currentDate.getMonth() + 1}.${currentDate.getFullYear()})`;
                let startColumnChar = getColumnLetter(columnIndex);

                updateCellValue(_currSheet, `${startColumnChar}${headerRow}`, periodLabel);
                fnMergeCell(_currSheet, headerRow, columnIndex, headerRow, columnIndex + 3);
                const headerCell = _currSheet.getCell(`${startColumnChar}${headerRow}`);
                headerCell.alignment = {horizontal: "center", vertical: "middle"};
                headerCell.font = {bold: true};
                headerCell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: {argb: "B4C6E7"}
                };
                const subHeaders = ["Usage", "Commit", "Actual", "Remain"];
                for (let i = 0; i < subHeaders.length; i++) {
                    let colChar = getColumnLetter(columnIndex + i);
                    updateCellValue(_currSheet, `${colChar}${subHeaderRow}`, subHeaders[i]);
                    const subHeaderCell = _currSheet.getCell(`${colChar}${subHeaderRow}`);
                    subHeaderCell.alignment = {horizontal: "center", vertical: "middle"};
                    subHeaderCell.font = {bold: true};
                    subHeaderCell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: {argb: "B4C6E7"}
                    };
                }
                columnIndex += 4;
                currentDate.setMonth(currentDate.getMonth() + 1);
            }

            let dataStartRow = 14;
            result.forEach((dataItem, rowIndex) => {
                let row = dataStartRow + rowIndex;
                updateCellValue(_currSheet, `B${row}`, dataItem.budgetclass_chung || '');
                updateCellValue(_currSheet, `C${row}`, dataItem.document_number || '');
                updateCellValue(_currSheet, `D${row}`, dataItem.date || '');
                let currentDate = new Date(startDate);
                columnIndex = 6;
                while (currentDate <= endDate) {
                    const monthYear = `${currentDate.getMonth() + 1}_${currentDate.getFullYear()}`;
                    let usageCell = `${getColumnLetter(columnIndex)}${row}`;
                    let commitCell = `${getColumnLetter(columnIndex + 1)}${row}`;
                    let actualCell = `${getColumnLetter(columnIndex + 2)}${row}`;
                    let remainCell = `${getColumnLetter(columnIndex + 3)}${row}`;

                    updateCellValue(_currSheet, usageCell, dataItem[`usageamount_${monthYear}`] || '0');
                    updateCellValue(_currSheet, commitCell, dataItem[`commitamount_${monthYear}`] || '0');
                    updateCellValue(_currSheet, actualCell, dataItem[`actualamount_${monthYear}`] || '0');
                    updateCellValue(_currSheet, remainCell, dataItem[`remaining_${monthYear}`] || '0');

                    columnIndex += 4;
                    currentDate.setMonth(currentDate.getMonth() + 1);
                }

                // Xác định màu nền dựa trên lv1 hoặc lv2
                let fillColor = null;
                if (dataItem.lv1) {
                    fillColor = "e7e7e7";
                } else if (dataItem.lv2) {
                    fillColor = "ffffff";
                } else if (dataItem.lv3) {
                    fillColor = "e7e7e7";
                }
                if (fillColor) {
                    let colIndex = 2;
                    while (colIndex < columnIndex) {
                        let cell = _currSheet.getCell(`${getColumnLetter(colIndex)}${row}`);
                        cell.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: {argb: fillColor}
                        };
                        colIndex++;
                    }
                }
            });

            return columnIndex - 1;
        };

        const updateReportStaticHeaders = (_currSheet) => {
            updateCellValue(_currSheet, 'B12', 'Budget Class');
            updateCellValue(_currSheet, 'C12', 'Document No');
            updateCellValue(_currSheet, 'D13', 'Date');
            updateCellValue(_currSheet, 'E13', '');
        };

// Function to merge cells
        const fnMergeCell = (_curSheet, startRowIdx, startColumnIdx, endRowIdx, endColumnIdx) => {
            _curSheet.mergeCells(startRowIdx, startColumnIdx, endRowIdx, endColumnIdx);
        };


        function applyBordersToSheetCells(_currSheet, endRow, endColumn) {
            endColumn = endColumn || 17; // fallback: column Q
            for (let row = 12; row <= endRow; row++) {
                for (let col = 2; col <= endColumn; col++) {
                    let cellAddress = getColumnLetter(col) + row;
                    let cell = _currSheet.getCell(cellAddress);
                    cell.border = {
                        top: {style: 'thin', color: {argb: 'FF000000'}},
                        left: {style: 'thin', color: {argb: 'FF000000'}},
                        bottom: {style: 'thin', color: {argb: 'FF000000'}},
                        right: {style: 'thin', color: {argb: 'FF000000'}}
                    };
                }
            }
        }

        function updateHeader(_currSheet, department, location, project, budget_class, current_fromdate, current_todate, last_fromdate) {
            const cellData = [
                ['A1', '{subsidiary}', department],
                ['D4', '{department}', department],
                ['D5', '{location}', location],
                ['D6', '{project}', project],
                ['D7', '{budget_class}', budget_class],
                ['D8', '{current_fromdate}', current_fromdate],
                ['D8', '{current_todate}', current_todate],
                ['D9', '{last_fromdate}', last_fromdate]
            ];

            libCsXLS.fnUpdMultiValueToCell(
                _currSheet,
                cellData.map(([addressCell, keys, values]) => ({addressCell, keys, values}))
            );

        }


        function updateCellValue(sheet, cellAddress, value, startRow = 14) {
            let cell = sheet.getCell(cellAddress);
            cell.value = value;
            let column = cellAddress.charAt(0);
            switch (column) {
                case 'A':
                case 'D':
                case 'E':
                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: 'center',
                        wrapText: true
                    };
                    break;
                case 'B':
                case 'C':

                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: 'left',
                        wrapText: true
                    };
                    break;
                default:
                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: 'right',
                        wrapText: true
                    };
                    break;
            }
        }

        function getParam(currentRecord, subsidiaryParam, budgetClassParam) {
            return {
                custpage_subsidiary: subsidiaryParam,
                custpage_budget_class: budgetClassParam,
                custpage_fromdate: currentRecord.getText('custpage_fromdate'),
                custpage_todate: currentRecord.getText('custpage_todate'),
                // custpage_show_detail : currentRecord.getValue('custpage_show_detail'),
            }
        }

        return {
            fieldChanged: fieldChanged,
            onSearchResult: onSearchResult,
            exportReport: exportReport,

        };
    });
