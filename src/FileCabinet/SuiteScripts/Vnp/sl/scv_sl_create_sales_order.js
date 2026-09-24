/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/format', 'N/runtime', 'N/search', 'N/ui/message', 'N/ui/serverWidget', '../lib/scv_lib_create_sales_order'],
    (format, runtime, search, message, serverWidget, libCreateSo) => {

        const FIELD = {
            CREATED_FROM: 'custpage_created_from',
            SUBSIDIARY: 'custpage_subsidiary',
            LOCATION_FILTER: 'custpage_location_filter',
            CUSTOMER_FILTER: 'custpage_customer_filter',
            SALES_CONTRACT: 'custpage_sales_contract',
            ITEM_FILTER: 'custpage_item_filter',
            FROM_DATE: 'custpage_from_date',
            TO_DATE: 'custpage_to_date',
            DATE: 'custpage_date',
            ORDER_TIME: 'custpage_order_time',
            LOCATION: 'custpage_location',
            CUSTOMER: 'custpage_customer',
            CURRENCY: 'custpage_currency',
            MEMO: 'custpage_memo',
            TOTAL_AMOUNT: 'custpage_total_amount',
            TOTAL_TAX_AMOUNT: 'custpage_total_tax_amount',
            TOTAL_GROSS_AMOUNT: 'custpage_total_gross_amount',
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
                log.error('Create SO Suitelet Error', {
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
            log.error('body.lines', body.lines)
            const soList = libCreateSo.createSalesOrders(normalizeParams(body.params || {}), body.lines || []);
            scriptContext.response.setHeader({name: 'Content-Type', value: 'application/json'});
            scriptContext.response.write(JSON.stringify({success: true, soList}));
        }

        function normalizeParams(raw) {
            return {
                createdFrom: raw[FIELD.CREATED_FROM] || raw.createdFrom || libCreateSo.CREATED_FROM.SC,
                subsidiary: raw[FIELD.SUBSIDIARY] || raw.subsidiary || getCurrentUserSubsidiary(),
                locationFilter: raw[FIELD.LOCATION_FILTER] || raw.locationFilter || '',
                customerFilter: raw[FIELD.CUSTOMER_FILTER] || raw.customerFilter || '',
                salesContract: raw[FIELD.SALES_CONTRACT] || raw.salesContract || '',
                item: splitMulti(raw[FIELD.ITEM_FILTER] || raw.item),
                fromDate: raw[FIELD.FROM_DATE] || raw.fromDate || '',
                toDate: raw[FIELD.TO_DATE] || raw.toDate || '',
                date: raw[FIELD.DATE] || raw.date || libCreateSo.getTodayDate(),
                orderTime: normalizeOrderTime(raw[FIELD.ORDER_TIME] || raw.orderTime || libCreateSo.getNowDateTime()),
                location: raw[FIELD.LOCATION] || raw.location || '',
                customer: raw[FIELD.CUSTOMER] || raw.customer || '',
                currency: raw[FIELD.CURRENCY] || raw.currency || '',
                memo: raw[FIELD.MEMO] || raw.memo || '',
                isSearch: raw[FIELD.IS_SEARCH] || raw.isSearch || ''
            };
        }

        function splitMulti(value) {
            if (!value) return [];
            if (Array.isArray(value)) return value.filter(Boolean);
            return value.toString().split(',').filter(Boolean);
        }

        function normalizeOrderTime(value) {
            if (!value) return '';
            if (value instanceof Date) return formatDateTime(value);
            const text = String(value);
            const timestamp = Date.parse(text);
            if (!isNaN(timestamp)) return formatDateTime(new Date(timestamp));
            return text;
        }

        function formatDateTime(value) {
            return format.format({
                value,
                type: format.Type.DATETIMETZ || format.Type.DATETIME
            });
        }

        function getCurrentUserSubsidiary() {
            try {
                const currentUser = runtime.getCurrentUser();
                if (currentUser.subsidiary) return currentUser.subsidiary;
                const lkUser = search.lookupFields({
                    type: 'entity',
                    id: currentUser.id,
                    columns: ['subsidiary', 'cseg_scv_subsidiary']
                });
                const subsidiary = lkUser.subsidiary;
                if (subsidiary && subsidiary.length) return subsidiary[0].value;
                const customSubsidiary = lkUser.cseg_scv_subsidiary;
                if (customSubsidiary && customSubsidiary.length) return customSubsidiary[0].value;
            } catch (e) {
                log.error('Create SO Get Current User Subsidiary Error', e);
            }
            return '';
        }

        function createForm(params) {
            const form = serverWidget.createForm({title: 'Create Sales Order'});
            form.clientScriptModulePath = '../cssl/scv_cs_sl_create_sales_order.js';

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
            addFilteredSelectField(form, {
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
            createdFrom.addSelectOption({value: libCreateSo.CREATED_FROM.SC, text: 'Hợp đồng'});
            createdFrom.addSelectOption({value: libCreateSo.CREATED_FROM.WR, text: 'Phiếu nhập kho'});
            createdFrom.defaultValue = params.createdFrom;

            // Location filter: FDD "Ẩn field với trường hợp Created From = Hợp đồng" -
            // only relevant to the pending Phiếu nhập kho (WR) case; hidden client-side for SC.
            addFilteredSelectField(form, {
                id: FIELD.LOCATION_FILTER,
                label: 'Location',
                container: groupId,
                options: getEntitySelectOptions('location', params.subsidiary, 'name'),
                defaultValue: params.locationFilter
            });

            addFilteredSelectField(form, {
                id: FIELD.CUSTOMER_FILTER,
                label: 'Customer',
                container: groupId,
                options: getEntitySelectOptions('customer', params.subsidiary, 'entityid'),
                defaultValue: params.customerFilter
            });

            addFilteredSelectField(form, {
                id: FIELD.SALES_CONTRACT,
                label: 'Sales Contract',
                container: groupId,
                options: getSalesContractSelectOptions(params),
                defaultValue: params.salesContract
            });

            addFilteredMultiSelectField(form, {
                id: FIELD.ITEM_FILTER,
                label: 'Item',
                container: groupId,
                source: 'item',
                defaultValue: params.item
            });

            // From/To Date: only used to filter Phiếu nhập kho (WR) results per FDD - hidden for SC.
            addDateField(form, FIELD.FROM_DATE, 'From Date', params.fromDate, groupId).updateLayoutType({layoutType: serverWidget.FieldLayoutType.STARTROW});
            addDateField(form, FIELD.TO_DATE, 'To Date', params.toDate, groupId).updateLayoutType({layoutType: serverWidget.FieldLayoutType.ENDROW});

            const isSearch = form.addField({
                id: FIELD.IS_SEARCH,
                type: serverWidget.FieldType.TEXT,
                label: 'Is Search'
            });
            isSearch.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            isSearch.defaultValue = params.isSearch;
        }

        function addDefaultFields(form, params, groupId) {
            addDateField(form, FIELD.DATE, 'Date', params.date, groupId);

            const orderTime = form.addField({
                id: FIELD.ORDER_TIME,
                type: serverWidget.FieldType.DATETIMETZ,
                label: 'Thời gian đặt hàng',
                container: groupId
            });
            orderTime.defaultValue = params.orderTime;

            addFilteredSelectField(form, {
                id: FIELD.LOCATION,
                label: 'Location',
                container: groupId,
                options: getEntitySelectOptions('location', params.subsidiary, 'name'),
                defaultValue: params.location || params.locationFilter,
                mandatory: true
            });

            addFilteredSelectField(form, {
                id: FIELD.CUSTOMER,
                label: 'Customer',
                container: groupId,
                options: getEntitySelectOptions('customer', params.subsidiary, 'entityid'),
                defaultValue: params.customer || params.customerFilter,
                mandatory: true
            });

            addFilteredSelectField(form, {
                id: FIELD.CURRENCY,
                label: 'Currency',
                container: groupId,
                options: getCurrencySelectOptions(),
                defaultValue: params.currency,
                mandatory: true
            });

            const memo = form.addField({
                id: FIELD.MEMO,
                type: serverWidget.FieldType.TEXT,
                label: 'Memo',
                container: groupId
            });
            memo.defaultValue = params.memo;

            addInlineCurrencyField(form, FIELD.TOTAL_AMOUNT, 'Total Amount', groupId);
            addInlineCurrencyField(form, FIELD.TOTAL_TAX_AMOUNT, 'Total Tax Amount', groupId);
            addInlineCurrencyField(form, FIELD.TOTAL_GROSS_AMOUNT, 'Total Gross Amount', groupId);
        }

        function addInlineCurrencyField(form, id, label, groupId) {
            const field = form.addField({id, type: serverWidget.FieldType.CURRENCY, label, container: groupId});
            field.updateDisplayType({displayType: serverWidget.FieldDisplayType.INLINE});
            return field;
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

        function addFilteredMultiSelectField(form, config) {
            const fieldConfig = {
                id: config.id,
                type: serverWidget.FieldType.MULTISELECT,
                label: config.label,
                container: config.container
            };
            if (config.source) fieldConfig.source = config.source;
            const field = form.addField(fieldConfig);
            (config.options || []).forEach((option) => {
                field.addSelectOption({value: option.value, text: option.text});
            });
            const defaultValue = Array.isArray(config.defaultValue) ? config.defaultValue.join(',') : (config.defaultValue || '');
            field.defaultValue = defaultValue;
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
                log.error('Create SO Get Subsidiary Select Options Error', e);
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
                log.error('Create SO Get Entity Select Options Error', {recordType, subsidiary, error: e});
                return [];
            }
        }

        function getItemSelectOptions() {
            try {
                const results = search.create({
                    type: 'item',
                    filters: [['isinactive', search.Operator.IS, 'F']],
                    columns: ['itemid']
                }).run().getRange({start: 0, end: 1000});
                return results.map((r) => ({value: r.id, text: r.getValue({name: 'itemid'}) || r.id}));
            } catch (e) {
                log.error('Create SO Get Item Select Options Error', e);
                return [];
            }
        }

        function getCurrencySelectOptions() {
            try {
                const results = search.create({
                    type: 'currency',
                    filters: [['isinactive', search.Operator.IS, 'F']],
                    columns: ['name']
                }).run().getRange({start: 0, end: 1000});
                return results.map((r) => ({value: r.id, text: r.getValue({name: 'name'}) || r.id}));
            } catch (e) {
                log.error('Create SO Get Currency Select Options Error', e);
                return [];
            }
        }

        function getSalesContractSelectOptions(params) {
            if (!params.subsidiary) return [];
            try {
                return libCreateSo.getSalesContractFilterOptions(params);
            } catch (e) {
                log.error('Create SO Get Sales Contract Select Options Error', {params, error: e});
                return [];
            }
        }

        function addButtons(form) {
            form.addButton({id: 'custpage_search', label: 'Search', functionName: 'searchResult'});
            form.addButton({id: 'custpage_create_so', label: 'Create SO', functionName: 'createSalesOrder'});
        }

        function addResultSublist(form, params) {
            const sublist = form.addSublist({
                id: SUBLIST,
                type: serverWidget.SublistType.LIST,
                label: 'Result'
            });
            const isWr = params.createdFrom === libCreateSo.CREATED_FROM.WR;
            if (isWr) {
                addSublistFieldsWr(sublist);
            } else {
                addSublistFieldsSc(sublist);
            }
            sublist.addMarkAllButtons();

            if (params.isSearch !== 'T') return;
            const rows = libCreateSo.getSearchResults(params);
            log.error('Create SO Final Render Rows', {createdFrom: params.createdFrom, count: rows.length, rows: rows.slice(0, 20)});
            rows.forEach((row, index) => {
                try {
                    if (isWr) {
                        setSublistLineWr(sublist, row, index);
                    } else {
                        setSublistLineSc(sublist, row, index);
                    }
                } catch (e) {
                    log.error('Create SO Debug Row Render Failed', {
                        index,
                        row,
                        message: e.message || e.toString(),
                        name: e.name
                    });
                    throw e;
                }
            });
        }

        // FDD 2.2.3 TH1: Created From = Hợp đồng.
        function addSublistFieldsSc(sublist) {
            sublist.addField({id: 'custpage_select', type: serverWidget.FieldType.CHECKBOX, label: 'Create SO'});
            sublist.addField({id: 'custpage_sc_text', type: serverWidget.FieldType.TEXT, label: 'Sales Contract'});
            sublist.addField({id: 'custpage_contract_number', type: serverWidget.FieldType.TEXT, label: 'Số hợp đồng'});
            sublist.addField({id: 'custpage_contract_date', type: serverWidget.FieldType.DATE, label: 'Ngày hợp đồng'});
            sublist.addField({id: 'custpage_contract_exp_date', type: serverWidget.FieldType.DATE, label: 'Ngày hết hiệu lực'});
            sublist.addField({id: 'custpage_ordertype_text', type: serverWidget.FieldType.TEXT, label: 'Order Type'});
            sublist.addField({id: 'custpage_item_text', type: serverWidget.FieldType.TEXT, label: 'Item'});
            sublist.addField({id: 'custpage_description', type: serverWidget.FieldType.TEXT, label: 'Description'});
            sublist.addField({id: 'custpage_unit_text', type: serverWidget.FieldType.TEXT, label: 'ĐVT'});
            sublist.addField({id: 'custpage_qty_trungthau', type: serverWidget.FieldType.FLOAT, label: 'SL trúng thầu'});
            sublist.addField({id: 'custpage_qty_hopdong', type: serverWidget.FieldType.FLOAT, label: 'SL hợp đồng'});
            sublist.addField({id: 'custpage_qty_lendon', type: serverWidget.FieldType.FLOAT, label: 'SL lên đơn'});
            sublist.addField({id: 'custpage_qty_khtra', type: serverWidget.FieldType.FLOAT, label: 'SL KH trả'});
            sublist.addField({id: 'custpage_remaining', type: serverWidget.FieldType.FLOAT, label: 'SL còn lại'});
            addEditableSublistField(sublist, 'custpage_quantity', serverWidget.FieldType.FLOAT, 'SL bán');
            sublist.addField({id: 'custpage_rate', type: serverWidget.FieldType.FLOAT, label: 'Đơn giá'});
            sublist.addField({id: 'custpage_rate_vat', type: serverWidget.FieldType.FLOAT, label: 'Đơn giá (có VAT)'});
            addEditableSublistField(sublist, 'custpage_amount', serverWidget.FieldType.FLOAT, 'Thành tiền');
            sublist.addField({id: 'custpage_taxrate', type: serverWidget.FieldType.PERCENT, label: 'Thuế'});
            addEditableSublistField(sublist, 'custpage_taxamount', serverWidget.FieldType.FLOAT, 'Tiền thuế');
            addEditableSublistField(sublist, 'custpage_grossamount', serverWidget.FieldType.FLOAT, 'Tổng tiền');
            sublist.addField({id: 'custpage_storage_condition', type: serverWidget.FieldType.TEXT, label: 'Điều kiện bảo quản'});
            addLineJsonField(sublist);
        }

        // FDD 2.2.3 TH2: Created From = Phiếu nhập kho.
        function addSublistFieldsWr(sublist) {
            sublist.addField({id: 'custpage_select', type: serverWidget.FieldType.CHECKBOX, label: 'Create SO'});
            sublist.addField({id: 'custpage_wr_item_text', type: serverWidget.FieldType.TEXT, label: 'Item'});
            sublist.addField({id: 'custpage_wr_description', type: serverWidget.FieldType.TEXT, label: 'Description'});
            sublist.addField({id: 'custpage_wr_unit_text', type: serverWidget.FieldType.TEXT, label: 'Unit'});
            addEditableSublistField(sublist, 'custpage_wr_einvoice_unit', serverWidget.FieldType.TEXT, 'ĐVT in hóa đơn');
            sublist.addField({id: 'custpage_wr_lot_text', type: serverWidget.FieldType.TEXT, label: 'Lot Number'});
            sublist.addField({id: 'custpage_wr_expiration_date', type: serverWidget.FieldType.DATE, label: 'Expiration Date'});
            sublist.addField({id: 'custpage_wr_onhand', type: serverWidget.FieldType.FLOAT, label: 'On Hand'});
            sublist.addField({id: 'custpage_wr_available', type: serverWidget.FieldType.FLOAT, label: 'Available'});
            addEditableSublistField(sublist, 'custpage_wr_quantity', serverWidget.FieldType.FLOAT, 'Quantity');
            sublist.addField({id: 'custpage_wr_created_from_text', type: serverWidget.FieldType.TEXT, label: 'Created From'});
            sublist.addField({id: 'custpage_wr_purchase_contract_text', type: serverWidget.FieldType.TEXT, label: 'Purchase Contract'});
            sublist.addField({id: 'custpage_wr_sales_contract_text', type: serverWidget.FieldType.TEXT, label: 'Sales Contract'});
            sublist.addField({id: 'custpage_wr_inbound_shipment_text', type: serverWidget.FieldType.TEXT, label: 'Inbound Shipment'});
            sublist.addField({id: 'custpage_wr_ordertype_text', type: serverWidget.FieldType.TEXT, label: 'Order Type'});
            sublist.addField({id: 'custpage_wr_currency_text', type: serverWidget.FieldType.TEXT, label: 'Currency'});
            addLineJsonField(sublist);
        }

        function addLineJsonField(sublist) {
            sublist.addField({id: 'custpage_line_json', type: serverWidget.FieldType.TEXTAREA, label: 'Line Data'})
                .updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
        }

        function addEditableSublistField(sublist, id, type, label) {
            const field = sublist.addField({id, type, label});
            field.updateDisplayType({displayType: serverWidget.FieldDisplayType.ENTRY});
            return field;
        }

        function setSublistLineSc(sublist, row, index) {
            setLineValue(sublist, 'custpage_sc_text', index, row.salesContractNumber);
            setLineValue(sublist, 'custpage_contract_number', index, row.contractNumber);
            setLineValue(sublist, 'custpage_contract_date', index, row.contractDate);
            setLineValue(sublist, 'custpage_contract_exp_date', index, row.contractExpirationDate);
            setLineValue(sublist, 'custpage_ordertype_text', index, row.orderTypeText);
            setLineValue(sublist, 'custpage_item_text', index, row.itemText || row.item);
            setLineValue(sublist, 'custpage_description', index, row.description);
            setLineValue(sublist, 'custpage_unit_text', index, row.unitText || row.unit);
            setLineValue(sublist, 'custpage_qty_trungthau', index, row.qtyTrungThau);
            setLineValue(sublist, 'custpage_qty_hopdong', index, row.qtyCustom);
            setLineValue(sublist, 'custpage_qty_lendon', index, row.qtySo);
            setLineValue(sublist, 'custpage_qty_khtra', index, row.qtyRea);
            setLineValue(sublist, 'custpage_remaining', index, row.qtyRemaining);
            setLineValue(sublist, 'custpage_quantity', index, row.quantity);
            setLineValue(sublist, 'custpage_rate', index, row.rate);
            setLineValue(sublist, 'custpage_rate_vat', index, row.rateVat);
            setLineValue(sublist, 'custpage_amount', index, row.amount);
            setLineValue(sublist, 'custpage_taxrate', index, row.taxRate);
            setLineValue(sublist, 'custpage_taxamount', index, row.taxAmount);
            setLineValue(sublist, 'custpage_grossamount', index, row.grossAmount);
            setLineValue(sublist, 'custpage_storage_condition', index, row.dkBaoQuan);
            setLineValue(sublist, 'custpage_line_json', index, JSON.stringify(row));
        }

        function setSublistLineWr(sublist, row, index) {
            setLineValue(sublist, 'custpage_wr_item_text', index, row.itemText || row.item);
            setLineValue(sublist, 'custpage_wr_description', index, row.description);
            setLineValue(sublist, 'custpage_wr_unit_text', index, row.transUnitText || row.transUnit);
            setLineValue(sublist, 'custpage_wr_einvoice_unit', index, row.einvoiceUnit);
            setLineValue(sublist, 'custpage_wr_lot_text', index, row.lotNumberText || row.lotNumber);
            setLineValue(sublist, 'custpage_wr_expiration_date', index, row.expirationDate);
            setLineValue(sublist, 'custpage_wr_onhand', index, row.onHand);
            setLineValue(sublist, 'custpage_wr_available', index, row.available);
            setLineValue(sublist, 'custpage_wr_quantity', index, row.quantity);
            setLineValue(sublist, 'custpage_wr_created_from_text', index, row.gridCreatedFromText || row.gridCreatedFrom);
            setLineValue(sublist, 'custpage_wr_purchase_contract_text', index, row.purchaseContractText || row.purchaseContract);
            setLineValue(sublist, 'custpage_wr_sales_contract_text', index, row.salesContractText || row.salesContractId);
            setLineValue(sublist, 'custpage_wr_inbound_shipment_text', index, row.inboundShipmentText || row.inboundShipment);
            setLineValue(sublist, 'custpage_wr_ordertype_text', index, row.orderTypeText || row.orderType);
            setLineValue(sublist, 'custpage_wr_currency_text', index, row.gridCurrencyText || row.gridCurrency);
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
