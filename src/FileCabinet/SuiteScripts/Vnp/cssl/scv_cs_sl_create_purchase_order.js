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
                if (scriptContext.fieldId === FIELD.PURCHASE_CONTRACT) {
                    setVendorFromPurchaseContract(rec);
                    return;
                }
                if (scriptContext.sublistId === SUBLIST) {
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

        function setFieldDisplay(rec, fieldId, isDisplay) {
            const field = rec.getField({fieldId});
            if (field) field.isDisplay = isDisplay;
        }

        function setVendorFromPurchaseContract(rec) {
            const pcId = rec.getValue({fieldId: FIELD.PURCHASE_CONTRACT});
            if (!pcId) return;
            try {
                const lookup = search.lookupFields({
                    type: 'custompurchase_scv_purchase_contract',
                    id: pcId,
                    columns: ['entity']
                });
                const vendorInfo = lookup.entity && lookup.entity[0];
                if (!vendorInfo || !vendorInfo.value) return;
                const field = rec.getField({fieldId: FIELD.VENDOR});
                if (field) {
                    field.insertSelectOption({
                        value: vendorInfo.value,
                        text: vendorInfo.text || vendorInfo.value,
                        isSelected: true
                    });
                } else {
                    rec.setValue({fieldId: FIELD.VENDOR, value: vendorInfo.value, ignoreFieldChange: true});
                }
            } catch (e) {
                console.log('Cannot set vendor from purchase contract', e);
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
            return {
                custpage_created_from: rec.getValue(FIELD.CREATED_FROM),
                custpage_subsidiary: rec.getValue(FIELD.SUBSIDIARY),
                custpage_from_date: rec.getText(FIELD.FROM_DATE),
                custpage_to_date: rec.getText(FIELD.TO_DATE),
                custpage_order_type: rec.getValue(FIELD.ORDER_TYPE),
                custpage_purchase_contract: rec.getValue(FIELD.PURCHASE_CONTRACT),
                custpage_purchase_requisition: rec.getValue(FIELD.PURCHASE_REQUISITION),
                custpage_date: rec.getText(FIELD.DATE),
                custpage_location: rec.getValue(FIELD.LOCATION),
                custpage_vendor: rec.getValue(FIELD.VENDOR),
                custpage_memo: rec.getValue(FIELD.MEMO),
                custpage_is_search: 'T'
            };
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
            params.custpage_is_search = rec.getValue(FIELD.IS_SEARCH);
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
            const qty = parseNumber(rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_quantity'}));
            const remaining = getCurrentLineRemaining(rec);
            if (qty > remaining) {
                alert('Quantity cannot be greater than Remaining Quantity.');
                rec.setCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_quantity', value: remaining, ignoreFieldChange: true});
            }
            const rate = parseNumber(rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_rate'}));
            const taxRate = parseNumber(rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_taxrate'}));
            const amount = qty * rate;
            const taxAmount = amount * (Math.abs(taxRate) <= 1 ? taxRate : taxRate / 100);
            rec.setCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_amount', value: amount, ignoreFieldChange: true});
            rec.setCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_taxamount', value: taxAmount, ignoreFieldChange: true});
            rec.setCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_grossamount', value: amount + taxAmount, ignoreFieldChange: true});
        }

        function getCurrentLineRemaining(rec) {
            const lineJson = rec.getCurrentSublistValue({sublistId: SUBLIST, fieldId: 'custpage_line_json'});
            if (lineJson) {
                try {
                    const line = JSON.parse(lineJson);
                    return parseNumber(line.qtyRemaining);
                } catch (e) {
                    console.log('Cannot parse current line data', e);
                }
            }
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
