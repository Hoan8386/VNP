/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/query', 'N/redirect', 'N/record', '../lib/scv_lib_function.js'],

    (query, redirect, record, libFunc) => {

        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        const onRequest = (context) => {
            let request = context.request;
            let parameters = request.parameters;
            let trid = parameters.trid;
            let trtype = parameters.trtype;

            let recRecord = record.load({type: trtype, id: trid});

            let recSubIVD, inventorydetailavail;
            let slItem = 'item', slIVD = 'inventoryassignment', lcIVD;
            let lcIt = recRecord.getLineCount(slItem);
            let arrIt = [], arrLoc = [], locationline, itemline;

            let locationHeader = recRecord.getValue('location');
            if (locationHeader) {
                arrLoc.push(locationHeader);
            }
            for (let i = 0; i < lcIt; i++) {
                itemline = recRecord.getSublistValue({sublistId: slItem, fieldId: 'item', line: i});
                locationline = recRecord.getSublistValue({sublistId: slItem, fieldId: 'location', line: i});
                if (itemline && !arrIt.includes(itemline)) {
                    arrIt.push(itemline);
                }
                if (locationline && !arrLoc.includes(locationline)) {
                    arrLoc.push(locationline);
                }
            }
            let listItemsAvailable = getListItemsAvailable({locations: arrLoc, items: arrIt});
            let stquantity, stitem, conversionrate;
            let isSave = false;
            for (let j = 0; j < lcIt; j++) {
                locationline = recRecord.getSublistValue({
                    sublistId: slItem,
                    fieldId: 'location',
                    line: j
                }) || locationHeader;
                stitem = recRecord.getSublistValue({sublistId: slItem, fieldId: 'item', line: j});
                inventorydetailavail = recRecord.getSublistValue({
                    sublistId: slItem,
                    fieldId: 'inventorydetailavail',
                    line: j
                });

                if ((inventorydetailavail === true || inventorydetailavail === 'T')) {
                    stquantity = recRecord.getSublistValue({sublistId: slItem, fieldId: 'quantity', line: j});
                    recSubIVD = recRecord.getSublistSubrecord({sublistId: slItem, fieldId: 'inventorydetail', line: j});
                    conversionrate = recSubIVD.getValue('conversionrate') || 1;
                    lcIVD = recSubIVD.getLineCount(slIVD);
                    let lotquantity = 0;
                    for (let n = 0; n < lcIVD; n++) {
                        lotquantity = lotquantity + recSubIVD.getSublistValue({
                            sublistId: slIVD,
                            fieldId: 'quantity',
                            line: n
                        }) * 1;
                    }
                    let remainQuantiy = stquantity;// - lotquantity;
                    if (lotquantity === 0) {
                        let listLotAvailable = listItemsAvailable.filter(o => String(o.item) === stitem && String(o.location) === locationline);
                        let totalItemsAvailable = listLotAvailable.reduce((total, item) => total + Number(item.quantityavailable), 0) / conversionrate;
                        totalItemsAvailable = Number(totalItemsAvailable.toFixed(3));
                        if (totalItemsAvailable >= remainQuantiy) {
                            isSave = true;
                            let lineIvd = 0;
                            for (let lotAvailable of listLotAvailable) {
                                let quantityavailable = lotAvailable.quantityavailable / conversionrate;
                                if (remainQuantiy <= 0) {
                                    break;
                                } else if (quantityavailable > 0) {
                                    recSubIVD.insertLine({sublistId: slIVD, line: lineIvd});
                                    if (remainQuantiy > quantityavailable) {
                                        libFunc.setSublistValueData(recSubIVD, slIVD, ['issueinventorynumber', 'quantity'], lineIvd, [lotAvailable.inventorynumber, quantityavailable]);
                                        remainQuantiy = remainQuantiy - quantityavailable;
                                        lotAvailable.quantityavailable = 0;
                                    } else {
                                        libFunc.setSublistValueData(recSubIVD, slIVD, ['issueinventorynumber', 'quantity'], lineIvd, [lotAvailable.inventorynumber, remainQuantiy]);
                                        lotAvailable.quantityavailable = lotAvailable.quantityavailable - (remainQuantiy * conversionrate);
                                        remainQuantiy = 0;
                                        break;
                                    }
                                    lineIvd++;
                                }
                            }
                        }
                    }

                }
            }
            if (isSave) {
                recRecord.save({enableSourcing: false, ignoreMandatoryFields: true});
            }
            redirect.toRecord({
                type: trtype,
                id: trid
            });
        }

        const getListItemsAvailable = (objParams) => {
            let listItemAvailable = [];
            if (objParams.locations) {
                let params = [...objParams.locations, ...objParams.items];
                let inLocations = objParams.locations.map(() => '?').join(',');
                let inItems = objParams.items.map(() => '?').join(',');
                let sqlItemAvailable = `
					select ib.item, ib.inventorynumber,
						(ib.quantityavailable - ib.committedqtyperseriallotnumberlocation) quantityavailable, ib.binnumber, ib.location, in.expirationdate, in.inventorynumber inventorynumber_name
					from inventorybalance ib
					join location l on ib.location = l.id
					left join inventorynumber in on ib.inventorynumber = in.id
					left join inventorystatus is on ib.inventorystatus = is.id
					where (ib.quantityavailable - ib.committedqtyperseriallotnumberlocation) > 0 and l.makeinventoryavailable = 'T' and ib.location in(${inLocations}) and ib.item in (${inItems}) and is.inventoryavailable = 'T'
					order by ib.item, in.expirationdate
				`;
                listItemAvailable = query.runSuiteQL({query: sqlItemAvailable, params: params}).asMappedResults();
            }
            return listItemAvailable;
        }

        return {
            onRequest
        };

    });
