/**
 * @NApiVersion 2.1
 */
define(['N/query', 'N/runtime'],
    
    (query, runtime) => {
        
        const getUrlFileTemplate = (fileType, fileName) => {
            let sqlFileFontInfo = "select f.name, f.url from file f where f.filetype = ? and f.name = ?";
            return query.runSuiteQL({query: sqlFileFontInfo, params: [fileType, fileName]}).asMappedResults()[0]?.url;
        }
        
        const getInforReport = (parameters) => {
            const currentUser = runtime.getCurrentUser();
            const subsidiaryId = isOneWorld() ? parameters.subsidiary?.split(",")?.[0] || currentUser?.subsidiary?.toString() : 1;
            let sqlDataInfo = `
                select s.legalname, s.name, s.federalidnumber,
                    BUILTIN.DF(s.mainaddress) AS mainaddress_text
                from subsidiary s
                where s.id = ${subsidiaryId}
            `;
            
            let resultSetDataInfo = query.runSuiteQL({
                query: sqlDataInfo,
                params: []
            });
            let listDataInfo = resultSetDataInfo.asMappedResults();
            
            let objInfoReport = {};
            if (listDataInfo.length > 0) {
                let objDataInfo = listDataInfo[0];
                Object.assign(objInfoReport, {
                    strLegalNameSub: objDataInfo.legalname, strNameSub: objDataInfo.name,
                    strMainAddrSub: objDataInfo.mainaddress_text?.split('\r\n')?.[0] || '',
                    strFederalNumberSub: objDataInfo.federalidnumber
                });
            }
            return objInfoReport;
        }
        
        const isOneWorld = () => {
            return runtime.isFeatureInEffect({feature: 'SUBSIDIARIES'});
        }
        
        return {getUrlFileTemplate, getInforReport};
        
    });
