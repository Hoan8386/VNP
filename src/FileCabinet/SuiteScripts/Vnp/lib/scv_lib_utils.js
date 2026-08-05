define([],
    
    () => {
        
        const isContainValue = (value) => {
            let isContain = false;
            if (value !== undefined && value !== null && value !== '') {
                if (util.isArray(value)) {
                    if (value.length > 0) {
                        isContain = true;
                    }
                } else {
                    isContain = true;
                }
            }
            return isContain;
        }
        
        /**
         * Example
         * let lOne = [{a: 1, b: 2, c: 3}, {a: 2, b: 2, c: 3}, {a: 3, b: 1, c: 3}, {a: 4, b: 2, c: 5}];
         * let lTwo = [{a: 1, d: 2, e: 3}, {a: 2, d: 2, e: 3}, {a: 3, d: 2, e: 3}, {a: 4, d: 1, e: 3}];
         * let key1 = ['a', 'b', 'c'];
         * let key2 = ['a', 'd', 'e'];
         * let keyCopare = [{key1: 'a', key2: 'a'}, {key1: 'b', key2: 'd'}];
         * let operator = 'left'; on, right, full
         */
        const joinTwoArrayObject = (lOne, lTwo, key1, key2, keyCopare, operator) => {
            let lg1 = lOne.length;
            let lg2 = lTwo.length;
            let lk1 = key1.length;
            let lk2 = key2.length;
            let lgKey = keyCopare.length;
            let arrRes = [], objT, isEqual, n2Temp = 0, tempValue;
            for (let i = 0; i < lg1; i++) {
                isEqual = false;
                for (let j = 0; j < lg2; j++) {
                    isEqual = true;
                    if (lTwo[j].flagcomparek2 === true && (operator === 'on' || operator === 'left')) {
                        isEqual = false;
                    } else {
                        for (let n = 0; n < lgKey; n++) {
                            if (lOne[i][keyCopare[n].key1] === lTwo[j][keyCopare[n].key2]) {
                                if (isEqual) {
                                    n2Temp = j;
                                }
                            } else {
                                isEqual = false;
                                break;
                            }
                        }
                    }
                    if (isEqual) {
                        lOne[i].flagcomparek1 = true;
                        lTwo[n2Temp].flagcomparek2 = true;
                        objT = {};
                        for (let k1 = 0; k1 < lk1; k1++) {
                            objT[key1[k1]] = lOne[i][key1[k1]];
                        }
                        for (let k2 = 0; k2 < lk2; k2++) {
                            tempValue = lTwo[n2Temp][key2[k2]];
                            if (isContainValue(tempValue)) {
                                objT[key2[k2]] = tempValue;
                            }
                        }
                        arrRes.push(objT);
                    }
                }
                
                if ((operator === 'left' || operator === 'full') && !(lOne[i].flagcomparek1 === true)) {
                    objT = {};
                    for (let k1 = 0; k1 < lk1; k1++) {
                        objT[key1[k1]] = lOne[i][key1[k1]];
                    }
                    arrRes.push(objT);
                }
            }
            //let lar = arrRes.length, isEqual;
            if (operator === 'right' || operator === 'full') {
                for (let i = 0; i < lg2; i++) {
                    if (!(lTwo[i].flagcomparek2 === true)) {
                        objT = {};
                        for (let k2 = 0; k2 < lk2; k2++) {
                            objT[key2[k2]] = lTwo[i][key2[k2]];
                        }
                        arrRes.push(objT);
                    }
                }
            }
            return arrRes;
        }
        
        const newTime = (tempdate) => {
            let hm = tempdate.split(':');
            if (hm.length === 2) {
                tempdate = new Date();
                tempdate.setHours(hm[0]);
                tempdate.setMinutes(hm[1]);
            } else {
                tempdate = '';
            }
            return tempdate;
        }
        
        const newDate = (tempdate) => {
            tempdate = tempdate.split('-');
            if (tempdate.length === 3) {
                tempdate = new Date(tempdate[0], (tempdate[1] * 1 - 1), tempdate[2]);
            } else {
                tempdate = '';
            }
            return tempdate;
        }
        
        const iterationCopy = (src) => {
            let target = {};
            for (let prop in src) {
                if (src.hasOwnProperty(prop)) {
                    if (isObject(src[prop])) {
                        target[prop] = iterationCopy(src[prop]);
                    } else {
                        target[prop] = src[prop];
                    }
                }
            }
            return target;
        }
        
        const getDateGMT = (time, gmt) => {
            let now = new Date(time);
            let sdate = now.toString();
            let p1 = sdate.substring(28, 29);
            let p2 = sdate.substring(29, 31);
            let tcurr = gmt;
            if (p1 === '-') {
                tcurr = tcurr + 1 * p2;
            } else {
                tcurr = tcurr - 1 * p2;
            }
            return new Date(now.getTime() + (tcurr * 3600000));
        }
        
        const getDateGMTWithDate = (date, gmt) => {
            let sdate = date.toString();
            let p1 = sdate.substring(28, 29);
            let p2 = sdate.substring(29, 31);
            let tcurr = gmt;
            if (p1 === '-') {
                tcurr = tcurr + 1 * p2;
            } else {
                tcurr = tcurr - 1 * p2;
            }
            return new Date(date.getTime() + (tcurr * 3600000));
        }
        
        const getTimeFromDate = (date, gmt) => {
            let sdate = date.toString();
            let p1 = sdate.substring(28, 29);
            let p2 = sdate.substring(29, 31);
            let tcurr = gmt;
            if (p1 === '-') {
                tcurr = tcurr + 1 * p2;
            } else {
                tcurr = tcurr - 1 * p2;
            }
            return date.getTime() - tcurr * 3600000;
        }
        
        const sortArayOfObject = (arrayOfObjects, field) => {
            arrayOfObjects.sort(function (a, b) {
                let x = a[field].toLowerCase();
                let y = b[field].toLowerCase();
                return x < y ? -1 : x > y ? 1 : 0;
            });
        }
        
        const sortArayOfObjectFlowFields = (arrayOfObjects, fields) => {
            arrayOfObjects.sort(function (a, b) {
                let x;
                let y;
                let lF = fields.length;
                let vl = 0;
                for (let i = 0; i < lF; i++) {
                    if (vl === 0) {
                        x = a[field[i]].toLowerCase();
                        y = b[field[i]].toLowerCase();
                        if (x < y) {
                            vl = -1;
                        } else if (x > y) {
                            vl = 1;
                        }
                    }
                }
                return vl;
            });
        }
        
        const toFixed = (value, fix) => {
            let vfix = value;
            if (!!value) {
                vfix = value.toFixed(fix);
                if (vfix.indexOf('\.') !== -1) {
                    let lVf = vfix.length - 1;
                    let count = 0;
                    for (let i = lVf; i >= 0; i--) {
                        if (vfix[i] === '0') {
                            count++;
                        } else {
                            break;
                        }
                    }
                    if (count !== 0) {
                        vfix = vfix.substring(0, lVf - count + 1);
                    }
                } else {
                    vfix = value;
                }
            }
            return vfix;
        }
        
        const findListObject = (listValue, objCon) => {
            let listObj = [], isGet;
            for (let i in listValue) {
                isGet = true;
                for (let key in objCon) {
                    if (listValue[i][key] !== objCon[key]) {
                        isGet = false;
                        break;
                    }
                }
                if (isGet) {
                    listObj.push(listValue[i]);
                }
            }
            return listObj;
        }
        
        const getFirstObject = (listValue, objCon) => {
            let obj = null, isGet;
            for (let i in listValue) {
                isGet = true;
                for (let key in objCon) {
                    if (listValue[i][key] !== objCon[key]) {
                        isGet = false;
                        break;
                    }
                }
                if (isGet) {
                    obj = listValue[i];
                    break;
                }
            }
            return obj;
        }
        
        const getLastObject = (listValue, objCon) => {
            let obj = null, isGet;
            for (let i in listValue) {
                isGet = true;
                for (let key in objCon) {
                    if (listValue[i][key] !== objCon[key]) {
                        isGet = false;
                        break;
                    }
                }
                if (isGet) {
                    obj = listValue[i];
                }
            }
            return obj;
        }
        
        //start = 0 fieldCompare (field to group), fieldSum field number to sum
        const compositeListObject = (arrObj, fieldCompare, fieldSum, start) => {
            let lAOR = arrObj.length;
            let lAO = lAOR - 1;
            let lFC = fieldCompare.length;
            let lFS = fieldSum.length;
            let isFlag = false, count;
            let istart = start || 0, temp1, temp2;
            for (let i = start; i < lAO; i++) {
                count = 0;
                for (let n = i + 1; n < lAOR; n++) {
                    isFlag = true;
                    for (let j = 0; j < lFC; j++) {
                        isFlag = true;
                        temp1 = arrObj[i][fieldCompare[j]];
                        temp2 = arrObj[n][fieldCompare[j]];
                        if (temp1 !== temp2) {
                            isFlag = false;
                            break;
                        }
                    }
                    if (isFlag) {
                        for (let j = 0; j < lFS; j++) {
                            arrObj[i][fieldSum[j]] = convertToFloat(arrObj[i][fieldSum[j]]) + convertToFloat(arrObj[n][fieldSum[j]]);
                        }
                        arrObj.splice(n, 1);
                        count++;
                        lAOR = lAOR - 1;
                        lAO = lAO - 1;
                        n--;
                        //break;
                    }
                }
                istart = i;
                /*if(count > 0) {
                    isSplice = true;
                    break;
                }*/
            }
            /*if(isSplice) {
                compositeListObject(arrObj, fieldCompare, fieldSum, istart);
            }*/
        }
        
        const convertToFloat = (input) => {
            let value = null;
            if (!!input && !isNaN(input)) {
                value = parseFloat(input);
            }
            return value;
        }
        
        const removeVietnameseTones = (str) => {
            str = str.toString();
            if (!!str) {
                str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
                str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
                str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
                str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
                str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
                str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
                str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
                str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
                str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
                str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
                str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
                str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
                str = str.replace(/đ/g, "d");
                str = str.replace(/Đ/g, "D");
                
                str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); // ̀ ́ ̃ ̉ ̣  huyền, sắc, ngã, hỏi, nặng
                str = str.replace(/\u02C6|\u0306|\u031B/g, ""); // ˆ ̆ ̛  Â, Ê, Ă, Ơ, Ư
                str = str.replace(/ + /g, " ");
                str = str.trim();
                str = str.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'|\"|\&|\#|\[|\]|~|\$|_|`|-|{|}|\||\\/g, " ");
                return str;
            } else {
                return "";
            }
        }
        
        const removeAccents = (str) => {
            let AccentsMap = [
                "aàảãáạăằẳẵắặâầẩẫấậ",
                "AÀẢÃÁẠĂẰẲẴẮẶÂẦẨẪẤẬ",
                "dđ", "DĐ",
                "eèẻẽéẹêềểễếệ",
                "EÈẺẼÉẸÊỀỂỄẾỆ",
                "iìỉĩíị",
                "IÌỈĨÍỊ",
                "oòỏõóọôồổỗốộơờởỡớợ",
                "OÒỎÕÓỌÔỒỔỖỐỘƠỜỞỠỚỢ",
                "uùủũúụưừửữứự",
                "UÙỦŨÚỤƯỪỬỮỨỰ",
                "yỳỷỹýỵ",
                "YỲỶỸÝỴ"
            ];
            for (let i = 0; i < AccentsMap.length; i++) {
                let re = new RegExp('[' + AccentsMap[i].substr(1) + ']', 'g');
                let char = AccentsMap[i][0];
                str = str.replace(re, char);
            }
            return str;
        }
        
        const getObjGmtWithTz = () => {
            return {
                "Africa/Abidjan": 0,
                "Africa/Accra": 0,
                "Africa/Addis_Ababa": 3,
                "Africa/Algiers": 1,
                "Africa/Asmara": 3,
                "Africa/Asmera": 3,
                "Africa/Bamako": 0,
                "Africa/Bangui": 1,
                "Africa/Banjul": 0,
                "Africa/Bissau": 0,
                "Africa/Blantyre": 2,
                "Africa/Brazzaville": 1,
                "Africa/Bujumbura": 2,
                "Africa/Cairo": 2,
                "Africa/Casablanca": 0,
                "Africa/Ceuta": 1,
                "Africa/Conakry": 0,
                "Africa/Dakar": 0,
                "Africa/Dar_es_Salaam": 3,
                "Africa/Djibouti": 3,
                "Africa/Douala": 1,
                "Africa/El_Aaiun": 0,
                "Africa/Freetown": 0,
                "Africa/Gaborone": 2,
                "Africa/Harare": 2,
                "Africa/Johannesburg": 2,
                "Africa/Juba": 3,
                "Africa/Kampala": 3,
                "Africa/Khartoum": 2,
                "Africa/Kigali": 2,
                "Africa/Kinshasa": 1,
                "Africa/Lagos": 1,
                "Africa/Libreville": 1,
                "Africa/Lome": 0,
                "Africa/Luanda": 1,
                "Africa/Lubumbashi": 2,
                "Africa/Lusaka": 2,
                "Africa/Malabo": 1,
                "Africa/Maputo": 2,
                "Africa/Maseru": 2,
                "Africa/Mbabane": 2,
                "Africa/Mogadishu": 3,
                "Africa/Monrovia": 0,
                "Africa/Nairobi": 3,
                "Africa/Ndjamena": 1,
                "Africa/Niamey": 1,
                "Africa/Nouakchott": 0,
                "Africa/Ouagadougou": 0,
                "Africa/Porto-Novo": 1,
                "Africa/Sao_Tome": 0,
                "Africa/Timbuktu": 0,
                "Africa/Tripoli": 2,
                "Africa/Tunis": 1,
                "Africa/Windhoek": 2,
                "America/Adak": -10,
                "America/Anchorage": -9,
                "America/Anguilla": -4,
                "America/Antigua": -4,
                "America/Araguaina": -3,
                "America/Argentina/Buenos_Aires": -3,
                "America/Argentina/Catamarca": -3,
                "America/Argentina/ComodRivadavia": -3,
                "America/Argentina/Cordoba": -3,
                "America/Argentina/Jujuy": -3,
                "America/Argentina/La_Rioja": -3,
                "America/Argentina/Mendoza": -3,
                "America/Argentina/Rio_Gallegos": -3,
                "America/Argentina/Salta": -3,
                "America/Argentina/San_Juan": -3,
                "America/Argentina/San_Luis": -3,
                "America/Argentina/Tucuman": -3,
                "America/Argentina/Ushuaia": -3,
                "America/Aruba": -4,
                "America/Asuncion": -4,
                "America/Atikokan": -5,
                "America/Atka": -10,
                "America/Bahia": -3,
                "America/Bahia_Banderas": -6,
                "America/Barbados": -4,
                "America/Belem": -3,
                "America/Belize": -6,
                "America/Blanc-Sablon": -4,
                "America/Boa_Vista": -4,
                "America/Bogota": -5,
                "America/Boise": -7,
                "America/Buenos_Aires": -3,
                "America/Cambridge_Bay": -7,
                "America/Campo_Grande": -4,
                "America/Cancun": -5,
                "America/Caracas": -4,
                "America/Catamarca": -3,
                "America/Cayenne": -3,
                "America/Cayman": -5,
                "America/Chicago": -6,
                "America/Chihuahua": -7,
                "America/Coral_Harbour": -5,
                "America/Cordoba": -3,
                "America/Costa_Rica": -6,
                "America/Creston": -7,
                "America/Cuiaba": -4,
                "America/Curacao": -4,
                "America/Danmarkshavn": 0,
                "America/Dawson": -8,
                "America/Dawson_Creek": -7,
                "America/Denver": -7,
                "America/Detroit": -5,
                "America/Dominica": -4,
                "America/Edmonton": -7,
                "America/Eirunepe": -5,
                "America/El_Salvador": -6,
                "America/Ensenada": -8,
                "America/Fort_Nelson": -7,
                "America/Fort_Wayne": -5,
                "America/Fortaleza": -3,
                "America/Glace_Bay": -4,
                "America/Godthab": -3,
                "America/Goose_Bay": -4,
                "America/Grand_Turk": -5,
                "America/Grenada": -4,
                "America/Guadeloupe": -4,
                "America/Guatemala": -6,
                "America/Guayaquil": -5,
                "America/Guyana": -4,
                "America/Halifax": -4,
                "America/Havana": -5,
                "America/Hermosillo": -7,
                "America/Indiana/Indianapolis": -5,
                "America/Indiana/Knox": -6,
                "America/Indiana/Marengo": -5,
                "America/Indiana/Petersburg": -5,
                "America/Indiana/Tell_City": -6,
                "America/Indiana/Vevay": -5,
                "America/Indiana/Vincennes": -5,
                "America/Indiana/Winamac": -5,
                "America/Indianapolis": -5,
                "America/Inuvik": -7,
                "America/Iqaluit": -5,
                "America/Jamaica": -5,
                "America/Jujuy": -3,
                "America/Juneau": -9,
                "America/Kentucky/Louisville": -5,
                "America/Kentucky/Monticello": -5,
                "America/Knox_IN": -6,
                "America/Kralendijk": -4,
                "America/La_Paz": -4,
                "America/Lima": -5,
                "America/Los_Angeles": -8,
                "America/Louisville": -5,
                "America/Lower_Princes": -4,
                "America/Maceio": -3,
                "America/Managua": -6,
                "America/Manaus": -4,
                "America/Marigot": -4,
                "America/Martinique": -4,
                "America/Matamoros": -6,
                "America/Mazatlan": -7,
                "America/Mendoza": -3,
                "America/Menominee": -6,
                "America/Merida": -6,
                "America/Metlakatla": -9,
                "America/Mexico_City": -6,
                "America/Miquelon": -3,
                "America/Moncton": -4,
                "America/Monterrey": -6,
                "America/Montevideo": -3,
                "America/Montreal": -5,
                "America/Montserrat": -4,
                "America/Nassau": -5,
                "America/New_York": -5,
                "America/Nipigon": -5,
                "America/Nome": -9,
                "America/Noronha": -2,
                "America/North_Dakota/Beulah": -6,
                "America/North_Dakota/Center": -6,
                "America/North_Dakota/New_Salem": -6,
                "America/Ojinaga": -7,
                "America/Panama": -5,
                "America/Pangnirtung": -5,
                "America/Paramaribo": -3,
                "America/Phoenix": -7,
                "America/Port-au-Prince": -5,
                "America/Port_of_Spain": -4,
                "America/Porto_Acre": -5,
                "America/Porto_Velho": -4,
                "America/Puerto_Rico": -4,
                "America/Punta_Arenas": -3,
                "America/Rainy_River": -6,
                "America/Rankin_Inlet": -6,
                "America/Recife": -3,
                "America/Regina": -6,
                "America/Resolute": -6,
                "America/Rio_Branco": -5,
                "America/Rosario": -3,
                "America/Santa_Isabel": -8,
                "America/Santarem": -3,
                "America/Santiago": -4,
                "America/Santo_Domingo": -4,
                "America/Sao_Paulo": -3,
                "America/Scoresbysund": -1,
                "America/Shiprock": -7,
                "America/Sitka": -9,
                "America/St_Barthelemy": -4,
                "America/St_Johns": -3,
                "America/St_Kitts": -4,
                "America/St_Lucia": -4,
                "America/St_Thomas": -4,
                "America/St_Vincent": -4,
                "America/Swift_Current": -6,
                "America/Tegucigalpa": -6,
                "America/Thule": -4,
                "America/Thunder_Bay": -5,
                "America/Tijuana": -8,
                "America/Toronto": -5,
                "America/Tortola": -4,
                "America/Vancouver": -8,
                "America/Virgin": -4,
                "America/Whitehorse": -8,
                "America/Winnipeg": -6,
                "America/Yakutat": -9,
                "America/Yellowknife": -7,
                "Antarctica/Casey": 8,
                "Antarctica/Davis": 7,
                "Antarctica/DumontDUrville": 10,
                "Antarctica/Macquarie": 11,
                "Antarctica/Mawson": 5,
                "Antarctica/McMurdo": 12,
                "Antarctica/Palmer": -3,
                "Antarctica/Rothera": -3,
                "Antarctica/South_Pole": 12,
                "Antarctica/Syowa": 3,
                "Antarctica/Troll": 0,
                "Antarctica/Vostok": 6,
                "Arctic/Longyearbyen": 1,
                "Asia/Aden": 3,
                "Asia/Almaty": 6,
                "Asia/Amman": 2,
                "Asia/Anadyr": 12,
                "Asia/Aqtau": 5,
                "Asia/Aqtobe": 5,
                "Asia/Ashgabat": 5,
                "Asia/Ashkhabad": 5,
                "Asia/Atyrau": 5,
                "Asia/Baghdad": 3,
                "Asia/Bahrain": 3,
                "Asia/Baku": 4,
                "Asia/Bangkok": 7,
                "Asia/Barnaul": 7,
                "Asia/Beirut": 2,
                "Asia/Bishkek": 6,
                "Asia/Brunei": 8,
                "Asia/Calcutta": 5,
                "Asia/Chita": 9,
                "Asia/Choibalsan": 8,
                "Asia/Chongqing": 8,
                "Asia/Chungking": 8,
                "Asia/Colombo": 5,
                "Asia/Dacca": 6,
                "Asia/Damascus": 2,
                "Asia/Dhaka": 6,
                "Asia/Dili": 9,
                "Asia/Dubai": 4,
                "Asia/Dushanbe": 5,
                "Asia/Famagusta": 2,
                "Asia/Gaza": 2,
                "Asia/Harbin": 8,
                "Asia/Hebron": 2,
                "Asia/Ho_Chi_Minh": 7,
                "Asia/Hong_Kong": 8,
                "Asia/Hovd": 7,
                "Asia/Irkutsk": 8,
                "Asia/Istanbul": 3,
                "Asia/Jakarta": 7,
                "Asia/Jayapura": 9,
                "Asia/Jerusalem": 2,
                "Asia/Kabul": 4,
                "Asia/Kamchatka": 12,
                "Asia/Karachi": 5,
                "Asia/Kashgar": 6,
                "Asia/Kathmandu": 5,
                "Asia/Katmandu": 5,
                "Asia/Khandyga": 9,
                "Asia/Kolkata": 5,
                "Asia/Krasnoyarsk": 7,
                "Asia/Kuala_Lumpur": 8,
                "Asia/Kuching": 8,
                "Asia/Kuwait": 3,
                "Asia/Macao": 8,
                "Asia/Macau": 8,
                "Asia/Magadan": 11,
                "Asia/Makassar": 8,
                "Asia/Manila": 8,
                "Asia/Muscat": 4,
                "Asia/Nicosia": 2,
                "Asia/Novokuznetsk": 7,
                "Asia/Novosibirsk": 7,
                "Asia/Omsk": 6,
                "Asia/Oral": 5,
                "Asia/Phnom_Penh": 7,
                "Asia/Pontianak": 7,
                "Asia/Pyongyang": 9,
                "Asia/Qatar": 3,
                "Asia/Qostanay": 6,
                "Asia/Qyzylorda": 5,
                "Asia/Rangoon": 6,
                "Asia/Riyadh": 3,
                "Asia/Saigon": 7,
                "Asia/Sakhalin": 11,
                "Asia/Samarkand": 5,
                "Asia/Seoul": 9,
                "Asia/Shanghai": 8,
                "Asia/Singapore": 8,
                "Asia/Srednekolymsk": 11,
                "Asia/Taipei": 8,
                "Asia/Tashkent": 5,
                "Asia/Tbilisi": 4,
                "Asia/Tehran": 3,
                "Asia/Tel_Aviv": 2,
                "Asia/Thimbu": 6,
                "Asia/Thimphu": 6,
                "Asia/Tokyo": 9,
                "Asia/Tomsk": 7,
                "Asia/Ujung_Pandang": 8,
                "Asia/Ulaanbaatar": 8,
                "Asia/Ulan_Bator": 8,
                "Asia/Urumqi": 6,
                "Asia/Ust-Nera": 10,
                "Asia/Vientiane": 7,
                "Asia/Vladivostok": 10,
                "Asia/Yakutsk": 9,
                "Asia/Yangon": 6,
                "Asia/Yekaterinburg": 5,
                "Asia/Yerevan": 4,
                "Atlantic/Azores": -1,
                "Atlantic/Bermuda": -4,
                "Atlantic/Canary": 0,
                "Atlantic/Cape_Verde": -1,
                "Atlantic/Faeroe": 0,
                "Atlantic/Faroe": 0,
                "Atlantic/Jan_Mayen": 1,
                "Atlantic/Madeira": 0,
                "Atlantic/Reykjavik": 0,
                "Atlantic/South_Georgia": -2,
                "Atlantic/St_Helena": 0,
                "Atlantic/Stanley": -3,
                "Australia/ACT": 10,
                "Australia/Adelaide": 9,
                "Australia/Brisbane": 10,
                "Australia/Broken_Hill": 9,
                "Australia/Canberra": 10,
                "Australia/Currie": 10,
                "Australia/Darwin": 9,
                "Australia/Eucla": 8,
                "Australia/Hobart": 10,
                "Australia/LHI": 10,
                "Australia/Lindeman": 10,
                "Australia/Lord_Howe": 10,
                "Australia/Melbourne": 10,
                "Australia/NSW": 10,
                "Australia/North": 9,
                "Australia/Perth": 8,
                "Australia/Queensland": 10,
                "Australia/South": 9,
                "Australia/Sydney": 10,
                "Australia/Tasmania": 10,
                "Australia/Victoria": 10,
                "Australia/West": 8,
                "Australia/Yancowinna": 9,
                "Brazil/Acre": -5,
                "Brazil/DeNoronha": -2,
                "Brazil/East": -3,
                "Brazil/West": -4,
                "CET": 1,
                "CST6CDT": -6,
                "Canada/Atlantic": -4,
                "Canada/Central": -6,
                "Canada/Eastern": -5,
                "Canada/Mountain": -7,
                "Canada/Newfoundland": -3,
                "Canada/Pacific": -8,
                "Canada/Saskatchewan": -6,
                "Canada/Yukon": -8,
                "Chile/Continental": -4,
                "Chile/EasterIsland": -6,
                "Cuba": -5,
                "EET": 2,
                "EST5EDT": -5,
                "Egypt": 2,
                "Eire": 0,
                "Etc/GMT": 0,
                "Etc/GMT+0": 0,
                "Etc/GMT+1": -1,
                "Etc/GMT+10": -10,
                "Etc/GMT+11": -11,
                "Etc/GMT+12": -12,
                "Etc/GMT+2": -2,
                "Etc/GMT+3": -3,
                "Etc/GMT+4": -4,
                "Etc/GMT+5": -5,
                "Etc/GMT+6": -6,
                "Etc/GMT+7": -7,
                "Etc/GMT+8": -8,
                "Etc/GMT+9": -9,
                "Etc/GMT-0": 0,
                "Etc/GMT-1": 1,
                "Etc/GMT-10": 10,
                "Etc/GMT-11": 11,
                "Etc/GMT-12": 12,
                "Etc/GMT-13": 13,
                "Etc/GMT-14": 14,
                "Etc/GMT-2": 2,
                "Etc/GMT-3": 3,
                "Etc/GMT-4": 4,
                "Etc/GMT-5": 5,
                "Etc/GMT-6": 6,
                "Etc/GMT-7": 7,
                "Etc/GMT-8": 8,
                "Etc/GMT-9": 9,
                "Etc/GMT0": 0,
                "Etc/Greenwich": 0,
                "Etc/UCT": 0,
                "Etc/UTC": 0,
                "Etc/Universal": 0,
                "Etc/Zulu": 0,
                "Europe/Amsterdam": 1,
                "Europe/Andorra": 1,
                "Europe/Astrakhan": 4,
                "Europe/Athens": 2,
                "Europe/Belfast": 0,
                "Europe/Belgrade": 1,
                "Europe/Berlin": 1,
                "Europe/Bratislava": 1,
                "Europe/Brussels": 1,
                "Europe/Bucharest": 2,
                "Europe/Budapest": 1,
                "Europe/Busingen": 1,
                "Europe/Chisinau": 2,
                "Europe/Copenhagen": 1,
                "Europe/Dublin": 0,
                "Europe/Gibraltar": 1,
                "Europe/Guernsey": 0,
                "Europe/Helsinki": 2,
                "Europe/Isle_of_Man": 0,
                "Europe/Istanbul": 3,
                "Europe/Jersey": 0,
                "Europe/Kaliningrad": 2,
                "Europe/Kiev": 2,
                "Europe/Kirov": 3,
                "Europe/Lisbon": 0,
                "Europe/Ljubljana": 1,
                "Europe/London": 0,
                "Europe/Luxembourg": 1,
                "Europe/Madrid": 1,
                "Europe/Malta": 1,
                "Europe/Mariehamn": 2,
                "Europe/Minsk": 3,
                "Europe/Monaco": 1,
                "Europe/Moscow": 3,
                "Europe/Nicosia": 2,
                "Europe/Oslo": 1,
                "Europe/Paris": 1,
                "Europe/Podgorica": 1,
                "Europe/Prague": 1,
                "Europe/Riga": 2,
                "Europe/Rome": 1,
                "Europe/Samara": 4,
                "Europe/San_Marino": 1,
                "Europe/Sarajevo": 1,
                "Europe/Saratov": 4,
                "Europe/Simferopol": 3,
                "Europe/Skopje": 1,
                "Europe/Sofia": 2,
                "Europe/Stockholm": 1,
                "Europe/Tallinn": 2,
                "Europe/Tirane": 1,
                "Europe/Tiraspol": 2,
                "Europe/Ulyanovsk": 4,
                "Europe/Uzhgorod": 2,
                "Europe/Vaduz": 1,
                "Europe/Vatican": 1,
                "Europe/Vienna": 1,
                "Europe/Vilnius": 2,
                "Europe/Volgograd": 4,
                "Europe/Warsaw": 1,
                "Europe/Zagreb": 1,
                "Europe/Zaporozhye": 2,
                "Europe/Zurich": 1,
                "GB": 0,
                "GB-Eire": 0,
                "GMT": 0,
                "GMT0": 0,
                "Greenwich": 0,
                "Hongkong": 8,
                "Iceland": 0,
                "Indian/Antananarivo": 3,
                "Indian/Chagos": 6,
                "Indian/Christmas": 7,
                "Indian/Cocos": 6,
                "Indian/Comoro": 3,
                "Indian/Kerguelen": 5,
                "Indian/Mahe": 4,
                "Indian/Maldives": 5,
                "Indian/Mauritius": 4,
                "Indian/Mayotte": 3,
                "Indian/Reunion": 4,
                "Iran": 3,
                "Israel": 2,
                "Jamaica": -5,
                "Japan": 9,
                "Kwajalein": 12,
                "Libya": 2,
                "MET": 1,
                "MST7MDT": -7,
                "Mexico/BajaNorte": -8,
                "Mexico/BajaSur": -7,
                "Mexico/General": -6,
                "NZ": 12,
                "NZ-CHAT": 12,
                "Navajo": -7,
                "PRC": 8,
                "PST8PDT": -8,
                "Pacific/Apia": 13,
                "Pacific/Auckland": 12,
                "Pacific/Bougainville": 11,
                "Pacific/Chatham": 12,
                "Pacific/Chuuk": 10,
                "Pacific/Easter": -6,
                "Pacific/Efate": 11,
                "Pacific/Enderbury": 13,
                "Pacific/Fakaofo": 13,
                "Pacific/Fiji": 12,
                "Pacific/Funafuti": 12,
                "Pacific/Galapagos": -6,
                "Pacific/Gambier": -9,
                "Pacific/Guadalcanal": 11,
                "Pacific/Guam": 10,
                "Pacific/Honolulu": -10,
                "Pacific/Johnston": -10,
                "Pacific/Kiritimati": 14,
                "Pacific/Kosrae": 11,
                "Pacific/Kwajalein": 12,
                "Pacific/Majuro": 12,
                "Pacific/Marquesas": -9,
                "Pacific/Midway": -11,
                "Pacific/Nauru": 12,
                "Pacific/Niue": -11,
                "Pacific/Norfolk": 11,
                "Pacific/Noumea": 11,
                "Pacific/Pago_Pago": -11,
                "Pacific/Palau": 9,
                "Pacific/Pitcairn": -8,
                "Pacific/Pohnpei": 11,
                "Pacific/Ponape": 11,
                "Pacific/Port_Moresby": 10,
                "Pacific/Rarotonga": -10,
                "Pacific/Saipan": 10,
                "Pacific/Samoa": -11,
                "Pacific/Tahiti": -10,
                "Pacific/Tarawa": 12,
                "Pacific/Tongatapu": 13,
                "Pacific/Truk": 10,
                "Pacific/Wake": 12,
                "Pacific/Wallis": 12,
                "Pacific/Yap": 10,
                "Poland": 1,
                "Portugal": 0,
                "ROK": 9,
                "Singapore": 8,
                "SystemV/AST4": -4,
                "SystemV/AST4ADT": -4,
                "SystemV/CST6": -6,
                "SystemV/CST6CDT": -6,
                "SystemV/EST5": -5,
                "SystemV/EST5EDT": -5,
                "SystemV/HST10": -10,
                "SystemV/MST7": -7,
                "SystemV/MST7MDT": -7,
                "SystemV/PST8": -8,
                "SystemV/PST8PDT": -8,
                "SystemV/YST9": -9,
                "SystemV/YST9YDT": -9,
                "Turkey": 3,
                "UCT": 0,
                "US/Alaska": -9,
                "US/Aleutian": -10,
                "US/Arizona": -7,
                "US/Central": -6,
                "US/East-Indiana": -5,
                "US/Eastern": -5,
                "US/Hawaii": -10,
                "US/Indiana-Starke": -6,
                "US/Michigan": -5,
                "US/Mountain": -7,
                "US/Pacific": -8,
                "US/Pacific-New": -8,
                "US/Samoa": -11,
                "UTC": 0,
                "Universal": 0,
                "W-SU": 3,
                "WET": 0,
                "Zulu": 0,
                "EST": -5,
                "HST": -10,
                "MST": -7,
                "ACT": 9,
                "AET": 10,
                "AGT": -3,
                "ART": 2,
                "AST": -9,
                "BET": -3,
                "BST": 6,
                "CAT": 2,
                "CNT": -3,
                "CST": -6,
                "CTT": 8,
                "EAT": 3,
                "ECT": 1,
                "IET": -5,
                "IST": 5,
                "JST": 9,
                "MIT": 13,
                "NET": 4,
                "NST": 12,
                "PLT": 5,
                "PNT": -7,
                "PRT": -4,
                "PST": -8,
                "SST": 11,
                "VST": 7
            }
        }
        
        return {
            joinTwoArrayObject,
            newTime,
            newDate,
            iterationCopy,
            getDateGMT,
            getDateGMTWithDate,
            getTimeFromDate,
            sortArayOfObject,
            sortArayOfObjectFlowFields,
            toFixed,
            findListObject,
            getFirstObject,
            getLastObject,
            compositeListObject,
            convertToFloat,
            removeVietnameseTones,
            removeAccents,
            getObjGmtWithTz
        };
        
    });
