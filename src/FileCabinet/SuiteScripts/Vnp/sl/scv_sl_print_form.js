/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define([
        'N/ui/serverWidget',
        'N/record',
        'N/runtime',
        'N/search',
        'N/url',
        '../lib/scv_lib_function.js',
        '../lib/scv_lib_report.js'],
    (serverWidget, record, runtime, search, url, libFunc, libRep) => {
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
            let response = context.response;
            let parameters = request.parameters;
            let trid = parameters.trid;
            let trtype = parameters.trtype;
            let isRun = true;
            if (!trid || !trtype) {
                isRun = false;
            }
            if (request.method === 'GET') {
                if (!isRun) {
                    throw 'Sai thông tin!';
                }
                let form = serverWidget.createForm({title: 'Print'});
                let rec = record.load({type: trtype, id: trid});
                let subsidiary = rec.getValue('subsidiary');
                let account = rec.getValue('account');
                let entity = rec.getValue('entity') || rec.getValue('customer') || rec.getValue('vendor') || rec.getValue('employee');
                let templateidUNC = '', templateidE = '';
                let list_cf = [], filters_cf = [['isinactive', 'is', false]];
                if (!!subsidiary) {
                    filters_cf.push('and');
                    filters_cf.push(['custrecord_scv_pf_subsidiary', 'anyof', ['@NONE@', subsidiary]]);
                }
                if (!!account) {
                    filters_cf.push('and');
                    filters_cf.push(['custrecord_scv_pf_account', 'anyof', ['@NONE@', account]]);
                    let recAcc = record.load({type: 'account', id: account});
                    templateidUNC = recAcc.getValue('custrecord_scv_pdf_template');
                }
                if (!!entity) {
                    filters_cf.push('and');
                    filters_cf.push(['custrecord_scv_pf_entity', 'anyof', ['@NONE@', entity]]);
                    let lkE = search.lookupFields({type: 'entity', id: entity, columns: ['recordtype']});
                    let recE = record.load({type: lkE.recordtype, id: entity});
                    templateidE = recE.getValue('custentity_scv_pdftemplate');
                }
                let currentUser = runtime.getCurrentUser();
                let role = currentUser.role;
                filters_cf.push('and');
                filters_cf.push(['custrecord_scv_pf_role', 'anyof', ['@NONE@', role]]);

                filters_cf.push('and');
                filters_cf.push(['custrecord_scv_pf_user', 'anyof', ['@NONE@', currentUser.id]]);

                filters_cf.push('and');
                filters_cf.push(["formulanumeric: INSTR({custrecord_scv_pf_recordtype}, '" + trtype + "')", 'greaterthan', 0]);

                let columns_cf = ['custrecord_scv_pf_buttonid', 'custrecord_scv_pf_buttonlabel', 'custrecord_scv_pf_pdftemplate',
                    'custrecord_scv_pf_script', 'custrecord_scv_pf_deployment'
                    , {name: 'custrecord_scv_pf_orderno', sort: 'ASC'}, {name: 'internalid', sort: 'ASC'}];
                let fields_cf = ['buttonid', 'buttonlabel', 'pdftemplate',
                    'script', 'deployment'];
                libRep.doSearch('customrecord_scv_printform', list_cf, columns_cf, fields_cf, filters_cf);

                let htmlBt = '<p>', list_url = [], objTemp, objUrl, urlTemp, templateid;
                let class_default = " class='btn btn-lg btn-default'";
                let class_primary = " class='btn btn-lg btn-primary'";
                for (let i in list_cf) {
                    objTemp = list_cf[i];
                    objUrl = libFunc.getObjFromArr(list_url, objTemp.script);
                    if (!objUrl.script) {
                        objUrl.id = objTemp.script;
                        objUrl.script = objTemp.script;
                        objUrl.deployment = objTemp.deployment;

                        urlTemp = url.resolveScript({
                            scriptId: objTemp.script,
                            deploymentId: objTemp.deployment,
                            returnExternalUrl: false
                        });
                        objUrl.urlOpen = urlTemp;
                        list_url.push(objUrl);
                    }
                    if (objTemp.pdftemplate === 'FRACCOUNT') {
                        templateid = templateidUNC;
                    } else if (objTemp.pdftemplate === 'FRENTITY') {
                        templateid = templateidE;
                    } else {
                        templateid = objTemp.pdftemplate;
                    }
                    urlTemp = objUrl.urlOpen + '&id=' + trid + '&type=' + trtype + '&templateid=' + templateid;

                    htmlBt = htmlBt + "&nbsp;&nbsp;<button type='button' onclick='window.open(\"" + urlTemp + "\")' id=" + objTemp.buttonid + (i % 2 === 0 ? class_primary : class_default) + ">" + objTemp.buttonlabel + "</button> &nbsp;&nbsp;";
                }
                htmlBt = htmlBt + '</p>';

                addFieldValue(form, trid, trtype, htmlBt);

                response.writePage(form);
            }
        };

        const addFieldValue = (form, id, type, htmlbutton) => {
            addFieldHiden(form, 'custpage_trid', 'Id', id);
            addFieldHiden(form, 'custpage_trtype', 'Record Type', type);

            let fHtml = form.addField({
                id: 'custpage_html',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Button'
            });
            fHtml.defaultValue = htmlbutton;
        };

        const addFieldHiden = (form, id, label, value) => {
            let fId = form.addField({
                id: id,
                type: serverWidget.FieldType.TEXT,
                label: label
            });
            fId.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.HIDDEN
            });
            fId.defaultValue = value;
        };

        return {onRequest};
    });
