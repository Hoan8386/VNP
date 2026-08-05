/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['../common/scv_common_sftp.js'],

    (commonSftp) => {
        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            let tgType = scriptContext.type;
            if (['create', 'edit', 'copy'].includes(tgType)) {
                let newRecord = scriptContext.newRecord;
                let sourcefolder = newRecord.getValue('custrecord_scv_mfi_sourcefolder');
                if (sourcefolder) {
                    let fieldOfFtpInfo = commonSftp.lookupSftpInfo(commonSftp.FtpInfoDefault.ID);
                    let sftpConnection = commonSftp.createConnectionSftpFromLk(fieldOfFtpInfo, '');
                    try {
                        let listObj = sftpConnection.list({path: sourcefolder});
                        log.error('listObj', listObj);
                    } catch (e) {
                        sftpConnection.makeDirectory({path: sourcefolder});
                    }
                }
            }
        }

        return {afterSubmit}

    });
