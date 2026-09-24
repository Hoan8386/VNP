/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  10 Sep 2026         Khanh Tran              Init & create file. Chức năng đối chiếu dữ liệu hóa đơn from ms. Tâm(https://app.clickup.com/t/3773072/14yhnhmfdfv)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime',
    '../common/scv_common_bkdchd.js',

    '../cons/scv_cons_form.js',
    '../cons/scv_cons_subsidiary.js',
    '../cons/scv_cons_search_bkdchd_01.js',
    '../cons/scv_cons_search_bkdchd_02.js',
], (
    runtime,
    commonBkdchd,

    constForm,
    constSubsidiary,
    cSearchBkdchd01,
    cSearchBkdchd02,
) => {
    const CurrentScript = {
        ID: 'customscript_scv_sl_bkdchd',
        DEPLOYID_UI: 'customdeploy_scv_sl_bkdchd',
        DEPLOYID_DATA: 'customdeploy_scv_sl_bkdchd_svc',
    };

    const onRequest = (scriptContext) => {
        constForm.setContext(scriptContext);
        constForm.setServiceScript(CurrentScript.ID, CurrentScript.DEPLOYID_DATA);

        let params = scriptContext.request.parameters;
        let curScript = runtime.getCurrentScript();

        if (curScript.deploymentId == CurrentScript.DEPLOYID_DATA) {
            let objResponse = { data: [] };
            switch (params.action) {
                case 'bkhdmv_01':
                    objResponse.data = cSearchBkdchd01.getDataSourceFetchPage(params);
                    break;
                case 'bkdchd_02':
                    objResponse.data = cSearchBkdchd02.getDataSourceFetchPage(params);
                    break;
            }

            constForm.write(objResponse);
        }
        else if (scriptContext.request.method == 'GET') {
            onCreateFormUI(params);
        }
    };

    const onCreateFormUI = (params) => {
        defaultParams(params);

        let arrSubsidiary = constSubsidiary.getDataSubsidiaryByUserRole();

        constForm.createForm('VAT Reconcile', '../cssl/scv_cs_sl_bkdchd.js');

        constForm.addPageLink([
            cSearchBkdchd01.ID,
            cSearchBkdchd02.ID,
        ], true);

        constForm.addButton({
            id: 'custpage_btn_search',
            label: 'Search',
            functionName: 'searchResult()',
        });

        constForm.addButton({
            id: 'custpage_btn_export',
            label: 'Export',
            functionName: 'exportResult()',
        });

        let mainGrp = constForm.addFieldGroup({ id: 'fieldgrp_main', label: 'Main' });

        constForm.addField({
            id: 'custpage_subsidiary',
            type: 'select',
            label: 'Subsidiary',
            container: mainGrp.id,
        }, true, {
            lookup: {
                data: arrSubsidiary,
                valueExpr: 'id',
                displayExpr: 'namenohierarchy',
            },
            defaultValue: params.custpage_subsidiary,
        });

        constForm.addField({
            id: 'custpage_from_date',
            type: 'date',
            label: 'From Date',
            container: mainGrp.id,
        }, true, {
            defaultValue: params.custpage_from_date,
            layoutType: 'startrow'
        });

        constForm.addField({
            id: 'custpage_to_date',
            type: 'date',
            label: 'To Date',
            container: mainGrp.id,
        }, true, {
            defaultValue: params.custpage_to_date,
            layoutType: 'endrow'
        });

        constForm.addGridDx({
            id: 'custpage_sl_netsuite',
            type: 'grid',
            label: 'Netsuite',
            columns: commonBkdchd.getColumnsResult(),
            optionsDx: {
                export: { enabled: false },
            },
        });

        constForm.addGridDx({
            id: 'custpage_sl_import_smt',
            type: 'grid',
            label: 'Import SMT',
            columns: commonBkdchd.getColumnsResult(),
            optionsDx: {
                export: { enabled: false },
            },
        });

        constForm.addGridDx({
            id: 'custpage_sl_reconcile',
            type: 'grid',
            label: 'Reconcile',
            columns: commonBkdchd.getColumnsResult(),
            optionsDx: {
                export: { enabled: false },
            },
        });

        constForm.addField({
            id: 'custpage_tab_style',
            type: 'inlinehtml',
            label: 'Tab Style',
        }, false, {
            defaultValue: '<style>#tab_result_dxtab { border: 2px solid #666 !important; box-sizing: border-box; }</style>',
        });

        constForm.writePage();
    };

    const defaultParams = (params) => {
        let today = new Date();

        if (!('custpage_subsidiary' in params)) {
            params.custpage_subsidiary = runtime.getCurrentUser().subsidiary;
        }

        if (!('custpage_from_date' in params)) {
            params.custpage_from_date = new Date(today.getFullYear(), today.getMonth(), 1);
        }

        if (!('custpage_to_date' in params)) {
            params.custpage_to_date = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }
    };

    return { onRequest };
});
