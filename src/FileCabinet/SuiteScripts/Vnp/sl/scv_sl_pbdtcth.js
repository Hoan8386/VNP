/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  14 Aug 2026         Thanh Hoan              Init, create file. Chức năng phân bổ doanh thu chưa thực hiên from ms. Tâm(https://app.clickup.com/t/3773072/86d40yedc)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/url',
    '../cons/scv_cons_form.js',
    '../cons/scv_cons_search_pbdtcth.js',    
    '../common/scv_common_pbdtcth.js',    
    
], (
    runtime, url,
    constForm,
    constSearchPbdtcth,
    commonPbdtcth
) => {
    const CurrentScript = {
        ID: 'customscript_scv_sl_pbdtcth',
        DEPLOYID_UI: 'customdeploy_scv_sl_pbdtcth',
        DEPLOYID_DATA: 'customdeploy_scv_sl_pbdtcth_scv',
    };

    const onRequest = (scriptContext) => {
        constForm.setContext(scriptContext);
        constForm.setServiceScript(CurrentScript.ID, CurrentScript.DEPLOYID_DATA);

        let params = scriptContext.request.parameters;
        let curScript = runtime.getCurrentScript();

        if (curScript.deploymentId == CurrentScript.DEPLOYID_DATA) {
            log.debug("hoan check" )

            let objResponse = { data: [] };
            log.debug("hoan params" ,params);
            log.debug("hoan params" ,params.custpage_subsidiary);
            switch (params.action) {
                case 'getDataPbdtcth':
                    objResponse.data = constSearchPbdtcth.getDataSourceFetchPage(params);
                    log.debug("hoan objResponse.data " ,objResponse.data)
                    break;
            }
            
            constForm.write(objResponse);
        } else if (scriptContext.request.method == 'GET') {
            onCreateFormUI(params);
        }
    };

    const onCreateFormUI = (params) => {
        let hasCreatedFrom = !!params?.custpage_createdfrom;

        constForm.createForm('Chức năng phân bổ doanh thu chưa thực hiên', '../cssl/scv_cs_sl_pbdtcth.js');

        constForm.addPageLink([constSearchPbdtcth.ID], true);

        constForm.addButton({
            id: 'custpage_btn_search',
            label: 'Search',
            functionName: 'searchResult()',
        });

        constForm.addButton({
            id: 'custpage_btn_submit',
            label: 'Create',
            functionName: 'onSubmit()',
        }, { styleSubmit: true });

        constForm.addButton({
            id: 'custpage_btn_export',
            label: 'Export Results',
            functionName: 'onExport()',
        }, { styleSubmit: true });
        
        
        constForm.addField({
            id: "custpage_subsidiary",
            label: "Subsidiary ",
            type: "select",
            source: "subsidiary",
        }, true);

        
        constForm.addField({
            id: "custpage_date",
            label: "Date",
            type: "date",
        }, true);
        
        constForm.addField({
            id: "custpage_debit",
            label: "Debit/loan Agreemnt ",
            type: "select",
            source:"customrecord_scv_loa"
        }, false);
        
        constForm.addField({
            id: "custpage_salecontract",
            label: "Sale Contract",
            type: "select",
            source:"customsale_scv_sales_contract"
        }, false);
        
        constForm.addGridDx({
            id: 'custpage_sl_result',
            type: 'grid',
            label: 'Chi tiết',
            columns: commonPbdtcth.getColumnsResult(),
        });

        constForm.writePage();
    };

    

    return { onRequest };
});
