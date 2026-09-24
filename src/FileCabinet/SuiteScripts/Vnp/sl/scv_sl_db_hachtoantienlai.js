/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Nội dung: Create JRL Interest - Tạo chứng từ Journal hạch toán tiền lãi (FDD https://docs.google.com/spreadsheets/d/1bjxurbDCAHN5_vD11bVBMmTd1yC01mD0NDNQBjJX_vI/edit?gid=1893630250#gid=1893630250 - mục 2)
 *           - Filter: Subsidiary (*) / Date (*) / Debit/loan Agreement (multiple select)
 *           - Results: load SS customsearch_scv_interest_sch, user chỉnh lại Amount / 2 Account
 *           - Create JRL: group theo {custbody_scv_loa} + Period MMYYYY -> 1 Journal / 1 nhóm,
 *             mỗi dòng Suitelet sinh 2 dòng Journal (Debit: Accural Interest Acc, Credit: Income/Expense Acc),
 *             tạo tại Suitelet tối đa 5 Journal đầu, phần còn lại đẩy vào hàng đợi cho Map/Reduce.
 *           - Journal tạo xong -> set {custrecord_scv_db_status} = 2 (Approved) cho Payment Schedule tương ứng.
 *           Hằng số / SQL / filter / build object Journal dùng chung với Client script
 *           nằm ở ../common/scv_common_db_hachtoantienlai.js
 * =======================================================================================
 *  Date                Author                  Description
 *  27 Aug 2026         SuiteCloud              Init & create file
 */
define(['N/format', 'N/record', 'N/redirect', 'N/runtime', 'N/search', 'N/task', 'N/ui/message', 'N/ui/serverWidget',
        '../common/scv_common_db_hachtoantienlai.js', '../common/scv_common_import_data.js',
        '../lib/scv_lib_function.js', '../lib/scv_lib_report.js'],

    (format, record, redirect, runtime, search, task, message, serverWidget,
     cmInterest, commonData, libFunc, libRep) => {

        const Field = cmInterest.Field;
        const Column = cmInterest.Column;
        const SUBLIST_ID = cmInterest.SUBLIST_ID;

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
                    doGetInterestJournal(scriptContext);
                } else {
                    doPostInterestJournal(scriptContext);
                }
            } catch (e) {
                log.error('onRequest error', e);
                throw e;
            }
        }

        // ---------------------------------------------------------------------------------
        // GET: dựng màn hình + load SS Interest Schedule theo bộ lọc
        // ---------------------------------------------------------------------------------
        const doGetInterestJournal = (scriptContext) => {
            let parameters = scriptContext.request.parameters;
            let columns = getMasterData();

            let form = createForm(parameters);
            let subsidiaryIdSelected = addFieldSearch(form, parameters);

            let listData = [];
            if (parameters[Field.IS_SEARCH] === 'T') {
                listData = searchInterestSchedule(subsidiaryIdSelected, parameters[Field.DATE],
                    cmInterest.parseMultiValue(parameters[Field.DEBIT_LOAN]));
            }

            let sublist = createSublist(form, columns, listData.length);
            setSublistValueLine(sublist, columns, listData);

            scriptContext.response.writePage(form);
        }

        // ---------------------------------------------------------------------------------
        // POST: bấm Create JRL -> tạo Journal hạch toán lãi
        // ---------------------------------------------------------------------------------
        const doPostInterestJournal = (scriptContext) => {
            let parameters = scriptContext.request.parameters;
            let messageInfo;
            try {
                let listData = readSublistData(scriptContext.request);
                let listSelected = listData.filter(o => o[Column.MARK] === 'T' && cmInterest.toNumber(o[Column.AMOUNT]));

                if (!listSelected.length) {
                    messageInfo = 'Chưa chọn dòng nào có Amount khác 0 để tạo bút toán hạch toán lãi.';
                } else {
                    let listObject = cmInterest.buildListJournal(listSelected, parameters[Field.DATE]);
                    messageInfo = createListJournal(listObject);
                }
            } catch (e) {
                log.error('doPostInterestJournal error', e);
                messageInfo = 'Tạo bút toán hạch toán lãi thất bại: ' + (e.message || e);
            }

            redirect.toSuitelet({
                scriptId: runtime.getCurrentScript().id,
                deploymentId: runtime.getCurrentScript().deploymentId,
                parameters: {
                    [Field.SUBSIDIARY]: parameters[Field.SUBSIDIARY] || '',
                    [Field.DATE]: parameters[Field.DATE] || '',
                    [Field.DEBIT_LOAN]: cmInterest.parseMultiValue(parameters[Field.DEBIT_LOAN]).join(','),
                    [Field.IS_SEARCH]: 'F',
                    // chặn url quá dài khi có nhiều dòng lỗi, chi tiết đã có ở Script Execution Log
                    message: messageInfo.substring(0, 900)
                }
            });
        }

        // ---------------------------------------------------------------------------------
        // UI
        // ---------------------------------------------------------------------------------
        const createForm = (parameters) => {
            let form = serverWidget.createForm({title: 'Create JRL Interest'});
            form.clientScriptModulePath = '../cssl/scv_cs_sl_db_hachtoantienlai.js';

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
                functionName: 'searchInterestJournal()'
            });
            form.addSubmitButton({label: 'Create JRL'});

            return form;
        }

        /**
         * Bộ lọc (FDD 2.2.1). Trả về list id subsidiary đang chọn (theo phân quyền của user).
         * @returns {Array<string>}
         */
        const addFieldSearch = (form, parameters) => {
            let groupFilterId = 'group_filter';
            form.addFieldGroup({id: groupFilterId, label: 'Filter'});

            // Subsidiary: mặc định theo subsidiary của user, option theo phân quyền role
            let fieldSubsidiary = form.addField({
                id: Field.SUBSIDIARY,
                label: 'Subsidiary',
                type: serverWidget.FieldType.SELECT,
                container: groupFilterId
            });
            fieldSubsidiary.isMandatory = true;
            let subsidiaryIdSelected = libRep.addSelectSubsidiary(fieldSubsidiary,
                parameters[Field.SUBSIDIARY] || runtime.getCurrentUser().subsidiary);

            // Date: chỉ dùng MMYYYY để lọc Payment Date, đồng thời là trandate của Journal
            let fieldDate = form.addField({
                id: Field.DATE,
                label: 'Date',
                type: serverWidget.FieldType.DATE,
                container: groupFilterId
            });
            fieldDate.isMandatory = true;
            fieldDate.defaultValue = parameters[Field.DATE]
                || format.format({value: new Date(), type: format.Type.DATE});

            // Debit/Loan Agreement: cho phép chọn nhiều, option lọc theo subsidiary đang chọn
            // (đổi Subsidiary thì Client script nạp lại list này bằng cùng câu SQL)
            let fieldDebitLoan = form.addField({
                id: Field.DEBIT_LOAN,
                label: 'Debit/Loan Agreement',
                type: serverWidget.FieldType.MULTISELECT,
                container: groupFilterId
            });
            let objSql = cmInterest.getSqlDebitLoan(subsidiaryIdSelected);
            libRep.addSelectionViaSql(fieldDebitLoan, objSql.sql, objSql.params, false,
                cmInterest.parseMultiValue(parameters[Field.DEBIT_LOAN]));

            libRep.addFieldHidden(form, Field.IS_SEARCH, parameters[Field.IS_SEARCH] || '');

            return subsidiaryIdSelected;
        }

        const createSublist = (form, columns, length) => {
            let sublist = form.addSublist({
                id: SUBLIST_ID,
                type: serverWidget.SublistType.INLINEEDITOR,
                label: `Results (${length})`
            });

            // Mark All / Unmark All chỉ tác động lên sublist -> để nút ngay trên sublist
            sublist.addButton({
                id: 'custpage_bt_markall',
                label: 'Mark All',
                functionName: 'markAllInterestJournal(true)'
            });
            sublist.addButton({
                id: 'custpage_bt_unmarkall',
                label: 'Unmark All',
                functionName: 'markAllInterestJournal(false)'
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

        /**
         * Cột của sublist Results (FDD 2.2.2). Chỉ Mark / Amount / 2 Account cho user sửa,
         * các cột còn lại lấy từ SS và chỉ hiển thị.
         * Lúc POST đọc lại dữ liệu từ chính sublist này (readSublistData) nên giá trị nào
         * cần dùng để tạo Journal phải để display HIDDEN, không để INLINE (INLINE không submit).
         */
        const getMasterData = () => {
            return [
                {
                    id: Column.MARK,
                    label: 'Mark',
                    type: serverWidget.FieldType.CHECKBOX
                },
                {
                    // internal id của Payment Schedule -> dùng để set status Approved sau khi tạo Journal
                    id: Column.ID,
                    label: 'Internal ID',
                    type: serverWidget.FieldType.TEXT,
                    display: serverWidget.FieldDisplayType.HIDDEN
                },
                {
                    // cột id lấy từ SS -> ẩn đi, phần hiển thị dùng cột <id>_display
                    id: Column.SUBSIDIARY,
                    label: 'Subsidiary',
                    type: serverWidget.FieldType.TEXT,
                    display: serverWidget.FieldDisplayType.HIDDEN
                },
                {
                    id: Column.ENTITY,
                    label: 'Entity',
                    type: serverWidget.FieldType.TEXT,
                    display: serverWidget.FieldDisplayType.HIDDEN
                },
                {
                    id: Column.DEBIT_LOAN,
                    label: 'Debit/loan Agreement',
                    type: serverWidget.FieldType.TEXT,
                    display: serverWidget.FieldDisplayType.HIDDEN
                },
                {
                    id: Column.DEBIT_LOAN_TEXT,
                    label: 'Debit/loan Agreement',
                    type: serverWidget.FieldType.TEXT,
                    display: serverWidget.FieldDisplayType.DISABLED
                },
                {
                    id: Column.DATE,
                    label: 'Date',
                    type: serverWidget.FieldType.TEXT,
                    display: serverWidget.FieldDisplayType.DISABLED
                },
                {
                    id: Column.RATE,
                    label: 'Interest Rate',
                    type: serverWidget.FieldType.TEXT,
                    display: serverWidget.FieldDisplayType.DISABLED
                },
                {
                    id: Column.AMOUNT,
                    label: 'Amount',
                    type: serverWidget.FieldType.FLOAT
                },
                {
                    id: Column.INTEREST_ACC,
                    label: 'Accural Interest Acc',
                    type: serverWidget.FieldType.SELECT,
                    source: 'account'
                },
                {
                    id: Column.INCOME_ACC,
                    label: 'Income/Expense Acc',
                    type: serverWidget.FieldType.SELECT,
                    source: 'account'
                }
            ];
        }

        // ---------------------------------------------------------------------------------
        // Search - SS customsearch_scv_interest_sch (FDD 2.2.2)
        // ---------------------------------------------------------------------------------
        /**
         * Load SS Interest Schedule theo bộ lọc. MappingColumn đã trả về đúng id cột của sublist
         * nên dùng thẳng kết quả search, không map lại.
         * @param {Array<string>} listSubsidiaryId
         * @param {string} strDate - Date chọn trên Suitelet (chỉ lấy MMYYYY để so sánh Payment Date)
         * @param {Array<string>} listDebitLoanId
         * @returns {Array<Object>}
         */
        const searchInterestSchedule = (listSubsidiaryId, strDate, listDebitLoanId) => {
            let results = [];
            let listColAdd = [search.createColumn({name: 'internalid', label: 'Internal ID'})];
            libRep.doSearchSSRangeLabelIdMappingColumn(cmInterest.SavedSearch.INTEREST_SCHEDULE, 1000, results,
                cmInterest.buildFilter(listSubsidiaryId, strDate, listDebitLoanId), listColAdd, cmInterest.MappingColumn);

            return results;
        }

        // ---------------------------------------------------------------------------------
        // Tạo chứng từ hạch toán lãi (FDD 2.2.3)
        // ---------------------------------------------------------------------------------
        /**
         * Đọc lại dữ liệu của sublist Results lúc submit. Không giữ bản search ở field ẩn nữa,
         * mỗi dòng lấy thẳng giá trị các cột trên sublist (kể cả phần user vừa chỉnh),
         * nên thêm/bớt cột ở getMasterData là POST tự nhận theo, không phải sửa thêm chỗ nào.
         * Cột để display INLINE không được submit -> bỏ qua khi đọc.
         * @returns {Array<Object>}
         */
        const readSublistData = (request) => {
            let lineCount = 0;
            try {
                lineCount = request.getLineCount(SUBLIST_ID);
            } catch (e) {
                // sublist rỗng thì getLineCount ném lỗi -> coi như không có dòng nào
                log.audit('readSublistData', 'Không đọc được sublist: ' + (e.message || e));
            }

            let columns = getMasterData();

            let listData = [];
            for (let i = 0; i < lineCount; i++) {
                let objData = {};
                for (let objCol of columns) {
                    objData[objCol.id] = request.getSublistValue(SUBLIST_ID, objCol.id, i);
                }
                objData[Column.MARK] = objData[Column.MARK] === 'T' ? 'T' : 'F';
                if(objData[Column.MARK] === 'T') {
                    objData[Column.AMOUNT] = cmInterest.toNumber(objData[Column.AMOUNT]);
                    listData.push(objData);
                }
            }
            return listData;
        }

        /**
         * Tạo MAX_CREATE_ON_SUITELET Journal đầu ngay tại Suitelet để user thấy kết quả,
         * phần còn lại đẩy vào hàng đợi rồi giao cho Map/Reduce chạy tiếp.
         * @returns {string} message hiển thị lên màn hình
         */
        const createListJournal = (listObject) => {
            let listJournalId = [];
            let listError = [];

            let listCreateNow = listObject.slice(0, cmInterest.MAX_CREATE_ON_SUITELET);
            for (let object of listCreateNow) {
                try {
                    let journalId = libFunc.createRecord(cmInterest.Record.JOURNAL, commonData.Sublist.LINE,
                        object.fields, object.lines);
                    listJournalId.push(journalId);
                    commonData.applyUpdate(object.updates);
                } catch (e) {
                    log.error('createListJournal', e);
                    listError.push(`${object.fields.memo}: ${e.message || e}`);
                }
            }

            let messageInfo = `Create JRL Interest: ${listObject.length} Journal.`
                + ` Đã tạo ${listJournalId.length}${listJournalId.length ? ' (id: ' + listJournalId.join(', ') + ')' : ''}.`;

            let listRemain = listObject.slice(cmInterest.MAX_CREATE_ON_SUITELET);
            if (listRemain.length) {
                let dataProcessId = createDataProcess(cmInterest.Record.JOURNAL, commonData.Sublist.LINE, listRemain);
                if (dataProcessId) {
                    let taskId = submitImportDataTask(dataProcessId);
                    messageInfo += ` Còn ${listRemain.length} Journal đã đưa vào hàng đợi ${dataProcessId}`
                        + (taskId ? ` (Map/Reduce task ${taskId}).` : `, Map/Reduce sẽ quét ở lần chạy kế tiếp.`);
                } else {
                    messageInfo += ` Không đưa được ${listRemain.length} Journal vào hàng đợi, xem Script Execution Log.`;
                }
            }

            if (listError.length) {
                messageInfo += ` Lỗi: ${listError.length} Journal - ${listError.join(' | ')}`;
            }
            return messageInfo;
        }

        /**
         * Lưu toàn bộ object chưa xử lý vào 1 record hàng đợi customrecord_scv_import_data_process
         * (cả list JSON để ở field long text), Map/Reduce sẽ đọc theo id record này.
         * @param {string} recordType - record type Map/Reduce sẽ tạo ra
         * @param {string} sublist - sublist set line khi tạo record
         * @param {Array<{fields: Object, lines: Array<Object>}>} listObject
         * @returns {string} internal id của record hàng đợi, '' nếu không có gì để đưa vào hàng đợi
         */
        const createDataProcess = (recordType, sublist, listObject) => {
            if (!listObject || !listObject.length) return '';

            try {
                const recImpDataProcess = record.create({type: commonData.RecordType.IMPORT_DATA_PROCESS});
                recImpDataProcess.setValue({
                    fieldId: commonData.ImportDataProcessField.NAME,
                    value: `${recordType} - ${listObject.length} record`
                });
                recImpDataProcess.setValue({fieldId: commonData.ImportDataProcessField.DATA, value: JSON.stringify(listObject)});
                recImpDataProcess.setValue({fieldId: commonData.ImportDataProcessField.RECORD_TYPE, value: recordType});
                recImpDataProcess.setValue({fieldId: commonData.ImportDataProcessField.SUBLIST, value: sublist});
                return recImpDataProcess.save({enableSourcing: false, ignoreMandatoryFields: true});
            } catch (e) {
                log.error('createDataProcess', e);
                return '';
            }
        }

        /**
         * Gọi Map/Reduce xử lý nốt hàng đợi, truyền id record hàng đợi vừa tạo qua param.
         * @returns {string} task id, '' nếu submit không thành công (MR đang chạy...)
         */
        const submitImportDataTask = (dataProcessId) => {
            try {
                const params = {};
                params[commonData.MapReduce.ImportDataProcess.PARAM] = JSON.stringify({dataProcessId: dataProcessId});
                const mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: commonData.MapReduce.ImportDataProcess.SCRIPT_ID,
                    deploymentId: commonData.MapReduce.ImportDataProcess.DEPLOY_ID_HTTL,
                    params: params
                });
                return mrTask.submit();
            } catch (e) {
                // MR đang chạy dở thì lần chạy sau sẽ tự quét nốt hàng đợi còn active
                log.error('submitImportDataTask', e);
                return '';
            }
        }

        return {onRequest}

    });
