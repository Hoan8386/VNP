/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * Nội dung: Thư viện kỹ thuật dùng chung cho các mẫu in: chuẩn hóa text, số, ngày,
 *           và đọc sublist / lookup an toàn. Không chứa logic nghiệp vụ.
 * Dùng bởi: scv_sl_pdnmvt_print.js
 *           (sẽ thêm: scv_sl_kbbgh_print.js, scv_sl_ddh_print.js,
 *            scv_sl_pr_print.js, scv_sl_unc_print.js, scv_sl_knkt_print.js)
 * =======================================================================================
 *  Date                Author                  Description
 *  19 Aug 2026         Codex                   Init shared print format module
 */
define(['N/search', 'N/log'], (search, log) => {
    /**
     * Converts nullable values to template-safe text.
     * @param {*} value
     * @returns {string}
     */
    const asText = (value) => value === null || value === undefined ? '' : String(value);

    /**
     * Converts a quantity value to a finite number before summing.
     * @param {*} value
     * @returns {number}
     */
    const asNumber = (value) => {
        const numberValue = Number(value);
        return Number.isFinite(numberValue) ? numberValue : 0;
    };

    /**
     * Keeps date parts padded like the former SuiteQL TO_CHAR output.
     * @param {*} value
     * @returns {string}
     */
    const padDatePart = (value) => String(value).padStart(2, '0');

    /**
     * Splits a date into padded day, month, and year strings.
     * @param {*} dateValue
     * @returns {{ngay: string, thang: string, nam: string}}
     */
    const getDateParts = (dateValue) => {
        if (dateValue === null || dateValue === undefined || dateValue === '') {
            return {ngay: '', thang: '', nam: ''};
        }
        const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
        if (Number.isNaN(date.getTime())) {
            return {ngay: '', thang: '', nam: ''};
        }
        return {
            ngay: padDatePart(date.getDate()),
            thang: padDatePart(date.getMonth() + 1),
            nam: String(date.getFullYear())
        };
    };

    /**
     * Formats a date as DD/MM/YYYY.
     * @param {*} dateValue
     * @returns {string}
     */
    const formatDate = (dateValue) => {
        const dateParts = getDateParts(dateValue);
        return dateParts.nam
            ? dateParts.ngay + '/' + dateParts.thang + '/' + dateParts.nam
            : '';
    };

    /**
     * Reads an item sublist value by (record, line, field).
     * Null, undefined, unavailable fields, and caught errors return ''.
     * CHÚ Ý: thứ tự tham số NGƯỢC với getSublistValueSafe. Gọi nhầm không ném lỗi mà lặng lẽ trả rỗng.
     * @param {Object} rec
     * @param {number} lineIndex
     * @param {string} fieldId
     * @returns {*}
     */
    const readSublistValue = (rec, lineIndex, fieldId) => {
        try {
            const value = rec.getSublistValue({
                sublistId: 'item',
                fieldId,
                line: lineIndex
            });
            return value === null || value === undefined ? '' : value;
        } catch (error) {
            return '';
        }
    };

    /**
     * Reads item sublist display text by (record, line, field).
     * Null, undefined, unavailable fields, and caught errors return ''.
     * @param {Object} rec
     * @param {number} lineIndex
     * @param {string} fieldId
     * @returns {string}
     */
    const readSublistText = (rec, lineIndex, fieldId) => {
        try {
            const value = rec.getSublistText({
                sublistId: 'item',
                fieldId,
                line: lineIndex
            });
            return value === null || value === undefined ? '' : value;
        } catch (error) {
            return '';
        }
    };

    /**
     * Reads an item sublist value by (record, field, line).
     * Raw null/undefined values are preserved; caught errors return undefined.
     * CHÚ Ý: thứ tự tham số NGƯỢC với readSublistValue. Gọi nhầm không ném lỗi mà lặng lẽ trả rỗng.
     * @param {Object} rec
     * @param {string} fieldId
     * @param {number} lineIndex
     * @returns {*}
     */
    const getSublistValueSafe = (rec, fieldId, lineIndex) => {
        try {
            return rec.getSublistValue({
                sublistId: 'item',
                fieldId,
                line: lineIndex
            });
        } catch (error) {
            return undefined;
        }
    }

    /**
     * Looks up a field value without allowing lookup errors to stop the print.
     * @param {string} recordType
     * @param {string|number} recordId
     * @param {string} fieldId
     * @returns {string}
     */
    const getSafeFieldValue = (recordType, recordId, fieldId) => {
        if (!recordId || !fieldId) return '';
        try {
            const fields = search.lookupFields({type: recordType, id: recordId, columns: [fieldId]}) || {};
            const fieldValue = fields[fieldId];
            if (Array.isArray(fieldValue)) {
                return asText(fieldValue[0]?.value ?? fieldValue[0]?.text);
            }
            if (fieldValue && typeof fieldValue === 'object') {
                return asText(fieldValue.value ?? fieldValue.text);
            }
            return asText(fieldValue);
        } catch (error) {
            log.error({
                title: 'scv_lib_print_format.getSafeFieldValue',
                details: {recordType, recordId, fieldId, error}
            });
            return '';
        }
    };

    /**
     * Looks up a field display text without allowing lookup errors to stop the print.
     * @param {string} recordType
     * @param {string|number} recordId
     * @param {string} fieldId
     * @returns {string}
     */
    const getSafeFieldText = (recordType, recordId, fieldId) => {
        if (!recordId || !fieldId) return '';
        try {
            const fields = search.lookupFields({type: recordType, id: recordId, columns: [fieldId]}) || {};
            const fieldValue = fields[fieldId];
            if (Array.isArray(fieldValue)) {
                return asText(fieldValue[0]?.text ?? fieldValue[0]?.value);
            }
            if (fieldValue && typeof fieldValue === 'object') {
                return asText(fieldValue.text ?? fieldValue.value);
            }
            return asText(fieldValue);
        } catch (error) {
            log.error({
                title: 'scv_lib_print_format.getSafeFieldText',
                details: {recordType, recordId, fieldId, error}
            });
            return '';
        }
    };

    return {
        asText,
        asNumber,
        padDatePart,
        getDateParts,
        formatDate,
        readSublistValue,
        readSublistText,
        getSublistValueSafe,
        getSafeFieldValue,
        getSafeFieldText
    };
});
