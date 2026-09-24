/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  11 Sep 2025         Huy Pham			    Init, create file, Hỗ trợ file import quá lớn
 */

onmessage = async function(e) {
    let inputData = e.data;

    let libWebWorker = inputData.webWorker || {};
    
    importScripts(libWebWorker.excelJS, libWebWorker.moment);
    
    let params = inputData.params || {};
    let importFile = inputData.importFile || null;
    let arrFieldTemplate = inputData.arrFieldTemplate || [];
    
    let wb = new ExcelJS.Workbook();
    let reader = new FileReader()
    reader.readAsArrayBuffer(importFile);
    reader.onload = () => {
        wb.xlsx.load(reader.result).then(async workbook => {
            loadDataWithWorkBook(workbook, arrFieldTemplate, params)
        })
    }
};

const loadDataWithWorkBook = async (_workbook, arrFieldTemplate, _params) =>{
    let arrFieldMapping = [];
    
    let worksheet = _workbook.worksheets.find(e => e.name.trim().toLowerCase() == "data_import");
    if(!worksheet){
        worksheet = _workbook.worksheets[0];
    }
    
    let arrColumn = [], arrResult = [], arrResultUpload = [];
    
    for(let idxCol = 1; idxCol <= worksheet.columnCount; idxCol++){
        let colXls = worksheet.getColumn(idxCol);
        let fieldLabelOrg = worksheet.getCell(1, idxCol).value;
        if(!fieldLabelOrg) continue;
        
        if(typeof(fieldLabelOrg) == "object"){
            //case title is hyperlink
            fieldLabelOrg = fieldLabelOrg.text||fieldLabelOrg.hyperlink;
        }
        let fieldLabel = fieldLabelOrg.toString().toLowerCase().trim();
        let objFieldTemplate_find = arrFieldTemplate.find(e => e.isMapped != "T" 
            && (e.id.toLowerCase() == fieldLabel || e.label.toLowerCase().includes(fieldLabel))
        );
        if(!!objFieldTemplate_find){
            objFieldTemplate_find.isMapped = "T";
            let objFieldMapping = {...objFieldTemplate_find};
            objFieldMapping.dataField = objFieldTemplate_find.id;
            objFieldMapping.idxColExcel = idxCol;
            objFieldMapping.letterColExcel = colXls.letter;
            objFieldMapping.labelColExcel = fieldLabelOrg;
            arrFieldMapping.push(objFieldMapping);
            
            arrColumn.push({dataField: objFieldTemplate_find.id, caption: fieldLabelOrg, dataType: "string", width: 150, idxColExcel: idxCol, letterColExcel: colXls.letter});
        }
        else{
            arrFieldMapping.push({
                id: "",
                label: "",
                sublistId: "",
                fieldId: "",
                dataField: "",
                idxColExcel: idxCol,
                letterColExcel: colXls.letter,
                labelColExcel: fieldLabelOrg,
                isMapped: "F"
            });
        }
    }
    
    for(let idxRow = 2; idxRow <= worksheet.rowCount; idxRow++){
        let objRes = {};
        let objResUpload = {};

        postMessage({
            isCompleted: false,
            msg: `Row: ${idxRow}/${worksheet.rowCount}`
        });
        
        let isRowHasData = false;
        for(let idxCol = 0; idxCol < arrFieldMapping.length; idxCol++){
            let curCell = worksheet.getCell(idxRow, arrFieldMapping[idxCol].idxColExcel);
            let numFmt = curCell.numFmt;
            let val_col = curCell.value??"";
            let value_result = "";
            if(typeof(val_col) == "object"){
                if(val_col instanceof Date){
                    value_result = moment(val_col).format(_params.moment_formatdate || "DD/MM/YYYY");
                }
                else{
                    value_result = val_col.result||val_col.sharedFormula;
                }
            }
            else{
                value_result = val_col;
            }
            if(!!numFmt && !!value_result && !isNaN(value_result)){
                let precision = (numFmt.toString().replaceAll("%","").split(".")?.[1]?.length || 0) * 1;
                value_result = Math.round(value_result * Math.pow(10, precision)) / Math.pow(10, precision);
            }
            if(!!arrFieldMapping[idxCol].dataField){
                objRes[arrFieldMapping[idxCol].dataField] = value_result;
            }
            
            objResUpload[arrFieldMapping[idxCol].letterColExcel] = value_result;

            if(!isRowHasData && !!value_result && value_result.toString().trim() != ""){
                isRowHasData = true;
            }
        }
        if(!isRowHasData) continue;
        
        arrResult.push(objRes);
        
        arrResultUpload.push(objResUpload);
    }

    postMessage({
        isCompleted: true,
        arrFieldMapping: arrFieldMapping,
        arrResultUpload: arrResultUpload,
        arrResult: arrResult,
        arrColumn: arrColumn,
    });
}