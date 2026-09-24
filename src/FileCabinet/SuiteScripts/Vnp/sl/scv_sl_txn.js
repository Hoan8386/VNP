/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/cache', 'N/task', '../common/scv_common_txn_exe.js'],
    
    (cache, task, cmTxnExe) => {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            let parameters = scriptContext.request.parameters;
            let bodyResponse;
            if (parameters.isExport === 'T') {
                bodyResponse = getDataExport(parameters);
            } else {
                bodyResponse = createTaskOrGetMessage(parameters);
            }
            
            scriptContext.response.setHeader({
                name: 'Content-Type',
                value: 'application/json'
            });
            scriptContext.response.write(JSON.stringify(bodyResponse));
        }
        
        const getDataExport = (parameters) => {
            let txn_config = parameters.txn_config;
            let listTxnMappingConfig = cmTxnExe.getListTxnMappingConfig(txn_config);
            if (!txn_config) {
                txn_config = listTxnMappingConfig.map(c => c.id);
            }
            let objDataFromSource = null, listDataJoinSource = null;
            let listTxnMappingConfigSource = cmTxnExe.getListTxnMappingConfigSource(txn_config);
            if (listTxnMappingConfigSource.length > 0) {
                objDataFromSource = cmTxnExe.getDataFromTxnMappingConfigSource(listTxnMappingConfigSource);
                try {
                    listDataJoinSource = cmTxnExe.buildJoinSource(listTxnMappingConfig[0], listTxnMappingConfigSource, objDataFromSource, parameters);
                } catch (e) {
                    log.error('getDataExport exception', e);
                    listDataJoinSource = e;
                }
            }
            
            return {objDataFromSource, listDataJoinSource};
        }
        
        const createTaskOrGetMessage = (parameters) => {
            let txn_config = parameters.txn_config;
            let isCheckMessage = parameters.isCheckMessage;

            let myCache = cache.getCache({
                name: 'cTxnExe',
                scope: cache.Scope.PUBLIC
            });
            let listCachedTask = cmTxnExe.getCachedMrTaskList(myCache);
            let mrTaskId = parameters.mrTaskId || listCachedTask[listCachedTask.length - 1]?.taskId;
            let iscomplete = true, messageInfo = '';
            if (mrTaskId) {
                let taskStatus = task.checkStatus(mrTaskId);
                if (taskStatus.status === 'COMPLETE' || taskStatus.status === 'FAILED' || taskStatus.status === 'CANCELED') {
                    messageInfo = 'Your request has been completed. Task ID: ' + mrTaskId;
                    listCachedTask = [];
                    cmTxnExe.putCachedMrTaskList(myCache, listCachedTask);
                } else {
                    iscomplete = false;
                    messageInfo = 'You cannot do this record because other task is: ' + taskStatus.status;
                }
            }

            if (iscomplete && isCheckMessage !== 'T') {
                let params = {custscript_scv_mr_txn_exe_config: txn_config};
                let result = cmTxnExe.submitMrTask(listCachedTask, txn_config, params,
                    () => 'customdeploy_scv_mr_txn_exe', 1, 1);
                cmTxnExe.putCachedMrTaskList(myCache, listCachedTask);
                mrTaskId = result.taskId || mrTaskId;
                messageInfo = result.taskId ? 'Your request has been submitted. Task ID: ' + result.taskId : result.message;
            }

            return {iscomplete, messageInfo, mrTaskId};
        }
        
        return {onRequest}
        
    });
