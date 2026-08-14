/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 */
/**
 * Nội dung: Thư viện dùng chung để sinh mã tự động (customrecord_scv_auto_number)
 * Dùng bởi scv_ue_auto_number_entity.js và scv_ue_auto_number_item.js
 * Ref: VNP_FDD_Chức năng sinh mã tự động cho Entity và Item.xlsx
 */
define(['N/record', 'N/search'], (record, search) => {

    const RECORD_TYPE = 'customrecord_scv_auto_number';

    /**
     * Lấy số tiếp theo cho 1 cặp (recordType, prefix), tự tạo record quản lý nếu chưa tồn tại.
     * @param {Object} options
     * @param {string} options.recordType
     * @param {string} options.prefix
     * @param {number} options.digit - Số chữ số mặc định khi tạo mới record quản lý
     * @returns {{prefix: string, digit: number, currentNumber: number}}
     */
    const getNextAutoNumber = (options) => {
        const existing = findAutoNumberRecord(options.recordType, options.prefix);
        if (existing.id) {
            const nextNumber = existing.currentNumber + 1;
            record.submitFields({
                type: RECORD_TYPE,
                id: existing.id,
                values: {custrecord_scv_anr_current_number: nextNumber},
                options: {enableSourcing: false, ignoreMandatoryFields: true}
            });
            return {prefix: options.prefix, digit: existing.digit || options.digit, currentNumber: nextNumber};
        }

        createAutoNumberRecord({
            recordType: options.recordType,
            prefix: options.prefix,
            digit: options.digit,
            currentNumber: 1
        });
        return {prefix: options.prefix, digit: options.digit, currentNumber: 1};
    };

    const findAutoNumberRecord = (recordType, prefix) => {
        const searchObj = search.create({
            type: RECORD_TYPE,
            filters: [
                search.createFilter({name: 'custrecord_scv_anr_record_type', operator: 'is', values: recordType}),
                search.createFilter({name: 'custrecord_scv_anr_prefix', operator: 'is', values: prefix})
            ],
            columns: ['custrecord_scv_anr_digit_number', 'custrecord_scv_anr_current_number']
        });
        const results = searchObj.run().getRange(0, 1);
        if (!results.length) return {};
        return {
            id: results[0].id,
            digit: +results[0].getValue('custrecord_scv_anr_digit_number') || 0,
            currentNumber: +results[0].getValue('custrecord_scv_anr_current_number') || 0
        };
    };

    const createAutoNumberRecord = (options) => {
        const rec = record.create({type: RECORD_TYPE});
        rec.setValue('name', options.recordType + '_' + options.prefix);
        rec.setValue('custrecord_scv_anr_record_type', options.recordType);
        rec.setValue('custrecord_scv_anr_prefix', options.prefix);
        rec.setValue('custrecord_scv_anr_digit_number', options.digit);
        rec.setValue('custrecord_scv_anr_current_number', options.currentNumber);
        rec.save({enableSourcing: false, ignoreMandatoryFields: true});
    };

    /**
     * Ghép prefix + số hiện tại theo số chữ số đã cấu hình. Vd: {prefix:'NCC', digit:5, currentNumber:1} => 'NCC00001'
     * @param {{prefix: string, digit: number, currentNumber: number}} auto
     * @returns {string}
     */
    const formatCode = (auto) => auto.prefix + String(auto.currentNumber).padStart(auto.digit, '0');

    return {
        getNextAutoNumber,
        formatCode
    };
});
