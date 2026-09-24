/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/url', '../lib/scv_lib_debitloan.js'],
    (record, url, libLoa) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */

        const RecordType = {
            DEBIT_LOAN_AGREEMENT: libLoa.RECORD_TYPE.DEBIT_LOAN_AGREEMENT,
            PAYMENT_REQUEST: "customrecord_scv_payment_request",
            PAYMENT_REQUEST_DETAIL: "customrecord_scv_payment_detail",
            EMPLOYEE_PREPAYMENT: "customrecord_scv_emp",
            VENDOR_EVALUATION: "customrecord_scv_vendor_evaluation",
            BENEFICIARY: "customrecord_scv_beb",
        }

        const TypeLoan = libLoa.LOA_TYPE;

        const beforeLoad = (scriptContext) => {
            try {
                let form = scriptContext.form;
                let newRecord = scriptContext.newRecord;

                const typeRecord = newRecord.type;
                if (typeRecord !== RecordType.DEBIT_LOAN_AGREEMENT) return;

                const loa_type = newRecord.getValue("custrecord_scv_loa_type");
                const priAmt = toAmount(newRecord.getValue("custrecord_scv_loa_principal_amount"));
                const priPaidAmt = toAmount(newRecord.getValue("custrecord_scv_loa_principal_paid_amount"));
                const loaAmt = toAmount(newRecord.getValue("custrecord_scv_loa_amount"));

                if (TypeLoan.DI_VAY === loa_type) {

                    if (loaAmt > priAmt) {
                        addButtonEnterLoanPrincipal(form, newRecord);
                    }

                    if (priPaidAmt < loaAmt) {
                        addButtonMakePayment(form, newRecord);
                    }
                    //addBtnGoToGeneratePrincipalAndInterest(form, newRecord.id);//Yeu cau Tam bo nut nay
                }


                if ([TypeLoan.CHO_VAY, TypeLoan.TIET_KIEM].indexOf(loa_type) !== -1) {

                    if (loaAmt > priAmt) {
                        addButtonEnterDepositPrincipal(form, newRecord);
                    }

                    if (priPaidAmt < loaAmt) {
                        addButtonAcceptPayment(form, newRecord);
                    }
                }

                addBtnGoToDbLoanSchedule(form, newRecord.id);

            } catch (e) {
                log.error('beforeLoad error', e);
            }
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

        }


        const addButtonEnterLoanPrincipal = (form, newRecord) => {
            const link = url.resolveScript({
                scriptId: 'customscript_scv_sl_debitloan_agreement',
                deploymentId: 'customdeploy_scv_sl_debit_loan_agreement',
                params: {recid: newRecord.id, action: libLoa.SL_ACTION.ENTER_LOAN_PRINCIPAL}
            });
            form.addButton({
                id: 'custpage_enter_loan_principal',
                label: 'Enter Loan Principal',
                functionName: `window.location.replace("${link}")`
            });
        }


        const addButtonEnterDepositPrincipal = (form, newRecord) => {
            const link = url.resolveScript({
                scriptId: 'customscript_scv_sl_debitloan_agreement',
                deploymentId: 'customdeploy_scv_sl_debit_loan_agreement',
                params: {recid: newRecord.id, action: libLoa.SL_ACTION.ENTER_DEPOSIT_PRINCIPAL}
            });
            form.addButton({
                id: 'custpage_enter_deposit_principal',
                label: 'Enter Deposit Principal',
                functionName: `window.location.replace("${link}")`
            });
        }


        const addButtonMakePayment = (form, newRecord) => {
            const urlPayment = url.resolveRecord({
                recordType: record.Type.VENDOR_PAYMENT,
                recordId: null,
                isEditMode: true,
                params: {
                    createdfromid: newRecord.id,
                    createdrectype: RecordType.DEBIT_LOAN_AGREEMENT
                }
            });
            form.addButton({
                id: 'custpage_make_payment',
                label: 'Make Payment',
                functionName: `window.location.replace("${urlPayment}")`
            });
        }


        const addButtonAcceptPayment = (form, newRecord) => {
            const urlPayment = url.resolveRecord({
                recordType: record.Type.CUSTOMER_PAYMENT,
                recordId: null,
                isEditMode: true,
                params: {
                    createdfromid: newRecord.id,
                    createdrectype: RecordType.DEBIT_LOAN_AGREEMENT
                }
            });
            form.addButton({
                id: 'custpage_accept_payment',
                label: 'Accept Payment',
                functionName: `window.location.replace("${urlPayment}")`
            });
        }

        const addBtnGoToGeneratePrincipalAndInterest = (form, debitLoanId) => {
            let urlSuitelet = url.resolveScript({
                scriptId: 'customscript_scv_sl_generate_principal_i',
                deploymentId: 'customdeploy_scv_sl_generate_principal_i',
                params: {
                    subsididary: '',
                }
            });
            form.addButton({
                id: 'custpage_goto_sl_gen_pri_int',
                label: 'Generate Principal and Interest',
                functionName: `window.location.replace("${urlSuitelet}&search=1&debitloan=${debitLoanId}")`
            })
        }

        // FDD 2.1 - nút "Create Deb/Loan Agree Schedule": mở Suitelet Debit/Loan Agreement Schedule
        const addBtnGoToDbLoanSchedule = (form, debitLoanId) => {
            let urlSuitelet = url.resolveScript({
                scriptId: 'customscript_scv_sl_db_payment_schdule',
                deploymentId: 'customdeploy_scv_sl_db_payment_schdule',
                params: {custpage_debitloan: debitLoanId}
            });
            form.addButton({
                id: 'custpage_goto_sl_db_payment_schdule',
                label: 'Create Deb/Loan Agree Schedule',
                functionName: `window.location.replace("${urlSuitelet}")`
            });
        }

        const toAmount = (value) => {
            if (value === null || value === undefined || value === '') return 0;
            const amount = parseFloat(String(value).replace(/,/g, ''));
            return isNaN(amount) ? 0 : amount;
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
