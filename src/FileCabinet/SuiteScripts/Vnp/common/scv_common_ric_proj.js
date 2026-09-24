/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * Nội dung: Review Info Change - Tổng hợp & duyệt hàng loạt thay đổi Project (VNP_FDD_Proj.xlsx - mục 2)
 *           Entry point: Button "Review Info Change" trên màn hình Project (customrecord_cseg_inv_portfolio)
 *           - Result 1 (Danh sách phiếu chờ phê duyệt): tổng hợp các phiếu đang chờ duyệt của 4 loại
 *             (Thông tin biến động đầu tư / Người đại diện / Thông tin ĐHĐCĐ / Thông tin doanh nghiệp).
 *           - Result (Review thông tin thay đổi): CT1-CT10, so sánh Hiện tại / Dự thảo / Đã phê duyệt.
 *           Submit -> set status các phiếu đã tick ở Result 1 = "Phê duyệt" (id=6)
 *                  -> update field tương ứng ở Project / Người đại diện theo giá trị "Đã phê duyệt" đã tick ở Result.
 *           Chứa phần tính toán / query / update dữ liệu dùng cho Suitelet sl/scv_sl_ric_proj.js.
 * =======================================================================================
 *  Date                Author                  Description
 *  03 Sep 2026          SuiteCloud              Init & create file
 */
