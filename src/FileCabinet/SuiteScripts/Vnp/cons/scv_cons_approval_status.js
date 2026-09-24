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
            Moi: {
                ID: 5,
                NAME: "Mới"
            }
        }
        return {
            TYPE: "customrecord_scv_approval_status",
            FIELD: FIELD,
            RECORDS: RECORDS
        };
        
    });
    