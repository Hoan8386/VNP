/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/runtime', 'N/search',
        '../common/scv_common_internal.js'],
    (record, runtime, search, commonInternal) => {

        /**
         * Function called upon sending a GET request to the RESTlet.
         *
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.1
         */
        const doGet = (requestParams) => {
            let type = requestParams.type;
            return JSON.stringify(commonInternal.getFieldsConfig(type));//Test
        }

        /**
         * Function called upon sending a PUT request to the RESTlet.
         *
         * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
         * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.2
         */
        const doPut = (requestBody) => {
            log.error('requestBody', requestBody);
            let objData = {internalid: requestBody.internalid};
            try {
                let recEdit = record.load({type: requestBody.type, id: requestBody.internalid, isDynamic: true});
                if (requestBody.type === record.Type.BOM_REVISION) {
                    commonInternal.handleUpdateBomRevision(recEdit, requestBody);
                } else {
                    commonInternal.updateFields(recEdit, requestBody);
                    commonInternal.updateCurrentSublistValue(recEdit, requestBody);
                }
                recEdit.save.promise({enableSourcing: true, ignoreMandatoryFields: true});
            } catch (e) {
                log.error('exception update: ', e);
                throw e;
            }
            return objData;
        }

        /**
         * Function called upon sending a POST request to the RESTlet.
         *
         * @param {string | Object} requestBody - The HTTP request body; request body will be passed into function as a string when request Content-Type is 'text/plain'
         * or parsed into an Object when request Content-Type is 'application/json' (in which case the body must be a valid JSON)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.2
         */
        const doPost = (requestBody) => {
            let type = requestBody.type;
            let action = requestBody.action;
            let status = true;
            let message = '', transform_id = null;
            let objData = {};
            log.error('requestBody', requestBody);
            //cmItgMo.createLog(requestBody);
            let starttime = new Date();

            if (action === 'create') {
                //Cho xu ly
            } else if (action === 'submitfields') {
                try {
                    objData.internalid = commonInternal.submitRecord(requestBody, type);
                } catch (e) {
                    status = false;
                    message = e;
                    log.error('body exception submitfields: ', e);
                }
            } else if (action === 'submitfieldslist') {
                let ids = [];
                let datas = requestBody.datas;
                if (datas) {
                    commonInternal.assignBatch(action, datas, requestBody.batch_no);
                    let dataChilds = datas.splice(0, 20);
                    for (let data of dataChilds) {
                        let id = commonInternal.submitRecord(data, data.type);
                        ids.push(id);
                    }
                    objData.internalids = ids;
                }
            } else if (action === 'update') {
                try {
                    objData.internalid = commonInternal.updateRecord(requestBody, type);
                } catch (e) {
                    status = false;
                    message = e;
                    log.error('exception update: ', e);
                }
            } else if (action === 'updatelist') {
                let ids = [];
                let datas = requestBody.datas;
                if (datas) {
                    commonInternal.assignBatch(action, datas, requestBody.batch_no);
                    let dataChilds = datas.splice(0, 20);
                    for (let data of dataChilds) {
                        let id = commonInternal.updateRecord(data, data.type);
                        ids.push(id);
                    }
                    objData.internalids = ids;
                }
            } else if (action === 'add') {
                try {
                    objData.internalid = commonInternal.addOrUpdateRecordVersionCurrent(requestBody, type).id;//addRecord
                } catch (e) {
                    status = false;
                    message = e;
                    log.error('exception add: ', e);
                }
            } else if (action === 'addlist') {
                let ids = [];
                let datas = requestBody.datas;
                if (datas) {
                    commonInternal.assignBatch(action, datas, requestBody.batch_no);
                    let dataChilds = datas.splice(0, 20);
                    for (let data of dataChilds) {
                        let id = commonInternal.addOrUpdateRecordVersionCurrent(data, data.type).id;
                        ids.push(id);
                    }
                    objData.internalids = ids;
                }
            } else if (action === 'delete') {
                record.delete({type: type, id: requestBody.internalid});
            } else if (action === 'get') {
                if (type === 'userpreferences') {
                    objData.fields = commonInternal.getFieldsConfig(type);
                    let currentUser = runtime.getCurrentUser();
                    let lkR = search.lookupFields({type: 'role', id: currentUser.role, columns: ['name']});
                    objData.currentUser = {
                        id: currentUser.id,
                        name: currentUser.name,
                        role: currentUser.role,
                        roleName: lkR.name
                    };
                } else {
                    commonInternal.assignInforRecordData(type, requestBody, objData);
                }
            } else if (action === 'search') {
                let filters = requestBody.filters;
                let arrFilter = [];
                if (filters) {
                    commonInternal.pushFilter(type, arrFilter, filters);
                } else {
                    filters = {};
                }
                let columns, fields, stype;
                ({status, message, columns, fields, stype} = commonInternal.getColumnsFields(type, action, arrFilter));

                let prefix = type.substring(0, 12);
                let totalRecord = 0, records = [];
                let pageinfo = requestBody.pageinfo;
                if (status) {
                    totalRecord = commonInternal.doSearch(stype, records, columns, fields, arrFilter, pageinfo);
                } else if (prefix === 'customsearch') {
                    ({totalRecord, records} = commonInternal.searchCustomSearch(type, filters, arrFilter, pageinfo));
                    status = true;
                    message = '';
                }
                objData.totalRecord = totalRecord;
                objData.records = records;
            } else if (action === 'lookup') {
                //Cho xu ly
            } else if (action === 'query') {
                let records = [];
                commonInternal.makeSQLAndParams(requestBody);
                objData.totalRecord = commonInternal.doSearchSql(records, requestBody.pageinfo, requestBody.sql, requestBody.params);
                objData.records = records;
            } else if (action === 'transform') {
                ({status, message, transform_id} = commonInternal.transformTransaction(objData, requestBody));
                objData.transform_id = transform_id;
            }
            if (!status) {
                throw message;
            }
            let endtime = new Date();
            let duration = endtime.getTime() - starttime.getTime();
            log.error('duration', duration);
            return objData;
        }

        /**
         * Function called upon sending a DELETE request to the RESTlet.
         *
         * @param {Object} requestParams - Parameters from HTTP request URL; parameters will be passed into function as an Object (for all supported content types)
         * @returns {string | Object} HTTP response body; return string when request Content-Type is 'text/plain'; return Object when request Content-Type is 'application/json'
         * @since 2015.2
         */
        const doDelete = (requestParams) => {
            record.delete({type: requestParams.type, id: requestParams.internalid});
            return '';
        }

        return {
            'get': doGet,
            put: doPut,
            post: doPost,
            'delete': doDelete
        };

    });
