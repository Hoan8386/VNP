/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/ui/serverWidget', '../common/scv_common_sftp.js'],

    (record, serverWidget, commonSftp) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            // Create form
            if (scriptContext.request.method === 'GET') {
                scriptContext.response.writePage(createForm(scriptContext));
            } else {
                // Handle file upload
                let uploadedFile = scriptContext.request.files.custpage_file;
                let parameters = scriptContext.request.parameters;
                let fileinfo = parameters.custpage_fileinfo;
                let objFileInfo = fileinfo ? JSON.parse(fileinfo) : commonSftp.findMappingFieldInfo(parameters);
                if (uploadedFile) {
                    // Show confirmation message
                    let fileName = uploadedFile.name;
                    let fileStoreType = String(objFileInfo.filestoretype);
                    if (fileStoreType === commonSftp.FileStoreType.FILE_CABINET) {
                        let fileNameFull = makeFileName(objFileInfo, fileName, parameters);
                        uploadedFile.name = fileNameFull;
                        uploadedFile.folder = objFileInfo.file_cabinet_folder;
                        let fileId = uploadedFile.save();
                        createFileInfo(parameters, fileNameFull, '', objFileInfo.fieldid, fileId);
                    } else if (fileStoreType === commonSftp.FileStoreType.SFTP) {
                        let fieldOfFtpinfo = commonSftp.lookupSftpInfo(commonSftp.FtpInfoDefault.ID);
                        let sftpConnection = commonSftp.createConnectionSftpFromLk(fieldOfFtpinfo, '');
                        let parameters = scriptContext.request.parameters;
                        let directorysub = objFileInfo.sourcefolder ? '/' + objFileInfo.sourcefolder : '';
                        let fileNameFull = makeFileName(objFileInfo, fileName, parameters);
                        commonSftp.uploadSftp(sftpConnection, uploadedFile, fileNameFull, directorysub, 300, true);
                        let filePath = fieldOfFtpinfo.custrecord_scv_ftp_directory + directorysub + '/' + fileNameFull;
                        //log.error('filePath', filePath);
                        createFileInfo(parameters, fileName, filePath, objFileInfo.fieldid);
                    }
                    scriptContext.response.writePage(createForm(scriptContext, {message: 'File uploaded successfully: ' + fileName}, objFileInfo));
                } else {
                    scriptContext.response.writePage(createForm(scriptContext, {
                        message: 'No file uploaded. Please select a file to upload.',
                        isfalse: true
                    }, objFileInfo));
                }
            }
        }

        const makeFileName = (objFileInfo, fileName, parameters) => {
            let trid = parameters.custpage_trid;
            let trtype = parameters.custpage_trtype;
            let prefixName = objFileInfo.prefixName || '';
            if (!prefixName && (objFileInfo.idtoname || objFileInfo.prefix)) {
                let idtoname = objFileInfo.idtoname ? objFileInfo.idtoname.split(',') : '';
                let lengIdtoname = idtoname.length;
                let prefix = objFileInfo.prefix ? objFileInfo.prefix.split(',') : '';
                lengIdtoname = !lengIdtoname ? prefix.length : lengIdtoname;
                let columns = [...new Set([...idtoname, ...prefix])];
                columns = columns.filter(item => item);
                let fieldOfRecord = commonSftp.lookupFields(trtype, trid, columns);
                for (let i = 0; i < lengIdtoname; i++) {
                    let fieldIdtoname = idtoname[i];
                    let fieldIdPrefix = prefix[i];
                    let valueIdtoname = fieldIdtoname ? fieldOfRecord[fieldIdtoname] : '';
                    valueIdtoname = valueIdtoname && util.isArray(valueIdtoname) ? (valueIdtoname.length > 0 ? valueIdtoname[0].value : '') : valueIdtoname;
                    let valuePrefix = fieldIdPrefix ? fieldOfRecord[fieldIdPrefix] : '';
                    valuePrefix = valuePrefix && util.isArray(valuePrefix) ? (valuePrefix.length > 0 ? valuePrefix[0].value : '') : valuePrefix;
                    valueIdtoname = commonSftp.removeSpecialCharacters(valueIdtoname);
                    valuePrefix = commonSftp.removeSpecialCharacters(valuePrefix);
                    if (valueIdtoname) {
                        prefixName = valuePrefix ? valuePrefix + (valueIdtoname ? '_' + valueIdtoname : '') : valueIdtoname;
                        objFileInfo.prefixName = prefixName;
                        break;
                    }
                }
            }
            let lastIndexOfDot = fileName.lastIndexOf('\.');
            let fileNamePreDot = fileName.substring(0, lastIndexOfDot);
            let fileNameAftDot = fileName.substring(lastIndexOfDot + 1);
            fileName = fileNameAftDot ? commonSftp.removeSpecialCharacters(fileNamePreDot) + '.' + commonSftp.removeSpecialCharacters(fileNameAftDot) : commonSftp.removeSpecialCharacters(fileNamePreDot);
            return (prefixName ? prefixName + '_' : '') + trid + '_' + generateRandomNumber() + '_' + fileName;
        }

        const generateRandomNumber = () => {
            let now = new Date().getTime();
            let randomNumber = Math.floor((Math.random() * now) % 1000000);
            while (randomNumber < 100000) {
                randomNumber = Math.floor((Math.random() * now) % 1000000);
            }
            return randomNumber;
        }

        const createFileInfo = (parameters, fileName, filePath, fieldid, fileid) => {
            let trid = parameters.custpage_trid;
            let trtype = parameters.custpage_trtype;

            let recFif = record.create({type: 'customrecord_scv_ftp_file_info'});
            recFif.setValue('name', fileName);
            recFif.setValue('custrecord_scv_ftp_fif_trid', trid);
            recFif.setValue('custrecord_scv_ftp_fif_trtype', trtype);
            recFif.setValue('custrecord_scv_ftp_fif_filename', fileName);
            recFif.setValue('custrecord_scv_ftp_fif_filepath', filePath);
            recFif.setValue('custrecord_scv_ftp_fif_document', fileid);
            if (fieldid) {
                recFif.setValue(fieldid, trid);
            }
            return recFif.save();
        }

        const createForm = (scriptContext, objMessage, objFileInfo) => {
            let parameters = scriptContext.request.parameters;
            let trid = parameters.trid || parameters.custpage_trid;
            let trtype = parameters.trtype || parameters.custpage_trtype;
            let typeroot = parameters.typeroot || parameters.custpage_typeroot;
            let dbstrantype = parameters.dbstrantype || parameters.custpage_dbstrantype;

            let script = parameters.custpage_script || parameters.script;
            let deploy = parameters.custpage_deploy || parameters.deploy;

            let form = serverWidget.createForm({
                title: 'Upload File'
            });
            form.clientScriptModulePath = '../cssl/scv_cs_sl_sftp_uploadfile.js';
            if (objMessage) {
                form.addField({
                    id: 'custpage_message',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: ' '
                }).defaultValue = objMessage.message;
            }

            // Add file upload field
            form.addField({
                id: 'custpage_file',
                type: serverWidget.FieldType.FILE,
                label: 'Select File'
            });
            //Add Hidden Field
            addFieldHiden(form, 'custpage_trid', trid);
            addFieldHiden(form, 'custpage_trtype', trtype);
            addFieldHiden(form, 'custpage_typeroot', typeroot);
            addFieldHiden(form, 'custpage_dbstrantype', dbstrantype);
            addFieldHiden(form, 'custpage_script', script);
            addFieldHiden(form, 'custpage_deploy', deploy);
            let fileinfo = objFileInfo ? JSON.stringify(objFileInfo) : (parameters.custpage_fileinfo || '');
            addFieldHiden(form, 'custpage_fileinfo', fileinfo, serverWidget.FieldType.LONGTEXT);

            // Add submit button
            form.addSubmitButton({
                label: 'Upload'
            });

            return form;
        }

        const addFieldHiden = (form, id, value, type) => {
            let custpage_trid = form.addField({
                id: id,
                type: type || serverWidget.FieldType.TEXT,
                label: id
            });
            custpage_trid.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            custpage_trid.defaultValue = value;
        }

        return {onRequest}

    });
