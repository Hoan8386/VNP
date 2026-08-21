/**
 * Nội dung: 
 * Version: 1.260330.11
 * =======================================================================================
 *  Date                Author                  Description
 *  08 Apr 2024         Huy Pham                Init & create file
 */
define(['N/search'],
function(search) {
	const ID = "";

	const RECORDS = {}

	const createSearchWithFilter = (_records, _filters) => {
		_records.type = _records.type||_records.searchType;
		let resultSearch = search.create(_records);
		let myFilters = resultSearch.filters;

		if(util.isArray(_filters)){
			_filters.forEach(_objFilter => myFilters.push(_objFilter));
		}
		else if(util.isObject(_filters) || typeof(_filters) == "object"){
			myFilters.push(_filters)
		}
		
		return resultSearch;
	}

	const loadSearchWithFilter = (_options, _filters, _records) =>{
		let options = {id: ""};
		if(typeof(_options) == "string"){
			options.id = _options
		}
		else if(typeof(_options) == "object"){
			if(!!_options.id){
				options.id = _options.id;
			}
			if(!!_options.type){
				options.type = _options.type;
			}
		}

		let resultSearch = null;
		try{
			resultSearch = search.load(options);
		}catch(err){
			if(!!_records){
				let filters = _records.filters ?? [];
                filters.forEach(objFilter => {
                    if(!!objFilter.summarytype && !objFilter.summary){
                        objFilter.summary = objFilter.summarytype;
                    }
                });

                let columns = _records.columns ?? [];
                columns.forEach(objColumn => {
                    if(!!objColumn.summarytype && !objColumn.summary){
                        objColumn.summary = objColumn.summarytype;
                    }
                    if(!!objColumn.sortdir && !objColumn.sort){
                        objColumn.sort = objColumn.sortdir;
                    }
                });
				search.create(_records).save();

				resultSearch = search.load(options);
			}
		}
		let myFilters = resultSearch.filters;

		if(util.isArray(_filters)){
			_filters.forEach(_objFilter => myFilters.push(_objFilter));
		}
		else if(util.isObject(_filters) || typeof(_filters) == "object"){
			myFilters.push(_filters)
		}
		
		return resultSearch;
	}

	/**
	 * 
	 * @param {Object} _resultSearchFullPage : search obbject
	 * @param {Object} _params : page, rangePageFetch
	 * @param {function} _funcObjectMappingColumn : 
	 * @returns 
	 */
	const fetchResultSearchPage = (_resultSearchFullPage, _params, _funcObjectMappingColumn) =>{
		_params.rangePageFetch = Number(_params.rangePageFetch||1);
		_params.page = Number(_params.page||0);

		let arrResult = []
		let myColumns = _resultSearchFullPage.searchDefinition.columns;
		let ttlPage = _resultSearchFullPage.pageRanges.length;
		let idxPageFetched = _params.page;
		let maxPageFetch = _params.page + _params.rangePageFetch;
		for(let i = _params.page; i < _resultSearchFullPage.pageRanges.length; i++){
			if(i >= maxPageFetch){
				break;
			}
			idxPageFetched = i;
			let currentPage = _resultSearchFullPage.fetch({index : (i)}).data;
			for(var idx = 0; idx < currentPage.length; idx++){
				var objCurPage = currentPage[idx];
				var objRes = _funcObjectMappingColumn(objCurPage, myColumns);

				arrResult.push(objRes);
			}
		}

		return {arrResult: arrResult, info: {page: idxPageFetched, ttlPage: ttlPage, rangePageFetch: _params.rangePageFetch}};
	}

	const fetchResultSearchAllPage = (_resultSearchFullPage, _funcObjectMappingColumn) =>{
		let myColumns = _resultSearchFullPage.searchDefinition.columns;
		let arrResult = [];
		for(var idxPage = 0; idxPage < _resultSearchFullPage.pageRanges.length; idxPage++){
			var currentPage = _resultSearchFullPage.fetch({index : idxPage}).data;
			for(var i = 0; i < currentPage.length; i++){
				let objCurPage = currentPage[i];

				let objRes = _funcObjectMappingColumn(objCurPage, myColumns);

				arrResult.push(objRes);
			}
		}

		return arrResult;
	}

	const fetchResultSearchRun = (_resultSearch, _funcObjectMappingColumn) =>{
		let myColumns = _resultSearch.columns;
		let resultSearch = _resultSearch.run().getRange(0, 1000);
		let arrResult = [];
		for(var i = 0; i < resultSearch.length; i++){
			let objCurPage = resultSearch[i];

			let objRes = _funcObjectMappingColumn(objCurPage, myColumns);

			arrResult.push(objRes);
		}

		return arrResult;
	}

	const fetchResultSearchRunEach = (_resultSearch, _funcObjectMappingColumn) =>{
		let myColumns = _resultSearch.columns;
		let arrResult = [];

		_resultSearch.run().each(function(objCurPage){
			let objRes = _funcObjectMappingColumn(objCurPage, myColumns);
			arrResult.push(objRes);
			return true;
		});
		
		return arrResult;
	}

	const replaceValueNoneByKey = (_objRes, _arrKey = []) =>{
		if(_arrKey.length == 0){
			_arrKey = Object.keys(_objRes);
		}

		for(let i = 0; i < _arrKey.length; i++){
			let keyId = _arrKey[i];
			if(!keyId) continue;

			if(!!_objRes[keyId] &&  typeof(_objRes[keyId]) == "string"){
				_objRes[keyId] = _objRes[keyId].replace("- None -", "")
			}
		}
	}

	const getObjResultFromSearchByKey = (_objSearch, _myColumns, _arrKey) =>{
		let objRes = {};

		for(let i = 0; i < _arrKey.length; i++){
			let keyId = _arrKey[i];
			if(!keyId) continue;

			objRes[keyId] = _objSearch.getValue(_myColumns[i]);

			var temp_display = _objSearch.getText(_myColumns[i]);
			if(isContainValue(temp_display)){
				objRes[keyId + "_display"] = temp_display;
			}
		}
		
		return objRes;
	}

	const getObjResultFromSearchWithLabel = (_objSearch, _myColumns) =>{
		let arrColKey = getDataKeyByColumnSearch(_myColumns);

		let objRes = getObjResultFromSearchByKey(_objSearch, _myColumns, arrColKey);
		
		return objRes;
	}

	const getObjResultFromSearchWithLabel_V2 = (_objSearch, _myColumns) =>{
		let arrColKey = getDataKeyByColumnSearch_V2(_myColumns);

		let objRes = getObjResultFromSearchByKey(_objSearch, _myColumns, arrColKey);
		
		return objRes;
	}

	const getDataKeyByColumnSearch = (_myColumns) =>{
		let arrColKey = [];

		for(let i = 0; i < _myColumns.length; i++){
			let eleColumn = _myColumns[i];

			let keyName = eleColumn.label || "";

			if(!keyName){
				if(!!eleColumn.join){
					keyName = eleColumn.join + "_";
				}

				keyName += eleColumn.name
			}

			let keyId = formatStringToKeyID(keyName);

			let idxColKey_find = arrColKey.findIndex(_key => _key == keyId);
			if(idxColKey_find == -1){
				arrColKey.push(keyId)
			}else{
				keyId = keyId + "_" + i;
				arrColKey.push(keyId)
			}
		}

		return arrColKey;
	}

	const getDataKeyByColumnSearch_V2 = (_myColumns) =>{
		let arrColKey = [];

		for(let i = 0; i < _myColumns.length; i++){
			let eleColumn = _myColumns[i];

			let keyName = eleColumn.label || "";

			if(!keyName){
				if(!!eleColumn.join){
					keyName = eleColumn.join + "_";
				}

				keyName += eleColumn.name
			}

			let keyId = formatStringToKeyID_V2(keyName);

			let idxColKey_find = arrColKey.findIndex(_key => _key == keyId);
			if(idxColKey_find == -1){
				arrColKey.push(keyId)
			}else{
				keyId = keyId + "_" + i;
				arrColKey.push(keyId)
			}
		}

		return arrColKey;
	}

	const getDataLookupFields = (_type, _id, _columns) =>{
		let arrColumns = [];
		if(util.isArray(_columns)){
			arrColumns = _columns;
		}else{
			arrColumns.push(_columns)
		}

		let objRes = {};
		if(!!_id){
			objRes = search.lookupFields({type: _type, id: _id, columns: arrColumns});
		}

		return objRes;
	}

	function isContainValue(value) {
		var isContain = false;
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
	}

	const formatStringToKeyID = (_strInput) => {
		return removeAccents(_strInput.toLowerCase().replaceAll(" ","")/* .replace(/[^a-zA-Z0-9 ]/g, '') */)
	}

	/**
	 * 
	 * Ex:
	 * console.log(slugify("ă â ơ ô ố"));               // "a_a_o_o_o"
	 * console.log(slugify("SCV Support!@#"));          // "scv_support"
	 * console.log(slugify("ABC Support    XYZ"));      // "abc_support_xyz"
	 * console.log(slugify("8-% Support"));             // "_8_support"
	 * console.log(slugify("Hệ_thống!!!vận_hành"));     // "he_thong_van_hanh"
	 */
	const formatStringToKeyID_V2 = (_strInput) => {
		return removeAccents(_strInput).normalize("NFD") // tách dấu ra khỏi ký tự
			.replace(/[\u0300-\u036f]/g, "") // loại bỏ dấu tiếng Việt
			.replace(/[^a-zA-Z0-9\s_]+/g, "_") // thay cụm ký tự đặc biệt liên tục bằng 1 dấu _
			.replace(/\s+/g, "_") // thay khoảng trắng liên tục thành _
			.replace(/_+/g, "_") // gộp nhiều dấu _ liên tiếp thành 1
			.replace(/^_+/, "") // xóa dấu _ ở đầu (nếu có)
			.replace(/_+$/, "") // xóa dấu _ ở cuối (nếu có)
			.toLowerCase()
			.replace(/^(\d)/, "_$1");
	}

	function removeAccents(str) {
		var AccentsMap = [
			"aàảãáạăằẳẵắặâầẩẫấậ",
			"AÀẢÃÁẠĂẰẲẴẮẶÂẦẨẪẤẬ",
			"dđ", "DĐ",
			"eèẻẽéẹêềểễếệ",
			"EÈẺẼÉẸÊỀỂỄẾỆ",
			"iìỉĩíị",
			"IÌỈĨÍỊ",
			"oòỏõóọôồổỗốộơờởỡớợ",
			"OÒỎÕÓỌÔỒỔỖỐỘƠỜỞỠỚỢ",
			"uùủũúụưừửữứự",
			"UÙỦŨÚỤƯỪỬỮỨỰ",
			"yỳỷỹýỵ",
			"YỲỶỸÝỴ"
		];
		for (var i=0; i<AccentsMap.length; i++) {
			var re = new RegExp('[' + AccentsMap[i].substr(1) + ']', 'g');
			var char = AccentsMap[i][0];
			str = str.replace(re, char);
		}
		return str.trim();
	}

	const getDataLookupFieldsStore = (_stores = [], _type, _id, _columns) =>{
		let objRes = {};

		let arrColumns = [];
		if(util.isArray(_columns)){
			arrColumns = _columns;
		}else{
			arrColumns.push(_columns)
		}

		let objResStore = _stores.find(_store => _store.id == _id);
		if(!!objResStore){
			let arrColumnsExists = Object.keys(objResStore);
			let arrColumnsNotFound = arrColumns.filter(_fieldId => !arrColumnsExists.includes(_fieldId));

			if(arrColumnsNotFound.length > 0){
				let objResLkf = search.lookupFields({type: _type, id: _id, columns: arrColumnsNotFound})
				Object.keys(objResLkf).forEach(_key => {
					objResStore[_key] = objResLkf[_key];
				});
			}
		}
		else{
			objResStore = {id: _id};

			let objResLkf = search.lookupFields({type: _type, id: _id, columns: arrColumns})

			objResStore = {
				id: _id,
				...objResLkf
			};

			_stores.push(objResStore);
		}

		arrColumns.forEach(_fieldId => {
			objRes[_fieldId] = objResStore[_fieldId];
		});

		return objRes;
	}


	const getDataSource = (_options, _filters, _keys = [], _record = {}) =>{
		let resultSearch = loadSearchWithFilter(_options, _filters, _record);

		let arrKeys = _keys || [];
		if(arrKeys.length == 0){
			arrKeys = getDataKeyByColumnSearch_V2(resultSearch.columns);
		}

		resultSearch = resultSearch.runPaged({pageSize: 1000});

		let arrResult = fetchResultSearchAllPage(resultSearch, function(_objSearch, _column){
			let objRes = getObjResultFromSearchByKey(_objSearch, _column, arrKeys);

			replaceValueNoneByKey(objRes);
			
			if(!!_objSearch?.id && !objRes?.id){
                objRes.id = _objSearch.id;
            }

			return objRes;
		});

		return arrResult;
	}

	const getDataSourceFetchPage = (_options, _filters, _params = {
		rangePageFetch: 1, page: 0,
	}, _keys = [], _record = {}) =>{
		let resultSearch = loadSearchWithFilter(_options, _filters, _record);
		
		let arrKeys = _keys || [];
		if(arrKeys.length == 0){
			arrKeys = getDataKeyByColumnSearch_V2(resultSearch.columns);
		}

		resultSearch = resultSearch.runPaged({pageSize: 1000});

		let objRes = fetchResultSearchPage(resultSearch, _params, function(_objSearch, _column){
			let objRes = getObjResultFromSearchByKey(_objSearch, _column, arrKeys);

			replaceValueNoneByKey(objRes);

			if(!!_objSearch?.id && !objRes?.id){
                objRes.id = _objSearch.id;
            }

			return objRes;
		});

		return objRes;
	}

	const getDataSource_Mixed = (_options, _filters, _keys = [], _record = {}, _funcObjectMappingColumn) =>{
		let resultSearch = loadSearchWithFilter(_options, _filters, _record);

		let arrKeys = _keys || [];
		if(arrKeys.length == 0){
			arrKeys = getDataKeyByColumnSearch_V2(resultSearch.columns);
		}

		let resultSearchPaged = resultSearch.runPaged({pageSize: 1000});

		let arrResult = [];

		let ttlPage = resultSearchPaged.pageRanges.length;

		if(ttlPage < 5){
			arrResult = fetchResultSearchRunEach(resultSearch, function(_objSearch, _column){
				let objResLine = {};

				if(typeof(_funcObjectMappingColumn) == "function"){
					objResLine = _funcObjectMappingColumn(_objSearch, _column);
				}
				else{
					objResLine = getObjResultFromSearchByKey(_objSearch, _column, arrKeys);
				}
				
				replaceValueNoneByKey(objResLine);

				if(!!_objSearch?.id && !objResLine?.id){
					objResLine.id = _objSearch.id;
				}

				return objResLine;
			});
		}
		else{
			let columns = resultSearch.columns;
			for(let idxPage = 0; idxPage < ttlPage; idxPage++){
				let indexStart = idxPage * 1000;
				let indexEnd = indexStart + 1000;
				
				let resultSearchRange = resultSearch.run().getRange(indexStart, indexEnd);

				for(var i = 0; i < resultSearchRange.length; i++){
					let objSearch = resultSearchRange[i];

					let objResLine = {};

					if(typeof(_funcObjectMappingColumn) == "function"){
						objResLine = _funcObjectMappingColumn(objSearch, columns);
					}
					else{
						objResLine = getObjResultFromSearchByKey(objSearch, columns, arrKeys);
					}

					replaceValueNoneByKey(objResLine);

					if(!!objSearch?.id && !objResLine?.id){
						objResLine.id = objSearch.id;
					}

					arrResult.push(objResLine);
				}
			}
		}

		return arrResult;
	}

	const getDataSourceFetchPage_Mixed = (_options, _filters, _params = {
		rangePageFetch: 1, page: 0,
	}, _keys = [], _record = {}, _funcObjectMappingColumn) =>{
		let resultSearch = loadSearchWithFilter(_options, _filters, _record);
		
		let arrKeys = _keys || [];
		if(arrKeys.length == 0){
			arrKeys = getDataKeyByColumnSearch_V2(resultSearch.columns);
		}

		let resultSearchPaged = resultSearch.runPaged({pageSize: 1000});
		
		let ttlPage = resultSearchPaged.pageRanges.length;
		let idxPageFetched = _params.page || 0;

		let objResDataSource = {
			arrResult: [], 
			info: {
				page: idxPageFetched, 
				ttlPage: ttlPage, 
				rangePageFetch: _params.rangePageFetch,
			}
		};

		if(idxPageFetched == 0 && ttlPage < 5){
			objResDataSource.info.ttlPage = 1;
			objResDataSource.arrResult = fetchResultSearchRunEach(resultSearch, function(_objSearch, _column){
				let objResLine = {};

				if(typeof(_funcObjectMappingColumn) == "function"){
					objResLine = _funcObjectMappingColumn(_objSearch, _column);
				}
				else{
					objResLine = getObjResultFromSearchByKey(_objSearch, _column, arrKeys);
				}
				
				replaceValueNoneByKey(objResLine);

				if(!!_objSearch?.id && !objResLine?.id){
					objResLine.id = _objSearch.id;
				}

				return objResLine;
			});
		}
		else{
			let indexStart = idxPageFetched * 1000;
			let indexEnd = indexStart + 1000;

			let columns = resultSearch.columns;
			let resultSearchRange = resultSearch.run().getRange(indexStart, indexEnd);

			for(var i = 0; i < resultSearchRange.length; i++){
				let objSearch = resultSearchRange[i];

				let objResLine = {};

				if(typeof(_funcObjectMappingColumn) == "function"){
					objResLine = _funcObjectMappingColumn(objSearch, columns);
				}
				else{
					objResLine = getObjResultFromSearchByKey(objSearch, columns, arrKeys);
				}

				replaceValueNoneByKey(objResLine);

				if(!!objSearch?.id && !objResLine?.id){
					objResLine.id = objSearch.id;
				}

				objResDataSource.arrResult.push(objResLine);
			}
		}

		return objResDataSource;
	}

	const getAvailableFilters = (_options) =>{
		let options = {id: ""};
		if(typeof(_options) == "string"){
			options.id = _options
		}
		else if(typeof(_options) == "object"){
			if(!!_options.id){
				options.id = _options.id;
			}
			if(!!_options.type){
				options.type = _options.type;
			}
		}

        let resultSearch = search.load(options);
        let columns = resultSearch.columns;

        let objResult = {};

        for(let i = 0; i < columns.length; i++){
            let column = columns[i];
            let jsonColumn = JSON.parse(JSON.stringify(column));

            let filter = {
                name: jsonColumn.name,
            };

            if(!!jsonColumn.join){
                filter.join = jsonColumn.join;
            }
            else if(!!jsonColumn.formula){
                filter.formula = jsonColumn.formula;
            }

            if(!!jsonColumn.summarytype && !jsonColumn.summary){
                filter.summary = jsonColumn.summarytype;
            }

            if(jsonColumn.type == "select"){
                filter.operator = "anyof";

                if(["subsidiarynohierarchy", "locationnohierarchy"].includes(jsonColumn.name)){
                    filter.name = filter.name.replace("nohierarchy", "");
                }

            }
            else if(jsonColumn.type == "text"){
                filter.operator = "contains";
            }
            else if(["float", "currency"].includes(jsonColumn.type)){
                filter.operator = "equalto";
            }
            else if(["date"].includes(jsonColumn.type)){
                filter.operator = "on";
            }
			else if(["checkbox"].includes(jsonColumn.type)){
                filter.operator = "is";
            }

            objResult[jsonColumn.label] = {
                index: i,
                type: jsonColumn.type,
                filter: filter,
                //column: jsonColumn,
            }
        }

        return objResult;
    }

    return {
		ID,
		TYPE: "",
		RECORDS,
		createSearchWithFilter,
		loadSearchWithFilter,
		fetchResultSearchPage,
		fetchResultSearchAllPage,
		fetchResultSearchRun,
		fetchResultSearchRunEach,
		replaceValueNoneByKey,
		getObjResultFromSearchByKey,
		getObjResultFromSearchWithLabel,
		getObjResultFromSearchWithLabel_V2,
		getDataKeyByColumnSearch,
		getDataKeyByColumnSearch_V2,
		getDataLookupFields,
		getDataLookupFieldsStore,
		formatStringToKeyID,
		formatStringToKeyID_V2,
		getDataSource,
		getDataSourceFetchPage,
		getDataSource_Mixed,
		getDataSourceFetchPage_Mixed,
		getAvailableFilters,
    };
    
});