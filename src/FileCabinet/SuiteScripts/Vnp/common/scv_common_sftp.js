define(['N/sftp', 'N/query', 'N/search', 'N/record'],

    (sftp, query, search, record) => {

        const FileStoreType = {
            SFTP: '1',
            FILE_CABINET: '2'
        }

        const FtpInfoDefault = {ID: 1};

        const downloadSftp = (connection, filename, directory, timeout) => {
            return connection.download({filename: filename, directory: directory, timeout: timeout});
        }

        const uploadSftp = (connection, f, filename, directory, timeout, replaceExisting) => {
            connection.upload({
                file: f,
                filename: filename,
                directory: directory,
                timeout: timeout,
                replaceExisting: replaceExisting
            });
        }

        const lookupSftpInfo = (ftpinfoId) => {
            let clFtpinfo = ['custrecord_scv_ftp_username', 'custrecord_scv_ftp_secret', 'custrecord_scv_ftp_url'
                , 'custrecord_scv_ftp_port', 'custrecord_scv_ftp_directory', 'custrecord_scv_ftp_hostkey'];
            return search.lookupFields({type: 'customrecord_scv_ftp_info', id: ftpinfoId, columns: clFtpinfo});
        }

        const createConnectionSftpFromId = (ftpinfoId, directoryip) => {
            let lkFtpinfo = lookupSftpInfo(ftpinfoId);
            return createConnectionSftpFromLk(lkFtpinfo, directoryip);
        }

        const createConnectionSftpFromRec = (recFtpinfo, directoryip) => {
            let username = recFtpinfo.getValue('custrecord_scv_ftp_username');
            let secret = recFtpinfo.getValue('custrecord_scv_ftp_secret');
            let urlsftp = recFtpinfo.getValue('custrecord_scv_ftp_url');
            let port = recFtpinfo.getValue('custrecord_scv_ftp_port');
            let directory = directoryip || recFtpinfo.getValue('custrecord_scv_ftp_directory');
            let hostkey = recFtpinfo.getValue('custrecord_scv_ftp_hostkey');
            return createConnectionSftp(username, secret, urlsftp, port, directory, hostkey);
        }

        const createConnectionSftpFromLk = (lkFtpinfo, directoryip) => {
            let username = lkFtpinfo.custrecord_scv_ftp_username;
            let secret = lkFtpinfo.custrecord_scv_ftp_secret;
            let urlsftp = lkFtpinfo.custrecord_scv_ftp_url;
            let port = lkFtpinfo.custrecord_scv_ftp_port * 1;
            let directory = directoryip || lkFtpinfo.custrecord_scv_ftp_directory;
            let hostkey = lkFtpinfo.custrecord_scv_ftp_hostkey;
            return createConnectionSftp(username, secret, urlsftp, port, directory, hostkey);
        }

        const createConnectionSftp = (username, secret, urlsftp, port, directory, hostkey) => {
            return sftp.createConnection({
                username: username,
                secret: secret,
                url: urlsftp,
                port: port,
                directory: directory,
                hostKey: hostkey
            });
        }

        const LIST_TYPE_ENTITY = ['employee', 'partner', 'custjob', 'vendor'];
        const findMappingFieldInfo = (parameters) => {
            let trid = parameters.trid || parameters.custpage_trid
            let trtype = parameters.trtype || parameters.custpage_trtype;
            let typeroot = parameters.typeroot || parameters.custpage_typeroot;
            let dbstrantype = parameters.dbstrantype || parameters.custpage_dbstrantype;

            let trtypes = [trtype];
            let subtrtype = null;
            if (dbstrantype) {
                subtrtype = 'transaction';
            } else if (typeroot === 'item') {
                subtrtype = typeroot;
            } else if (LIST_TYPE_ENTITY.includes(typeroot)) {
                subtrtype = 'entity';
            }
            if (subtrtype) {
                trtypes.push(subtrtype);
            }

            let listMark = [];
            for (let trtype of trtypes) {
                listMark.push('?');
            }
            let objMappingFieldInfo;
            let sql = `select f.custrecord_scv_mfi_sourcerecordtype sourcerecordtype, f.custrecord_scv_mfi_fieldidinfileinfo fieldid, 
                f.custrecord_scv_mfi_sourcefolder sourcefolder, f.custrecord_scv_mfi_idtoname idtoname, f.custrecord_scv_mfi_prefix prefix,
                f.custrecord_scv_mfi_filestoretype filestoretype, f.custrecord_scv_mfi_file_cabinnet_folder file_cabinet_folder,
                f.custrecord_scv_mfi_sourcefromfield sourcefromfield, f.custrecord_scv_mfi_fieldidinfileinfo_lv2 fieldidinfileinfo_lv2
                from customrecord_scv_mapping_file_info f where f.isinactive = 'F' and f.custrecord_scv_mfi_sourcerecordtype in(${listMark.join(',')})
            `;
            let resultSet = query.runSuiteQL({
                query: sql,
                params: trtypes,
                customScriptId: null
            });
            let listRes = resultSet.asMappedResults();
            let listTemp = listRes.filter(o => o.sourcerecordtype === trtype);
            if (!listTemp.length && subtrtype) {
                listTemp = listRes.filter(o => o.sourcerecordtype === subtrtype);
            }

            let rec = null;
            if (listTemp.some(o => o.sourcefromfield && o.fieldidinfileinfo_lv2)) {
                rec = record.load({type: trtype, id: trid, isDynamic: false});
            }

            for (let objTemp of listTemp) {
                if (!objTemp.sourcefromfield || !objTemp.fieldidinfileinfo_lv2) {
                    objMappingFieldInfo = objTemp;
                    break;
                }
                let fieldidinfileinfo_lv2_value = rec?.getValue({fieldId: objTemp.sourcefromfield});
                if (util.isArray(fieldidinfileinfo_lv2_value)) {
                    fieldidinfileinfo_lv2_value = fieldidinfileinfo_lv2_value[0]?.value || fieldidinfileinfo_lv2_value[0];
                }
                if (fieldidinfileinfo_lv2_value) {
                    objTemp.fieldidinfileinfo_lv2_value = fieldidinfileinfo_lv2_value;
                    objMappingFieldInfo = objTemp;
                    break;
                }
            }
            return objMappingFieldInfo || {};
        }

        const lookupFields = (type, id, columns) => {
            return search.lookupFields({type: type, id: id, columns: columns});
        }

        const removeSpecialCharacters = (str) => {
            return str.replace(/[^a-zA-Z0-9 ]/g, '');
        }

        return {
            FileStoreType,
            FtpInfoDefault,
            downloadSftp,
            uploadSftp,
            lookupSftpInfo,
            createConnectionSftpFromId,
            createConnectionSftpFromRec,
            createConnectionSftpFromLk,
            createConnectionSftp,
            findMappingFieldInfo,
            lookupFields,
            removeSpecialCharacters
        };

    });
