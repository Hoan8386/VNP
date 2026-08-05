/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/search', '../common/scv_common_sftp.js'],

    (search, commonSftp) => {

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            let request = scriptContext.request;
            let response = scriptContext.response;
            let parameters = request.parameters;
            let pathfileview = parameters.pathfileview;
            let filename = parameters.filename;
            if (!pathfileview) {
                let fileInfoId = parameters.fileinfoid;
                if (fileInfoId) {
                    let fieldOfFileInfo = search.lookupFields({
                        type: 'customrecord_scv_ftp_file_info',
                        id: fileInfoId,
                        columns: ['custrecord_scv_ftp_fif_filepath', 'custrecord_scv_ftp_fif_filename']
                    })
                    pathfileview = fieldOfFileInfo.custrecord_scv_ftp_fif_filepath;
                    filename = fieldOfFileInfo.custrecord_scv_ftp_fif_filepath;
                }
            }
            if (pathfileview) {
                let lastIndexofSplash = pathfileview.lastIndexOf("/");
                let directory = pathfileview.substring(0, lastIndexofSplash);
                let filenameDownload = pathfileview.substring(lastIndexofSplash + 1);
                let fieldOfFtpinfo = commonSftp.lookupSftpInfo(commonSftp.FtpInfoDefault.ID);
                let sftpConnection = commonSftp.createConnectionSftpFromLk(fieldOfFtpinfo, directory);
                let fd = commonSftp.downloadSftp(sftpConnection, filenameDownload, '', 300);
                fd.name = filename || filenameDownload;
                response.writeFile(fd, true);
            }
        }

        return {onRequest}
    });
