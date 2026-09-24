/**
 * Noi dung: Custom GL for Inventory Adjustment gift/sample issue.
 */
function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
    var INTERMEDIATE_ACCOUNT_ID = 112;

    try {
        if (transactionRecord.getRecordType() !== 'inventoryadjustment') return;

        var sourceTransactionId = transactionRecord.getFieldValue('custbody_scv_created_transaction');
        if (!isCreatedFromSalesOrder(sourceTransactionId)) return;

        var orderTypeId = transactionRecord.getFieldValue('custbody_scv_order_type');
        if (!orderTypeId || !isIntercompanyOrderType(orderTypeId)) return;

        var lines = getAdjustmentLines(transactionRecord);
        if (!lines.length) return;

        var totalDiff = 0;
        var totalByCogsAccount = {};
        for (var i = 0; i < lines.length; i++) {
            totalDiff += lines[i].diffAmount;
            totalByCogsAccount[lines[i].cogsAccount] = (totalByCogsAccount[lines[i].cogsAccount] || 0) + lines[i].diffAmount;
        }
        if (!totalDiff) return;

        var standardContext = getStandardLineContext(standardLines);
        var memo = transactionRecord.getFieldValue('memo') || '';
        var accountId = parseInt(transactionRecord.getFieldValue('account'), 10);

        addCustomLine(customLines, {
            account: accountId,
            debit: totalDiff,
            memo: memo,
            location: standardContext.location,
            subsidiary: standardContext.subsidiary
        });

        for (var j = 0; j < lines.length; j++) {
            addCustomLine(customLines, {
                account: INTERMEDIATE_ACCOUNT_ID,
                credit: lines[j].diffAmount,
                memo: lines[j].memo || memo,
                location: standardContext.location,
                subsidiary: standardContext.subsidiary
            });
        }

        for (var cogsAccount in totalByCogsAccount) {
            if (!totalByCogsAccount.hasOwnProperty(cogsAccount)) continue;
            addCustomLine(customLines, {
                account: parseInt(cogsAccount, 10),
                credit: totalByCogsAccount[cogsAccount],
                memo: memo,
                location: standardContext.location,
                subsidiary: standardContext.subsidiary
            });
        }

        for (var k = 0; k < lines.length; k++) {
            addCustomLine(customLines, {
                account: INTERMEDIATE_ACCOUNT_ID,
                debit: lines[k].diffAmount,
                memo: lines[k].memo || memo,
                location: standardContext.location,
                subsidiary: standardContext.subsidiary
            });
        }
    } catch (e) {
        nlapiLogExecution('ERROR', 'SCV GL INA Gift/Sample Error', e && e.message ? e.message : e);
    }
}

function getAdjustmentLines(transactionRecord) {
    var lines = [];
    var lineCount = transactionRecord.getLineItemCount('inventory');
    for (var i = 1; i <= lineCount; i++) {
        var invoiceAmount = toNumber(transactionRecord.getLineItemValue('inventory', 'custcol_scv_einvoice_amount', i));
        if (!invoiceAmount) continue;

        var inventoryDiffValue = Math.abs(toNumber(transactionRecord.getLineItemValue('inventory', 'invtdiffvalue', i)));
        var diffAmount = roundAmount(invoiceAmount - inventoryDiffValue);
        if (!diffAmount) continue;

        var itemId = transactionRecord.getLineItemValue('inventory', 'item', i);
        var cogsAccount = getItemCogsAccount(itemId);
        if (!cogsAccount) continue;

        lines.push({
            diffAmount: Math.abs(diffAmount),
            cogsAccount: cogsAccount,
            memo: transactionRecord.getLineItemValue('inventory', 'memo', i)
        });
    }
    return lines;
}

function isCreatedFromSalesOrder(sourceTransactionId) {
    if (!sourceTransactionId) return false;
    var source = nlapiLookupField('transaction', sourceTransactionId, 'recordtype', false);
    return source === 'salesorder';
}

function isIntercompanyOrderType(orderTypeId) {
    var isIntercompany = nlapiLookupField('customrecord_scv_order_type', orderTypeId, 'custrecord_scv_ot_intercompany', false);
    return isIntercompany === 'T' || isIntercompany === true;
}

function getItemCogsAccount(itemId) {
    if (!itemId) return '';
    return nlapiLookupField('item', itemId, 'cogsaccount', false);
}

function getStandardLineContext(standardLines) {
    var context = {location: null, subsidiary: null};
    if (!standardLines || !standardLines.getCount || standardLines.getCount() <= 0) return context;

    for (var i = 0; i < standardLines.getCount(); i++) {
        var line = standardLines.getLine(i);
        if (!line || (line.getDebitAmount() * 1 === 0 && line.getCreditAmount() * 1 === 0)) continue;
        context.location = line.getLocationId ? line.getLocationId() : null;
        context.subsidiary = line.getSubsidiaryId ? line.getSubsidiaryId() : null;
        if (context.location || context.subsidiary) return context;
    }
    return context;
}

function addCustomLine(customLines, data) {
    if (!data.account) return;
    var amount = data.debit || data.credit;
    if (!amount) return;

    var newLine = customLines.addNewLine();
    newLine.setAccountId(parseInt(data.account, 10));
    newLine.setMemo(data.memo || '');
    if (data.debit) newLine.setDebitAmount(Math.abs(data.debit));
    if (data.credit) newLine.setCreditAmount(Math.abs(data.credit));
    if (data.location) newLine.setLocationId(parseInt(data.location, 10));
    if (data.subsidiary && newLine.setSubsidiaryId) newLine.setSubsidiaryId(parseInt(data.subsidiary, 10));
}

function toNumber(value) {
    var number = parseFloat(value || 0);
    return isNaN(number) ? 0 : number;
}

function roundAmount(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}
