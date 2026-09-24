
/**
 * @NApiVersion 2.1
 */

var search, query,
    format, i18n, config,
    xml, file, record, redirect, https;

define([
        'N/search',
        'N/format',
        'N/format/i18n',
        'N/config',
        'N/xml',
        'N/file',
        'N/record',
        'N/redirect',
        'N/query',
        'N/https'
    ],
    main
);

function main(_search, _format, _i18n, _config, _xml, _file, _record, _redirect, _query, _https) {
    xml = _xml;
    i18n = _i18n;
    file = _file;
    query = _query;
    search = _search;
    record = _record;
    format = _format;
    config = _config;
    https = _https;
    redirect = _redirect;

    return {
        /*================================================================================================================================================*/
        escape,
        parseDate,
        getFile,
        spellOut,
        searchType,
        searchInfo,
        fetchDataSS,
        createRecord,
        getDataHeader,
        getDataSublist,
        changeRefValue,
        formatDate,
        theFetchDataSS,
        createRecordDiff,
        theFetchDataColName,
        convertISODate,
        getDataRecordId,
        getDefinitionSS,
        searchTypeRecord,
        getDataSubRecord,
        searchInfoCompany,
        getHeaderSubRecord,
        theFetchDataSSDiff,
        theFetchDataSSDiffV2,
        getBodyFieldsRecord,
        setBodyFieldsRecord,
        setLineFieldsRecord,
        getLineFieldsRecord,
        searchInfoSavedSearch,
        setBodyFieldsRecordDiff,
        setLineFieldsRecordDiff,
        theFetchDataSSWhileLoop,
        searchResultTransaction,
        renderSublist,
        getNow,
        postServerNS,
        queryTableDB,
        getListChildAndCurrent,
        setDisplaySublistField,
        theFetchDataMakeCopySS,
        setDisplayFields,
        getListIDChildAndCurrentID,
        getLineFieldsRecordDiffSS,
        searchIdLocationRelatedSubsidiary,
        isValid : _isValid
        /*================================================================================================================================================*/
    }
}


/*------------------------------------------------------------CUSTOM MODULE NETSUITE--------------------------------------------------------------*/

function queryTableDB( sql, queryParams = new Array() ) {
    try {
        let moreRows = true;
        let rows = new Array();
        let paginatedRowBegin = 1;
        let paginatedRowEnd = 5000;
        do {
            const paginatedSQL = 'SELECT * FROM ( SELECT ROWNUM AS ROWNUMBER, * FROM (' + sql + ' ) ) WHERE ( ROWNUMBER BETWEEN ' + paginatedRowBegin + ' AND ' + paginatedRowEnd + ')';
            const queryResults = query
                .runSuiteQL( { query: paginatedSQL, params: queryParams } )
                .asMappedResults();
            rows = rows.concat( queryResults );
            if ( queryResults.length < 5000 ) { moreRows = false; }
            paginatedRowBegin = paginatedRowBegin + 5000;
        } while ( moreRows );

    } catch( e ) {

        log.error( { title: 'selectAllRows - error', details: { 'sql': sql, 'queryParams': queryParams, 'error': e } } );

    }

    return rows;

}

const getNow =  () => {
    const now = new Date();
    const sdate = now.toString();
    const p1 = sdate.substring(28,29);
    const p2 = sdate.substring(29,31);
    let tcurr = 7;
    if(p1 == '-') {
        tcurr = tcurr + 1 * p2;
    } else {
        tcurr = tcurr - 1 * p2;
    }
    let date = new Date(now.getTime() + (tcurr * 3600000) - 8000);
    return date;
}


