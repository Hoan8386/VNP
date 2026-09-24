/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
    'N/url',
],

function(
    url,
) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */

    const FormType = {
        Create: {
            ID: "create",
            NAME: "Tạo mới",
        },
        Print: {
            ID: "print",
            NAME: "Mẫu in",
        }
    };

    const EntityType = {
        CUSTOMER: {
            ID: 2,
            NAME: "Customer"
        },
        VENDOR: {
            ID: 1,
            NAME: "Vendor"
        }
    };

    function pageInit(scriptContext) {

    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {

    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {
        const curRec = scriptContext.currentRecord;
        let formType = curRec.getValue("custpage_form_type");

        if(formType != FormType.Create.ID) {
            alert("Bạn không thể thực hiện chức năng với type này!");
            return false;
        }

        return true;
    }

    const onSearchResult = async (_isExport = 'F') => {
        window.onbeforeunload = null;

        let params = _scvForm.getParameter();
        let fields = ["custpage_form_type", "custpage_entity"];

        let isValid = _scvForm.validateFieldMandatory(fields);
        if(!isValid) return;

        if(_isExport === 'T') {
            if(params.custpage_form_type != FormType.Print.ID) {
                alert("Bạn không thể thực hiện chức năng với type này!");
                return;
            }

            _scvForm.showLoadingDialog(true);
            _scvForm.ajax.postAsync(_scvForm.serviceScript.url, {
                ...params,
                action: "runFilterSS",
            }, async (response) => {

                if(response.entity_type == EntityType.CUSTOMER.ID) {
                    await onExportEvalCustomer(response);
                } else if (response.entity_type == EntityType.VENDOR.ID) {
                    await onExportEvalVendor(response);
                }
                _scvForm.showLoadingDialog(false);
            });
        } else {
            _scvForm.showLoadingDialog(true);
            await _scvForm.delay(100);

            const baseUrl = url.resolveScript({
                scriptId: _scvForm.currentScript.id,
                deploymentId: _scvForm.currentScript.deploymentId,
                returnExternalUrl: false
            });

            let urlDC = baseUrl + plusParam(params) + "&isrun=T";
            window.location.replace(urlDC);
        }
    }

    const onExportEvalCustomer = async (response) => {
        const objResult = {...response.objResult};
        const templateBuffer = await _scvDocxJS.loadFile(response.template);

        if(!!response.objSubsidiary.logoUrl) {
            let objLogo = await _scvDocxJS.getImageDataFromUrl(response.objSubsidiary.logoUrl, 120, "logo");
            objResult[objLogo.key] = objLogo.base64;

            _scvDocxJS.addImageModule(function(imgBuffer, imgValue, tagName, meta) {
                if(tagName == objLogo.key) {
                    return objLogo.size;
                }
                
                return _scvDocxJS.logoSize;
            });
        }

        const options = {
            templateBuffer,
            fileName: response.fileName,
            objResult: objResult
        };
        _scvDocxJS.downloadDocxBuffer(options);
    }

    const onExportEvalVendor = async (response) => {
        const objResult = {...response.objResult};
        const templateBuffer = await _scvDocxJS.loadFile(response.template);

        if(!!response.objSubsidiary.logoUrl) {
            let objLogo = await _scvDocxJS.getImageDataFromUrl(response.objSubsidiary.logoUrl, 120, "logo");
            objResult[objLogo.key] = objLogo.base64;

            _scvDocxJS.addImageModule(function(imgBuffer, imgValue, tagName, meta) {
                if(tagName == objLogo.key) {
                    return objLogo.size;
                }
                
                return _scvDocxJS.logoSize;
            });
        }

        const options = {
            templateBuffer,
            fileName: response.fileName,
            objResult: objResult
        };
        _scvDocxJS.downloadDocxBuffer(options);
    }

    const plusParam = (params) => {
        return '&custpage_form_type=' + params.custpage_form_type
            + '&custpage_entity=' + params.custpage_entity
            + '&custpage_evalution_date=' + params.custpage_evalution_date;
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        onSearchResult: onSearchResult,
        saveRecord: saveRecord
    };
    
});
