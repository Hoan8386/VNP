/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  11 Sep 2026         Huy Pham                Init & create file, Deploy chức năng Custom Import, from ms.Tâm(https://app.clickup.com/t/3773072/14yhnhmfg32)
 */
define(['N/query'
],
    ( query
    ) => {
        const TYPE = "customrecord_scv_import_d";
    
        const Records = {}

        const getDataSourceByCriteriaQuery = (_objDataFilter) => {
            let query_where = `WHERE isinactive = 'F' `;

            if(!!_objDataFilter?.custrecord_scv_import_d?.toString()){
                query_where += ` AND custrecord_scv_import_d IN (${_objDataFilter.custrecord_scv_import_d.toString()}) `
            }
            if(!!_objDataFilter?.custrecord_scv_import_line_d?.toString()){
                query_where += ` AND custrecord_scv_import_line_d IN (${_objDataFilter.custrecord_scv_import_line_d.toString()}) `
            }
            if(!!_objDataFilter?.custrecord_scv_import_d_invdetail?.toString()){
                query_where += ` AND custrecord_scv_import_d_invdetail IN (${_objDataFilter.custrecord_scv_import_d_invdetail.toString()}) `
            }

            let resultQuery = query.runSuiteQL({
                query: `SELECT id, custrecord_scv_import_d_seq, custrecord_scv_import_d_lbl, custrecord_scv_import_d_fldid,
                    custrecord_scv_import_d_valuetype, custrecord_scv_import_line_d, custrecord_scv_import_d, custrecord_scv_import_d_note,
                    custrecord_scv_import_d_invdetail, custrecord_scv_import_d_subrec_invdetail,
                    custrecord_scv_import_d_datasource
                FROM customrecord_scv_import_d
                ${query_where}
                ORDER BY custrecord_scv_import_d_seq ASC`
            });
    
            let arrResult = resultQuery.asMappedResults();
            
            return arrResult;
        }
    
        return {
            TYPE,
            Records,
            getDataSourceByCriteriaQuery
        };
        
    });
    