/**
 * Noi dung: Add Create INA button on outbound Inventory Adjustment.
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search', 'N/url'],
    (search, url) => {

        const INVENTORY_SUBLIST = 'inventory';

        const FIELD = {
            FOR_ORDER_TYPE: 'custbody_scv_for_order_type',
            FOR_LOCATION: 'custbody_scv_for_location',
            INVENTORY_ADJUSTMENT: 'custbody_scv_inventory_adjustment'
        };

        const ORDER_TYPE_RECORD = 'customrecord_scv_order_type';
        const ORDER_TYPE_FIELD = {
            ADJUST_ACCOUNT: 'custrecord_scv_adjust_account'
        };

        const SUITELET = {
            SCRIPT_ID: 'customscript_scv_sl_create_ina_from_ina',
            DEPLOYMENT_ID: 'customdeploy_scv_sl_create_ina_from_ina'
        };

        function beforeLoad(scriptContext) {
            try {
                if (scriptContext.type !== scriptContext.UserEventType.VIEW) return;

                const rec = scriptContext.newRecord;
                if (!canCreateInboundInventoryAdjustment(rec)) return;

                const resolvedUrl = url.resolveScript({
                    scriptId: SUITELET.SCRIPT_ID,
                    deploymentId: SUITELET.DEPLOYMENT_ID,
                    params: {iaid: rec.id}
                });

                scriptContext.form.addButton({
                    id: 'custpage_scv_create_ina_from_ina',
                    label: 'Create INA',
                    functionName: `window.open("${resolvedUrl}", "_self")`
                });
            } catch (e) {
                log.error('beforeLoad Create INA From Outbound INA', e);
            }
        }

        function canCreateInboundInventoryAdjustment(rec) {
            if (!rec.getValue(FIELD.FOR_LOCATION)) return false;
            if (rec.getValue(FIELD.INVENTORY_ADJUSTMENT)) return false;
            if (!getAdjustAccount(rec.getValue(FIELD.FOR_ORDER_TYPE))) return false;

            const lineCount = rec.getLineCount({sublistId: INVENTORY_SUBLIST});
            if (!lineCount) return false;

            for (let i = 0; i < lineCount; i++) {
                const quantity = toNumber(rec.getSublistValue({
                    sublistId: INVENTORY_SUBLIST,
                    fieldId: 'adjustqtyby',
                    line: i
                }));
                if (quantity >= 0) return false;
            }
            return true;
        }

        function getAdjustAccount(orderType) {
            if (!orderType) return '';
            try {
                const fields = search.lookupFields({
                    type: ORDER_TYPE_RECORD,
                    id: orderType,
                    columns: [ORDER_TYPE_FIELD.ADJUST_ACCOUNT]
                });
                const adjustAccount = fields[ORDER_TYPE_FIELD.ADJUST_ACCOUNT];
                return (adjustAccount && adjustAccount.length) ? adjustAccount[0].value : '';
            } catch (e) {
                log.error('Get Order Type Adjust Account Error', {orderType, error: e});
                return '';
            }
        }

        function toNumber(value) {
            const number = parseFloat(value || 0);
            return isNaN(number) ? 0 : number;
        }

        return {beforeLoad};
    });
