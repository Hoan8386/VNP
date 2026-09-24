/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  10 Sep 2026         Khanh Tran              Init & create file. Chức năng đối chiếu dữ liệu hóa đơn from ms. Tâm(https://app.clickup.com/t/3773072/14yhnhmfdfv)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define([
    '../common/scv_common_bkdchd.js',
], (
    commonBkdchd,
) => {
    const pageInit = (scriptContext) => {
        let tabInstance = $('#tab_result_dxtab').dxTabs('instance');
        let onSelectionChanged = tabInstance.option('onSelectionChanged');

        tabInstance.option('onSelectionChanged', function(e) {
            onSelectionChanged(e);

            let selectedItem = e.component.option('selectedItem');
            _scvDx.getInstanceDx(selectedItem.id).updateDimensions();
        });
    };

    const searchResult = () => {
        let params = _scvForm.getParameter();
        if (!_scvForm.validateFieldMandatory([
            'custpage_subsidiary', 'custpage_from_date', 'custpage_to_date',
        ])) return;

        _scvForm.showLoadingDialog(true);

        let arrActionFunc = [
            { action: 'bkhdmv_01', params: { ...params }, data: [] },
            { action: 'bkdchd_02', params: { ...params }, data: [] },
        ];

        _scvForm.ajax.postAsyncMultiFetchSSPage(_scvForm.serviceScript.url, arrActionFunc, (arrResponse) => {
            let dataInput = {
                arrSS01: _scvForm.getResultActionPage(arrResponse, 'bkhdmv_01'),
                arrSS02: _scvForm.getResultActionPage(arrResponse, 'bkdchd_02'),
            };

            let objResult = commonBkdchd.getDataResult(params, dataInput);

            _scvDx.setDataSource('custpage_sl_netsuite', objResult.arrNetsuite);
            _scvDx.setDataSource('custpage_sl_import_smt', objResult.arrImportSmt);
            _scvDx.setDataSource('custpage_sl_reconcile', objResult.arrReconcile);
            _scvForm.showLoadingDialog(false);
        });
    };

    const exportResult = async () => {
        _scvForm.showLoadingDialog(true);
        try {
            let workbook = new ExcelJS.Workbook();
            let arrGrid = [
                { id: 'custpage_sl_netsuite', label: 'Netsuite' },
                { id: 'custpage_sl_import_smt', label: 'Import SMT' },
                { id: 'custpage_sl_reconcile', label: 'Reconcile' },
            ];

            for (let grid of arrGrid) {
                let arrResult = _scvDx.getDataSource(grid.id);
                let curSheet = workbook.addWorksheet(grid.label);

                let columns = commonBkdchd.getColumnsResult();
                let objHeader = _scvExcelJS.extendGridRenderColumn(curSheet, columns, 5);
                let arrColHeader = objHeader.arrColumnFlat;
                let idxRowData = 6;
                let col_end = objHeader.col_end;
                let rowTitle = curSheet.getRow(3);
                curSheet.mergeCells('A3:'+ `${rowTitle.getCell(col_end).address}`);
                Object.assign(curSheet.getCell(`A3`), {
                    value: `Bảng kê đối chiếu hóa đơn SMT - ${grid.label}`,
                    font: { bold: true, size: 14 },
                    alignment: { horizontal: 'center' }
                });

                for(let i = 0; i < arrResult.length; i++){
                    let objRes = arrResult[i];
                    let idxCurRow = i + idxRowData;
                    let dataRow = arrColHeader.map(obj => {
                        return objRes[obj.dataField];
                    });

                    curSheet.insertRow(idxCurRow, dataRow);
                    arrColHeader.forEach((obj, index) => {
                        if (obj.format) curSheet.getCell(idxCurRow, index + 1).numFmt = obj.format;
                    });
                }

                if (arrResult.length > 0) {
                    _scvExcelJS.createBorderWithRange(curSheet,
                        {row: idxRowData, col: 1},
                        {row: arrResult.length + idxRowData - 1, col: col_end},
                        "thin", {rowStyle: "dotted", colStyle: "thin"});
                }
            }

            await _scvExcelJS.saveWorkbook(workbook, "Bang_ke_doi_chieu_hoa_don_SMT.xlsx");
        }
        catch (err) {
            _scvForm.showMsgError(err.message);
        }
        finally {
            _scvForm.showLoadingDialog(false);
        }
    };

    return {
        pageInit,
        searchResult,
        exportResult,
    };
});
