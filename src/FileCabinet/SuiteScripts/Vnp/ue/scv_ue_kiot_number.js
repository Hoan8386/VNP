/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search'],

    (record, search) => {
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
            beforeSubmit_genAutoNumberID(scriptContext);
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

        }

        const beforeSubmit_genAutoNumberID = (scriptContext) => {
            let triggerType = scriptContext.type;
            if (!["create", "edit", "xedit"].includes(triggerType)) return "";

            let newRec = scriptContext.newRecord;
            let isGenID = false;

            if (triggerType === "create") {
                isGenID = true;
            } else if (["edit", "xedit"].includes(triggerType)) {
                let oldRec = scriptContext.oldRecord;
                ["custrecord_scv_kiot_location", "custrecord_scv_kiot_subsidiary", "custrecord_scv_id_building",
                    "custrecord_scv_kiot_number"].forEach(function (eleFieldId) {
                    if (newRec.getValue(eleFieldId) !== oldRec.getValue(eleFieldId)) {
                        isGenID = true;
                        return false;
                    }

                    return true;
                })
            }
            if (!isGenID) return "";

            let locationId = newRec.getValue("custrecord_scv_kiot_location");
            let subsidiaryId = newRec.getValue("custrecord_scv_kiot_subsidiary");
            let buildingId = newRec.getValue("custrecord_scv_id_building");
            let kiotNumber = newRec.getValue("custrecord_scv_kiot_number");

            let prefix_location = "", prefix_building = "";

            if (!!locationId) {
                let location_nm = search.lookupFields({type: "location", id: locationId, columns: "name"}).name;

                prefix_location = location_nm.substring(location_nm.length - 3);
            }

            if (!prefix_location && !!subsidiaryId) {
                prefix_location = search.lookupFields({
                    type: "subsidiary",
                    id: subsidiaryId,
                    columns: "namenohierarchy"
                }).namenohierarchy;
            }

            if (!!buildingId) {
                prefix_building = search.lookupFields({
                    type: "customrecord_scv_building_list",
                    id: buildingId,
                    columns: "custrecord_scv_bld_name"
                }).custrecord_scv_bld_name;
            }

            let custrecord_scv_kiot_id = prefix_location;

            if (!!prefix_building) {
                custrecord_scv_kiot_id += !!custrecord_scv_kiot_id ? "." : "";
                custrecord_scv_kiot_id += prefix_building;
            }

            if (!!kiotNumber) {
                custrecord_scv_kiot_id += !!custrecord_scv_kiot_id ? "." : "";
                custrecord_scv_kiot_id += kiotNumber;
            }

            newRec.setValue("custrecord_scv_kiot_id", custrecord_scv_kiot_id);

            return custrecord_scv_kiot_id;
        }

        return {beforeLoad, beforeSubmit, afterSubmit}

    });
