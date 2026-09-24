/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  03 May 2024         Phu Pham			    Init, create file
 */
define([],
    function() {
        const FIELD = {
            ID: "id",
            NAME: "name"
        };
    
        const RECORDS = {
            ADMINISTRATOR: {
                ID: 3,
                NAME: "Administrator"
            }
        }
        return {
            TYPE: "role",
            FIELD: FIELD,
            RECORDS: RECORDS
        };
        
    });
    