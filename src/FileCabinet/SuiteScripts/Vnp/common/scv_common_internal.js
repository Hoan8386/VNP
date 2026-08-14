/**
 * @NApiVersion 2.1
 */
define(['N/config', 'N/format', 'N/query', 'N/record', 'N/search',
        '../lib/scv_lib_function.js', '../lib/scv_lib_utils.js'],

    (config, format, query, record, search, libFunc, libUtils) => {

        const SystemParam = {
            GMT_TO_PLUS: '+07:00'
        }

        const Sublist = {
            ITEM: 'item',
            IVENTORY_ASSIGNMENT: 'inventoryassignment'
        }

        const DataStageStatus = {
            NEW: '1',
            CHANGED: '2',
            COMPLETETED: '3',
            ERROR: '4'
        }

        const Action = {
            ADD: '1',
            UPDATE: '2',
            INACTIVE: '3'
        }

        const pushFilter = (type, arrFilter, filters) => {
            pushFilterGroup(type, arrFilter, filters);

            if (filters.internalid) {
                arrFilter.push(search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.ANYOF,
                    values: splitComa(filters.internalid, ',')
                }));
            }
            if (filters.name) {
                arrFilter.push(search.createFilter({name: 'name', operator: search.Operator.IS, values: filters.name}));
            }
            if (filters.modified) {
                arrFilter.push(search.createFilter({
                    name: 'modified',
                    operator: search.Operator.ONORAFTER,
                    values: filters.modified
                }));
            }
            if (filters.lastmodified) {
                arrFilter.push(search.createFilter({
                    name: 'lastmodified',
                    operator: search.Operator.ONORAFTER,
                    values: filters.lastmodified
                }));
            }
            if (filters.lastmodifieddate) {
                arrFilter.push(search.createFilter({
                    name: 'lastmodifieddate',
                    operator: search.Operator.ONORAFTER,
                    values: filters.lastmodifieddate
                }));
            }
            if (filters.entity) {
                arrFilter.push(search.createFilter({
                    name: 'entity',
                    operator: search.Operator.ANYOF,
                    values: splitComa(filters.entity, ',')
                }));
            }
            if (filters.subsidiary) {
                arrFilter.push(search.createFilter({
                    name: 'subsidiary',
                    operator: search.Operator.ANYOF,
                    values: splitComa(filters.subsidiary, ',')
                }));
            }
            if (filters.externalid) {
                arrFilter.push(search.createFilter({
                    name: 'externalid',
                    operator: search.Operator.ANYOF,
                    values: splitComa(filters.externalid, ',')
                }));
            }
            if (filters.pricelevel) {
                arrFilter.push(search.createFilter({
                    name: 'pricelevel',
                    operator: search.Operator.ANYOF,
                    values: splitComa(filters.pricelevel, ',')
                }));
            }
            if (filters.lastquantityavailablechange) {
                arrFilter.push(search.createFilter({
                    name: 'lastquantityavailablechange',
                    operator: search.Operator.ONORAFTER,
                    values: filters.lastquantityavailablechange
                }));
            }
            pushFilterListObject(arrFilter, filters);
        }

        const pushFilterGroup = (type, arrFilter, filters) => {
            if (type === 'itemsubsidiary') {
                if (filters.item) {
                    arrFilter.push(search.createFilter({
                        name: 'internalid',
                        operator: search.Type.ANYOF,
                        values: splitComa(filters.item, ',')
                    }));
                }
            } else if (type === 'iteminventory') {
                if (filters.item) {
                    arrFilter.push(search.createFilter({
                        name: 'internalid',
                        operator: search.Type.ANYOF,
                        values: splitComa(filters.item, ',')
                    }));
                }
            } else if (type === 'customer') {
                if (filters.customer) {
                    arrFilter.push(search.createFilter({
                        name: 'internalid',
                        operator: search.Type.ANYOF,
                        values: splitComa(filters.customer, ',')
                    }));
                }
            } else if (type === 'salesorderlineinfor' || type === 'customsearch_scv_mkp_so_status') {
                if (filters.salesorderid) {
                    arrFilter.push(search.createFilter({
                        name: 'internalid',
                        operator: 'anyof',
                        values: splitComa(filters.salesorderid, ',')
                    }));
                }
            } else if (type === 'pricing') {
                if (filters.item) {
                    arrFilter.push(search.createFilter({
                        name: 'item',
                        operator: 'anyof',
                        values: splitComa(filters.item, ',')
                    }));
                }
            }
        }

        const pushFilterListObject = (arrFilter, filters) => {
            if (!!filters) {
                let list_object = filters.list_object;
                if (!!list_object) {
                    for (let i in list_object) {
                        arrFilter.push(list_object[i]);
                    }
                }
            }
        }

        const getFieldsConfig = (type) => {
            let fields_get = {};
            if (type === 'userpreferences') {
                let loadConfig = config.load({
                    type: config.Type.USER_PREFERENCES
                });
                fields_get.DATEFORMAT = loadConfig.getValue({fieldId: 'DATEFORMAT'});
                fields_get.TIMEFORMAT = loadConfig.getValue({fieldId: 'TIMEFORMAT'});
                fields_get.TIMEZONE = loadConfig.getValue({fieldId: 'TIMEZONE'});
            }
            return fields_get;
        }

        const getColumnsFields = (type, action, arrFilter) => {
            let status = true, message = '', stype = type;
            let columns, fields;

            if (listRecordTypeMaster.includes(type)) {
                ({columns, fields} = getColumnsFieldsMaster());
            } else if (type === 'subsidiary') {
                columns = ['internalid', 'namenohierarchy', 'name', 'parent', 'country', 'currency', 'isinactive', 'legalname', 'address1', 'iselimination'];
                fields = ['internalid', 'namenohierarchy', 'name', 'parent', 'country', 'currency', 'isinactive', 'legalname', 'address1', 'iselimination'];
            } else if (type === 'salesrep' || type === 'employee') {
                stype = 'employee';
                columns = ['internalid', 'entityid', 'firstname', 'middlename', 'lastname', 'subsidiary',
                    'issalesrep', 'issupportrep', 'lastmodifieddate', 'isinactive', 'title', 'email', 'location',
                    'phone'];
                fields = ['internalid', 'entityid', 'firstname', 'middlename', 'lastname', 'subsidiary',
                    'issalesrep', 'issupportrep', 'lastmodifieddate', 'isinactive', 'title', 'email', 'location',
                    'phone'];
                arrFilter.push(search.createFilter({name: 'salesrep', operator: 'is', values: true}));
            } else if (type === 'taxcode') {
                stype = 'salestaxitem';
                columns = ['internalid', 'name', 'rate', 'country', 'isinactive'];
                fields = ['internalid', 'name', 'rate', 'country', 'isinactive'];
            } else if (type === 'item') {
                ({columns, fields} = getColumnsFieldsItem(arrFilter));
            } else if (type === 'itemsubsidiary') {
                arrFilter.push(search.createFilter({
                    name: 'type',
                    operator: search.Operator.ANYOF,
                    values: ['InvtPart', 'Assembly']
                }));
                stype = 'item';
                columns = ['internalid', 'subsidiary'];
                fields = ['item', 'subsidiary'];
            } else if (type === 'taxschedule') {
                columns = ['internalid', 'name', 'description'];
                fields = ['internalid', 'name', 'description'];
            } else if (listRecordTypeMasterCustom.includes(type) || type.substring(0, 10) === 'customlist') {
                ({columns, fields} = getColumnsFieldsMasterCustom());
            } else if (type === 'iteminventory') {
                stype = 'item';
                columns = ['internalid', 'inventorylocation', 'locationquantityavailable', 'lastquantityavailablechange'];
                fields = ['item', 'inventorylocation', 'locationquantityavailable', 'lastquantityavailablechange'];
                arrFilter.push(search.createFilter({
                    name: 'type',
                    operator: search.Operator.ANYOF,
                    values: ['InvtPart', 'Assembly']
                }));
            } else if (type === 'pricing') {
                columns = ['item', 'pricelevel', 'unitprice', 'unitprice'];
                fields = ['item', 'pricelevel', 'unitprice', 'saleprice'];
                arrFilter.push(search.createFilter({
                    name: 'type',
                    join: 'item',
                    operator: 'anyof',
                    values: ['InvtPart', 'Assembly']
                }));
                arrFilter.push(search.createFilter({name: 'currency', operator: 'anyof', values: 1}));
            } else if (type === 'term') {
                columns = ['internalid', 'name', 'daysuntilnetdue', 'isinactive'];
                fields = ['internalid', 'name', 'daysuntilnetdue', 'isinactive'];
            } else if (type === 'customer') {
                ({columns, fields} = getColumnsFieldsCustomer());
            } else if (type === 'customeraddress') {
                stype = 'customer';
                columns = ['internalid', 'addressee', 'address', 'isdefaultbilling', 'isdefaultshipping', 'addresslabel', 'addressinternalid'];
                fields = ['customer', 'addressee', 'address', 'isdefaultbilling', 'isdefaultshipping', 'addresslabel', 'addressinternalid'];
                arrFilter.push(search.createFilter({name: 'address', operator: 'isnotempty', values: ''}));
            } else if (type === 'customersubsidiary') {
                stype = 'customersubsidiaryrelationship';
                columns = ['internalid', 'entity', 'subsidiary', 'isprimarysub'];
                fields = ['internalid', 'entity', 'subsidiary', 'isprimarysub'];
            } else if (type === 'lead') {
                ({columns, fields} = getColumnsFieldsLead());
            } else if (type === 'location') {
                columns = ['internalid', 'name', 'isinactive', 'subsidiary'];
                fields = ['internalid', 'name', 'isinactive', 'subsidiaryname'];
            } else if (type === 'salesorderlineinfor') {
                stype = 'salesorder';
                ({columns, fields} = getColumnsFieldsSalesOrderLine());
                arrFilter.push(search.createFilter({name: 'mainline', operator: 'is', values: false}));
                arrFilter.push(search.createFilter({
                    name: 'type',
                    join: 'item',
                    operator: 'anyof',
                    values: ['Assembly', 'InvtPart']
                }));
            } else if (type === 'salesorderheaderinfor') {
                stype = 'salesorder';
                columns = ['internalid', 'trandate', 'status', {name: 'formulatext', formula: '{statusref}'}];
                fields = ['internalid', 'trandate', 'status', 'statusref'];
                arrFilter.push(search.createFilter({name: 'mainline', operator: 'is', values: true}));
            } else {
                status = false;
                message = 'action: ' + action + ' và  type: ' + type + ' không khả dụng!';
            }
            return {status, message, columns, fields, stype};
        }

        const listRecordTypeMaster = ['currency', 'customercategory', 'pricelevel'];

        const getColumnsFieldsSalesOrderLine = () => {
            let columns = ['internalid', 'trandate', 'tranid', 'externalid', 'item', 'statusref', {
                name: 'unitstype',
                join: 'item'
            }, 'unit',
                {
                    name: 'formulanumeric',
                    formula: '{quantity} / (case when {unit} = {item.custitem_scv_even_unit} then {item.custitem_scv_even_unit_converionrate} else 1 end)'
                },
                {
                    name: 'formulanumeric',
                    formula: '{quantitycommitted} / (case when {unit} = {item.custitem_scv_even_unit} then {item.custitem_scv_even_unit_converionrate} else 1 end)'
                },
                {
                    name: 'formulanumeric',
                    formula: '{quantitypicked} / (case when {unit} = {item.custitem_scv_even_unit} then {item.custitem_scv_even_unit_converionrate} else 1 end)'
                },
                {
                    name: 'formulanumeric',
                    formula: '{quantitypacked} / (case when {unit} = {item.custitem_scv_even_unit} then {item.custitem_scv_even_unit_converionrate} else 1 end)'
                },
                {
                    name: 'formulanumeric',
                    formula: '{quantityshiprecv} / (case when {unit} = {item.custitem_scv_even_unit} then {item.custitem_scv_even_unit_converionrate} else 1 end)'
                },
                'lastmodifieddate', 'status'];
            let fields = ['salesorderid', 'trandate', 'tranid', 'externalid', 'item', 'orderstatus', 'unitstype', 'units',
                'quantity', 'quantitycommitted', 'quantitypicked', 'quantitypacked', 'quantityshiprecv',
                'lastmodifieddate', 'status'
            ];
            return {columns, fields};
        }

        const getColumnsFieldsCustomer = () => {
            let columns = ['internalid', 'isperson', 'firstname', 'lastname', 'companyname', 'entityid', 'subsidiary', 'salesrep',
                'email', 'lastmodifieddate', 'status', 'isinactive', 'externalid',
                'pricelevel', 'billaddress', 'shipaddress'];
            let fields = ['internalid', 'isperson', 'firstname', 'lastname', 'companyname', 'entityid', 'subsidiary', 'salesrep',
                'email', 'lastmodifieddate', 'status', 'isinactive', 'externalid',
                'pricelevel', 'billaddress', 'shipaddress'];
            return {columns, fields};
        }

        const getColumnsFieldsLead = () => {
            let columns = ['internalid', 'isperson', 'firstname', 'lastname', 'companyname', 'entityid', 'subsidiary', 'salesrep',
                'email', 'lastmodifieddate', 'status', 'isinactive', 'externalid',
                'pricelevel', 'billaddress', 'shipaddress'];
            let fields = ['internalid', 'isperson', 'firstname', 'lastname', 'companyname', 'entityid', 'subsidiary', 'salesrep',
                'email', 'lastmodifieddate', 'status', 'isinactive', 'externalid',
                'pricelevel', 'billaddress', 'shipaddress'];
            return {columns, fields};
        }

        const getColumnsFieldsMaster = () => {
            let columns = ['internalid', 'name', 'isinactive'];
            let fields = ['internalid', 'name', 'isinactive'];
            return {columns, fields}
        }

        const listRecordTypeMasterCustom = [''];

        const getColumnsFieldsMasterCustom = () => {
            let columns = ['internalid', 'name', 'isinactive', 'lastmodified'];
            let fields = ['internalid', 'name', 'isinactive', 'lastmodified'];
            return {columns, fields}
        }

        const getColumnsFieldsItem = (arrFilter) => {
            arrFilter.push(search.createFilter({
                name: 'type',
                operator: search.Operator.ANYOF,
                values: ['InvtPart', 'Assembly', 'Kit']
            }));
            let columns = ['internalid', 'islotitem', 'upccode', 'name', 'class', 'unitstype', 'modified', 'isinactive',
                'saleunit', 'displayname', 'parent', 'taxschedule', 'vendorname'
            ];
            let fields = ['internalid', 'islotitem', 'upccode', 'name', 'class', 'unitstype', 'modified', 'isinactive',
                'saleunit', 'displayname', 'parent', 'taxschedule', 'vendorname'];
            return {columns, fields};
        }

        const queryIdToCheckDuplidate = (requestBody, type) => {
            let fields = requestBody.fields;
            let id = null, params = null, fieldExternalid = 'externalid';
            let strExtWhere = '';
            if (type === 'customrecord_scv_odoo_raw_data') {
                params = [fields.custrecord_scv_odoo_raw_itgid_h];
                fieldExternalid = 'custrecord_scv_odoo_raw_itgid_h';
                strExtWhere = " and rd.custrecord_scv_odoo_raw_iscurrent_h = 'T'";
            } else if (type === 'bomrevision') {
                params = [fields.custrecord_scv_source_external_id];
                fieldExternalid = 'custrecord_scv_source_external_id';
            } else if (type === 'bom') {
                params = [fields.custrecord_scv_source_external_id_bom || fields.custrecord_scv_source_external_id];
                fieldExternalid = 'custrecord_scv_source_external_id_bom';
            } else if (type === 'customrecord_scv_sfc_raw_data') {
                params = [fields.custrecord_scv_sfc_raw_data_int_id_h];
                fieldExternalid = 'custrecord_scv_sfc_raw_data_int_id_h';
                strExtWhere = " and rd.custrecord_scv_sfc_raw_data_is_current = 'T'";
            } else if (type === 'customrecord_scv_kpi_criteria') {
                params = [fields.custrecord_scv_kpi_criteria_itg_id];
                fieldExternalid = 'custrecord_scv_kpi_criteria_itg_id';
            } else if (type === 'customrecord_scv_emp_job_title') {
                params = [fields.custrecord_scv_emp_job_title_itg_id];
                fieldExternalid = 'custrecord_scv_emp_job_title_itg_id';
            } else if (type === 'customrecord_scv_bitrix_department') {
                params = [fields.custrecord_scv_btrxdep_itg_id];
                fieldExternalid = 'custrecord_scv_btrxdep_itg_id';
            } else if (type === 'customrecord_scv_kpi_target_header') {
                params = [fields.custrecord_scv_kpi_target_h_itg_id];
                fieldExternalid = 'custrecord_scv_kpi_target_h_itg_id';
            } else if (type === 'customrecord_scv_kpi_actual_header') {
                params = [fields.custrecord_scv_kpi_actual_h_itg_id];
                fieldExternalid = 'custrecord_scv_kpi_actual_h_itg_id';
            } else if (type === 'customrecord_scv_kpi_job_title') {
                params = [fields.custrecord_scv_kpi_job_itg_id];
                fieldExternalid = 'custrecord_scv_kpi_job_itg_id';
            } else if (type === 'customrecord_scv_bitrix_task') {
                params = [fields.custrecord_scv_btrxtask_itg_id_h];
                fieldExternalid = 'custrecord_scv_btrxtask_itg_id_h';
            } else if (type === 'customrecord_scv_bitrix_helpdesk') {
                params = [fields.custrecord_scv_btrxhdesk_itg_id];
                fieldExternalid = 'custrecord_scv_btrxhdesk_itg_id';
            } else if (type === 'customrecord_scv_report_exe_log') {
                params = [fields.custrecord_scv_exe_log_run_id];
                fieldExternalid = 'custrecord_scv_exe_log_run_id';
            } else if (type === 'customrecord_scv_gia_von_ton_kho_line') {
                params = [fields.custrecord_scv_gvtk_itg_id_l];
                fieldExternalid = 'custrecord_scv_gvtk_itg_id_l';
            } else if (type === 'customrecord_scv_fast_raw_data') {
                params = [fields.custrecord_scv_fast_raw_itgid_h];
                fieldExternalid = 'custrecord_scv_fast_raw_itgid_h';
                strExtWhere = " and rd.custrecord_scv_fast_raw_data_is_current = 'T'";
            } else if (type === 'customrecord_scv_gia_thanh_thuc_te_line') {
                params = [fields.custrecord_scv_gttt_line_itg_id];
                fieldExternalid = 'custrecord_scv_gttt_line_itg_id';
            } else if (type === 'customrecord_scv_gia_von_muc_tieu_line') {
                params = [fields.custrecord_scv_gvmt_line_inte_id];
                fieldExternalid = 'custrecord_scv_gvmt_line_inte_id';
            } else if (type === 'customrecord_scv_exp_group') {
                params = [fields.custrecord_scv_exp_group_categ];
                fieldExternalid = 'custrecord_scv_exp_group_categ';
            } else if (type === 'customrecord_cseg_scv_exp_list') {
                params = [fields.custrecord_scv_exp_list_code];
                fieldExternalid = 'custrecord_scv_exp_list_code';
            } else if (type === 'customrecord_scv_entity_contact') {
                params = [fields.custrecord_scv_ent_itg_id];
                fieldExternalid = 'custrecord_scv_ent_itg_id';
            } else if (type === 'customrecord_scv_itg_log_status_detail') {
                params = [fields.custrecord_scv_itglog_logid_l];
                fieldExternalid = 'custrecord_scv_itglog_logid_l';
            } else if (['customer', 'vendor', 'employee'].includes(type)) {
                params = [fields.custentity_scv_source_external_id];
                fieldExternalid = 'custentity_scv_source_external_id';
            }

            if (params) {
                let sql = `select rd.id from ${type} rd where rd.${fieldExternalid} = ? ${strExtWhere}`;//log.error('sql', sql);log.error('params', params);
                id = query.runSuiteQL({
                    query: sql,
                    params: params
                }).asMappedResults()[0]?.id;
            }
            return id;
        }

        const queryIdToCheckDuplidateExternal = (type, value, fieldId) => {
            let fieldExternalid = fieldId || 'externalid';
            let sql = `select rd.id from ${type} rd where rd.${fieldExternalid} = ?`;
            return query.runSuiteQL({
                query: sql,
                params: [value]
            }).asMappedResults()[0]?.id;
        }

        const deleteFieldExternalId = (type, fields) => {
            if (type === 'customrecord_scv_odoo_raw_data') {
                delete fields.custrecord_scv_odoo_raw_itgid_h;
            } else if (type === 'bomrevision' || type === 'bom') {
                delete fields.custrecord_scv_source_external_id;
            } else if (type === 'customrecord_scv_sfc_raw_data') {
                delete fields.custrecord_scv_sfc_raw_data_int_id_h;
            } else if (type === 'customrecord_scv_kpi_criteria') {
                delete fields.custrecord_scv_kpi_criteria_itg_id;
            } else if (type === 'customrecord_scv_emp_job_title') {
                delete fields.custrecord_scv_emp_job_title_itg_id;
            } else if (type === 'customrecord_scv_bitrix_department') {
                delete fields.custrecord_scv_btrxdep_itg_id;
            } else if (type === 'customrecord_scv_kpi_target_header') {
                delete fields.custrecord_scv_kpi_target_h_itg_id;
            } else if (type === 'customrecord_scv_kpi_actual_header') {
                delete fields.custrecord_scv_kpi_actual_h_itg_id;
            } else if (type === 'customrecord_scv_kpi_job_title') {
                delete fields.custrecord_scv_kpi_job_itg_id;
            } else if (type === 'customrecord_scv_bitrix_task') {
                delete fields.custrecord_scv_btrxtask_itg_id_h;
            } else if (type === 'customrecord_scv_bitrix_helpdesk') {
                delete fields.custrecord_scv_btrxhdesk_itg_id;
            }
        }

        const makeDefaultData = (requestBody, type, isCreate) => {
            let fields = requestBody.fields;
            if (type === 'customrecord_scv_odoo_raw_data') {
                if (isCreate) {
                    fields.externalid = fields.custrecord_scv_odoo_raw_itgid_h;
                    fields.custrecord_scv_odoo_raw_iscurrent_h = true;
                    fields.custrecord_scv_odoo_raw_action_h = Action.ADD;
                    fields.custrecord_scv_odoo_raw_stage_status_h = DataStageStatus.NEW;
                } else {
                    fields.custrecord_scv_odoo_raw_stage_status_h = DataStageStatus.CHANGED;
                    fields.custrecord_scv_odoo_raw_reprocess_dt_h = true;
                }
                //fields.custrecord_scv_odoo_raw_api_log_json_h = JSON.stringify(requestBody)
            } else if (type === 'customrecord_scv_sfc_raw_data') {
                if (isCreate) {
                    fields.externalid = fields.custrecord_scv_sfc_raw_data_int_id_h;
                    fields.custrecord_scv_sfc_raw_data_is_current = true;
                    fields.custrecord_scv_sfc_raw_data_action = Action.ADD;
                    fields.custrecord_scv_sfc_raw_data_stage_sts_h = DataStageStatus.NEW;
                } else {
                    fields.custrecord_scv_sfc_raw_data_stage_sts_h = DataStageStatus.CHANGED;
                }
            } else if (type === 'customrecord_scv_fast_raw_data') {
                if (isCreate) {
                    fields.externalid = fields.custrecord_scv_fast_raw_itgid_h;
                    fields.custrecord_scv_fast_raw_data_is_current = true;
                    fields.custrecord_scv_fast_raw_data_action = Action.ADD;
                    fields.custrecord_scv_fast_raw_stage_status_h = DataStageStatus.NEW;
                } else {
                    fields.custrecord_scv_fast_raw_stage_status_h = DataStageStatus.CHANGED;
                }
            }
        }

        const assignBatch = (action, datas, batch) => {
            datas.map(data => {
                data.action = action;
                if (data.type === 'customrecord_scv_odoo_raw_data') {
                    data.fields.custrecord_scv_odoo_raw_batch_no_h = batch;
                } else if (data.type === 'customrecord_scv_sfc_raw_data') {
                    data.fields.custrecord_scv_sfc_raw_data_batch_no_h = batch;
                } else if (data.type === record.Type.BOM_REVISION) {
                    data.fields.custrecord_scv_source_batch_no = batch;
                }
            });
        }

        const transformRecordFromSalesOrder = (fromType, fromId) => {
            let recItemFulfillment = record.transform({
                fromType: fromType,
                fromId: fromId,
                toType: record.Type.ITEM_FULFILLMENT,
                isDynamic: true
            });
            recItemFulfillment.setValue('shipstatus', 'C');
            let itemfulfillmentId = recItemFulfillment.save();

            let recInvoice = record.transform({
                fromType: fromType,
                fromId: fromId,
                toType: record.Type.INVOICE,
                isDynamic: true
            });
            recInvoice.setValue('custbody_scv_created_transaction', itemfulfillmentId);
            let invoiceId = recInvoice.save();

            record.submitFields.promise({
                type: record.Type.ITEM_FULFILLMENT,
                id: itemfulfillmentId,
                values: {
                    custbody_scv_created_invoice: invoiceId,
                    custbody_scv_related_transaction: invoiceId
                }
            });

            return {itemfulfillmentId, invoiceId};
        }

        const handleSalesOrder = (requestBody, recAdd) => {
            let nfields = {}, fields = requestBody.fields;
            nfields.entity = fields.entity;
            nfields.subsidiary = fields.subsidiary;
            nfields.location = fields.location;
            nfields.custbody_scv_order_type = fields.custbody_scv_order_type;
            for (let key in fields) {
                nfields[key] = fields[key];
            }
            addSubToCustomer(nfields);
            requestBody.fields = nfields;
            setFields(recAdd, requestBody);
            setCurrentSublistValueSalesOrder(recAdd, requestBody);
        }

        const setCurrentSublistValueSalesOrder = (recSalesOrder, data) => {
            let sublists = data.sublists;
            let sb_data, lg_data, subRec, tempdate, lineid, tempvalue;
            let i = 0;
            if (sublists !== undefined && sublists !== null && sublists !== '') {
                let gmtSv = gmtServerReverse();
                for (let sb in sublists) {
                    sb_data = sublists[sb];
                    if (!sb_data) continue;

                    lg_data = sb_data.length;
                    i = 0;
                    lineid = 0;
                    for (let i = 0; i < lg_data; i++) {
                        recSalesOrder.selectNewLine({sublistId: sb});
                        buildAgainInventoryDetailFulfillUnit(sb_data[i]);
                        for (let k in sb_data[i]) {
                            if (k !== undefined && k !== null && k !== '' && k !== 'line_total') {
                                tempdate = sb_data[i][k];
                                let value = tempdate;
                                let text = undefined;
                                if (!!value && typeof value == 'object' && !isSubrecord(k).isValid) {
                                    tempdate = value.value;
                                    text = value.text;
                                    value = value.value;
                                }
                                if (value !== undefined || text !== undefined) {
                                    if (!!text) {
                                        recSalesOrder.setCurrentSublistText({sublistId: sb, fieldId: k, text: text});
                                    } else if (k.substring(0, 5) === 'text_') {
                                        recSalesOrder.setCurrentSublistText({
                                            sublistId: sb,
                                            fieldId: k.substring(5),
                                            text: value
                                        });
                                    } else if (isFieldDate(k).isValid) {
                                        if (typeof tempdate == 'number') {
                                            tempdate = getDateGMT(tempdate, gmtSv);
                                            recSalesOrder.setCurrentSublistValue({
                                                sublistId: sb,
                                                fieldId: isFieldDate(k).key,
                                                value: tempdate
                                            });
                                        } else {
                                            recSalesOrder.setCurrentSublistText({
                                                sublistId: sb,
                                                fieldId: k,
                                                text: tempdate
                                            });
                                        }
                                    } else if (isFieldTime(k).isValid) {
                                        if (typeof tempdate === 'number') {
                                            tempdate = getDateGMT(tempdate, gmtSv);
                                            recSalesOrder.setCurrentSublistValue({
                                                sublistId: sb,
                                                fieldId: isFieldTime(k).key,
                                                value: tempdate
                                            });
                                        } else {
                                            recSalesOrder.setCurrentSublistText({
                                                sublistId: sb,
                                                fieldId: k,
                                                text: tempdate
                                            });
                                        }
                                    } else if (isFieldDateTime(k).isValid) {
                                        if (typeof tempdate === 'number') {
                                            tempdate = new Date(tempdate);
                                            recSalesOrder.setCurrentSublistValue({
                                                sublistId: sb,
                                                fieldId: isFieldDateTime(k).key,
                                                value: tempdate
                                            });
                                        } else {
                                            recSalesOrder.setCurrentSublistText({
                                                sublistId: sb,
                                                fieldId: k,
                                                text: tempdate
                                            });
                                        }
                                    } else if (isSubrecord(k).isValid) {
                                        subRec = recSalesOrder.getCurrentSublistSubrecord({
                                            sublistId: sb,
                                            fieldId: isSubrecord(k).key
                                        });
                                        if (isSubrecord(k).key === 'inventorydetail') {
                                            let notenoughlotquantity = 0, enoughlotquantity = 0, isr = 0;
                                            for (let ivassObj of sb_data[i][k].sublists.inventoryassignment) {
                                                subRec.selectNewLine({sublistId: 'inventoryassignment'});
                                                enoughlotquantity = enoughlotquantity + ivassObj.quantity * 1;
                                                let fieldopt = subRec.getSublistField({
                                                    sublistId: 'inventoryassignment',
                                                    fieldId: 'issueinventorynumber',
                                                    line: isr
                                                });
                                                let opt = fieldopt.getSelectOptions();
                                                if (opt && opt.find(o => o.text === ivassObj.issueinventorynumber.text)) {
                                                    subRec.setCurrentSublistText({
                                                        sublistId: 'inventoryassignment',
                                                        fieldId: 'issueinventorynumber',
                                                        text: ivassObj.issueinventorynumber.text
                                                    });
                                                    tempvalue = subRec.getCurrentSublistValue({
                                                        sublistId: 'inventoryassignment',
                                                        fieldId: 'quantityavailable'
                                                    });
                                                    if (tempvalue > ivassObj.quantity) {
                                                        tempvalue = ivassObj.quantity;
                                                    }
                                                    notenoughlotquantity = notenoughlotquantity + tempvalue * 1;
                                                    subRec.setCurrentSublistValue({
                                                        sublistId: 'inventoryassignment',
                                                        fieldId: 'quantity',
                                                        value: tempvalue
                                                    });
                                                    subRec.commitLine({sublistId: 'inventoryassignment'});
                                                    isr++;
                                                } else {
                                                    subRec.cancelLine({sublistId: 'inventoryassignment'});
                                                }
                                            }
                                            if (notenoughlotquantity !== enoughlotquantity) {
                                                data.isnotenoughlot = true;
                                            }
                                        } else {
                                            setFields(subRec, sb_data[i][k]);
                                            setCurrentSublistValue(subRec, sb_data[i][k]);
                                        }
                                    } else {
                                        recSalesOrder.setCurrentSublistValue({sublistId: sb, fieldId: k, value: value});
                                    }
                                }
                            }
                        }
                        if (sb_data[i].rate || sb_data[i].rate === 0) {
                            recSalesOrder.setCurrentSublistValue({sublistId: sb, fieldId: 'price', value: -1});
                            recSalesOrder.setCurrentSublistValue({
                                sublistId: sb,
                                fieldId: 'rate',
                                value: sb_data[i].rate
                            });
                        }
                        setCurrentIsFreeGift(recSalesOrder, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_01, sb_data[i].custcol_scv_discount_amount_01, 'custcol_scv_line_promotion_01');
                        setCurrentIsFreeGift(recSalesOrder, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_02, sb_data[i].custcol_scv_discount_amount_02, 'custcol_scv_line_promotion_02');
                        setCurrentIsFreeGift(recSalesOrder, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_03, sb_data[i].custcol_scv_discount_amount_03, 'custcol_scv_line_promotion_03');

                        recSalesOrder.commitLine({sublistId: sb});
                        if (sb === 'item' && !(sb_data[i].custcol_scv_line_isfreegift === true || sb_data[i].custcol_scv_line_isfreegift === 'T')) {
                            if (addCurrentLineDiscount(recSalesOrder, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_01, sb_data[i].custcol_scv_discount_amount_01, lineid + 1, '01', sb_data[i].custcol_scv_gross_discount_amount_01)) {
                                lineid++;
                            }
                            if (addCurrentLineDiscount(recSalesOrder, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_02, sb_data[i].custcol_scv_discount_amount_02, lineid + 1, '02', sb_data[i].custcol_scv_gross_discount_amount_02)) {
                                lineid++;
                            }
                            if (addCurrentLineDiscount(recSalesOrder, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_03, sb_data[i].custcol_scv_discount_amount_03, lineid + 1, '03', sb_data[i].custcol_scv_gross_discount_amount_03)) {
                                lineid++;
                            }
                        }
                        lineid++;
                    }
                }
            }
        }

        const addCurrentLineDiscount = (rec, sb, obItem, rate, amount, lineid, sufix_dc, gross_discount_amount) => {
            let isInsert = false;
            let fieldCopy = [
                'location',
                'custcol_scv_trans_ma_ckkm',
                'custcol_scv_trans_ten_ckkm',
                //'memo',
                'cseg_scv_sg_pro',
                'cseg_scv_seg_region',
                'cseg_scv_sc',
                'cseg_scv_exp_list',
                'cseg_scv_prodcatg',
                'class',
                'cseg_scv_prodgroup',
                'cseg_scv_model',
                'cseg_scv_nhomxanhdo',
                'cseg_scv_chain',
                'custcol_scv_line_asm',
                'department',
                'custcol_scv_line_promotion_' + sufix_dc, 'custcol_scv_promotion_rate_' + sufix_dc, 'custcol_scv_discount_amount_' + sufix_dc
            ];
            if (rate && !amount) {
                amount = (rec.getSublistValue({sublistId: sb, fieldId: 'amount', line: lineid - 1}) * rate / 100);
                if (amount) {
                    rec.selectLine({sublistId: sb, line: lineid - 1});
                    rec.setCurrentSublistValue({
                        sublistId: sb,
                        fieldId: 'custcol_scv_discount_amount_' + sufix_dc,
                        value: amount
                    });
                    rec.commitLine({sublistId: sb});
                }
            }
            if (rate && amount) {
                let lkIt = search.lookupFields({
                    type: 'item',
                    id: obItem.item,
                    columns: ['custitem_scv_ite_item_discount']
                });
                let item_discount = lkIt.custitem_scv_ite_item_discount[0]?.value;
                if (item_discount) {
                    let taxcode = obItem.taxcode;
                    if (!taxcode) {
                        taxcode = rec.getSublistValue({sublistId: sb, fieldId: 'taxcode', line: lineid - 1});
                    }
                    isInsert = true;
                    let line_total = obItem.line_total;
                    //rec.selectNewLine({sublistId: sb});
                    rec.insertLine({sublistId: sb, line: lineid});
                    let grossamt_item = rec.getSublistValue({sublistId: sb, fieldId: 'grossamt', line: lineid - 1});
                    rec.setCurrentSublistValue({sublistId: sb, fieldId: 'item', value: item_discount});
                    rec.setCurrentSublistValue({sublistId: sb, fieldId: 'rate', value: Math.abs(amount) * (-1)});
                    rec.setCurrentSublistValue({sublistId: sb, fieldId: 'taxcode', value: taxcode});

                    if (gross_discount_amount && line_total) {
                        setAgainAmount(rec, sb, gross_discount_amount, line_total, grossamt_item, -1);
                    }
                    for (let fieldId of fieldCopy) {
                        let value = obItem[fieldId];
                        if (!value && value !== 0) {
                            value = rec.getSublistValue({sublistId: sb, fieldId: fieldId, line: lineid - 1});
                        }
                        rec.setCurrentSublistValue({sublistId: sb, fieldId: fieldId, value: value});
                    }
                    rec.commitLine({sublistId: sb});
                }
            }
            return isInsert;
        }

        const setAgainAmount = (rec, sb, gross_discount_amount, line_total, grossamt_item, sign) => {
            let tax1amt = rec.getCurrentSublistValue({sublistId: sb, fieldId: 'tax1amt'}) * 1;
            let amount = (Math.abs(gross_discount_amount) - Math.abs(tax1amt)) * sign;
            if (sign < 0) {
                rec.setCurrentSublistValue({sublistId: sb, fieldId: 'rate', value: amount});
            }
            rec.setCurrentSublistValue({sublistId: sb, fieldId: 'amount', value: amount});
            let grossamt = Math.abs(rec.getCurrentSublistValue({sublistId: sb, fieldId: 'grossamt'}));
            let diff_amt = grossamt_item - line_total - Math.abs(grossamt);
            if (diff_amt !== 0) {
                rec.setCurrentSublistValue({sublistId: sb, fieldId: 'tax1amt', value: tax1amt + diff_amt});
            }
        }

        const setCurrentIsFreeGift = (rec, sb, obItem, rate, amountDiscount, field) => {
            let amount = rec.getCurrentSublistValue({sublistId: sb, fieldId: 'amount'})
            if ((rate === 100) || (amount === amountDiscount) && obItem[field]) {
                rec.setCurrentSublistValue({sublistId: sb, fieldId: 'custcol_scv_line_isfreegift', value: true});
            }
        }

        const addSubToCustomer = (fields) => {
            let entity = fields.entity;
            let sub = String(fields.subsidiary);
            let lkE = search.lookupFields({type: 'entity', id: entity, columns: ['recordtype']});
            let recCus = record.load({
                type: lkE.recordtype === record.Type.VENDOR ? record.Type.CUSTOMER : lkE.recordtype,
                id: entity
            });
            let isUpdate = false;
            if (lkE.recordtype === 'lead' || lkE.recordtype === 'prospect') {
                isUpdate = true;
                recCus.setValue('entitystatus', 13);
            }
            let subsidiary = recCus.getValue('subsidiary'), subd_machine;
            if (sub !== subsidiary) {
                let sl = 'submachine';
                let lSub = recCus.getLineCount(sl);
                let isInsert = true;
                for (let i = 0; i < lSub; i++) {
                    subd_machine = recCus.getSublistValue({sublistId: sl, fieldId: 'subsidiary', line: i});
                    if (subd_machine === sub) {
                        isInsert = false;
                        break;
                    }
                }
                if (isInsert) {
                    recCus.insertLine({sublistId: sl, line: lSub});
                    recCus.setSublistValue({sublistId: sl, fieldId: 'subsidiary', value: sub, line: lSub});
                    recCus.save();
                    isUpdate = false;
                }
            }
            if (isUpdate) {
                recCus.save();
            }
        }

        const makeSQLAndParams = (requestBody) => {
            if (!requestBody.sql) {
                let type = requestBody.type;
                if (type === 'unitstype') {
                    makeSQLAndParamsUnitsType(requestBody);
                } else if (type === 'units') {
                    makeSQLAndParamsUnits(requestBody);
                } else if (type === 'classification') {
                    makeSQLAndParamsClassifcation(requestBody);
                } else if (type === 'location') {
                    makeSQLAndParamsLocation(requestBody);
                }
            }
        }

        const makeSQLAndParamsUnitsType = (requestBody) => {
            let filters = requestBody.filters;
            let strWhere = '', params = [];
            if (filters) {
                if (filters.id || filters.lastmodifieddate) {
                    let isplusand = false;
                    strWhere = ' where';
                    if (filters.id) {
                        strWhere = strWhere.concat(` ut.id in(${splitComa(filters.id, ',').join(',')})`);
                        isplusand = true;
                    }
                    if (filters.lastmodifieddate) {
                        strWhere = isplusand ? strWhere.concat(' and') : strWhere;
                        strWhere = strWhere.concat(` ut.lastmodifieddate >= ? `);
                        params.push(filters.lastmodifieddate);
                    }
                }
            }
            requestBody.sql = `SELECT ut.id, ut.name FROM unitsType ut ${strWhere}`;
            requestBody.params = params;
        }

        const makeSQLAndParamsUnits = (requestBody) => {
            let filters = requestBody.filters;
            let strJoin = '', strWhere = '', params = [];
            if (filters) {
                if (filters.internalid || filters.unitstype || filters.lastmodifieddate) {
                    let isplusand = false;
                    strWhere = ' where';
                    if (filters.internalid) {
                        strWhere = strWhere.concat(` uom.internalid in(${splitComa(filters.internalid, ',').join(',')})`);
                        isplusand = true;
                    }
                    if (filters.unitstype) {
                        strWhere = isplusand ? strWhere.concat(' and') : strWhere;
                        strWhere = strWhere.concat(` uom.unitstype in(${splitComa(filters.unitstype, ',').join(',')})`);
                        isplusand = true;
                    }
                    if (filters.lastmodifieddate) {
                        strJoin = ' join unitstype ut on ut.id = uom.unitstype';
                        strWhere = isplusand ? strWhere.concat(' and') : strWhere;
                        strWhere = strWhere.concat(` ut.lastmodifieddate >= ? `);
                        params.push(filters.lastmodifieddate);
                    }
                }
            }
            requestBody.sql = `SELECT uom.internalid, uom.pluralname name, uom.baseunit, uom.conversionrate, uom.unitstype FROM unitsTypeUom uom ${strJoin} ${strWhere}`;
            requestBody.params = params;
        }

        const makeSQLAndParamsClassifcation = (requestBody) => {
            requestBody.sql = `select c.id, c.name, c.subsidiary, c.includechildren, c.parent from classification c`;
            requestBody.params = [];
        }

        const makeSQLAndParamsLocation = (requestBody) => {
            let params = [], strWhere = " where 1 = 1 ";
            if (requestBody.filters) {
                if (requestBody.filters.internalid) {
                    let ids = splitComa(requestBody.filters.internalid, ',');
                    strWhere = ` ${strWhere} and c.id in(${ids.join(',')})`;
                }
            }
            requestBody.sql = `select c.id internalid, c.name, c.subsidiary, c.isinactive from location c ${strWhere}`;
            requestBody.params = params;
        }

        const transformTransaction = (objData, requestBody) => {
            let status, message = '', transform_id = null;
            let from_id = requestBody.from_id;
            let to_type = requestBody.to_type;
            if (from_id) {
                if (to_type === record.Type.RETURN_AUTHORIZATION) {
                    transform_id = transformToReturnAuthorization(requestBody, from_id, to_type);
                    if (transform_id) {
                        transformRecordFromReturnAuthorization(to_type, transform_id);
                    }
                    status = !!transform_id;
                }
                if (to_type === record.Type.ITEM_RECEIPT) {
                    transform_id = transformToItemReceipt(requestBody, from_id, to_type);
                    status = !!transform_id;
                } else {
                    status = false;
                    message = to_type ? `Transform to_type ${to_type} is not supported.` : 'to_type is required for transform action.';
                }
            } else {
                status = false;
            }
            return {status, message, transform_id}
        }

        const transformRecordFromReturnAuthorization = (fromType, fromId) => {
            let itemReceiptId = null, creditMemoId = null;
            try {
                let recItemRecipt = record.transform({
                    fromType: fromType,
                    fromId: fromId,
                    toType: record.Type.ITEM_RECEIPT,
                    isDynamic: true
                });
                itemReceiptId = recItemRecipt.save({ignoreMandatoryFields: true});

                let recCreditMemo = record.transform({
                    fromType: fromType,
                    fromId: fromId,
                    toType: record.Type.CREDIT_MEMO,
                    isDynamic: true
                });
                recCreditMemo.setValue('custbody_scv_created_transaction', itemReceiptId);
                creditMemoId = recCreditMemo.save({ignoreMandatoryFields: true});

                record.submitFields.promise({
                    type: record.Type.ITEM_RECEIPT,
                    id: itemReceiptId,
                    values: {
                        custbody_scv_related_transaction: creditMemoId
                    }
                });
            } catch (e) {
                log.error('transformRecordFromReturnAuthorization', e);
            }
            return {itemReceiptId, creditMemoId};
        }

        const transformToReturnAuthorization = (requestBody, from_id, to_type) => {
            let recReturnAuthorization = record.transform({
                fromType: record.Type.SALES_ORDER,
                fromId: from_id,
                toType: to_type,
                isDynamic: true
            });
            setFields(recReturnAuthorization, requestBody.fields);
            recReturnAuthorization.setValue('orderstatus', 'B');

            let recSalesOrder = record.load({type: record.Type.SALES_ORDER, id: from_id});
            let listDataItemLine = libFunc.getSublistValueLine(recSalesOrder, Sublist.ITEM, ['item', 'taxcode', 'line', 'quantity', 'price', 'rate']);
            let lineCountItem = recReturnAuthorization.getLineCount({sublistId: Sublist.ITEM});

            let line_items = requestBody.sublists?.item;
            let isSave = true;
            let lineLength = line_items.length;
            if (line_items && lineLength > 0) {
                let countItem = 0;
                let lineCurrentFields = ['quantity', 'price', 'taxcode', 'rate'];
                for (let i = 0; i < lineCountItem; i++) {
                    recReturnAuthorization.selectLine({sublistId: Sublist.ITEM, line: i});
                    let {
                        item,
                        orderline,
                        quantity
                    } = libFunc.getSublistValueLineFields(recReturnAuthorization, Sublist.ITEM, ['item', 'orderline', 'quantity'], i);
                    let objPosItem = line_items.find(o => String(o.item) === String(item) && !o.isSelect);
                    if (objPosItem) {
                        let objSalesOrderItem = listDataItemLine.find(o => String(o.line) === String(orderline));
                        let quantityReturn = objPosItem.quantity;
                        if (quantityReturn > quantity) {
                            objPosItem.quantity = quantityReturn - quantity;
                            quantityReturn = quantity;
                        } else {
                            objPosItem.quantity = 0;
                            objPosItem.isSelect = true;
                        }

                        let rate = objPosItem.rate || objSalesOrderItem.rate;
                        let lineCurrentDatas = [quantityReturn, objSalesOrderItem.price, objSalesOrderItem.taxcode, rate];
                        libFunc.setCurrentSublistValueData(recReturnAuthorization, Sublist.ITEM, lineCurrentFields, lineCurrentDatas);

                        let recIVD = recReturnAuthorization.getCurrentSublistSubrecord({
                            sublistId: Sublist.ITEM,
                            fieldId: 'inventorydetail'
                        });
                        if (recIVD) {
                            buildAgainInventoryDetailReceiptUnit(objPosItem);
                            let lineCountIass = recIVD.getLineCount(Sublist.IVENTORY_ASSIGNMENT);
                            for (let j = 0; j < lineCountIass; j++) {
                                recIVD.removeLine({sublistId: Sublist.IVENTORY_ASSIGNMENT, line: 0});
                            }
                            for (let ivassObj of objPosItem.inventorydetail.sublists.inventoryassignment) {
                                recIVD.selectNewLine({sublistId: Sublist.IVENTORY_ASSIGNMENT});
                                recIVD.setCurrentSublistValue({
                                    sublistId: Sublist.IVENTORY_ASSIGNMENT,
                                    fieldId: 'receiptinventorynumber',
                                    value: ivassObj.receiptinventorynumber
                                });
                                recIVD.setCurrentSublistValue({
                                    sublistId: Sublist.IVENTORY_ASSIGNMENT,
                                    fieldId: 'quantity',
                                    value: ivassObj.quantity < quantityReturn ? ivassObj.quantity : quantityReturn
                                });
                                recIVD.commitLine({sublistId: Sublist.IVENTORY_ASSIGNMENT});
                            }
                        }

                        recReturnAuthorization.commitLine({sublistId: Sublist.ITEM});
                        countItem++;

                        if (!objPosItem.custcol_scv_line_isfreegift === true) {
                            if (addCurrentLineDiscount(recReturnAuthorization, Sublist.ITEM, objPosItem, objPosItem.custcol_scv_promotion_rate_01, objPosItem.custcol_scv_discount_amount_01, countItem + 1, '01', objPosItem.custcol_scv_gross_discount_amount_01)) {
                                countItem++;
                                i++;
                                lineLength++;
                                lineCountItem++;
                            }
                            if (addCurrentLineDiscount(recReturnAuthorization, Sublist.ITEM, objPosItem, objPosItem.custcol_scv_promotion_rate_02, objPosItem.custcol_scv_discount_amount_02, countItem + 1, '02', objPosItem.custcol_scv_gross_discount_amount_02)) {
                                countItem++;
                                i++;
                                lineLength++;
                                lineCountItem++;
                            }
                            if (addCurrentLineDiscount(recReturnAuthorization, Sublist.ITEM, objPosItem, objPosItem.custcol_scv_promotion_rate_03, objPosItem.custcol_scv_discount_amount_03, countItem + 1, '03', objPosItem.custcol_scv_gross_discount_amount_03)) {
                                countItem++;
                                i++;
                                lineLength++;
                                lineCountItem++;
                            }
                        }
                    } else {
                        recReturnAuthorization.removeLine({sublistId: Sublist.ITEM, line: i});
                        i--;
                        lineCountItem--;
                    }
                }
                isSave = countItem === lineLength;
            } else {
                let lineCurrentFields = ['price', 'taxcode', 'rate'];
                for (let i = 0; i < lineCountItem; i++) {
                    recReturnAuthorization.selectLine({sublistId: Sublist.ITEM, line: i});
                    let {orderline} = libFunc.getSublistValueLineFields(recReturnAuthorization, Sublist.ITEM, ['orderline'], i);
                    let objSalesOrderItem = listDataItemLine.find(o => String(o.line) === String(orderline));
                    let lineCurrentDatas = [objSalesOrderItem.price, objSalesOrderItem.taxcode, objSalesOrderItem.rate];
                    libFunc.setCurrentSublistValueData(recReturnAuthorization, Sublist.ITEM, lineCurrentFields, lineCurrentDatas);
                    recReturnAuthorization.commitLine({sublistId: Sublist.ITEM});
                }
            }

            let returnAuthorizationId = null;
            if (isSave) {
                returnAuthorizationId = recReturnAuthorization.save({ignoreMandatoryFields: true});
            }
            return returnAuthorizationId;
        }

        const transformToItemReceipt = (requestBody, from_id, to_type) => {
            let transform_id = null;
            let fieldOfTransaction = search.lookupFields({
                type: search.Type.TRANSACTION,
                id: from_id,
                columns: ['recordtype', 'createdfrom']
            });
            let createdfrom = fieldOfTransaction.createdfrom[0]?.value;
            if (createdfrom && fieldOfTransaction.recordtype === record.Type.ITEM_FULFILLMENT) {
                let fieldOfCreatedFrom = search.lookupFields({
                    type: search.Type.TRANSACTION,
                    id: createdfrom,
                    columns: ['recordtype']
                });
                if (fieldOfCreatedFrom.recordtype === record.Type.TRANSFER_ORDER) {
                    transform_id = findItemReceiptFromItemFulfillment(from_id);

                    if (!transform_id) {
                        let defaultValuesItemReceipt = {itemfulfillment: from_id};
                        let recItemReceipt = record.transform({
                            fromType: fieldOfCreatedFrom.recordtype,
                            fromId: createdfrom,
                            toType: to_type,
                            isDynamic: true, defaultValues: defaultValuesItemReceipt
                        });
                        recItemReceipt.setValue('custbody_scv_pos_confirm', true);
                        transform_id = recItemReceipt.save({ignoreMandatoryFields: true});
                    }
                    record.submitFields({
                        type: fieldOfTransaction.recordtype,
                        id: from_id,
                        values: {custbody_scv_pos_confirm: true}
                    });
                }
            }
            return transform_id;
        }

        const findItemReceiptFromItemFulfillment = (itemFulfillmentId) => {
            let sql = `SELECT
                        ir.id
                    FROM
                        transaction ir
                    INNER JOIN previoustransactionlink link
                        ON link.nextdoc = ir.id
                    INNER JOIN transaction iff
                        ON iff.id = link.previousdoc
                        AND iff.type = 'ItemShip'
                    WHERE
                        link.previousdoc = ?
            `;

            return query.runSuiteQL({query: sql, params: [itemFulfillmentId]}).asMappedResults()[0]?.id;
        }

        /*const buildAgainInventoryDetailReceipt = (items) => {
            for (let objItem of items) {
                buildAgainInventoryDetailReceiptUnit(objItem);
            }
        }*/

        const buildAgainInventoryDetailReceiptUnit = (objItem) => {
            if (objItem.inventoryNumber && !objItem.inventorydetail) {
                objItem.inventorydetail = {
                    sublists: {
                        inventoryassignment: [{
                            receiptinventorynumber: objItem.inventoryNumber,
                            quantity: objItem.quantity
                        }]
                    }
                };
            }
        }

        /*const buildAgainInventoryDetailFulfill = (items) => {
            for (let objItem of items) {
                buildAgainInventoryDetailFulfillUnit(objItem);
            }
        }*/

        const buildAgainInventoryDetailFulfillUnit = (objItem) => {
            if (objItem.inventoryNumber && !objItem.inventorydetail) {
                objItem.inventorydetail = {
                    sublists: {
                        inventoryassignment: [{
                            issueinventorynumber: {text: objItem.inventoryNumber},
                            quantity: objItem.quantity
                        }]
                    }
                };
            }
        }

        const assignInforRecordData = (type, requestBody, objData) => {
            if (type === 'transaction' || type === 'item' || type === 'entity') {
                let lkF = search.lookupFields({type: type, id: requestBody.internalid, columns: ['recordtype']});
                type = lkF.recordtype;
            }
            let recTemp = record.load({type: type, id: requestBody.internalid, isDynamic: false});
            objData.internalid = requestBody.internalid;
            let fieldSublistRecords = [{
                fieldcheck: 'inventorydetailavail',
                fieldget: 'inventorydetail',
                fieldsGet: null,
                sublistFieldsGet: null
            }];
            let fieldSubrecords = [{
                fieldcheck: 'billingaddress2_set',
                fieldget: 'billingaddress',
                fieldsGet: null,
                sublistFieldsGet: null
            }, {
                fieldcheck: 'shippingaddress2_set',
                fieldget: 'shippingaddress',
                fieldsGet: null,
                sublistFieldsGet: null
            }];
            let fieldsGet = null, sublistFieldsGet = null;
            if (type === 'salesorder') {

            } else if (type === 'purchaseorder') {

            } else if (type === 'inventorycount') {
                fieldSublistRecords = [{fieldcheck: 'countdetailavail', fieldget: 'countdetail'}];
            }
            getFields(recTemp, objData, fieldsGet, fieldSubrecords, fieldSublistRecords);
            getSublistFields(recTemp, objData, sublistFieldsGet, fieldSubrecords, fieldSublistRecords);
        }

        const RecordTypeWithSavedSearch = {customsearch_scv_mkp_inv_pos: 'inventorybalance'};
        const searchCustomSearch = (type, filters, arrFilter, pageinfo) => {
            let records = [];
            if (RecordTypeWithSavedSearch[type]) {
                type = {id: type, type: RecordTypeWithSavedSearch[type]}
            }
            let totalRecord = doSearchSSOrgPage(type, 1000, records, arrFilter, null, pageinfo, '- None -', null, null, false, true).totalRecord;

            return {totalRecord, records}
        }

        const doSearch = (stype, records, columns, fields, arrFilter, pageinfo) => {
            let totoalRecord = 0;
            let lFields = fields.length;
            let s = search.create({type: stype, filters: arrFilter, columns: columns});
            let pagesize = 1000, pagestart = 0;
            if (!!pageinfo) {
                if (!!pageinfo.pagesize && !isNaN(pageinfo.pagesize)) {
                    pagesize = pageinfo.pagesize * 1;
                    if (pagesize > 1000 || pagesize <= 0) {
                        pagesize = 1000;
                    }
                }
                if ((!!pageinfo.pagestart && !isNaN(pageinfo.pagestart)) || pageinfo.pagestart === 0) {
                    pagestart = pageinfo.pagestart * 1;
                    if (pagestart < 0) {
                        pagestart = 0;
                    }
                }
            }
            let r = s.runPaged({pageSize: pagesize});
            let numPage = r.pageRanges.length;
            let pageend = numPage - 1;
            if (!!pageinfo) {
                if ((!!pageinfo.pageend && !isNaN(pageinfo.pageend)) || pageinfo.pageend === 0) {
                    pageend = pageinfo.pageend * 1;
                    if (pageend < pagestart) {
                        pageend = pagestart;
                    }
                    if (pageend >= numPage) {
                        pageend = numPage - 1;
                    }
                }
                if (pagestart >= numPage) {
                    pagestart = numPage - 1;
                }
            }
            let searchPage, tempData, numTemp, objT;
            if (pagestart >= 0) {
                for (let np = pagestart; np <= pageend; np++) {
                    searchPage = r.fetch({index: np});
                    tempData = searchPage.data;
                    if (tempData) {
                        numTemp = tempData.length;
                        for (let i = 0; i < numTemp; i++) {
                            objT = {};
                            for (let j = 0; j < lFields; j++) {
                                if (typeof fields[j] === 'object' && (fields[j].type === 'select' || fields[j].ishide)) {
                                    if (!fields[j].ishide) {
                                        if (fields[j].columntext || fields[j].columntext === 0) {
                                            objT[fields[j].id] = {
                                                value: tempData[i].getValue(columns[j]),
                                                text: tempData[i].getValue(columns[fields[j].columntext])
                                            };
                                        } else {
                                            objT[fields[j].id] = {
                                                value: tempData[i].getValue(columns[j]),
                                                text: tempData[i].getText(columns[j])
                                            };
                                        }
                                    }
                                } else {
                                    objT[fields[j]] = tempData[i].getValue(columns[j]);
                                }
                            }
                            records.push(objT);
                            totoalRecord = totoalRecord + 1;
                        }
                    }
                }
            }
            return totoalRecord;
        }

        const doSearchSSOrgPage = (idSearch, pgSize, results, arrFilter, arrCol, pageinfo, vnone, columns_add, splice, isnotgetdisplay, islabelid) => {
            let s = search.load(idSearch);
            let lengTemp, lCT = 0;
            if (!!arrCol) {
                lCT = arrCol.length;
            }
            if (arrFilter) {
                lengTemp = arrFilter.length;
                if (lengTemp > 0) {
                    let f = s.filters;
                    for (let lT = 0; lT < lengTemp; lT++) {
                        f.push(arrFilter[lT]);
                    }
                    s.filters = f;
                }
            }

            let pagesize = pgSize, pagestart = 0;
            if (!!pageinfo) {
                if (!!pageinfo.pagesize && !isNaN(pageinfo.pagesize)) {
                    pagesize = pageinfo.pagesize * 1;
                    if (pagesize > 1000 || pagesize <= 0) {
                        pagesize = 1000;
                    } else if (pagesize < 5) {
                        pagesize = 5;
                    }
                }
                if ((!!pageinfo.pagestart && !isNaN(pageinfo.pagestart)) || pageinfo.pagestart === 0) {
                    pagestart = pageinfo.pagestart * 1;
                    if (pagestart < 0) {
                        pagestart = 0;
                    }
                }
            }

            let c = s.columns;
            if (splice) {
                for (let i in splice) {
                    c.splice(splice[i].splice_col_start, splice[i].splice_col_leng);
                }
            }
            if (columns_add) {
                c = c.concat(columns_add);
                s.columns = c;
            }
            let ct = JSON.parse(JSON.stringify(c));

            lengTemp = c.length;
            let r;
            try {
                r = s.runPaged({pageSize: pagesize});
            } catch (e) {
                r = s.runPaged({pageSize: pagesize});
                log.error('e runpage', e);
            }
            let numPage = r.pageRanges.length;
            let pageend = numPage - 1;
            if (!!pageinfo) {
                if ((!!pageinfo.pageend && !isNaN(pageinfo.pageend)) || pageinfo.pageend === 0) {
                    pageend = pageinfo.pageend * 1;
                    if (pageend < pagestart) {
                        pageend = pagestart;
                    }
                    if (pageend >= numPage) {
                        pageend = numPage - 1;
                    }
                }
                if (pagestart >= numPage) {
                    pagestart = numPage - 1;
                }
            }

            let searchPage, tempData, numTemp, objTemp, tempValue, tempValueText;
            let totalRecord = 0;
            if (pagestart >= 0) {
                for (let np = pagestart; np <= pageend; np++) {
                    try {
                        searchPage = r.fetch({index: np});
                    } catch (e) {
                        searchPage = r.fetch({index: np});
                        log.error('e searchPage', e);
                    }
                    tempData = searchPage.data;
                    if (tempData) {
                        numTemp = tempData.length;
                        totalRecord = totalRecord + numTemp;
                        for (let i = 0; i < numTemp; i++) {
                            objTemp = {};
                            for (let lT = 0; lT < lengTemp; lT++) {
                                tempValue = tempData[i].getValue(c[lT]);
                                if (tempValue === vnone) {
                                    tempValue = '';
                                }
                                let fieldname = islabelid ? c[lT].label : c[lT].name;
                                objTemp[fieldname] = tempValue;
                                if (!isnotgetdisplay && ct[lT].type === 'select') {
                                    tempValueText = tempData[i].getText(c[lT])
                                    objTemp[fieldname + '_display'] = tempValueText === vnone ? '' : tempValueText;
                                }
                            }
                            for (let lT = 0; lT < lCT; lT++) {
                                if (c[arrCol[lT][1]]) {
                                    if (arrCol[lT][2] === 'sltext') {
                                        tempValue = tempData[i].getText(c[arrCol[lT][1]]);
                                    } else {
                                        tempValue = tempData[i].getValue(c[arrCol[lT][1]]);
                                    }
                                    if (tempValue === vnone) {
                                        tempValue = '';
                                    }
                                    objTemp[arrCol[lT][0]] = tempValue;
                                }
                            }
                            results.push(objTemp);
                        }
                    }
                }
            }
            return {totalRecord: totalRecord, c: c};
        }

        const doSearchSql = (records, pageinfo, sql, params) => {
            let totalRecord = 0;
            let pagesize = 1000, pagestart = 0;
            if (!!pageinfo) {
                if (!!pageinfo.pagesize && !isNaN(pageinfo.pagesize)) {
                    pagesize = pageinfo.pagesize * 1;
                    if (pagesize > 1000 || pagesize <= 0) {
                        pagesize = 1000;
                    } else if (pagesize < 5) {
                        pagesize = 5;
                    }
                }
                if ((!!pageinfo.pagestart && !isNaN(pageinfo.pagestart)) || pageinfo.pagestart === 0) {
                    pagestart = pageinfo.pagestart * 1;
                    if (pagestart < 0) {
                        pagestart = 0;
                    }
                }
            }
            let r = query.runSuiteQLPaged({
                query: sql,
                params: params,
                pageSize: pagesize
            });
            let numPage = r.pageRanges.length;
            let pageend = numPage - 1;
            if (!!pageinfo) {
                if ((!!pageinfo.pageend && !isNaN(pageinfo.pageend)) || pageinfo.pageend === 0) {
                    pageend = pageinfo.pageend * 1;
                    if (pageend < pagestart) {
                        pageend = pagestart;
                    }
                    if (pageend >= numPage) {
                        pageend = numPage - 1;
                    }
                }
                if (pagestart >= numPage) {
                    pagestart = numPage - 1;
                }
            }

            let searchPage, tempData, numTemp, objT;
            if (pagestart >= 0) {
                for (let np = pagestart; np <= pageend; np++) {
                    searchPage = r.fetch({index: np});
                    tempData = searchPage.data.results;
                    if (!!tempData) {
                        numTemp = tempData.length;
                        for (let i = 0; i < numTemp; i++) {
                            objT = tempData[i].asMap();
                            records.push(objT);
                            totalRecord = totalRecord + 1;
                        }
                    }
                }
            }
            return totalRecord;
        }

        const splitComa = (strId, comma) => {
            let resSpl = strId;
            if (strId) {
                if (typeof (strId) === 'string') {
                    resSpl = strId.split(comma);
                } else if (!util.isArray(strId)) {
                    resSpl = [strId];
                }
            }
            return resSpl;
        }

        const isFieldDate = (fieldid) => {
            let isDate = false;
            let listfieldsdate = ['startdate', 'trandate', 'shipdate', 'duedate', 'effectivestartdate', 'effectiveenddate',
                'custrecord_scv_odoo_raw_doc_date_h', 'custrecord_scv_odoo_raw_date_completed_h', 'custrecord_scv_picktasklineitem_startdat', 'custrecord_scv_picktasklineitem_enddate',
                'custrecord_scv_opentask_actualbegindate', 'custrecord_scv_opentask_actualenddate', 'custrecord_scv_opentask_expirydate', 'custbody_scv_invoice_date',
                'custrecord_scv_ct_ngay_ct', 'custrecord_scv_fast_td_due_date_h', 'custrecord_scv_fast_td_ngay_hd_h', 'custrecord_scv_ctl_ngay_bat_dau', 'custrecord_scv_ctl_ngay_ket_thuc',
                'custrecord_scv_kpi_criteria_start_date', 'custrecord_scv_kpi_criteria_end_date', 'custrecordscv_exe_log_date', 'custrecord_scv_rp_finan_ondate', 'custrecord_scv_kpi_job_start_date',
                'custrecord_scv_kpi_job_end_date', 'custrecord_scv_itglog_start_date', 'custrecord_scv_itglog_end_date',
                'custrecord_scv_itglog_start_date_l', 'custrecord_scv_itglog_end_date_l'
            ];
            if (listfieldsdate.includes(fieldid) || fieldid.substring(0, 5) === 'date_') {
                isDate = true;
            }
            let key = fieldid;
            if (fieldid.substring(0, 5) === 'date_') {
                key = fieldid.substring(5);
            }
            return {isValid: isDate, key: key};
        }

        const isFieldTime = (fieldid) => {
            let isTime = false;
            let listfieldstime = ['starttime', 'custrecord_scv_btrxtask_created_date_l', 'custrecord_scv_btrxtask_deadline_l', 'custrecord_scv_btrxtask_closed_date_l', 'custrecord_scv_btrxtick_created_date',
                'custrecord_scv_btrxtick_process_slabegin', 'custrecord_scv_btrxtick_start_date', 'custrecord_scv_btrxtick_end_date', 'custrecord_scv_btrxtick_expcomptime'
            ];
            if (listfieldstime.includes(fieldid) || fieldid.substring(0, 5) === 'time_') {
                isTime = true;
            }
            let key = fieldid;
            if (fieldid.substring(0, 5) === 'time_') {
                key = fieldid.substring(5);
            }
            return {isValid: isTime, key: key};
        }

        const isFieldDateTime = (fieldid) => {
            let isTime = false;
            let listfieldsdatetime = ['createddate', 'lastmodifieddate', 'custrecord_scv_itglog_sync_time_l'];
            if (listfieldsdatetime.includes(fieldid) || fieldid.substring(0, 9) === 'datetime_') {
                isTime = true;
            }
            let key = fieldid;
            if (fieldid.substring(0, 9) === 'datetime_') {
                key = fieldid.substring(9);
            }
            return {isValid: isTime, key: key};
        }

        const isSubrecord = (fieldid) => {
            let isSubrecord = false;
            if (fieldid.substring(0, 10) === 'subrecord_' || fieldid === 'addressbookaddress' || fieldid === 'shippingaddress'
                || fieldid === 'billingaddress' || fieldid === 'inventorydetail') {
                isSubrecord = true;
            }
            let key = fieldid;
            if (fieldid.substring(0, 10) === 'subrecord_') {
                key = fieldid.substring(10);
            }
            return {isValid: isSubrecord, key: key};
        }

        const setFields = (rec, data) => {
            let fields = data.fields;
            let subRec, tempdate, value, text;
            let gmtSv = gmtServerReverse();
            for (let key in fields) {
                if (key !== undefined && key !== null && key !== '' && key !== 'internalid') {
                    tempdate = value = fields[key];
                    text = undefined;
                    if (!!value && !util.isArray(value) && typeof value === 'object' && !isSubrecord(key).isValid) {
                        tempdate = value.value;
                        text = value.text;
                        value = value.value;
                    }
                    if (value !== undefined || text !== undefined) {
                        if (!!text) {
                            rec.setText({fieldId: key, text: text});//, ignoreFieldChange: true
                            if (key === 'trandate') {
                                rec.setValue({fieldId: 'postingperiod', value: getPostingPeriod(text)});//, ignoreFieldChange: true
                            }
                        } else if (key.substring(0, 5) === 'text_') {
                            rec.setText({fieldId: key.substring(5), text: fields[key]});//, ignoreFieldChange: true
                        } else if (isFieldDate(key).isValid) {
                            if (typeof tempdate === 'number') {
                                tempdate = getDateGMT(tempdate, gmtSv);
                                rec.setValue({fieldId: isFieldDate(key).key, value: tempdate});//, ignoreFieldChange: true
                            } else {
                                rec.setText({fieldId: key, text: tempdate});
                            }
                            if (key === 'trandate') {
                                rec.setValue({
                                    fieldId: 'postingperiod',
                                    value: getPostingPeriod(typeof tempdate === 'string' ? tempdate : format.format({
                                        type: format.Type.DATE,
                                        value: tempdate
                                    }))
                                });//, ignoreFieldChange: true
                            }

                        } else if (isFieldTime(key).isValid) {
                            if (typeof tempdate === 'number') {
                                tempdate = getDateGMT(tempdate, gmtSv);
                                rec.setValue({fieldId: isFieldTime(key).key, value: tempdate});
                            } else {
                                rec.setText({fieldId: key, text: tempdate});
                            }

                        } else if (isFieldDateTime(key).isValid) {
                            if (typeof tempdate === 'number') {
                                tempdate = new Date(tempdate);
                                rec.setValue({fieldId: isFieldDateTime(key).key, value: tempdate});//, ignoreFieldChange: true
                            } else {
                                rec.setText({fieldId: key, text: tempdate});
                            }

                        } else if (isSubrecord(key).isValid) {
                            subRec = rec.getSubrecord({fieldId: isSubrecord(key).key});//log.error('test here', key);
                            setFields(subRec, fields[key]);
                            setCurrentSublistValue(subRec, fields[key]);
                        } else {
                            rec.setValue({fieldId: key, value: value});//, ignoreFieldChange: true
                        }
                    }
                }
            }
        }

        const getDateNow = () => {
            let now = new Date();
            let sdate = now.toString();
            let p1 = sdate.substring(28, 29);
            let p2 = sdate.substring(29, 31);
            let tcurr = 0;
            if (p1 === '-') {
                tcurr = tcurr + 1 * p2;
            } else {
                tcurr = tcurr - 1 * p2;
            }
            return new Date(now.getTime() + (tcurr * 3600000));
        }

        const getDateGMT = (time, gmt) => {
            let now = new Date(time);
            let sdate = now.toString();
            let p1 = sdate.substring(28, 29);
            let p2 = sdate.substring(29, 31);
            let tcurr = gmt;
            if (p1 === '-') {
                tcurr = tcurr + 1 * p2;
            } else {
                tcurr = tcurr - 1 * p2;
            }
            return new Date(now.getTime() + (tcurr * 3600000));
        }

        const setCurrentSublistValue = (rec, data) => {
            let sublists = data.sublists;
            let sb_data, lg_data, lindid, subRec, tempdate, value, text;
            let i = 0;
            if (sublists !== undefined && sublists !== null && sublists !== '') {
                let gmtSv = gmtServerReverse();
                for (let sb in sublists) {
                    sb_data = sublists[sb];
                    if (!sb_data) continue;

                    lg_data = sb_data.length;
                    i = 0;
                    lindid = 0;
                    for (let i = 0; i < lg_data; i++) {
                        rec.selectNewLine({sublistId: sb});
                        for (let k in sb_data[i]) {
                            if (k) {
                                tempdate = value = sb_data[i][k];
                                text = undefined;
                                if (!!value && !util.isArray(value) && typeof value === 'object' && !isSubrecord(k).isValid) {
                                    tempdate = value.value;
                                    text = value.text;
                                    value = value.value;
                                }
                                if (value !== undefined || text !== undefined) {
                                    if (!!text) {
                                        rec.setCurrentSublistText({sublistId: sb, fieldId: k, text: text});
                                    } else if (k.substring(0, 5) === 'text_') {
                                        rec.setCurrentSublistText({
                                            sublistId: sb,
                                            fieldId: k.substring(5),
                                            text: value
                                        });
                                    } else if (isFieldDate(k).isValid) {
                                        if (typeof tempdate === 'number') {
                                            tempdate = getDateGMT(tempdate, gmtSv);
                                            rec.setCurrentSublistValue({
                                                sublistId: sb,
                                                fieldId: isFieldDate(k).key,
                                                value: tempdate
                                            });
                                        } else {
                                            rec.setCurrentSublistText({sublistId: sb, fieldId: k, text: tempdate});
                                        }

                                    } else if (isFieldTime(k).isValid) {
                                        if (typeof tempdate === 'number') {
                                            tempdate = getDateGMT(tempdate, gmtSv);
                                            rec.setCurrentSublistValue({
                                                sublistId: sb,
                                                fieldId: isFieldTime(k).key,
                                                value: tempdate
                                            });
                                        } else {
                                            rec.setCurrentSublistText({sublistId: sb, fieldId: k, text: tempdate});
                                        }

                                    } else if (isFieldDateTime(k).isValid) {
                                        if (typeof tempdate === 'number') {
                                            tempdate = new Date(tempdate);
                                            rec.setCurrentSublistValue({
                                                sublistId: sb,
                                                fieldId: isFieldDateTime(k).key,
                                                value: tempdate
                                            });
                                        } else {
                                            rec.setCurrentSublistText({sublistId: sb, fieldId: k, text: tempdate});
                                        }

                                    } else if (isSubrecord(k).isValid) {
                                        subRec = rec.getCurrentSublistSubrecord({
                                            sublistId: sb,
                                            fieldId: isSubrecord(k).key
                                        });
                                        setFields(subRec, sb_data[i][k]);
                                        setCurrentSublistValue(subRec, sb_data[i][k]);
                                    } else {
                                        rec.setCurrentSublistValue({sublistId: sb, fieldId: k, value: value});
                                    }
                                }
                            }
                        }
                        rec.commitLine({sublistId: sb});
                        lindid++;
                    }
                }
            }
        }

        const getPostingPeriod = (datetext) => {
            let searchPeriod = search.create({
                type: search.Type.ACCOUNTING_PERIOD,
                filters: [['isquarter', 'is', false], 'and', ['isyear', 'is', false], 'and', ['isadjust', 'is', false]
                    , 'and', ['closed', 'is', false], 'and', ['startdate', 'onorbefore', datetext], 'and',
                    ['enddate', 'onorafter', datetext]],
                columns: ['internalid', 'periodname', 'enddate']
            });

            let resultsPeriod = searchPeriod.run().getRange({start: 0, end: 1000});
            let period = '';
            if (resultsPeriod.length > 0) {
                period = resultsPeriod[0].getValue('internalid');
            }
            return period;
        }

        const updateFields = (rec, data) => {
            let fields = data.fields;
            let subRec, tempdate, value, text;
            let gmtSv = gmtServerReverse();
            for (let key in fields) {
                if (key !== undefined && key !== null && key !== '' && key !== 'internalid') {
                    tempdate = value = fields[key];
                    text = undefined;
                    if (!!value && !util.isArray(value) && typeof value === 'object' && !isSubrecord(key).isValid) {
                        tempdate = value.value;
                        text = value.text;
                        value = value.value;
                    }
                    if (value !== undefined || text !== undefined) {
                        if (!!text) {
                            rec.setText({fieldId: key, text: text});//, ignoreFieldChange: true
                            if (key === 'trandate') {
                                rec.setValue({fieldId: 'postingperiod', value: getPostingPeriod(text)});//, ignoreFieldChange: true
                            }
                        } else if (key.substring(0, 5) === 'text_') {
                            rec.setText({fieldId: key.substring(5), text: value});//, ignoreFieldChange: true
                        } else if (isFieldDate(key).isValid) {
                            if (typeof tempdate === 'number') {
                                tempdate = getDateGMT(tempdate, gmtSv);
                                rec.setValue({fieldId: isFieldDate(key).key, value: tempdate});//, ignoreFieldChange: true
                            } else {
                                rec.setText({fieldId: isFieldDate(key).key, text: tempdate});//, ignoreFieldChange: true
                            }
                            if (key === 'trandate') {
                                rec.setValue({
                                    fieldId: 'postingperiod',
                                    value: getPostingPeriod(typeof tempdate === 'string' ? tempdate : format.format({
                                        type: format.Type.DATE,
                                        value: tempdate
                                    }))
                                });//, ignoreFieldChange: true
                            }
                        } else if (isFieldTime(key).isValid) {
                            if (typeof tempdate === 'number') {
                                tempdate = getDateGMT(tempdate, gmtSv);
                                rec.setValue({fieldId: isFieldTime(key).key, value: tempdate});//, ignoreFieldChange: true
                            } else {
                                rec.setText({fieldId: key, text: tempdate});
                            }

                        } else if (isFieldDateTime(key).isValid) {
                            if (typeof tempdate === 'number') {
                                tempdate = new Date(tempdate);
                                rec.setValue({fieldId: isFieldDateTime(key).key, value: tempdate});//, ignoreFieldChange: true
                            } else {
                                rec.setText({fieldId: key, text: tempdate});
                            }

                        } else if (isSubrecord(key).isValid) {
                            subRec = rec.getSubrecord({fieldId: isSubrecord(key).key});
                            updateFields(subRec, fields[key]);
                            updateCurrentSublistValue(subRec, fields[key]);
                        } else {
                            rec.setValue({fieldId: key, value: value});//, ignoreFieldChange: true
                        }
                    }
                }
            }
        }

        const getFields = (recTemp, objData, fieldsGet, fieldSubrecords, fieldSublistRecords) => {
            objData.fields = {};
            let fieldsNotInclude = ['nlloc', 'nlsub', 'nsapiFC', 'rectype_98_699_maxnkey', 'wfVF', 'externalid',
                '_eml_nkey_', 'type', 'nameorig', 'nsapiRC', 'customwhence', 'scriptid', 'nsapiVF', 'nsapiVD',
                'nsbrowserenv', 'id', 'nsapiVL', 'nsapiVI', 'wfPS', 'entryformquerystring', 'ownerid', 'version',
                '_multibtnstate_', 'name', 'wfPI', 'selectedtab', 'isinactive', 'linenumber', 'wfinstances', 'rectype',
                'nsapiLI', 'nsapiPS', 'nsapiCT', 'sys_id', 'nluser', 'nldept', 'nsapiPI', 'wfSR', 'nsapiLC', 'nsapiPD',
                'owner', 'nsapiSR', 'templatestored', 'whence', 'nlrole', 'baserecordtype', 'recordid', 'customform',
                'submitnext_y', 'wfFC', 'submitnext_t', 'actionType'
            ];
            let fields = fieldsGet || recTemp.getFields().filter(item => !fieldsNotInclude.includes(item));
            let lFs = fields.length, objT;
            let recSub, field, fieldid;
            let lFSR = fieldSubrecords.length;
            for (let i = 0; i < lFs; i++) {
                fieldid = field = fields[i];
                if (typeof field === 'object') {
                    fieldid = field.id;
                    if (field.type === 'select') {
                        objData.fields[fieldid] = {value: recTemp.getValue(fieldid), text: recTemp.getText(fieldid)};
                    } else if (field.type === 'text') {
                        objData.fields[fieldid] = recTemp.getText(fieldid);
                    } else {
                        objData.fields[fieldid] = recTemp.getValue(fieldid);
                    }
                } else {
                    if (isFieldDate(fieldid).isValid || isFieldDateTime(fieldid).isValid || isFieldTime(fieldid).isValid) {
                        objData.fields[fieldid] = recTemp.getText(fieldid);
                    } else {
                        objData.fields[fieldid] = recTemp.getValue(fieldid);
                    }
                }

                for (let s = 0; s < lFSR; s++) {
                    if (fieldSubrecords[s].fieldcheck === fields[i]) {
                        recSub = recTemp.getSubrecord(fieldSubrecords[s].fieldget);
                        objT = {};
                        getFields(recSub, objT, fieldSubrecords[s].fieldsGet, fieldSubrecords, fieldSublistRecords);
                        getSublistFields(recSub, objT, fieldSubrecords[s].sublistFieldsGet, fieldSubrecords, fieldSublistRecords);
                        objData.fields[fieldSubrecords[s].fieldget] = objT;
                    }
                }
            }

        }

        const getSublistFields = (recTemp, objData, sublistFieldsGet, fieldSubrecords, fieldSublistRecords) => {
            let fieldsNotInclude = ['sys_id', 'id', 'owner', 'iddisp', 'sys_parentid', 'recordischanged', 'version'];
            let sublistNotInclude = ['usernotes', 'systemnotes', 'mediaitem', 'activeworkflows', 'workflowhistory'];
            let sublists = sublistFieldsGet ? Object.keys(sublistFieldsGet) : recTemp.getSublists().filter(item => !sublistNotInclude.includes(item));
            let lSls = sublists.length, slFields, lSlFs, lcSl, objT, objT1, recSub, fieldid, field;
            objData.sublists = {};
            let lFSRs = fieldSublistRecords.length;
            for (let i = 0; i < lSls; i++) {
                objData.sublists[sublists[i]] = {};
                slFields = (sublistFieldsGet && sublistFieldsGet[sublists[i]]) ? sublistFieldsGet[sublists[i]] : recTemp.getSublistFields({sublistId: sublists[i]}).filter(item => !fieldsNotInclude.includes(item));
                lSlFs = slFields.length;
                lcSl = recTemp.getLineCount(sublists[i]);
                objData.sublists[sublists[i]] = [];
                for (let l = 0; l < lcSl; l++) {
                    objT = {}
                    for (let j = 0; j < lSlFs; j++) {
                        fieldid = field = slFields[j];
                        if (typeof field === 'object') {
                            fieldid = field.id;
                            if (field.type === 'select') {
                                objT[fieldid] = {
                                    value: recTemp.getSublistValue({
                                        sublistId: sublists[i],
                                        fieldId: fieldid,
                                        line: l
                                    }),
                                    text: recTemp.getSublistText({sublistId: sublists[i], fieldId: fieldid, line: l})
                                };
                            } else if (field.type === 'text') {
                                objT[fieldid] = recTemp.getSublistText({
                                    sublistId: sublists[i],
                                    fieldId: fieldid,
                                    line: l
                                });
                            } else {
                                objT[fieldid] = recTemp.getSublistValue({
                                    sublistId: sublists[i],
                                    fieldId: fieldid,
                                    line: l
                                });
                            }
                        } else {
                            if (isFieldDate(fieldid).isValid || isFieldDateTime(fieldid).isValid || isFieldTime(fieldid).isValid) {
                                objT[fieldid] = recTemp.getSublistText({
                                    sublistId: sublists[i],
                                    fieldId: fieldid,
                                    line: l
                                });
                            } else {
                                objT[fieldid] = recTemp.getSublistValue({
                                    sublistId: sublists[i],
                                    fieldId: fieldid,
                                    line: l
                                });
                            }
                        }
                        for (let s = 0; s < lFSRs; s++) {
                            if (fieldSublistRecords[s].fieldcheck === slFields[j] && (objT[slFields[j]] === true || objT[slFields[j]] === 'T')) {
                                try {
                                    recSub = recTemp.getSublistSubrecord({
                                        sublistId: sublists[i],
                                        fieldId: fieldSublistRecords[s].fieldget,
                                        line: l
                                    });
                                    objT1 = {};
                                    getFields(recSub, objT1, fieldSublistRecords[s].fieldsGet, fieldSubrecords, fieldSublistRecords);
                                    getSublistFields(recSub, objT1, fieldSublistRecords[s].sublistFieldsGet, fieldSubrecords, fieldSublistRecords);
                                    objT[fieldSublistRecords[s].fieldget] = objT1;
                                } catch (e) {
                                    log.error('exception getsublist record: ' + slFields[j], e);
                                }
                            }
                        }
                    }
                    objData.sublists[sublists[i]].push(objT);
                }

            }
        }

        const gmtServerReverse = () => {
            let ucf = getFieldsConfig('userpreferences');
            return libUtils.getObjGmtWithTz[ucf.TIMEZONE];
        }

        const updateCurrentSublistValue = (rec, data) => {
            let sublists = data.sublists;
            let sb_data;
            let lg_data;
            let i = 0, lindid, lcsb;
            let subRec, tempdate, value, text;
            if (sublists !== undefined && sublists !== null && sublists !== '') {
                let gmtSv = gmtServerReverse();
                for (let sb in sublists) {
                    sb_data = sublists[sb];
                    if (!sb_data) continue;

                    lg_data = sb_data.length;
                    i = 0;
                    lindid = 0;
                    lcsb = rec.getLineCount(sb);//log.error('lcsb > lg_data', `${lcsb} > ${lg_data}`);
                    if (lcsb > lg_data) {
                        for (let i = lg_data; i < lcsb; i++) {
                            rec.removeLine({sublistId: sb, line: lg_data});//log.error('remove', lg_data);
                        }
                    }
                    for (let i = 0; i < lg_data; i++) {
                        if (i >= lcsb) {
                            rec.selectNewLine({sublistId: sb});
                        } else {
                            rec.selectLine({sublistId: sb, line: i});
                        }
                        for (let k in sb_data[i]) {
                            if (k) {
                                tempdate = value = sb_data[i][k];
                                text = undefined;
                                if (!!value && !util.isArray(value) && typeof value === 'object' && !isSubrecord(k).isValid) {
                                    tempdate = value.value;
                                    text = value.text;
                                    value = value.value;
                                }
                                if (value !== undefined || text !== undefined) {
                                    if (!!text) {
                                        rec.setCurrentSublistText({sublistId: sb, fieldId: k, text: text});
                                    } else if (k.substring(0, 5) === 'text_') {
                                        rec.setCurrentSublistText({
                                            sublistId: sb,
                                            fieldId: k.substring(5),
                                            text: value
                                        });
                                    } else if (isFieldDate(k).isValid) {
                                        if (typeof tempdate === 'number') {
                                            tempdate = getDateGMT(tempdate, gmtSv);
                                            rec.setCurrentSublistValue({
                                                sublistId: sb,
                                                fieldId: isFieldDate(k).key,
                                                value: tempdate
                                            });
                                        } else {
                                            rec.setCurrentSublistText({sublistId: sb, fieldId: k, text: tempdate});
                                        }

                                    } else if (isFieldTime(k).isValid) {
                                        if (typeof tempdate === 'number') {
                                            tempdate = getDateGMT(tempdate, gmtSv);
                                            rec.setCurrentSublistValue({
                                                sublistId: sb,
                                                fieldId: isFieldTime(k).key,
                                                value: tempdate
                                            });
                                        } else {
                                            rec.setCurrentSublistText({sublistId: sb, fieldId: k, text: tempdate});
                                        }
                                    } else if (isFieldDateTime(k).isValid) {
                                        if (typeof tempdate === 'number') {
                                            tempdate = new Date(tempdate);
                                            rec.setCurrentSublistValue({
                                                sublistId: sb,
                                                fieldId: isFieldDateTime(k).key,
                                                value: tempdate
                                            });
                                        } else {
                                            rec.setCurrentSublistText({sublistId: sb, fieldId: k, text: tempdate});
                                        }

                                    } else if (isSubrecord(k).isValid) {
                                        subRec = rec.getCurrentSublistSubrecord({
                                            sublistId: sb,
                                            fieldId: isSubrecord(k).key
                                        });
                                        updateFields(subRec, sb_data[i][k]);
                                        updateCurrentSublistValue(subRec, sb_data[i][k]);
                                    } else {
                                        rec.setCurrentSublistValue({sublistId: sb, fieldId: k, value: value});
                                    }
                                }
                            }
                        }
                        rec.commitLine({sublistId: sb});
                        lindid++;
                    }

                }
            }
        }

        const handleBomRevision = (requestBody) => {
            let fields = requestBody.fields;
            let bomId = queryIdToCheckDuplidate(requestBody, 'bom');
            if (!bomId) {
                let source_system = fields.custrecord_scv_source_system;
                let fieldOfSourceSystem = search.lookupFields({
                    type: 'customrecord_scv_nguon_tich_hop',
                    id: source_system,
                    columns: ['custrecord_scv_itgsource_dft_subsidiary']
                });
                let bomFieldsValue = JSON.parse(JSON.stringify(fields));
                bomFieldsValue.availableforallassemblies = true;
                bomFieldsValue.availableforalllocations = true;
                bomFieldsValue.usedonassembly = true;
                bomFieldsValue.subsidiary = fieldOfSourceSystem.custrecord_scv_itgsource_dft_subsidiary[0].value;
                bomFieldsValue.externalid = bomFieldsValue.custrecord_scv_source_external_id;
                bomFieldsValue.custrecord_scv_source_external_id_bom = bomFieldsValue.custrecord_scv_source_external_id;
                bomFieldsValue.custrecord_scv_source_system_bom = source_system;

                let recBom = record.create({type: record.Type.BOM, isDynamic: true});
                setFields(recBom, {fields: bomFieldsValue});
                bomId = recBom.save({ignoreMandatoryFields: true});
            } else {
                let recBom = record.load({type: record.Type.BOM, id: bomId, isDynamic: true});
                updateFields(recBom, requestBody);
                recBom.save.promise({ignoreMandatoryFields: true});
            }
            let recAdd = record.create({type: record.Type.BOM_REVISION, isDynamic: true});
            fields.billofmaterials = bomId;
            fields.externalid = fields.custrecord_scv_source_external_id;

            requestBody.fields = fields;
            setFields(recAdd, requestBody);
            requestBody.sublists.component = getListNewComponent(requestBody);
            setCurrentSublistValue(recAdd, requestBody);
            return recAdd.save({ignoreMandatoryFields: true});
        }

        const getListNewComponent = (requestBody) => {
            let listComponent = requestBody.sublists.component;
            let listItemCode = listComponent.map(o => o.item_code);
            let listUnitNames = listComponent.map(o => o.units_display);
            let listItems = getListItem(listItemCode);
            let listUnits = getListUnits(listUnitNames);
            let listNewComponent = [];
            listComponent.map(objComponent => {
                let objItem = listItems.find(o => o.upccode === objComponent.item_code);
                if (!objItem) throw 'Không tìm thấy item có mã ' + objComponent.item_code;
                let objUnit = listUnits.find(o => o.unitname === objComponent.units_display && o.unitstype === objItem.unitstype);
                let objTemp = {
                    item: objItem.id,
                    description: objComponent.description,
                    bomquantity: objComponent.bomquantity,
                    units: objUnit?.internalid
                }
                listNewComponent.push(objTemp);
            });

            return listNewComponent;
        }

        let getListItem = (listItemCode) => {
            let questionMark = listItemCode.map(() => '?');
            let sql = `select it.id, it.upccode, it.unitstype, it.purchaseunit, it.stockunit, it.saleunit from item it where it.isinactive = 'F' and it.upccode in (${questionMark.join(',')})`;
            return query.runSuiteQL({query: sql, params: listItemCode}).asMappedResults();
        }

        let getListUnits = (listUnitNames) => {
            let questionMark = listUnitNames.map(() => '?');
            let sql = `select un.internalid, un.unitstype, un.conversionrate, un.unitname from unitstypeuom un where un.unitname in (${questionMark.join(',')})`;
            return query.runSuiteQL({query: sql, params: listUnitNames}).asMappedResults();
        }

        const handleUpdateBomRevision = (recEdit, requestBody) => {
            let bomId = recEdit.getValue('billofmaterials');
            let recBom = record.load({type: record.Type.BOM, id: bomId, isDynamic: true});
            setFields(recBom, requestBody.fields);
            recBom.save.promise({ignoreMandatoryFields: true});

            requestBody.sublists.component = getListNewComponent(requestBody);
            updateFields(recEdit, requestBody);
            updateCurrentSublistValue(recEdit, requestBody);
        }

        const addRecord = (requestBody, type) => {
            let id = queryIdToCheckDuplidate(requestBody, type);
            if (id) {
                let recEdit = record.load({type: type, id: id, isDynamic: true});
                if (type === record.Type.BOM_REVISION) {
                    handleUpdateBomRevision(recEdit, requestBody);
                } else {
                    updateFields(recEdit, requestBody);
                    updateCurrentSublistValue(recEdit, requestBody);
                }
                recEdit.save.promise({enableSourcing: true, ignoreMandatoryFields: true});
            } else {
                if (type === record.Type.SALES_ORDER) {
                    let recAdd = record.create({type: type, isDynamic: true});
                    handleSalesOrder(requestBody, recAdd);
                    id = recAdd.save({enableSourcing: true, ignoreMandatoryFields: true});
                    if (!requestBody.isnotenoughlot) {
                        transformRecordFromSalesOrder(type, id);
                    }
                } else if (type === record.Type.BOM_REVISION) {
                    id = handleBomRevision(requestBody);
                } else {
                    let recAdd = record.create({type: type, isDynamic: true});
                    makeDefaultData(requestBody, type, true);
                    setFields(recAdd, requestBody);
                    setCurrentSublistValue(recAdd, requestBody);
                    id = recAdd.save({enableSourcing: true, ignoreMandatoryFields: true});
                }
            }
            return id;
        }

        const updateRecord = (requestBody, type) => {
            let id = requestBody.internalid;
            if (!id) {
                id = queryIdToCheckDuplidate(requestBody, type);
            }
            let recEdit = record.load({type: type, id: id, isDynamic: true});
            if (type === record.Type.BOM_REVISION) {
                handleUpdateBomRevision(recEdit, requestBody);
            } else {
                makeDefaultData(requestBody, type, false);
                updateFields(recEdit, requestBody);
                updateCurrentSublistValue(recEdit, requestBody);
            }
            recEdit.save({enableSourcing: true, ignoreMandatoryFields: true});
            copyRecord(requestBody, type, id);

            return id;
        }

        const copyRecord = (requestBody, type, id) => {
            let fieldsCopy = {};
            let requestBodyCopy = {fields: fieldsCopy};
            makeDefaultDataCopy(requestBodyCopy, type);
            if (Object.keys(fieldsCopy).length > 0) {
                let recCopy = record.copy({type: type, id: id, isDynamic: true});
                recCopy.setValue({fieldId: 'externalid', value: ''});
                setFields(recCopy, requestBodyCopy);
                setCurrentSublistValue(recCopy, requestBody);
                recCopy.save.promise({enableSourcing: true, ignoreMandatoryFields: true});
            }
        }

        const submitRecord = (requestBody, type) => {
            let fields = requestBody.fields;
            let id = requestBody.internalid;
            if (!id) {
                id = queryIdToCheckDuplidate(requestBody, type);
            } else {
                deleteFieldExternalId(type, fields);
            }
            makeDefaultDataSubmit(requestBody, type);
            record.submitFields.promise({
                type: type,
                id: id,
                values: fields,
                options: {enableSourcing: true, ignoreMandatoryFields: true}
            });
            if (fields.isinactive === true) {
                let fieldsCopy = {};
                let requestBodyCopy = {fields: fieldsCopy};
                makeDefaultDataSubmit(requestBodyCopy, type, true);
                if (Object.keys(fieldsCopy).length > 0) {
                    let recCopy = record.copy({type: type, id: id, isDynamic: true});
                    recCopy.setValue({fieldId: 'externalid', value: ''});
                    recCopy.setValue({fieldId: 'isinactive', value: false});
                    setFields(recCopy, requestBodyCopy);
                    recCopy.save.promise({enableSourcing: true, ignoreMandatoryFields: true});
                }
            }
            return id;
        }

        const makeDefaultDataSubmit = (requestBody, type, isUpdateStatus) => {
            let fields = requestBody.fields;
            if (type === 'customrecord_scv_odoo_raw_data') {
                if (isUpdateStatus) {
                    fields.custrecord_scv_odoo_raw_action_h = Action.INACTIVE;
                }
                fields.custrecord_scv_odoo_raw_stage_status_h = DataStageStatus.CHANGED;
            } else if (type === 'customrecord_scv_sfc_raw_data') {
                if (isUpdateStatus) {
                    fields.custrecord_scv_sfc_raw_data_action = Action.INACTIVE;
                }
                fields.custrecord_scv_sfc_raw_data_stage_sts_h = DataStageStatus.CHANGED;
            }
        }

        const makeDefaultDataCopy = (requestBody, type) => {
            let fields = requestBody.fields;
            if (type === 'customrecord_scv_odoo_raw_data') {
                fields.custrecord_scv_odoo_raw_iscurrent_h = false;
                fields.custrecord_scv_odoo_raw_action_h = Action.UPDATE;
                fields.custrecord_scv_odoo_raw_stage_status_h = DataStageStatus.CHANGED;
            } else if (type === 'customrecord_scv_sfc_raw_data') {
                fields.custrecord_scv_sfc_raw_data_is_current = false;
                fields.custrecord_scv_sfc_raw_data_action = Action.UPDATE;
                fields.custrecord_scv_sfc_raw_data_stage_sts_h = DataStageStatus.CHANGED;
            } else if (type === 'customrecord_scv_fast_raw_data') {
                fields.custrecord_scv_fast_raw_data_is_current = false;
                fields.custrecord_scv_fast_raw_data_action = Action.UPDATE;
                fields.custrecord_scv_fast_raw_stage_status_h = DataStageStatus.CHANGED;
            }
        }

        const addRecordCustom = (requestBody, type) => {
            let recAdd = record.create({type: type, isDynamic: true});
            makeDefaultData(requestBody, type);
            setFields(recAdd, requestBody);
            setCurrentSublistValue(recAdd, requestBody);
            return recAdd.save({enableSourcing: true, ignoreMandatoryFields: true});
        }

        const updateRecordCustom = (requestBody, type) => {
            let id = requestBody.internalid;
            let recEdit = record.load({type: type, id: id, isDynamic: true});
            updateFields(recEdit, requestBody);
            updateCurrentSublistValue(recEdit, requestBody);
            recEdit.save.promise({enableSourcing: true, ignoreMandatoryFields: true});
        }

        const addOrUpdateRecord = (requestBody, type) => {
            let id = queryIdToCheckDuplidate(requestBody, type);
            let isUpdate = false;
            if (id) {
                let recEdit = record.load({type: type, id: id, isDynamic: true});
                if (type === record.Type.BOM_REVISION) {
                    handleUpdateBomRevision(recEdit, requestBody);
                } else {
                    updateFields(recEdit, requestBody);
                    updateCurrentSublistValue(recEdit, requestBody);
                }
                recEdit.save.promise({enableSourcing: true, ignoreMandatoryFields: true});
                isUpdate = true;
            } else {
                if (type === record.Type.SALES_ORDER) {
                    let recAdd = record.create({type: type, isDynamic: true});
                    handleSalesOrder(requestBody, recAdd);
                    id = recAdd.save({enableSourcing: true, ignoreMandatoryFields: true});
                    if (!requestBody.isnotenoughlot) {
                        transformRecordFromSalesOrder(type, id);
                    }
                } else if (type === record.Type.BOM_REVISION) {
                    id = handleBomRevision(requestBody);
                } else {
                    let recAdd = record.create({type: type, isDynamic: true});
                    makeDefaultData(requestBody, type, true);
                    setFields(recAdd, requestBody);
                    setCurrentSublistValue(recAdd, requestBody);
                    id = recAdd.save({enableSourcing: true, ignoreMandatoryFields: true});
                }
            }
            return {id, isUpdate};
        }

        const addOrUpdateRecordVersionCurrent = (requestBody, type) => {
            let id = queryIdToCheckDuplidate(requestBody, type);
            let isUpdate = false;
            if (id) {
                let recEdit = record.load({type: type, id: id, isDynamic: true});
                if (type === record.Type.BOM_REVISION) {
                    handleUpdateBomRevision(recEdit, requestBody);
                } else {
                    makeDefaultData(requestBody, type, false);
                    updateFields(recEdit, requestBody);
                    updateCurrentSublistValue(recEdit, requestBody);
                }
                recEdit.save({enableSourcing: true, ignoreMandatoryFields: true});
                copyRecord(requestBody, type, id);
                isUpdate = true;
            } else {
                if (type === record.Type.SALES_ORDER) {
                    let recAdd = record.create({type: type, isDynamic: true});
                    handleSalesOrder(requestBody, recAdd);
                    id = recAdd.save({enableSourcing: true, ignoreMandatoryFields: true});
                    if (!requestBody.isnotenoughlot) {
                        transformRecordFromSalesOrder(type, id);
                    }
                } else if (type === record.Type.BOM_REVISION) {
                    id = handleBomRevision(requestBody);
                } else {
                    let recAdd = record.create({type: type, isDynamic: true});
                    makeDefaultData(requestBody, type, true);
                    setFields(recAdd, requestBody);
                    setCurrentSublistValue(recAdd, requestBody);
                    id = recAdd.save({enableSourcing: true, ignoreMandatoryFields: true});
                }
            }
            return {id, isUpdate};
        }

        const addRecordCustomInvoice = (requestBody, type) => {
            let recAdd = record.create({type: type, isDynamic: true});
            makeDefaultData(requestBody, type);
            setFields(recAdd, requestBody);
            setCurrentSublistValueInvoice(recAdd, requestBody);
            return recAdd.save({enableSourcing: true, ignoreMandatoryFields: true});
        }

        const updateRecordCustomInvoice = (requestBody, type) => {
            let id = requestBody.internalid;
            let recEdit = record.load({type: type, id: id, isDynamic: true});
            updateFields(recEdit, requestBody);
            updateCurrentSublistValueInvoice(recEdit, requestBody);
            recEdit.save.promise({enableSourcing: true, ignoreMandatoryFields: true});
        }

        const setCurrentSublistValueInvoice = (recInvoice, data) => {
            let sublists = data.sublists;
            let sb_data, lg_data, subRec, tempdate, lineid;
            let i = 0;
            if (sublists !== undefined && sublists !== null && sublists !== '') {
                let gmtSv = gmtServerReverse();
                for (let sb in sublists) {
                    sb_data = sublists[sb];
                    if (!sb_data) continue;

                    lg_data = sb_data.length;
                    i = 0;
                    lineid = 0;
                    for (let i = 0; i < lg_data; i++) {
                        recInvoice.selectNewLine({sublistId: sb});
                        for (let k in sb_data[i]) {
                            if (k !== undefined && k !== null && k !== '' && k !== 'line_total') {
                                tempdate = sb_data[i][k];
                                let value = tempdate;
                                let text = undefined;
                                if (!!value && typeof value == 'object' && !isSubrecord(k).isValid) {
                                    tempdate = value.value;
                                    text = value.text;
                                    value = value.value;
                                }
                                if (value !== undefined || text !== undefined) {
                                    if (!!text) {
                                        recInvoice.setCurrentSublistText({sublistId: sb, fieldId: k, text: text});
                                    } else if (k.substring(0, 5) === 'text_') {
                                        recInvoice.setCurrentSublistText({
                                            sublistId: sb,
                                            fieldId: k.substring(5),
                                            text: value
                                        });
                                    } else if (isFieldDate(k).isValid) {
                                        if (typeof tempdate == 'number') {
                                            tempdate = getDateGMT(tempdate, gmtSv);
                                            recInvoice.setCurrentSublistValue({
                                                sublistId: sb,
                                                fieldId: isFieldDate(k).key,
                                                value: tempdate
                                            });
                                        } else {
                                            recInvoice.setCurrentSublistText({
                                                sublistId: sb,
                                                fieldId: k,
                                                text: tempdate
                                            });
                                        }
                                    } else if (isFieldTime(k).isValid) {
                                        if (typeof tempdate === 'number') {
                                            tempdate = getDateGMT(tempdate, gmtSv);
                                            recInvoice.setCurrentSublistValue({
                                                sublistId: sb,
                                                fieldId: isFieldTime(k).key,
                                                value: tempdate
                                            });
                                        } else {
                                            recInvoice.setCurrentSublistText({
                                                sublistId: sb,
                                                fieldId: k,
                                                text: tempdate
                                            });
                                        }
                                    } else if (isFieldDateTime(k).isValid) {
                                        if (typeof tempdate === 'number') {
                                            tempdate = new Date(tempdate);
                                            recInvoice.setCurrentSublistValue({
                                                sublistId: sb,
                                                fieldId: isFieldDateTime(k).key,
                                                value: tempdate
                                            });
                                        } else {
                                            recInvoice.setCurrentSublistText({
                                                sublistId: sb,
                                                fieldId: k,
                                                text: tempdate
                                            });
                                        }
                                    } else if (isSubrecord(k).isValid) {
                                        subRec = recInvoice.getCurrentSublistSubrecord({
                                            sublistId: sb,
                                            fieldId: isSubrecord(k).key
                                        });
                                        setFields(subRec, sb_data[i][k]);
                                        setCurrentSublistValue(subRec, sb_data[i][k]);
                                    } else {
                                        recInvoice.setCurrentSublistValue({sublistId: sb, fieldId: k, value: value});
                                    }
                                }
                            }
                        }

                        if (sb_data[i].rate || sb_data[i].rate === 0) {
                            recInvoice.setCurrentSublistValue({sublistId: sb, fieldId: 'price', value: -1});
                            recInvoice.setCurrentSublistValue({
                                sublistId: sb,
                                fieldId: 'rate',
                                value: sb_data[i].rate
                            });
                        }

                        setCurrentIsFreeGift(recInvoice, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_01, sb_data[i].custcol_scv_discount_amount_01, 'custcol_scv_line_promotion_01');
                        setCurrentIsFreeGift(recInvoice, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_02, sb_data[i].custcol_scv_discount_amount_02, 'custcol_scv_line_promotion_02');
                        setCurrentIsFreeGift(recInvoice, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_03, sb_data[i].custcol_scv_discount_amount_03, 'custcol_scv_line_promotion_03');

                        recInvoice.commitLine({sublistId: sb});
                        if (sb === 'item' && !(sb_data[i].custcol_scv_line_isfreegift === true || sb_data[i].custcol_scv_line_isfreegift === 'T')) {
                            if (addCurrentLineDiscount(recInvoice, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_01, sb_data[i].custcol_scv_discount_amount_01, lineid + 1, '01', sb_data[i].custcol_scv_gross_discount_amount_01)) {
                                lineid++;
                            }
                            if (addCurrentLineDiscount(recInvoice, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_02, sb_data[i].custcol_scv_discount_amount_02, lineid + 1, '02', sb_data[i].custcol_scv_gross_discount_amount_02)) {
                                lineid++;
                            }
                            if (addCurrentLineDiscount(recInvoice, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_03, sb_data[i].custcol_scv_discount_amount_03, lineid + 1, '03', sb_data[i].custcol_scv_gross_discount_amount_03)) {
                                lineid++;
                            }
                        }
                        lineid++;
                    }
                }
            }
        }

        const updateCurrentSublistValueInvoice = (recInvoice, data) => {
            let sublists = data.sublists;
            let sb_data;
            let lg_data;
            let i = 0, lineid, lcsb;
            let subRec, tempdate, value, text;
            if (sublists !== undefined && sublists !== null && sublists !== '') {
                let gmtSv = gmtServerReverse();
                for (let sb in sublists) {
                    sb_data = sublists[sb];
                    if (!sb_data) continue;

                    lg_data = sb_data.length;
                    i = 0;
                    lineid = 0;
                    lcsb = recInvoice.getLineCount(sb);
                    //Remove Line Discount
                    for (let i = lg_data; i < lcsb; i++) {
                        let itemtype = recInvoice.getSublistValue({sublistId: sb, fieldId: 'itemtype', line: i});
                        if (itemtype === 'Discount') {
                            recInvoice.removeLine({sublistId: sb, line: i});
                            i--;
                            lcsb--;
                        }
                    }
                    if (lcsb > lg_data) {
                        for (let i = lg_data; i < lcsb; i++) {
                            recInvoice.removeLine({sublistId: sb, line: lg_data});
                        }
                    }
                    for (let i = 0; i < lg_data; i++) {
                        if (i >= lcsb) {
                            recInvoice.selectNewLine({sublistId: sb});
                        } else {
                            recInvoice.selectLine({sublistId: sb, line: lineid});
                        }
                        for (let k in sb_data[i]) {
                            if (k) {
                                tempdate = value = sb_data[i][k];
                                text = undefined;
                                if (!!value && !util.isArray(value) && typeof value === 'object' && !isSubrecord(k).isValid) {
                                    tempdate = value.value;
                                    text = value.text;
                                    value = value.value;
                                }
                                if (value !== undefined || text !== undefined) {
                                    if (!!text) {
                                        recInvoice.setCurrentSublistText({sublistId: sb, fieldId: k, text: text});
                                    } else if (k.substring(0, 5) === 'text_') {
                                        recInvoice.setCurrentSublistText({
                                            sublistId: sb,
                                            fieldId: k.substring(5),
                                            text: value
                                        });
                                    } else if (isFieldDate(k).isValid) {
                                        if (typeof tempdate === 'number') {
                                            tempdate = getDateGMT(tempdate, gmtSv);
                                            recInvoice.setCurrentSublistValue({
                                                sublistId: sb,
                                                fieldId: isFieldDate(k).key,
                                                value: tempdate
                                            });
                                        } else {
                                            recInvoice.setCurrentSublistText({
                                                sublistId: sb,
                                                fieldId: k,
                                                text: tempdate
                                            });
                                        }

                                    } else if (isFieldTime(k).isValid) {
                                        if (typeof tempdate === 'number') {
                                            tempdate = getDateGMT(tempdate, gmtSv);
                                            recInvoice.setCurrentSublistValue({
                                                sublistId: sb,
                                                fieldId: isFieldTime(k).key,
                                                value: tempdate
                                            });
                                        } else {
                                            recInvoice.setCurrentSublistText({
                                                sublistId: sb,
                                                fieldId: k,
                                                text: tempdate
                                            });
                                        }
                                    } else if (isFieldDateTime(k).isValid) {
                                        if (typeof tempdate === 'number') {
                                            tempdate = new Date(tempdate);
                                            recInvoice.setCurrentSublistValue({
                                                sublistId: sb,
                                                fieldId: isFieldDateTime(k).key,
                                                value: tempdate
                                            });
                                        } else {
                                            recInvoice.setCurrentSublistText({
                                                sublistId: sb,
                                                fieldId: k,
                                                text: tempdate
                                            });
                                        }

                                    } else if (isSubrecord(k).isValid) {
                                        subRec = recInvoice.getCurrentSublistSubrecord({
                                            sublistId: sb,
                                            fieldId: isSubrecord(k).key
                                        });
                                        updateFields(subRec, sb_data[i][k]);
                                        updateCurrentSublistValue(subRec, sb_data[i][k]);
                                    } else {
                                        recInvoice.setCurrentSublistValue({sublistId: sb, fieldId: k, value: value});
                                    }
                                }
                            }
                        }

                        if (sb_data[i].rate || sb_data[i].rate === 0) {
                            recInvoice.setCurrentSublistValue({sublistId: sb, fieldId: 'price', value: -1});
                            recInvoice.setCurrentSublistValue({
                                sublistId: sb,
                                fieldId: 'rate',
                                value: sb_data[i].rate
                            });
                        }

                        setCurrentIsFreeGift(recInvoice, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_01, sb_data[i].custcol_scv_discount_amount_01, 'custcol_scv_line_promotion_01');
                        setCurrentIsFreeGift(recInvoice, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_02, sb_data[i].custcol_scv_discount_amount_02, 'custcol_scv_line_promotion_02');
                        setCurrentIsFreeGift(recInvoice, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_03, sb_data[i].custcol_scv_discount_amount_03, 'custcol_scv_line_promotion_03');

                        recInvoice.commitLine({sublistId: sb});
                        if (sb === 'item' && !(sb_data[i].custcol_scv_line_isfreegift === true || sb_data[i].custcol_scv_line_isfreegift === 'T')) {
                            if (addCurrentLineDiscount(recInvoice, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_01, sb_data[i].custcol_scv_discount_amount_01, lineid + 1, '01', sb_data[i].custcol_scv_gross_discount_amount_01)) {
                                lineid++;
                            }
                            if (addCurrentLineDiscount(recInvoice, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_02, sb_data[i].custcol_scv_discount_amount_02, lineid + 1, '02', sb_data[i].custcol_scv_gross_discount_amount_02)) {
                                lineid++;
                            }
                            if (addCurrentLineDiscount(recInvoice, sb, sb_data[i], sb_data[i].custcol_scv_promotion_rate_03, sb_data[i].custcol_scv_discount_amount_03, lineid + 1, '03', sb_data[i].custcol_scv_gross_discount_amount_03)) {
                                lineid++;
                            }
                        }
                        lineid++;
                    }
                }
            }
        }

        const deleteRecord = (type, id) => {
            record.delete({type: type, id: id});
        }

        const deleteRecordPromise = (type, id) => {
            record.delete.promise({type: type, id: id});
        }

        return {
            SystemParam,
            Sublist,
            pushFilter,
            pushFilterGroup,
            pushFilterListObject,
            getFieldsConfig,
            getColumnsFields,
            getColumnsFieldsSalesOrderLine,
            getColumnsFieldsCustomer,
            getColumnsFieldsLead,
            getColumnsFieldsMaster,
            getColumnsFieldsMasterCustom,
            getColumnsFieldsItem,
            queryIdToCheckDuplidate,
            queryIdToCheckDuplidateExternal,
            deleteFieldExternalId,
            makeDefaultData,
            assignBatch,
            transformRecordFromSalesOrder,
            handleSalesOrder,
            setCurrentSublistValueSalesOrder,
            setCurrentIsFreeGift,
            addSubToCustomer,
            makeSQLAndParams,
            makeSQLAndParamsUnitsType,
            makeSQLAndParamsUnits,
            makeSQLAndParamsClassifcation,
            makeSQLAndParamsLocation,
            transformTransaction,
            transformRecordFromReturnAuthorization,
            transformToReturnAuthorization,
            transformToItemReceipt,
            findItemReceiptFromItemFulfillment,
            buildAgainInventoryDetailReceiptUnit,
            buildAgainInventoryDetailFulfillUnit,
            assignInforRecordData,
            RecordTypeWithSavedSearch,
            searchCustomSearch,
            doSearch,
            doSearchSSOrgPage,
            doSearchSql,
            splitComa,
            isFieldDate,
            isFieldTime,
            isFieldDateTime,
            isSubrecord,
            setFields,
            getDateNow,
            getDateGMT,
            setCurrentSublistValue,
            getPostingPeriod,
            updateFields,
            getFields,
            getSublistFields,
            gmtServerReverse,
            updateCurrentSublistValue,
            handleBomRevision,
            getListNewComponent,
            getListItem,
            getListUnits,
            handleUpdateBomRevision,
            addRecord,
            updateRecord,
            submitRecord,
            addRecordCustom,
            updateRecordCustom,
            addOrUpdateRecord,
            addOrUpdateRecordVersionCurrent,
            addRecordCustomInvoice,
            updateRecordCustomInvoice,
            deleteRecord,
            deleteRecordPromise
        }

    });