const getListIDChildAndCurrentID = (recID, recordType, fieldParent = 'parent', condition) => {
    if (!recID) {
        return;
    }
    var sql =
        `SELECT
                BUILTIN_RESULT.TYPE_STRING(${recordType}.${fieldParent}) AS parent,
                BUILTIN_RESULT.TYPE_STRING(${recordType}.id) AS id,
            FROM
                ${recordType}
            WHERE 
                ${condition || '1 = 1'}
           `;

    // Run the query
    var resultSet = query.runSuiteQL({query: sql, params: [false]});
    const listRecordHasChild = {};
    const listID = [];
    resultSet.asMappedResults().forEach(result => {
        const parent = result.parent;
        if (parent) {
            !listRecordHasChild.hasOwnProperty(parent) && (listRecordHasChild[parent] = []);
            listRecordHasChild[parent].push(result.id);
        }
    });

    listID.push(recID);
    if (!listRecordHasChild.hasOwnProperty(recID)) {
        return listID;
    }
    var listIDChild = [recID];
    var isRun = true;
    while (isRun) {
        var newListSubsAfterCheck = [];
        listIDChild.forEach(parentId => listRecordHasChild.hasOwnProperty(parentId) && newListSubsAfterCheck.push(...listRecordHasChild[parentId]))
        // Reset list control array subsidiary
        if (newListSubsAfterCheck.length > 0) {
            listIDChild = [];
            listIDChild.push(...newListSubsAfterCheck);
            listID.push(...newListSubsAfterCheck);
        } else isRun = false;
    }
    return listID;
}

const theFetchDataMakeCopySS = (savedSearchId, objAlias, filters, addColumns, objAliasPlusCols, pageSize = 1000) => {
    const searchObj = search.load(savedSearchId);
    filters.forEach(filter => searchObj.filters.push(filter));
    const originCols = searchObj.columns;
    const lengthOriginCols = originCols.length;
    const numberColsPush = addColumns.length;
    // push new cols
    originCols.push(...addColumns);
    const pageData = searchObj.runPaged({pageSize: pageSize});
    const pageRange = pageData.pageRanges;
    const columnsSS = pageData.searchDefinition.columns;
    const results = [];
    const lengthPage = pageRange.length;
    for (let i = 0; i < lengthPage; i++) {
        const theFetchData = pageData.fetch({index: i});
        theFetchData.data.forEach(result => {
            const objData = {};
            result.id
                ?
                objData.id = result.id
                :
                "";
            for (let pos in objAlias) {
                const col = originCols[pos];
                objData[objAlias[pos]] = result.getValue(col);
                const temp_display = result.getText(col);
                is(temp_display) ? objData[objAlias[pos] + "_display"] = temp_display : "";
            }

            for (let np = lengthOriginCols; np < numberColsPush + lengthOriginCols; np++) {
                const col = originCols[np];
                objData[objAliasPlusCols[np-lengthOriginCols]] = result.getValue(col);
                const temp_display = result.getText(col);
                is(temp_display) ? objData[objAliasPlusCols[np-lengthOriginCols] + "_display"] = temp_display : "";
            }

            results.push(objData);
        })
    }
    return results;
}

const getListChildAndCurrent = (id, typeRecord, col = search.createColumn({name: "parent"}), filters = [['isinactive', 'is', false]]) => {
    if (!id) {
        return;
    }

    const listRecordHasChild = {};
    const listID = [];

    // Get list Parent
    search.create({
        type: typeRecord,
        columns: [col],
        filters: filters,
    }).run().each(result => {
        var parent = result.getValue(col);
        if (parent) {
            !listRecordHasChild.hasOwnProperty(parent) && (listRecordHasChild[parent] = []);
            listRecordHasChild[parent].push(result.id);
        }
        return true;
    });

    listID.push(id);
    if (!listRecordHasChild.hasOwnProperty(id)) {
        return listID;
    }
    var listIDChild = [id];
    var isRun = true;
    while (isRun) {
        var newListSubsAfterCheck = [];
        listIDChild.forEach(parentId => listRecordHasChild.hasOwnProperty(parentId) && newListSubsAfterCheck.push(...listRecordHasChild[parentId]))
        // Reset list control array subsidiary
        if (newListSubsAfterCheck.length > 0) {
            listIDChild = [];
            listIDChild.push(...newListSubsAfterCheck);
            listID.push(...newListSubsAfterCheck);
        } else isRun = false;
    }
    return listID;
}

const setDisplayFields = (form, fields, display = "NORMAL") => {
    const lc = fields.length;
    let field;
    for(let i = 0; i < lc; i++) {
        field = form.getField(fields[i]);
        is(field) && field.updateDisplayType({displayType : display});

    }
}

