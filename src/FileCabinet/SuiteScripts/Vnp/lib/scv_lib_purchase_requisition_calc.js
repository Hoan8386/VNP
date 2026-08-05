/**
 * Nội dung: Tính giá Bộ Custom trên sublist Item
 */
define(['N/search', 'N/record', './scv_lib_function'],

    (search, record, libFn) => {

        const SUBLIST_ITEM = 'item';
        const FIELD_ITEM = 'item';
        const FIELD_TAX_CODE = 'custcol_scv_sumtrans_line_taxcode';
        const FIELD_TAX_RATE = 'custcol_scv_sumtrans_line_taxrate';

        const FIELD = {
            QUANTITY_CUSTOM: 'custcol_scv_quantity',
            RATE_CUSTOM: 'custcol_scv_rate_custom',
            AMT_CUSTOM: 'custcol_scv_amt_custom',
            TAX_AMT_CUSTOM: 'custcol_scv_tax_amt_custom',
            GROSS_AMT_CUSTOM: 'custcol_scv_gross_amt_custom'
        };
        const CALC_TRIGGER_FIELDS = [FIELD.QUANTITY_CUSTOM, FIELD.RATE_CUSTOM];

        function roundNumber(number, digit = 0) {
            if (number === null || number === undefined || number === '') return 0;
            return parseFloat(Number(number).toFixed(digit)) || 0;
        }

        function isBaseCurrency(currencyId) {
            return !currencyId || currencyId === '1';
        }

        function getLineValue(curRec, fieldId, line) {
            return curRec.getSublistValue({sublistId: SUBLIST_ITEM, fieldId: fieldId, line: line});
        }

        function setLineValue(curRec, fieldId, line, value) {
            curRec.setSublistValue({sublistId: SUBLIST_ITEM, fieldId: fieldId, line: line, value: value});
        }

        function setLineDefaults(curRec) {
            curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'quantity', value: 0, ignoreFieldChange: true});
            curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'rate', value: 0, ignoreFieldChange: true});
            curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'amount', value: 0, ignoreFieldChange: true});
        }

        function clearCurrentLineOriginId(curRec) {
            curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'custcol_scv_origin_line_num', value: '', ignoreFieldChange: true});
        }

        function getTaxCodeFromItem(itemId) {
            if (!itemId) return '';
            const itemType = libFn.getItemRecordType(itemId);
            const lkItem = search.lookupFields({type: itemType, id: itemId, columns: ['taxschedule']});
            const taxScheduleId = lkItem.taxschedule?.[0]?.value;
            if (!taxScheduleId) return '';
            const recSchedule = record.load({type: 'taxschedule', id: taxScheduleId});
            return recSchedule.getSublistValue({sublistId: 'nexuses', fieldId: 'salestaxcode', line: 0}) || '';
        }

        function getTaxRateFromTaxCode(taxCodeId) {
            if (!taxCodeId) return 0;
            const lkTax = search.lookupFields({type: 'salestaxitem', id: taxCodeId, columns: ['rate']});
            return parseFloat((lkTax.rate || '0').toString().replace('%', ''));
        }

        function calcLineValues(qty, rateCustom, taxRate, digit) {
            const amtCustom = roundNumber(qty * rateCustom, digit);
            const taxAmtCustom = roundNumber(qty * rateCustom * taxRate / 100, digit);
            const grossAmtCustom = roundNumber(amtCustom + taxAmtCustom, digit);
            return {amtCustom, taxAmtCustom, grossAmtCustom};
        }

        function setTaxCodeForLine(curRec, line) {
            const existingTaxCode = getLineValue(curRec, FIELD_TAX_CODE, line);
            if (existingTaxCode) return;
            const itemId = getLineValue(curRec, FIELD_ITEM, line);
            setLineValue(curRec, FIELD_TAX_CODE, line, getTaxCodeFromItem(itemId));
        }

        function setTaxRateForLine(curRec, line) {
            const taxCodeId = getLineValue(curRec, FIELD_TAX_CODE, line);
            setLineValue(curRec, FIELD_TAX_RATE, line, getTaxRateFromTaxCode(taxCodeId));
        }

        function setLineDefaultsForLine(curRec, line) {
            setLineValue(curRec, 'quantity', line, 0);
            setLineValue(curRec, 'rate', line, 0);
            setLineValue(curRec, 'amount', line, 0);
        }

        function recalcLine(curRec, line, currencyId) {
            const taxRate = parseFloat(getLineValue(curRec, FIELD_TAX_RATE, line)) || 0;
            const digit = isBaseCurrency(currencyId) ? 0 : 2;
            const qty = parseFloat(getLineValue(curRec, FIELD.QUANTITY_CUSTOM, line)) || 0;
            const rateCustom = parseFloat(getLineValue(curRec, FIELD.RATE_CUSTOM, line)) || 0;

            const v = calcLineValues(qty, rateCustom, taxRate, digit);

            setLineValue(curRec, FIELD.AMT_CUSTOM, line, v.amtCustom);
            setLineValue(curRec, FIELD.TAX_AMT_CUSTOM, line, v.taxAmtCustom);
            setLineValue(curRec, FIELD.GROSS_AMT_CUSTOM, line, v.grossAmtCustom);
        }

        function recalcAllLines(curRec) {
            const currencyId = curRec.getValue('currency');
            const lineCount = curRec.getLineCount(SUBLIST_ITEM);
            for (let i = 0; i < lineCount; i++) {
                setTaxCodeForLine(curRec, i);
                setTaxRateForLine(curRec, i);
                recalcLine(curRec, i, currencyId);
                setLineDefaultsForLine(curRec, i);
            }
        }


        function setTaxCodeFromItemCurrent(curRec) {
            const itemId = curRec.getCurrentSublistValue(SUBLIST_ITEM, FIELD_ITEM);
            curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: FIELD_TAX_CODE, value: getTaxCodeFromItem(itemId), ignoreFieldChange: true});
        }

        function setTaxRateFromTaxCodeCurrent(curRec) {
            const taxCodeId = curRec.getCurrentSublistValue(SUBLIST_ITEM, FIELD_TAX_CODE);
            curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: FIELD_TAX_RATE, value: getTaxRateFromTaxCode(taxCodeId), ignoreFieldChange: true});
        }

        function recalcCurrentLine(curRec, currencyId) {
            const taxRate = parseFloat(curRec.getCurrentSublistValue(SUBLIST_ITEM, FIELD_TAX_RATE)) || 0;
            const digit = isBaseCurrency(currencyId) ? 0 : 2;
            const qty = parseFloat(curRec.getCurrentSublistValue(SUBLIST_ITEM, FIELD.QUANTITY_CUSTOM)) || 0;
            const rateCustom = parseFloat(curRec.getCurrentSublistValue(SUBLIST_ITEM, FIELD.RATE_CUSTOM)) || 0;

            const v = calcLineValues(qty, rateCustom, taxRate, digit);

            curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: FIELD.AMT_CUSTOM, value: v.amtCustom, ignoreFieldChange: true});
            curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: FIELD.TAX_AMT_CUSTOM, value: v.taxAmtCustom, ignoreFieldChange: true});
            curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: FIELD.GROSS_AMT_CUSTOM, value: v.grossAmtCustom, ignoreFieldChange: true});
        }

        return {
            SUBLIST_ITEM,
            FIELD_ITEM,
            FIELD_TAX_CODE,
            FIELD_TAX_RATE,
            FIELD,
            CALC_TRIGGER_FIELDS,
            setLineDefaults,
            clearCurrentLineOriginId,
            recalcAllLines,
            setTaxCodeFromItemCurrent,
            setTaxRateFromTaxCodeCurrent,
            recalcCurrentLine
        };

    });
