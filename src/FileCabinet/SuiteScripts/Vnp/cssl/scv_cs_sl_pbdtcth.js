/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  14 Aug 2026         Thanh Hoan              Init, create file. Chức năng phân bổ doanh thu chưa thực hiên from ms. Tâm(https://app.clickup.com/t/3773072/86d40yedc)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define([  'N/runtime',
    '../common/scv_common_pbdtcth.js',
], (
    runtime,
    commonPbdtcth,
) => {
    function pageInit(scriptContext) {

    }

    const exportResult = async ()=>{
        searchResult("T");
    }

    const searchResult = async (_isExport = "F") => {
        let isValidate = _scvForm.validateFieldMandatory(["custpage_subsidiary", "custpage_date"]);
        if (!isValidate) return;

        _scvForm.showLoadingDialog(true);

        let params = _scvForm.getParameter(); 

        let arrActionFunc = [
            { action: "getDataSource", params: { ...params } },
            { action: "getDateLoanInfor", params: { ...params } },
        ];


        _scvForm.ajax.postAsyncMultiFetchSSPage(_scvForm.serviceScript.url, arrActionFunc, function (arrResponse) {
                let arrSS1 = _scvForm.getResultActionPage(arrResponse, "getDataSource");
                let arrSS2 = _scvForm.getResultActionPage(arrResponse, "getDateLoanInfor");

                if(_isExport == "T"){
                    let currentUser = runtime.getCurrentUser();
                    let currentUserId = currentUser.id;
                    let objectResult = commonPbdtcth.getDataExport(arrSS1,arrSS2 ,params , currentUserId );
                    // console.log("check objectResult" ,objectResult);
                    onExportResultData(objectResult);
                }
                else{
                    _scvDx.setDataSource("custpage_sl_result", arrSS1);
                }
                _scvForm.showLoadingDialog(false);
        });
    };


    const onExportResultData = async (objectResult) => {
        let params = _scvForm.getParameter();
        let objHeader = objectResult.objHeader;
        let arrResult = objectResult.arrResult;
        let objTmpl = _scvForm.ajax.post(_scvForm.serviceScript.url, {
            ...params,
            action: "getTemplateExcel",
        }).data;
        let workbook = await _scvExcelJS.loadWorkbookFromUrl(objTmpl.url);
        let curSheet = workbook.worksheets[0];

        _scvExcelJS.replaceKey(curSheet, ['{pLegalname}'], [objHeader.companyName || ""]);
        _scvExcelJS.replaceKey(curSheet, ['{pDate}'], [objHeader.month || ""]);
        _scvExcelJS.replaceKey(curSheet, ['{pNguoiLap}'], [objHeader.createdBy || ""]);
        _scvExcelJS.replaceKey(curSheet, ['{pKeToan}'], [objHeader.chiefAccountant || ""]);

        let idxRowDetailStart = 8, idxRowDetailEnd = 8;
        let idxColDetailEnd = 13;

        let numFmt_prec0 = "###,###0";

        let tongLoanAmount = 0;
        let tongAmount = 0;
        let tongTienLaiPhanBo = 0;

        for(let i = 0; i < arrResult.length; i++){
            let objRes = arrResult[i];

            tongLoanAmount += objRes.loanAmount * 1;
            tongAmount += objRes.amount * 1;
            tongTienLaiPhanBo += objRes.tienLaiPhanBo * 1;

            curSheet.insertRow(idxRowDetailEnd, [
                i + 1,
                objRes.bankName,
                objRes.loanAmount * 1,
                objRes.startDate,
                objRes.term,
                objRes.interestRate,
                objRes.endDate,
                objRes.soNgayGui,
                objRes.amount * 1,
                objRes.ngayBatDauTinhLai,
                objRes.ngayTinhLai,
                objRes.soNgayTinhLai,
                objRes.tienLaiPhanBo * 1,
            ], "o+");
            idxRowDetailEnd++;
        }

        if(arrResult.length > 0){
            idxRowDetailEnd -= 1;
        }

        let idxRowTotal = idxRowDetailEnd + 1;

        curSheet.insertRow(idxRowTotal, [
            "",
            "Tổng cộng",
            tongLoanAmount,
            "",
            "",
            "",
            "",
            "",
            tongAmount,
            "",
            "",
            "",
            tongTienLaiPhanBo,
        ], "o+");

        _scvExcelJS.createFontsWithRange(
            curSheet,
            {row: idxRowTotal, col: 1},
            {row: idxRowTotal, col: 13},
            {bold: true}
        );

        _scvExcelJS.createNumFmtWithRange(
            curSheet,
            {row: idxRowDetailStart, col: 3},
            {row: idxRowDetailEnd + 1, col: 3},
            numFmt_prec0
        );

        _scvExcelJS.createNumFmtWithRange(
            curSheet,
            {row: idxRowDetailStart, col: 9},
            {row: idxRowDetailEnd + 1, col: 9},
            numFmt_prec0
        );

        _scvExcelJS.createNumFmtWithRange(
            curSheet,
            {row: idxRowDetailStart, col: 13},
            {row: idxRowDetailEnd + 1, col: 13},
            numFmt_prec0
        );

        _scvExcelJS.createBorderWithRange(
            curSheet,
            {row: idxRowDetailStart, col: 1},
            {row: idxRowTotal, col: idxColDetailEnd},
            "thin",
            {rowStyle: "thin", colStyle: "thin"}
        );

        _scvExcelJS.saveWorkbook(workbook, objTmpl.name + ".xlsx");
    };


    return {
        pageInit,
        searchResult,
        exportResult
    };
});
