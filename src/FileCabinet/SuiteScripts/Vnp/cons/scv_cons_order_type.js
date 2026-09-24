/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  16 Sep 2026         Khanh Tran              Init & create file.
 */
define([],
    function() {
        const FIELD = {
            ID: "id",
            NAME: "name"
        };
    
        const RECORDS = {
            UyThac: {
                ID: 4,
                NAME: "Ủy thác"
            }
        }
        return {
            TYPE: "customrecord_scv_order_type",
            FIELD: FIELD,
            RECORDS: RECORDS
        };
        
    });
    