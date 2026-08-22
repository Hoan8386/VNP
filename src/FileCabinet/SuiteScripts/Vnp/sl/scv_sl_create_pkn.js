/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  12 Aug 2026         Khanh Tran              Init, create file. Chức năng tạo Phiếu kiểm nhận from ms. Thủy(https://app.clickup.com/t/3773072/86d40b1jh)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/runtime', 'N/url',
    '../common/scv_common_create_pkn.js',
    '../cons/scv_cons_form.js',
    '../cons/scv_cons_search_trans_to_pkn.js',
    '../cons/scv_cons_search_total_qty_pkn.js',
    '../cons/scv_cons_search_tcn_data.js',
    '../cons/scv_cons_search_item_tck.js',
    '../cons/scv_cons_search_tcn_hanghoa.js',
    '../cons/scv_cons_search_inb_to_pkn.js',
], (
    runtime, url,
    commonCreatePkn,
    
    constForm,
    constSearchTranToPkn,
    constSearchTotalQtyPkn,
    constSearchTcnData,
    constSearchItemTck,
    constSearchTcnHangHoa,
    constSearchInbToItr,
) => {
    const CurrentScript = {
        ID: 'customscript_scv_sl_create_pkn',
        DEPLOYID_UI: 'customdeploy_scv_sl_create_pkn',
        DEPLOYID_DATA: 'customdeploy_scv_sl_create_pkn_svc',
    };

    const onRequest = (scriptContext) => {
        constForm.setContext(scriptContext);
        constForm.setServiceScript(CurrentScript.ID, CurrentScript.DEPLOYID_DATA);

        let params = scriptContext.request.parameters;
        let curScript = runtime.getCurrentScript();

        if (curScript.deploymentId == CurrentScript.DEPLOYID_DATA) {
            let objResponse = { data: [] };
            switch (params.action) {
                case 'trans_to_pkn_01':
                    objResponse.data = constSearchTranToPkn.getDataSourceFetchPage(params);
                    break;
                case 'total_qty_pkn_02':
                    objResponse.data = constSearchTotalQtyPkn.getDataSourceFetchPage(params);
                    break;
                case 'tcn_data_03':
                    objResponse.data = constSearchTcnData.getDataSourceFetchPage(params);
                    break;
                case 'item_tck_04':
                    objResponse.data = constSearchItemTck.getDataSourceFetchPage(params);
                    break;
                case 'tcn_hanghoa_05':
                    objResponse.data = constSearchTcnHangHoa.getDataSourceFetchPage(params);
                    break;
                case 'inb_to_pkn_06':
                    objResponse.data = constSearchInbToItr.getDataSourceFetchPage(params);
                    break;
                case 'onSubmitCreatePkn':
                    objResponse.data = onSubmitCreatePkn(params);
                    break;
            }
            constForm.write(objResponse);
        } else if (scriptContext.request.method == 'GET') {
            onCreateFormUI(params);
        }
    };

    const onCreateFormUI = (params) => {
        let isInboundShipment = !!params?.custpage_inboundshipment;
        let hasSource = isInboundShipment || !!params?.custpage_createdfrom;

        constForm.createForm('Tạo Phiếu kiểm nhận', '../cssl/scv_cs_sl_create_pkn.js');

        constForm.addPageLink([constSearchTranToPkn.ID, constSearchTotalQtyPkn.ID, constSearchTcnData.ID, constSearchItemTck.ID, constSearchTcnHangHoa.ID, constSearchInbToItr.ID], true);

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
        
        let mainGrp = constForm.addFieldGroup({ id: "fieldgrp_main", label: "Main" });
        
        if (isInboundShipment) {
            constForm.addField({
                id: "custpage_inboundshipment",
                label: "Inbound Shipment",
                type: "select",
                source: "inboundShipment",
                container: mainGrp.id,
            }, true, {
                defaultValue: params?.custpage_inboundshipment,
                displayType: hasSource ? 'disabled' : null,
            });
        }
        else {
            constForm.addField({
                id: "custpage_createdfrom",
                label: "Created From",
                type: "select",
                source: "transaction",
                container: mainGrp.id,
            }, true, {
                defaultValue: params?.custpage_createdfrom,
                displayType: hasSource ? 'disabled' : null,
            });
        }

        let ttcGrp = constForm.addFieldGroup({ id: "fieldgrp_ttc", label: "Thông tin chung" });
        
        constForm.addField({
            id: "custpage_invoiceserial",
            label: "Invoice Serial",
            type: "text",
            container: ttcGrp.id,
        }, false, {
            defaultValue: params?.custpage_invoiceserial,
        });
        
        constForm.addField({
            id: "custpage_invoicenumber",
            label: "Invoice Number",
            type: "text",
            container: ttcGrp.id,
        }, false, {
            defaultValue: params?.custpage_invoicenumber,
        });
        
        constForm.addField({
            id: "custpage_invoicedate",
            label: "Invoice Date",
            type: "date",
            container: ttcGrp.id,
        }, false, {
            defaultValue: params?.custpage_invoicedate,
            breakType: "startcol",
        });
        
        constForm.addGridDx({
            id: 'custpage_sl_result',
            type: 'grid',
            label: 'Chi tiết',
            columns: commonCreatePkn.getColumnsResult(),
            optionsDx: {
                editing: {
                    allowUpdating: true,
                }
            },
        });

        constForm.addMarkAllButtonsDx("custpage_sl_result");

        constForm.addGridDx({
            id: 'custpage_sl_tcn',
            type: 'grid',
            label: 'Tiêu chí nhận (chứng từ)',
            columns: commonCreatePkn.getColumnsTcn(),
            optionsDx: {
                editing: {
                    allowUpdating: true,
                }
            },
        });

        constForm.writePage();
    };

    const onSubmitCreatePkn = (params) => {log.error('onSubmitCreatePkn', params)
        let objResponse = {success: true, msg: "Success", recId: "", recUrl: ""};

        let objReqBody = JSON.parse(params.body || {});

        try {
            objResponse.recId = commonCreatePkn.createPhieuKiemNhan(objReqBody);log.error('recId', objResponse.recId)

            objResponse.recUrl = url.resolveRecord({recordType: 'customrecord_scv_inspection_header', recordId: objResponse.recId});
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
