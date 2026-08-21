/**
 * Nội dung: 
 * Version: 1.251027.8
 * =======================================================================================
 *  Date                Author                  Description
 *  28 Mar 2025         Huy Pham                Init & create file
 */
const _scvInventoryDetail = {
    currentScript: {
		id: "",
        deploymentId: "",
        url: ``
    },
    serviceScript:{
		id: "",
        deploymentId: "",
        url: ``
    },
    lstInfoMappingDetail: [],
	mainKey: "",
    pageInitParentInventoryDetailSublist: function(_action, _sublistId, _fieldId, _mappingFieldPopup, _isEdit = true){
		let curRec = _scvForm.currentRecord;

		this.addInforMappingDetail(_sublistId, _fieldId, _mappingFieldPopup, _isEdit);
		
		let idxColInventoryDetail = this.getIndexColumnInventoryDetail(_sublistId, _fieldId);
		let isRedwood = document.body.getAttribute("data-page-theme") == "redwood";
		let helperButtonClass = isRedwood ? "uir-helper-button uir-no-link " : "";
		
		for(let i = 0; i < curRec.getLineCount(_sublistId); i++) {
			let isAvail = curRec.getSublistValue(_sublistId, this.getAvailableFieldId(_fieldId), i);
			if(!isAvail) continue;

			let row = document.getElementById(_sublistId + 'row' + i);
			let cellsDisplay = row.querySelectorAll('td');
			
			let neededId = this.getNeededIconId(_sublistId, i);
			let setId = this.getSetIconId(_sublistId, i);
			let removedId = this.getRemoveIconId(_sublistId, i);

			cellsDisplay[idxColInventoryDetail].innerHTML  = `
			<span class="always-visible field_widget_boxpos uir-summary-field-helper" style="left: 0px;">
				<span id="${neededId}" class="${helperButtonClass}smalltextul i_inventorydetailneeded" title="Set" style="visibility: inherit; cursor: pointer;"></span>
				<span id="${setId}" class="${helperButtonClass}smalltextul i_inventorydetailset" title="Edit" style="visibility: inherit; cursor: pointer;"></span>
				<span id="${removedId}">
					<a data-helperbuttontype="" class="smalltextul " title="Delete" href="#" style="" aria-label="Delete" role="button">
						<img src="/images/forms/icon_remove_row_default.png" alt="Delete" border="0" style="margin-left: 5px; position: relative; top:2px;">
					</a>
				</span>
			</span>`;

			document.getElementById(neededId).addEventListener("click", function(e){
				_scvInventoryDetail.openPopupInventoryDetail(_action, _sublistId, _fieldId, i, _mappingFieldPopup, _isEdit);
			});
			document.getElementById(setId).addEventListener("click", function(e){
				_scvInventoryDetail.openPopupInventoryDetail(_action, _sublistId, _fieldId, i, _mappingFieldPopup, _isEdit);
			});
			document.getElementById(removedId).addEventListener("click", function(e){
				_scvInventoryDetail.removeDataInventoryDetail(_sublistId, _fieldId, i);
			});

			setTimeout(() => {this.enableLineInventoryDetail(_sublistId, _fieldId, i);}, 100);
			
		}
	},
    addInforMappingDetail: function(_sublistId, _fieldId, _mappingFieldPopup, _isEdit = true){
		let objInforMappingDetail = {..._mappingFieldPopup};
		objInforMappingDetail.sublistId = _sublistId;
		objInforMappingDetail.inventoryDetailFieldId = _fieldId;
		objInforMappingDetail.isEdit = _isEdit;

		this.lstInfoMappingDetail.push(objInforMappingDetail);
	},
    getNeededIconId: function (_sublistId, _line){
		return "scv_" + _sublistId + "_inventorydetail_needed_" + _line;
	},
	getSetIconId: function (_sublistId, _line){
		return "scv_" + _sublistId + "_inventorydetail_set_" + _line;
	},
	getRemoveIconId: function (_sublistId, _line){
		return "scv_" + _sublistId + "_inventorydetail_remove_" + _line;
	},
	getNeededFieldId: function (_inventoryDetailFieldId){
		return _inventoryDetailFieldId + "needed";
	},
	getAvailableFieldId: function (_inventoryDetailFieldId){
		return _inventoryDetailFieldId + "avail";
	},
	getLotNoFieldId: function (_inventoryDetailFieldId) {
		return _inventoryDetailFieldId + "lotno";
	},
	getStoreFieldId: function(_inventoryDetailFieldId){
		return _inventoryDetailFieldId + "store";
	},
    enableLineInventoryDetail: async function (_sublistId, _fieldId, _line){
        let curRec = _scvForm.currentRecord;
		
		let isEdit = true;
		let quantity = 0, inventoryDetailQuantity = 0;
		let keyStore = curRec.getSublistValue(_sublistId, this.getStoreFieldId(_fieldId), _line);
		if(!!keyStore){
			let objInventoryDetailStore = this.getDataStoreInventoryClientSide(keyStore);
			if(!!objInventoryDetailStore){
				inventoryDetailQuantity = (objInventoryDetailStore.quantity || objInventoryDetailStore.custpage_quantity) * 1;
			}
		}
		
		let objInfoMappingDetail = this.lstInfoMappingDetail.find(e => e.sublistId == _sublistId);
		if(!!objInfoMappingDetail){
			quantity = curRec.getSublistValue(_sublistId, objInfoMappingDetail.quantity, _line) * 1;
			isEdit = objInfoMappingDetail.isEdit;
		}

		let isNeeded = curRec.getSublistValue(_sublistId, this.getNeededFieldId(_fieldId), _line);
		
		if(isNeeded){
			jQuery("#" + this.getNeededIconId(_sublistId, _line)).show();
			jQuery("#" + this.getSetIconId(_sublistId, _line)).hide();
			jQuery("#" + this.getRemoveIconId(_sublistId, _line)).hide();
		}
		else{
			jQuery("#" + this.getNeededIconId(_sublistId, _line)).hide();
			jQuery("#" + this.getSetIconId(_sublistId, _line)).show();
			jQuery("#" + this.getRemoveIconId(_sublistId, _line)).show();
			if(quantity != inventoryDetailQuantity){
				jQuery("#" + this.getNeededIconId(_sublistId, _line)).show();
				jQuery("#" + this.getSetIconId(_sublistId, _line)).hide();
			}
		}

		if(!isEdit){
			jQuery("#" + this.getRemoveIconId(_sublistId, _line)).hide();
		}

	},
    getIndexColumnInventoryDetail: function (_sublistId, _fieldId){
		let lstFieldSublist = _scvForm.sublists.find(e => e.id == _sublistId).columns;

		return lstFieldSublist.findIndex(e => e.id == _fieldId);
	},
    getDataStoreInventoryClientSide: function (_keyStore){
		if(!_keyStore) return this.formatDataInventoryDetail();
		
		let resResult = {};

		jQuery.ajax({
			type: "post", 
			url: this.serviceScript.url, 
			dataType: "json", 
			async: false, 
			data: {
				action: "getStoreInventoryDetail",
				mainKey: this.mainKey,
				keyStore: _keyStore
			}
		}).done(function (response) {
			resResult = {...response};
		})

		return resResult.data;
	},
	setDataStoreInventoryClientSide: function(_dataStore){
		let resResult = {};

		jQuery.ajax({
			type: "post", 
			url: this.serviceScript.url,
			dataType: "json", 
			async: false, 
			data: {
				action: "setStoreInventoryDetail",
				mainKey: this.mainKey,
				dataStore: JSON.stringify(_dataStore)
			}
		}).done(function (response) {
			resResult = {...response};
		})

		return resResult.data;
	},
    formatDataInventoryDetail: function(_objRes){
		_objRes = _objRes??{};
		_objRes.custpage_item = _objRes.custpage_item??"";
		_objRes.custpage_quantity = _objRes.custpage_quantity??0;
		_objRes.custpage_location = _objRes.custpage_location??"";
		_objRes.inventoryassignment = _objRes.inventoryassignment??[];

		return _objRes;
	},
    openPopupInventoryDetail: function(_action, _sublistId, _fieldId, _line, _fieldParams, _isEdit = true){
        let curRec = _scvForm.currentRecord;

		let objParams = {
			action_type: _action,
			sublistid: _sublistId,
			fieldid: _fieldId,
			line: _line,
			keystore: curRec.getSublistValue(_sublistId, this.getStoreFieldId(_fieldId), _line)??"",
			item: !!_fieldParams.item ? (curRec.getSublistValue(_sublistId, _fieldParams.item, _line)??"") : "",
			quantity: !!_fieldParams.quantity ? (curRec.getSublistValue(_sublistId, _fieldParams.quantity, _line)??0) : 0,
			location: !!_fieldParams.location ? (curRec.getSublistValue(_sublistId, _fieldParams.location, _line)??curRec.getValue(_fieldParams.location)??"") : "",
			conversionrate: !!_fieldParams.conversionrate ? (curRec.getSublistValue(_sublistId, _fieldParams.conversionrate, _line)??curRec.getValue(_fieldParams.conversionrate)??1) : 1,
			isedit: _isEdit ? "T" : "F"
		};

		if(!objParams.location){
			alert("Chọn Location trước.");

			return;
		}

		let urlPopup = this.currentScript.url;
        Object.keys(objParams).forEach(key => {
            urlPopup += `&${key}=${objParams[key]}`;
        });

		urlPopup += `&mainKey=${this.mainKey}`;

		let popupWidth = window.innerWidth - 700;
		let popupHeight = window.innerHeight - 300;

		if(popupWidth < 400){
			popupWidth = window.innerWidth;
		}
		if(popupHeight > 1200){
			popupHeight = 1000;
		}

		return nlExtOpenWindow(urlPopup, 'inventorydetail', popupWidth, popupHeight, this, true,'Inventory Detail');
	},
    removeDataInventoryDetail: function(_sublistId, _fieldId, _line){
		let isEdit = true;
		let objInfoMappingDetail = this.lstInfoMappingDetail.find(e => e.sublistId == _sublistId);
		if(!!objInfoMappingDetail){
			isEdit = objInfoMappingDetail.isEdit;
		}

		if(isEdit){
			nlapiSetLineItemValue(_sublistId, this.getStoreFieldId(_fieldId), _line + 1, "");
			nlapiSetLineItemValue(_sublistId, this.getNeededFieldId(_fieldId), _line + 1, "T");
		}

		this.enableLineInventoryDetail(_sublistId, _fieldId, _line);
	},
    getSublistValueInventoryDetail: function(_sublistId, _fieldId, _line){
		let objRes = _scvForm.currentRecord.getSublistValue(_sublistId, getStoreFieldId(_fieldId), _line);
		if(!objRes) return this.formatDataInventoryDetail(null);

		return this.formatDataInventoryDetail(JSON.parse(objRes));
	},
    validateLine: function(_sublistId, _fieldId, _line, _acceptZero = false){
        let curRec = _scvForm.currentRecord;

		let objInfoMappingDetail = this.lstInfoMappingDetail.find(e => e.sublistId == _sublistId);
		if(!objInfoMappingDetail) return false;
		
		let isAvail = curRec.getSublistValue(_sublistId, this.getAvailableFieldId(objInfoMappingDetail.inventoryDetailFieldId), _line);
		if(!isAvail) return true;

		let quantity_field = curRec.getSublistField(_sublistId, objInfoMappingDetail.quantity, _line);
		let quantity = curRec.getSublistValue(_sublistId, objInfoMappingDetail.quantity, _line) * 1;
		if(_acceptZero && quantity == 0) return true;
		
		if(quantity == 0){
			alert(`Kiểm tra lại thông tin ${quantity_field.label} ở dòng ${_line + 1} phải khác 0 (zero)`);
			return false;
		}
		
		let keyStore = curRec.getSublistValue(_sublistId, this.getStoreFieldId(objInfoMappingDetail.inventoryDetailFieldId), _line);
		let objInventoryDetail = this.getDataStoreInventoryClientSide(keyStore);
		if(!objInventoryDetail){
			alert(`Kiểm tra lại thông tin inventory detail ở dòng ${_line + 1} chưa đúng`);
			return false;
		}

		if(objInventoryDetail.quantity != quantity){
			let msg_err = `Kiểm tra lại thông tin inventory detail ở dòng ${_line + 1} chưa đúng:\n`;
			msg_err += `{${quantity_field.label}} = ${quantity};\n`
			msg_err += `{Quantity Inventory Detail} = ${objInventoryDetail.quantity}`;
			alert(msg_err);
			return false;
		}

		return true;
	},
    validateField: function(scriptContext){
		let curRec = scriptContext.currentRecord;
		let sublistId = scriptContext.sublistId;
		let fieldId = scriptContext.fieldId;
		let line = scriptContext.line;
		
		let objInfoMappingDetail = this.lstInfoMappingDetail.find(e => e.sublistId == sublistId);
		if(!objInfoMappingDetail) return true;

		let isAvail = curRec.getCurrentSublistValue(sublistId, this.getAvailableFieldId(objInfoMappingDetail.inventoryDetailFieldId));
		if(!isAvail) return true;
		
		if([objInfoMappingDetail.item, objInfoMappingDetail.location].includes(fieldId)){
			this.removeDataInventoryDetail(curRec, sublistId, objInfoMappingDetail.inventoryDetailFieldId, line);
		}
		else if(fieldId == objInfoMappingDetail.quantity){
			
			let isNeeded = curRec.getCurrentSublistValue(sublistId, this.getNeededFieldId(objInfoMappingDetail.inventoryDetailFieldId));
			if(isNeeded){
				return true;
			}

			this.enableLineInventoryDetail(curRec, sublistId, objInfoMappingDetail.inventoryDetailFieldId, line)

			/* if(confirm("clear inventory detail")){
				removeDataInventoryDetail(curRec, sublistId, objInfoMappingDetail.inventoryDetailFieldId, line);
				return true;
			}else{
				return false;
			} */
		}

		return true;
	},
	callBackPageInit: function(scriptContext){},
	callBackFieldChange: function(scriptContext){},
	callBackCancel: function(scriptContext){},
	callBackSubmitResult: function(scriptContext){},
	callBackSubmitResultCompleted: function(scriptContext){},
};

function _scvCallBackPageInit(scriptContext){
	_scvInventoryDetail.callBackPageInit(scriptContext);
}

function _scvCallBackFieldChange(scriptContext){
	_scvInventoryDetail.callBackFieldChange(scriptContext);
}

function _scvCallBackCancel(scriptContext){
	_scvInventoryDetail.callBackCancel(scriptContext);
}

function _scvCallBackSubmitResult(scriptContext){
	_scvInventoryDetail.callBackSubmitResult(scriptContext);
}

function _scvCallBackSubmitResult_Completed(scriptContext){
	let sublistId = scriptContext.parentSublistId;
	let fieldId = scriptContext.parentFieldId;
	let line = scriptContext.parentLine;

	_scvInventoryDetail.enableLineInventoryDetail(sublistId, fieldId, line);
	_scvInventoryDetail.callBackSubmitResultCompleted(scriptContext);
}