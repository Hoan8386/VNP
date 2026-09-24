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
                TYPES: Object.freeze([1, 2, 3, 5, 11, 7, 10]),
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

    /**
     * One entry per KNKT Word print button.
     *
     * The key is the `printfile` URL parameter the button sends to
     * `scv_sl_knkt_print`. Adding a new KNKT print = adding one entry here plus
     * the matching template in `xml/word` — no logic change in the UE or the
     * Suitelet.
     *
     *   buttonId          - form button id (the `secondary...` twin is derived).
     *                       PHẢI chứa chuỗi 'word': scv_common_ui.addIconToButton
     *                       chọn icon theo từ khoá pdf/excel/word có trong id.
     *                       Đổi thành '..._pdf' là nút hiện icon PDF trở lại.
     *   label             - button caption
     *   prefix            - leading text of the generated .doc file name
     *   requiresTwoResults- true when the button only shows for records that
     *                       have a khuyến nghị with 2+ kết quả
     *   excludeCompleted  - true when khuyến nghị whose latest kết quả is in
     *                       Knkt.COMPLETED_RESULT_TEXTS are hidden (FDD task06
     *                       Request List #6)
     */
    const KnktWordTemplate = Object.freeze({
        scv_render_knkt_word: Object.freeze({
            buttonId: 'custpage_scv_btn_knkt_word',
            label: 'KNKT',
            prefix: 'BaoCaoKNKT_',
            requiresTwoResults: false,
            excludeCompleted: false
        }),
        scv_render_knkt_word_l2: Object.freeze({
            buttonId: 'custpage_scv_btn_knkt_word_l2',
            label: 'KNKT lần 2',
            prefix: 'BaoCaoKNKT_Lan2_',
            requiresTwoResults: false, // anh lead yêu cầu luôn hiển thị (21/09/2026)
            excludeCompleted: true
        }),
        scv_render_knkt_word_nb: Object.freeze({
            buttonId: 'custpage_scv_btn_knkt_word_nb',
            label: 'KNKT NB',
            prefix: 'BaoCaoKNKT_NB_',
            requiresTwoResults: false,
            excludeCompleted: false
        })
    });

    const Knkt = Object.freeze({
        RECORD_TYPE: 'customrecord_scv_xu_ly_kien_nghi',
        PRINT_FILE: 'scv_render_knkt_pdf',
        PRINT_FILE_LAN_2: 'scv_render_knkt_pdf_l2',
        PRINT_FILES: Object.freeze(['scv_render_knkt_pdf', 'scv_render_knkt_pdf_l2']),
        WORD_TEMPLATE: KnktWordTemplate,
        WORD_TEMPLATE_ORDER: Object.freeze(Object.keys(KnktWordTemplate)),
        DEFAULT_WORD_PRINT_FILE: 'scv_render_knkt_word',
        // DEPRECATED — thay bằng WORD_TEMPLATE. Giữ lại để file cũ còn nằm trong
        // File Cabinet (chưa kịp upload lại) không vỡ. Xoá sau khi đã confirm
        // không còn ai đọc, và xoá cùng lúc với KnktWordTemplate refactor.
        WORD_PRINT_FILE: 'scv_render_knkt_word',
        WORD_PRINT_FILE_LAN_2: 'scv_render_knkt_word_l2',
        WORD_PRINT_FILES: Object.freeze(Object.keys(KnktWordTemplate)),
        WORD_PREFIX: 'BaoCaoKNKT_',
        WORD_PREFIX_LAN_2: 'BaoCaoKNKT_Lan2_',
        WORD_FOLDER: 'xml/word',
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
        // So sánh sau khi trim + lowercase + NFC (xem scv_sl_knkt_print).
        COMPLETED_RESULT_TEXTS: Object.freeze([
            'đã hoàn thành nhưng chưa xác nhận',
            'đã hoàn thành và đã xác nhận'
        ]),
        INTERNAL_ID: 'internalid',
        INACTIVE: 'isinactive',
        ACTIVE_VALUE: 'F',
        EMPTY: ''
    });

    const Bbth = Object.freeze({
        DEFAULT_RECORD_TYPE: 'vendorreturnauthorization',
        PRINT_FILE: 'scv_render_bbth_pdf',
        SUBLIST_ID: 'item',
        FIELD: Object.freeze({
            ENTITY: 'entity',
            SUBSIDIARY: 'subsidiary',
            TRANSACTION_DATE: 'trandate'
        }),
        LINE_FIELD: Object.freeze({
            DESCRIPTION: 'description',
            UNITS_DISPLAY: 'unitsdisplay',
            UNITS: 'units',
            QUANTITY: 'quantity'
        }),
        SUBRECORD: Object.freeze({
            INVENTORY_DETAIL: 'inventorydetail',
            INVENTORY_ASSIGNMENT: 'inventoryassignment',
            ISSUE_INVENTORY_NUMBER: 'issueinventorynumber',
            EXPIRATION_DATE: 'expirationdate'
        }),
        EMPTY: ''
    });

    const Pnk = Object.freeze({
        DEFAULT_RECORD_TYPE: 'itemreceipt',
        PRINT_FILE: 'scv_render_pnk_pdf',
        SUBLIST_ID: 'item',
        FIELD: Object.freeze({
            TRANSACTION_DATE: 'trandate',
            TRANSACTION_ID: 'tranid',
            ENTITY: 'entity',
            SUBSIDIARY: 'subsidiary',
            CREATED_FROM: 'createdfrom',
            INVOICE_NUMBER: 'custbody_scv_invoice_number',
            INVOICE_DATE: 'custbody_scv_invoice_date',
            CONCLUSION: 'custbody_scv_memo_custom'
        }),
        LINE_FIELD: Object.freeze({
            ITEM: 'item',
            DESCRIPTION: 'description',
            UNITS: 'units',
            UNITS_DISPLAY: 'unitsdisplay',
            QUANTITY: 'quantity',
            LOCATION: 'location',
            INSPECTION_NUMBER: 'custcol_scv_inspection_number',
            ORIGIN_LINE_NUM: 'custcol_scv_origin_line_num'
        }),
        SUBRECORD: Object.freeze({
            INVENTORY_DETAIL: 'inventorydetail',
            INVENTORY_ASSIGNMENT: 'inventoryassignment',
            RECEIPT_INVENTORY_NUMBER: 'receiptinventorynumber',
            EXPIRATION_DATE: 'expirationdate',
            QUANTITY: 'quantity'
        }),
        PKN: Object.freeze({
            RECORD_TYPE: 'customrecord_scv_inspection_header',
            FIELD: Object.freeze({
                ITEM: 'custrecord_scv_insp_h_item',
                UNIT: 'custrecord_scv_insp_h_unit',
                QUANTITY: 'custrecord_scv_insp_h_qty',
                LOCATION: 'custrecord_scv_insp_h_location',
                ENTITY: 'custrecord_scv_insp_h_entity',
                ORIGINAL_LINE_ID: 'custrecord_scv_insp_h_ori_line_id'
            }),
            DOCUMENT_SUBLIST: 'recmachcustrecord_scv_insp_d_header',
            DOCUMENT_CRITERIA: 'custrecord_scv_insp_d_criteria',
            DOCUMENT_RESULT: 'custrecord_scv_insp_d_result',
            RECEIPT_SUBLIST: 'recmachcustrecord_scv_insp_i_header',
            RECEIPT_CRITERIA: 'custrecord_scv_insp_i_criteria',
            RECEIPT_RESULT: 'custrecord_scv_insp_i_result',
            RECEIPT_LOT: 'custrecord_scv_insp_i_lotnumber'
        }),
        LOCATION: Object.freeze({
            ADDRESS: 'custrecord_scv_loc_address',
            PHARMACIST: 'custrecord_scv_loc_ds_phu_trach',
            STOREKEEPER: 'custrecord_scv_loc_thu_kho',
            QUALITY_CONTROL: 'custrecord_scv_loc_cv_kscl'
        }),
        /**
         * Quy tắc đánh dấu Đạt / Không đạt trong hai bảng kiểm.
         *
         * TICK_VALUES / UNTICK_VALUES được so khớp với CẢ giá trị thô
         * (getSublistValue) VÀ nhãn hiển thị (getSublistText) của
         * custrecord_scv_insp_d_result và custrecord_scv_insp_i_result.
         * Giá trị không khớp danh sách nào cũng KHÔNG được tick, và được ghi vào
         * chẩn đoán để đối chiếu.
         *
         * TODO(schema): kiểu của hai field kết quả chưa xác minh trên account.
         * - Nếu là checkbox: TICK_VALUES hiện tại đã đúng.
         * - Nếu là select Đạt/Không đạt: thay bằng nhãn hoặc internal ID tương ứng.
         * UNTICK_VALUES cố ý để rỗng: checkbox chưa check chỉ có nghĩa "chưa tick",
         * chưa đủ căn cứ diễn giải thành "Không đạt".
         */
        RESULT: Object.freeze({
            /**
             * Bảng "Kiểm tra chứng từ" — custrecord_scv_insp_d_result.
             * FDD chỉ ghi "lấy Kết quả" và mẫu in vẽ ô ☑/☐ nên đây là checkbox.
             */
            DOCUMENT_TICK_VALUES: Object.freeze([true, 'T']),
            /**
             * Bảng "Kiểm nhận hàng" — custrecord_scv_insp_i_result.
             * FDD mục 19/20 ghi rõ: "Kết quả = Đạt => tích ô này" và
             * "Kết quả = Không đạt => tích ô này". Đây là field GIÁ TRỊ CHỮ,
             * KHÔNG phải checkbox — so khớp với text của ô (getSublistText).
             */
            RECEIPT_PASS_VALUES: Object.freeze(['Đạt']),
            RECEIPT_FAIL_VALUES: Object.freeze(['Không đạt']),
            POSITIVE_LABEL: 'Đạt',
            NEGATIVE_LABEL: 'Không đạt',
            /**
             * CỜ ĐÁNH DẤU — KHÔNG phải ký tự được in ra.
             *
             * Đổi giá trị này KHÔNG làm đổi hình dạng dấu trên bản in. Template
             * chỉ so sánh chuỗi này với '' để biết ô có được đánh dấu hay không;
             * dấu ✓ thật do widget <input type="checkbox"> của BFO tự vẽ bằng
             * ZapfDingbats. Muốn đổi hình dạng dấu thì sửa xml/pdf/scv_render_pnk_pdf.xml.
             *
             * LÝ DO phải là chuỗi chứ không phải boolean: render.DataSource.OBJECT
             * không giữ được kiểu boolean sang FreeMarker. Đã xác nhận bằng log —
             * tickCount ghi hangHoa:9, chungTu:3 (SL tick đúng 12 ô) nhưng bản in
             * ra trống hoàn toàn và KHÔNG có lỗi render nào, trong khi mọi field
             * kiểu chuỗi ở cùng object đều in đúng.
             */
            TICK_GLYPH: 'X',
            /**
             * Nhãn cột "đạt" của riêng từng tiêu chí, theo FDD mục 19/22/25:
             * "Số lượng theo hóa đơn - Đủ", còn hai tiêu chí kia là "Đạt".
             * CHỈ dùng cho chữ hiển thị trên đầu cột — khoá so khớp kết quả vẫn là
             * internal ID của tiêu chí, nên BA đổi tên tiêu chí cũng không vỡ logic.
             */
            POSITIVE_LABEL_BY_CRITERIA: Object.freeze({
                'Số lượng theo hóa đơn': 'Đủ'
            })
        }),
        /**
         * CHỈ dùng làm tiêu đề cột khi Item Receipt chưa gắn PKN nào, để bảng hàng
         * hoá còn giữ khung theo mẫu in. KHÔNG BAO GIỜ được dùng làm khoá so khớp
         * kết quả — khoá luôn là internal ID của tiêu chí.
         */
        RECEIPT_CRITERIA_FALLBACK_LABELS: Object.freeze([
            Object.freeze({label: 'Số lượng theo hóa đơn', positiveLabel: 'Đủ'}),
            Object.freeze({label: 'Điều kiện bảo quản khi vận chuyển', positiveLabel: 'Đạt'}),
            Object.freeze({label: 'Nhận xét cảm quan', positiveLabel: 'Đạt'})
        ]),
        /**
         * Ảnh dấu tick cho ô kiểm tra chứng từ và ô Đạt/Không đạt.
         *
         * Lý do dùng ảnh thay vì ký tự: KHÔNG font nào trong project có glyph dấu
         * tick. Đã in thử và loại U+2713, U+2714, U+2611 (cả Times lẫn Arial) và
         * font-family "ZapfDingbats". U+221A "√" hiện được nhưng là dấu căn, không
         * giống mẫu in.
         *
         * Đường dẫn tương đối tính từ scv_sl_pnk_print.js trong thư mục sl/.
         * Nếu file chưa tồn tại, Suitelet vẫn in bình thường và tự lùi về ký tự
         * dự phòng khai trong template.
         */
        TICK_IMAGE_PATH: '../img/tick.png',
        ENTITY_LEGAL_NAME: 'custentity_scv_legal_name',
        EMPTY: ''
    });

    return {UrlParameter, Template, Currency, Pdnmvt, Kbbgh, Ddh, Pr, Unc, Knkt, Bbth, Pnk};
});
