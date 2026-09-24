/**
 * Noi dung: Add Create INA button on Sales Order.
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/search', 'N/url'],
    (search, url) => {

        const FIELD = {
            ORDER_TYPE: 'custbody_scv_order_type',
            TRANSACTION_TYPE: 'custbody_scv_trans_type',
            INVENTORY_ADJUSTMENT: 'custbody_scv_inventory_adjustment'
        };

        const ORDER_TYPE_RECORD = 'customrecord_scv_order_type';
        const ORDER_TYPE_FIELD = {
            ADJUST_ACCOUNT: 'custrecord_scv_adjust_account'
        };

        const SUITELET = {
            SCRIPT_ID: 'customscript_scv_sl_create_ina_from_so',
            DEPLOYMENT_ID: 'customdeploy_scv_sl_create_ina_from_so'
        };

        function beforeLoad(scriptContext) {
            try {
                if (scriptContext.type !== scriptContext.UserEventType.VIEW) return;

                const rec = scriptContext.newRecord;
                if (!canCreateInventoryAdjustment(rec)) return;

                const resolvedUrl = url.resolveScript({
                    scriptId: SUITELET.SCRIPT_ID,
                    deploymentId: SUITELET.DEPLOYMENT_ID,
                    params: {soid: rec.id}
                });

                scriptContext.form.addButton({
                    id: 'custpage_scv_so_create_ina',
                    label: 'Create INA',
                    functionName: `window.open("${resolvedUrl}", "_self")`
                });
            } catch (e) {
                log.error('beforeLoad Create INA From Sales Order', e);
            }
        }

        function canCreateInventoryAdjustment(rec) {
            const orderType = rec.getValue(FIELD.ORDER_TYPE);
            if (!orderType) return false;
            if (rec.getValue(FIELD.INVENTORY_ADJUSTMENT)) return false;
            if (!isInventoryAdjustmentTransactionType(rec)) return false;
            return !!getAdjustAccount(orderType);
        }

        function isInventoryAdjustmentTransactionType(rec) {
            const value = String(rec.getValue(FIELD.TRANSACTION_TYPE) || '').toLowerCase();
            const text = String(rec.getText(FIELD.TRANSACTION_TYPE) || '').toLowerCase();
            return ['11', 'invadjst', 'inventoryadjustment'].indexOf(value) >= 0
                || text === 'inventory adjustment';
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