const setDisplaySublistField = (form, sl, fields, display = "NORMAL") => {
    const lc = fields.length;
    const sublist = form.getSublist({id : sl});
    let field;
    for(let i = 0; i < lc; i++) {
        field = sublist.getField({id : fields[i]});
        is(field) && field.updateDisplayType({displayType : display});
    }
}


const searchResultTransaction = (title, listArrId, typeSearch = "transaction") => {
    const id = "customsearch_results";
    const type = typeSearch;
    const columns = ["internalid", "tranid"];
    const filters = [
        ["mainline", "is", "T"],
        "AND",
        ["internalid", "anyof", listArrId]
    ];
    redirect.toSearchResult({ search: search.create({id, type, title, columns, filters})});
}

const renderSublist = (form, columns, output, label = '') => {
    const sublist = form.addSublist({id: "custpage_scv_sublist", label: label || "Result", type: "LIST"});
    columns.forEach(objSl => {
        const f = sublist.addField({
            id: objSl.id,
            label: objSl.name,
            type: objSl.type,
            source: objSl?.source || null
        });
        f.updateDisplayType({displayType: objSl?.display || "INLINE"});
        f.isMandatory = objSl.isMandatory || false;
    });

    output.forEach((obj, line) => columns.forEach(col =>
        obj?.[col.col] && obj?.[col.col].toString().indexOf("- None -") === -1
            ?
            sublist.setSublistValue({id: col.id, line: line, value: obj[col.col]})
            :
            ""
    ));
}

const createRecord = (mainRecordType, bodyFields, sublistId, lineFields) => {
    const mainRecord = record.create({type: mainRecordType, isDynamic: true});
    Object.entries(bodyFields).forEach(([field, value]) => mainRecord.setValue(field, value));
    for (let line in lineFields) {
        const listDataLineFields = Object.entries(lineFields[line]);
        mainRecord.selectNewLine({sublistId : sublistId});
        listDataLineFields.forEach(([field, value]) => mainRecord.setCurrentSublistValue({sublistId: sublistId, fieldId: field, value: value}))
        mainRecord.commitLine({sublistId : sublistId});
    }
    return mainRecord.save({enableSourcing: false, ignoreMandatoryFields: true});
}

const searchIdLocationRelatedSubsidiary = (id, columns = []) => {
    if (!id) return;
    return search.create({
        type : record.Type.LOCATION,
        filters : [["isinactive", "is", false], 'and', ['subsidiary', 'anyof', id]],
        columns : columns
    })
        .run()
        .getRange(0, 1)?.[0]?.id || ''
};

const setLineFieldsRecord = (mainRecord, sourceRecord, sublistId, lineFields) => {
    const { source : sourceSublistId, main: mainSublistId} = sublistId;
    const lc = sourceRecord.getLineCount(sourceSublistId);
    const lineFieldsUpdate = Object.entries(lineFields);
    let errorSublist = "";
    Array
        .from({ length : lc } , (_, i) => i)
        .forEach((_, line) =>
            lineFieldsUpdate
                .forEach(([mainField, sourceField]) => {
                    const mainValue = mainRecord.getSublistValue({sublistId: mainSublistId, fieldId: mainField, line: line});
                    const sourceValue = sourceRecord.getSublistValue({sublistId: sourceSublistId, fieldId: sourceField, line: line});
                    mainValue !== undefined
                        ?
                        mainRecord.setSublistValue({ sublistId: mainSublistId, fieldId: mainField, value: sourceValue, line: line })
                        :
                        line === 0
                            ?
                            errorSublist += mainField
                            :
                            "";
                }));
    if (errorSublist) log.error("Error Sublist: ", `The sublist (${mainSublistId}) of ${mainRecord.type} don't have list FieldId: ${errorSublist} !!!`);
}

const setLineFieldsRecordDiff = (mainRecord, sublistId, arrLineFields) => {
    if (!sublistId) {
        return;
    }
    arrLineFields.forEach( (obj, line) =>
        Object
            .entries(obj)
            .forEach(( [field, value] ) => mainRecord.setSublistValue({ sublistId: sublistId, fieldId: field, value: value, line: line })))
}

