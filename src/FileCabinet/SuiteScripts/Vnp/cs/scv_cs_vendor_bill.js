/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['../common/scv_common_inherit_itre.js',],
    (commonInheritIRC) => {

        /**
         * Defines the function definition that is executed when a new line is initialized.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.sublistId - Sublist name
         * @since 2015.2
         */
        function pageInit(scriptContext) {

            let curRec = scriptContext.currentRecord ;
            if(commonInheritIRC.isCheckInheritFromITR(curRec)){
                commonInheritIRC.inheritInfoFromITR(curRec);
            };
        }

        return {
            pageInit: pageInit,
        }

    });
