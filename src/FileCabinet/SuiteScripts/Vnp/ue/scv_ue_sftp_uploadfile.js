/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/url',
        '../lib/scv_lib_report.js', '../common/scv_common_sftp.js'],

    (record, runtime, url, libRep, commonSftp) => {

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @Since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            let triggerType = scriptContext.type;
            if (triggerType === 'view') {
                let form = scriptContext.form;
                let newRecord = scriptContext.newRecord;
                let recType = newRecord.type;
                if (recType === 'customrecord_scv_ftp_file_info') {
                    let filePath = newRecord.getValue('custrecord_scv_ftp_fif_filepath');
                    let fileName = newRecord.getValue('custrecord_scv_ftp_fif_filename');
                    if (filePath) {
                        addButtonViewFile(form, 'custpage_btn_sftp_viewfile', 'View File', filePath, fileName);
                    }
                } else {
                    addButtonUploadFile(form, 'custpage_btn_sftp_uploadfile', 'Upload File', newRecord);
                }
            }
        }

        const addButtonViewFile = (form, btid, label, filePath, fileName) => {
            let urlViewFile = url.resolveScript({
                scriptId: 'customscript_scv_sl_sftp_viewfile',
                deploymentId: 'customdeploy_scv_sl_sftp_viewfile',
                returnExternalUrl: false
            });
            urlViewFile += '&pathfileview=' + encodeURIComponent(filePath) + '&filename=' + encodeURIComponent(fileName);
            form.addButton({
                id: btid,
                label: label,
                functionName: "window.open('" + urlViewFile + "');"
            });

        }

        const addButtonUploadFile = (form, btid, label, newRecord) => {
            let parameters = {
                trid: newRecord.id,
                trtype: newRecord.type,
                typeroot: newRecord.getValue('type'),
                dbstrantype: newRecord.getValue('dbstrantype') || ''
            };
            let objFileInfo = commonSftp.findMappingFieldInfo(parameters);
            if (objFileInfo.fieldid || objFileInfo.file_cabinet_folder) {
                let urlUploadFile = url.resolveScript({
                    scriptId: 'customscript_scv_sl_sftp_uploadfile',
                    deploymentId: 'customdeploy_scv_sl_sftp_uploadfile',
                    returnExternalUrl: false,
                    params: parameters
                });
                form.addButton({
                    id: btid,
                    label: label,
                    functionName: "const offsetWidth = window.document.getElementById('main_form').children[0].offsetWidth + 10; nlExtOpenWindow('" + urlUploadFile + "', 'upload_file', offsetWidth / 2, 450, this, false, 'Upload File')"
                });
            }
        }

        return {
            beforeLoad
        };

    });
