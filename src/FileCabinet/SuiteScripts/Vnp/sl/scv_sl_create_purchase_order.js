/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/format', 'N/runtime', 'N/search', 'N/ui/message', 'N/ui/serverWidget', '../lib/scv_lib_create_purchase_order'],
    (format, runtime, search, message, serverWidget, libCreatePo) => {

        const FIELD = {
            CREATED_FROM: 'custpage_created_from',
            SUBSIDIARY: 'custpage_subsidiary',
            FROM_DATE: 'custpage_from_date',
            TO_DATE: 'custpage_to_date',
            ORDER_TYPE: 'custpage_order_type',
            PURCHASE_CONTRACT: 'custpage_purchase_contract',
            PURCHASE_REQUISITION: 'custpage_purchase_requisition',
            DATE: 'custpage_date',
            LOCATION: 'custpage_location',
            VENDOR: 'custpage_vendor',
            MEMO: 'custpage_memo',
            IS_SEARCH: 'custpage_is_search'
        };

        const SUBLIST = 'custpage_result';

        function onRequest(scriptContext) {
            try {
                if (scriptContext.request.method === 'POST') {
                    handlePost(scriptContext);
                    return;
                }
                const params = normalizeParams(scriptContext.request.parameters || {});
                const form = createForm(params);
                scriptContext.response.writePage(form);
            } catch (e) {
                log.error('Create PO Suitelet Error', {
                    message: e.message || e.toString(),
                    stack: e.stack,
                    name: e.name,
                    requestMethod: scriptContext.request.method,
                    parameters: scriptContext.request.parameters,
                    body: scriptContext.request.body
                });
                if (scriptContext.request.method === 'POST') {
                    scriptContext.response.setHeader({name: 'Content-Type', value: 'application/json'});
                    scriptContext.response.write(JSON.stringify({success: false, message: e.message || e.toString()}));
                    return;
                }
                const safeParams = normalizeParams(scriptContext.request.parameters || {});
                safeParams.isSearch = '';
                const form = createForm(safeParams);
                form.addPageInitMessage({type: message.Type.ERROR, message: e.message || e.toString()});
                scriptContext.response.writePage(form);
            }
        }

        function handlePost(scriptContext) {
            const body = JSON.parse(scriptContext.request.body || '{}');
            const poList = libCreatePo.createPurchaseOrders(normalizeParams(body.params || {}), body.lines || []);
            scriptContext.response.setHeader({name: 'Content-Type', value: 'application/json'});
            scriptContext.response.write(JSON.stringify({success: true, poList}));
        }

        function normalizeParams(raw) {
            return {
                createdFrom: raw[FIELD.CREATED_FROM] || raw.createdFrom || libCreatePo.CREATED_FROM.PR,
                subsidiary: raw[FIELD.SUBSIDIARY] || raw.subsidiary || getCurrentUserSubsidiary(),
                fromDate: raw[FIELD.FROM_DATE] || raw.fromDate || '',
                toDate: raw[FIELD.TO_DATE] || raw.toDate || '',
                orderType: raw[FIELD.ORDER_TYPE] || raw.orderType || '',
                purchaseContract: raw[FIELD.PURCHASE_CONTRACT] || raw.purchaseContract || '',
                purchaseRequisition: raw[FIELD.PURCHASE_REQUISITION] || raw.purchaseRequisition || '',
                date: raw[FIELD.DATE] || raw.date || getTodayDate(),
                location: raw[FIELD.LOCATION] || raw.location || '',
                vendor: raw[FIELD.VENDOR] || raw.vendor || '',
                memo: raw[FIELD.MEMO] || raw.memo || '',
                isSearch: raw[FIELD.IS_SEARCH] || raw.isSearch || ''
            };
        }

        function getTodayDate() {
            const now = new Date();
            const vietnamOffsetMinutes = 7 * 60;
            const vietnamNow = new Date(now.getTime() + vietnamOffsetMinutes * 60 * 1000);
            const year = vietnamNow.getUTCFullYear();
            const month = vietnamNow.getUTCMonth();
            const date = vietnamNow.getUTCDate();
            return format.format({
                value: new Date(Date.UTC(year, month, date, 12, 0, 0)),
                type: format.Type.DATE
            });
        }

        function getCurrentUserSubsidiary() {
            try {
                const currentUser = runtime.getCurrentUser();
                if (currentUser.subsidiary) {
                    log.error('Create PO Default Subsidiary From Runtime User', {
                        userId: currentUser.id,
                        subsidiary: currentUser.subsidiary
                    });
                    return currentUser.subsidiary;
                }
                const lkUser = search.lookupFields({
                    type: 'entity',
                    id: currentUser.id,
                    columns: ['subsidiary', 'cseg_scv_subsidiary']
                });
                const subsidiary = lkUser.subsidiary;
                if (subsidiary && subsidiary.length) {
                    log.error('Create PO Default Subsidiary From Employee', {
                        userId: currentUser.id,
                        subsidiary: subsidiary[0].value
                    });
                    return subsidiary[0].value;
                }
                const customSubsidiary = lkUser.cseg_scv_subsidiary;
                if (customSubsidiary && customSubsidiary.length) {
                    log.error('Create PO Default Subsidiary From Employee Custom Segment', {
                        userId: currentUser.id,
                        subsidiary: customSubsidiary[0].value
                    });
                    return customSubsidiary[0].value;
                }
            } catch (e) {
                log.error('Create PO Get Current User Subsidiary Error', e);
            }
            return '';
        }

        function createForm(params) {
            const form = serverWidget.createForm({title: 'Create Purchase Order'});
            form.clientScriptModulePath = '../cssl/scv_cs_sl_create_purchase_order.js';

            const filterGroup = 'custpage_filter_group';
            const defaultGroup = 'custpage_default_group';
            form.addFieldGroup({id: filterGroup, label: 'Filter'});
            form.addFieldGroup({id: defaultGroup, label: 'Default Value'});

            addFilterFields(form, params, filterGroup);
            addDefaultFields(form, params, defaultGroup);
            addButtons(form);
            addResultSublist(form, params);
            return form;
        }

        function addFilterFields(form, params, groupId) {
            const subsidiary = addFilteredSelectField(form, {
                id: FIELD.SUBSIDIARY,
                label: 'Subsidiary',
                container: groupId,
                options: getSubsidiarySelectOptions(),
                defaultValue: params.subsidiary,
                mandatory: true
            });

            const createdFrom = form.addField({
                id: FIELD.CREATED_FROM,
                type: serverWidget.FieldType.SELECT,
                label: 'Created From',
                container: groupId
            });
            createdFrom.isMandatory = true;
            createdFrom.addSelectOption({value: libCreatePo.CREATED_FROM.PR, text: 'Purchase Requisition'});
            createdFrom.addSelectOption({value: libCreatePo.CREATED_FROM.PC, text: 'Purchase Contract'});
            createdFrom.defaultValue = params.createdFrom;

            addDateField(form, FIELD.FROM_DATE, 'From Date', params.fromDate, groupId).updateLayoutType({layoutType: serverWidget.FieldLayoutType.STARTROW});
            addDateField(form, FIELD.TO_DATE, 'To Date', params.toDate, groupId).updateLayoutType({layoutType: serverWidget.FieldLayoutType.ENDROW});

            const orderType = form.addField({
                id: FIELD.ORDER_TYPE,
                type: serverWidget.FieldType.SELECT,
                label: 'Order Type',
                source: 'customrecord_scv_order_type',
                container: groupId
            });
            orderType.defaultValue = params.orderType;

            const purchaseContract = addFilteredSelectField(form, {
                id: FIELD.PURCHASE_CONTRACT,
                label: 'Purchase Contract',
                container: groupId,
                options: getTransactionSelectOptions(libCreatePo.CREATED_FROM.PC, params.subsidiary),
                defaultValue: params.purchaseContract
            });

            const purchaseRequisition = addFilteredSelectField(form, {
                id: FIELD.PURCHASE_REQUISITION,
                label: 'Purchase Requisition',
                container: groupId,
                options: getTransactionSelectOptions(libCreatePo.CREATED_FROM.PR, params.subsidiary),
                defaultValue: params.purchaseRequisition
            });

            const isSearch = form.addField({
                id: FIELD.IS_SEARCH,
                type: serverWidget.FieldType.TEXT,
                label: 'Is Search'
            });
            isSearch.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            isSearch.defaultValue = params.isSearch;
        }

        function addDefaultFields(form, params, groupId) {
            const date = addDateField(form, FIELD.DATE, 'Date', params.date, groupId);

            const location = addFilteredSelectField(form, {
                id: FIELD.LOCATION,
                label: 'Location',
                container: groupId,
                options: getEntitySelectOptions('location', params.subsidiary, 'name'),
                defaultValue: params.location,
                mandatory: true
            });

            const vendor = addFilteredSelectField(form, {
                id: FIELD.VENDOR,
                label: 'Vendor',
                container: groupId,
                options: getEntitySelectOptions('vendor', params.subsidiary, 'entityid'),
                defaultValue: params.vendor,
                mandatory: true
            });

            const memo = form.addField({
                id: FIELD.MEMO,
                type: serverWidget.FieldType.TEXT,
                label: 'Memo',
                container: groupId
            });
            memo.defaultValue = params.memo;
        }

        function addDateField(form, id, label, value, groupId) {
            const field = form.addField({id, type: serverWidget.FieldType.DATE, label, container: groupId});
            field.defaultValue = value;
            return field;
        }

        function addFilteredSelectField(form, config) {
            const field = form.addField({
                id: config.id,
                type: serverWidget.FieldType.SELECT,
                label: config.label,
                container: config.container
            });
            field.addSelectOption({value: '', text: ''});
            config.options.forEach((option) => {
                field.addSelectOption({value: option.value, text: option.text});
            });
            field.defaultValue = config.defaultValue || '';
            if (config.mandatory) field.isMandatory = true;
            return field;
        }

        function getSubsidiarySelectOptions() {
            try {
                const nameColumn = search.createColumn({name: 'namenohierarchy', sort: search.Sort.ASC});
                const results = search.create({
                    type: 'subsidiary',
                    filters: [['isinactive', search.Operator.IS, 'F']],
                    columns: [nameColumn]
                }).run().getRange({start: 0, end: 1000});
                return results.map((r) => ({value: r.id, text: r.getValue(nameColumn) || r.id}));
            } catch (e) {
                log.error('Create PO Get Subsidiary Select Options Error', e);
                return [];
            }
        }

        function getEntitySelectOptions(recordType, subsidiary, textColumn) {
            if (!subsidiary) return [];
            try {
                const filters = [
                    ['subsidiary', search.Operator.ANYOF, subsidiary],
                    'AND',
                    ['isinactive', search.Operator.IS, 'F']
                ];
                const results = search.create({type: recordType, filters, columns: [textColumn]})
                    .run().getRange({start: 0, end: 1000});
                return results.map((r) => ({value: r.id, text: r.getValue({name: textColumn}) || r.id}));
            } catch (e) {
                log.error('Create PO Get Entity Select Options Error', {recordType, subsidiary, error: e});
                return [];
            }
        }

        function getTransactionSelectOptions(createdFrom, subsidiary) {
            if (!subsidiary) return [];
            try {
                const rows = libCreatePo.getSearchResults({
                    createdFrom,
                    subsidiary,
                    purchaseContract: '',
                    purchaseRequisition: ''
                });
                const optionById = {};
                rows.forEach((row) => {
                    if (!row.sourceRecordId || optionById[row.sourceRecordId]) return;
                    optionById[row.sourceRecordId] = {
                        value: row.sourceRecordId,
                        text: row.documentNumber || row.sourceRecordId
                    };
                });
                return Object.keys(optionById)
                    .map((id) => optionById[id])
                    .sort((a, b) => a.text.localeCompare(b.text));
            } catch (e) {
                log.error('Create PO Get Transaction Select Options From Result Error', {createdFrom, subsidiary, error: e});
                return getTransactionSelectOptionsFallback(createdFrom, subsidiary);
            }
        }

        function getTransactionSelectOptionsFallback(createdFrom, subsidiary) {
            try {
                const recordType = createdFrom === libCreatePo.CREATED_FROM.PC
                    ? libCreatePo.RECORD_TYPE.PC
                    : libCreatePo.RECORD_TYPE.PR;
                const filters = [
                    ['subsidiary', search.Operator.ANYOF, subsidiary],
                    'AND',
                    ['mainline', search.Operator.IS, 'T']
                ];
                const results = search.create({type: recordType, filters, columns: ['tranid']})
                    .run().getRange({start: 0, end: 1000});
                return results.map((r) => ({value: r.id, text: r.getValue({name: 'tranid'}) || r.id}));
            } catch (e) {
                log.error('Create PO Get Transaction Select Options Error', {createdFrom, subsidiary, error: e});
                return [];
            }
        }

        function addButtons(form) {
            form.addButton({id: 'custpage_search', label: 'Search', functionName: 'searchResult'});
            form.addButton({id: 'custpage_create_po', label: 'Create PO', functionName: 'createPurchaseOrder'});
        }

        function addResultSublist(form, params) {
            const sublist = form.addSublist({
                id: SUBLIST,
                type: serverWidget.SublistType.LIST,
                label: 'Result'
            });
            addSublistFields(sublist, params.createdFrom);
            sublist.addMarkAllButtons();

            if (params.isSearch !== 'T') return;
            const rows = libCreatePo.getSearchResults(params);
            log.error('Create PO Final Render Rows', {createdFrom: params.createdFrom, count: rows.length, rows: rows.slice(0, 20)});
            if (params.createdFrom === libCreatePo.CREATED_FROM.PC) {
                log.error('Create PO Final Render Rows PC', {count: rows.length, rows: rows.slice(0, 50)});
            }
            rows.forEach((row, index) => {
                try {
                    setSublistLine(sublist, row, index, params.createdFrom);
                } catch (e) {
                    log.error('Create PO Debug Row Render Failed', {
                        index,
                        row,
                        message: e.message || e.toString(),
                        name: e.name
                    });
                    throw e;
                }
            });
        }

        function addSublistFields(sublist, createdFrom) {
            sublist.addField({id: 'custpage_select', type: serverWidget.FieldType.CHECKBOX, label: 'Create PO'});
            sublist.addField({id: 'custpage_doc', type: serverWidget.FieldType.URL, label: 'View'}).linkText = 'View';
            sublist.addField({id: 'custpage_doc_text', type: serverWidget.FieldType.TEXT, label: 'Document Number'});
            sublist.addField({id: 'custpage_item_text', type: serverWidget.FieldType.TEXT, label: 'Item'});
            sublist.addField({id: 'custpage_description', type: serverWidget.FieldType.TEXT, label: 'Description'});
            sublist.addField({id: 'custpage_unit_text', type: serverWidget.FieldType.TEXT, label: 'Units'});
            sublist.addField({id: 'custpage_remaining', type: serverWidget.FieldType.FLOAT, label: 'Remaining Quantity'});
            addEditableSublistField(sublist, 'custpage_quantity', serverWidget.FieldType.FLOAT, 'Quantity');
            addEditableSublistField(sublist, 'custpage_rate', serverWidget.FieldType.FLOAT, 'Rate');
            addEditableSublistField(sublist, 'custpage_taxcode', serverWidget.FieldType.SELECT, 'Tax Code', 'salestaxitem');
            addEditableSublistField(sublist, 'custpage_taxrate', serverWidget.FieldType.PERCENT, 'Tax Rate');
            addEditableSublistField(sublist, 'custpage_amount', serverWidget.FieldType.FLOAT, 'Amount');
            addEditableSublistField(sublist, 'custpage_taxamount', serverWidget.FieldType.FLOAT, 'Tax Amount');
            addEditableSublistField(sublist, 'custpage_grossamount', serverWidget.FieldType.FLOAT, 'Gross Amount');
            if (createdFrom === libCreatePo.CREATED_FROM.PR) {
                addEditableSublistField(sublist, 'custpage_expecteddate', serverWidget.FieldType.DATE, 'Expected Receipt Date');
            }
            sublist.addField({id: 'custpage_ordertype_text', type: serverWidget.FieldType.TEXT, label: 'Order Type'});
            sublist.addField({id: 'custpage_department_text', type: serverWidget.FieldType.TEXT, label: 'Department'});
            if (createdFrom === libCreatePo.CREATED_FROM.PR) {
                sublist.addField({id: 'custpage_respdepartment_text', type: serverWidget.FieldType.TEXT, label: 'Phòng/Bộ phận phụ trách'});
            }
            sublist.addField({id: 'custpage_line_json', type: serverWidget.FieldType.TEXTAREA, label: 'Line Data'})
                .updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
        }

        function addEditableSublistField(sublist, id, type, label, source) {
            const field = sublist.addField({id, type, label, source});
            field.updateDisplayType({displayType: serverWidget.FieldDisplayType.ENTRY});
            return field;
        }

        function setSublistLine(sublist, row, index, createdFrom) {
            setLineValue(sublist, 'custpage_doc', index, row.documentUrl);
            setLineValue(sublist, 'custpage_doc_text', index, row.documentNumber);
            setLineValue(sublist, 'custpage_item_text', index, row.itemText || row.item);
            setLineValue(sublist, 'custpage_description', index, row.description);
            setLineValue(sublist, 'custpage_unit_text', index, row.unitText || row.unit);
            setLineValue(sublist, 'custpage_remaining', index, row.qtyRemaining);
            setLineValue(sublist, 'custpage_quantity', index, row.quantity);
            setLineValue(sublist, 'custpage_rate', index, row.rate);
            setLineValue(sublist, 'custpage_taxcode', index, row.taxCode);
            setLineValue(sublist, 'custpage_taxrate', index, row.taxRate);
            setLineValue(sublist, 'custpage_amount', index, row.amount);
            setLineValue(sublist, 'custpage_taxamount', index, row.taxAmount);
            setLineValue(sublist, 'custpage_grossamount', index, row.grossAmount);
            if (createdFrom === libCreatePo.CREATED_FROM.PR) {
                setLineValue(sublist, 'custpage_expecteddate', index, row.expectedReceiptDate);
                setLineValue(sublist, 'custpage_respdepartment_text', index, row.responsibleDepartmentText);
            }
            setLineValue(sublist, 'custpage_ordertype_text', index, row.orderTypeText);
            setLineValue(sublist, 'custpage_department_text', index, row.departmentText);
            setLineValue(sublist, 'custpage_line_json', index, JSON.stringify(row));
        }

        function setLineValue(sublist, id, line, value) {
            if (value !== null && value !== undefined && value !== '') {
                try {
                    sublist.setSublistValue({id, line, value: String(value)});
                } catch (e) {
                    throw Error('Field ' + id + ' value "' + value + '" line ' + line + ': ' + (e.message || e.toString()));
                }
            }
        }

        return {onRequest};
    });
