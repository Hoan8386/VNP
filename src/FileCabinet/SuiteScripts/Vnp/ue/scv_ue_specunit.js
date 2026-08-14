/**
 * Nội dung:
 * * =======================================================================================
 *  Date                    Author                  Description
 *  06 May 2024            	Khanh Tran				Init, create script. Tự động tạo ngầm Unit Custom From ms. Hoa(https://app.clickup.com/t/86cv6qcbv)
 *  03 Oct 2024           	Khanh Tran				Upd Item From mr. Huy(https://app.clickup.com/t/86cv6qcbv)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search',
        '../lib/scv_lib_function.js',
        '../lib/scv_lib_unitstype.js',
        '../cons/scv_cons_list_unittype.js'
    ],

    (record, search,
     lbf,
     libUnitsType,
     constListUnitType) => {
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

        }

        /**
         * Defines the function definition that is executed before record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const beforeSubmit = (scriptContext) => {
            let triggerType = scriptContext.type;
            if(triggerType === 'create'){
                libUnitsType.addLineUnitType(scriptContext);
            }else if(triggerType === 'edit'){
                libUnitsType.updLineUnitType(scriptContext);
            }
        }
        /**
         * Defines the function definition that is executed after record is submitted.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @since 2015.2
         */
        const afterSubmit = (scriptContext) => {
            updItem(scriptContext);

        }

        const updItem = (scriptContext) => {
            let triggerType = scriptContext.type;
            if(!['create', 'edit'].includes(triggerType)) return;

            let newRec = scriptContext.newRecord;
            let item = newRec.getValue('custrecord_scv_item_specification');
            if(!item) return;

            let item_unit_type = newRec.getValue('custrecord_scv_item_unit_type') * 1;
            if(!item_unit_type || !([constListUnitType.RECORDS.VAN_CHUYEN.ID, constListUnitType.RECORDS.VAN_CHUYEN_QUY_DOI.ID].includes(item_unit_type))) return;

            let itemType = lbf.getItemRecordType(item);
            if(!itemType) return;

            let lkItem = search.lookupFields({type: itemType, id: item, columns: ['custitem_scv_dvt_vc', 'custitem_scv_dvt_vc_qd']});
            let dvt_vc = lkItem?.custitem_scv_dvt_vc?.[0]?.value;
            let dvt_vc_qd = lkItem?.custitem_scv_dvt_vc_qd?.[0]?.value;
            let objUpd = {isUpd: false};
            if(item_unit_type == constListUnitType.RECORDS.VAN_CHUYEN.ID){
                if(!dvt_vc){
                    objUpd.values = {
                        custitem_scv_dvt_vc: newRec.id
                    };
                    objUpd.isUpd = true;
                }
            }
            else if(item_unit_type == constListUnitType.RECORDS.VAN_CHUYEN_QUY_DOI.ID){
                if(!dvt_vc_qd){
                    objUpd.values = {
                        custitem_scv_dvt_vc_qd: newRec.id
                    };
                    objUpd.isUpd = true;
                }
            }

            if(objUpd.isUpd){
                record.submitFields({
                    type: itemType,
                    id: item,
                    values: objUpd.values,
                    options: {
                        enableSourcing: false, ignoreMandatoryFields : true
                    }
                })
            }

        }
        return {
            // beforeLoad, 
            beforeSubmit,
            afterSubmit
        }

    });
