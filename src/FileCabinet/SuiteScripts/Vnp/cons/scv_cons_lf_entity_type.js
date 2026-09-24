/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  07 Sep 2026         Khanh Tran              Init & create file.
 */
define([],
    function() {
        const FIELD = {
            ID: "id",
            NAME: "name"
        };
    
        const RECORDS = {
            Vendor: {
                ID: 2,
                NAME: "Vendor"
            },
            
            Customer: {
                ID: 3,
                NAME: "Customer"
            }
        }
        return {
            TYPE: "customrecord_scv_lf_entity_type",
            FIELD: FIELD,
            RECORDS: RECORDS
        };
        
    });
    