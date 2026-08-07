/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'], (record, search) => {
    const CONFIG = {
        vendor: {
            codeField: 'custentity_scv_entity_code',
            prefix: 'NCC',
            nameField: 'companyname'
        },
        customer: {
            codeField: 'custentity_scv_entity_code',
            prefix: 'KH',
            nameField: 'companyname'
        },
        employee: {
            codeField: 'custentity_scv_entity_code',
            prefix: 'NV',
            nameField: 'custentity_scv_legal_name'
        }
    };

    function afterSubmit(scriptContext) {
        try {
            if (!['create', 'copy', 'edit'].includes(scriptContext.type)) return;
            const newRecord = scriptContext.newRecord;
            const config = CONFIG[newRecord.type];
            if (!config) return;
            if (newRecord.getValue(config.codeField)) return;

            const autoNumber = getNextAutoNumber({
                recordType: newRecord.type,
                prefix: config.prefix,
                digit: 5
            });
            const code = autoNumber.prefix + String(autoNumber.currentNumber).padStart(autoNumber.digit, '0');
            const entityName = newRecord.getValue(config.nameField) || '';
            const values = {};
            values[config.codeField] = code;
            values.entityid = entityName ? code + '_' + entityName : code;

            record.submitFields({
                type: newRecord.type,
                id: newRecord.id,
                values: values,
                options: {enableSourcing: false, ignoreMandatoryFields: true}
            });
        } catch (e) {
            log.error('Error afterSubmit: ', e);
        }
    }

    const getNextAutoNumber = (options) => {
        const autoNumberRecord = getAutoNumberRecord(options);
        if (autoNumberRecord.id) {
            const nextNumber = autoNumberRecord.currentNumber + 1;
            record.submitFields({
                type: 'customrecord_scv_auto_number',
                id: autoNumberRecord.id,
                values: {'custrecord_scv_anr_current_number': nextNumber},
                options: {enableSourcing: false, ignoreMandatoryFields: true}
            });
            return {
                prefix: options.prefix,
                digit: autoNumberRecord.digit || options.digit,
                currentNumber: nextNumber
            };
        }

        createAutoNumberRecord({
            recordType: options.recordType,
            prefix: options.prefix,
            digit: options.digit,
            currentNumber: 1
        });
        return {
            prefix: options.prefix,
            digit: options.digit,
            currentNumber: 1
        };
    };

    const getAutoNumberRecord = (options) => {
        const searchObj = search.create({
            type: 'customrecord_scv_auto_number',
            filters: [
                search.createFilter({
                    name: 'custrecord_scv_anr_record_type',
                    operator: 'is',
                    values: options.recordType
                }),
                search.createFilter({
                    name: 'custrecord_scv_anr_prefix',
                    operator: 'is',
                    values: options.prefix
                })
            ],
            columns: [
                'custrecord_scv_anr_digit_number',
                'custrecord_scv_anr_current_number'
            ]
        });
        const searchResults = searchObj.run().getRange(0, 1);
        if (!searchResults.length) return {};
        return {
            id: searchResults[0].id,
            digit: +searchResults[0].getValue('custrecord_scv_anr_digit_number') || options.digit,
            currentNumber: +searchResults[0].getValue('custrecord_scv_anr_current_number') || 0
        };
    };

    const createAutoNumberRecord = (options) => {
        const recAutoNumber = record.create({type: 'customrecord_scv_auto_number'});
        recAutoNumber.setValue('name', options.recordType + '_' + options.prefix);
        recAutoNumber.setValue('custrecord_scv_anr_record_type', options.recordType);
        recAutoNumber.setValue('custrecord_scv_anr_prefix', options.prefix);
        recAutoNumber.setValue('custrecord_scv_anr_digit_number', options.digit);
        recAutoNumber.setValue('custrecord_scv_anr_current_number', options.currentNumber);
        recAutoNumber.save({enableSourcing: false, ignoreMandatoryFields: true});
    };

    return {
        afterSubmit: afterSubmit
    };
});
