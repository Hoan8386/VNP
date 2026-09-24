/**
 * KeyWork:
 * + Trans:
 * =====================================================================================================================
 *  Date                Author                  Description
 *  05 Dec 2024         Khanh Tran              Init & create file, from Ms. Tâm(https://app.clickup.com/t/86d44j8ct)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/search', 'N/runtime', 

    '../cons/scv_cons_form.js',
    '../cons/scv_cons_subsidiary.js',

    '../cons/scv_cons_search_btkh_ts.js',
    '../cons/scv_cons_search_btkh_dauky.js',
],
    /**
 * @param{search} search
 * @param{runtime} runtime
 */
    (search, runtime,
        constForm,
        constSubsidiary,

        constSearchBTKHTaiSan, constSearchBTKHDauKy
    ) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */

        const CUR_SCRIPT = {
            ID: 'customscript_scv_sl_rpt_sct_taisan',
            DEPLOYID_UI: 'customdeploy_scv_sl_rpt_sct_taisan',
            DEPLOYID_DATA: 'customdeploy_scv_sl_rpt_sct_taisan_data'
        }

        const onRequest = (scriptContext) => {
            constForm.setContext(scriptContext);
            constForm.setServiceScript(CUR_SCRIPT.ID, CUR_SCRIPT.DEPLOYID_DATA);

            let request = scriptContext.request;
            let params = request.parameters;
            let curScript = runtime.getCurrentScript();
            if(curScript.deploymentId == CUR_SCRIPT.DEPLOYID_DATA){
                let objResponse = {data: [], isSuccess: true, msg: ''};
                if (params.action == "getDataSS_btkhTaiSan") {
                    objResponse.data = getDataSS_btkhTaiSan(params);
                }
                else if (params.action == "getDataSS_btkhDauKy") {
                    objResponse.data = getDataSS_btkhDauKy(params);
                }
                
                constForm.write(objResponse);
                
            }
            else{
                if(scriptContext.request.method == 'GET'){
                    onCreateFormUI(params);
                }
            }
        }

        const getDataSS_btkhDauKy = (params) => {
            let myFilters = [];

            if(params.custpage_subsidiary) {
                myFilters.push(
                    search.createFilter({name: "custrecord_assetsubsidiary", join: "custrecord_deprhistasset", operator: "anyof", values: params.custpage_subsidiary.split(",")})
                );
            }

            if(params.custpage_assettype) {
                myFilters.push(
                    search.createFilter({name: "custrecord_deprhistassettype", operator: "anyof", values: params.custpage_assettype.split(",")})
                );
            }

            if(params.custpage_assetcategory) {
                myFilters.push(
                    search.createFilter({name: "custrecord_scv_assetcategory", join: "custrecord_deprhistasset", operator: "anyof", values: params.custpage_assetcategory.split(",")})
                );
            }

            if(params.custpage_assetstatus) {
                myFilters.push(
                    search.createFilter({ name: "custrecord_assetstatus", join: "custrecord_deprhistasset",  operator: "anyof", values: params.custpage_assetstatus})
                );
            }

            if(params.custpage_asset) {
                myFilters.push(
                    search.createFilter({name: "custrecord_deprhistasset", operator: "anyof", values: params.custpage_asset})
                );
            }

            if(params.custpage_fromdt) {
                myFilters.push(
                    search.createFilter({
                    name: "custrecord_deprhistdate", operator: "before", values: params.custpage_fromdt})
                );
            } 

            return constSearchBTKHDauKy.getDataSourceFetchPage(myFilters, params);
        }

        const getDataSS_btkhTaiSan = (params) => {
            let myFilters = [];

            if(params.custpage_subsidiary){
                myFilters.push(
                    search.createFilter({name: "custrecord_assetsubsidiary", join: "custrecord_deprhistasset", operator: "anyof", values: params.custpage_subsidiary.split(",")})
                );

            }

            if(params.custpage_assettype) {
                myFilters.push(
                    search.createFilter({name: "custrecord_deprhistassettype", operator: "anyof", values: params.custpage_assettype.split(",")})
                );
            }

            if(params.custpage_assetcategory) {
                myFilters.push(
                    search.createFilter({name: "custrecord_scv_assetcategory", join: "custrecord_deprhistasset", operator: "anyof", values: params.custpage_assetcategory.split(",")})
                );
            }

            if(params.custpage_assetstatus) {
                myFilters.push(
                    search.createFilter({ name: "custrecord_assetstatus", join: "custrecord_deprhistasset",  operator: "anyof", values: params.custpage_assetstatus})
                );
            }

            if(params.custpage_asset) {
                myFilters.push(
                    search.createFilter({name: "custrecord_deprhistasset", operator: "anyof", values: params.custpage_asset})
                );
            }

            if(params.custpage_todt) {
                myFilters.push(
                    search.createFilter({name: "custrecord_deprhistdate", operator: "onorbefore", values: params.custpage_todt})
                );
            }

            return constSearchBTKHTaiSan.getDataSourceFetchPage(myFilters, params);
        }  

        const onCreateFormUI = (params) => {
            let arrSubsidiary = constSubsidiary.getDataSubsidiaryByUserRole();
            let curUser = runtime.getCurrentUser();

            constForm.createForm('Sổ chi tiết tài sản cố định', '../cssl/scv_cs_sl_rpt_sct_taisan.js');

            constForm.addPageLink([constSearchBTKHTaiSan.ID, constSearchBTKHDauKy.ID], true);

            constForm.addButton({id: 'custpage_btn_search', label: 'Search', functionName: "onSearchResult('F')"});
            constForm.addButton({id: 'custpage_btn_export', label: 'Export', functionName: "onSearchResult('T')"});

            let filterGrp = constForm.addFieldGroup({id: 'fieldgrp_main', label: 'Filters'});
       
            constForm.addField({
                id: 'custpage_subsidiary',
                type: 'multiselect',
                label: 'Subsidiary',
                container: filterGrp.id
            }, true, {
                lookup: {
                    data: arrSubsidiary,
                    valueExpr: 'id',
                    displayExpr: 'namenohierarchy',
                },
                defaultValue: curUser.subsidiary.toString(),
            });

            constForm.addField({
                id: 'custpage_asset',
                type: 'select',
                label: 'Asset',
                source: 'customrecord_ncfar_asset',
                container: filterGrp.id
            });

            constForm.addField({
                id: 'custpage_assettype',
                type: 'multiselect',
                label: 'Asset Type',
                source: 'customrecord_ncfar_assettype',
                container: filterGrp.id
            }, false, {breakType: 'STARTCOL'});

            constForm.addField({
                id: 'custpage_assetstatus',
                type: 'select',
                label: 'Asset Status',
                source: 'customlist_ncfar_assetstatus',
                container: filterGrp.id
            }, false);

            constForm.addField({
                id: 'custpage_assetcategory',
                type: 'multiselect',
                label: 'Asset Category',
                source: 'customrecord_scv_assetcategory',
                container: filterGrp.id
            }, false, {breakType: 'STARTCOL'});

            constForm.addField({
                id: 'custpage_fromdt',
                type: 'date',
                label: 'From Date',
                container: filterGrp.id
            }, true, {layoutType: 'STARTROW'});

            constForm.addField({
                id: 'custpage_todt',
                type: 'date',
                label: 'To Date',
                container: filterGrp.id
            }, true, {layoutType: 'ENDROW'});

            constForm.addField({
                id: 'custpage_groupby',
                type: 'select',
                label: 'Group by',
                container: filterGrp.id
            }, false, {
                lookup: {
                    data: [
                        {id: 'asset_account', name: 'Tài khoản nguyên giá'},
                        {id: 'depreciation_account', name: 'Tài khoản khấu hao'},
                        {id: 'charge_account', name: 'Tài khoản chi phí'},
                        {id: 'category_group', name: 'Phân nhóm tài sản'},
                        {id: 'pbql', name: 'Phòng ban quản lý'},
                    ],
                },
            });

            constForm.addGridDx({
                id: 'grdData',
                type: 'grid',
                label: 'Result',
                columns: getDataColumnGrid(),
                optionsDx: onCreateDxGrid(),
            });
            constForm.writePage();
        }

        const onCreateDxGrid = () => {
            return {
                exportExcelEnable: false,
                columnChooser: false,
                filterRowVisible: false,
                headerFilterVisible: false,
				rowAlternationEnabled: false,
                wordWrapEnabled: true,
                sortingMode: "none",
                groupPanel: false,
                pageSize: 500,
                rootValue: -1,
                autoExpandAll: true,
                allowColumnResizing: true,
            };
        }

        const getDataColumnGrid = () => {
            return [
                { caption: "STT", dataField: "stt", dataType: "number", format: "###,###,##0", width: 50, allowEditing: false,},
                { caption: "Mã TS", dataField: "ma_ts", dataType: "string", width: 100, allowEditing: false,},
                { caption: "Mã HT cũ", dataField: "ma_bfo", dataType: "string", width: 100, allowEditing: false,},
                { caption: "Tên tài sản", dataField: "ten_ts", dataType: "string", width: 200, allowEditing: false,},
                { caption: "Phòng ban quản lý", dataField: "pbql", dataType: "string", width: 200, allowEditing: false,},
                { caption: "Tháng năm đưa vào sử dụng", dataField: "tgsd", dataType: "string", width: 100, allowEditing: false,},
                { caption: "Ngày kết thúc KH/PB", dataField: "nkt_khpb", dataType: "string", width: 100, allowEditing: false,},
                { caption: "Phân nhóm TS ", dataField: "category_group", dataType: "string", width: 100, allowEditing: false,},
                {
                    caption: "Nguyên giá",
                    columns: [
                        { caption: "Số đầu kỳ", dataField: "ng_sdk", dataType: "number", format: "###,###,##0", width: 150, allowEditing: false,},
                        { caption: "Tăng trong kỳ", dataField: "ng_t", dataType: "number", format: "###,###,##0", width: 150, allowEditing: false,},
                        { caption: "Giảm trong kỳ", dataField: "ng_g", dataType: "number", format: "###,###,##0", width: 150, allowEditing: false,},
                        { caption: "Số cuối kỳ", dataField: "ng_sck", dataType: "number", format: "###,###,##0", width: 150, allowEditing: false,},
                    ]
                },
                {
                    caption: "Giá trị hao mòn",
                    columns: [
                        { caption: "Số đầu kỳ", dataField: "kh_sdk", dataType: "number", format: "###,###,##0", width: 150, allowEditing: false,},
                        { caption: "Tăng trong kỳ", dataField: "kh_t", dataType: "number", format: "###,###,##0", width: 150, allowEditing: false,},
                        { caption: "Giảm trong kỳ", dataField: "kh_g", dataType: "number", format: "###,###,##0", width: 150, allowEditing: false,},
                        { caption: "Số cuối kỳ", dataField: "kh_sck", dataType: "number", format: "###,###,##0", width: 150, allowEditing: false,},
                    ]
                },
              
            ];
        }

        return {onRequest}

    });
