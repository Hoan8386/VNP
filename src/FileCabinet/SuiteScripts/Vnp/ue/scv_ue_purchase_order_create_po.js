/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['../lib/scv_lib_create_purchase_order'],
    (libCreatePo) => {

        function beforeSubmit(scriptContext) {
            try {
                if (scriptContext.type !== scriptContext.UserEventType.DELETE) return;
                libCreatePo.rollbackDeletedPurchaseOrder(scriptContext.oldRecord);
            } catch (e) {
                log.error('Rollback Create PO Quantity Error', e);
                throw e;
            }
        }

        return {beforeSubmit};
    });
