/**
 * KeyWork:
 * + Trans:
 * =====================================================================================================================
 *  Date                Author                  Description
 *  05 Dec 2024         Khanh Tran              Init & create file, from Ms. Tâm(https://app.clickup.com/t/86d44j8ct)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define(['N/currentRecord', 'N/search', 'N/runtime',

    '../lib/scv_lib_function.js',
    '../lib/scv_lib_cs_xls.js',

    '../cons/scv_cons_format.js',
], 
function (crr, search, runtime,

    lbf,
    libCsXLS,

    constFormat,
) {
    const CUR_SCRIPT = {
        ID: 'customscript_scv_sl_rpt_sct_taisan',
        DEPLOYID_UI: 'customdeploy_scv_sl_rpt_sct_taisan',
        DEPLOYID_DATA: 'customdeploy_scv_sl_rpt_sct_taisan_data'
    }
    const URL_DATA = "/app/site/hosting/scriptlet.nl?script=" + CUR_SCRIPT.ID + "&deploy=" + CUR_SCRIPT.DEPLOYID_DATA;
    const TRAN_TYPE = {
        NGUYEN_GIA_TANG: 'NG.T',
        NGUYEN_GIA_GIAM: 'NG.G',
        KHAU_HAO_TANG: 'KH.T',
        KHAU_HAO_GIAM: 'KH.G',
    }
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
    * @since 2015.2
     */
    function pageInit(scriptContext) {

    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
      */
    function fieldChanged(scriptContext) {

    }

    const onSearchResult = async(isExport) => {
        let isValid = _scvForm.validateFieldMandatory(['custpage_subsidiary', 'custpage_fromdt', 'custpage_todt']);
        if(!isValid) return;

        _scvForm.showLoadingDialog(true);
        let params = _scvForm.getParameter();
        let objResErr = {isError: false, msg: []};
        let arrActionFunc = [
            {action: 'getDataSS_btkhTaiSan', params: {...params}, data: []},
            {action: 'getDataSS_btkhDauKy', params: {...params}, data: []},
        ];

        libCsXLS.asyncPostMultiRequestFetchSSPageByAjax(URL_DATA, arrActionFunc, async function (res){
            try {
                let arrResult = [];

                if (objResErr.isError) {
                    objResErr.msg.forEach(msg => _scvForm.showMsgError(msg));
                }
                else {
                    arrResult = getDataResultMapped(params, res);
                }

                _scvDx.setDataSource('grdData', arrResult);
                if (isExport == "T") {
                    await onExportExcel(arrResult, params);
                }

                _scvForm.showLoadingDialog(false);
            } catch (error) {
                _scvForm.showLoadingDialog(false)
                alert(error.toString())
            }
        },function(res, paramsCallback){
            
        },function(request, status, error, paramsCallback){
            objResErr.isError = true;
            objResErr.msg.push(`${paramsCallback.action} (page ${paramsCallback.page||0}): ` + (error.message||status))
            console.log(error)
        });
    }

    const getDataResultMapped = (params, arrActionFunc) => {
        let arr_btkhTaiSan = [], arr_btkhDauKy = [], arrMapping = [], result = [];
        let objTotal = {ten_ts: 'TỔNG CỘNG ', rowPreparedData: {style: {fontWeight: "bold"}, lvl: 1}};
        let fromDate = constFormat.parseDate(params.custpage_fromdt);
        arrActionFunc.forEach(obj => {
            if(obj.action == 'getDataSS_btkhTaiSan'){
                arr_btkhTaiSan = [...arr_btkhTaiSan, ...obj.data.arrResult]
            }
            else if(obj.action == 'getDataSS_btkhDauKy'){
                arr_btkhDauKy = [...arr_btkhDauKy, ...obj.data.arrResult]
            }
        });

        arr_btkhTaiSan.forEach(obj => {
            obj.date_format = constFormat.parseDate(obj.date);
        })

        let arrAssetID = lbf.onGroupByArray(arr_btkhTaiSan, ['asset_id']);
        arrAssetID.forEach(obj => {
            let arr_btkhTaiSan_ft = arr_btkhTaiSan.filter( e => e.asset_id == obj.asset_id);
            let arr_btkhTaiSan_beforeDate = arr_btkhTaiSan_ft.filter(e => e.date_format < fromDate);
            let arr_btkhTaiSan_afterOrEqualDate = arr_btkhTaiSan_ft.filter(e => e.date_format >= fromDate);
            let arr_btkhDauKy_ft = arr_btkhDauKy.filter(e => e.asset_id == obj.asset_id);
            let objAsset = arr_btkhTaiSan_ft[0];
            let objRes = {};
            objRes.asset_id = objAsset.asset_id;
            objRes.ma_ts = objAsset.asset_id;
            objRes.ma_bfo = objAsset.ma_bfo;
            objRes.ten_ts = objAsset.ten_ts;
            objRes.pbql = objAsset.pbql;
            objRes.tgsd = objAsset.tgsd;
            objRes.nkt_khpb = objAsset.nkt_khpb;
            objRes.asset_account = objAsset.asset_account;
            objRes.depreciation_account = objAsset.depreciation_account;
            objRes.charge_account = objAsset.charge_account;
            objRes.category_group = objAsset.category_group;
            objRes.ng_sdk = 0;
            objRes.ng_t = 0;
            objRes.ng_g = 0;
            objRes.ng_sck = 0;
            objRes.kh_sdk = 0;
            objRes.kh_t = 0;
            objRes.kh_g = 0;
            objRes.kh_sck = 0;

            arr_btkhTaiSan_afterOrEqualDate.forEach(e => {
                if(e.tran_type == TRAN_TYPE.NGUYEN_GIA_TANG){
                    objRes.ng_t += e.transaction_amount;
                }
                else if(e.tran_type == TRAN_TYPE.NGUYEN_GIA_GIAM){
                    objRes.ng_g += e.transaction_amount;
                }
                else if(e.tran_type == TRAN_TYPE.KHAU_HAO_TANG){
                    objRes.kh_t += e.transaction_amount;
                }
                else if(e.tran_type == TRAN_TYPE.KHAU_HAO_GIAM){
                    objRes.kh_g += e.transaction_amount;
                }
            });

            arr_btkhTaiSan_beforeDate.forEach(e => {
                if(e.tran_type == TRAN_TYPE.NGUYEN_GIA_TANG){
                    objRes.ng_sdk += e.transaction_amount;
                } else if(e.tran_type == TRAN_TYPE.NGUYEN_GIA_GIAM){
                    objRes.ng_sdk -= e.transaction_amount;
                }
            })

            arr_btkhDauKy_ft.forEach(e => {
                objRes.kh_sdk += e.transaction_amount;
            });

            objRes.ng_sck = objRes.ng_sdk + objRes.ng_t - objRes.ng_g;
            objRes.kh_sck = objRes.kh_sdk + objRes.kh_t - objRes.kh_g;

            arrMapping.push(objRes);

            addAmountsToTotal(objTotal, objRes);
        })

        if (params.custpage_groupby) {
            let keyGrp = params.custpage_groupby;
            let arrGrp = lbf.onGroupByArray(arrMapping, [keyGrp]);

            arrGrp.sort((a, b) => a[keyGrp].localeCompare(b[keyGrp]));

            arrGrp.forEach((obj) => {
                let objGrp = {ten_ts: 'Tổng theo ' + params.custpage_groupby_display + ': ' + obj[keyGrp], rowPreparedData: {style: {fontWeight: "bold", color : "#366092"}}, lvl: 2};
                let arrDetail = arrMapping.filter(e => e[keyGrp] == obj[keyGrp]);
                arrDetail.forEach((objDetail, i) => {
                    objDetail.stt = i + 1;

                    result.push(objDetail);

                    addAmountsToTotal(objGrp, objDetail);
                })

                result.push(objGrp);
            })
        }
        else {
            result = arrMapping;
            result.forEach((obj, i) => obj.stt = i + 1)
        }

        return [...result, objTotal];
    }

    const addAmountsToTotal = (obj, objSrc) => {
        ['ng_sdk', 'ng_t', 'ng_g', 'ng_sck', 'kh_sdk', 'kh_t', 'kh_g', 'kh_sck'].forEach(key => {
            if(!(key in obj)) obj[key] = 0;
            obj[key] += objSrc[key] || 0;
        })
    }

    const onExportExcel = async (arrResult, params) => {
        let curUser = runtime.getCurrentUser();
        let lkBuCenter = search.lookupFields({
            type: 'employee',
            id: curUser.id,
            columns: ['cseg_scv_bu_center.custrecord_scv_bu_legal_name', 'cseg_scv_bu_center.custrecord_scv_bu_addr', 
                'cseg_scv_bu_center.custrecord_scv_bu_logo', 'cseg_scv_bu_center.custrecord_scv_bu_logosize']
        });

        let workbook = new ExcelJS.Workbook();
        let curSheet = workbook.addWorksheet('Sheet1');
        curSheet.pageSetup = {
            orientation: 'landscape',  
            scale: 47,   
        };
        let idxRowTitle = 4;
        let idxRowSubHeader = 7;
        let idxRowHeader = 8;
        let idxRowData = 9;
        let objHeader = renderHeaderExport(curSheet, idxRowSubHeader, idxRowHeader);
        let col_end = objHeader.col_end;
        curSheet.mergeCells('A4:'+ `${curSheet.getRow(idxRowTitle).getCell(col_end).address}`);
        curSheet.mergeCells('A5:'+ `${curSheet.getRow(idxRowTitle + 1).getCell(col_end).address}`);

        let C1 = curSheet.getCell('C1');
        C1.font = { size: 14, bold: true };

        let A4 = curSheet.getCell('A4');
        A4.font = { size: 16, bold: true };
        A4.alignment = { horizontal: 'center', vertical: 'middle' };

        let A5 = curSheet.getCell('A5');
        A5.font = { size: 14, bold: true };
        A5.alignment = { horizontal: 'center', vertical: 'middle' };

        let N10 = curSheet.getCell('N10');
        N10.font = { size: 14, italic: true };

        ['P1', 'P2', 'P3'].forEach(cellRef => {
            let cell = curSheet.getCell(cellRef);
            cell.font = { size: 14};
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
        });

        ['B11', 'N11'].forEach(cellRef => {
            let cell = curSheet.getCell(cellRef);
            cell.font = { size: 14, bold: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        ['B12', 'N12'].forEach(cellRef => {
            let cell = curSheet.getCell(cellRef);
            cell.font = { size: 14, italic: true };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });

        let objImg = {urlLogo: lkBuCenter['cseg_scv_bu_center.custrecord_scv_bu_logo']?.[0]?.text, 
            logoSize: lkBuCenter['cseg_scv_bu_center.custrecord_scv_bu_logosize']};
        if(objImg.urlLogo) {
            let base64 = await libCsXLS.getBlobFileUrl(objImg.urlLogo);
            libCsXLS.createImageWithBase64(workbook, curSheet, { base64: base64, col: 0.255, row: 0, width: 60, logoSize: objImg.logoSize });
        }
        
        let today = new Date();
        let day = String(today.getDate()).padStart(2, '0');
        let month = String(today.getMonth() + 1).padStart(2, '0');
        let year = today.getFullYear();
        replaceValueColumn(curSheet, {
            'P1': {'all': 'Mã Số: AM1002R'},
            'P2': {'all': 'Lần BH:01'},
            'P3': {'all': 'Ngày BH: 25/06/2010'},
            'C1': {'all': 'Công ty Cổ phần Dược Phẩm Trung Ương CPC1'},
            'A4': {'all': 'SỔ CHI TIẾT TÀI SẢN CỐ ĐỊNH'},
            'A5': {'all': `Từ Ngày: ${params.custpage_fromdt} Đến Ngày: ${params.custpage_todt}`},
            'N10': {'all': `Ngày ${day} tháng ${month} năm ${year}`},
            'B11': {'all': `Người Lập Biểu`},
            'N11': {'all': `Kế toán trưởng`},
            'B12': {'all': `(Ký, Họ tên)`},
            'N12': {'all': `(Ký, Họ tên)`},
        });
        for(let i = 0; i < arrResult.length; i++){
            let objRes = arrResult[i];
            let idxCurRow = i + idxRowData;
            let dataRow = getValueRow(objRes, objHeader.arrColHeader);
            curSheet.insertRow(idxCurRow, dataRow);
            objHeader.arrColNumFmt.forEach(e=>{
                curSheet.getCell(idxCurRow, e.idxCol).numFmt = e.numFmt;
            })

            libCsXLS.syncStyleRangeWithRowGrid(curSheet, {row: idxCurRow, col: 1}, {row: idxCurRow, col: col_end}, objRes);
        }

        libCsXLS.createBorderWithRange(curSheet, 
            {row: idxRowData, col: 1}, 
            {row: arrResult.length + idxRowData - 1, col: col_end},
            "thin", {rowStyle: "dotted", colStyle: "thin"});

        await libCsXLS.saveWorkbook(workbook, 'Số chi tiết tài sản cố định' + ".xlsx");
    }

    const getValueRow = (objData, arrHeader) => {
        let arrResult = [];
        arrHeader.forEach(obj => {
            let val = objData[obj.dataField] || '';
            if(obj.dataType == 'number'){
                val = val * 1;
            }
            arrResult.push(val)
        })
        return arrResult;
    }

    const renderHeaderExport = (curSheet, idxRowSubHeader, idxRowHeader) => {
        let grdData = _scvDx.getInstanceDx('grdData');
        let columns = grdData.getVisibleColumns();
        let numFmtVnd = constFormat.getMaskFormatVndXls();
        let arrColNumFmt = [];
        let arrColHeader = columns.map(function(column, idx) {
            if(column.dataType == "number"){
                arrColNumFmt.push({idxCol: idx + 1, numFmt: numFmtVnd})
            }
            
            return {
                dataField: column.dataField,
                caption: column.caption,
                dataType: column.dataType,
                width: column.width / 8
            }
        });
        
        let col_end = arrColHeader.length;
        curSheet.mergeCells(idxRowSubHeader, 9, idxRowSubHeader, 12);
        curSheet.mergeCells(idxRowSubHeader, 13, idxRowSubHeader, 16);
        for(let col = 1; col <= col_end; col++){
            if(col < 9){
                curSheet.mergeCells(idxRowSubHeader, col, idxRowHeader, col);
            }
        }

        let rowSubHeader = curSheet.getRow(idxRowSubHeader);
        let rowHeader = curSheet.getRow(idxRowHeader);
        rowHeader.height = 60;
        let objCellReplace = {};
        [rowSubHeader, rowHeader].forEach(row => {
            for (let colNumber = 1; colNumber <= col_end; colNumber++) {
                let cell = row.getCell(colNumber);
                if(row._number == idxRowHeader){
                    objCellReplace[cell._address] = {'all': arrColHeader[colNumber - 1].caption};
                    curSheet.getColumn(colNumber).width = arrColHeader[colNumber - 1].width;
                }

                cell.font = {
                    bold: true,
                };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFFFFFFF' }
                };
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = {
                    horizontal: 'center',
                    vertical: 'middle',
                    wrapText: true
                };
            }
        });

        replaceValueColumn(curSheet, {
            'J7': {'all': `Nguyên giá`},
            'N7': {'all': `Giá trị hao mòn`},
        });
        replaceValueColumn(curSheet, objCellReplace);

        return {
            arrColHeader: arrColHeader,
            arrColNumFmt: arrColNumFmt,
            col_end: col_end
        };
    }

    const replaceValueColumn = (curSheet, objCellReplace) => {
        for(let cellRef in objCellReplace){
            let cell = curSheet.getCell(cellRef);
            if(cell){
                let objData = objCellReplace[cellRef];
                for(let key in objData) {
                    let val = objData[key] || '';
                    if(key == 'all') cell.value = val;
                    else cell.value = cell.value.replaceAll(`{${key}}`, val);
                }
            }
        }
    }

    return {
        fieldChanged,
        pageInit,
        onSearchResult,
    };

});
