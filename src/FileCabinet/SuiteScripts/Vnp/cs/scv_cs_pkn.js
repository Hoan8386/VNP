/**
 * Nội dung: Áp dụng cho màn hinh phiếu kiểm nhận
 * Key:customrecord_scv_inspection_header||PKN
 * =======================================================================================
 *  Date                Author                  Description
 *  13 Aug 2026         Khanh Tran              Init, create file. Tự động set field value dưới Line theo trên Header mục (2.6) from ms. Thủy(https://app.clickup.com/t/3773072/86d40b1jh)
 */
/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
    'N/currentRecord',
    'N/search',
    'N/ui/dialog',
    '../common/scv_common_create_pkn.js',
    '../cons/scv_cons_search_item_tck.js',
    '../cons/scv_cons_search_tcn_hanghoa.js',
],
function(
    currentRecord,
    search,
    dialog,
    commonCreatePkn,
    constSearchItemTck,
    constSearchTcnHangHoa
) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {
        window.addTieuChiKiem = addTieuChiKiem;
        window.addTieuChiNhanHang = addTieuChiNhanHang;
    }

    /**
     * Function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @since 2015.2
     */
    function fieldChanged(scriptContext) {
        let curRec = scriptContext.currentRecord;
        let sublistId = scriptContext.sublistId;
        let fieldId = scriptContext.fieldId;
        
        if (sublistId == "recmachcustrecord_scv_insp_n_header") {
            if (fieldId == "custrecord_scv_insp_n_lot_number") {
                commonCreatePkn.setCurrentChiTietLo(curRec);
            }
        }
    }

    /**
     * Function to be executed when field is slaved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     *
     * @since 2015.2
     */
    function postSourcing(scriptContext) {

    }

    /**
     * Function to be executed after sublist is inserted, removed, or edited.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function sublistChanged(scriptContext) {

    }

    /**
     * Function to be executed after line is selected.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @since 2015.2
     */
    function lineInit(scriptContext) {

    }

    /**
     * Validation function to be executed when field is changed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     * @param {string} scriptContext.fieldId - Field name
     * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
     * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
     *
     * @returns {boolean} Return true if field is valid
     *
     * @since 2015.2
     */
    function validateField(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is committed.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateLine(scriptContext) {

    }

    /**
     * Validation function to be executed when sublist line is inserted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateInsert(scriptContext) {

    }

    /**
     * Validation function to be executed when record is deleted.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.sublistId - Sublist name
     *
     * @returns {boolean} Return true if sublist line is valid
     *
     * @since 2015.2
     */
    function validateDelete(scriptContext) {

    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {

    }

    const addTieuChiKiem = () => {
        let curRec = currentRecord.get();
        let createdFrom = curRec.getValue({fieldId: 'custrecord_scv_insp_h_createdfrom'});
        let item = curRec.getValue({fieldId: 'custrecord_scv_insp_h_item'});

        if (!createdFrom || !item) {
            alert("Vui lòng nhập Created From và  Item.");
            return;
        }

        let lkTran = search.lookupFields({
            type: 'transaction', id: createdFrom, columns: ['custbody_scv_loai_kiem_nhap']
        });
        
        let loaiKiemNhap = lkTran.custbody_scv_loai_kiem_nhap?.[0]?.value || '';
        if (!loaiKiemNhap) {
            alert("Vui lòng nhập custbody_scv_loai_kiem_nhap");
            return;
        };

        _scvForm.showLoadingDialog(true);

        setTimeout(() => {
            try {
                let arrTCK_KH = constSearchItemTck.getDataSource({
                    custpage_loaikiemnhap: loaiKiemNhap,
                    custpage_item: item
                });

                commonCreatePkn.addTieuChiKiem(curRec, arrTCK_KH);
            } catch (error) {
                console.error('addTieuChiKiem', error);
                alert(error.message);
            } finally {
                _scvForm.showLoadingDialog(false);
            }
        }, 0);
    }

    const addTieuChiNhanHang = () => {
        let curRec = currentRecord.get();
        let createdFrom = curRec.getValue({fieldId: 'custrecord_scv_insp_h_createdfrom'});

        if (!createdFrom) {
            alert("Vui lòng nhập Created From.");
            return;
        }

        let lkTran = search.lookupFields({
            type: 'transaction', id: createdFrom, columns: ['custbody_scv_loai_kiem_nhap']
        });
        let loaiKiemNhap = lkTran.custbody_scv_loai_kiem_nhap?.[0]?.value || '';
        if (!loaiKiemNhap) {
            alert("Vui lòng nhập custbody_scv_loai_kiem_nhap");
            return;
        }

        _scvForm.showLoadingDialog(true);

        setTimeout(() => {
            try {
                let arrTCN_NH = constSearchTcnHangHoa.getDataSource({
                    custpage_loaikiemnhap: loaiKiemNhap
                });
                arrTCN_NH = arrTCN_NH.map(objTcn => ({ tieuchinhan: objTcn.id }));

                commonCreatePkn.addTieuChiNhanHang(curRec, arrTCN_NH);
            } catch (error) {
                console.error('addTieuChiNhanHang', error);
                alert(error.message);
            } finally {
                _scvForm.showLoadingDialog(false);
            }
        }, 0);
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        // postSourcing: postSourcing,
        // sublistChanged: sublistChanged,
        // lineInit: lineInit,
        // validateField: validateField,
        // validateLine: validateLine,
        // validateInsert: validateInsert,
        // validateDelete: validateDelete,
        // saveRecord: saveRecord
    };
    
});
