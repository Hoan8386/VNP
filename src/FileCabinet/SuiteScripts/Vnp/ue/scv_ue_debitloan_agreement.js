/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/url'],
    (record, url) => {
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
            DEBIT_LOAN_AGREEMENT: "customrecord_scv_loa",
            PAYMENT_REQUEST: "customrecord_scv_payment_request",
            PAYMENT_REQUEST_DETAIL: "customrecord_scv_payment_detail",
            EMPLOYEE_PREPAYMENT: "customrecord_scv_emp",
            VENDOR_EVALUATION: "customrecord_scv_vendor_evaluation",
            BENEFICIARY: "customrecord_scv_beb", // Thông tin người thụ hưởng
        }

        const TypeLoan = {
            DI_VAY: '5',
            TIET_KIEM: '8',
            CHO_VAY: '2'
        }

        const Action = {
            Create: {
                CHECK: "create_check",
                INVOICE: "create_invoice",
                CUSTOMER_PAYMENT: "create_customerpayment"
            }
        }

        const beforeLoad = (scriptContext) => {
            try {
                let form = scriptContext.form;
                let newRecord = scriptContext.newRecord;
                let link = url.resolveScript({
                    scriptId: 'customscript_scv_sl_debitloan_agreement',
                    deploymentId: 'customdeploy_scv_sl_debitloan_agreement',
                    params: {
                        recid: newRecord.id
                    }
                });
                /*form.addButton({
                    id: 'custpage_deposit',
                    label: 'Deposit',
                    functionName: `window.open("${link}&buttontype=deposit")`
                });
                form.addButton({
                    id: 'custpage_payment',
                    label: 'Payment Vendor',
                    functionName: `window.open("${link}&buttontype=paymentvendor")`
                });*/


                const typeRecord = newRecord.type;
                const loa_type = newRecord.getValue("custrecord_scv_loa_type");
                const priAmt = newRecord.getValue("custrecord_scv_loa_principal_amount");
                const priPaidAmt = newRecord.getValue("custrecord_scv_loa_principal_paid_amount");
                const loaAmt = newRecord.getValue("custrecord_scv_loa_amount");
                const isDisplayCusPay = typeRecord === 'customrecord_scv_loa' && [TypeLoan.CHO_VAY, TypeLoan.TIET_KIEM].indexOf(loa_type) !== -1 && priAmt !== 0 && priPaidAmt < loaAmt;
                const isDisplayBtnInvAndCheck = typeRecord === 'customrecord_scv_loa' && [TypeLoan.CHO_VAY, TypeLoan.TIET_KIEM].indexOf(loa_type) !== -1 && priAmt < loaAmt;
                if (isDisplayCusPay) {
                    createCustomerPayment(form, newRecord);
                }

                if (isDisplayBtnInvAndCheck) {
                    createInvoiceCheck(form, newRecord, link);
                }
                const isCreateMakeDeposit = [TypeLoan.CHO_VAY, TypeLoan.TIET_KIEM].indexOf(loa_type) !== -1 && !!priAmt;
                if (isCreateMakeDeposit) {
                    addButtonMakeDeposit(form, newRecord);
                }
                const isCreateCheck = [TypeLoan.DI_VAY].indexOf(loa_type) !== -1 && !!priAmt;
                if (isCreateCheck) {
                    addButtonCheck(form, newRecord);
                }

                // Go to Suitelet: Generate Principal and Interest,
                if (TypeLoan.DI_VAY === loa_type) {
                    if (priAmt < loaAmt) {
                        form.addButton({
                            id: 'custpage_acceptpayment',
                            label: 'Accept Payment Loan',
                            functionName: `window.open("${link}&buttontype=acceptpaymentloan")`
                        });
                    }

                    if (priAmt > priPaidAmt) {
                        form.addButton({
                            id: 'custpage_payment',
                            label: 'Make Payment',
                            functionName: `window.open("${link}&buttontype=payment")`
                        });
                    }
                    addBtnGoToGeneratePrincipalAndInterest(form, newRecord.id);
                }

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

        const addButtonCheck = (form, newRecord) => {
            const urlDeposit = url.resolveRecord({
                recordType: record.Type.CHECK,
                recordId: null,
                isEditMode: true,
                params: {
                    rectype: newRecord.type,
                    recid: newRecord.id
                }
            });
            form.addButton({
                id: 'custpage_writecheck',
                label: 'Write Check',
                functionName: `window.open("${urlDeposit}&buttontype=makecheck")`
            });
        }

        const addButtonMakeDeposit = (form, newRecord) => {
            const urlDeposit = url.resolveRecord({
                recordType: record.Type.DEPOSIT,
                recordId: null,
                isEditMode: true,
                params: {
                    rectype: newRecord.type,
                    recid: newRecord.id
                }
            });
            form.addButton({
                id: 'custpage_deposit',
                label: 'Make Deposit',
                functionName: `window.open("${urlDeposit}&buttontype=makedeposit")`
            });
        }

        const createInvoiceCheck = (form, newRecord, link) => {
            form.addButton({
                id: 'custpage_scv_invoice',
                label: 'Create Invoice, Write check',
                functionName: `window.open("${link}&buttontype=createinvoiceandwritecheck")`
            });
        }

        const createCustomerPayment = (form, newRecord) => {
            let urlCustomerPayment = url.resolveRecord({
                recordType: "customerpayment",
                recordId: null,
                isEditMode: true,
                params: {
                    sourcerecord: RecordType.DEBIT_LOAN_AGREEMENT,
                    sourcerecordid: newRecord.id,
                    function: Action.Create.CUSTOMER_PAYMENT,
                }
            });

            form.addButton({
                id: 'custpage_scv_customerpayment',
                label: 'Create Customer payment',
                functionName: `window.open("${urlCustomerPayment}")`
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

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
