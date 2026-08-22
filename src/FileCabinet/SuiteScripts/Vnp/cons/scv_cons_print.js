/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 * Shared constants for the print Suitelets.
 */
define([], () => {
    const UrlParameter = Object.freeze({
        RECORD_ID: 'recid',
        PRINT_FILE: 'printfile',
        RECORD_TYPE: 'rectype',
        FORM: 'mau',
        FORMAT: 'format'
    });

    const Template = Object.freeze({
        RECORD_ALIAS: 'record',
        DATA_ALIAS: 'dataJson'
    });

    const Currency = Object.freeze({
        SYMBOL_TO_CODE: Object.freeze({
            VND: 'VND',
            'VN\u0110': 'VND',
            '\u20AB': 'VND',
            '\u0111': 'VND'
        })
    });

    const Pdnmvt = Object.freeze({
        RECORD_TYPE: 'custompurchase_scv_pur_requisition',
        PRINT_FILE: 'scv_render_pdnmvt_pdf',
        SUBLIST_ID: 'item',
        COMPANY_NAME_SEPARATOR: ' - ',
        COMPANY_TYPE_NAMES: Object.freeze({
            CTCP: 'C\u00d4NG TY C\u1ed4 PH\u1ea6N'
        }),
        FIELD: Object.freeze({
            SUBSIDIARY: 'subsidiary',
            TRANSACTION_ID: 'tranid',
            TRANSACTION_DATE: 'trandate',
            REQUIRED_DATE: 'custbody_scv_exp_receipt_date'
        }),
        LINE_FIELD: Object.freeze({
            ITEM: 'item',
            MEMO: 'memo',
            UNITS: 'units',
            UNITS_DISPLAY: 'unitsdisplay',
            QUANTITY: 'custcol_scv_quantity'
        }),
        EMPTY: ''
    });

    const Kbbgh = Object.freeze({
        DEFAULT_RECORD_TYPE: 'itemfulfillment',
        PRINT_FILE: 'scv_render_kbbgh_pdf',
        SUBLIST_ID: 'item',
        FIELD: Object.freeze({
            SUBSIDIARY: 'subsidiary',
            ENTITY: 'entity',
            TRANSACTION_DATE: 'trandate',
            RECEIVER: 'custbody_scv_receiver',
            SHIP_ADDRESS: 'shipaddress'
        }),
        LINE_FIELD: Object.freeze({
            ITEM: 'item',
            DESCRIPTION: 'description',
            UNITS_DISPLAY: 'unitsdisplay',
            UNITS: 'units',
            QUANTITY: 'quantity'
        }),
        CUSTOMER_RECORD_TYPE: 'customer',
        CUSTOMER_LEGAL_NAME_FIELD: 'custentity_scv_legal_name',
        ITEM_QUERY: 'SELECT item.displayname FROM item item WHERE item.id = ?',
        QUANTITY_DECIMAL_PLACES: 2,
        THOUSANDS_SEPARATOR: ',',
        DECIMAL_SEPARATOR: '.',
        EMPTY: ''
    });

    const Ddh = Object.freeze({
        DEFAULT_RECORD_TYPE: 'purchaseorder',
        PRINT_FILE: 'scv_render_ddh_pdf',
        SUBLIST_ID: 'item',
        FIELD: Object.freeze({
            SUBSIDIARY: 'subsidiary',
            ENTITY: 'entity',
            TRANSACTION_ID: 'tranid',
            BILL_ADDRESS: 'billaddress',
            CURRENCY: 'currency'
        }),
        LINE_FIELD: Object.freeze({
            ITEM: 'item',
            DESCRIPTION: 'description',
            UNITS: 'units',
            QUANTITY: 'quantity',
            RATE: 'rate',
            AMOUNT: 'amount',
            TAX_AMOUNT: 'tax1amt',
            GROSS_AMOUNT: 'grossamt'
        }),
        VENDOR_RECORD_TYPE: 'vendor',
        VENDOR_LEGAL_NAME_FIELD: 'custentity_scv_legal_name',
        VENDOR_PHONE_FIELD: 'custentity_scv_phone_no',
        VENDOR_QUERY: [
            'SELECT',
            '    vendor.custentity_scv_legal_name AS legalname,',
            '    vendor.custentity_scv_phone_no AS phoneno,',
            '    entityAddress.addr1 AS addr1,',
            '    entityAddressBook.defaultbilling AS defaultbilling',
            'FROM vendor vendor',
            'LEFT JOIN entityAddressbook entityAddressBook',
            '    ON entityAddressBook.entity = vendor.id',
            'LEFT JOIN entityAddress entityAddress',
            '    ON entityAddress.nkey = entityAddressBook.addressbookaddress',
            'WHERE vendor.id = ?'
        ].join('\n'),
        CURRENCY_QUERY: 'SELECT currency.symbol FROM currency currency WHERE currency.id = ?',
        ITEM_QUERY: [
            'SELECT item.upccode, item.displayname',
            'FROM item item',
            'WHERE item.id = ?'
        ].join('\n'),
        DEFAULT_CURRENCY: 'VND',
        RATE_DECIMAL_PLACES: 8,
        QUANTITY_DECIMAL_PLACES: 2,
        MONEY_DECIMAL_PLACES: 2,
        MONEY_FRACTION_TOLERANCE: 0.000001,
        THOUSANDS_SEPARATOR: ',',
        DECIMAL_SEPARATOR: '.',
        EMPTY: ''
    });

    const Pr = Object.freeze({
        RECORD_TYPE: 'customrecord_scv_paymentrequest',
        DETAIL_RECORD_TYPE: 'customrecord_scv_payment_detail',
        HEADER_FIELD: Object.freeze({
            PAYMENT_TYPE: 'custrecord_scv_payment_type',
            SUBSIDIARY: 'custrecord_scv_payr_subs',
            DEPARTMENT: 'custrecord_scv_payment_department',
            PAYMENT_DATE: 'custrecord_scv_payment_date',
            DUE_DATE: 'custrecord_scv_payment_due_date',
            MEMO: 'custrecord_scv_payment_memo',
            AMOUNT: 'custrecord_scv_payment_amount',
            PAYMENT_METHOD: 'custrecord_scv_payment_method',
            BENEFICIARY: 'custrecord_scv_payment_nguoi_thu_huong',
            BANK_ACCOUNT: 'custrecord_scv_payment_bankaccount',
            BANK_NAME: 'custrecord_scv_payment_bankname',
            CURRENCY: 'custrecord_scv_payment_currency',
            REQUESTER: 'custrecord_scv_payment_ngycau',
            APPROVER_5: 'custrecord_scv_payment_approver5',
            APPROVER_4: 'custrecord_scv_payment_approver4',
            APPROVER_3: 'custrecord_scv_payment_approver3',
            APPROVER_2: 'custrecord_scv_payment_approver2',
            APPROVER_1: 'custrecord_scv_payment_approver1'
        }),
        SUBLIST_ID: 'recmachcustrecord_scv_pay',
        DETAIL_FIELD: Object.freeze({
            PARENT: 'custrecord_scv_pay',
            DESCRIPTION: 'custrecord_scv_pay_detail_des',
            AMOUNT: 'custrecord_scv_pay_detail_gr_amt',
            INACTIVE: 'isinactive',
            INTERNAL_ID: 'id'
        }),
        EMPLOYEE_RECORD_TYPE: 'employee',
        EMPLOYEE_LEGAL_NAME_FIELD: 'custentity_scv_legal_name',
        EMPLOYEE_FIELDS: Object.freeze([
            'custrecord_scv_payment_ngycau',
            'custrecord_scv_payment_approver5',
            'custrecord_scv_payment_approver4',
            'custrecord_scv_payment_approver3',
            'custrecord_scv_payment_approver2',
            'custrecord_scv_payment_approver1'
        ]),
        PAYMENT_METHOD: Object.freeze({
            CASH: '7',
            TRANSFER: '1',
            BOTH_CASH_AND_TRANSFER_A: '8',
            BOTH_CASH_AND_TRANSFER_B: '9'
        }),
        PAYMENT_METHOD_CODE: Object.freeze({
            '1': 'TRANSFER',
            '7': 'CASH',
            '8': 'BOTH',
            '9': 'BOTH'
        }),
        CURRENCY_NAMES: Object.freeze({
            VND: '\u0110\u1ed3ng'
        }),
        FORMS: Object.freeze({
            DNTU: Object.freeze({
                KEY: 'dntu',
                TYPES: Object.freeze([4]),
                PRINT_FILE: 'scv_render_dntu_pdf',
                HAS_DUE_DATE: true,
                FORM_NUMBER: '01',
                TITLE: 'GI\u1ea4Y \u0110\u1ec0 NGH\u1eca T\u1ea0M \u1ee8NG',
                LABELS: Object.freeze({
                    nguoiDeNghi: 'T\u00ean t\u00f4i l\u00e0',
                    noiDung: 'L\u00fd do t\u1ea1m \u1ee9ng',
                    hinhThuc: 'H\u00ecnh th\u1ee9c t\u1ea1m \u1ee9ng',
                    chuTaiKhoan: 'Ch\u1ee7 t\u00e0i kho\u1ea3n',
                    soTaiKhoan: 'S\u1ed1 t\u00e0i kho\u1ea3n',
                    nganHang: 'T\u1ea1i Ng\u00e2n h\u00e0ng',
                    cauDan: 'K\u00ednh \u0111\u1ec1 ngh\u1ecb t\u1ea1m \u1ee9ng c\u00e1c n\u1ed9i dung sau:',
                    donViTien: '\u0110\u01a1n v\u1ecb'
                })
            }),
            DNTT: Object.freeze({
                KEY: 'dntt',
                TYPES: Object.freeze([1, 2, 3, 5, 6]),
                PRINT_FILE: 'scv_render_dntt_pdf',
                HAS_DUE_DATE: false,
                FORM_NUMBER: '03',
                TITLE: 'GI\u1ea4Y \u0110\u1ec0 NGH\u1eca THANH TO\u00c1N',
                LABELS: Object.freeze({
                    nguoiDeNghi: 'Ng\u01b0\u1eddi \u0111\u1ec1 ngh\u1ecb thanh to\u00e1n',
                    noiDung: 'N\u1ed9i dung thanh to\u00e1n',
                    hinhThuc: 'H\u00ecnh th\u1ee9c thanh to\u00e1n',
                    chuTaiKhoan: '\u0110\u01a1n v\u1ecb th\u1ee5 h\u01b0\u1edfng',
                    soTaiKhoan: 'S\u1ed1 TK',
                    nganHang: 'Ng\u00e2n h\u00e0ng',
                    cauDan: 'K\u00ednh \u0111\u1ec1 ngh\u1ecb thanh to\u00e1n c\u00e1c n\u1ed9i dung sau:',
                    donViTien: '\u0110\u01a1n v\u1ecb t\u00ednh'
                })
            })
        }),
        EMPTY: ''
    });

    const Unc = Object.freeze({
        RECORD_TYPES: Object.freeze({
            CHECK: 'check',
            VENDOR_PREPAYMENT: 'vendorprepayment',
            VENDOR_PAYMENT: 'vendorpayment'
        }),
        TRANSACTION_FIELD: Object.freeze({
            ACCOUNT: 'account',
            TRANSACTION_DATE: 'trandate',
            MEMO: 'memo',
            TOTAL: 'total',
            CURRENCY: 'currency',
            SUBSIDIARY: 'subsidiary',
            BENEFICIARY_BANK: 'custbody_scv_beneficiary_bank',
            BENEFICIARY_ACCOUNT: 'custbody_scv_bank_account',
            BENEFICIARY_BANK_NAME: 'custbody_scv_bank_name',
            BENEFICIARY_BRANCH: 'custbody_scv_bank_branch',
            BENEFICIARY_PROVINCE: 'custbody_scv_province',
            BENEFICIARY: 'custbody_scv_beneficiary'
        }),
        ACCOUNT_FIELD: Object.freeze({
            INTERNAL_ID: 'id_tk_nguoi_tra',
            BANK_ACCOUNT: 'stk_nguoi_tra',
            BANK_NAME: 'nh_nguoi_tra',
            ROUTING_NAME: 'ten_tk_dinh_tuyen',
            BRANCH: 'cn_nguoi_tra',
            PROVINCE: 'tinh_nguoi_tra'
        }),
        ACCOUNT_NATIVE_FIELD: Object.freeze({
            BANK_ACCOUNT: 'custrecord_scv_acc_bank_acc',
            BANK_NAME: 'custrecord_scv_acc_bank_name',
            ROUTING_NAME: 'name',
            BRANCH: 'custrecord_scv_acc_bank_branch',
            PROVINCE: 'custrecord_scv_acc_province'
        }),
        ACCOUNT_RECORD_TYPE: 'account',
        BENEFICIARY_RECORD_TYPE: 'customrecord_scv_beneficiary',
        BENEFICIARY_ADDRESS_FIELD: 'custrecord_scv_beb_bank_address',
        LOGO_FOLDER: 'Images/Unc',
        ACCOUNT_QUERY: [
            'SELECT',
            '    account.id AS id_tk_nguoi_tra,',
            '    account.custrecord_scv_acc_bank_acc AS stk_nguoi_tra,',
            '    account.custrecord_scv_acc_bank_name AS nh_nguoi_tra,',
            '    account.accountsearchdisplayname AS ten_tk_dinh_tuyen,',
            '    account.custrecord_scv_acc_bank_branch AS cn_nguoi_tra,',
            '    account.custrecord_scv_acc_province AS tinh_nguoi_tra',
            'FROM transaction transaction',
            'LEFT JOIN transactionline transactionLine',
            "    ON transactionLine.transaction = transaction.id AND transactionLine.mainline = 'T'",
            'LEFT JOIN transactionaccountingline transactionAccountingLine',
            '    ON transactionAccountingLine.transaction = transaction.id',
            '   AND transactionAccountingLine.transactionline = transactionLine.id',
            'LEFT JOIN account account ON account.id = transactionAccountingLine.account',
            'WHERE transaction.id = ?'
        ].join('\n'),
        BANKS: Object.freeze({
            TPBANK: Object.freeze({
                KEYWORDS: Object.freeze(['TPBANK', 'TIENPHONGBANK']),
                PRINT_FILE: 'scv_render_unc_tpbank_pdf',
                LOGO_FILE: 'Logo-TPBank.png',
                BANNER_FILE: 'Banner-TPBank.png',
                HAS_PROVINCE: true,
                INCLUDE_SENDER_BRANCH: false,
                INCLUDE_BENEFICIARY_BRANCH: true
            }),
            VIETINBANK: Object.freeze({
                KEYWORDS: Object.freeze(['VIETINBANK', 'VIETTINBANK', 'CONGTHUONG']),
                PRINT_FILE: 'scv_render_unc_vietinbank_pdf',
                LOGO_FILE: 'Logo-VietinBank.png',
                BANNER_FILE: '',
                HAS_PROVINCE: false,
                INCLUDE_SENDER_BRANCH: true,
                INCLUDE_BENEFICIARY_BRANCH: true
            }),
            SHB: Object.freeze({
                KEYWORDS: Object.freeze(['SHB', 'SAIGONHANOI']),
                PRINT_FILE: 'scv_render_unc_shb_pdf',
                LOGO_FILE: 'Logo-SHB-EN.png',
                BANNER_FILE: '',
                HAS_PROVINCE: false,
                INCLUDE_SENDER_BRANCH: true,
                INCLUDE_BENEFICIARY_BRANCH: true
            })
        }),
        FEE_TICKS: Object.freeze({
            TPBANK: Object.freeze({
                SENDER: 'X', BENEFICIARY: '', INCLUDING: '', EXCLUDING: ''
            }),
            VIETINBANK: Object.freeze({
                SENDER: '', BENEFICIARY: '', INCLUDING: '', EXCLUDING: 'X'
            }),
            SHB: Object.freeze({
                SENDER: '', BENEFICIARY: '', INCLUDING: '', EXCLUDING: ''
            })
        }),
        CURRENCY_CODES: Object.freeze(['VND', 'USD', 'EUR']),
        BANK_NAME_SEPARATOR: ' - ',
        TICK: 'X',
        EMPTY: ''
    });

    const Knkt = Object.freeze({
        RECORD_TYPE: 'customrecord_scv_xu_ly_kien_nghi',
        PRINT_FILE: 'scv_render_knkt_pdf',
        PRINT_FILE_LAN_2: 'scv_render_knkt_pdf_l2',
        WORD_PRINT_FILE: 'scv_render_knkt_word',
        WORD_PRINT_FILE_LAN_2: 'scv_render_knkt_word_l2',
        PRINT_FILES: Object.freeze(['scv_render_knkt_pdf', 'scv_render_knkt_pdf_l2']),
        WORD_PRINT_FILES: Object.freeze(['scv_render_knkt_word', 'scv_render_knkt_word_l2']),
        WORD_FOLDER: 'xml/word',
        WORD_PREFIX: 'BaoCaoKNKT_',
        WORD_PREFIX_LAN_2: 'BaoCaoKNKT_Lan2_',
        FORMAT_PDF: 'pdf',
        FORMAT_WORD: 'word',
        WORD_EXTENSION: '.html',
        DOC_EXTENSION: '.doc',
        UTC_OFFSET_MILLISECONDS: 7 * 60 * 60 * 1000,
        HEADER_FIELD: Object.freeze({
            REPORT_NUMBER: 'custrecord_scv_xlkn_sobaocao',
            REPORT_DATE: 'custrecord_scv_xlkn_date',
            SUBSIDIARY: 'custrecord_scv_xlkn_subs',
            DEPARTMENT: 'custrecord_scv_xlkn_department'
        }),
        FINDING: Object.freeze({
            RECORD_TYPE: 'customrecord_scv_chitietkiennghi',
            PARENT: 'custrecord_scv_ctph_phieukn',
            TEXT: 'custrecord_scv_ctph_chitietphathien'
        }),
        RECOMMENDATION: Object.freeze({
            RECORD_TYPE: 'customrecord_scv_ykienkiennghi',
            PARENT: 'custrecord_scv_ykkn_chitietkhuyennghi',
            TEXT: 'custrecord_scv_ykkn_ykienkhuyennghi',
            DUE_DATE: 'custrecord_scv_ykkn_thoigianphanhoi'
        }),
        RESULT: Object.freeze({
            RECORD_TYPE: 'customrecord_scv_ketquakhuyennghi',
            PARENT: 'custrecord_scv_kqkn_ykienkhuyennghi',
            IMPLEMENTATION_STATUS: 'custrecord_scv_kqkn_tinhhinhthuchien',
            RESULT_TEXT: 'custrecord_scv_kqkn_ketquathuchien',
            IMPLEMENTATION_DATE: 'custrecord_scv_kqkn_ngaythuchien'
        }),
        INTERNAL_ID: 'internalid',
        INACTIVE: 'isinactive',
        ACTIVE_VALUE: 'F',
        EMPTY: ''
    });

    return {UrlParameter, Template, Currency, Pdnmvt, Kbbgh, Ddh, Pr, Unc, Knkt};
});
