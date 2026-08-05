/**
 * Nội dung: 
 * Version: 1.251104.8
 * =======================================================================================
 *  Date                Author                  Description
 *  12 Jun 2024         Huy Pham                Init & create file
 */
define(['N/query', 'N/record', 
    '../cons/scv_cons_crypto.js'
],
function(query, record, 
    constCrypto
) {
	const ID = "";
    const TYPE = "";
	const RECORDS = {
        _N:{
            file: null
        },
        Folder: {
            UserDocuments: {
                ID: "-20",
                NAME: "User Documents",
            },
            DataStore: {
                ID: "",
                NAME: "DataStore",
                PARENT_NAME: "User Documents",
            },
            Store: {
                ID: "",
                NAME: "Store",
                PARENT_NAME: "DataStore",
            },
            Temporary: {
                ID: "",
                NAME: "Temporary",
                PARENT_NAME: "DataStore",
            },
            FileImport: {
                ID: "",
                NAME: "FileImport",
                PARENT_NAME: "DataStore",
            },
            SuiteQL: {
                ID: "",
                NAME: "SuiteQL",
                PARENT_NAME: "DataStore",
            },
            OpenAI: {
                ID: "",
                NAME: "OpenAI",
                PARENT_NAME: "DataStore",
            },
        }
    }

	let dataStore = {};

    const initModulServer = ({file}) =>{
		RECORDS._N.file = file||null;
	}

    const setDataStore = (_key, _dataSource) =>{
        
        if(util.isArray(_dataSource) || util.isObject(_dataSource)){
			dataStore[_key] = JSON.parse(JSON.stringify(_dataSource));
		}else{
            dataStore[_key] = _dataSource;
        }

        return dataStore[_key];
    }

    const getDataStore = (_key) =>{
        return dataStore[_key];
    }

    const getFoldersDataStore = () =>{
        let arrKeyFolder = Object.keys(RECORDS.Folder);
        let arrFolderName = [];

        arrKeyFolder.forEach((_keyFolder) => {
            arrFolderName.push(RECORDS.Folder[_keyFolder].NAME);
        });

        let arrFolderCabinet = query.runSuiteQL({
            query: `SELECT parent, id, name, appfolder, level as folder_level
            FROM MediaItemFolder
            WHERE name IN ('${arrFolderName.join("','")}')
            START WITH id = '${RECORDS.Folder.UserDocuments.ID}'
            CONNECT BY PRIOR ID = PARENT`
        }).asMappedResults();

        let arrResult = [];

        arrKeyFolder.forEach((_keyFolder) => {
            let objFolder = RECORDS.Folder[_keyFolder];

            let objRes = {
                parent: "",
                id: "",
                name: objFolder.NAME
            };

            let objFolderCabinet = arrFolderCabinet.find(e => e.name == objFolder.NAME);
            if(!!objFolderCabinet){
                objRes.id = objFolderCabinet.id;
                objRes.parent = objFolderCabinet.parent;

                RECORDS.Folder[_keyFolder].ID = objFolder.id;
            }
            else{
                objRes.parent = RECORDS.Folder.UserDocuments.ID;
                
                if(!!objFolder.PARENT_NAME){
                    let keyFolderParent = arrKeyFolder.find(_keyFolder => RECORDS.Folder[_keyFolder].NAME == objFolder.PARENT_NAME);
                    
                    if(!!keyFolderParent){
                        objRes.parent = RECORDS.Folder[keyFolderParent].ID;
                    }
                }

                let folderRec = record.create({
                    type: record.Type.FOLDER,
                    isDynamic: true
                });

                folderRec.setValue("name", objFolder.NAME);
                folderRec.setValue("parent", objRes.parent);

                objRes.id = folderRec.save();
            }

            RECORDS.Folder[_keyFolder].ID = objRes.id;

            arrResult.push(objRes);
        });

        return arrResult;
    }

    const getFolderIdByName = (_folderName) => {
        let arrKeyFolder = Object.keys(RECORDS.Folder);
        let objFolder = arrKeyFolder.find(_keyFolder => RECORDS.Folder[_keyFolder].NAME == _folderName);

        let folderId = "";

        if(!!objFolder){
            folderId = RECORDS.Folder[objFolder].ID;
        }
        
        if(!folderId){
            let arrFolderCabinet = getFoldersDataStore();

            let objFolderCabinet = arrFolderCabinet.find(e => e.name == _folderName);
            if(!!objFolderCabinet){
                folderId = objFolderCabinet.id;
            }
        }

        return folderId;
    }

    const getPathDataStoreFile = ({
        folderName = RECORDS.Folder.Temporary.NAME,
        fileName = ""
    }) =>{
        let arrFolderCabinet = getFoldersDataStore();
        let folderId = getFolderIdByName(folderName);
        let objFolder = arrFolderCabinet.find(e => e.id == folderId);
        let parentFolderId = objFolder.parent;

        let pathFile = folderName + "/" + fileName;

        while(!!parentFolderId){
            let objFolderParent = arrFolderCabinet.find(e => e.id == parentFolderId);
            if(!objFolderParent){
                parentFolderId = "";
                break;
            }

            pathFile = objFolderParent.name + "/" + pathFile;

            parentFolderId = objFolderParent.parent;
        }

        return pathFile;
    }

    const saveDataStoreFile = ({
            key, 
            folderName = RECORDS.Folder.Temporary.NAME, 
            fileName = constCrypto.generateUUID(),
            fileType = "JSON",
            N_file = null
        }) =>{

        if(!!N_file && !RECORDS._N.file){
            initModulServer({file: N_file});
        }

        let dataStore = getDataStore(key);
        let folderId = getFolderIdByName(folderName);
        let contents = dataStore;

        if(fileType == "JSON" && !util.isString(dataStore)){
            contents = JSON.stringify(dataStore);
        }

        let fileData = RECORDS._N.file.create({
            name: fileName,
            fileType: fileType,
            contents: contents,
            folder: folderId
        });
        let fileDataId = fileData.save();

        return fileDataId;
    }

    const loadDataStoreFile = ({
        id = null,
        folderName = RECORDS.Folder.Temporary.NAME,
        fileName = "",
        fileType = "JSON",
        N_file = null
    }) =>{

        if(!!N_file && !RECORDS._N.file){
            initModulServer({file: N_file});
        }

        let fileId = id;
        
        if(!fileId){
            fileId = getPathDataStoreFile({folderName, fileName});
        }

        let contents = "";

        try{
            let fileData = RECORDS._N.file.load({
                id: fileId
            });

            contents = fileData.getContents();

            if(fileType == "JSON"){
                contents = JSON.parse(contents);
            }
        }
        catch(e){
            
        }

        return contents;
    }

    return {
		ID,
		TYPE,
		RECORDS,
        initModulServer,
		setDataStore,
        getDataStore,
        getFoldersDataStore,
        getFolderIdByName,
        getPathDataStoreFile,
        saveDataStoreFile,
        loadDataStoreFile
    };
    
});
