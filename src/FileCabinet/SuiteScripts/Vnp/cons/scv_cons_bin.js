/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  03 Jan 2024         Huy Pham                Init & create file, NVD - Chức năng tạo Transfer Order (TO) từ Status Change, from mr.NĐHuy(https://app.clickup.com/t/86cxg3ywm)
 */
define(['N/search', 'N/query',
    '../cons/scv_cons_record.js',
    '../cons/scv_cons_search.js'
],
    function(search, query,
        constRecord,
        constSearch
    ) {
        const TYPE = "bin";
        const FIELD = {
            ID: "id",
            INACTIVE: "isinactive",
            NAME: "name"
        }
    
        const SUBLIST = {
            
        }
    
        const RECORDS = {
        }

        const getDataSource = (_filters) => {
            let resultSearch =  constSearch.createSearchWithFilter({
                type: "bin",
                filters: [
                    ["inactive","is","F"]
                ],
                columns: ["internalid", "binnumber", "location", "memo"]
            }, _filters);
            
            let arrResult = constSearch.fetchResultSearchRunEach(resultSearch, function(_objTmpl, _column){
                let objResTmpl = constSearch.getObjResultFromSearchByKey(_objTmpl, _column, [
                    "internalid", "binnumber", "location", "memo"
                ]);

                return objResTmpl;
            });
            
            return arrResult;
        }

        const initLoadFieldByCriteria = (_field, _params, _hasNull = true) =>{
            let myFilters = [];
            if(!!_params.location){
                myFilters.push(search.createFilter({
                    name: 'location', 
                    operator: "anyof", 
                    values: _params.location
                }))
            }

            let arrResult = getDataSource(myFilters);
    
            constRecord.initLoadField(_field, {data: arrResult, valueExpr: "internalid", displayExpr: "binnumber"}, _hasNull);
    
            return arrResult;
        }

        return {
            TYPE,
            FIELD,
            SUBLIST,
            RECORDS,
            getDataSource,
            initLoadFieldByCriteria
        };
        
    });
    