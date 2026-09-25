/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  17 Aug 2026         Thanh Hoan              Init, create file. Chức năng phân bổ doanh thu chưa thực hiên from ms. Tâm(https://app.clickup.com/t/3773072/86d40yedc)
 */
define([ 'N/record','N/search', 'N/file',

    '../olib/alasql/alasql.min@4.6.6.js',

    '../cons/scv_cons_format.js',
    '../cons/scv_cons_search.js',

    '../cons/scv_cons_currency.js',

    '../cons/scv_cons_search_pbdtcth.js',
    '../cons/scv_cons_search_pbdtcth_02.js',
    
], ( record,search,file,

    alasql,

    constFormat,
    constSearch,

    constCurrency,

    constSearchPbdtcth,
    constSearchPbdtcth02,
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
        let arrResult = constSearchPbdtcth.getDataSource(params);
        let SLDate = constFormat.parseDate(params.custpage_date);

        let SLMonth = SLDate.getMonth() +1;
        let SLYear = SLDate.getFullYear();

        arrResult = arrResult.filter(row => {
            let fromDate = constFormat.parseDate(row.startdate);
            let toDate = constFormat.parseDate(row.enddate);

            let fromMonth = fromDate.getMonth() + 1;
            let fromYear = fromDate.getFullYear();

            let toMonth = toDate.getMonth() + 1;
            let toYear = toDate.getFullYear();

            let from = false;
            let to = false;
            if(SLYear > fromYear || (SLYear == fromYear && SLMonth >= fromMonth)) {
                 from = true ;
            }
            if(SLYear < toYear || (SLYear == toYear && SLMonth <= toMonth)) {
                 to = true ;
            }
            return from && to;
        })

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

        let startDate = row.startdate;
        let endDate = row.enddate;

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
                if(suiteletDate < startDate) {
                    numberOfDays = 0;
                }else {
                    numberOfDays = constFormat.calcNumberDays(suiteletDate, row.startdate) + 1;
                }

            // Kỳ Suitelet = Kỳ EndDate
            } else if (periodId == periodEndDate) {
                if(suiteletDate <= endDate) {
                    numberOfDays = constFormat.calcNumberDays(suiteletDate, periodStart) + 1;
                }
                numberOfDays = constFormat.calcNumberDays(row.enddate, periodStart) + 1;

            // Kỳ Suitelet nằm giữa StartDate và EndDate
            } else {
                numberOfDays = constFormat.calcNumberDays(suiteletDate, periodStart) + 1;
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

    const getDataExport = (arrSS1, arrSS2 ,params ,currentUserId ) => {
        let objectResult = {};
        let arrResult = [];
        // console.log("arrSS1",arrSS1);
        // console.log("arrSS2",arrSS2);
        // console.log("params",params);

        let objHeader = {};
        let subsidiaryId = params.custpage_subsidiary || '';

        if(subsidiaryId){
            let objSubsidiary = search.lookupFields({
                type: search.Type.SUBSIDIARY,
                id: subsidiaryId,
                columns: [
                    'legalname',
                    'custrecord_scv_sub_ktt'
                ]
            });

            objHeader.companyName = objSubsidiary.legalname || '';
            objHeader.chiefAccountant = objSubsidiary.custrecord_scv_sub_ktt?.[0]?.text || '';
        }

        if(currentUserId){
            let objEmployee = search.lookupFields({
                type: search.Type.EMPLOYEE,
                id: currentUserId,
                columns: [
                    'custentity_scv_legal_name'
                ]
            });

            objHeader.createdBy = objEmployee.custentity_scv_legal_name || '';
        }

        let SLDate = constFormat.parseDate(params.custpage_date);
        let SLMonth = SLDate.getMonth() + 1;
        let SLYear = SLDate.getFullYear();
        objHeader.month = `${SLMonth}/${SLYear}`;
       
        objectResult.objHeader = objHeader;
        arrSS1.forEach(objSS1 => {
            let debitLoanNo = objSS1.debitagreement || '';
            let objSS2 = arrSS2.find(obj => obj.id == debitLoanNo);
            if(objSS2){
                let startDate = constFormat.parseDate(objSS2.start_date);
                let ngayBatDauTinhLai;
                let endDate = constFormat.parseDate(objSS2.end_date);
                let ngayTinhLai;
                let soNgayTinhLai;
                let tienLaiPhanBo;
                
                if(
                    SLDate.getMonth() == startDate.getMonth() &&
                    SLDate.getFullYear() == startDate.getFullYear()
                ){
                    ngayBatDauTinhLai = startDate;
                }
                else{
                    ngayBatDauTinhLai = new Date(
                        SLDate.getFullYear(),
                        SLDate.getMonth(),
                        1
                    );
                }

                if(SLDate <= endDate){
                    ngayTinhLai = SLDate;
                }
                else{
                    ngayTinhLai = endDate;
                }

                soNgayTinhLai = Math.floor(
                    (ngayTinhLai - ngayBatDauTinhLai) / (1000 * 60 * 60 * 24)
                ) + 1;

                // tienLaiPhanBo = (objSS1.allocationamt || 0) * soNgayTinhLai;
                tienLaiPhanBo = (objSS1.allocationamt || 0) * (objSS1.amount || 0);
                arrResult.push({
                    amount: objSS1.amount || '',
                    bankName: objSS2.entity_name || '',
                    loanAmount: objSS2.amount || '',
                    startDate: objSS2.start_date || '',
                    term: objSS2.term || '',
                    interestRate: objSS2.interest_rate || '',
                    endDate: objSS2.end_date || '',
                    soNgayGui : objSS2.duration,
                    ngayBatDauTinhLai: ngayBatDauTinhLai,
                    ngayTinhLai: ngayTinhLai,
                    soNgayTinhLai: soNgayTinhLai,
                    tienLaiPhanBo: tienLaiPhanBo,
                });
            }
        });
        objectResult.arrResult = arrResult;
        return objectResult;
    };

    const getTemplateExcel = (params) =>{
        let objRes = {
            name: "Phân bổ doanh thu chưa thực hiện",
            url: "",
        };
        
         objRes.url = file.load({id: '../xlsx/scv_rpt_pbdtcth.xlsx'}).url;

        return objRes;
    }
    
    const getDataLoanInfor = () =>{
        let arrResult = constSearchPbdtcth02.getDataSource();
        return arrResult;
    }

    return {
        getListSavedSearchId,
        getColumnsResult,
        getDataSource,
        getDataSourceCreate,
        getDataSourceDelete,

        createJournal,
        deleteJournalOld,

        getPostingPeriod,
        getDataExport,
        getDataLoanInfor,
        getTemplateExcel
    };
});
