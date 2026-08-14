/**
 * Nội dung: 
 * Version: 1.260309.1
 * =======================================================================================
 *  Date                Author                  Description
 *  09 Mar 2026         Huy Pham                Init & create file
 */
define([],
function() {
    
	const RECORDS = {
        SuiteType: "SuiteScripts",
        FolderRoot: "Vnp",
    }

    const getCurrentAppFolder = () => {
        return RECORDS.SuiteType + " : " + RECORDS.FolderRoot;
    }

    const getCurrentRootFolder = () => {
        return RECORDS.SuiteType + "/" + RECORDS.FolderRoot;
    }

    return {
		RECORDS,

        getCurrentAppFolder,
        getCurrentRootFolder,
    };
    
});
