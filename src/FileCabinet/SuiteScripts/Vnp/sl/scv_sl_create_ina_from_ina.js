/**
 * Noi dung: Create inbound Inventory Adjustment from outbound Inventory Adjustment.
 *
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/redirect', 'N/search'],
    (record, redirect, search) => {

        const INVENTORY_ADJUSTMENT = 'inventoryadjustment';
        const INVENTORY_SUBLIST = 'inventory';
        const INVENTORY_DETAIL = 'inventorydetail';
        const INVENTORY_ASSIGNMENT = 'inventoryassignment';

        const FIELD = {
            ORDER_TYPE: 'custbody_scv_order_type',
            FOR_LOCATION: 'custbody_scv_for_location',
            INVENTORY_ADJUSTMENT: 'custbody_scv_inventory_adjustment'
        };

        function onRequest(scriptContext) {
            try {
                const outboundInventoryAdjustmentId = scriptContext.request.parameters.iaid;
                if (!outboundInventoryAdjustmentId) throw new Error('Missing Inventory Adjustment ID.');

                const existingInventoryAdjustment = getExistingInventoryAdjustment(outboundInventoryAdjustmentId);
                if (existingInventoryAdjustment) {
                    redirect.toRecord({
                        type: INVENTORY_ADJUSTMENT,
                        id: existingInventoryAdjustment,
                        isEditMode: false
                    });
                    return;
                }

                const outboundInventoryAdjustment = record.load({
                    type: INVENTORY_ADJUSTMENT,
                    id: outboundInventoryAdjustmentId,
                    isDynamic: false
                });

                validateOutboundInventoryAdjustment(outboundInventoryAdjustment);

                const inboundInventoryAdjustmentId = createInboundInventoryAdjustment(outboundInventoryAdjustment);
                record.submitFields({
                    type: INVENTORY_ADJUSTMENT,
                    id: outboundInventoryAdjustmentId,
                    values: {
                        [FIELD.INVENTORY_ADJUSTMENT]: inboundInventoryAdjustmentId
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });

                redirect.toRecord({
                    type: INVENTORY_ADJUSTMENT,
                    id: inboundInventoryAdjustmentId,
                    isEditMode: false
                });
            } catch (e) {
                log.error('Create INA From Outbound INA Error', {
                    message: e.message || e.toString(),
                    stack: e.stack,
                    parameters: scriptContext.request.parameters
                });
                throw e;
            }
        }

        function getExistingInventoryAdjustment(outboundInventoryAdjustmentId) {
            const fields = search.lookupFields({
                type: INVENTORY_ADJUSTMENT,
                id: outboundInventoryAdjustmentId,
                columns: [FIELD.INVENTORY_ADJUSTMENT]
            });
            const inventoryAdjustment = fields[FIELD.INVENTORY_ADJUSTMENT];
            return (inventoryAdjustment && inventoryAdjustment.length) ? inventoryAdjustment[0].value : '';
        }

        function validateOutboundInventoryAdjustment(outboundInventoryAdjustment) {
            if (!outboundInventoryAdjustment.getValue(FIELD.FOR_LOCATION)) throw new Error('For Location is required.');

            const lineCount = outboundInventoryAdjustment.getLineCount({sublistId: INVENTORY_SUBLIST});
            if (!lineCount) throw new Error('Inventory Adjustment must have inventory lines.');

            for (let i = 0; i < lineCount; i++) {
                const quantity = toNumber(outboundInventoryAdjustment.getSublistValue({
                    sublistId: INVENTORY_SUBLIST,
                    fieldId: 'adjustqtyby',
                    line: i
                }));
                if (quantity >= 0) throw new Error('All Adjust Qty. By values must be negative.');
            }
        }

        function createInboundInventoryAdjustment(outboundInventoryAdjustment) {
            const inboundInventoryAdjustment = record.create({
                type: INVENTORY_ADJUSTMENT,
                isDynamic: true
            });

            setHeaderValues(inboundInventoryAdjustment, outboundInventoryAdjustment);
            setInventoryLines(inboundInventoryAdjustment, outboundInventoryAdjustment);

            return inboundInventoryAdjustment.save({
                enableSourcing: true,
                ignoreMandatoryFields: false
            });
        }

        function setHeaderValues(inboundInventoryAdjustment, outboundInventoryAdjustment) {
            safeSetValue(inboundInventoryAdjustment, 'trandate', outboundInventoryAdjustment.getValue('trandate'));
            safeSetValue(inboundInventoryAdjustment, 'subsidiary', outboundInventoryAdjustment.getValue('subsidiary'));
            safeSetValue(inboundInventoryAdjustment, 'adjlocation', outboundInventoryAdjustment.getValue(FIELD.FOR_LOCATION));
            safeSetValue(inboundInventoryAdjustment, 'custbody_scv_so_buyer', outboundInventoryAdjustment.getValue('custbody_scv_so_buyer'));
            safeSetValue(inboundInventoryAdjustment, 'memo', outboundInventoryAdjustment.getValue('memo'));
            safeSetValue(inboundInventoryAdjustment, 'custbody_scv_created_transaction', outboundInventoryAdjustment.id);
            safeSetValue(inboundInventoryAdjustment, 'account', outboundInventoryAdjustment.getValue('account'));

            if (!inboundInventoryAdjustment.getValue('account')) {
                throw new Error('Adjustment Account is required.');
            }

            safeSetValue(inboundInventoryAdjustment, FIELD.ORDER_TYPE, outboundInventoryAdjustment.getValue(FIELD.ORDER_TYPE));
        }

        function setInventoryLines(inboundInventoryAdjustment, outboundInventoryAdjustment) {
            const forLocation = outboundInventoryAdjustment.getValue(FIELD.FOR_LOCATION);
            const lineCount = outboundInventoryAdjustment.getLineCount({sublistId: INVENTORY_SUBLIST});

            for (let i = 0; i < lineCount; i++) {
                inboundInventoryAdjustment.selectNewLine({sublistId: INVENTORY_SUBLIST});
                safeSetCurrentSublistValue(inboundInventoryAdjustment, INVENTORY_SUBLIST, 'item',
                    outboundInventoryAdjustment.getSublistValue({sublistId: INVENTORY_SUBLIST, fieldId: 'item', line: i}));
                safeSetCurrentSublistValue(inboundInventoryAdjustment, INVENTORY_SUBLIST, 'units',
                    outboundInventoryAdjustment.getSublistValue({sublistId: INVENTORY_SUBLIST, fieldId: 'units', line: i}));
                safeSetCurrentSublistValue(inboundInventoryAdjustment, INVENTORY_SUBLIST, 'location', forLocation);
                safeSetCurrentSublistValue(inboundInventoryAdjustment, INVENTORY_SUBLIST, 'adjustqtyby',
                    Math.abs(toNumber(outboundInventoryAdjustment.getSublistValue({sublistId: INVENTORY_SUBLIST, fieldId: 'adjustqtyby', line: i}))));
                safeSetCurrentSublistValue(inboundInventoryAdjustment, INVENTORY_SUBLIST, 'unitcost',
                    Math.abs(toNumber(outboundInventoryAdjustment.getSublistValue({sublistId: INVENTORY_SUBLIST, fieldId: 'unitcost', line: i}))));
                safeSetCurrentSublistValue(inboundInventoryAdjustment, INVENTORY_SUBLIST, 'custcol_scv_origin_line_num',
                    outboundInventoryAdjustment.getSublistValue({sublistId: INVENTORY_SUBLIST, fieldId: 'custcol_scv_origin_line_num', line: i}));
                safeSetCurrentSublistValue(inboundInventoryAdjustment, INVENTORY_SUBLIST, 'memo',
                    outboundInventoryAdjustment.getSublistValue({sublistId: INVENTORY_SUBLIST, fieldId: 'memo', line: i}));

                copyInventoryDetail(inboundInventoryAdjustment, outboundInventoryAdjustment, i);
                inboundInventoryAdjustment.commitLine({sublistId: INVENTORY_SUBLIST});
            }
        }

        function copyInventoryDetail(inboundInventoryAdjustment, outboundInventoryAdjustment, sourceLine) {
            const inventoryDetailId = outboundInventoryAdjustment.getSublistValue({
                sublistId: INVENTORY_SUBLIST,
                fieldId: INVENTORY_DETAIL,
                line: sourceLine
            });
            if (!inventoryDetailId) return;

            const sourceInventoryDetail = outboundInventoryAdjustment.getSublistSubrecord({
                sublistId: INVENTORY_SUBLIST,
                fieldId: INVENTORY_DETAIL,
                line: sourceLine
            });
            const targetInventoryDetail = inboundInventoryAdjustment.getCurrentSublistSubrecord({
                sublistId: INVENTORY_SUBLIST,
                fieldId: INVENTORY_DETAIL
            });

            const assignmentCount = sourceInventoryDetail.getLineCount({sublistId: INVENTORY_ASSIGNMENT});
            for (let i = 0; i < assignmentCount; i++) {
                const lotText = getInventoryNumberText(sourceInventoryDetail, i);
                const lotValue = getInventoryNumberValue(sourceInventoryDetail, i);
                const binText = safeGetSublistText(sourceInventoryDetail, INVENTORY_ASSIGNMENT, 'binnumber', i);
                const binValue = safeGetSublistValue(sourceInventoryDetail, INVENTORY_ASSIGNMENT, 'binnumber', i);

                targetInventoryDetail.selectNewLine({sublistId: INVENTORY_ASSIGNMENT});
                setInventoryNumber(targetInventoryDetail, lotText, lotValue);
                safeSetCurrentSublistValue(targetInventoryDetail, INVENTORY_ASSIGNMENT, 'expirationdate',
                    sourceInventoryDetail.getSublistValue({sublistId: INVENTORY_ASSIGNMENT, fieldId: 'expirationdate', line: i}));
                safeSetCurrentSublistValue(targetInventoryDetail, INVENTORY_ASSIGNMENT, 'quantity',
                    Math.abs(toNumber(sourceInventoryDetail.getSublistValue({sublistId: INVENTORY_ASSIGNMENT, fieldId: 'quantity', line: i}))));
                setBinNumber(targetInventoryDetail, binText, binValue);
                safeSetCurrentSublistValue(targetInventoryDetail, INVENTORY_ASSIGNMENT, 'inventorystatus',
                    sourceInventoryDetail.getSublistValue({sublistId: INVENTORY_ASSIGNMENT, fieldId: 'inventorystatus', line: i}));
                targetInventoryDetail.commitLine({sublistId: INVENTORY_ASSIGNMENT});
            }
        }

        function setInventoryNumber(inventoryDetail, lotText, lotValue) {
            if (lotText && safeSetCurrentSublistText(inventoryDetail, INVENTORY_ASSIGNMENT, 'receiptinventorynumber', lotText)) return;
            if (lotValue && safeSetCurrentSublistValue(inventoryDetail, INVENTORY_ASSIGNMENT, 'receiptinventorynumber', lotValue)) return;
            if (lotText && safeSetCurrentSublistText(inventoryDetail, INVENTORY_ASSIGNMENT, 'issueinventorynumber', lotText)) return;
            if (lotValue) safeSetCurrentSublistValue(inventoryDetail, INVENTORY_ASSIGNMENT, 'issueinventorynumber', lotValue);
        }

        function setBinNumber(inventoryDetail, binText, binValue) {
            if (binText && safeSetCurrentSublistText(inventoryDetail, INVENTORY_ASSIGNMENT, 'binnumber', binText)) return;
            if (binValue) safeSetCurrentSublistValue(inventoryDetail, INVENTORY_ASSIGNMENT, 'binnumber', binValue);
        }

        function getInventoryNumberText(inventoryDetail, line) {
            return safeGetSublistText(inventoryDetail, INVENTORY_ASSIGNMENT, 'issueinventorynumber', line)
                || safeGetSublistText(inventoryDetail, INVENTORY_ASSIGNMENT, 'receiptinventorynumber', line);
        }

        function getInventoryNumberValue(inventoryDetail, line) {
            return safeGetSublistValue(inventoryDetail, INVENTORY_ASSIGNMENT, 'issueinventorynumber', line)
                || safeGetSublistValue(inventoryDetail, INVENTORY_ASSIGNMENT, 'receiptinventorynumber', line);
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
