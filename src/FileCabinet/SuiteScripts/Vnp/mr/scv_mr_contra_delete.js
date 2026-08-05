/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', '../lib/scv_lib_report.js'],
    
    (record, search, libRep) => {
        
        /**
         * Marks the beginning of the Map/Reduce process and generates input data.
         *
         * @typedef {Object} ObjectRef
         * @property {number} id - Internal ID of the record instance
         * @property {string} type - Record type id
         *
         * @return {Array|Object|Search|RecordRef} inputSummary
         * @since 2015.1
         */
        const getInputData = () => {
            let list_c = [], pageinfo = null, params = [];
            let sql = "select t.id from customrecord_scv_contra_trans t where t.custrecord_scv_contra_trans_h_createfrom is null";
            libRep.doSearchSql(list_c, pageinfo, sql, params);
            return list_c;
        }
        
        
        
        /**
         * Executes when the map entry point is triggered and applies to each key/value pair.
         *
         * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
         * @since 2015.1
         */
        const map = (context) => {
            let obj = JSON.parse(context.value);log.debug('obj', obj);
            try {
                let recContra= record.load({type: 'customrecord_scv_contra_trans', id: obj.id});
                let slContra = 'recmachcustrecord_scv_trans_l_header';
                let lcContra = recContra.getLineCount(slContra);
                for(let i = 0; i < lcContra; i++) {
                    recContra.removeLine({sublistId: slContra, line: 0});
                }
                recContra.save();
                record.delete({type: 'customrecord_scv_contra_trans', id: obj.id});
            } catch (e) {
                log.debug('exception', e);
            }
        }
        
        /**
         * Executes when the reduce entry point is triggered and applies to each group.
         *
         * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
         * @since 2015.1
         */
        const reduce = (context) => {
        
        }
        
        
        /**
         * Executes when the summarize entry point is triggered and applies to the result set.
         *
         * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
         * @since 2015.1
         */
        const summarize = (summary) => {
        
        }
        
        return {
            getInputData,
            map,
            reduce,
            summarize
        };
        
    });
