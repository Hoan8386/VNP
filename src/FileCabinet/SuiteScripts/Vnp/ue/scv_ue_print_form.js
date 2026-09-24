/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define([
        'N/record',
        'N/runtime',
        'N/search',
        'N/url',
        '../lib/scv_lib_function.js',
        '../lib/scv_lib_report.js'],
    (record, runtime, search, url, libFunc, libRep) => {
        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @Since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            if (scriptContext.type !== 'view') return;

            let form = scriptContext.form;
            let newRecord = scriptContext.newRecord;
            let listButton = getListButton(newRecord);
            if (listButton.length > 1) {
                let func = "require(['N/ui/dialog'],\
                    function(dialog) {\
                        let options = {\
                            title: 'Print Form',\
                            message: 'Click Button to Print',\
                            buttons: " + JSON.stringify(listButton) +
                    "};\
                    function success(result) { \
                        if(result != 'cancel') window.open(result);\
                    }\
                    function failure(reason) { console.log('Failure: ' + reason) }\
                    dialog.create(options).then(success).catch(failure);\
                });";
                form.addButton({
                    id: 'custpage_bt_printform',
                    label: 'Print Form',
                    functionName: func
                });
            }
        };

        const getListButton = (rec) => {
            let listBt = [];
            let trid = rec.id, trtype = rec.type;
            let account = rec.getValue('account');
            let entity = rec.getValue('entity') || rec.getValue('customer') || rec.getValue('vendor') || rec.getValue('employee');
            let templateidUNC = '', templateidE = '';
            let list_cf = [], filters_cf = [['isinactive', 'is', false]];
            if (!!account) {
                filters_cf.push('and');
                filters_cf.push(['custrecord_scv_pf_account', 'anyof', ['@NONE@', account]]);
            }
            if (!!entity) {
                filters_cf.push('and');
                filters_cf.push(['custrecord_scv_pf_entity', 'anyof', ['@NONE@', entity]]);
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

            let list_url = [], objTemp, objUrl, urlTemp, templateid;
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
                    templateidUNC = !templateidUNC ? getTemplateIdUnc(account) : templateidUNC;
                    templateid = templateidUNC;
                } else if (objTemp.pdftemplate === 'FRENTITY') {
                    templateidE = !templateidE ? getTemplateIdE(entity) : templateidE;
                    templateid = templateidE;
                } else {
                    templateid = objTemp.pdftemplate;
                }
                urlTemp = objUrl.urlOpen + '&id=' + trid + '&type=' + trtype + '&templateid=' + templateid;
                listBt.push({label: objTemp.buttonlabel, value: urlTemp});
            }

            listBt.push({label: 'Cancel', value: 'cancel'});
            return listBt;
        };

        const getTemplateIdE = (entity) => {
            let templateidE = '@NONE@';
            if (!!entity) {
                let lkE = search.lookupFields({type: 'entity', id: entity, columns: ['recordtype', 'type']});
                let recordtype = lkE.recordtype;
                let etype = lkE.type[0];
                if (!!etype) {
                    if (etype.text === 'Project') {
                        recordtype = 'job';
                    }
                }
                let recE = record.load({type: recordtype, id: entity});
                templateidE = recE.getValue('custentity_scv_pdftemplate');
            }
            return templateidE;
        };

        const getTemplateIdUnc = (account) => {
            let templateidUNC = '@NONE@';
            if (!!account) {
                let recAcc = record.load({type: 'account', id: account});
                templateidUNC = recAcc.getValue('custrecord_scv_pdf_template');
            }
            return templateidUNC;
        };

        return {beforeLoad};
    });
