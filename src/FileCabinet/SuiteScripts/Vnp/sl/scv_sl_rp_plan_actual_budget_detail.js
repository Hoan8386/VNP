/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/file', 'N/record', 'N/format', 'N/runtime', 'N/search', 'N/ui/serverWidget', '../lib/scv_lib_report', '../lib/scv_lib_function.js', "../lib/scv_lib_function_ns",],

    (file, record, format, runtime, search, serverWidget, lrp, lbf, libFnV2) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            const SS_BGUSAGA = 'customsearch_scv_bgusage_detail';
            const SS_BGACTUAL = 'customsearch_scv_bgactual_detail';
            const SS_BBPR2 = 'customsearch_scv_bgpr_2';
            let request = scriptContext.request;
            let parameters = request.parameters;
            let response = scriptContext.response;
            let from_date = parameters.custpage_fromdate;
            let to_date = parameters.custpage_todate;
            let show_detail = parameters.custpage_show_detail;
            parameters.custpage_project = splitComa(parameters.custpage_project);
            let action = parameters.action;
            let isearch = parameters.isSearch;
            let isgetdata = parameters.isgetdata;
            let redirect = parameters.redirect;

            let filterBGUSAGA = [], filterBGACTUAL = [], filterBBPR2 = [];
            let listDataBGUSAGA = [], listDataBGACTUAL = [], listDataBBPR2 = [];
            let mergedData;
            if (isearch === 'T') {
                log.debug('PlanActualBudgetDetail.search.parameters', {
                    from_date,
                    to_date,
                    show_detail,
                    subsidiary: parameters.custpage_subsidiary,
                    budget_class: parameters.custpage_budget_class,
                    project: parameters.custpage_project
                });
                pushFilterBGUSAGA(filterBGUSAGA, parameters);
                pushFilterBGACTUAL(filterBGACTUAL, parameters);
                pushFilterBBPR2(filterBBPR2, parameters);
                logSavedSearchRequest(SS_BGUSAGA, filterBGUSAGA);
                const totalBGUSAGA = lrp.doSearchSSRangeLabelId(SS_BGUSAGA, 1000, listDataBGUSAGA, filterBGUSAGA);
                logSavedSearchResult(SS_BGUSAGA, totalBGUSAGA, listDataBGUSAGA);

                logSavedSearchRequest(SS_BGACTUAL, filterBGACTUAL);
                const totalBGACTUAL = lrp.doSearchSSRangeLabelId(SS_BGACTUAL, 1000, listDataBGACTUAL, filterBGACTUAL);
                logSavedSearchResult(SS_BGACTUAL, totalBGACTUAL, listDataBGACTUAL);

                logSavedSearchRequest(SS_BBPR2, filterBBPR2);
                const totalBBPR2 = lrp.doSearchSSRangeLabelId(SS_BBPR2, 1000, listDataBBPR2, filterBBPR2);
                logSavedSearchResult(SS_BBPR2, totalBBPR2, listDataBBPR2);
                listDataBGUSAGA = renameFields(listDataBGUSAGA);
                listDataBGACTUAL = renameFields(listDataBGACTUAL);
                listDataBBPR2 = renameFields(listDataBBPR2);
                mergedData = mergeAllData(listDataBBPR2, listDataBGACTUAL, listDataBGUSAGA, from_date, to_date);
                log.debug('PlanActualBudgetDetail.mergedData', {
                    total: mergedData.length,
                    sample: mergedData.slice(0, 10)
                });
                if (show_detail !== 'T') {
                    mergedData = mergedData.filter(item => item.lv1 === true || item.lv2 === true || item.lv3 === true);
                    log.debug('PlanActualBudgetDetail.mergedData.afterHideDetail', {
                        total: mergedData.length,
                        sample: mergedData.slice(0, 10)
                    });
                }
            }
            if (isgetdata === 'T') {
                response.write(JSON.stringify({
                    mergedData: mergedData,
                } || {}));
            } else if (action === 'getUrlTemplate') {
                response.write(JSON.stringify({urlTemplate: getUrlFileTemplate()}));
            } else if (request.method === 'GET') {
                let fromdate = "", todate = "", subsidiary;
                let budgetArray = [];
                if (redirect === 'T') {
                    let recPayReq = record.load({
                        type: parameters.rectype,
                        id: parameters.recid,
                    });
                    subsidiary = recPayReq.getValue('subsidiary') || recPayReq.getValue('custrecord_scv_payr_subs');
                    let payment_date = recPayReq.getValue('custrecord_scv_payment_date');
                    if (payment_date) {
                        let paymentDateObj = new Date(payment_date);
                        if (!isNaN(paymentDateObj)) {
                            let paymentYear = paymentDateObj.getFullYear();
                            let fromdateObj = new Date(paymentYear, 0, 1);
                            fromdate = fromdateObj.toLocaleDateString("en-GB");
                            let todateObj = new Date(paymentYear, 11, 31);
                            todate = todateObj.toLocaleDateString("en-GB");
                        }
                    }

                    let sublistId = 'recmachcustrecord_scv_pay';
                    let lineCount = recPayReq.getLineCount({sublistId: sublistId});
                    for (let j = 0; j < lineCount; j++) {
                        let pay_detail_class = recPayReq.getSublistValue({
                            sublistId: sublistId,
                            fieldId: "custrecord_scv_pay_detail_class",
                            line: j
                        });
                        budgetArray.push(pay_detail_class);
                    }

                }
                let dataConfig = getDataConfigRP(parameters);
                let form = createForm(parameters, dataConfig, fromdate, todate, subsidiary, budgetArray);
                let optionGrid = onCreateDxGrid(from_date, to_date);
                renderDxGrid(form, optionGrid, mergedData);
                response.writePage(form);
            }
        }

        function getDataConfigRP(_params) {
            let objUser = runtime.getCurrentUser();
            const isRoleAdmin = objUser.role.toString() === '3';
            const userId = objUser.id;
            let lkUser = search.lookupFields({
                type: lbf.getEntityType(userId), id: userId, columns: [
                    'location', 'subsidiary'
                ]
            });
            const subId = lkUser.subsidiary ?.[0]?.value || '';
            let dataSubs = isRoleAdmin ? [] : loadDataSubs(subId);
            return {
                isRoleAdmin,
                dataSubs: dataSubs,
                dfSubId: subId
            }
        }

        const loadDataSubs = (subId) => {
            const listSubs = libFnV2.getListIDChildAndCurrentID(subId, 'subsidiary', 'parent', 'isinactive = ?');
            const resultSubs = lbf.callQuery(`select id, name
                                              from subsidiary
                                              where id in ('${listSubs.join("','")}')
                                              order by name`)
            return resultSubs.isSuccess ? resultSubs.response : [];
        };

        function logSavedSearchRequest(searchId, filters) {
            log.debug('PlanActualBudgetDetail.savedSearch.request', {
                searchId,
                filters: serializeFilters(filters)
            });
        }

        function logSavedSearchResult(searchId, totalRecord, data) {
            log.debug('PlanActualBudgetDetail.savedSearch.result', {
                searchId,
                totalRecord,
                dataLength: data.length,
                sample: data.slice(0, 10)
            });
        }

        function serializeFilters(filters) {
            return (filters || []).map((filter) => ({
                name: filter.name,
                join: filter.join,
                operator: filter.operator,
                summary: filter.summary,
                formula: filter.formula,
                values: filter.values
            }));
        }

        function renameFields(data) {
            const normalizeKey = (key) =>
                key
                    .replace(/[\u0000]/g, "")
                    .trim()
                    .replace(/đ/g, "d")
                    .replace(/D/g, "d")
                    .replace(/Đ/g, "d")
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-zA-Z0-9]/g, "_")
                    .replace(/_+/g, "_")
                    .replace(/^_|_$/g, "")
                    .toLowerCase();

            const sanitizeValue = (value) => {
                return value === null || value === "- None -" ? "" : value;
            };
            return data.map((item) => {
                const renamedItem = {};
                Object.keys(item).forEach((key) => {
                    const newKey = normalizeKey(key);
                    renamedItem[newKey] = sanitizeValue(item[key]);
                });
                return renamedItem;
            });
        }

        const getUrlFileTemplate = () => {
            let pathFile = '../xls/scv_xlsx_rp_plan_actual.xlsx';
            let fileLoad = file.load({id: pathFile});
            return fileLoad.url;
        }

        const onCreateDxGrid = (fromdate, todate) => {
            var columnsGrid = getDataColumnGrid(fromdate, todate);
            return {
                columns: columnsGrid,
                exportExcelEnable: true,
                excel: {name: "Plan and Actual Budget Detail Report"},
                columnChooser: true,
                filterRowVisible: false,
                headerFilterVisible: true,
                rowAlternationEnabled: false,
                wordWrapEnabled: false,
                sortingMode: "multiple",
                groupPanel: false,
                pageSize: 500
            };
        }
        const pushFilterBGUSAGA = (f, parameters) => {
            pushFilterChung(f, parameters);
            if (parameters.custpage_subsidiary) {
                f.push(search.createFilter({
                    name: 'subsidiary',
                    operator: search.Operator.ANYOF,
                    values: parameters.custpage_subsidiary.split(",")
                }));
            }
            if (parameters.custpage_budget_class) {
                f.push(search.createFilter({
                    name: 'class',
                    operator: search.Operator.ANYOF,
                    values: parameters.custpage_budget_class.split(",")
                }));
            }
        }
        const pushFilterBGACTUAL = (f, parameters) => {
            pushFilterChung(f, parameters);
            if (parameters.custpage_subsidiary) {
                f.push(search.createFilter({
                    name: 'subsidiary',
                    operator: search.Operator.ANYOF,
                    values: parameters.custpage_subsidiary.split(",")
                }));
            }
            if (parameters.custpage_budget_class) {
                f.push(search.createFilter({
                    name: 'class',
                    operator: search.Operator.ANYOF,
                    values: parameters.custpage_budget_class.split(",")
                }));
            }
        }
        const pushFilterBBPR2 = (f, parameters) => {
            if (parameters.custpage_fromdate) {
                f.push(search.createFilter({
                    name: 'custrecord_scv_payment_date',
                    join: 'custrecord_scv_pay',
                    operator: search.Operator.ONORAFTER,
                    values: parameters.custpage_fromdate,
                }));
            }
            if (parameters.custpage_todate) {
                f.push(search.createFilter({
                    name: 'custrecord_scv_payment_date',
                    join: 'custrecord_scv_pay',
                    operator: search.Operator.ONORBEFORE,
                    values: parameters.custpage_todate,
                }));
            }
            if (parameters.custpage_subsidiary) {
                f.push(search.createFilter({
                    name: 'custrecord_scv_payr_subs',
                    join: 'custrecord_scv_pay',
                    operator: search.Operator.ANYOF,
                    values: parameters.custpage_subsidiary.split(",")
                }));
            }
            if (parameters.custpage_budget_class) {
                f.push(search.createFilter({
                    name: 'custrecord_scv_pay_detail_class',
                    operator: search.Operator.ANYOF,
                    values: parameters.custpage_budget_class.split(",")
                }));
            }
        }

        const pushFilterChung = (f, parameters) => {
            if (parameters.custpage_fromdate) {
                f.push(search.createFilter({
                    name: 'trandate',
                    operator: search.Operator.ONORAFTER,
                    values: parameters.custpage_fromdate,
                }));
            }
            if (parameters.custpage_todate) {
                f.push(search.createFilter({
                    name: 'trandate',
                    operator: search.Operator.ONORBEFORE,
                    values: parameters.custpage_todate,
                }));
            }
        }

        function mergeAllData(listDataBBPR2, listDataBGACTUAL, listDataBGUSAGA, fromdate, todate) {
            const mergedDataMap = new Map();

            const formatKey = (item) =>
                `${item.subsidiary || ''}-${item.budgetclass || item.expenseclass || ''}-${item.document_number || ''}`;

            const splitBudgetClassDisplay = (display) => {
                const [budgetclass_parent = '', budgetclass_2 = ''] = display.split(' : ').map((part) => part.trim());
                return {budgetclass_parent, budgetclass_2};
            };

            const extractPeriod = (dateStr) => {
                if (!dateStr) return 'unknown';
                const [day, month, year] = dateStr.split('/').map(Number);
                return `${month}_${year}`;
            };

            const addToMap = (item, source, fromdate, todate) => {
                const key = formatKey(item);
                const period = extractPeriod(item.date);
                const fromperiod = extractPeriod(fromdate);
                const toperiod = extractPeriod(todate);

                if (!mergedDataMap.has(key)) {
                    const { budgetclass_parent, budgetclass_2 } = splitBudgetClassDisplay(
                        item.budgetclass_display || item.expenseclass_display || ''
                    );

                    mergedDataMap.set(key, {
                        subsidiary: item.subsidiary || '',
                        subsidiary_display: item.subsidiary_display || '',
                        budgetclass: item.budgetclass || item.expenseclass || '',
                        budgetclass_display: item.budgetclass_display || item.expenseclass_display || '',
                        budgetclass_parent,
                        budgetclass_2,
                        document_number: item.document_number || '',
                        date: item.date || '',
                        periods: {},
                    });
                }

                const existingItem = mergedDataMap.get(key);

                // Add missing periods from the given range (fromperiod to toperiod)
                const [fromMonth, fromYear] = fromperiod.split('_').map(Number);
                const [toMonth, toYear] = toperiod.split('_').map(Number);

                // Loop through the range from fromperiod to toperiod
                for (let year = fromYear; year <= toYear; year++) {
                    const startMonth = year === fromYear ? fromMonth : 1;
                    const endMonth = year === toYear ? toMonth : 12;

                    for (let month = startMonth; month <= endMonth; month++) {
                        const periodKey = `${month}_${year}`;
                        if (!existingItem.periods[periodKey]) {
                            existingItem.periods[periodKey] = { commitamount: 0, actualamount: 0, usageamount: 0, remaining: 0 };
                        }
                    }
                }

                if (source === 'BBPR2') {
                    existingItem.periods[period].commitamount += parseFloat(item.commitamount || 0);
                } else if (source === 'BGACTUAL') {
                    existingItem.periods[period].actualamount += parseFloat(item.actualamount || 0);
                } else if (source === 'BGUSAGA') {
                    existingItem.periods[period].usageamount += parseFloat(item.usageamount || 0);
                }
            };

            listDataBBPR2.forEach((item) => addToMap(item, 'BBPR2', fromdate, todate));
            listDataBGACTUAL.forEach((item) => addToMap(item, 'BGACTUAL', fromdate, todate));
            listDataBGUSAGA.forEach((item) => addToMap(item, 'BGUSAGA', fromdate, todate));
            const groupedData = [];
            const parentTotals = new Map();
            const childTotals = new Map();

            Array.from(mergedDataMap.values()).forEach((item) => {
                const {budgetclass_parent, budgetclass_2, periods} = item;
                if (!parentTotals.has(budgetclass_parent)) {
                    parentTotals.set(budgetclass_parent, {
                        budgetclass_chung: `${budgetclass_parent}`,
                        lv1: true,
                        lv2: false,
                        lv3: false,
                        periods: {},
                        children: [],
                    });
                }
                const parentData = parentTotals.get(budgetclass_parent);

                if (!childTotals.has(budgetclass_2)) {
                    childTotals.set(budgetclass_2, {
                        budgetclass_chung: `${budgetclass_2}`,
                        lv1: false,
                        lv2: true,
                        lv3: false,
                        periods: {},
                        details: [],
                    });
                }
                const childData = childTotals.get(budgetclass_2);

                Object.keys(periods).forEach((period) => {
                    if (!parentData.periods[period]) {
                        parentData.periods[period] = {commitamount: 0, actualamount: 0, usageamount: 0};
                    }
                    if (!childData.periods[period]) {
                        childData.periods[period] = {commitamount: 0, actualamount: 0, usageamount: 0};
                    }

                    parentData.periods[period].commitamount += periods[period].commitamount;
                    parentData.periods[period].actualamount += periods[period].actualamount;
                    parentData.periods[period].usageamount += periods[period].usageamount;
                    parentData.periods[period].remaining = parentData.periods[period].usageamount - parentData.periods[period].commitamount - parentData.periods[period].actualamount;

                    childData.periods[period].commitamount += periods[period].commitamount;
                    childData.periods[period].actualamount += periods[period].actualamount;
                    childData.periods[period].usageamount += periods[period].usageamount;
                    childData.periods[period].remaining = childData.periods[period].usageamount - childData.periods[period].commitamount - childData.periods[period].actualamount;

                    periods[period].remaining = periods[period].usageamount - periods[period].commitamount - periods[period].actualamount;
                });
                let previousRemaining = 0; // Biến lưu giữ remaining của tháng trước

                childData.details.push({
                    lv1: false,
                    lv2: false,
                    lv3: false,
                    budgetclass_chung: item.budgetclass_display,
                    subsidiary: item.subsidiary,
                    subsidiary_display: item.subsidiary_display,
                    budgetclass: item.budgetclass,
                    budgetclass_display: item.budgetclass_display,
                    document_number: item.document_number,
                    date: item.date,
                    ...Object.fromEntries(
                        Object.keys(periods).map((period) => [
                            `commitamount_${period}`, (periods[period].commitamount)
                        ])
                    ),

                    ...Object.fromEntries(
                        Object.keys(periods).map((period) => [
                            `actualamount_${period}`, (periods[period].actualamount)
                        ])
                    ),

                    ...Object.fromEntries(
                        Object.keys(periods).map((period) => {
                            const [month, year] = period.split('_');
                            let usageAmount = periods[period].usageamount;
                            let remaining = periods[period].remaining;

                            if (parseInt(month) !== 1) {
                                usageAmount = previousRemaining;
                                remaining = usageAmount - periods[period].commitamount - periods[period].actualamount;
                            }
                            previousRemaining = remaining;

                            return [
                                `usageamount_${period}`, usageAmount,
                            ];
                        })
                    ),

                    ...Object.fromEntries(
                        Object.keys(periods).map((period) => {
                            const [month, year] = period.split('_');
                            let usageAmount = periods[period].usageamount;
                            let remaining = periods[period].remaining;

                            if (parseInt(month) !== 1) {
                                usageAmount = previousRemaining;
                                remaining = usageAmount - periods[period].commitamount - periods[period].actualamount;
                            }
                            previousRemaining = remaining;

                            return [
                                `remaining_${period}`, remaining,
                            ];
                        })
                    ),
                });
                if (!parentData.children.includes(childData)) {
                    parentData.children.push(childData);
                }

            });
            let parentRemaining = 0;
            parentTotals.forEach((parent) => {
                groupedData.push({
                    budgetclass_chung: parent.budgetclass_chung,
                    lv1: true,
                    ...Object.fromEntries(
                        Object.keys(parent.periods).map((period) => [
                            `commitamount_${period}`, (parent.periods[period].commitamount)
                        ])
                    ),
                    ...Object.fromEntries(
                        Object.keys(parent.periods).map((period) => [
                            `actualamount_${period}`, (parent.periods[period].actualamount)
                        ])
                    ),

                    ...Object.fromEntries(
                        Object.keys(parent.periods).map((period) => {
                            const [month, year] = period.split('_');
                            let usageAmount = parent.periods[period].usageamount;
                            let remaining = parent.periods[period].remaining;

                            if (parseInt(month) !== 1) {
                                usageAmount = parentRemaining;
                                remaining = usageAmount - parent.periods[period].commitamount - parent.periods[period].actualamount;
                            }
                            parentRemaining = remaining;

                            return [
                                `usageamount_${period}`, usageAmount,
                            ];
                        })
                    ),

                    ...Object.fromEntries(
                        Object.keys(parent.periods).map((period) => {
                            const [month, year] = period.split('_');
                            let usageAmount = parent.periods[period].usageamount;
                            let remaining = parent.periods[period].remaining;

                            if (parseInt(month) !== 1) {
                                usageAmount = previousRemaining;
                                remaining = usageAmount - parent.periods[period].commitamount - parent.periods[period].actualamount;
                            }
                            previousRemaining = remaining;

                            return [
                                `remaining_${period}`, remaining,
                            ];
                        })
                    ),
                });
                let childRemaining = 0;
                parent.children.forEach((child) => {
                    groupedData.push({
                        budgetclass_chung: child.budgetclass_chung,
                        lv2: true,
                        ...Object.fromEntries(
                            Object.keys(child.periods).map((period) => [
                                `actualamount_${period}`, (child.periods[period].actualamount)
                            ])
                        ),
                        ...Object.fromEntries(
                            Object.keys(child.periods).map((period) => [
                                `commitamount_${period}`, (child.periods[period].commitamount),
                            ])
                        ),
                        ...Object.fromEntries(
                            Object.keys(child.periods).map((period) => {
                                const [month, year] = period.split('_');
                                let usageAmount = child.periods[period].usageamount;
                                let remaining = child.periods[period].remaining;

                                if (parseInt(month) !== 1) {
                                    usageAmount = parentRemaining;
                                    remaining = usageAmount - child.periods[period].commitamount - child.periods[period].actualamount;
                                }
                                parentRemaining = remaining;

                                return [
                                    `usageamount_${period}`, usageAmount,
                                ];
                            })
                        ),

                        ...Object.fromEntries(
                            Object.keys(child.periods).map((period) => {
                                const [month, year] = period.split('_');
                                let usageAmount = child.periods[period].usageamount;
                                let remaining = child.periods[period].remaining;

                                if (parseInt(month) !== 1) {
                                    usageAmount = childRemaining;
                                    remaining = usageAmount - child.periods[period].commitamount - child.periods[period].actualamount;
                                }
                                childRemaining = remaining;

                                return [
                                    `remaining_${period}`, remaining,
                                ];
                            })
                        ),
                    });
                    child.details.forEach((detail) => groupedData.push(detail));
                });


            });
            let grandTotal = {
                budgetclass_chung: "Total",
                lv1: false,
                lv2: false,
                lv3: true
            };
            groupedData.forEach((item) => {
                if (!item.lv1 && !item.lv2 && !item.lv3) {
                    Object.keys(item).forEach((key) => {
                        if (key.startsWith("commitamount_") || key.startsWith("actualamount_") ||
                            key.startsWith("usageamount_") || key.startsWith("remaining_")) {

                            if (!grandTotal[key]) {
                                grandTotal[key] = 0;
                            }
                            grandTotal[key] += parseFloat(item[key] || 0);
                        }
                    });
                }
            });
            groupedData.push(grandTotal);

            groupedData.forEach((item) => {
                Object.keys(item).forEach((key) => {
                    if (key.startsWith("commitamount_") || key.startsWith("actualamount_") ||
                        key.startsWith("usageamount_") || key.startsWith("remaining_")) {
                        item[key] = changeCurrency(item[key]);
                    }
                });
            });
            return groupedData;
        }

        const splitComa = (input) => {
            return input ? util.isArray(input) ? input : input.split('>>>>>>') : input;
        }

        const createForm = (parameters, dataConfig, fromdate, todate, subsidiary, budgetArray) => {
            let form = serverWidget.createForm({title: "Plan and Actual Budget Detail Report"});
            form.clientScriptModulePath = '../cs/scv_cs_rp_plan_actual_budget_detail.js';
            form.addButton({id: 'custpage_bt_search', label: 'Search', functionName: 'onSearchResult()'});
            form.addButton({id: 'custpage_bt_export', label: 'Export', functionName: 'exportReport()'});
            let container = 'fieldgroup_dc_main';
            form.addFieldGroup({id: container, label: 'Filter'});

            let objFieldSub = {
                id: "custpage_subsidiary",
                label: "Subsidiaries",
                type: serverWidget.FieldType.MULTISELECT,
                container: container
            };
            if (dataConfig.isRoleAdmin) {
                objFieldSub.source = "subsidiary";
            }
            const fSubsidiary = form.addField(objFieldSub).setHelpText({
                help: 'Subsidiaries',
                showInlineForAssistant: true
            });
            fSubsidiary.isMandatory = true;
            let custpage_budget_class = form.addField({
                id: 'custpage_budget_class',
                type: serverWidget.FieldType.MULTISELECT,
                label: 'Budget Class',
                container: container,
                source: 'classification',
            });
            let custpage_fromdate = form.addField({
                id: 'custpage_fromdate',
                type: serverWidget.FieldType.DATE,
                label: 'From Date',
                container: container
            });
            custpage_fromdate.isMandatory = true;
            let custpage_todate = form.addField({
                id: 'custpage_todate',
                type: serverWidget.FieldType.DATE,
                label: 'To Date',
                container: container
            });
            custpage_todate.isMandatory = true;
            let custpage_show_detail = form.addField({
                id: 'custpage_show_detail',
                type: serverWidget.FieldType.CHECKBOX,
                label: 'Show Detail',
                container: container,
            });
            let subsidiaryF = parameters.custpage_subsidiary;
            let budget_classF = parameters.custpage_budget_class;

            if (!dataConfig.isRoleAdmin) {
                addSelectOption(fSubsidiary, dataConfig.dataSubs);
            }
            if (checkNull(subsidiaryF)) {
                fSubsidiary.defaultValue = subsidiaryF.split(",");
            } else if (subsidiary) {
                fSubsidiary.defaultValue = subsidiary;
            }
            if (checkNull(budget_classF)) {
                custpage_budget_class.defaultValue = budget_classF.split(",");
            } else if (budgetArray) {
                custpage_budget_class.defaultValue = budgetArray;
            }
            if (parameters.custpage_show_detail === "T") {
                custpage_show_detail.defaultValue = 'T' || true;
            } else if (parameters.redirect === 'T') {
                custpage_show_detail.defaultValue = 'T' || true;
            }
            if (parameters.custpage_fromdate) {
                custpage_fromdate.defaultValue = parameters.custpage_fromdate;
            } else if (fromdate) {
                custpage_fromdate.defaultValue = fromdate;
            }
            if (parameters.custpage_todate) {
                custpage_todate.defaultValue = parameters.custpage_todate;
            } else if (todate) {
                custpage_todate.defaultValue = todate;
            }
            return form;
        }

        const addSelectOption = (pThisField, data, nameEmptyOption) => {
            if (typeof nameEmptyOption !== 'undefined') {
                pThisField.addSelectOption({value: '', text: nameEmptyOption});
            }
            const lenProj = data.length;
            for (let i = 0; i < lenProj; i++) {
                pThisField.addSelectOption({value: data[i].id, text: data[i].name});
            }
        };

        const getDataColumnGrid = (fromdate, todate) => {
            const columns = [
                {caption: "Budget Class", dataField: "budgetclass_chung", dataType: "text"},
                {caption: "Document No", dataField: "document_number", dataType: "text"},
                {caption: "Date", dataField: "date", dataType: "text"},
            ];
            if (fromdate && todate) {
                const [fromDay, fromMonth, fromYear] = fromdate.split("/").map(Number);
                const [toDay, toMonth, toYear] = todate.split("/").map(Number);
                let startDate = new Date(fromYear, fromMonth - 1, fromDay);
                let endDate = new Date(toYear, toMonth - 1, toDay);

                while (startDate <= endDate) {
                    const monthYear = `T${startDate.getMonth() + 1}.${startDate.getFullYear()}`;
                    const month_year = `${startDate.getMonth() + 1}_${startDate.getFullYear()}`;
                    columns.push({
                        caption: `Period (${monthYear})`,
                        alignment: "center",
                        columns: [
                            {dataField: `usageamount_${month_year}`, caption: "Usage", dataType: "string", alignment: "right"},
                            {dataField: `commitamount_${month_year}`, caption: "Commit", dataType: "string", alignment: "right"},
                            {dataField: `actualamount_${month_year}`, caption: "Actual", dataType: "string", alignment: "right"},
                            {dataField: `remaining_${month_year}`, caption: "Remain", dataType: "string", alignment: "right"},
                        ],
                    });
                    startDate.setMonth(startDate.getMonth() + 1);
                }
            }

            return columns;
        };

        function renderDxGrid(_form, _optionGrid, _arrData) {
            let opGrid = _optionGrid || {};
            let _pathFile = '../html/scv_html_tmpl_rp_quota_theo_kh.html';
            opGrid.columns = opGrid.columns || [];
            opGrid.summaryTotalItems = opGrid.summaryTotalItems || [];
            opGrid.summaryGroupItems = opGrid.summaryGroupItems || [];
            let dataForGrid = _arrData && _arrData.length ? _arrData : [];
            let htmlFile = "<script>" +
                "let opGrid = " + JSON.stringify(opGrid) + ";" +
                "let arrData = " + JSON.stringify(dataForGrid) + ";" +
                "</script>";
            htmlFile += file.load({id: _pathFile}).getContents();
            htmlFile += '</tbody></table>';
            let fieldGroup_id = "fieldgrp_" + onGenCodeRandom();
            _form.addFieldGroup({id: fieldGroup_id, label: 'Result'});
            let custpage_dxgrid = _form.addField({
                id: 'custpage_dxgrid',
                type: "inlinehtml",
                label: 'DxGrid',
                container: fieldGroup_id
            });
            custpage_dxgrid.updateLayoutType({
                layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW
            });
            custpage_dxgrid.defaultValue = htmlFile;
        }

        function onGenCodeRandom() {
            return "" + Math.round(Math.random() * 1000) + ("" + Date.now());
        }

        function checkNull(value) {
            return value !== null && value !== undefined && value !== "";
        }

        function changeCurrency(number) {
            if (number === null || isNaN(number)) {
                return "";
            }
            number = parseFloat(number).toFixed(2);
            let parts = number.toString().split(".");
            if (parts[1] === "00") {
                return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            }
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join(".");
        }

        return {onRequest}
    });

   
