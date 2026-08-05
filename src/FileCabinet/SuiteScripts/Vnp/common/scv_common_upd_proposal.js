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
define([
    'N/search',
    'N/record',
    '../cons/scv_cons_search_upd_proposal.js'
], 
(search, record, constSearchUPDProposal) => {

    const _isValid = (newRecord) => {

        let propsourceid = newRecord.getValue({
            fieldId: 'custrecord_propsourceid'
        });

        let propsourceline = newRecord.getValue({
            fieldId: 'custrecord_propsourceline'
        });

        return !!propsourceid && !!propsourceline;
    };


    const updateInformationForProposal = (newRecord) => {

        if (!_isValid(newRecord)) return;

        let propsourceid = newRecord.getValue({
            fieldId: 'custrecord_propsourceid'
        });

        let propsourceline = newRecord.getValue({
            fieldId: 'custrecord_propsourceline'
        });


        let result = constSearchUPDProposal.getDataSource({
            custrecord_propsourceid: propsourceid,
            custrecord_propsourceline: propsourceline
        });


        if (!result || result.length === 0) return;

        // log.error({
        //     title: 'Proposal Source Result',
        //     details: result
        // });
        const data = result[0];
        newRecord.setValue({
            fieldId: 'custrecord_scv_proposal_serial',
            value: data.serial_number
        });


        newRecord.setValue({
            fieldId: 'custrecord_scv_proposal_model',
            value: data.so_model
        });


        newRecord.setValue({
            fieldId: 'custrecord_propcaretaker',
            value: data.custodian
        });

    };


    return {
        updateInformationForProposal,
    };

});