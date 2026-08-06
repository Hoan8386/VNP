/**
 * Nội dung:
 * 
 *
 * =======================================================================================
 *  Date                Author                  Description
 *  5 Aug 2026          Thanh Hoan              Init, create file 
 */

/**
 * @NApiVersion 2.1
 */
define([
    'N/search',
    'N/record',
], 
(search, record) => {

    const inheritInfoFromITR = (newRecord) => {
        let params = getObjParamsUrl(newRecord);
        let itrId = params.itemrcpt ;
        log.error("hoan params" ,params)
        log.error("hoan idITR" ,itrId)

        let itrRecord = record.load({
            type: record.Type.ITEM_RECEIPT,
            id: itrId
        });

        newRecord.setValue({
            fieldId: 'custbody_scv_invoice_serial',
            value: itrRecord.getValue({
                fieldId: 'custbody_scv_invoice_serial'
            })
        });


        newRecord.setValue({
            fieldId: 'custbody_scv_invoice_number',
            value: itrRecord.getValue({
                fieldId: 'custbody_scv_invoice_number'
            })
        });


        newRecord.setValue({
            fieldId: 'custbody_scv_invoice_date',
            value: itrRecord.getValue({
                fieldId: 'custbody_scv_invoice_date'
            })
        });


        newRecord.setValue({
            fieldId: 'custbody_scv_invoice_pattern',
            value: itrRecord.getValue({
                fieldId: 'custbody_scv_invoice_pattern'
            })
        });

        let lineCount  = newRecord.getLineCount({
            subListId:'item'
        })

        for (let i = 0 ; i < lineCount ; i++) {
            newRecord.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_scv_model_no',
                line: i,
                value: itrRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_scv_model_no',
                    line: i
                })
            })

             newRecord.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_scv_serial_number',
                line: i,
                value: itrRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_scv_serial_number',
                    line: i
                })
            })

            newRecord.setSublistValue({
                sublistId: 'item',
                fieldId: 'custcol_scv_custodian',
                line: i,
                value: itrRecord.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_scv_custodian',
                    line: i
                })
            })
        }
       
    };

    const getObjParamsUrl = (newRecord) =>{
            let objParams = {};
            let arrKeyValue = newRecord.getValue("entryformquerystring").split("&");
            arrKeyValue.forEach(key_value => objParams[key_value.split("=")[0]] = key_value.split("=")[1]);

            return objParams;
        }


    return {
        inheritInfoFromITR,
    };

});