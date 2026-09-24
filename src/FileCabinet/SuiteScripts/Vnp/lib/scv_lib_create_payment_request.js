/**
 * Business logic for Create Payment Request suitelet.
 */
define(['N/cache', 'N/format', 'N/runtime', 'N/search', 'N/url'],
    (cache, format, runtime, search, url) => {

        const PAYR_RECORD = 'customrecord_scv_paymentrequest';
        const SAVED_SEARCH = 'customsearch_acv_accural_payr';
        const CACHE_NAME = 'scv_sl_create_payr_payload';
        const CACHE_TTL_SECONDS = 900;

        const DEFAULTS = {
            PAYMENT_TYPE: '3',
            CURRENCY: '1',
            EXCHANGE_RATE: 1,
            MEMO: 'Thanh toán khoản trích trước chi phí',
            PAYMENT_METHOD: '7',
            ITEM: '1353',
            TAX_CODE: '5'
        };

        const RESULT_FIELD = {
            payr: ['payr', 'paymentrequest', 'refpayr', 'idpayr'],
            subsidiary: ['subsidiary'],
            date: ['date', 'trandate'],
            entity: ['entity', 'vendor', 'customer'],
            item: ['itemid', 'item'],
            description: ['description', 'memo'],
            amount: ['amount'],
            taxCode: ['taxcodeid', 'taxcode', 'tax code'],
            taxRate: ['taxrate', 'tax rate'],
            taxAmount: ['taxamount', 'tax amount'],
            grossAmount: ['grossamount', 'gross amount'],
            department: ['department'],
            expenseClass: ['expclass', 'expenseclass', 'expense class', 'class'],
            invoiceSerial: ['invserial', 'invoice serial', 'custrecord_scv_pay_detail_inv_serial'],
            invoiceNumber: ['invnumber', 'invoice number', 'custrecord_scv_pay_detail_invoice_number'],
            invoiceDate: ['invdate', 'invoice date', 'custrecord_scv_pay_detail_invoice_date'],
            invoiceTax: ['invtax', 'invoice tax', 'custrecord_scv_pay_detail_entity_tax'],
            invoiceAddress: ['invaddress', 'invoice address', 'custrecord_scv_pay_detail_entity_addr'],
            relatedTransaction: ['relatedtran', 'related transaction']
        };

        function normalizeKey(value) {
            return (value || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        }

        function parseNumber(value) {
            if (value === null || value === undefined || value === '') return 0;
            if (typeof value === 'number') return value;
            return parseFloat(value.toString().replace(/,/g, '').replace('%', '')) || 0;
        }

        function parseDate(value) {
            if (!value) return '';
            if (value instanceof Date) return value;
            return format.parse({value, type: format.Type.DATE});
        }

        function formatDate(value) {
            if (!value) return '';
            if (typeof value === 'string') return value;
            return format.format({value, type: format.Type.DATE});
        }

        function getTodayDate() {
            return formatDate(new Date());
        }

        function getCurrentUserDepartment() {
            try {
                const user = runtime.getCurrentUser();
                if (user.department) return user.department;
                const info = search.lookupFields({type: search.Type.EMPLOYEE, id: user.id, columns: ['department']});
                return info.department && info.department[0] ? info.department[0].value : '';
            } catch (e) {
                log.debug('Cannot get current user department', e);
                return '';
            }
        }

        function getCurrentUserSubsidiary() {
            try {
                const user = runtime.getCurrentUser();
                if (user.subsidiary) return user.subsidiary;
                const info = search.lookupFields({
                    type: search.Type.EMPLOYEE,
                    id: user.id,
                    columns: ['subsidiary', 'cseg_scv_subsidiary']
                });
                if (info.subsidiary && info.subsidiary[0]) return info.subsidiary[0].value;
                if (info.cseg_scv_subsidiary && info.cseg_scv_subsidiary[0]) return info.cseg_scv_subsidiary[0].value;
            } catch (e) {
                log.debug('Cannot get current user subsidiary', e);
            }
            return '';
        }

        function getColumnKeys(column) {
            return [
                column.label,
                column.name,
                column.join ? column.join + '.' + column.name : '',
                column.formula
            ].filter(Boolean).map(normalizeKey);
        }

        function buildResultObject(result, columns) {
            const data = {};
            columns.forEach((column) => {
                const value = result.getValue(column);
                const text = result.getText(column);
                getColumnKeys(column).forEach((key) => {
                    if (!data[key]) data[key] = {value, text: text || value};
                });
            });
            data.internalid = data.internalid || {value: result.id, text: result.id};
            return data;
        }

        function getMapped(data, keys, preferText) {
            for (let i = 0; i < keys.length; i++) {
                const obj = data[normalizeKey(keys[i])];
                if (!obj) continue;
                const value = preferText ? (obj.text || obj.value) : obj.value;
                if (value !== null && value !== undefined && value !== '') return value;
            }
            return '';
        }

        function addFilter(filters, name, operator, values, join) {
            if (values === null || values === undefined || values === '' || (Array.isArray(values) && !values.length)) return;
            const filter = {name, operator, values};
            if (join) filter.join = join;
            filters.push(search.createFilter(filter));
        }

        function addSearchFilters(searchObj, params) {
            const filters = searchObj.filters ? searchObj.filters.slice() : [];
            const payrJoin = 'custrecord_scv_pay';
            addFilter(filters, 'custrecord_scv_payment_type', search.Operator.ANYOF, params.type, payrJoin);
            addFilter(filters, 'custrecord_scv_payr_subs', search.Operator.ANYOF, params.subsidiary, payrJoin);
            addFilter(filters, 'custrecord_scv_payment_date', search.Operator.ONORAFTER, params.fromDate, payrJoin);
            addFilter(filters, 'custrecord_scv_payment_date', search.Operator.ONORBEFORE, params.toDate, payrJoin);
            addFilter(filters, 'internalid', search.Operator.ANYOF, params.payr, payrJoin);
            addFilter(filters, 'custrecord_scv_payr_d_paid', search.Operator.ANYOF, '@NONE@');
            searchObj.filters = filters;
        }

        function toResultLine(result, columns) {
            const data = buildResultObject(result, columns);
            const amount = parseNumber(getMapped(data, RESULT_FIELD.amount, false));
            const taxRate = parseNumber(getMapped(data, RESULT_FIELD.taxRate, false));
            const taxAmount = parseNumber(getMapped(data, RESULT_FIELD.taxAmount, false));
            const grossAmount = parseNumber(getMapped(data, RESULT_FIELD.grossAmount, false)) || amount + taxAmount;
            const payr = getMapped(data, RESULT_FIELD.payr, false);
            const relatedTransaction = getMapped(data, RESULT_FIELD.relatedTransaction, false);

            return {
                payr,
                payrText: getMapped(data, RESULT_FIELD.payr, true),
                subsidiary: getMapped(data, RESULT_FIELD.subsidiary, false),
                subsidiaryText: getMapped(data, RESULT_FIELD.subsidiary, true),
                date: formatDate(getMapped(data, RESULT_FIELD.date, false)),
                entity: getMapped(data, RESULT_FIELD.entity, false),
                entityText: getMapped(data, RESULT_FIELD.entity, true),
                item: getMapped(data, RESULT_FIELD.item, false),
                itemText: getMapped(data, RESULT_FIELD.item, true),
                description: getMapped(data, RESULT_FIELD.description, true),
                amount,
                taxCode: getMapped(data, RESULT_FIELD.taxCode, false) || DEFAULTS.TAX_CODE,
                taxRate,
                taxAmount,
                grossAmount,
                department: getMapped(data, RESULT_FIELD.department, false),
                departmentText: getMapped(data, RESULT_FIELD.department, true),
                expenseClass: getMapped(data, RESULT_FIELD.expenseClass, false),
                expenseClassText: getMapped(data, RESULT_FIELD.expenseClass, true),
                invoiceSerial: getMapped(data, RESULT_FIELD.invoiceSerial, false),
                invoiceNumber: getMapped(data, RESULT_FIELD.invoiceNumber, false),
                invoiceDate: formatDate(getMapped(data, RESULT_FIELD.invoiceDate, false)),
                invoiceTax: getMapped(data, RESULT_FIELD.invoiceTax, false),
                invoiceAddress: getMapped(data, RESULT_FIELD.invoiceAddress, false),
                relatedTransaction,
                relatedTransactionUrl: getTransactionUrl(relatedTransaction),
                resultId: result.id
            };
        }

        function getTransactionUrl(id) {
            if (!id) return '';
            try {
                return url.resolveRecord({recordType: search.Type.TRANSACTION, recordId: id, isEditMode: false});
            } catch (e) {
                return '';
            }
        }

        function getSearchResults(params) {
            const searchObj = search.load({id: SAVED_SEARCH});
            addSearchFilters(searchObj, params);
            const columns = searchObj.columns || [];
            const rows = [];
            const pagedData = searchObj.runPaged({pageSize: 1000});
            pagedData.pageRanges.forEach((pageRange) => {
                const page = pagedData.fetch({index: pageRange.index});
                page.data.forEach((result) => {
                    rows.push(toResultLine(result, columns));
                });
            });
            return rows;
        }

        function validateSelectedLines(lines) {
            if (!lines || !lines.length) throw Error('Please select at least one line.');
            const payr = lines[0].payr || '';
            lines.forEach((line) => {
                if (String(line.payr || '') !== String(payr)) {
                    throw Error('Only lines with the same PayR can be selected.');
                }
            });
        }

        function buildPaymentRequestPayload(params, lines) {
            validateSelectedLines(lines);
            const firstLine = lines[0];
            const totalGrossAmount = lines.reduce((total, line) => total + parseNumber(line.grossAmount), 0);
            const totalAmount = lines.reduce((total, line) => total + parseNumber(line.amount), 0);
            const totalTaxAmount = lines.reduce((total, line) => total + parseNumber(line.taxAmount), 0);
            const currentUser = runtime.getCurrentUser();

            return {
                header: {
                    requestor: currentUser.id,
                    department: getCurrentUserDepartment(),
                    subsidiary: firstLine.subsidiary || params.subsidiary,
                    type: DEFAULTS.PAYMENT_TYPE,
                    refPayr: firstLine.payr,
                    entity: firstLine.entity,
                    currency: DEFAULTS.CURRENCY,
                    exchangeRate: DEFAULTS.EXCHANGE_RATE,
                    amount: totalGrossAmount,
                    sumAmount: totalAmount,
                    taxAmount: totalTaxAmount,
                    memo: DEFAULTS.MEMO,
                    date: getTodayDate(),
                    paymentMethod: DEFAULTS.PAYMENT_METHOD
                },
                lines: lines.map((line) => ({
                    item: line.item || DEFAULTS.ITEM,
                    description: line.description,
                    quantity: 1,
                    rate: line.amount,
                    amount: line.amount,
                    taxCode: line.taxCode || DEFAULTS.TAX_CODE,
                    taxRate: line.taxRate,
                    taxAmount: line.taxAmount,
                    grossAmount: line.grossAmount,
                    department: line.department || getCurrentUserDepartment(),
                    expenseClass: line.expenseClass,
                    invoiceSerial: line.invoiceSerial,
                    invoiceNumber: line.invoiceNumber,
                    invoiceDate: line.invoiceDate,
                    invoiceTax: line.invoiceTax,
                    invoiceAddress: line.invoiceAddress,
                    relatedTransaction: line.relatedTransaction,
                    sourceDetailId: line.resultId
                }))
            };
        }

        function getPayloadCache() {
            return cache.getCache({name: CACHE_NAME, scope: cache.Scope.PUBLIC});
        }

        function cachePaymentRequestData(params, lines) {
            const payload = buildPaymentRequestPayload(params, lines);
            const key = [
                runtime.getCurrentUser().id,
                Date.now(),
                Math.floor(Math.random() * 1000000)
            ].join('_');
            getPayloadCache().put({
                key,
                value: JSON.stringify(payload),
                ttl: CACHE_TTL_SECONDS
            });
            return key;
        }

        function readCachedPayload(key) {
            if (!key) return null;
            const value = getPayloadCache().get({key});
            return value ? JSON.parse(value) : null;
        }

        return {
            DEFAULTS,
            PAYR_RECORD,
            parseDate,
            parseNumber,
            getCurrentUserSubsidiary,
            getSearchResults,
            cachePaymentRequestData,
            readCachedPayload
        };
    });
