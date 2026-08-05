/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  23 May 2024         Huy Pham                Init & create file, Chức năng tính phí dịch vụ bảo quản, from mr.Phúc(https://app.clickup.com/t/86cvfd9t2)
 */
define([],
function() {
	const FIELD = {
		ID: "id",
		INACTIVE: "isinactive",
		NAME: "name"
	}

	const SUBLIST = {
		
	}

	const RECORDS = {
		VAN_CHUYEN: {
			ID: 2,
			NAME: "Vận Chuyển"
		},
		THUONG_MAI: {
			ID: 3,
			NAME: "Thương mại"
		},
		LUU_TRU: {
			ID: 4,
			NAME: "Lưu trữ"
		},
		VAN_CHUYEN_QUY_DOI: {
			ID: 5,
			NAME: "Vận chuyển quy đổi"
		}
	}
    return {
		TYPE: "customlist_scv_unit_type_list",
		FIELD: FIELD,
		SUBLIST: SUBLIST,
		RECORDS: RECORDS
    };
    
});
