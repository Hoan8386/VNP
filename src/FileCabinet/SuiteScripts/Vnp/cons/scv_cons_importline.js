/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  11 Sep 2026         Huy Pham                Init & create file, Deploy chức năng Custom Import, from ms.Tâm(https://app.clickup.com/t/3773072/14yhnhmfg32)
 */
define(['N/query',
    '../cons/scv_cons_record.js'
],
    (query,
        constRecord
    ) => {
        const TYPE = "customrecord_scv_import_line";
    
        const Records = {}

        const getDataSourceByCriteriaQuery = (_objDataFilter) => {
            let query_where = `WHERE isinactive = 'F' `;

            if(!!_objDataFilter.custrecord_scv_import_line_rectype?.toString()){
                query_where += ` AND custrecord_scv_import_line_rectype IN (${_objDataFilter.custrecord_scv_import_line_rectype.toString()}) `
            }
            if(!!_objDataFilter.id?.toString()){
                query_where += ` AND id IN (${_objDataFilter.id.toString()}) `
            }

            let resultQuery = query.runSuiteQL({
                query: `SELECT custrecord_scv_import_line_rectype, id, name, custrecord_scv_import_line_sublist
                FROM customrecord_scv_import_line
                ${query_where}`
            });
    
            let arrResult = resultQuery.asMappedResults();
            
            return arrResult;
        }

        const initLoadFieldByCriteriaQuery = (_field, _objDataFilter, _hasNull = true) =>{
            let arrResult = getDataSourceByCriteriaQuery(_objDataFilter);
    
            constRecord.initLoadField(_field, {data: arrResult}, _hasNull);
    
            return arrResult;
        }
    
        return {
            TYPE,
            Records,
            getDataSourceByCriteriaQuery,
            initLoadFieldByCriteriaQuery
        };
        
    });
    