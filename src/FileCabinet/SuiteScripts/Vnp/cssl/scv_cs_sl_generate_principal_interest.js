/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/url'],
    function (currentRecord, url) {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {

        }

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

        }

        function searchGeneratePrincipalInterest() {
            window.onbeforeunload = null;
            let currRecord = currentRecord.get();
            let options = {
                search: "1",
                subsidiary: currRecord.getValue("custpage_subsidiary"),
                debitloan: currRecord.getValue("custpage_debitloan").toString(),
            };
            let urlDC = url.resolveScript({
                scriptId: "customscript_scv_sl_generate_principal_i",
                deploymentId: "customdeploy_scv_sl_generate_principal_i",
                returnExternalUrl: false,
                params: options,
            });
            window.location.replace(urlDC);
        }

        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            searchGeneratePrincipalInterest: searchGeneratePrincipalInterest
        };
    });

