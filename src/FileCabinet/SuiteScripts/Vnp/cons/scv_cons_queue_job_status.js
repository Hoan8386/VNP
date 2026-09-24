/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  11 Sep 2026         Huy Pham                Init & create file, Deploy chức năng Custom Import, from ms.Tâm(https://app.clickup.com/t/3773072/14yhnhmfg32)
 */
define([
],
(
) => {
	const TYPE = "customlist_scv_queue_job_status";

    const Records = {
		Pending: {
			ID: 1,
			NAME: "Pending"
		},
		Processing: {
			ID: 2,
			NAME: "Processing"
		},
		Completed: {
			ID: 3,
			NAME: "Completed"
		},
		Cancel: {
			ID: 4,
			NAME: "Cancel"
		}
    }


    return {
		TYPE,
        Records
    };
    
});
