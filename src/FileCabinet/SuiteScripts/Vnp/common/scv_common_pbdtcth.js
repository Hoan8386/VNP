/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  17 Aug 2026         Thanh Hoan              Init, create file.
 */
define(['N/format', 'N/record', 'N/url','N/search',
    '../lib/scv_lib_function.js',
], (format, record, url,search,
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

    const crateNewJournals = (params,arrResult) => {
        let period = getPostingPeriod(params.custpage_date);

        console.log("period" , period);

        search.create({
            type: search.Type.JOURNAL_ENTRY,
            filters: [
                ['mainline', 'is', 'T'],
                'and', ['subsidiary', 'anyof', params.custpage_subsidiary],
                'and', ['custbody_scv_allow_sys_process', 'is', 'T'],
                'and', ['postingperiod', 'anyof', period]
            ],
            columns: ['internalid','custbody_scv_allow_sys_process']
        }).run().each(result => {
            const journal = {
                internalId: result.getValue('internalid'),
                tranId: result.getValue('tranid'),
                tranDate: result.getValue('trandate'),
                subsidiary: result.getText('subsidiary'),
                postingPeriod: result.getText('postingperiod'),
                memo: result.getValue('memo'),
                allowSystemProcess: result.getValue('custbody_scv_allow_sys_process')
            };

            console.log("Journal:", journal);

            record.delete({
                type: record.Type.JOURNAL_ENTRY,
                id: result.getValue('internalid')
            });
            return true;
        });

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

            let jeRecord = record.create({
                type: record.Type.JOURNAL_ENTRY,
                isDynamic: true
            });

            jeRecord.setValue({ fieldId: 'subsidiary', value: group.subsidiary  });
            jeRecord.setValue({ fieldId: 'trandate', value: parseNetSuiteDate(params.custpage_date) });
            jeRecord.setValue({ fieldId: 'postingperiod', value: period });
            jeRecord.setValue({ fieldId: 'currency', value: '1' }); 
            jeRecord.setValue({ fieldId: 'exchangerate', value: 1 });
            jeRecord.setValue({ fieldId: 'custbody_scv_allow_sys_process', value: true });
            jeRecord.setValue({ fieldId: 'custbody_scv_lms_allow_sys_process', value: true });
            
            if (group.memo) jeRecord.setValue({ fieldId: 'memo', value: group.memo });
            if (group.salesContract) jeRecord.setValue({ fieldId: 'custbody_scv_sales_contract', value: group.salesContract });
            if (group.debitAgreement) jeRecord.setValue({ fieldId: 'custbody_scv_loa', value: group.debitAgreement });

            // 2. Duyệt qua từng line: Mỗi item trong search tạo ra 2 dòng (Debit & Credit)
            group.lines.forEach((lineItem) => {
                let allocatedAmt = calculateAmount(lineItem, params.custpage_date, period);
                if (allocatedAmt <= 0) return;

                let lineMemo = lineItem.memo || group.memo;
                let locationId = lineItem.location || lineItem.location_display;

                // --- DÒNG 1: DEBIT ---
                jeRecord.selectNewLine({ sublistId: 'line' });
                jeRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: lineItem.accountdebit });
                jeRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'debit', value: allocatedAmt });
                if (lineMemo) jeRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: lineMemo });
                if (locationId) jeRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: locationId });
                jeRecord.commitLine({ sublistId: 'line' });

                // --- DÒNG 2: CREDIT ---
                jeRecord.selectNewLine({ sublistId: 'line' });
                jeRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'account', value: lineItem.accountcredit });
                jeRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'credit', value: allocatedAmt });
                if (lineMemo) jeRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'memo', value: lineMemo });
                if (locationId) jeRecord.setCurrentSublistValue({ sublistId: 'line', fieldId: 'location', value: locationId });
                jeRecord.commitLine({ sublistId: 'line' });
            });

            // 3. Lưu bút toán nếu có ít nhất 1 dòng
            if (jeRecord.getLineCount({ sublistId: 'line' }) > 0) {
                let jeId = jeRecord.save();
                console.log(`Đã tạo thành công Journal Entry ID: ${jeId} cho nhóm ${key}`);
            }
        });
        
    }
    const parseNetSuiteDate = (d) => {
        if (!d) return null;
        if (d instanceof Date) return d;
        return format.parse({ value: d, type: format.Type.DATE });
    };

    const calculateAmount = (row, suiteletDate, periodId) => {
        let allocType = String(row.allocationtype || row.allocationtype_display || '').toLowerCase();
        let allocAmt = parseFloat(row.allocationamt || row.amount) || 0;

        // TH1: Phân bổ theo Tháng (AllocationType = 2 hoặc "Tháng")
        if (allocType === '2' || allocType.includes('tháng') || allocType.includes('month')) {
            return allocAmt;
        }

        // TH2: Phân bổ theo Ngày (AllocationType = 1 hoặc "Ngày")
        if (allocType === '1' || allocType.includes('ngày') || allocType.includes('day')) {
            let dtSuitelet = parseNetSuiteDate(suiteletDate);
            let dtStart = parseNetSuiteDate(row.startdate);
            let dtEnd = parseNetSuiteDate(row.enddate);

            // Lấy ngày bắt đầu và kết thúc của kỳ hiện tại
            let periodRecord = search.lookupFields({
                type: search.Type.ACCOUNTING_PERIOD,
                id: periodId,
                columns: ['startdate', 'enddate']
            });
            let dtPerStart = parseNetSuiteDate(periodRecord.startdate);
            let dtPerEnd = parseNetSuiteDate(periodRecord.enddate);

            let startPeriodId = getPostingPeriod(row.startdate);
            let endPeriodId = getPostingPeriod(row.enddate);

            const diffDays = (d1, d2) => Math.round(Math.abs((d1.getTime() - d2.getTime()) / (24 * 60 * 60 * 1000)));
            let numDays = 0;

            if (periodId === startPeriodId) {
                // Kỳ chọn = Kỳ của StartDate => Ngày Suitelet - StartDate + 1
                numDays = diffDays(dtSuitelet, dtStart) + 1;
            } else if (periodId === endPeriodId) {
                // Kỳ chọn = Kỳ của EndDate => EndDate - Ngày đầu tiên của kỳ + 1
                numDays = diffDays(dtEnd, dtPerStart) + 1;
            } else {
                // Kỳ chọn nằm giữa StartDate và EndDate => Số ngày của kỳ
                numDays = diffDays(dtPerEnd, dtPerStart) + 1;
            }

            return allocAmt * numDays;
        }

        return allocAmt;
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
