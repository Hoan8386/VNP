define(['N/query', 'N/search', 'N/ui/message', 'N/ui/dialog'],
    
    (query, search, message, dialog) => {
        
        const LOADING = `
        .scvLoader {
            width: 100px; height: 100px;
            border: 8px solid #e0e0e0;
            border-bottom-color: #0288d1;
            border-radius: 50%; display: inline-block; box-sizing: border-box; position: fixed;
            transform: translate(-50%, -50%); animation: scvRotationLoading 1s linear infinite;
        }
        .scvProgessStatus {
            position: fixed; top: 50%; left: 50%; font-size: 12px; transform: translate(-50%, -50%);
        }
        .scvMainLoader {
            position: fixed; top: 0; left: 0; height: 100%; width: 100%; z-index: 9999;
            display: flex; justify-content:center; align-items:center;
            flex-direction: column; background-color: rgba(255, 255, 255, 0.85);
        }
        @keyframes scvRotationLoading {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }`;
        
        const isContainValue = (value) => {
            let isContain = false;
            if (value !== undefined && value !== null && value !== '') {
                if (util.isArray(value)) {
                    if (value.length > 0) {
                        isContain = true;
                    }
                } else {
                    isContain = true;
                }
            }
            return isContain;
        }
        
        const insertSelectionViaSql = (fieldAdd, sqlQuery, paramsQuery, isAddNull, valueDefault) => {
            let isSelected = false;
            if (isAddNull) {
                fieldAdd.insertSelectOption({value: '', text: '---', isSelected: !valueDefault || !String(valueDefault)});
            }
            let resultSet = query.runSuiteQL({
                query: sqlQuery,
                params: paramsQuery
            });
            let listRes = resultSet.asMappedResults();
            valueDefault = util.isArray(valueDefault) ? valueDefault.map(x => String(x)) : [String(valueDefault || '')];
            for (let objRes of listRes) {
                isSelected = valueDefault && valueDefault.includes(String(objRes.value));
                fieldAdd.insertSelectOption({value: objRes.value, text: objRes.text, isSelected: isSelected});
            }
        }
        
        const insertSelectionViaSavedSearch = (listFields, savedSearch, filters, isAddNull, valueDefault) => {
            if (listFields != null) {
                let field = null;
                let s = search.load(savedSearch);
                if(filters) {
                    s.filters = s.filters.concat(filters);
                }
                let r = s.runPaged({pageSize: 1000});
                let c = s.columns;
                let columnValue = c.find(o => o.name === 'value') || c[0];
                let columnText = c.find(o => o.name === 'text' || o.name === 'label') || c[1];
                
                let numPage = r.pageRanges.length;
                let value, text, isSelected = false, searchPage, numTemp, tempData;
                
                for (let i in listFields) {
                    field = listFields[i];
                    if (field != null) {
                        field.removeSelectOption({value: null});
                        if (isAddNull) {
                            field.insertSelectOption({value: '', text: '-----'});
                        }
                        if (numPage > 0) {
                            for (let np = 0; np < numPage; np++) {
                                searchPage = r.fetch({index: np});
                                tempData = searchPage.data;
                                if (isContainValue(tempData)) {
                                    numTemp = tempData.length;
                                    for (let i = 0; i < numTemp; i++) {
                                        value = tempData[i].getValue(columnValue);
                                        text = tempData[i].getValue(columnText);
                                        isSelected = valueDefault && (util.isArray(valueDefault) ? valueDefault.includes(value) : value === valueDefault);
                                        field.insertSelectOption({
                                            value: value,
                                            text: text,
                                            isSelected: isSelected
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        const insertSelection = (listFields, t, c, f, isAddNull, valueDefault) => {
            if (listFields != null) {
                let field = null;
                let s = search.create({
                    type: t,
                    filters: f,
                    columns: c
                });
                let r = s.runPaged({pageSize: 1000});
                let numPage = r.pageRanges.length;
                let temp, text, isSelected = false, searchPage, numTemp, tempData;
                
                for (let i in listFields) {
                    field = listFields[i];
                    if (field != null) {
                        field.removeSelectOption({value: null});
                        if (isAddNull) {
                            field.insertSelectOption({value: '', text: '-----'});
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
                                        isSelected = valueDefault && (util.isArray(valueDefault) ? valueDefault.includes(temp) : temp === valueDefault);
                                        field.insertSelectOption({
                                            value: temp,
                                            text: text,
                                            isSelected: isSelected
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        const insertSelectionFlowListValue = (listFields, isAddNull, valueDefault, listValues) => {
            if (listFields != null) {
                for (let i in listFields) {
                    insertSelectionFromListValue(listFields[i], isAddNull, valueDefault, listValues);
                }
            }
        }
        
        const insertSelectionFromListValue = (field, isAddNull, valueDefault, listValues) => {
            if (field != null) {
                field.removeSelectOption({value: null});
                if (isAddNull) {
                    field.insertSelectOption({value: '', text: '-----'});
                }
                if (listValues.length > 0) {
                    for (let objValue of listValues) {
                        let isSelected = valueDefault && (valueDefault === objValue.value || (util.isArray(valueDefault) && valueDefault.includes(objValue.value)));
                        field.insertSelectOption({
                            value: objValue.value,
                            text: objValue.text,
                            isSelected: isSelected
                        });
                    }
                }
            }
        }
        
        const insertSelectionFromField = (toField, fromField, isAddNull, valueDefault) => {
            toField.removeSelectOption({value: null});
            if (isAddNull) {
                toField.insertSelectOption({value: '', text: '---', isSelected: false});
            }
            if (fromField) {
                let selectOptions = fromField.getSelectOptions();
                for (let objSelectOption of selectOptions) {
                    let isSelected = valueDefault && (String(objSelectOption.value) === String(valueDefault));
                    toField.insertSelectOption({
                        value: objSelectOption.value,
                        text: objSelectOption.text,
                        isSelected: isSelected
                    });
                }
            }
        }
        
        const validateFieldMandatory = (curRec, lstFields) => {
            let isValid = true;
            for (let i = 0; i < lstFields.length; i++) {
                let infoField = curRec.getField(lstFields[i]);
                if (!infoField) continue;
                
                if (infoField.isMandatory === true) {
                    let valueField = curRec.getValue(lstFields[i]);
                    if (infoField.type === "multiselect") {
                        if (valueField.length > 0 && !isContainValue(valueField[0])) {
                            isValid = false;
                            alert("Please enter value(s) for: " + infoField.label);
                            break;
                        }
                    }
                    if (!isContainValue(valueField)) {
                        isValid = false;
                        alert("Please enter value(s) for: " + infoField.label);
                        break;
                    }
                }
            }
            
            return isValid;
        }
        
        const hidePleaseWait = () => {
            let loadingMessage = document.getElementById('loadingMessage');
            if (loadingMessage) {
                loadingMessage.remove();
            }
        }
        
        const showLoadingDialog = (isShow) => {
            let progessElement = "";
            if (isShow) {
                let container = document.getElementById("pageContainer") || document.getElementById("outerwrapper");
                if (!container) return console.error("Not found ElementId");
                
                loadStyleToHtmlPage(container);
                let mainLoader = document.createElement('div');
                mainLoader.classList.add("scvMainLoader");
                mainLoader.innerHTML = '<span class="scvLoader"></span><span id="idxProgessStatus" class="scvProgessStatus">Processing...</span>';
                
                container.appendChild(mainLoader);
                progessElement = document.querySelector(".scvProgessStatus");
            } else {
                let mainLoader = document.querySelector(".scvMainLoader");
                if (mainLoader) mainLoader.remove();
            }
            return progessElement;
        }
        
        const loadStyleToHtmlPage = (container) => {
            let addLoading = container.getAttribute("scv-add-loading");
            if (addLoading === "T") return;
            container.setAttribute("scv-add-loading", "T");
            
            let linkElement = document.createElement('style');
            let textNode = document.createTextNode(LOADING);
            linkElement.appendChild(textNode);
            document.head.appendChild(linkElement);
        }
        
        const updateProgessStatus = (_msg) => {
            jQuery("#idxProgessStatus").html(_msg);
        }
        
        const validateDate = (currentRecord, sonam) => {
            let isValid = true;
            let objFromdate = currentRecord.getValue('custpage_fromdate');
            let objTodate = currentRecord.getValue('custpage_todate');
            if (objFromdate && objTodate) {
                let fromYear = objFromdate.getFullYear();
                let toYear = objTodate.getFullYear();
                let subOfFomtoyear = toYear - fromYear;
                if (sonam && subOfFomtoyear > sonam) {
                    isValid = false;
                    alert('Bạn chỉ được trong vòng ' + (sonam + 1) + ' năm');
                } else if (subOfFomtoyear < 0) {
                    isValid = false;
                    alert('ĐẾN NGÀY phải lớn hơn TỪ NGÀY!');
                }
            }
            return isValid;
        }
        
        const updateRowHeight = (worksheet, duan_display, extendNumber, rowNumber, lengRow) => {
            const row1 = worksheet.getRow(rowNumber);
            row1.height = calculateRowHeight(duan_display, extendNumber, lengRow);
        }
        
        const calculateRowHeight = (cellValue, extendNumber, lengRow) => {
            const lineHeight = 16.8;
            const numLines = Math.ceil((cellValue.length + extendNumber) / lengRow);
            return lineHeight * numLines;
        }
        
        const getProjectNameForSublist = (currentRecord) => {
            let listProjectText = currentRecord.getText('custpage_project');
            for (let idx in listProjectText) {
                let valueProject = listProjectText[idx];
                listProjectText[idx] = valueProject.substring(0, 31);
            }
            return listProjectText;
        }
        
        const validateFields = (curRec, arrFields) => {
            const lF = arrFields.length;
            for (let i = 0; i < lF; i++) {
                const fld = arrFields[i];
                const objFld = curRec.getField(fld);
                const val = curRec.getValue(fld);
                if (val === null || val === '' || !val.toString()) {
                    alert('Please fill in ' + objFld.label + ' field');
                    return false;
                }
            }
            return true;
        }
        
        const showMsgError = (_msg, _duration = 10000) => {
            return message.create({
                title: "Error",
                message: _msg || "Error",
                type: message.Type.ERROR
            }).show({duration: _duration});
        }
        
        const showMessage = (title, msg) => {
            dialog.alert({
                title: title || "Thông báo!",
                message: msg
            });
        }
        
        const unReText = (text) => {
            let textReplace = text
            if (isContainValue(text)) {
                textReplace = textReplace.replace(/&amp;/gi, '&').replace(/&gt;/gi, ">").replace(/&lt;/gi, "<").replace(/&apos;/g, "'").replace(/&quot;/g, "\"").replace(//g, "");
            }
            return textReplace;
        }
        
        const parseBodyDatax3C = (bodyData) => {
            let idx3C = bodyData.indexOf('\x3C!');
            if (idx3C >= 0) {
                bodyData = unReText(bodyData.substring(0, idx3C));
            }
            return bodyData;
        }
        
        const delay = (ms) => {
            return new Promise(function (resolve) {
                setTimeout(resolve, ms);
            });
        }
        
        const showPleaseWait = () => {
            let loadingMessage = document.createElement('div');
            loadingMessage.id = 'loadingMessage';
            loadingMessage.style.position = 'fixed';
            loadingMessage.style.top = '50%';
            loadingMessage.style.left = '50%';
            loadingMessage.style.transform = 'translate(-50%, -50%)';
            loadingMessage.style.zIndex = '1000';
            loadingMessage.style.backgroundColor = 'white';
            loadingMessage.style.padding = '20px';
            loadingMessage.style.border = '1px solid #000';
            loadingMessage.style.borderRadius = '15px'; // Bo góc cho hình vuông
            loadingMessage.style.display = 'flex';
            loadingMessage.style.alignItems = 'center';
            loadingMessage.style.gap = '10px'; // Khoảng cách giữa vòng xoay và chữ "Please wait"
            
            // Tạo phần tử vòng xoay
            let spinner = document.createElement('div');
            spinner.style.width = '24px';
            spinner.style.height = '24px';
            spinner.style.border = '4px solid #ccc';
            spinner.style.borderTop = '4px solid #000';
            spinner.style.borderRadius = '50%';
            spinner.style.animation = 'spin 1s linear infinite';
            
            // Thêm vòng xoay và thông báo vào trong loadingMessage
            loadingMessage.appendChild(spinner);
            loadingMessage.innerHTML += 'Please wait...';
            
            // Thêm loadingMessage vào trang
            document.body.appendChild(loadingMessage);
            
            // CSS cho hiệu ứng xoay
            let style = document.createElement('style');
            style.innerHTML = `
		@keyframes spin {
			0% { transform: rotate(0deg); }
			100% { transform: rotate(360deg); }
		}
	`;
            document.head.appendChild(style);
        }
        
        const addSelecttionFrList = (fRep, value, listReport, isaddnull) => {
            let lR = listReport.length;
            let isSelected = false;
            fRep.removeSelectOption({value: null});
            if (isaddnull) {
                fRep.insertSelectOption({value: '', text: '---', isSelected: false});
            }
            for (let i = 0; i < lR; i++) {
                isSelected = value === listReport[i].value;
                fRep.insertSelectOption({
                    value: listReport[i].value,
                    text: listReport[i].label || listReport[i].text,
                    isSelected: isSelected
                });
            }
        }
        
        const onGroupCollapseExpand = () => {
            //No thing
        }
        
        const isSelectLine = (curRec, sublist, fieldId) => {
            let lc = curRec.getLineCount(sublist);
            for (let i = 0; i < lc; i++) {
                let chk = curRec.getSublistValue(sublist, fieldId, i);
                if (chk === true || chk === "T") return true;
            }
            return false;
        }
        
        const getObjParamsUrl = (_curRec) => {
            let entryformquerystring = _curRec.getValue("entryformquerystring");
            if(!entryformquerystring) return {};
            
            let objParams = {};
            let arrKeyValue = entryformquerystring.split("&");
            arrKeyValue.forEach(key_value => objParams[key_value.split("=")[0]] = key_value.split("=")[1]);
            
            return objParams;
        }
        
        const focusFieldId = (elementId) => {
            let element = document.getElementById(elementId);
            if (!!element) {
                element.focus();
            }
        }
        
        const generateLinkTagInHtml = (urlRec, tranId, title) => {
            let html = `<span style="font-weight: bold;">${title}: </span>`;
            html += `<span><a href="${urlRec}" target="_blank" style="color: #1e88e5">${tranId}</a>`;
            html += `</span>`;
            return html;
        }
        
        const generateTextErrorInHtml = (title) => {
            return `<span style="font-weight: bold;">Error: </span><span style="color: #d32f2f">${title}!</span>`;
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
        
        const putValueToCell = (currentSheet, addressCell, objData) => {
            let cell = currentSheet.getCell(addressCell);
            if (cell) {
                cell.value = typeof objData === 'object' ? putValueToString(typeof cell.value === 'object' ? cell.value.richText[0].text: cell.value, objData) : objData;
            }
        }
        
        const addButtonMakeCopy = (curRec, sublistId, fields, objMachine) => {
            const sublistButtons = document.getElementById(sublistId + "_buttons");
            if(!sublistButtons) return;
            let curRow = sublistButtons.querySelector("table tr");
            
            let cellIndex = (curRow.cells.length - 1);
            let cell = curRow.insertCell(cellIndex);
            let inputElement = createCellElement(cell, sublistId, "Make Copy", "make_copy");
            let parentElement = inputElement.parentElement;
            
            inputElement.addEventListener("mouseover",  () => {
                parentElement.style.setProperty("background-color", "#E8E8E8", "important");
            });
            inputElement.addEventListener("mouseleave",  () => {
                parentElement.style.setProperty("background-color", "#F2F2F2", "important");
            });
            inputElement.addEventListener("click", (e) => {
                let objCurData = {};
                for(let fieldId of fields) {
                    objCurData[fieldId] = curRec.getCurrentSublistValue(sublistId, fieldId);
                }
                // insert new line and copy data current line
                objMachine.insertline();

                for(let fieldId of fields) {
                    curRec.setCurrentSublistValue(sublistId, fieldId, objCurData[fieldId]);
                }
                // new line must get its own origin line id, not a copy of the source line's
                curRec.setCurrentSublistValue(sublistId, "custcol_scv_origin_line_num", "");
            });
        }
        
        const createCellElement = (cell, sublistId, buttonName, id) => {
            let inputId = sublistId + id;
            
            let inputStyle = "color: #333 !important; font-size: 13px !important; padding: 0px 8px !important;";
            let bntBgCustom = "background: #F2F2F2 !important; border-radius: 3px; border: 1px solid #B2B2B2 !important;";
            cell.innerHTML = `
                <table class="machBnt" id="tbl_${inputId}" cellpadding="0" cellspacing="0" border="0" style="cursor:hand;" role="presentation">
                    <tbody>
                        <tr>
                            <td class="bntBgB" style="${bntBgCustom}" valign="top">
                                <input type="button" style="${inputStyle}" class="rndbuttoninpt bntBgT" value="${buttonName}" id="${inputId}" name="${inputId}"/>
                            </td>
                        </tr>
                    </tbody>
                </table>`;
            
            return document.getElementById(inputId);
        }
        
        const htmlDecode = (str) => {
            return str
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
        }
        
        return {
            isContainValue,
            insertSelectionViaSql,
            insertSelectionViaSavedSearch,
            insertSelection,
            insertSelectionFlowListValue,
            insertSelectionFromListValue,
            insertSelectionFromField,
            hidePleaseWait,
            showLoadingDialog,
            updateProgessStatus,
            validateFieldMandatory,
            validateDate,
            updateRowHeight,
            validateFields,
            getProjectNameForSublist,
            showMsgError,
            showMessage,
            parseBodyDatax3C,
            delay,
            showPleaseWait,
            addSelecttionFrList,
            onGroupCollapseExpand,
            isSelectLine,
            getObjParamsUrl,
            focusFieldId,
            generateLinkTagInHtml,
            generateTextErrorInHtml,
            putValueToString,
            putValueToCell,
            addButtonMakeCopy,
            htmlDecode
        };
        
    });
