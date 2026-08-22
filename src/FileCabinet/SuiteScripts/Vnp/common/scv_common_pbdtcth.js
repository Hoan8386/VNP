/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  17 Aug 2026         Thanh Hoan              Init, create file.
 */
define(['N/format', 'N/record', 'N/url','N/search', 'N/ui/message',
    '../lib/scv_lib_function.js',

    '../olib/alasql/alasql.min@4.6.6.js',

    '../cons/scv_cons_format.js',
    '../cons/scv_cons_search.js',

    '../cons/scv_cons_currency.js',

    '../cons/scv_cons_search_pbdtcth.js',

], (format, record, url,search,message,
    lbf,

    alasql,

    constFormat,
    constSearch,

    constCurrency,

    constSearchPbdtcth,
) => {
    const getListSavedSearchId = () =>{
        return [
            constSearchPbdtcth.ID
        ]
    }

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

    const getDataSource = (params) =>{
        const arrResult = constSearchPbdtcth.getDataSource(params);

        return arrResult;
    }

    const getDataSourceCreate = (params) => {
        let periodId = getPostingPeriod(params.custpage_date);

        let arrResRaw = getDataSource(params);

        let arrResult = alasql(`SELECT DISTINCT salescontract, debitagreement FROM ?`, [arrResRaw]);

        arrResult.forEach(objRes => {
            objRes.lines = arrResRaw.filter(e => e.salescontract == objRes.salescontract
                && e.debitagreement == objRes.debitagreement
            );

            objRes.subsidiary = objRes.lines[0].subsidiary;
            objRes.memo = objRes.lines[0].memo;
            objRes.period = periodId;
            objRes.action = "create";
        });

        return arrResult;
    }

    const getDataSourceDelete = (params) => {
        let period = getPostingPeriod(params.custpage_date);

        let resultSearch = constSearch.createSearchWithFilter({
            type: search.Type.JOURNAL_ENTRY,
            filters: [
                ['mainline', 'is', 'T'],
                'and', ['subsidiary', 'anyof', params.custpage_subsidiary],
                'and', ['custbody_scv_allow_sys_process', 'is', 'T'],
                'and', ['postingperiod', 'anyof', period]
            ],
            columns: [
				{
                    name: "internalid",
                    summary: "GROUP"
                }
			]
        });
        
        resultSearch = resultSearch.runPaged({pageSize: 1000});

        let arrResult = constSearch.fetchResultSearchAllPage(resultSearch, function(_objSearch, _column){
            let objRes = constSearch.getObjResultFromSearchByKey(_objSearch, _column, [
                "internalid"
            ]);

            objRes.action = "delete";
			
            return objRes;
        });

        return arrResult;
    }

    const deleteJournalOld = (params, resultJournal) =>{
        if(!resultJournal.internalid) return;

        try{
            record.delete({type: record.Type.JOURNAL_ENTRY, id: resultJournal.internalid});
        }
        catch(err){
            log.error("Error: try.catch.deleteJournalOld", err);
        }
    }

    const createJournal = (params, resultJournal) =>{
        let journalRec = record.create({
            type: record.Type.JOURNAL_ENTRY,
            isDynamic: true
        });

        journalRec.setValue({ fieldId: 'subsidiary', value: resultJournal.subsidiary  });
        journalRec.setValue({ fieldId: 'trandate', value: constFormat.parseDate(params.custpage_date) });
        journalRec.setValue({ fieldId: 'memo', value: resultJournal.memo });
        journalRec.setValue({ fieldId: 'currency', value: constCurrency.RECORDS.VND.ID }); 
        journalRec.setValue({ fieldId: 'exchangerate', value: 1 });
        journalRec.setValue({ fieldId: 'custbody_scv_lms_allow_sys_process', value: true });
        journalRec.setValue({ fieldId: 'custbody_scv_sales_contract', value: resultJournal.salescontract });
        journalRec.setValue({ fieldId: 'custbody_scv_loa', value: resultJournal.debitagreement });

        resultJournal.lines.forEach((lineItem) => {
            let allocatedAmt = calculateAmount(lineItem, params.custpage_date, resultJournal.period);
            if (allocatedAmt <= 0) return;

            let lineMemo = lineItem.memo || resultJournal.memo; // default memo của header 
            let locationId = lineItem.location || lineItem.location_display;

            // dòng 1 debit
            journalRec.selectNewLine({ sublistId: 'line' });
            journalRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: lineItem.accountdebit });
            journalRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: allocatedAmt });
            if (lineMemo) journalRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: lineMemo });
            if (locationId) journalRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: locationId });
            journalRec.commitLine({ sublistId: 'line' });

            // dòng 2 credit
            journalRec.selectNewLine({ sublistId: 'line' });
            journalRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: lineItem.accountcredit });
            journalRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: allocatedAmt });
            if (lineMemo) journalRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: lineMemo });
            if (locationId) journalRec.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: locationId });
            journalRec.commitLine({ sublistId: 'line' });

        });

        let journalRecId = journalRec.save({enableSourcing: false, ignoreMandatoryFields: true});

        return journalRecId;
    }
  
    const calculateAmount = (row, suiteletDate, periodId) => {
        let allocType = row.allocationtype ;

        let allocAmt = row.allocationamt * 1;

        if ( allocType === '2' ) {//Tháng
            return allocAmt;
        }

        // TH2: Phân bổ theo Ngày
        if (allocType === '1') {//Ngày

            let periodStartDate = getPostingPeriod(row.startdate);
            let periodEndDate = getPostingPeriod(row.enddate);

            let periodRecord = search.lookupFields({
                type: search.Type.ACCOUNTING_PERIOD,
                id: periodId,
                columns: ['startdate', 'enddate']
            });

            let periodStart = periodRecord.startdate;
            let periodEnd = periodRecord.enddate;

            let numberOfDays = 0;

            // Kỳ Suitelet = Kỳ StartDate
            if (periodId == periodStartDate) {
                numberOfDays = constFormat.calcNumberDays(suiteletDate, row.startdate) + 1;

            // Kỳ Suitelet = Kỳ EndDate
            } else if (periodId == periodEndDate) {
                numberOfDays = constFormat.calcNumberDays(row.enddate, periodStart) + 1;

            // Kỳ Suitelet nằm giữa StartDate và EndDate
            } else {
                numberOfDays = constFormat.calcNumberDays(periodEnd, periodStart) + 1;
            }

            // B2: AllocationAmt × số ngày
            return allocAmt * numberOfDays;
        }

        return allocAmt
    };


    const getPostingPeriod = (datetext) => {
        let searchPeriod = search.create({
            type: search.Type.ACCOUNTING_PERIOD,
            filters: [['isquarter', 'is', false], 'and', ['isyear', 'is', false], 'and', ['isadjust', 'is', false]
                , 'and', ['closed', 'is', false], 'and', ['startdate', 'onorbefore', datetext], 'and',
                ['enddate', 'onorafter', datetext]],
            columns: ['internalid', 'periodname', 'enddate']
        });

        let resultsPeriod = searchPeriod.run().getRange({start: 0, end: 1000});
        let period = '';
        if (resultsPeriod.length > 0) {
            period = resultsPeriod[0].getValue('internalid');
        }
        return period;
    }
    return {
        getListSavedSearchId,
        getColumnsResult,
        getDataSource,
        getDataSourceCreate,
        getDataSourceDelete,

        createJournal,
        deleteJournalOld,

        getPostingPeriod
    };
});
