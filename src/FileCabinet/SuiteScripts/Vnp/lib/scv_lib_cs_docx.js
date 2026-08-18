/**
 * Nội dung: Lib export file docx
 * Note:
 * +++++
 * Performance
 * Docxtemplater is quite fast, for a pretty complex 50 page document, it can generate 250 output of those documents in 44 seconds, which is about 180ms per document.
 * ++++
 * =======================================================================================
 *  Date                Author                  Description
 * 18 Mar 2024          Duy Nguyen              Int create file
 * 17 Aug 2026          SuiteCloud              Refactor function declaration -> arrow function
 */
define([],
    () => {
        if (typeof docxtemplater == "undefined") {
            jQuery.getScript('https://cdnjs.cloudflare.com/ajax/libs/docxtemplater/3.45.0/docxtemplater.js');
        }
        if (typeof saveAs == "undefined") {
            jQuery.getScript('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js');
        }
        if (typeof PizZipUtils == "undefined") {
            jQuery.getScript('https://unpkg.com/pizzip@3.1.6/dist/pizzip-utils.js');
        }
        if (typeof PizZip == "undefined") {
            jQuery.getScript('https://unpkg.com/pizzip@3.1.6/dist/pizzip.js');
        }
        if (typeof PizZip == "undefined") {
            jQuery.getScript('https://ajax.googleapis.com/ajax/libs/angularjs/1.6.9/angular.min.js');
        }
        // Load icon
        jQuery.getScript("https://use.fontawesome.com/releases/v5.0.4/js/all.js");

        /**
         * A function to initialize an object for generating a docx file.
         *
         * @param {_objInitDocx} _objInitDocx - the object for initializing the docx generation
         * @return {Object} an object indicating the success of the initialization
         */
        const initObjectGenerateDocx = (_objInitDocx) => {
            // console.time("Time");
            let objInitDocx = JSON.parse(JSON.stringify(_objInitDocx || {}));
            // API
            objInitDocx.listAPI = objInitDocx?.listAPI || [];
            const initData = objInitDocx?.initData || {}
            // Init Data
            objInitDocx.initData = {
                nameFile: 'Report.docx', ...initData
            };
            // Add Custom Object for template
            objInitDocx.data = isValid(objInitDocx?.data) ? objInitDocx.data : [];
            // Add Option render Docx
            const optionsDocx = objInitDocx?.optionsDocx || {}
            objInitDocx.optionsDocx = {
                nullGetter,
                margin: {
                    top: "0.75in", right: "0.75in", bottom: "0.75in", left: "0.75in",
                },
                module: [],
                parser: expressionParser,
                paragraphLoop: true,
                linebreaks: true,
                delimiters: {start: "{", end: "}"}, ...optionsDocx
            };
            // if (!!optionsDocx.optionsDocx.module && optionsDocx.optionsDocx.module.length) {
            // }

            // Load link File
            const _linkFileTemplateDocx = objInitDocx?.templateUrl || window.objInitDocx?.templateUrl;
            if (!isValid(_linkFileTemplateDocx)) {
                alert("Chưa setup mẫu template word tương ứng!")
                return {
                    isValid: false
                };
            }
            jsSetValueToObject(objInitDocx, 'linkFileReader', _linkFileTemplateDocx);
            // Init
            window.objInitDocx = objInitDocx;
            return {
                isValid: true
            };
        }

        const expressionParser = (tag) => {
            const boldRegex = /^\[b\]/; // Bold text
            const normalRegex = /^\[n\]/; // Normal text
            const strNumRegex = /\[sn\]/; // change number to string
            const funcRegex = /^\[func\]/;
            const perRegex = /\[per\]/;
            const lowerRegex = /\[lower\]$/;
            const upperRegex = /\[upper\]$/;
            let changeCase = "", changeNumber = "", changeSyn = "";

            if (perRegex.test(tag)) {
                changeSyn = "per";
                tag = tag.replace(perRegex, "");
            }
            if (boldRegex.test(tag)) {
                changeCase = "b";
                tag = tag.replace(boldRegex, "");
            }
            // change number to string
            if (strNumRegex.test(tag)) {
                changeNumber = "sn";
                tag = tag.replace(strNumRegex, "");
            }
            if (normalRegex.test(tag)) {
                changeCase = "n";
                tag = tag.replace(normalRegex, "");
            }
            if (lowerRegex.test(tag)) {
                changeCase = "lower";
                // transform tag from "user[lower]" to "user"
                tag = tag.replace(lowerRegex, "");
            }
            if (upperRegex.test(tag)) {
                changeCase = "upper";
                // transform tag from "user[upper]" to "user"
                tag = tag.replace(upperRegex, "");
            }
            if (funcRegex.test(tag)) {
                changeCase = "func"
                tag = tag.replace(funcRegex, "");
            }
            return {
                get: (scope) => {
                    let result = null;
                    if (changeCase === 'func') {
                        result = scope[tag.split("|")[1]];
                    } else if (changeCase === 'b') {
                        result = scope?.bold === 'T' ? scope[tag] : '';
                    } else if (changeCase === 'n') {
                        result = scope?.bold !== 'T' ? scope[tag] : '';
                    } else {
                        switch (tag) {
                            case ".":
                                result = scope;
                                break;
                            default :
                                result = scope[tag];
                                break;
                        }
                    }
                    if (typeof result === "string") {
                        switch (changeCase) {
                            case "upper":
                                result = result.toUpperCase();
                                break;
                            case "lower":
                                result = result.toLowerCase();
                                break;
                        }
                    }
                    // change number
                    if (!!changeNumber && !!result && isNumeric(result)) {
                        switch (changeNumber) {
                            case "sn":
                                result = changeCurrency(result);
                                break;
                        }
                    }

                    if (changeSyn && !!result) {
                        switch (changeSyn) {
                            case "per":
                                result = result ? result + " %" : result;
                                break;
                        }
                    }

                    if (result === undefined) {
                        return '';
                    }
                    return result;
                },
            };
        }

        /**
         * Generates a file in the DOCX format based on the specified method.
         *
         * @param {string} [_method='async'] - The method used to generate the file. Defaults to 'async'.
         * @param {boolean} [isLoop=true] - Whether to loop the generation process. Defaults to true.
         */
        const generateFileDocx = (_method = 'async', isLoop = true) => {
            let funcHandle;
            switch (_method) {
                case 'async':
                    funcHandle = jsAsyncHandleFile;
                    break;
                default:
                    funcHandle = jsHandleFile;
                    break;
            }
            showLoading(true);
            // Prompt the user to confirm if they want to download the file
            if (isLoop) {
                // Log the initial object
                console.log(JSON.stringify(window.objInitDocx));
                generateFile(funcHandle);
            }
            if (!isLoop) {
                generateFile(funcHandle);
            }

        }

        const generateFile = (funcHandle) => {
            if (Object.keys(window?.objInitDocx || {}).length === 0) {
                generateFileDocx('async', false);
            } else {
                // Load the file using the specified function handle
                loadFile(window.objInitDocx.linkFileReader, funcHandle);
            }
        }

        /**
         * Handles the content of a file asynchronously
         * @param {Error} error - The error, if any, encountered during file handling
         * @param {string} content - The content of the file
         */
        const jsAsyncHandleFile = (error, content) => {
            if (error) {
                showLoading(false);
                throw error;
            }
            const listAPI = window.objInitDocx.listAPI;
            const zip = new PizZip(content);
            const doc = new window.docxtemplater(zip, window.objInitDocx.optionsDocx);
            postToMultipleAPI(listAPI)
                .then(res => addDataToDocObject(doc, res))
                .catch(err => {
                    showLoading(false);
                    alert('Error generate File!!');
                    console.log(err);
                })
        }


        const addDataToDocObject = (doc, arrayObjectData) => {
            if (!isValid(arrayObjectData)) {
                arrayObjectData = [];
            }
            // console.log("arrayObjectData", arrayObjectData)
            // Init Data
            let objResult = {};
            let objData = initObjDataRender();
            Object.assign(objResult, objData);
            // Default data
            const defaultObject = window.objInitDocx?.data;
            const listKeys = Object.keys(defaultObject);
            for (let k of listKeys) {
                objResult[k] = defaultObject[k];
            }
            // Custom data
            for (let o of arrayObjectData) Object.assign(objResult, o);
            // Render
            console.log(objResult)
            doc.render(objResult);
            jsGenerateFileDoc(doc, window.objInitDocx.initData);
        }

        const initObjDataRender = () => {
            return {
                pageBreak: generateTagXML('pageBreak'), bold: generateTagXML('bold'), html: '<h1>Hello Word!!</h1>'
            }
        }


        /**
         * Creates an API object with the specified action.
         *
         * @param {string} api - The API name.
         * @param {string} action - The action name.
         * @returns {Object} - The API object with the specified action.
         */
        const createAPI = (api, action) => {
            // Create and return the API object
            return {
                api: api, // Set the API name
                data: {
                    action: action // Set the action name
                }
            };
        }

        /**
         * Asynchronously sends POST requests to multiple APIs and waits for all the requests to resolve.
         * @param {Array} listAPI - List of objects containing the URL and data for each API request
         * @returns {Promise} - A promise that resolves when all the requests have resolved, or rejects if any of the requests fail
         */
        const postToMultipleAPI = async (listAPI) => {
            try {
                let requests = listAPI.map(apiInfo => {
                    return NS.jQuery.ajax({
                        type: 'POST', url: apiInfo.url, async: true, data: apiInfo.data, dataType: "json"
                    });
                });
                // Promise.all will wait for all the requests to resolve
                return await Promise.all(requests);
            } catch (error) {
                console.error('Error with one of the jQuery.ajax requests:', error);
                throw error; // Optionally re-throw to allow error handling by the caller
            }
        }

        /**
         * Loads a file from a given URL and calls the specified callback function.
         * @param {string} url - The URL of the file to load.
         * @param {Function} callback - The callback function to be called with the file content.
         */
        const loadFile = (url, callback) => {
            new PizZipUtils.getBinaryContent(url, callback);
        }

        const jsHandleFile = (error, content) => {
            if (error) {
                showLoading(false);
                throw error;
            }
            const zip = new PizZip(content);
            const doc = new window.docxtemplater(zip, window.objInitDocx.optionsDocx);
            // Render the document
            addDataToDocObject(doc);
        }


        const jsGenerateFileDoc = (doc, options) => {
            const name = options.nameFile || "example.docx";
            const compression = options.compression || "DEFLATE";
            const type = options.type || "blob";
            const mimeType = options.mimeType || "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            const blob = doc.getZip().generate({
                type: type, mimeType: mimeType, // compression: DEFLATE adds a compression step.
                // For a 50MB output document, expect 500ms additional CPU time
                compression: compression,
            });
            saveAs(blob, name);
            showLoading(false);
        }

        const showLoading = (isValid) => {
            if (!isValid) {
                jQuery('#_loading_dialog').dialog('close');
                return;
            }
            jQuery('#_loading_dialog').dialog({
                modal: true,
                width: 400,
                height: 160,
                resizable: false,
                closeOnEscape: false,
                position: {my: "top", at: "top+160", of: '#main_form'},
                open: (evt, ui) => {
                    // jQuery(".ui-dialog-titlebar-close").hide();
                    // setTimeout(runAutomation, 100);
                }
            });
        }

        const initTagLoadingIcon = () => {
            jQuery('body').append('<div id="dk-ShowLoading"></div>');
            jQuery('#dk-ShowLoading')
                .html(`<link rel="stylesheet" href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css">
                <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>
                <script defer src="https://use.fontawesome.com/releases/v5.0.4/js/all.js"></script>
                <div id="_loading_dialog" title="Loading dialog"></div>`);
            jQuery('#_loading_dialog').attr('title', 'Downloading...');
            jQuery('#_loading_dialog').html(`<div style="text-align: center; font-style: italic;">Please wait.</div>
        <br><br>
        <div style="text-align: center; width:100%;">
        <i class="fas fa-cog fa-spin" data-fa-transform="grow-18"></i>
        </div>`);
        }


        const jsSetValueToObject = (obj, key, value) => {
            if (isValid(obj[key]) === false) {
                obj[key] = value;
            }
        }

        const changeCurrency = (number) => {
            if (isValid(number)) {
                let parts = number.toString().split(".");
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                if (parts[1] !== '00') {
                    return parts.join(",");
                } else {
                    return parts[0];
                }
            }
            return '';
        }


        const isValid = value => value !== "" && value !== null && value !== undefined ? typeof value === "object" ? Array.isArray(value) ? value.length > 0 : (!isNaN(value) || Object.keys(value).length > 0) : true : false;

        const isNumeric = (string) => /^[+-]?\d+(\.\d+)?$/.test(string)


        const nullGetter = (part) => {
            if (part.raw) {
                return "{" + part.raw + "}";
            }
            if (!part.module && part.value) {
                return "{" + part.value + "}";
            }
            return "";
        }

        /**
         * Generates an XML tag based on the provided tag name.
         *
         * @param {string} tag - The name of the tag to generate.
         * @returns {string} The generated XML tag.
         */
        const generateTagXML = (tag) => {
            switch (tag) {
                case 'pageBreak':
                    return `<w:p> <w:r> <w:br w:type="page" /> </w:r> </w:p> `// {{@pageBreak}}
                case 'bold':
                    return `<w:p> <w:rPr> <w:b w:val="true"/> </w:rPr> <w:r>Hello Word </w:r> </w:p>`;
                default:
                    return '';

            }
        }


        const nonAsyncPostDataByAjax = (_urlReq, _params, _callbackSucc, _callbackErr) => {
            return requestDataByAjax("post", _urlReq, false, _params, _callbackSucc, _callbackErr);
        }

        const requestDataByAjax = (_method, _urlReq, _isAsync, _params, _callbackSucc, _callbackErr) => {
            let resResult = {};

            jQuery.ajax({
                type: _method, url: _urlReq, dataType: "json", async: _isAsync, data: {..._params}
            }).done((response) => {
                resResult = {...response};
                if (typeof _callbackSucc == "function") {
                    _callbackSucc(resResult, _params);
                }
            }).fail((request, status, error) => {
                if (typeof _callbackErr == "function") {
                    _callbackErr(request, status, error);
                }
            });

            return resResult;
        }

        // Arrow function không được hoisting như function declaration,
        // nên lời gọi này phải nằm sau phần định nghĩa initTagLoadingIcon
        !(() => initTagLoadingIcon())();

        return {
            initObjectGenerateDocx, generateFileDocx, nonAsyncPostDataByAjax
        }

    });