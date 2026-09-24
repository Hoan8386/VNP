define(['N/format', 'N/record', 'N/search', 'N/url'],
    (format, record, search, url) => {

        const CREATED_FROM = {
            SC: 'sc',
            WR: 'wr'
        };

        const SAVED_SEARCH = {
            SC: 'customsearch_scv_sc_create_so',
            WR: 'customsearch_scv_so_from_itr_ia',
            WR_INV: 'customsearch_scv_so_from_inv_balance',
            SC_LIST: 'customsearch_scv_list_sc_to_so'
        };

        const RECORD_TYPE = {
            SC: 'customsale_scv_sales_contract'
        };

        const SPEC_UNIT_RECORD = 'customrecord_scv_specificaiton_unit';

        const FIELD = {
            SO_ORDER_TYPE: 'custbody_scv_order_type',
            SO_ORDER_TIME: 'custbody_scv_so_time_order',
            SO_SALES_CONTRACT: 'custbody_scv_sales_contract',
            SO_CREATED_TRANSACTION: 'custbody_scv_created_transaction',
            SO_PURCHASE_ORDER: 'custbody_scv_purchase_order',
            SO_CUSTOM_SUBSIDIARY: 'subsidiary',
            LINE_EINVOICE_UNIT: 'custcol_scv_einvoice_unit',
            LINE_RATE_VAT_CUSTOM: 'custcol_scv_rate_vat_custom',
            LINE_ORIGIN: 'custcol_scv_origin_line_num',
            LINE_REF_NO: 'custcol_scv_ref_no',
            LINE_VISA: 'custcol_scv_visa',
            LINE_VISA_2: 'custcol_scv_visa_2',
            LINE_VISA_GIAHAN: 'custcol_scv_visa_giahan',
            LINE_GPNK: 'custcol_scv_gpnk',
            LINE_RATE_PRE_DISCOUNT: 'custcol_scv_rate_pre_discount',
            LINE_DISCOUNT_PER: 'custcol_scv_discount_per'
        };

        const SUBLIST_ITEM = 'item';
        const SUBLIST_INVENTORY_ASSIGNMENT = 'inventoryassignment';


        const QTY_CASE = {
            CONTRACTED: 'CONTRACTED',
            OPEN: 'OPEN',
            ZERO: 'ZERO'
        };


        const RESULT_FIELD = {
            id: ['salescontractid', 'id', 'internalid', 'sctid'],
            salesContractNumber: ['salescontractnumber'],
            contractNumber: ['contractnumber'],
            contractDate: ['contractdate'],
            contractExpirationDate: ['contractexpirationdate'],
            orderType: ['ordertype', 'order type'],
            item: ['item', 'itemid'],
            description: ['description', 'memo'],
            unit: ['unit', 'unitid', 'units'],
            qtyTrungThau: ['qtytrungthau'],
            qtyCustom: ['qtycustom'],
            qtySo: ['qtyso'],
            qtyRea: ['qtyrea'],
            qtyRemaining: ['qtyremaining', 'quantity remaining', 'remaining quantity'],
            rate: ['rate'],
            rateVat: ['ratevat'],
            taxCode: ['taxcode', 'tax code'],
            taxCodeText: ['taxcodetext', 'tax code text', 'taxcode', 'tax code'],
            taxRate: ['taxrate', 'tax rate'],
            dkBaoQuan: ['dkbaoquan'],
            einvoiceUnit: ['einvoiceunit'],
            originLineId: ['originallineid', 'custcol_scv_origin_line_num', 'origin line id'],
            refNo: ['refno', 'custcol_scv_ref_no', 'ref no'],
            visa: ['visa'],
            visa2: ['visa2'],
            visaGiaHan: ['visagiahan'],
            gpnk: ['gpnk'],
            ratePreDiscount: ['rateprediscount'],
            discountPercent: ['discountpercent'],
            qtyRestrict: ['qtyrestrict']
        };


        const RESULT_FIELD_WR = {
            item: ['item', 'itemid'],
            description: ['description'],
            transUnit: ['transunit'],
            lotNumber: ['lotnumber'],
            expirationDate: ['expirationdate'],
            location: ['location'],
            createdFrom: ['createdfrom'],
            purchaseContract: ['purchasecontract'],
            salesContract: ['salescontract'],
            inboundShipment: ['inboundshipment'],
            orderType: ['ordertype', 'order type'],
            currency: ['currency'],
            documentId: ['internalid', 'id'],
            documentNumber: ['documentnumber'],
            rate: ['rate'],
            taxCode: ['taxcode', 'tax code'],
            taxCodeText: ['taxcodetext', 'tax code text', 'taxcode', 'tax code'],
            originLineId: ['originallineid', 'origin line id']
        };


        const RESULT_FIELD_INV = {
            item: ['item', 'itemid'],
            location: ['location'],
            lotNumber: ['lotnumber'],
            onHand: ['onhand'],
            available: ['available'],
            primaryStockUnit: ['primarystockunit', 'primary stock unit']
        };

        function parseNumber(value) {
            if (value === null || value === undefined || value === '') return 0;
            if (typeof value === 'number') return value;
            return parseFloat(value.toString().replace(/,/g, '').replace('%', '')) || 0;
        }

        function normalizePercentValue(value) {
            if (value === null || value === undefined || value === '') return '';
            return parseNumber(value);
        }

        function parseDate(value) {
            if (!value) return '';
            if (value instanceof Date) return value;
            return format.parse({value: value, type: format.Type.DATE});
        }

        function parseDateTime(value) {
            if (!value) return '';
            if (value instanceof Date) return value;
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
                return new Date(value);
            }
            return format.parse({value: value, type: format.Type.DATETIMETZ});
        }

        function formatDate(value) {
            if (!value) return '';
            if (typeof value === 'string') return value;
            return format.format({value: value, type: format.Type.DATE});
        }

        function getVietnamNow() {
            const now = new Date();
            const vietnamOffsetMinutes = 7 * 60;
            return new Date(now.getTime() + vietnamOffsetMinutes * 60 * 1000);
        }

        function getTodayDate() {
            const vietnamNow = getVietnamNow();
            const year = vietnamNow.getUTCFullYear();
            const month = vietnamNow.getUTCMonth();
            const date = vietnamNow.getUTCDate();
            return formatDate(new Date(Date.UTC(year, month, date, 12, 0, 0)));
        }

        function getNowDateTime() {
            const vietnamNow = getVietnamNow();
            const hours = vietnamNow.getUTCHours();
            const minutes = vietnamNow.getUTCMinutes();
            const seconds = vietnamNow.getUTCSeconds();
            return getTodayDate() + ' ' + hours + ':' + padTimePart(minutes) + ':' + padTimePart(seconds);
        }

        function padTimePart(value) {
            return value < 10 ? '0' + value : String(value);
        }




        function isBaseCurrency(currencyId) {
            return !currencyId || currencyId.toString() === '1';
        }

        function roundNumber(number, digit) {
            if (number === null || number === undefined || number === '') return 0;
            return parseFloat(Number(number).toFixed(digit)) || 0;
        }

        function isTrue(value) {
            return value === true || value === 'T' || value === 't' || value === 1 || value === '1';
        }

        function normalizeKey(value) {
            return (value || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        }

        function uniq(arr) {
            const seen = {};
            const out = [];
            arr.forEach((value) => {
                if (value !== null && value !== undefined && value !== '' && !seen[value]) {
                    seen[value] = true;
                    out.push(value);
                }
            });
            return out;
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
                    if (!data[key]) {
                        data[key] = {value: value, text: text || value};
                    }
                });
            });
            data.internalid = data.internalid || {value: result.id, text: result.id};
            data.id = data.id || {value: result.id, text: result.id};
            return data;
        }

        function getMapped(data, keys, preferText) {
            for (let i = 0; i < keys.length; i++) {
                const obj = data[normalizeKey(keys[i])];
                if (obj && obj.value !== null && obj.value !== undefined && obj.value !== '') {
                    return preferText ? (obj.text || obj.value) : obj.value;
                }
            }
            return '';
        }

        function getMappedText(data, keys) {
            for (let i = 0; i < keys.length; i++) {
                const obj = data[normalizeKey(keys[i])];
                if (obj && obj.text !== null && obj.text !== undefined && obj.text !== '') {
                    return obj.text;
                }
            }
            return getMapped(data, keys, false);
        }

        function addFilter(filters, name, operator, values) {
            if (values === null || values === undefined || values === '' || (Array.isArray(values) && !values.length)) return;
            filters.push(search.createFilter({name, operator, values}));
        }

        function addCommonFilters(searchObj, params) {
            const filters = searchObj.filters ? searchObj.filters.slice() : [];
            addFilter(filters, 'subsidiary', search.Operator.ANYOF, params.subsidiary);
            addFilter(filters, 'entity', search.Operator.ANYOF, params.customerFilter);
            addFilter(filters, 'item', search.Operator.ANYOF, params.item);
            if (params.salesContract) {
                addFilter(filters, 'internalid', search.Operator.ANYOF, params.salesContract);
            }
            searchObj.filters = filters;
        }

        function computeQtyCase(qtyCustom, qtyTrungThau) {
            if (qtyCustom > 0) return QTY_CASE.CONTRACTED;
            if (qtyTrungThau > 0) return QTY_CASE.ZERO;
            return QTY_CASE.OPEN;
        }

        function defaultQuantityForCase(qtyCase, qtyRemaining) {
            if (qtyCase === QTY_CASE.CONTRACTED) return qtyRemaining;
            if (qtyCase === QTY_CASE.ZERO) return 0;
            return '';
        }

        function calcTaxAmount(amount, taxRate, digit) {
            const rate = Math.abs(taxRate) <= 1 ? taxRate : taxRate / 100;
            return roundNumber(amount * rate, digit);
        }

        function toResultLine(result, columns, currencyId) {
            const data = buildResultObject(result, columns);
            const digit = isBaseCurrency(currencyId) ? 0 : 2;

            const qtyTrungThau = parseNumber(getMapped(data, RESULT_FIELD.qtyTrungThau, false));
            const qtyCustom = parseNumber(getMapped(data, RESULT_FIELD.qtyCustom, false));
            const qtySo = parseNumber(getMapped(data, RESULT_FIELD.qtySo, false));
            const qtyRea = parseNumber(getMapped(data, RESULT_FIELD.qtyRea, false));
            const qtyRemaining = parseNumber(getMapped(data, RESULT_FIELD.qtyRemaining, false));
            const rate = parseNumber(getMapped(data, RESULT_FIELD.rate, false));
            const rateVat = parseNumber(getMapped(data, RESULT_FIELD.rateVat, false));
            const taxRate = parseNumber(getMapped(data, RESULT_FIELD.taxRate, false));
            const taxCodeRaw = getMapped(data, RESULT_FIELD.taxCode, false);
            const taxCodeText = getMappedText(data, RESULT_FIELD.taxCodeText);

            const qtyCase = computeQtyCase(qtyCustom, qtyTrungThau);
            const quantity = defaultQuantityForCase(qtyCase, qtyRemaining);
            const amount = roundNumber(parseNumber(quantity) * rate, digit);
            const taxAmount = calcTaxAmount(amount, taxRate, digit);

            const sourceRecordId = getMapped(data, RESULT_FIELD.id, false) || result.id;

            return {
                createdFrom: CREATED_FROM.SC,
                sourceRecordId,
                sourceRecordType: RECORD_TYPE.SC,
                salesContractId: sourceRecordId,
                salesContractNumber: getMappedText(data, RESULT_FIELD.salesContractNumber),
                contractNumber: getMappedText(data, RESULT_FIELD.contractNumber),
                contractDate: getMapped(data, RESULT_FIELD.contractDate, false),
                contractExpirationDate: getMapped(data, RESULT_FIELD.contractExpirationDate, false),
                orderType: getMapped(data, RESULT_FIELD.orderType, false),
                orderTypeText: getMappedText(data, RESULT_FIELD.orderType),
                item: getMapped(data, RESULT_FIELD.item, false),
                itemText: getMappedText(data, RESULT_FIELD.item),
                description: getMappedText(data, RESULT_FIELD.description),
                unit: getMapped(data, RESULT_FIELD.unit, false),
                unitText: getMappedText(data, RESULT_FIELD.unit),
                qtyTrungThau,
                qtyCustom,
                qtySo,
                qtyRea,
                qtyRemaining,
                qtyCase,
                quantity,
                rate,
                rateVat,
                taxCode: taxCodeRaw,
                taxCodeText,
                taxRate,
                amount,
                taxAmount,
                grossAmount: roundNumber(amount + taxAmount, digit),
                dkBaoQuan: getMappedText(data, RESULT_FIELD.dkBaoQuan),
                einvoiceUnit: getMappedText(data, RESULT_FIELD.einvoiceUnit),
                originLineId: getMapped(data, RESULT_FIELD.originLineId, false),
                refNo: getMapped(data, RESULT_FIELD.refNo, false),
                visa: getMapped(data, RESULT_FIELD.visa, false),
                visa2: getMapped(data, RESULT_FIELD.visa2, false),
                visaGiaHan: getMapped(data, RESULT_FIELD.visaGiaHan, false),
                gpnk: getMapped(data, RESULT_FIELD.gpnk, false),
                ratePreDiscount: getMapped(data, RESULT_FIELD.ratePreDiscount, false),
                discountPercent: getMapped(data, RESULT_FIELD.discountPercent, false),
                qtyRestrict: isTrue(getMapped(data, RESULT_FIELD.qtyRestrict, false))
            };
        }

        function getRecordUrl(type, id) {
            if (!type || !id) return '';
            try {
                return url.resolveRecord({recordType: type, recordId: id, isEditMode: false});
            } catch (e) {
                log.debug('Cannot resolve record URL', {type, id, error: e});
                return '';
            }
        }

        function runSalesContractSearch(params) {
            const searchObj = search.load({id: SAVED_SEARCH.SC});
            addCommonFilters(searchObj, params);
            const columns = searchObj.columns || [];
            const rows = [];
            const pagedData = searchObj.runPaged({pageSize: 1000});
            pagedData.pageRanges.forEach((pageRange) => {
                const page = pagedData.fetch({index: pageRange.index});
                page.data.forEach((result) => {
                    rows.push(toResultLine(result, columns, params.currency));
                });
            });
            return rows;
        }



        function buildJoinKey(item, location, lotNumber) {
            return [item || '', location || '', lotNumber || ''].join('|');
        }

        const specUnitConversionCache = {};




        function getUnitConversionRate(itemId, unitId) {
            if (!itemId || !unitId) return 1;
            const cacheKey = itemId + '|' + unitId;
            if (specUnitConversionCache[cacheKey] !== undefined) return specUnitConversionCache[cacheKey];
            let rate = 1;
            try {
                const results = search.create({
                    type: SPEC_UNIT_RECORD,
                    filters: [
                        ['custrecord_scv_item_specification', search.Operator.ANYOF, itemId],
                        'AND',
                        ['custrecord_scv_item_unit', search.Operator.ANYOF, unitId]
                    ],
                    columns: ['custrecord_scv_item_unit_convert_qty']
                }).run().getRange({start: 0, end: 1});
                if (results && results[0]) {
                    const value = parseNumber(results[0].getValue({name: 'custrecord_scv_item_unit_convert_qty'}));
                    if (value) rate = value;
                }
            } catch (e) {
                log.debug('Cannot get unit conversion rate', {itemId, unitId, error: e});
            }
            specUnitConversionCache[cacheKey] = rate;
            return rate;
        }

        const taxCodeRateCache = {};
        const taxCodeIdCache = {};
        const lotNumberIdCache = {};

        function isInternalId(value) {
            return /^\d+$/.test((value || '').toString());
        }

        function resolveTaxCodeId(value, text) {
            const candidates = uniq([value, text].filter(Boolean).map((candidate) => candidate.toString()));
            const numericCandidate = candidates.find(isInternalId);
            if (numericCandidate) return numericCandidate;
            for (let i = 0; i < candidates.length; i++) {
                const candidate = candidates[i];
                if (taxCodeIdCache[candidate] !== undefined) return taxCodeIdCache[candidate];
                const taxCodeId = findTaxCodeId(candidate);
                if (taxCodeId) {
                    candidates.forEach((key) => { taxCodeIdCache[key] = taxCodeId; });
                    return taxCodeId;
                }
                taxCodeIdCache[candidate] = '';
            }
            return value || '';
        }

        function findTaxCodeId(candidate) {
            const filterNames = ['itemid', 'name'];
            for (let i = 0; i < filterNames.length; i++) {
                try {
                    const results = search.create({
                        type: 'salestaxitem',
                        filters: [[filterNames[i], search.Operator.IS, candidate]],
                        columns: ['internalid']
                    }).run().getRange({start: 0, end: 1});
                    if (results && results[0]) return results[0].id;
                } catch (e) {
                    log.debug('Cannot resolve tax code by field', {candidate, fieldId: filterNames[i], error: e});
                }
            }
            return '';
        }

        function resolveLotNumberId(itemId, lotNumber, lotNumberText) {
            const candidates = uniq([lotNumber, lotNumberText].filter(Boolean).map((candidate) => candidate.toString()));
            const numericCandidate = candidates.find(isInternalId);
            if (numericCandidate) return numericCandidate;
            for (let i = 0; i < candidates.length; i++) {
                const candidate = candidates[i];
                const cacheKey = itemId + '|' + candidate;
                if (lotNumberIdCache[cacheKey] !== undefined) return lotNumberIdCache[cacheKey];
                const lotNumberId = findLotNumberId(itemId, candidate);
                lotNumberIdCache[cacheKey] = lotNumberId;
                if (lotNumberId) return lotNumberId;
            }
            return '';
        }

        function findLotNumberId(itemId, lotNumber) {
            if (!lotNumber) return '';
            const filterSets = [];
            if (itemId) {
                filterSets.push([
                    ['inventorynumber', search.Operator.IS, lotNumber],
                    'AND',
                    ['item', search.Operator.ANYOF, itemId]
                ]);
            }
            filterSets.push([['inventorynumber', search.Operator.IS, lotNumber]]);

            for (let i = 0; i < filterSets.length; i++) {
                try {
                    const results = search.create({
                        type: 'inventorynumber',
                        filters: filterSets[i],
                        columns: ['internalid']
                    }).run().getRange({start: 0, end: 1});
                    if (results && results[0]) return results[0].id;
                } catch (e) {
                    log.debug('Cannot resolve lot number id', {itemId, lotNumber, filterIndex: i, error: e});
                }
            }
            return '';
        }

        function getTaxRateFromTaxCode(taxCodeId) {
            if (!taxCodeId) return 0;
            if (taxCodeRateCache[taxCodeId] !== undefined) return taxCodeRateCache[taxCodeId];
            let rate = 0;
            try {
                const lk = search.lookupFields({type: 'salestaxitem', id: taxCodeId, columns: ['rate']});
                rate = parseNumber(lk.rate);
            } catch (e) {
                log.debug('Cannot get tax rate from tax code', {taxCodeId, error: e});
            }
            taxCodeRateCache[taxCodeId] = rate;
            return rate;
        }

        function buildInventoryBalanceIndex(itemIds) {
            const index = {};
            if (!itemIds.length) return index;
            const searchObj = search.load({id: SAVED_SEARCH.WR_INV, type: search.Type.INVENTORY_BALANCE});
            const filters = searchObj.filters ? searchObj.filters.slice() : [];
            addFilter(filters, 'item', search.Operator.ANYOF, itemIds);
            searchObj.filters = filters;
            const columns = searchObj.columns || [];
            const pagedData = searchObj.runPaged({pageSize: 1000});
            pagedData.pageRanges.forEach((pageRange) => {
                const page = pagedData.fetch({index: pageRange.index});
                page.data.forEach((result) => {
                    const data = buildResultObject(result, columns);
                    const item = getMapped(data, RESULT_FIELD_INV.item, false);
                    const location = getMapped(data, RESULT_FIELD_INV.location, false);
                    const lotNumber = getMapped(data, RESULT_FIELD_INV.lotNumber, false);
                    index[buildJoinKey(item, location, lotNumber)] = data;
                });
            });
            return index;
        }



        function convertInventoryQty(rawQty, itemId, fromUnitId, toUnitId) {
            const rateFromUnitToBase = getUnitConversionRate(itemId, fromUnitId);
            const rateToUnitToBase = getUnitConversionRate(itemId, toUnitId) || 1;
            return roundNumber((rawQty * rateFromUnitToBase) / rateToUnitToBase, 2);
        }

        function toResultLineWr(data, ss3Index) {
            const item = getMapped(data, RESULT_FIELD_WR.item, false);
            const location = getMapped(data, RESULT_FIELD_WR.location, false);
            const lotNumber = getMapped(data, RESULT_FIELD_WR.lotNumber, false);
            const transUnit = getMapped(data, RESULT_FIELD_WR.transUnit, false);
            const transUnitText = getMappedText(data, RESULT_FIELD_WR.transUnit);

            const invData = ss3Index[buildJoinKey(item, location, lotNumber)];
            let onHand = 0;
            let available = 0;
            if (invData) {
                const primaryStockUnit = getMapped(invData, RESULT_FIELD_INV.primaryStockUnit, false);
                const rawOnHand = parseNumber(getMapped(invData, RESULT_FIELD_INV.onHand, false));
                const rawAvailable = parseNumber(getMapped(invData, RESULT_FIELD_INV.available, false));
                onHand = convertInventoryQty(rawOnHand, item, primaryStockUnit, transUnit);
                available = convertInventoryQty(rawAvailable, item, primaryStockUnit, transUnit);
            }


            if (onHand <= 0 && available <= 0) return null;

            const rate = parseNumber(getMapped(data, RESULT_FIELD_WR.rate, false));
            const poCreatedFrom = getMapped(data, RESULT_FIELD_WR.createdFrom, false);

            return {
                createdFrom: CREATED_FROM.WR,
                item,
                itemText: getMappedText(data, RESULT_FIELD_WR.item),
                description: getMappedText(data, RESULT_FIELD_WR.description),
                transUnit,
                transUnitText,
                einvoiceUnit: transUnitText,
                lotNumber,
                lotNumberText: getMappedText(data, RESULT_FIELD_WR.lotNumber),
                expirationDate: getMapped(data, RESULT_FIELD_WR.expirationDate, false),
                location,
                onHand,
                available,
                quantity: available,
                gridCreatedFrom: poCreatedFrom,
                gridCreatedFromText: getMappedText(data, RESULT_FIELD_WR.createdFrom),
                poCreatedFrom,
                purchaseContract: getMapped(data, RESULT_FIELD_WR.purchaseContract, false),
                purchaseContractText: getMappedText(data, RESULT_FIELD_WR.purchaseContract),
                salesContractId: getMapped(data, RESULT_FIELD_WR.salesContract, false),
                salesContractText: getMappedText(data, RESULT_FIELD_WR.salesContract),
                inboundShipment: getMapped(data, RESULT_FIELD_WR.inboundShipment, false),
                inboundShipmentText: getMappedText(data, RESULT_FIELD_WR.inboundShipment),
                orderType: getMapped(data, RESULT_FIELD_WR.orderType, false),
                orderTypeText: getMappedText(data, RESULT_FIELD_WR.orderType),
                gridCurrency: getMapped(data, RESULT_FIELD_WR.currency, false),
                gridCurrencyText: getMappedText(data, RESULT_FIELD_WR.currency),
                documentId: getMapped(data, RESULT_FIELD_WR.documentId, false),
                documentNumber: getMapped(data, RESULT_FIELD_WR.documentNumber, false),
                rate,
                taxCode: getMapped(data, RESULT_FIELD_WR.taxCode, false),
                taxCodeText: getMappedText(data, RESULT_FIELD_WR.taxCodeText),
                originLineId: getMapped(data, RESULT_FIELD_WR.originLineId, false)
            };
        }

        function runWarehouseReceiptSearch(params) {
            const searchObj = search.load({id: SAVED_SEARCH.WR, type: search.Type.TRANSACTION});
            const filters = searchObj.filters ? searchObj.filters.slice() : [];
            addFilter(filters, 'subsidiary', search.Operator.ANYOF, params.subsidiary);
            addFilter(filters, 'location', search.Operator.ANYOF, params.locationFilter);
            addFilter(filters, 'item', search.Operator.ANYOF, params.item);
            addFilter(filters, 'trandate', search.Operator.ONORAFTER, params.fromDate);
            addFilter(filters, 'trandate', search.Operator.ONORBEFORE, params.toDate);
            searchObj.filters = filters;
            const columns = searchObj.columns || [];

            const ss2Rows = [];
            const pagedData = searchObj.runPaged({pageSize: 1000});
            pagedData.pageRanges.forEach((pageRange) => {
                const page = pagedData.fetch({index: pageRange.index});
                page.data.forEach((result) => {
                    ss2Rows.push(buildResultObject(result, columns));
                });
            });
            if (!ss2Rows.length) return [];

            const itemIds = uniq(ss2Rows.map((data) => getMapped(data, RESULT_FIELD_WR.item, false)));
            const ss3Index = buildInventoryBalanceIndex(itemIds);

            const rows = [];
            ss2Rows.forEach((data) => {
                const row = toResultLineWr(data, ss3Index);
                if (row) rows.push(row);
            });
            return rows;
        }

        function getSearchResults(params) {
            if (params.createdFrom === CREATED_FROM.WR) {
                return runWarehouseReceiptSearch(params);
            }
            return runSalesContractSearch(params);
        }

        function getSalesContractFilterOptions(params) {
            try {
                const searchObj = search.load({id: SAVED_SEARCH.SC_LIST});
                const filters = searchObj.filters ? searchObj.filters.slice() : [];
                addFilter(filters, 'subsidiary', search.Operator.ANYOF, params.subsidiary);
                addFilter(filters, 'entity', search.Operator.ANYOF, params.customerFilter);
                searchObj.filters = filters;
                const columns = searchObj.columns || [];
                const results = searchObj.run().getRange({start: 0, end: 1000});
                const optionById = {};
                results.forEach((r) => {
                    const id = r.id;
                    if (optionById[id]) return;
                    const docCol = columns.find((c) => normalizeKey(c.label) === 'documentnumber' || c.name === 'documentnumber' || c.name === 'tranid');
                    const text = docCol ? (r.getText(docCol) || r.getValue(docCol)) : id;
                    optionById[id] = {value: id, text: text || id};
                });
                return Object.keys(optionById).map((id) => optionById[id]).sort((a, b) => a.text.localeCompare(b.text));
            } catch (e) {
                log.error('Create SO Get Sales Contract Filter Options Error', e);
                return [];
            }
        }

        function getSalesContractDefaults(scId) {
            if (!scId) return {};
            try {
                const lookup = search.lookupFields({
                    type: RECORD_TYPE.SC,
                    id: scId,
                    columns: ['entity', 'currency', 'exchangerate', FIELD.SO_CUSTOM_SUBSIDIARY]
                });
                return {
                    customer: lookup.entity && lookup.entity[0],
                    currency: lookup.currency && lookup.currency[0],
                    exchangeRate: lookup.exchangerate,
                    customSubsidiary: lookup[FIELD.SO_CUSTOM_SUBSIDIARY] && lookup[FIELD.SO_CUSTOM_SUBSIDIARY][0]
                };
            } catch (e) {
                log.debug('Cannot get defaults from sales contract', {scId, error: e});
                return {};
            }
        }

        function getLineKey(line) {
            if (line.createdFrom === CREATED_FROM.WR) {
                return ['WR', line.item || '', line.lotNumber || '', line.originLineId || ''].join('|');
            }
            return ['SC', line.sourceRecordId || '', line.originLineId || '', line.item || ''].join('|');
        }

        function validateLinesAgainstCurrentSearch(params, lines) {
            const currentRows = getSearchResults(params);
            const currentByKey = {};
            currentRows.forEach((row) => {
                currentByKey[getLineKey(row)] = row;
            });
            lines.forEach((line) => {
                const current = currentByKey[getLineKey(line)];
                if (!current) {
                    throw Error('Selected source line is no longer available to create Sales Order.');
                }
                if (line.createdFrom === CREATED_FROM.WR) {
                    if (parseNumber(line.quantity) > parseNumber(current.available)) {
                        throw Error('Quantity cannot be greater than current Available.');
                    }
                    return;
                }
                if (isTrue(current.qtyRestrict) && parseNumber(current.qtyRemaining) <= 0) {
                    throw Error('Không còn đủ số lượng.');
                }
                if (line.qtyCase === QTY_CASE.CONTRACTED && parseNumber(line.quantity) > parseNumber(current.qtyRemaining)) {
                    throw Error('SL bán cannot be greater than current SL còn lại.');
                }
            });
        }

        function validateCreateRequest(params, lines) {
            if (!params.subsidiary) throw Error('Subsidiary is required.');
            if (!params.createdFrom) throw Error('Created From is required.');
            if (!params.date) throw Error('Date is required.');
            if (!params.location) throw Error('Location is required.');
            if (!params.customer) throw Error('Customer is required.');
            if (!params.currency) throw Error('Currency is required.');
            if (!lines.length) throw Error('Please select at least one line.');

            lines.forEach((line) => {
                if (line.createdFrom === CREATED_FROM.WR) {
                    if (!line.quantity || parseNumber(line.quantity) <= 0) throw Error('Quantity is required.');
                    if (parseNumber(line.quantity) > parseNumber(line.available)) {
                        throw Error('Quantity cannot be greater than Available.');
                    }
                    return;
                }
                if (!line.quantity || parseNumber(line.quantity) <= 0) throw Error('SL bán is required.');
                if (line.rate === null || line.rate === undefined || line.rate === '') throw Error('Đơn giá is required.');
                if (isTrue(line.qtyRestrict) && parseNumber(line.qtyRemaining) <= 0) {
                    throw Error('Không còn đủ số lượng.');
                }
                if (line.qtyCase === QTY_CASE.CONTRACTED && parseNumber(line.quantity) > parseNumber(line.qtyRemaining)) {
                    throw Error('SL bán cannot be greater than SL còn lại.');
                }
            });
            validateLinesAgainstCurrentSearch(params, lines);
        }



        function getGroupKey(line) {
            if (line.createdFrom === CREATED_FROM.WR) {
                return ['WR', line.salesContractId || ''].join('|');
            }
            return ['SC', line.sourceRecordId || '', line.dkBaoQuan || ''].join('|');
        }

        function groupLines(lines) {
            const groups = {};
            lines.forEach((line) => {
                const key = getGroupKey(line);
                if (!groups[key]) groups[key] = [];
                groups[key].push(line);
            });
            return Object.keys(groups).map((key) => groups[key]);
        }

        function setOptionalValue(rec, fieldId, value) {
            if (value !== null && value !== undefined && value !== '') {
                rec.setValue({fieldId, value});
            }
        }

        function safeGetBodyText(rec, fieldId) {
            try {
                return rec.getText({fieldId});
            } catch (e) {
                return '';
            }
        }

        function setOptionalSelectValue(rec, fieldId, value, text) {
            if (value !== null && value !== undefined && value !== '') {
                try {
                    rec.setValue({fieldId, value});
                    return;
                } catch (e) {
                    log.debug('Cannot set body select field by value', {fieldId, value, error: e});
                }
            }
            if (text !== null && text !== undefined && text !== '') {
                rec.setText({fieldId, text});
            }
        }

        function setOptionalTextValue(rec, fieldId, text) {
            if (text !== null && text !== undefined && text !== '') {
                rec.setText({fieldId, text});
            }
        }

        function setOptionalDateTimeValue(rec, fieldId, value) {
            if (value !== null && value !== undefined && value !== '') {
                rec.setValue({fieldId, value: parseDateTime(value)});
            }
        }

        function getTransactionNumber(id) {
            try {
                const info = search.lookupFields({type: search.Type.TRANSACTION, id, columns: ['tranid']});
                return info.tranid || id;
            } catch (e) {
                return id;
            }
        }

        function createSalesOrders(params, selectedLines) {
            validateCreateRequest(params, selectedLines);
            const soIds = [];

            groupLines(selectedLines).forEach((lines) => {
                const firstLine = lines[0];
                const salesContractId = firstLine.salesContractId || firstLine.sourceRecordId || params.salesContract;
                const scDefaults = getSalesContractDefaults(salesContractId);
                const digit = isBaseCurrency(params.currency) ? 0 : 2;
                const so = record.create({type: record.Type.SALES_ORDER, isDynamic: true});
                so.setValue({fieldId: 'entity', value: params.customer});
                setOptionalValue(so, FIELD.SO_CUSTOM_SUBSIDIARY, scDefaults.customSubsidiary && scDefaults.customSubsidiary.value);
                setOptionalValue(so, 'currency', params.currency);
                if (scDefaults.exchangeRate) {
                    setOptionalValue(so, 'exchangerate', scDefaults.exchangeRate);
                }
                setOptionalSelectValue(so, FIELD.SO_ORDER_TYPE, firstLine.orderType || params.orderType, firstLine.orderTypeText);
                so.setValue({fieldId: 'trandate', value: parseDate(params.date)});
                setOptionalDateTimeValue(so, FIELD.SO_ORDER_TIME, params.orderTime);
                so.setValue({fieldId: 'location', value: params.location});
                log.error('Create SO Sales Contract Mapping Before Set', {
                    fieldId: FIELD.SO_SALES_CONTRACT,
                    createdFrom: firstLine.createdFrom,
                    salesContractId: firstLine.salesContractId,
                    sourceRecordId: firstLine.sourceRecordId,
                    sourceRecordType: firstLine.sourceRecordType,
                    paramsSalesContract: params.salesContract,
                    resolvedSalesContractId: salesContractId
                });
                setOptionalValue(so, FIELD.SO_SALES_CONTRACT, salesContractId);
                log.error('Create SO Sales Contract Mapping After Set', {
                    fieldId: FIELD.SO_SALES_CONTRACT,
                    valueAfterSet: so.getValue({fieldId: FIELD.SO_SALES_CONTRACT}),
                    textAfterSet: safeGetBodyText(so, FIELD.SO_SALES_CONTRACT)
                });
                setOptionalValue(so, 'memo', params.memo);

                if (firstLine.createdFrom === CREATED_FROM.WR) {
                    setOptionalSelectValue(so, FIELD.SO_CREATED_TRANSACTION, firstLine.documentId, firstLine.documentNumber);
                    setOptionalSelectValue(so, FIELD.SO_PURCHASE_ORDER, firstLine.poCreatedFrom, firstLine.gridCreatedFromText);
                }

                lines.forEach((line) => {
                    if (line.createdFrom === CREATED_FROM.WR) {
                        addSoLineWr(so, line, digit);
                    } else {
                        addSoLine(so, line, params, digit);
                    }
                });

                const soId = so.save({enableSourcing: true, ignoreMandatoryFields: false});
                soIds.push(soId);


            });

            return soIds.map((id) => ({
                id,
                tranid: getTransactionNumber(id),
                url: getRecordUrl(record.Type.SALES_ORDER, id)
            }));
        }

        function addSoLine(so, line, params, digit) {
            const quantity = parseNumber(line.quantity);
            const rate = parseNumber(line.rate);
            const amount = roundNumber(quantity * rate, digit);
            const taxAmount = calcTaxAmount(amount, parseNumber(line.taxRate), digit);
            const taxCodeId = resolveTaxCodeId(line.taxCode, line.taxCodeText);

            so.selectNewLine({sublistId: SUBLIST_ITEM});
            so.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'item', value: line.item});
            setCurrentOptionalValue(so, 'description', line.description);
            setCurrentOptionalSelectValue(so, 'units', line.unit, line.unitText);
            setCurrentOptionalValue(so, FIELD.LINE_EINVOICE_UNIT, line.einvoiceUnit);
            so.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'quantity', value: quantity});
            so.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'price', value: '-1'});
            so.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'rate', value: rate});
            setCurrentOptionalValue(so, FIELD.LINE_RATE_VAT_CUSTOM, line.rateVat);
            setCurrentOptionalValue(so, 'amount', amount);
            setCurrentOptionalSelectValue(so, 'taxcode', taxCodeId, line.taxCodeText || line.taxCode);
            setCurrentOptionalValue(so, 'tax1amt', taxAmount);
            setCurrentOptionalValue(so, 'grossamt', amount + taxAmount);
            setCurrentOptionalValue(so, FIELD.LINE_ORIGIN, line.originLineId);
            setCurrentOptionalValue(so, FIELD.LINE_REF_NO, line.refNo);
            setCurrentOptionalSelectValue(so, FIELD.LINE_VISA, line.visa);
            setCurrentOptionalSelectValue(so, FIELD.LINE_VISA_2, line.visa2);
            setCurrentOptionalSelectValue(so, FIELD.LINE_VISA_GIAHAN, line.visaGiaHan);
            setCurrentOptionalSelectValue(so, FIELD.LINE_GPNK, line.gpnk);
            setCurrentOptionalValue(so, FIELD.LINE_RATE_PRE_DISCOUNT, line.ratePreDiscount);
            setCurrentOptionalValue(so, FIELD.LINE_DISCOUNT_PER, normalizePercentValue(line.discountPercent));
            so.commitLine({sublistId: SUBLIST_ITEM});
        }

        function addSoLineWr(so, line, digit) {
            const quantity = parseNumber(line.quantity);
            const rate = parseNumber(line.rate);
            const amount = roundNumber(quantity * rate, digit);
            const taxCodeId = resolveTaxCodeId(line.taxCode, line.taxCodeText);
            const taxRate = getTaxRateFromTaxCode(taxCodeId);
            const taxAmount = calcTaxAmount(amount, taxRate, digit);

            so.selectNewLine({sublistId: SUBLIST_ITEM});
            so.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'item', value: line.item});
            setCurrentOptionalValue(so, 'description', line.description);
            setCurrentOptionalSelectValue(so, 'units', line.transUnit, line.transUnitText);
            setCurrentOptionalValue(so, FIELD.LINE_EINVOICE_UNIT, line.einvoiceUnit);
            so.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'quantity', value: quantity});
            so.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'price', value: '-1'});
            so.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'rate', value: rate});
            setCurrentOptionalValue(so, 'amount', amount);
            setCurrentOptionalSelectValue(so, 'taxcode', taxCodeId, line.taxCodeText || line.taxCode);
            setCurrentOptionalValue(so, 'taxrate1', taxRate);
            setCurrentOptionalValue(so, 'tax1amt', taxAmount);
            setCurrentOptionalValue(so, 'grossamt', amount + taxAmount);
            setCurrentOptionalValue(so, FIELD.LINE_ORIGIN, line.originLineId);

            if (line.lotNumber) {
                setInventoryDetail(so, line, quantity);
            }

            so.commitLine({sublistId: SUBLIST_ITEM});
        }

        function setInventoryDetail(so, line, quantity) {
            try {
                const invDetail = so.getCurrentSublistSubrecord({sublistId: SUBLIST_ITEM, fieldId: 'inventorydetail'});
                invDetail.selectNewLine({sublistId: SUBLIST_INVENTORY_ASSIGNMENT});
                setInventoryAssignmentLot(invDetail, line);
                invDetail.setCurrentSublistValue({sublistId: SUBLIST_INVENTORY_ASSIGNMENT, fieldId: 'quantity', value: quantity});
                if (line.expirationDate) {
                    try {
                        invDetail.setCurrentSublistValue({
                            sublistId: SUBLIST_INVENTORY_ASSIGNMENT,
                            fieldId: 'expirationdate',
                            value: parseDate(line.expirationDate)
                        });
                    } catch (e) {
                        log.debug('Cannot set expiration date on inventory assignment', {line, error: e});
                    }
                }
                invDetail.commitLine({sublistId: SUBLIST_INVENTORY_ASSIGNMENT});
            } catch (e) {
                log.error('Create SO Cannot Set Inventory Detail', {item: line.item, lotNumber: line.lotNumber, error: e});
                throw e;
            }
        }

        function setInventoryAssignmentLot(invDetail, line) {
            const lotNumberId = resolveLotNumberId(line.item, line.lotNumber, line.lotNumberText);
            if (lotNumberId) {
                try {
                    invDetail.setCurrentSublistValue({sublistId: SUBLIST_INVENTORY_ASSIGNMENT, fieldId: 'issueinventorynumber', value: lotNumberId});
                    return;
                } catch (e) {
                    log.debug('Cannot set issueinventorynumber by value', {line, lotNumberId, error: e});
                }
            }
            const lotNumberText = line.lotNumberText || line.lotNumber;
            if (lotNumberText) {
                invDetail.setCurrentSublistText({sublistId: SUBLIST_INVENTORY_ASSIGNMENT, fieldId: 'issueinventorynumber', text: lotNumberText});
                return;
            }
            throw new Error('Cannot resolve lot number for item ' + line.item);
        }

        function setCurrentOptionalValue(rec, fieldId, value) {
            if (value !== null && value !== undefined && value !== '') {
                rec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId, value});
            }
        }

        function setCurrentOptionalSelectValue(rec, fieldId, value, text) {
            if (value !== null && value !== undefined && value !== '') {
                try {
                    rec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId, value});
                    return;
                } catch (e) {
                    log.debug('Cannot set select field by value', {fieldId, value, error: e});
                }
            }
            if (text !== null && text !== undefined && text !== '') {
                try {
                    rec.setCurrentSublistText({sublistId: SUBLIST_ITEM, fieldId, text});
                } catch (e) {
                    log.debug('Cannot set select field by text', {fieldId, text, error: e});
                }
            }
        }

        return {
            CREATED_FROM,
            QTY_CASE,
            FIELD,
            RECORD_TYPE,
            getSearchResults,
            getSalesContractFilterOptions,
            getSalesContractDefaults,
            createSalesOrders,
            isBaseCurrency,
            roundNumber,
            parseNumber,
            getTodayDate,
            getNowDateTime
        };
    });
