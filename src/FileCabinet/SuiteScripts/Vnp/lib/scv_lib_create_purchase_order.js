/**
 * Business logic for Create Purchase Order suitelet.
 */
define(['N/format', 'N/record', 'N/runtime', 'N/search', 'N/url'],
    (format, record, runtime, search, url) => {

        const CREATED_FROM = {
            PR: 'pr',
            PC: 'pc'
        };

        const SAVED_SEARCH = {
            PR: 'customsearch_pr_tocreate_po',
            PC: 'customsearch_pc_to_create_po'
        };

        const RECORD_TYPE = {
            PR: 'custompurchase_scv_pur_requisition',
            PC: 'custompurchase_scv_purchase_contract'
        };

        const FIELD = {
            PO_CONTRACT: 'custbody_scv_purchase_contract',
            PO_ORDER_TYPE: 'custbody_scv_order_type',
            LINE_PR: 'custcol_scv_purchase_requisition',
            LINE_ORIGIN: 'custcol_scv_origin_line_num',
            LINE_REF_NO: 'custcol_scv_ref_no',
            LINE_QTY_ORDERED: 'custcol_scv_qty_tt'
        };

        const SUBLIST_ITEM = 'item';

        const RESULT_FIELD = {
            id: ['pctid', 'id', 'internalid'],
            documentNumberPr: ['documentnumber', 'document number', 'tranid', 'number', 'prqnumber', 'prq number'],
            documentNumberPc: ['pctnumber', 'pct number', 'documentnumber', 'document number', 'tranid', 'number'],
            item: ['item', 'itemid'],
            description: ['description', 'memo'],
            unit: ['unitid', 'unit', 'units'],
            qtyRemaining: ['qtyremaining', 'quantity remaining', 'remaining quantity'],
            rate: ['rate'],
            taxCode: ['taxcode', 'tax code'],
            taxCodeText: ['taxcodetext', 'tax code text', 'taxcode', 'tax code'],
            taxRate: ['taxrate', 'tax rate'],
            orderType: ['ordertype', 'order type'],
            department: ['department'],
            responsibleDepartment: ['respdepartment', 'responsible department', 'phongbophanphutrach'],
            originLineId: ['orilineid', 'origin line id', 'originallineid', 'custcol_scv_origin_line_num'],
            refNo: ['refno', 'ref no', 'custcol_scv_ref_no']
        };

        const taxCodeCache = {};

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
            return format.parse({value: value, type: format.Type.DATE});
        }

        function formatDate(value) {
            if (!value) return '';
            if (typeof value === 'string') return value;
            return format.format({value: value, type: format.Type.DATE});
        }

        function getTodayDate() {
            const now = new Date();
            const vietnamOffsetMinutes = 7 * 60;
            const vietnamNow = new Date(now.getTime() + vietnamOffsetMinutes * 60 * 1000);
            const year = vietnamNow.getUTCFullYear();
            const month = vietnamNow.getUTCMonth();
            const date = vietnamNow.getUTCDate();
            return formatDate(new Date(Date.UTC(year, month, date, 12, 0, 0)));
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

        function addCommonFilters(searchObj, params, createdFrom) {
            const filters = searchObj.filters ? searchObj.filters.slice() : [];
            addFilter(filters, 'subsidiary', search.Operator.ANYOF, params.subsidiary);
            if (createdFrom === CREATED_FROM.PC) {
                addPcDateFilter(filters, params.fromDate, search.Operator.ONORAFTER);
                addPcDateFilter(filters, params.toDate, search.Operator.ONORBEFORE);
            } else {
                addFilter(filters, 'trandate', search.Operator.ONORAFTER, params.fromDate);
                addFilter(filters, 'trandate', search.Operator.ONORBEFORE, params.toDate);
            }
            addFilter(filters, 'custbody_scv_order_type', search.Operator.ANYOF, params.orderType);
            if (createdFrom === CREATED_FROM.PR) {
                addFilter(filters, 'internalid', search.Operator.ANYOF, params.purchaseRequisition);
            }
            searchObj.filters = filters;
        }

        function addPcDateFilter(filters, value, operator) {
            if (!value) return;
            filters.push(search.createFilter({
                name: 'formuladate',
                formula: "case when {recordtype}='custompurchase_scv_purchase_contract' then {trandate} end",
                summary: search.Summary.MAX,
                operator: operator,
                values: value
            }));
        }

        function runSavedSearch(searchId, params, createdFrom, applyDocNumberFilter) {
            const checkDocNumber = applyDocNumberFilter !== false;
            const searchObj = search.load({id: searchId});
            addCommonFilters(searchObj, params, createdFrom);

            const columns = searchObj.columns || [];
            const rows = [];
            const pagedData = searchObj.runPaged({pageSize: 1000});
            pagedData.pageRanges.forEach((pageRange) => {
                const page = pagedData.fetch({index: pageRange.index});
                page.data.forEach((result) => {
                    const expectedType = createdFrom === CREATED_FROM.PR ? RECORD_TYPE.PR : RECORD_TYPE.PC;
                    if (result.recordType && result.recordType !== 'transaction' && result.recordType !== expectedType) {
                        return;
                    }
                    const line = toResultLine(result, columns, createdFrom);
                    if (params.purchaseContract && String(line.sourceRecordId) !== String(params.purchaseContract)) {
                        return;
                    }
                    if (params.purchaseRequisition && String(line.sourceRecordId) !== String(params.purchaseRequisition)) {
                        return;
                    }
                    if (checkDocNumber && !isExpectedDocumentNumber(createdFrom, line.documentNumber)) {
                        return;
                    }
                    rows.push(line);
                });
            });
            return rows;
        }

        function isExpectedDocumentNumber(createdFrom, documentNumber) {
            const value = (documentNumber || '').toString().toUpperCase();
            if (!value) return true;
            if (createdFrom === CREATED_FROM.PR) return value.indexOf('PRQ') === 0;
            if (createdFrom === CREATED_FROM.PC) return value.indexOf('PCT') === 0;
            return true;
        }

        function calcTaxAmount(amount, taxRate) {
            return amount * (Math.abs(taxRate) <= 1 ? taxRate : taxRate / 100);
        }

        function isInternalId(value) {
            return value !== null && value !== undefined && /^\d+$/.test(value.toString());
        }

        function findTaxCodeIdByField(fieldId, value) {
            const result = search.create({
                type: 'salestaxitem',
                filters: [[fieldId, search.Operator.IS, value]],
                columns: ['internalid']
            }).run().getRange({start: 0, end: 1});
            return result && result[0] ? result[0].getValue({name: 'internalid'}) : '';
        }

        function resolveTaxCodeId(value, text) {
            if (isInternalId(value)) return value;
            const candidate = (value || text || '').toString();
            if (!candidate) return '';
            if (taxCodeCache[candidate] !== undefined) return taxCodeCache[candidate];
            let taxCodeId = '';
            try {
                taxCodeId = findTaxCodeIdByField('name', candidate);
            } catch (e) {
                log.debug('Cannot resolve tax code by name', {candidate, error: e});
            }
            if (!taxCodeId) {
                try {
                    taxCodeId = findTaxCodeIdByField('itemid', candidate);
                } catch (e) {
                    log.debug('Cannot resolve tax code by itemid', {candidate, error: e});
                }
            }
            taxCodeCache[candidate] = taxCodeId || '';
            if (!taxCodeId) {
                log.error('Create PO Cannot Resolve Tax Code', {value, text, candidate});
            }
            return taxCodeCache[candidate];
        }

        const unitsTypeCache = {};
        const unitTextCache = {};

        function resolveUnitText(itemId, unitId) {
            if (!itemId || !unitId) return '';
            const cacheKey = itemId + '|' + unitId;
            if (unitTextCache[cacheKey] !== undefined) return unitTextCache[cacheKey];
            let unitText = '';
            try {
                const itemFields = search.lookupFields({type: 'item', id: itemId, columns: ['unitstype']});
                const unitsTypeId = itemFields.unitstype && itemFields.unitstype[0] ? itemFields.unitstype[0].value : '';
                if (unitsTypeId) {
                    let uomMap = unitsTypeCache[unitsTypeId];
                    if (!uomMap) {
                        uomMap = {};
                        const unitsTypeRec = record.load({type: record.Type.UNITS_TYPE, id: unitsTypeId});
                        const lineCount = unitsTypeRec.getLineCount({sublistId: 'uom'});
                        for (let i = 0; i < lineCount; i++) {
                            const uomId = unitsTypeRec.getSublistValue({sublistId: 'uom', fieldId: 'internalid', line: i});
                            const uomName = unitsTypeRec.getSublistValue({sublistId: 'uom', fieldId: 'unitname', line: i});
                            uomMap[uomId] = uomName;
                        }
                        unitsTypeCache[unitsTypeId] = uomMap;
                    }
                    unitText = uomMap[unitId] || '';
                }
            } catch (e) {
                log.debug('Cannot resolve unit text', {itemId, unitId, error: e});
            }
            unitTextCache[cacheKey] = unitText;
            return unitText;
        }

        function toResultLine(result, columns, createdFrom) {
            const data = buildResultObject(result, columns);
            const sourceRecordId = getMapped(data, RESULT_FIELD.id, false) || result.id;
            const sourceRecordType = result.recordType && result.recordType !== 'transaction'
                ? result.recordType
                : (createdFrom === CREATED_FROM.PR ? RECORD_TYPE.PR : RECORD_TYPE.PC);
            const documentNumberKeys = createdFrom === CREATED_FROM.PR
                ? RESULT_FIELD.documentNumberPr
                : RESULT_FIELD.documentNumberPc;
            const taxRate = parseNumber(getMapped(data, RESULT_FIELD.taxRate, false));
            const qtyRemaining = parseNumber(getMapped(data, RESULT_FIELD.qtyRemaining, false));
            const rate = parseNumber(getMapped(data, RESULT_FIELD.rate, false));
            const taxCodeRaw = getMapped(data, RESULT_FIELD.taxCode, false);
            const taxCodeText = getMappedText(data, RESULT_FIELD.taxCodeText);
            const amount = qtyRemaining * rate;
            const itemId = getMapped(data, RESULT_FIELD.item, false);
            const unit = getMapped(data, RESULT_FIELD.unit, false);
            let unitText = getMappedText(data, RESULT_FIELD.unit);
            if (unit && unitText === unit && isInternalId(unit)) {
                unitText = resolveUnitText(itemId, unit) || unitText;
            }

            return {
                createdFrom,
                sourceRecordId,
                sourceRecordType,
                documentNumber: getMappedText(data, documentNumberKeys),
                documentUrl: getRecordUrl(sourceRecordType, sourceRecordId),
                item: itemId,
                itemText: getMappedText(data, RESULT_FIELD.item),
                description: getMappedText(data, RESULT_FIELD.description),
                unit,
                unitText,
                qtyRemaining,
                quantity: qtyRemaining,
                rate,
                taxCode: resolveTaxCodeId(taxCodeRaw, taxCodeText),
                taxCodeText,
                taxRate,
                amount,
                taxAmount: calcTaxAmount(amount, taxRate),
                grossAmount: amount + calcTaxAmount(amount, taxRate),
                expectedReceiptDate: getTodayDate(),
                orderType: getMapped(data, RESULT_FIELD.orderType, false),
                orderTypeText: getMappedText(data, RESULT_FIELD.orderType),
                department: getMapped(data, RESULT_FIELD.department, false),
                departmentText: getMappedText(data, RESULT_FIELD.department),
                responsibleDepartment: getMapped(data, RESULT_FIELD.responsibleDepartment, false),
                responsibleDepartmentText: getMappedText(data, RESULT_FIELD.responsibleDepartment),
                originLineId: getMapped(data, RESULT_FIELD.originLineId, false),
                refNo: getMapped(data, RESULT_FIELD.refNo, false)
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

        function mergePrWithContract(prRows, params) {
            if (!params.purchaseContract) return prRows;
            const pcRows = runSavedSearch(SAVED_SEARCH.PC, {
                subsidiary: params.subsidiary,
                purchaseContract: params.purchaseContract
            }, CREATED_FROM.PC);
            const pcByItem = {};
            pcRows.forEach((row) => {
                if (row.item && !pcByItem[row.item]) pcByItem[row.item] = row;
            });
            return prRows.filter((row) => pcByItem[row.item]).map((row) => {
                const pc = pcByItem[row.item];
                row.rate = pc.rate;
                row.taxCode = pc.taxCode;
                row.taxCodeText = pc.taxCodeText;
                row.taxRate = pc.taxRate;
                row.amount = row.quantity * row.rate;
                row.taxAmount = calcTaxAmount(row.amount, row.taxRate);
                row.grossAmount = row.amount + row.taxAmount;
                return row;
            });
        }

        function getSearchResults(params) {
            if (params.createdFrom === CREATED_FROM.PC) {
                return runSavedSearch(SAVED_SEARCH.PC, params, CREATED_FROM.PC, false);
            }
            return mergePrWithContract(runSavedSearch(SAVED_SEARCH.PR, params, CREATED_FROM.PR, false), params);
        }

        function validateCreateRequest(params, lines) {
            if (!params.subsidiary) throw Error('Subsidiary is required.');
            if (!params.createdFrom) throw Error('Created From is required.');
            if (!params.date) throw Error('Date is required.');
            if (!params.location) throw Error('Location is required.');
            if (!params.vendor) throw Error('Vendor is required.');
            if (!lines.length) throw Error('Please select at least one line.');
            lines.forEach((line) => {
                if (!line.quantity || parseNumber(line.quantity) <= 0) throw Error('Quantity is required.');
                if (line.rate === null || line.rate === undefined || line.rate === '') throw Error('Rate is required.');
                if (parseNumber(line.quantity) > parseNumber(line.qtyRemaining)) {
                    throw Error('Quantity cannot be greater than Remaining Quantity.');
                }
            });
            validateLinesAgainstCurrentSearch(params, lines);
        }

        function getLineKey(line) {
            return [
                line.sourceRecordId || '',
                line.originLineId || '',
                line.item || ''
            ].join('|');
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
                    throw Error('Selected source line is no longer available to create PO.');
                }
                if (parseNumber(line.quantity) > parseNumber(current.qtyRemaining)) {
                    throw Error('Quantity cannot be greater than current Remaining Quantity.');
                }
            });
        }

        function getCurrentUserDepartment() {
            try {
                const user = runtime.getCurrentUser();
                const info = search.lookupFields({type: search.Type.EMPLOYEE, id: user.id, columns: ['department']});
                return info.department && info.department[0] ? info.department[0].value : '';
            } catch (e) {
                log.debug('Cannot get user department', e);
                return '';
            }
        }

        function getGroupKey(params, line) {
            const parts = [
                line.orderType || params.orderType || '',
                line.responsibleDepartment || ''
            ];
            if (params.createdFrom === CREATED_FROM.PC) {
                parts.push(line.sourceRecordId || '');
            }
            return parts.join('|');
        }

        function resolvePurchaseContractId(params, line) {
            if (params.createdFrom === CREATED_FROM.PC && line.sourceRecordType === RECORD_TYPE.PC) {
                return line.sourceRecordId;
            }
            return params.purchaseContract;
        }

        function groupLines(params, lines) {
            const groups = {};
            lines.forEach((line) => {
                const key = getGroupKey(params, line);
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

        function applySourceDefaults(params, lines) {
            if (params.createdFrom !== CREATED_FROM.PC || (params.location && params.vendor)) return params;
            const pcId = params.purchaseContract || getFirstPurchaseContractId(lines);
            if (!pcId) return params;
            try {
                const lookup = search.lookupFields({
                    type: RECORD_TYPE.PC,
                    id: pcId,
                    columns: ['entity', 'location']
                });
                const location = lookup.location && lookup.location[0] ? lookup.location[0].value : '';
                const vendor = lookup.entity && lookup.entity[0] ? lookup.entity[0].value : '';
                return Object.assign({}, params, {
                    location: params.location || location,
                    vendor: params.vendor || vendor,
                    purchaseContract: params.purchaseContract || pcId
                });
            } catch (e) {
                log.error('Create PO Cannot Apply Purchase Contract Defaults', {pcId, error: e});
                return params;
            }
        }

        function getFirstPurchaseContractId(lines) {
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].sourceRecordType === RECORD_TYPE.PC && lines[i].sourceRecordId) {
                    return lines[i].sourceRecordId;
                }
            }
            return '';
        }

        function createPurchaseOrders(params, selectedLines) {
            params = applySourceDefaults(params, selectedLines);
            validateCreateRequest(params, selectedLines);
            const poIds = [];
            const userDepartment = getCurrentUserDepartment();

            groupLines(params, selectedLines).forEach((lines) => {
                const firstLine = lines[0];
                const po = record.create({type: record.Type.PURCHASE_ORDER, isDynamic: true});
                po.setValue({fieldId: 'entity', value: params.vendor});
                setOptionalValue(po, FIELD.PO_ORDER_TYPE, firstLine.orderType || params.orderType);
                po.setValue({fieldId: 'trandate', value: parseDate(params.date)});
                po.setValue({fieldId: 'location', value: params.location});
                setOptionalValue(po, 'department', userDepartment);
                setOptionalValue(po, 'memo', params.memo);
                setOptionalValue(po, FIELD.PO_CONTRACT, resolvePurchaseContractId(params, firstLine));

                lines.forEach((line) => addPoLine(po, line, params));
                po.setValue({fieldId: 'location', value: params.location});
                log.error('Create PO Before Save Defaults', {
                    subsidiary: po.getValue({fieldId: 'subsidiary'}),
                    paramsSubsidiary: params.subsidiary,
                    vendor: po.getValue({fieldId: 'entity'}),
                    location: po.getValue({fieldId: 'location'}),
                    paramsLocation: params.location
                });
                const poId = po.save({enableSourcing: true, ignoreMandatoryFields: false});
                poIds.push(poId);
                updateSourceQuantities(lines, 1);
            });

            return poIds.map((id) => ({
                id,
                tranid: getTransactionNumber(id),
                url: getRecordUrl(record.Type.PURCHASE_ORDER, id)
            }));
        }

        function addPoLine(po, line, params) {
            po.selectNewLine({sublistId: SUBLIST_ITEM});
            po.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'item', value: line.item});
            setCurrentOptionalValue(po, 'description', line.description);
            setCurrentOptionalSelectValue(po, 'units', line.unit, line.unitText);
            po.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'quantity', value: parseNumber(line.quantity)});
            po.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'rate', value: parseNumber(line.rate)});
            setCurrentOptionalValue(po, 'amount', parseNumber(line.quantity) * parseNumber(line.rate));
            setCurrentOptionalValue(po, 'taxcode', line.taxCode);
            setCurrentOptionalValue(po, 'location', params.location);
            if (params.createdFrom === CREATED_FROM.PR) {
                setCurrentOptionalValue(po, FIELD.LINE_PR, line.sourceRecordId);
            }
            setCurrentOptionalValue(po, 'expectedreceiptdate', parseDate(line.expectedReceiptDate || params.date));
            setCurrentOptionalValue(po, FIELD.LINE_ORIGIN, line.originLineId);
            setCurrentOptionalValue(po, FIELD.LINE_REF_NO, line.refNo);
            po.commitLine({sublistId: SUBLIST_ITEM});
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

        function getTransactionNumber(id) {
            try {
                const info = search.lookupFields({type: search.Type.TRANSACTION, id, columns: ['tranid']});
                return info.tranid || id;
            } catch (e) {
                return id;
            }
        }

        function updateSourceQuantities(lines, sign) {
            const grouped = {};
            lines.forEach((line) => {
                if (!line.sourceRecordId || !line.sourceRecordType || !line.originLineId) return;
                const key = line.sourceRecordType + '|' + line.sourceRecordId;
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(line);
            });

            Object.keys(grouped).forEach((key) => {
                const first = grouped[key][0];
                const rec = record.load({type: first.sourceRecordType, id: first.sourceRecordId, isDynamic: false});
                grouped[key].forEach((line) => updateSourceLineQuantity(rec, line, sign));
                rec.save({enableSourcing: false, ignoreMandatoryFields: true});
            });
        }

        function updateSourceLineQuantity(rec, line, sign) {
            const lineCount = rec.getLineCount({sublistId: SUBLIST_ITEM});
            for (let i = 0; i < lineCount; i++) {
                const originLineId = rec.getSublistValue({sublistId: SUBLIST_ITEM, fieldId: FIELD.LINE_ORIGIN, line: i});
                if (String(originLineId) !== String(line.originLineId)) continue;
                const current = parseNumber(rec.getSublistValue({sublistId: SUBLIST_ITEM, fieldId: FIELD.LINE_QTY_ORDERED, line: i}));
                const nextValue = Math.max(0, current + sign * parseNumber(line.quantity));
                rec.setSublistValue({sublistId: SUBLIST_ITEM, fieldId: FIELD.LINE_QTY_ORDERED, line: i, value: nextValue});
                return;
            }
        }

        function rollbackDeletedPurchaseOrder(poRecord) {
            const pcId = poRecord.getValue(FIELD.PO_CONTRACT);
            const lines = [];
            const lineCount = poRecord.getLineCount({sublistId: SUBLIST_ITEM});
            for (let i = 0; i < lineCount; i++) {
                const prId = poRecord.getSublistValue({sublistId: SUBLIST_ITEM, fieldId: FIELD.LINE_PR, line: i});
                const originLineId = poRecord.getSublistValue({sublistId: SUBLIST_ITEM, fieldId: FIELD.LINE_ORIGIN, line: i});
                const quantity = poRecord.getSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'quantity', line: i});
                if (!originLineId || !quantity) continue;
                if (prId) {
                    lines.push({
                        sourceRecordId: prId,
                        sourceRecordType: RECORD_TYPE.PR,
                        originLineId,
                        quantity
                    });
                } else if (pcId) {
                    lines.push({
                        sourceRecordId: pcId,
                        sourceRecordType: RECORD_TYPE.PC,
                        originLineId,
                        quantity
                    });
                }
            }
            updateSourceQuantities(lines, -1);
        }

        return {
            CREATED_FROM,
            FIELD,
            RECORD_TYPE,
            getSearchResults,
            createPurchaseOrders,
            rollbackDeletedPurchaseOrder,
            parseNumber
        };
    });
