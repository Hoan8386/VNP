/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  17 Aug 2026         Thanh Hoan              Init, create file.
 */
define(['N/format', 'N/record', 'N/url','N/search', 'N/ui/message',
    '../lib/scv_lib_function.js',
    '../cons/scv_cons_format.js',

], (format, record, url,search,message,
    lbf,
    constFormat
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

    const crateNewJournals = (params,arrResult) => {
        let period = getPostingPeriod(params.custpage_date);
        let createdJournals = [];
        let journalIds = [];
        console.log("period" , period);

        const results = search.create({
            type: search.Type.JOURNAL_ENTRY,
            filters: [
                ['mainline', 'is', 'T'],
                'and', ['subsidiary', 'anyof', params.custpage_subsidiary],
                'and', ['custbody_scv_allow_sys_process', 'is', 'T'],
                'and', ['postingperiod', 'anyof', period]
            ],
            columns: ['internalid']
            }).run().getRange({
                start: 0,
                end: 1000
        });

        results.forEach(result => {
            const journal = {
                internalId: result.getValue('internalid')
            };

            console.log("Journal:", journal);

            const journalId = result.getValue('internalid');
            journalIds.push(journalId);
        });

        console.log("journalIds.length ",journalIds.length)
        if(journalIds.length > 0) {
            journalIds.forEach((id) => {
                record.delete({
                    type: record.Type.JOURNAL_ENTRY,
                        id: id 
                    });
                console.log(`Đã xóa Journal ${id}`);
            } )
        }
        let groupedData = {};
        console.log("check arr ",arrResult);
        arrResult.forEach((row) => {
            let salesContract = row.salescontract || '';
            let debitAgreement = row.debitagreement || '';
            let groupKey = row.salescontract || row.debitagreement;

            if (!groupedData[groupKey]) {
                groupedData[groupKey] = {
                    subsidiary: row.subsidiary,
                    memo: row.memo || '',
                    salesContract: salesContract,
                    debitAgreement: debitAgreement,
                    lines: []
                };
            }

            groupedData[groupKey].lines.push(row);
        });

        Object.keys(groupedData).forEach((key) => {
            let group = groupedData[key];
            if (!group.lines || group.lines.length === 0) return;

            let newJournal = record.create({
                type: record.Type.JOURNAL_ENTRY,
                isDynamic: true
            });

            newJournal.setValue({ fieldId: 'subsidiary', value: group.subsidiary  });
            newJournal.setValue({ fieldId: 'trandate', value: constFormat.parseDate(params.custpage_date) });
            newJournal.setValue({ fieldId: 'memo', value: group.memo });
            newJournal.setValue({ fieldId: 'currency', value: '1' }); 
            newJournal.setValue({ fieldId: 'exchangerate', value: 1 });
            newJournal.setValue({ fieldId: 'custbody_scv_lms_allow_sys_process', value: true });
            newJournal.setValue({ fieldId: 'custbody_scv_sales_contract', value: group.salesContract });
            newJournal.setValue({ fieldId: 'custbody_scv_loa', value: group.debitAgreement });
            

            // 2. Duyệt qua từng line: Mỗi item trong search tạo ra 2 dòng (Debit & Credit)
            group.lines.forEach((lineItem) => {
                let allocatedAmt = calculateAmount(lineItem, params.custpage_date, period);
                if (allocatedAmt <= 0) return;

                let lineMemo = lineItem.memo || group.memo; // default memo của header 
                let locationId = lineItem.location || lineItem.location_display;

                // dòng 1 debit
                newJournal.selectNewLine({ sublistId: 'line' });
                newJournal.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: lineItem.accountdebit });
                newJournal.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: allocatedAmt });
                if (lineMemo) newJournal.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: lineMemo });
                if (locationId) newJournal.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: locationId });
                newJournal.commitLine({ sublistId: 'line' });

                // dòng 2 credit
                newJournal.selectNewLine({ sublistId: 'line' });
                newJournal.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: lineItem.accountcredit });
                newJournal.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: allocatedAmt });
                if (lineMemo) newJournal.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: lineMemo });
                if (locationId) newJournal.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: locationId });
                newJournal.commitLine({ sublistId: 'line' });

            });

            if (newJournal.getLineCount({ sublistId: 'line' }) > 0) {
                let jeId = newJournal.save();
                console.log(`Đã tạo thành công Journal Entry ID: ${jeId} cho nhóm ${key}`);

                let journalUrl = url.resolveRecord({
                    recordType: record.Type.JOURNAL_ENTRY,
                    recordId: jeId,
                });

                createdJournals.push({
                    id: jeId,
                    url: journalUrl
                });
            }
        }); 

        if (createdJournals.length > 0) {
            let journalLinks = createdJournals
                .map(journal => {
                    return `<a href="${journal.url}" target="_blank">
                                Journal Entry #${journal.id}
                            </a>`;
                })
                .join('<br>');

            const successMessage = message.create({
                title: 'Create Journal Success',
                message: `
                    Đã tạo thành công ${createdJournals.length} Journal Entry:
                    <br><br>
                    ${journalLinks}
                `,
                type: message.Type.CONFIRMATION
            });

            successMessage.show({
                duration: 10000
            });
        }
        
    }
  
    const calculateAmount = (row, suiteletDate, periodId) => {
        let allocType = row.allocationtype ;

        let allocAmt = row.allocationamt * 1;

        if ( allocType === '2' ) {
            return allocAmt;
        }

        // TH2: Phân bổ theo Ngày
        if (allocType === '1') {

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
        getColumnsResult,
        crateNewJournals,
        getPostingPeriod
    };
});
