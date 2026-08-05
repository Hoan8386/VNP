/**
 * Nội dung: Tính giá Bộ dự thầu / Bộ trúng thầu / Bộ custom trên sublist Item
 */
define(['N/search', 'N/record', './scv_lib_function'],

    (search, record, libFn) => {

        const SUBLIST_ITEM = 'item';
        const FIELD_ITEM = 'item';
        const FIELD_TAX_CODE = 'custcol_scv_sumtrans_line_taxcode';
        const FIELD_TAX_RATE = 'custcol_scv_sumtrans_line_taxrate';

        const GROUPS = [
            {
                qty: 'custcol_scv_qty_dt', rate: 'custcol_scv_rate_dt', rateVat: 'custcol_scv_rate_dt_vat',
                amt: 'custcol_scv_amt_dt', taxAmt: 'custcol_scv_amt_vat_dt', grossAmt: 'custcol_scv_gross_amt_dt',
                total: 'custbody_scv_total_amt_dt'
            },
            {
                qty: 'custcol_scv_qty_tt', rate: 'custcol_scv_rate_tt', rateVat: 'custcol_scv_rate_tt_vat',
                amt: 'custcol_scv_amt_tt', taxAmt: 'custcol_scv_amt_vat_tt', grossAmt: 'custcol_scv_gross_amt_tt',
                total: 'custbody_scv_total_amt_tt'
            },
            {
                qty: 'custcol_scv_quantity', rate: 'custcol_scv_rate_custom', rateVat: 'custcol_scv_rate_vat_custom',
                amt: 'custcol_scv_amt_custom', taxAmt: 'custcol_scv_tax_amt_custom', grossAmt: 'custcol_scv_gross_amt_custom',
                total: 'custbody_scv_total_amt_custom'
            }
        ];

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
            curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: 'price', value: '-1', ignoreFieldChange: true});
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

        function setTaxCodeForLine(curRec, line) {
            const existingTaxCode = getLineValue(curRec, FIELD_TAX_CODE, line);
            if (existingTaxCode) return;
            const itemId = getLineValue(curRec, FIELD_ITEM, line);
            setLineValue(curRec, FIELD_TAX_CODE, line, getTaxCodeFromItem(itemId));
        }

        function setTaxRateForLine(curRec, line) {
            const taxCodeId = getLineValue(curRec, FIELD_TAX_CODE, line);
            let taxRate = 0;
            if (taxCodeId) {
                const lkTax = search.lookupFields({type: 'salestaxitem', id: taxCodeId, columns: ['rate']});
                taxRate = parseFloat((lkTax.rate || '0').toString().replace('%', ''));
            }
            setLineValue(curRec, FIELD_TAX_RATE, line, taxRate);
        }

        function setLineDefaultsForLine(curRec, line) {
            setLineValue(curRec, 'quantity', line, 0);
            setLineValue(curRec, 'rate', line, 0);
            setLineValue(curRec, 'amount', line, 0);
            setLineValue(curRec, 'price', line, '-1');
        }

        function recalcLineGroups(curRec, line, currencyId) {
            const taxRate = parseFloat(getLineValue(curRec, FIELD_TAX_RATE, line)) || 0;
            const digit = isBaseCurrency(currencyId) ? 0 : 2;

            GROUPS.forEach(group => {
                const qty = parseFloat(getLineValue(curRec, group.qty, line)) || 0;
                let rate = parseFloat(getLineValue(curRec, group.rate, line)) || 0;
                let rateVat = parseFloat(getLineValue(curRec, group.rateVat, line)) || 0;

                if (!rate && rateVat) {
                    rate = roundNumber(rateVat / (1 + taxRate / 100), 6);
                    setLineValue(curRec, group.rate, line, rate);
                } else {
                    rateVat = roundNumber(rate * (1 + taxRate / 100), 6);
                    setLineValue(curRec, group.rateVat, line, rateVat);
                }

                const amt = roundNumber(qty * rate, digit);
                const grossAmt = roundNumber(qty * rateVat, digit);
                const taxAmt = roundNumber(grossAmt - amt, digit);

                setLineValue(curRec, group.amt, line, amt);
                setLineValue(curRec, group.taxAmt, line, taxAmt);
                setLineValue(curRec, group.grossAmt, line, grossAmt);
            });
        }

        function recalcTotalsFromAllLines(curRec) {
            const lineCount = curRec.getLineCount(SUBLIST_ITEM);
            GROUPS.forEach(group => {
                let total = 0;
                for (let i = 0; i < lineCount; i++) {
                    total += parseFloat(getLineValue(curRec, group.grossAmt, i)) || 0;
                }
                curRec.setValue({fieldId: group.total, value: total, ignoreFieldChange: true});
            });
        }

        function recalcAllLines(curRec) {
            const currencyId = curRec.getValue('currency');
            const lineCount = curRec.getLineCount(SUBLIST_ITEM);
            for (let i = 0; i < lineCount; i++) {
                setTaxCodeForLine(curRec, i);
                setTaxRateForLine(curRec, i);
                recalcLineGroups(curRec, i, currencyId);
                setLineDefaultsForLine(curRec, i);
            }
            recalcTotalsFromAllLines(curRec);
        }

        function getGroupByField(fieldId) {
            return GROUPS.find(g => fieldId === g.qty || fieldId === g.rate || fieldId === g.rateVat);
        }

        function setTaxCodeFromItem(curRec) {
            const itemId = curRec.getCurrentSublistValue(SUBLIST_ITEM, FIELD_ITEM);
            const taxCodeId = getTaxCodeFromItem(itemId);
            curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: FIELD_TAX_CODE, value: taxCodeId, ignoreFieldChange: true});
        }

        function setTaxRateFromTaxCode(curRec) {
            const taxCodeId = curRec.getCurrentSublistValue(SUBLIST_ITEM, FIELD_TAX_CODE);
            let taxRate = 0;
            if (taxCodeId) {
                const lkTax = search.lookupFields({type: 'salestaxitem', id: taxCodeId, columns: ['rate']});
                taxRate = parseFloat((lkTax.rate || '0').toString().replace('%', ''));
            }
            curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: FIELD_TAX_RATE, value: taxRate, ignoreFieldChange: true});
        }

        function recalcGroupLine(curRec, group, changedFieldId, currencyId) {
            const taxRate = parseFloat(curRec.getCurrentSublistValue(SUBLIST_ITEM, FIELD_TAX_RATE)) || 0;
            const qty = parseFloat(curRec.getCurrentSublistValue(SUBLIST_ITEM, group.qty)) || 0;
            let rate = parseFloat(curRec.getCurrentSublistValue(SUBLIST_ITEM, group.rate)) || 0;
            let rateVat = parseFloat(curRec.getCurrentSublistValue(SUBLIST_ITEM, group.rateVat)) || 0;

            if (changedFieldId === group.rateVat) {
                rate = roundNumber(rateVat / (1 + taxRate / 100), 6);
                curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: group.rate, value: rate, ignoreFieldChange: true});
            } else {
                rateVat = roundNumber(rate * (1 + taxRate / 100), 6);
                curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: group.rateVat, value: rateVat, ignoreFieldChange: true});
            }

            const digit = isBaseCurrency(currencyId) ? 0 : 2;
            const amt = roundNumber(qty * rate, digit);
            const grossAmt = roundNumber(qty * rateVat, digit);
            const taxAmt = roundNumber(grossAmt - amt, digit);

            curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: group.amt, value: amt, ignoreFieldChange: true});
            curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: group.taxAmt, value: taxAmt, ignoreFieldChange: true});
            curRec.setCurrentSublistValue({sublistId: SUBLIST_ITEM, fieldId: group.grossAmt, value: grossAmt, ignoreFieldChange: true});
        }

        function recalcAllGroups(curRec, currencyId) {
            GROUPS.forEach(group => recalcGroupLine(curRec, group, group.rate, currencyId));
        }

        function updateGroupTotal(curRec, group) {
            const lineCount = curRec.getLineCount(SUBLIST_ITEM);
            const lineId = curRec.getCurrentSublistIndex(SUBLIST_ITEM);
            const grossAmt = parseFloat(curRec.getCurrentSublistValue(SUBLIST_ITEM, group.grossAmt)) || 0;
            let total = 0;
            for (let i = 0; i < lineCount; i++) {
                total += (i === lineId) ? grossAmt : (parseFloat(curRec.getSublistValue({sublistId: SUBLIST_ITEM, fieldId: group.grossAmt, line: i})) || 0);
            }
            if (lineId === lineCount) total += grossAmt;
            curRec.setValue({fieldId: group.total, value: total, ignoreFieldChange: true});
        }

        function updateAllGroupTotals(curRec) {
            GROUPS.forEach(group => updateGroupTotal(curRec, group));
        }

        return {
            SUBLIST_ITEM,
            FIELD_ITEM,
            FIELD_TAX_CODE,
            FIELD_TAX_RATE,
            GROUPS,
            setLineDefaults,
            recalcAllLines,
            recalcTotalsFromAllLines,
            getGroupByField,
            setTaxCodeFromItem,
            setTaxRateFromTaxCode,
            recalcGroupLine,
            recalcAllGroups,
            updateGroupTotal,
            updateAllGroupTotals
        };

    });
