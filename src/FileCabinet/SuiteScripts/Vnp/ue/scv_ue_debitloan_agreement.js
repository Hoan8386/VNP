/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * Nội dung: Các nút thao tác trên Debit/Loan Agreement (FDD 14/08/2026 - Tạo chứng từ hạch toán từ Debit/Loan Agreement)
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
            BENEFICIARY: "customrecord_scv_beb", // Thông tin người thụ hưởng
        }

        const TypeLoan = libLoa.LOA_TYPE;

        const beforeLoad = (scriptContext) => {
            try {
                let form = scriptContext.form;
                let newRecord = scriptContext.newRecord;

                const typeRecord = newRecord.type;
                if (typeRecord !== RecordType.DEBIT_LOAN_AGREEMENT) return;

                const loa_type = newRecord.getValue("custrecord_scv_loa_type");
                const priAmt = newRecord.getValue("custrecord_scv_loa_principal_amount");
                const priPaidAmt = newRecord.getValue("custrecord_scv_loa_principal_paid_amount");
                const loaAmt = newRecord.getValue("custrecord_scv_loa_amount");

                // FDD 2.1 - TH Đi vay
                if (TypeLoan.DI_VAY === loa_type) {
                    // 2.1.1 Enter Loan Principal: tạo đồng thời Bill + Deposit
                    if (loaAmt > priAmt) {
                        addButtonEnterLoanPrincipal(form, newRecord);
                    }
                    // 2.1.2 Make Payment: redirect sang Bill Payment
                    if (priPaidAmt < loaAmt) {
                        addButtonMakePayment(form, newRecord);
                    }
                    addBtnGoToGeneratePrincipalAndInterest(form, newRecord.id);
                }

                // FDD 2.2 - TH Cho vay, tiết kiệm
                if ([TypeLoan.CHO_VAY, TypeLoan.TIET_KIEM].indexOf(loa_type) !== -1) {
                    // 2.2.1 Enter Deposit Principal: tạo đồng thời Invoice + Check
                    if (loaAmt > priAmt) {
                        addButtonEnterDepositPrincipal(form, newRecord);
                    }
                    // 2.2.2 Accept Payment: redirect sang Customer Payment
                    if (priPaidAmt < loaAmt) {
                        addButtonAcceptPayment(form, newRecord);
                    }
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

        // FDD 2.1.1 - nút "Enter Loan Principal": gọi Suitelet tạo đồng thời Bill + Deposit
        const addButtonEnterLoanPrincipal = (form, newRecord) => {
            const link = url.resolveScript({
                scriptId: 'customscript_scv_sl_debitloan_agreement',
                deploymentId: 'customdeploy_scv_sl_debitloan_agreement',
                params: {recid: newRecord.id, action: libLoa.SL_ACTION.ENTER_LOAN_PRINCIPAL}
            });
            form.addButton({
                id: 'custpage_enter_loan_principal',
                label: 'Enter Loan Principal',
                functionName: `window.location.replace("${link}")`
            });
        }

        // FDD 2.2.1 - nút "Enter Deposit Principal": gọi Suitelet tạo đồng thời Invoice + Check
        const addButtonEnterDepositPrincipal = (form, newRecord) => {
            const link = url.resolveScript({
                scriptId: 'customscript_scv_sl_debitloan_agreement',
                deploymentId: 'customdeploy_scv_sl_debitloan_agreement',
                params: {recid: newRecord.id, action: libLoa.SL_ACTION.ENTER_DEPOSIT_PRINCIPAL}
            });
            form.addButton({
                id: 'custpage_enter_deposit_principal',
                label: 'Enter Deposit Principal',
                functionName: `window.location.replace("${link}")`
            });
        }

        // FDD 2.1.2 - nút "Make Payment": redirect sang Bill Payment, kế thừa thông tin qua createdfromid/createdrectype
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

        // FDD 2.2.2 - nút "Accept Payment": redirect sang Customer Payment, kế thừa thông tin qua createdfromid/createdrectype
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

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
