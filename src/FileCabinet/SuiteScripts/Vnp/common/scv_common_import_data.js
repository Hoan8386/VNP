/**
 * @NApiVersion 2.1
 */
define([],

    () => {

        const Subsidiary = {
            VINAPHARM: '2'
        }

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
            Subsidiary,
            RecordType,
            Sublist,
            FileKind
        }

    });
