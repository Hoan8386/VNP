/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/url'],

    (record, url) => {

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @Since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            if (scriptContext.type === 'view') {
                let newRecord = scriptContext.newRecord;
                let recType = newRecord.type;
                let sl = 'item', slIVD = 'inventoryassignment', lcIVD, inventorydetailavail, recSubIVD, quantity,
                    tquantity;
                let lcIt = newRecord.getLineCount(sl);
                let locationHeader = newRecord.getValue('location');
                let isFill = false;
                if (isFilllot(newRecord)) {
                    for (let j = 0; j < lcIt; j++) {
                        inventorydetailavail = newRecord.getSublistValue({
                            sublistId: sl,
                            fieldId: 'inventorydetailavail',
                            line: j
                        });
                        quantity = newRecord.getSublistValue({sublistId: sl, fieldId: 'quantity', line: j});
                        let location = newRecord.getSublistValue({sublistId: sl, fieldId: 'location', line: j});
                        if (isLocationValid(recType, locationHeader, location) && (inventorydetailavail === true || inventorydetailavail === 'T') && quantity > 0) {
                            try {
                                recSubIVD = newRecord.getSublistSubrecord({
                                    sublistId: sl,
                                    fieldId: 'inventorydetail',
                                    line: j
                                });
                                quantity = recSubIVD.getValue('quantity');
                                tquantity = 0;
                                lcIVD = recSubIVD.getLineCount(slIVD);
                                if (lcIVD <= 0) {
                                    isFill = true;
                                    break;
                                } else {
                                    for (let n = 0; n < lcIVD; n++) {
                                        tquantity = tquantity + recSubIVD.getSublistValue({
                                            sublistId: slIVD,
                                            fieldId: 'quantity',
                                            line: n
                                        }) * 1;
                                    }
                                    if (tquantity < quantity) {
                                        isFill = true;
                                        break;
                                    }
                                }
                            } catch (e) {
                                isFill = true;
                                break;
                            }
                        }
                    }
                }
                if (isFill) {
                    let scriptId = 'customscript_scv_sl_update_lot_so';
                    let deploymentId = 'customdeploy_scv_sl_update_lot_so';
                    if (recType === 'workorder') {
                        scriptId = 'customscript_scv_sl_update_lot_wo';
                        deploymentId = 'customdeploy_scv_sl_update_lot_wo';
                    } else if (recType === 'transferorder') {
                        scriptId = 'customscript_scv_sl_update_lot_to';
                        deploymentId = 'customdeploy_scv_sl_update_lot_to';
                    }
                    let urlDC = url.resolveScript({
                        scriptId: scriptId,
                        deploymentId: deploymentId,
                        returnExternalUrl: false,
                        params: {
                            trid: newRecord.id, trtype: newRecord.type
                        }
                    });
                    urlDC = 'window.location.replace("' + urlDC + '")';
                    let form = scriptContext.form;
                    form.addButton({id: 'custpage_bt_filllot', label: 'Fill Lot', functionName: urlDC});
                }
            }
        }

        const isLocationValid = (recType, location_header, location_line) => {
            let isValid = false;
            if (recType === record.Type.SALES_ORDER) {
                if (location_line) {
                    isValid = true;
                }
            } else if (location_header) {
                isValid = true;
            }
            return isValid;
        }

        const isFilllot = (newRecord) => {
            let status = newRecord.getValue('status');//'Pending Approval',
            let arrStatus = ['Closed', 'Cancelled', 'Rejected', 'Voided', 'Undefined'];
            return !arrStatus.includes(status);
        }

        return {
            beforeLoad
        };

    });
