/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  17 Aug 2026         Thanh Hoan              Init, create file.
 */
define(['N/format', 'N/record', 'N/url',
    '../lib/scv_lib_function.js',
], (format, record, url,
    lbf,
) => {
    

    const getColumnsResult = () => {
        let columns = [
            {
                dataField: "subsidiary_display",
                caption: "Subsidiary",
                dataType: "string",
                width: 200,
                allowEditing: false,
            },
            {
                dataField: "entity_display",
                caption: "Entity",
                dataType: "string",
                width: 250,
                allowEditing: false,
            },
            {
                dataField: "location_display",
                caption: "Location",
                dataType: "string",
                width: 200,
                allowEditing: false,
            },
            {
                dataField: "startdate",
                caption: "Start Date",
                dataType: "string",
                width: 150,
                allowEditing: false,
            },
            {
                dataField: "enddate",
                caption: "End Date",
                dataType: "string",
                width: 150,
                allowEditing: false,
            },
            {
                dataField: "accountdebit_display",
                caption: "Account Debit",
                dataType: "string",
                width: 350,
                allowEditing: false,
            },
            {
                dataField: "accountcredit_display",
                caption: "Account Credit",
                dataType: "string",
                width: 350,
                allowEditing: false,
            },
            {
                dataField: "amount",
                caption: "Amount",
                dataType: "number",
                format: "#,##0.####",
                width: 180,
                allowEditing: false,
            },
            {
                dataField: "allocationtype_display",
                caption: "Allocation Type",
                dataType: "string",
                width: 150,
                allowEditing: false,
            },
            {
                dataField: "memo",
                caption: "Memo",
                dataType: "string",
                width: 300,
                allowEditing: false,
            },
            {
                dataField: "salescontract_display",
                caption: "Sales Contract",
                dataType: "string",
                width: 200,
                allowEditing: false,
            },
            {
                dataField: "debitagreement_display",
                caption: "Debit Agreement",
                dataType: "string",
                width: 200,
                allowEditing: false,
            },
            {
                dataField: "allocationperiod",
                caption: "Allocation Period",
                dataType: "number",
                format: "#,##0.####",
                width: 180,
                allowEditing: false,
            },
            {
                dataField: "allocationamt",
                caption: "Allocation Amount",
                dataType: "number",
                format: "#,##0.####",
                width: 200,
                allowEditing: false,
            },
        ];

        return columns;
    };

    return {
        getColumnsResult,
    };
});