/**
 * Sử dụng để set giá trị các trương trên record
 * @param mainRecord
 * @param sourceRecord
 * @param bodyFields
 */
const setBodyFieldsRecord = (mainRecord, sourceRecord, bodyFields) => {
    const bodyFieldsUpdate = Object.entries(bodyFields);
    let errorMessage = '';
    const lengField = bodyFields.length;
    for (let i = 0; i < lengField; i ++) {
        const  [mainField, sourceField] = bodyFieldsUpdate[i];
        const mainValue = mainRecord.getValue(mainField);
        const sourceValue = sourceRecord.getValue(sourceField);
        if (mainValue !== undefined) {
            mainRecord.setValue(mainField, sourceValue)
        } else {
            errorMessage += mainField;
        }
    }
    if (errorMessage) {
        log.error("Error: ", `${mainRecord.type} don't have list FieldId: ${errorMessage} `);
    };
}

const createRecordDiff = (recordType, objBody, objLine) => {
    const currRec = record.create({ type: recordType, isDynamic: true});
    Object.entries(objLine).forEach(([sublistId, arraySublist]) => {
        for (let line in arraySublist) {
            currRec.selectNewLine({sublistId : sublistId});
            Object.entries(arraySublist[line]).forEach(([field, value]) => currRec.setCurrentSublistValue({sublistId: sublistId, fieldId: field, value: value}))
            currRec.commitLine({sublistId : sublistId});
        }
    })
    return currRec.save({enableSourcing: false, ignoreMandatoryFields: true});
}

const setBodyFieldsRecordDiff = (mainRecord, objBodyFields) => {
    const bodyFieldsUpdate = Object.entries(objBodyFields);
    const error = bodyFieldsUpdate
        .reduce((notValidFields, [ field, value ]) => {
                const mainValue = mainRecord.getValue(field);
                mainValue !== undefined
                    ?
                    mainRecord.setValue(field, value)
                    :
                    notValidFields += field;
                return notValidFields;
            },
            ""
        );

    if (error) log.error("Error: ", `${mainRecord.type} don't have list FieldId: ${error} `);
}

const formatDate = date => date ? format.parse({type: "date", value: date}) : "";

const changeRefValue = (record, fieldGetId = "entity", options) => {
    const idMainRecord = record.getValue(fieldGetId);
    if (!idMainRecord) {
        log.error("Show Error: ", "Not valid id record!")
        return;
    }
    const filters = [
        search.createFilter({ name: "internalid", operator: search.Operator.ANYOF, values: idMainRecord})
    ];
    const columns = [
        search.createColumn({name: "internalid"})
    ];
    const resultObject = search
        .create({type: "entity", filters: filters, columns: columns})
        .run()
        .getRange({start: 0, end: 1});

    if (resultObject.length === 0) {
        log.error("Show Error: ", "Not have a record!")
        return;
    }
    const id = resultObject[0].id;
    const recordType = resultObject[0].recordType;
    record.submitFields({type: recordType, id: id, values: options});
}

const convertISODate = (date, mode = "short", delimiter = "/") => {
    if (!date) {
        log.error("Show Error: ", "Not valid date!")
        return;
    }
    const shortDate =  format
        .format({ value: new Date(date), type: format.Type.DATETIME, timezone: format.Timezone.ASIA_BANGKOK})
        .split("/")
        .map( text => {
            if (text.length === 1) return `0${text}`;
            if (text.length > 3) return `${text.slice(0, 4)}`;
            return text;
        })
        .reduce((pre, cur) => pre + `/${cur}`, '')
        .slice(1);
    if (mode === "short") return shortDate;
    const arrDate = shortDate.split(delimiter);
    const longDate = `Ngày ${arrDate[0]}, tháng ${arrDate[1]}, năm ${arrDate[2]}`;
    if (mode === "long") return longDate;
    return shortDate;
}

const spellOut = ( value, location = "vie") => {
    const options = {number: value, locale: location};
    const pSpell = i18n.spellOut(options);
    return pSpell[0].toUpperCase() + pSpell.slice(1);
}

