/**
 * @NApiVersion 2.1
 */
define(['N/record', '../lib/scv_lib_report.js', '../olib/alasql/alasql.min@4.6.6.js', '../olib/lodash.min.js'],
    
    (record, libRep, alasql, lodash) => {
        
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
            let sqlTxnMappingConfig = `SELECT txn.id, txn.custrecord_scv_txcf_trans_type, txn.custrecord_scv_txcf_unique_key, txn.custrecord_scv_txcf_fields_notupd,
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
                let aliases = extractTableAliases(txnMappingConfig.custrecord_scv_txcf_join_source);
                let arrayDataFromSource = [];
                aliases.forEach(alias => {
                    if (objDataFromSource[alias]) {
                        arrayDataFromSource.push(objDataFromSource[alias]);
                    }
                });
                listDataJoinSource = alasql(txnMappingConfig.custrecord_scv_txcf_join_source, arrayDataFromSource);
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
        
        const buildJoinSourceReport = (txnMappingConfig, listTxnMappingConfigSource, objDataFromSource) => {
            let listDataJoinSource, dataConfig = {};
            if (txnMappingConfig.custrecord_scv_txcf_join_source) {
                let aliases = extractTableAliases(txnMappingConfig.custrecord_scv_txcf_join_source);
                let arrayDataFromSource = [];
                aliases.forEach(alias => {
                    if (objDataFromSource[alias]) {
                        arrayDataFromSource.push(objDataFromSource[alias]);
                    }
                });
                listDataJoinSource = alasql(txnMappingConfig.custrecord_scv_txcf_join_source, arrayDataFromSource);
                
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
            RecordType,
            ConfigType,
            ReportType,
            MappingFieldType,
            getListTxnMappingConfig,
            getListTxnMappingConfigSource,
            getDataFromTxnMappingConfigSource,
            buildJoinSource,
            buildListJoinSource,
            buildJoinSourceReport,
            createOrUpdateRecord
        }
        
    });
