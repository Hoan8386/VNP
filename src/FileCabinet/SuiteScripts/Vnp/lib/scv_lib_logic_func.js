/**
 * @NApiVersion 2.1
 */
define([
        "N/url", "N/record", "N/https",
        "../olib/moment", "../olib/lodash.min", '../lib/scv_lib_function', 'N/search'],

    function (url, record, https, moment, _, libFn, search) {

        const createCheckFromBillCredit = (objBody) => {
            let result = {response: [], isSuccess: true, error: ''};
            try {
                const idBillCredit = objBody.internalid;
                const recBillCredit = record.load({type: record.Type.VENDOR_CREDIT, id: idBillCredit});
                const idCheck = createRecordCheck(recBillCredit);
                if (idCheck) record.submitFields({
                    type: record.Type.VENDOR_CREDIT,
                    id: idBillCredit,
                    values: {custbody_scv_related_transaction: idCheck},
                    options: {enableSourcing: false, ignoreMandatoryFields: true}
                });
            } catch (e) {
                result.isSuccess = false;
                result.error = e;
                log.error('createCheckFromBillCredit error', JSON.stringify(e));
            }
            return result;
        };

        const fnUpdateDataWhenChangeOriginRecordToRelatedRecord = (options) => {
            try {
                const newRecord = options.newRecord;
                const oldRecord = options.oldRecord;
                const fieldHeaders = options.fieldHeaders;
                const sublistID = options.sublistID;
                const fieldLines = options.fieldLines;
                const relatedRecordId = options.relatedRecordId;
                const relatedRecordType = options.relatedRecordType;
                const recUpd = record.load({type: relatedRecordType, id: relatedRecordId});
                let isUpd = false;
                const lengthFieldHeader = fieldHeaders.length;
                for (let i = 0; i < lengthFieldHeader; i++) {
                    const fieldName = fieldHeaders[i];
                    const valueOld = oldRecord.getValue(fieldName);
                    const valueNew = newRecord.getValue(fieldName);
                    if (valueOld !== valueNew) {
                        isUpd = true;
                        recUpd.setValue(fieldName, valueNew);
                    }
                }
                const lengthFieldLine = fieldLines.length;
                const lineCount = recUpd.getLineCount({sublistId: sublistID});
                for (let line = 0; line < lineCount; line++) {
                    for (let i = 0; i < lengthFieldLine; i++) {
                        const sublistFieldName = fieldLines[i];
                        const valueOld = oldRecord.getSublistValue({
                            sublistId: sublistID,
                            fieldId: sublistFieldName,
                            line: line
                        });
                        const valueNew = newRecord.getSublistValue({
                            sublistId: sublistID,
                            fieldId: sublistFieldName,
                            line: line
                        });
                        if (valueOld !== valueNew) {
                            isUpd = true;
                            recUpd.setSublistValue({
                                sublistId: sublistID,
                                fieldId: sublistFieldName,
                                line: line,
                                value: valueNew
                            });
                        }
                    }
                }

                if (isUpd) {
                    recUpd.save({enableSourcing: false, ignoreMandatoryFields: true});
                }
            } catch (e) {
                log.error("Error fnUpdateDataWhenChangeOriginRecordToRelatedRecord: ", e);
            }
        }

        const isCheckChangeDataFieldHeader = (options) => {
            const newRecord = options.newRecord;
            const oldRecord = options.oldRecord;
            const fieldHeaders = options.fieldHeaders;
            let isUpd = false;
            const lengthFieldHeader = fieldHeaders.length;
            for (let i = 0; i < lengthFieldHeader; i++) {
                const fieldName = fieldHeaders[i];
                const valueOld = oldRecord.getValue(fieldName);
                const valueNew = newRecord.getValue(fieldName);
                if (valueOld !== valueNew) {
                    isUpd = true;
                    break;
                }
            }
            return isUpd;
        };

        const isCheckChangeDataFieldLine = (options) => {
            const newRecord = options.newRecord;
            const fieldLines = options.fieldLines
            const oldRecord = options.oldRecord;
            const sublistID = options.sublistID;
            let isUpd = false;
            const lengthFieldLine = fieldLines.length;
            const lineCount = newRecord.getLineCount({sublistId: sublistID});
            for (let line = 0; line < lineCount; line++) {
                for (let i = 0; i < lengthFieldLine; i++) {
                    const sublistFieldName = fieldLines[i];
                    const valueOld = oldRecord.getSublistValue({
                        sublistId: sublistID,
                        fieldId: sublistFieldName,
                        line: line
                    });
                    const valueNew = newRecord.getSublistValue({
                        sublistId: sublistID,
                        fieldId: sublistFieldName,
                        line: line
                    });
                    if (valueOld !== valueNew) {
                        isUpd = true;
                        break;
                    }
                }
            }
            return isUpd;
        }


        const createRecordCheck = (recBillCredit) => {
            let idCheck = '';
            try {
                const recCheck = record.create({type: record.Type.CHECK, isDynamic: true});
                const entityId = recBillCredit.getValue('entity');
                const accountId = recBillCredit.getValue('custbody_scv_account');
                const entityRPId = recBillCredit.getValue('custbody_scv_tb_entity_name');
                recCheck.setValue('entity', entityId);
                recCheck.setValue('account', accountId);
                recCheck.setValue('custbody_scv_tb_entity_name', entityRPId ||entityId);
                libFn.setValue(recCheck, recBillCredit, [
                        'location', 'class','currency', 'memo', 'trandate', 'exchangerate', 'custbody_scv_pur_contract_no',
                        'custbody_scv_beneficiary', 'custbody_scv_nguoithuhuong', 'custbody_scv_bank_account',
                        'custbody_scv_bank_name', 'custbody_scv_bank_branch', 'custbody_scv_payment_number',
                        'cseg_scv_bu_center', 'cseg_scv_subsidiary', 'custbody_scv_salescontract'
                    ],
                    [
                        'location', 'class','currency', 'memo', 'trandate', 'exchangerate', 'custbody_scv_pur_contract_no',
                        'custbody_scv_beneficiary', 'custbody_scv_nguoithuhuong', 'custbody_scv_bank_account',
                        'custbody_scv_bank_name', 'custbody_scv_bank_branch', 'custbody_scv_payment_number',
                        'cseg_scv_bu_center', 'cseg_scv_subsidiary', 'custbody_scv_salescontract'
                    ]);
                const docNumPrefix = accountId ?  (search.lookupFields({type: search.Type.ACCOUNT, id: accountId, columns: ['custrecord_scv_gl_number_chi']})?.custrecord_scv_gl_number_chi?.[0]?.value || '') : ''
                recCheck.setValue('custbody_scv_doc_num_prefix', docNumPrefix);
                recCheck.setValue('custbody_scv_related_transaction', recBillCredit.id);
                let lineCountBillCredit = recBillCredit.getLineCount('expense');
                for (let i = 0; i < lineCountBillCredit; i++) {
                    recCheck.selectNewLine('expense');
                    libFn.setCurrentSublistValue(recCheck, recBillCredit, 'expense', 'expense', ['account', 'memo', 'amount', 'taxcode', 'taxrate1', 'tax1amt', 'grossamt', 'depatment', 'location'], ['account', 'memo', 'amount', 'taxcode', 'taxrate1', 'tax1amt', 'grossamt', 'depatment', 'location'], i);
                    recCheck.commitLine('expense');
                }
                idCheck = recCheck.save({ignoreMandatoryFields: true});
            } catch (e) {
                log.error('createRecordCheck error', JSON.stringify(e));
            }
            return idCheck;
        };

        /**
         * Des: Post to Server
         * @param flag
         * @param body
         * @param suffix
         * @returns {any}
         */
        const postServerNS = (flag, body, suffix = '') => {
            try {
                const myRestletHeaders = {
                    'Content-Type': 'application/json'
                };
                const bodyObj = {};
                bodyObj.flag = flag;
                bodyObj.body = body;
                const myRestletResponse = https.requestRestlet({
                    scriptId: 'customscript_scv_rl_be_cpc',
                    deploymentId: 'customdeploy_scv_rl_be_cpc' + suffix,
                    headers: myRestletHeaders,
                    method: https.Method.POST,
                    body: JSON.stringify(bodyObj),
                });
                return JSON.parse(myRestletResponse.body);
            } catch (e) {
                return null;
                log.error('postServerNS error', JSON.stringify(e));
            }
        };

        /**
         * Des: Post to Server Async
         * @param flag
         * @param body
         * @param suffix
         * @returns {any}
         */
        const postServerNSAsync = (flag, body, suffix = '') => {
            const myRestletHeaders = {
                'Content-Type': 'application/json'
            };
            const bodyObj = {};
            bodyObj.flag = flag;
            bodyObj.body = body;
            return https.requestRestlet.promise({
                scriptId: 'customscript_scv_rl_be_cpc',
                deploymentId: 'customdeploy_scv_rl_be_cpc' + suffix,
                headers: myRestletHeaders,
                method: https.Method.POST,
                body: JSON.stringify(bodyObj),
            });
        };

        /**
         * Reset the original line values in a sublist.
         *
         * @param {Object} scriptContext - The context of the script
         * @param {string} sublistId - The id of the sublist to reset
         * @param {string} fieldOriginalLine - The field containing the original line values
         */
        const resetOriginalLine = (scriptContext, sublistId, fieldOriginalLine) => {
            try {
                let newRecord = scriptContext.newRecord;
                let sublistId = sublistId;
                let lineCnt = newRecord.getLineCount(sublistId);
                for (let i = 0; i < lineCnt; i++) {
                    newRecord.setSublistValue({sublistId: sublistId, fieldId: fieldOriginalLine, line: i, value: ""});
                }
            } catch (err) {
                log.error("Error resetOriginalLine: ", err);
            }
        }

        /**
         * Des : Calculates the total field value for each field in a sublist inline.
         * @param {Object} scriptContext - The context object containing the newRecord property.
         * @param {string} sublistId - The ID of the sublist.
         * @param {Array} listFields - An array of field IDs to calculate the total for.
         * @return {Object} An object containing the total field value for each field ID.
         */
        const getTotalFieldInline = (scriptContext, sublistId, listFields) => {
            let objTotal = listFields.reduce((obj, field) => {
                obj[field] = 0;
                return obj;
            }, {});
            let newRecord = scriptContext.newRecord;
            let lineCnt = newRecord.getLineCount(sublistId);
            for (let i = 0; i < lineCnt; i++) {
                listFields.forEach(field => objTotal[field] += parseNumber(newRecord.getSublistValue({
                    sublistId: sublistId,
                    fieldId: field,
                    line: i
                })));
            }
            return objTotal;
        };

        const afterMakeCopyItemUT = (options) => {
            let results = {isSuccess: true, response : null, error : ''};
            const arrPic = options.arrPic;
            const arrTieuChiKiem = options.arrTieuChiKiem;
            const arrLegalFile = options.arrLegalFile;
            const itemId = options.itemId;
            results.arrPic = arrPic;
            results.arrLegalFile = arrLegalFile;
            results.arrTieuChiKiem = arrTieuChiKiem;
            makeCopyTieuChiKiem(itemId, arrTieuChiKiem);
            try {
                addItemIdToRecord(itemId, 'customrecord_scv_legal_file', 'custrecord_scv_legalfile_item', arrLegalFile);
                addItemIdToRecord(itemId, 'customrecord_scv_emp_in_charge', 'custrecord_scv_pic_item', arrPic);
            } catch (e) {
                results.isSuccess = false;
                results.error = e;
                log.error('Error fnUpdLegalFileAndPic: ', e);
            }
            return results;
        };

        const makeCopyTieuChiKiem = (itemId, arrData) => {
            const len = arrData.length;
            if (len === 0) return;
            for (let i = 0; i < len; i++) {
                const objCur = arrData[i];
                let recTieuChiKiem = record.copy({type: 'customrecord_scv_iteminspectplan', id: objCur.id,});
                recTieuChiKiem.setValue('custrecord_scv_iip_item', itemId);
                let id = recTieuChiKiem.save({ignoreMandatoryFields: true});
            }
        };

        const addItemIdToRecord = (idItem, recordType, fieldIdAddItem, arrData) => {
            const len = arrData.length;
            if (len === 0) return;
            for (let i = 0; i < len; i++) {
                const objCur = arrData[i];
                let curRecUpd = record.load({type : recordType, id : objCur.id});
                let arrItem = curRecUpd.getValue(fieldIdAddItem);
                arrItem.push(idItem);
                curRecUpd.setValue(fieldIdAddItem, arrItem);
                curRecUpd.save({ignoreMandatoryFields: true});
            }
        };

        const autoGenerateOriginalLine = (scriptContext, sublistId, fieldOriginalLine, method = 'string') => {
            try {
                let newRecord = scriptContext.newRecord;
                let lineCnt = newRecord.getLineCount(sublistId);
                for (let i = 0; i < lineCnt; i++) {
                    const origilnalNum = generateOriginalLineId(method) + '_' + i;
                    const vOriginalLineId = newRecord.getSublistValue({
                        sublistId: sublistId,
                        fieldId: fieldOriginalLine,
                        line: i,
                    });
                    if (!isValidValue(vOriginalLineId))
                        newRecord.setSublistValue({
                            sublistId: sublistId,
                            fieldId: fieldOriginalLine,
                            line: i,
                            value: origilnalNum,
                        });
                }
            } catch (err) {
                log.error("Error autoGenerateOriginalLine: ", err)
            }
        };

        const autoGenerateOriginalId = (newRecord, fieldOriginalLine, method = 'string') => {
            const originalId = newRecord.getValue(fieldOriginalLine);
            if (!isValidValue(originalId)) newRecord.setValue(fieldOriginalLine, generateOriginalLineId(method));
        };

        const generateOriginalLineId = (method) => {
            switch (method) {
                case 'string':
                    return moment().unix() + "-" + _.random(0, 99999);
                    break;
                case 'number':
                    return moment().unix() + "" + _.random(0, 99999);
                    break;
            }
        };

        const parseNumber = (value) => (value === "" || value === null || value === undefined) ? 0 : parseFloat(value);

        const isValidValue = value => value !== "" && value !== null && value !== undefined
            ?
            typeof value === "object"
                ?
                Array.isArray(value)
                    ?
                    value.length > 0
                    :
                    Object.keys(value).length > 0
                :
                true
            :
            false;

        return {
            createRecordCheck,
            resetOriginalLine,
            getTotalFieldInline,
            createCheckFromBillCredit,
            autoGenerateOriginalLine,
            postServerNS,
            postServerNSAsync,
            fnUpdateDataWhenChangeOriginRecordToRelatedRecord,
            autoGenerateOriginalId,
            afterMakeCopyItemUT,
            isCheckChangeDataFieldHeader: isCheckChangeDataFieldHeader,
            isCheckChangeDataFieldLine: isCheckChangeDataFieldLine,
        };

    });