const searchInfoCompany = fieldId => {
    const companyInfo = config.load({ type: config.Type.COMPANY_INFORMATION });
    const id = companyInfo.getValue(fieldId);
    if (!id) {
        logError(id);
        return;
    }
    return search.lookupFields({type: "employee", id: id, columns: ['custentity_scv_legal_name', 'entityid']});
};

const searchInfo = (typeRecord, idRecord,  listFields) => {
    if (!idRecord) {
        logError('');
        return {};
    }
    return search.lookupFields({ type: typeRecord, id: idRecord, columns: listFields });
}

const searchTypeRecord = (typeRecord, idRecord) => {
    if (!idRecord) {
        logError(idRecord);
        return null;
    }
    return search.lookupFields({
        type: typeRecord,
        id: idRecord,
        columns: ["recordtype", "type"]
    }).recordtype;
}

const theFetchDataSS = (savedSearchId, listColumns, filters, pageSize = 1000) => {
    const searchObj = search.load(savedSearchId);
    filters.forEach(filter => searchObj.filters.push(filter));
    const pageData = searchObj.runPaged({pageSize : pageSize});
    const pageRange = pageData.pageRanges;
    const columnsSS = pageData.searchDefinition.columns;
    const results = [];
    const lengthPage = pageRange.length;
    for ( let i = 0; i < lengthPage; i++ ) {
        const theFetchData = pageData.fetch({ index: i });
        theFetchData.data.forEach( result => {
            const objData = {};
            result.id
                ?
                objData.id = result.id
                :
                "";
            listColumns.forEach(column =>
                objData[column["name"]] = column["type"] === "V"
                    ?
                    result.getValue(columnsSS[column["col"]])
                    :
                    result.getText(columnsSS[column["col"]])
            )
            results.push(objData);
        })
    }
    return results;
}

const theFetchDataColName = (savedSearchId, listColumns, filters, objAlias, pageSize = 1000) => {
    const searchObj = search.load(savedSearchId);
    filters.forEach(filter => searchObj.filters.push(filter));
    const columns = searchObj.columns;
    const pageData = searchObj.runPaged({pageSize : pageSize});
    const pageRange = pageData.pageRanges;
    const columnsSS = pageData.searchDefinition.columns;
    const results = [];
    const lengthPage = pageRange.length;
    for ( let i = 0; i < lengthPage; i++ ) {
        const theFetchData = pageData.fetch({ index: i });
        theFetchData.data.forEach( result => {
            const objData = {};
            result.id
                ?
                objData.id = result.id
                :
                "";
            for (let pos in objAlias) {
                const col = columns[pos];
                objData[objAlias[pos]] = result.getValue(col);
                const temp_display = result.getText(col);
                is(temp_display) ? objData[objAlias[pos] + "_display"] = temp_display : "";
            }
            results.push(objData);
        })
    }
    return results;
}

const theFetchDataSSDiff = (savedSearchId, listColumns, filters, addColumns = [], pageSize = 1000) => {
    const searchObj = search.load(savedSearchId);
    filters.forEach(filter => searchObj.filters.push(filter));
    addColumns.forEach(col => searchObj.columns.push(col));
    const pageData = searchObj.runPaged({pageSize: pageSize});
    const pageRange = pageData.pageRanges;
    const columnsSS = pageData.searchDefinition.columns;
    const results = [];
    const lengthPage = pageRange.length;
    for (let i = 0; i < lengthPage; i++) {
        const theFetchData = pageData.fetch({index: i});
        theFetchData.data.forEach(result => {
            const objData = {};
            result.id
                ?
                objData.id = result.id
                :
                "";
            listColumns.forEach(column =>
                objData[column["name"]] = column["type"] === "V"
                    ?
                    result.getValue(columnsSS[column["col"]])
                    :
                    result.getText(columnsSS[column["col"]])
            )
            results.push(objData);
        })
    }
    return results;
}
const theFetchDataSSDiffV2 = (savedSearchId, listColumns, filters, addColumns = [], pageSize = 1000) => {
    const searchObj = search.load(savedSearchId);
    filters.forEach(filter => searchObj.filters.push(filter));
    addColumns.forEach(col => searchObj.columns.push(col));
    const lengthColumns = searchObj.columns.length;
    const columnsSS = searchObj.columns;
    const pageData = searchObj.runPaged({pageSize: pageSize});
    const pageRange = pageData.pageRanges;
    const rListColumns = listColumns.map(column => {
        const positionColumns = column["col"] < 0 ? lengthColumns + column["col"] : column["col"];
        return {
            col : positionColumns,
            name: column.name,
            type : column.type
        }
    });
    const results = [];
    const lengthPage = pageRange.length;
    for (let i = 0; i < lengthPage; i++) {
        const theFetchData = pageData.fetch({index: i});
        theFetchData.data.forEach(result => {
            const objData = {};
            if (result.id) {
                objData.id = result.id

            }
            rListColumns.forEach(column =>{
                objData[column["name"]] = column["type"] === "V"
                    ?
                    result.getValue(columnsSS[column['col']])
                    :
                    result.getText(columnsSS[column['col']])
            })
            results.push(objData);
        })
    }
    return results;
}

