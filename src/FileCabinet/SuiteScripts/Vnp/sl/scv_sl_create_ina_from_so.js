/**
 * Noi dung: Create outbound Inventory Adjustment from Sales Order.
 *
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/redirect', 'N/search'],
    (record, redirect, search) => {

        const SALES_ORDER = 'salesorder';
        const INVENTORY_ADJUSTMENT = 'inventoryadjustment';
        const SOURCE_SUBLIST = 'item';
        const TARGET_SUBLIST = 'inventory';
        const INVENTORY_DETAIL = 'inventorydetail';
        const INVENTORY_ASSIGNMENT = 'inventoryassignment';
        const INVENTORY_BALANCE_BIN_SEARCH = 'customsearch_scv_inventory_balance_bin';

        const FIELD = {
            ORDER_TYPE: 'custbody_scv_order_type',
            TRANSACTION_TYPE: 'custbody_scv_trans_type',
            INVENTORY_ADJUSTMENT: 'custbody_scv_inventory_adjustment'
        };

        const ORDER_TYPE_RECORD = 'customrecord_scv_order_type';
        const ORDER_TYPE_FIELD = {
            ADJUST_ACCOUNT: 'custrecord_scv_adjust_account',
            APPLY_TRANSACTION_TYPE: 'custrecord_scv_app_trans_type'
        };

        const TRANSACTION_TYPE = {
            INVENTORY_ADJUSTMENT: '11'
        };

        const onRequest = (scriptContext) => {
            try {
                const salesOrderId = scriptContext.request.parameters.soid;
                if (!salesOrderId) throw new Error('Missing Sales Order ID.');

                const existingInventoryAdjustment = getExistingInventoryAdjustment(salesOrderId);
                if (existingInventoryAdjustment) {
                    redirect.toRecord({type: INVENTORY_ADJUSTMENT, id: existingInventoryAdjustment, isEditMode: false});
                    return;
                }

                const salesOrder = record.load({type: SALES_ORDER, id: salesOrderId, isDynamic: false});
                validateSalesOrder(salesOrder);

                const inventoryAdjustmentId = createInventoryAdjustment(salesOrder);
                record.submitFields({
                    type: SALES_ORDER,
                    id: salesOrderId,
                    values: {
                        [FIELD.INVENTORY_ADJUSTMENT]: inventoryAdjustmentId
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });

                redirect.toRecord({type: INVENTORY_ADJUSTMENT, id: inventoryAdjustmentId, isEditMode: false});
            } catch (e) {
                log.error('Create INA From Sales Order Error', {
                    message: e.message || e.toString(),
                    stack: e.stack,
                    parameters: scriptContext.request.parameters
                });
                throw e;
            }
        }

        const getExistingInventoryAdjustment = (salesOrderId) => {
            const fields = search.lookupFields({
                type: SALES_ORDER,
                id: salesOrderId,
                columns: [FIELD.INVENTORY_ADJUSTMENT]
            });
            const inventoryAdjustment = fields[FIELD.INVENTORY_ADJUSTMENT];
            return (inventoryAdjustment && inventoryAdjustment.length) ? inventoryAdjustment[0].value : '';
        }

        const validateSalesOrder = (salesOrder) => {
            if (!isInventoryAdjustmentTransactionType(salesOrder)) {
                throw new Error('Transaction Type must be Inventory Adjustment.');
            }

            const orderType = salesOrder.getValue(FIELD.ORDER_TYPE);
            if (!orderType) throw new Error('Order Type is required.');
            if (!getAdjustAccount(orderType)) throw new Error('Adjust Account on Order Type is required.');
        }

        const isInventoryAdjustmentTransactionType = (rec) => {
            const value = String(rec.getValue(FIELD.TRANSACTION_TYPE) || '').toLowerCase();
            const text = String(rec.getText(FIELD.TRANSACTION_TYPE) || '').toLowerCase();
            return ['11', 'invadjst', 'inventoryadjustment'].indexOf(value) >= 0
                || text === 'inventory adjustment';
        }

        const createInventoryAdjustment = (salesOrder) => {
            const orderType = salesOrder.getValue(FIELD.ORDER_TYPE);
            const adjustAccount = getAdjustAccount(orderType);
            ensureOrderTypeAppliesToInventoryAdjustment(orderType);

            const inventoryAdjustment = record.create({type: INVENTORY_ADJUSTMENT, isDynamic: true});
            setHeaderValues(inventoryAdjustment, salesOrder, {orderType, adjustAccount});
            setInventoryLines(inventoryAdjustment, salesOrder);

            return inventoryAdjustment.save({
                enableSourcing: true,
                ignoreMandatoryFields: false
            });
        }

        const setHeaderValues = (inventoryAdjustment, salesOrder, context) => {
            safeSetValue(inventoryAdjustment, 'trandate', salesOrder.getValue('trandate'));
            safeSetValue(inventoryAdjustment, 'subsidiary', salesOrder.getValue('subsidiary'));
            safeSetValue(inventoryAdjustment, 'adjlocation', salesOrder.getValue('location'));
            safeSetValue(inventoryAdjustment, 'custbody_scv_buyer', salesOrder.getValue('custbody_scv_buyer'));
            safeSetValue(inventoryAdjustment, 'memo', salesOrder.getValue('memo'));
            safeSetValue(inventoryAdjustment, 'custbody_scv_created_transaction', salesOrder.id);
            safeSetValue(inventoryAdjustment, 'custbody_scv_sales_contract', salesOrder.getValue('custbody_scv_sales_contract'));
            safeSetValue(inventoryAdjustment, 'custbody_scv_invoice_date', salesOrder.getValue('custbody_scv_invoice_date'));
            safeSetValue(inventoryAdjustment, 'custbody_scv_invoice_serial', salesOrder.getValue('custbody_scv_invoice_serial'));
            safeSetValue(inventoryAdjustment, 'custbody_scv_invoice_pattern', salesOrder.getValue('custbody_scv_invoice_pattern'));
            safeSetValue(inventoryAdjustment, 'custbody_scv_invoice_number', salesOrder.getValue('custbody_scv_invoice_number'));
            safeSetValue(inventoryAdjustment, 'account', context.adjustAccount);

            if (!inventoryAdjustment.getValue('account')) {
                throw new Error('Adjustment Account is invalid or unavailable for the selected subsidiary.');
            }

            safeSetValue(inventoryAdjustment, FIELD.ORDER_TYPE, context.orderType);
        }

        const setInventoryLines = (inventoryAdjustment, salesOrder) => {
            const lineCount = salesOrder.getLineCount({sublistId: SOURCE_SUBLIST});
            for (let i = 0; i < lineCount; i++) {
                const item = salesOrder.getSublistValue({sublistId: SOURCE_SUBLIST, fieldId: 'item', line: i});
                const quantity = toNumber(salesOrder.getSublistValue({sublistId: SOURCE_SUBLIST, fieldId: 'quantity', line: i}));
                if (!item || !quantity) continue;

                const location = salesOrder.getSublistValue({sublistId: SOURCE_SUBLIST, fieldId: 'location', line: i})
                    || salesOrder.getValue('location');

                inventoryAdjustment.selectNewLine({sublistId: TARGET_SUBLIST});
                safeSetCurrentSublistValue(inventoryAdjustment, TARGET_SUBLIST, 'item', item);
                safeSetCurrentSublistValue(inventoryAdjustment, TARGET_SUBLIST, 'units',
                    salesOrder.getSublistValue({sublistId: SOURCE_SUBLIST, fieldId: 'units', line: i}));
                safeSetCurrentSublistValue(inventoryAdjustment, TARGET_SUBLIST, 'location', location);
                safeSetCurrentSublistValue(inventoryAdjustment, TARGET_SUBLIST, 'adjustqtyby', -Math.abs(quantity));
                safeSetCurrentSublistValue(inventoryAdjustment, TARGET_SUBLIST, 'custcol_scv_origin_line_num',
                    salesOrder.getSublistValue({sublistId: SOURCE_SUBLIST, fieldId: 'custcol_scv_origin_line_num', line: i}));
                safeSetCurrentSublistValue(inventoryAdjustment, TARGET_SUBLIST, 'memo',
                    salesOrder.getSublistValue({sublistId: SOURCE_SUBLIST, fieldId: 'description', line: i}));
                safeSetCurrentSublistValue(inventoryAdjustment, TARGET_SUBLIST, 'custcol_scv_einvoice_rate',
                    salesOrder.getSublistValue({sublistId: SOURCE_SUBLIST, fieldId: 'custcol_scv_einvoice_rate', line: i}));
                safeSetCurrentSublistValue(inventoryAdjustment, TARGET_SUBLIST, 'custcol_scv_einvoice_amount',
                    salesOrder.getSublistValue({sublistId: SOURCE_SUBLIST, fieldId: 'custcol_scv_einvoice_amount', line: i}));
                safeSetCurrentSublistValue(inventoryAdjustment, TARGET_SUBLIST, 'custcol_scv_einvoice_tax',
                    salesOrder.getSublistValue({sublistId: SOURCE_SUBLIST, fieldId: 'custcol_scv_einvoice_tax', line: i}));

                copyInventoryDetail(inventoryAdjustment, salesOrder, i, {item, location});
                inventoryAdjustment.commitLine({sublistId: TARGET_SUBLIST});
            }
        }

        const copyInventoryDetail = (inventoryAdjustment, salesOrder, sourceLine, lineContext) => {
            const inventoryDetailId = salesOrder.getSublistValue({
                sublistId: SOURCE_SUBLIST,
                fieldId: INVENTORY_DETAIL,
                line: sourceLine
            });
            if (!inventoryDetailId) return;

            const sourceInventoryDetail = salesOrder.getSublistSubrecord({
                sublistId: SOURCE_SUBLIST,
                fieldId: INVENTORY_DETAIL,
                line: sourceLine
            });
            const targetInventoryDetail = inventoryAdjustment.getCurrentSublistSubrecord({
                sublistId: TARGET_SUBLIST,
                fieldId: INVENTORY_DETAIL
            });

            const assignmentCount = sourceInventoryDetail.getLineCount({sublistId: INVENTORY_ASSIGNMENT});
            for (let i = 0; i < assignmentCount; i++) {
                const lotText = getInventoryNumberText(sourceInventoryDetail, i);
                const lotValue = getInventoryNumberValue(sourceInventoryDetail, i);
                const sourceBin = getSourceBin(sourceInventoryDetail, i);
                const bin = findBinForIssue(lineContext.item, lineContext.location, lotValue, lotText)
                    || findBinByTextAndLocation(sourceBin.text, lineContext.location)
                    || sourceBin;

                targetInventoryDetail.selectNewLine({sublistId: INVENTORY_ASSIGNMENT});
                setIssueInventoryNumber(targetInventoryDetail, lotText, lotValue);
                safeSetCurrentSublistValue(targetInventoryDetail, INVENTORY_ASSIGNMENT, 'expirationdate',
                    sourceInventoryDetail.getSublistValue({sublistId: INVENTORY_ASSIGNMENT, fieldId: 'expirationdate', line: i}));
                safeSetCurrentSublistValue(targetInventoryDetail, INVENTORY_ASSIGNMENT, 'quantity',
                    -Math.abs(toNumber(sourceInventoryDetail.getSublistValue({sublistId: INVENTORY_ASSIGNMENT, fieldId: 'quantity', line: i}))));
                setBinNumber(targetInventoryDetail, bin.text, bin.value);
                safeSetCurrentSublistValue(targetInventoryDetail, INVENTORY_ASSIGNMENT, 'inventorystatus',
                    sourceInventoryDetail.getSublistValue({sublistId: INVENTORY_ASSIGNMENT, fieldId: 'inventorystatus', line: i}));
                targetInventoryDetail.commitLine({sublistId: INVENTORY_ASSIGNMENT});
            }
        }

        const findBinForIssue = (item, location, lotValue, lotText) => {
            return findBinFromSavedSearch(item, location, lotValue, lotText)
                || findBinFromInventoryBalance(item, location, lotValue);
        }

        const findBinFromSavedSearch = (item, location, lotValue, lotText) => {
            try {
                const invSearch = search.load({id: INVENTORY_BALANCE_BIN_SEARCH, type: 'inventorybalance'});
                invSearch.filters = invSearch.filters.concat([
                    search.createFilter({name: 'item', operator: search.Operator.ANYOF, values: item}),
                    search.createFilter({name: 'location', operator: search.Operator.ANYOF, values: location})
                ]);
                if (lotValue) {
                    invSearch.filters.push(search.createFilter({name: 'inventorynumber', operator: search.Operator.ANYOF, values: lotValue}));
                } else if (lotText) {
                    invSearch.filters.push(search.createFilter({name: 'inventorynumber', operator: search.Operator.IS, values: lotText}));
                }
                // When the same item/location/lotnumber sits in multiple bins, issue
                // from the bin with the smallest available quantity first.
                invSearch.columns = [search.createColumn({name: 'available', sort: search.Sort.ASC})].concat(invSearch.columns);
                return getFirstBinFromSearch(invSearch);
            } catch (e) {
                log.error('Find Bin From Saved Search Error', {item, location, lotValue, lotText, error: e});
                return null;
            }
        }

        const findBinFromInventoryBalance = (item, location, lotValue) => {
            try {
                if (!lotValue) return null;
                const invSearch = search.create({
                    type: 'inventorybalance',
                    filters: [
                        ['item', search.Operator.ANYOF, item],
                        'AND',
                        ['location', search.Operator.ANYOF, location],
                        'AND',
                        ['inventorynumber', search.Operator.ANYOF, lotValue],
                        'AND',
                        ['available', search.Operator.GREATERTHAN, 0]
                    ],
                    columns: [
                        search.createColumn({name: 'available', sort: search.Sort.ASC}),
                        'binnumber'
                    ]
                });
                log.error('getFirstBinFromSearch(invSearch);', getFirstBinFromSearch(invSearch))
                return getFirstBinFromSearch(invSearch);
            } catch (e) {
                log.error('Find Bin From Inventory Balance Error', {item, location, lotValue, error: e});
                return null;
            }
        }

        const findBinByTextAndLocation = (binText, location) => {
            try {
                if (!binText || !location) return null;
                const binSearch = search.create({
                    type: 'bin',
                    filters: [
                        ['binnumber', search.Operator.IS, binText],
                        'AND',
                        ['location', search.Operator.ANYOF, location]
                    ],
                    columns: ['internalid', 'binnumber']
                });
                const results = binSearch.run().getRange({start: 0, end: 1}) || [];
                if (!results.length) return null;
                return {
                    value: results[0].getValue({name: 'internalid'}) || results[0].id,
                    text: results[0].getValue({name: 'binnumber'}) || binText
                };
            } catch (e) {
                log.error('Find Bin By Text And Location Error', {binText, location, error: e});
                return null;
            }
        }

        const getFirstBinFromSearch = (invSearch) => {
            const results = invSearch.run().getRange({start: 0, end: 1}) || [];
            if (!results.length) return null;
            const value = results[0].getValue({name: 'binnumber'}) || results[0].getValue('binnumber');
            const text = results[0].getText({name: 'binnumber'}) || results[0].getText('binnumber');
            if (!value && !text) return null;
            return {value, text};
        }

        const getSourceBin = (inventoryDetail, line) => {
            return {
                value: safeGetSublistValue(inventoryDetail, INVENTORY_ASSIGNMENT, 'binnumber', line),
                text: safeGetSublistText(inventoryDetail, INVENTORY_ASSIGNMENT, 'binnumber', line)
            };
        }

        const setIssueInventoryNumber = (inventoryDetail, lotText, lotValue) => {
            if (lotText && safeSetCurrentSublistText(inventoryDetail, INVENTORY_ASSIGNMENT, 'issueinventorynumber', lotText)) return;
            if (lotValue) safeSetCurrentSublistValue(inventoryDetail, INVENTORY_ASSIGNMENT, 'issueinventorynumber', lotValue);
        }

        const setBinNumber = (inventoryDetail, binText, binValue) => {
            if (binText && safeSetCurrentSublistText(inventoryDetail, INVENTORY_ASSIGNMENT, 'binnumber', binText)) return;
            if (binValue) safeSetCurrentSublistValue(inventoryDetail, INVENTORY_ASSIGNMENT, 'binnumber', binValue);
        }

        const getInventoryNumberText = (inventoryDetail, line) => {
            return safeGetSublistText(inventoryDetail, INVENTORY_ASSIGNMENT, 'issueinventorynumber', line)
                || safeGetSublistText(inventoryDetail, INVENTORY_ASSIGNMENT, 'receiptinventorynumber', line);
        }

        const getInventoryNumberValue = (inventoryDetail, line) => {
            return safeGetSublistValue(inventoryDetail, INVENTORY_ASSIGNMENT, 'issueinventorynumber', line)
                || safeGetSublistValue(inventoryDetail, INVENTORY_ASSIGNMENT, 'receiptinventorynumber', line);
        }

        const getAdjustAccount = (orderType) => {
            if (!orderType) return '';
            const fields = search.lookupFields({
                type: ORDER_TYPE_RECORD,
                id: orderType,
                columns: [ORDER_TYPE_FIELD.ADJUST_ACCOUNT]
            });
            const adjustAccount = fields[ORDER_TYPE_FIELD.ADJUST_ACCOUNT];
            return (adjustAccount && adjustAccount.length) ? adjustAccount[0].value : '';
        }

        const ensureOrderTypeAppliesToInventoryAdjustment = (orderType) => {
            const fields = search.lookupFields({
                type: ORDER_TYPE_RECORD,
                id: orderType,
                columns: [ORDER_TYPE_FIELD.APPLY_TRANSACTION_TYPE]
            });
            const currentValues = (fields[ORDER_TYPE_FIELD.APPLY_TRANSACTION_TYPE] || [])
                .map(option => String(option.value));
            if (currentValues.indexOf(TRANSACTION_TYPE.INVENTORY_ADJUSTMENT) >= 0) return;

            currentValues.push(TRANSACTION_TYPE.INVENTORY_ADJUSTMENT);
            record.submitFields({
                type: ORDER_TYPE_RECORD,
                id: orderType,
                values: {
                    [ORDER_TYPE_FIELD.APPLY_TRANSACTION_TYPE]: currentValues
                },
                options: {
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }
            });
        }

        const safeSetValue = (rec, fieldId, value) => {
            if (isEmpty(value)) return false;
            try {
                rec.setValue({fieldId, value});
                return true;
            } catch (e) {
                log.error('Set Header Field Error', {fieldId, value, error: e});
                return false;
            }
        }

        const safeSetCurrentSublistValue = (rec, sublistId, fieldId, value) => {
            if (isEmpty(value)) return false;
            try {
                rec.setCurrentSublistValue({sublistId, fieldId, value});
                return true;
            } catch (e) {
                log.error('Set Sublist Field Error', {sublistId, fieldId, value, error: e});
                return false;
            }
        }

        const safeSetCurrentSublistText = (rec, sublistId, fieldId, text) => {
            if (isEmpty(text)) return false;
            try {
                rec.setCurrentSublistText({sublistId, fieldId, text});
                return true;
            } catch (e) {
                log.error('Set Sublist Text Error', {sublistId, fieldId, text, error: e});
                return false;
            }
        }

        const safeGetSublistValue = (rec, sublistId, fieldId, line) => {
            try {
                return rec.getSublistValue({sublistId, fieldId, line});
            } catch (e) {
                return '';
            }
        }

        const safeGetSublistText = (rec, sublistId, fieldId, line) => {
            try {
                return rec.getSublistText({sublistId, fieldId, line});
            } catch (e) {
                return '';
            }
        }

        const isEmpty = (value) => {
            return value === null || value === undefined || value === '';
        }

        const toNumber = (value) => {
            const number = parseFloat(value || 0);
            return isNaN(number) ? 0 : number;
        }

        return {onRequest};
    });
