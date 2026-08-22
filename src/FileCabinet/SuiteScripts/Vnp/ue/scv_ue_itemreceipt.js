/**
 * Nội dung: chỉ sử dụng cho màn hình Item Receipt
 * Key:
 * ============================================================================================================
 * 	Date			    Author				    Description
 *  20 Aug 2026         Khanh Tran	 	        Init, create file. 
 *  20 Aug 2026         Khanh Tran              Kế thừa thông tin từ Inbound Shipment sang Item Receipt from ms. Thủy(https://app.clickup.com/t/86d42geh8)
/**
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
   '../common/scv_common_itemreceipt.js',
],
    
    (
       commonIR
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

            if (["create"].includes(triggerType)) {
                commonIR.updItemReceiptFromIB(newRec);
            }
        }

        return {
            beforeLoad,
            // beforeSubmit,
            afterSubmit
        }

    });
