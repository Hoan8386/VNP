/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/url', '../common/scv_common_ui'],
    (url, comUI) => {
        const beforeLoad = (scriptContext) => {
            if (scriptContext.type === scriptContext.UserEventType.VIEW) {
                let newRecord = scriptContext.newRecord;
                let recid = newRecord.id;
                let rectype = newRecord.type;

                let urlSl = url.resolveScript({
                    scriptId: 'customscript_scv_sl_ddh_print',
                    deploymentId: 'customdeploy_scv_sl_ddh_print',
                    returnExternalUrl: false,
                    params: {
                        recid,
                        rectype,
                        printfile: 'scv_render_ddh_pdf'
                    }
                });
                let form = scriptContext.form;
                form.addButton({
                    id: 'custpage_scv_btn_ddh_pdf',
                    label: 'In Đơn đặt hàng', // TODO(BA-Q1): FDD ô J3 "Tên button" bỏ trống, chờ BA chốt.
                    functionName: "window.open('" + urlSl + "');"
                });
                comUI.addIconToButton(scriptContext.form, 'custpage_scv_field_icons_ddh');
            }
        }

        return {beforeLoad}

    });
