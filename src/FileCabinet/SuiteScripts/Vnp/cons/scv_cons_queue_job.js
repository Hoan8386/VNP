/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  11 Sep 2026         Huy Pham                Init & create file, Deploy chức năng Custom Import, from ms.Tâm(https://app.clickup.com/t/3773072/14yhnhmfg32)
 */
define(['N/record', 'N/task', 'N/query', 'N/search', 'N/url', 'N/runtime',
    '../lib/scv_lib_function.js',
    '../cons/scv_cons_queue_job_status.js'
],
(record, task, query, search, url, runtime,
    lbf,
    constQueueJobStatus
) => {
	const TYPE = "customrecord_scv_queue_job";

    const Records = {
		JOB_SCRIPT: {
			TYPE: "",
			ID: "",
            DEPLOYID: "",
            PARAMSID: ""
		}
    }

	const createQueueJobScript = (_jobParamsInput) =>{
		return createQueueJob(Records.JOB_SCRIPT.TYPE, Records.JOB_SCRIPT.ID, Records.JOB_SCRIPT.DEPLOYID, Records.JOB_SCRIPT.PARAMSID, _jobParamsInput);
	}

    const createQueueJob = (_jobTaskTypeId, _jobScriptId, _jobDeployId, _jobParamFieldId, _jobParamsInput, _countErr = 0) =>{
		let createdTimestamp = Date.now().toString();
		let externalId = _jobDeployId + "_" + createdTimestamp;
		let queueRecId = "";

		try{
			if(_countErr > 5){
				log.error("createQueueJob: countErr > 5", "Vượt quá số lần retry.");
				return queueRecId;
			}

			let queueRec = record.create({type: "customrecord_scv_queue_job", isDynamic: true});
			lbf.setValueData(queueRec, [
				"custrecord_scv_queue_job_tasktype", "externalid", 
				"custrecord_scv_queue_job_scriptid", "custrecord_scv_queue_job_deployid", "custrecord_scv_queue_job_fieldparaminput",
				"custrecord_scv_queue_job_status", "custrecord_scv_queue_job_datainput",
				"custrecord_scv_queue_job_crt_ms",
			], [
				_jobTaskTypeId, externalId, 
				_jobScriptId, _jobDeployId, _jobParamFieldId,
				constQueueJobStatus.Records.Pending.ID, _jobParamsInput,
				createdTimestamp,
			])
			queueRecId = queueRec.save({enableSourcing: false, ignoreMandatoryFields: true});

			updateQueueNextPrev(_jobScriptId, _jobDeployId, queueRecId, createdTimestamp);
		}
		catch(err){
			queueRecId = createQueueJob(_jobTaskTypeId, _jobScriptId, _jobDeployId, _jobParamFieldId, _jobParamsInput, _countErr + 1);
		}

        return queueRecId;
    }

	const updateQueueNextPrev = (_scriptId, _deployId, _curQueueId, _createdTimestamp) =>{
		let objValues = getNextPrevOfQueue(_scriptId, _deployId, _curQueueId, _createdTimestamp);
		
		record.submitFields({
			type: 'customrecord_scv_queue_job', id: _curQueueId, 
			values: objValues,
			options: {
				enableSourcing: false, ignoreMandatoryFields : true
			}
		});

		//#region Kiểm tra "Queue Prev" đã được cập nhật Next Queue chưa.
		if(!!objValues.custrecord_scv_queue_job_prev){
			let prevJobId = objValues.custrecord_scv_queue_job_prev;

			let nextOfPrevJob = search.lookupFields({
				type: "customrecord_scv_queue_job", id: prevJobId,
				columns: "custrecord_scv_queue_job_next"
			}).custrecord_scv_queue_job_next;

			if(!nextOfPrevJob){
				record.submitFields({
					type: 'customrecord_scv_queue_job', id: prevJobId, 
					values: {
						custrecord_scv_queue_job_next: _curQueueId
					},
					options: {
						enableSourcing: false, ignoreMandatoryFields : true
					}
				});
			}
		}
		//#endregion
	}

	const getNextPrevOfQueue = (_scriptId, _deployId, _curQueueId, _curCreatedTimestamp) =>{
		/**
		 * HuyPQ 20260514: Phần query do làm sau, data cũ vẫn đang null các trường Next, Prev nên chưa thể thêm điều kiện giới hạn lại data
		 */
		let arrQueueNextPrev = query.runSuiteQL({query: `
			SELECT queue_other, id
			FROM (
				SELECT TOP 1 'PREV' AS queue_other, id
				FROM
					customrecord_scv_queue_job
				WHERE
					isinactive = 'F'
					AND custrecord_scv_queue_job_scriptid = '${_scriptId}'
					AND custrecord_scv_queue_job_deployid = '${_deployId}'
					AND custrecord_scv_queue_job_crt_ms < ${_curCreatedTimestamp}
					AND id <> ${_curQueueId}
					AND custrecord_scv_queue_job_next IS NULL
				ORDER BY custrecord_scv_queue_job_crt_ms DESC
			)
			UNION ALL
			SELECT queue_other, id
			FROM (
				SELECT TOP 1 'NEXT' AS queue_other, id
				FROM
					customrecord_scv_queue_job
				WHERE
					isinactive = 'F'
					AND custrecord_scv_queue_job_scriptid = '${_scriptId}'
					AND custrecord_scv_queue_job_deployid = '${_deployId}'
					AND id <> ${_curQueueId}
					AND custrecord_scv_queue_job_crt_ms > ${_curCreatedTimestamp}
				ORDER BY custrecord_scv_queue_job_crt_ms ASC
			)`}).asMappedResults();

		let objResult = {
			custrecord_scv_queue_job_next: arrQueueNextPrev.find(e => e.queue_other == "NEXT")?.id,
			custrecord_scv_queue_job_prev: arrQueueNextPrev.find(e => e.queue_other == "PREV")?.id,
		};

		return objResult;
	}

	const processQueueJobScript = () =>{
		return processQueueJob(Records.JOB_SCRIPT.ID, Records.JOB_SCRIPT.DEPLOYID);
	}

    const processQueueJob = (_scriptId, _deployId) => {
		let isExistsProcessing = isExistsProcessingCloseBalance(_scriptId, _deployId);
		if(isExistsProcessing) return "";

		let arrQueueNext = query.runSuiteQL({query: `select id, custrecord_scv_queue_job_scriptid, custrecord_scv_queue_job_deployid, 
				custrecord_scv_queue_job_fieldparaminput, custrecord_scv_queue_job_datainput, custrecord_scv_queue_job_tasktype,
				custrecord_scv_queue_job_prev, custrecord_scv_queue_job_next
			from customrecord_scv_queue_job
			where isinactive = 'F' 
				and custrecord_scv_queue_job_status = ${constQueueJobStatus.Records.Pending.ID}
                and custrecord_scv_queue_job_scriptid = '${_scriptId}'
				and custrecord_scv_queue_job_deployid = '${_deployId}'
			order by id asc`}).asMappedResults();

		if(arrQueueNext.length == 0) return "";

		let objQueueNext = arrQueueNext[0];

		if(!!objQueueNext.custrecord_scv_queue_job_prev){
			let statusOfPrevJob = search.lookupFields({
				type: "customrecord_scv_queue_job", id: objQueueNext.custrecord_scv_queue_job_prev,
				columns: "custrecord_scv_queue_job_status"
			}).custrecord_scv_queue_job_status[0]?.value;
			if(statusOfPrevJob == constQueueJobStatus.Records.Processing.ID){
				return "";
			}
		}

		let queueNextId = objQueueNext.id;

		let mrObjParams = {};
		mrObjParams[objQueueNext.custrecord_scv_queue_job_fieldparaminput] = objQueueNext.custrecord_scv_queue_job_datainput;

		try{
			let mrTask = task.create({
				taskType: objQueueNext.custrecord_scv_queue_job_tasktype,
				scriptId: objQueueNext.custrecord_scv_queue_job_scriptid,
				deploymentId: objQueueNext.custrecord_scv_queue_job_deployid,
				params: mrObjParams
			});

			mrTask.submit();

			record.submitFields({
				type: 'customrecord_scv_queue_job',
				id: queueNextId, 
				values: {
					custrecord_scv_queue_job_status: constQueueJobStatus.Records.Processing.ID
				},
				options: {
					enableSourcing: false, ignoreMandatoryFields : true
				}
			});
		}
		catch(err){
			queueNextId = "";
			/**
			 * 1 số case sẽ process cùng lúc (suitelet/restlet/scheudle), đôi khi sẽ lỗi
			 * FAILED_TO_SUBMIT_JOB_REQUEST_1 - Failed to submit job request: INQUEUE
			 * nhưng đang theo cơ chế linked list, các job vẫn sẽ đảm bảo execute đúng thứ tự.
			 */
		}
		

		return queueNextId;
	}

    const isExistsProcessingCloseBalance = (_scriptId, _deployId) =>{
		let queueNextId = getCurrentProcessingQueueJob(_scriptId, _deployId);

		return !!queueNextId ? true : false;
	}

    const getCurrentProcessingQueueJob = (_scriptId, _deployId) =>{
		let arrQueueNext = query.runSuiteQL({query: `select id
			from customrecord_scv_queue_job
			where isinactive = 'F' 
				and custrecord_scv_queue_job_status = ${constQueueJobStatus.Records.Processing.ID}
                and custrecord_scv_queue_job_scriptid = '${_scriptId}'
				and custrecord_scv_queue_job_deployid = '${_deployId}'
		`}).asMappedResults();

		return arrQueueNext.length > 0 ? arrQueueNext[0].id : "";
	}

    const getNoteOfQueueJob = (_queueId) =>{
		if(!_queueId) return;

		let note = search.lookupFields({
			type: "customrecord_scv_queue_job", 
			id: _queueId, 
			columns: "custrecord_scv_queue_job_note"
		}).custrecord_scv_queue_job_note;

		return note;
	}

    const updateNoteQueueJob = (_scriptId, _deployId, _note) =>{
        let queueId = getCurrentProcessingQueueJob(_scriptId, _deployId);
		if(!queueId) return;

		let old_note = getNoteOfQueueJob(queueId);

		if(old_note.toString().indexOf(_note.toString()) > -1){
			return;
		}
		
		let new_note = old_note;
		if(!!_note){
			new_note += "\n" + _note
		}

		if(new_note.length > 1000){
			new_note = new_note.substring(0, 1000);
			new_note += "(more...)"
		}

		record.submitFields({
			type: 'customrecord_scv_queue_job',
			id: queueId, 
			values: {
				custrecord_scv_queue_job_note: new_note
			},
			options: {
				enableSourcing: false, ignoreMandatoryFields : true
			}
		});

        return queueId;
	}

    const completeQueueJob = (_scriptId, _deployId, _note) =>{
        let queueId = getCurrentProcessingQueueJob(_scriptId, _deployId);
		if(!queueId) return;

		let old_note = getNoteOfQueueJob(queueId);

		let new_note = old_note;
		if(!!_note){
			new_note += "\n" + _note
		}

		record.submitFields({
			type: 'customrecord_scv_queue_job',
			id: queueId, 
			values: {
				custrecord_scv_queue_job_status: constQueueJobStatus.Records.Completed.ID,
				custrecord_scv_queue_job_note: new_note
			},
			options: {
				enableSourcing: false, ignoreMandatoryFields : true
			}
		});

		cancelDataQueuePendingOld(queueId);

        processQueueJob(_scriptId, _deployId);

        return queueId;
	}

	const cancelDataQueuePendingOld = (_queueId) => {
		if(!_queueId) return;

        let jobScriptId = "", jobDeployId = "";
		let queueJobLKF = search.lookupFields({
			type: "customrecord_scv_queue_job", 
			id: _queueId, 
			columns: ["custrecord_scv_queue_job_scriptid", "custrecord_scv_queue_job_deployid"]
		});

        jobScriptId = queueJobLKF.custrecord_scv_queue_job_scriptid;
        jobDeployId = queueJobLKF.custrecord_scv_queue_job_deployid;

		if(!jobScriptId || !jobDeployId) return;

		let arrQueueOld = query.runSuiteQL({query: `select id
			from customrecord_scv_queue_job
			where isinactive = 'F' 
				and id < ${_queueId}
				and custrecord_scv_queue_job_scriptid = '${jobScriptId}'
				and custrecord_scv_queue_job_deployid = '${jobDeployId}'
				and custrecord_scv_queue_job_status = ${constQueueJobStatus.Records.Pending.ID}
		`}).asMappedResults();

		for(let i = 0; i < arrQueueOld.length; i++){
			record.submitFields({
				type: 'customrecord_scv_queue_job',
				id: arrQueueOld[i].id, 
				values: {
					custrecord_scv_queue_job_status: constQueueJobStatus.Records.Cancel.ID,
					custrecord_scv_queue_job_note: "OLD"
				},
				options: {
					enableSourcing: false, ignoreMandatoryFields : true
				}
			});
		}

		return arrQueueOld;
	}

    const getDataQueueJob = (_params) =>{
        let str_where = ``;
        
        if(!!_params.custrecord_scv_queue_job_scriptid){
            str_where += ` and custrecord_scv_queue_job_scriptid = '${_params.custrecord_scv_queue_job_scriptid}' `;
        }
        if(!!_params.custrecord_scv_queue_job_deployid){
            str_where += ` and custrecord_scv_queue_job_deployid = '${_params.custrecord_scv_queue_job_deployid}' `;
        }

		let arrQueue = query.runSuiteQL({query: `SELECT id, custrecord_scv_queue_job_scriptid, 
                custrecord_scv_queue_job_deployid, 
                custrecord_scv_queue_job_fieldparaminput,
                custrecord_scv_queue_job_status,
                BUILTIN.DF(custrecord_scv_queue_job_status) custrecord_scv_queue_job_status_display, 
                custrecord_scv_queue_job_datainput, 
                custrecord_scv_queue_job_note,
				owner,
                NVL(BUILTIN.DF(owner),owner) owner_display,
                TO_CHAR(created,'dd/MM/YYYY HH24:MI') as created_date
            FROM customrecord_scv_queue_job
            WHERE isinactive = 'F' ${str_where}
            ORDER BY id DESC
		`}).asMappedResults();

		return arrQueue;
	}

	const getPopupQueueJobStatusScript = () =>{
		return getPopupQueueJobStatus(Records.JOB_SCRIPT.ID, Records.JOB_SCRIPT.DEPLOYID);
	}

	const getPopupQueueJobStatus = (_jobScriptId, _jobDeployId) =>{
		let urlScript = url.resolveScript({
            scriptId: 'customscript_scv_sl_popup_queue_job',
            deploymentId: 'customdeploy_scv_sl_popup_queue_job',
            params: {
				custrecord_scv_queue_job_scriptid: _jobScriptId,
				custrecord_scv_queue_job_deployid: _jobDeployId
			}
        });
		
		return {
			url: urlScript,
			winname: "popupStatusQueue",
			width: 1000,
			height: 700,
			title: "Status Queue Job"
		};
	}

	const cancelQueueJob = (_queueId) =>{
		if(!_queueId) return;

		let queueRec = record.load({type: "customrecord_scv_queue_job", id: _queueId, isDynamic: true});

		let statusId = queueRec.getValue("custrecord_scv_queue_job_status");
		if(statusId != constQueueJobStatus.Records.Pending.ID) return;

		let curUser = runtime.getCurrentUser();
		queueRec.setValue("custrecord_scv_queue_job_status", constQueueJobStatus.Records.Cancel.ID);
		queueRec.setValue("custrecord_scv_queue_job_note", `Cancel by ${curUser.name} (${curUser.email})`);

		queueRec.save({enableSourcing: false, ignoreMandatoryFields: true});
	}

	const setInfoJobScript = (_taskType, _scriptId, _deployId, _paramFieldId) =>{
		Records.JOB_SCRIPT.TYPE = _taskType;
		Records.JOB_SCRIPT.ID = _scriptId;
		Records.JOB_SCRIPT.DEPLOYID = _deployId;
		Records.JOB_SCRIPT.PARAMSID = _paramFieldId;

		return Records.JOB_SCRIPT;
	}

	const getJobScriptId = () =>{
		return Records.JOB_SCRIPT.ID;
	}

	const getJobDeployId = () =>{
		return Records.JOB_SCRIPT.DEPLOYID;
	}

    return {
		TYPE,
        Records,
		setInfoJobScript,
		getJobScriptId,
		getJobDeployId,
        createQueueJob,
		createQueueJobScript,
        processQueueJob,
		processQueueJobScript,
        updateNoteQueueJob,
        completeQueueJob,
        getDataQueueJob,
		getPopupQueueJobStatus,
		getPopupQueueJobStatusScript,
		cancelQueueJob,
		getCurrentProcessingQueueJob
    };
    
});