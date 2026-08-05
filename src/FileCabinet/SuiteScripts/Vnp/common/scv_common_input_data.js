/**
 * @NApiVersion 2.1
 */
define([],

    () => {

        const ReportType = {
            BAO_CAO_LUU_CHUYEN_TIEN_TE_TRUC_TIEP: 'bc_1',
            BAO_CAO_LUU_CHUYEN_TIEN_TE_GIAN_TIEP: 'bc_2',
            BS_REPORT: 'bc_3',
            PL_REPORT: 'bc_4',
            BANG_THUYET_MINH_BAO_CAO_TAI_CHINH: 'bc_5',
            BANG_THUYET_MINH_BAO_CAO_TAI_CHINH_WORD: 'bc_6'
        };

        const Subsidiary = {
            VINAPHARM: '2'
        }

        const PeriodType = {
            CURRENT: '1',
            PREVIOUS: '2',
        }

        // Tiền tố ghép trước Mã số để tạo account text
        const AccountPrefix = {
            BAO_CAO_LUU_CHUYEN_TIEN_TE_TRUC_TIEP: 'LCTT TT',
            BAO_CAO_LUU_CHUYEN_TIEN_TE_GIAN_TIEP: 'LCTT GT',
            PL_REPORT: 'PL',
            BS_REPORT: 'BS',
            BANG_THUYET_MINH_BAO_CAO_TAI_CHINH: 'TM BCTC',
            BANG_THUYET_MINH_BAO_CAO_TAI_CHINH_WORD: 'TM BCTC',
        }

        const ReportList = {
            BAO_CAO_LUU_CHUYEN_TIEN_TE_GIAN_TIEP: '3',
            BS_REPORT: '5',
            PL_REPORT: '6',
            BAO_CAO_LUU_CHUYEN_TIEN_TE_TRUC_TIEP: '7',
            BANG_THUYET_MINH_BAO_CAO_TAI_CHINH: '8',
            BANG_THUYET_MINH_BAO_CAO_TAI_CHINH_WORD: '8'
        }

        // Map value của ReportType -> value của ReportList, ghép theo tên thuộc tính trùng nhau
        const ReportTypeToReportList = Object.keys(ReportType).reduce((map, key) => {
            if (key in ReportList) {
                map[ReportType[key]] = ReportList[key];
            }
            return map;
        }, {});

        const RecordType = {
            STATISTICAL_JOURNALENTRY: 'statisticaljournalentry'
        }

        const Sublist = {
            LINE: 'line'
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

        return {
            ReportType,
            Subsidiary,
            PeriodType,
            AccountPrefix,
            ReportList,
            ReportTypeToReportList,
            RecordType,
            Sublist,
            FileKind
        }

    });
