/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define([],
    () => {

        const SUBLIST_ITEM = 'item';

        const FIELD = {
            UNIT: 'units',
            EINVOICE_UNIT: 'custcol_scv_einvoice_unit',
            QUANTITY: 'quantity',
            RATE_PRE_DISCOUNT: 'custcol_scv_rate_pre_discount',
            AMT_PRE_DISCOUNT: 'custcol_scv_amt_pre_discount',
            DISCOUNT_PER: 'custcol_scv_discount_per',
            DISCOUNT_AMT: 'custcol_scv_discount_amt',
            RATE_VAT_CUSTOM: 'custcol_scv_rate_vat_custom'
        };

        const CALC_TRIGGER_FIELDS = [
            FIELD.UNIT,
            FIELD.QUANTITY,
            FIELD.RATE_PRE_DISCOUNT,
            FIELD.DISCOUNT_PER,
            FIELD.RATE_VAT_CUSTOM
        ];

        function toNumber(value) {
            if (value === null || value === undefined || value === '') return 0;
            return parseFloat(String(value).replace('%', '').replace(/,/g, '')) || 0;
        }

        function roundNumber(number, digit = 0) {
            if (number === null || number === undefined || number === '') return 0;
            return parseFloat(Number(number).toFixed(digit)) || 0;
        }

        function isBaseCurrency(currencyId) {
            return !currencyId || currencyId === '1';
        }

        function getCurrent(curRec, fieldId) {
            try {
                return curRec.getCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId});
            } catch (e) {
                return '';
            }
        }

        function getCurrentText(curRec, fieldId) {
            try {
                return curRec.getCurrentSublistText({sublistId: SUBLIST_ITEM, fieldId}) || '';
            } catch (e) {
                return '';
            }
        }

        function setCurrent(curRec, fieldId, value) {
            try {
                curRec.setCurrentSublistValue({
                    sublistId: SUBLIST_ITEM,
                    fieldId,
                    value,
                    ignoreFieldChange: true
                });
            } catch (e) {
                return false;
            }
            return true;
        }

        function recalcCurrentLine(curRec) {
            const digit = isBaseCurrency(curRec.getValue({fieldId: 'currency'})) ? 0 : 2;
            const qty = toNumber(getCurrent(curRec, FIELD.QUANTITY));
            const ratePreDiscount = toNumber(getCurrent(curRec, FIELD.RATE_PRE_DISCOUNT));
            const amtPreDiscount = roundNumber(ratePreDiscount * qty, digit);
            const discountPer = toNumber(getCurrent(curRec, FIELD.DISCOUNT_PER));
            const discountRate = Math.abs(discountPer) > 1 ? discountPer / 100 : discountPer;
            const discountAmt = roundNumber(amtPreDiscount * discountRate, digit);

            setCurrent(curRec, FIELD.AMT_PRE_DISCOUNT, amtPreDiscount);
            setCurrent(curRec, FIELD.DISCOUNT_AMT, discountAmt);
            setCurrent(curRec, FIELD.EINVOICE_UNIT, getCurrentText(curRec, FIELD.UNIT) || getCurrent(curRec, FIELD.UNIT));
        }

        const fieldChanged = (scriptContext) => {
            try {
                if (scriptContext.sublistId !== SUBLIST_ITEM) return;
                if (!CALC_TRIGGER_FIELDS.includes(scriptContext.fieldId)) return;
                recalcCurrentLine(scriptContext.currentRecord);
            } catch (e) {
                log.error('Error fieldChanged', e);
            }
        }

        return {fieldChanged};

    });
