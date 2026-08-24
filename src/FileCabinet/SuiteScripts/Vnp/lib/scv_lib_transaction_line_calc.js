/**
 * Noi dung: Tinh cac field gia/CK chung cho Sales Order va Purchase Order theo FDD.
 */
define([],

    () => {

        const SUBLIST_ITEM = 'item';

        const FIELD = {
            QUANTITY: 'quantity',
            RATE: 'rate',
            AMOUNT: 'amount',
            TAX_RATE_CUSTOM: 'custcol_scv_sumtrans_line_taxrate',
            TAX_RATE_NATIVE: 'taxrate1',
            RATE_PRE_DISCOUNT: 'custcol_scv_rate_pre_discount',
            AMT_PRE_DISCOUNT: 'custcol_scv_amt_pre_discount',
            DISCOUNT_PER: 'custcol_scv_discount_per',
            DISCOUNT_AMT: 'custcol_scv_discount_amt',
            RATE_VAT_CUSTOM: 'custcol_scv_rate_vat_custom'
        };

        const CALC_TRIGGER_FIELDS = [
            FIELD.QUANTITY,
            FIELD.RATE,
            FIELD.TAX_RATE_CUSTOM,
            FIELD.TAX_RATE_NATIVE,
            FIELD.RATE_PRE_DISCOUNT,
            FIELD.DISCOUNT_PER,
            FIELD.RATE_VAT_CUSTOM
        ];

        function toNumber(value) {
            if (value === null || value === undefined || value === '') return 0;
            return parseFloat(String(value).replace('%', '').replace(/,/g, '')) || 0;
        }

        function toRate(value) {
            const number = toNumber(value);
            return Math.abs(number) > 1 ? number / 100 : number;
        }

        function hasValue(value) {
            return value !== null && value !== undefined && value !== '';
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
                return curRec.getCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: fieldId});
            } catch (e) {
                return '';
            }
        }

        function setCurrent(curRec, fieldId, value) {
            try {
                curRec.setCurrentSublistValue({
                    sublistId: SUBLIST_ITEM,
                    fieldId: fieldId,
                    value: value,
                    ignoreFieldChange: true
                });
            } catch (e) {
                return false;
            }
            return true;
        }

        function getLine(curRec, fieldId, line) {
            try {
                return curRec.getSublistValue({sublistId: SUBLIST_ITEM, fieldId: fieldId, line: line});
            } catch (e) {
                return '';
            }
        }

        function setLine(curRec, fieldId, line, value) {
            try {
                curRec.setSublistValue({sublistId: SUBLIST_ITEM, fieldId: fieldId, line: line, value: value});
            } catch (e) {
                return false;
            }
            return true;
        }

        function getCurrentTaxRate(curRec) {
            return toRate(getCurrent(curRec, FIELD.TAX_RATE_CUSTOM) || getCurrent(curRec, FIELD.TAX_RATE_NATIVE));
        }

        function getLineTaxRate(curRec, line) {
            return toRate(getLine(curRec, FIELD.TAX_RATE_CUSTOM, line) || getLine(curRec, FIELD.TAX_RATE_NATIVE, line));
        }

        function calcValues(options) {
            const digit = isBaseCurrency(options.currencyId) ? 0 : 2;
            let rate = toNumber(options.rate);
            const qty = toNumber(options.qty);
            const taxRate = options.taxRate || 0;
            const rateVatCustom = toNumber(options.rateVatCustom);
            const ratePreDiscount = toNumber(options.ratePreDiscount);
            const amtPreDiscount = roundNumber(ratePreDiscount * qty, digit);
            const discountAmt = roundNumber(amtPreDiscount * toRate(options.discountPer), digit);
            if (hasValue(options.ratePreDiscount)) {
                rate = qty ? roundNumber((amtPreDiscount - discountAmt) / qty, 6) : 0;
            } else {
                rate = roundNumber(rateVatCustom / (1 + taxRate), 6);
            }
            const amount = roundNumber(qty * rate, digit);
            const nextRateVatCustom = roundNumber(rate * (1 + taxRate), 6);

            return {rate, amount, amtPreDiscount, discountAmt, rateVatCustom: nextRateVatCustom};
        }

        function recalcCurrentLine(curRec, changedFieldId) {
            const values = calcValues({
                changedFieldId: changedFieldId,
                currencyId: curRec.getValue({fieldId: 'currency'}),
                qty: getCurrent(curRec, FIELD.QUANTITY),
                rate: getCurrent(curRec, FIELD.RATE),
                taxRate: getCurrentTaxRate(curRec),
                ratePreDiscount: getCurrent(curRec, FIELD.RATE_PRE_DISCOUNT),
                discountPer: getCurrent(curRec, FIELD.DISCOUNT_PER),
                rateVatCustom: getCurrent(curRec, FIELD.RATE_VAT_CUSTOM)
            });

            setCurrent(curRec, FIELD.RATE, values.rate);
            setCurrent(curRec, FIELD.AMOUNT, values.amount);
            setCurrent(curRec, FIELD.AMT_PRE_DISCOUNT, values.amtPreDiscount);
            setCurrent(curRec, FIELD.DISCOUNT_AMT, values.discountAmt);
            setCurrent(curRec, FIELD.RATE_VAT_CUSTOM, values.rateVatCustom);
        }

        function recalcLine(curRec, line) {
            const values = calcValues({
                currencyId: curRec.getValue({fieldId: 'currency'}),
                qty: getLine(curRec, FIELD.QUANTITY, line),
                rate: getLine(curRec, FIELD.RATE, line),
                taxRate: getLineTaxRate(curRec, line),
                ratePreDiscount: getLine(curRec, FIELD.RATE_PRE_DISCOUNT, line),
                discountPer: getLine(curRec, FIELD.DISCOUNT_PER, line),
                rateVatCustom: getLine(curRec, FIELD.RATE_VAT_CUSTOM, line)
            });

            setLine(curRec, FIELD.RATE, line, values.rate);
            setLine(curRec, FIELD.AMOUNT, line, values.amount);
            setLine(curRec, FIELD.AMT_PRE_DISCOUNT, line, values.amtPreDiscount);
            setLine(curRec, FIELD.DISCOUNT_AMT, line, values.discountAmt);
            setLine(curRec, FIELD.RATE_VAT_CUSTOM, line, values.rateVatCustom);
        }

        function recalcAllLines(curRec) {
            const lineCount = curRec.getLineCount({sublistId: SUBLIST_ITEM});
            for (let i = 0; i < lineCount; i++) {
                recalcLine(curRec, i);
            }
        }

        return {
            SUBLIST_ITEM,
            FIELD,
            CALC_TRIGGER_FIELDS,
            recalcCurrentLine,
            recalcAllLines
        };

    });
