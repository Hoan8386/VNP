/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([ ],
    function( ) {

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
        let rec = scriptContext.currentRecord;
        let fieldId = scriptContext.fieldId;

        let startDate = rec.getValue({ fieldId: 'custrecord_scv_legalfile_start_date' });
        let periodMonths = rec.getValue({ fieldId: 'custrecord_scv_legalfile_period' });
        let endDate = rec.getValue({ fieldId: 'custrecord_scv_legalfile_end_date' });
        try {
        // 1. Tính toán End Date khi Thời hạn tài liệu  có giá trị
        if (fieldId === 'custrecord_scv_legalfile_period' || fieldId === 'custrecord_scv_legalfile_start_date' ) {
            if (periodMonths && startDate) {
                let newEndDate = calculateEndDateFromISO(startDate, periodMonths);
                rec.setValue({ fieldId: 'custrecord_scv_legalfile_end_date', value: newEndDate, ignoreFieldChange: true  });
            }
            // else if (!periodMonths) {
            //     rec.setValue({ fieldId: 'custrecord_scv_legalfile_end_date', value: '', ignoreFieldChange: true  });
            // }
        }

        // Tính toán Thời hạn tài liệu (Tháng) khi Start Date và End Date có giá trị
        if (fieldId === 'custrecord_scv_legalfile_start_date' || fieldId === 'custrecord_scv_legalfile_end_date') {
            if (startDate && endDate) {
                let end = new Date(endDate);
                let invalidEndDate = new Date('9998-12-31T17:00:00.000Z');

                if (end.getTime() !== invalidEndDate.getTime()) {
                    if (startDate > endDate) {
                        rec.setValue({ fieldId: 'custrecord_scv_legalfile_period', value: '', ignoreFieldChange: true });
                        alert('End Date không được nhỏ hơn Start Date.');
                    } else {
                        let newPeriodMonths = calculatePeriodMonths(startDate, endDate);
                        rec.setValue({ fieldId: 'custrecord_scv_legalfile_period', value: newPeriodMonths, ignoreFieldChange: true });
                    }
                }
                // else {
                //     rec.setValue({ fieldId: 'custrecord_scv_legalfile_period', value: '', ignoreFieldChange: true });
                // }
            }
            // else if (!endDate) {
            //     rec.setValue({ fieldId: 'custrecord_scv_legalfile_period', value: '', ignoreFieldChange: true });
            // }
        }
    } catch (e) {
        log.error('Field Change Error', e.message);
    }
}

    function calculateEndDateFromISO(startDate, periodMonths) {
        let start = new Date(startDate);
        start.setMonth(start.getMonth() + parseInt(periodMonths));
        return start;
    }

    function calculatePeriodMonths(startDate, endDate) {
        let start = new Date(startDate);
        let end = new Date(endDate);
        let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        return months;
    }

    return {
        fieldChanged: fieldChanged,
    };
    
});
