/**
 * Nội dung: hỗ trợ call data asyn by ajax, hỗ trợ xuất export theo exceljs
 * =======================================================================================
 *  Date                Author                  Description
 * 14 Oct 2023          Huy Pham                Int create file
 * 08 Aug 2024			Huy Pham				Điều chỉnh logic asyncPostMultiRequestFetchSSPageByAjax
 */
define([],
	() => {
		
		if (typeof ExcelJS == "undefined") {
			jQuery.getScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js');
		}
		if (typeof saveAs == "undefined") {
			jQuery.getScript('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js');
		}
		if (typeof JSZip == "undefined") {
			jQuery.getScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js')
		}
		
		const NUMBER_FORMAT = {
			ACCOUNTING: "_(#,##0_);_( (#,##0);_( \\-\\ ??_);_(@_)",
			ACCOUNTING_PRECISION_2: "_(#,##0.00_);_(\ \(#,##0.00\);_(\ \-\ ??_);_(@_)",
			ACCOUNTING_PRECISION_6: "_(#,##0.00000000_);_(\ \(#,##0.00000000\);_(\ \-\ ??_);_(@_)",
		}
		
		const loadWorkbookFromUrl = async (_urlFile, _callbackSucc) => {
			let workbook = null;
			
			await fetch(_urlFile).then(res => res.blob())
				.then(async blob => {
					let buf = await blob.arrayBuffer();
					workbook = new ExcelJS.Workbook();
					await workbook.xlsx.load(buf);
					
					if (typeof _callbackSucc == "function") {
						_callbackSucc(workbook);
					}
				})
			
			return workbook;
		}
		
		const saveWorkbook = async (_workbook, _name) => {
			_workbook.xlsx.writeBuffer().then(function (buffer) {
				saveAs(new Blob([buffer]), _name);
			});
		}
		
		const isContainValue = (value) => {
			let isContain = false;
			if (value !== undefined && value != null && value !== '') {
				if (util.isArray(value)) {
					if (value.length > 0) {
						isContain = true;
					}
				} else {
					isContain = true;
				}
			}
			return isContain;
		}
		
		const syncRangeMergeAfterInsertRow = (_ws, _rowStartInsert, _numLineInserted) => {
			let arrRangeMerge = _ws.model.merges;
			let arrRangeMergeFinal = [];
			for (let i = 0; i < arrRangeMerge.length; i++) {
				let address_range = arrRangeMerge[i];
				let address_cell_start = getPositionCell(_ws, address_range.split(":")[0]);
				let address_cell_end = getPositionCell(_ws, address_range.split(":")[1]);
				
				if (address_cell_start.row >= _rowStartInsert) {
					_ws.unMergeCells(address_range);
					
					arrRangeMergeFinal.push({
						row_start: address_cell_start.row + _numLineInserted,
						col_start: address_cell_start.col,
						row_end: address_cell_end.row + _numLineInserted,
						col_end: address_cell_end.col
					})
					
				}
			}
			
			for (let i = 0; i < arrRangeMergeFinal.length; i++) {
				let objRangeMerge = arrRangeMergeFinal[i];
				_ws.mergeCells(objRangeMerge.row_start, objRangeMerge.col_start, objRangeMerge.row_end, objRangeMerge.col_end);
			}
		}
		
		const insertColumn = (_ws, _colStartInsert, _numColInserted) => {
			let arrRangeMerge = _ws.model.merges;
			let arrRangeMergeFinal = [];
			for (let i = 0; i < arrRangeMerge.length; i++) {
				let address_range = arrRangeMerge[i];
				let address_cell_start = getPositionCell(_ws, address_range.split(":")[0]);
				let address_cell_end = getPositionCell(_ws, address_range.split(":")[1]);
				
				let isUnMergeCell = false;
				if (address_cell_start.col >= _colStartInsert) {
					isUnMergeCell = true;
					arrRangeMergeFinal.push({
						row_start: address_cell_start.row,
						col_start: address_cell_start.col + _numColInserted,
						row_end: address_cell_end.row,
						col_end: address_cell_end.col + _numColInserted,
						old_address: address_cell_start
					})
				} else if (address_cell_start.col <= _colStartInsert && address_cell_end.col >= _colStartInsert) {
					isUnMergeCell = true;
					arrRangeMergeFinal.push({
						row_start: address_cell_start.row,
						col_start: address_cell_start.col,
						row_end: address_cell_end.row,
						col_end: address_cell_end.col + _numColInserted,
						old_address: address_cell_start
					})
				}
				
				if (isUnMergeCell) {
					_ws.unMergeCells(address_range);
					let cellAddressOrg = {row: address_cell_start.row, col: address_cell_start.col};
					
					for (let idxRow = cellAddressOrg.row; idxRow <= address_cell_end.row; idxRow++) {
						
						for (let idxCol = cellAddressOrg.col; idxCol <= address_cell_end.col; idxCol++) {
							
							if (cellAddressOrg.row == idxRow && cellAddressOrg.col == idxCol) {
								continue;
							}
							copyStyleCellToCell(_ws, cellAddressOrg, {row: idxRow, col: idxCol});
						}
					}
				}
			}
			
			let rowCount = _ws.rowCount;
			let colCount = _ws.columnCount;
			
			for (let idxCol = colCount; idxCol >= _colStartInsert; idxCol--) {
				let oldColumn = _ws.getColumn(idxCol);
				let newColumn = _ws.getColumn(idxCol + _numColInserted);
				
				newColumn.width = oldColumn.width;
				
				for (let idxRow = 1; idxRow <= rowCount; idxRow++) {
					copyStyleCellToCell(_ws, {row: idxRow, col: idxCol}, {row: idxRow, col: idxCol + _numColInserted});
					
					let oldCell = _ws.getCell(idxRow, idxCol);
					let newCell = _ws.getCell(idxRow, idxCol + _numColInserted);
					
					newCell.value = oldCell.value;
					
					oldCell.value = null;
				}
				
			}
			
			for (let i = 0; i < arrRangeMergeFinal.length; i++) {
				let objRangeMerge = arrRangeMergeFinal[i];
				_ws.mergeCells(objRangeMerge.row_start, objRangeMerge.col_start, objRangeMerge.row_end, objRangeMerge.col_end);
			}
		}
		
		const getPositionCell = (_ws, _pos) => {
			let objPos = {row: 1, col: 1, address: "A1"};
			
			if (typeof _pos == "string") {
				objPos.address = _pos.toUpperCase();
				
				let cell_start = _ws.getCell(objPos.address);
				
				objPos.row = cell_start.row;
				objPos.col = cell_start.col;
			} else if (typeof _pos == "object") {
				objPos.row = _pos.row || 1;
				objPos.col = _pos.col || 1;
				
				let cell_start = _ws.getCell(objPos.row, objPos.col);
				
				objPos.address = cell_start._address;
			}
			
			return objPos;
		}
		
		const copyStyleCellToCells = (_ws, _posCellCopy, _arrPosCellPast) => {
			for (let i = 0; i < _arrPosCellPast.length; i++) {
				copyStyleCellToCell(_ws, _posCellCopy, _arrPosCellPast[i]);
			}
		}
		
		const copyStyleCellToCell = (_ws, _posCellCopy, _posCellPast) => {
			let posCellCopy = getPositionCell(_ws, _posCellCopy);
			let posCellPast = getPositionCell(_ws, _posCellPast);
			
			let cellCopy = _ws.getCell(posCellCopy.address);
			let cellPast = _ws.getCell(posCellPast.address);
			
			if (cellCopy.numFmt !== undefined) {
				cellPast.numFmt = cellCopy.numFmt
			}
			if (cellCopy.font !== undefined) {
				cellPast.font = {...cellCopy.font}
			}
			if (cellCopy.alignment !== undefined) {
				cellPast.alignment = {...cellCopy.alignment}
			}
			if (cellCopy.border !== undefined) {
				cellPast.border = {...cellCopy.border}
			}
			if (cellCopy.fill !== undefined) {
				cellPast.fill = {...cellCopy.fill}
			}
		}
		
		const copyStyleRowToRows = (_ws, _rowNumCopy, _arrRowNumPast) => {
			for (let i = 0; i < _arrRowNumPast.length; i++) {
				copyStyleCellToCell(_ws, _rowNumCopy, _arrRowNumPast[i]);
			}
		}
		
		const copyStyleRowToRow = (_ws, _rowNumCopy, _rowNumPast) => {
			let rowCopy = _ws.getRow(_rowNumCopy);
			let rowPast = _ws.getRow(_rowNumPast);
			
			let cellCount = rowCopy.cellCount < rowPast.cellCount ? rowPast.cellCount : rowCopy.cellCount;
			for (let i = 1; i <= cellCount; i++) {
				rowPast.getCell(i).numFmt = rowCopy.getCell(i).numFmt;
			}
			
			if (rowCopy.font !== undefined) {
				rowPast.font = {...rowCopy.font}
			}
			if (rowCopy.alignment !== undefined) {
				rowPast.alignment = {...rowCopy.alignment}
			}
			if (rowCopy.border !== undefined) {
				rowPast.border = {...rowCopy.border}
			}
			if (rowCopy.fill !== undefined) {
				rowPast.fill = {...rowCopy.fill}
			}
		}
		
		const createNumFmtWithRange = (_ws, _posStart, _posEnd, _numFmt) => {
			let posStart = getPositionCell(_ws, _posStart);
			let posEnd = getPositionCell(_ws, _posEnd);
			
			for (let idxRow = posStart.row; idxRow <= posEnd.row; idxRow++) {
				for (let idxCol = posStart.col; idxCol <= posEnd.col; idxCol++) {
					let curCell = _ws.getCell(idxRow, idxCol);
					
					curCell.numFmt = _numFmt;
				}
			}
		}
		
		const createFillWithRange = (_ws, _posStart, _posEnd, _objFill) => {
			_objFill = _objFill || {};
			
			let posStart = getPositionCell(_ws, _posStart);
			let posEnd = getPositionCell(_ws, _posEnd);
			
			for (let idxRow = posStart.row; idxRow <= posEnd.row; idxRow++) {
				for (let idxCol = posStart.col; idxCol <= posEnd.col; idxCol++) {
					let curCell = _ws.getCell(idxRow, idxCol);
					
					let curFill = {...curCell.fill};
					
					Object.keys(_objFill).forEach(keyId => {
						let tempValue = _objFill[keyId];
						if (tempValue !== undefined) {
							curFill[keyId] = tempValue;
						}
					})
					
					curCell.fill = curFill;
				}
			}
		}
		
		const createFontsWithRange = (_ws, _posStart, _posEnd, _objFont) => {
			_objFont = _objFont || {};
			
			let posStart = getPositionCell(_ws, _posStart);
			let posEnd = getPositionCell(_ws, _posEnd);
			
			for (let idxRow = posStart.row; idxRow <= posEnd.row; idxRow++) {
				for (let idxCol = posStart.col; idxCol <= posEnd.col; idxCol++) {
					let curCell = _ws.getCell(idxRow, idxCol);
					
					let curFont = {...curCell.font};
					
					Object.keys(_objFont).forEach(keyId => {
						let tempValue = _objFont[keyId];
						if (tempValue !== undefined) {
							curFont[keyId] = tempValue;
						}
					})
					
					curCell.font = curFont;
				}
			}
		}
		
		const createBorderWithRange = (_ws, _posStart, _posEnd, _borderOutside, _objBorderInside) => {
			_borderOutside = _borderOutside || "thin";
			_objBorderInside = _objBorderInside || {rowStyle: "", colStyle: ""};
			
			/* thin,dotted, dashDot, hair, dashDotDot, slantDashDot, mediumDashed, mediumDashDotDot, mediumDashDot
            medium, double, thick
            */
			let styleBorderOutside = {
				style: _borderOutside
			};
			
			let posStart = getPositionCell(_ws, _posStart);
			let posEnd = getPositionCell(_ws, _posEnd);
			
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
			
			if (!!_objBorderInside.rowStyle || !!_objBorderInside.colStyle) {
				for (let idxRow = posStart.row; idxRow <= posEnd.row; idxRow++) {
					for (let idxCol = posStart.col; idxCol <= posEnd.col; idxCol++) {
						if (!!_objBorderInside.rowStyle && idxRow < posEnd.row) {
							let botBorderCell = _ws.getCell(idxRow, idxCol);
							botBorderCell.border = {
								...botBorderCell.border,
								bottom: {style: _objBorderInside.rowStyle}
							};
						}
						
						if (!!_objBorderInside.colStyle && idxCol < posEnd.col) {
							let rightBorderCell = _ws.getCell(idxRow, idxCol);
							rightBorderCell.border = {
								...rightBorderCell.border,
								right: {style: _objBorderInside.colStyle}
							};
						}
					}
				}
			}
		};
		
		const asyncPostMultiRequestFetchSSPageByAjax = async (_urlReq, _arrReqAction, _callbackCompletedMulti, _callbackSucc, _callbackErr, _isExcuteFullPage = false, _cntCallData = 0) => {
			if (_arrReqAction.length === 0) {
				if (typeof _callbackSucc == "function") {
					_callbackCompletedMulti(_arrReqAction);
				}
			}
			let cntCallData = _cntCallData || 0;
			let arrReqActionPage = [];
			
			let countExcuted = 0, concurrencyExcute = 10, countExcutedSuccess = 0;
			
			_arrReqAction.forEach(objAction => {
				if (objAction.isSuccess || objAction.isExcuted) {
					//cntCallData++;
					return;
				}
				
				updateProgessStatus("Processing step: " + cntCallData + "/" + _arrReqAction.length);
				let paramsFunc = objAction.params;
				paramsFunc.action = objAction.action;
				paramsFunc.page = Number(paramsFunc.page || 0);
				paramsFunc.rangePageFetch = Number(paramsFunc.rangePageFetch || 1);
				
				if (countExcuted >= concurrencyExcute) {
					return;
				} else {
					objAction.isExcuted = true;
					countExcuted++;
				}
				
				asyncPostDataByAjax(_urlReq, paramsFunc, function (_res, _paramsCallback) {
					cntCallData++;
					
					if (typeof _callbackSucc == "function") {
						_callbackSucc(_res, _paramsCallback);
					}
					
					objAction.data = _res.data;
					objAction.isSuccess = true;
					let info = _res.data.info || {};
					let page = Number(info.page || 0);
					let ttlPage = Number(info.ttlPage || 1);
					let rangePageFetch = Number(info.rangePageFetch || 1);
					
					if (page < (ttlPage - 1) && !_isExcuteFullPage) {//rule chỉ lấy lượng call page 1 lần duy nhất
						for (let idxPage = (page + 1); idxPage < ttlPage; (idxPage += rangePageFetch)) {
							let paramFetchPage = {..._paramsCallback};
							paramFetchPage.page = idxPage;
							arrReqActionPage.push({
								action: _paramsCallback.action,
								params: paramFetchPage,
								data: []
							})
						}
					}
					
					updateProgessStatus("Processing step: " + cntCallData + "/" + _arrReqAction.length);
					
					countExcutedSuccess++;
					if (countExcutedSuccess >= concurrencyExcute && cntCallData < _arrReqAction.length) {
						asyncPostMultiRequestFetchSSPageByAjax(_urlReq, _arrReqAction, _callbackCompletedMulti, _callbackSucc, _callbackErr, _isExcuteFullPage, cntCallData);
						return;
					}
					
					if (cntCallData < _arrReqAction.length) return;
					
					if (arrReqActionPage.length > 0 && !_isExcuteFullPage) {
						_arrReqAction = _arrReqAction.concat(arrReqActionPage);
						updateProgessStatus("Processing step: " + cntCallData + "/" + _arrReqAction.length);
						asyncPostMultiRequestFetchSSPageByAjax(_urlReq, _arrReqAction, _callbackCompletedMulti, _callbackSucc, _callbackErr, true, cntCallData);
						return;
					}
					if (typeof _callbackSucc == "function") {
						_callbackCompletedMulti(_arrReqAction);
					}
				}, function (request, status, error, _paramsCallback) {
					cntCallData++;
					if (typeof _callbackSucc == "function") {
						_callbackErr(request, status, error, _paramsCallback);
					}
					
					if (cntCallData < _arrReqAction.length) return;
					
					if (typeof _callbackSucc == "function") {
						_callbackCompletedMulti(_arrReqAction);
					}
				})
			});
		}
		
		const asyncPostMultiRequestByAjax = async (_urlReq, _arrReqAction, _callbackCompletedMulti, _callbackSucc, _callbackErr) => {
			if (_arrReqAction.length === 0) {
				if (typeof _callbackSucc == "function") {
					_callbackCompletedMulti(_arrReqAction);
				}
			}
			let cntCallData = 0;
			_arrReqAction.forEach(objAction => {
				let paramsFunc = objAction.params;
				paramsFunc.action = objAction.action;
				
				asyncPostDataByAjax(_urlReq, paramsFunc, function (_res, _paramsCallback) {
					cntCallData++;
					
					if (typeof _callbackSucc == "function") {
						_callbackSucc(_res, _paramsCallback);
					}
					
					objAction.data = _res.data;
					
					updateProgessStatus("Processing step: " + cntCallData + "/" + _arrReqAction.length);
					
					if (cntCallData < _arrReqAction.length) return;
					
					if (typeof _callbackSucc == "function") {
						_callbackCompletedMulti(_arrReqAction);
					}
				}, function (request, status, error, _paramsCallback) {
					cntCallData++;
					
					if (typeof _callbackSucc == "function") {
						_callbackErr(request, status, error, _paramsCallback);
					}
					
					if (cntCallData < _arrReqAction.length) return;
					
					if (typeof _callbackSucc == "function") {
						_callbackCompletedMulti(_arrReqAction);
					}
				})
			});
		}
		
		const asyncPostDataByAjax = async (_urlReq, _params, _callbackSucc, _callbackErr) => {
			requestDataByAjax("post", _urlReq, true, _params, _callbackSucc, _callbackErr);
		}
		
		const nonAsyncPostWaitRequestDataByAjax = async (_urlReq, _arrReqAction, _idxExcute = 0, _callbackCompletedMulti, _callbackSucc, _callbackErr) => {
			if (_arrReqAction.length === 0 || _idxExcute >= _arrReqAction.length || _idxExcute < 0) {
				if (typeof _callbackCompletedMulti == "function") {
					_callbackCompletedMulti(_arrReqAction);
				}
				
				return;
			}
			
			let objReqAction = _arrReqAction[_idxExcute];
			objReqAction.params.action = objReqAction.action;
			let nextExcute = _idxExcute + 1;
			asyncPostDataByAjax(_urlReq, objReqAction.params, function (_res, _paramsCallback) {
				objReqAction.data = _res.data;
				
				if (typeof _callbackSucc == "function") {
					_callbackSucc(_res, _paramsCallback);
				}
				
				nonAsyncPostWaitRequestDataByAjax(_urlReq, _arrReqAction, nextExcute, _callbackCompletedMulti, _callbackSucc, _callbackErr);
			}, function (request, status, error) {
				objReqAction.data = _res.data;
				
				if (typeof _callbackErr == "function") {
					_callbackErr(request, status, error, objReqAction.params);
				}
				
				nonAsyncPostWaitRequestDataByAjax(_urlReq, _arrReqAction, nextExcute, _callbackCompletedMulti, _callbackSucc, _callbackErr);
			})
		}
		
		const nonAsyncPostDataByAjax = (_urlReq, _params, _callbackSucc, _callbackErr) => {
			return requestDataByAjax("post", _urlReq, false, _params, _callbackSucc, _callbackErr);
		}
		
		const requestDataByAjax = (_method, _urlReq, _isAsync, _params, _callbackSucc, _callbackErr) => {
			let resResult = {};
			
			jQuery.ajax({
				type: _method, url: _urlReq, dataType: "json", async: _isAsync, data: {..._params}
			}).done(function (response) {
				resResult = {...response};
				if (typeof _callbackSucc == "function") {
					_callbackSucc(resResult, _params);
				}
			}).fail(function (request, status, error) {
				if (typeof _callbackErr == "function") {
					_callbackErr(request, status, {
						message: error || (new DOMParser().parseFromString(request.responseText, "text/html")?.querySelector(".uir-error-page--message")?.textContent ?? request.responseText)
					}, _params);
				}
			});
			
			return resResult;
		}
		
		const updateProgessStatus = (_msg) => {
			jQuery("#idxProgessStatus").html(_msg);
			jQuery(".scvProgessStatus").html(_msg);
		}
		
		const replaceKeyCellValue = (_ws, _addressCell, _keys, _values) => {
			//let objAddress = getPositionCell(_ws, _addressCell)
			let cellInfo = _ws.getCell(_addressCell);
			
			let arrKey = [], arrValue = [];
			if (typeof _keys == "string" && !!_keys) {
				arrKey.push(_keys)
				arrValue.push(_values)
			} else {
				arrKey = _keys
				arrValue = _values
			}
			
			for (let i = 0; i < arrKey.length; i++) {
				let val_temp = isContainValue(arrValue[i]) ? arrValue[i] : null;
				cellInfo.value = isContainValue(cellInfo.value) ? cellInfo.value.toString().replaceAll(arrKey[i], val_temp) : null;
				if (!isNaN(cellInfo.value)) {
					cellInfo.value = Number(cellInfo.value);
				}
			}
		}
		
		const setCellValueNowPrintDate = (_ws, _addressCell, _keys = []) => {
			let str_cur_date = getNowPrintDateReport();
			
			let arrKey = [];
			if (typeof _keys == "string" && !!_keys) {
				arrKey.push(_keys)
			} else {
				arrKey = _keys
			}
			
			if (arrKey.length === 0) {
				_ws.getCell(_addressCell).value = str_cur_date;
			} else {
				for (let i = 0; i < arrKey.length; i++) {
					replaceKeyCellValue(_ws, _addressCell, arrKey[i], str_cur_date);
				}
			}
		}
		
		const getNowPrintDateReport = () => {
			let curDt = new Date();
			return `Ngày ${curDt.getDate()} tháng ${curDt.getMonth() + 1} năm ${curDt.getFullYear()}`;
		}
		
		const getTemplateExportExcel = (_urlData, _params) => {
			let params = {..._params};
			params.action = "getTemplateExportExcel";
			
			updateProgessStatus("getTemplateExportExcel: Processing");
			
			let objRes = nonAsyncPostDataByAjax(_urlData, params, function (_res) {
				updateProgessStatus("getTemplateExportExcel: Completed");
			});
			
			return objRes.data;
		}
		
		const syncStyleRangeWithRowGrid = (_ws, _posStart, _posEnd, _objRes) => {
			let objFont = {
				bold: false, italic: false, underline: false
			};
			let objFill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: {}
			};
			if (_objRes.rowPreparedData?.style?.fontWeight === "bold") {
				objFont.bold = true;
			}
			if (_objRes.rowPreparedData?.style?.fontStyle === "italic") {
				objFont.italic = true;
			}
			if (_objRes.rowPreparedData?.style?.textDecoration === "underline") {
				objFont.underline = true;
			}
			if (!!_objRes.rowPreparedData?.style?.backgroundColor) {
				objFill.fgColor.argb = _objRes.rowPreparedData.style.backgroundColor.replace("#", "");
			}
			createFontsWithRange(_ws, _posStart, _posEnd, objFont);
			createFillWithRange(_ws, _posStart, _posEnd, objFill);
		}
		
		const replaceKeyCellStringValue = (_ws, _addressCell, _keys, _values) => {
			let cellInfo = _ws.getCell(_addressCell);
			
			let arrKey = [], arrValue = [];
			if (typeof _keys == "string" && !!_keys) {
				arrKey.push(_keys)
				arrValue.push(_values)
			} else {
				arrKey = _keys
				arrValue = _values
			}
			
			for (let i = 0; i < arrKey.length; i++) {
				let val_temp = isContainValue(arrValue[i]) ? arrValue[i] : '';
				cellInfo.value = cellInfo.value.toString().replaceAll(arrKey[i], val_temp);
			}
		}
		
		const setCellValueSigner = (_ws, _addressCell, _singer) => {
			if (!_singer) return;
			
			let curCell = _ws.getCell(_addressCell);
			curCell.value = _singer;
			
			curCell.alignment = {vertical: 'top', horizontal: 'center'};
		}
		
		const getDataOfAction = (_arrActionFunc, _action) => {
			let arrResult = [];
			
			_arrActionFunc.filter(e => e.action == _action).forEach(_objData => arrResult = arrResult.concat(_objData.data.arrResult ?? _objData.data));
			
			return arrResult;
		}
		
		const renderHeaderExportFromGrid = (_curSheet, _arrColumns, _idxRowHeaderStart) => {
			let idxRowHeaderParent = _idxRowHeaderStart;
			let idxRowHeaderChild = idxRowHeaderParent + 1;
			let idxColHeader = 1;
			
			let arrColumnFlat = [];
			
			for (let i = 0; i < _arrColumns.length; i++) {
				let objColumn = _arrColumns[i];
				
				_curSheet.getCell(idxRowHeaderParent, idxColHeader).value = objColumn.caption;
				
				let col_start = idxColHeader;
				if (objColumn?.columns?.length > 0) {
					let arrColumnChild = objColumn.columns;
					for (let j = 0; j < arrColumnChild.length; j++) {
						let objColumnChild = arrColumnChild[j];
						
						_curSheet.getCell(idxRowHeaderParent, idxColHeader).value = objColumn.caption;
						
						let curCell = _curSheet.getCell(idxRowHeaderChild, idxColHeader);
						curCell.alignment = {vertical: 'top', horizontal: 'center', wrapText: true};
						curCell.value = objColumnChild.caption;
						
						_curSheet.getColumn(idxColHeader).width = objColumnChild.width / 9;
						
						idxColHeader++;
						
						arrColumnFlat.push({...objColumnChild});
					}
					_curSheet.mergeCells(idxRowHeaderParent, idxColHeader - arrColumnChild.length, idxRowHeaderParent, idxColHeader - 1);
					_curSheet.getCell(idxRowHeaderParent, col_start).alignment = {
						vertical: 'top',
						horizontal: 'center',
						wrapText: true
					};
				} else {
					idxColHeader++;
					
					_curSheet.mergeCells(idxRowHeaderParent, idxColHeader - 1, idxRowHeaderChild, idxColHeader - 1);
					
					let curCell = _curSheet.getCell(idxRowHeaderParent, idxColHeader - 1);
					curCell.alignment = {vertical: 'top', horizontal: 'center', wrapText: true};
					
					_curSheet.getColumn(idxColHeader - 1).width = objColumn.width / 9;
					
					arrColumnFlat.push({...objColumn});
				}
				
				if (!!objColumn?.headerStyle?.["background-color"]) {
					let objFill = {
						type: 'pattern',
						pattern: 'solid',
						fgColor: {argb: objColumn.headerStyle["background-color"].replace("#", "")}
					};
					createFillWithRange(_curSheet,
						{row: idxRowHeaderParent, col: col_start},
						{row: idxRowHeaderChild, col: idxColHeader - 1},
						objFill
					);
				}
			}
			
			idxColHeader--;
			
			createBorderWithRange(_curSheet,
				{row: idxRowHeaderParent, col: 1},
				{row: idxRowHeaderChild, col: idxColHeader},
				"thin",
				{rowStyle: "thin", colStyle: "thin"}
			);
			
			return {
				row_start: idxRowHeaderParent,
				col_start: 1,
				row_end: idxRowHeaderChild,
				col_end: idxColHeader,
				arrColumnFlat: arrColumnFlat
			};
		}
		
		const getObjStyleRow = (currentSheet, rowNumber, listColumn, columnStart, columnEnd, isBold) => {
			let objStyle = {};
			for (let iCol = columnStart; iCol <= columnEnd; iCol++) {
				let colName = listColumn[iCol];
				let cell = currentSheet.getCell(colName + rowNumber);
				
				const existingStyle = cell.style;
				
				cell.style = {
					font: {name: 'Arial', size: 10, bold: isBold},
					alignment: existingStyle.alignment,
					border: existingStyle.border,
					fill: existingStyle.fill,
					numFmt: existingStyle.numFmt
				};
				
				objStyle[colName] = cell.style;
			}
			return objStyle;
		}
		
		const updMultiValueToCell = (_ws, arrData) => {
			let len = arrData.length;
			for (let i = 0; i < len; i++) {
				const objCellUpd = arrData[i];
				let addressCell = objCellUpd.addressCell;
				let keys = objCellUpd.keys;
				let values = objCellUpd.values;
				replaceKeyCellValue(_ws, addressCell, keys, values);
			}
		}
		
		const getStyleOfRow = (_curSheet, indexRow) => {
			let _rowSourceRow = _curSheet.getRow(indexRow);
			let objStyle = {};
			_rowSourceRow.eachCell({includeEmpty: true}, (sourceCell, colNumber) => {
				objStyle[colNumber] = Object.assign({}, sourceCell.style);
			});
			return objStyle;
		}
		
		const insertStylesRow = (objStyle, _destinationRow) => {
			for (let colNumber in objStyle) {
				_destinationRow.getCell(colNumber*1).style = Object.assign({}, objStyle[colNumber]);
			}
		}
		
		const getStyleOfCell = (_curSheet, _addressCell) => {
			let _cellSource = _curSheet.getCell(_addressCell);
			let objStyle = {};
			Object.assign(objStyle, _cellSource.style);
			return objStyle;
		}
		
		const removeMultiRow = (_curSheet, startRowIdx, endRowIdx) => {
			for (let i = startRowIdx; i <= endRowIdx; i++) {
				removeRow(_curSheet, startRowIdx, 1);
			}
		}
		
		const removeRow = (_curSheet, rowIdx, numRows = 1) => {
			_curSheet.spliceRows(rowIdx, numRows);
		}
		
		const insertDetailStylesRow = (_rowSourceRow, arrRowsStyle) => {
			_rowSourceRow.eachCell({includeEmpty: true}, (sourceCell, colNumber) => {
				sourceCell.style = Object.assign({}, arrRowsStyle?.[colNumber] || {});
			});
		}
		
		const insertAllStylesRow = (objStyle, _rowSourceRow, _widthCountHeader) => {
			const widthCountHeader = _rowSourceRow.cellCount || _widthCountHeader;
			_rowSourceRow.eachCell({includeEmpty: true}, (sourceCell, colNumber) => {
				if (colNumber > widthCountHeader) return;
				sourceCell.style = Object.assign({}, objStyle);
			});
		}
		
		const addEmptyRow = (_curSheet, numberRows) => {
			let i = 0;
			while (i < numberRows) {
				_curSheet.addRow([]);
				i++;
			}
		}
		
		const cloneSheet = (workbook, indexSheet, nameSheet) => {
			let sheetToClone = workbook.getWorksheet(indexSheet);
			const _nameSheet = nameSheet;
			let cloneSheet = workbook.addWorksheet(_nameSheet)
			cloneSheet.model = sheetToClone.model
			cloneSheet.name = _nameSheet;
			return cloneSheet;
		}
		
		const updateCellValue = (currentSheet, strCellAddress, value, style) => {
			let cellInfo = currentSheet.getCell(strCellAddress);
			if(style) {
				cellInfo.style = style;
			}
			cellInfo.value = value;
		}
		
		const updateCellValueWithKey = (currentSheet, strCellAddress, key, value, style) => {
			let cellInfo = currentSheet.getCell(strCellAddress);
			if(style) {
				cellInfo.style = style;
			}
			let cellVale = cellInfo.value;
			cellVale = cellVale.replaceAll(key, value);
			cellInfo.value = cellVale;
		}
		
		async function getBlobFileUrl(url) {
			try {
				const response = await fetch(url);
				const blob = await response.blob();
				const reader = new FileReader();
				
				return new Promise((resolve, reject) => {
					reader.onloadend = () => resolve(reader.result);
					reader.onerror = reject;
					reader.readAsDataURL(blob);
				});
			} catch (error) {
				console.error('Error fetching the URL:', error);
				throw error;
			}
		}
		
		const createImageWithBase64 = (workbook, worksheet, objImage) => {
			let expectedHeight = getExpectedHeight(objImage.width, objImage.logoSize);
			let properties = {
				tl: {col: objImage.col, row: objImage.row},
				ext: {width: objImage.width, height: expectedHeight}
			};
			
			const image = workbook.addImage({
				base64: objImage.base64,
				extension: 'png',
			});
			worksheet.addImage(image, properties);
		}
		
		const getExpectedHeight = (expectedWidth, logoSize) => {
			let size = logoSize.split(":");
			let naturalWidth = size[0];
			let naturalHeight = size[1];
			
			let ratio = roundNumber(expectedWidth / naturalWidth);
			return roundNumber(naturalHeight * ratio);
		}
		
		const roundNumber = (_number, _precision = 2) => {
			let precision = Math.pow(10, _precision);
			return Math.round(_number * precision) / precision;
		}
		
		const mergeCell = (_curSheet, startRowIdx, startColumnIdx, endRowIdx, endColumnIdx) => {
			_curSheet.mergeCells(startRowIdx, startColumnIdx, endRowIdx, endColumnIdx);
		}
		
		const updateRowHeight = (worksheet, cellValue, extendNumber, rowNumber, lengRow) => {
			const row = worksheet.getRow(rowNumber);
			row.height = calculateRowHeight(cellValue, extendNumber, lengRow);
		}
		const calculateRowHeight = (cellValue, extendNumber, lengRow) => {
			const lineHeight = 19.5;
			const numLines = Math.ceil((cellValue.length + extendNumber) / lengRow);
			return lineHeight * numLines;
		}
		
		const assignStyle = (currentSheet, rowNumber, columnNamesFull, objStyle) => {
			for(let cellName of columnNamesFull) {
				let cellAddress = cellName + rowNumber;
				objStyle[cellName] = currentSheet.getCell(cellAddress).style
			}
		}
		
		const getObjStyleColumn = (currentSheet, columnName, rowStart, rowEnd) => {
			let objStyle = {};
			for (let iRow = rowStart; iRow <= rowEnd; iRow++) {
				objStyle[iRow] = currentSheet.getCell(columnName + iRow).style;
			}
			return objStyle;
		}
		
		const assignStyleColumn = (currentSheet, columnName, objStyleColumn, rowStart, rowEnd) => {
			for (let iRow = rowStart; iRow <= rowEnd; iRow++) {
				let cellInfo = currentSheet.getCell(columnName + iRow);
				cellInfo.style = objStyleColumn[iRow];
			}
		}
		
		const copyWorkSheet = (workbook, curSheet, sheet_nm, isRowFitHeight) => {
			const copiedWorksheet = workbook.addWorksheet(sheet_nm);
			// copy column width
			copiedWorksheet.columns = curSheet.columns.map(column => ({...column}));
			// Copy default row height
			if (workbook.properties.defaultRowHeight) {
				copiedWorksheet.properties.defaultRowHeight = workbook.properties.defaultRowHeight;
			}
			// Copy each row and its values
			curSheet.eachRow((row, rowNumber) => {
				const newRow = copiedWorksheet.getRow(rowNumber);
				newRow.height = !!row.height ? (row.height * 1.244) : row.height;
				if (isRowFitHeight === true) {
					newRow.height = newRow.height * 20 / newRow.width;
				}
				newRow._outlineLevel = row._outlineLevel;
				row.eachCell((cell, colNumber) => {
					const newCell = newRow.getCell(colNumber);
					newCell.value = cell.value;
					// Copy style if needed
					newCell.style = {...cell.style};
				});
				newRow.commit();
			});
			// copy merges column
			curSheet.model.merges.forEach(merge => {
				copiedWorksheet.mergeCells(merge);
			});
			return copiedWorksheet;
		}
		
		const truncatedSheetName = (_sheetName) => {
			if (!_sheetName) return "None";
			
			let sheetName = _sheetName.replace(/[*?:\\/\[\]]/g, '')
			
			let maxLength = 28;//sheet tối đa 31
			let suffix = "...";
			
			if (sheetName.length <= maxLength) return sheetName;
			
			let partLength = Math.floor((maxLength - suffix.length) / 2);
			
			let start = sheetName.substring(0, partLength);
			let lastSpaceStart = start.lastIndexOf(" ");
			if (lastSpaceStart !== -1) {
				start = start.substring(0, lastSpaceStart);
			}
			
			let end = sheetName.substring(sheetName.length - partLength);
			let firstSpaceEnd = end.indexOf(" ");
			if (firstSpaceEnd !== -1) {
				end = end.substring(firstSpaceEnd + 1);
			}
			
			return `${start}${suffix}${end}`;
		}
		
		const getNumberAccountingFormatXls = (_precision = 0) => {
			if (_precision === 0) return "_(#,##0_);_( (#,##0);_( \\-\\ ??_);_(@_)";
			
			let padPrecision = "".padStart(_precision, "#");
			
			return "_(#,##0." + padPrecision + "_);_( (#,##0." + padPrecision + ");_( \\-\\ ??_);_(@_)";
		}
		
		return {
			NUMBER_FORMAT,
			loadWorkbookFromUrl,
			saveWorkbook,
			isContainValue,
			syncRangeMergeAfterInsertRow,
			insertColumn,
			getPositionCell,
			copyStyleCellToCell,
			copyStyleCellToCells,
			copyStyleRowToRows,
			copyStyleRowToRow,
			createNumFmtWithRange,
			createFillWithRange,
			createFontsWithRange,
			createBorderWithRange,
			asyncPostMultiRequestFetchSSPageByAjax,
			asyncPostMultiRequestByAjax,
			asyncPostDataByAjax,
			nonAsyncPostDataByAjax,
			nonAsyncPostWaitRequestDataByAjax,
			updateProgessStatus,
			replaceKeyCellValue,
			setCellValueNowPrintDate,
			getNowPrintDateReport,
			getTemplateExportExcel,
			syncStyleRangeWithRowGrid,
			replaceKeyCellStringValue,
			setCellValueSigner,
			getDataOfAction,
			renderHeaderExportFromGrid,
			updMultiValueToCell,
			getStyleOfRow,
			insertStylesRow,
			getStyleOfCell,
			removeMultiRow,
			removeRow,
			insertDetailStylesRow,
			insertAllStylesRow,
			addEmptyRow,
			cloneSheet,
			updateCellValue,
			updateCellValueWithKey,
			getObjStyleRow,
			getBlobFileUrl,
			createImageWithBase64,
			mergeCell,
			updateRowHeight,
			calculateRowHeight,
			assignStyle,
			getObjStyleColumn,
			assignStyleColumn,
			copyWorkSheet,
			truncatedSheetName,
			getNumberAccountingFormatXls
		};
		
	});
