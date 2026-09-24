/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  19 Aug 2026         Huy Pham			    Init, create file
 */
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
        '../cons/scv_cons_file.js',
    ], (
        constFile,
    ) => {
        
        const onRequest = scriptContext => {
            let params = scriptContext.request.parameters;
            let response = scriptContext.response;
            
            try{
                let pdfFile = printPdf(params);
            
                response.writeFile(pdfFile, true)
            }
            catch(err){
                log.error("Error: Try.catch", err);

                response.write(JSON.stringify({
                    success: false,
                    message: err.message
                }));

            }
        }

        const printPdf = (_params) => {
            let pdfFile = null;

            let pathScriptPrint = constFile.getCurrentRootFolder() + `/print/${_params.printFile}.js`;

            require([pathScriptPrint], function (modulePrint)
            {
                pdfFile = modulePrint.generateFilePDF(_params);
            });

            return pdfFile;
        }

        return {
            onRequest,
            printPdf
        }
    }
);