define(['N/format', 'N/record', 'N/search', 'N/url', '../lib/scv_lib_report.js'],

    (format, record, search, url, libRep) => {

        const Record = {
            PROJECT: 'customrecord_cseg_inv_portfolio',
            TTDT: 'customrecord_scv_ttdt',
            DDQT: 'customrecord_scv_ddqt',
            DHDCD: 'customrecord_scv_dhdcd',
            INVESTEE: 'customrecord_scv_investee'
        };

        // customrecord_scv_approval_status: Phê duyệt => 6 (dùng chung cho cả 4 loại phiếu, giống quy ước
        // đã dùng ở scv_ue_payment_request.js - STATUS.APPROVED = '6')
        const ApprovalStatus = {
            APPROVED: '6'
        };

        const SavedSearch = {
            PROJECT: 'customsearch_scv_ric_proj',                      // SS1
            TTDT_ALL: 'customsearch_scv_ric_ttdt',                      // SS2
            DDQT_ALL: 'customsearch_scv_ric_ndd',                       // SS3
            DHDCD_ALL: 'customsearch_scv_ric_dhdcd',                    // SS4
            INVESTEE_ALL: 'customsearch_scv_ric_investee',              // SS5
            TTDT_APPROVED: 'customsearch_scv_ric_ttdt_approved',        // SS6
            DDQT_APPROVED: 'customsearch_scv_ric_ndd_approved',         // SS7
            DHDCD_APPROVED: 'customsearch_scv_ric_dhdcd_approved',      // SS8
            INVESTEE_APPROVED: 'customsearch_scv_ric_investee_approved' // SS9
        };

        // Field bộ lọc trên Suitelet (FDD 2.2.1)
        const Field = {
            PROJECT: 'custpage_project',
            TO_DATE: 'custpage_todate',
            IS_SEARCH: 'custpage_is_search'
        };

        const SUBLIST_PENDING = 'custpage_sublist_pending';
        const SUBLIST_REVIEW = 'custpage_sublist_review';

        // Tạm ẩn Result 1 (Danh sách phiếu chờ phê duyệt) - đầu bài không yêu cầu.
        // Đổi lại true để bật lại (giữ nguyên logic, sl/cssl chỉ đang bỏ qua phần render/đọc sublist này).
        const SHOW_PENDING_SUBLIST = false;

        // Cột sublist Result 1: Danh sách phiếu chờ phê duyệt (FDD 2.2.2)
        const PendingColumn = {
            MARK: 'col_mark',
            STT: 'col_stt',
            TYPE: 'col_type',
            DOC_ID: 'col_docid',
            NAME: 'col_name',
            STATUS: 'col_status',
            VIEW: 'col_view',
            REC_ID: 'col_recid',
            REC_TYPE: 'col_rectype',
            STATUS_FIELD: 'col_statusfield'
        };

        // Cột sublist Result: Review thông tin thay đổi - CT1-CT10 (FDD 2.2.2)
        const ReviewColumn = {
            MARK: 'col_mark',
            STT: 'col_stt',
            GROUP: 'col_group',
            CRITERIA: 'col_criteria',
            CURRENT: 'col_current',
            DRAFT: 'col_draft',
            APPROVED: 'col_approved',
            NOTE: 'col_note',
            TARGET_TYPE: 'col_targettype',
            TARGET_ID: 'col_targetid',
            TARGET_FIELD: 'col_targetfield'
        };

        // 4 loại phiếu tổng hợp ở Result 1 (Input FDD mục Overview). Mỗi loại có 1 saved search
        // "all pending" riêng (SS2-SS5) + field project / effective date / status / id / name riêng.
        // "Trạng thái phê duyệt" luôn hiển thị = "Mới" trong danh sách này (FDD: "Luôn = 'Mới' trong danh sách này").
        const PendingType = [
            {
                label: 'Thông tin biến động đầu tư',
                savedSearch: SavedSearch.TTDT_ALL,
                recordType: Record.TTDT,
                projectField: 'custrecord_scv_ttdt_project',
                dateField: 'custrecord_scv_ttdt_effective_date',
                statusField: 'custrecord_scv_ttdt_status',
                colId: 'ID',
                colName: 'name'
            },
            {
                label: 'Người đại diện',
                savedSearch: SavedSearch.DDQT_ALL,
                recordType: Record.DDQT,
                projectField: 'custrecord_scv_ddqt_proj',
                dateField: 'custrecord_scv_ddqt_effective_date',
                statusField: 'custrecord_scv_ddqt_approval_status',
                colId: 'id',
                colName: 'name_cv'
            },
            {
                label: 'Thông tin ĐHĐCĐ',
                savedSearch: SavedSearch.DHDCD_ALL,
                recordType: Record.DHDCD,
                projectField: 'custrecord_scv_dhdcd_proj',
                dateField: 'custrecord_scv_dhdcd_date',
                statusField: 'custrecord_scv_dhdcd_approval_status',
                colId: 'name',
                colName: 'name'
            },
            {
                label: 'Thông tin doanh nghiệp',
                savedSearch: SavedSearch.INVESTEE_ALL,
                recordType: Record.INVESTEE,
                projectField: 'custrecord_scv_invt_proj',
                dateField: 'custrecord_scv_invt_effective_date',
                statusField: 'custrecord_scv_invt_approval_status',
                colId: 'name',
                colName: 'name'
            }
        ];

        // Field Project (customrecord_cseg_inv_portfolio) được cập nhật khi Submit (CT1-CT7)
        const ProjectField = {
            ISSUED_SHARE: 'custrecord_scv_proj_issued_share',
            OUTSTANDING_SHARE: 'custrecord_scv_proj_outstanding_share',
            PAR_VALUE: 'custrecord_scv_proj_par_value',
            VDL: 'custrecord_scv_proj_vdl',
            SO_CP_TCT: 'custrecord_scv_proj_so_cp_tct',
            TLSH: 'custrecord_scv_proj_tlsh',
            TLBQ: 'custrecord_scv_proj_tlbq'
        };

        // Field Người đại diện/quản trị (customrecord_scv_ddqt) được cập nhật khi Submit (CT8-CT10)
        const DdqtField = {
            PROJECT: 'custrecord_scv_ddqt_proj',
            EFFECTIVE_DATE: 'custrecord_scv_ddqt_effective_date',
            SO_CP_NDD: 'custrecord_scv_ddqt_so_cp_dd',
            GT_CP_NDD: 'custrecord_scv_ddqt_gtcp_dd',
            TLV_DD: 'custrecord_scv_ddqt_tlv_dd',
            TLV_NOI_BO: 'custrecord_scv_ddqt_tlv_noi_bo',
            NS: 'custrecord_scv_ddqt_ns' // join tới record của Người đại diện (Employee/Contact)
        };
        const JOIN_DDQT_NS = 'CUSTRECORD_SCV_DDQT_NS';

        // ---------------------------------------------------------------------------------
        // Result 1: Danh sách phiếu chờ phê duyệt (FDD 2.1 / 2.2.2)
        // ---------------------------------------------------------------------------------
        /**
         * @param {string} projectId
         * @param {Date} toDate
         * @returns {Array<Object>}
         */
        const buildPendingList = (projectId, toDate) => {
            let listResult = [];
            let strToDate = formatDateFilter(toDate);
            let stt = 0;

            for (let objType of PendingType) {
                let listData = [];
                let filters = buildProjectDateFilter(objType.projectField, objType.dateField, projectId, strToDate);
                libRep.doSearchSSRangeLabelId(objType.savedSearch, 1000, listData, filters);

                for (let objRow of listData) {
                    stt++;
                    listResult.push({
                        [PendingColumn.MARK]: 'T',
                        [PendingColumn.STT]: stt,
                        [PendingColumn.TYPE]: objType.label,
                        [PendingColumn.DOC_ID]: objRow[objType.colId],
                        [PendingColumn.NAME]: objRow[objType.colName],
                        [PendingColumn.STATUS]: 'Mới',
                        [PendingColumn.VIEW]: buildRecordUrl(objType.recordType, objRow.internalid),
                        [PendingColumn.REC_ID]: objRow.internalid,
                        [PendingColumn.REC_TYPE]: objType.recordType,
                        [PendingColumn.STATUS_FIELD]: objType.statusField
                    });
                }
            }
            return listResult;
        }

        // ---------------------------------------------------------------------------------
        // Result: Review thông tin thay đổi - CT1-CT10 (FDD 2.2.2)
        // ---------------------------------------------------------------------------------
        /**
         * @param {string} projectId
         * @param {Date} toDate
         * @returns {Array<Object>}
         */
        const buildReviewList = (projectId, toDate) => {
            let strToDate = formatDateFilter(toDate);
            let listResult = [];

            // ---- SS1: giá trị hiện tại của Project ----
            let listProject = [];
            libRep.doSearchSSRangeLabelId(SavedSearch.PROJECT, 10, listProject,
                [search.createFilter({name: 'internalid', operator: search.Operator.ANYOF, values: [projectId]})]);
            let objProject = listProject[0] || {};

            // ---- SS5/SS9: investee Dự thảo/Đã phê duyệt - lấy dòng có effective_date gần To Date nhất ----
            let objInvestDraft = pickClosest(
                queryByProjectDate(SavedSearch.INVESTEE_ALL, 'custrecord_scv_invt_proj',
                    'custrecord_scv_invt_effective_date', projectId, strToDate), 'effective_date');
            let objInvestApproved = pickClosest(
                queryByProjectDate(SavedSearch.INVESTEE_APPROVED, 'custrecord_scv_invt_proj',
                    'custrecord_scv_invt_effective_date', projectId, strToDate), 'effective_date');

            // ---- Group "Thông tin doanh nghiệp": CT1-CT4 ----
            listResult.push(buildGroupHeaderRow('Thông tin doanh nghiệp'));
            let stt = 0;
            listResult.push(buildReviewRow(++stt, 'Thông tin doanh nghiệp',
                'Số lượng cổ phiếu đã phát hành của Công ty',
                objProject.issued_share, objInvestDraft && objInvestDraft.issued_share,
                objInvestApproved && objInvestApproved.issued_share,
                '', Record.PROJECT, projectId, ProjectField.ISSUED_SHARE));

            listResult.push(buildReviewRow(++stt, 'Thông tin doanh nghiệp',
                'Số lượng cổ phiếu đang lưu hành của Công ty',
                objProject.outstanding_share, objInvestDraft && objInvestDraft.outstanding_share,
                objInvestApproved && objInvestApproved.outstanding_share,
                '', Record.PROJECT, projectId, ProjectField.OUTSTANDING_SHARE));

            listResult.push(buildReviewRow(++stt, 'Thông tin doanh nghiệp', 'Mệnh giá cổ phần',
                objProject.par_value, objInvestDraft && objInvestDraft.par_value,
                objInvestApproved && objInvestApproved.par_value,
                '', Record.PROJECT, projectId, ProjectField.PAR_VALUE));

            listResult.push(buildReviewRow(++stt, 'Thông tin doanh nghiệp', 'Vốn điều lệ Công ty',
                objProject.von_dieu_le, objInvestDraft && objInvestDraft.von_dieu_le,
                objInvestApproved && objInvestApproved.von_dieu_le,
                '', Record.PROJECT, projectId, ProjectField.VDL));

            // ---- Group "Thông tin biến động đầu tư": CT5-CT7 ----
            let listTtdtDraft = queryByProjectDate(SavedSearch.TTDT_ALL, 'custrecord_scv_ttdt_project',
                'custrecord_scv_ttdt_effective_date', projectId, strToDate);
            let listTtdtApproved = queryByProjectDate(SavedSearch.TTDT_APPROVED, 'custrecord_scv_ttdt_project',
                'custrecord_scv_ttdt_effective_date', projectId, strToDate);
            let soCpTctDraft = sumSignedQuantity(listTtdtDraft);
            let soCpTctApproved = sumSignedQuantity(listTtdtApproved);

            listResult.push(buildGroupHeaderRow('Thông tin biến động đầu tư'));
            stt = 0;
            listResult.push(buildReviewRow(++stt, 'Thông tin biến động đầu tư', 'Số cổ phần TCT nắm giữ',
                objProject.so_cp_tct, soCpTctDraft, soCpTctApproved,
                '', Record.PROJECT, projectId, ProjectField.SO_CP_TCT));

            let issuedDraft = objInvestDraft ? (Number(objInvestDraft.issued_share) || 0) : null;
            let issuedApproved = objInvestApproved ? (Number(objInvestApproved.issued_share) || 0) : null;
            listResult.push(buildReviewRow(++stt, 'Thông tin biến động đầu tư', 'Tỷ lệ sở hữu của TCT (%)',
                (objProject.ty_le_so_huu || '').replace('%', ''), safeDiv(soCpTctDraft, issuedDraft), safeDiv(soCpTctApproved, issuedApproved),
                '', Record.PROJECT, projectId, ProjectField.TLSH));

            let outstandingDraft = objInvestDraft ? (Number(objInvestDraft.outstanding_share) || 0) : null;
            let outstandingApproved = objInvestApproved ? (Number(objInvestApproved.outstanding_share) || 0) : null;
            listResult.push(buildReviewRow(++stt, 'Thông tin biến động đầu tư', 'Tỷ lệ biểu quyết của TCT (%)',
                (objProject.ty_le_bieu_quyet || '').replace('%', ''), safeDiv(soCpTctDraft, outstandingDraft), safeDiv(soCpTctApproved, outstandingApproved),
                '', Record.PROJECT, projectId, ProjectField.TLBQ));

            // ---- Group "Người đại diện": CT8-CT10, lặp theo từng đại diện có phiếu Dự thảo trong kỳ ----
            let listColAddRep = [search.createColumn({name: 'internalid', join: JOIN_DDQT_NS, label: 'ndd_person_id'})];
            let listDdqtDraft = queryByProjectDate(SavedSearch.DDQT_ALL, 'custrecord_scv_ddqt_proj',
                'custrecord_scv_ddqt_effective_date', projectId, strToDate, listColAddRep);
            let listDdqtApproved = queryByProjectDate(SavedSearch.DDQT_APPROVED, 'custrecord_scv_ddqt_proj',
                'custrecord_scv_ddqt_effective_date', projectId, strToDate, listColAddRep);

            let mapDraftByRep = pickLatestByGroup(listDdqtDraft, 'ndd_person_id', 'effective_date');
            let mapApprovedByRep = pickLatestByGroup(listDdqtApproved, 'ndd_person_id', 'effective_date');

            let parValueCurrent = Number(objProject.par_value) || 0;
            let issuedCurrent = Number(objProject.issued_share) || 0;

            listResult.push(buildGroupHeaderRow('Người đại diện'));
            stt = 0;
            for (let repKey of Object.keys(mapDraftByRep)) {
                let objDraft = mapDraftByRep[repKey];
                let objApproved = mapApprovedByRep[repKey];
                let repName = objDraft.name_ndd || (objApproved && objApproved.name_ndd) || '';
                let draftRecordId = objDraft.internalid;

                let soCpNddDraft = Number(objDraft.so_cp_ndd) || 0;
                let soCpNddApproved = objApproved ? (Number(objApproved.so_cp_ndd) || 0) : null;

                listResult.push(buildReviewRow(++stt, 'Người đại diện', 'Giá trị cổ phần đại diện (VNĐ)',
                    objApproved && objApproved.gt_cp_ndd,
                    (soCpNddDraft * parValueCurrent).toFixed(0),
                    soCpNddApproved !== null ? (soCpNddApproved * parValueCurrent).toFixed(0) : null,
                    repName, Record.DDQT, draftRecordId, DdqtField.GT_CP_NDD));

                listResult.push(buildReviewRow(++stt, 'Người đại diện', 'Tỷ lệ % vốn đại diện (Trên Vốn điều lệ Công ty)',
                    objApproved && (objApproved.tlv_vdl || '').replace('%', ''),
                    safeDiv(soCpNddDraft, issuedDraft),
                    soCpNddApproved !== null ? safeDiv(soCpNddApproved, issuedApproved) : null,
                    repName, Record.DDQT, draftRecordId, DdqtField.TLV_DD));

                listResult.push(buildReviewRow(++stt, 'Người đại diện', 'Tỷ lệ % phân chia (Trong nội bộ vốn TCT)',
                    objApproved && (objApproved.tlv_noi_bo || '').replace('%', ''),
                    safeDiv(soCpNddDraft, issuedCurrent),
                    soCpNddApproved !== null ? safeDiv(soCpNddApproved, issuedCurrent) : null,
                    repName, Record.DDQT, draftRecordId, DdqtField.TLV_NOI_BO));
            }

            return listResult;
        }

        const buildReviewRow = (stt, group, criteria, current, draft, approved, note, targetType, targetId, targetField) => {
            let objRow = {
                [ReviewColumn.MARK]: 'T',
                [ReviewColumn.STT]: stt,
                [ReviewColumn.GROUP]: group,
                [ReviewColumn.CRITERIA]: criteria,
                [ReviewColumn.NOTE]: note || '',
                [ReviewColumn.TARGET_TYPE]: targetType,
                [ReviewColumn.TARGET_ID]: targetId || '',
                [ReviewColumn.TARGET_FIELD]: targetField
            };
            if (hasValue(current)) objRow[ReviewColumn.CURRENT] = current;
            if (hasValue(draft)) objRow[ReviewColumn.DRAFT] = draft;
            if (hasValue(approved)) objRow[ReviewColumn.APPROVED] = approved;
            return objRow;
        }

        /**
         * Dòng tiêu đề nhóm chèn trước mỗi Group (cột Chỉ tiêu = tên Group) - chỉ để hiển thị,
         * không có giá trị / record đích nên submitApprove tự bỏ qua (xem isGroupHeaderRow).
         */
        const buildGroupHeaderRow = (group) => {
            return {
                [ReviewColumn.MARK]: 'F',
                [ReviewColumn.STT]: '',
                [ReviewColumn.GROUP]: group,
                [ReviewColumn.CRITERIA]: group,
                [ReviewColumn.NOTE]: '',
                [ReviewColumn.TARGET_TYPE]: '',
                [ReviewColumn.TARGET_ID]: '',
                [ReviewColumn.TARGET_FIELD]: ''
            };
        }

        /**
         * Dòng tiêu đề nhóm: cột Group và Chỉ tiêu bằng nhau (FDD bổ sung - dòng phân cách nhóm,
         * không phải chỉ tiêu thật nên bỏ qua khi lấy dữ liệu Submit / validate).
         */
        const isGroupHeaderRow = (objRow) => {
            let group = objRow[ReviewColumn.GROUP];
            return !!group && group === objRow[ReviewColumn.CRITERIA];
        }

        // ---------------------------------------------------------------------------------
        // Submit: duyệt phiếu (Result 1) + update field theo giá trị Đã phê duyệt (Result) - FDD 2.1
        // ---------------------------------------------------------------------------------
        /**
         * @param {Array<Object>} listPendingSelected - các dòng đã tick ở Result 1
         * @param {Array<Object>} listReviewSelected - các dòng đã tick ở Result
         * @returns {{countApproved: number, countUpdated: number, countError: number}}
         */
        const submitApprove = (listPendingSelected, listReviewSelected) => {
            // Gom theo record đích (recType + recId) -> 1 record chỉ submitFields 1 lần dù có
            // nhiều field cần cập nhật (VD: 1 dòng "Người đại diện" vừa cần set status vừa cần
            // update GT_CP_NDD/TLV_DD/TLV_NOI_BO của cùng 1 record customrecord_scv_ddqt).
            let mapUpdate = {};

            for (let objRow of listPendingSelected) {
                let recId = objRow[PendingColumn.REC_ID];
                let recType = objRow[PendingColumn.REC_TYPE];
                let statusField = objRow[PendingColumn.STATUS_FIELD];
                if (!recId || !recType || !statusField) continue;

                addRecordUpdate(mapUpdate, recType, recId, statusField, ApprovalStatus.APPROVED, true);
            }

            for (let objRow of listReviewSelected) {
                // Dòng tiêu đề nhóm (Group = Chỉ tiêu) không phải chỉ tiêu thật -> bỏ qua
                if (isGroupHeaderRow(objRow)) continue;

                let approvedValue = objRow[ReviewColumn.APPROVED];
                let targetId = objRow[ReviewColumn.TARGET_ID];
                let targetType = objRow[ReviewColumn.TARGET_TYPE];
                let targetField = objRow[ReviewColumn.TARGET_FIELD];
                // Không có "Đã phê duyệt" hoặc không xác định được record đích -> Không update (FDD 2.1)
                if (!hasValue(approvedValue) || !targetId || !targetType || !targetField) continue;

                addRecordUpdate(mapUpdate, targetType, targetId, targetField, approvedValue, false);
            }

            let countApproved = 0, countUpdated = 0, countError = 0;
            for (let key in mapUpdate) {
                let objUpdate = mapUpdate[key];
                try {
                    record.submitFields({
                        type: objUpdate.type,
                        id: objUpdate.id,
                        values: objUpdate.values,
                        options: {enableSourcing: false, ignoreMandatoryFields: true}
                    });
                    countApproved += objUpdate.countApproved;
                    countUpdated += objUpdate.countUpdated;
                } catch (e) {
                    countError += objUpdate.countApproved + objUpdate.countUpdated;
                    log.error('submitApprove - update record', {key: key, values: objUpdate.values, error: e});
                }
            }

            return {countApproved, countUpdated, countError};
        }

        /**
         * Gộp 1 field cần update vào record đích (theo key recType + recId) trong mapUpdate.
         * isPending = true -> tính vào countApproved (duyệt phiếu), false -> tính vào countUpdated (cập nhật chỉ tiêu).
         */
        const addRecordUpdate = (mapUpdate, recType, recId, fieldId, value, isPending) => {
            let key = recType + '|' + recId;
            let objUpdate = mapUpdate[key];
            if (!objUpdate) {
                objUpdate = {type: recType, id: recId, values: {}, countApproved: 0, countUpdated: 0};
                mapUpdate[key] = objUpdate;
            }
            objUpdate.values[fieldId] = value;
            if (isPending) {
                objUpdate.countApproved++;
            } else {
                objUpdate.countUpdated++;
            }
        }

        // ---------------------------------------------------------------------------------
        // Query - dùng chung libRep.doSearchSSRangeLabelId (keys theo Label của cột saved search)
        // ---------------------------------------------------------------------------------
        const buildProjectDateFilter = (projectField, dateField, projectId, strToDate) => {
            return [
                search.createFilter({name: projectField, operator: search.Operator.ANYOF, values: [projectId]}),
                search.createFilter({name: dateField, operator: search.Operator.ONORBEFORE, values: strToDate})
            ];
        }

        const queryByProjectDate = (savedSearchId, projectField, dateField, projectId, strToDate, listColAdd) => {
            let listData = [];
            let filters = buildProjectDateFilter(projectField, dateField, projectId, strToDate);
            libRep.doSearchSSRangeLabelId(savedSearchId, 1000, listData, filters, listColAdd);
            return listData;
        }

        /**
         * Lấy dòng có effective_date gần To Date nhất trong danh sách (đã lọc <= To Date từ trước).
         */
        const pickClosest = (listRows, dateKey) => {
            let picked = null, pickedMs = -Infinity;
            for (let objRow of listRows) {
                let objDate = toDate(objRow[dateKey]);
                let ms = objDate ? objDate.getTime() : -Infinity;
                if (ms > pickedMs) {
                    picked = objRow;
                    pickedMs = ms;
                }
            }
            return picked;
        }

        /**
         * Gom nhóm theo groupKey, mỗi nhóm giữ lại dòng có effective_date gần nhất (mới nhất).
         */
        const pickLatestByGroup = (listRows, groupKey, dateKey) => {
            let mapResult = {}, mapMs = {};
            for (let objRow of listRows) {
                let key = objRow[groupKey] || ('_' + (objRow.name_ndd || ''));
                if (!key) continue;
                let objDate = toDate(objRow[dateKey]);
                let ms = objDate ? objDate.getTime() : 0;
                if (mapResult[key] === undefined || ms > mapMs[key]) {
                    mapResult[key] = objRow;
                    mapMs[key] = ms;
                }
            }
            return mapResult;
        }

        /**
         * Tổng lũy kế {quantity}, đối chiếu {increase_decrease}: Tăng => (+), Giảm => (-) (FDD CT5).
         */
        const sumSignedQuantity = (listRows) => {
            let sum = 0;
            for (let objRow of listRows) {
                let qty = Number(objRow.quantity) || 0;
                let sign = (objRow.increase_decrease_display === 'Giảm') ? -1 : 1;
                sum += qty * sign;
            }
            return sum;
        }

        /**
         * numerator / denominator, trả null nếu denominator = 0/NULL hoặc numerator chưa xác định
         * (FDD: "Nếu ... = 0 hoặc NULL => Không thực hiện tính").
         */
        const safeDiv = (numerator, denominator) => {
            if (!hasValue(numerator)) return null;
            let denom = denominator || 0;
            if (!denom) return null;
            return (((numerator || 0) / denom) * 100 ).toFixed(2);
        }

        const buildRecordUrl = (recordType, recordId) => {
            if (!recordId) return '';
            try {
                return url.resolveRecord({recordType: recordType, recordId: recordId});
            } catch (e) {
                log.error('buildRecordUrl error', {recordType, recordId, error: e});
                return '';
            }
        }

        // ---------------------------------------------------------------------------------
        // Utils
        // ---------------------------------------------------------------------------------
        const hasValue = (value) => value !== null && value !== undefined && value !== '';

        const toDate = (value) => {
            if (!value) return null;
            if (value instanceof Date) return value;
            try {
                return format.parse({value: value, type: format.Type.DATE});
            } catch (e) {
                return null;
            }
        }

        const formatDateFilter = (date) => {
            return format.format({value: date, type: format.Type.DATE});
        }

        return {
            Record,
            ApprovalStatus,
            SavedSearch,
            Field,
            SUBLIST_PENDING,
            SUBLIST_REVIEW,
            SHOW_PENDING_SUBLIST,
            PendingColumn,
            ReviewColumn,
            PendingType,
            ProjectField,
            DdqtField,
            buildPendingList,
            buildReviewList,
            submitApprove,
            isGroupHeaderRow,
            toDate,
            hasValue
        }

    });
