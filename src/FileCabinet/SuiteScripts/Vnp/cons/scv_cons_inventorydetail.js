/**
 * Nội dung: 
 * Version: 1.250625.6
 * =======================================================================================
 *  Date                Author                  Description
 *  28 Mar 2025         Huy Pham                Init & create file
 */
define(['N/search', 
	'../cons/scv_cons_search.js',
	'../cons/scv_cons_datastore.js',
	'../cons/scv_cons_crypto.js'
	
],
function(search,
	constSearch,
	constDataStore,
	constCrypto
) {
	const TYPE = "inventorydetail";
    const FIELD = {
        ID: "id",
        INACTIVE: "isinactive",
        NAME: "name"
    }

    const SUBLIST = {
        
    }

    const RECORDS = {
        _N: {
			file: null
		},
		currentScript: {
            id: "customscript_scv_sl_invdetail_p",
            deploymentId: "customdeploy_scv_sl_invdetail_p",
        },
        serviceScript:{
            id: "customscript_scv_sl_invdetail_p",
            deploymentId: "customdeploy_scv_sl_invdetail_p_svc"
        },
		mainKey: "",
		stores: [],
		storesItem: [],
		storesTemporary: []
    }

    const initModulServer = (_objModul) =>{
		RECORDS._N.file = _objModul.file||null;

		constDataStore.initModulServer({file: RECORDS._N.file});
	}

	const setMainKey = (_key = "") =>{
		RECORDS.mainKey = _key || constCrypto.generateUUID();

		return RECORDS.mainKey;
	}

	const getMainKey = () =>{
		return RECORDS.mainKey;
	}
	
	const getFieldsOfInventoryDetail = (_inventoryDetailFieldId) =>{
		return {
			needed: getNeededFieldId(_inventoryDetailFieldId),
			available: getAvailableFieldId(_inventoryDetailFieldId),
			lotno: getLotNoFieldId(_inventoryDetailFieldId),
			store: getStoreFieldId(_inventoryDetailFieldId),
		};
	}

	const getNeededFieldId = (_inventoryDetailFieldId) => {
		return _inventoryDetailFieldId + "needed";
	}

	const getAvailableFieldId = (_inventoryDetailFieldId) => {
		return _inventoryDetailFieldId + "avail";
	}
	
	const getLotNoFieldId = (_inventoryDetailFieldId) => {
		return _inventoryDetailFieldId + "lotno";
	}

	const getStoreFieldId = (_inventoryDetailFieldId) => {
		return _inventoryDetailFieldId + "store";
	}

	const setStoreInventoryDetail = (_objDataSource, _isSaveFile = true) =>{
		let lineKey = constCrypto.generateUUID();

		let objRes = formatDataInventoryDetail();

		if(!!_objDataSource){
			objRes = _objDataSource;

			if(!objRes.custpage_item && !!objRes.item){
				objRes.custpage_item = objRes.item;
			}
			if(!objRes.custpage_quantity && !!objRes.quantity){
				objRes.custpage_quantity = objRes.quantity;
			}
			if(!objRes.custpage_location && !!objRes.location){
				objRes.custpage_location = objRes.location;
			}
		}

		RECORDS.storesTemporary.push({
			key: lineKey,
			time: (new Date()).toISOString(),
			data: {...objRes}
		})

		if(_isSaveFile){
			saveDataStoreFileInventoryDetail();
		}

		return lineKey;
	}

	const getStoreInventoryDetail = (_key) =>{
		let objRes = formatDataInventoryDetail();

		if(!_key){
			return objRes;
		}

		let arrDataStore = constDataStore.loadDataStoreFile({fileName: RECORDS.mainKey});
		if(!arrDataStore) return objRes;

		let objDataStore = arrDataStore.find(e => e.key == _key);
		if(!!objDataStore){
			objRes = objDataStore.data;
		}

		return objRes;
	}

    const formatDataInventoryDetail = (_objRes) =>{
		_objRes = _objRes??{};
		_objRes.custpage_item = _objRes.custpage_item??"";
		_objRes.custpage_quantity = _objRes.custpage_quantity??0;
		_objRes.custpage_location = _objRes.custpage_location??"";
		_objRes.inventoryassignment = _objRes.inventoryassignment??[];

		return _objRes;
	}

	const getDataItemOnhand = (_params, _arrItemId) => {
		let myFilters = [];

		if(!!_params.location){
			myFilters.push(search.createFilter({name: 'location', operator: "anyof", values: _params.location.split(",")}))
		}
		if(!!_params.item){
			myFilters.push(search.createFilter({name: 'item', operator: "anyof", values: _params.item.split(",")}))
		}
		if(!!_params.inventorynumber){
			myFilters.push(search.createFilter({name: 'inventorynumber', operator: "anyof", values: _params.inventorynumber}))
		}
		if(!!_params.status){
			myFilters.push(search.createFilter({name: 'status', operator: "anyof", values: _params.status}))
		}

		let resultSearch = constSearch.createSearchWithFilter({
			type: "inventorybalance",
			filters:
			[
			],
			columns:
			[
				search.createColumn({name: "item", label: "Item"}),
				search.createColumn({name: "location", label: "Location"}),
				search.createColumn({name: "inventorynumber", label: "Inventory Number"}),
				search.createColumn({name: "binnumber", label: "Bin Number"}),
				search.createColumn({name: "available", label: "Available"}),
				search.createColumn({
					name: "stockunit",
					join: "item",
					label: "Primary Stock Unit"
				}),
				search.createColumn({name: "status", label: "Status"}),
				search.createColumn({
					name: "expirationdate",
					join: "inventoryNumber",
					label: "Expiration Date"
				})
			]
		}, myFilters);
		
		resultSearch = resultSearch.runPaged({pageSize: 1000});

		let arrResult = constSearch.fetchResultSearchAllPage(resultSearch, function(_objSearch, _column){
			let objRes = constSearch.getObjResultFromSearchByKey(_objSearch, _column,[
				"item", "location", "inventorynumber",
				"binnumber", "available", "stockunit",
				"status", "expirationdate"
			]);

			objRes.available = objRes.available * 1;
			
			return objRes;
		});

		return arrResult;
	}

	const isLotItem = (_internalid, _isRtnBoolean = true)	=> {
		RECORDS.storesItem = RECORDS.storesItem ?? [];

		let islotitem = constSearch.getDataLookupFieldsStore(RECORDS.storesItem, "item", _internalid, ["islotitem"]).islotitem;

		if(_isRtnBoolean){
			return islotitem;
		}
		else{
			return islotitem ? "T" : "F";
		}
	}

	const hasInventoryDetailItem = (_internalid, _isRtnBoolean = true)	=> {
		RECORDS.storesItem = RECORDS.storesItem ?? [];

		let itemLkf = constSearch.getDataLookupFieldsStore(RECORDS.storesItem, "item", _internalid, ["type", "islotitem"]);
		
		let itemType = itemLkf.type[0].value;
		let islotitem = itemLkf.islotitem;

		let isValidate = false;
		if(["InvtPart", "Assembly"].includes(itemType) || islotitem){
			isValidate = true;
		}

		if(_isRtnBoolean){
			return isValidate;
		}
		else{
			return isValidate ? "T" : "F";
		}
	}

	const saveDataStoreFileInventoryDetail = () =>{
		let arrResDataFile = [];

		let arrDataStore = constDataStore.loadDataStoreFile({fileName: RECORDS.mainKey});
		if(!!arrDataStore){
			arrResDataFile = [...arrDataStore];
		}
		arrResDataFile = arrResDataFile.concat(RECORDS.storesTemporary);

        constDataStore.setDataStore(RECORDS.mainKey, arrResDataFile);

        return constDataStore.saveDataStoreFile({
            key: RECORDS.mainKey,
            fileName: RECORDS.mainKey,
        });
	}

	const loadDataStoreFileInventoryDetail = () =>{
		return constDataStore.loadDataStoreFile({
			fileName: RECORDS.mainKey
		})
	}

	const mappedResults = (_lines = [], _inventoryDetailFieldId = "") => {
		let invDetailStoreFieldId = _inventoryDetailFieldId + "store";
		let arrDataStoreInvDetail = loadDataStoreFileInventoryDetail();
		
		_lines.forEach(objLine =>{
			let objDataStore = arrDataStoreInvDetail.find(e => e.key == objLine[invDetailStoreFieldId]);
			if(!!objDataStore){
				objLine.inventorydetail = objDataStore.data;
			}
		});

		return _lines;
	}

    return {
		TYPE,
        FIELD,
        SUBLIST,
        RECORDS,

        initModulServer,
		setMainKey,
		getMainKey,

		getFieldsOfInventoryDetail,
		getNeededFieldId,
		getAvailableFieldId,
		getLotNoFieldId,
		getStoreFieldId,

        setStoreInventoryDetail,
        getStoreInventoryDetail,
		saveDataStoreFileInventoryDetail,
		loadDataStoreFileInventoryDetail,
		mappedResults,

		formatDataInventoryDetail,
        getDataItemOnhand,
        isLotItem,
        hasInventoryDetailItem
    };
    
});
