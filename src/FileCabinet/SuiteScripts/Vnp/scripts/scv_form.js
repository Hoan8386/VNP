/**
 * Nội dung: 
 * Version: 1.260605.22
 * =======================================================================================
 *  Date                Author                  Description
 *  17 Mar 2025         Huy Pham                Init & create file
 */
const _scvForm = {
    currentScript: {
        id: "",
        deploymentId: "",
        url: ""
    },
    serviceScript:{
        id: "",
        deploymentId: "",
        url: ""
    },
    currentRecord: null,
    fields: [],
    sublists: [],
    mainKeyInventoryDetail: "",
    infoInventoryDetail: [],
    webWorker: {},
    modul: {
        inventoryDetail: null,
    },
    initServer: function(_dataRecord) {
        if(!!_dataRecord.currentScript.id){
            this.currentScript.id = _dataRecord.currentScript.id;
            this.currentScript.deploymentId = _dataRecord.currentScript.deploymentId;
            if(!!_dataRecord.currentScript.url){
                this.currentScript.url = _dataRecord.currentScript.url;
            }
            else{
                this.currentScript.url = `/app/site/hosting/scriptlet.nl?script=${_dataRecord.currentScript.id}&deploy=${_dataRecord.currentScript.deploymentId}`;
            }
        }
        if(!!_dataRecord.serviceScript.id){
            this.serviceScript.id = _dataRecord.serviceScript.id;
            this.serviceScript.deploymentId = _dataRecord.serviceScript.deploymentId;
            if(!!_dataRecord.serviceScript.url){
                this.serviceScript.url = _dataRecord.serviceScript.url;
            }
            else{
                this.serviceScript.url = `/app/site/hosting/scriptlet.nl?script=${_dataRecord.serviceScript.id}&deploy=${_dataRecord.serviceScript.deploymentId}`;
            }
        }
        
        this.fields = _dataRecord.fields||[];
        this.sublists = _dataRecord.sublists||[];
        this.mainKeyInventoryDetail = _dataRecord.mainKeyInventoryDetail||"";
        this.infoInventoryDetail = _dataRecord.infoInventoryDetail||[];
        this.webWorker = _dataRecord.webWorker || {};

        require(['N'], function(N) {
            for(let n in N){
                _scvForm.modul[n] = N[n];
            };
            _scvForm.currentRecord = N.currentRecord.get();
        })            
    },
    initClient: function() {
        if(!NS.form.isInited()){
            setTimeout(() => {this.initClient()}, 100);
            return;
        }
        //TO-DO: function chạy sau pageInit
        window._scvForm = window._scvForm ?? _scvForm;
        this.initInventoryDetail();
    },
    initInventoryDetail: function () {
        if(this.infoInventoryDetail.length == 0 || typeof(_scvInventoryDetail) == "undefined") return;

        _scvInventoryDetail.mainKey = this.mainKeyInventoryDetail;

        let objFirstInventoryDetail = this.infoInventoryDetail[0];

        _scvInventoryDetail.currentScript = {...objFirstInventoryDetail.currentScript};
        _scvInventoryDetail.currentScript.url = `/app/site/hosting/scriptlet.nl?script=${objFirstInventoryDetail.currentScript.id}&deploy=${objFirstInventoryDetail.currentScript.deploymentId}`;
        
        _scvInventoryDetail.serviceScript = {...objFirstInventoryDetail.serviceScript};
        _scvInventoryDetail.serviceScript.url = `/app/site/hosting/scriptlet.nl?script=${objFirstInventoryDetail.serviceScript.id}&deploy=${objFirstInventoryDetail.serviceScript.deploymentId}`;
        
        for(let i = 0; i <this.infoInventoryDetail.length; i++){
            let infoInventoryDetail = this.infoInventoryDetail[i];
            let relatedFieldId = infoInventoryDetail.relatedFieldId;

            let mappingFieldPopup = {
                item: relatedFieldId.item,
                quantity: relatedFieldId.quantity,
                description: relatedFieldId.description,
                unit: relatedFieldId.unit,
                unit_display: relatedFieldId.unit,
                location: relatedFieldId.location,
            }
            
            if(!!infoInventoryDetail.sublistId){
                let type = infoInventoryDetail?.inventoryDetail?.type??"receipt";
                let sublistId = infoInventoryDetail.sublistId;
                let fieldId = infoInventoryDetail.fieldId;
                let isEditable = infoInventoryDetail?.inventoryDetail?.isEditable??true;
                _scvInventoryDetail.pageInitParentInventoryDetailSublist(type, sublistId, fieldId, mappingFieldPopup, isEditable);
            }
        }
    },
    getParameter: function() {
        let arrFields = this.fields;

        let objParams = {};
        
        arrFields.forEach(objField =>{
            if(objField.type == "select"){
                objParams[objField.id] = nlapiGetFieldValue(objField.id)?.toString();
                objParams[objField.id + "_display"] = nlapiGetFieldText(objField.id);
            }
            else if(objField.type == "multiselect"){
                objParams[objField.id] = nlapiGetFieldValues(objField.id)?.toString();
                objParams[objField.id + "_display"] = nlapiGetFieldTexts(objField.id)?.join("||");
            }
            else if(["checkbox", "date"].includes(objField.type)){
                objParams[objField.id] = nlapiGetFieldValue(objField.id);
            }
            else if(["inlinehtml"].includes(objField.type)){
                
            }
            else{
                objParams[objField.id] = nlapiGetFieldValue(objField.id);
            }
        });

        return objParams;
    },
    getUrlParams: function() {
        let objParams = {};
        let queryString = window.location.search.substring(1);
        const regex = /([^&=]+)=([^&]*)/g;
        let match;
        while (match = regex.exec(queryString)) {
            objParams[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
        }
        return objParams;
    },
    setDisabledSublistField: function(_sublistId, _fields, _val = true) {
        for(let i = 1; i <= nlapiGetLineItemCount(_sublistId); i++){ 
            _fields.forEach(fieldId => nlapiSetLineItemDisabled(_sublistId, fieldId, _val, i));
        };
    },
    validateFieldMandatory: function (lstFields){
        let isValid = true;

        let curRec = this.currentRecord;
		for(let i = 0; i < lstFields.length; i++){
			let infoField = curRec.getField(lstFields[i]);
			if(!infoField) continue;
			
			if(infoField.isMandatory == true){
				let valueField = curRec.getValue(lstFields[i]);
				if(infoField.type == "multiselect"){
					if(valueField.length > 0 && !this.isContainValue(valueField[0])){
						isValid = false;
						alert("Please enter value(s) for: " + infoField.label);
						break;
					}
				}
				if(!this.isContainValue(valueField)){
					isValid = false;
					alert("Please enter value(s) for: " + infoField.label);
					break;
				}
			}
		}

		return isValid;
    },
    isContainValue: function (value) {
		let isContain = false;
		if(value != undefined && value != null && value !== '') {
			if(util.isArray(value)) {
				if(value.length > 0) {
					isContain = true;
				}
			} else {
				isContain = true;
			}
		}
		return isContain;
	},
    showLoadingDialog: function (isShow) {
		let progessElement = "";
		if(isShow) {
			let container = document.getElementById("pageContainer") || document.getElementById("outerwrapper");
			if(!container) return console.error("Not found ElementId");

			let mainLoader = document.createElement('div');
			mainLoader.classList.add("scvMainLoader");
			mainLoader.innerHTML = '<span class="scvLoader"></span><span id="idxProgessStatus" class="scvProgessStatus">Processing...</span>';
			
			container.appendChild(mainLoader);
			progessElement = document.querySelector(".scvProgessStatus");
		} else {
			let mainLoader = document.querySelector(".scvMainLoader");
			if(mainLoader) mainLoader.remove();
		}
		return progessElement;
	},
    delay: function (ms) {
		return new Promise(function (resolve) {
			setTimeout(resolve, ms);
		});
	},
    updateProgessStatus: function(_msg){
		jQuery("#idxProgessStatus").html(_msg);
		jQuery(".scvProgessStatus").html(_msg);
	},
    showMsgError: function (_msg, _duration = 10000) {
        let N_Message = _scvForm.modul.ui.message;

		let infoMsg = N_Message.create({
			title: "Error",
			message: _msg||"Error",
			type: N_Message.Type.ERROR
		}).show({duration: _duration});

		return infoMsg;
	},
    showMsgInfo: function (_msg, _duration = 10000) {
        let N_Message = _scvForm.modul.ui.message;

		let infoMsg = N_Message.create({
			title: "Information",
			message: _msg||"Information",
			type: N_Message.Type.INFORMATION
		}).show({duration: _duration});

		return infoMsg;
	},
    ajax: {
        request: function (_method, _urlReq, _isAsync, _params,
            _callbackSucc = function(_res, _paramsCallback){}, 
            _callbackErr = function(_request, _status, _error, _paramsCallback){})
        {
            let resResult = {};
    
            jQuery.ajax({type: _method, url: _urlReq, dataType: "json", async: _isAsync, data: {..._params}
            }).done(function (response) {
                resResult = {...response};
                if(typeof _callbackSucc == "function"){
                    _callbackSucc(resResult, _params);
                }
            }).fail(function(request, status, error){
                if(typeof _callbackErr == "function"){
                    let msgErr = `${_params.action}: ` + (error.message||status);
                    _scvForm.showMsgError(msgErr)
                    _callbackErr(request, status, {
                        message: error||(new DOMParser().parseFromString(request.responseText, "text/html")?.querySelector(".uir-error-page--message")?.textContent??request.responseText)
                    }, _params);
                }
            });
    
            return resResult;
        },
        post: function(_urlReq, _params, 
            _callbackSucc = function(_res, _paramsCallback){}, 
            _callbackErr = function(_request, _status, _error, _paramsCallback){}
        ){
            let resResult = _scvForm.ajax.request("post", _urlReq, false, _params, _callbackSucc, _callbackErr);
    
            return resResult;
        },
        postWaitQueue: async function(_urlReq, _arrReqAction, _idxExcute = 0, 
            _callbackCompletedMulti =  function(_res){}, 
            _callbackSucc = function(_res, _paramsCallback){}, 
            _callbackErr = function(_request, _status, _error, _paramsCallback){}
        ){
            if(_arrReqAction.length == 0 || _idxExcute >= _arrReqAction.length || _idxExcute < 0){
                if(typeof _callbackCompletedMulti == "function"){
                    _callbackCompletedMulti(_arrReqAction);
                }
    
                return;
            }
    
            let objReqAction = _arrReqAction[_idxExcute];

            if(!!objReqAction?.params){
                objReqAction.params.action = objReqAction.action;
            }
            else{
                objReqAction.params = {...objReqAction}
            }
            
            let nextExcute = _idxExcute + 1;
            _scvForm.ajax.postAsync(_urlReq, objReqAction.params, function(_res, _paramsCallback){
                objReqAction.data = _res.data;
    
                if(typeof _callbackSucc == "function"){
                    _callbackSucc(_res, _paramsCallback);
                }
    
                _scvForm.ajax.postWaitQueue(_urlReq, _arrReqAction, nextExcute, _callbackCompletedMulti,_callbackSucc, _callbackErr);
            }, function(request, status, error){
                objReqAction.data = _res.data;
    
                if(typeof _callbackErr == "function"){
                    _callbackErr(request, status, error, objReqAction.params);
                }
    
                _scvForm.ajax.postWaitQueue(_urlReq, _arrReqAction, nextExcute, _callbackCompletedMulti, _callbackSucc, _callbackErr);
            })
        },
        postAsync: async function (_urlReq, _params, 
            _callbackSucc = function(_res, _paramsCallback){}, 
            _callbackErr = function(_request, _status, _error, _paramsCallback){}
        ){
            _scvForm.ajax.request("post", _urlReq, true, _params, _callbackSucc, _callbackErr);
        },
        postAsyncMulti: async function (_urlReq, _arrReqAction, 
            _callbackCompletedMulti =  function(_res){}, 
            _callbackSucc = function(_res, _paramsCallback){}, 
            _callbackErr = function(_request, _status, _error, _paramsCallback){})
        {
            if(_arrReqAction.length == 0){
                if(typeof _callbackCompletedMulti == "function"){
                    _callbackCompletedMulti(_arrReqAction);
                }
            }
            let cntCallData = 0;
            _arrReqAction.forEach(objAction => {
                let paramsFunc = objAction.params ?? objAction;
                paramsFunc.action = objAction.action ?? paramsFunc.action;
    
                _scvForm.ajax.postAsync(_urlReq, paramsFunc, function(_res, _paramsCallback){
                    cntCallData++;
    
                    if(typeof _callbackSucc == "function"){
                        _callbackSucc(_res, _paramsCallback);
                    }
    
                    objAction.data = _res.data;
    
                    _scvForm.updateProgessStatus("Processing step: " + cntCallData + "/" + _arrReqAction.length);
    
                    if(cntCallData < _arrReqAction.length) return;
    
                    if(typeof _callbackCompletedMulti == "function"){
                        _callbackCompletedMulti(_arrReqAction);
                    }
                }, function(request, status, error, _paramsCallback){
                    cntCallData++;
    
                    if(typeof _callbackErr == "function"){
                        _callbackErr(request, status, error, _paramsCallback);
                    }
    
                    if(cntCallData < _arrReqAction.length) return;
    
                    if(typeof _callbackCompletedMulti == "function"){
                        _callbackCompletedMulti(_arrReqAction);
                    }
                })
            });
        },
        postAsyncMultiFetchSSPage: async function (_urlReq, _arrReqAction, 
            _callbackCompletedMulti =  function(_res){}, 
            _callbackSucc = function(_res, _paramsCallback){}, 
            _callbackErr = function(_request, _status, _error, _paramsCallback){}, 
            _isExcuteFullPage = false, 
            _cntCallData = 0,
            _arrReqActionPage = []
        )
        {
            if(_arrReqAction.length == 0){
                if(typeof _callbackCompletedMulti == "function"){
                    _callbackCompletedMulti(_arrReqAction);
                }
            }
            let cntCallData = _cntCallData||0;
            let arrReqActionPage = [..._arrReqActionPage];
    
            let countExcuted = 0, concurrencyExcute = 10, countExcutedSuccess = 0;
            
            _arrReqAction.forEach(objAction => {
                if(objAction.isSuccess || objAction.isExcuted) {
                    //cntCallData++;
                    return;
                };
                _scvForm.updateProgessStatus("Processing step: " + cntCallData + "/" + _arrReqAction.length);
                let paramsFunc = objAction.params;
                paramsFunc.action = objAction.action;
                paramsFunc.page = Number(paramsFunc.page||0);
                paramsFunc.rangePageFetch = Number(paramsFunc.rangePageFetch||1);
    
                if(countExcuted >= concurrencyExcute){
                    return;
                }else{
                    objAction.isExcuted = true;
                    countExcuted++;
                }
    
                _scvForm.ajax.postAsync(_urlReq, paramsFunc, function(_res, _paramsCallback){
                    cntCallData++;
    
                    if(typeof _callbackSucc == "function"){
                        _callbackSucc(_res, _paramsCallback);
                    }
    
                    objAction.data = _res.data;
                    objAction.isSuccess = true;
                    let info = _res.data.info || {};
                    let page = Number(info.page||0);
                    let ttlPage = Number(info.ttlPage||1);
                    let rangePageFetch = Number(info.rangePageFetch||1);
                    
                    if(page < (ttlPage - 1) && !_isExcuteFullPage){//rule chỉ lấy lượng call page 1 lần duy nhất
                        for(let idxPage = (page + 1); idxPage < ttlPage; (idxPage += rangePageFetch)){
                            let paramFetchPage = {..._paramsCallback};
                            paramFetchPage.page = idxPage;
                            arrReqActionPage.push({
                                action: _paramsCallback.action, 
                                params: paramFetchPage, 
                                data: []
                            })
                        }
                    }
    
                    _scvForm.updateProgessStatus("Processing step: " + cntCallData + "/" + _arrReqAction.length);
    
                    countExcutedSuccess++;
                    if(countExcutedSuccess >= concurrencyExcute && cntCallData < _arrReqAction.length){
                        _scvForm.ajax.postAsyncMultiFetchSSPage(_urlReq, _arrReqAction, _callbackCompletedMulti, _callbackSucc, _callbackErr, _isExcuteFullPage, cntCallData, arrReqActionPage);
                        return;
                    }
    
                    if(cntCallData < _arrReqAction.length) return;
    
                    if(arrReqActionPage.length > 0 && !_isExcuteFullPage){
                        _arrReqAction = _arrReqAction.concat(arrReqActionPage);
                        _scvForm.updateProgessStatus("Processing step: " + cntCallData + "/" + _arrReqAction.length);
                        _scvForm.ajax.postAsyncMultiFetchSSPage(_urlReq, _arrReqAction, _callbackCompletedMulti, _callbackSucc, _callbackErr, true, cntCallData, []);
                        return;
                    }
                    if(typeof _callbackCompletedMulti == "function"){
                        _callbackCompletedMulti(_arrReqAction);
                    }
                }, function(request, status, error, _paramsCallback){
                    cntCallData++;
                    if(typeof _callbackErr == "function"){
                        console.log("error params", _paramsCallback)
                        _callbackErr(request, status, error, _paramsCallback);
                    }
    
                    if(cntCallData < _arrReqAction.length) return;
    
                    if(typeof _callbackCompletedMulti == "function"){
                        _callbackCompletedMulti(_arrReqAction);
                    }
                })
            });
        },
    },
    getResultActionPage: function(_arrReqAction, _action){
        let arrResult = [];

        let arrResultPage = _arrReqAction.filter(e => e.action == _action);
        arrResultPage.forEach(_objData => {
            arrResult = arrResult.concat(util.isArray(_objData.data.arrResult) ? _objData.data.arrResult : _objData.data)
        });

        return arrResult;
    },
    uuidv4: function (){
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	},
    uuidv7: function () {
        // Lấy thời gian hiện tại (milliseconds since Unix epoch)
        const now = Date.now();

        // 48-bit timestamp (theo spec UUIDv7)
        const timeHigh = (now / 0x100000000) >>> 0; // upper 16 bits
        const timeLow = now >>> 0; // lower 32 bits

        // 74 bits ngẫu nhiên còn lại
        const rand = crypto.getRandomValues(new Uint8Array(10));

        // Tạo mảng 16 byte (128 bit)
        const bytes = new Uint8Array(16);

        // Ghi timestamp (48 bit) vào bytes[0..5]
        bytes[0] = (timeHigh >>> 8) & 0xff;
        bytes[1] = timeHigh & 0xff;
        bytes[2] = (timeLow >>> 24) & 0xff;
        bytes[3] = (timeLow >>> 16) & 0xff;
        bytes[4] = (timeLow >>> 8) & 0xff;
        bytes[5] = timeLow & 0xff;

        // Ghi 10 byte random còn lại
        bytes.set(rand, 6);

        // Gắn version (v7)
        bytes[6] = (bytes[6] & 0x0f) | 0x70;

        // Gắn variant (RFC 4122)
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        // Chuyển thành chuỗi UUID dạng hex
        const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
        return (
            hex.substring(0, 8) + '-' +
            hex.substring(8, 12) + '-' +
            hex.substring(12, 16) + '-' +
            hex.substring(16, 20) + '-' +
            hex.substring(20)
        );
    },
    openPopupAttachFile: function(_options){
        let custpage_recordtype = "transaction";
        let custpage_recordid = "";
        let custpage_folder = "";

        if(typeof(_options) == "object"){
            custpage_recordtype = _options?.custpage_recordtype || "transaction";
            custpage_recordid = _options?.custpage_recordid || "";
            custpage_folder = _options?.custpage_folder || "";
        }
        else{
            custpage_recordid = _options;
        }

        let urlScript = `/app/site/hosting/scriptlet.nl?script=customscript_scv_sl_attachfile&deploy=customdeploy_scv_sl_attachfile`;
        urlScript += `&custpage_recordtype=` + custpage_recordtype;
        urlScript += `&custpage_recordid=` + custpage_recordid;
        urlScript += `&custpage_folder=` + custpage_folder;
        urlScript += `&isPopup=T`;

        nlExtOpenWindow(urlScript, 'popupAttachFile', window.innerWidth - 500, window.innerHeight - 400, this, true, "Attach File");
    },
    initReadyEditor: function(_fieldId) {
        let editor = document.getElementById(_fieldId);
        if (!editor) return;

        editor.addEventListener('keydown', function (e) {
            if (e.key != 'Tab') return;
            e.preventDefault();

            let start = this.selectionStart;
            let end = this.selectionEnd;

            // chèn 4 space (hoặc '\t')
            let tab = '    ';
            this.value = this.value.substring(0, start) + tab + this.value.substring(end);
            this.selectionStart = this.selectionEnd = start + tab.length;
        });
    }
};