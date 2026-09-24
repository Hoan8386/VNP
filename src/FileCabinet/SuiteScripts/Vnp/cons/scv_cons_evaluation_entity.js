/**
 * =======================================================================================
 *  Date                Author                  Description
 *  17 Sep 2026         Phu Pham                Init & create file.
 */
define([
    'N/record',
],
    function(
        record
    ) {

        const TYPE = "customrecord_scv_evaluation_entity";
        const Fields = {
            ID: "id",
            NAME: "name"
        };
        const Records = {

        };

        const createEvaluationEntity = ({
            custrecord_scv_eva_entity = null,
            custrecord_scv_eva_date = null,
            custrecord_scv_eva_criteria = null,
            custrecord_scv_eva_max_score = null,
            custrecord_scv_eva_score = null
        }) => {
            const evalEntRec = record.create({type: TYPE});

            evalEntRec.setValue("custrecord_scv_eva_entity", custrecord_scv_eva_entity);
            evalEntRec.setValue("custrecord_scv_eva_date", custrecord_scv_eva_date);
            evalEntRec.setValue("custrecord_scv_eva_criteria", custrecord_scv_eva_criteria);
            evalEntRec.setValue("custrecord_scv_eva_max_score", custrecord_scv_eva_max_score);
            evalEntRec.setValue("custrecord_scv_eva_score", custrecord_scv_eva_score);

            const evalEntId = evalEntRec.save();
            return evalEntId;
        }

        return {
            TYPE,
            Fields,
            Records,

            createEvaluationEntity,
        }; 
    });
    