/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/format', 'N/search', 'N/ui/serverWidget', '../common/scv_common_itg_vietstock.js', '../lib/scv_lib_report.js'],

    (format, search, serverWidget, vietStock, libRep) => {

        const RecordType = {
            PROJECT: 'customrecord_cseg_inv_portfolio'
        };

        const FormField = {
            PROJECT: 'custpage_scv_project',
            PROJECT_ID: 'custpage_scv_projectid',
            STOCK_CODE: 'custpage_scv_stockcode',
            STOCK_CODE_HD: 'custpage_scv_stockcode_hd',
            FROM_DATE: 'custpage_scv_fromdate',
            TO_DATE: 'custpage_scv_todate',
            REPORT_TYPE: 'custpage_scv_reporttype',
            TERM_TYPE: 'custpage_scv_termtype'
        };

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            let request = scriptContext.request;
            let params = request.parameters;

            if (request.method === 'GET') {
                scriptContext.response.writePage(createForm(params));
            } else {
                scriptContext.response.writePage(handleSubmit(params));
            }
        }

        /**
         * Màn hình nhập tham số đồng bộ: Project (disable, mặc định theo project đang xem), Từ ngày - Đến ngày,
         * Loại báo cáo (CSTC, BCTC, KQKD, LCTT, BCTT, CDKT) và TermType (N, Q).
         * @param {Object} params - {projectId, stockCode} truyền từ button trên màn Project
         */
        const createForm = (params) => {
            let form = serverWidget.createForm({title: 'Đồng bộ dữ liệu Vietstock'});
            form.clientScriptModulePath = '../cssl/scv_cs_sl_itg_vietstock_form.js';

            let group = {id: 'custpage_scv_grp_main', label: 'Thông tin đồng bộ'};
            form.addFieldGroup(group);

            // Project để hiển thị - disable nên không được post lên, giá trị thật đi kèm ở field ẩn bên dưới
            let fieldProject = form.addField({
                id: FormField.PROJECT,
                type: serverWidget.FieldType.SELECT,
                label: 'Project',
                source: RecordType.PROJECT,
                container: group.id
            });
            fieldProject.defaultValue = params.projectId;
            fieldProject.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});

            let stockCode = params.stockCode || getStockCodeByProject(params.projectId);
            let fieldStockCode = form.addField({
                id: FormField.STOCK_CODE,
                type: serverWidget.FieldType.TEXT,
                label: 'Stock Code',
                container: group.id
            });
            fieldStockCode.defaultValue = stockCode;
            fieldStockCode.updateDisplayType({displayType: serverWidget.FieldDisplayType.DISABLED});

            // Mặc định lấy trọn năm hiện tại: 01/01 - 31/12
            let currentYear = new Date().getFullYear();

            let fieldFromDate = form.addField({
                id: FormField.FROM_DATE,
                type: serverWidget.FieldType.DATE,
                label: 'Từ ngày',
                container: group.id
            }).updateLayoutType({layoutType: serverWidget.FieldLayoutType.STARTROW});
            fieldFromDate.isMandatory = true;
            fieldFromDate.defaultValue = formatDateDisplay(new Date(currentYear, 0, 1));

            let fieldToDate = form.addField({
                id: FormField.TO_DATE,
                type: serverWidget.FieldType.DATE,
                label: 'Đến ngày',
                container: group.id
            }).updateLayoutType({layoutType: serverWidget.FieldLayoutType.ENDROW});
            fieldToDate.isMandatory = true;
            fieldToDate.defaultValue = formatDateDisplay(new Date(currentYear, 11, 31));

            let fieldReportType = form.addField({
                id: FormField.REPORT_TYPE,
                type: serverWidget.FieldType.SELECT,
                label: 'Loại báo cáo',
                container: group.id
            });
            fieldReportType.isMandatory = true;
            libRep.addSelectType(fieldReportType, vietStock.FinanceInfoType.CSTC, buildSelectOptions(vietStock.FinanceInfoType, vietStock.FinanceInfoTypeText), true);

            let fieldTermType = form.addField({
                id: FormField.TERM_TYPE,
                type: serverWidget.FieldType.SELECT,
                label: 'Term Type',
                container: group.id
            });
            fieldTermType.isMandatory = true;
            libRep.addSelectType(fieldTermType, vietStock.TermType.N, buildSelectOptions(vietStock.TermType, vietStock.TermTypeText), true);

            form.addSubmitButton({label: 'Đồng bộ'});
            form.addButton({
                id: 'custpage_scv_bt_cancel',
                label: 'Đóng',
                functionName: 'closePopupSuitelet()'
            });

            return form;
        }

        /**
         * Convert Date sang chuỗi theo định dạng ngày của user để set defaultValue cho field DATE.
         * @param {Date} date
         * @returns {string}
         */
        const formatDateDisplay = (date) => {
            return format.format({value: date, type: format.Type.DATE});
        }

        /**
         * Ghép 2 map hằng số ở scv_common_itg_vietstock.js thành list option [{value, text}] cho addSelectType.
         * @param {Object} mapValue - VD: FinanceInfoType {CSTC: 'CSTC', ...}
         * @param {Object} mapText - VD: FinanceInfoTypeText {CSTC: 'CSTC - Chỉ số tài chính', ...}
         * @returns {Array<Object>} [{value, text}]
         */
        const buildSelectOptions = (mapValue, mapText) => {
            return Object.keys(mapValue).map(key => ({value: mapValue[key], text: mapText[key] || mapValue[key]}));
        }

        /**
         * Lấy Stock Code của Project khi button không truyền sang.
         */
        const getStockCodeByProject = (projectId) => {
            if (!projectId) return '';
            let fieldOfProject = search.lookupFields({
                type: RecordType.PROJECT,
                id: projectId,
                columns: ['custrecord_scv_proj_stockcode']
            });
            return fieldOfProject.custrecord_scv_proj_stockcode || '';
        }

        /**
         * Field DATE post lên theo định dạng ngày của user (VD: 5/8/2026), convert sang yyyy-MM-dd để truyền cho API.
         * @param {string} dateText
         * @returns {string} chuỗi yyyy-MM-dd, rỗng nếu không nhập hoặc không parse được
         */
        const formatDateParam = (dateText) => {
            if (!dateText) return '';
            try {
                let date = format.parse({value: dateText, type: format.Type.DATE});
                let month = String(date.getMonth() + 1).padStart(2, '0');
                let day = String(date.getDate()).padStart(2, '0');
                return `${date.getFullYear()}-${month}-${day}`;
            } catch (e) {
                log.error('formatDateParam error ' + dateText, e);
                return '';
            }
        }

        /**
         * Xử lý submit: gọi đồng bộ theo Loại báo cáo đã chọn rồi trả về màn hình kết quả.
         */
        const handleSubmit = (params) => {
            let projectId = params[FormField.PROJECT_ID];
            let stockCode = params[FormField.STOCK_CODE_HD];
            let reportType = params[FormField.REPORT_TYPE];
            let options = {
                termType: params[FormField.TERM_TYPE],
                fromDate: formatDateParam(params[FormField.FROM_DATE]),
                toDate: formatDateParam(params[FormField.TO_DATE])
            };

            let message;
            try {
                let config = vietStock.getVietstockConfigByQuery();
                if (!config) throw new Error('Chưa cấu hình Vietstock Config (customrecord_scv_itg_vietstock_config).');

                if (reportType === vietStock.FinanceInfoType.CSTC) {
                    let {ids, errors, remaining, mrTaskId} = vietStock.syncFinancialInfo(config.baseurl, {}, stockCode, projectId, options);
                    message = `Đã đồng bộ ${ids.length} dòng Đánh giá khoản đầu tư cho mã ${stockCode}.`;
                    if (remaining > 0) {
                        message += mrTaskId
                            ? ` Còn ${remaining} dòng đang được xử lý nền bằng Map/Reduce (task ${mrTaskId}).`
                            : ` Còn ${remaining} dòng chưa xử lý được do không submit được Map/Reduce.`;
                    }
                    if (errors.length > 0) {
                        message += ` Có ${errors.length} dòng lỗi, xem chi tiết ở Script Execution Log.`;
                    }
                } else {
                    // Các loại báo cáo còn lại thuộc mục 1.3 (Statistical Journal) - chưa triển khai
                    message = `Loại báo cáo ${reportType} chưa được triển khai đồng bộ.`;
                }
            } catch (e) {
                log.error('handleSubmit error', e);
                message = `Đồng bộ thất bại: ${e.message || e}`;
            }

            return createResultForm(message);
        }

        const createResultForm = (message) => {
            let form = serverWidget.createForm({title: 'Đồng bộ dữ liệu Vietstock'});
            form.addField({
                id: 'custpage_scv_result',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Kết quả'
            }).defaultValue = `<div style="padding:12px;font-size:13px;">${message}</div>`;

            form.addButton({
                id: 'custpage_scv_bt_close',
                label: 'Đóng',
                functionName: 'closePopup(true);'
            });

            return form;
        }

        return {onRequest}

    });