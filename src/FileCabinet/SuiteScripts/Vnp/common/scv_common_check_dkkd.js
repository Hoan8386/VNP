/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  07 Sep 2026         Khanh Tran              Init & create file. Chức năng kiểm tra điều kiện kinh doanh from ms. Thủy(https://app.clickup.com/t/3773072/14yhnhmexrx)
 */
define(['N/record', 'N/search', 'N/url',

    '../cons/scv_cons_lf_entity_type.js',
    '../cons/scv_cons_approval_status.js',

	'../cons/scv_cons_search.js',
    '../cons/scv_cons_search_check_dkkd.js',
], (
    record, search, url,

    constLfEntityType,
    constApprovalStatus,

    constSearch,
    constSearchCheckDkkd,
) => {
    const addButtonCheckDkkd = (scriptContext) => {
        let newRecord = scriptContext.newRecord;
        let recordType = newRecord.type;
        let action = '';

        switch (recordType) {
            case 'purchaseorder':
                if (newRecord.getValue({fieldId: 'statusRef'}) != 'pendingSupApproval') return;
                action = 'checkDkkdNhaCungCap';
                break;
            case 'salesorder':
                if (newRecord.getValue({fieldId: 'statusRef'}) != 'pendingApproval') return;
                action = 'checkDkkdKhachHang';
                break;
            case 'custompurchase_scv_purchase_contract':
                if (newRecord.getValue({fieldId: 'custbody_scv_approval_status'}) != constApprovalStatus.RECORDS.Moi.ID) return;
                action = 'checkDkkdNhaCungCap';
                break;
            case 'customsale_scv_sales_contract':
                if (newRecord.getValue({fieldId: 'custbody_scv_approval_status'}) != constApprovalStatus.RECORDS.Moi.ID) return;
                action = 'checkDkkdKhachHang';
                break;
            default:
                return;
        }

        let suiteletParams = {
            action: action,
            recordtype: recordType,
            recid: newRecord.id,
        };

        let suiteletUrl = url.resolveScript({
            scriptId: 'customscript_scv_sl_check_dkkd',
            deploymentId: 'customdeploy_scv_sl_check_dkkd_svc',
            returnExternalUrl: false,
            params: suiteletParams
        });

        scriptContext.form.addButton({
            id: 'custpage_btn_check_dkkd',
            label: 'Check ĐKKD',
            functionName: "window.location.replace('" + suiteletUrl + "');",
        });
    };

    const getDataItem = (filters) => {
        let resultSearch = constSearch.createSearchWithFilter({
			type: "item",
            columns: [
				"internalid",
                "itemid",
                "type",
                "custitem_scv_product_cate",
			]
		}, filters);
		
		resultSearch = resultSearch.runPaged({pageSize: 1000});

		let arrResult = constSearch.fetchResultSearchAllPage(resultSearch, function(_objSearch, _column){
			let objRes = constSearch.getObjResultFromSearchByKey(_objSearch, _column,[
				"internalid",
                "itemid",
                "type",
                "custitem_scv_product_cate",
			]);
			
			objRes.recordtype = _objSearch.recordType;
			return objRes;
		});

		return arrResult;
    };

    const getDataDkkd = (params, entityFieldId, legalFileType) => {
        let objData = {
            custbody_scv_checked_dkkd: true,
        };
        let curRec = record.load({type: params.recordtype, id: params.recid});
        let entity = curRec.getValue({fieldId: entityFieldId});
        if (!entity) return objData;

        let arrDkkd = constSearchCheckDkkd.getDataSource({
            custpage_legalfile_entity: entity,
            custpage_legalfile_type: legalFileType,
        });
        if (arrDkkd.length == 0) return objData;

        let slItem = 'item';
        let lcItem = curRec.getLineCount({sublistId: slItem});
        let arrItemId = [];
        for (let i = 0; i < lcItem; i++) {
            let itemId = curRec.getSublistValue({sublistId: slItem, fieldId: 'item', line: i});
            if (itemId && !arrItemId.includes(itemId)) arrItemId.push(itemId);
        };
        if (arrItemId.length == 0) return objData;
        
        let arrItem = getDataItem([
            search.createFilter({
                name: "internalid", operator: "anyof", values: arrItemId,
            })
        ]);

        let arrProductCategory = arrDkkd[0].productcategoryid.split(',');
        let arrItemDkkd = [];
        for (let objItem of arrItem) {
            if (!['inventoryitem', 'lotnumberedinventoryitem'].includes(objItem.recordtype)) continue;

            if (!objItem.custitem_scv_product_cate || !arrProductCategory.includes(objItem.custitem_scv_product_cate)) {
                arrItemDkkd.push(objItem.itemid);
            }
        }
        if (arrItemDkkd.length > 0) objData.custbody_scv_item_dkkd = arrItemDkkd.join('\n');

        return objData;
    };

    const getDataDkkdKhachHang = (params) => {
        return getDataDkkd(params, 'custbody_scv_buyer', constLfEntityType.RECORDS.Customer.ID);
    };

    const getDataDkkdNhaCungCap = (params) => {
        return getDataDkkd(params, 'entity', constLfEntityType.RECORDS.Vendor.ID);
    };

    const updRecord = (params, objData) => {
        record.submitFields({
            type: params.recordtype,
            id: params.recid,
            values: objData
        });
    };

    return {
        addButtonCheckDkkd,
        getDataDkkdKhachHang,
        getDataDkkdNhaCungCap,
        updRecord
    };
});
