/**
 * Nội dung:
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  23 Sep 2026         Phu Pham                Init, create file. Chức năng phiếu lương from ms. Thuỷ (https://app.clickup.com/t/3773072/14yhnhmfqf1)
 */
define([
    'N/runtime', 'N/file', 'N/query', 
    'N/render', 'N/email',
    '../cons/scv_cons_search.js',
    '../cons/scv_cons_crypto.js',
    '../sl/scv_sl_print.js',
], (
    runtime, file, query, 
    render, email,
    constSearch,
    constCrypto,
    slPrint,
) => {

    const SECRET_ID = 'custsecret_scv_payroll_encryption';
    const EmailTemplates = {
        Payslip_Email: {
            ID: 2,
            NAME: "Payslip Email Template"
        }
    };

    const Folder = {
        UserDocuments: {
            ID: "-20",
            NAME: "User Documents",
        },
        EMP_Payroll: {
            ID: "",
            NAME: "EMP_Payroll",
            PARENT_NAME: "DataStore",
        },
    }

    const getDataResultEmpPayslip = (fileId) => {
        const objFileJson = file.load({id: fileId});
        let contents = objFileJson.getContents();
        const objRes = JSON.parse(contents);

        return decryptDataEmpPayslip(objRes.data);
    }

    const createFileEmpPayslip = (params) => {
        const data = {
            custpage_subsidiary: params.custpage_subsidiary,
            custpage_department: params.custpage_department,
            custpage_employee: params.custpage_employee,
            custpage_period: params.custpage_period,
            details: JSON.parse(params.body)
        };

        const objInput = {
            timestamp: getTimestamp(),
            userId: runtime.getCurrentUser().id,
            data: encryptDataEmpPayslip(data)
        };

        const fileObj = file.create({
            name: `${constCrypto.generateUUID()}.json`,
            fileType: file.Type.JSON,
            contents: JSON.stringify(objInput),
            folder: getFolderId()
        });

        let fileId = fileObj.save();

        return { fileId: fileId };
    }

    const sendPayslipEmailToEMP = (data) => {
        let objMergeEmail = {
            templateId: EmailTemplates.Payslip_Email.ID,
            transactionId: data.internalid * 1
        };

        let objResMergeEmail = render.mergeEmail(objMergeEmail);
        let filePDF = slPrint.printPdf({printFile: "scv_print_emp_payslip", data: data});
        filePDF.name = `Bảng lương nhân viên.pdf`;

        let objEmail = {
            author: data.payslip_sender,
            body: objResMergeEmail.body,
            subject: objResMergeEmail.subject,
            attachments: [filePDF],
            recipients: [data.email]
        };
        email.send(objEmail);
    }

    const getDataHR_PayslipSender = (_subsidiaryId) => {
        if(!_subsidiaryId) return "";

        let resultSQL = query.runSuiteQL({
            query: `SELECT id, name, fullname, legalname, custrecord_scv_hr_payslip_sender
                FROM subsidiary
                WHERE id = ?`,
            params: [_subsidiaryId]
        }).asMappedResults();

        return resultSQL[0]?.custrecord_scv_hr_payslip_sender || "";
    }

    const getFolderId = () => {
        const resultSQL = query.runSuiteQL({
            query: `SELECT parent, id, name, appfolder, level as folder_level
                FROM MediaItemFolder
                WHERE name IN ('${Folder.EMP_Payroll.NAME}')
                START WITH id = '${Folder.UserDocuments.ID}'
                CONNECT BY PRIOR ID = PARENT`
        }).asMappedResults();

        return resultSQL[0]?.id;
    }

    function getTimestamp() {
        return Math.round(Date.now() / 1000);
    }

    const encryptDataEmpPayslip = (data) => {
        const stringify = JSON.stringify(data);

        let encryptedCipher = constCrypto.cipherFinal({
            secret: SECRET_ID,
        },{
            input: stringify
        });

        return encryptedCipher;
    }

    const decryptDataEmpPayslip = ({
        iv = "",
        ciphertext = ""
    }) => {
        let decryptedCipher = constCrypto.decipherFinal({
            secret: SECRET_ID
        },{
            iv: iv,
            input: ciphertext
        });

        return JSON.parse(decryptedCipher);
    }

    const getDataColumns = () => {
        let columns = [
            {id: "select", label: "Select", type: "checkbox", displayType: "entry"},
            {id: "internalid", label: "MAX (internalid)", type: "text", displayType: "hidden"},
            {id: "employee_display", label: "Nhân viên", type: "text"},
            {id: "department_display", label: "Phòng/ Bộ phận", type: "text"},
            {id: "email", label: "Email", type: "text"},
            {id: "legalnamesub", label: "Legal Name Sub", type: "text", displayType: "hidden"},
            {id: "thangnam", label: "Tháng/Năm", type: "text", displayType: "hidden"},
            {id: "emplegalname", label: "Legal Name Emp", type: "text", displayType: "hidden"},
            {id: "jobtitle", label: "Job Title", type: "text", displayType: "hidden"},
            {id: "dataprint", label: "Data for Print", type: "textarea", displayType: "hidden"},
        ];

        return columns;
    }

    const getDataDepartmentBySub = (subsidiary) => {
        if(!subsidiary) return [];

        let resultSearch =  constSearch.createSearchWithFilter({
            type: "department",
            filters:
            [
                ["isinactive", "is", "F"],
                "AND",
                ["subsidiary", "anyof", subsidiary]
            ],
            columns:
            [
                "internalid", "name", "subsidiary"
            ]
        });
        
        let arrResult = constSearch.fetchResultSearchRunEach(resultSearch, function(_objTmpl, _column){
            let objResTmpl = constSearch.getObjResultFromSearchByKey(_objTmpl, _column, [
                "internalid", "name", "subsidiary"
            ]);

            return objResTmpl;
        });
        
        return arrResult;
    }

    return {
        sendPayslipEmailToEMP,
        getDataHR_PayslipSender,

        createFileEmpPayslip,
        getDataResultEmpPayslip,

        encryptDataEmpPayslip,
        decryptDataEmpPayslip,

        getDataColumns,
        getDataDepartmentBySub,
    };
});
