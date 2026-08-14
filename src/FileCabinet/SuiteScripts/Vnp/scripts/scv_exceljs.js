/**
 * Nội dung: 
 * + File này sử dụng trong client script
 * + File này có sử dụng trong WebWorker nên các thư viện mặc định của NS không khả dụng(Ví dụ: NS, nlapi, util, jQuery,...)
 * Version: 1.251205.13
 * =======================================================================================
 *  Date                Author                  Description
 *  04 Jun 2025         Huy Pham                Init & create file
 */
const _scvExcelJS = {
    initClient: function() {
        if(!NS.form.isInited()){
            setTimeout(() => {this.initClient()}, 100);
            return;
        }
    },
    isContainValue: function (value) {
		var isContain = false;
		if(value != undefined && value != null && value !== '') {
			if(value.constructor === Array) {
				if(value.length > 0) {
					isContain = true;
				}
			} else {
				isContain = true;
			}
		}
		return isContain;
	},
    loadWorkbookFromUrl: async function(_urlFile) {
		let workbook = null;

		await fetch(_urlFile).then(res => res.blob()).then(async blob => {
			let buf = await blob.arrayBuffer(); 
			workbook = new ExcelJS.Workbook(); 
			await workbook.xlsx.load(buf);
		});

		return workbook;
	},
    saveWorkbook: async function(_workbook, _name) {
		_workbook.xlsx.writeBuffer().then(function(buffer) {
			saveAs(new Blob([buffer]), _name);
		});
	},
    syncRangeMergeAfterInsertRow: function (_ws, _rowStartInsert, _numLineInserted){
		let arrRangeMerge = _ws.model.merges;
		let arrRangeMergeFinal = [];
		for(let i = 0; i < arrRangeMerge.length; i++){
			let address_range = arrRangeMerge[i];
			let address_cell_start = this.getPositionCell(_ws, address_range.split(":")[0]);
			let address_cell_end = this.getPositionCell(_ws, address_range.split(":")[1]);
			
			if(address_cell_start.row >= _rowStartInsert){
				_ws.unMergeCells(address_range);

				arrRangeMergeFinal.push({
					row_start: address_cell_start.row + _numLineInserted,
					col_start: address_cell_start.col,
					row_end: address_cell_end.row + _numLineInserted,
					col_end: address_cell_end.col
				})
				
			} 
		}
		
		for(let i = 0; i < arrRangeMergeFinal.length; i++){
			let objRangeMerge = arrRangeMergeFinal[i];
			_ws.mergeCells(objRangeMerge.row_start, objRangeMerge.col_start, objRangeMerge.row_end, objRangeMerge.col_end);
		}
	},
    insertColumn: function (_ws, _colStartInsert, _numColInserted) {
		let arrRangeMerge = _ws.model.merges;
		let arrRangeMergeFinal = [];
		for(let i = 0; i < arrRangeMerge.length; i++){
			let address_range = arrRangeMerge[i];
			let address_cell_start = this.getPositionCell(_ws, address_range.split(":")[0]);
			let address_cell_end = this.getPositionCell(_ws, address_range.split(":")[1]);
			
			let isUnMergeCell = false;
			if(address_cell_start.col >= _colStartInsert){
				isUnMergeCell = true;
				arrRangeMergeFinal.push({
					row_start: address_cell_start.row,
					col_start: address_cell_start.col + _numColInserted,
					row_end: address_cell_end.row,
					col_end: address_cell_end.col + _numColInserted,
					old_address: address_cell_start
				})
			}
			else if(address_cell_start.col <= _colStartInsert && address_cell_end.col >= _colStartInsert){
				isUnMergeCell = true;
				arrRangeMergeFinal.push({
					row_start: address_cell_start.row,
					col_start: address_cell_start.col,
					row_end: address_cell_end.row,
					col_end: address_cell_end.col + _numColInserted,
					old_address: address_cell_start
				})
			}

			if(isUnMergeCell){
				_ws.unMergeCells(address_range);
				let cellAddressOrg = {row: address_cell_start.row, col: address_cell_start.col};

				for(let idxRow = cellAddressOrg.row; idxRow <= address_cell_end.row; idxRow++){

					for(let idxCol = cellAddressOrg.col; idxCol <= address_cell_end.col; idxCol++){

						if(cellAddressOrg.row == idxRow && cellAddressOrg.col == idxCol){
							continue;
						}
						this.copyStyleCellToCell(_ws, cellAddressOrg, {row: idxRow, col: idxCol});
					}
				}
			}
		}

		let rowCount = _ws.rowCount;
		let colCount = _ws.columnCount;
		
		for(let idxCol = colCount; idxCol >= _colStartInsert; idxCol--){
			let oldColumn = _ws.getColumn(idxCol);
			let newColumn = _ws.getColumn(idxCol + _numColInserted);

			newColumn.width = oldColumn.width;

			for(let idxRow = 1; idxRow <= rowCount; idxRow++){
				this.copyStyleCellToCell(_ws, {row: idxRow, col: idxCol}, {row: idxRow, col: idxCol + _numColInserted});
				
				let oldCell = _ws.getCell(idxRow, idxCol);
				let newCell = _ws.getCell(idxRow, idxCol + _numColInserted);
	
				newCell.value = oldCell.value;
			
				oldCell.value = null;
			}
			
		}
		
		for(let i = 0; i < arrRangeMergeFinal.length; i++){
			let objRangeMerge = arrRangeMergeFinal[i];
			_ws.mergeCells(objRangeMerge.row_start, objRangeMerge.col_start, objRangeMerge.row_end, objRangeMerge.col_end);
		}
	},
    getPositionCell: function (_ws, _pos) {
		let objPos = {row: 1, col: 1, address: "A1"};

		if(typeof _pos == "string"){
			objPos.address = _pos.toUpperCase();

			let cell_start = _ws.getCell(objPos.address);

			objPos.row = cell_start.row;
			objPos.col = cell_start.col;
		}
		else if(typeof _pos == "object"){
			objPos.row = _pos.row||1;
			objPos.col = _pos.col||1;

			let cell_start = _ws.getCell(objPos.row, objPos.col);

			objPos.address = cell_start._address;
		}

		return objPos;
	},
	copyStyleCellToCells: function (_ws, _posCellCopy, _arrPosCellPast) {
		for(let i = 0; i < _arrPosCellPast.length; i++){
            this.copyStyleCellToCell(_ws, _posCellCopy, _arrPosCellPast[i]);
        }
	},
    copyStyleCellToCell: function (_ws, _posCellCopy, _posCellPast) {
        let posCellCopy = this.getPositionCell(_ws, _posCellCopy);
        let posCellPast = this.getPositionCell(_ws, _posCellPast);

        let cellCopy = _ws.getCell(posCellCopy.address);
        let cellPast = _ws.getCell(posCellPast.address);

        if(cellCopy.numFmt !== undefined){
            cellPast.numFmt = cellCopy.numFmt
        }
        if(cellCopy.font !== undefined){
            cellPast.font = {...cellCopy.font}
        }
        if(cellCopy.alignment !== undefined){
            cellPast.alignment = {...cellCopy.alignment}
        }
        if(cellCopy.border !== undefined){
            cellPast.border = {...cellCopy.border}
        }
        if(cellCopy.fill !== undefined){
            cellPast.fill = {...cellCopy.fill}
        }
    },
	copyStyleRowToRows: function (_ws, _rowNumCopy, _arrRowNumPast) {
        for(let i = 0; i < _arrRowNumPast.length; i++){
            this.copyStyleRowToRow(_ws, _rowNumCopy, _arrRowNumPast[i]);
        }
    },
    copyStyleRowToRow: function (_ws, _rowNumCopy, _rowNumPast) {
        let rowCopy = _ws.getRow(_rowNumCopy);
        let rowPast = _ws.getRow(_rowNumPast);

        let cellCount = rowCopy.cellCount < rowPast.cellCount ? rowPast.cellCount : rowCopy.cellCount;
        for(let i = 1; i <= cellCount; i++){
            rowPast.getCell(i).numFmt = rowCopy.getCell(i).numFmt;
        }

        if(rowCopy.font !== undefined){
            rowPast.font = {...rowCopy.font}
        }
        if(rowCopy.alignment !== undefined){
            rowPast.alignment = {...rowCopy.alignment}
        }
        if(rowCopy.border !== undefined){
            rowPast.border = {...rowCopy.border}
        }
        if(rowCopy.fill !== undefined){
            rowPast.fill = {...rowCopy.fill}
        }
    },
    replaceKeyCellValue: function (_ws, _addressCell, _keys, _values){
		let cellInfo = _ws.getCell(_addressCell);

		let arrKey = [], arrValue = [];
		if(typeof _keys == "string" && !!_keys){
			arrKey.push(_keys)
			arrValue.push(_values)
		}else{
			arrKey = _keys
			arrValue = _values
		}
		
		for(let i = 0; i < arrKey.length; i++){
			if(!this.isContainValue(cellInfo.value)){
				cellInfo.value = null;
				continue;
			}

			// không thay thế giá trị nếu ô có công thức, Hyperlink
			if(!!cellInfo.value.formula || !!cellInfo.value.hyperlink) continue;

			if(!!cellInfo.value.richText){
				let richText = cellInfo.value.richText;
				if(richText.length > 0){
					for(let j = 0; j < richText.length; j++){
						let curRichText = richText[j];
						curRichText.text = curRichText.text.toString().replaceAll(arrKey[i], arrValue[i]??"");
					}
					//cellInfo.value.richText = richText;
				}
				continue; // không thay thế giá trị nếu ô có rich text
			}

			if(typeof(arrValue[i]) == "object" && arrValue[i]?.hasOwnProperty("richText") && arrValue[i].richText?.length > 0){
				let orgText = cellInfo.value.toString();

				let isKeyExistInText = orgText.includes(arrKey[i]);
				if(!isKeyExistInText) continue;

				let arrOrgTextSplitByKey = orgText.split(arrKey[i]);

				let arrNewRichText = [];
				for(let j = 0; j < arrOrgTextSplitByKey.length; j++){
					let partText = arrOrgTextSplitByKey[j];

					if(j > 0 && !partText) continue;

					arrNewRichText.push({
						text: partText
					});

					arrValue[i].richText.forEach(e=>{
						arrNewRichText.push({...e});
					})
				}

				arrNewRichText = arrNewRichText.filter(e => !!e.text);

				cellInfo.value = {
					richText: arrNewRichText
				}

				continue;
			}

			cellInfo.value = cellInfo.value.toString().replaceAll(arrKey[i], arrValue[i]??"");
			if(this.isContainValue(cellInfo.value) && !isNaN(cellInfo.value)){
				cellInfo.value = Number(cellInfo.value);
			}
		}
	},
    replaceKey: function (_ws, _keys, _values){
        /**
         * chạy lặp qua tất cả các ô trong worksheet và thay thế giá trị.
         * Ưu: Các Key cố định sẽ không còn quan tâm vị trí của ô (có thể thay đổi template mà không ảnh hưởng đến giá trị)
         * Nhược: Sẽ chạy lặp qua tất cả các ô trong worksheet, nếu worksheet có nhiều ô thì sẽ tốn thời gian.
         */
        _ws.eachRow(function(row) {
            row.eachCell(function(cell) {
                _keys.forEach(function(key, index){
                    _scvExcelJS.replaceKeyCellValue(_ws, cell._address, key, _values[index]);
                });
            });
        });
	},
    getNowPrintDateReport: function(_lang = "vie"){
		let curDt = new Date();

		if(_lang == "eng"){
			return "Date: " + nlapiDateToString(curDt)
		}
		
        return `Ngày ${curDt.getDate()} tháng ${curDt.getMonth() + 1} năm ${curDt.getFullYear()}`;
	},
    createNumFmtWithRange: function (_ws, _posStart, _posEnd, _numFmt) {
		let posStart = this.getPositionCell(_ws, _posStart);
		let posEnd = this.getPositionCell(_ws, _posEnd);

		for(let idxRow = posStart.row; idxRow <= posEnd.row; idxRow++){
			for (let idxCol = posStart.col; idxCol <= posEnd.col; idxCol++) {
				let curCell = _ws.getCell(idxRow, idxCol);

				curCell.numFmt = _numFmt;
			}
		}
	},
	createFillWithRange: function (_ws, _posStart, _posEnd, _objFill) {
		let objFill = _objFill || {};

		let posStart = this.getPositionCell(_ws, _posStart);
		let posEnd = this.getPositionCell(_ws, _posEnd);
		
		for(let idxRow = posStart.row; idxRow <= posEnd.row; idxRow++){
			for (let idxCol = posStart.col; idxCol <= posEnd.col; idxCol++) {
				let curCell = _ws.getCell(idxRow, idxCol);
				
				let curFill = {...curCell.fill};

				Object.keys(objFill).forEach(keyId =>{
					let tempValue = objFill[keyId];
					if(tempValue != undefined){
						curFill[keyId] = tempValue;
					}
				})

				curCell.fill = curFill;
			}
		}
	},
	createFontsWithRange: function (_ws, _posStart, _posEnd, _objFont) {
		let objFont = _objFont || {};

		let posStart = this.getPositionCell(_ws, _posStart);
		let posEnd = this.getPositionCell(_ws, _posEnd);

		for(let idxRow = posStart.row; idxRow <= posEnd.row; idxRow++){
			for (let idxCol = posStart.col; idxCol <= posEnd.col; idxCol++) {
				let curCell = _ws.getCell(idxRow, idxCol);
				
				let curFont = {...curCell.font};

				Object.keys(objFont).forEach(keyId =>{
					let tempValue = objFont[keyId];
					if(tempValue != undefined){
						curFont[keyId] = tempValue;
					}
				})

				curCell.font = curFont;
			}
		}
	},
	createBorderWithRange: function (_ws, _posStart, _posEnd, _borderOutside, _borderInside) {
		let borderOutside = _borderOutside || "thin";
		let borderInside = _borderInside || {rowStyle: "", colStyle: ""};

		/* thin,dotted, dashDot, hair, dashDotDot, slantDashDot, mediumDashed, mediumDashDotDot, mediumDashDot
		medium, double, thick
		*/
		let styleBorderOutside = {
			style: borderOutside
		};

		let posStart = this.getPositionCell(_ws,_posStart);
		let posEnd = this.getPositionCell(_ws,_posEnd);

		for (let i = posStart.row; i <= posEnd.row; i++) {
			let leftBorderCell = _ws.getCell(i, posStart.col);
			let rightBorderCell = _ws.getCell(i, posEnd.col);

			leftBorderCell.border = {
				...leftBorderCell.border,
				left: styleBorderOutside
			};
			rightBorderCell.border = {
				...rightBorderCell.border,
				right: styleBorderOutside
			};
		}
	
		for (let i = posStart.col; i <= posEnd.col; i++) {
			let topBorderCell = _ws.getCell(posStart.row, i);
			let botBorderCell = _ws.getCell(posEnd.row, i);

			topBorderCell.border = {
				...topBorderCell.border,
				top: styleBorderOutside
			};
			botBorderCell.border = {
				...botBorderCell.border,
				bottom: styleBorderOutside
			};
		}

        if(!borderInside.rowStyle && !borderInside.colStyle) return;

		for(let idxRow = posStart.row; idxRow <= posEnd.row; idxRow++){
			for (let idxCol = posStart.col; idxCol <= posEnd.col; idxCol++) {
				if(!!borderInside.rowStyle && idxRow < posEnd.row){
					let botBorderCell = _ws.getCell(idxRow, idxCol);
					botBorderCell.border = {
						...botBorderCell.border,
						bottom: {style: borderInside.rowStyle}
					};
				}
				
				if(!!borderInside.colStyle && idxCol < posEnd.col){
					let rightBorderCell = _ws.getCell(idxRow, idxCol);
					rightBorderCell.border = {
						...rightBorderCell.border,
						right: {style: borderInside.colStyle}
					};
				}
			}
		}
	},
    copyWorkSheet: function (_wb, _ws, _sheetName, _isRowFitHeight) {
        const copiedWorksheet = _wb.addWorksheet(_sheetName);
        // copy column width
        copiedWorksheet.columns = _ws.columns.map(column => ({ ...column }));
        // Copy default row height
        if (_wb.properties.defaultRowHeight) {
            copiedWorksheet.properties.defaultRowHeight = _wb.properties.defaultRowHeight;
        }
        // Copy each row and its values
        _ws.eachRow((row, rowNumber) => {
            const newRow = copiedWorksheet.getRow(rowNumber);
            newRow.height = !!row.height ? (row.height * 1.244) : row.height;
            if(_isRowFitHeight === true) {
                newRow.height = newRow.height * 20 / newRow.width;
            }
            newRow._outlineLevel = row._outlineLevel;
            row.eachCell((cell, colNumber) => {
                const newCell = newRow.getCell(colNumber);
                newCell.value = cell.value;
                // Copy style if needed
                newCell.style = { ...cell.style };
            });
            newRow.commit();
        });
        // copy merges column
        _ws.model.merges.forEach(merge => {
            copiedWorksheet.mergeCells(merge);
        });
        return copiedWorksheet;
    },
	copyRangeSheet: function(_wsSource, _wsTarget,
        _rangeSource = {
            startRow: 1, startCol: 1, endRow: 1, endCol: 1
        }, 
        _posTarget = {
            row: 1, col: 1
        },
		_style = {
			copyWidthColumn: true,
			copyHeightRow: true,
			copyStyleCell: true,
		}
    ){
        let sourceStartRow = _rangeSource.startRow;
        let sourceEndRow = _rangeSource.endRow;
        let sourceStartCol = _rangeSource.startCol;
        let sourceEndCol = _rangeSource.endCol;

        let targetStartRow = _posTarget.row;
        let targetStartCol = _posTarget.col;

        for (let rowIndex = sourceStartRow; rowIndex <= sourceEndRow; rowIndex++) {
            let sourceRow = _wsSource.getRow(rowIndex);
            let targetRow = _wsTarget.getRow(targetStartRow + (rowIndex - sourceStartRow));

            for (let colIndex = sourceStartCol; colIndex <= sourceEndCol; colIndex++) {
                let sourceCell = sourceRow.getCell(colIndex);
                let targetCell = targetRow.getCell(targetStartCol + (colIndex - sourceStartCol));

                // Copy value, formula, and style if needed
                if (sourceCell.type === ExcelJS.ValueType.Formula) {
                    targetCell.value = {
                        formula: sourceCell.formula,
                        result: sourceCell.result,
                    };
                } else {
                    targetCell.value = sourceCell.value;
                }

                // Optional: Copy style
				if(_style.copyStyleCell){
					targetCell.style = JSON.parse(JSON.stringify(sourceCell.style));
				}
            }

            targetRow.commit();
        }

		//Copy width column
		if(_style.copyWidthColumn){
			//TO-DO
		}

		//Copy height row
		if(_style.copyHeightRow){

		}

		//Copy Merge Cells
        let arrPosMerges = Object.keys(_wsSource._merges);
        for(let i = 0; i < arrPosMerges.length; i++){
            let objPosMerge = _wsSource._merges[arrPosMerges[i]].model;

            let diff_org_row_start = objPosMerge.top - sourceStartRow;
            let diff_org_col_start = objPosMerge.left - sourceStartCol;
            let diff_org_row_end = objPosMerge.bottom - sourceStartRow;
            let diff_org_col_end = objPosMerge.right - sourceStartCol;

            let row_start = targetStartRow + diff_org_row_start;
            let col_start = targetStartCol + diff_org_col_start;
            let row_end = targetStartRow + diff_org_row_end;
            let col_end = targetStartCol + diff_org_col_end;
            
            _wsTarget.mergeCells(row_start, col_start, row_end, col_end);
        }
    },
	extendGridStyleRow: function (_ws, _posStart, _posEnd, _objRes) {
        let objFont = {
            bold: false, italic: false, underline: false
        };
        let objFill = {
            type: 'pattern',
            pattern:'solid',
            fgColor:{}
        };
        if(_objRes.rowPreparedData?.style?.fontWeight == "bold"){
            objFont.bold = true;
        }
        if(_objRes.rowPreparedData?.style?.fontStyle == "italic"){
            objFont.italic = true;
        }
        if(_objRes.rowPreparedData?.style?.textDecoration == "underline"){
            objFont.underline = true;
        }
		if(!!_objRes.rowPreparedData?.style?.fontSize){
			objFont.size = _objRes.rowPreparedData.style.fontSize;
		}
		if(!!_objRes.rowPreparedData?.style?.color){
			objFont.color = objFont.color||{};
			objFont.color.argb = _objRes.rowPreparedData.style.color.replace("#", "");
		}
        if(!!_objRes.rowPreparedData?.style?.backgroundColor){
            objFill.fgColor.argb = _objRes.rowPreparedData.style.backgroundColor.replace("#", "");
        }
        this.createFontsWithRange(_ws, _posStart, _posEnd, objFont);
        this.createFillWithRange(_ws, _posStart, _posEnd, objFill);
    },
	/* extendGridRenderColumn_OLD: function (_ws, _arrColumns, _idxRowHeaderStart) {
        let idxRowHeaderParent = _idxRowHeaderStart;
        let countRowHeaderChild = _arrColumns.find(e => e.columns?.length > 0) ? 1 : 0;
        let idxRowHeaderChild = idxRowHeaderParent + countRowHeaderChild;
        let idxColHeader = 1;
        let arrColumnFlat = [];

        for(let i = 0; i < _arrColumns.length; i++){
            let objColumn = _arrColumns[i];
			if(objColumn.visible == false) continue;

            _ws.getCell(idxRowHeaderParent, idxColHeader).value = objColumn.caption;

            let col_start = idxColHeader;
            if(objColumn?.columns?.length > 0){
                let arrColumnChild = objColumn.columns;
				let countColAdd = 0;
                for(let j = 0; j < arrColumnChild.length; j++){
                    let objColumnChild = arrColumnChild[j];
					if(objColumnChild.visible == false) continue;

                    _ws.getCell(idxRowHeaderParent, idxColHeader).value = objColumn.caption;

                    let curCell = _ws.getCell(idxRowHeaderChild, idxColHeader);
                    curCell.alignment = {vertical: 'top', horizontal: 'center', wrapText: true};
                    curCell.value = objColumnChild.caption;

                    _ws.getColumn(idxColHeader).width = objColumnChild.width / 9;

                    idxColHeader++;
					countColAdd++;

                    arrColumnFlat.push({...objColumnChild});
                }
                _ws.mergeCells(idxRowHeaderParent, idxColHeader - countColAdd, idxRowHeaderParent, idxColHeader - 1);
                _ws.getCell(idxRowHeaderParent, col_start).alignment = {vertical: 'top', horizontal: 'center', wrapText: true};
            }
            else{
                idxColHeader++;

                _ws.mergeCells(idxRowHeaderParent, idxColHeader - 1, idxRowHeaderChild, idxColHeader - 1);

                let curCell = _ws.getCell(idxRowHeaderParent, idxColHeader - 1);
                curCell.alignment = {vertical: 'top', horizontal: 'center', wrapText: true};

                _ws.getColumn(idxColHeader - 1).width = objColumn.width / 9;

                arrColumnFlat.push({...objColumn});
            }

            if(!!objColumn?.headerStyle?.["background-color"]){
                let objFill = {
                    type: 'pattern',
                    pattern:'solid',
                    fgColor:{argb: objColumn.headerStyle["background-color"].replace("#", "")}
                };
                this.createFillWithRange(_ws, 
                    {row: idxRowHeaderParent, col: col_start},
                    {row: idxRowHeaderChild, col: idxColHeader - 1},
                    objFill
                );
            }
        }

        idxColHeader--;

        this.createBorderWithRange(_ws, 
            {row: idxRowHeaderParent, col: 1}, 
            {row: idxRowHeaderChild, col: idxColHeader},
            "thin",
            {rowStyle: "thin", colStyle: "thin"}
        );
        
        return {row_start: idxRowHeaderParent, col_start: 1, row_end: idxRowHeaderChild, col_end: idxColHeader, arrColumnFlat: arrColumnFlat};
    } */
	extendGridRenderColumn: function (_ws, _arrColumns, _idxRowHeaderStart, _idxColHeaderStart = 1, _idxRowHeaderEnd = -1) {
        let idxRowHeaderParent = _idxRowHeaderStart;
        let countRowHeaderChild = this.extendGridCountRowHeader(_arrColumns);
        let idxRowHeaderChild = idxRowHeaderParent + countRowHeaderChild - 1;
		let idxRowHeaderEnd = _idxRowHeaderEnd > idxRowHeaderChild ? _idxRowHeaderEnd : idxRowHeaderChild;
        let idxColHeader = _idxColHeaderStart;
        
		for(let i = 0; i < _arrColumns.length; i++){
			let objColumn = _arrColumns[i];

			let caption = objColumn.caption.replaceAll(/<br\s*\/?>/gi, "\n")

			let parentCell = _ws.getCell(idxRowHeaderParent, idxColHeader);
			parentCell.value = caption;

			if(objColumn?.columns?.length > 0){
				let objRenderChild = this.extendGridRenderColumn(_ws, objColumn.columns, idxRowHeaderParent + 1, idxColHeader, idxRowHeaderEnd);

				_ws.mergeCells(idxRowHeaderParent, idxColHeader, idxRowHeaderParent, objRenderChild.col_end);

				this.extendGridColumnHeaderStyle(_ws,
					{row: idxRowHeaderParent, col: idxColHeader},
					{row: idxRowHeaderParent, col: objRenderChild.col_end},
					objColumn?.headerStyle
				);

				idxColHeader = objRenderChild.col_end + 1;
			}
			else{
				_ws.mergeCells(idxRowHeaderParent, idxColHeader, idxRowHeaderEnd, idxColHeader);

                _ws.getColumn(idxColHeader).width = (objColumn.width || objColumn.minWidth || 120) / 9;

				this.extendGridColumnHeaderStyle(_ws,
					{row: idxRowHeaderParent, col: idxColHeader},
					{row: idxRowHeaderEnd, col: idxColHeader},
					objColumn?.headerStyle
				);

				idxColHeader++;
			}

			parentCell.alignment = {vertical: 'top', horizontal: 'center', wrapText: true};
		}

        idxColHeader--;
		
		this.createBorderWithRange(_ws, 
            {row: _idxRowHeaderStart, col: _idxColHeaderStart}, 
            {row: idxRowHeaderEnd, col: idxColHeader},
            "thin",
            {rowStyle: "thin", colStyle: "thin"}
        );

		let objResPosition = {
			row_start: _idxRowHeaderStart, col_start: _idxColHeaderStart, 
			row_end: idxRowHeaderEnd, col_end: idxColHeader,
			arrColumnFlat: this.extendGridColumnFlat(_arrColumns)//Hạn chế sử dụng, vì sau này sẽ bỏ, hiện tại để tạm (các chức năng trước đang sử dụng)
		};

		let defaultRowHeight = _ws.properties.defaultRowHeight;

		for(let idxRow = _idxRowHeaderStart; idxRow <= idxRowHeaderEnd; idxRow++){
			let curRow = _ws.getRow(idxRow);

			let maxWrap = 1;
			curRow.eachCell(curCell => {
                let countWrap = curCell?.value?.toString()?.split("\n")?.length || 1;

				maxWrap = Math.max(maxWrap, countWrap);
            });
			
			curRow.height = defaultRowHeight * 1.244 * maxWrap;
		}
        
        return objResPosition;
    },
	extendGridColumnHeaderStyle: function (_ws, _posStart, _posEnd, _headerStyle){
		if(!_headerStyle) return;

		let objFill = {};

		if(!!_headerStyle.backgroundColor || !!_headerStyle["background-color"]){
			objFill = {
				type: 'pattern',
				pattern:'solid',
				fgColor:{
					argb: (_headerStyle.backgroundColor||_headerStyle["background-color"]).replace("#", "")
				}
			};
		}

		if(Object.keys(objFill).length > 0){
			this.createFillWithRange(_ws, _posStart, _posEnd, objFill);
		}

		let objFont = {
			bold: true
		};

		if(_headerStyle.fontWeight == "bold"){
			objFont.bold = true;
		}
		else if(_headerStyle.fontWeight == "normal"){
			objFont.bold = false;
		}
		if(_headerStyle.fontStyle == "italic"){
			objFont.italic = true;
		}
		if(_headerStyle.textDecoration == "underline"){
			objFont.underline = true;
		}
		if(!!_headerStyle.fontSize){
			objFont.size = _headerStyle.fontSize;
		}
		if(!!_headerStyle.color){
			objFont.color = {
				argb: _headerStyle.color.replace("#", "")
			};
		}
		
		this.createFontsWithRange(_ws, _posStart, _posEnd, objFont);
	},
	extendGridColumnVisible: function (_arrColumns) {
		let arrResult = [];

		for(let i = 0; i < _arrColumns.length; i++){
			let objColumn = _arrColumns[i];
			if(objColumn.visible == false) continue;

			if(objColumn?.columns?.length > 0){
				let arrChild = this.extendGridColumnVisible(objColumn.columns);
				if(arrChild.length > 0){
					arrResult.push({...objColumn, columns: arrChild});
				}
			}
			else{
				arrResult.push({...objColumn});
			}
		}

		return arrResult;
	},
	extendGridColumnFlat: function (_arrColumns) {
		let arrColumnFlat = [];
		for(let i = 0; i < _arrColumns.length; i++){
			let objColumn = _arrColumns[i];
			if(objColumn?.columns?.length > 0){
				arrColumnFlat = arrColumnFlat.concat(this.extendGridColumnFlat(objColumn.columns));
			}
			else{
				arrColumnFlat.push({...objColumn});
			}
		}

		return arrColumnFlat;
	},
	extendGridCountRowHeader: function (_arrColumns) {
		let maxLevel = 0;
		function traverse(nodes, level) {
			if (!Array.isArray(nodes)) return;

			maxLevel = Math.max(maxLevel, level);

			for (let node of nodes) {
				if (node.columns && Array.isArray(node.columns)) {
					traverse(node.columns, level + 1);
				}
			}
		}

		traverse(_arrColumns, 1); // bắt đầu từ cấp 1
		return maxLevel;

	},
	extendGridCellPrepareStyle: function(_cell, _cellPreparedData){
		let cellStyle = _cellPreparedData?.style;
		if(!cellStyle) return;

		let objFont = {..._cell.font};
		let objFill = {..._cell.fill};

		if(cellStyle.fontWeight == "bold"){
            objFont.bold = true;
        }
        else if(cellStyle.fontWeight == "normal"){
            objFont.bold = false;
        }
        if(cellStyle.fontStyle == "italic"){
            objFont.italic = true;
        }
        if(cellStyle.textDecoration == "underline"){
            objFont.underline = true;
        }
        if(!!cellStyle.fontSize){
            objFont.size = cellStyle.fontSize;
        }
        if(!!cellStyle.color){
            objFont.color = {
                argb: cellStyle.color.replace("#", "")
            };
        }

		if(!!cellStyle.backgroundColor || !!cellStyle["background-color"]){
			objFill = {
				type: 'pattern',
				pattern:'solid',
				fgColor:{
					argb: (cellStyle.backgroundColor||cellStyle["background-color"]).replace("#", "")
				}
			};
		}
		
		if(Object.keys(objFill).length > 0){
			_cell.fill = objFill;
		}
		if(Object.keys(objFont).length > 0){
			_cell.font = objFont;
		}
	}
};

try{
	_scvExcelJS.initClient();
}
catch(e){
	console.log("Error initializing _scvExcelJS:", e.message);
}
