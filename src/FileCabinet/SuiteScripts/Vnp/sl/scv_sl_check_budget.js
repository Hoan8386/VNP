/**
 * Budget check for Payment Request.
 *
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record', 'N/search', 'N/redirect'], (record, search, redirect) => {
    const PAYR = 'customrecord_scv_paymentrequest';
    const DETAIL_SUBLIST = 'recmachcustrecord_scv_pay';
    const SEARCH = {
        USAGE: 'customsearch_scv_bgusage',
        COMMIT: 'customsearch_scv_bgpr',
        CURRENT: 'customsearch_scv_bgpr_open'
    };
    const FIELD = {
        DATE: 'custrecord_scv_payment_date',
        SUBSIDIARY: 'custrecord_scv_payr_subs',
        DEPARTMENT: 'custrecord_scv_pay_detail_department',
        CLASS: 'custrecord_scv_pay_detail_class',
        GROSS: 'custrecord_scv_pay_detail_gr_amt',
        EXCHANGE_RATE: 'custrecord_scv_payment_exchangerate',
        LINE_RESULT: 'custrecord_scv_pr_budget_check_line',
        REMAINING: 'custrecord_scv_budget_remaining',
        HEADER_RESULT: 'custrecord_scv_pr_budget_check_result',
        WARNING: 'custrecord_scv_pur_bg_warning'
    };
    const LINE = { UNKNOWN: '1', IN_BUDGET: '2', OVER_BUDGET: '3' };
    const HEADER = { PASS: '2', OVER: '3', UNCONTROLLED: '5' };
    const WARNING = 'Một hoặc nhiều dòng không đáp ứng ngân sách. Vui lòng kiểm tra chi tiết từng dòng.';

    const onRequest = (context) => {
        const id = context.request.parameters.id_rec || context.request.parameters.id;
        if (!id) throw new Error('Không tìm thấy Payment Request cần kiểm tra ngân sách.');
        checkBudget(id);
        redirect.toRecord({
            type: PAYR,
            id,
            isEditMode: false
        });
    };

    const checkBudget = (payrId) => {
        const payr = record.load({type: PAYR, id: payrId, isDynamic: false});
        const date = payr.getValue({fieldId: FIELD.DATE});
        if (!date) throw new Error('Payment Request chưa có Date.');
        const year = date instanceof Date ? date.getFullYear() : new Date(date).getFullYear();
        if (isNaN(year)) throw new Error('Date của Payment Request không hợp lệ.');
        const from = new Date(year, 0, 1); const to = new Date(year, 11, 31, 23, 59, 59);
        const usage = readSearch(SEARCH.USAGE, from, to);
        const committed = readSearch(SEARCH.COMMIT, from, to, payrId);
        const current = readSearch(SEARCH.CURRENT, from, to, payrId);
        const exchangeRate = number(payr.getValue({fieldId: FIELD.EXCHANGE_RATE})) || 1;
        const lines = [];
        const count = payr.getLineCount({sublistId: DETAIL_SUBLIST});
        for (let i = 0; i < count; i++) {
            const key = {
                subsidiary: payr.getValue({fieldId: FIELD.SUBSIDIARY}),
                department: payr.getSublistValue({sublistId: DETAIL_SUBLIST, fieldId: FIELD.DEPARTMENT, line: i}),
                expenseClass: payr.getSublistValue({sublistId: DETAIL_SUBLIST, fieldId: FIELD.CLASS, line: i})
            };
            const budget = findTotal(usage, key, 'usage');
            const used = findTotal(committed, key, 'amount');
            const gross = payr.getSublistValue({sublistId: DETAIL_SUBLIST, fieldId: FIELD.GROSS, line: i});
            const remaining = budget === null ? null : budget - used;
            let lineResult = LINE.UNKNOWN;
            if (remaining !== null && gross !== null && gross !== '' && number(gross) >= 0) {
                lineResult = remaining - (number(gross) * exchangeRate) >= 0 ? LINE.IN_BUDGET : LINE.OVER_BUDGET;
            }
            payr.setSublistValue({sublistId: DETAIL_SUBLIST, fieldId: FIELD.REMAINING, line: i, value: remaining === null ? '' : remaining});
            payr.setSublistValue({sublistId: DETAIL_SUBLIST, fieldId: FIELD.LINE_RESULT, line: i, value: lineResult});
            lines.push({
                result: lineResult,
                remaining,
                gross: number(gross),
                // (C) from SS3 is the current document's committed amount.
                current: findTotal(current, key, 'amount')
            });
        }
        const header = summarize(lines);
        payr.setValue({fieldId: FIELD.HEADER_RESULT, value: header.result});
        payr.setValue({fieldId: FIELD.WARNING, value: header.warning});
        payr.save({enableSourcing: false, ignoreMandatoryFields: true});
        return {message: `Kết quả: ${header.label}`};
    };

    const summarize = (lines) => {
        if (!lines.length || lines.some(x => x.remaining === null || x.result === LINE.UNKNOWN)) {
            return {result: HEADER.UNCONTROLLED, warning: WARNING, label: 'Không kiểm soát ngân sách'};
        }
        const currentFits = lines.every(x => x.current <= x.remaining);
        if (lines.every(x => x.result === LINE.IN_BUDGET) && currentFits) {
            return {result: HEADER.PASS, warning: '', label: 'Budget check pass'};
        }
        const allOver = lines.every(x => x.result === LINE.OVER_BUDGET) ||
            lines.every(x => x.current > x.remaining);
        if (allOver) {
            return {result: HEADER.OVER, warning: WARNING, label: 'Over Budget'};
        }
        return {result: HEADER.OVER, warning: WARNING, label: 'Budget check partially'};
    };

    const readSearch = (id, from, to, currentId) => {
        const loaded = search.load({id});
        if (currentId && id === SEARCH.COMMIT) {
            loaded.filters.push(search.createFilter({
                name: 'internalid',
                join: 'custrecord_scv_pay',
                operator: search.Operator.NONEOF,
                values: currentId
            }));
        }
        if (currentId && id === SEARCH.CURRENT) {
            loaded.filters.push(search.createFilter({
                name: 'internalid',
                join: 'custrecord_scv_pay',
                operator: search.Operator.ANYOF,
                values: currentId
            }));
        }
        const rows = [];
        loaded.run().each(result => { rows.push(toRow(result)); return true; });
        let filtered = rows.filter(row => inDateRange(row.date, from, to) &&
            (!row.fromDate || row.fromDate >= from) && (!row.toDate || row.toDate <= to));
        // SS3 is expected to contain the current PayR. Enforce the FDD rule when
        // the saved search exposes its internal ID (some summary searches do not).
        if (currentId && id === SEARCH.CURRENT) {
            const identified = filtered.filter(row => row.id !== '');
            if (identified.length) filtered = identified.filter(row => String(row.id) === String(currentId));
        }
        return filtered;
    };

    const toRow = (result) => {
        const row = {values: {}, date: null, fromDate: null, toDate: null};
        (result.columns || []).forEach(column => {
            const key = normalize(column.label || column.name);
            const value = result.getValue(column);
            const text = result.getText(column);
            row.values[key] = {value, text};
            if (/^(date|trandate)$/.test(key)) row.date = parseDate(value || text);
            if (key === 'fromdate') row.fromDate = parseDate(value || text);
            if (key === 'todate') row.toDate = parseDate(value || text);
        });
        row.id = valueOf(row, ['internalid', 'id']);
        return row;
    };

    const findTotal = (rows, key, amountKind) => {
        const matches = rows.filter(row => match(row, key));
        if (!matches.length) return amountKind === 'usage' ? null : 0;
        let total = 0;
        matches.forEach(row => total += number(valueOf(row, amountKind === 'usage'
            ? ['usageamount', 'usage', 'budget', 'amount'] : ['amount', 'commitamount', 'grossamount', 'usageamount'])));
        return total;
    };

    const match = (row, key) => {
        return same(row, ['subsidiary', 'sub', 'subsidiaryid'], key.subsidiary) &&
            same(row, ['department', 'departmentid'], key.department) &&
            same(row, ['expenseclass', 'expenseclassid', 'class', 'budgetclass', 'budgetclassid'], key.expenseClass);
    };

    const same = (row, keys, expected) => {
        if (expected === null || expected === undefined || expected === '') return true;
        const actual = valueOf(row, keys); const display = textOf(row, keys);
        return String(actual || '') === String(expected) || String(display || '') === String(expected);
    };
    const valueOf = (row, keys) => { for (const key of keys) if (row.values[normalize(key)]?.value !== undefined) return row.values[normalize(key)].value; return ''; };
    const textOf = (row, keys) => { for (const key of keys) if (row.values[normalize(key)]?.text) return row.values[normalize(key)].text; return ''; };
    const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const number = (value) => { const n = parseFloat(String(value ?? '').replace(/,/g, '')); return isNaN(n) ? 0 : n; };
    const parseDate = (value) => { if (!value) return null; const d = value instanceof Date ? value : new Date(value); return isNaN(d) ? null : d; };
    const inDateRange = (value, from, to) => {
        if (value && !(value >= from && value <= to)) return false;
        return true;
    };
    return {onRequest};
});
