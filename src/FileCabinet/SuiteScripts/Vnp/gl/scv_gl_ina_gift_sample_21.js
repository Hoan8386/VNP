/**
 * Noi dung: Custom GL for Inventory Adjustment gift/sample issue.
 *
 * @NApiVersion 2.1
 * @NScriptType customglplugin
 */
define(['N/log', 'N/search'], (log, search) => {
    const INTERMEDIATE_ACCOUNT_ID = 112;

    function customizeGlImpact(context) {
        try {
            const transactionRecord = context.transactionRecord;
            if (getRecordType(transactionRecord) !== 'inventoryadjustment') return;

            const sourceTransactionId = getValue(transactionRecord, 'custbody_scv_created_transaction');
            if (!isCreatedFromSalesOrder(sourceTransactionId)) return;

            const orderTypeId = getValue(transactionRecord, 'custbody_scv_order_type');
            if (!orderTypeId || !isIntercompanyOrderType(orderTypeId)) return;

            const lines = getAdjustmentLines(transactionRecord);
            if (!lines.length) return;

            const totalDiff = lines.reduce((sum, line) => sum + line.diffAmount, 0);
            if (!totalDiff) return;

            const totalByCogsAccount = groupTotalByCogsAccount(lines);
            const standardContext = getStandardLineContext(context.standardLines);
            const memo = getValue(transactionRecord, 'memo') || '';
            const accountId = parseInt(getValue(transactionRecord, 'account'), 10);

            addCustomLine(context.customLines, {
                account: accountId,
                debit: totalDiff,
                memo,
                location: standardContext.location,
                subsidiary: standardContext.subsidiary
            });

            lines.forEach(line => addCustomLine(context.customLines, {
                account: INTERMEDIATE_ACCOUNT_ID,
                credit: line.diffAmount,
                memo: line.memo || memo,
                location: standardContext.location,
                subsidiary: standardContext.subsidiary
            }));

            Object.keys(totalByCogsAccount).forEach(cogsAccount => addCustomLine(context.customLines, {
                account: parseInt(cogsAccount, 10),
                credit: totalByCogsAccount[cogsAccount],
                memo,
                location: standardContext.location,
                subsidiary: standardContext.subsidiary
            }));

            lines.forEach(line => addCustomLine(context.customLines, {
                account: INTERMEDIATE_ACCOUNT_ID,
                debit: line.diffAmount,
                memo: line.memo || memo,
                location: standardContext.location,
                subsidiary: standardContext.subsidiary
            }));
        } catch (e) {
            log.error('SCV GL INA Gift/Sample Error', e);
        }
    }

    function getAdjustmentLines(transactionRecord) {
        const lines = [];
        const lineCount = transactionRecord.getLineCount({sublistId: 'inventory'});
        for (let i = 0; i < lineCount; i++) {
            const invoiceAmount = toNumber(getSublistValue(transactionRecord, 'custcol_scv_einvoice_amount', i));
            if (!invoiceAmount) continue;

            const inventoryDiffValue = Math.abs(toNumber(getSublistValue(transactionRecord, 'invtdiffvalue', i)));
            const diffAmount = roundAmount(invoiceAmount - inventoryDiffValue);
            if (!diffAmount) continue;

            const itemId = getSublistValue(transactionRecord, 'item', i);
            const cogsAccount = getItemCogsAccount(itemId);
            if (!cogsAccount) continue;

            lines.push({
                diffAmount: Math.abs(diffAmount),
                cogsAccount: String(cogsAccount),
                memo: getSublistValue(transactionRecord, 'memo', i)
            });
        }
        return lines;
    }

    function groupTotalByCogsAccount(lines) {
        return lines.reduce((totals, line) => {
            totals[line.cogsAccount] = (totals[line.cogsAccount] || 0) + line.diffAmount;
            return totals;
        }, {});
    }

    function isCreatedFromSalesOrder(sourceTransactionId) {
        if (!sourceTransactionId) return false;
        const source = search.lookupFields({
            type: 'transaction',
            id: sourceTransactionId,
            columns: ['recordtype']
        });
        return source.recordtype === 'salesorder';
    }

    function isIntercompanyOrderType(orderTypeId) {
        const orderType = search.lookupFields({
            type: 'customrecord_scv_order_type',
            id: orderTypeId,
            columns: ['custrecord_scv_ot_intercompany']
        });
        const isIntercompany = orderType.custrecord_scv_ot_intercompany;
        return isIntercompany === true || isIntercompany === 'T';
    }

    function getItemCogsAccount(itemId) {
        if (!itemId) return '';
        const item = search.lookupFields({
            type: 'item',
            id: itemId,
            columns: ['expenseaccount']
        });
        return Array.isArray(item.expenseaccount) && item.expenseaccount.length ? item.expenseaccount[0].value : '';
    }

    function getStandardLineContext(standardLines) {
        const result = {location: null, subsidiary: null};
        if (!standardLines || !standardLines.count) return result;

        for (let i = 0; i < standardLines.count; i++) {
            const line = standardLines.getLine({index: i});
            if (!line || (toNumber(line.debitAmount) === 0 && toNumber(line.creditAmount) === 0)) continue;
            result.location = line.locationId || null;
            result.subsidiary = line.subsidiaryId || null;
            if (result.location || result.subsidiary) return result;
        }
        return result;
    }

    function addCustomLine(customLines, data) {
        if (!data.account) return;
        const amount = data.debit || data.credit;
        if (!amount) return;

        const newLine = customLines.addNewLine();
        newLine.accountId = parseInt(data.account, 10);
        newLine.memo = data.memo || '';
        if (data.debit) newLine.debitAmount = String(Math.abs(data.debit));
        if (data.credit) newLine.creditAmount = String(Math.abs(data.credit));
        if (data.location) newLine.locationId = parseInt(data.location, 10);
        if (data.subsidiary) newLine.subsidiaryId = parseInt(data.subsidiary, 10);
        newLine.isBookSpecific = false;
    }

    function getRecordType(transactionRecord) {
        const recordType = transactionRecord.type
            || transactionRecord.recordType
            || getValue(transactionRecord, 'baserecordtype')
            || getValue(transactionRecord, 'dbstrantype');
        const normalizedType = String(recordType || '').toLowerCase();
        return normalizedType === 'invadjst' ? 'inventoryadjustment' : normalizedType;
    }

    function getValue(transactionRecord, fieldId) {
        return transactionRecord.getValue({fieldId});
    }

    function getSublistValue(transactionRecord, fieldId, line) {
        return transactionRecord.getSublistValue({
            sublistId: 'inventory',
            fieldId,
            line
        });
    }

    function toNumber(value) {
        const number = parseFloat(value || 0);
        return isNaN(number) ? 0 : number;
    }

    function roundAmount(value) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    return {
        customizeGlImpact
    };
});
