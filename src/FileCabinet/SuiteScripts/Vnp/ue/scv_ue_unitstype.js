/**
 * Nội dung: Chỉ sử dụng cho các record Unit Types
 * * =======================================================================================
 *  Date                    Author                  Description
 *  ?           			Duy Nguyen				- Init, create script,task CPC1
 *  22 Apr 2024			    Duy Nguyen	            - DISABLED Type Unit khi edit, TASK: Unit Type từ màn hình tạo Item (Chi màn Inventory, Lot Inventory), BA.Viet(https://app.clickup.com/t/86cv59xuy)
 *  06 May 2024				Khanh Tran	            - Tự động tạo ngầm Unit Custom From ms. Hoa(https://app.clickup.com/t/86cv6qcbv)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/search', '../lib/scv_lib_unitstype.js'],

    function (search, libUnitsType) {

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type
         * @param {Form} scriptContext.form - Current form
         * @Since 2015.2
         */

        function beforeLoad(scriptContext) {
            try {
                // fnDisableField(scriptContext);
                addActionValidateFieldLineToMachine(scriptContext);
            } catch (err) {
                log.error("Error ", err);
            }
        }

        /**
         * A function to disable a field.
         *
         * @param {Object} scriptContext - The script context object.
         * @return {void}
         */
        function fnDisableField(scriptContext) {
            try {
                if (scriptContext.type === 'edit') {
                    let form = scriptContext.form;
                    let fieldName = form.getField('name');
                    fieldName.updateDisplayType({displayType: 'disabled'});
                }
            } catch (e) {
                log.error("Error fnDisableField: ", e);
            }
        }

        /**
         * Adds an action to validate the field "Line to Machine" in the given script context.
         *
         * @param {Object} scriptContext - The script context object.
         */
        function addActionValidateFieldLineToMachine(scriptContext) {
            try {
                if (scriptContext.type === 'edit' || scriptContext.type === 'create') {
                    var form = scriptContext.form;
                    var listUnitNames = JSON.stringify(loadListUnits());
                    form.addField({
                        id: 'custpage_scv_script',
                        label: 'Hidden',
                        type: "inlinehtml"
                    }).defaultValue = `<script type="text/javascript">
                        NS.jQuery(document).ready(function() {
                          NS.jQuery("p, div, span, h1, button, a, tr, td").click(function(e) {
                              if (!window?.isClickAddFunction) {
                                window.uom_machine.validateline = Unit_Machine_validateLineV2;
                              }
                              window.isClickAddFunction = true;
                          });
                        });
                        
                        window.NS_listUnitNames = eval(${listUnitNames});
                        
                        function Unit_Machine_validateLineV2() {
                            var conversionrate = parseFloat(nlapiGetCurrentLineItemValue('uom', 'conversionrate'));
                            if (isNaN(conversionrate) || conversionrate <= 0) {
                                alert('Conversion rate must be greater than zero.');
                                return false;
                            }
                            if (nlapiGetFieldValue('inusebyserial') == 'T' && conversionrate != Math.floor(conversionrate)) {
                                alert('You may not add a non-integer conversion rate to this units type, because it is used by a serialized item.');
                                return false;
                            }
                 
                            if (
                                window.NS_listUnitNames.indexOf(nlapiGetCurrentLineItemValue('uom', 'unitname')) === -1 
                                ||
                                window.NS_listUnitNames.indexOf(nlapiGetCurrentLineItemValue('uom', 'abbreviation')) === -1 
                                ||
                                window.NS_listUnitNames.indexOf(nlapiGetCurrentLineItemValue('uom', 'pluralname')) === -1 
                                ||
                                window.NS_listUnitNames.indexOf(nlapiGetCurrentLineItemValue('uom', 'pluralabbreviation')) === -1 
                                ) {
                                    var textSearch = [];
                                    var unitName = nlapiGetCurrentLineItemValue('uom', 'unitname');
                                    if (unitName) textSearch.push(unitName.substring(0,1));
                                    var abbreviation = nlapiGetCurrentLineItemValue('uom', 'abbreviation');
                                    if (abbreviation) textSearch.push(abbreviation.substring(0,1));
                                    var pluralName = nlapiGetCurrentLineItemValue('uom', 'pluralname');
                                    if (pluralName) textSearch.push(pluralName.substring(0,1));
                                    var pluralAbbreviation = nlapiGetCurrentLineItemValue('uom', 'pluralabbreviation');
                                    if (pluralAbbreviation) textSearch.push(pluralName.substring(0,1));
                                    var listUnitFill = window.NS_listUnitNames.filter(text => textSearch.some(o => o.toUpperCase() == text.substring(0,1).toUpperCase()));
                                    alert('Nhập lại Unit Name, Abbreviation, Plurl Name, Plural Abbreviation !\\n Một trong số giá trị sau : ' + listUnitFill.join(', '));
                                return false;
                            }
                            return true;
                        }
                    </script>`;
                }
            } catch (e) {
                log.error("Error addActionValidateFieldLineToMachine: ", e);
            }
        }


        function loadListUnits() {
            var searchObj = search.create({
                type: 'customlist_scv_unit_list',
                filters: [],
                columns: ['name']
            });
            var searchResult = searchObj.run().getRange(0, 1000);
            var lengthResult = searchResult.length;
            var results = [];
            for (let i = 0; i < lengthResult; i++) {
                results.push(searchResult[i].getValue('name'));
            }
            return results
        }


        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function beforeSubmit(scriptContext) {
            try {
                let triggerType = scriptContext.type;
                if(triggerType === 'edit'){
                }
            } catch (e) {
                log.error("Error beforeSubmit: ", e);
            }
        }

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext){
            let triggerType = scriptContext.type;
            if(triggerType === 'create'){
                libUnitsType.afterSubmit_crtSpecUnit(scriptContext.newRecord.id)
            }else if(triggerType === 'edit'){
                libUnitsType.afterSubmit_CRUD(scriptContext)
            }
        }

        return {
            beforeLoad: beforeLoad,
            // beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });
