/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  14 Aug 2026         Thanh Hoan              Init, create file. Chức năng phân bổ doanh thu chưa thực hiên from ms. Tâm(https://app.clickup.com/t/3773072/86d40yedc)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/search', "N/ui/message",
    '../common/scv_common_pbdtcth.js',
], (search, message,
    commonPbdtcth,
) => {
     function pageInit(scriptContext) {

    }
    const searchResult = async () => {
        let params = _scvForm.getParameter(); 
        if (!params.custpage_subsidiary ) {
            alert('Vui lòng nhập Subsidiary');
            return;
        }

        if ( !params.custpage_date) {
            alert('Vui lòng nhập Date');
            return;
        }
        _scvForm.showLoadingDialog(true);
        let requestData = {
            action: 'getDataPbdtcth',
            ...params
        };  

        _scvForm.ajax.postAsync(_scvForm.serviceScript.url,requestData, (response) => {
            let objData = response.data || {};
            _scvDx.setDataSource("custpage_sl_result", objData.arrResult);
            _scvForm.showLoadingDialog(false);
            
        });
    };

    const onSubmit = () =>{
        let params = _scvForm.getParameter(); 
        if (!params.custpage_subsidiary ) {
            alert('Vui lòng nhập Subsidiary');
            return;
        }

        if ( !params.custpage_date) {
            alert('Vui lòng nhập Date');
            return;
        }
        _scvForm.showLoadingDialog(true);
        let requestData = {
            action: 'getDataPbdtcth',
            ...params
        };  

         _scvForm.ajax.postAsync(_scvForm.serviceScript.url,requestData, (response) => {
            let objData = response.data || {};
            commonPbdtcth.crateNewJournals(params , objData.arrResult)        
        });

        _scvForm.showLoadingDialog(false);


    }

    return {
        pageInit:pageInit,
        searchResult,
        onSubmit
    };
});
