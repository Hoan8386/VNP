/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/https', 'N/url', 'N/ui/message', 'N/search', 'N/ui/dialog'],
    (currentRecord, https, url, message, search, dialog) => {

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

        const CREATED_FROM = {
            SC: 'sc',
            WR: 'wr'
        };

        const QTY_CASE = {
            CONTRACTED: 'CONTRACTED',
            OPEN: 'OPEN',
            ZERO: 'ZERO'
        };

        const SUBLIST = 'custpage_result';
        const RECORD_TYPE_SC = 'customsale_scv_sales_contract'; // TODO keep in sync with scv_lib_create_sales_order.js RECORD_TYPE.SC
        const lineTotalCache = {};

        function isWrMode(rec) {
            return rec.getValue({fieldId: FIELD.CREATED_FROM}) === CREATED_FROM.WR;
        }

        function pageInit(scriptContext) {
            toggleCreatedFromFields(scriptContext.currentRecord);
            return true;
        }

        function fieldChanged(scriptContext) {
            try {
                const rec = scriptContext.currentRecord;
                if (scriptContext.fieldId === FIELD.CREATED_FROM) {
                    toggleCreatedFromFields(rec);
                    return;
                }
                if (scriptContext.fieldId === FIELD.SUBSIDIARY) {
                    reloadForSubsidiaryChange(rec);
                    return;
                }
                if (scriptContext.fieldId === FIELD.CUSTOMER_FILTER) {
                    reloadForCustomerChange(rec);
                    return;
                }
                if (scriptContext.fieldId === FIELD.LOCATION_FILTER) {
                    syncDefaultLocationFromFilter(rec);
                    return;
                }
                if (scriptContext.fieldId === FIELD.SALES_CONTRACT) {
                    setDefaultsFromSalesContract(rec);
                    return;
                }
                if (scriptContext.fieldId === FIELD.CURRENCY && !isWrMode(rec)) {
                    recalcAllLines(rec);
                    return;
                }
                if (scriptContext.sublistId === SUBLIST) {
                    if (scriptContext.fieldId === 'custpage_select') {
                        applyQuantityDefaultOnSelect(rec);
                        return;
                    }
                    if (scriptContext.fieldId === 'custpage_quantity') {
                        recalcCurrentLine(rec);
                    }
                }
            } catch (e) {
                console.log('Create SO fieldChanged error', e);
            }
        }

        function validateLine(scriptContext) {
            if (scriptContext.sublistId !== SUBLIST) return true;
            const rec = scriptContext.currentRecord;
            const selected = rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_select'});
            if (selected !== true && selected !== 'T') return true; // don't block browsing unselected rows

            if (isWrMode(rec)) {
                const line = getCurrentLineData(rec);
                const qty = parseNumber(rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_wr_quantity'}));
                if (!qty || qty <= 0) {
                    alert('Quantity is required.');
                    return false;
                }
                if (line && qty > parseNumber(line.available)) {
                    alert('Quantity cannot be greater than Available.');
                    return false;
                }
                return true;
            }

            const line = getCurrentLineData(rec);
            const qty = parseNumber(rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_quantity'}));
            if (!qty || qty <= 0) {
                alert('SL bán is required.');
                return false;
            }
            if (line && line.qtyCase === QTY_CASE.CONTRACTED) {
                const remaining = parseNumber(line.qtyRemaining);
                if (qty > remaining) {
                    alert('SL bán cannot be greater than SL còn lại.');
                    return false;
                }
            }
            return true;
        }

        function toggleCreatedFromFields(rec) {
            const isWr = isWrMode(rec);
            // Location / From Date / To Date filters only apply to Created From = Phiếu nhập kho.
            setFieldDisplay(rec, FIELD.LOCATION_FILTER, isWr);
            setFieldMandatory(rec, FIELD.LOCATION_FILTER, isWr);
            setFieldDisplay(rec, FIELD.CUSTOMER_FILTER, !isWr);
            setFieldMandatory(rec, FIELD.CUSTOMER_FILTER, !isWr);
            setFieldDisplay(rec, FIELD.SALES_CONTRACT, !isWr);
            setFieldDisplay(rec, FIELD.FROM_DATE, isWr);
            setFieldDisplay(rec, FIELD.TO_DATE, isWr);
            // Total Amount/Tax/Gross are hidden for Phiếu nhập kho (FDD 2.2.2 rows 7-9).
            setFieldDisplay(rec, FIELD.TOTAL_AMOUNT, !isWr);
            setFieldDisplay(rec, FIELD.TOTAL_TAX_AMOUNT, !isWr);
            setFieldDisplay(rec, FIELD.TOTAL_GROSS_AMOUNT, !isWr);
            return true;
        }

        function setFieldDisplay(rec, fieldId, isDisplay) {
            const field = rec.getField({fieldId});
            if (field) field.isDisplay = isDisplay;
        }

        function setFieldMandatory(rec, fieldId, isMandatory) {
            const field = rec.getField({fieldId});
            if (field) field.isMandatory = isMandatory;
        }

        function setDefaultsFromSalesContract(rec) {
            const scId = rec.getValue({fieldId: FIELD.SALES_CONTRACT});
            if (!scId) return;
            const defaults = getSalesContractDefaults(scId);
            setSelectDefault(rec, FIELD.CUSTOMER, defaults.customer);
            setSelectDefault(rec, FIELD.CURRENCY, defaults.currency);
        }

        function getSalesContractDefaults(scId) {
            try {
                const lookup = search.lookupFields({
                    type: RECORD_TYPE_SC,
                    id: scId,
                    columns: ['entity', 'currency']
                });
                return {
                    customer: lookup.entity && lookup.entity[0],
                    currency: lookup.currency && lookup.currency[0]
                };
            } catch (e) {
                console.log('Cannot get defaults from sales contract', e);
                return {};
            }
        }

        function setSelectDefault(rec, fieldId, option) {
            if (!option || !option.value) return;
            try {
                rec.setValue({fieldId, value: option.value, ignoreFieldChange: true});
                return;
            } catch (e) {
                console.log('Cannot set select default by value', {fieldId, option, error: e});
            }
            const field = rec.getField({fieldId});
            if (field) {
                field.insertSelectOption({value: option.value, text: option.text || option.value, isSelected: true});
            } else {
                rec.setValue({fieldId, value: option.value, ignoreFieldChange: true});
            }
        }

        function syncDefaultLocationFromFilter(rec) {
            const value = rec.getValue({fieldId: FIELD.LOCATION_FILTER});
            if (!value) {
                rec.setValue({fieldId: FIELD.LOCATION, value: '', ignoreFieldChange: true});
                return;
            }
            setSelectDefault(rec, FIELD.LOCATION, {
                value,
                text: rec.getText({fieldId: FIELD.LOCATION_FILTER})
            });
        }

        function reloadForSubsidiaryChange(rec) {
            const params = getParams(rec);
            params.custpage_location_filter = '';
            params.custpage_customer_filter = '';
            params.custpage_sales_contract = '';
            params.custpage_item_filter = '';
            params.custpage_location = '';
            params.custpage_customer = '';
            params.custpage_currency = '';
            params.custpage_is_search = '';
            reload(params);
        }

        function reloadForCustomerChange(rec) {
            const params = getParams(rec);
            params.custpage_sales_contract = '';
            params.custpage_customer = '';
            params.custpage_currency = '';
            params.custpage_is_search = '';
            reload(params);
        }

        function reload(params) {
            window.onbeforeunload = null;
            window.location.replace(resolveSuitelet(params));
        }

        function getParams(rec) {
            return {
                custpage_created_from: rec.getValue({fieldId: FIELD.CREATED_FROM}),
                custpage_subsidiary: rec.getValue({fieldId: FIELD.SUBSIDIARY}),
                custpage_location_filter: rec.getValue({fieldId: FIELD.LOCATION_FILTER}),
                custpage_customer_filter: rec.getValue({fieldId: FIELD.CUSTOMER_FILTER}),
                custpage_sales_contract: rec.getValue({fieldId: FIELD.SALES_CONTRACT}),
                custpage_item_filter: multiSelectToParam(rec.getValue({fieldId: FIELD.ITEM_FILTER})),
                custpage_from_date: rec.getText({fieldId: FIELD.FROM_DATE}),
                custpage_to_date: rec.getText({fieldId: FIELD.TO_DATE}),
                custpage_date: rec.getText({fieldId: FIELD.DATE}),
                custpage_order_time: getOrderTimeParam(rec),
                custpage_location: rec.getValue({fieldId: FIELD.LOCATION}),
                custpage_customer: rec.getValue({fieldId: FIELD.CUSTOMER}),
                custpage_currency: rec.getValue({fieldId: FIELD.CURRENCY}),
                custpage_memo: rec.getValue({fieldId: FIELD.MEMO}),
                custpage_is_search: 'T'
            };
        }

        function resolveSuitelet(params) {
            return url.resolveScript({
                scriptId: 'customscript_scv_sl_create_so',
                deploymentId: 'customdeploy_scv_sl_create_so',
                returnExternalUrl: false,
                params
            });
        }

        function getOrderTimeParam(rec) {
            try {
                return rec.getText({fieldId: FIELD.ORDER_TIME}) || rec.getValue({fieldId: FIELD.ORDER_TIME});
            } catch (e) {
                return rec.getValue({fieldId: FIELD.ORDER_TIME});
            }
        }

        function multiSelectToParam(value) {
            if (!value) return '';
            if (Array.isArray(value)) return value.filter(Boolean).join(',');
            return String(value);
        }

        function getMissingFields(params, isCreate) {
            const missing = [];
            if (!params.custpage_subsidiary) missing.push('Subsidiary');
            if (!params.custpage_created_from) missing.push('Created From');
            if (params.custpage_created_from === CREATED_FROM.WR && !params.custpage_location_filter) {
                missing.push('Filter Location');
            }
            if (params.custpage_created_from === CREATED_FROM.SC && !params.custpage_customer_filter) {
                missing.push('Customer');
            }
            if (isCreate) {
                if (!params.custpage_date) missing.push('Date');
                if (!params.custpage_location) missing.push('Location');
                if (!params.custpage_customer) missing.push('Customer');
                if (!params.custpage_currency) missing.push('Currency');
            }
            return missing;
        }

        function showMissingFields(missing) {
            if (missing.length) {
                alert('Please fill: ' + missing.join(', '));
                return true;
            }
            return false;
        }

        function searchResult() {
            const rec = currentRecord.get();
            const params = getParams(rec);
            if (showMissingFields(getMissingFields(params, false))) return;
            reload(params);
        }

        function markAll() {
            setAllSelected(true);
        }

        function unmarkAll() {
            setAllSelected(false);
        }

        function setAllSelected(isSelected) {
            const rec = currentRecord.get();
            const wrMode = isWrMode(rec);
            const lineCount = rec.getLineCount({sublistId: SUBLIST});
            clearLineTotalCache();
            for (let i = 0; i < lineCount; i++) {
                setLineValue(rec, i, 'custpage_select', isSelected ? true : false);
                if (isSelected) applyQuantityDefaultForLine(rec, i, wrMode);
            }
            if (!wrMode) recalcAllTotals(rec);
        }

        let isProcessing = false;
        let processingMessage = null;

        function showProcessing() {
            processingMessage = message.create({
                title: 'Processing',
                message: 'Đang tạo Sales Order, vui lòng đợi...',
                type: message.Type.INFORMATION
            });
            processingMessage.show();
        }

        function hideProcessing() {
            if (processingMessage) {
                processingMessage.hide();
                processingMessage = null;
            }
        }

        function createSalesOrder() {
            if (isProcessing) return;
            const rec = currentRecord.get();
            const wrMode = isWrMode(rec);
            const params = getParams(rec);
            if (showMissingFields(getMissingFields(params, true))) return;

            let lines;
            try {
                lines = getSelectedLines(rec, wrMode);
                if (!lines.length) {
                    alert('Please select at least one line.');
                    return;
                }
            } catch (e) {
                alert(e.message || e.toString());
                return;
            }

            const proceed = () => {
                submitCreateSalesOrder(params, lines);
            };

            if (wrMode) {
                proceed();
                return;
            }

            // FDD 2.3.1 (TH1 only): qtyrestrict + Tax Code warning.
            const blockedLine = lines.find((line) => isTrue(line.qtyRestrict) && parseNumber(line.qtyRemaining) <= 0);
            if (blockedLine) {
                alert('Không còn đủ số lượng.');
                return;
            }

            const distinctTaxCodes = {};
            debugger;
            lines.forEach((line) => { distinctTaxCodes[line.taxCode || ''] = true; });
            if (Object.keys(distinctTaxCodes).length > 1) {
                dialog.confirm({
                    title: 'Cảnh báo',
                    message: 'Cảnh báo: Có nhiều dòng thuế khác nhau. Nhấn OK để tiếp tục tạo đơn hàng. Nhấn Cancel để kiểm tra lại dữ liệu.'
                }).then((confirmed) => {
                    if (confirmed) proceed();
                });
                return;
            }
            proceed();
        }

        function submitCreateSalesOrder(params, lines) {
            isProcessing = true;
            showProcessing();

            https.requestSuitelet.promise({
                scriptId: 'customscript_scv_sl_create_so',
                deploymentId: 'customdeploy_scv_sl_create_so',
                method: https.Method.POST,
                body: JSON.stringify({params, lines})
            }).then((response) => {
                const body = JSON.parse(response.body || '{}');
                if (!body.success) {
                    return dialog.alert({title: 'Error', message: body.message || 'Cannot create Sales Order.'});
                }
                const links = buildSoLinksHtml(body.soList || []);
                return dialog.alert({
                    title: 'Records Created',
                    message: links || 'Sales Order created.'
                }).then(() => {
                    searchResult();
                });
            }).catch((reason) => {
                dialog.alert({title: 'Error', message: reason.message || reason.toString()});
            }).finally(() => {
                isProcessing = false;
                hideProcessing();
            });
        }

        function buildSoLinksHtml(soList) {
            return soList.map((so) => {
                const label = so.tranid || so.id;
                return so.url ? '<a href="' + so.url + '" target="_blank">' + label + '</a>' : label;
            }).join('<br>');
        }

        function getSelectedLines(rec, wrMode) {
            const quantityFieldId = wrMode ? 'custpage_wr_quantity' : 'custpage_quantity';
            const lineCount = rec.getLineCount({sublistId: SUBLIST});
            const lines = [];
            for (let i = 0; i < lineCount; i++) {
                const cached = lineTotalCache[i];
                const selected = cached ? cached.selected : rec.getSublistValue({sublistId: SUBLIST, fieldId: 'custpage_select', line: i});
                if (selected !== true && selected !== 'T') continue;
                const lineJson = rec.getSublistValue({sublistId: SUBLIST, fieldId: 'custpage_line_json', line: i});
                if (!lineJson) continue;
                const line = JSON.parse(lineJson);
                line.quantity = parseNumber(cached ? cached.quantity : rec.getSublistValue({sublistId: SUBLIST, fieldId: quantityFieldId, line: i}));
                if (wrMode) {
                    line.einvoiceUnit = rec.getSublistValue({sublistId: SUBLIST, fieldId: 'custpage_wr_einvoice_unit', line: i}) || line.einvoiceUnit;
                }
                validateSelectedLine(line, wrMode);
                lines.push(line);
            }
            return lines;
        }

        function validateSelectedLine(line, wrMode) {
            if (wrMode) {
                if (!line.quantity || line.quantity <= 0) throw Error('Quantity is required.');
                if (line.quantity > parseNumber(line.available)) {
                    throw Error('Quantity cannot be greater than Available.');
                }
                return;
            }
            if (!line.quantity || line.quantity <= 0) throw Error('SL bán is required.');
            if (line.qtyCase === QTY_CASE.CONTRACTED && line.quantity > parseNumber(line.qtyRemaining)) {
                throw Error('SL bán cannot be greater than SL còn lại.');
            }
        }

        function applyQuantityDefaultOnSelect(rec) {
            const wrMode = isWrMode(rec);
            const selected = rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_select'});
            const lineIndex = getCurrentLineIndex(rec);
            if (selected === true || selected === 'T') {
                const line = getCurrentLineData(rec);
                if (line) {
                    if (wrMode) {
                        setCurrentLineValue(rec, 'custpage_wr_quantity', parseNumber(line.available));
                    } else {
                        const qty = defaultQuantityForCase(line.qtyCase, parseNumber(line.qtyRemaining));
                        setCurrentLineValue(rec, 'custpage_quantity', qty);
                    }
                }
            } else if (lineIndex >= 0) {
                delete lineTotalCache[lineIndex];
            }
            if (!wrMode) recalcCurrentLine(rec);
        }

        function applyQuantityDefaultForLine(rec, line, wrMode) {
            const data = getLineData(rec, line);
            if (!data) return;
            if (wrMode) {
                setLineValue(rec, line, 'custpage_wr_quantity', parseNumber(data.available));
                return;
            }
            const qty = defaultQuantityForCase(data.qtyCase, parseNumber(data.qtyRemaining));
            setLineValue(rec, line, 'custpage_quantity', qty);
            recalcLine(rec, line, data);
        }

        function defaultQuantityForCase(qtyCase, qtyRemaining) {
            if (qtyCase === QTY_CASE.CONTRACTED) return qtyRemaining;
            if (qtyCase === QTY_CASE.ZERO) return 0;
            return '';
        }

        function recalcCurrentLine(rec) {
            const line = getCurrentLineData(rec);
            const currencyId = rec.getValue({fieldId: FIELD.CURRENCY});
            const qty = parseNumber(rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_quantity'}));
            const rate = line ? parseNumber(line.rate) : 0;
            const taxRate = line ? parseNumber(line.taxRate) : 0;
            const totals = calculateAmounts(qty, rate, taxRate, currencyId);
            const amount = totals.amount;
            const taxAmount = totals.taxAmount;
            const grossAmount = totals.grossAmount;
            setCurrentLineValue(rec, 'custpage_amount', amount);
            setCurrentLineValue(rec, 'custpage_taxamount', taxAmount);
            setCurrentLineValue(rec, 'custpage_grossamount', grossAmount);
            updateCurrentLineJson(rec, {quantity: qty, amount, taxAmount, grossAmount});
            cacheCurrentLineTotal(rec, {amount, taxAmount, grossAmount});
            recalcAllTotals(rec);
        }

        function recalcLine(rec, line, data) {
            const currencyId = rec.getValue({fieldId: FIELD.CURRENCY});
            const qty = parseNumber(getLineValueSafe(rec, 'custpage_quantity', line));
            const rate = parseNumber(data.rate);
            const taxRate = parseNumber(data.taxRate);
            const totals = calculateAmounts(qty, rate, taxRate, currencyId);
            const amount = totals.amount;
            const taxAmount = totals.taxAmount;
            const grossAmount = totals.grossAmount;
            setLineValue(rec, line, 'custpage_amount', amount);
            setLineValue(rec, line, 'custpage_taxamount', taxAmount);
            setLineValue(rec, line, 'custpage_grossamount', grossAmount);
            data.quantity = qty;
            data.amount = amount;
            data.taxAmount = taxAmount;
            data.grossAmount = grossAmount;
            setLineValue(rec, line, 'custpage_line_json', JSON.stringify(data));
        }

        function recalcAllLines(rec) {
            const lineCount = rec.getLineCount({sublistId: SUBLIST});
            clearLineTotalCache();
            for (let i = 0; i < lineCount; i++) {
                const data = getLineData(rec, i);
                if (data) recalcLine(rec, i, data);
            }
            recalcAllTotals(rec);
        }

        function calculateAmounts(qty, rate, taxRate, currencyId) {
            const digit = isBaseCurrency(currencyId) ? 0 : 2;
            const amount = roundNumber(qty * rate, digit);
            const taxAmount = roundNumber(amount * normalizeTaxRate(taxRate), digit);
            return {
                amount,
                taxAmount,
                grossAmount: roundNumber(amount + taxAmount, digit)
            };
        }

        function normalizeTaxRate(taxRate) {
            return Math.abs(taxRate) <= 1 ? taxRate : taxRate / 100;
        }

        function recalcAllTotals(rec) {
            const lineCount = rec.getLineCount({sublistId: SUBLIST});
            const currentLine = getCurrentLineIndex(rec);
            let totalAmount = 0, totalTax = 0, totalGross = 0;
            for (let i = 0; i < lineCount; i++) {
                const cached = lineTotalCache[i];
                const isCurrentLine = !cached && i === currentLine;
                const selected = cached
                    ? cached.selected
                    : (isCurrentLine
                        ? rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_select'})
                        : getLineValueSafe(rec, 'custpage_select', i));
                if (selected !== true && selected !== 'T') continue;
                totalAmount += parseNumber(cached ? cached.amount : getLineAmountValue(rec, 'custpage_amount', i, isCurrentLine));
                totalTax += parseNumber(cached ? cached.taxAmount : getLineAmountValue(rec, 'custpage_taxamount', i, isCurrentLine));
                totalGross += parseNumber(cached ? cached.grossAmount : getLineAmountValue(rec, 'custpage_grossamount', i, isCurrentLine));
            }
            rec.setValue({fieldId: FIELD.TOTAL_AMOUNT, value: totalAmount, ignoreFieldChange: true});
            rec.setValue({fieldId: FIELD.TOTAL_TAX_AMOUNT, value: totalTax, ignoreFieldChange: true});
            rec.setValue({fieldId: FIELD.TOTAL_GROSS_AMOUNT, value: totalGross, ignoreFieldChange: true});
        }

        function cacheCurrentLineTotal(rec, values) {
            const line = getCurrentLineIndex(rec);
            if (line < 0) return;
            const selected = rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_select'});
            if (selected !== true && selected !== 'T') {
                delete lineTotalCache[line];
                return;
            }
            lineTotalCache[line] = {
                selected,
                quantity: rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_quantity'}),
                amount: values.amount,
                taxAmount: values.taxAmount,
                grossAmount: values.grossAmount
            };
        }

        function clearLineTotalCache() {
            Object.keys(lineTotalCache).forEach((line) => {
                delete lineTotalCache[line];
            });
        }

        function getLineAmountValue(rec, fieldId, line, isCurrentLine) {
            if (isCurrentLine) {
                return rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId});
            }
            return getLineValueSafe(rec, fieldId, line);
        }

        function getCurrentLineIndex(rec) {
            try {
                const index = rec.getCurrentSublistIndex({sublistId: SUBLIST});
                const line = Number(index);
                return isNaN(line) ? -1 : line;
            } catch (e) {
                return -1;
            }
        }

        function getLineValueSafe(rec, fieldId, line) {
            try {
                return rec.getSublistValue({sublistId: SUBLIST, fieldId, line});
            } catch (e) {
                return '';
            }
        }

        function getLineData(rec, line) {
            const lineJson = getLineValueSafe(rec, 'custpage_line_json', line);
            if (!lineJson) return null;
            try {
                return JSON.parse(lineJson);
            } catch (e) {
                console.log('Cannot parse line data', e);
                return null;
            }
        }

        function getCurrentLineData(rec) {
            const lineJson = rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_line_json'});
            if (!lineJson) return null;
            try {
                return JSON.parse(lineJson);
            } catch (e) {
                console.log('Cannot parse current line data', e);
                return null;
            }
        }

        function setCurrentLineValue(rec, fieldId, value) {
            rec.setCurrentSublistValue({sublistId: SUBLIST, fieldId, value, ignoreFieldChange: true});
        }

        function updateCurrentLineJson(rec, values) {
            const line = getCurrentLineData(rec);
            if (!line) return;
            Object.keys(values).forEach((key) => { line[key] = values[key]; });
            setCurrentLineValue(rec, 'custpage_line_json', JSON.stringify(line));
        }

        function setLineValue(rec, line, fieldId, value) {
            rec.selectLine({sublistId: SUBLIST, line});
            rec.setCurrentSublistValue({sublistId: SUBLIST, fieldId, value, ignoreFieldChange: true});
            rec.commitLine({sublistId: SUBLIST});
        }

        function isBaseCurrency(currencyId) {
            return !currencyId || currencyId.toString() === '1';
        }

        function isTrue(value) {
            return value === true || value === 'T' || value === 't' || value === 1 || value === '1';
        }

        function roundNumber(number, digit) {
            if (number === null || number === undefined || number === '') return 0;
            return parseFloat(Number(number).toFixed(digit)) || 0;
        }

        function parseNumber(value) {
            if (value === null || value === undefined || value === '') return 0;
            if (typeof value === 'number') return value;
            return parseFloat(value.toString().replace(/,/g, '').replace('%', '')) || 0;
        }

        return {
            pageInit,
            fieldChanged,
            validateLine,
            searchResult,
            markAll,
            unmarkAll,
            createSalesOrder
        };
    });
