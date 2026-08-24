/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['../lib/scv_lib_transaction_line_calc'],
    (libCalc) => {

        const fieldChanged = (scriptContext) => {
            try {
                if (scriptContext.sublistId !== libCalc.SUBLIST_ITEM) return;
                if (!libCalc.CALC_TRIGGER_FIELDS.includes(scriptContext.fieldId)) return;
                libCalc.recalcCurrentLine(scriptContext.currentRecord, scriptContext.fieldId);
            } catch (e) {
                log.error('Error fieldChanged', e);
            }
        }

        const sublistChanged = (scriptContext) => {
            try {
                if (scriptContext.sublistId !== libCalc.SUBLIST_ITEM) return;
                libCalc.recalcAllLines(scriptContext.currentRecord);
            } catch (e) {
                log.error('Error sublistChanged', e);
            }
        }

        return {fieldChanged, sublistChanged};

    });
