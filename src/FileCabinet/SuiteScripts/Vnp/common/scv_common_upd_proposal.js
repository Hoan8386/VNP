/**
 * Nội dung:
 * 
 *
 * =======================================================================================
 *  Date                Author                  Description
 *  5 Aug 2026          Thanh Hoan              Init, create file 
 */

/**
 * @NApiVersion 2.1
 */
define(['N/search','N/record',
    '../cons/scv_cons_search_upd_proposal.js'], 
    (search,record,constSearchUPDProposal) => {

    const _isValid = (newRecord)=>{
        let propsourceid = newRecord.getCurrentValue('custrecord_propsourceid');
        let propsourceline = newRecord.getCurrentValue('custrecord_propsourceline');

        return !!propsourceid && !!propsourceline ;
    }
    const updateInformationForProposal = (newRecord)=>{
        let propsourceid = newRecord.getCurrentValue('custrecord_propsourceid');
        let propsourceline = newRecord.getCurrentValue('custrecord_propsourceline');
        if (!_isValid(newRecord)) return;
        let result = constSearchUPDProposal.getDataSource({
            internalId : propsourceid,
            lineId:propsourceline
        })

        if(!result) return;

        log.error(result);

        // newRecord.setValue({
        //     fieldId: 'custrecord_scv_proposal_serial',
        //     value: result[0].getValue('custcol_scv_serial_number'),
        // });

        // newRecord.setValue({
        //     fieldId: 'custrecord_scv_proposal_model',
        //     value: result[0].getValue('custcol_scv_model_no'),
        // });

        // newRecord.setValue({
        //     fieldId: 'custrecord_propcaretaker',
        //     value: result[0].getValue('custcol_scv_custodian'),
        // });

    }

  


    return {
        updateInformationForProposal,
    };
});