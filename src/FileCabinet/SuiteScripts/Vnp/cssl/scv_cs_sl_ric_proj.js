/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 * Nội dung: Client script cho Suitelet Review Info Change (scv_sl_ric_proj.js)
 * =======================================================================================
 *  Date                Author                  Description
 *  03 Sep 2026          SuiteCloud              Init & create file
 */
define(['N/currentRecord', 'N/url'],

    (currentRecord, url) => {

        // Trùng với Field / SUBLIST_ID / Column của ../common/scv_common_ric_proj.js.
        // Không import trực tiếp module đó ở đây vì nó require N/record + lib/scv_lib_report.js
        // (chỉ chạy được ở server), theo đúng cách cssl/scv_cs_sl_db_payment_schdule.js đang làm.
        const Field = {
            PROJECT: 'custpage_project',
            TO_DATE: 'custpage_todate',
            IS_SEARCH: 'custpage_is_search'
        };
        const SUBLIST_PENDING = 'custpage_sublist_pending';
        const SUBLIST_REVIEW = 'custpage_sublist_review';
        const COL_MARK = 'col_mark';
        const COL_STT = 'col_stt';
        const COL_GROUP = 'col_group';
        const COL_CRITERIA = 'col_criteria';
        const COL_CURRENT = 'col_current';
        const COL_DRAFT = 'col_draft';
        const COL_APPROVED = 'col_approved';
        const COL_NOTE = 'col_note';

        // Các cột hiển thị của sublist Review cần bôi đậm khi là dòng tiêu đề nhóm (Group = Chỉ tiêu)
        const REVIEW_COLUMNS_TO_BOLD = [COL_STT, COL_GROUP, COL_CRITERIA, COL_CURRENT, COL_DRAFT, COL_APPROVED, COL_NOTE];

        // Tạm ẩn Result 1 (đầu bài không yêu cầu) - phải khớp với SHOW_PENDING_SUBLIST
        // ở ../common/scv_common_ric_proj.js (không import chung được, xem comment ở Field phía trên).
        const SHOW_PENDING_SUBLIST = false;

        const pageInit = (scriptContext) => {

        }

        const fieldChanged = (scriptContext) => {

        }

        /**
         * Chạy mỗi khi 1 dòng của sublist được init (kể cả các dòng có sẵn lúc load trang với
         * sublist INLINEEDITOR, và khi user bấm vào dòng để sửa) - API chuẩn của NetSuite để
         * disable field theo từng dòng, thay cho việc tự query DOM ở pageInit (không ổn định).
         * Dòng tiêu đề nhóm của sublist Review (Group = Chỉ tiêu) -> disable checkbox Chọn + bôi đậm.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord
         * @param {string} scriptContext.sublistId
         */
        const lineInit = (scriptContext) => {
            if (scriptContext.sublistId !== SUBLIST_REVIEW) return;

            let currRecord = scriptContext.currentRecord;
            let group = currRecord.getCurrentSublistValue({sublistId: SUBLIST_REVIEW, fieldId: COL_GROUP});
            let criteria = currRecord.getCurrentSublistValue({sublistId: SUBLIST_REVIEW, fieldId: COL_CRITERIA});
            let isHeaderRow = !!group && group === criteria;

            // API chuẩn N/currentRecord: disable/nhả disable field Chọn ngay trên dòng hiện tại
            let fieldMark = currRecord.getCurrentSublistField({sublistId: SUBLIST_REVIEW, fieldId: COL_MARK});
            if (fieldMark) fieldMark.isDisabled = isHeaderRow;

            if (!isHeaderRow) return;

            // Bôi đậm cả dòng - không có API chuẩn cho việc này nên vẫn phải qua DOM,
            // nhưng lineInit chạy đúng lúc dòng đã render nên id ổn định hơn hẳn so với gọi ở pageInit.
            let line = currRecord.getCurrentSublistIndex({sublistId: SUBLIST_REVIEW});
            for (let fieldId of REVIEW_COLUMNS_TO_BOLD) {
                let el = document.getElementById(SUBLIST_REVIEW + fieldId + line);
                if (el) el.style.fontWeight = 'bold';
            }
        }

        /**
         * Bấm Submit: phải tick ít nhất 1 dòng ở Result 1 hoặc Result mới cho submit,
         * tránh post lên Suitelet rồi mới báo lỗi (FDD: "Không cho phép bấm Submit khi chưa tick chọn dòng nào").
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         * @since 2015.2
         */
        const saveRecord = (scriptContext) => {
            let currRecord = scriptContext.currentRecord;
            // Sublist Review có dòng tiêu đề nhóm (Group = Chỉ tiêu) -> bỏ qua, chỉ validate chỉ tiêu thật.
            // Result 1 đang tạm ẩn (SHOW_PENDING_SUBLIST = false) -> không có sublist để check.
            let isMarked = (SHOW_PENDING_SUBLIST && isAnyMarked(currRecord, SUBLIST_PENDING, false))
                || isAnyMarked(currRecord, SUBLIST_REVIEW, true);

            if (!isMarked) {
                alert('Vui lòng tick chọn ít nhất một dòng ở "Danh sách phiếu chờ phê duyệt" hoặc "Review thông tin thay đổi" trước khi Submit.');
                return false;
            }
            return true;
        }

        const isAnyMarked = (currRecord, sublistId, skipGroupHeaderRow) => {
            let lineCount = currRecord.getLineCount({sublistId: sublistId});
            for (let i = 0; i < lineCount; i++) {
                if (skipGroupHeaderRow && isReviewHeaderLine(currRecord, i)) continue;
                let mark = currRecord.getSublistValue({sublistId: sublistId, fieldId: COL_MARK, line: i});
                if (mark === true) return true;
            }
            return false;
        }

        /**
         * Dòng tiêu đề nhóm của sublist Review: cột Group và Chỉ tiêu bằng nhau (không phải chỉ tiêu thật).
         */
        const isReviewHeaderLine = (currRecord, line) => {
            let group = currRecord.getSublistValue({sublistId: SUBLIST_REVIEW, fieldId: COL_GROUP, line: line});
            let criteria = currRecord.getSublistValue({sublistId: SUBLIST_REVIEW, fieldId: COL_CRITERIA, line: line});
            return !!group && group === criteria;
        }

        /**
         * Bấm Search -> load lại chính Suitelet kèm Project / To Date đang chọn.
         */
        const searchReviewInfo = () => {
            let currRecord = currentRecord.get();
            let projectId = currRecord.getValue(Field.PROJECT);
            let toDate = currRecord.getText(Field.TO_DATE);

            if (!projectId) {
                alert('Vui lòng chọn Project.');
                return;
            }
            if (!toDate) {
                alert('Vui lòng chọn To Date.');
                return;
            }

            window.onbeforeunload = null;

            // lấy script/deploy của chính Suitelet đang mở để không phải hardcode id
            let currentParams = new URLSearchParams(window.location.search);
            let urlSearch = url.resolveScript({
                scriptId: currentParams.get('script'),
                deploymentId: currentParams.get('deploy'),
                returnExternalUrl: false,
                params: {
                    [Field.PROJECT]: projectId || '',
                    [Field.TO_DATE]: toDate || '',
                    [Field.IS_SEARCH]: 'T'
                }
            });
            window.location.replace(urlSearch);
        }

        /**
         * Tick / bỏ tick toàn bộ cột Chọn của Result 1 (Danh sách phiếu chờ phê duyệt).
         */
        const markAllPending = (isMark) => {
            if (!SHOW_PENDING_SUBLIST) return;
            markAllSublist(SUBLIST_PENDING, isMark);
        }

        /**
         * Tick / bỏ tick toàn bộ cột Chọn của Result (Review thông tin thay đổi).
         */
        const markAllReview = (isMark) => {
            markAllSublist(SUBLIST_REVIEW, isMark);
        }

        const markAllSublist = (sublistId, isMark) => {
            let currRecord = currentRecord.get();
            let lineCount = currRecord.getLineCount({sublistId: sublistId});
            for (let i = 0; i < lineCount; i++) {
                // Dòng tiêu đề nhóm (Group = Chỉ tiêu) của sublist Review không phải chỉ tiêu thật -> bỏ qua
                if (sublistId === SUBLIST_REVIEW && isReviewHeaderLine(currRecord, i)) continue;

                currRecord.selectLine({sublistId: sublistId, line: i});
                currRecord.setCurrentSublistValue({
                    sublistId: sublistId,
                    fieldId: COL_MARK,
                    value: !!isMark,
                    ignoreFieldChange: true
                });
                currRecord.commitLine({sublistId: sublistId});
            }
        }

        return {
            pageInit,
            fieldChanged,
            lineInit,
            saveRecord,
            searchReviewInfo,
            markAllPending,
            markAllReview
        };

    });