const searchInfoSavedSearch = (recType, filters, columns, objAlias) => {
    var arrResult = [];
    try {
        const searchObj = search.create({type: recType, filters: filters, columns: [...columns]});
        const searchResults = searchObj.runPaged({pageSize:1000});
        const lengthResults = searchResults.pageRanges.length;
        for (let i = 0; i < lengthResults; i++){
            const currentPage = searchResults.fetch({index : i}).data;
            const lengthPage = currentPage.length;
            for( let j = 0; j < lengthPage; j++){
                const obj = {};
                currentPage[j].id ? obj.id = currentPage[j].id : "";
                currentPage[j].recordType ? obj.recordType = currentPage[j].recordType : "";
                for (let pos in objAlias) {
                    const col = columns[pos];
                    let colName = objAlias[pos];
                    let valCol = currentPage[j].getValue(col);
                    // Convert value if objAlias[segment] is array, length array is 2, array;
                    if (typeof objAlias[pos] && Array.isArray(objAlias[pos])) {
                        colName = colName[0];
                        objAlias[pos][1] === 'string' && (valCol = valCol.toString());
                        objAlias[pos][1] === 'number' && (valCol = +valCol || 0);
                        objAlias[pos]?.[2] === 'trim' && (valCol = valCol.trim());
                    }
                    obj[colName] = valCol;
                    const temp_display = currentPage[j].getText(col);
                    is(temp_display) ? obj[colName + "_display"] = temp_display : "";
                }
                arrResult.push(obj);
            }
        }

    } catch (err) {
        log.error("Error arrResult searchInfoSavedSearch: ", err)
    }
    return arrResult;
}

/**
 * @param savedSearchId
 * @param listColumn {[]} {col : number, name : string, type: "V" || "T"}
 * @param filters {[]}
 * @returns {*[]}
 */

const theFetchDataSSWhileLoop = (savedSearchId, listColumn, filters = []) => {
    const resultArray = [];
    const searchObj =  search.load(savedSearchId);
    const columns = searchObj.columns;
    filters.forEach( filter => searchObj.filters.push(filter));
    let length = 1000, sumLength = 0, startNumber = 0, endNumber = 0;
    while ( length === 1000 ) {
        const searchResult = searchObj
            .run()
            .getRange({ start: startNumber, end: endNumber});
        length =  searchResult.length;
        for ( let i = 0; i < length; i++ ) {
            const objData = {};
            searchResult[i].id
                ?
                objData.id = searchResult[i].id
                :
                "";
            listColumn.forEach( column =>
                objData[column["name"]] = column["type"] === "V"
                    ?
                    searchResult[i].getValue(columns[column["col"]])
                    :
                    searchResult[i].getText(columns[column["col"]])
            )
            resultArray.push(objData)
        }

        startNumber += 1000;
        endNumber += 1000;
        sumLength += length;
    }
    return resultArray;
}

