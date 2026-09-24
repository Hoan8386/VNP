/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 *
 * Nội dung: Review Info Change - Suitelet tổng hợp & duyệt hàng loạt thay đổi Project (https://docs.google.com/spreadsheets/d/1dnSOGPU91437pPOnksKDOM-oeb3358cl/edit?gid=1752622745#gid=1752622745 - mục 2)
 *           Entry point: Button "Review Info Change" trên màn hình Project (param projectId).
 *           - Result 1 (custpage_sublist_pending): Danh sách phiếu chờ phê duyệt.
 *           - Result   (custpage_sublist_review): Review thông tin thay đổi (CT1-CT10).
 *           Submit -> duyệt các phiếu đã tick ở Result 1 + update field theo "Đã phê duyệt" đã tick ở Result.
 *           Phần tính toán / query / update dữ liệu nằm ở ../common/scv_common_ric_proj.js.
 *           Client script: ../cssl/scv_cs_sl_ric_proj.js
 * =======================================================================================
 *  Date                Author                  Description
 *  03 Sep 2026          SuiteCloud              Init & create file
 */
define(['N/format', 'N/redirect', 'N/runtime', 'N/ui/message', 'N/ui/serverWidget',
        '../common/scv_common_ric_proj.js', '../lib/scv_lib_function.js', '../lib/scv_lib_report.js'],

    (format, redirect, runtime, message, serverWidget,
     cmRic, libFunc, libRep) => {

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
                    doGetReviewInfo(scriptContext);
                } else {
                    doPostReviewInfo(scriptContext);
                }
            } catch (e) {
                log.error('onRequest error', e);
                throw e;
            }
        }

        // ---------------------------------------------------------------------------------
        // GET: dựng màn hình + load Result 1 / Result theo bộ lọc
        // ---------------------------------------------------------------------------------
        const doGetReviewInfo = (scriptContext) => {
            let parameters = scriptContext.request.parameters;
            let form = createForm(parameters);
            let projectId = addFieldSearch(form, parameters);

            let listPending = [], listReview = [];
            if (parameters[cmRic.Field.IS_SEARCH] === 'T' && projectId) {
                let toDate = cmRic.toDate(parameters[cmRic.Field.TO_DATE]) || libFunc.getDateNow();
                if (cmRic.SHOW_PENDING_SUBLIST) {
                    listPending = cmRic.buildPendingList(projectId, toDate);
                }
                listReview = cmRic.buildReviewList(projectId, toDate);
            }

            // Tạm ẩn Result 1 (đầu bài không yêu cầu) - đổi cmRic.SHOW_PENDING_SUBLIST để bật lại
            if (cmRic.SHOW_PENDING_SUBLIST) {
                let sublistPending = createPendingSublist(form, listPending.length);
                setSublistValueLine(sublistPending, getPendingColumns(), listPending);
                setSublistViewLink(sublistPending, listPending);
            }

            let sublistReview = createReviewSublist(form, listReview.length);
            setSublistValueLine(sublistReview, getReviewColumns(), listReview);

            scriptContext.response.writePage(form);
        }

        // ---------------------------------------------------------------------------------
        // POST: bấm Submit -> duyệt phiếu + update field theo Đã phê duyệt
        // ---------------------------------------------------------------------------------
        const doPostReviewInfo = (scriptContext) => {
            let parameters = scriptContext.request.parameters;
            let messageInfo;
            try {
                // Tạm ẩn Result 1 (đầu bài không yêu cầu) -> không có sublist để đọc, coi như rỗng
                let listPendingAll = cmRic.SHOW_PENDING_SUBLIST
                    ? readSublistData(scriptContext.request, cmRic.SUBLIST_PENDING, getPendingColumns())
                    : [];
                let listReviewAll = readSublistData(scriptContext.request, cmRic.SUBLIST_REVIEW, getReviewColumns());

                // Dòng tiêu đề nhóm (Group = Chỉ tiêu) không phải chỉ tiêu thật -> bỏ trước khi validate/Submit
                let listReviewData = listReviewAll.filter(o => !cmRic.isGroupHeaderRow(o));

                let listPendingSelected = listPendingAll.filter(o => o[cmRic.PendingColumn.MARK] === 'T');
                let listReviewSelected = listReviewData.filter(o => o[cmRic.ReviewColumn.MARK] === 'T');

                if (!listPendingSelected.length && !listReviewSelected.length) {
                    messageInfo = 'Chưa chọn dòng nào để Submit.';
                } else {
                    let result = cmRic.submitApprove(listPendingSelected, listReviewSelected);
                    messageInfo = `Review Info Change: duyệt ${result.countApproved} phiếu, cập nhật ${result.countUpdated} chỉ tiêu.`;
                    if (result.countError) {
                        messageInfo += ` Lỗi: ${result.countError} dòng, xem Script Execution Log.`;
                    }
                }
            } catch (e) {
                log.error('doPostReviewInfo error', e);
                messageInfo = 'Submit thất bại: ' + (e.message || e);
            }

            redirect.toSuitelet({
                scriptId: runtime.getCurrentScript().id,
                deploymentId: runtime.getCurrentScript().deploymentId,
                parameters: {
                    [cmRic.Field.PROJECT]: parameters[cmRic.Field.PROJECT] || '',
                    [cmRic.Field.TO_DATE]: parameters[cmRic.Field.TO_DATE] || '',
                    [cmRic.Field.IS_SEARCH]: 'T',
                    message: messageInfo.substring(0, 900)
                }
            });
        }

        // ---------------------------------------------------------------------------------
        // UI
        // ---------------------------------------------------------------------------------
        const createForm = (parameters) => {
            let form = serverWidget.createForm({title: 'Review Info Change'});
            form.clientScriptModulePath = '../cssl/scv_cs_sl_ric_proj.js';

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
                functionName: 'searchReviewInfo()'
            });
            form.addSubmitButton({label: 'Submit'});

            return form;
        }

        /**
         * Bộ lọc (FDD 2.2.1): Project (*) - mặc định theo param projectId truyền từ màn hình Project,
         * To Date (*) - mặc định = ngày hiện tại, cho phép chọn lại.
         * @returns {string} projectId đang chọn
         */
        const addFieldSearch = (form, parameters) => {
            let groupFilterId = 'group_filter';
            form.addFieldGroup({id: groupFilterId, label: 'Filter'});

            let fieldProject = form.addField({
                id: cmRic.Field.PROJECT,
                label: 'Project',
                type: serverWidget.FieldType.SELECT,
                source: cmRic.Record.PROJECT,
                container: groupFilterId
            });
            fieldProject.isMandatory = true;
            let projectId = parameters[cmRic.Field.PROJECT] || parameters.projectId || '';
            if (projectId) {
                fieldProject.defaultValue = projectId;
            }

            let fieldToDate = form.addField({
                id: cmRic.Field.TO_DATE,
                label: 'To Date',
                type: serverWidget.FieldType.DATE,
                container: groupFilterId
            });
            fieldToDate.isMandatory = true;
            fieldToDate.defaultValue = parameters[cmRic.Field.TO_DATE]
                || format.format({value: libFunc.getDateNow(), type: format.Type.DATE});

            libRep.addFieldHidden(form, cmRic.Field.IS_SEARCH, parameters[cmRic.Field.IS_SEARCH] || '');

            return projectId;
        }

        const createPendingSublist = (form, length) => {
            let sublist = form.addSublist({
                id: cmRic.SUBLIST_PENDING,
                type: serverWidget.SublistType.INLINEEDITOR,
                label: `Result 1: Danh sách phiếu chờ phê duyệt (${length})`
            });
            sublist.addButton({id: 'custpage_bt_markall_pending', label: 'Mark All', functionName: 'markAllPending(true)'});
            sublist.addButton({id: 'custpage_bt_unmarkall_pending', label: 'Unmark All', functionName: 'markAllPending(false)'});
            libRep.addFieldLineColList(sublist, getPendingColumns());
            // linkText chỉ áp dụng được khi set trực tiếp trên Field trả về (addFieldLineCol không forward property này)
            sublist.addField({id: cmRic.PendingColumn.VIEW, type: serverWidget.FieldType.URL, label: 'View'}).linkText = 'View';
            return sublist;
        }

        const createReviewSublist = (form, length) => {
            let sublist = form.addSublist({
                id: cmRic.SUBLIST_REVIEW,
                type: serverWidget.SublistType.INLINEEDITOR,
                label: `Result: Review thông tin thay đổi (${length})`
            });
            sublist.addButton({id: 'custpage_bt_markall_review', label: 'Mark All', functionName: 'markAllReview(true)'});
            sublist.addButton({id: 'custpage_bt_unmarkall_review', label: 'Unmark All', functionName: 'markAllReview(false)'});
            libRep.addFieldLineColList(sublist, getReviewColumns());
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

        const setSublistViewLink = (sublist, listData) => {
            let line = 0;
            for (let objData of listData) {
                let urlView = objData[cmRic.PendingColumn.VIEW];
                if (urlView) {
                    sublist.setSublistValue({id: cmRic.PendingColumn.VIEW, line: line, value: urlView});
                }
                line++;
            }
        }

        /**
         * Cột sublist Result 1 (FDD 2.2.2). Cột hiển thị dùng DISABLED + isEntry để vẫn submit được
         * giá trị (theo helper libRep.addFieldLineCol), cột phục vụ Submit không cần hiển thị để HIDDEN.
         */
        const getPendingColumns = () => {
            let Column = cmRic.PendingColumn;
            return [
                {id: Column.MARK, label: 'Chọn', type: serverWidget.FieldType.CHECKBOX},
                {id: Column.STT, label: 'STT', type: serverWidget.FieldType.TEXT, display: serverWidget.FieldDisplayType.DISABLED, isEntry: true},
                {id: Column.TYPE, label: 'Loại phiếu', type: serverWidget.FieldType.TEXT, display: serverWidget.FieldDisplayType.DISABLED, isEntry: true},
                {id: Column.DOC_ID, label: 'ID', type: serverWidget.FieldType.TEXT, display: serverWidget.FieldDisplayType.DISABLED, isEntry: true},
                {id: Column.NAME, label: 'Name', type: serverWidget.FieldType.TEXT, display: serverWidget.FieldDisplayType.DISABLED, isEntry: true},
                {id: Column.STATUS, label: 'Trạng thái phê duyệt', type: serverWidget.FieldType.TEXT, display: serverWidget.FieldDisplayType.DISABLED, isEntry: true},
                {id: Column.REC_ID, label: 'Record ID', type: serverWidget.FieldType.TEXT, display: serverWidget.FieldDisplayType.HIDDEN},
                {id: Column.REC_TYPE, label: 'Record Type', type: serverWidget.FieldType.TEXT, display: serverWidget.FieldDisplayType.HIDDEN},
                {id: Column.STATUS_FIELD, label: 'Status Field', type: serverWidget.FieldType.TEXT, display: serverWidget.FieldDisplayType.HIDDEN}
            ];
        }

        /**
         * Cột sublist Result (FDD 2.2.2) - CT1-CT10.
         */
        const getReviewColumns = () => {
            let Column = cmRic.ReviewColumn;
            return [
                {id: Column.MARK, label: 'Chọn', type: serverWidget.FieldType.CHECKBOX},
                {id: Column.STT, label: 'STT', type: serverWidget.FieldType.TEXT, display: serverWidget.FieldDisplayType.DISABLED},
                {id: Column.GROUP, label: 'Group', type: serverWidget.FieldType.TEXT, display: serverWidget.FieldDisplayType.HIDDEN},
                {id: Column.CRITERIA, label: 'Chỉ tiêu', type: serverWidget.FieldType.TEXT, display: serverWidget.FieldDisplayType.DISABLED},
                {id: Column.CURRENT, label: 'Hiện tại', type: serverWidget.FieldType.FLOAT, display: serverWidget.FieldDisplayType.DISABLED},
                {id: Column.DRAFT, label: 'Thay đổi (Dự thảo)', type: serverWidget.FieldType.FLOAT, display: serverWidget.FieldDisplayType.DISABLED},
                {id: Column.APPROVED, label: 'Thay đổi (Đã phê duyệt)', type: serverWidget.FieldType.FLOAT, display: serverWidget.FieldDisplayType.DISABLED},
                {id: Column.NOTE, label: 'Ghi chú', type: serverWidget.FieldType.TEXT, display: serverWidget.FieldDisplayType.DISABLED},
                {id: Column.TARGET_TYPE, label: 'Target Type', type: serverWidget.FieldType.TEXT, display: serverWidget.FieldDisplayType.HIDDEN},
                {id: Column.TARGET_ID, label: 'Target ID', type: serverWidget.FieldType.TEXT, display: serverWidget.FieldDisplayType.HIDDEN},
                {id: Column.TARGET_FIELD, label: 'Target Field', type: serverWidget.FieldType.TEXT, display: serverWidget.FieldDisplayType.HIDDEN}
            ];
        }

        /**
         * Đọc lại dữ liệu 1 sublist INLINEEDITOR lúc POST. Cột display INLINE không submit được
         * (không dùng ở đây); cột HIDDEN / DISABLED+isEntry đều đọc lại đúng giá trị đã set ở GET.
         */
        const readSublistData = (request, sublistId, columns) => {
            let lineCount = 0;
            try {
                lineCount = request.getLineCount(sublistId);
            } catch (e) {
                log.audit('readSublistData', 'Không đọc được sublist ' + sublistId + ': ' + (e.message || e));
            }

            let listData = [];
            for (let i = 0; i < lineCount; i++) {
                let objData = {};
                for (let objCol of columns) {
                    objData[objCol.id] = request.getSublistValue(sublistId, objCol.id, i);
                }
                listData.push(objData);
            }
            return listData;
        }

        return {onRequest}

    });
