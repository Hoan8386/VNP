/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  28 Feb 2024         Huy Pham			    Init, create file
 */
define(['N/query'],
    function(query) {
        const FIELD = {
            ID: "id",
            INACTIVE: "isinactive",
            NAME: "name"
        }
    
        const SUBLIST = {
            
        }
    
        const RECORDS = {
            VND: {
                ID: 1,
                NAME: "VND"
            }
        }

        const getInfoCurrencyById = (_currencyId) => {
            if(!_currencyId) return [];

            var resultSQL = query.runSuiteQL({
                query: `SELECT id, name, exchangerate, isbasecurrency, currencyprecision, displaysymbol
                from currency
                where id IN (${_currencyId.split(",").join(',')})
                order by id asc`
            });
            return resultSQL.asMappedResults();
        }

        const getFirstInfoCurrencyById = (_currencyId) => {
            let arrCurrency = getInfoCurrencyById(_currencyId);

            return arrCurrency.length > 0 ? arrCurrency[0] : null;
        }

        return {
            TYPE: "currency",
            FIELD: FIELD,
            SUBLIST: SUBLIST,
            RECORDS: RECORDS,
            getInfoCurrencyById,
            getFirstInfoCurrencyById
        };
        
    });
    