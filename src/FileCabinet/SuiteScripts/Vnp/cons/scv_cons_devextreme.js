/**
 * Nội dung: 
 * Version: 1.260123.16
 * =======================================================================================
 *  Date                Author                  Description
 *  03 Mar 2025         Huy Pham			    Init, create file
 */
define(['N/query'],
function(query) {
	const FIELD = {
	}

	const SUBLIST = {
		
	}

	const RECORDS = {
		_N: {
			file: null
		},
		FILES_IMPORTED: [],
		STYLES: {
		},
		CORE: [
			{
				NAME: "jquery.min.js",
				URL: "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.5.1/jquery.min.js",
				PATH: ""
			},
			/* {
				NAME: "bootstrap.min.css",
				URL: "https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css", 
				PATH: ""
			}, */
			{
				NAME: "bootstrap-icons.css",
                URL: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.2/font/bootstrap-icons.css",
				PATH: ""
			},
			/* {
				NAME: "dx.light.css",
				URL: "https://cdn3.devexpress.com/jslib/24.1.5/css/dx.light.css", 
				PATH: ""
			}, */
			/* {
				NAME: "dx.material.blue.light.css",
				URL: "https://cdn3.devexpress.com/jslib/24.1.5/css/dx.material.blue.light.css",
				PATH: ""
			}, */
			{
				NAME: "dx.material.blue.light.compact.css",
				URL: "https://cdn3.devexpress.com/jslib/24.1.5/css/dx.material.blue.light.compact.css",
				PATH: ""
			},
			/* {
				NAME: "dx.fluent.saas.light.min.css",
				URL: "https://cdnjs.cloudflare.com/ajax/libs/devextreme/24.1.5/css/dx.fluent.saas.light.min.css",
				PATH: ""
			}, */
			{
				NAME: "dx.common.css",
				URL: "https://cdn3.devexpress.com/jslib/24.1.5/css/dx.common.css",
				PATH: ""
			},
			{
				NAME: "dx.all.js",
				URL: "",//"https://cdn3.devexpress.com/jslib/24.1.5/js/dx.all.js",
				PATH: "../packages/devextreme/dx.all.js"
			},
			{
				NAME: "bootstrap.min.js",
				URL: "https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js",
				PATH: ""
			},
			{
				NAME: "exceljs.min.js",
				URL: "",//"https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.2.1/exceljs.min.js",
				PATH: "../olib/exceljs.min@4.4.0.js"
			},
			{
				NAME: "FileSaver.min.js",
				URL: "",//"https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js",
				PATH: "../olib/FileSaver.min@2.0.5.js"
			},
			{NAME: "scv_dx_style.css", URL: "", PATH: "../packages/devextreme/styles/scv_dx_style.css"},
			{NAME: "scv_dx_init.js", URL: "", PATH: "../packages/devextreme/scripts/scv_dx_init.js"},
		],
		MODULS: {
		},
		suiteType: "SuiteScripts",
		formMobile: {}
	}

	const setSuiteType = (_suiteType) =>{
		RECORDS.suiteType = _suiteType;
	}

	const initModulServer = (_objModul) =>{
		RECORDS._N.file = _objModul.file||null;
	}

	const getLibaryIncludes = (_arrModuls = []) =>{
		let arrLinkStyle = [], arrScript = [];
		let arrFileName = [];
		
		for(let i = 0; i < RECORDS.CORE.length; i++){
			let objRes = RECORDS.CORE[i];

			let idxImported = RECORDS.FILES_IMPORTED.findIndex(e => e.name == objRes.NAME);
			if(idxImported > -1) continue;

			if(!!objRes.URL){
				if(objRes.URL.indexOf(".css") > -1){
					arrLinkStyle.push(`<link rel="stylesheet" href="${objRes.URL}" type="text/css" />`);

					RECORDS.FILES_IMPORTED.push({
						name: objRes.NAME,
						url: objRes.URL
					});

					continue;
				}
				else if(objRes.URL.indexOf(".js") > -1){
					arrScript.push(`<script type="text/javascript" src="${objRes.URL}"></script>`);

					RECORDS.FILES_IMPORTED.push({
						name: objRes.NAME,
						url: objRes.URL
					});

					continue;
				}
			}
			arrFileName.push(objRes.NAME);
		}

		for(let i = 0; i < _arrModuls.length; i++){
			let arrFileOfModul = _arrModuls[i];
			
			for(let j = 0; j < arrFileOfModul.length; j++){
				let objFileOfModul = arrFileOfModul[j];

				let idxImported = RECORDS.FILES_IMPORTED.findIndex(e => e.name == objFileOfModul.NAME);
				if(idxImported > -1) continue;

				let idxFileExist = arrFileName.findIndex(e => e == objFileOfModul.NAME);
				if(idxFileExist > -1) continue;

				if(!!objFileOfModul.URL){
					if(objFileOfModul.URL.indexOf(".css") > -1){
						arrLinkStyle.push(`<link rel="stylesheet" href="${objFileOfModul.URL}" type="text/css" />`);

						RECORDS.FILES_IMPORTED.push({name: objFileOfModul.NAME, url: objFileOfModul.URL});
						continue;
					}
					else if(objFileOfModul.URL.indexOf(".js") > -1){
						arrScript.push(`<script type="text/javascript" src="${objFileOfModul.URL}"></script>`);

						RECORDS.FILES_IMPORTED.push({name: objFileOfModul.NAME, url: objFileOfModul.URL});
						continue;
					}
				}

				arrFileName.push(objFileOfModul.NAME);
			}
		}
		
		if(arrFileName.length > 0){
			let arrUrlFile = query.runSuiteQL({
				query: `SELECT a.id, a.name, a.url, a.filetype
				FROM file a,
					(SELECT id, name, appfolder
						FROM MediaItemFolder
						START WITH name = 'devextreme' and appfolder like '${RECORDS.suiteType}%'
						CONNECT BY PRIOR id = parent) b
				WHERE a.folder = b.id
					AND a.isinactive = 'F'
					AND a.name IN ('${arrFileName.join("', '")}')
				`}).asMappedResults();
	
			for(let i = 0; i < arrFileName.length; i++){
				let fileName = arrFileName[i];
	
				let idxImported = RECORDS.FILES_IMPORTED.findIndex(e => e.name == fileName);
				if(idxImported > -1) continue;
	
				let objFile = arrUrlFile.find(e => e.name == fileName);
				if(!objFile) continue;
	
				if(objFile.filetype == "JAVASCRIPT"){
					arrScript.push(`<script type="text/javascript" src="${objFile.url}"></script>`);
				}
				else if(objFile.filetype == "STYLESHEET"){
					arrLinkStyle.push( `<link rel="stylesheet" href="${objFile.url}" type="text/css" />`);
				}
	
				RECORDS.FILES_IMPORTED.push(objFile);
			}
		}

		return arrLinkStyle.join("\n") + "\n" + arrScript.join("\n");
	}

	const defaultOptionsGrid = (_options = {}) =>{
		parseFuncToString(_options);

		_options.columnResizingMode = _options.columnResizingMode ?? "widget";
		_options.columnMinWidth = _options.columnMinWidth ?? 50;
		_options.showBorders = _options.showBorders ?? true;
		_options.showColumnLines = _options.showColumnLines ?? true;
		_options.showRowLines = _options.showRowLines ?? true;
		_options.allowColumnResizing = _options.allowColumnResizing ?? true;
		_options.columnAutoWidth = _options.columnAutoWidth ?? true;
		_options.repaintChangesOnly = _options.repaintChangesOnly ?? true;
		_options.wordWrapEnabled = _options.wordWrapEnabled ?? true;
		_options.selection = _options.selection ?? "single";// or "multiple" | "none"
		_options.searchPanel = _options.searchPanel ?? { visible: true };
		_options.groupPanel = _options.groupPanel ??  { visible: false };
		_options.rowAlternationEnabled = _options.rowAlternationEnabled ?? false;
		_options.paging = _options.paging ?? { pageSize: 500};
		_options.loadPanel = _options.loadPanel ?? {enabled: true};
		_options.columnFixing = _options.columnFixing ?? {enabled: true};
		_options.columnChooser = _options.columnChooser ?? {enabled: false, mode: "select"};
		_options.pager = _options.pager ?? {};
		_options.pager.visible = _options.pager.visible ?? true;
		_options.pager.showPageSizeSelector = _options.pager.showPageSizeSelector ?? true;
		_options.pager.allowedPageSizes = _options.pager.allowedPageSizes ?? [100, 200, 500, 1000, "all"];
		_options.pager.showInfo = _options.pager.showInfo ?? true;
		_options.pager.showNavigationButtons = _options.pager.showNavigationButtons ?? true;

		_options.editing = _options.editing ?? {};
		_options.editing.mode = _options.editing.mode ?? "cell";
		_options.editing.allowUpdating = _options.editing.allowUpdating ?? false;
		_options.editing.allowAdding = _options.editing.allowAdding ?? false;
		_options.editing.allowDeleting = _options.editing.allowDeleting ?? false;

		_options.headerFilter = _options.headerFilter ?? {};
		_options.headerFilter.visible = _options.headerFilter.visible ?? true;
		_options.headerFilter.search = _options.headerFilter.search ?? {};
		_options.headerFilter.search.enabled = _options.headerFilter.search.enabled ?? true;

		_options.filterRow = _options.filterRow ?? {};
		_options.filterRow.visible = _options.filterRow.visible ?? false;
		_options.filterRow.applyFilter = _options.filterRow.applyFilter ?? "auto";
		
		_options.export = _options.export ?? {};
		_options.export.enabled = _options.export.enabled ?? true;

		return _options;
	}

	const defaultOptionsTreeGrid = (_options = {}) =>{
		parseFuncToString(_options);

		_options.rootValue = _options.rootValue ?? -1;
		_options.keyExpr = _options.keyExpr ?? "idxRow";
		_options.parentIdExpr = _options.parentIdExpr ?? "idxRowParent";
		_options.autoExpandAll = _options.autoExpandAll ?? true;
		_options.columnResizingMode = _options.columnResizingMode ?? "widget";
		_options.columnMinWidth = _options.columnMinWidth ?? 50;
		_options.columnMaxWidth = _options.columnMaxWidth ?? 300;
		_options.showBorders = _options.showBorders ?? true;
		_options.showColumnLines = _options.showColumnLines ?? true;
		_options.showRowLines = _options.showRowLines ?? true;
		_options.allowColumnResizing = _options.allowColumnResizing ?? true;
		_options.columnAutoWidth = _options.columnAutoWidth ?? false;
		_options.repaintChangesOnly = _options.repaintChangesOnly ?? true;
		_options.wordWrapEnabled = _options.wordWrapEnabled ?? true;
		_options.selection = _options.selection ?? "single";// or "multiple" | "none"
		_options.searchPanel = _options.searchPanel ?? { visible: true };
		_options.rowAlternationEnabled = _options.rowAlternationEnabled ?? false;
		_options.paging = _options.paging ?? {enabled: true, pageSize: 500};
		_options.loadPanel = _options.loadPanel ?? {enabled: true};
		_options.columnFixing = _options.columnFixing ?? {enabled: true};
		_options.columnChooser = _options.columnChooser ?? {enabled: false, mode: "select"};
		_options.scrolling = _options.scrolling ?? {mode: "standard"};
		_options.pager = _options.pager ?? {};
		_options.pager.showPageSizeSelector = _options.pager.showPageSizeSelector ?? true;
		_options.pager.allowedPageSizes = _options.pager.allowedPageSizes ?? [100, 200, 500, 1000, "all"];
		_options.pager.showInfo = _options.pager.showInfo ?? true;
		_options.pager.showNavigationButtons = _options.pager.showNavigationButtons ?? true;
		_options.headerFilter = _options.headerFilter ?? {};
		_options.headerFilter.visible = _options.headerFilter.visible ?? true;
		_options.headerFilter.search = _options.headerFilter.search ?? {};
		_options.headerFilter.search.enabled = _options.headerFilter.search.enabled ?? true;
		_options.filterRow = _options.filterRow ?? {};
		_options.filterRow.visible = _options.filterRow.visible ?? false;
		_options.filterRow.applyFilter = _options.filterRow.applyFilter ?? "auto";
		_options.sorting = _options.sorting ?? {mode: "none"};//multiple
		_options.filterPanel = _options.filterPanel ?? { visible: true};

		_options.editing = _options.editing ?? {};
		_options.editing.mode = _options.editing.mode ?? "cell";
		_options.editing.allowUpdating = _options.editing.allowUpdating ?? false;
		_options.editing.allowAdding = _options.editing.allowAdding ?? false;
		_options.editing.allowDeleting = _options.editing.allowDeleting ?? false;

		_options.export = _options.export ?? {};
		_options.export.enabled = _options.export.enabled ?? true;

		return _options;
	}

	const defaultOptionsPivotGrid = (_options = {}) =>{
		parseFuncToString(_options);

		_options.allowSortingBySummary = _options.allowSortingBySummary ?? true;
		_options.allowSorting = _options.allowSorting ?? true;
		_options.allowFiltering = _options.allowFiltering ?? true;
		_options.allowExpandAll = _options.allowExpandAll ?? true;
		_options.fieldChooser = _options.fieldChooser ?? {enabled: true};
		_options.showBorders = _options.showBorders ?? true;
		_options.showColumnTotals = _options.showColumnTotals ?? true;
		_options.showTotalsPrior = _options.showTotalsPrior ?? 'rows',
		_options.fieldPanel = _options.fieldPanel ?? {
			showColumnFields: true,
			showDataFields: true,
			showFilterFields: true,
			showRowFields: true,
			allowFieldDragging: true,
			visible: true,
		};
		_options.headerFilter = _options.headerFilter ?? {
			search: {
				enabled: true,
			},
			showRelevantValues: true,
			width: 300,
			height: 400,
		};
		_options.rowHeaderLayout = _options.rowHeaderLayout ?? 'tree';
		_options.export = _options.export ?? {enabled: true};
		
		return _options;
	}

	const defaultOptionsTabs = (_options = {}) =>{
		parseFuncToString(_options);
		
		_options.showNavButtons = _options.showNavButtons ?? true;
		_options.scrollByContent = _options.scrollByContent ?? true;
		return _options;
	}

	const getInfoDefaultModul = (_dxType, _options = {}, _arrModulImport = []) =>{
		let options = {..._options};
		let arrModulImport = _arrModulImport;

		if(_dxType == "grid"){
			options = defaultOptionsGrid(options);
		}
		else if(_dxType == "treegrid"){
			options = defaultOptionsTreeGrid(options);
		}
		else if(_dxType == "pivotgrid"){
			options = defaultOptionsPivotGrid(options);
		}
		else if(_dxType == "tabs"){
			options = defaultOptionsTabs(options);
		}

		deleteProperties(options);

		return {
			options,
			arrModulImport
		}
	}

	const getScriptJSON = (_id, _option, _source) =>{
		let scriptJSON = ``;

		scriptJSON += `<script type="application/json" id="option_${_id}">${typeof(_option) == "string" ? _option : JSON.stringify(_option)}</script>`;
		scriptJSON += `<script type="application/json" id="source_${_id}">${typeof(_source) == "string" ? _source : JSON.stringify(_source)}</script>`;

		return scriptJSON;
	}
	
	const deleteProperties = (_obj) =>{
		if(!!_obj.id) delete _obj.id;
		if(!!_obj.type) delete _obj.type;
		if(!!_obj.label) delete _obj.label;
		if(!!_obj.splitterId) delete _obj.splitterId;
		if(!!_obj.splitterPosition) delete _obj.splitterPosition;
		if(!!_obj.tab) delete _obj.tab;

		return _obj;
	}

	const parseFuncToString = (_options = {}) =>{
		if(util.isObject(_options)){
			Object.keys(_options).forEach(key => {
				if(util.isFunction(_options[key])){
					_options[key] = {
						_type: "function",
						_value: _options[key].toString()
					}
				}
				else if(util.isObject(_options[key]) || util.isArray(_options[key])){
					_options[key] = parseFuncToString(_options[key]);
				}
			});
		}
		else if(util.isArray(_options)){
			_options.forEach(options =>{
				options = parseFuncToString(options);
			})
		}

		return _options;
	}

	const getTemplateGrid = (_gridId, _optionsGrid) =>{
		let libContents = getLibaryIncludes();

		let options = defaultOptionsGrid({..._optionsGrid});

		let label = options.label;
		
		deleteProperties(options);

		let gridId = _gridId||"dxGrid";
		let sourceData = JSON.stringify({...options.source});
		
		options.dataSource = {};
		options = JSON.stringify(options);

		let scriptJSON = getScriptJSON(gridId, options, sourceData);
		
		return {
			libaryLink: libContents,
			scriptJSON: scriptJSON,
			scriptInit: `_scvDx.initGridRender("grid", "${gridId}", "${label}");`,
			html: `<div id="${gridId}"></div>`
		};
	}

	const getTemplateContentWithTab = (_tabNSId, _lstDx) =>{
		let arrModulImport = [];

		let tabId = _tabNSId + "_dxtab";

		let scriptContents = ``;
		let scriptJSON = ``;
		let htmlTab = `<div class="widget-wrapper widget-wrapper-horizontal">`;
		htmlTab += `<div id="${tabId}" style="margin: 5px !important"></div>`;
		let arrDxOfTab = [];

		_lstDx.forEach((objDx, index) =>{
			let dxId = objDx.id;
			let dxType = objDx.type;
			let dxLabel  = objDx.label;

			let objDefaultModul = getInfoDefaultModul(dxType, {...objDx}, arrModulImport);
			let options = objDefaultModul.options;
			arrModulImport = objDefaultModul.arrModulImport;

			let sourceData = JSON.stringify({...options.source});
		
			options.source = {};
			options = JSON.stringify(options);

			let panelId = `panel_${dxId}`;

			htmlTab += `<div id="${panelId}" style="display: ${index == 0 ? "block" : "none"};"><div id="${dxId}"></div></div>`;

			scriptJSON += getScriptJSON(dxId, options, sourceData);

			arrDxOfTab.push({
				id: dxId,
				panelId: panelId,
				label: dxLabel,
				text: dxLabel,
				type: dxType
			});
		});
		htmlTab += `</div>`;
		scriptContents += `_scvDx.initTabRender("${tabId}"); `;

		let libContents = getLibaryIncludes(arrModulImport);

		let optionTab = defaultOptionsTabs();

		scriptJSON += getScriptJSON(tabId, optionTab, arrDxOfTab);
		
		return {
			libaryLink: libContents,
			scriptJSON: scriptJSON,
			scriptInit: `_scvDx.initTabRender("${tabId}"); `,
			html: htmlTab
		};
	}

	const getTemplateSplitter = (_optionSplitter, _lstDx) =>{
		let splitterId = _optionSplitter.id;
		let arrModulImport = [];

		let arrDxOfSplitter = [];
		let scriptJSON = ``;
		let scriptContents = ``;
		let htmlSplitter = `<div id="${splitterId}">`;

		_lstDx.forEach(objDx =>{
			let dxId = objDx.id;
			let dxType = objDx.type;
			let dxLabel  = objDx.label;

			let objDefaultModul = getInfoDefaultModul(dxType, {...objDx}, arrModulImport);
			let options = objDefaultModul.options;
			arrModulImport = objDefaultModul.arrModulImport;

			let sourceData = JSON.stringify({...options.source});
		
			options.source = {};
			options = JSON.stringify(options);

			scriptJSON += getScriptJSON(dxId, options, sourceData);

			let panelId = `panel_${splitterId}_${dxId}`;

			arrDxOfSplitter.push({
				id: dxId,
				label: dxLabel,
				type: dxType,
				panelId: panelId
			});
		});
		htmlSplitter += `</div>`;

		let optionSplitter = {..._optionSplitter.optionsDx};
		optionSplitter.items = optionSplitter.items || [];

		if(optionSplitter.items.length == 0 && arrDxOfSplitter.length > 0){
			optionSplitter.items = [];

			let sizeSplitter = 100/arrDxOfSplitter.length;
			sizeSplitter = Math.round(sizeSplitter) + "%";

			arrDxOfSplitter.forEach(objDx =>{
				optionSplitter.items.push({
					resizable: true,
					collapsible: true,
					size: sizeSplitter
				});
			})
		}

		scriptJSON += getScriptJSON(splitterId, optionSplitter, arrDxOfSplitter);

		scriptContents += `_scvDx.initSplitterRender("${splitterId}"); `;

		let libContents = getLibaryIncludes(arrModulImport);

		return {
			libaryLink: libContents,
			scriptJSON: scriptJSON,
			scriptInit: scriptContents,
			html: htmlSplitter
		};
	}

	const getTemplateTreeGrid = (_gridId, _optionsTreeGrid) =>{
		let libContents = getLibaryIncludes();

		let options = defaultOptionsTreeGrid({..._optionsTreeGrid});
		let label = options.label;

		deleteProperties(options);

		let gridId = _gridId||"dxTreeGrid";

		let sourceData = JSON.stringify({...options.source});
		
		options.source = {};
		options = JSON.stringify(options);

		let scriptJSON = getScriptJSON(gridId, options, sourceData);
		
		return {
			libaryLink: libContents,
			scriptJSON: scriptJSON,
			scriptInit: `_scvDx.initGridRender("treegrid", "${gridId}", "${label}");`,
			html: `<div id="${gridId}"></div>`
		};
	}

	const getTemplatePivotGrid = (_gridId, _optionsPivotGrid) =>{
		let libContents = getLibaryIncludes();

		let options = defaultOptionsPivotGrid({..._optionsPivotGrid});

		let label = options.label;
		
		deleteProperties(options);

		let gridId = _gridId||"dxPivotGrid";
		let sourceData = JSON.stringify({...options.source});
		
		options.dataSource = {};
		options = JSON.stringify(options);

		let scriptJSON = getScriptJSON(gridId, options, sourceData);
		
		return {
			libaryLink: libContents,
			scriptJSON: scriptJSON,
			scriptInit: `_scvDx.initPivotGridRender("${gridId}", "${label}");`,
			html: `<div id="${gridId}"></div>`
		};
	}

	const createFormMobile = () =>{
		let formMobile = RECORDS.formMobile;
		
		formMobile.buttons = [];
		formMobile.fields = [];
		formMobile.rows = [];
		formMobile.grids = [];
		formMobile.tabs = [];
		
		formMobile.addButton = function(_options){
			formMobile.buttons.push({..._options});
		};

		formMobile.addField = function(_options){
			let scvOption = _options?._scv || {};

			let sizeRows = this.rows.length;

			let arrLastRow = sizeRows == 0 ? [] : this.rows[sizeRows - 1];

			if(sizeRows == 0){
				this.rows.push(arrLastRow);
			}
			else if(arrLastRow.length >= 3 && !scvOption.classGridColumn){
				arrLastRow = [];

				this.rows.push(arrLastRow);
			}

			if(scvOption.breakRow == true){
				arrLastRow = [];
				this.rows.push(arrLastRow);
			}

			this.fields.push({..._options});

			arrLastRow.push({id: _options.id});
		};

		formMobile.addGrid = function(_options){
			let dxId = _options.id||("dx" + _options.type);
			let tabId = "";
			this.grids.push({
				id: dxId,
				type: _options.type,
				label: _options.label,
				tab: tabId,
				columns: _options.columns,
				fields: [],//pivotgrid
				source: {
					store: _options.data || [],
					reshapeOnPush: true,
				},
				optionsDx: _options.optionsDx||{}
			});
		}

		formMobile.addLibaryExternal = (_links) =>{
			let lstLink = util.isArray(_links) ? _links : [_links];
			lstLink.forEach(_link =>{
				RECORDS.CORE.push({NAME: _link, URL: _link, PATH: ""});
			});
		};

		formMobile.generateHtmlHead = function(){
			let libContents = getLibaryIncludes();

			return `
                <meta http-equiv="X-UA-Compatible" content="IE=edge" />
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
                ${libContents}`
		};

		formMobile.generateHtmlBody = function(){
			let contents = ``;

			if(this.buttons.length > 0){
				contents += `<div class="row" style="text-align: right">`;
				contents += `<div class="col-xl-12 col-md-12 col-12  p-2">`;

				this.buttons.forEach((objRes) => {
					contents += `<div class="mx-1" id="${objRes.id}"></div>`;
				});

				contents += `</div></div>`;
			}
			
			for(let idxRow = 0; idxRow < this.rows.length; idxRow++){
				let arrFieldOfRow = this.rows[idxRow];

				let sizeColumn = arrFieldOfRow.length;
				if(sizeColumn == 0) continue;

				contents += `<div class="row">`;

				for(let idxCol = 0; idxCol < sizeColumn; idxCol++){
					let objField = arrFieldOfRow[idxCol];
					let objFieldInfo = this.fields.find(e => e.id == objField.id);
					let scvOption = objFieldInfo?._scv || {};

					let layoutReponsive = `<div class="col-xl-4 col-md-4 col-4 p-2">`;
					
					if(!!scvOption.classGridColumn){
						layoutReponsive = `<div class="${scvOption.classGridColumn}">`;
					}
					else if(sizeColumn == 1){
						layoutReponsive = `<div class="col-xl-4 col-md-4 col-12 p-2">`;
					}
					else if(sizeColumn == 2){
						layoutReponsive = `<div class="col-xl-4 col-md-4 col-6 p-2">`;
					}

					contents += layoutReponsive;
					contents += `<div id="${objField.id}"></div>`;
					contents += `</div>`;
				}
				contents += `</div>`;
			}

			if(this.grids.length > 0){
				for(let idxGrid = 0; idxGrid < this.grids.length; idxGrid++){
					let objResGrid = this.grids[0];

					let optionsDx = objResGrid.optionsDx||{};
					
					let objTmplGrid = getTemplateGrid(objResGrid.id, {
						source: objResGrid.source,
						columns: objResGrid.columns,
						id: objResGrid.id,
						type: objResGrid.type,
						label: objResGrid.label,
						...optionsDx
					});

					contents += `<div class="row">`;
					contents += `<div class="col-xl-12 col-md-12 col-12 p-2">`;

					contents += `${objTmplGrid.html}`;
					contents += objTmplGrid.scriptJSON;
					contents += `<script>${objTmplGrid.scriptInit}</script>`;

					contents += `</div></div>`;
				}
			}

			return contents;
		};
		
		formMobile.generateHtml = function(){
			let scriptJSON = getScriptJSON("dxFormMobile", {
				buttons: this.buttons,
				fields: this.fields,
				grids: this.grids,
			}, {});

			return `<html>
                <head>
					${this.generateHtmlHead()}
					${scriptJSON}
				</head>
				</style>
                <body><div class="container" >${this.generateHtmlBody()}</div></body>
            </html>`
		};

		return formMobile;
	}

    return {
		TYPE: "devextreme-v24.1.5",
		FIELD,
		SUBLIST,
		RECORDS,
		initModulServer,
		setSuiteType,
		getLibaryIncludes,
		getTemplateGrid,
		getTemplateContentWithTab,
		getTemplateTreeGrid,
		getTemplateSplitter,
		getTemplatePivotGrid,

		createFormMobile
    };
    
});
