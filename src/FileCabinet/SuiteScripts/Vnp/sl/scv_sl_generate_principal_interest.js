/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */

define([
        'N/ui/serverWidget',
        'N/record', 'N/redirect',
        'N/ui/message', 'N/runtime', 'N/query',
        'N/task',
        '../common/scv_common_debitloan.js',
        '../olib/lodash.min.js', '../olib/moment.js'
    ],
    (
        ui,
        record,
        redirect,
        message,
        runtime,
        query,
        task,
        cmDebitloan, _, moment) => {

        let colGeneratePrincipalInterest = [
            {label: "name", type: ui.FieldType.TEXT},
            {label: "debit/loan", type: ui.FieldType.TEXT},
            {label: "type", type: ui.FieldType.TEXT},
            {label: "payment date", type: ui.FieldType.DATE},
            {label: "rate", type: ui.FieldType.TEXT},
            {label: "amount", type: ui.FieldType.FLOAT},
            {label: "status", type: ui.FieldType.TEXT},
        ];

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            try {
                if (scriptContext.request.method === 'GET') {
                    doGetGeneratePrincipalInterest(scriptContext);
                } else {
                    doPostGeneratePrincipalandInterest(scriptContext);
                }
            } catch (e) {
                log.error('onRequest error', e);
                throw e;
            }
        };

        const doGetGeneratePrincipalInterest = (scriptContext) => {
            try {
                //get parameter
                let parameters = scriptContext.request.parameters;
                let options = {
                    subsidiary: parameters.subsidiary,
                    debitloan: _.split(parameters.debitloan, ","),
                    message: parameters.message,
                    search: parameters.search,
                };
                let form = ui.createForm({title: "Generate Principal and Interest"});
                form.addSubmitButton("Save");
                form.addButton({
                    id: "custpage_search_btn",
                    label: "Search",
                    functionName: "searchGeneratePrincipalInterest",
                });
                form.addFieldGroup({id: "maingroup", label: "Main"});
                //Add form header
                let fieldSub = form.addField({
                    id: "custpage_subsidiary",
                    label: "Subsidiary",
                    type: ui.FieldType.SELECT,
                    container: "maingroup",
                    source: "subsidiary",
                });
                if (options.subsidiary)
                    fieldSub.defaultValue = options.subsidiary;
                // fieldSub.isMandatory = true;
                fieldSub.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});
                //Debit/Loan
                let debitLoanField = form.addField({
                    id: "custpage_debitloan",
                    label: "Debit/Loan",
                    type: ui.FieldType.MULTISELECT,
                    container: "maingroup",
                    source: "customrecord_scv_loa",
                });
                if (!_.isEmpty(options.debitloan))
                    debitLoanField.defaultValue = options.debitloan;
                //type
                let f = form.addField({
                    id: "custpage_type",
                    label: "Type",
                    type: ui.FieldType.TEXT,
                });
                f.defaultValue = "Generate Principal and Interest";
                f.updateDisplayType({displayType: ui.FieldDisplayType.HIDDEN});

                if (options.search === "1") {
                    let ss = buildGeneratePrincipalInterestSublistData(options);
                    let sublist = buildGeneratePrincipalInterestSublist(form, ss.length);
                    bindingGeneratePrincipalInterestSublist(ss, sublist);
                }

                form.clientScriptModulePath = "../cssl/scv_cs_sl_generate_principal_interest.js";
                if (options.message)
                    form.addPageInitMessage({
                        type: message.Type.INFORMATION,
                        message: options.message,
                        duration: 10000,
                    });
                scriptContext.response.writePage(form);
            } catch (e) {
                log.error("doGetGeneratePrincipalInterest error", e);
            }
        }

        const doPostGeneratePrincipalandInterest = (scriptContext) => {
            try {
                let mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: "customscript_scv_mr_generate_prin_intere",
                    deploymentId: "customdeploy_scv_mr_generate_prin_intere",
                });
                mrTask.params = {
                    custscript_scv_param_loan:
                    scriptContext.request.parameters.custpage_debitloan,
                };
                mrTask.submit();
                // myCache.put({key: 'mrTaskId', value: mrTaskId});
            } catch (e) {
                log.debug("exception", e);
            }

            redirect.toSuitelet({
                scriptId: runtime.getCurrentScript().id,
                deploymentId: runtime.getCurrentScript().deploymentId,
                parameters: {
                    message: "Đang tiến hành tạo Loan Principal and Interest Spreadsheet:",
                },
            });
        }

        const buildGeneratePrincipalInterestSublistData = (options) => {
            // let ssMap = plib.searchDebitLoan(options);
            let debitLoan = options.debitloan;
            if (util.isArray(debitLoan)) {
                debitLoan = _.head(options.debitloan);
                if (!debitLoan) return [];
            }
            let recDebitLoan = record.load({
                type: "customrecord_scv_loa", //
                id: debitLoan,
            });
            let loanInterest = queryDebitLoanInterest(debitLoan);
            let arrDebitLoan = [
                "name",
                "custrecord_scv_dl_paymentterm",
                "custrecord_scv_dl_inpaymentperiod",
                "custrecord_scv_dl_prinpayperiod",
                "custrecord_scv_inspaymentdate",
                "custrecord_scv_dl_prinpaydate",
                "custrecord_scv_dl_inpaymentterm",
                "custrecord_scv_disbursementdate",
                "custrecord_scv_dl_ratetype", // rate type
                "custrecord_scv_loa_amount", // old: custrecord_scv_loa_amount
                "custrecord_scv_db_formula", //365 ngay mot nam
                "custrecord_scv_loa_currency",
            ];
            let objDebitLoan = {};
            _.map(arrDebitLoan, (o) => (objDebitLoan[o] = recDebitLoan.getValue(o)));
            let dateformat = cmDebitloan.userPreferences().dateformat;

            //lk currency

            const recCurrency = record.load({type: record.Type.CURRENCY, id: objDebitLoan.custrecord_scv_loa_currency});

            let currencyprecision = recCurrency.getValue('currencyprecision');
            log.error("Show objDebitLoan.custrecord_scv_dl_ratetype: ", objDebitLoan.custrecord_scv_dl_ratetype)

            let results = [];
            switch (objDebitLoan.custrecord_scv_dl_paymentterm) {
                case "1": //Monthly
                    if (objDebitLoan.custrecord_scv_dl_ratetype === "2") {
                        //Base on OutStanding principal
                        //binding principal
                        for (
                            let i = 0;
                            i < objDebitLoan.custrecord_scv_dl_prinpayperiod;
                            i++
                        ) {
                            let o = {};
                            let paymentDate = moment(
                                objDebitLoan.custrecord_scv_dl_prinpaydate,
                                dateformat
                            )
                                .add((i + 1), "M")
                                .format(dateformat);
                            let addM = moment(paymentDate, dateformat).format("MM");
                            let addY = moment(paymentDate, dateformat).format("YYYY");
                            o.c0 = `Principal ${objDebitLoan.name} - ${addM}.${addY}`;
                            o.c1 = objDebitLoan.name;
                            o.c2 = "Principal";
                            o.c3 = paymentDate;
                            o.c4 = "";
                            o.c5 = _.round(
                                objDebitLoan.custrecord_scv_loa_amount /
                                objDebitLoan.custrecord_scv_dl_prinpayperiod,
                                currencyprecision
                            ).toFixed(currencyprecision);
                            o.c6 = "Open";
                            o.debitloan = debitLoan;
                            o.type = "6"; //principal
                            results.push(o);
                        }
                        //binding interest
                        let lastPaymentDate = objDebitLoan.custrecord_scv_inspaymentdate;
                        let lastPayment = objDebitLoan.custrecord_scv_loa_amount;
                        let amountBalance =
                            objDebitLoan.custrecord_scv_loa_amount /
                            objDebitLoan.custrecord_scv_dl_inpaymentperiod;
                        for (
                            let i = 1;
                            i <= objDebitLoan.custrecord_scv_dl_inpaymentperiod;
                            i++
                        ) {
                            let o = {};
                            let paymentDate = moment(lastPaymentDate, dateformat)
                                .add(1, "M")
                                .format(dateformat);
                            let addM = moment(paymentDate, dateformat).format("MM");
                            let addY = moment(paymentDate, dateformat).format("YYYY");
                            o.c0 = `Interest ${objDebitLoan.name} - ${addM}.${addY}`;
                            o.c1 = objDebitLoan.name;
                            o.c2 = "Interest";
                            o.c3 = paymentDate;
                            let rate = getRateFromPaymentDate(
                                loanInterest,
                                paymentDate,
                                dateformat
                            ); //rate
                            let rateNum =
                                _.chain(rate).replace("%", "").toNumber().value() / 100;
                            let dateDiff = moment(paymentDate, dateformat).diff(
                                moment(lastPaymentDate, dateformat),
                                "days"
                            );
                            o.c4 = rate;
                            o.c5 =
                                lastPayment *
                                (rateNum / objDebitLoan.custrecord_scv_db_formula) *
                                dateDiff; // amount = 1.000.000.000*(10%/365)*31ngay
                            o.c5 = _.round(o.c5).toFixed(0);
                            o.c6 = "Open";
                            o.debitloan = debitLoan;
                            o.type = "2"; //interest
                            results.push(o);
                            lastPayment = lastPayment - amountBalance;
                            lastPaymentDate = paymentDate;
                        }
                    } else if (objDebitLoan.custrecord_scv_dl_ratetype === "1") {
                        //Base on Principal
                        //binding principal
                        for (
                            let i = 0;
                            i < objDebitLoan.custrecord_scv_dl_prinpayperiod;
                            i++
                        ) {
                            let o = {};
                            let paymentDate = moment(
                                objDebitLoan.custrecord_scv_dl_prinpaydate,
                                dateformat
                            )
                                .add((i + 1), "M")
                                .format(dateformat);
                            let addM = moment(paymentDate, dateformat).format("MM");
                            let addY = moment(paymentDate, dateformat).format("YYYY");
                            o.c0 = `Principal ${objDebitLoan.name} - ${addM}.${addY}`;
                            o.c1 = objDebitLoan.name;
                            o.c2 = "Principal";
                            o.c3 = paymentDate;
                            o.c4 = "";
                            o.c5 = _.round(
                                objDebitLoan.custrecord_scv_loa_amount /
                                objDebitLoan.custrecord_scv_dl_prinpayperiod,
                                currencyprecision
                            ).toFixed(currencyprecision);
                            o.c6 = "Open";
                            o.debitloan = debitLoan;
                            o.type = "6";
                            results.push(o);
                        }
                        //binding interest
                        let lastPaymentDate = objDebitLoan.custrecord_scv_inspaymentdate;
                        // let lastPayment = objDebitLoan.custrecord_scv_loa_amount;
                        // let amountBalance =
                        //     objDebitLoan.custrecord_scv_loa_amount /
                        //     objDebitLoan.custrecord_scv_dl_inpaymentperiod;
                        for (
                            let i = 1;
                            i <= objDebitLoan.custrecord_scv_dl_inpaymentperiod;
                            i++
                        ) {
                            let o = {};
                            // lastPayment = lastPayment - amountBalance;
                            let paymentDate = moment(lastPaymentDate, dateformat)
                                .add(1, "M")
                                .format(dateformat);
                            let addM = moment(paymentDate, dateformat).format("MM");
                            let addY = moment(paymentDate, dateformat).format("YYYY");
                            o.c0 = `Interest ${objDebitLoan.name} - ${addM}.${addY}`;
                            o.c1 = objDebitLoan.name;
                            o.c2 = "Interest";
                            o.c3 = paymentDate;
                            let rate = getRateFromPaymentDate(
                                loanInterest,
                                paymentDate,
                                dateformat
                            ); //rate
                            let rateNum =
                                _.chain(rate).replace("%", "").toNumber().value() / 100;
                            o.c4 = rate;
                            let dateDiff = moment(paymentDate, dateformat).diff(
                                moment(lastPaymentDate, dateformat),
                                "days"
                            );
                            o.c5 =
                                objDebitLoan.custrecord_scv_loa_amount *
                                (rateNum / objDebitLoan.custrecord_scv_db_formula) *
                                dateDiff; // amount = 1.000.000.000*(10%/365)*31ngay
                            o.c5 = _.round(o.c5).toFixed(0);
                            o.c6 = "Open";
                            o.debitloan = debitLoan;
                            o.type = "2";
                            results.push(o);
                            lastPaymentDate = paymentDate;
                        }
                    }
                    break;
                case "2": //Quaterly
                    //binding principal
                    for (let i = 0; i < objDebitLoan.custrecord_scv_dl_prinpayperiod; i++) {
                        let o = {};
                        let paymentDate = moment(
                            objDebitLoan.custrecord_scv_dl_prinpaydate,
                            dateformat
                        )
                            .add(3 * i, "M")
                            .format(dateformat);
                        o.c0 = `Principal ${objDebitLoan.name}`;
                        o.c1 = objDebitLoan.name;
                        o.c2 = "Principal";
                        o.c3 = paymentDate;
                        o.c4 = "";
                        o.c6 = "Open";
                        results.push(o);
                    }
                    //binding interest
                    for (
                        let i = 0;
                        i < objDebitLoan.custrecord_scv_dl_inpaymentperiod;
                        i++
                    ) {
                        let o = {};
                        let paymentDate = moment(
                            objDebitLoan.custrecord_scv_inspaymentdate,
                            dateformat
                        )
                            .add(3 * i, "M")
                            .format(dateformat);
                        o.c0 = `Interest ${objDebitLoan.name}`;
                        o.c1 = objDebitLoan.name;
                        o.c2 = "Interest";
                        o.c3 = paymentDate;
                        o.c4 = "10%";
                        o.c6 = "Open";
                        results.push(o);
                    }
                    break;
                case "3": //Yearly
                    //binding principal
                    log.error("Show objDebitLoan: ", objDebitLoan)
                    for (let i = 0; i < objDebitLoan.custrecord_scv_dl_prinpayperiod; i++) {
                        let o = {};
                        let paymentDate = moment(
                            objDebitLoan.custrecord_scv_dl_prinpaydate,
                            dateformat
                        )
                            .add(12 * i, "M")
                            .format(dateformat);
                        o.c0 = `Principal ${objDebitLoan.name}`;
                        o.c1 = objDebitLoan.name;
                        o.c2 = "Principal";
                        o.c3 = paymentDate;
                        o.c4 = "";
                        o.c6 = "Open";
                        results.push(o);
                    }
                    //binding interest
                    for (
                        let i = 0;
                        i < objDebitLoan.custrecord_scv_dl_inpaymentperiod;
                        i++
                    ) {
                        let o = {};
                        let paymentDate = moment(
                            objDebitLoan.custrecord_scv_inspaymentdate,
                            dateformat
                        )
                            .add(12 * i, "M")
                            .format(dateformat);
                        o.c0 = `Interest ${objDebitLoan.name}`;
                        o.c1 = objDebitLoan.name;
                        o.c2 = "Interest";
                        o.c3 = paymentDate;
                        o.c4 = "10%";
                        o.c6 = "Open";
                        results.push(o);
                    }
                    break;
                case "4": //Other
                    log.error("Show objDebitLoan: ", objDebitLoan);
                    if (objDebitLoan.custrecord_scv_dl_ratetype === "3") {
                        //Base on principal detail
                        //binding principal
                        for (
                            let i = 0;
                            i < objDebitLoan.custrecord_scv_dl_prinpayperiod; // custrecord_scv_dl_prinpayperiod type
                            i++
                        ) {
                            let o = {};
                            let paymentDate = moment(
                                objDebitLoan.custrecord_scv_dl_prinpaydate,
                                dateformat
                            )
                                .add((i + 1), "M")
                                .format(dateformat);
                            let addM = moment(paymentDate, dateformat).format("MM");
                            let addY = moment(paymentDate, dateformat).format("YYYY");
                            o.c0 = `Principal ${objDebitLoan.name} - ${addM}.${addY}`;
                            o.c1 = objDebitLoan.name;
                            o.c2 = "Principal";
                            o.c3 = paymentDate;
                            o.c4 = "";
                            o.c5 = _.round(
                                objDebitLoan.custrecord_scv_loa_amount /
                                objDebitLoan.custrecord_scv_dl_prinpayperiod,
                                currencyprecision
                            ).toFixed(currencyprecision);
                            o.c6 = "Open";
                            o.debitloan = debitLoan;
                            o.type = "6";
                            results.push(o);
                        }
                        //binding interest
                        // let principalDetail = plib.searchPrincipalDetail({});
                        let principalDetail = queryPrincipalDetail(debitLoan);
                        let lastPaymentDate = objDebitLoan.custrecord_scv_inspaymentdate;
                        let disbursementdate = objDebitLoan.custrecord_scv_disbursementdate;
                        //let lastPayment = objDebitLoan.custrecord_scv_loa_amount;
                        let loanAmt = objDebitLoan.custrecord_scv_loa_amount;
                        for (
                            let i = 1;
                            i <= objDebitLoan.custrecord_scv_dl_inpaymentperiod;
                            i++
                        ) {
                            let o = {};
                            let paymentDate = moment(lastPaymentDate, dateformat)
                                .add(1, "M")
                                .format(dateformat);
                            //check if ngay khoi tao la ngay cuoi thang
                            if (
                                lastPaymentDate ===
                                moment(lastPaymentDate, dateformat)
                                    .endOf("month")
                                    .format(dateformat)
                            ) {
                                paymentDate = moment(paymentDate, dateformat)
                                    .endOf("month")
                                    .format(dateformat);
                            }
                            if (i === 1) {
                                paymentDate = moment(lastPaymentDate).format(dateformat);
                            }
                            let addM = moment(paymentDate, dateformat).format("MM");
                            let addY = moment(paymentDate, dateformat).format("YYYY");
                            o.c0 = `Interest ${objDebitLoan.name} - ${addM}.${addY}`;
                            o.c1 = objDebitLoan.name;
                            o.c2 = "Interest";
                            o.c3 = paymentDate;
                            let rate = getRateFromPaymentDate(
                                loanInterest,
                                paymentDate,
                                dateformat
                            ); //rate
                            let rateNum =
                                _.chain(rate).replace("%", "").toNumber().value() / 100;
                            o.c4 = rate;
                            let dateDiff = moment(paymentDate, dateformat).diff(
                                moment(lastPaymentDate, dateformat),
                                "days"
                            );
                            if (i === 1)
                                dateDiff =
                                    moment(paymentDate, dateformat).diff(
                                        moment(disbursementdate, dateformat),
                                        "days"
                                    ) + 1;
                            o.c5 =
                                loanAmt *
                                (rateNum / objDebitLoan.custrecord_scv_db_formula) *
                                dateDiff; // amount = 1.000.000.000*(10%/365)*31ngay
                            o.c5 = _.round(o.c5, currencyprecision).toFixed(currencyprecision);
                            o.c6 = "Open";
                            o.debitloan = debitLoan;
                            o.type = "2"; //interest
                            o.loanAmt = loanAmt;
                            results.push(o);
                            lastPaymentDate = paymentDate;
                        }
                        _.map(principalDetail, function (o) {
                            let addM = moment(o.paymentdate, dateformat).format("MM");
                            let addY = moment(o.paymentdate, dateformat).format("YYYY");
                            let rate = getRateFromPaymentDate(
                                loanInterest,
                                o.paymentdate,
                                dateformat
                            ); //rate
                            results.push({
                                c0: `Interest ${objDebitLoan.name} - ${addM}.${addY}`,
                                c1: objDebitLoan.name,
                                c2: "Interest",
                                c3: o.paymentdate,
                                c4: rate,
                                c5: "",
                                c6: "Open",
                                debitloan: debitLoan,
                                type: "7",
                                loanAmt: loanAmt,
                            });
                            results.push({
                                c0: `Principal ${objDebitLoan.name} - ${addM}.${addY}`,
                                c1: objDebitLoan.name,
                                c2: "Principal",
                                c3: o.paymentdate,
                                c4: "",
                                c5: o.amount,
                                c6: "Open",
                                debitloan: debitLoan,
                                type: "7",
                                loanAmt: loanAmt,
                            });
                        });
                        //sort
                        results = _.sortBy(results, function (o) {
                            return moment(o.c3, dateformat).format("YYYYMMDD");
                        });
                        //recalc principal loan
                        let loanAmtChange = loanAmt;
                        util.each(results, function (o) {
                            o.loanAmt = loanAmtChange;
                            let findPayment = _.find(principalDetail, {
                                paymentdate: o.c3,
                                amount: o.c5,
                            });
                            if (!_.isEmpty(findPayment)) loanAmtChange -= o.c5;
                        });
                        //recals amount
                        util.each(results, function (o, i) {
                            if (!(o.c4 || o.c4 === 0)) return true;
                            let dateDiff = moment(o.c3, dateformat).diff(
                                moment(lastPaymentDate, dateformat),
                                "days"
                            );
                            if (i === 0)
                                dateDiff =
                                    moment(o.c3, dateformat).diff(
                                        moment(disbursementdate, dateformat),
                                        "days"
                                    ) + 1;
                            let rateNum =
                                _.chain(o.c4).replace("%", "").toNumber().value() / 100;
                            o.c5 =
                                o.loanAmt *
                                (rateNum / objDebitLoan.custrecord_scv_db_formula) *
                                dateDiff; // amount = 1.000.000.000*(10%/365)*31ngay
                            o.c5 = _.round(o.c5, currencyprecision).toFixed(currencyprecision);
                            lastPaymentDate = o.c3;
                        });
                    }
                    break;
            }
            return results;
        }

        const buildGeneratePrincipalInterestSublist = (form, length) => {
            let searchSubList = form.addSublist({
                id: "search_sublist",
                type: ui.SublistType.LIST,
                label: `Results(${length})`,
            });
            // searchSubList.addMarkAllButtons();
            // searchSubList.addRefreshButton();
            util.each(colGeneratePrincipalInterest, function (o, i) {
                let sublistField = searchSubList.addField({
                    id: `c${i}`,
                    type: o.type,
                    label: o.label,
                });
                if (_.get(o, "displayType", "") !== "")
                    sublistField.updateDisplayType({displayType: o.displayType});
            });
            return searchSubList;
        }

        const bindingGeneratePrincipalInterestSublist = (ss, sublist) => {
            util.each(ss, function (o, i) {
                addSublistRow(o, sublist, i);
            });
        }

        const addSublistRow = (options, sublist, i) => {
            util.each(_.keys(options), function (o) {
                if (_.defaultTo(options[o], "")) {
                    try {
                        sublist.setSublistValue({
                            id: o,
                            line: i,
                            value: options[o],
                        });
                    } catch (e) {
                        log.error("can not set " + o, options[o]);
                    }
                }
            });
        }

        const getRateFromPaymentDate = (loanInterest, paymentDatein, dateFormat) => {
            let paymentDate = moment(paymentDatein, dateFormat).add(-1, "d");
            let rate = "";
            util.each(loanInterest, (o) => {
                if (
                    moment(o.startdate, dateFormat) <= paymentDate &&
                    paymentDate <= moment(o.enddate, dateFormat)
                ) {
                    rate = strip(o.rate * 100) + "%";
                }
            });
            return rate;
        }

        const queryPrincipalDetail = (loanId) => {
            try {
                // Query definition
                let objQuery = query.create({type: "customrecord_scv_loa"});
                // Columns
                objQuery.columns = [
                    objQuery.createColumn({
                        alias: "paymentdate",
                        fieldId:
                            "custrecord_scv_db_pd_debit_loan<customrecord_scv_db_principal_detail.custrecord_scv_db_pd_start_date",
                    }),
                    objQuery.createColumn({
                        alias: "amount",
                        fieldId:
                            "custrecord_scv_db_pd_debit_loan<customrecord_scv_db_principal_detail.custrecord_scv_db_pd_amount",
                    }),
                ];

                // Conditions
                let conditionList = [];
                if (loanId)
                    conditionList.push(
                        objQuery.createCondition({
                            operator: query.Operator.EQUAL,
                            values: loanId,
                            fieldId: "id",
                        })
                    );

                objQuery.condition = objQuery.and(conditionList);
                // Paged execution
                let objPagedData = objQuery.runPaged({pageSize: 1000});
                // Paging
                let arrResults = [];
                objPagedData.pageRanges.forEach(function (pageRange) {
                    let objPage = objPagedData.fetch({index: pageRange.index}).data;

                    // Map results to columns
                    arrResults.push.apply(arrResults, objPage.asMappedResults());
                });
                return arrResults;
            } catch (e) {
                log.error("queryPrincipalDetail error", e);
            }
        }

        const queryDebitLoanInterest = (loan) => {
            try {
                // Query definition
                let objQuery = query.create({type: "customrecord_scv_loa"});
                // Columns
                objQuery.columns = [
                    objQuery.createColumn({
                        alias: "startdate",
                        fieldId:
                            "custrecord_scv_interparent<customrecord_scv_interrestdetail.custrecord_scv_idstartdate",
                    }),
                    objQuery.createColumn({
                        alias: "enddate",
                        fieldId:
                            "custrecord_scv_interparent<customrecord_scv_interrestdetail.custrecord_scv_id_enddate",
                    }),
                    objQuery.createColumn({
                        alias: "rate",
                        fieldId:
                            "custrecord_scv_interparent<customrecord_scv_interrestdetail.custrecord_scv_id_rate",
                    }),
                ];

                // Conditions
                let conditionList = [];
                conditionList.push(
                    objQuery.createCondition({
                        operator: query.Operator.EQUAL,
                        values: loan,
                        fieldId: "id",
                    })
                );

                objQuery.condition = objQuery.and(conditionList);
                // Paged execution
                let objPagedData = objQuery.runPaged({pageSize: 1000});
                // Paging
                let arrResults = [];
                objPagedData.pageRanges.forEach(function (pageRange) {
                    let objPage = objPagedData.fetch({index: pageRange.index}).data;

                    // Map results to columns
                    arrResults.push.apply(arrResults, objPage.asMappedResults());
                });
                return arrResults;
            } catch (e) {
                log.error("queryDebitLoanInterest error", e);
            }
        }

        const strip = (number) => {
            return (parseFloat(number.toPrecision(12)));
        }

        return {onRequest}
    });


