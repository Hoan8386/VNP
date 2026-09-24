/**
 * Nội dung: chỉ sử dụng cho màn hình Inventory Adjustment
 * Key:
 * ============================================================================================================
 * 	Date			    Author				    Description
 *  10 Sep 2026         Khanh Tran	 	        Init, create file. 
 *  10 Sep 2026         Khanh Tran              Chức năng tự động điền thông tin cho Lot Number Record from ms. Thủy(https://app.clickup.com/t/14yhnhmfdfg)
/**
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    '../common/scv_common_tran2lot.js',
], (
    commonTran2Lot,
) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            
        }

        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            let triggerType = scriptContext.type;
            let newRec = scriptContext.newRecord;

            if (["create", "edit"].includes(triggerType)) {
                commonTran2Lot.fillInfoLot({
                    recordtype: newRec.type,
                    recid: newRec.id,
                    isAuto: true,
                });
            }
        }

        return {
            // beforeLoad,
            // beforeSubmit,
            afterSubmit
        }

    });
