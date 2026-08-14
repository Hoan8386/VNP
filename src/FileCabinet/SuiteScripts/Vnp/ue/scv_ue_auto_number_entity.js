/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
/**
 * Nội dung: Sinh mã tự động cho Vendor/Customer/Employee và ghép chuỗi entityid
 * Ref: VNP_FDD_Chức năng sinh mã tự động cho Entity và Item.xlsx (mục 2.2)
 * Dùng beforeSubmit (không dùng afterSubmit + submitFields) để đảm bảo mã/entityid đã có giá trị
 * trước khi các afterSubmit khác (của deployment khác trên cùng record) chạy, vì NetSuite luôn
 * chạy hết beforeSubmit của MỌI deployment trước khi chạy afterSubmit của bất kỳ deployment nào.
 * =======================================================================================
 *  Date                    Author                  Description
 *  10 Aug 2026             Claude                  Init, thay thế scv_ue_entity_auto_number.js theo FDD sinh mã Entity/Item
 *  10 Aug 2026             Claude                  Đổi afterSubmit -> beforeSubmit để nhất quán với scv_ue_auto_number_item.js, tránh race với script khác
 */
define(['../lib/scv_lib_auto_number'], (autoNumberLib) => {

    const DEFAULT_DIGIT = 5;

    const CONFIG = {
        vendor: {codeField: 'custentity_scv_entity_code', prefix: 'NCC', nameField: 'companyname'},
        customer: {codeField: 'custentity_scv_entity_code', prefix: 'KH', nameField: 'companyname'},
        employee: {codeField: 'custentity_scv_entity_code', prefix: 'NV', nameField: 'custentity_scv_legal_name'}
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
            if (!['create', 'copy', 'edit'].includes(triggerType)) return;

            const newRecord = scriptContext.newRecord;
            const config = CONFIG[newRecord.type];
            if (!config) return;

            let code = newRecord.getValue(config.codeField);
            let codeChanged = false;

            // 2.2.1: Điều kiện sinh mã: Field ID sinh mã = null
            if (!code) {
                const auto = autoNumberLib.getNextAutoNumber({
                    recordType: newRecord.type,
                    prefix: config.prefix,
                    digit: DEFAULT_DIGIT
                });
                code = autoNumberLib.formatCode(auto);
                newRecord.setValue(config.codeField, code);
                codeChanged = true;
            }

            // 2.2.2: Chỉ ghép chuỗi entityid khi có thay đổi entity code hoặc tên
            const nameValue = newRecord.getValue(config.nameField) || '';
            const oldNameValue = triggerType === 'edit' ? (scriptContext.oldRecord.getValue(config.nameField) || '') : null;
            const nameChanged = triggerType !== 'edit' || nameValue !== oldNameValue;

            if (codeChanged || nameChanged) {
                const newEntityId = nameValue ? code + '_' + nameValue : code;
                if (newEntityId !== newRecord.getValue('entityid')) newRecord.setValue('entityid', newEntityId);
            }
        } catch (e) {
            log.error('Error beforeSubmit', e);
        }
    };

    return {beforeSubmit};
});
