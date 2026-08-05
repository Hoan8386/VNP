/**
 * Nội dung: Check trùng thông tin hóa đơn (Invoice Serial/Number/Date/Entity Tax)
 * Theo tài liệu https://docs.google.com/spreadsheets/d/1MqTN0vDYIpkxNjhEuWgvlyb-_CZqY9DtR0dg2pXXCQI/edit?gid=1893630250#gid=1893630250
 * 2.1 Check trùng hóa đơn trên PayR (customrecord_scv_paymentrequest)
 *      - ss: SCV Check Duplicate VATIN PayR (don't edit) - customsearch_scv_check_dup_vatin_payr
 * 2.2 Check trùng hóa đơn trên chứng từ hạch toán (Bill, Bill Credit, Journal, Check, Expense Report)
 *      - ss: SCV Check Duplicate VATIN Transaction (don't edit) - customsearch_scv_dup_vatin_pur
 * @NApiVersion 2.1
 */
define(['N/format', 'N/search'],

    (format, search) => {

        const WARNING_MESSAGE = 'Warning: Invoice information already exists in the system';

        const SearchId = {
            PAYR: 'customsearch_scv_check_dup_vatin_payr',
            TRANSACTION: 'customsearch_scv_dup_vatin_pur'
        };

        const SearchColumnLabel = {
            INVOICE_SERIAL: 'Invoice Serial',
            INVOICE_NUMBER: 'Invoice Number',
            INVOICE_DATE: 'Invoice Date',
            ENTITY_TAX: 'Invoice Entity Tax'
        };

        const SublistPayR = 'recmachcustrecord_scv_pay';

        const FieldPayR = {
            INVOICE_SERIAL: 'custrecord_scv_pay_detail_inv_serial',
            INVOICE_NUMBER: 'custrecord_scv_pay_detail_invoice_number',
            INVOICE_DATE: 'custrecord_scv_pay_detail_invoice_date',
            ENTITY_TAX: 'custrecord_scv_pay_detail_entity_tax'
        };

        const FieldTransaction = {
            INVOICE_SERIAL_COL: 'custcol_scv_invoice_serial',
            INVOICE_SERIAL_BODY: 'custbody_scv_invoice_serial',
            INVOICE_NUMBER_COL: 'custcol_scv_invoice_number',
            INVOICE_NUMBER_BODY: 'custbody_scv_invoice_number',
            INVOICE_DATE_COL: 'custcol_scv_invoice_date',
            INVOICE_DATE_BODY: 'custbody_scv_invoice_date',
            INVOICE_TAXREG_COL: 'custcol_scv_invoice_taxreg',
            ENTITY_TAX_NUMBER: 'custentity_scv_tax_number'
        };

        /**
         * Tìm cột (Column) trong saved search theo label, để tái sử dụng đúng field/formula đã định nghĩa sẵn trong ss "don't edit".
         */
        const findColumnByLabel = (columns, label) => columns.find(column => column.label === label);

        const escapeSqlText = (value) => String(value).replace(/'/g, "''");

        const formatDateForFormula = (value) => {
            let d = format.parse({value: value, type: format.Type.DATE});
            let mm = String(d.getMonth() + 1).padStart(2, '0');
            let dd = String(d.getDate()).padStart(2, '0');
            return `${mm}/${dd}/${d.getFullYear()}`;
        };

        /**
         * Chỉ 1 giá trị thì filter trực tiếp trên field/formula của cột (is/on như cũ).
         * Cột trong ss chỉ hỗ trợ operator đơn giá trị (is/on), không phải anyof nên nhiều giá trị (>1) phải build
         * filter dạng CASE WHEN <field/formula> IN (...) THEN 'T' ELSE 'F' END để lọc 1 lần.
         */
        const buildInFilter = (column, values, label) => {
            let isDateColumn = label === SearchColumnLabel.INVOICE_DATE;

            if (values.length === 1) {
                return search.createFilter({
                    name: column.name,
                    join: column.join,
                    formula: column.formula,
                    summary: column.summary,
                    operator: isDateColumn ? search.Operator.ON : search.Operator.IS,
                    values: values
                });
            }

            let expr = column.formula || `{${column.join ? column.join + '.' : ''}${column.name}}`;
            if (isDateColumn) expr = `TO_CHAR(${expr}, 'MM/DD/YYYY')`;
            let quotedValues = values
                .map(value => isDateColumn ? formatDateForFormula(value) : escapeSqlText(value))
                .map(value => `'${value}'`)
                .join(',');
            return search.createFilter({
                name: 'formulatext',
                formula: `CASE WHEN ${expr} IN (${quotedValues}) THEN 'T' ELSE 'F' END`,
                operator: search.Operator.IS,
                values: ['T']
            });
        };

        /**
         * Chạy saved search một lần với các filter bổ sung theo danh sách giá trị của từng cột (label truyền vào),
         * loại trừ chính record đang lưu (nếu là update).
         * @param {string} searchId
         * @param {Object} mapValues - {label: value[]}
         * @param {number|string} excludeId - internal id của record đang lưu
         * @returns {boolean}
         */
        const hasDuplicate = (searchId, mapValues, excludeId) => {
            let entries = Object.entries(mapValues).filter(([, values]) => values.length);
            if (!entries.length) return false;

            let loadedSearch = search.load({id: searchId});
            let filters = loadedSearch.filters;

            entries.forEach(([label, values]) => {
                let column = findColumnByLabel(loadedSearch.columns, label);
                if (column) filters.push(buildInFilter(column, values, label));
            });

            if (excludeId) {
                filters.push(search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.NONEOF,
                    values: [excludeId]
                }));
            }

            loadedSearch.filters = filters;
            let firstResult = loadedSearch.run().getRange({start: 0, end: 1});
            return firstResult.length > 0;
        };

        /**
         * Gom giá trị 1 field của tất cả line trong sublist thành list không trùng, bỏ giá trị rỗng.
         */
        const collectSublistValues = (rec, sublistId, fieldId, lineCount, asText) => {
            let values = [];
            for (let line = 0; line < lineCount; line++) {
                let value = asText
                    ? rec.getSublistText({sublistId, fieldId, line})
                    : rec.getSublistValue({sublistId, fieldId, line});
                if (value) values.push(value);
            }
            return [...new Set(values)];
        };

        /**
         * 2.1 Check trùng hóa đơn trên PayR.
         * Gom Invoice Serial/Number/Date/Entity Tax của tất cả line (sublist recmachcustrecord_scv_pay) thành list,
         * lọc 1 lần với ss customsearch_scv_check_dup_vatin_payr.
         * @param {Record} rec - record/currentRecord Payment Request đang lưu
         * @returns {boolean}
         */
        const isDuplicateInvoicePayR = (rec) => {
            let lineCount = rec.getLineCount({sublistId: SublistPayR});
            let mapValues = {
                [SearchColumnLabel.INVOICE_SERIAL]: collectSublistValues(rec, SublistPayR, FieldPayR.INVOICE_SERIAL, lineCount),
                [SearchColumnLabel.INVOICE_NUMBER]: collectSublistValues(rec, SublistPayR, FieldPayR.INVOICE_NUMBER, lineCount),
                [SearchColumnLabel.INVOICE_DATE]: collectSublistValues(rec, SublistPayR, FieldPayR.INVOICE_DATE, lineCount, true),
                [SearchColumnLabel.ENTITY_TAX]: collectSublistValues(rec, SublistPayR, FieldPayR.ENTITY_TAX, lineCount)
            };
            return hasDuplicate(SearchId.PAYR, mapValues, rec.id);
        };

        /**
         * Lấy mã số thuế của 1 vendor theo entityId.
         */
        const getVendorTaxNumber = (entityId) => {
            let lkFields = search.lookupFields({
                type: 'vendor',
                id: entityId,
                columns: [FieldTransaction.ENTITY_TAX_NUMBER]
            });
            return lkFields[FieldTransaction.ENTITY_TAX_NUMBER] || '';
        };

        /**
         * 2.2 Check trùng hóa đơn trên chứng từ hạch toán (Bill, Bill Credit, Journal, Check, Expense Report).
         * Với mỗi line: Serial/Number/Date = NVL(cột line, cột body); Entity Tax = coalesce(taxreg trên line, mã số thuế vendor).
         * So sánh với ss customsearch_scv_dup_vatin_pur. Trùng cả 4 trường thì coi là trùng.
         * @param {Record} rec - record/currentRecord chứng từ đang lưu
         * @returns {boolean}
         */
        const isDuplicateInvoiceTransaction = (rec) => {
            let bodySerial = rec.getValue({fieldId: FieldTransaction.INVOICE_SERIAL_BODY});
            let bodyNumber = rec.getValue({fieldId: FieldTransaction.INVOICE_NUMBER_BODY});
            let bodyDate = rec.getText({fieldId: FieldTransaction.INVOICE_DATE_BODY});
            let bodyEntityId = rec.getValue({fieldId: 'entity'});

            let vendorTaxNumberCache = {};
            let resolveVendorTaxNumber = (entityId) => {
                if (!entityId) return '';
                if (!(entityId in vendorTaxNumberCache)) {
                    vendorTaxNumberCache[entityId] = getVendorTaxNumber(entityId);
                }
                return vendorTaxNumberCache[entityId];
            };

            let lineCount = rec.getLineCount({sublistId: 'line'});
            let serials = [], numbers = [], dates = [], entityTaxes = [];

            if (!lineCount) {
                if (bodySerial) serials.push(bodySerial);
                if (bodyNumber) numbers.push(bodyNumber);
                if (bodyDate) dates.push(bodyDate);
                let entityTax = resolveVendorTaxNumber(bodyEntityId);
                if (entityTax) entityTaxes.push(entityTax);
            } else {
                for (let line = 0; line < lineCount; line++) {
                    let getColVal = (fieldId) => rec.getSublistValue({sublistId: 'line', fieldId, line});
                    let getColText = (fieldId) => rec.getSublistText({sublistId: 'line', fieldId, line});
                    let colTaxreg = getColVal(FieldTransaction.INVOICE_TAXREG_COL);
                    let serial = getColVal(FieldTransaction.INVOICE_SERIAL_COL) || bodySerial;
                    let number = getColVal(FieldTransaction.INVOICE_NUMBER_COL) || bodyNumber;
                    let date = getColText(FieldTransaction.INVOICE_DATE_COL) || bodyDate;
                    let lineEntityId = getColVal('entity') || bodyEntityId;
                    let entityTax = colTaxreg || resolveVendorTaxNumber(lineEntityId);
                    if (serial) serials.push(serial);
                    if (number) numbers.push(number);
                    if (date) dates.push(date);
                    if (entityTax) entityTaxes.push(entityTax);
                }
            }

            let mapValues = {
                [SearchColumnLabel.INVOICE_SERIAL]: [...new Set(serials)],
                [SearchColumnLabel.INVOICE_NUMBER]: [...new Set(numbers)],
                [SearchColumnLabel.INVOICE_DATE]: [...new Set(dates)],
                [SearchColumnLabel.ENTITY_TAX]: [...new Set(entityTaxes)]
            };
            return hasDuplicate(SearchId.TRANSACTION, mapValues, rec.id);
        };

        return {
            WARNING_MESSAGE,
            isDuplicateInvoicePayR,
            isDuplicateInvoiceTransaction
        };

    });