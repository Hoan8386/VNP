/**
 * Nội dung:
 *
 * =======================================================================================
 * Date                Author                  Description
 * 5 Aug 2026          Thanh Hoan              Init, create file
 */

/**
 * @NApiVersion 2.1
 */
define([
    'N/record',
    '../lib/scv_lib_function.js'
],
(record, libFn) => {
    const isCheckInheritFromITR = (newRecord) => {

        let params = getObjParamsUrl(newRecord);
        let itrId = params.itemrcpt;
        let transform = params.transform;
        let memdoc = params.memdoc;
        if (!itrId || transform !== "purchord" || memdoc !== "0") {
            return false;
        }
        return true;
    };

    const getITRId = (newRecord) => {
        let params = getObjParamsUrl(newRecord);
        return params.itemrcpt;

    };



    const inheritInfoFromITR = (currentRecord) => {
        if (!isCheckInheritFromITR(currentRecord)) return false;

        let itrId = getITRId(currentRecord);

        let itrRecord = record.load({
            type: record.Type.ITEM_RECEIPT,
            id: itrId
        });

        let invoice_serial = itrRecord.getValue({
            fieldId: 'custbody_scv_invoice_serial'
        });

        currentRecord.setValue({
            fieldId: 'custbody_scv_invoice_serial',
            value: invoice_serial
        });


        let invoice_number = itrRecord.getValue({
            fieldId: 'custbody_scv_invoice_number'
        });

        currentRecord.setValue({
            fieldId: 'custbody_scv_invoice_number',
            value: invoice_number
        });

        let invoice_date = itrRecord.getValue({
            fieldId: 'custbody_scv_invoice_date'
        });

        currentRecord.setValue({
            fieldId: 'custbody_scv_invoice_date',
            value: invoice_date
        });

        let invoice_pattern = itrRecord.getValue({
            fieldId: 'custbody_scv_invoice_pattern'
        });

        currentRecord.setValue({
            fieldId: 'custbody_scv_invoice_pattern',
            value: invoice_pattern
        });

        let listLineFieldsITR = [
            'item',
            'custcol_scv_origin_line_num',
            'custcol_scv_model_no',
            'custcol_scv_serial_number',
            'custcol_scv_custodian'
        ];

        let sublistITR = libFn.getSublistValueLine(
            itrRecord,
            "item",
            listLineFieldsITR
        );

        let lineCount = currentRecord.getLineCount({
            sublistId:'item'
        });

        for(let index = 0; index < lineCount; index++){
            let item = currentRecord.getSublistValue({
                sublistId:'item',
                fieldId:'item',
                line:index
            });

            let originLineNum = currentRecord.getSublistValue({
                sublistId:'item',
                fieldId:'custcol_scv_origin_line_num',
                line:index
            });

            let itrLine = sublistITR.find(line =>
                line.item == item &&
                line.custcol_scv_origin_line_num == originLineNum
            );

            if(itrLine){
                currentRecord.selectLine({
                    sublistId:'item',
                    line:index
                });

                currentRecord.setCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'custcol_scv_model_no',
                    value:itrLine.custcol_scv_model_no
                });

                currentRecord.setCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'custcol_scv_serial_number',
                    value:itrLine.custcol_scv_serial_number
                });

                currentRecord.setCurrentSublistValue({
                    sublistId:'item',
                    fieldId:'custcol_scv_custodian',
                    value:itrLine.custcol_scv_custodian
                });
            }

        }
    };



    const getObjParamsUrl = (newRecord) => {
        let objParams = {};
        let queryString = newRecord.getValue("entryformquerystring");
        if (!queryString) return objParams;
        queryString.split("&").forEach(key_value => {
            let arr = key_value.split("=");
            objParams[arr[0]] = arr[1];
        });
        return objParams;
    };

    return {

        isCheckInheritFromITR,
        inheritInfoFromITR
    };

});