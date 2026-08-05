/**
 * @NApiVersion 2.1
 */
define(['N/format', 'N/url', 'N/https', 'N/http', 'N/query', '../olib/lodash.min', 'N/ui/dialog', 'N/record', 'N/search'],
    /**
     * @param{format} format
     */
    function (format, url, https, http, query, _, dialog, record, search) {

        function getNowDate() {
            var stNow = new Date();
            //vietnam +7
            stNow.setMilliseconds((3600000 * 7));
            var stYear = stNow.getUTCFullYear();
            var stMonth = stNow.getUTCMonth();
            var stDate = stNow.getUTCDate();
            var stHours = stNow.getUTCHours();
            var stMinutes = stNow.getUTCMinutes();
            // log.audit('Hours', stHours);
            // log.audit('Minutes', stMinutes);
            stNow = new Date(stYear, stMonth, stDate);
            return stNow;
        }

        function getToday() {
            var todayDate = moment(getNowDate());
            var ret = {};
            ret.ngay = todayDate.format('D');
            ret.thang = todayDate.format('M');
            ret.nam = todayDate.format('YYYY');
            return ret;
        }

        function getParameterFromURL(param) {
            var query = window.location.search.substring(1);
            var vars = query.split("&");
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split("=");
                if (pair[0] == param) {
                    return decodeURIComponent(pair[1]);
                }
            }
            return (false);
        }

        function isEmpty(obj) {

            if (obj === undefined || obj == null || obj === '') {
                return true;
            }
            if (obj.length && obj.length > 0) {
                return false;
            }
            if (obj.length === 0) {
                return true;
            }
            for (var key in obj) {
                if (hasOwnProperty.call(obj, key)) {
                    return false;
                }
            }
            if (typeof (obj) == 'boolean') {
                return false;
            }
            if (typeof (obj) == 'number') {
                return false;
            }

            return true;
        }

        /**
         *var _dateformat
         clib.getDateFormat(function (dateformat) {
            _dateformat = dateformat;
            alert(dateformat);
        });
         * @param {Function} callback
         */
        function getDateFormat(callback) {
            try {
                var buildUrl = url.resolveScript({
                    scriptId: 'customscript_scv_rl_backend',
                    deploymentId: 'customdeploy_scv_rl_backend'
                });
                var bodyObj = {};
                bodyObj.flag = '8';
                bodyObj.body = {data: 'request dateformat'};
                https.post.promise({
                    url: buildUrl,
                    body: JSON.stringify(bodyObj)
                }).then(function (response) {
                    var obj = JSON.parse(response.body);
                    callback(obj.dateformat);
                })
                    .catch(function onRejected(reason) {
                        console.log('post error:' + JSON.stringify(reason));
                    });
            } catch (e) {
                log.error('getDateFormat error', JSON.stringify(e));
            }
        }

        /**
         *
         * @param {Object} options
         * @param {string} options.title
         * @param {string} options.message
         * @return {void}
         */
        function alert(options) {
            // var optionsDialog = {title: options.title, message: options.message};
            function success(result) {
                console.log('Success with value ' + result);
            }

            function failure(reason) {
                console.log('Failure: ' + reason);
            }

            dialog.alert(options).then(success).catch(failure);
        }

        var IS_CONFIRMED = false;
        var CHECKOK = false;

        /**
         *
         * @param {Object} options
         * @param {string} options.title
         * @param {string} options.message
         * @param {string} [options.elementId='submitter']
         * @return {boolean}
         */
        function confirm(options) {
            //Popup confirm
            if (!IS_CONFIRMED) {
                var optionsDialog = {
                    title: options.title,
                    message: options.message,
                    //buttons: [button1, button2, button3]
                };

                function success(result) {
                    IS_CONFIRMED = true;
                    CHECKOK = result;

                    if (isEmpty(options.elementId))
                        document.getElementById('submitter').click();
                    else
                        document.getElementById(options.elementId).click();
                }

                function failure(reason) {
                    console.log("Failure: " + reason);
                }

                dialog.confirm(optionsDialog).then(success).catch(failure);
            } else {
                IS_CONFIRMED = false;
                return CHECKOK;
            }
        }

        /**
         *
         * @param {Object} options
         * @param {string} [options.itemId]
         * @param {string} options.subsidiary
         * @returns {[]}
         */
        function getItemOnSub(options) {
            try {
                // Query definition
                var objQuery = query.create({type: query.Type.ITEM});
                // Columns
                objQuery.columns = [
                    objQuery.createColumn({
                        alias: 'id',
                        fieldId: 'id'
                    }),
                    objQuery.createColumn({
                        alias: 'itemid',
                        fieldId: 'itemid'
                        // context: query.FieldContext.DISPLAY
                    }),
                    objQuery.createColumn({
                        alias: 'parent',
                        fieldId: 'parent'
                    }),
                    objQuery.createColumn({
                        alias: 'subsidiary',
                        fieldId: 'subsidiary'
                    })
                ]
                // Conditions
                var conditionList = [];
                /*conditionList.push(objQuery.createCondition({
                    "operator": 'MN_INCLUDE',
                    "values": [options.subsidiary],
                    "fieldId": "subsidiary"
                }));*/
                conditionList.push(objQuery.createCondition({
                    "operator": query.Operator.ANY_OF,
                    "values": [options.subsidiary],
                    "fieldId": "subsidiary.id"
                }));
                if (!isEmpty(options.itemId))
                    conditionList.push(objQuery.createCondition({
                        "operator": query.Operator.EQUAL,
                        "values": [options.itemId],
                        "fieldId": "id"
                    }));
                conditionList.push(objQuery.createCondition({
                    "operator": query.Operator.IS,
                    "values": false,
                    "fieldId": "isinactive"
                }));

                objQuery.condition = objQuery.and(conditionList);
                // Paged execution
                var objPagedData = objQuery.runPaged({pageSize: 1000});
                // Paging
                var arrResults = [];
                objPagedData.pageRanges.forEach(function (pageRange) {
                    var objPage = objPagedData.fetch({index: pageRange.index}).data;
                    // Map results to columns
                    arrResults.push.apply(arrResults, objPage.asMappedResults());
                });

                /*var newArrResults = _.reject(arrResults, function (obj) {
                    return _.split(obj.subsidiary, ',').length > 1;
                });
                if (util.isArray(newArrResults) && newArrResults.length > 0)
                    return newArrResults[0].id;
                else return '';*/
                if (!isEmpty(options.itemId) && arrResults.length > 0)
                    return options.itemId;
                else
                    return arrResults;
            } catch (e) {
                log.error('getItemOnSub error', JSON.stringify(e));
            }
        }

        /**
         *
         * @param {Object} options
         * @param {string} options.parent
         * @param {string} options.subsidiary
         * @returns {*}
         */
        function getItemOnParentSub(options) {
            try {
                // Query definition
                var objQuery = query.create({type: query.Type.ITEM});
                // Columns
                objQuery.columns = [
                    objQuery.createColumn({
                        alias: 'id',
                        fieldId: 'id',
                    }),
                    objQuery.createColumn({
                        alias: 'itemid',
                        fieldId: 'itemid',
                        // context: query.FieldContext.DISPLAY
                    }),
                    objQuery.createColumn({
                        alias: 'parent',
                        fieldId: 'parent',
                    }),
                    objQuery.createColumn({
                        alias: 'subsidiary',
                        fieldId: 'subsidiary',
                    }),
                ]
                // Conditions
                var conditionList = [];
                /*conditionList.push(objQuery.createCondition({
                    "operator": 'MN_INCLUDE',
                    "values": [options.subsidiary],
                    "fieldId": "subsidiary"
                }));*/
                conditionList.push(objQuery.createCondition({
                    "operator": query.Operator.ANY_OF,
                    "values": [options.subsidiary],
                    "fieldId": "subsidiary.id"
                }));
                conditionList.push(objQuery.createCondition({
                    "operator": query.Operator.ANY_OF,
                    "values": [options.parent],
                    "fieldId": "parent"
                }));
                conditionList.push(objQuery.createCondition({
                    "operator": query.Operator.IS,
                    "values": false,
                    "fieldId": "isinactive"
                }));

                objQuery.condition = objQuery.and(conditionList);
                // Paged execution
                var objPagedData = objQuery.runPaged({pageSize: 1000});
                // Paging
                var arrResults = [];
                objPagedData.pageRanges.forEach(function (pageRange) {
                    var objPage = objPagedData.fetch({index: pageRange.index}).data;
                    // Map results to columns
                    arrResults.push.apply(arrResults, objPage.asMappedResults());
                });
                /*var newArrResults = _.reject(arrResults, function (obj) {
                    return _.split(obj.subsidiary, ',').length > 1;
                });
                if (util.isArray(newArrResults) && newArrResults.length > 0)
                    return newArrResults[0].id;
                else return '';*/
                if (util.isArray(arrResults) && arrResults.length > 0)
                    return arrResults[0].id;
            } catch (e) {
                log.error('getItem error', JSON.stringify(e));
            }
        }

        /**
         *
         * @param {Object} options
         * @param {string} options.item
         * @param {string} options.subsidiary
         */
        function getItemOnInterSub(options) {
            var parrentItem = lookupParentItem(options.item);
            var itemOnSOSub;
            if (isEmpty(parrentItem)) {
                itemOnSOSub = getItemOnParentSub(options.item, options.subsidiary);
                if (isEmpty(itemOnSOSub)) {
                    itemOnSOSub = getItemOnSub(options.item, options.subsidiary);
                }
            } else {
                itemOnSOSub = getItemOnParentSub(parrentItem, options.subsidiary);
                if (isEmpty(itemOnSOSub)) {
                    itemOnSOSub = getItemOnSub(parrentItem, options.subsidiary);
                }
            }
        }

        /**
         * run on client script
         * @param {Object} options
         * @param {string} [options.url]
         * @param {string} options.flag
         * @param {Object} options.body
         * @param {number} [options.scriptNumber]
         */
        function postClientData(options, callback) {
            try {
                if (isEmpty(options.scriptNumber))
                    options.scriptNumber = '';
                if (isEmpty(options.url))
                    options.url = url.resolveScript({
                        scriptId: 'customscript_scv_rl_backend' + options.scriptNumber,
                        deploymentId: 'customdeploy_scv_rl_backend' + options.scriptNumber
                    });

                https.post.promise({
                    url: options.url,
                    body: JSON.stringify(options)
                }).then(function (response) {
                    var obj = JSON.parse(response.body);
                    console.log('response:' + response.body);
                    if (typeof callback == "function")
                        callback(response);
                }).catch(function onRejected(reason) {
                    console.log('postData error:' + JSON.stringify(reason));
                });
            } catch (e) {
                console.log('postClientData error', JSON.stringify(e));
            }
        }

        /**
         * run on client script
         * @param {Object} options
         * @param {string} options.url
         * @param {Object} options.body
         */
        function postHttp(options, callback) {
            try {
                var headerObj = {
                    name: 'Accept-Language',
                    value: 'en-us'
                };
                http.post.promise({
                    url: options.url,
                    body: JSON.stringify(options.body),
                    headers: headerObj
                }).then(function (response) {
                    var obj = JSON.parse(response.body);
                    console.log('response:' + response.body);
                    if (typeof callback == "function")
                        callback(response);
                }).catch(function onRejected(reason) {
                    console.log('postData error:' + JSON.stringify(reason));
                });
            } catch (e) {
                console.log('postHttp error', JSON.stringify(e));
            }
        }

        /**
         * run on client script, post to handle on suitele post method
         * @param {Object} options
         * @param {string} options.urlSuitelet url to suitelet
         * @param {Object} options.postdata is object post data
         */
        function postToSuitelet(options, callback) {
            try {
                var header = [];
                header['Content-Type'] = 'application/json';
                var response = https.post.promise({
                    url: options.urlSuitelet,
                    headers: header,
                    body: JSON.stringify(options.postdata)
                });
                response.then(
                    function (responseObj) {
                        var bodyRes = responseObj.body;
                        console.log('respone body:' + bodyRes);
                        // window.open(options.url);
                        if (typeof callback == "function")
                            callback(responseObj);
                    },
                    function (error) {
                        console.log('postToSuitelet error:' + JSON.stringify(error));
                    }
                );
            } catch (e) {
                console.log('postToSuitelet error', JSON.stringify(e));
            }
        }

        /**
         * run on server script
         * @param {Object} options
         * @param {string} options.flag
         * @param {string} options.body
         * @param {string} [options.scriptNumber]
         */
        function postServerData(options) {
            try {
                var myRestletHeaders = {
                    // myHeaderType: 'Test',
                    // myHeaderStuff: 'This is my header',
                    // myHeaderId: 7,
                    'Content-Type': 'application/json'
                    // 'Content-Type': 'text/plain'
                };
                var myRestletResponse = https.requestRestlet({
                    scriptId: 'customscript_scv_rl_backend' + _.defaultTo(options.scriptNumber, ''),
                    deploymentId: 'customdeploy_scv_rl_backend' + _.defaultTo(options.scriptNumber, ''),
                    headers: myRestletHeaders,
                    method: https.Method.POST,
                    body: JSON.stringify(options),
                    // urlParams: myUrlParameters
                });
                return myRestletResponse;
            } catch (e) {
                log.error('postServerData error', JSON.stringify(e));
            }
        }

        /**
         * return vendor price of vendor that bill created with item
         * @param {Object} options
         * @param {string} options.id item id
         * @returns {*}
         */
        function getVendorPriceForBillItem(options) {
            try {
                // Query definition
                var objQuery = query.create({type: query.Type.ITEM});
                // Columns
                objQuery.columns = [
                    objQuery.createColumn({
                        alias: 'vendorprice',
                        fieldId: 'itemvendor.purchaseprice',
                    }),

                ]
                // Conditions
                var conditionList = [];
                conditionList.push(objQuery.createCondition({
                    "operator": query.Operator.EQUAL,
                    "values": [options.id],
                    "fieldId": "id"
                }));

                objQuery.condition = objQuery.and(conditionList);
                // Paged execution
                var objPagedData = objQuery.runPaged({pageSize: 1000});
                // Paging
                var arrResults = [];
                objPagedData.pageRanges.forEach(function (pageRange) {
                    var objPage = objPagedData.fetch({index: pageRange.index}).data;

                    // Map results to columns
                    arrResults.push.apply(arrResults, objPage.asMappedResults());
                });
                if (!_.isEmpty(arrResults))
                    return arrResults[0].vendorprice;
                else return 0;
            } catch (e) {
                log.error('getVendorPriceForBillItem error', JSON.stringify(e));
            }
        }

        /**
         *
         * @param {Object} options
         * @param {string} options.id customer id
         * @returns {string|*}
         */
        function getCustomerPriceLevelSO(options) {
            try {
                // Query definition
                var objQuery = query.create({type: query.Type.CUSTOMER});
                // Columns
                objQuery.columns = [
                    objQuery.createColumn({
                        alias: 'pricelevel',
                        fieldId: 'pricelevel',
                    }),

                ]
                // Conditions
                var conditionList = [];
                conditionList.push(objQuery.createCondition({
                    "operator": query.Operator.EQUAL,
                    "values": [options.id],
                    "fieldId": "id"
                }));

                objQuery.condition = objQuery.and(conditionList);
                // Paged execution
                var objPagedData = objQuery.runPaged({pageSize: 1000});
                // Paging
                var arrResults = [];
                objPagedData.pageRanges.forEach(function (pageRange) {
                    var objPage = objPagedData.fetch({index: pageRange.index}).data;

                    // Map results to columns
                    arrResults.push.apply(arrResults, objPage.asMappedResults());
                });
                if (!_.isEmpty(arrResults))
                    return arrResults[0].pricelevel;
                else return '';
            } catch (e) {
                log.error('getPriceLevelSO error', JSON.stringify(e));
            }
        }

        /**
         * listYeucau, subsidiary, vendor, location, orderType
         * @param {Object} options
         * @param {Array} options.items
         * @param {string} options.subsidiary
         * @param {string} options.vendor
         * @param {string} options.location
         * @param {string} options.ordertype
         * @return {*|number}
         */
        function createPO(options) {
            try {
                var recPO = record.create({
                    type: record.Type.PURCHASE_ORDER,
                    isDynamic: true,
                    defaultValues: {
                        entity: options.vendor
                    }
                });
                // recPO.setValue({fieldId: 'entity', value: options.vendor});
                // recPO.setValue({fieldId: 'subsidiary', value: options.subsidiary});
                recPO.setValue({fieldId: 'location', value: options.location});
                recPO.setValue({fieldId: 'custbody_scv_order_type', value: options.ordertype});
                util.each(options.items, function (item, i) {
                    recPO.selectNewLine({sublistId: 'item'});
                    recPO.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        value: item.item,
                        // line: i,
                        // fireslavingsync: true,
                        // forceSyncSourcing: true
                    });
                    recPO.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        value: item.soluong,
                        // line: i,
                        // fireSlavingSync: true,
                        // forceSyncSourcing: true
                    });
                    recPO.setCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_scv_pur_requisition',
                        value: item.id,
                    });
                    recPO.commitLine({sublistId: 'item'});
                });
                var recPOId = recPO.save({enableSourcing: false, ignoreMandatoryFields: true});
                return recPOId;
            } catch (e) {
                log.error('createPO error', JSON.stringify(e));
            }
        }

        /**
         *
         * @param {Object} options
         * @param {string} options.entity
         * @param {string} options.trandate
         * @param {string} options.subsidiary
         * @param {string} options.account
         * @param {string} options.amount
         * @return {*|number}
         */
        function createExpenseBill(options) {
            try {
                var billRec = record.create({
                    type: record.Type.VENDOR_BILL,
                    defaultValues: {
                        entity: options.entity
                    }
                });
                /*//Vendor Chu Hop Dong
                billRec.setValue({
                    fieldId: 'entity',
                    value: options.entity,
                    ignoreFieldChange: true
                });*/
                //Ngay nhap mia
                billRec.setValue({
                    fieldId: 'trandate',
                    value: format.parse({value: options.trandate, type: format.Type.DATE}),
                    ignoreFieldChange: true
                });
                //set entity se tu dong set subsidiary theo entity do
                /*//subsidiary
                billRec.setValue({
                    fieldId: 'subsidiary',
                    value: options.subsidiary,
                    ignoreFieldChange: true
                });*/
                //Set account
                billRec.setSublistValue({
                    sublistId: 'expense',
                    fieldId: 'account',
                    line: 0,
                    value: options.account
                    // value: getAccountPreference().EXPENSEACCOUNT
                });
                //Set amount
                billRec.setSublistValue({
                    sublistId: 'expense',
                    fieldId: 'amount',
                    line: 0,
                    value: options.amount
                });
                var billRecId = billRec.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                );
                return billRecId;
            } catch (e) {
                log.error('createBill error', JSON.stringify(e));
            }
        }

        /**
         *
         * @param {Object} options
         * @param {string} options.entity
         * @param {string} options.trandate
         * @param {string} options.subsidiary
         * @param {string} options.account
         * @param {string} options.amount
         * @param {Array} options.items
         * @return {*|number}
         */

        function createItemBill(options) {
            try {
                var billRec = record.create({
                    type: record.Type.VENDOR_BILL,
                    defaultValues: {
                        entity: options.entity
                    },
                    isDynamic: true
                });
                /*//Vendor
                billRec.setValue({
                    fieldId: 'entity',
                    value: options.entity,
                    ignoreFieldChange: true
                });*/
                //trandate
                billRec.setValue({
                    fieldId: 'trandate',
                    value: format.parse({value: options.trandate, type: format.Type.DATE}),
                    ignoreFieldChange: true
                });
                //set entity se tu dong set subdiary theo entity do
                /*//subsidiary
                billRec.setValue({
                    fieldId: 'subsidiary',
                    value: options.subsidiary,
                    ignoreFieldChange: true
                });*/
                //Set sublist
                util.each(options.items, function (item) {
                    billRec.selectNewLine({sublistId: "item"});
                    billRec.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "item",
                        value: item.item
                    });
                    billRec.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "quantity",
                        value: item.quantity
                    });
                    billRec.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "rate",
                        value: item.rate
                    });
                    billRec.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "location",
                        value: item.location
                    });
                    billRec.commitLine({sublistId: 'item'});
                });

                var billRecId = billRec.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                );
                return billRecId;
            } catch (e) {
                log.error('createBill error', JSON.stringify(e));
            }
        }

        /**
         *
         * @param {Object} options
         * @param {string} options.orderType
         * @param {string} options.customer
         * @param {string} options.subsidiary
         * @param {string} options.location
         * @param {string} options.trandate
         * @param {string} options.department
         * @param {Array} options.items
         * @return {number|*}
         */
        function createSO(options) {
            var newSORec = record.create({
                type: record.Type.SALES_ORDER,
                isDynamic: true,
                defaultValues: {
                    entity: options.customer
                }
            });
            // newSORec.setValue("entity", options.customer);
            // newSORec.setValue("subsidiary", options.subsidiary);
            newSORec.setValue("location", options.location);
            newSORec.setValue("custbody_scv_order_type", options.orderType);
            newSORec.setValue("trandate", options.trandate);
            // newSORec.setValue("custbody_scv_created_transaction", soRec.id);
            newSORec.setValue("department", options.department);
            newSORec.setValue("orderstatus", "B");

            util.each(options.items, function (o) {
                newSORec.selectNewLine({sublistId: "item"});
                newSORec.setCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "item",
                    value: o.item
                });
                newSORec.setCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "quantity",
                    value: o.quantity
                });
                //rate auto fill
                newSORec.setCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "price",
                    value: o.price
                });
                newSORec.commitLine({sublistId: 'item'});
            });

            newSORec.save({enableSourcing: false, ignoreMandatoryFields: true});
        }

        /**
         * add this script to beforeSubmit
         *                   var sophieu = generateSoPhieu({
                        recordType: ['check', 'vprep', 'vendpymt', 'deposit', 'custdep', 'custpymt'],
                        fieldId: 'custbody_scv_doc_number',
                        prefix: prefix,
                        lengthOfNumber: 3
                    });
         newRecord.setValue('custbody_scv_doc_number', sophieu);  19-05/21-VTB-C050

         /**
         * add this script to afterSubmit
         * @param {Object} options
         * @param {string} options.recordType - record type to be generate
         * @param {string} options.fieldId - sophieu
         * @param {string} options.prefix - prefix of so phieu to be fix
         * @param {string} options.lengthOfNumber - length of counter number
         * @return {[]}
         */
        function generateSoPhieu(options) {
            try {
                // Query definition
                var objQuery = query.create({type: query.Type.TRANSACTION});
                // Columns
                objQuery.columns = [
                    objQuery.createColumn({
                        alias: 'sophieu',
                        formula: "TO_NUMBER(SUBSTR({custbody_scv_doc_number},LENGTH({custbody_scv_doc_number})-2))",
                        //formula: "TO_NUMBER(SUBSTR({custbody_scv_doc_number}, LENGTH('" + options.prefix + "')+1))",
                        type: query.ReturnType.FLOAT,
                        aggregate: query.Aggregate.MAXIMUM
                    })
                ]
                // Conditions
                var conditionList = [];
                conditionList.push(objQuery.createCondition({
                    "operator": query.Operator.ANY_OF,
                    "values": options.recordType,
                    "fieldId": 'type'
                }));
                conditionList.push(objQuery.createCondition({
                    "operator": query.Operator.CONTAIN,
                    "values": [options.prefix],
                    "fieldId": options.fieldId
                }));
                conditionList.push(objQuery.createCondition({
                    "operator": query.Operator.EQUAL,
                    "values": options.prefix.length + options.lengthOfNumber,
                    "formula": "LENGTH({custbody_scv_doc_number})",
                    "type": query.ReturnType.FLOAT
                }));

                conditionList.push(objQuery.createCondition({
                    "operator": query.Operator.CONTAIN_NOT,
                    "values": ['NaN'],
                    "fieldId": options.fieldId
                }));

                objQuery.condition = objQuery.and(conditionList);
                // Paged execution
                var objPagedData = objQuery.runPaged({pageSize: 1000});
                // Paging
                var arrResults = [];
                objPagedData.pageRanges.forEach(function (pageRange) {
                    var objPage = objPagedData.fetch({index: pageRange.index}).data;

                    // Map results to columns
                    arrResults.push.apply(arrResults, objPage.asMappedResults());
                });

                var sophieuToSet = 0;
                if (arrResults.length > 0)
                    sophieuToSet = arrResults[0].sophieu;
                return options.prefix + _.padStart(sophieuToSet + 1, options.lengthOfNumber, '0');

            } catch (e) {
                log.error('generateSoPhieu error', JSON.stringify(e));
            }
        }

        /**
         *
         * @param {Object} options
         * @param {string} options.item
         * @returns {*}
         */
        function lookupParentItem(options) {
            try {
                var parentItemRet;
                var lookupField = search.lookupFields({
                    type: search.Type.ITEM,
                    id: options.item,
                    columns: ['parent']
                });
                var parentItem = lookupField.parent;
                if (util.isArray(parentItem) && parentItem.length > 0)
                    parentItemRet = parentItem[0].value
                return parentItemRet;
            } catch (e) {
                log.error('lookupParentItem error', JSON.stringify(e));
            }
        }

        /**
         * var result1 = strip(1555100 * 0.001);
         * @param number
         * @return {number}
         */
        function strip(number) {
            return (parseFloat(number.toPrecision(12)));
        }

        function searchData(id, filters, cols) {
            var objSearch = search.load({id: id});
            var ss = [];
            util.each(filters, function (f) {
                objSearch.filters.push(f);
            });
            var columns = objSearch.columns;
            var transactionSearchPagedData = objSearch.runPaged({pageSize: 1000});
            for (var i = 0; i < transactionSearchPagedData.pageRanges.length; i++) {
                var transactionSearchPage = transactionSearchPagedData.fetch({index: i});
                transactionSearchPage.data.forEach(function (result) {
                    var obj = {};
                    if (_.isEmpty(cols)) {
                        util.each(columns, function (col) {
                            obj[col.label] = result.getValue(col);
                            try {
                                if (result.getValue(col) && result.getText(col) != null)
                                    obj[col.label + '_text'] = result.getText(col);
                            } catch (e) {

                            }
                        });
                    } else {
                        util.each(cols, function (c) {
                            if (c == 'id') { //if col have id
                                obj[c] = result.id;
                            } else if (_.last(_.split(c, '_')) == 'text') {//if col as name_text
                                var findColumn = _.find(columns, {label: _.head(_.split(c, '_'))});
                                if (!_.isEmpty(findColumn))
                                    obj[c] = result.getText(findColumn);
                            } else {
                                var findColumn = _.find(columns, {label: c});
                                if (!_.isEmpty(findColumn))
                                    obj[c] = result.getValue(findColumn);
                            }
                        });
                    }
                    ss.push(obj);
                });
            }
            return ss;
        }

        function convertSS2ShowInSublist(ss) {
            var newSS = [];
            util.each(ss, function (o) {
                var obj = {};
                _.map(o, function (value, key) {
                    obj[xoa_dau(key)] = value;
                });
                newSS.push(obj);
            });
            return newSS
        }

        function xoa_dau(str) {
            str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
            str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
            str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
            str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
            str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
            str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
            str = str.replace(/đ/g, "d");
            str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
            str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
            str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
            str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
            str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
            str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
            str = str.replace(/Đ/g, "D");
            //Loại bỏ tất cả các kí tự không phải chữ cái và số
            str = str.replace(/[^0-9a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s]/gi, '');
            //xoa dau cach
            // Gộp nhiều dấu space thành empty
            str = str.replace(/\s+/g, '');
            // loại bỏ toàn bộ dấu space (nếu có) ở 2 đầu của xâu
            str.trim();
            //cho thanh lower
            str = _.toLower(str);
            return str;
        }

        function getRecordData(rec, sublistId, body, sublist) {
            var bodyObj = {};
            util.each(body, function (o) {
                if (_.includes(o, 'text')) {
                    var colName = _(o).split('-').head();
                    bodyObj[colName] = rec.getText(colName);
                } else
                    bodyObj[o] = rec.getValue(o);
            });
            var sublistList = [];
            if (sublistId) {
                var lineCnt = rec.getLineCount({sublistId: sublistId});
                for (var i = 0; i < lineCnt; i++) {
                    var sublistObj = {};
                    util.each(sublist, function (o) {
                        sublistObj[o] = rec.getSublistValue({sublistId: sublistId, fieldId: o, line: i});
                    });
                    sublistList.push(sublistObj);
                }
            }
            return {
                body: bodyObj,
                sublist: sublistList
            };
        }


        return {
            getParameterFromURL: getParameterFromURL,
            isEmpty: isEmpty,
            getNowDate: getNowDate,
            getDateFormat: getDateFormat,
            alert: alert,
            confirm: confirm,
            getItemOnSub: getItemOnSub,
            getItemOnParentSub: getItemOnParentSub,
            getItemOnInterSub: getItemOnInterSub,
            postClientData: postClientData,
            postHttp: postHttp,
            postToSuitelet: postToSuitelet,
            postServerData: postServerData,
            getVendorPriceForBillItem: getVendorPriceForBillItem,
            getCustomerPriceLevelSO: getCustomerPriceLevelSO,
            createPO: createPO,
            createExpenseBill: createExpenseBill,
            createItemBill: createItemBill,
            createSO: createSO,
            generateSoPhieu: generateSoPhieu,
            strip: strip,
            searchData: searchData,
            convertSS2ShowInSublist: convertSS2ShowInSublist,
            getRecordData: getRecordData
        }

    });
