/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([],
    
    () => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            scriptContext.response.setHeader({
                name: 'Content-Type',
                value: 'text/html; charset=UTF-8'
            });
            scriptContext.response.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Vui lòng đợi</title>
              <meta charset="utf-8" />
              <style>
                html, body {
                  height: 100%;
                  margin: 0;
                  font-family: Arial, sans-serif;
                  background: #f4f6f8;
                }
                .fullscreen {
                  position: fixed;
                  inset: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .spinner {
                  width: 36px;
                  height: 36px;
                  border: 4px solid #ddd;
                  border-top: 4px solid #0077c8;
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
              </style>
            </head>
            <body>
              <div class="fullscreen">
                <div>
                  <div class="spinner"></div>
                  <div><strong>Vui lòng đợi...</strong></div>
                </div>
              </div>
            </body>
            </html>
            `);
        }
        
        return {onRequest}
        
    });
