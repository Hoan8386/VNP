/**
 * Nội dung: 
 * Version: 1.250602.8
 * =======================================================================================
 *  Date                Author                  Description
 *  06 Jul 2024         Huy Pham                Init & create file
 */
define(['N/format', 'N/format/i18n', 'N/query',
    '../olib/big.js',
    '../cons/scv_cons_currency.js',
    '../cons/scv_cons_datastore.js'
],
function(format, formati18n, query,
    bigJs,
    constCurrency,
    constDataStore
) {
    const TYPE = "";
	const ID = "";

	const RECORDS = {
        LOCALE: {
            EN: {
                ID: "en",
                NAME: ""
            },
            DE: {
                ID: "de",
                NAME: ""
            },
            RU: {
                ID: "ru",
                NAME: ""
            }
        },
        MONTHS: [
            'January', 'February', 'March', 'April', 'May', 'June', 
            'July', 'August', 'September', 'October', 'November', 'December'
        ],
        SHORT_MONTH: [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ],
        MONTH_LENGTH: [[31,28,31,30,31,30,31,31,30,31,30,31],[31,29,31,30,31,30,31,31,30,31,30,31]]
    }

    let currencyFormatter = null;

    const formatDate = (_value) =>{
        return !!_value ? format.format({type: "date", value: _value}) : "";
    }

    const parseDate = (_value) =>{
        return !!_value ? format.parse({type: "date", value: _value}) : "";
    }

    const formatDateTime = (_value) =>{
        return !!_value ? format.format({type: "datetime", value: _value}) : "";
    }

    const parseDateTime = (_value) =>{
        return !!_value ? format.parse({type: "datetime", value: _value}) : "";
    }

    const formatTimeOfDay = (_value) =>{
        return !!_value ? format.format({type: "timeofday", value: _value}) : "";
    }

    const parseTimeOfDay = (_value) =>{
        return !!_value ? format.parse({type: "timeofday", value: _value}) : "";
    }

    const initCurrencyFormatter = (_currencyCode = "VND") =>{
        currencyFormatter = formati18n.getCurrencyFormatter({currency: _currencyCode});

        return currencyFormatter;
    }

    const getCurrencyFormatter = () =>{
        return currencyFormatter;
    }

    const formatCurrency = (_value) =>{
        if(!currencyFormatter){
            initCurrencyFormatter();
        }
        return currencyFormatter.format({number: _value||0});
    }

    const formatNumber = (_num, _fixed = 2) => {
		if(typeof _num === 'number' && _num % 1 !== 0) {
			_num = _num.toFixed(_fixed);
		}
		var parts = _num.toString().split(".");
		parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
		return parts.join(",");
	}

    const getLocaleByFormat = () =>{
        let numformat = formati18n.getNumberFormatter();

        if(numformat.groupSeparator == "." && numformat.decimalSeparator == ","){
            return RECORDS.LOCALE.DE.ID;
        }
        return RECORDS.LOCALE.EN.ID;
    }

    const getNumberFormatter = (_currencyCode) =>{
        let formatter = constDataStore.getDataStore(_currencyCode);
        if(!formatter){
            formatter = initCurrencyFormatter(_currencyCode);
            constDataStore.setDataStore(_currencyCode, formatter);
        }

        let numberFormat = formatter.numberFormatter;

        return {
            groupSeparator: numberFormat.groupSeparator,
            decimalSeparator: numberFormat.decimalSeparator,
            precision: numberFormat.precision * 1
        }
    }

    const getTemplateFormatNumber = (_precision = 2, _groupSeparator = ",", _decimalSeparator = ".") =>{
        let arrGroupNumber = ["###", "###", "##0"];

        let tmplFormat = arrGroupNumber.join(_groupSeparator);

        if(_precision > 0){
            tmplFormat += _decimalSeparator + "".padStart(_precision, "#");
        }

        return tmplFormat;
    }

    const getMaskFormatQuantity = () =>{
        let tmplFormat = getTemplateFormatNumber(9);

        return tmplFormat;
    }

    const getMaskFormatExchangeRate = () =>{
        let tmplFormat = getTemplateFormatNumber(9);

        return tmplFormat;
    }

    const getMaskFormatNumber = (_currencyCode) =>{
        let numberFormat = getNumberFormatter(_currencyCode||'USD');

        let tmplFormat = getTemplateFormatNumber(numberFormat.precision);

        return tmplFormat;
    }

    const getMaskFormatQuantityXls = () =>{
        return getNumberAccountingFormatXls(0);
    }

    const getMaskFormatExchangeRateXls = () =>{
        return getNumberAccountingFormatXls(9);
    }
    
    const getMaskFormatVndXls = () =>{
        let numberFormat = getNumberFormatter('VND');

        return getNumberAccountingFormatXls(numberFormat.precision);
    }

    const getMaskFormatCurrencyXls = (_currencyCode) =>{
        let numberFormat = getNumberFormatter(_currencyCode||'USD');

        return getNumberAccountingFormatXls(numberFormat.precision);
    }

    const getNumberAccountingFormatXls = (_precision = 0) =>{
        if(_precision == 0) return "_(#,##0_);_( (#,##0);_( \\-\\ ??_);_(@_)";

        let padPrecision = "".padStart(_precision, "#");

        return "_(#,##0." + padPrecision + "_);_( (#,##0." + padPrecision + ");_( \\-\\ ??_);_(@_)";
    }

    const getPercentAccountingFormatXls = (_precision = 0) =>{
        if(_precision == 0) return "_(#,##0_)%;_( (#,##0)%;_( \\-\\ ??_);_(@_)";

        let padPrecision = "".padStart(_precision, "#");

        return "_(#,##0." + padPrecision + "_)%;_( (#,##0." + padPrecision + ")%;_( \\-\\ ??_);_(@_)";
    }

    const getBeginOfMonth = (_date) =>{
        if(!_date) return "";

        let date = typeof(_date) == "string" ? parseDate(_date) : _date;
        let begin = new Date(date.getFullYear(), date.getMonth(), 1);
        begin = typeof(_date) == "string" ? formatDate(begin) : parseDate(begin);

        return begin;
    }

    const getEndOfMonth = (_date) =>{
        if(!_date) return "";

        let date = typeof(_date) == "string" ? parseDate(_date) : _date;
        let end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        end = typeof(_date) == "string" ? formatDate(end) : parseDate(end);

        return end;
    }

    const getInfoDate = (_date) =>{
        if(!_date) return null;

        let objRes = {};

        objRes.dateFormat = formatDate(_date);
        objRes.dateParse = parseDate(_date);
        objRes.yyyy = getYYYY(_date);
        objRes.yy = getYY(_date);
        objRes.mm = getMM(_date);
        objRes.dd = getDD(_date);
        objRes.yyyymm = objRes.yyyy + objRes.mm;
        objRes.yyyymmdd = objRes.yyyy + objRes.mm + objRes.dd;

        return objRes;
    }

    const calcYearDiff = (_startDate, _endDate) =>{
        if(!_startDate || !_endDate) return 0;

        let startDate = getInfoDate(_startDate);
        let endDate = getInfoDate(_endDate);
        let yesterdayStartDate = getInfoDate(startDate.dateParse.addDays(-1));

        let diffYear = 0;

        let yearRunner = startDate.yyyy * 1;

        while(yearRunner <= Number(endDate.yyyy)){

            if(yesterdayStartDate.mm <= endDate.mm && yesterdayStartDate.dd <= endDate.dd){
                diffYear++;
            }
            else{
                break;
            }

            yearRunner++; 
        }

        return diffYear;
    }

    const isLeapYear = (year) => {
        return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    }

    Date.prototype.addDays = function(days) {
        var date = new Date(this.valueOf());
        date.setDate(date.getDate() + days);
        return date;
    }

    const addMonth = (_date, _numMonth) =>{
        if(!_date) return "";

        let date = typeof(_date) == "string" ? parseDate(_date) : _date;

        let originalDay = date.getDate();

        let newDate = new Date(date.getFullYear(), date.getMonth() + _numMonth, date.getDate());

        while (newDate.getDate() < originalDay && newDate.getMonth() !== (date.getMonth() + _numMonth) % 12) {
            newDate.setDate(newDate.getDate() - 1);
        }

        newDate = typeof(_date) == "string" ? formatDate(newDate) : parseDate(newDate);

        return newDate;
    }

    const dateToChar = (_date, _outFormat = "YYYYMMDD") =>{
        if(!_date) return "";

        let date = typeof(_date) == "string" ? parseDate(_date) : _date;
        
        let str_result = "";

        switch(_outFormat){
            case "YYYYMMDDHH24MISS":
                str_result = getYYYY(date) + getMM(date) + getDD(date) + getHH24(date) + getMI(date) + getSS(date);
            break;
            case "YYYYMMDD":
                str_result = getYYYY(date) + getMM(date) + getDD(date);
            break;
            case "YYYYMM":
                str_result = getYYYY(date) + getMM(date);
            break
            case "YYMM":
                str_result = getYY(date) + getMM(date);
            break
            case "YYYY":
                str_result = getYYYY(date);
            break
            case "YY":
                str_result = getYY(date);
            break
            case "MM":
                str_result = getMM(date);
            break
            case "DD":
                str_result = getDD(date);
            break
        }

        return str_result;
    }

    const dateTimeToChar = (_dateTime, _outFormat = "YYYYMMDDHH24MISS") =>{
        if(!_dateTime) return "";

        let datetime = typeof(_dateTime) == "string" ? parseDateTime(_dateTime) : _dateTime;
        
        let str_result = "";

        switch(_outFormat){
            case "YYYYMMDDHH24MISS":
                str_result = getYYYY(datetime) + getMM(datetime) + getDD(datetime) + getHH24(datetime) + getMI(datetime) + getSS(datetime);
            break;
            case "YYYYMMDD":
                str_result = getYYYY(datetime) + getMM(datetime) + getDD(datetime);
            break;
            case "YYYYMM":
                str_result = getYYYY(datetime) + getMM(datetime);
            break
            case "YYMM":
                str_result = getYY(datetime) + getMM(datetime);
            break
            case "YYYY":
                str_result = getYYYY(datetime);
            break
            case "YY":
                str_result = getYY(datetime);
            break
            case "MM":
                str_result = getMM(datetime);
            break
            case "DD":
                str_result = getDD(datetime);
            break
            case "HH24MI":
                str_result = getHH24(datetime) + getMI(datetime);
            break;
        }

        return str_result;
    }

    const timeOfDayToChar = (_timeOfDay, _outFormat = "HH24MISS") =>{
        if(!_timeOfDay) return "";

        let timeOfDay = typeof(_timeOfDay) == "string" ? parseTimeOfDay(_timeOfDay) : _timeOfDay;
        
        let str_result = "";

        switch(_outFormat){
            case "HH24MISS":
                str_result = getHH24(timeOfDay) + getMI(timeOfDay) + getSS(timeOfDay);
            break;
            case "HH24MI":
                str_result = getHH24(timeOfDay) + getMI(timeOfDay);
            break;
        }

        return str_result;
    }

    const getYYYY = (_date) =>{
        if(!_date) return "";

        let d = typeof(_date) == "string" ? parseDate(_date) : _date;

        return d.getFullYear() + "";
    }

    const getYY = (_date) =>{
        if(!_date) return "";

        let yyyy = getYYYY(_date);

        return yyyy.substring(2,4);
    }

    const getMM = (_date) =>{
        if(!_date) return "";

        let d = typeof(_date) == "string" ? parseDate(_date) : _date;

        return (d.getMonth() + 1).toString().padStart(2,"0");
    }

    const getDD = (_date) =>{
        if(!_date) return "";

        let d = typeof(_date) == "string" ? parseDate(_date) : _date;

        return d.getDate().toString().padStart(2,"0");
    }

    const getHH24 = (_date) =>{
        if(!_date) return "";

        let d = typeof(_date) == "string" ? parseDateTime(_date) : _date;

        return d.getHours().toString().padStart(2,"0");
    }

    const getMI = (_date) =>{
        if(!_date) return "";

        let d = typeof(_date) == "string" ? parseDateTime(_date) : _date;

        return d.getMinutes().toString().padStart(2,"0");
    }

    const getSS = (_date) =>{
        if(!_date) return "";

        let d = typeof(_date) == "string" ? parseDateTime(_date) : _date;

        return d.getSeconds().toString().padStart(2,"0");
    }

    const roundCurrency = (_currencyId, _number) => {
        let precision = 100;
        if(_currencyId == constCurrency.RECORDS.VND.ID){
            precision = 1;
        }
        return Math.round(_number * precision) / precision;
    }

    const validateEmail = (email) => {
        let basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let complexRegex = /^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)])$/;
    
        return basicRegex.test(email) || complexRegex.test(email);
    }

    const calcNumberDays = (_d1, _d2, _isAbs = true) =>{
        if(!_d1 || !_d2) return 0;
        
        let oneDay = 24 * 60 * 60 * 1000;

        let d1 = typeof(_d1) == "string" ? parseDate(_d1) : _d1;
        let d2 = typeof(_d2) == "string" ? parseDate(_d2) : _d2;

        let firstDate = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
        let secondDate = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());

        let diffDay = Math.round((firstDate - secondDate) / oneDay);

        return _isAbs ? Math.abs(diffDay) : diffDay;
    }

    const randomNumberBetween = (_min, _max) =>{
        let precision_min = (_min.toString().split(".")?.[1]?.length || 0) * 1;
        let precision_max = (_max.toString().split(".")?.[1]?.length || 0) * 1;

        let precision_num = precision_min > precision_max ? precision_min : precision_max;
        precision_num = Math.pow(10, precision_num);

        let min = _min * 1;
        let max = _max * 1;

        let num = Math.random() * (max - min) + min;

        num = Math.round(num * precision_num) / precision_num;

        return num;
    }

    const addMinutes = (_dateTime, minutes) => {
        if(!_dateTime) return "";

        let datetime = typeof(_dateTime) == "string" ? parseDateTime(_dateTime) : _dateTime;
        
        return datetime.addMinutes(minutes);
    }

    const addHours = (_dateTime, _hours = 0) =>{
        if(!_dateTime) return "";

        let datetime = typeof(_dateTime) == "string" ? parseDateTime(_dateTime) : _dateTime;
        //datetime = datetime.setTime(datetime.getTime() + (_hours*60*60*1000))
        
        return datetime.addHours(_hours);
    }

    Date.prototype.addHours = function(h) {
        this.setTime(this.getTime() + (h*60*60*1000));
        return this;
    }

    Date.prototype.addMinutes = function(minutes) {
        this.setTime(this.getTime() + (minutes*60*1000));
        return this;
    }

    const getDateTimeWithCurrentGMT = (_dateTime) =>{
        let diffHours = query.runSuiteQL({query: `SELECT (CURRENT_DATE - SYSDATE) * 24 as diff_hours 
            FROM Dual`}).asMappedResults()[0].diff_hours;//Tạm thời

        return addHours(_dateTime, diffHours);
    }

    const roundNumber = (_number, _precision = 2) => {
        if(isNaN(_number) || _number == Infinity) return 0;
        
		let precision = Math.pow(10, _precision);
        let val = Math.round(bigJs(_number).times(bigJs(precision)));
        val = bigJs(val).div(precision);

		return val * 1;
	}

    const getMonthLength = (year, month) => {
        return RECORDS.MONTH_LENGTH[isLeapYear(year)?1:0][month];
    }

    const getWeekOfYear = (_date) => {
        let date = typeof(_date) == "string" ? parseDate(_date) : _date;
        let firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        let pastDaysOfYear = (date - firstDayOfYear) / (24 * 60 * 60 * 1000);

        // Tính số tuần (làm tròn lên vì tuần bắt đầu từ ngày 1)
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    const getWeekOfMonth = (_date) => {
        if (!_date) return 0;
    
        let date = typeof (_date) === "string" ? parseDate(_date) : _date;
        let firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        let dayOfWeekOffset = firstDayOfMonth.getDay(); // Ngày đầu tiên của tháng là thứ mấy (0: Chủ nhật, 1: Thứ hai, ...)
    
        // Tính số ngày đã qua trong tháng
        let dayOfMonth = date.getDate();
    
        // Tính tuần (làm tròn lên vì tuần bắt đầu từ ngày 1)
        return Math.ceil((dayOfMonth + dayOfWeekOffset) / 7);
    };

    const getMaxObject = (_arrResult, _key) => {
        if (!util.isArray(_arrResult) || _arrResult.length == 0) return null;
    
        return _arrResult.reduce((maxObj, currentObj) => {
            return (currentObj[_key] > (maxObj[_key] || 0)) ? currentObj : maxObj;
        }, {});
    }

    return {
		ID,
		TYPE,
		RECORDS,
        formatDate,
        parseDate,
        formatNumber,
        getNumberFormatter,
        getTemplateFormatNumber,
        initCurrencyFormatter,
        getCurrencyFormatter,
        formatCurrency,
        getInfoDate,
        addMonth,
        getBeginOfMonth,
        getEndOfMonth,
        dateToChar,
        dateTimeToChar,
        calcYearDiff,
        isLeapYear,
        timeOfDayToChar,
        getYYYY,
        getYY,
        getMM,
        getDD,
        roundCurrency,
        validateEmail,
        getLocaleByFormat,
        getMaskFormatNumber,
        getMaskFormatExchangeRate,
        getMaskFormatExchangeRateXls,
        getMaskFormatQuantity,
        getMaskFormatQuantityXls,
        getMaskFormatVndXls,
        getMaskFormatCurrencyXls,
        getNumberAccountingFormatXls,
        getPercentAccountingFormatXls,
        calcNumberDays,
        randomNumberBetween,
        addMinutes,
        addHours,
        getDateTimeWithCurrentGMT,
        roundNumber,
        formatDateTime,
        parseDateTime,
        formatTimeOfDay,
        parseTimeOfDay,
        getMonthLength,
        getWeekOfYear,
        getWeekOfMonth,
        getMaxObject
    };
    
});
