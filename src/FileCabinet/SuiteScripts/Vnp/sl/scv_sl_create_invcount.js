/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  22 Sep 2026         Khanh Tran              Init, create file. Màn hình suitelet tạo Phiếu kiểm kê, KSCL from ms.Thủy(https://app.clickup.com/t/3773072/14yhnhmfvg9)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/url',
    '../common/scv_common_create_invcount.js',

    '../cons/scv_cons_form.js',
    '../cons/scv_cons_subsidiary.js',
    '../cons/scv_cons_search_data_inv_pkk.js',
], (
    runtime, url,
    commonCreateInvcount,

    constForm,
    constSubsidiary,
    constSearchDataInvPkk,
) => {
    const CurrentScript = {
        ID: 'customscript_scv_sl_create_invcount',
        DEPLOYID_UI: 'customdeploy_scv_sl_create_invcount',
        DEPLOYID_DATA: 'customdeploy_scv_sl_create_invcount_svc',
    };

    const onRequest = (scriptContext) => {
        constForm.setContext(scriptContext);
        constForm.setServiceScript(CurrentScript.ID, CurrentScript.DEPLOYID_DATA);

        let params = scriptContext.request.parameters;
        let curScript = runtime.getCurrentScript();

        if (curScript.deploymentId == CurrentScript.DEPLOYID_DATA) {
            let objResponse = { data: [] };
            switch (params.action) {
                case 'getLocations':
                    objResponse.data = commonCreateInvcount.getLocations(params.custpage_subsidiary);
                    break;
                case 'inv_pkk_01':
                    objResponse.data = constSearchDataInvPkk.getDataSourceFetchPage(params);
                    break;
                case 'onSubmitCreateInvcount':
                    objResponse.data = onSubmitCreateInvcount(params);
                    break;
            }
            constForm.write(objResponse);
        }
        else if (scriptContext.request.method == 'GET') {
            onCreateFormUI(params);
        }
    };

    const onCreateFormUI = (params) => {
        let subsidiary = params.custpage_subsidiary || runtime.getCurrentUser().subsidiary;

        constForm.createForm('Tạo Phiếu kiểm kê, KSCL', '../cssl/scv_cs_sl_create_invcount.js');

        constForm.addPageLink([constSearchDataInvPkk.ID], true);

        constForm.addButton({
            id: 'custpage_btn_submit',
            label: 'Create',
            functionName: 'onSubmit()',
        }, { styleSubmit: true });

        constForm.addButton({
            id: 'custpage_btn_search',
            label: 'Search',
            functionName: 'searchResult()',
        });

        let filterGrp = constForm.addFieldGroup({ id: "fieldgrp_filter", label: "Bộ lọc" });

        constForm.addField({
            id: "custpage_subsidiary",
            label: "Subsidiary",
            type: "select",
            container: filterGrp.id,
        }, true, {
            lookup: {
                data: constSubsidiary.getDataSubsidiaryByUserRole(),
                valueExpr: 'id',
                displayExpr: 'namenohierarchy',
            },
            defaultValue: subsidiary,
        });

        constForm.addField({
            id: 'custpage_location',
            label: 'Location',
            type: 'select',
            container: filterGrp.id,
        }, true, {
            lookup: {
                data: commonCreateInvcount.getLocations(subsidiary),
                valueExpr: 'id',
                displayExpr: 'name',
            },
            defaultValue: params.custpage_location,
            breakType: 'startcol',
        });

        let infoGrp = constForm.addFieldGroup({ id: 'fieldgrp_info', label: 'Thông tin chung' });

        constForm.addField({
            id: 'custpage_keeper',
            label: 'Thủ kho kiểm kê',
            type: 'select',
            source: 'employee',
            container: infoGrp.id,
        }, false, {
            layoutType: 'startrow',
        });

        constForm.addField({
            id: 'custpage_employee',
            label: 'Nhân viên kiểm kê',
            type: 'multiselect',
            source: 'employee',
            container: infoGrp.id,
        });

        constForm.addField({
            id: 'custpage_qc_keeper',
            label: 'Thủ kho KSCL',
            type: 'select',
            source: 'employee',
            container: infoGrp.id,
        }, false, {
            layoutType: 'startrow',
        });

        constForm.addField({
            id: 'custpage_qc_employee',
            label: 'Nhân viên KSCL',
            type: 'multiselect',
            source: 'employee',
            container: infoGrp.id,
        });

        constForm.addGridDx({
            id: 'custpage_sl_result',
            type: 'grid',
            label: 'Chi tiết',
            columns: commonCreateInvcount.getColumnsResult(),
            optionsDx: {
                editing: {
                    allowUpdating: true,
                }
            },
        });

        constForm.addMarkAllButtonsDx("custpage_sl_result");

        constForm.writePage();
    };

    const onSubmitCreateInvcount = (params) => {
        let objResponse = {success: true, msg: "Success", recId: "", recUrl: ""};
        let objReqBody = JSON.parse(params.body || '{}');

        try {
            objResponse.recId = commonCreateInvcount.createPhieuKiemKe(objReqBody);
            objResponse.recUrl = url.resolveRecord({recordType: 'customrecord_scv_invcount_h', recordId: objResponse.recId});
        }
        catch(err) {
            log.error("ERROR-submitResult", err);
            log.error("ERROR-objReqBody", objReqBody);

            objResponse.success = false;
            objResponse.msg = err.message;
        }

        return objResponse;
    };

    return { onRequest };
});
