/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  15 Sep 2026         Khanh Tran			    Init, create file
 */
define([],
function() {
	const TYPE = "costcategory";

	const FIELD = {
		ID: "id",
		INACTIVE: "isinactive",
		NAME: "name"
	}

	const SUBLIST = {
		
	}

	const RECORDS = {
		_03_LC_THUE_NHAPKHAU: {
			ID: "1",
			NAME: "03 -LC- Thuế nhập khẩu"
		}
	}

    return {
		TYPE,
		FIELD,
		SUBLIST,
		RECORDS
    };
    
});
