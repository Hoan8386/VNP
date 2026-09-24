/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  10 Sep 2026         Khanh Tran              Init & create file. Chức năng đối chiếu dữ liệu hóa đơn from ms. Tâm(https://app.clickup.com/t/3773072/14yhnhmfdfv)
 */
/**
 * @NApiVersion 2.1
 */
define([], () => {
    const getColumnsResult = () => {
        let columns = [
            { dataField: 'custpage_col_stt', caption: 'STT', dataType: 'number', width: 70, allowEditing: false, },
            { dataField: 'custpage_col_docno', caption: 'Doc No', dataType: 'string', width: 180, allowEditing: false, },
            { dataField: 'custpage_col_invoicepattern', caption: 'Invoice Pattern', dataType: 'string', width: 150, allowEditing: false, },
            { dataField: 'custpage_col_invoiceserial', caption: 'Invoice Serial', dataType: 'string', width: 150, allowEditing: false, },
            { dataField: 'custpage_col_invoicenumber', caption: 'Invoice Number', dataType: 'string', width: 150, allowEditing: false, },
            { dataField: 'custpage_col_invoicedate', caption: 'Invoice Date', dataType: 'string', width: 140, allowEditing: false, },
            { dataField: 'custpage_col_invoiceentitytax', caption: 'Invoice Entity Tax', dataType: 'string', width: 180, allowEditing: false, },
            { dataField: 'custpage_col_invoiceentityname', caption: 'Invoice Entity Name', dataType: 'string', width: 250, allowEditing: false, },
            { dataField: 'custpage_col_invoiceentityaddress', caption: 'Invoice Entity Address', dataType: 'string', width: 300, allowEditing: false, },
            { dataField: 'custpage_col_amount', caption: 'Amount', dataType: 'number', format: "#,##0.####", width: 180, allowEditing: false, },
            { dataField: 'custpage_col_taxamount', caption: 'Tax Amount', dataType: 'number', format: "#,##0.####", width: 180, allowEditing: false, },
            { dataField: 'custpage_col_grossamount', caption: 'Gross Amount', dataType: 'number', format: "#,##0.####", width: 180, allowEditing: false, },
        ];

        return columns;
    };

    const getDataResult = (params, dataInput) => {
        let { arrSS01 = [], arrSS02 = [] } = dataInput;
        let sttReconcile = 0;
        let objResult = {
            arrNetsuite: [],
            arrImportSmt: [],
            arrReconcile: [],
        };
        arrSS01.forEach((objSS01, i) => {
            let objRes = {};

            objRes.custpage_col_stt = i + 1;
            objRes.custpage_col_docno = objSS01.docno;
            objRes.custpage_col_invoicepattern = objSS01.invoice_pattern;
            objRes.custpage_col_invoiceserial = objSS01.invoice_serial;
            objRes.custpage_col_invoicenumber = objSS01.invoice_number;
            objRes.custpage_col_invoicedate = objSS01.invoice_date;
            objRes.custpage_col_invoiceentitytax = objSS01.invoice_entity_tax;
            objRes.custpage_col_invoiceentityname = objSS01.invoice_entity_name;
            objRes.custpage_col_invoiceentityaddress = objSS01.invoice_entity_address;
            objRes.custpage_col_amount = objSS01.amount * 1;
            objRes.custpage_col_taxamount = objSS01.tax_amount * 1;
            objRes.custpage_col_grossamount = objSS01.gross_amount * 1;

            objResult.arrNetsuite.push(objRes);

            let objMatched = arrSS02.find(objSS02 =>
                objSS01.invoice_pattern === objSS02.invoice_pattern
                && objSS01.invoice_serial === objSS02.invoice_serial
                && objSS01.invoice_date === objSS02.invoice_date
                && objSS01.invoice_number === objSS02.invoice_number
                && objSS01.invoice_entity_tax === objSS02.invoice_entity_tax
                && objSS01.amount * 1 === objSS02.amount * 1
                && objSS01.tax_amount * 1 === objSS02.tax_amount * 1
                && objSS01.gross_amount * 1 === objSS02.gross_amount * 1
            );

            if (!objMatched) {
                objResult.arrReconcile.push({...objRes, custpage_col_stt: ++sttReconcile});
            }
        });

        arrSS02.forEach((objSS02, i) => {
            let objRes = {};

            objRes.custpage_col_stt = i + 1;
            objRes.custpage_col_docno = objSS02.docno;
            objRes.custpage_col_invoicepattern = objSS02.invoice_pattern;
            objRes.custpage_col_invoiceserial = objSS02.invoice_serial;
            objRes.custpage_col_invoicenumber = objSS02.invoice_number;
            objRes.custpage_col_invoicedate = objSS02.invoice_date;
            objRes.custpage_col_invoiceentitytax = objSS02.invoice_entity_tax;
            objRes.custpage_col_invoiceentityname = objSS02.invoice_entity_name;
            objRes.custpage_col_invoiceentityaddress = objSS02.invoice_entity_address;
            objRes.custpage_col_amount = objSS02.amount * 1;
            objRes.custpage_col_taxamount = objSS02.tax_amount * 1;
            objRes.custpage_col_grossamount = objSS02.gross_amount * 1;

            objResult.arrImportSmt.push(objRes);

            let objMatched = arrSS01.find(objSS01 =>
                objSS02.invoice_pattern === objSS01.invoice_pattern
                && objSS02.invoice_serial === objSS01.invoice_serial
                && objSS02.invoice_date === objSS01.invoice_date
                && objSS02.invoice_number === objSS01.invoice_number
                && objSS02.invoice_entity_tax === objSS01.invoice_entity_tax
                && objSS02.amount * 1 === objSS01.amount * 1
                && objSS02.tax_amount * 1 === objSS01.tax_amount * 1
                && objSS02.gross_amount * 1 === objSS01.gross_amount * 1
            );

            if (!objMatched) {
                objResult.arrReconcile.push({...objRes, custpage_col_stt: ++sttReconcile});
            }
            
        });

        return objResult;
    };

    return {
        getColumnsResult,
        getDataResult,
    };
});
