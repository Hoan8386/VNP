/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
/**
 * Nội dung: Sinh mã tự động (upccode) cho Item và ghép chuỗi itemid
 * Ref: VNP_FDD_Chức năng sinh mã tự động cho Entity và Item.xlsx (mục 2.3)
 * Không chỉnh sửa scv_ue_items.js / scv_ue_item.js - file độc lập, không ảnh hưởng logic màn hình Item hiện có.
 * Dùng beforeSubmit (không dùng afterSubmit + submitFields) để đảm bảo upccode đã có giá trị
 * trước khi các afterSubmit khác (vd: scv_ue_items.js sinh Unit Type khi upccode có giá trị) chạy,
 * vì NetSuite luôn chạy hết beforeSubmit của MỌI deployment trước khi chạy afterSubmit của bất kỳ deployment nào.
 * =======================================================================================
 *  Date                    Author                  Description
 *  10 Aug 2026             Claude                  Init, sinh mã Item theo FDD sinh mã Entity/Item
 *  10 Aug 2026             Claude                  Đổi afterSubmit -> beforeSubmit để không bị race với việc sinh Unit Type trong scv_ue_items.js
 */
define(['N/search', '../lib/scv_lib_auto_number'], (search, autoNumberLib) => {

    const DEFAULT_DIGIT = 5;
    const TONE_MARKS = /[\u0300\u0301\u0303\u0309\u0323]/g;

    const ITEM_GROUPS = {
        lotnumberedinventoryitem: {bucket: 'lotnumberedinventoryitem|inventoryitem', mode: 'category'},
        inventoryitem: {bucket: 'lotnumberedinventoryitem|inventoryitem', mode: 'category'},
        noninventoryitem: {bucket: 'noninventoryitem|serviceitem', mode: 'expense'},
        noninventorypurchaseitem: {bucket: 'noninventoryitem|serviceitem', mode: 'expense'},
        noninventorysaleitem: {bucket: 'noninventoryitem|serviceitem', mode: 'expense'},
        noninventoryresaleitem: {bucket: 'noninventoryitem|serviceitem', mode: 'expense'},
        serviceitem: {bucket: 'noninventoryitem|serviceitem', mode: 'expense'},
        servicepurchaseitem: {bucket: 'noninventoryitem|serviceitem', mode: 'expense'},
        servicesaleitem: {bucket: 'noninventoryitem|serviceitem', mode: 'expense'},
        serviceresaleitem: {bucket: 'noninventoryitem|serviceitem', mode: 'expense'}
    };

    /**
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord
     * @param {Record} scriptContext.oldRecord
     * @param {string} scriptContext.type
     */
    const beforeSubmit = (scriptContext) => {
        try {
            const triggerType = scriptContext.type;
            if (!['create', 'copy', 'edit'].includes(triggerType)) {
                logAutoNoDebug('skip_event_type', {triggerType: triggerType});
                return;
            }

            const newRecord = scriptContext.newRecord;
            const group = getItemGroup(newRecord);
            const itemType = newRecord.getValue('itemtype');
            logAutoNoDebug('start', {
                triggerType: triggerType,
                recordType: newRecord.type,
                itemType: itemType,
                id: newRecord.id || '',
                upccode: newRecord.getValue('upccode') || '',
                itemid: newRecord.getValue('itemid') || '',
                displayname: newRecord.getValue('displayname') || '',
                expenseaccount: newRecord.getValue('expenseaccount') || '',
                group: group || ''
            });
            if (!group) {
                logAutoNoDebug('skip_item_group_not_found', {
                    recordType: newRecord.type,
                    itemType: itemType
                });
                return;
            }

            let code = newRecord.getValue('upccode');
            let codeChanged = false;

            // 2.3.1: Điều kiện sinh mã: Field ID sinh mã (upccode) = null
            if (!code) {
                const prefix = getItemPrefix(newRecord, group.mode);
                logAutoNoDebug('generate_before_get_next', {
                    recordType: newRecord.type,
                    itemType: itemType,
                    bucket: group.bucket,
                    mode: group.mode,
                    prefix: prefix
                });
                const auto = autoNumberLib.getNextAutoNumber({
                    recordType: group.bucket,
                    prefix: prefix,
                    digit: DEFAULT_DIGIT
                });
                code = autoNumberLib.formatCode(auto);
                newRecord.setValue('upccode', code);
                codeChanged = true;
                logAutoNoDebug('generate_done', {
                    bucket: group.bucket,
                    prefix: auto.prefix,
                    digit: auto.digit,
                    currentNumber: auto.currentNumber,
                    upccode: code
                });
            } else {
                logAutoNoDebug('skip_upccode_exists', {upccode: code});
            }

            // 2.3.2: Chỉ ghép chuỗi itemid khi có thay đổi upccode hoặc displayname
            const displayName = newRecord.getValue('displayname') || '';
            const oldDisplayName = triggerType === 'edit' ? (scriptContext.oldRecord.getValue('displayname') || '') : null;
            const nameChanged = triggerType !== 'edit' || displayName !== oldDisplayName;

            if (codeChanged || nameChanged) {
                const newItemId = displayName ? code + '_' + displayName : code;
                if (newItemId !== newRecord.getValue('itemid')) newRecord.setValue('itemid', newItemId);
                logAutoNoDebug('itemid_updated', {
                    codeChanged: codeChanged,
                    nameChanged: nameChanged,
                    oldDisplayName: oldDisplayName || '',
                    displayName: displayName,
                    itemid: newItemId
                });
            } else {
                logAutoNoDebug('skip_itemid_no_change', {
                    upccode: code,
                    displayName: displayName,
                    oldDisplayName: oldDisplayName || ''
                });
            }
        } catch (e) {
            log.error('Error beforeSubmit', e);
        }
    };

    const logAutoNoDebug = (step, details) => {
        log.error('AUTO_NO_ITEM_DEBUG_' + step, JSON.stringify(details));
    };

    const getItemGroup = (newRecord) => {
        const group = ITEM_GROUPS[newRecord.type];
        if (group) return group;

        const itemType = newRecord.getValue('itemtype');
        if (itemType === 'NonInvtPart') return ITEM_GROUPS.noninventoryitem;
        if (itemType === 'Service') return ITEM_GROUPS.serviceitem;
        return null;
    };

    const getItemPrefix = (newRecord, mode) => {
        if (mode === 'category') return getCategoryLetterPrefix(newRecord);
        return getExpenseAccountGroup(newRecord) + 'P';
    };

    // custitem_scv_product_cate.custrecord_scv_item_category_code + chữ cái đầu tiên của displayname
    const getCategoryLetterPrefix = (newRecord) => {
        const categoryId = newRecord.getValue('custitem_scv_product_cate');
        let categoryCode = '';
        if (categoryId) {
            const lk = search.lookupFields({
                type: 'customrecord_scv_item_category',
                id: categoryId,
                columns: ['custrecord_scv_item_category_code']
            });
            categoryCode = lk.custrecord_scv_item_category_code || '';
        }
        const displayName = newRecord.getValue('displayname') || '';
        return categoryCode + getFirstLetterNoTone(displayName);
    };

    // expenseaccount like 641% => 1 | like 642% => 2 | khác => 0
    const getExpenseAccountGroup = (newRecord) => {
        const accountId = newRecord.getValue('expenseaccount');
        if (!accountId) {
            logAutoNoDebug('expense_group_no_account', {accountId: accountId || ''});
            return 0;
        }
        const lk = search.lookupFields({type: 'account', id: accountId, columns: ['number']});
        const acctNumber = lk.number || '';
        logAutoNoDebug('expense_group_lookup', {
            accountId: accountId,
            acctNumber: acctNumber
        });
        if (acctNumber.indexOf('641') === 0) return 1;
        if (acctNumber.indexOf('642') === 0) return 2;
        return 0;
    };

    // Chữ cái đầu tiên của displayname, in hoa, bỏ dấu thanh (giữ nguyên â/ê/ô/ă/ơ/ư/Đ). Vd: Á=>A, Ế=>Ê, Đ=>Đ
    const getFirstLetterNoTone = (str) => {
        if (!str) return '';
        const firstChar = str.trim().charAt(0);
        if (!firstChar) return '';
        return firstChar.normalize('NFD').replace(TONE_MARKS, '').normalize('NFC').toUpperCase();
    };

    return {beforeSubmit};
});
