/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  11 Sep 2026         Huy Pham                Init & create file, Deploy chức năng Custom Import, from ms.Tâm(https://app.clickup.com/t/3773072/14yhnhmfg32)
 */
define(['N/query',
],
    (query,
    ) => {
    
        const Records = {
            stores: {},
        }

        const getDataSource = (_filters) => {
            let query_condition = "";
            if(!!_filters?.unitstype){
                query_condition += ` AND unitstype = ${_filters.unitstype}`  
            }
            
            let resultSQL = query.runSuiteQL({
                query: `SELECT internalid, unitname, baseunit, unitstype, inuse
                FROM unitsTypeUom
                WHERE inuse IN ('T', 'F') ${query_condition}`
            });
            return resultSQL.asMappedResults();
        }

        return {
            TYPE: "-221",//"unitsTypeUom",
            Records,
            getDataSource
        };
        
    });
    