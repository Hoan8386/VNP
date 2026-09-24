/**
 * Nội dung: 
 * Key:
 * =======================================================================================
 *  Date                Author                  Description
 *  22 Sep 2026         Phu Pham                Init, create file from ms. Thuỷ (https://app.clickup.com/t/3773072/14yhnhmfqf1)
 */
define([
    '../lib/scv_lib_pdf.js',
    '../common/scv_common_ext_performent.js',
    '../cons/scv_cons_format.js',
    '../common/scv_common_employee_payslip.js',
], (
        libPdf,
        commonExtPerformance,
        constFormat,
        commonEmpPayslip,
    ) => {

        const generateFilePDF = (_params) => {
            commonExtPerformance.startTime("scv_print_emp_payslip");

            let renderer = rennderPDF(_params);
            let filePDF = renderer.renderAsPdf();

            commonExtPerformance.endTime("scv_print_emp_payslip");
            return filePDF;
        };

        const rennderPDF = (_params) =>{
            let fileId = _params.fileId;

            const renderer = libPdf.renderTemplateWithXml("scv_print_emp_payslip");
            
            let details = [];
            if(!!fileId) {
                let data = commonEmpPayslip.getDataResultEmpPayslip(fileId);
                details = data.details;
            } else if(typeof _params.data === 'object'){
                details.push(_params.data);
            }

            if(details.length === 0) {
                throw new Error('Không đủ điều kiện để in ấn!');
            }

            const arrResult = [];
            for(let objDetail of details) {
                let objRes = {
                    ...objDetail,
                    emplegalname: objDetail.emplegalname || "",
                    legalnamesub: objDetail.legalnamesub || "",
                    thangnam: objDetail.thangnam || "",
                    jobtitle: objDetail.jobtitle || "",
                };

                objRes.phucapvathunhapkhac = objRes.phucapthamnien + objRes.phucapdienthoai + objRes.phucaplaixe + objRes.thunhapkhac;
                objRes.tongthunhap = objRes.luongngaycong + objRes.phucapvathunhapkhac + objRes.tienantrua;
                objRes.luongthuclinh = objRes.tongthunhap - objRes.bhxh - objRes.thuetncn;

                addFormatObjNumberByKeys(objRes, [
                    'ngaycong',
                    'luongngaycong',
                    'phucapthamnien',
                    'phucapdienthoai',
                    'phucaplaixe',
                    'thunhapkhac',
                    'tienantrua',
                    'bhxh',
                    'thuetncn',
                    'phucapvathunhapkhac',
                    'tongthunhap',
                    'luongthuclinh'
                ]);

                arrResult.push(objRes);
            }

            renderer.addCustomDataSource({
                format: "OBJECT",
                alias: 'results',
                data: {
                    details: arrResult
                }
            });

            return renderer;
        }

        const addFormatObjNumberByKeys = (obj, keys) => {
            keys.forEach(key => {
                if(obj[key] !== undefined && obj[key] !== null) {
                    obj[key + "_fmt"] = formatNumberByKey(obj[key]);
                }
            });
        }

        const formatNumberByKey = (_number) =>{
            return constFormat.formatNumber(_number, 2, {
                groupSeparator: ',',
                decimalSeparator: '.',
            });
        }

        return { generateFilePDF };
    });
