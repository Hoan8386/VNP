/**
 * Noi dung: Add Create INA button on Item Fulfillment.
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search', 'N/url'],
    (search, url) => {

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
            SCRIPT_ID: 'customscript_scv_sl_create_ina_from_itf',
            DEPLOYMENT_ID: 'customdeploy_scv_sl_create_ina_from_itf'
        };

        function beforeLoad(scriptContext) {
            try {
                if (scriptContext.type !== scriptContext.UserEventType.VIEW) return;

                const rec = scriptContext.newRecord;
                if (!canCreateInventoryAdjustment(rec)) return;

                const resolvedUrl = url.resolveScript({
                    scriptId: SUITELET.SCRIPT_ID,
                    deploymentId: SUITELET.DEPLOYMENT_ID,
                    params: {ifid: rec.id}
                });

                scriptContext.form.addButton({
                    id: 'custpage_scv_create_ina',
                    label: 'Create INA',
                    functionName: `window.open("${resolvedUrl}", "_self")`
                });
            } catch (e) {
                log.error('beforeLoad Create INA From Item Fulfillment', e);
            }
        }

        function canCreateInventoryAdjustment(rec) {
            const orderType = rec.getValue(FIELD.FOR_ORDER_TYPE);
            const forLocation = rec.getValue(FIELD.FOR_LOCATION);
            const inventoryAdjustment = rec.getValue(FIELD.INVENTORY_ADJUSTMENT);

            return !!orderType
                && !!forLocation
                && !inventoryAdjustment
                && !!getAdjustAccount(orderType);
        }

        function getAdjustAccount(orderType) {
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

        return {beforeLoad};
    });