function fetchDataSS (ID, filters= [], sizePage = 1000) {
    const searchObj = search.load({ id: ID });
    filters.forEach( filter => searchObj.filters.push(filter) );
    const pageDataS = searchObj.runPaged({pageSize : sizePage});
    const pageRange = pageDataS.pageRanges;
    const length = pageRange.length;
    const searchObjData = [];
    for ( let i = 0; i < length; i++ ) {
        const theFetchData = pageDataS.fetch({ index: i });
        searchObjData.push(...theFetchData.data)
    }
    return searchObjData;
}
const getDefinitionSS =  savedSearchId => search
    .load(savedSearchId)
    .runPaged({pageSize : 1000})
    .searchDefinition

const getDataHeader = (recordType, id, listFields) => {
    const value = {}, text = {};
    if (!id) {
        logError(id);
        return;
    }
    const mainRecord = record.load({type: recordType, id: id});
    listFields.forEach(f => {
        if (mainRecord.getFields().includes(f)) {
            value[f] = reText(mainRecord.getValue(f))
            text[f] = reText(mainRecord.getText(f))
        }
    });
    return { value, text };
}

const getDataRecordId = (mainRecord, lfHeader, sublistId = "", lfLineFields = []) => {
    let objData = {
        bodyFields : { value: {}, text: {} },
        lineFields : { value: [], text: [] }
    };
    const bodyFields = mainRecord.getFields();
    lfHeader.forEach(f => {
        bodyFields.includes(f) ? objData["bodyFields"]["value"][f] = reText(mainRecord.getValue(f)) : ""
        bodyFields.includes(f) ? objData["bodyFields"]["text"][f] = reText(mainRecord.getText(f)) : ""
    })
    if (sublistId) {
        const lcSub = mainRecord.getLineCount(sublistId);
        for ( let i = 0; i < lcSub; i++ ) {
            const value = {}, text = {};
            lfLineFields.forEach( f => {
                mainRecord.getSublistFields(sublistId).includes(f)
                    ?
                    value[f] = reText(mainRecord.getSublistValue(sublistId, f, i))
                    :
                    "";
                mainRecord.getSublistFields(sublistId).includes(f)
                    ?
                    text[f] = reText(mainRecord.getSublistText(sublistId, f, i))
                    :
                    "";
            });
            objData["lineFields"]["value"].push(value);
            objData["lineFields"]["text"].push(text);
        }
    }
    return objData;
}


const getLineFieldsRecord = (mainRecord, idSublist, sublistFields) => {
    const arrSubValue = [], arrSubText = [];
    const lcSub = mainRecord.getLineCount(idSublist);
    if ( lcSub > 0) {
        for ( let i = 0; i < lcSub; i++ ) {
            const objSubValue = {}, objSubText = {};
            sublistFields.forEach( f => {
                const objSublist = {sublistId: idSublist, fieldId: f, line: i};
                objSubValue[f] = mainRecord.getSublistValue(objSublist);
                objSubText[f] = mainRecord.getSublistText(objSublist);
            });
            arrSubValue.push(objSubValue);
            arrSubText.push(objSubText);
        }
    }
    return {
        value: arrSubValue,
        text: arrSubText
    };
}

const getLineFieldsRecordDiffSS = (recId, recType, column) => {
    const searchObj =  search.create({
        type : recType,
        filters : [
            ["internalid", "anyof", recId],
            "and",
            ["type", "anyof", recType],
        ],
        columns : [
            column
        ]
    }).run().getRange(0, 1000);
    const lengthSublist = searchObj.length;
    const arrDataLine = [];
    for ( let i = 0; i < lengthSublist; i++) {
        const value = {}, text = {};
        column.forEach(col => {
            value[col] = searchObj[i].getValue(col);
            text[col] = searchObj[i].getText(col);
        });
        arrDataLine.push({value, text})
    }
    return arrDataLine;
}

const getBodyFieldsRecord = ( mainRecord, listBodyFields ) => listBodyFields.reduce( (list, field) => ({
        value : {
            ...list.value,
            [field] : reText(mainRecord.getValue(field))
        },
        text : {
            ...list.text,
            [field]: reText(mainRecord.getText(field))
        }
    })
    ,
    {value : {}, text : {}}
)



