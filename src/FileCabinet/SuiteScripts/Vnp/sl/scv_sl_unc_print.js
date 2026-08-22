/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    'N/query', 'N/render', 'N/file', 'N/log', 'N/record',
    '../lib/scv_lib_pdf.js',
    '../lib/scv_lib_amount_in_word.js',
    '../lib/scv_lib_utils.js',
    '../lib/scv_lib_print_format.js',
    '../common/scv_common_print_lookup.js',
    '../cons/scv_cons_print.js'
], (
    query, render, file, log, record,
    libPdf, libAmount, libUtils, libPrintFormat, printLookup, consPrint
) => {
    const UrlParameter = consPrint.UrlParameter;
    const Template = consPrint.Template;
    const Unc = consPrint.Unc;

    const onRequest = (scriptContext) => {
        let recordId = Unc.EMPTY;
        let recordType = Unc.EMPTY;
        try {
            const params = scriptContext.request.parameters;
            recordId = params[UrlParameter.RECORD_ID];
            recordType = params[UrlParameter.RECORD_TYPE];
            if (!recordId) {
                throw new Error('Missing UNC transaction record id.');
            }
            if (!Object.values(Unc.RECORD_TYPES).includes(recordType)) {
                throw new Error('Invalid UNC transaction record type.');
            }

            const pdfFile = renderRecordToPdfWithTemplate(recordId, recordType);
            scriptContext.response.writeFile({file: pdfFile, isInline: true});
        } catch (error) {
            log.error({
                title: 'UNC print failed',
                details: {
                    recid: recordId,
                    rectype: recordType,
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                }
            });
            throw error;
        }
    };

    const renderRecordToPdfWithTemplate = (recordId, recordType) => {
        const loadedRecord = record.load({
            type: recordType,
            id: recordId,
            isDynamic: false
        });
        const bankSelection = getBankSelection(loadedRecord, recordId);
        const config = Unc.BANKS[bankSelection.bankCode];
        const renderer = libPdf.renderTemplateWithXml(config.PRINT_FILE);
        const rec = addDefaultRecordRender(renderer, recordType, recordId, loadedRecord);
        printUnc(rec, renderer, recordId, bankSelection);
        return renderer.renderAsPdf();
    };

    const addDefaultRecordRender = (renderer, recordType, recordId, loadedRecord) => {
        const rec = loadedRecord || record.load({
            type: recordType,
            id: recordId,
            isDynamic: false
        });
        renderer.addRecord(Template.RECORD_ALIAS, rec);
        return rec;
    };

    const printUnc = (rec, renderer, recordId, bankSelection) => {
        const header = getHeaderFromRecord(
            rec,
            recordId,
            bankSelection.accountData
        );
        log.debug({
            title: 'UNC header',
            details: header
        });
        const config = Unc.BANKS[bankSelection.bankCode];
        const dataJson = buildDataJson(
            header,
            bankSelection.bankCode,
            config,
            bankSelection.bankNameText
        );
        log.debug({
            title: 'UNC dataJson',
            details: dataJson
        });
        renderer.addCustomDataSource({
            format: render.DataSource.OBJECT,
            alias: Template.DATA_ALIAS,
            data: dataJson
        });
    };

    const getBankSelection = (rec, recordId) => {
        const accountData = getAccountData(rec, recordId);
        const bankNameText = accountData.id_tk_nguoi_tra
            ? libPrintFormat.getSafeFieldText(
                Unc.ACCOUNT_RECORD_TYPE,
                accountData.id_tk_nguoi_tra,
                Unc.ACCOUNT_NATIVE_FIELD.BANK_NAME
            )
            : Unc.EMPTY;
        const accountName = libPrintFormat.asText(accountData.ten_tk_dinh_tuyen);
        const bankCode = findBank(bankNameText) || findBank(accountName);
        if (!bankCode) {
            log.error({
                title: 'getBankSelection',
                details: {bankNameText, accountName, recordId}
            });
            throw new Error('No UNC bank template matched the paying account.');
        }
        return {accountData, bankCode, bankNameText};
    };

    const getAccountData = (rec, recordId) => {
        const accountId = rec.getValue({fieldId: Unc.TRANSACTION_FIELD.ACCOUNT});
        if (accountId !== null && accountId !== undefined && accountId !== '') {
            return getAccountDataFromRecord(accountId);
        }
        return getAccountDataFromSuiteQL(recordId);
    };

    const findBank = (bankName) => {
        const normalizedBankName = normalizeText(bankName);
        return Object.keys(Unc.BANKS).find((bankCode) =>
            Unc.BANKS[bankCode].KEYWORDS.some((keyword) =>
                normalizedBankName.includes(keyword)
            )
        );
    };

    const getHeaderFromRecord = (rec, recordId, accountData) => ({
        id: recordId,
        ngay_ct: libPrintFormat.formatDate(
            rec.getValue({fieldId: Unc.TRANSACTION_FIELD.TRANSACTION_DATE})
        ),
        noi_dung: rec.getValue({fieldId: Unc.TRANSACTION_FIELD.MEMO}),
        so_tien: rec.getValue({fieldId: Unc.TRANSACTION_FIELD.TOTAL}),
        ma_tien_te: printLookup.getCurrencySymbol(
            rec.getValue({fieldId: Unc.TRANSACTION_FIELD.CURRENCY})
        ),
        ten_nguoi_tra: printLookup.getSubsidiaryLegalName(
            rec.getValue({fieldId: Unc.TRANSACTION_FIELD.SUBSIDIARY})
        ),
        ...accountData,
        ten_nguoi_huong: rec.getValue({
            fieldId: Unc.TRANSACTION_FIELD.BENEFICIARY_BANK
        }),
        stk_nguoi_huong: rec.getValue({
            fieldId: Unc.TRANSACTION_FIELD.BENEFICIARY_ACCOUNT
        }),
        nh_nguoi_huong: rec.getValue({
            fieldId: Unc.TRANSACTION_FIELD.BENEFICIARY_BANK_NAME
        }),
        cn_nguoi_huong: rec.getValue({
            fieldId: Unc.TRANSACTION_FIELD.BENEFICIARY_BRANCH
        }),
        tinh_nguoi_huong: rec.getValue({
            fieldId: Unc.TRANSACTION_FIELD.BENEFICIARY_PROVINCE
        }),
        id_nguoi_huong: rec.getValue({
            fieldId: Unc.TRANSACTION_FIELD.BENEFICIARY
        })
    });

    const buildDataJson = (header, bankCode, config, bankNameText) => {
        const amount = Math.abs(libPrintFormat.asNumber(header.so_tien));
        const currencyCode = getCurrencyCode(header.ma_tien_te);
        const amountInWords = libPrintFormat.asText(
            libAmount.DocTienBangChu(amount, currencyCode)
        ).replace(/\.\/\s*$/, '');
        const currencyTicks = getCurrencyTicks(currencyCode);
        const feeTicks = getFeeTicks(bankCode);
        const beneficiaryAddress = libPrintFormat.getSafeFieldValue(
            Unc.BENEFICIARY_RECORD_TYPE,
            header.id_nguoi_huong,
            Unc.BENEFICIARY_ADDRESS_FIELD
        );

        return {
            logoUrl: getLogoUrl(config.LOGO_FILE),
            bannerUrl: getLogoUrl(config.BANNER_FILE),
            ngayCT: libPrintFormat.asText(header.ngay_ct),
            tenNguoiTra: libPrintFormat.asText(header.ten_nguoi_tra),
            stkNguoiTra: libPrintFormat.asText(header.stk_nguoi_tra),
            nhNguoiTra: combineBankName(
                bankNameText,
                header.cn_nguoi_tra,
                config.INCLUDE_SENDER_BRANCH
            ),
            tinhNguoiTra: config.HAS_PROVINCE
                ? libPrintFormat.asText(header.tinh_nguoi_tra)
                : Unc.EMPTY,
            tenNguoiHuong: libPrintFormat.asText(header.ten_nguoi_huong),
            stkNguoiHuong: libPrintFormat.asText(header.stk_nguoi_huong),
            nhNguoiHuong: combineBankName(
                header.nh_nguoi_huong,
                header.cn_nguoi_huong,
                config.INCLUDE_BENEFICIARY_BRANCH
            ),
            tinhNguoiHuong: config.HAS_PROVINCE
                ? libPrintFormat.asText(header.tinh_nguoi_huong)
                : Unc.EMPTY,
            diaChiNguoiHuong: libPrintFormat.asText(beneficiaryAddress),
            soTien: libPdf.formatNumber(amount),
            soTienBangChu: amountInWords,
            maTienTe: libPrintFormat.asText(currencyCode),
            noiDung: libPrintFormat.asText(header.noi_dung),
            tickVND: currencyTicks.tickVND,
            tickUSD: currencyTicks.tickUSD,
            tickEUR: currencyTicks.tickEUR,
            tickKhac: currencyTicks.tickKhac,
            tickPhiNguoiChuyen: feeTicks.tickPhiNguoiChuyen,
            tickPhiNguoiHuong: feeTicks.tickPhiNguoiHuong,
            tickPhiTrong: feeTicks.tickPhiTrong,
            tickPhiNgoai: feeTicks.tickPhiNgoai
        };
    };

    const getAccountDataFromRecord = (accountId) => ({
        id_tk_nguoi_tra: accountId,
        stk_nguoi_tra: libPrintFormat.getSafeFieldValue(
            Unc.ACCOUNT_RECORD_TYPE,
            accountId,
            Unc.ACCOUNT_NATIVE_FIELD.BANK_ACCOUNT
        ),
        nh_nguoi_tra: libPrintFormat.getSafeFieldValue(
            Unc.ACCOUNT_RECORD_TYPE,
            accountId,
            Unc.ACCOUNT_NATIVE_FIELD.BANK_NAME
        ),
        ten_tk_dinh_tuyen: libPrintFormat.getSafeFieldValue(
            Unc.ACCOUNT_RECORD_TYPE,
            accountId,
            Unc.ACCOUNT_NATIVE_FIELD.ROUTING_NAME
        ),
        cn_nguoi_tra: libPrintFormat.getSafeFieldValue(
            Unc.ACCOUNT_RECORD_TYPE,
            accountId,
            Unc.ACCOUNT_NATIVE_FIELD.BRANCH
        ),
        tinh_nguoi_tra: libPrintFormat.getSafeFieldValue(
            Unc.ACCOUNT_RECORD_TYPE,
            accountId,
            Unc.ACCOUNT_NATIVE_FIELD.PROVINCE
        )
    });

    const getAccountDataFromSuiteQL = (recordId) => {
        const rows = query.runSuiteQL({
            query: Unc.ACCOUNT_QUERY,
            params: [recordId]
        }).asMappedResults();
        if (rows.length !== 1) {
            throw new Error('Bank account could not be resolved for transaction.');
        }
        return rows[0];
    };

    const getLogoUrl = (fileName) => {
        if (!fileName) {
            return Unc.EMPTY;
        }

        const filePath = Unc.LOGO_FOLDER + '/' + fileName;
        try {
            return libPrintFormat.asText(file.load({id: filePath}).url);
        } catch (error) {
            log.error({
                title: 'UNC logo lookup failed',
                details: {filePath, error}
            });
            return Unc.EMPTY;
        }
    };

    const normalizeText = (value) => libUtils.removeVietnameseTones(
        libPrintFormat.asText(value)
    ).toUpperCase().replace(/[^A-Z0-9]/g, '');

    const getCurrencyCode = (symbol) => {
        const symbolValue = libPrintFormat.asText(symbol);
        const currencyCode = consPrint.Currency.SYMBOL_TO_CODE[symbolValue];
        if (!currencyCode) {
            log.audit({
                title: 'UNC currency fallback',
                details: symbolValue
            });
            return symbolValue;
        }
        return currencyCode;
    };

    const getCurrencyTicks = (currencyCode) => ({
        tickVND: currencyCode === 'VND' ? Unc.TICK : Unc.EMPTY,
        tickUSD: currencyCode === 'USD' ? Unc.TICK : Unc.EMPTY,
        tickEUR: currencyCode === 'EUR' ? Unc.TICK : Unc.EMPTY,
        tickKhac: Unc.CURRENCY_CODES.includes(currencyCode) ? Unc.EMPTY : Unc.TICK
    });

    const getFeeTicks = (bankCode) => {
        const feeTicks = Unc.FEE_TICKS[bankCode];
        return {
            tickPhiNguoiChuyen: feeTicks.SENDER,
            tickPhiNguoiHuong: feeTicks.BENEFICIARY,
            tickPhiTrong: feeTicks.INCLUDING,
            tickPhiNgoai: feeTicks.EXCLUDING
        };
    };

    const combineBankName = (bankName, branchName, includeBranch) => {
        const bankNameText = libPrintFormat.asText(bankName);
        const branchNameText = libPrintFormat.asText(branchName);
        if (!includeBranch) {
            return bankNameText;
        }
        if (bankNameText && branchNameText) {
            return bankNameText + Unc.BANK_NAME_SEPARATOR + branchNameText;
        }
        return bankNameText || branchNameText;
    };

    return {onRequest, renderRecordToPdfWithTemplate};
});
