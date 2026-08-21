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

        const CREATED_FROM = {
            PR: 'pr',
            PC: 'pc'
        };

        const SUBLIST = 'custpage_result';

        function pageInit(scriptContext) {
            toggleCreatedFromFields(scriptContext.currentRecord);
            toggleRateField(scriptContext.currentRecord);
            return true;
        }

        function fieldChanged(scriptContext) {
            try {
                const rec = scriptContext.currentRecord;
                if (scriptContext.fieldId === FIELD.CREATED_FROM) {
                    toggleCreatedFromFields(rec);
                    toggleRateField(rec);
                    return;
                }
                if (scriptContext.fieldId === FIELD.SUBSIDIARY) {
                    reloadForSubsidiaryChange(rec);
                    return;
                }
                if (scriptContext.fieldId === FIELD.PURCHASE_CONTRACT) {
                    setDefaultsFromPurchaseContract(rec);
                    return;
                }
                if (scriptContext.sublistId === SUBLIST) {
                    if (scriptContext.fieldId === 'custpage_taxcode') {
                        setTaxRateFromTaxCode(rec);
                        recalcCurrentLine(rec);
                        return;
                    }
                    if (['custpage_quantity', 'custpage_rate'].indexOf(scriptContext.fieldId) !== -1) {
                        recalcCurrentLine(rec);
                    }
                }
            } catch (e) {
                console.log('Create PO fieldChanged error', e);
            }
        }

        function validateLine(scriptContext) {
            if (scriptContext.sublistId !== SUBLIST) return true;
            const rec = scriptContext.currentRecord;
            const qty = parseNumber(rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_quantity'}));
            const remaining = getCurrentLineRemaining(rec);
            if (qty > remaining) {
                alert('Quantity cannot be greater than Remaining Quantity.');
                return false;
            }
            return true;
        }

        function toggleCreatedFromFields(rec) {
            const createdFrom = rec.getValue({fieldId: FIELD.CREATED_FROM});
            setFieldDisplay(rec, FIELD.PURCHASE_CONTRACT, true);
            setFieldDisplay(rec, FIELD.PURCHASE_REQUISITION, createdFrom === CREATED_FROM.PR);
            return true;
        }

        function toggleRateField(rec) {
            const isDisabled = rec.getValue({fieldId: FIELD.CREATED_FROM}) === CREATED_FROM.PC;
            const lineCount = rec.getLineCount({sublistId: SUBLIST}) || 0;
            for (let i = 0; i < lineCount; i++) {
                setSublistFieldDisabled(rec, 'custpage_rate', i, isDisabled);
            }
        }

        function setSublistFieldDisabled(rec, fieldId, line, isDisabled) {
            try {
                const field = rec.getSublistField({sublistId: SUBLIST, fieldId, line});
                if (field) field.isDisabled = isDisabled;
            } catch (e) {
                console.log('Cannot toggle sublist field disabled', {fieldId, line, isDisabled, error: e});
            }
        }

        function setFieldDisplay(rec, fieldId, isDisplay) {
            const field = rec.getField({fieldId});
            if (field) field.isDisplay = isDisplay;
        }

        function setDefaultsFromPurchaseContract(rec) {
            const pcId = rec.getValue({fieldId: FIELD.PURCHASE_CONTRACT});
            if (!pcId) return;
            const defaults = getPurchaseContractDefaults(pcId);
            setSelectDefault(rec, FIELD.VENDOR, defaults.vendor);
            setSelectDefault(rec, FIELD.LOCATION, defaults.location);
        }

        function getPurchaseContractDefaults(pcId) {
            try {
                const lookup = search.lookupFields({
                    type: 'custompurchase_scv_purchase_contract',
                    id: pcId,
                    columns: ['entity', 'location']
                });
                return {
                    vendor: lookup.entity && lookup.entity[0],
                    location: lookup.location && lookup.location[0]
                };
            } catch (e) {
                console.log('Cannot get defaults from purchase contract', e);
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
                field.insertSelectOption({
                    value: option.value,
                    text: option.text || option.value,
                    isSelected: true
                });
            } else {
                rec.setValue({fieldId, value: option.value, ignoreFieldChange: true});
            }
        }

        function reloadForSubsidiaryChange(rec) {
            const params = getParams(rec);
            params.custpage_location = '';
            params.custpage_vendor = '';
            params.custpage_purchase_contract = '';
            params.custpage_purchase_requisition = '';
            params.custpage_is_search = '';
            window.onbeforeunload = null;
            window.location.replace(resolveSuitelet(params));
        }

        function getParams(rec) {
            const params = {
                custpage_created_from: rec.getValue({fieldId: FIELD.CREATED_FROM}),
                custpage_subsidiary: rec.getValue({fieldId: FIELD.SUBSIDIARY}),
                custpage_from_date: rec.getText({fieldId: FIELD.FROM_DATE}),
                custpage_to_date: rec.getText({fieldId: FIELD.TO_DATE}),
                custpage_order_type: rec.getValue({fieldId: FIELD.ORDER_TYPE}),
                custpage_purchase_contract: rec.getValue({fieldId: FIELD.PURCHASE_CONTRACT}),
                custpage_purchase_requisition: rec.getValue({fieldId: FIELD.PURCHASE_REQUISITION}),
                custpage_date: rec.getText({fieldId: FIELD.DATE}),
                custpage_location: rec.getValue({fieldId: FIELD.LOCATION}),
                custpage_vendor: rec.getValue({fieldId: FIELD.VENDOR}),
                custpage_memo: rec.getValue({fieldId: FIELD.MEMO}),
                custpage_is_search: 'T'
            };
            applyPurchaseContractDefaultParams(params);
            return params;
        }

        function applyPurchaseContractDefaultParams(params) {
            if (params.custpage_created_from !== CREATED_FROM.PC || !params.custpage_purchase_contract) return;
            if (params.custpage_location && params.custpage_vendor) return;
            const defaults = getPurchaseContractDefaults(params.custpage_purchase_contract);
            if (!params.custpage_location && defaults.location && defaults.location.value) {
                params.custpage_location = defaults.location.value;
            }
            if (!params.custpage_vendor && defaults.vendor && defaults.vendor.value) {
                params.custpage_vendor = defaults.vendor.value;
            }
        }

        function getMissingFields(params, isCreate) {
            const missing = [];
            if (!params.custpage_subsidiary) missing.push('Subsidiary');
            if (!params.custpage_created_from) missing.push('Created From');
            if (isCreate) {
                if (!params.custpage_date) missing.push('Date');
                if (!params.custpage_location) missing.push('Location');
                if (!params.custpage_vendor) missing.push('Vendor');
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
            window.onbeforeunload = null;
            window.location.replace(resolveSuitelet(params));
        }

        function resolveSuitelet(params) {
            return url.resolveScript({
                scriptId: 'customscript_scv_sl_create_po',
                deploymentId: 'customdeploy_scv_sl_create_po',
                returnExternalUrl: false,
                params
            });
        }

        function markAll() {
            setAllSelected(true);
        }

        function unmarkAll() {
            setAllSelected(false);
        }

        function setAllSelected(isSelected) {
            const rec = currentRecord.get();
            const lineCount = rec.getLineCount({sublistId: SUBLIST});
            for (let i = 0; i < lineCount; i++) {
                setLineValue(rec, i, 'custpage_select', isSelected ? true : false);
            }
        }

        let isProcessing = false;
        let processingMessage = null;

        function showProcessing() {
            processingMessage = message.create({
                title: 'Processing',
                message: 'Đang tạo Purchase Order, vui lòng đợi...',
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

        function createPurchaseOrder() {
            if (isProcessing) return;
            const rec = currentRecord.get();
            const params = getParams(rec);
            params.custpage_is_search = rec.getValue({fieldId: FIELD.IS_SEARCH});
            if (showMissingFields(getMissingFields(params, true))) return;
            let lines;
            try {
                lines = getSelectedLines(rec);
                if (!lines.length) {
                    alert('Please select at least one line.');
                    return;
                }
            } catch (e) {
                alert(e.message || e.toString());
                return;
            }
            if (!confirm('Bạn chắc chắn muốn tạo PO từ các yêu cầu này?')) return;

            isProcessing = true;
            showProcessing();

            https.requestSuitelet.promise({
                scriptId: 'customscript_scv_sl_create_po',
                deploymentId: 'customdeploy_scv_sl_create_po',
                method: https.Method.POST,
                body: JSON.stringify({params, lines})
            }).then((response) => {
                const body = JSON.parse(response.body || '{}');
                if (!body.success) {
                    return dialog.alert({title: 'Error', message: body.message || 'Cannot create Purchase Order.'});
                }
                const links = buildPoLinksHtml(body.poList || []);
                return dialog.alert({
                    title: 'Records Created',
                    message: links || 'Purchase Order created.'
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

        function buildPoLinksHtml(poList) {
            return poList.map((po) => {
                const label = po.tranid || po.id;
                return po.url ? '<a href="' + po.url + '" target="_blank">' + label + '</a>' : label;
            }).join('<br>');
        }

        function getSelectedLines(rec) {
            const lineCount = rec.getLineCount({sublistId: SUBLIST});
            const lines = [];
            for (let i = 0; i < lineCount; i++) {
                const selected = rec.getSublistValue({sublistId: SUBLIST, fieldId: 'custpage_select', line: i});
                if (selected !== true && selected !== 'T') continue;
                const lineJson = rec.getSublistValue({sublistId: SUBLIST, fieldId: 'custpage_line_json', line: i});
                if (!lineJson) continue;
                const line = JSON.parse(lineJson);
                line.quantity = parseNumber(rec.getSublistValue({sublistId: SUBLIST, fieldId: 'custpage_quantity', line: i}));
                const rawRate = rec.getSublistValue({sublistId: SUBLIST, fieldId: 'custpage_rate', line: i});
                line.rate = (rawRate === null || rawRate === undefined || rawRate === '') ? '' : parseNumber(rawRate);
                line.taxCode = rec.getSublistValue({sublistId: SUBLIST, fieldId: 'custpage_taxcode', line: i});
                line.expectedReceiptDate = getOptionalSublistText(rec, 'custpage_expecteddate', i) || line.expectedReceiptDate;
                validateSelectedLine(line);
                lines.push(line);
            }
            return lines;
        }

        function validateSelectedLine(line) {
            if (!line.quantity || line.quantity <= 0) throw Error('Quantity is required.');
            if (line.quantity > parseNumber(line.qtyRemaining)) throw Error('Quantity cannot be greater than Remaining Quantity.');
            if (line.rate === null || line.rate === undefined || line.rate === '') throw Error('Rate is required.');
        }

        function getOptionalSublistValue(rec, fieldId, line) {
            try {
                return rec.getSublistValue({sublistId: SUBLIST, fieldId, line});
            } catch (e) {
                return '';
            }
        }

        function getOptionalSublistText(rec, fieldId, line) {
            try {
                return rec.getSublistText({sublistId: SUBLIST, fieldId, line});
            } catch (e) {
                return '';
            }
        }

        function recalcCurrentLine(rec) {
            const line = getCurrentLineData(rec);
            let qty = parseNumber(rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_quantity'}));
            const remaining = line ? parseNumber(line.qtyRemaining) : getCurrentLineRemaining(rec);
            if (qty > remaining) {
                alert('Quantity cannot be greater than Remaining Quantity.');
                qty = remaining;
                setCurrentLineValue(rec, 'custpage_quantity', qty);
            }
            const rate = getCurrentLineNumber(rec, 'custpage_rate', line && line.rate);
            const taxRate = getCurrentLineNumber(rec, 'custpage_taxrate', line && line.taxRate);
            const amount = qty * rate;
            const taxAmount = amount * (Math.abs(taxRate) <= 1 ? taxRate : taxRate / 100);
            const grossAmount = amount + taxAmount;
            setCurrentLineValue(rec, 'custpage_amount', amount);
            setCurrentLineValue(rec, 'custpage_taxamount', taxAmount);
            setCurrentLineValue(rec, 'custpage_grossamount', grossAmount);
            updateCurrentLineJson(rec, {
                quantity: qty,
                rate: rate,
                taxRate: taxRate,
                amount: amount,
                taxAmount: taxAmount,
                grossAmount: grossAmount
            });
        }

        function setTaxRateFromTaxCode(rec) {
            const taxCodeId = rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_taxcode'});
            const taxRate = getTaxRateFromTaxCode(taxCodeId);
            setCurrentLineValue(rec, 'custpage_taxrate', taxRate);
            updateCurrentLineJson(rec, {
                taxCode: taxCodeId || '',
                taxCodeText: rec.getCurrentSublistText({sublistId: SUBLIST, fieldId: 'custpage_taxcode'}) || '',
                taxRate: taxRate
            });
        }

        function getTaxRateFromTaxCode(taxCodeId) {
            if (!taxCodeId) return 0;
            try {
                const lkTax = search.lookupFields({type: 'salestaxitem', id: taxCodeId, columns: ['rate']});
                return parseNumber(lkTax.rate);
            } catch (e) {
                console.log('Cannot get tax rate from tax code', {taxCodeId, error: e});
                return 0;
            }
        }

        function getCurrentLineNumber(rec, fieldId, fallback) {
            const value = rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId});
            if (value !== null && value !== undefined && value !== '') return parseNumber(value);
            return parseNumber(fallback);
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
            Object.keys(values).forEach((key) => {
                line[key] = values[key];
            });
            setCurrentLineValue(rec, 'custpage_line_json', JSON.stringify(line));
        }

        function getCurrentLineRemaining(rec) {
            const line = getCurrentLineData(rec);
            if (line) return parseNumber(line.qtyRemaining);
            return parseNumber(rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_remaining'}));
        }

        function setLineValue(rec, line, fieldId, value) {
            rec.selectLine({sublistId: SUBLIST, line});
            rec.setCurrentSublistValue({sublistId: SUBLIST, fieldId, value, ignoreFieldChange: true});
            rec.commitLine({sublistId: SUBLIST});
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
            createPurchaseOrder
        };
    });
