/**
 * Noi dung: Create Inventory Adjustment from Item Fulfillment.
 *
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/redirect', 'N/search'],
    (record, redirect, search) => {

        const ITEM_FULFILLMENT = 'itemfulfillment';
        const INVENTORY_ADJUSTMENT = 'inventoryadjustment';

        const SOURCE_SUBLIST = 'item';
        const TARGET_SUBLIST = 'inventory';
        const INVENTORY_DETAIL = 'inventorydetail';
        const INVENTORY_ASSIGNMENT = 'inventoryassignment';

        const FIELD = {
            ORDER_TYPE: 'custbody_scv_order_type',
            FOR_ORDER_TYPE: 'custbody_scv_for_order_type',
            FOR_LOCATION: 'custbody_scv_for_location',
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

        function onRequest(scriptContext) {
            try {
                const itemFulfillmentId = scriptContext.request.parameters.ifid;
                if (!itemFulfillmentId) throw new Error('Missing Item Fulfillment ID.');

                const existingInventoryAdjustment = getExistingInventoryAdjustment(itemFulfillmentId);
                if (existingInventoryAdjustment) {
                    redirect.toRecord({
                        type: INVENTORY_ADJUSTMENT,
                        id: existingInventoryAdjustment,
                        isEditMode: false
                    });
                    return;
                }

                const itemFulfillment = record.load({
                    type: ITEM_FULFILLMENT,
                    id: itemFulfillmentId,
                    isDynamic: false
                });

                const inventoryAdjustmentId = createInventoryAdjustment(itemFulfillment);
                record.submitFields({
                    type: ITEM_FULFILLMENT,
                    id: itemFulfillmentId,
                    values: {
                        [FIELD.INVENTORY_ADJUSTMENT]: inventoryAdjustmentId
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });

                redirect.toRecord({
                    type: INVENTORY_ADJUSTMENT,
                    id: inventoryAdjustmentId,
                    isEditMode: false
                });
            } catch (e) {
                log.error('Create INA From Item Fulfillment Error', {
                    message: e.message || e.toString(),
                    stack: e.stack,
                    parameters: scriptContext.request.parameters
                });
                throw e;
            }
        }

        function getExistingInventoryAdjustment(itemFulfillmentId) {
            const fields = search.lookupFields({
                type: ITEM_FULFILLMENT,
                id: itemFulfillmentId,
                columns: [FIELD.INVENTORY_ADJUSTMENT]
            });
            const inventoryAdjustment = fields[FIELD.INVENTORY_ADJUSTMENT];
            return (inventoryAdjustment && inventoryAdjustment.length) ? inventoryAdjustment[0].value : '';
        }

        function createInventoryAdjustment(itemFulfillment) {
            const orderType = itemFulfillment.getValue(FIELD.FOR_ORDER_TYPE);
            const forLocation = itemFulfillment.getValue(FIELD.FOR_LOCATION);
            const adjustAccount = getAdjustAccount(orderType);

            if (!adjustAccount) throw new Error('Adjust Account on Order Type is required.');
            if (!forLocation) throw new Error('For Location is required.');

            ensureOrderTypeAppliesToInventoryAdjustment(orderType);

            const inventoryAdjustment = record.create({
                type: INVENTORY_ADJUSTMENT,
                isDynamic: true
            });

            setHeaderValues(inventoryAdjustment, itemFulfillment, {
                adjustAccount,
                forLocation,
                orderType
            });
            setInventoryLines(inventoryAdjustment, itemFulfillment, forLocation);

            const inventoryAdjustmentId = inventoryAdjustment.save({
                enableSourcing: true,
                ignoreMandatoryFields: false
            });
            return inventoryAdjustmentId;
        }

        function ensureOrderTypeAppliesToInventoryAdjustment(orderType) {
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

        function setHeaderValues(inventoryAdjustment, itemFulfillment, context) {
            safeSetValue(inventoryAdjustment, 'trandate', itemFulfillment.getValue('trandate'));
            safeSetValue(inventoryAdjustment, 'subsidiary', itemFulfillment.getValue('subsidiary'));
            safeSetValue(inventoryAdjustment, 'adjlocation', context.forLocation);
            safeSetValue(inventoryAdjustment, 'custbody_scv_so_buyer', itemFulfillment.getValue('custbody_scv_so_buyer'));
            safeSetValue(inventoryAdjustment, 'memo', itemFulfillment.getValue('memo'));
            safeSetValue(inventoryAdjustment, 'custbody_scv_created_transaction', itemFulfillment.getValue('createdfrom'));
            safeSetValue(inventoryAdjustment, 'custbody_scv_sales_contract', itemFulfillment.getValue('custbody_scv_sales_contract'));
            safeSetValue(inventoryAdjustment, 'custbody_scv_related_transaction', itemFulfillment.id);
            safeSetValue(inventoryAdjustment, 'custbody_scv_invoice_date', itemFulfillment.getValue('custbody_scv_invoice_date'));
            safeSetValue(inventoryAdjustment, 'custbody_scv_invoice_serial', itemFulfillment.getValue('custbody_scv_invoice_serial'));
            safeSetValue(inventoryAdjustment, 'custbody_scv_invoice_pattern', itemFulfillment.getValue('custbody_scv_invoice_pattern'));
            safeSetValue(inventoryAdjustment, 'custbody_scv_invoice_number', itemFulfillment.getValue('custbody_scv_invoice_number'));
            safeSetValue(inventoryAdjustment, 'account', context.adjustAccount);

            if (!inventoryAdjustment.getValue('account')) {
                throw new Error('Adjustment Account is invalid or unavailable for the selected subsidiary.');
            }

            safeSetValue(inventoryAdjustment, FIELD.ORDER_TYPE, context.orderType);
        }

        function setInventoryLines(inventoryAdjustment, itemFulfillment, forLocation) {
            const lineCount = itemFulfillment.getLineCount({sublistId: SOURCE_SUBLIST});
            for (let i = 0; i < lineCount; i++) {
                const item = itemFulfillment.getSublistValue({sublistId: SOURCE_SUBLIST, fieldId: 'item', line: i});
                const quantity = toNumber(itemFulfillment.getSublistValue({sublistId: SOURCE_SUBLIST, fieldId: 'quantity', line: i}));
                if (!item || !quantity) continue;

                inventoryAdjustment.selectNewLine({sublistId: TARGET_SUBLIST});
                safeSetCurrentSublistValue(inventoryAdjustment, TARGET_SUBLIST, 'item', item);
                safeSetCurrentSublistValue(inventoryAdjustment, TARGET_SUBLIST, 'units',
                    itemFulfillment.getSublistValue({sublistId: SOURCE_SUBLIST, fieldId: 'units', line: i}));
                safeSetCurrentSublistValue(inventoryAdjustment, TARGET_SUBLIST, 'location', forLocation);
                safeSetCurrentSublistValue(inventoryAdjustment, TARGET_SUBLIST, 'adjustqtyby', quantity);
                safeSetCurrentSublistValue(inventoryAdjustment, TARGET_SUBLIST, 'unitcost', 0);
                safeSetCurrentSublistValue(inventoryAdjustment, TARGET_SUBLIST, 'custcol_scv_origin_line_num',
                    itemFulfillment.getSublistValue({sublistId: SOURCE_SUBLIST, fieldId: 'custcol_scv_origin_line_num', line: i}));
                safeSetCurrentSublistValue(inventoryAdjustment, TARGET_SUBLIST, 'memo',
                    itemFulfillment.getSublistValue({sublistId: SOURCE_SUBLIST, fieldId: 'description', line: i}));

                copyInventoryDetail(inventoryAdjustment, itemFulfillment, i, forLocation);
                inventoryAdjustment.commitLine({sublistId: TARGET_SUBLIST});
            }
        }

        function copyInventoryDetail(inventoryAdjustment, itemFulfillment, sourceLine, forLocation) {
            const inventoryDetailId = itemFulfillment.getSublistValue({
                sublistId: SOURCE_SUBLIST,
                fieldId: INVENTORY_DETAIL,
                line: sourceLine
            });
            if (!inventoryDetailId) return;

            const sourceInventoryDetail = itemFulfillment.getSublistSubrecord({
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
                const targetBin = findBinByTextAndLocation(sourceBin.text, forLocation) || sourceBin;

                targetInventoryDetail.selectNewLine({sublistId: INVENTORY_ASSIGNMENT});
                setInventoryNumber(targetInventoryDetail, lotText, lotValue);
                safeSetCurrentSublistValue(targetInventoryDetail, INVENTORY_ASSIGNMENT, 'expirationdate',
                    sourceInventoryDetail.getSublistValue({sublistId: INVENTORY_ASSIGNMENT, fieldId: 'expirationdate', line: i}));
                safeSetCurrentSublistValue(targetInventoryDetail, INVENTORY_ASSIGNMENT, 'quantity',
                    sourceInventoryDetail.getSublistValue({sublistId: INVENTORY_ASSIGNMENT, fieldId: 'quantity', line: i}));
                setBinNumber(targetInventoryDetail, targetBin.text, targetBin.value);
                safeSetCurrentSublistValue(targetInventoryDetail, INVENTORY_ASSIGNMENT, 'inventorystatus',
                    sourceInventoryDetail.getSublistValue({sublistId: INVENTORY_ASSIGNMENT, fieldId: 'inventorystatus', line: i}));
                targetInventoryDetail.commitLine({sublistId: INVENTORY_ASSIGNMENT});
            }
        }

        function getSourceBin(inventoryDetail, line) {
            return {
                value: safeGetSublistValue(inventoryDetail, INVENTORY_ASSIGNMENT, 'binnumber', line),
                text: safeGetSublistText(inventoryDetail, INVENTORY_ASSIGNMENT, 'binnumber', line)
            };
        }

        function findBinByTextAndLocation(binText, location) {
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

        function setBinNumber(inventoryDetail, binText, binValue) {
            if (binValue && safeSetCurrentSublistValue(inventoryDetail, INVENTORY_ASSIGNMENT, 'binnumber', binValue)) return;
            if (binText) safeSetCurrentSublistText(inventoryDetail, INVENTORY_ASSIGNMENT, 'binnumber', binText);
        }

        function setInventoryNumber(inventoryDetail, lotText, lotValue) {
            if (lotText && safeSetCurrentSublistText(inventoryDetail, INVENTORY_ASSIGNMENT, 'receiptinventorynumber', lotText)) return;
            if (lotValue && safeSetCurrentSublistValue(inventoryDetail, INVENTORY_ASSIGNMENT, 'receiptinventorynumber', lotValue)) return;
            if (lotText && safeSetCurrentSublistText(inventoryDetail, INVENTORY_ASSIGNMENT, 'issueinventorynumber', lotText)) return;
            if (lotValue) safeSetCurrentSublistValue(inventoryDetail, INVENTORY_ASSIGNMENT, 'issueinventorynumber', lotValue);
        }

        function getInventoryNumberText(inventoryDetail, line) {
            return safeGetSublistText(inventoryDetail, INVENTORY_ASSIGNMENT, 'issueinventorynumber', line)
                || safeGetSublistText(inventoryDetail, INVENTORY_ASSIGNMENT, 'receiptinventorynumber', line);
        }

        function getInventoryNumberValue(inventoryDetail, line) {
            return safeGetSublistValue(inventoryDetail, INVENTORY_ASSIGNMENT, 'issueinventorynumber', line)
                || safeGetSublistValue(inventoryDetail, INVENTORY_ASSIGNMENT, 'receiptinventorynumber', line);
        }

        function getAdjustAccount(orderType) {
            if (!orderType) return '';
            const fields = search.lookupFields({
                type: ORDER_TYPE_RECORD,
                id: orderType,
                columns: [ORDER_TYPE_FIELD.ADJUST_ACCOUNT]
            });
            const adjustAccount = fields[ORDER_TYPE_FIELD.ADJUST_ACCOUNT];
            return (adjustAccount && adjustAccount.length) ? adjustAccount[0].value : '';
        }

        function safeSetValue(rec, fieldId, value) {
            if (isEmpty(value)) return false;
            try {
                rec.setValue({fieldId, value});
                return true;
            } catch (e) {
                log.error('Set Header Field Error', {fieldId, value, error: e});
                return false;
            }
        }

        function safeSetCurrentSublistValue(rec, sublistId, fieldId, value) {
            if (isEmpty(value)) return false;
            try {
                rec.setCurrentSublistValue({sublistId, fieldId, value});
                return true;
            } catch (e) {
                log.error('Set Sublist Field Error', {sublistId, fieldId, value, error: e});
                return false;
            }
        }

        function safeSetCurrentSublistText(rec, sublistId, fieldId, text) {
            if (isEmpty(text)) return false;
            try {
                rec.setCurrentSublistText({sublistId, fieldId, text});
                return true;
            } catch (e) {
                log.error('Set Sublist Text Error', {sublistId, fieldId, text, error: e});
                return false;
            }
        }

        function safeGetSublistValue(rec, sublistId, fieldId, line) {
            try {
                return rec.getSublistValue({sublistId, fieldId, line});
            } catch (e) {
                return '';
            }
        }

        function safeGetSublistText(rec, sublistId, fieldId, line) {
            try {
                return rec.getSublistText({sublistId, fieldId, line});
            } catch (e) {
                return '';
            }
        }

        function isEmpty(value) {
            return value === null || value === undefined || value === '';
        }

        function toNumber(value) {
            const number = parseFloat(value || 0);
            return isNaN(number) ? 0 : number;
        }

        return {onRequest};
    });
