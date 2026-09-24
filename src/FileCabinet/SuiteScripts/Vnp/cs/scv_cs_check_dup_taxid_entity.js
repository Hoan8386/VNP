/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/search'], (search) => {
    const FIELD = {
        TAX_NUMBER: 'custentity_scv_tax_number'
    };

    const ENTITY = {
        CUSTOMER: {
            type: 'customer',
            savedSearchId: 'customsearch_scv_check_dup_taxid_cus',
            message: 'Khách hàng đã tồn tại trên hệ thống. Nhấn OK để tiếp tục tạo mới. Nhấn Cancel để hủy.'
        },
        VENDOR: {
            type: 'vendor',
            savedSearchId: 'customsearch_scv_check_dup_taxid_ven',
            message: 'Nhà cung cấp đã tồn tại trên hệ thống. Nhấn OK để tiếp tục tạo mới. Nhấn Cancel để hủy.'
        }
    };

    let entryMode = '';

    /**
     * @param {Object} context
     * @param {Record} context.currentRecord
     * @param {string} context.mode
     */
    const pageInit = (context) => {
        entryMode = context.mode || '';
    };

    const getEntityConfig = (recordType) => {
        if (recordType === 'customer') return ENTITY.CUSTOMER;
        if (recordType === 'vendor') return ENTITY.VENDOR;
        return null;
    };

    const hasDuplicateTaxNumber = (config, taxNumber) => {
        let duplicateSearch;
        try {
            duplicateSearch = search.load({id: config.savedSearchId});
        } catch (error) {
            duplicateSearch = search.create({type: config.type, filters: []});
        }
        duplicateSearch.filters.push(search.createFilter({
            name: FIELD.TAX_NUMBER,
            operator: search.Operator.IS,
            values: taxNumber
        }));
        return Boolean(duplicateSearch.run().getRange({start: 0, end: 1}).length);
    };

    /**
     * @param {Object} context
     * @param {Record} context.currentRecord
     * @returns {boolean}
     */
    const saveRecord = (context) => {
        debugger;
        if (entryMode !== 'create' && entryMode !== 'copy') return true;

        const currentRecord = context.currentRecord;
        const config = getEntityConfig(currentRecord.type);
        if (!config) return true;

        const taxNumber = String(currentRecord.getValue({fieldId: FIELD.TAX_NUMBER}) || '').trim();
        if (!taxNumber) return true;

        try {
            return !hasDuplicateTaxNumber(config, taxNumber) || confirm(config.message);
        } catch (error) {
            console.log('SCV duplicate tax ID check failed: ' + JSON.stringify(error));
            return true;
        }
    };

    return {
        pageInit,
        saveRecord
    };
});
