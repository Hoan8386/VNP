/**
 * Nội dung: Hover button
 * =======================================================================================
 *  Date                Author                  Description
 *  30 Aug 2023         Khanh Tran			    Init, create file.
 */
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget', "N/search"],

    (serverWidget, search) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            if(scriptContext.type == 'view'){
                var arrDataSSCfgBtnHover = getDataSSCfgBtnHover(scriptContext.newRecord.type);
                if (arrDataSSCfgBtnHover.length == 0) return;

                addTooltip(scriptContext.form, arrDataSSCfgBtnHover);
            }
        };

        const addTooltip = (_form, _arrDataSSCfgBtnHover) => {
            var field = _form.addField({
                id : "custpage_field_tooltip",
                type : serverWidget.FieldType.INLINEHTML,
                label : " "
            });
            field.defaultValue = `<script>
                var arrDataSSCfgBtnHover = `+JSON.stringify(_arrDataSSCfgBtnHover)+`;
                for (var obj of arrDataSSCfgBtnHover) {
                    if (!document.getElementById(obj.btnID)) continue;

                    asynCustomBtn(obj.btnID, obj.btnLabel, obj.tooltip)
                    asynCustomBtn("secondary" + obj.btnID, obj.btnLabel, obj.tooltip)
                }

                function asynCustomBtn(_btnId, _btnLabel, _tooltip){
                    let customBtn = document.getElementById(_btnId);
                    if(!!customBtn){
                        customBtn.value = _btnLabel||customBtn.value;
                        customBtn.setAttribute("data-ns-tooltip", _tooltip||customBtn.value);
                    }
                    else {
                        setTimeout(function(){
                            asynCustomBtn(_btnId, _btnLabel, _tooltip);
                        }, 500);
                    }
                }
            </script>`;
        }
        
        const getDataSSCfgBtnHover = (_recType) => {
            var arrDataSS = [];
            var resultSearch = search.create({
                type: "customrecord_scv_cfg_btn_hover",
                filters: [
                    ['custrecord_scv_cfg_btn_hover_rectype', 'is', _recType],
                    "AND",
                    ["custrecord_scv_cfg_btn_hover_btnid", "isnotempty", ""]
                ],
                columns: [
                    search.createColumn({name: "custrecord_scv_cfg_btn_hover_btnid", label: "Button ID"}),
                    search.createColumn({name: "custrecord_scv_cfg_btn_hover_btnlabel", label: "Button Label"}),
                    search.createColumn({name: "custrecord_scv_cfg_btn_hover_tooltip", label: "Tooltip"})
                ]
            });
            var myColumns = resultSearch.columns;
            resultSearch = resultSearch.run().getRange(0, 1000);
            for (var i = 0; i <resultSearch.length; i++) {
                arrDataSS.push({
                    cfgBtnHover_recID: resultSearch[i].id,
                    btnID: resultSearch[i].getValue(myColumns[0]),
                    btnLabel: resultSearch[i].getValue(myColumns[1]),
                    tooltip: resultSearch[i].getValue(myColumns[2]),
                });
            }
            return arrDataSS;
        }

        return {beforeLoad}

    });
