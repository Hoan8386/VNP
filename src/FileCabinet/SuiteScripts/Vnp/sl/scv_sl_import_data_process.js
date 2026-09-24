/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/format', 'N/record', 'N/task', '../common/scv_common_import_data.js', '../lib/scv_lib_function.js', '../lib/scv_lib_report.js'],

    (format, record, task, commonData, libFunc, libRep) => {

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            let body = JSON.parse(scriptContext.request.body);
            let subsidiary = body.subsidiary;
            let data = body.data;
            let sjId = '';
            let taskId = '';
            let dataProcessId = '';
            let queued = 0;
            if (data.kind === commonData.FileKind.XLSX && data.sheets) {
                let keys = Object.keys(data.sheets);
                let key = keys[0];
                let listData = data.sheets[key];
                if (listData && util.isArray(listData)) {
                    let listItem = getListItem(subsidiary, listData);
                    let listDepartment = getListDepartment();
                    let listClass = getListClass();
                    let listObject = parsePayroll(subsidiary, listData, listItem, listDepartment, listClass)
                        .filter(o => o.lines.length);

                    // Record đầu tiên tạo ngay tại Suitelet để trả kết quả về màn hình
                    if (listObject.length) {
                        let firstObject = listObject[0];
                        sjId = libFunc.createRecord(commonData.RecordType.PAYROLL, commonData.Sublist.ITEM, firstObject.fields, firstObject.lines);
                    }

                    // Phần còn lại đẩy vào hàng đợi rồi giao cho Map/Reduce chạy tiếp
                    let listRemain = listObject.slice(1);
                    dataProcessId = createDataProcess(commonData.RecordType.PAYROLL, commonData.Sublist.ITEM, listRemain);
                    if (dataProcessId) {
                        queued = listRemain.length;
                        taskId = submitImportDataTask(dataProcessId);
                    }
                }
            } else if (data.kind === commonData.FileKind.WORD && data.paragraphs) {

            }

            log.error('sjId', sjId);
            scriptContext.response.write({
                output: JSON.stringify({sjId: sjId, taskId: taskId, dataProcessId: dataProcessId, queued: queued})
            });
        }

        /**
         * Lưu toàn bộ object chưa xử lý vào 1 record hàng đợi customrecord_scv_import_data_process
         * (cả list JSON để ở field long text), Map/Reduce sẽ đọc theo id record này.
         * @param {string} recordType - record type Map/Reduce sẽ tạo ra
         * @param {string} sublist - sublist set line khi tạo record
         * @param {Array<{fields: Object, lines: Array<Object>}>} listObject
         * @returns {string} internal id của record hàng đợi, '' nếu không có gì để đưa vào hàng đợi
         */
        const createDataProcess = (recordType, sublist, listObject) => {
            if (!listObject || !listObject.length) return '';

            try {
                const recImpDataProcess = record.create({type: commonData.RecordType.IMPORT_DATA_PROCESS});
                recImpDataProcess.setValue({
                    fieldId: commonData.ImportDataProcessField.NAME,
                    value: `${recordType} - ${listObject.length} record`
                });
                recImpDataProcess.setValue({fieldId: commonData.ImportDataProcessField.DATA, value: JSON.stringify(listObject)});
                recImpDataProcess.setValue({fieldId: commonData.ImportDataProcessField.RECORD_TYPE, value: recordType});
                recImpDataProcess.setValue({fieldId: commonData.ImportDataProcessField.SUBLIST, value: sublist});
                return recImpDataProcess.save({enableSourcing: false, ignoreMandatoryFields: true});
            } catch (e) {
                log.error('createDataProcess', e);
                return '';
            }
        };

        /**
         * Gọi Map/Reduce xử lý nốt hàng đợi, truyền id record hàng đợi vừa tạo qua param.
         * @returns {string} task id, '' nếu submit không thành công (MR đang chạy...)
         */
        const submitImportDataTask = (dataProcessId) => {
            try {
                const params = {};
                params[commonData.MapReduce.ImportDataProcess.PARAM] = JSON.stringify({dataProcessId: dataProcessId});
                const mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: commonData.MapReduce.ImportDataProcess.SCRIPT_ID,
                    deploymentId: commonData.MapReduce.ImportDataProcess.DEPLOY_ID,
                    params: params
                });
                return mrTask.submit();
            } catch (e) {
                // MR đang chạy dở thì lần chạy sau sẽ tự quét nốt hàng đợi còn active
                log.error('submitImportDataTask', e);
                return '';
            }
        };

        // Bỏ dấu tiếng Việt + viết thường + gộp khoảng trắng, để dò cột/tiêu đề không phụ thuộc dấu
        const stripAccent = (s) => String(s == null ? '' : s)
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .toLowerCase().replace(/\s+/g, ' ').trim();

        // Chuyển giá trị ô về số (bỏ dấu phân cách ngăn cách hàng nghìn). Trả null nếu không phải số
        const toNumber = (v) => {
            if (typeof v === 'number') return v;
            if (v == null || String(v).trim() === '') return null;

            let s = String(v).trim().replace(/[^0-9.,\-]/g, '');
            if (!s) return null;
            // Dấu . hoặc , cuối cùng: nếu sau nó không phải nhóm 3 chữ số thì là dấu thập phân
            const lastSep = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
            if (lastSep !== -1 && s.length - lastSep - 1 !== 3) {
                s = s.slice(0, lastSep).replace(/[.,]/g, '') + '.' + s.slice(lastSep + 1);
            } else {
                s = s.replace(/[.,]/g, '');
            }

            const n = Number(s);
            return isNaN(n) ? null : n;
        };

        // Đưa giá trị ô về chuỗi đã trim
        const toText = (v) => String(v == null ? '' : v).trim();

        /**
         * Dò các cột động của sheet bảng lương (key do SheetJS tự sinh).
         * - headerIdx: dòng tiêu đề chứa "Họ và tên" / "Bộ phận" / "Chức danh" ...
         * - itemIdx  : dòng ngay dưới dòng tiêu đề, chứa mã item (1P00001, 1P00005, ...)
         * - itemCols : các cột có mã item, kèm label lấy ở dòng tiêu đề (dùng làm class)
         * Các cột sau "Số giờ làm thêm" có thể phát sinh thêm nên quét động toàn bộ key của dòng mã item.
         * @returns {{headerIdx, itemIdx, hoTen, boPhan, chucDanh, itemCols: Array<{key, code, label}>}}
         */
        const detectPayrollColumns = (listData) => {
            const cols = {headerIdx: -1, itemIdx: -1, itemCols: []};

            for (let i = 0; i < listData.length; i++) {
                const row = listData[i];
                for (const k in row) {
                    const v = stripAccent(row[k]);
                    if (v === 'ho va ten') cols.hoTen = k;
                    else if (v === 'bo phan') cols.boPhan = k;
                    else if (v === 'chuc danh') cols.chucDanh = k;
                }
                if (cols.hoTen) {
                    cols.headerIdx = i;
                    break;
                }
            }

            if (cols.headerIdx === -1) return cols;

            // Dòng mã item: nằm dưới dòng tiêu đề, bỏ trống cột Họ và tên / Bộ phận và có ít nhất
            // 1 ô là mã item (chuỗi có chữ cái, vd 1P00001) -> loại trừ dòng đánh số thứ tự cột
            const header = listData[cols.headerIdx];
            for (let i = cols.headerIdx + 1; i < listData.length; i++) {
                const row = listData[i];
                if (toText(row[cols.hoTen]) || (cols.boPhan && toText(row[cols.boPhan]))) break;

                const itemCols = [];
                for (const k in row) {
                    const code = toText(row[k]);
                    if (!code || !/[a-z]/i.test(code)) continue;
                    itemCols.push({key: k, code: code, label: toText(header[k])});
                }
                if (itemCols.length) {
                    cols.itemIdx = i;
                    cols.itemCols = itemCols;
                    break;
                }
            }

            return cols;
        };

        /**
         * Lấy Tháng/Năm ở tiêu đề "BẢNG LƯƠNG VÀ THU NHẬP THÁNG mm NĂM yyyy"
         * -> ngày cuối tháng, format theo date format của user. Không đọc được thì trả ''.
         */
        const extractTranDate = (listData) => {
            for (const row of listData) {
                for (const k in row) {
                    const m = stripAccent(row[k]).match(/thang (\d{1,2}) nam (\d{4})/);
                    if (!m) continue;
                    const month = Number(m[1]);
                    const year = Number(m[2]);
                    if (month < 1 || month > 12) continue;
                    // new Date(year, month, 0) -> ngày cuối của tháng month
                    return format.format({value: new Date(year, month, 0), type: format.Type.DATE});
                }
            }
            return '';
        };

        /**
         * Lấy danh sách item theo các mã đọc được ở dòng mã item của sheet.
         * @returns {Array<{id: string, upccode: string}>}
         */
        const getListItem = (subsidiary, listData) => {
            const records = [];
            const cols = detectPayrollColumns(listData);
            if (!cols.itemCols.length) return records;

            const listCode = [];
            util.each(cols.itemCols, function (o) {
                const code = o.code.toUpperCase();
                if (listCode.indexOf(code) === -1) listCode.push(code);
            });

            const questionMark = listCode.map(() => '?');
            let sql = `select it.id, it.upccode from item it where it.isinactive = 'F' and UPPER(it.upccode) in (${questionMark.join(',')})`;
            const params = listCode.slice();
            if (subsidiary) {
                sql += ' and exists (select 1 from itemsubsidiarymap ism where ism.item = it.id and ism.subsidiary = ?)';
                params.push(subsidiary);
            }
            libRep.doSearchSqlAll(records, sql, params);
            return records;
        };

        /**
         * Lấy toàn bộ department (không lọc), map theo tên ở cột "Bộ phận" của sheet.
         * @returns {Array<{id: string, name: string, fullname: string}>}
         */
        const getListDepartment = () => {
            const sql = `select dp.id, dp.name, dp.fullname from department dp where dp.isinactive = 'F'`;
            const records = [];
            libRep.doSearchSqlAll(records, sql, []);
            return records;
        };

        /**
         * Lấy toàn bộ classification (không lọc), map theo label cột item của sheet.
         * @returns {Array<{id: string, name: string, fullname: string}>}
         */
        const getListClass = () => {
            const sql = `select cl.id, cl.custrecord_scv_cl_desc name, cl.fullname from classification cl where cl.isinactive = 'F'`;
            const records = [];
            libRep.doSearchSqlAll(records, sql, []);
            return records;
        };

        /**
         * Tìm internal id theo tên (bỏ dấu, không phân biệt hoa thường).
         * Khớp cả name, fullname ("Cha : Con") và phần tên con cuối cùng của fullname.
         */
        const findIdByName = (list, name) => {
            if (!name || !list || !list.length) return '';
            const key = stripAccent(name);
            const record = list.find(o => stripAccent(o.name) === key
                || stripAccent(o.fullname) === key
                || stripAccent(toText(o.fullname).split(':').pop()) === key);
            return record ? record.id : '';
        };

        /**
         * Parse dữ liệu bảng lương từ sheet -> build listObject theo mẫu { fields, lines },
         * group theo Họ và tên (mỗi nhân viên 1 object).
         * Mỗi cột có mã item sinh 1 line: item = mã item, rate = amount = giá trị ô,
         * department = Bộ phận, class = label của cột (Lương tháng, Phụ cấp và thu nhập khác, ...).
         * @returns {Array<{fields: Object, lines: Array<Object>}>}
         */
        const parsePayroll = (subsidiary, listData, listItem, listDepartment, listClass) => {
            const cols = detectPayrollColumns(listData);
            const tranDate = extractTranDate(listData);
            const listObject = [];

            if (cols.headerIdx === -1 || !cols.hoTen || !cols.itemCols.length) return listObject;

            const listNotFound = [];
            const pushNotFound = (type, value) => {
                const text = `${type}: ${value}`;
                if (listNotFound.indexOf(text) === -1) listNotFound.push(text);
            };

            const mapObject = {};
            for (let i = cols.itemIdx + 1; i < listData.length; i++) {
                const row = listData[i];
                const hoTen = toText(row[cols.hoTen]);

                // Chỉ nhận dòng có Họ và tên, bỏ dòng trống / dòng Tổng cộng / dòng ký tên
                if (!hoTen || stripAccent(hoTen) === 'tong cong') continue;

                const boPhan = cols.boPhan ? toText(row[cols.boPhan]) : '';
                const departmentId = findIdByName(listDepartment, boPhan);
                if (boPhan && !departmentId) pushNotFound('Bộ phận', boPhan);

                let object = mapObject[hoTen];
                if (!object) {
                    object = {fields: buildFields(subsidiary, hoTen, departmentId, tranDate), lines: []};
                    mapObject[hoTen] = object;
                    listObject.push(object);
                }

                util.each(cols.itemCols, function (col) {
                    const value = toNumber(row[col.key]);
                    if (value === null) return;

                    // Không tìm được item thì bỏ line (set item rỗng sẽ lỗi cả record)
                    const itemId = listItem.find(o => toText(o.upccode).toUpperCase() === col.code.toUpperCase())?.id;
                    if (!itemId) {
                        pushNotFound('Item', col.code);
                        return;
                    }

                    const classId = findIdByName(listClass, col.label);
                    if (col.label && !classId) pushNotFound('Class', col.label);

                    object.lines.push(makeLine(itemId, value, departmentId, classId));
                });
            }

            if (listNotFound.length) log.error('Không map được dữ liệu', listNotFound.join(' | '));

            return listObject;
        };

        // Tạo 1 dòng line theo mẫu (file mau)
        const makeLine = (itemId, value, departmentId, classId) => {
            const line = {
                item: itemId,
                //units: 1,
                quantity: 1,
                rate: value,
                amount: value
            };
            if (departmentId) line.department = departmentId;
            if (classId) line.class = classId;
            return line;
        };

        const buildFields = (subsidiary, hoTen, departmentId, tranDate) => {
            const fields = {
                subsidiary: subsidiary || commonData.Subsidiary.VINAPHARM,
                custbody_scv_employee: {text: hoTen}
            };
            if (departmentId) fields.department = departmentId;
            if (tranDate) fields.trandate = {text: tranDate};
            return fields;
        };

        return {onRequest}

    });
