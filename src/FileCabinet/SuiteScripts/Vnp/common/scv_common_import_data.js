/**
 * @NApiVersion 2.1
 */
define(['N/record'],

    (record) => {

        const Subsidiary = {
            VINAPHARM: '2'
        }

        const RecordType = {
            PAYROLL: 'custompurchase_scv_payroll',
            IMPORT_DATA_PROCESS: 'customrecord_scv_import_data_process'
        }

        const Sublist = {
            ITEM: 'item',
            LINE: 'line'
        }

        // Field của record hàng đợi customrecord_scv_import_data_process
        const ImportDataProcessField = {
            NAME: 'name',
            DATA: 'custrecord_scv_impdp_data',          // Long text: JSON {fields, lines}
            RECORD_TYPE: 'custrecord_scv_impdp_rectype',
            SUBLIST: 'custrecord_scv_impdp_sublist',
            RECORD_ID: 'custrecord_scv_impdp_recid',
            MESSAGE: 'custrecord_scv_impdp_message'
        }

        // Map/Reduce xử lý hàng đợi import
        const MapReduce = {
            ImportDataProcess: {
                SCRIPT_ID: 'customscript_scv_mr_import_data',
                DEPLOY_ID: 'customdeploy_scv_mr_import_data',
                DEPLOY_ID_HTTL: 'customdeploy_scv_mr_import_data_db_httl',
                PARAM: 'custscript_scv_mr_import_data_param'
            }
        }

        // Loại file đã bóc tách được ở màn hình đọc file (S.kind)
        const FileKind = {
            WORD: 'word',           // .doc / .docx  (mammoth)
            XLSX: 'xlsx',           // .xls / .xlsx  (SheetJS)
            PDF_TEXT: 'pdf-text',   // .pdf có sẵn text layer
            PDF_OCR: 'pdf-ocr',     // .pdf scan → OCR (tesseract)
            XML: 'xml',             // .xml thường
            WORD_XML: 'wordxml'     // .xml dạng WordprocessingML
        }

        /**
         * Cập nhật kèm theo sau khi tạo record thành công (option, object nào không khai báo thì bỏ qua).
         * Là phần {updates} của object hàng đợi {fields, lines, updates}, được dùng ở cả nơi tạo record
         * ngay tại Suitelet lẫn Map/Reduce xử lý phần còn lại, để 2 nơi cập nhật giống nhau.
         * Vd: Suitelet Create JRL Interest set {custrecord_scv_db_status} = 2 cho Payment Schedule
         * của những dòng đã sinh bút toán lãi.
         * @param {Array<{type: string, id: string, values: Object}>} listUpdate
         */
        const applyUpdate = (listUpdate) => {
            util.each(listUpdate || [], function (objUpdate) {
                try {
                    record.submitFields({
                        type: objUpdate.type,
                        id: objUpdate.id,
                        values: objUpdate.values,
                        options: {enableSourcing: false, ignoreMandatoryFields: true}
                    });
                } catch (e) {
                    log.error('Error: applyUpdate', {objUpdate: objUpdate, e: e});
                }
            });
        }

        return {
            Subsidiary,
            RecordType,
            Sublist,
            ImportDataProcessField,
            MapReduce,
            FileKind,
            applyUpdate
        }

    });
