/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/format', 'N/search', 'N/ui/message', 'N/ui/serverWidget', 'N/url', '../lib/scv_lib_create_payment_request'],
    (format, search, message, serverWidget, url, libCreatePayr) => {

        const FIELD = {
            TYPE: 'custpage_type',
            SUBSIDIARY: 'custpage_subsidiary',
            FROM_DATE: 'custpage_from_date',
            TO_DATE: 'custpage_to_date',
            PAYR: 'custpage_payr',
            IS_SEARCH: 'custpage_is_search'
        };

        const SUBLIST = 'custpage_result';

        const onRequest = (scriptContext) => {
            try {
                if (scriptContext.request.method === 'POST') {
                    handlePost(scriptContext);
                    return;
                }
                const params = normalizeParams(scriptContext.request.parameters || {});
                scriptContext.response.writePage(createForm(params));
            } catch (e) {
                log.error('Create PayR Suitelet Error', {
                    message: e.message || e.toString(),
                    stack: e.stack,
                    parameters: scriptContext.request.parameters,
                    body: scriptContext.request.body
                });
                if (scriptContext.request.method === 'POST') {
                    scriptContext.response.setHeader({name: 'Content-Type', value: 'application/json'});
                    scriptContext.response.write(JSON.stringify({success: false, message: e.message || e.toString()}));
                    return;
                }
                const params = normalizeParams(scriptContext.request.parameters || {});
                params.isSearch = '';
                const form = createForm(params);
                form.addPageInitMessage({type: message.Type.ERROR, message: e.message || e.toString()});
                scriptContext.response.writePage(form);
            }
        }

        const handlePost = (scriptContext) => {
            const body = JSON.parse(scriptContext.request.body || '{}');
            const key = libCreatePayr.cachePaymentRequestData(normalizeParams(body.params || {}), body.lines || []);
            const payrUrl = url.resolveRecord({
                recordType: libCreatePayr.PAYR_RECORD,
                recordId: null,
                isEditMode: true,
                params: {
                    type_func: 'sl_accrual_payr',
                    cache_key: key
                }
            });
            scriptContext.response.setHeader({name: 'Content-Type', value: 'application/json'});
            scriptContext.response.write(JSON.stringify({success: true, url: payrUrl}));
        }

        const normalizeParams = (raw) => {
            return {
                type: raw[FIELD.TYPE] || raw.type || libCreatePayr.DEFAULTS.PAYMENT_TYPE,
                subsidiary: raw[FIELD.SUBSIDIARY] || raw.subsidiary || libCreatePayr.getCurrentUserSubsidiary(),
                fromDate: raw[FIELD.FROM_DATE] || raw.fromDate || getTodayDate(),
                toDate: raw[FIELD.TO_DATE] || raw.toDate || getTodayDate(),
                payr: raw[FIELD.PAYR] || raw.payr || '',
                isSearch: raw[FIELD.IS_SEARCH] || raw.isSearch || ''
            };
        }

        const getTodayDate = () => {
            return format.format({value: new Date(), type: format.Type.DATE});
        }

        const createForm = (params) => {
            const form = serverWidget.createForm({title: 'Create Payment Request'});
            form.clientScriptModulePath = '../cssl/scv_cs_sl_create_payment_request.js';

            form.addFieldGroup({id: 'custpage_filter_group', label: 'Filter'});
            addFilterFields(form, params);
            addButtons(form);
            addResultSublist(form, params);
            return form;
        }

        const addFilterFields = (form, params) => {
            const groupId = 'custpage_filter_group';
            const type = form.addField({
                id: FIELD.TYPE,
                type: serverWidget.FieldType.SELECT,
                label: 'Type',
                source: 'customrecordcustrecord_scv_payment_list',
                container: groupId
            });
            type.isMandatory = true;
            type.defaultValue = params.type;

            const subsidiary = addFilteredSelectField(form, {
                id: FIELD.SUBSIDIARY,
                label: 'Subsidiary',
                container: groupId,
                options: getSubsidiarySelectOptions(),
                defaultValue: params.subsidiary,
                mandatory: true
            });
            subsidiary.updateLayoutType({layoutType: serverWidget.FieldLayoutType.STARTROW});

            addDateField(form, FIELD.FROM_DATE, 'From Date', params.fromDate, groupId).isMandatory = true;
            addDateField(form, FIELD.TO_DATE, 'To Date', params.toDate, groupId).isMandatory = true;

            addFilteredSelectField(form, {
                id: FIELD.PAYR,
                label: 'PayR',
                container: groupId,
                options: getPaymentRequestSelectOptions(params),
                defaultValue: params.payr
            });

            const isSearch = form.addField({
                id: FIELD.IS_SEARCH,
                type: serverWidget.FieldType.TEXT,
                label: 'Is Search'
            });
            isSearch.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            isSearch.defaultValue = params.isSearch;
        }

        const addDateField = (form, id, label, value, groupId) => {
            const field = form.addField({id, type: serverWidget.FieldType.DATE, label, container: groupId});
            field.defaultValue = value;
            return field;
        }

        const addFilteredSelectField = (form, config) => {
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

        const getSubsidiarySelectOptions = () => {
            try {
                const nameColumn = search.createColumn({name: 'namenohierarchy', sort: search.Sort.ASC});
                return search.create({
                    type: 'subsidiary',
                    filters: [['isinactive', search.Operator.IS, 'F']],
                    columns: [nameColumn]
                }).run().getRange({start: 0, end: 1000}).map((r) => ({
                    value: r.id,
                    text: r.getValue(nameColumn) || r.id
                }));
            } catch (e) {
                log.error('Create PayR Get Subsidiary Options Error', e);
                return [];
            }
        }

        const getPaymentRequestSelectOptions = (params) => {
            if (!params.subsidiary) return [];
            try {
                const rows = libCreatePayr.getSearchResults(Object.assign({}, params, {payr: ''}));
                const optionById = {};
                rows.forEach((row) => {
                    if (!row.payr || optionById[row.payr]) return;
                    optionById[row.payr] = {value: row.payr, text: row.payrText || row.payr};
                });
                return Object.keys(optionById).map((id) => optionById[id]).sort((a, b) => a.text.localeCompare(b.text));
            } catch (e) {
                log.error('Create PayR Get PayR Options Error', e);
                return [];
            }
        }

        const addButtons = (form) => {
            form.addButton({id: 'custpage_search', label: 'Search', functionName: 'searchResult'});
            form.addButton({id: 'custpage_create_payr', label: 'Create PayR', functionName: 'createPaymentRequest'});
        }

        const addResultSublist = (form, params) => {
            const sublist = form.addSublist({
                id: SUBLIST,
                type: serverWidget.SublistType.LIST,
                label: 'Results'
            });
            addSublistFields(sublist);
            sublist.addMarkAllButtons();

            if (params.isSearch !== 'T') return;
            const rows = libCreatePayr.getSearchResults(params);
            rows.forEach((row, index) => setSublistLine(sublist, row, index));
        }

        const addSublistFields = (sublist) => {
            sublist.addField({id: 'custpage_select', type: serverWidget.FieldType.CHECKBOX, label: 'Mark'});
            sublist.addField({id: 'custpage_payr', type: serverWidget.FieldType.TEXT, label: 'PayR'});
            sublist.addField({id: 'custpage_subsidiary', type: serverWidget.FieldType.TEXT, label: 'Subsidiary'});
            sublist.addField({id: 'custpage_date', type: serverWidget.FieldType.DATE, label: 'Date'});
            sublist.addField({id: 'custpage_entity', type: serverWidget.FieldType.TEXT, label: 'Entity'});
            sublist.addField({id: 'custpage_item', type: serverWidget.FieldType.TEXT, label: 'Item'});
            sublist.addField({id: 'custpage_description', type: serverWidget.FieldType.TEXT, label: 'Description'});
            sublist.addField({id: 'custpage_amount', type: serverWidget.FieldType.FLOAT, label: 'Amount'});
            sublist.addField({id: 'custpage_taxrate', type: serverWidget.FieldType.PERCENT, label: 'Tax Rate'});
            sublist.addField({id: 'custpage_taxamount', type: serverWidget.FieldType.FLOAT, label: 'Tax Amount'});
            sublist.addField({id: 'custpage_grossamount', type: serverWidget.FieldType.FLOAT, label: 'Gross Amount'});
            sublist.addField({id: 'custpage_department', type: serverWidget.FieldType.TEXT, label: 'Department'});
            sublist.addField({id: 'custpage_expclass', type: serverWidget.FieldType.TEXT, label: 'Expense Class'});
            sublist.addField({id: 'custpage_invserial', type: serverWidget.FieldType.TEXT, label: 'Inv Serial'});
            sublist.addField({id: 'custpage_invnumber', type: serverWidget.FieldType.TEXT, label: 'Inv Number'});
            sublist.addField({id: 'custpage_invdate', type: serverWidget.FieldType.DATE, label: 'Inv Date'});
            sublist.addField({id: 'custpage_invtax', type: serverWidget.FieldType.TEXT, label: 'Inv Tax'});
            sublist.addField({id: 'custpage_invaddress', type: serverWidget.FieldType.TEXT, label: 'Inv Address'});
            sublist.addField({id: 'custpage_line_json', type: serverWidget.FieldType.TEXTAREA, label: 'Line Data'})
                .updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
        }

        const setSublistLine = (sublist, row, index) => {
            setLineValue(sublist, 'custpage_payr', index, row.payrText || row.payr);
            setLineValue(sublist, 'custpage_subsidiary', index, row.subsidiaryText || row.subsidiary);
            setLineValue(sublist, 'custpage_date', index, row.date);
            setLineValue(sublist, 'custpage_entity', index, row.entityText || row.entity);
            setLineValue(sublist, 'custpage_item', index, row.itemText || row.item);
            setLineValue(sublist, 'custpage_description', index, row.description);
            setLineValue(sublist, 'custpage_amount', index, row.amount);
            setLineValue(sublist, 'custpage_taxrate', index, row.taxRate);
            setLineValue(sublist, 'custpage_taxamount', index, row.taxAmount);
            setLineValue(sublist, 'custpage_grossamount', index, row.grossAmount);
            setLineValue(sublist, 'custpage_department', index, row.departmentText || row.department);
            setLineValue(sublist, 'custpage_expclass', index, row.expenseClassText || row.expenseClass);
            setLineValue(sublist, 'custpage_invserial', index, row.invoiceSerial);
            setLineValue(sublist, 'custpage_invnumber', index, row.invoiceNumber);
            setLineValue(sublist, 'custpage_invdate', index, row.invoiceDate);
            setLineValue(sublist, 'custpage_invtax', index, row.invoiceTax);
            setLineValue(sublist, 'custpage_invaddress', index, row.invoiceAddress);
            setLineValue(sublist, 'custpage_line_json', index, JSON.stringify(row));
        }

        const setLineValue = (sublist, id, line, value) => {
            if (value !== null && value !== undefined && value !== '') {
                sublist.setSublistValue({id, line, value: String(value)});
            }
        }

        return {onRequest};
    });
