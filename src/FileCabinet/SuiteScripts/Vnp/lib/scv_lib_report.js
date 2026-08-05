define(['N/dataset', 'N/query', 'N/record', 'N/search', 'N/runtime', 'N/ui/serverWidget'],
    
    (dataset, query, record, search, runtime, serverWidget) => {
        
        const isExists = (arr, id) => {
            return arr.includes(id);
        }
        
        const isContainValue = (value) => {
            let isContain = false;
            if (value !== undefined && value !== null && String(value) !== '') {
                isContain = true;
            }
            return isContain;
        }
        
        const addSelectSubsidiary = (fSub, subsidiary, iselimination) => {
            if (Array.isArray(subsidiary) === false) {
                subsidiary = [String(subsidiary)];
            }
            let subsidiaryIdSelected;
            let currentUser = runtime.getCurrentUser();
            let userSubsdiary = String(currentUser.subsidiary);
            let role = String(currentUser.role);
            let subsidiaryoption = '';
            let objRole = {};
            if (role !== '3') {
                objRole = query.runSuiteQL({
                    query: `SELECT r.id, r.subsidiaryoption, r.subsidiaryrestriction
                    from role r
                    where r.id = ${role}`
                }).asMappedResults()[0];
                subsidiaryoption = objRole.subsidiaryoption;
            }
            if (['ALL', 'ALLACTIVE', 'SELECTED'].includes(subsidiaryoption) || role === '3') {
                let strWhere = '';
                if(!iselimination) {
                    strWhere = ` and s.iselimination = 'F'`;
                } else if(iselimination !== 'any') {
                    strWhere = ` and s.iselimination = 'T'`;
                }
                if (subsidiaryoption === 'SELECTED') {
                    strWhere = ` and s.id in(${objRole.subsidiaryrestriction})`;
                }
                let sqlSubsidiary = `select s.id value, s.name text from subsidiary s where s.isinactive = 'F' ${strWhere}`;
                addSelectionViaSql(fSub, sqlSubsidiary, [], false, subsidiary);
                subsidiary = subsidiary.map(x => String(x));
                subsidiaryIdSelected = fSub.getSelectOptions().map(o => String(o.value)).filter(value => subsidiary.includes(value));
            } else {//if (subsidiaryoption === 'OWN')
                let lkSub = search.lookupFields({type: 'subsidiary', id: userSubsdiary, columns: ['name']});
                fSub.addSelectOption({value: userSubsdiary, text: lkSub.name, isSelected: true});
                subsidiaryIdSelected = [userSubsdiary];
            }
            return subsidiaryIdSelected;
        }
        
        const addAllSelectSubsidiary = (fSub, subsidiary) => {
            if (Array.isArray(subsidiary) === false) {
                subsidiary = [subsidiary];
            }
            let isSelected = false;
            let c = ['internalid', 'namenohierarchy'];
            let s = search.create({
                type: 'subsidiary',
                filters: [['isinactive', 'is', false], 'and', ['iselimination', 'is', 'F']],
                columns: c
            });
            let r = s.run().getRange(1, 1000);
            let lR = r.length;
            for (let i = 0; i < lR; i++) {
                isSelected = isExists(subsidiary, r[i].getValue(c[0]));
                fSub.addSelectOption({value: r[i].getValue(c[0]), text: r[i].getValue(c[1]), isSelected: isSelected});
            }
        }
        
        const addSelectSubsidiaryCustom = (fSub, subsidiary) => {
            let subsidiary_value;
            if(subsidiary && !Array.isArray(subsidiary)) {
                subsidiary_value = [subsidiary];
            }
            let currentUser = runtime.getCurrentUser();
            let role = currentUser.role;
            let lkUser = search.lookupFields({type: 'entity', id: currentUser.id, columns: ['cseg_scv_subsidiary', 'cseg_scv_subsidiary.custrecord_scv_sub_legal_name']});
            let subsidiary_default = lkUser.cseg_scv_subsidiary;
            let subsidiary_default_value = subsidiary_default && subsidiary_default.length > 0 ? subsidiary_default[0].value : '';
            subsidiary_value = subsidiary_value || [subsidiary_default_value];
            let isSelected;
            if(role === 3) {
                fSub.defaultValue = subsidiary_value;
            } else if(subsidiary_default_value) {
                isSelected = isExists(subsidiary_value, subsidiary_default_value);
                fSub.addSelectOption({value : subsidiary_default_value, text : subsidiary_default[0].text, isSelected: isSelected});
            }
            return subsidiary_value;
        }
        
        const addSelectSubsidiaryCustomChild = (fSub, subsidiary) => {
            let subsidiary_value;
            if(subsidiary && !Array.isArray(subsidiary)) {
                subsidiary_value = [subsidiary];
            }
            let currentUser = runtime.getCurrentUser();
            let role = currentUser.role;
            let lkUser = search.lookupFields({type: 'entity', id: currentUser.id, columns: ['cseg_scv_subsidiary']});
            let subsidiary_default = lkUser.cseg_scv_subsidiary;
            let subsidiary_default_value = subsidiary_default[0]?.value || '';
            subsidiary_value = subsidiary_value || [subsidiary_default_value];
            let isSelected;
            if(role === 3) {
                fSub.defaultValue = subsidiary_value;
            } else if(subsidiary_default_value) {
                isSelected = isExists(subsidiary_value, subsidiary_default_value);
                fSub.addSelectOption({value : subsidiary_default_value, text : subsidiary_default[0].text, isSelected: isSelected});
                
                let c = ['internalid', 'name'];
                let s = search.create({
                    type: 'customrecord_cseg_scv_subsidiary',
                    filters: [['isinactive', 'is', false], 'and', ['parent', 'anyof', subsidiary_default_value]],
                    columns: c
                });
                let r = s.run().getRange(0,1000);
                let lR = r.length;
                for(let i = 0; i < lR; i++) {
                    isSelected = isExists(subsidiary_value, r[i].getValue(c[0]));
                    fSub.addSelectOption({value : r[i].getValue(c[0]), text : r[i].getValue(c[1]), isSelected: isSelected});
                }
            }
            return subsidiary_value;
        }
        
        const addSearch = (stype, c, f, value, fieldAdd, isaddplace) => {
            let s = search.create({
                type: stype,
                filters: f,
                columns: c
            });
            let pgSize = 1000;
            let r = s.runPaged({pageSize: pgSize});
            let numPage = r.pageRanges.length;
            let searchPage, tempData, numTemp;
            let isSelected = false;
            if (isaddplace) {
                fieldAdd.addSelectOption({value: '', text: ''});
            }
            let isArrValue = Array.isArray(value);
            let lAV = 0;
            if (isArrValue) {
                lAV = value.length;
            }
            for (let np = 0; np < numPage; np++) {
                searchPage = r.fetch({index: np});
                tempData = searchPage.data;
                if (isContainValue(tempData)) {
                    numTemp = tempData.length;
                    for (let i = 0; i < numTemp; i++) {
                        isSelected = false;
                        if (isArrValue) {
                            for (let j = 0; j < lAV; j++) {
                                if (tempData[i].id === value[j]) {
                                    isSelected = true;
                                }
                            }
                        } else {
                            if (tempData[i].id === value) {
                                isSelected = true;
                            }
                        }
                        fieldAdd.addSelectOption({
                            value: tempData[i].id,
                            text: tempData[i].getValue(c[0]),
                            isSelected: isSelected
                        });
                    }
                }
            }
        }
        
        const addSelectionEntity = (custpage_entity, entity, subsidiary) => {
            let c = ['entityid'];
            let f = [['entitymsesubsidiary.internalid', 'anyof', subsidiary]];
            addSearch(search.Type.ENTITY, c, f, entity, custpage_entity, false);
        }
        
        const addFieldSublist = (sublist, c, pre) => {
            let lc = c.length;
            let ctemp, type, i;
            for (i = 0; i < lc; i++) {
                ctemp = JSON.parse(JSON.stringify(c[i]));
                type = ctemp.type;
                if (type.substring(0, 8) === 'currency') {
                    type = 'currency';
                } else if (type === 'select') {
                    type = 'text';
                }
                addFieldInine(sublist, pre + i, type, ctemp.label);
            }
        }
        
        const addFieldSublistAdd = (sublist, col, pre, lc) => {
            let lcadd = col.length;
            let ctemp, type, i;
            for (i = 0; i < lcadd; i++) {
                ctemp = col[i];
                type = ctemp.type;
                if (type.substring(0, 8) === 'currency') {
                    type = 'currency';
                } else if (type === 'select' && !ctemp.displayType) {
                    type = 'text';
                }
                addFieldInine(sublist, pre + (i + lc), type, ctemp.label, ctemp.displayType, ctemp.source);
            }
        }
        
        const addFieldSublistCol = (sublist, col, pre) => {
            let lc = col.length;
            let type;
            for (let i = 0; i < lc; i++) {
                if (col[i].type.substring(0, 8) === 'currency') {
                    type = 'currency';
                } else if (col[i].type === 'select' && !col[i].displayType) {
                    type = 'text';
                } else {
                    type = col[i].type;
                }
                addFieldInine(sublist, pre + col[i].id, type, col[i].label, col[i].displayType, col[i].source);
            }
        }
        
        const addFieldInine = (sublist, id, type, label, displayType, source) => {
            let field = sublist.addField({
                id: id,
                type: type,
                label: label, source: source
            });
            field.updateDisplayType({displayType: displayType || serverWidget.FieldDisplayType.INLINE});
        }
        
        const getValueDisplay = (row, col, cl) => {
            let tampValue;
            if (col.type === 'select' && col.name !== 'subsidiarynohierarchy') {
                tampValue = row.getText(cl);
            } else {
                tampValue = row.getValue(cl);
            }
            return tampValue;
        }
        
        const addSelectType = (field, defaultValue, listValue, isAddNull) => {
            let lR = listValue.length;
            let isSelected = false;
            if(isAddNull) {
                field.addSelectOption({value: '', text: '-----'});
            }
            for (let i = 0; i < lR; i++) {
                isSelected = String(defaultValue) === String(listValue[i].value);
                field.addSelectOption({value: listValue[i].value, text: listValue[i].text || listValue[i].label, isSelected: isSelected});
            }
        }
        
        const addMultiSelectType = (field, defaultValue, listValue) => {
            let lR = listValue.length;
            let isSelected = false;
            for (let i = 0; i < lR; i++) {
                isSelected = defaultValue.map(x => String(x)).includes(String(listValue[i].value));
                field.addSelectOption({value: listValue[i].value, text: listValue[i].text || listValue[i].label, isSelected: isSelected});
            }
        }
        
        const addSublistListFieldHiden = (sublist, prid, c) => {
            let lbl = c.length, type;
            for (let i = 0; i < lbl; i++) {
                type = c[i].type;
                if (type.substring(0, 8) === 'currency') {
                    type = 'currency';
                }
                addSublistFieldHiden(sublist, prid + i, c[i].label, type);
            }
        }
        
        const addSublistFieldHiden = (sublist, prid, label, type) => {
            let fieldHiden = sublist.addField({
                id: prid,
                type: type,
                label: label
            });
            fieldHiden.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
        }
        
        const addFieldSelect = (sublist, sf_select) => {
            sublist.addField({
                id: sf_select,
                type: serverWidget.FieldType.CHECKBOX,
                label: 'Select'
            });
        }
        
        const addFieldSublistColId = (sublist, col) => {
            let lc = col.length;
            let type;
            for (let i = 0; i < lc; i++) {
                if (col[i].type.substring(0, 8) === 'currency') {
                    type = 'currency';
                } else if (col[i].type === 'select') {
                    type = 'text';
                } else {
                    type = col[i].type;
                }
                addFieldDisplay(sublist, col[i].id, type, col[i].label, col[i].display, col[i].mandatory);
            }
        }
        
        const addFieldHeader = (form, fieldid, type, label, container, source, isMandatory, displayType) => {
            let obj = {id: fieldid, type: type, label: label};
            if (source !== undefined) {
                obj.source = source;
            }
            if (container !== undefined) {
                obj.container = container;
            }
            let field = form.addField(obj);
            if (isMandatory !== undefined) {
                field.isMandatory = isMandatory;
            }
            if (displayType !== undefined) {
                field.updateDisplayType({displayType: displayType});
            }
            return field;
        }
        
        const addFieldLine = (sublist, fieldid, type, label, source, isMandatory, displayType) => {
            let obj = {id: fieldid, type: type, label: label};
            if (source !== undefined) {
                obj.source = source;
            }
            let field = sublist.addField(obj);
            if (isMandatory !== undefined) {
                field.isMandatory = isMandatory;
            }
            if (displayType !== undefined) {
                field.updateDisplayType({displayType: displayType});
            }
            return field;
        }
        
        const addFieldDisplay = (sublist, id, type, label, displayType, isMandatory) => {
            let field = sublist.addField({
                id: id,
                type: type,
                label: label
            });
            if (displayType !== undefined) {
                field.updateDisplayType({displayType: displayType});
            }
            if (isMandatory !== undefined) {
                field.isMandatory = isMandatory;
            }
        }
        
        const doSearch = (stype, records, columns, arrCol, arrFilter) => {
            let totoalRecord = 0;
            let lCol = arrCol.length;
            let s = search.create({type: stype, filters: arrFilter, columns: columns});
            let r = s.runPaged({pageSize: 1000});
            let numPage = r.pageRanges.length;
            let searchPage, tempData, numTemp, objT;
            for (let np = 0; np < numPage; np++) {
                searchPage = r.fetch({index: np});
                tempData = searchPage.data;
                if (isContainValue(tempData)) {
                    numTemp = tempData.length;
                    for (let i = 0; i < numTemp; i++) {
                        objT = {};
                        for (let j = 0; j < lCol; j++) {
                            objT[arrCol[j]] = tempData[i].getValue(columns[j]);
                        }
                        records.push(objT);
                        totoalRecord = totoalRecord + 1;
                    }
                }
            }
            return totoalRecord;
        }
        
        const addFieldHeaderOBJ = (form, obj, prefix, value) => {
            let isMandatory = obj.isMandatory;
            let displayType = obj.displayType;
            delete obj.isMandatory;
            delete obj.displayType;
            obj.id = prefix + obj.id;
            let field = form.addField(obj);
            if (isMandatory !== undefined) {
                field.isMandatory = isMandatory;
            }
            if (displayType !== undefined) {
                field.updateDisplayType({displayType: displayType});
            }
            if (value !== undefined) {
                field.defaultValue = value;
            }
            if (obj.maxLength !== undefined) {
                field.maxLength = obj.maxLength;
            }
            return field;
        }
        
        const addFieldHeaderOBJList = (form, listObj, prefix) => {
            let lc = listObj.length;
            for (let i = 0; i < lc; i++) {
                addFieldHeaderOBJ(form, listObj[i], prefix);
            }
        }
        
        const addFieldHeaderCol = (form, obj) => {
            let mandatory = obj.mandatory;
            let display = obj.display;
            let maxLength = obj.maxLength;
            delete obj.mandatory;
            delete obj.display;
            delete obj.maxLength;
            let field = form.addField(obj);
            if (mandatory !== undefined) {
                field.isMandatory = mandatory;
            }
            if (display !== undefined) {
                if(obj.isEntry) {
                    field.updateDisplayType({displayType: serverWidget.FieldDisplayType.ENTRY});
                }
                field.updateDisplayType({displayType: display});
            }
            if (obj.maxLength !== undefined) {
                field.maxLength = maxLength;
            }
            if(obj.height && obj.width) {
                field.updateDisplaySize({
                    height : obj.height,
                    width : obj.width
                });
            }
            return field;
        }
        
        const addFieldLineCol = (sublist, obj) => {
            let mandatory = obj.mandatory;
            let display = obj.display;
            let maxLength = obj.maxLength;
            delete obj.mandatory;
            delete obj.display;
            delete obj.maxLength;
            let field = sublist.addField(obj);
            if (mandatory !== undefined) {
                field.isMandatory = mandatory;
            }
            if (display !== undefined) {
                if(obj.isEntry) {
                    field.updateDisplayType({displayType: serverWidget.FieldDisplayType.ENTRY});
                }
                field.updateDisplayType({displayType: display});
            }
            if (obj.maxLength !== undefined) {
                field.maxLength = maxLength;
            }
            return field;
        }
        
        const addFieldHeaderColList = (form, listObj) => {
            let lc = listObj.length;
            for (let i = 0; i < lc; i++) {
                addFieldHeaderCol(form, listObj[i]);
            }
        }
        
        const addFieldLineColList = (sublist, listObj) => {
            let lc = listObj.length;
            for (let i = 0; i < lc; i++) {
                addFieldLineCol(sublist, listObj[i]);
            }
        }
        
        const addSelection = (fieldAdd, t, c, f, isAddNull, valueDefault) => {
            let numPage = 0, r;
            if (isContainValue(t)) {
                let s = search.create({
                    type: t,
                    filters: f,
                    columns: c
                });
                r = s.runPaged({pageSize: 1000});
                numPage = r.pageRanges.length;
            }
            let temp, text, isSelected = false, searchPage, numTemp, tempData;
            if (isAddNull) {
                fieldAdd.addSelectOption({value: '', text: '---', isSelected: false});
            }
            if (numPage > 0) {
                for (let np = 0; np < numPage; np++) {
                    searchPage = r.fetch({index: np});
                    tempData = searchPage.data;
                    if (isContainValue(tempData)) {
                        numTemp = tempData.length;
                        for (let i = 0; i < numTemp; i++) {
                            temp = tempData[i].getValue(c[0]);
                            text = tempData[i].getValue(c[1]);
                            isSelected = valueDefault && (temp === valueDefault);
                            fieldAdd.addSelectOption({value: temp, text: text, isSelected: isSelected});
                        }
                    }
                }
            }
        }
        
        const addSelectionViaSql = (fieldAdd, sqlQuery, paramsQuery, isAddNull, valueDefault) => {
            let isSelected = false;
            if (isAddNull) {
                fieldAdd.addSelectOption({value: '', text: '---', isSelected: !valueDefault || !String(valueDefault)});
            }
            let resultSet = query.runSuiteQL({
                query: sqlQuery,
                params: paramsQuery
            });
            let listRes = resultSet.asMappedResults();
            valueDefault = util.isArray(valueDefault) ? valueDefault.map(x => String(x)) : [String(valueDefault || '')];
            for (let objRes of listRes) {
                isSelected = valueDefault && valueDefault.includes(String(objRes.value));
                fieldAdd.addSelectOption({value: objRes.value, text: objRes.text, isSelected: isSelected});
            }
        }
        
        const addSelectionFromField = (fieldAdd, fromField, isAddNull, valueDefault) => {
            let isSelected = false;
            if (isAddNull) {
                fieldAdd.addSelectOption({value: '', text: '---', isSelected: false});
            }
            let selectOptions = fromField.getSelectOptions();
            for (let objSelectOption of selectOptions) {
                isSelected = valueDefault && (String(objSelectOption.value) === String(valueDefault));
                fieldAdd.addSelectOption({
                    value: objSelectOption.value,
                    text: objSelectOption.text,
                    isSelected: isSelected
                });
            }
        }
        
        const doSearchSS = (idSearch, pgSize, results, arrFilter, arrCol) => {
            let s = search.load(idSearch);
            let lengTemp;
            if (isContainValue(arrFilter)) {
                lengTemp = arrFilter.length;
                if (lengTemp > 0) {
                    let f = s.filters;
                    for (let lT = 0; lT < lengTemp; lT++) {
                        f.push(arrFilter[lT]);
                    }
                    s.filters = f;
                }
            }
            lengTemp = arrCol.length;
            let c = s.columns;
            let r;
            try {
                r = s.runPaged({pageSize: pgSize});
            } catch (e) {
                r = s.runPaged({pageSize: pgSize});
                log.error('e runpage', e);
            }
            let numPage = r.pageRanges.length;
            let searchPage;
            let tempData;
            let numTemp;
            let totalRecord = 0;
            let objTemp;
            let tempValue;
            for (let np = 0; np < numPage; np++) {
                try {
                    searchPage = r.fetch({index: np});
                } catch (e) {
                    searchPage = r.fetch({index: np});
                    log.error('e searchPage', e);
                }
                tempData = searchPage.data;
                if (isContainValue(tempData)) {
                    numTemp = tempData.length;
                    totalRecord = totalRecord + numTemp;
                    for (let i = 0; i < numTemp; i++) {
                        objTemp = {};
                        for (let lT = 0; lT < lengTemp; lT++) {
                            if (arrCol[lT][2] === 'sltext') {
                                tempValue = tempData[i].getText(c[arrCol[lT][1]]);
                            } else {
                                tempValue = tempData[i].getValue(c[arrCol[lT][1]]);
                            }
                            objTemp[arrCol[lT][0]] = tempValue;
                        }
                        results.push(objTemp);
                    }
                }
            }
            return totalRecord;
        }
        
        const addSelecttionFrList = (fRep, value, listReport, isaddnull) => {
            let lR = listReport.length;
            let isSelected = false;
            if (isaddnull) {
                fRep.addSelectOption({value: '', text: '---', isSelected: false});
            }
            for (let i = 0; i < lR; i++) {
                isSelected = value === listReport[i].value;
                fRep.addSelectOption({
                    value: listReport[i].value,
                    text: listReport[i].label || listReport[i].text,
                    isSelected: isSelected
                });
            }
        }
        
        const addSelectFrListVlTe = (fRep, value, listReport) => {
            let lR = listReport.length;
            let isSelected = false;
            for (let i = 0; i < lR; i++) {
                isSelected = value === listReport[i].value;
                fRep.addSelectOption({value: listReport[i].value, text: listReport[i].label, isSelected: isSelected});
            }
        }
        
        const doSearchSSMore = (idSearch, pgSize, results, arrFilter, arrCol, columns_add, splice) => {
            let s = search.load(idSearch);
            let lengTemp;
            if (isContainValue(arrFilter)) {
                let f = s.filters;
                f = f.concat(arrFilter);
                s.filters = f;
            }
            lengTemp = arrCol.length;
            let c = s.columns;
            if (isContainValue(splice)) {
                for (let i in splice) {
                    c.splice(splice[i].splice_col_start, splice[i].splice_col_leng);
                }
            }
            if (isContainValue(columns_add)) {
                c = c.concat(columns_add);
                s.columns = c;
            }
            let r;
            try {
                r = s.runPaged({pageSize: pgSize});
            } catch (e) {
                r = s.runPaged({pageSize: pgSize});
                log.error('e runpage', e);
            }
            let numPage = r.pageRanges.length;
            let searchPage;
            let tempData;
            let numTemp;
            let totalRecord = 0;
            let objTemp;
            let tempValue;
            for (let np = 0; np < numPage; np++) {
                try {
                    searchPage = r.fetch({index: np});
                } catch (e) {
                    searchPage = r.fetch({index: np});
                    log.error('e searchPage', e);
                }
                tempData = searchPage.data;
                if (isContainValue(tempData)) {
                    numTemp = tempData.length;
                    totalRecord = totalRecord + numTemp;
                    for (let i = 0; i < numTemp; i++) {
                        objTemp = {};
                        for (let lT = 0; lT < lengTemp; lT++) {
                            if (arrCol[lT][2] === 'sltext') {
                                tempValue = tempData[i].getText(c[arrCol[lT][1]]);
                            } else {
                                tempValue = tempData[i].getValue(c[arrCol[lT][1]]);
                            }
                            objTemp[arrCol[lT][0]] = tempValue;
                        }
                        results.push(objTemp);
                    }
                }
            }
            return totalRecord;
        }
        
        const getIndexColumns = (columns, name, label) => {
            let index = -1, cpname, cplabel;
            for (let i in columns) {
                cpname = (columns[i].name === name);
                cplabel = (columns[i].label === label);
                if ((cpname && !label) || (cplabel === label && !name) || (cpname && cplabel)) {
                    index = i;
                }
            }
            return index;
        }
        
        const isLeapYear = (year) => {
            return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        }
        
        const compositeArr = (arrObj, fieldCompare, fieldSum, start) => {
            let lAOR = arrObj.length;
            let lAO = lAOR - 1;
            let lFC = fieldCompare.length;
            let lFS = fieldSum.length;
            let isSplice = false, isFlag = false, count;
            let istart = start, temp1, temp2;
            for (let i = start; i < lAO; i++) {
                count = 0;
                for (let n = i + 1; n < lAOR; n++) {
                    isFlag = true;
                    for (let j = 0; j < lFC; j++) {
                        isFlag = true;
                        temp1 = arrObj[i][fieldCompare[j]];
                        temp2 = arrObj[n][fieldCompare[j]];
                        if (temp1 !== temp2) {
                            isFlag = false;
                            break;
                        }
                    }
                    if (isFlag) {
                        for (let j = 0; j < lFS; j++) {
                            arrObj[i][fieldSum[j]] = arrObj[i][fieldSum[j]] + arrObj[n][fieldSum[j]];
                        }
                        arrObj.splice(n, 1);
                        count++;
                        lAOR = lAOR - 1;
                        lAO = lAO - 1;
                        //break;
                    }
                }
                istart = i;
                if (count > 0) {
                    isSplice = true;
                    break;
                }
            }
            if (isSplice) {
                compositeArr(arrObj, fieldCompare, fieldSum, istart);
            }
        }
        
        const doSearchEach = (stype, records, columns, arrCol, arrFilter) => {
            let totoalRecord = 0;
            let lCol = arrCol.length;
            let s = search.create({type: stype, filters: arrFilter, columns: columns});
            let r = s.run();
            let objT;
            r.each(function (row) {
                objT = {};
                for (let j = 0; j < lCol; j++) {
                    objT[arrCol[j]] = row.getValue(columns[j]);
                }
                records.push(objT);
                totoalRecord = totoalRecord + 1;
            });
            return totoalRecord;
        }
        
        const doSearchSSMoreEach = (idSearch, results, arrFilter, arrCol, columns_add, splice) => {
            let s = search.load(idSearch);
            let lengTemp, objTemp, tempValue, totalRecord = 0;
            if (isContainValue(arrFilter)) {
                let f = s.filters;
                f = f.concat(arrFilter);
                s.filters = f;
            }
            lengTemp = arrCol.length;
            let c = s.columns;
            if (isContainValue(splice)) {
                for (let i in splice) {
                    c.splice(splice[i].splice_col_start, splice[i].splice_col_leng);
                }
            }
            if (isContainValue(columns_add)) {
                c = c.concat(columns_add);
                s.columns = c;
            }
            let r;
            try {
                r = s.run();
            } catch (e) {
                r = s.run();
                log.error('e runpage', e);
            }
            r.each(function (row) {
                objTemp = {};
                for (let lT = 0; lT < lengTemp; lT++) {
                    if (arrCol[lT][2] === 'sltext') {
                        tempValue = row.getText(c[arrCol[lT][1]]);
                    } else {
                        tempValue = row.getValue(c[arrCol[lT][1]]);
                    }
                    objTemp[arrCol[lT][0]] = tempValue;
                }
                results.push(objTemp);
                totalRecord = totalRecord + 1;
            });
            return totalRecord;
        }
        
        const addFieldSublistColumnsOfSS = (sublist, columns) => {
            let lc = columns.length;
            let type, name, listCol = [];
            for (let i = 0; i < lc; i++) {
                type = columns[i].type;
                if (type.substring(0, 8) === 'currency') {
                    type = 'currency';
                } else if (type === 'select') {
                    type = 'text';
                }
                name = columns[i].name;
                if (name.substring(0, 7) === 'formula') {
                    name = name + i;
                }
                let objCol = {id: name, label: columns[i].label, type: type, display: 'inline'};
                addFieldLineCol(sublist, objCol);
                objCol.index = i;
                listCol.push(objCol);
            }
            return listCol;
        }
        
        const doSearchSSPage = (idSearch, pgSize, results, arrFilter, arrCol, pageinfo, vnone, columns_add, splice) => {
            let s = search.load(idSearch);
            let lengTemp;
            if (isContainValue(arrFilter)) {
                lengTemp = arrFilter.length;
                if (lengTemp > 0) {
                    let f = s.filters;
                    for (let lT = 0; lT < lengTemp; lT++) {
                        f.push(arrFilter[lT]);
                    }
                    s.filters = f;
                }
            }
            lengTemp = arrCol.length;
            
            let pagesize = pgSize, pagestart = 0;
            if (!!pageinfo) {
                if (!!pageinfo.pagesize && !isNaN(pageinfo.pagesize)) {
                    pagesize = pageinfo.pagesize * 1;
                    if (pagesize > 1000 || pagesize <= 0) {
                        pagesize = 1000;
                    } else if (pagesize < 5) {
                        pagesize = 5;
                    }
                }
                if ((!!pageinfo.pagestart && !isNaN(pageinfo.pagestart)) || pageinfo.pagestart === 0) {
                    pagestart = pageinfo.pagestart * 1;
                    if (pagestart < 0) {
                        pagestart = 0;
                    }
                }
            }
            
            let c = s.columns;
            if (isContainValue(splice)) {
                for (let i in splice) {
                    c.splice(splice[i].splice_col_start, splice[i].splice_col_leng);
                }
            }
            if (isContainValue(columns_add)) {
                c = c.concat(columns_add);
                s.columns = c;
            }
            
            let r;
            try {
                r = s.runPaged({pageSize: pagesize});
            } catch (e) {
                r = s.runPaged({pageSize: pagesize});
                log.error('e runpage', e);
            }
            let numPage = r.pageRanges.length;
            let pageend = numPage - 1;
            if (!!pageinfo) {
                if ((!!pageinfo.pageend && !isNaN(pageinfo.pageend)) || pageinfo.pageend === 0) {
                    pageend = pageinfo.pageend * 1;
                    if (pageend < pagestart) {
                        pageend = pagestart;
                    }
                    if (pageend >= numPage) {
                        pageend = numPage - 1;
                    }
                }
                if (pagestart >= numPage) {
                    pagestart = numPage - 1;
                }
            }
            
            let searchPage, tempData, numTemp, objTemp, tempValue;
            let totalRecord = 0;
            if (pagestart >= 0) {
                for (let np = pagestart; np <= pageend; np++) {
                    try {
                        searchPage = r.fetch({index: np});
                    } catch (e) {
                        searchPage = r.fetch({index: np});
                        log.error('e searchPage', e);
                    }
                    tempData = searchPage.data;
                    if (isContainValue(tempData)) {
                        numTemp = tempData.length;
                        totalRecord = totalRecord + numTemp;
                        for (let i = 0; i < numTemp; i++) {
                            objTemp = {};
                            for (let lT = 0; lT < lengTemp; lT++) {
                                if (c[arrCol[lT][1]]) {
                                    if (arrCol[lT][2] === 'sltext') {
                                        tempValue = tempData[i].getText(c[arrCol[lT][1]]);
                                    } else {
                                        tempValue = tempData[i].getValue(c[arrCol[lT][1]]);
                                    }
                                    if (tempValue === vnone) {
                                        tempValue = '';
                                    }
                                    objTemp[arrCol[lT][0]] = tempValue;
                                }
                            }
                            results.push(objTemp);
                        }
                    }
                }
            }
            return totalRecord;
        }
        
        const doSearchSSOrgPage = (idSearch, pgSize, results, arrFilter, arrCol, pageinfo, vnone, columns_add, splice, isnotgetdisplay, islabelid) => {
            let s = search.load(idSearch);
            let lengTemp, lCT = 0;
            if (!!arrCol) {
                lCT = arrCol.length;
            }
            if (isContainValue(arrFilter)) {
                lengTemp = arrFilter.length;
                if (lengTemp > 0) {
                    let f = s.filters;
                    for (let lT = 0; lT < lengTemp; lT++) {
                        f.push(arrFilter[lT]);
                    }
                    s.filters = f;
                }
            }
            
            let pagesize = pgSize, pagestart = 0;
            if (!!pageinfo) {
                if (!!pageinfo.pagesize && !isNaN(pageinfo.pagesize)) {
                    pagesize = pageinfo.pagesize * 1;
                    if (pagesize > 1000 || pagesize <= 0) {
                        pagesize = 1000;
                    } else if (pagesize < 5) {
                        pagesize = 5;
                    }
                }
                if ((!!pageinfo.pagestart && !isNaN(pageinfo.pagestart)) || pageinfo.pagestart === 0) {
                    pagestart = pageinfo.pagestart * 1;
                    if (pagestart < 0) {
                        pagestart = 0;
                    }
                }
            }
            
            let c = s.columns;
            if (isContainValue(splice)) {
                for (let i in splice) {
                    c.splice(splice[i].splice_col_start, splice[i].splice_col_leng);
                }
            }
            if (isContainValue(columns_add)) {
                c = c.concat(columns_add);
                s.columns = c;
            }
            let ct = JSON.parse(JSON.stringify(c));
            lengTemp = c.length;
            let r;
            try {
                r = s.runPaged({pageSize: pagesize});
            } catch (e) {
                r = s.runPaged({pageSize: pagesize});
                log.error('e runpage', e);
            }
            let numPage = r.pageRanges.length;
            let pageend = numPage - 1;
            if (!!pageinfo) {
                if ((!!pageinfo.pageend && !isNaN(pageinfo.pageend)) || pageinfo.pageend === 0) {
                    pageend = pageinfo.pageend * 1;
                    if (pageend < pagestart) {
                        pageend = pagestart;
                    }
                    if (pageend >= numPage) {
                        pageend = numPage - 1;
                    }
                }
                if (pagestart >= numPage) {
                    pagestart = numPage - 1;
                }
            }
            
            let searchPage, tempData, numTemp, objTemp, tempValue, tempValueText;
            let totalRecord = 0;
            if (pagestart >= 0) {
                for (let np = pagestart; np <= pageend; np++) {
                    try {
                        searchPage = r.fetch({index: np});
                    } catch (e) {
                        searchPage = r.fetch({index: np});
                        log.error('e searchPage', e);
                    }
                    tempData = searchPage.data;
                    if (isContainValue(tempData)) {
                        numTemp = tempData.length;
                        totalRecord = totalRecord + numTemp;
                        for (let i = 0; i < numTemp; i++) {
                            objTemp = {};
                            for (let lT = 0; lT < lengTemp; lT++) {
                                tempValue = tempData[i].getValue(c[lT]);
                                if (tempValue === vnone) {
                                    tempValue = '';
                                }
                                let fieldname = islabelid ? c[lT].label : c[lT].name;
                                if (fieldname.substring(0, 7) === 'formula') {
                                    if (!!c[lT].label && c[lT].label.substring(0, 7) !== 'Formula') {
                                        fieldname = c[lT].label;
                                    } else {
                                        fieldname = fieldname + '_' + lT;
                                    }
                                }
                                if (!isnotgetdisplay && ct[lT].type === 'select') {
                                    tempValueText = tempData[i].getText(c[lT])
                                    objTemp[fieldname + '_display'] = tempValueText === vnone ? '' : tempValueText;
                                }
                                if (fieldname.substring(0, 7) !== 'formula' || lCT === 0) {
                                    objTemp[fieldname] = tempValue;
                                }
                            }
                            for (let lT = 0; lT < lCT; lT++) {
                                if (c[arrCol[lT][1]]) {
                                    if (arrCol[lT][2] === 'sltext') {
                                        tempValue = tempData[i].getText(c[arrCol[lT][1]]);
                                    } else {
                                        tempValue = tempData[i].getValue(c[arrCol[lT][1]]);
                                    }
                                    if (tempValue === vnone) {
                                        tempValue = '';
                                    }
                                    objTemp[arrCol[lT][0]] = tempValue;
                                }
                            }
                            results.push(objTemp);
                        }
                    }
                }
            }
            return {totalRecord: totalRecord, c: c, total_page: numPage};
        }
        
        const splitComa = (strId, comma) => {
            let resSpl = strId;
            if (!!strId && typeof (strId) === 'string') {
                resSpl = strId.split(comma);
            }
            return resSpl;
        }
        
        const makeWhereField = (sql, isplusand, params, tablealias, fieldid, fieldvalue, operator, formula) => {
            if (!!fieldvalue) {
                if (isplusand) {
                    sql += ' and ';
                } else {
                    sql += ' where ';
                }
                let field = tablealias + '.' + fieldid + ' ';
                if (fieldid === 'formula') {
                    field = formula + ' ';
                }
                if (operator === 'in') {
                    let slut = fieldvalue;
                    if (typeof fieldvalue === 'string') {
                        slut = splitComa(fieldvalue, ',');
                    }
                    if (typeof slut === 'object') {
                        sql += field + 'in ('
                        for (let i in slut) {
                            if (i > 0) {
                                sql += ',?'
                            } else {
                                sql += '?';
                            }
                            params.push(slut[i]);
                        }
                        sql += ') ';
                    } else {
                        sql += field + '= ? ';
                        params.push(fieldvalue);
                    }
                } else {
                    sql += field + operator + ' ? ';
                    params.push(fieldvalue)
                }
                isplusand = true;
            }
            return {sql: sql, isplusand: isplusand};
        }
        
        const makeWhereList = (sql, isplusand, params, listobjfield) => {
            let objT = {sql: sql}, objfield;
            for (let i in listobjfield) {
                objfield = listobjfield[i];
                if (i === '0') {
                    objT = makeWhereField(sql, isplusand, params, objfield.tablealias, objfield.fieldid, objfield.fieldvalue, objfield.operator, objfield.formula);
                } else {
                    objT = makeWhereField(objT.sql, objT.isplusand, params, objfield.tablealias, objfield.fieldid, objfield.fieldvalue, objfield.operator, objfield.formula);
                }
            }
            return objT;
        }
        
        const doSearchSql = (records, pageinfo, sql, params) => {
            let totoalRecord = 0;
            let pagesize = 1000, pagestart = 0;
            if (!!pageinfo) {
                if (!!pageinfo.pagesize && !isNaN(pageinfo.pagesize)) {
                    pagesize = pageinfo.pagesize * 1;
                    if (pagesize > 1000 || pagesize <= 0) {
                        pagesize = 1000;
                    } else if (pagesize < 5) {
                        pagesize = 5;
                    }
                }
                if ((!!pageinfo.pagestart && !isNaN(pageinfo.pagestart)) || pageinfo.pagestart === 0) {
                    pagestart = pageinfo.pagestart * 1;
                    if (pagestart < 0) {
                        pagestart = 0;
                    }
                }
            }
            let r = query.runSuiteQLPaged({
                query: sql,
                params: params,
                pageSize: pagesize
            });
            let numPage = r.pageRanges.length;
            let pageend = numPage - 1;
            if (!!pageinfo) {
                if ((!!pageinfo.pageend && !isNaN(pageinfo.pageend)) || pageinfo.pageend === 0) {
                    pageend = pageinfo.pageend * 1;
                    if (pageend < pagestart) {
                        pageend = pagestart;
                    }
                    if (pageend >= numPage) {
                        pageend = numPage - 1;
                    }
                }
                if (pagestart >= numPage) {
                    pagestart = numPage - 1;
                }
            }
            
            let searchPage, tempData, numTemp, objT;
            if (pagestart >= 0) {
                for (let np = pagestart; np <= pageend; np++) {
                    searchPage = r.fetch({index: np});
                    tempData = searchPage.data.results;
                    if (!!tempData) {
                        numTemp = tempData.length;
                        for (let i = 0; i < numTemp; i++) {
                            objT = tempData[i].asMap();
                            records.push(objT);
                            totoalRecord = totoalRecord + 1;
                        }
                    }
                }
            }
            return totoalRecord;
        }
        
        const doSearchSqlPage = (records, pageinfo, sql, params) => {
            let totalRecord = 0;
            let pagesize = 1000, pagestart = 0;
            if(!!pageinfo) {
                if(!!pageinfo.pagesize && !isNaN(pageinfo.pagesize)) {
                    pagesize = pageinfo.pagesize * 1;
                    if(pagesize > 1000 || pagesize <= 0) {
                        pagesize = 1000;
                    } else if(pagesize < 5) {
                        pagesize = 5;
                    }
                }
                if((!!pageinfo.pagestart && !isNaN(pageinfo.pagestart)) || pageinfo.pagestart === 0) {
                    pagestart = pageinfo.pagestart * 1;
                    if(pagestart < 0) {
                        pagestart = 0;
                    }
                }
            }
            let r = query.runSuiteQLPaged({
                query: sql,
                params: params,
                pageSize: pagesize
            });
            let numPage = r.pageRanges.length;
            let pageend = numPage - 1;
            if(!!pageinfo) {
                if((!!pageinfo.pageend && !isNaN(pageinfo.pageend)) || pageinfo.pageend === 0) {
                    pageend = pageinfo.pageend * 1;
                    if(pageend < pagestart) {
                        pageend = pagestart;
                    }
                    if(pageend >= numPage) {
                        pageend = numPage - 1;
                    }
                }
                if(pagestart >= numPage) {
                    pagestart = numPage - 1;
                }
            }
            
            let searchPage, tempData, numTemp, objT;
            if(pagestart >= 0) {
                for(let np = pagestart; np <= pageend; np++) {
                    searchPage = r.fetch({index : np});
                    tempData = searchPage.data.results;
                    if(!!tempData) {
                        numTemp = tempData.length;
                        for(let i = 0; i < numTemp; i++) {
                            objT = tempData[i].asMap();
                            records.push(objT);
                            totalRecord = totalRecord + 1;
                        }
                    }
                }
            }
            return {totalRecord: totalRecord, total_page: numPage};
        }
        
        const doSearchSqlAll = (records, sql, params) => {
            let totalRecord = 0;
            let resultSet = query.runSuiteQL({
                query: sql,
                params: params,
                customScriptId: null
            });
            let listRes = resultSet.asMappedResults();
            let lLR = listRes.length;
            
            if (lLR > 5000) {
                let pageSize = 1000;
                let r = query.runSuiteQLPaged({
                    query: sql,
                    params: params,
                    pageSize: pageSize
                });
                let numPage = r.pageRanges.length;
                let searchPage, tempData;
                for (let np = 0; np < numPage; np++) {
                    searchPage = r.fetch({index: np});
                    tempData = searchPage.data.results;
                    if (!!tempData) {
                        totalRecord = totalRecord + tempData.length;
                        let dataArray = tempData.map(row => row.asMap());
                        records.push(...dataArray);
                    }
                }
            } else {
                totalRecord = lLR;
                records.push(...listRes);
            }
            
            return totalRecord;
        }
        
        const doSearchSSRange = (idSearch, pgSize, results, arrFilter, arrCol) => {
            let s = search.load(idSearch);
            let lengTemp;
            if (!!arrFilter) {
                lengTemp = arrFilter.length;
                if (lengTemp > 0) {
                    let f = s.filters;
                    for (let lT = 0; lT < lengTemp; lT++) {
                        f.push(arrFilter[lT]);
                    }
                    s.filters = f;
                }
            }
            lengTemp = arrCol.length;
            let c = s.columns;
            let r;
            try {
                r = s.runPaged({pageSize: pgSize});
            } catch (e) {
                r = s.runPaged({pageSize: pgSize});
                log.error('e runpage', e);
            }
            let numPage = r.pageRanges.length;
            let rs;
            try {
                rs = s.run();
            } catch (e) {
                rs = s.run();
                log.error('e searchPage', e);
            }
            let tempData;
            let numTemp;
            let totalRecord = 0;
            let objTemp;
            let tempValue;
            for (let np = 0; np < numPage; np++) {
                tempData = rs.getRange(np * pgSize, (np + 1) * pgSize);
                if (!!tempData) {
                    numTemp = tempData.length;
                    totalRecord = totalRecord + numTemp;
                    for (let i = 0; i < numTemp; i++) {
                        objTemp = {};
                        for (let lT = 0; lT < lengTemp; lT++) {
                            if (arrCol[lT][2] === 'sltext') {
                                tempValue = tempData[i].getText(c[arrCol[lT][1]]);
                            } else {
                                tempValue = tempData[i].getValue(c[arrCol[lT][1]]);
                            }
                            objTemp[arrCol[lT][0]] = tempValue;
                        }
                        results.push(objTemp);
                    }
                }
            }
            return totalRecord;
        }
        
        const doSearchSSMoreRange = (idSearch, pgSize, results, arrFilter, arrCol, columns_add, splice) => {
            let s = search.load(idSearch);
            let lengTemp;
            if (isContainValue(arrFilter)) {
                let f = s.filters;
                f = f.concat(arrFilter);
                s.filters = f;
            }
            lengTemp = arrCol.length;
            let c = s.columns;
            if (isContainValue(splice)) {
                for (let i in splice) {
                    c.splice(splice[i].splice_col_start, splice[i].splice_col_leng);
                }
            }
            if (isContainValue(columns_add)) {
                c = c.concat(columns_add);
                s.columns = c;
            }
            let r;
            try {
                r = s.runPaged({pageSize: pgSize});
            } catch (e) {
                r = s.runPaged({pageSize: pgSize});
                log.error('e runpage', e);
            }
            let numPage = r.pageRanges.length;
            let rs;
            try {
                rs = s.run();
            } catch (e) {
                rs = s.run();
                log.error('e searchPage', e);
            }
            
            let tempData;
            let numTemp;
            let totalRecord = 0;
            let objTemp;
            let tempValue;
            for (let np = 0; np < numPage; np++) {
                tempData = rs.getRange(np * pgSize, (np + 1) * pgSize);
                if (!!tempData) {
                    numTemp = tempData.length;
                    totalRecord = totalRecord + numTemp;
                    for (let i = 0; i < numTemp; i++) {
                        objTemp = {};
                        for (let lT = 0; lT < lengTemp; lT++) {
                            if (arrCol[lT][2] === 'sltext') {
                                tempValue = tempData[i].getText(c[arrCol[lT][1]]);
                            } else {
                                tempValue = tempData[i].getValue(c[arrCol[lT][1]]);
                            }
                            objTemp[arrCol[lT][0]] = tempValue;
                        }
                        results.push(objTemp);
                    }
                }
            }
            return totalRecord;
        }
        
        const doSearchSSRangeLabelId = (idSearch, pgSize, results, arrFilter, listColAdd) => {
            let s = search.load(idSearch);
            if (arrFilter) {
                let f = s.filters;
                s.filters = f.concat(arrFilter);
            }
            
            let c = s.columns;
            if (listColAdd) {
                c = c.concat(listColAdd);
                s.columns = c;
            }
            let cols = JSON.parse(JSON.stringify(c));
            let lengTemp = c.length;
            let r;
            try {
                r = s.runPaged({pageSize: pgSize});
            } catch (e) {
                r = s.runPaged({pageSize: pgSize});
                log.error('e runpage', e);
            }
            let numPage = r.pageRanges.length;
            let rs;
            try {
                rs = s.run();
            } catch (e) {
                rs = s.run();
                log.error('e searchPage', e);
            }
            let tempData;
            let numTemp;
            let objTemp;
            let totalRecord = 0;
            for (let np = 0; np < numPage; np++) {
                tempData = rs.getRange(np * pgSize, (np + 1) * pgSize);
                if (!!tempData) {
                    numTemp = tempData.length;
                    totalRecord = totalRecord + numTemp;
                    for (let i = 0; i < numTemp; i++) {
                        objTemp = {};
                        for (let lT = 0; lT < lengTemp; lT++) {
                            if (cols[lT].type === 'select') {
                                objTemp[cols[lT].label + '_display'] = tempData[i].getText(c[lT]);
                            }
                            objTemp[cols[lT].label] = tempData[i].getValue(c[lT]);
                        }
                        results.push(objTemp);
                    }
                }
            }
            return totalRecord;
        }
        
        const doSearchSSRangeLabelIdMappingColumn = (idSearch, pgSize, results, arrFilter, listColAdd, MappingColumn) => {
            let s = search.load(idSearch);
            if (arrFilter) {
                let f = s.filters;
                s.filters = f.concat(arrFilter);
            }
            
            let c = s.columns;
            if (listColAdd) {
                c = c.concat(listColAdd);
                s.columns = c;
            }
            let cols = JSON.parse(JSON.stringify(c));
            let lengTemp = c.length;
            let r;
            try {
                r = s.runPaged({pageSize: pgSize});
            } catch (e) {
                r = s.runPaged({pageSize: pgSize});
                log.error('e runpage', e);
            }
            let numPage = r.pageRanges.length;
            let rs;
            try {
                rs = s.run();
            } catch (e) {
                rs = s.run();
                log.error('e searchPage', e);
            }
            let tempData;
            let numTemp;
            let objTemp;
            let totalRecord = 0;
            for (let np = 0; np < numPage; np++) {
                tempData = rs.getRange(np * pgSize, (np + 1) * pgSize);
                if (!!tempData) {
                    numTemp = tempData.length;
                    totalRecord = totalRecord + numTemp;
                    for (let i = 0; i < numTemp; i++) {
                        objTemp = {};
                        for (let lT = 0; lT < lengTemp; lT++) {
                            if (cols[lT].type === 'select') {
                                objTemp[MappingColumn[cols[lT].label || cols[lT].label] + '_display'] = tempData[i].getText(c[lT]);
                            }
                            objTemp[MappingColumn[cols[lT].label] || cols[lT].label] = tempData[i].getValue(c[lT]);
                        }
                        results.push(objTemp);
                    }
                }
            }
            return totalRecord;
        }
        
        const addSelectionMulti = (fieldAdd, t, c, f, isaddnull, valuedefault) => {
            let s = search.create({type: t, filters: f, columns: c});
            let r = s.runPaged({pageSize: 1000});
            let numPage = r.pageRanges.length;
            let temp, text, isSelected = false;
            if (isaddnull) fieldAdd.addSelectOption({value: '', text: '---', isSelected: false});
            if (numPage === 0) return;
            for (let np = 0; np < numPage; np++) {
                let searchPage = r.fetch({index: np});
                let tempData = searchPage.data;
                if (!isContainValue(tempData)) continue;
                let numTemp = tempData.length;
                for (let i = 0; i < numTemp; i++) {
                    temp = tempData[i].getValue(c[0]);
                    text = tempData[i].getValue(c[1]);
                    isSelected = valuedefault && valuedefault.includes(temp);
                    fieldAdd.addSelectOption({value: temp, text: text, isSelected: isSelected});
                }
            }
        }
        
        const addFieldHidden = (form, id, value, type) => {
            let fieldAdd = form.addField({
                id: id,
                type: type || serverWidget.FieldType.TEXT,
                label: id
            });
            fieldAdd.updateDisplayType({displayType: serverWidget.FieldDisplayType.HIDDEN});
            fieldAdd.defaultValue = value;
        }
        
        /**
         * @param {form} _form
         * @param {Array} _lstLink : Get link of Saved Search {customsearch}, Script Deployment {customdeploy}:
         *  + Format Array String (with string is id mandatory) Or Array Object (With property {id} is mandatory and property {name} is option and property {internalid} is option). Ex:
         * [
         "customsearch_scv_venue_checkvn", //string id
         {id: "customsearch_scv_venue_regulatory", name: "SS02. CPL Venue Regulatory_Check Venue (Dont edit)"}, //object.id is mandatory and object.name is option
         "customsearch_scv_order_venue_manage",
         "customsearch_scv_venue_exception_day",
         "customsearch_scv_venue_ghep",
         "customdeploy_scv_sl_vcb_test",
         {id: "customdeploy_scv_sl_vcb_test", name: "customdeploy_scv_sl_vcb_test"},
         {id: "customdeploy_scv_sl_vcb_test", internalid: 1305}
         ]
         * @param {Boolean} isShowCurSuitelet : get link current Suitelet Script. Default is True
         */
        const addPageLinkForm = (_form, _lstLink, isShowCurSuitelet) => {
            isShowCurSuitelet = !isContainValue(isShowCurSuitelet);
            _lstLink = _lstLink || [];
            _lstLink = _lstLink.map(function (ele) {
                let objRes = {};
                if (typeof ele === 'object') {
                    objRes.id = ele.id || "";
                    objRes.name = ele.name || "";
                    objRes.url = ele.url || "";
                } else {
                    objRes.id = ele;
                    objRes.name = "";
                    objRes.url = "";
                }
                return objRes;
            })
            
            if (isShowCurSuitelet) {
                _lstLink.push({id: runtime.getCurrentScript().deploymentId, name: "Script Depoyment Current"})
            }
            
            try {
                let arrLinkSavedSearch = _lstLink.filter(function (ele) {
                    return ele.id.indexOf("customsearch") === 0 && !ele.name
                });
                if (arrLinkSavedSearch.length > 0) {
                    let resultSearch = search.create({
                        type: "savedsearch",
                        filters:
                            [
                                ["formulanumeric: CASE WHEN {id} IN ('" + arrLinkSavedSearch.map(function (ele) {
                                    return ele.id
                                }).join("','") + "') THEN 1 ELSE 0 END", "equalto", "1"]
                            ],
                        columns: ["title", "id"]
                    });
                    resultSearch = resultSearch.run().getRange(0, 100);
                    for (let i = 0; i < resultSearch.length; i++) {
                        let id = resultSearch[i].getValue("id");
                        
                        let idxLink_find = _lstLink.findIndex(function (ele) {
                            return String(ele.id) === String(id) && !ele.name;
                        });
                        if (idxLink_find > -1) {
                            _lstLink[idxLink_find].name = resultSearch[i].getValue("title");
                        }
                    }
                }
            } catch (err) {
                log.error("ERROR: TRY-CATCH: addPageLinkForm.customsearch", err)
            }
            
            try {
                let arrLinkDeploy = _lstLink.filter(function (ele) {
                    return ele.id.indexOf("customdeploy") === 0 && (!ele.internalid || !ele.name)
                });
                if (arrLinkDeploy.length > 0) {
                    let resultSearch = query.runSuiteQL({
                        query: "SELECT title, scriptid, primarykey FROM scriptdeployment WHERE scriptid IN ('" + arrLinkDeploy.map(function (ele) {
                            return ele.id
                        }).join("','") + "')"
                    });
                    resultSearch = resultSearch.asMappedResults();
                    for (let i = 0; i < resultSearch.length; i++) {
                        let id = resultSearch[i].scriptid;
                        
                        let idxLink_find = _lstLink.findIndex(function (ele) {
                            return String(ele.id) === String(id) && (!ele.internalid || !ele.name);
                        });
                        if (idxLink_find > -1) {
                            _lstLink[idxLink_find].name = !_lstLink[idxLink_find].name ? resultSearch[i].title : _lstLink[idxLink_find].name;
                            _lstLink[idxLink_find].internalid = !_lstLink[idxLink_find].internalid ? resultSearch[i].primarykey : _lstLink[idxLink_find].internalid;
                        }
                    }
                }
            } catch (err) {
                log.error("ERROR: TRY-CATCH: addPageLinkForm.customdeploy", err)
            }
            
            for (let i = 0; i < _lstLink.length; i++) {
                let urlPage = "";
                let linkId = _lstLink[i].id;
                if (linkId.indexOf("customsearch") === 0) {
                    urlPage = "/app/common/search/searchresults.nl?searchid=" + linkId;
                } else if (linkId.indexOf("custdataset") === 0) {
                    urlPage = "/app/common/report/dataset.nl?dataset=" + linkId;
                } else if (linkId.indexOf("customdeploy") === 0) {
                    urlPage = "/app/common/scripting/scriptrecord.nl?id=" + _lstLink[i].internalid;
                } else {
                    urlPage = _lstLink[i].url;
                }
                _form.addPageLink({type: "crosslink", title: _lstLink[i]?.name || linkId, url: urlPage})
            }
        }
        
        const addFieldSublistColCustom = (sublist, col) => {
            let lc = col.length;
            let ctemp, type, i;
            for (i = 0; i < lc; i++) {
                ctemp = col[i];
                type = ctemp.type;
                if (type.substring(0, 8) === 'currency') {
                    type = 'float';
                } else if (type === 'select') {
                    type = 'text';
                }
                addFieldInine(sublist, ctemp.id, type, ctemp.label, ctemp.displayType);
            }
        }
        
        const getUrlFileTemplate = (fileType, fileName) => {
            let sqlFileFontInfo = "select f.name, f.url from file f where f.filetype = ? and f.name = ?";
            return query.runSuiteQL({query: sqlFileFontInfo, params: [fileType, fileName]}).asMappedResults()[0]?.url;
        }
        
        const getListData = (keyData, sqlData) => {
            let listData = runtime.getCurrentSession().get(keyData);
            if (listData) {
                listData = JSON.parse(listData);
            } else {
                listData = [];
                doSearchSqlAll(listData, sqlData, []);
                runtime.getCurrentSession().set(keyData, JSON.stringify(listData));
            }
            return listData;
        }
        
        /**
         *
         * @param orgData ex: 'mot ${name} hai ${age}'
         * @param objData ex: {name: 'abc', age: 20}
         * @returns {*}
         */
        const putValueToString = (orgData, objData) => {
            return new Function('data', `with(data) { return \`${orgData}\`; }`)(objData);
        }
        
        /**
         *
         * @param datasetId ex: custdataset_scv_ds_ot_rbin
         * @param conditions ex: [dataset.createCondition({column: dataset.createColumn({fieldId: "custrecord_scv_opentask_item"}), operator: 'ANY_OF', values: [68]})]
         * @param columns ex: [dataset.createColumn({fieldId: "custrecord_scv_opentask_location", alias: "location"})]
         * @returns {*}
         */
        const getListDataFromDataSet = (datasetId, conditions, columns) => {
            let myDataset = dataset.load({
                id: datasetId
            });
            if(conditions && conditions.length > 0) {
                const originalCondition = myDataset.condition;
                myDataset.condition = dataset.createCondition({
                    operator: 'AND',
                    children: [originalCondition, ...conditions]
                });
            }
            
            if(columns && columns.length > 0) {
                myDataset.columns.push(...columns);
            }
            
            let resultSet = myDataset.run();
            
            return resultSet.asMappedResults();
        }
        
        const downloadFile = (context, fileName, safeContent) => {
            context.response.write(`
				<html>
					<body>
						<textarea id="excelData" style="display:none;">${encodeURIComponent(safeContent)}</textarea>
						<script type="application/javascript">
							let content = decodeURIComponent(document.getElementById("excelData").value);
							let filename = "${fileName}";

							let blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8;" });
							let url = URL.createObjectURL(blob);

							let link = document.createElement("a");
							link.href = url;
							link.download = filename;
							document.body.appendChild(link);
							link.click();

							URL.revokeObjectURL(url);

							setTimeout(function() {
							  window.close();
							}, 1000);
						</script>
					</body>
				</html>
			`);
        }
        
        return {
            isContainValue,
            addSelectSubsidiary,
            addAllSelectSubsidiary,
            addSelectSubsidiaryCustom,
            addSelectSubsidiaryCustomChild,
            addSearch,
            addSelectionEntity,
            addFieldSublist,
            addFieldSublistAdd,
            addFieldSublistCol,
            addFieldInine,
            getValueDisplay,
            addSelectType,
            addMultiSelectType,
            addSublistListFieldHiden,
            addSublistFieldHiden,
            addFieldSelect,
            addFieldSublistColId,
            addFieldHeader,
            addFieldLine,
            doSearch,
            addFieldHeaderOBJ,
            addFieldHeaderOBJList,
            addFieldHeaderCol,
            addFieldLineCol,
            addFieldHeaderColList,
            addFieldLineColList,
            addSelection,
            addSelectionViaSql,
            addSelectionFromField,
            doSearchSS,
            addSelecttionFrList,
            addSelectFrListVlTe,
            doSearchSSMore,
            getIndexColumns,
            isLeapYear,
            compositeArr,
            doSearchEach,
            doSearchSSMoreEach,
            addFieldSublistColumnsOfSS,
            doSearchSSPage,
            doSearchSSOrgPage,
            makeWhereList,
            makeWhereField,
            doSearchSql,
            doSearchSqlPage,
            doSearchSqlAll,
            doSearchSSRange,
            doSearchSSMoreRange,
            doSearchSSRangeLabelId,
            doSearchSSRangeLabelIdMappingColumn,
            addSelectionMulti,
            addFieldHidden,
            addPageLinkForm,
            addFieldSublistColCustom,
            getUrlFileTemplate,
            getListData,
            putValueToString,
            getListDataFromDataSet,
            downloadFile
        };
        
    });
