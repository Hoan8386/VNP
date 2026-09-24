/**
 * @NApiVersion 2.1
 */
define(['N/record', 'N/task', '../lib/scv_lib_report.js', '../olib/alasql/alasql.min@1.7.3.js', '../olib/lodash.min.js'],

    (record, task, libRep, alasql, lodash) => {

        const CACHE_KEY_MR_TASK = 'mrTaskId';
        const MAX_MR_DEPLOYMENT = 99;

        const isTaskRunningStatus = (status) => {
            return status === task.TaskStatus.PENDING || status === task.TaskStatus.PROCESSING;
        }

        const getCachedMrTaskList = (myCache) => {
            let cacheValue = myCache.get({key: CACHE_KEY_MR_TASK});
            return cacheValue ? JSON.parse(cacheValue) : [];
        }

        const putCachedMrTaskList = (myCache, listCachedTask) => {
            myCache.put({key: CACHE_KEY_MR_TASK, value: JSON.stringify(listCachedTask)});
        }

        // Finds the first free deployment slot (starting at i, built by getDeploymentId(i)) for config and
        // submits a MAP_REDUCE task there. A cached slot already running the same config (index + config match)
        // is reported as "Running" instead of resubmitted. Any task.create/submit failure (e.g. the slot is busy
        // with a different config) moves on to the next i, up to maxIndex.
        const submitMrTask = (listCachedTask, config, params, getDeploymentId, i, maxIndex = MAX_MR_DEPLOYMENT) => {
            if (i > maxIndex) {
                return {taskId: null, message: `No available deployment slot for config ${config}`, nextIndex: i};
            }

            let cachedEntry = listCachedTask.find(o => o.index === i && String(o.config) === String(config));
            if (cachedEntry) {
                let isRunning;
                try {
                    isRunning = isTaskRunningStatus(task.checkStatus(cachedEntry.taskId).status);
                } catch (e) {
                    isRunning = false;
                }
                if (isRunning) {
                    return {taskId: null, message: `Config ${config} is Running`, nextIndex: i};
                }
            }

            try {
                let mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: 'customscript_scv_mr_txn_exe',
                    deploymentId: getDeploymentId(i)
                });
                mrTask.params = params;
                let taskId = mrTask.submit();
                if (cachedEntry) {
                    cachedEntry.config = config;
                    cachedEntry.taskId = taskId;
                } else {
                    listCachedTask.push({index: i, config: config, taskId: taskId});
                }
                return {taskId, message: '', nextIndex: i + 1};
            } catch (e) {
                log.error('submitMrTask exception', e);
                return submitMrTask(listCachedTask, config, params, getDeploymentId, i + 1, maxIndex);
            }
        }

        const RecordType = {
            TXN_MAPPING_CONFIG: 'customrecord_scv_txn_cfg',
            TXN_MAPPING_CONFIG_FILTER: 'customrecord_scv_txn_cfg_filter',
            TXN_MAPPING_CONFIG_SOURCE: 'customrecord_scv_txn_cfg_source'
        };
        
        const ConfigType = {
            RECORD: '1',
            REPORT: '2'
        }
        
        const ReportType = {
            INTERCOMPANY_RECONCILE: '1'
        }
        
        const MappingFieldType = {
            'Check Box': 'CHECKBOX',
            'Currency': 'CURRENCY',
            'Date': 'DATE',
            'Date/Time': 'DATETIME',
            DATETIMETZ: 'DATETIMETZ',
            'Email Address': 'EMAIL',
            'Document': 'FILE',
            'Decimal Number': 'FLOAT',
            'Help': 'HELP',
            'Image': 'IMAGE',
            'Inline HTML': 'INLINEHTML',
            'Integer Number': 'INTEGER',
            LABEL: 'LABEL',
            'Long Text': 'LONGTEXT',
            'Multiple Select': 'MULTISELECT',
            'Password': 'PASSWORD',
            'Percent': 'PERCENT',
            'Phone Number': 'PHONE',
            RADIO: 'RADIO',
            'Rich Text': 'RICHTEXT',
            'List/Record': 'SELECT',
            'Text Area': 'TEXTAREA',
            'Free-Form Text': 'TEXT',
            'Time Of Day': 'TIMEOFDAY',
            'Hyperlink': 'URL'
        }
        
        const getListTxnMappingConfig = (ids) => {
            let strWhere = ids && String(ids) ? ` and txn.id in (${ids}) ` : '';
            let sqlTxnMappingConfig = `SELECT txn.id, txn.name text, txn.custrecord_scv_txcf_trans_type, txn.custrecord_scv_txcf_unique_key, txn.custrecord_scv_txcf_fields_notupd,
                txn.custrecord_scv_txcf_set_text_field, txn.custrecord_scv_txcf_header_field, txn.custrecord_scv_txcf_line_field, txn.custrecord_scv_txcf_fields_multiple,
                txn.custrecord_scv_txcf_join_source
                from customrecord_scv_txn_cfg txn
                where txn.isinactive = 'F' ${strWhere}
                order by txn.id
            `;//and txn.custrecord_scv_txcf_header_field is not null
            let listTxnMappingConfig = [];
            libRep.doSearchSqlAll(listTxnMappingConfig, sqlTxnMappingConfig, []);
            return listTxnMappingConfig;
        }
        
        // customrecord_scv_txn_tab fields differ from customrecord_scv_txn_cfg only by the _scv_txtab_/_scv_txcf_
        // prefix, so alias them back to the _scv_txcf_ names here — the rows can then be fed straight into
        // buildJoinSourceReport just like a customrecord_scv_txn_cfg row, no separate build function needed.
        const getListTxnMappingTab = (parentIds) => {
            let strWhere = parentIds && String(parentIds) ? ` and txn.custrecord_scv_txtab_parent in (${parentIds}) ` : '';
            let sqlTxnMappingTab = `SELECT txn.id, txn.name text, txn.custrecord_scv_txtab_parent,
                    txn.custrecord_scv_txtab_header_field custrecord_scv_txcf_header_field,
                    txn.custrecord_scv_txtab_line_field custrecord_scv_txcf_line_field,
                    txn.custrecord_scv_txtab_join_source custrecord_scv_txcf_join_source,
                    txn.custrecord_scv_txtab_rp_column custrecord_scv_txcf_rp_column
                from customrecord_scv_txn_tab txn
                where txn.isinactive = 'F' ${strWhere}
                order by txn.custrecord_scv_txtab_sort, txn.id
            `;
            let listTxnMappingTab = [];
            libRep.doSearchSqlAll(listTxnMappingTab, sqlTxnMappingTab, []);
            return listTxnMappingTab;
        }

        const getListTxnMappingConfigSource = (cfsc_parents) => {
            let strWhere = cfsc_parents && String(cfsc_parents) ? ` and txn.custrecord_scv_txn_cfsc_parent in (${cfsc_parents})` : '';
            let sqlTxnMappingConfigSource = `SELECT txn.id, txn.custrecord_scv_txn_cfsc_alias, txn.custrecord_scv_txn_cfsc_ss,
                    txn.custrecord_scv_txn_cfsc_sql, txn.custrecord_scv_txn_cfsc_criteria, txn.custrecord_scv_txn_cfsc_parent
                from customrecord_scv_txn_cfg_source txn where txn.isinactive = 'F' ${strWhere}
                order by txn.custrecord_scv_txn_cfsc_parent, txn.custrecord_scv_txn_cfsc_alias
            `;
            let listTxnMappingConfigSource = [];
            libRep.doSearchSqlAll(listTxnMappingConfigSource, sqlTxnMappingConfigSource, []);
            return listTxnMappingConfigSource;
        }
        
        const getDataFromTxnMappingConfigSource = (listTxnMappingConfigSource, exeParams) => {
            let objDataFromSource = {};
            listTxnMappingConfigSource.forEach((source) => {
                let listDataFromSource = [];
                let cfscCriteria = source.custrecord_scv_txn_cfsc_criteria;
                cfscCriteria = cfscCriteria ? JSON.parse(cfscCriteria) : null;
                let cfsc_sql = source.custrecord_scv_txn_cfsc_sql;
                if (source.custrecord_scv_txn_cfsc_ss) {
                    let filterSource = [];
                    if (cfscCriteria && exeParams) {
                        cfscCriteria.forEach((criteria) => {
                            if (exeParams[criteria.values]) {
                                let objCriteria = JSON.parse(JSON.stringify(criteria));
                                objCriteria.values = exeParams[criteria.values];
                                filterSource.push(objCriteria);
                            }
                        });
                    }
                    libRep.doSearchSSRangeLabelId(source.custrecord_scv_txn_cfsc_ss, 1000, listDataFromSource, filterSource);
                } else if (cfsc_sql) {
                    cfsc_sql = cfsc_sql.trim();
                    let strWhere = '';
                    if (cfscCriteria && exeParams) {
                        cfscCriteria.forEach((criteria) => {
                            if (typeof criteria === 'string') {
                                strWhere += criteria;
                            } else if (exeParams[criteria.values]) {
                                if(criteria.operator === 'in') {
                                    strWhere += ` ${criteria.name} ${criteria.operator} (${(exeParams[criteria.values]).split(',').map(v => `'${v}'`).join(',')})`;
                                } else {
                                    strWhere += ` ${criteria.name} ${criteria.operator} '${exeParams[criteria.values]}'`;
                                }
                            }
                        });
                    }
                    if (strWhere && (cfsc_sql.endsWith(')') || cfsc_sql.toLowerCase().indexOf('where') === -1)) {
                        strWhere = ' where ' + strWhere;
                    }
                    libRep.doSearchSqlAll(listDataFromSource, (cfsc_sql + strWhere), []);
                }
                objDataFromSource[source.custrecord_scv_txn_cfsc_alias] = listDataFromSource;
            });
            return objDataFromSource;
        }
        
        const extractTableAliases = (sql) => {
            const regex = /\b(?:from|join)\s+\?\s+(\w+)/gi;
            const aliases = [];
            let match;
            while ((match = regex.exec(sql)) !== null) {
                aliases.push(match[1].trim());
            }
            
            return aliases;
        }
        
        const buildJoinSource = (txnMappingConfig, listTxnMappingConfigSource, objDataFromSource, exeParams) => {
            let listDataJoinSource;
            if (txnMappingConfig.custrecord_scv_txcf_join_source) {
                let join_source = replaceParamsInSql(txnMappingConfig.custrecord_scv_txcf_join_source, exeParams);
                let aliases = extractTableAliases(join_source);
                let arrayDataFromSource = [];
                aliases.forEach(alias => {
                    if (objDataFromSource[alias]) {
                        arrayDataFromSource.push(objDataFromSource[alias]);
                    }
                });
                listDataJoinSource = alasql(join_source, arrayDataFromSource);
            } else {
                listDataJoinSource = objDataFromSource[txnMappingConfig.listTxnMappingConfigSource[0].custrecord_scv_txn_cfsc_alias] || [];
            }
            let header_field = JSON.parse(txnMappingConfig.custrecord_scv_txcf_header_field);
            let unique_key = txnMappingConfig.custrecord_scv_txcf_unique_key ? JSON.parse(txnMappingConfig.custrecord_scv_txcf_unique_key) : '';
            let columns;
            if (unique_key) {
                columns = unique_key.map(key => header_field[key]);
            } else {
                columns = Object.values(header_field);
            }
            
            let objData = lodash.groupBy(listDataJoinSource, function (o) {
                let objReturn = '';
                for (let colId of columns) {
                    objReturn = objReturn + o[colId];
                    objReturn = objReturn + '>>';
                }
                return objReturn;
            });
            
            return Object.values(objData).map(datas => {
                return {txnMappingConfig, datas, exeParams}
            });
        }
        
        const buildListJoinSource = (listTxnMappingConfig, listTxnMappingConfigSource, exeParams) => {
            let listJoinSource = [];
            listTxnMappingConfig.forEach((txnMappingConfig) => {
                let arrSource = listTxnMappingConfigSource.filter((source) => source.custrecord_scv_txn_cfsc_parent === txnMappingConfig.id);
                if (arrSource.length > 0) {
                    let objDataFromSource = getDataFromTxnMappingConfigSource(arrSource, exeParams);
                    let listDataJoinSource = buildJoinSource(txnMappingConfig, arrSource, objDataFromSource, exeParams);
                    if (listDataJoinSource && listDataJoinSource.length > 0) {
                        listJoinSource = listJoinSource.concat(listDataJoinSource);
                    }
                }
            });
            return listJoinSource;
        }
        
        const replaceParamsInSql = (sql, parameters) => {
            if (!sql || !parameters) return sql;
            let paramKeys = Object.keys(parameters).filter(key => key.indexOf('custpage') === 0);
            // replace key dài trước để tránh key ngắn là tiền tố của key dài (vd: custpage_txn và custpage_txn_config)
            paramKeys.sort((a, b) => b.length - a.length);
            for (let key of paramKeys) {
                let value = parameters[key];
                if (value === undefined || value === null) {
                    value = '';
                }
                sql = sql.replace(new RegExp(key, 'g'), String(value));
            }
            return sql;
        }

        const buildJoinSourceReport = (txnMappingConfig, listTxnMappingConfigSource, objDataFromSource, parameters) => {
            let listDataJoinSource, dataConfig = {};
            if (txnMappingConfig.custrecord_scv_txcf_join_source) {
                let join_source = replaceParamsInSql(txnMappingConfig.custrecord_scv_txcf_join_source, parameters);

                let aliases = extractTableAliases(join_source);
                let arrayDataFromSource = [];
                aliases.forEach(alias => {
                    if (objDataFromSource[alias]) {
                        arrayDataFromSource.push(objDataFromSource[alias]);
                    }
                });
                listDataJoinSource = alasql(join_source, arrayDataFromSource);
                
                let keysDataFromSource = Object.keys(objDataFromSource);
                let aliasConfig = keysDataFromSource.filter(item => !aliases.includes(item));
                for(let keyAlias of aliasConfig) {
                    dataConfig[keyAlias] = objDataFromSource[keyAlias];
                }
            } else {
                listDataJoinSource = objDataFromSource[txnMappingConfig.listTxnMappingConfigSource[0].custrecord_scv_txn_cfsc_alias] || [];
                dataConfig = listDataJoinSource;
            }
            return {txnMappingConfig, datas: listDataJoinSource, dataConfig};
        }
        
        const createOrUpdateRecord = (objData) => {
            let {txnMappingConfig, datas, exeParams} = objData;
            let header_field = JSON.parse(txnMappingConfig.custrecord_scv_txcf_header_field);
            let unique_key = txnMappingConfig.custrecord_scv_txcf_unique_key ? JSON.parse(txnMappingConfig.custrecord_scv_txcf_unique_key) : '';
            let recordType = txnMappingConfig.custrecord_scv_txcf_trans_type;
            let objFirstValue = datas[0];
            let recordId = findRecordId(recordType, unique_key, header_field, objFirstValue);
            let recRecord = null;
            if (recordId) {
                recRecord = record.load({type: recordType, id: recordId, isDynamic: true});
            } else {
                recRecord = record.create({type: recordType, isDynamic: true});
            }
            let text_field = txnMappingConfig.custrecord_scv_txcf_set_text_field ? JSON.parse(txnMappingConfig.custrecord_scv_txcf_set_text_field) : [];
            let fields_notupd = txnMappingConfig.custrecord_scv_txcf_fields_notupd ? JSON.parse(txnMappingConfig.custrecord_scv_txcf_fields_notupd) : [];
            let fields_multiple = txnMappingConfig.custrecord_scv_txcf_fields_multiple ? JSON.parse(txnMappingConfig.custrecord_scv_txcf_fields_multiple) : [];
            
            // set header field
            let headerFieldIds = Object.keys(header_field);
            for (let fieldId of headerFieldIds) {
                if (!recordId || (recordId && !fields_notupd.includes(fieldId))) {
                    let value = exeParams[header_field[fieldId]];
                    if(!value && value !== 0) {
                        value = objFirstValue[header_field[fieldId]];
                    }
                    if (value !== undefined && value !== null) {
                        if (text_field.includes(fieldId)) {
                            recRecord.setText({fieldId: fieldId, text: value});
                        } else {
                            if (fields_multiple.includes(fieldId)) {
                                recRecord.setValue({fieldId: fieldId, value: String(value).split(',')});
                            } else {
                                recRecord.setValue({fieldId: fieldId, value: value});
                            }
                        }
                    }
                }
            }
            // set line field
            if (txnMappingConfig.custrecord_scv_txcf_line_field) {
                let line_field = JSON.parse(txnMappingConfig.custrecord_scv_txcf_line_field);
                let sublistIds = Object.keys(line_field);
                for (let sublistId of sublistIds) {
                    if (sublistId) {
                        let mapFieldIdLine = line_field[sublistId];
                        let lineFieldIds = Object.keys(mapFieldIdLine);
                        let lineCount = recRecord.getLineCount({sublistId: sublistId});
                        datas.forEach((data, index) => {
                            if (index < lineCount) {
                                recRecord.selectLine({sublistId: sublistId, line: index});
                            }
                            for (let fieldId of lineFieldIds) {
                                if (!recordId || (recordId && !fields_notupd.includes(fieldId))) {
                                    let value = exeParams[mapFieldIdLine[fieldId]];
                                    if(!value && value !== 0) {
                                        value = data[mapFieldIdLine[fieldId]];
                                    }
                                    if (value !== undefined && value !== null) {
                                        if (text_field.includes(fieldId)) {
                                            recRecord.setCurrentSublistText({
                                                sublistId: sublistId,
                                                fieldId: fieldId,
                                                text: value
                                            });
                                        } else {
                                            if (fields_multiple.includes(fieldId)) {
                                                value = String(value).split(',');
                                            }
                                            recRecord.setCurrentSublistValue({
                                                sublistId: sublistId,
                                                fieldId: fieldId,
                                                value: value
                                            });
                                        }
                                    }
                                }
                            }
                            recRecord.commitLine({sublistId: sublistId});
                        });
                        let lengthData = datas.length;
                        if (lineCount > lengthData) {
                            for (let i = lengthData; i < lineCount; i++) {
                                recRecord.removeLine({sublistId: sublistId, line: lengthData});
                            }
                        }
                    }
                }
            }
            
            return recRecord.save({ignoreMandatoryFields: true});
        }
        
        const transactionTypes = [
            'assemblybuild', 'assemblyunbuild', 'billccard', 'billcredit', 'billpayment', 'binputawayworksheet', 'bintransfer', 'bulkownershiptransfer', 'cashrefund', 'cashsale',
            'ccardrefund', 'check', 'commission', 'creditcardcharge', 'creditmemo', 'currencyrevaluation', 'customerdeposit', 'customerpayment', 'customerrefund', 'deposit',
            'depositapplication', 'estimate', 'expensereport', 'fxreval', 'inventoryadjustment', 'inventorycount', 'inventorydistribution', 'inventorytransfer', 'inventoryworksheet',
            'invoice', 'itemfulfillment', 'itemreceipt', 'journalentry', 'opportunity', 'ownershiptransfer', 'purchaseorder', 'returnauthorization', 'salesorder', 'salestaxpayment',
            'statementcharge', 'transfer', 'transferorder', 'vendorbill', 'vendorcredit', 'vendorpayment', 'vendorprepayment', 'vendorprepaymentapplication', 'vendorreturnauthorization', 'workorder'
        ];
        
        const entityTypes = [
            'job', 'lead', 'prospect'
        ];
        
        const itemTypes = [
            'assemblyitem', 'descriptionitem', 'discountitem', 'downloaditem',
            'giftcertificateitem', 'inventoryitem', 'kititem',
            'lotnumberedassemblyitem', 'lotnumberedinventoryitem', 'noninventoryitem',
            'otherchargeitem', 'serializedassemblyitem', 'serializedinventoryitem',
            'serviceitem'
        ];
        
        const getSearchTypeFromRecordType = (recordType) => {
            let type = null, recordtype = null;
            if (recordType.startsWith('customrecord') || recordType.startsWith('customlist')) {
                type = recordType;
            } else if (transactionTypes.includes(recordType) || recordType.startsWith('customtransaction')) {
                type = 'transaction';
                recordtype = recordType;
            } else if (entityTypes.includes(recordType)) {
                type = 'entity';
            } else if (itemTypes.includes(recordType)) {
                type = 'item';
            }
            
            return {type, recordtype};
        }
        
        const findRecordId = (recordType, unique_key, header_field, objValue) => {
            let listRecords = [];
            if (unique_key) {
                let strWhere = '';
                unique_key.forEach((fieldId) => {
                    strWhere += ` and t.${fieldId} = '${objValue[header_field[fieldId]]}' `;
                });
                
                let searchType = getSearchTypeFromRecordType(recordType);
                if (searchType.recordtype) {
                    strWhere += ` and t.recordtype = '${searchType.recordtype}' `;
                }
                let sql = `select t.id from ${searchType.type} t
                    where 1 = 1 ${strWhere}
                `;
                libRep.doSearchSqlAll(listRecords, sql, []);
            }
            return listRecords[0]?.id;
        }
        
        return {
            isTaskRunningStatus,
            getCachedMrTaskList,
            putCachedMrTaskList,
            submitMrTask,
            RecordType,
            ConfigType,
            ReportType,
            MappingFieldType,
            getListTxnMappingConfig,
            getListTxnMappingTab,
            getListTxnMappingConfigSource,
            getDataFromTxnMappingConfigSource,
            buildJoinSource,
            buildListJoinSource,
            buildJoinSourceReport,
            replaceParamsInSql,
            createOrUpdateRecord
        }
        
    });
