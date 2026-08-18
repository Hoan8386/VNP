/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Nội dung: Debit/Loan Agreement Schedule - Tạm tính lãi hàng kỳ (https://app.clickup.com/t/3773072/86d41cen2 - mục 2.1)
 *           Phần tính toán / query / lưu bảng tính nằm ở ../common/scv_common_db_payment_schdule.js
 * =======================================================================================
 *  Date                Author                  Description
 *  14 Aug 2026         SuiteCloud              Init & create file
 */
define(['N/redirect', 'N/runtime', 'N/ui/message', 'N/ui/serverWidget',
        '../common/scv_common_db_payment_schdule.js', '../lib/scv_lib_report.js'],

    (redirect, runtime, message, serverWidget,
     cmSchedule, libRep) => {

        const Field = {
            DEBIT_LOAN: 'custpage_debitloan',
            DATA: 'custpage_data',
            IS_SEARCH: 'custpage_is_search'
        };

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            try {
                if (scriptContext.request.method === 'GET') {
                    doGetPaymentSchedule(scriptContext);
                } else {
                    doPostPaymentSchedule(scriptContext);
                }
            } catch (e) {
                log.error('onRequest error', e);
                throw e;
            }
        }

        // ---------------------------------------------------------------------------------
        // GET: dựng màn hình + tính bảng lãi vay
        // ---------------------------------------------------------------------------------
        const doGetPaymentSchedule = (scriptContext) => {
            let parameters = scriptContext.request.parameters;
            let {sublistId, columns} = getMasterData();

            let form = createForm(parameters);
            let listData = [];
            if (parameters[Field.IS_SEARCH] === 'T' && parameters[Field.DEBIT_LOAN]) {
                listData = cmSchedule.buildScheduleData(parameters[Field.DEBIT_LOAN]);
            }

            let sublist = createSublist(form, sublistId, columns, listData.length);
            setSublistValueLine(sublist, columns, listData);

            form.getField({id: Field.DATA}).defaultValue = JSON.stringify(listData);

            scriptContext.response.writePage(form);
        }

        // ---------------------------------------------------------------------------------
        // POST: bấm Save -> lưu bảng tính vào customrecord_scv_prinandintersheet
        // ---------------------------------------------------------------------------------
        const doPostPaymentSchedule = (scriptContext) => {
            let parameters = scriptContext.request.parameters;
            let messageInfo = '';
            try {
                let listData = JSON.parse(parameters[Field.DATA] || '[]');
                let result = cmSchedule.saveScheduleSheet(listData);
                messageInfo = `Loan Principal and Interest Sheet (${listData.length} dòng):`
                    + ` tạo mới ${result.countCreate}, cập nhật ${result.countUpdate},`
                    + ` bỏ qua ${result.countSkip} (đã Approved).`;
                if (result.countError) {
                    messageInfo += ` Lỗi: ${result.countError} dòng, xem Script Execution Log.`;
                }
            } catch (e) {
                log.error('doPostPaymentSchedule error', e);
                messageInfo = 'Lưu bảng tính lãi vay thất bại: ' + (e.message || e);
            }

            redirect.toSuitelet({
                scriptId: runtime.getCurrentScript().id,
                deploymentId: runtime.getCurrentScript().deploymentId,
                parameters: {
                    [Field.DEBIT_LOAN]: parameters[Field.DEBIT_LOAN] || '',
                    message: messageInfo
                }
            });
        }

        // ---------------------------------------------------------------------------------
        // UI
        // ---------------------------------------------------------------------------------
        const createForm = (parameters) => {
            let form = serverWidget.createForm({title: 'Debit/Loan Agreement Schedule'});
            form.clientScriptModulePath = '../cssl/scv_cs_sl_db_payment_schdule.js';

            if (parameters.message) {
                form.addPageInitMessage({
                    type: message.Type.INFORMATION,
                    message: parameters.message,
                    duration: -1
                });
            }

            form.addButton({
                id: 'custpage_bt_search',
                label: 'Search',
                functionName: 'searchPaymentSchedule()'
            });
            form.addSubmitButton({label: 'Save'});

            addFieldSearch(form, parameters);
            return form;
        }

        const addFieldSearch = (form, parameters) => {
            let groupFilterId = 'group_filter';
            form.addFieldGroup({id: groupFilterId, label: 'Filter'});

            let fieldDebitLoan = form.addField({
                id: Field.DEBIT_LOAN,
                label: 'Debit/Loan Agreement',
                type: serverWidget.FieldType.SELECT,
                source: cmSchedule.Record.DEBIT_LOAN,
                container: groupFilterId
            });
            if (parameters[Field.DEBIT_LOAN]) {
                fieldDebitLoan.defaultValue = parameters[Field.DEBIT_LOAN];
            }

            // giữ lại bảng tính vừa tính để Save đúng dữ liệu người dùng đang xem
            form.addField({
                id: Field.DATA,
                label: 'Data',
                type: serverWidget.FieldType.LONGTEXT
            }).updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
        }

        const createSublist = (form, sublistId, columns, length) => {
            let sublist = form.addSublist({
                id: sublistId,
                type: serverWidget.SublistType.LIST,
                label: `Result (${length})`
            });
            libRep.addFieldLineColList(sublist, columns);
            return sublist;
        }

        const setSublistValueLine = (sublist, columns, listData) => {
            let line = 0;
            for (let objData of listData) {
                for (let objCol of columns) {
                    let tempValue = objData[objCol.id];
                    if (tempValue || tempValue === 0) {
                        if (typeof tempValue === 'string') {
                            tempValue = tempValue.substring(0, 300);
                        }
                        sublist.setSublistValue({id: objCol.id, line: line, value: tempValue});
                    }
                }
                line++;
            }
        }

        const getMasterData = () => {
            let sublistId = 'custpage_sublist_schedule';
            let columns = [
                {
                    id: 'col_name',
                    label: 'Name',
                    type: serverWidget.FieldType.TEXT,
                    display: serverWidget.FieldDisplayType.INLINE
                },
                {
                    id: 'col_debitloan',
                    label: 'Debit/Loan Agreement',
                    type: serverWidget.FieldType.TEXT,
                    display: serverWidget.FieldDisplayType.INLINE
                },
                {
                    id: 'col_date',
                    label: 'Date',
                    type: serverWidget.FieldType.TEXT,
                    display: serverWidget.FieldDisplayType.INLINE
                },
                {
                    id: 'col_type',
                    label: 'Type',
                    type: serverWidget.FieldType.TEXT,
                    display: serverWidget.FieldDisplayType.INLINE
                },
                {
                    id: 'col_outstanding',
                    label: 'Principal',
                    type: serverWidget.FieldType.FLOAT,
                    display: serverWidget.FieldDisplayType.DISABLED,
                    isEntry: true
                },
                {
                    id: 'col_rate',
                    label: 'Interest Rate',//&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;
                    type: serverWidget.FieldType.PERCENT,
                    display: serverWidget.FieldDisplayType.DISABLED,
                    isEntry: true
                },
                {
                    id: 'col_amount',
                    label: 'Amount',
                    type: serverWidget.FieldType.FLOAT,
                    display: serverWidget.FieldDisplayType.DISABLED,
                    isEntry: true
                }
            ];
            return {sublistId, columns};
        }

        return {onRequest}

    });