const getDataSublist = (recType, idRec, idSub, subFields) => {
    let objSubValue = {}, objSubText = {};
    let arrSubValue = [], arrSubText = [];
    if (idRec){
        let rec = record.load({type: recType, id: idRec});
        let lcSub = rec.getLineCount(idSub);
        if ( lcSub > 0) {
            for (let i = 0; i < lcSub; i++){
                subFields.forEach( f => {
                    rec.getSublistFields(idSub).includes(f) ? objSubValue[f] = reText(rec.getSublistValue(idSub, f, i)) : "";
                    rec.getSublistFields(idSub).includes(f) ? objSubText[f] = reText(rec.getSublistText(idSub, f, i)) : "";
                });
                arrSubValue.push(objSubValue);
                arrSubText.push(objSubText);
                objSubValue = {};
                objSubText = {};
            }
        }
    }
    return {
        value: arrSubValue,
        text: arrSubText
    };
}

const getDataSubRecord = ( mainRecord, subRecId ) => {
    const objData = { value: {}, text: {} };
    if ( mainRecord.hasSubrecord(subRecId) ) {
        const subRecord = mainRecord.getSubrecord(subRecId);
        const fields = subRecord.getFields();
        if ( fields.length > 0 ) {
            fields.forEach(f => {
                objData.value[f] = subRecord.getValue(f);
                objData.text[f] = subRecord.getText(f);
            })
        }
    }
    return objData;
}

const getHeaderSubRecord = (mainRecord, subRecordId, listFields) =>{
    const objData = { value: {}, text: {} };
    if (mainRecord.hasSubrecord(subRecordId)){
        const recSub = mainRecord.getSubrecord(subRecordId);
        listFields.forEach( f=> {
            recSub.getFields().includes(f)
                ? objData.value[f] = reText(recSub.getValue(f))
                :
                "";
            recSub.getFields().includes(f)
                ?
                objData.text[f] = reText(recSub.getText(f))
                :
                "";
        })
    }
    return objData;
}

function postServerNS(flag, body) {
    try {
        const myRestletHeaders = {
            'Content-Type': 'application/json'
        };
        const bodyObj = {};
        bodyObj.flag = flag;
        bodyObj.body = body;
        const myRestletResponse = https.requestRestlet({
            scriptId: 'customscript_scv_rl_be_vlg',
            deploymentId: 'customdeploy_scv_rl_be_vlg',
            headers: myRestletHeaders,
            method: https.Method.POST,
            body: JSON.stringify(bodyObj),
        });
        return JSON.parse(myRestletResponse.body);
    } catch (e) {
        log.error('createMultiPO2 error', JSON.stringify(e));
    }
}

const escape = content => xml.escape(content);

const parseDate = date => {
    if (!date) {
        return "";
    }
    const configRecObj = config.load({type: config.Type.USER_PREFERENCES});
    const timezone = configRecObj.getValue("TIMEZONE");
    return format.parse({ value: date, type: format.Type.DATE, timezone: timezone});
}

const getFile = (recType, id, listFields) => {
    const obj = {};
    const listIdFields = getDataHeader(recType, id, listFields);
    listFields.forEach(l => {
        const idFile = listIdFields.value[l];
        idFile ? obj[l] = file.load(idFile) : "";
    } )
    return obj;
}

const searchType = ( searchType, id ) => {
    if (!id) {
        return null;
    }
    return search.create( {type: searchType, filters: [["internalid", "anyof", id]], columns: [search.createColumn({name: "type"})]} )
        .run()
        .getRange({ start: 0, end: 1 })[0]
        .recordType;
}

const logError = id => log.error("Show error: ", "Not valid Id - " + id);

const reText =  (text, newText = "") => is(text) ? text : newText ;

const _isValid = value => value !== "" && value !== null && value !== undefined
    ?
    typeof value === "object"
        ?
        Array.isArray(value)
            ?
            value.length > 0
            :
            Object.keys(value).length > 0
        :
        true
    :
    false;

const is = value => value !== undefined && value !== null && value !== ''
    ?
    Array.isArray(value)
        ?
        (value.length > 0)
        : true
    :
    false;

