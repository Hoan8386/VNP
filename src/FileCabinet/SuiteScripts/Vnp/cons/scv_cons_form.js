/**
 * Nội dung: 
 * Version: 1.260401.36
 * =======================================================================================
 *  Date                Author                  Description
 *  25 Dec 2024         Huy Pham                Init & create file
 */
define(['N/ui/serverWidget', 'N/runtime', 'N/query', 'N/search', 'N/ui/message', 'N/file', 'N/url',
    '../lib/scv_lib_function.js',
    '../olib/alasql/alasql.min@4.6.6.js',
    '../cons/scv_cons_record.js',
    '../cons/scv_cons_file.js',
    '../cons/scv_cons_devextreme.js',
    '../cons/scv_cons_inventorydetail.js',
],
function(serverWidget, runtime, query, search, message, file, url,
    lbf,
    alasql,
    constRecord,
    constFile,
    constDX,
    constInventoryDetail,
) {
    const constJQX = {};
	const ID = "";
    const TYPE = "";
	const RECORDS = {
        form: null,
        request: null,
        response: null,
        field: {},
        sublist: {},
        fieldGroup: {},
        tab: {},
        subTab: {},
        jqx: {},
        dx: {},
        mainKeyInventoryDetail: "",
        inventorydetail: [],
        currentScript: {
            id: "",
            deploymentId: "",
        },
        serviceScript:{
            id: "",
            deploymentId: ""
        },
        LIBARY_INCLUDE: [
            "../css/scv_form.css",
            "../scripts/scv_form.js",
            "../scripts/scv_inventorydetail.js",
            "../scripts/scv_exceljs.js",
            '../olib/alasql/alasql.min@4.6.6.js',
            '../olib/exceljs.min@4.4.0.js',
            '../olib/FileSaver.min@2.0.5.js',
            '../olib/jszip.min@3.10.1.js',
        ],
        webWorker: {
            enable: false,
            //Library include for web worker dont use DOM
            scvExcelJS: "../scripts/scv_exceljs.js",
            excelJS: "../olib/exceljs.min@4.4.0.js",
            alasql: "../olib/alasql/alasql.min@4.6.6.js",
            moment: "../olib/moment.js",
        },
    }

    const getForm = () => {
        return RECORDS.form;
    }

    const setForm = (_form) => {
        RECORDS.form = _form;
        return RECORDS.form;
    }

    const setContext = (_context) => {
        if(!RECORDS.request && !!_context.request){
            setRequest(_context.request);
        }

        if(!RECORDS.response && !!_context.response){
            setResponse(_context.response);
        }
    }

    const setRequest = (_request) => {
        RECORDS.request = _request;

        return RECORDS.request;
    }

    const setResponse = (_response) => {
        RECORDS.response = _response;

        return RECORDS.response;
    }

    const setServiceScript = (_id, _deploymentId) => {
        RECORDS.serviceScript.id = _id;
        RECORDS.serviceScript.deploymentId =_deploymentId;
        try{
            let curUserId = runtime.getCurrentUser().id;
            if(curUserId == -5) return;

            if(curUserId < 0){
                RECORDS.serviceScript.url = url.resolveScript({
                    scriptId: RECORDS.serviceScript.id,
                    deploymentId: RECORDS.serviceScript.deploymentId,
                    returnExternalUrl: true
                })
            }
        }
        catch(err){
            log.error("ERROR: setServiceScript", err)
        }
    }

    const write = (_dataResponse) => {
        RECORDS.response.setHeader({
            name: 'Content-Type',
            value: 'application/json'
        });

        RECORDS.response.write(JSON.stringify(_dataResponse));
    }

    const addCommonClientScript = () => {
        let objRecordInitClient = {
            currentScript: RECORDS.currentScript,
            serviceScript: RECORDS.serviceScript,
            fields: [],
            sublists: [],
            mainKeyInventoryDetail: RECORDS.mainKeyInventoryDetail,
            infoInventoryDetail: [],
            webWorker: {},
        };
        Object.values(RECORDS.field).forEach(objField => {
            objRecordInitClient.fields.push({
                id: objField.id,
                type: objField.field.type,
                isMandatory: objField.field.isMandatory,
            });
        });

        Object.values(RECORDS.sublist).forEach(objSublist => {
            let objSublistTemp = {
                id: objSublist.id,
                columns: []
            };

            objSublist.columns.forEach(objColumn => {
                objSublistTemp.columns.push({
                    id: objColumn.id,
                    type: objColumn.field.type
                });
            });

            objRecordInitClient.sublists.push(objSublistTemp);
        });

        if(RECORDS.inventorydetail.length > 0){
            RECORDS.inventorydetail.forEach(objInventoryDetail => {
                objRecordInitClient.infoInventoryDetail.push({
                    sublistId: objInventoryDetail.sublistId,
                    fieldId: objInventoryDetail.fieldId,
                    currentScript: constInventoryDetail.RECORDS.currentScript,
                    serviceScript: constInventoryDetail.RECORDS.serviceScript,
                    inventoryDetail: {...objInventoryDetail.inventoryDetail},
                    relatedFieldId: {...objInventoryDetail.relatedFieldId}
                });
            });
        }

        let arrScript = [];
        let arrLinkStyle = [];
        let arrFileName  = RECORDS.LIBARY_INCLUDE.map(e => e.split("/").pop());

        let arrUrlFile = query.runSuiteQL({
            query: `SELECT DISTINCT a.name, a.url, a.filetype, b.name as folder_name
            FROM file a,
                (SELECT id, name, appfolder
                    FROM MediaItemFolder
                    START WITH appfolder = '${constFile.getCurrentAppFolder()}'
                    CONNECT BY PRIOR id = parent) b
            WHERE a.folder = b.id
                AND a.isinactive = 'F'
                AND a.name IN ('${arrFileName.join("', '")}')
        `}).asMappedResults();

        for(let i = 0; i < arrUrlFile.length; i++){
            let objFile = arrUrlFile[i];

            let idxFileName = RECORDS.LIBARY_INCLUDE.findIndex(_pathFile => _pathFile.indexOf(`/${objFile.folder_name}/${objFile.name}`) > -1);
            if(idxFileName == -1) continue;

            if(objFile.filetype == "JAVASCRIPT"){
                arrScript.push(`<script type="text/javascript" src="${objFile.url}"></script>`);
            }
            else if(objFile.filetype == "STYLESHEET"){
                arrLinkStyle.push( `<link rel="stylesheet" href="${objFile.url}" type="text/css" />`);
            }
        }

        objRecordInitClient.webWorker = getUrlWebWorkers();

        let dataInitServerId = "dataInitServerId_" + onGenCodeRandom();
        
        let contentsScript = `
        ${arrLinkStyle.join("\n")}
        ${arrScript.join("\n")}
        <script type="application/json" id="${dataInitServerId}">${JSON.stringify(objRecordInitClient)}</script>
        <script>
            const _scvDataInit = document.getElementById('${dataInitServerId}').textContent;
            _scvForm.initServer(JSON.parse(_scvDataInit));
            _scvForm.initClient();
        </script>`;

        RECORDS.form.addField({
            id: "custpage_form_script",
            type: "inlinehtml",
            label: "Form Script"
        }).defaultValue = contentsScript;
    }

    const getUrlWebWorkers = () =>{
        let enable = RECORDS?.webWorker?.enable ?? false;
        if(!enable) return null;

        let arrFileWorker = [];

        Object.keys(RECORDS.webWorker).forEach(webWorkerName => {
            if(webWorkerName == "enable") return;

            let fileName  = RECORDS.webWorker[webWorkerName].split("/").pop();

            arrFileWorker.push({
                name: webWorkerName,
                nameFile: fileName,
                pathFile: RECORDS.webWorker[webWorkerName],
                url: "",
            });
        });

        let arrFileName = arrFileWorker.map(e => e.nameFile);

        let arrUrlFile = query.runSuiteQL({
            query: `SELECT DISTINCT a.name, a.url, a.filetype, b.name as folder_name
            FROM file a,
                (SELECT id, name, appfolder
                    FROM MediaItemFolder
                    START WITH appfolder = '${constFile.getCurrentAppFolder()}'
                    CONNECT BY PRIOR id = parent) b
            WHERE a.folder = b.id
                AND a.isinactive = 'F'
                AND a.name IN ('${arrFileName.join("', '")}')
        `}).asMappedResults();

        let objRes = {};

        arrFileWorker.forEach(objFileWorker => {
            
            let objUrlFile = arrUrlFile.find(e => e.name == objFileWorker.nameFile && objFileWorker.pathFile.indexOf(`/${e.folder_name}/`) > -1);

            if(!!objUrlFile){
                objRes[objFileWorker.name] = objUrlFile.url;
            }
        });

        return objRes;
    }
    /**
     * 
     * @param {Object/Array} _webWorkerScripts : {scv_worker_script_name: "path/to/script.js"} Or [{scv_worker_script_name: "path/to/script.js"}]
     */
    const addWebWorker = (_webWorkerScripts) =>{
        RECORDS.webWorker.enable = true;

        if(util.isObject(_webWorkerScripts)){
            Object.keys(_webWorkerScripts).forEach(scriptName => {
                RECORDS.webWorker[scriptName] = _webWorkerScripts[scriptName];
            });
        }
        else if(util.isArray(_webWorkerScripts)){
            _webWorkerScripts.forEach(objWebWorkerScript => {
                Object.keys(objWebWorkerScript).forEach(scriptName => {
                    RECORDS.webWorker[scriptName] = _webWorkerScripts[scriptName];
                });
            });
        }
    }

    const enableChatBox = () =>{
        addLibaryInclude([
            "../css/scv_chatbox.css",
            "../scripts/scv_chatbox.js",
        ]);
    }

    const addLibaryInclude = (_arrLibary) => {
        RECORDS.LIBARY_INCLUDE = RECORDS.LIBARY_INCLUDE.concat(_arrLibary);
    }

    const writePage = () => {
        addCommonClientScript();

        writePageJqx();
        writePageDx();
        
        RECORDS.response.writePage(RECORDS.form);
    }

    const createForm = (_options, _clientScript, _optionUpdate = {}) => {
        let options = {};
        
        if(typeof(_options) == "string"){
            options = {title: _options};
        }
        else{
            options.title = _options.title || "";
            options.hideNavBar = _options.hideNavBar??false;
        }
        
        RECORDS.form = serverWidget.createForm(options);

        if(!!_clientScript){
            RECORDS.form.clientScriptModulePath = _clientScript;
        }

        let curScript = runtime.getCurrentScript();
        RECORDS.currentScript.id = curScript.id;
        RECORDS.currentScript.deploymentId = curScript.deploymentId;
        try{
            let curUserId = runtime.getCurrentUser().id;
            if(curUserId == -5) return;
            
            if(curUserId < 0){
                RECORDS.currentScript.url = url.resolveScript({
                    scriptId: RECORDS.currentScript.id,
                    deploymentId: RECORDS.currentScript.deploymentId,
                    returnExternalUrl: true
                })
            }
        }
        catch(err){
            log.error("ERROR: createForm-currentScript.external", err)
        }

        let optionUpdate = _optionUpdate||{};
        optionUpdate.pinHeaderSublist = _optionUpdate.pinHeaderSublist??false;
        optionUpdate.noWrapHeaderSublist = _optionUpdate.noWrapHeaderSublist??true;
        optionUpdate.noWrapLineSublist = _optionUpdate.noWrapLineSublist??false;

        if(optionUpdate.pinHeaderSublist){
            addPinHeaderSublist();
        }

        addNoWrapSubist(optionUpdate.noWrapHeaderSublist, optionUpdate.noWrapLineSublist)

        return RECORDS.form;
    }

    const addNoWrapSubist = (_rowHeader = true, _rowData = false) =>{
        let str_styleNoWrap = "";
        if(_rowHeader){
            str_styleNoWrap += ".uir-machine-headerrow{white-space: nowrap;} ";
        }
        if(_rowData){
            str_styleNoWrap += ".uir-machine-row, .uir-list-row-tr{white-space: nowrap;} ";
        }
        
        if(!str_styleNoWrap) return;

        RECORDS.form.addField({
            id: 'custpage_scv_nowrapsublist',
            label: 'Hidden',
            type: "inlinehtml"
        }).defaultValue = `<style>${str_styleNoWrap}</style>`;
    }

    const addPinHeaderSublist = () =>{
        RECORDS.form.addField({
            id: 'custpage_scv_pinheadersublist',
            label: 'Hidden',
            type: "inlinehtml"
        }).defaultValue = `<script>
                (function($) {
                    $(function() {
                        const tableContainer = $("div.uir-machine-table-container");
                        
                        tableContainer.css({"max-height": "70vh", "overflow-y": "auto"});
                        tableContainer.bind("scroll", function(event) {
                            $(event.target).find(".uir-machine-headerrow > td").css({
                                "transform": "translate(0, " + event.target.scrollTop + "px)",
                                "z-index": 1,
                                "position": "relative"
                            });
                        })
                        .bind("scroll", function(event) {
                            $(".machineButtonRow > table").css("transform", "translate(" + event.target.scrollLeft + "px)");
                        }); 
                    });
                })(jQuery);
            </script>`

    }

    const addFieldGroup = (_options) => {
		let objRes = RECORDS.form.addFieldGroup(_options);

        RECORDS.fieldGroup[_options.id] = {
            id: _options.id,
            group: objRes
        };

		return {id: _options.id, group: objRes};
	}

    const addTab = (_options) => {
        let objRes = RECORDS.form.addTab(_options);

        RECORDS.tab[_options.id] = {
            id: _options.id,
            tab: objRes
        };

        return {id: _options.id, tab: objRes};
    }

    const addSubTab = (_options) => {
        let objRes = RECORDS.form.addSubtab(_options);

        RECORDS.subTab[_options.id] = {
            id: _options.id,
            label: objRes
        };

        return {id: _options.id, subtab: objRes};
    }

    const addField = (_options, _isMandatory = false, _optionUpdate) =>{
        let field = RECORDS.form.addField(_options);
        field.isMandatory = _isMandatory;
        
        let optionUpdate = _optionUpdate||{};

        if(!!optionUpdate?.helpText){
            field.setHelpText(optionUpdate.helpText);
        }
        else{
            field.setHelpText(_options.label);
        }

        if(!!optionUpdate.displayType){
            field.updateDisplayType({
                displayType: optionUpdate.displayType
            });
        }

        if(!!optionUpdate.layoutType){
            field.updateLayoutType({
                layoutType: optionUpdate.layoutType
            });
        }

        if(!!optionUpdate.breakType){
            field.updateBreakType({
                breakType: optionUpdate.breakType
            });
        }

        if(!!optionUpdate.displaySize){
            field.updateDisplaySize(optionUpdate.displaySize);
        }

        if(["select", "multiselect"].includes(_options.type) && optionUpdate?.lookup?.data?.length > 0){
            let hasNull = _options.type == "select" ? true : false;
            constRecord.initLoadFieldServer(field, optionUpdate.lookup, hasNull);
        }

        field.defaultValue = optionUpdate?.defaultValue;

        RECORDS.field[_options.id] = {
            id: _options.id,
            layoutType: optionUpdate?.layoutType,
            displayType: optionUpdate?.displayType,
            breakType: optionUpdate?.breakType,
            field: field
        }

        return RECORDS.field[_options.id].field;
    }

    const getLastField = () =>{
        let arrFieldId = Object.values(RECORDS.field);
        return arrFieldId.length > 0 ? arrFieldId[arrFieldId.length - 1] : null;
    }

    const addSublist = (_options) =>{
        RECORDS.sublist[_options.id] = {
            id: _options.id,
            sublist: RECORDS.form.addSublist(_options),
            columns: []
        }

        return RECORDS.sublist[_options.id].sublist;
    }

    const addFieldOfSublist = (_sublistId, _columns) => {
        let sublist = RECORDS.sublist[_sublistId].sublist;
        let columns = RECORDS.sublist[_sublistId].columns;

        for(let i = 0; i< _columns.length; i++){
            let objCol = _columns[i];

            let field = sublist.addField({
                id : objCol.id,
                type : objCol.type||"textarea",
                source: objCol.source||null,
                label : objCol.label
            });

            field.updateDisplayType({displayType: objCol.displayType||"inline"});

            if(!!objCol.displaySize){
                field.updateDisplaySize(objCol.displaySize);
            }
            if(!!objCol.isDisabled) {
                field.updateDisplayType({displayType: "disabled"});
            }

            field.isMandatory = objCol.isMandatory ?? false;

            if(objCol?.lookup?.data?.length > 0){
                constRecord.initLoadFieldServer(field, objCol.lookup, true);
            }

            if(!!objCol.defaultValue){
                field.defaultValue = objCol.defaultValue;
            }

            columns.push({
                id: objCol.id,
                index: columns.length,
                field: field
            });
        }

        return columns;
    }

    const setDataOfSublist = (_sublistId, _arrData) =>{
        let sublist = RECORDS.sublist[_sublistId].sublist;
        let columns = RECORDS.sublist[_sublistId].columns;

        let hasInventoryDetail = hasFieldInventoryDetail(_sublistId);
        if(hasInventoryDetail){
            prepareDataInventoryDetail(_sublistId, _arrData);
        }

        for(let i = 0; i < _arrData.length; i++){
            let objRes = _arrData[i];

            for(let j = 0; j < columns.length; j++){
                let objColumn = columns[j];

                let colId = objColumn.id;

                let val_col = objRes[colId];

                if(lbf.isContainValue(val_col)){
                    sublist.setSublistValue({id: colId, line: i, value: val_col});
                }
            }
        }

        if(hasInventoryDetail){
            constInventoryDetail.saveDataStoreFileInventoryDetail();
        }
    }

    const getDataOfSublist = (_sublistId, _arrColumn, _condition = []) => {
        let arrResult = [];

        let request = RECORDS.request;

        let objCondition = {
            field: "", operator: "", value: ""
        }

        if(_condition.length > 0){
            objCondition.field = _condition[0];

            if(_condition.length == 1){
                objCondition.operator = "hasvalue";
                objCondition.value = "";
            }
            else if(_condition.length == 2){
                objCondition.operator = "==";
                objCondition.value = _condition[1];
            }
            else{
                objCondition.operator = _condition[1];
                objCondition.value = _condition[2];
            }
        }

        for (let i = 0; i < request.getLineCount(_sublistId); i++) {
            let objLine = {};

            if(!!objCondition.field){
                let valueColumn = request.getSublistValue(_sublistId, objCondition.field, i);

                if(!validationCondition(valueColumn, objCondition.operator, objCondition.value)){
                    continue;
                }
            }

            for(let j = 0; j < _arrColumn.length; j++){
                let objColumn = _arrColumn[j];
                let fieldId = typeof(objColumn) == "string" ? objColumn : objColumn.id;
                
                objLine[fieldId] = request.getSublistValue(_sublistId, fieldId, i);
                
                try{
                    let value_display = request.getSublistText(_sublistId, fieldId, i);
                    if(!!value_display){
                        objLine[fieldId + "_display"] = value_display;
                    }
                }
                catch(err){}
                
            }

            arrResult.push(objLine);
        }

        return arrResult;
    }

    const validationCondition = (_value, _operator, _valueCondition = "") =>{
        if(_operator == "hasvalue" && lbf.isContainValue(_value)){
            return true;
        }
        else if(_operator == "==" && _value == _valueCondition){
            return true;
        }

        return false;
    }

    const addPageLink = (_lstLink, isShowCurSuitelet = false) => {
		_lstLink = _lstLink||[];
		_lstLink = _lstLink.map(ele => {
			let objRes = {};
			if(typeof ele === 'object'){
				objRes.id = ele.id||"";
				objRes.name = ele.name||"";
				objRes.url = ele.url||"";
			}else{
				objRes.id = ele;
				objRes.name = "";
				objRes.url = "";
			}
			return objRes;
		})

        //#region Add link Translation for current Suitelet
        let curScript = runtime.getCurrentScript();

        _lstLink.push({
            id: "",
            url: "/app/site/hosting/scriptlet.nl?script=customscript_scv_sl_translate&deploy=customdeploy_scv_sl_translate&custpage_collection=" + curScript.id, 
            name: "Manage Translations Current"
        })
        //#endregion

		if(isShowCurSuitelet){
			_lstLink.push({id: curScript.deploymentId, name: "Script Depoyment Current"})
		}

		try{
			let arrLinkSavedSearch = _lstLink.filter(ele => ele.id.indexOf("customsearch") === 0 && !ele.name);
			if(arrLinkSavedSearch.length > 0){
				let resultSearch = search.create({
					type: "savedsearch",
					filters:
					[
						["formulanumeric: CASE WHEN {id} IN ('"+arrLinkSavedSearch.map(ele => ele.id).join("','")+"') THEN 1 ELSE 0 END","equalto","1"]
					],
					columns: ["title", "id"]
				});
				resultSearch = resultSearch.run().getRange(0, 100);
				for(let i = 0; i < resultSearch.length; i++){
					let id = resultSearch[i].getValue("id");
					
					let idxLink_find = _lstLink.findIndex(ele => ele.id == id && !ele.name);
					if(idxLink_find > -1){
						_lstLink[idxLink_find].name = resultSearch[i].getValue("title");
					}
				}
			}
		}catch(err){
			log.error("ERROR: TRY-CATCH: addPageLink.customsearch", err)
		}

		try{
			let arrLinkDeploy = _lstLink.filter(ele => ele.id.indexOf("customdeploy") === 0 
                && (!ele.internalid || !ele.name)
            );
			if(arrLinkDeploy.length > 0){
				let resultSearch = query.runSuiteQL({
					query: "SELECT title, scriptid, primarykey FROM scriptdeployment WHERE scriptid IN ('"+arrLinkDeploy.map(function(ele){ return ele.id}).join("','")+"')"
				});
				resultSearch = resultSearch.asMappedResults();
				for(let i = 0; i < resultSearch.length; i++){
					let id = resultSearch[i].scriptid;

					let idxLink_find = _lstLink.findIndex(ele => ele.id == id && (!ele.internalid || !ele.name));
					if(idxLink_find > -1){
						_lstLink[idxLink_find].name = !_lstLink[idxLink_find].name ? resultSearch[i].title : _lstLink[idxLink_find].name;
						_lstLink[idxLink_find].internalid = !_lstLink[idxLink_find].internalid ? resultSearch[i].primarykey : _lstLink[idxLink_find].internalid;
					}
				}
		}
		}catch(err){
			log.error("ERROR: TRY-CATCH: addPageLink.customdeploy", err)
		}
		
		for(let i = 0; i < _lstLink.length; i++){
			let urlPage = "";
			let linkId = _lstLink[i].id ?? "";
			if(linkId.indexOf("customsearch") === 0){
				urlPage = "/app/common/search/searchresults.nl?searchid=" + linkId;
			}
            else if(linkId.indexOf("custdataset") === 0){
				urlPage = "/app/common/report/dataset.nl?dataset=" + linkId;
			}
			else if(linkId.indexOf("customdeploy") === 0){
				urlPage = "/app/common/scripting/scriptrecord.nl?id=" + _lstLink[i].internalid;
			}else{
				urlPage = _lstLink[i].url;
			}
			RECORDS.form.addPageLink({type : "crosslink", title : _lstLink[i].name||linkId, url : urlPage})
		}
	}

    const addPageInitMessage = (_options) =>{
        let options = {};
        
        if(typeof(_options) == "string"){
            options = {
                type: message.Type.INFORMATION,
                message: _options,
                duration: -1
            };
        }
        else{
            options.type = _options.type??message.Type.INFORMATION;
            options.title = _options.title??"";
            options.message = _options.message??"";
            options.duration = _options.duration??(-1);
        }

        RECORDS.form.addPageInitMessage(options);

        return options;
    }

    const addSubmitButton = (_options, _optionUpdate) => {
        let objRes = RECORDS.form.addSubmitButton(_options);

        let optionUpdate = _optionUpdate||{};
        if(optionUpdate?.hideButton) {
            let randomCode = onGenCodeRandom();
            let htmlField = RECORDS.form.addField({
                id: 'custpage_hide_submitbtn_' + randomCode,
                label: "html",
                type: "INLINEHTML",
            });
            htmlField.defaultValue = onCreateScriptHideSubmitBtn();
        }

        return objRes;
    }

    // TODO: 260518 -> Chỉ ẩn nút submit trên UI, vẫn cho phép submit data bằng POST từ client
    const onCreateScriptHideSubmitBtn = () => {
        return `<script>
            hideSubmitButton();
            function hideSubmitButton() {
                var elSubmitter = document.getElementById('tbl_submitter')?.parentElement;
                if (elSubmitter) {
                    elSubmitter.style.display = 'none';
                    var nextEleSubmit = elSubmitter?.nextElementSibling;
                    if(nextEleSubmit) nextEleSubmit.style.display = 'none';
                }

                var interval = setInterval(function () {
                    var elSecondary = document.getElementById('tbl_secondarysubmitter')?.parentElement;
                    if (elSecondary) {
                        elSecondary.style.display = 'none';
                        var nextEleSecond = elSecondary?.nextElementSibling;
                        if(nextEleSecond) nextEleSecond.style.display = 'none';
                        clearInterval(interval);
                    }
                }, 500);
            }
        </script>`;
    }
    
    const addButton = (_options, _optionUpdate) => {
        let objRes = RECORDS.form.addButton(_options);

        let optionUpdate = _optionUpdate||{};

        if(!!optionUpdate.styleSubmit){
            addClassBtnSubmit(_options.id);
        }

        return objRes;
    }

    const removeButton = (_options) => {
        RECORDS.form.removeButton(_options);
    }

    const updateDefaultValues = (_options) => {
        RECORDS.form.updateDefaultValues(_options||{});
    }

    const addClassBtnSubmit = (btnId) => {
        let randomCode = onGenCodeRandom();
        let htmlField = RECORDS.form.addField({
            id: 'custpage_add_classlist_' + randomCode,
            label: "html",
            type: "INLINEHTML",
        });
        htmlField.defaultValue = `<script>
            var _scvPrefThemeNS = document.getElementsByTagName("body")[0]?.getAttribute("data-page-theme") || "";

            if(_scvPrefThemeNS == "redwood"){
                document.getElementById("${btnId}")?.setAttribute("data-button-type", "primary");
            }else{
                document.getElementById("tr_${btnId}")?.classList?.add('pgBntB');
            }
            
            addClassSubmitBtn_${randomCode}('${btnId}');

            function addClassSubmitBtn_${randomCode}(buttonId) {
                let btnSecond = document.getElementById('tr_secondary' + buttonId);
                if(!btnSecond) {
                    setTimeout(() => addClassSubmitBtn_${randomCode}(buttonId), 500);
                } else {
                    if(_scvPrefThemeNS == "redwood"){
                        document.getElementById("secondary${btnId}").setAttribute("data-button-type", "primary");
                    }else{
                        btnSecond.classList?.add('pgBntB');
                    }
                }
            }
        </script>`;
    }

    const onGenCodeRandom = () => {
        return "" + Math.round(Math.random()*1000) + ("" +Date.now());
    }

    //#region Inventory Detail
    const getSubmoduleInventoryDetail = () => {
        return constInventoryDetail;
    }

    const setMainKeyInventoryDetail = (_key) => {
        constInventoryDetail.setMainKey(_key);

        RECORDS.mainKeyInventoryDetail = _key;

        constInventoryDetail.initModulServer({
            file: file
        })
    }

    const addInventoryDetailOfSublist = (_sublistId, _fieldId, _optionUpdate) =>{
        let objInvDetail = RECORDS.inventorydetail.find(e => e.sublistId == _sublistId && e.fieldId == _fieldId);
        if(!!objInvDetail) return;

        let sublist = RECORDS.sublist[_sublistId].sublist;
        let columns = RECORDS.sublist[_sublistId].columns;

        RECORDS.inventorydetail.push({
            sublistId: _sublistId,
            fieldId: _fieldId,
            inventoryDetail: {
                type: _optionUpdate.type??"receipt",
                isEditable: _optionUpdate.isEditable??true,
            },
            relatedFieldId: {
                item: _optionUpdate.item ?? "custpage_col_item",
                quantity: _optionUpdate.quantity ?? "custpage_col_quantity",
                description: _optionUpdate.description ?? "custpage_col_description",
                unit: _optionUpdate.unit ?? "custpage_col_unit",
                location: _optionUpdate.location ?? "custpage_col_location"
            }
        });

        let objFieldsOfInvDetail = constInventoryDetail.getFieldsOfInventoryDetail(_fieldId);

        let arrFieldOfInvDetail = [
            {id: objFieldsOfInvDetail.store, label: "Inventory Detail Store", type: "text", displayType: "hidden"},
            {id: objFieldsOfInvDetail.needed, label: "Inventory Detail Needed", type: "checkbox", displayType: "hidden", defaultValue: "T"},
            {id: objFieldsOfInvDetail.available, label: "Inventory Detail Available", type: "checkbox", displayType: "hidden", defaultValue: "T"},
            {id: objFieldsOfInvDetail.lotno, label: "Inventory Detail Lot", type: "checkbox", displayType: "hidden", defaultValue: "T"}
        ];

        arrFieldOfInvDetail.forEach(_fieldInvDetail => {
            let fieldColumn = sublist.addField({
                id: _fieldInvDetail.id,
                type: _fieldInvDetail.type,
                label: _fieldInvDetail.label
            });
            if(!!_fieldInvDetail.displayType){
                fieldColumn.updateDisplayType({displayType: _fieldInvDetail.displayType||"inline"});
            }
            if(!!_fieldInvDetail.defaultValue){
                fieldColumn.defaultValue = _fieldInvDetail.defaultValue;
            }

            columns.push({
                id: _fieldInvDetail.id,
                index: columns.length,
                field: fieldColumn
            });
        })
    }

    const isFieldInventoryDetail = (_sublistId, _fieldId) => {
        let index = RECORDS.inventorydetail.findIndex(e => e.sublistId == _sublistId && e.fieldId == _fieldId);

        return index == -1 ? false : true;
    }

    const hasFieldInventoryDetail = (_sublistId) => {
        let index = RECORDS.inventorydetail.findIndex(e => e.sublistId == _sublistId);

        return index == -1 ? false : true;
    }

    const prepareDataInventoryDetail = (_sublistId, _arrData) => {
        constInventoryDetail.initModulServer({
            file: file,
        });

        let mainKeyInvDetail = constInventoryDetail.getMainKey();

        if(!mainKeyInvDetail){
            mainKeyInvDetail = constInventoryDetail.setMainKey();
            setMainKeyInventoryDetail(mainKeyInvDetail);
        }

        let arrDataStoreInvDetail = constInventoryDetail.loadDataStoreFileInventoryDetail();

        let objInventoryDetail = RECORDS.inventorydetail.find(e => e.sublistId == _sublistId);
        let fieldId = objInventoryDetail.fieldId;

        let storeFieldId = constInventoryDetail.getStoreFieldId(fieldId);
        let neededFieldId = constInventoryDetail.getNeededFieldId(fieldId);
        let availFieldId = constInventoryDetail.getAvailableFieldId(fieldId);
        let lotFieldId = constInventoryDetail.getLotNoFieldId(fieldId);
        let itemFieldId =  objInventoryDetail.relatedFieldId.item;

        _arrData.forEach(objRes => {
            let storeValue = objRes[storeFieldId];
            if(!!storeValue){
                let objResInvDetail = arrDataStoreInvDetail.find(e => e.key == storeValue);
                if(!!objResInvDetail){
                    objRes.inventorydetail = objResInvDetail.data;
                }
            }
            
            if(!objRes.inventorydetail){
                setCurrentInventoryDetailSublist(_sublistId, objRes);
            }

            if(!storeValue){
                storeValue = constInventoryDetail.setStoreInventoryDetail(objRes.inventorydetail, false);
            }

            let isLotItem = constInventoryDetail.isLotItem(objRes[itemFieldId], false);
            let isAvail = constInventoryDetail.hasInventoryDetailItem(objRes[itemFieldId], false);
            let isNeeded = objRes.inventorydetail.inventoryassignment.length >  0 ? "F" : "T";
            
            objRes[storeFieldId] = storeValue;
            objRes[neededFieldId] = isNeeded;
            objRes[availFieldId] = isAvail;
            objRes[lotFieldId] = isLotItem;
        });

        return mainKeyInvDetail;
    }

    const setCurrentInventoryDetailSublist = (_sublistId, _objResLine, _data) =>{
        let objInventoryDetail = RECORDS.inventorydetail.find(e => e.sublistId == _sublistId);
        let fieldId = objInventoryDetail.fieldId;

        let inventorydetail = _objResLine.inventorydetail;
        if(!inventorydetail){
            inventorydetail = constInventoryDetail.formatDataInventoryDetail(_objResLine?.inventorydetail);
        }

        let itemFieldId =  objInventoryDetail.relatedFieldId.item;
        let quantityFieldId =  objInventoryDetail.relatedFieldId.quantity;
        let locationFieldId =  objInventoryDetail.relatedFieldId.location;

        inventorydetail.custpage_item = _objResLine[itemFieldId];
        inventorydetail.custpage_quantity = _objResLine[quantityFieldId];
        inventorydetail.custpage_location = _objResLine[locationFieldId];

        inventorydetail.item = _objResLine[itemFieldId];
        inventorydetail.quantity = _objResLine[quantityFieldId];
        inventorydetail.location = _objResLine[locationFieldId];

        if(!!_data){
            if(util.isObject(_data)){
                let objResAssignment = {};
                Object.keys(_data).forEach(key => {
                    if(key.indexOf("custpage_") == 0){
                        objResAssignment[key] = _data[key];
                    }
                    else{
                        objResAssignment["custpage_" + key] = _data[key];
                    }
                });
                inventorydetail.inventoryassignment.push(objResAssignment);
            }
            else if(util.isArray(_data)){
                let arrResAssignment = [];

                _data.forEach(dataLine =>{
                    let objResAssignment = {};

                    Object.keys(dataLine).forEach(key => {
                        if(key.indexOf("custpage_") == 0){
                            objResAssignment[key] = dataLine[key];
                        }
                        else{
                            objResAssignment["custpage_" + key] = dataLine[key];
                        }
                    });

                    arrResAssignment.push(objResAssignment);
                })

                inventorydetail.inventoryassignment = inventorydetail.inventoryassignment.concat(arrResAssignment);
            }
            
        }

        _objResLine.inventorydetail = inventorydetail;
    }

    const getCurrentInventoryDetailSublist = (_sublistId, _objResLine) =>{
        let objInventoryDetail = RECORDS.inventorydetail.find(e => e.sublistId == _sublistId);
        let fieldId = objInventoryDetail.fieldId;
        
        return _objResLine.inventorydetail;
    }

    const mappedResultsInventoryDetail = (_arrResLine = [], _inventoryDetailFieldId = "") => {
        constInventoryDetail.mappedResults(_arrResLine, _inventoryDetailFieldId);
        return _arrResLine;
    }
    //#endregion

    //#region JQX Modul
    const writePageJqx = () => {
        let arrJqxAll = Object.values(RECORDS.jqx);
        if(arrJqxAll.length == 0) return;

        constJQX.setSuiteType(constFile.getCurrentAppFolder());

        let arrJqxSplitter = arrJqxAll.filter(e => e.type == "splitter");
        let arrJqx = arrJqxAll.filter(e => e.type != "splitter");

        let arrContentsJqx = [];

        let arrTab = alasql(`SELECT tab, count(1) as count_use FROM ? GROUP BY tab HAVING count(1) > 1`, [arrJqx]);
        arrTab.forEach((objTab, index) => {
            let arrJqx_filter = arrJqx.filter(e => e.tab == objTab.tab);

            let arrJqxOfTab = [];
            for(let i = 0; i < arrJqx_filter.length; i++){
                let objJqx = arrJqx_filter[i];

                let optionJqx = objJqx.optionsJqx||{};

                let objJqxOfTab = {
                    width: "100%",
                    source: objJqx.source,
                    columns: objJqx.columns,
                    id: objJqx.id,
                    type: objJqx.type,
                    label: objJqx.label,
                    ...optionJqx
                };
                

                arrJqxOfTab.push(objJqxOfTab);
            }

            let objJqxSplitter = arrJqxSplitter.find(e => e.tab == objTab.tab);
            if(!!objJqxSplitter){
                let objTemplateSplitter = constJQX.getTemplateSplitter(objJqxSplitter, arrJqxOfTab);
                objTemplateSplitter.container = objTab.tab;
                arrContentsJqx.push(objTemplateSplitter);
            }
            else{
                let objTemplateTab = constJQX.getTemplateContentWithTab(objTab.tab, arrJqxOfTab);
                objTemplateTab.container = objTab.tab;
                arrContentsJqx.push(objTemplateTab);
            }
        });

        arrJqx.forEach((objJqx, index) => {
            let idxJqxRenderedOfTab = arrTab.findIndex(e => e.tab == objJqx.tab);
            if(idxJqxRenderedOfTab > -1) return;

            let optionJqx = objJqx.optionsJqx||{};

            if(objJqx.type == "grid"){
                let objTemplateGrid = constJQX.getTemplateGrid(objJqx.id, {
                    source: objJqx.source,
                    columns: objJqx.columns,
                    id: objJqx.id,
                    type: objJqx.type,
                    label: objJqx.label,
                    ...optionJqx
                });
                objTemplateGrid.container = objJqx.tab;
                arrContentsJqx.push(objTemplateGrid);
            }
            else if(objJqx.type == "treegrid"){
                let objTemplateTreeGrid = constJQX.getTemplateTreeGrid(objJqx.id, {
                    source: objJqx.source,
                    columns: objJqx.columns,
                    id: objJqx.id,
                    type: objJqx.type,
                    label: objJqx.label,
                    ...optionJqx
                });
                objTemplateTreeGrid.container = objJqx.tab;
                arrContentsJqx.push(objTemplateTreeGrid);
            }
            else if(objJqx.type == "chart"){
                let objTemplateChart = constJQX.getTemplateChart(objJqx.id, {
                    source: objJqx.source,
                    id: objJqx.id,
                    type: objJqx.type,
                    label: objJqx.label,
                    ...optionJqx
                });
                objTemplateChart.container = objJqx.tab;
                arrContentsJqx.push(objTemplateChart);
            }
        });

        let libaryLink = arrContentsJqx.map(e => e.libaryLink).join("\n");
        let scriptJSON = arrContentsJqx.map(e => e.scriptJSON).join("\n");
        let scriptInit = arrContentsJqx.map(e => e.scriptInit).join("\n");

        addField({
            id: 'custpage_scv_jqx_scripts', label: 'JQX Scripts', 
            type: "inlinehtml"
        }, false, {
            defaultValue: `
            ${libaryLink}
            ${scriptJSON}
            <script>jQuery(document).ready(function () {${scriptInit}});</script>`
        });

        arrContentsJqx.forEach((objContent, index) => {
            addField({
                id: 'custpage_scv_jqx_' + index, label: 'JQX', 
                type: "inlinehtml", container: objContent.container
            }, false, {
                defaultValue: objContent.html
            });
        });
    }

    const addGridJqx = (_options) =>{
        let tabId = _options.tab;
        if(!tabId){
            if(!RECORDS.tab["tab_result"]){
                tabId = "tab_result";
                addTab({id: tabId, label: "Result"});
            }
            else{
                tabId = "tab_result";
            }
        }

        let jqxId = _options.id||("jqx" + _options.type);

        RECORDS.jqx[jqxId] = {
            id: jqxId,
            type: _options.type,
            label: _options.label,
            tab: tabId,
            columns: [],
            source: {
                datatype: "json",
                datafields: [],
                localdata: _options.data||[]
            },
            optionsJqx: {
                _scv: {}
            }
        };

        setOptionsJqx(jqxId, _options.optionsJqx||{});
        addColumnGridJqx(jqxId, _options.columns||[]);

        return RECORDS.jqx[_options.id];
    }

    const setOptionsJqx = (_jqxId, _options) => {
        Object.keys(_options).forEach(key => {
            RECORDS.jqx[_jqxId].optionsJqx[key] = _options[key];
        });

        return RECORDS.jqx[_jqxId].optionsJqx;
    }

    const addColumnGridJqx = (_jqxId, _addColumns) =>{
        let columns = RECORDS.jqx[_jqxId].columns;
        let datafields = RECORDS.jqx[_jqxId].source.datafields;

        for(let i = 0; i < _addColumns.length; i++){
            let objAddColumn = _addColumns[i];

            let objColumnExist = columns.find(ele => ele.datafield == objAddColumn.datafield);
            if(!objColumnExist){
                objAddColumn.align = objAddColumn.align??"center";
                objAddColumn.cellsalign = objAddColumn.cellsalign??"left";
                
                if(objAddColumn.columntype == "number"){
                    objAddColumn.cellsalign = objAddColumn.cellsalign??"right";
                }
                else if(["checkbox", "combobox"].includes(objAddColumn.columntype)){
                    objAddColumn.cellsalign = objAddColumn.cellsalign??"center";
                }

                columns.push({...objAddColumn});

                datafields.push({name: objAddColumn.datafield});
            }
        }

        return RECORDS.jqx[_jqxId].columns;
    }

    const setDataJqx = (_jqxId, _arrData) => {
        let source = RECORDS.jqx[_jqxId].source;
        source.localdata = source.localdata.concat(_arrData);

        return source;
    }

    const getDataJqx = (_jqxId) => {
        return RECORDS.jqx[_jqxId].source.localdata;
    }

    const addSplitterJqx = (_options = {}) =>{
        let jqxId = _options.id||("jqxSplitter");

        RECORDS.jqx[jqxId] = {
            id: jqxId,
            type: "splitter",
            tab: _options.tab,
            optionsJqx: {}
        };

        setOptionsJqx(jqxId, _options.optionsJqx||{});
        
        return RECORDS.jqx[_options.id];
    }

    const addChartJqx = (_options) =>{
        let tabId = _options.tab;
        if(!tabId){
            if(!RECORDS.tab["tab_result"]){
                tabId = "tab_result";
                addTab({id: tabId, label: "Result"});
            }
            else{
                tabId = "tab_result";
            }
        }

        let jqxId = _options.id||("jqx" + _options.type);

        RECORDS.jqx[jqxId] = {
            id: jqxId,
            type: "chart",
            label: _options.label,
            tab: tabId,
            source: {
                datatype: "json",
                datafields: _options.datafields||[],
                localdata: _options.data||[]
            },
            optionsJqx: {}
        };

        setOptionsJqx(jqxId, _options.optionsJqx||{});

        return RECORDS.jqx[_options.id];
    }

    const addMarkAllButtonsJqx = (_jqxId, _options) => {
        RECORDS.jqx[_jqxId].optionsJqx._scv = RECORDS.jqx[_jqxId].optionsJqx._scv||{};

        let options = {};
        if(typeof(_options) == "string"){
            options.dataField = _options;
        }
        else{
            options = _options||{};
        }
        options.id = _dxId;
        options.enabled = options.enabled??true;
        options.textMarkAll = options.textMarkAll??'Mark All';
        options.textUnmarkAll = options.textUnmarkAll??'Unmark All';
        options.markFilters = options.markFilters??false;
        options.dataField = options.dataField??'is_check';

        RECORDS.jqx[_jqxId].optionsJqx._scv.markAllButtons = options;
    }

    const getSubmoduleJqx = () => {
        return constJQX;
    }
    //#endregion
    
    //#region Dx Modul
    const writePageDx = () => {
        let arrDxAll = Object.values(RECORDS.dx);
        if(arrDxAll.length == 0) return;

        constDX.setSuiteType(constFile.getCurrentAppFolder());

        let arrDxSplitter = arrDxAll.filter(e => e.type == "splitter");
        let arrDx = arrDxAll.filter(e => e.type != "splitter");

        let arrContentsDx = [];

        let arrTab = alasql(`SELECT tab, count(1) as count_use FROM ? GROUP BY tab HAVING count(1) > 1`, [arrDx]);

        arrTab.forEach((objTab, index) => {
            let arrDx_filter = arrDx.filter(e => e.tab == objTab.tab);

            let arrDxOfTab = [];
            for(let i = 0; i < arrDx_filter.length; i++){
                let objDx = arrDx_filter[i];

                let optionDx = objDx.optionsDx||{};

                let objDxOfTab = {
                    width: "100%",
                    source: objDx.source,
                    columns: objDx.columns || [],
                    fields: objDx.fields || [],
                    id: objDx.id,
                    type: objDx.type,
                    label: objDx.label,
                    ...optionDx
                };

                arrDxOfTab.push(objDxOfTab);
            }

            let objDxSplitter = arrDxSplitter.find(e => e.tab == objTab.tab);
            if(!!objDxSplitter){
                let objTemplateSplitter = constDX.getTemplateSplitter(objDxSplitter, arrDxOfTab);
                objTemplateSplitter.container = objTab.tab;
                arrContentsDx.push(objTemplateSplitter);
            }
            else{
                let objTemplateTab = constDX.getTemplateContentWithTab(objTab.tab, arrDxOfTab);
                objTemplateTab.container = objTab.tab;
                arrContentsDx.push(objTemplateTab);
            }
        });

        arrDx.forEach((objDx, index) => {
            let idxDxRenderedOfTab = arrTab.findIndex(e => e.tab == objDx.tab);
            if(idxDxRenderedOfTab > -1) return;

            let optionsDx = objDx.optionsDx||{};

            if(objDx.type == "grid"){
                let objTemplateGrid = constDX.getTemplateGrid(objDx.id, {
                    source: objDx.source,
                    columns: objDx.columns,
                    id: objDx.id,
                    type: objDx.type,
                    label: objDx.label,
                    ...optionsDx
                });
                objTemplateGrid.container = objDx.tab;
                arrContentsDx.push(objTemplateGrid);
            }
            else if(objDx.type == "treegrid"){
                let objTemplateTreeGrid = constDX.getTemplateTreeGrid(objDx.id, {
                    source: objDx.source,
                    columns: objDx.columns,
                    id: objDx.id,
                    type: objDx.type,
                    label: objDx.label,
                    ...optionsDx
                });
                objTemplateTreeGrid.container = objDx.tab;
                arrContentsDx.push(objTemplateTreeGrid);
            }
            else if(objDx.type == "pivotgrid"){
                let objTemplatePivotGrid = constDX.getTemplatePivotGrid(objDx.id, {
                    source: objDx.source,
                    fields: objDx.fields,
                    id: objDx.id,
                    type: objDx.type,
                    label: objDx.label,
                    ...optionsDx
                });
                objTemplatePivotGrid.container = objDx.tab;
                arrContentsDx.push(objTemplatePivotGrid);
            }
            else if(objDx.type == "filemanager"){
                let objTemplateFileManager = constDX.getTemplateFileManager(objDx.id, {
                    source: objDx.source,
                    columns: objDx.columns,
                    id: objDx.id,
                    type: objDx.type,
                    label: objDx.label,
                    ...optionsDx
                });
                objTemplateFileManager.container = objDx.tab;
                arrContentsDx.push(objTemplateFileManager);
            }
        });
        
        let libaryLink = arrContentsDx.map(e => e.libaryLink).join("\n");
        let scriptJSON = arrContentsDx.map(e => e.scriptJSON).join("\n");
        let scriptInit = arrContentsDx.map(e => e.scriptInit).join("\n");

        addField({
            id: 'custpage_scv_dx_scripts', label: 'DX Scripts', 
            type: "inlinehtml"
        }, false, {
            defaultValue: `
            ${libaryLink}
            ${scriptJSON}
            <script>jQuery(document).ready(function () {${scriptInit}});</script>`
        });

        arrContentsDx.forEach((objContent, index) => {
            addField({
                id: 'custpage_scv_dx_' + index, label: 'DX', 
                type: "inlinehtml", container: objContent.container
            }, false, {
                defaultValue: objContent.html
            });
        });
    }
    
    const addGridDx = (_options) =>{
        let tabId = _options.tab;
        if(!tabId){
            if(!RECORDS.tab["tab_result"]){
                tabId = "tab_result";
                addTab({id: tabId, label: "Result"});
            }
            else{
                tabId = "tab_result";
            }
        }

        let dxId = _options.id||("dx" + _options.type);

        RECORDS.dx[dxId] = {
            id: dxId,
            type: _options.type,
            label: _options.label,
            tab: tabId,
            columns: [],
            fields: [],//pivotgrid
            source: {
                store: _options.data || [],
                reshapeOnPush: true,
            },
            optionsDx: {
                _scv: {}
            }
        };

        setOptionsDx(dxId, _options.optionsDx||{});
        addColumnGridDx(dxId, _options.columns||[]);
        addFieldGridDx(dxId, _options.fields||[]);

        return RECORDS.dx[_options.id];
    }

    const setOptionsDx = (_dxId, _options) => {
        Object.keys(_options).forEach(key => {
            RECORDS.dx[_dxId].optionsDx[key] = _options[key];
        });

        return RECORDS.dx[_dxId].optionsDx;
    }

    const addColumnGridDx = (_dxId, _addColumns) =>{
        let columns = RECORDS.dx[_dxId].columns;

        for(let i = 0; i < _addColumns.length; i++){
            let objAddColumn = _addColumns[i];

            let objColumnExist = columns.find(ele => ele.dataField == objAddColumn.dataField);
            if(!!objColumnExist && !!objColumnExist.dataField) continue;

            columns.push({...objAddColumn});
        }

        return RECORDS.dx[_dxId].columns;
    }

    const addFieldGridDx = (_dxId, _addFields) =>{
        let fields = RECORDS.dx[_dxId].fields;

        for(let i = 0; i < _addFields.length; i++){
            let objAddField = _addFields[i];

            let objColumnExist = fields.find(ele => ele.dataField == objAddField.dataField);
            if(!!objColumnExist && !!objColumnExist.dataField) continue;

            fields.push({...objAddField});
        }

        return RECORDS.dx[_dxId].fields;
    }

    const addSplitterDx = (_options = {}) =>{
        let dxId = _options.id||("dxSplitter");

        RECORDS.dx[dxId] = {
            id: dxId,
            type: "splitter",
            tab: _options.tab||"tab_result",
            optionsDx: {}
        };

        setOptionsDx(dxId, _options.optionsDx||{});
        
        return RECORDS.dx[_options.id];
    }

    const setDataDx = (_dxId, _arrData) => {
        let source = RECORDS.dx[_dxId].source;
        source.store = source.store.concat(_arrData);

        return source;
    }

    const getDataDx = (_dxId) => {
        return RECORDS.dx[_dxId].source.store;
    }

    const addMarkAllButtonsDx = (_dxId, _options) => {
        RECORDS.dx[_dxId].optionsDx._scv = RECORDS.dx[_dxId].optionsDx._scv||{};

        let options = {};
        if(typeof(_options) == "string"){
            options.dataField = _options;
        }
        else{
            options = _options||{};
        }
        options.id = _dxId;
        options.enabled = options.enabled??true;
        options.textMarkAll = options.textMarkAll??'Mark All';
        options.textUnmarkAll = options.textUnmarkAll??'Unmark All';
        options.markFilters = options.markFilters??false;
        options.dataField = options.dataField??'is_check';

        RECORDS.dx[_dxId].optionsDx._scv.markAllButtons = options;
    }

    const getSubmoduleDx = () => {
        return constDX;
    }
    //#endregion

    return {
		ID,
		TYPE,
		RECORDS,
        createForm,
        addTab,
        addFieldGroup,
        addSubTab,
        addField,
        getLastField,
        addSublist,
        addFieldOfSublist,
        setDataOfSublist,
        getDataOfSublist,
        addPageLink,
        setContext,
        setRequest,
        setResponse,
        write,
        writePage,
		getForm,
        setForm,
        setServiceScript,
        addPageInitMessage,
        addSubmitButton,
        addButton,
        removeButton,
        updateDefaultValues,
        addLibaryInclude,
        addCommonClientScript,
        addWebWorker,
        enableChatBox,

        getSubmoduleInventoryDetail,
        setMainKeyInventoryDetail,
        prepareDataInventoryDetail,
        addInventoryDetailOfSublist,
        setCurrentInventoryDetailSublist,
        getCurrentInventoryDetailSublist,
        mappedResultsInventoryDetail,

        getSubmoduleJqx,
        addGridJqx,
        setOptionsJqx,
        addColumnGridJqx,
        setDataJqx,
        getDataJqx,
        addSplitterJqx,
        addChartJqx,
        addMarkAllButtonsJqx,

        getSubmoduleDx,
        addGridDx,
        setOptionsDx,
        addColumnGridDx,
        addFieldGridDx,
        setDataDx,
        getDataDx,
        addSplitterDx,
        addMarkAllButtonsDx,
    };
    
});
