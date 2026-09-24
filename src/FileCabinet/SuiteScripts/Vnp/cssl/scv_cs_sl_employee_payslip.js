/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
    'N/url',
    '../cons/scv_cons_record.js',
],

function(
    url,
    constRecord,
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

    const Notification = {
        SELECT_AT_LEAST_ONE_LINE: 'Vui lòng chọn ít nhất 1 line để thực hiện chức năng này.'
    };

    function pageInit(scriptContext) {
        let curRec = scriptContext.currentRecord;

        pageInit_initQuickFindFieldSelect(curRec, [
            "custpage_subsidiary", "custpage_department"
        ]);
    }

    const pageInit_initQuickFindFieldSelect = (_curRec, _lstFieldId = []) =>{
        _lstFieldId.forEach(_fieldId => {
            constRecord.initQuickFindFieldSelect(_curRec, _fieldId, {
                data: _curRec.getField(_fieldId).getSelectOptions(),
                valueExpr: "value",
                displayExpr: "text",
                reInsertOption: false
            }, false);
        });
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
        let curRec = scriptContext.currentRecord;
        let sublistId = scriptContext.sublistId;
        let fieldId = scriptContext.fieldId;

        if(fieldId === 'custpage_subsidiary') {
            setTimeout(() => fieldChangedSubsidiary(curRec, fieldId), 0);
        }
    }

    const fieldChangedSubsidiary = (curRec, fieldId) => {
        _scvForm.showLoadingDialog(true);
        let subsidiary = curRec.getValue(fieldId);
        
        let params = {
            custpage_subsidiary: subsidiary
        };

        let arrActionFunc = [
            {action: "getDataDepartmentBySub", params: params, data: []},
        ];

        _scvForm.ajax.postAsyncMulti(_scvForm.serviceScript.url, arrActionFunc, function (_res){
            let arrDepartment = _res.find(e => e.action == "getDataDepartmentBySub").data;

            loadFieldDataDepartment(curRec, arrDepartment);

            _scvForm.showLoadingDialog(false);
        });
    }

    const loadFieldDataDepartment = (_curRec, _arrDataSource) =>{
        constRecord.initQuickFindFieldSelect(_curRec, "custpage_department", {
            data: _arrDataSource,
            valueExpr: "internalid",
            displayExpr: "name",
            reInsertOption: true
        }, false);
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
        const arrSublist = getDataSublistResult(curRec);

        if(arrSublist.length === 0) {
            alert(Notification.SELECT_AT_LEAST_ONE_LINE);
            return false;
        }

        return true;
    }

    const onSearchResult = async () => {
        window.onbeforeunload = null;

        let params = _scvForm.getParameter();
        let fields = ["custpage_subsidiary", "custpage_period"];

        let isValid = _scvForm.validateFieldMandatory(fields);
        if(!isValid) return;

        _scvForm.showLoadingDialog(true);
        await _scvForm.delay(50);

        const baseUrl = url.resolveScript({
            scriptId: _scvForm.currentScript.id,
            deploymentId: _scvForm.currentScript.deploymentId,
            returnExternalUrl: false
        });

        let urlDC = baseUrl + plusParam(params) + "&isrun=T";
        window.location.replace(urlDC);
    }

    const onPrint = (_type) => {
        if(_type === 'PDF') {
            window.onbeforeunload = null;
            const curRec = _scvForm.currentRecord;
            const arrSublist = getDataSublistResult(curRec);

            if(arrSublist.length === 0) {
                return alert(Notification.SELECT_AT_LEAST_ONE_LINE);
            }

            _scvForm.showLoadingDialog(true);
            let params = _scvForm.getParameter();
            _scvForm.ajax.postAsync(_scvForm.serviceScript.url, {
                ...params,
                body: JSON.stringify(arrSublist),
                action: "createFileEmpPayslip",
            }, async (response) => {
                console.log(response);
                _scvForm.showLoadingDialog(false);

                let urlScript = url.resolveScript({
                    scriptId: 'customscript_scv_sl_print',
                    deploymentId: 'customdeploy_scv_sl_print',
                    params: {
                        fileId: response.data.fileId,
                        printFile: "scv_print_emp_payslip",
                    }
                });
                window.open(urlScript);
            });
        }
    }

    const getDataSublistResult = (curRec) => {
        const sl = "custpage_sl_result";
        const totalLine = curRec.getLineCount(sl);

        const arrResult = [];
        const sublistFields = [
            'employee_display', 'department_display', 'email', 'legalnamesub',
            'thangnam', 'emplegalname', 'jobtitle', 'internalid'
        ];

        for(let i = 0; i < totalLine; i++) {
            let select = curRec.getSublistValue(sl, "select", i);
            if(select === true) {
                let dataprint = curRec.getSublistValue(sl, "dataprint", i);
                const objDataPrint = JSON.parse(dataprint);

                const objRes = {
                    ...objDataPrint
                };

                for(let fieldId of sublistFields) {
                    objRes[fieldId] = curRec.getSublistValue(sl, fieldId, i);
                }

                arrResult.push(objRes);
            }
        }

        return arrResult;
    }

    const plusParam = (params) => {
        return '&custpage_subsidiary=' + params.custpage_subsidiary
            + '&custpage_department=' + params.custpage_department
            + '&custpage_employee=' + params.custpage_employee
            + '&custpage_period=' + params.custpage_period;
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        onSearchResult: onSearchResult,
        onPrint: onPrint,
        saveRecord: saveRecord
    };
    
});
