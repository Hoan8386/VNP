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
        clearMessages();
        let params = _scvForm.getParameter(); 
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



    
    
    let currentMessages = [];
    const showResult = (type, notes, time = -1) => {
        let msg = message.create({
            title: '',
            message: notes,
            type: type || message.Type.INFORMATION
        });

        msg.show({ duration: time });

        currentMessages.push(msg);
    };

    const clearMessages = () => {
        currentMessages.forEach(msg => {
            try {
                msg.hide();
            } catch (e) {}
        });
        currentMessages = [];
    };

    return {
        pageInit:pageInit,
        searchResult,
    };
});
