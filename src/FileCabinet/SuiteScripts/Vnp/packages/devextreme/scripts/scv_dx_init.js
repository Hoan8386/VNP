/**
 * Nội dung: 
 * Version: 1.260420.15
 * =======================================================================================
 *  Date                Author                  Description
 *  17 Mar 2025         Huy Pham                Init & create file
 */
const _scvDx = {
    dx: {},
    isFormMobile: function(){
        let formMobileId = "dxFormMobile";

        let sourceData = this.getSourceJSON(formMobileId);
        if(!sourceData) return false;

        return sourceData.isFormMobile;
    },
    isDeviceMobile: function(){
        return /Mobi|Android|Tablet|iPad/i.test(navigator.userAgent);
    },
    getHeight: function (name, id) {
        name = name.toLowerCase();

        switch (name) {
            case "grid":
                return window.innerHeight - (jQuery("#div__header").height()||0) * 1;
            break;
            case "treegrid":
                return window.innerHeight - (jQuery("#div__header").height()||0) * 1;
            break;
            case "pivotgrid":
                return window.innerHeight - (jQuery("#div__header").height()||0) * 1;
            break;
            case "chart":
                return window.innerHeight - (jQuery("#div__header").height()||0) * 1 - 200;
            break;
            case "splitter":
                return window.innerHeight - (jQuery("#div__header").height()||0) * 1 + 100;
            break;
        }
    
        return window.innerHeight;
    },
    getWidth: function (name, id) {
        name = name.toLowerCase();
    
        if(this.isFormMobile()){
            return jQuery("#scvBodyFormMobileId").width();//document.body.offsetWidth - 40;
        }

        switch (name) {
            case "treegrid":
            return document.body.offsetWidth - 100;
            case "grid":
                
            return document.body.offsetWidth - 100;
            case "pivotgrid":
                
            return document.body.offsetWidth - 100;
            case "chart":
                
            return document.body.offsetWidth - 100;
            case "tabs":
                
            return document.body.offsetWidth - 100;
            case "splitter":

            return document.body.offsetWidth - 60;
        }

        return document.body.offsetWidth - 100;
    },
    parseStringToFunc: function(_options) {
        if(util.isObject(_options)){
            Object.keys(_options).forEach(key => {
                if(_options[key]?._type == 'function'){
                    _options[key] = eval(_options[key]._value);
                }
                else if(util.isObject(_options[key]) || util.isArray(_options[key])){
                    _options[key] = this.parseStringToFunc(_options[key]);
                }
            });
        }
        else if(util.isArray(_options)){
            _options.forEach(options =>{
                options = this.parseStringToFunc(options);
            })
        }
    
        return _options;
    },
    getLocalization: function(){
        return {
            decimalseparator: window.decimalseparator??'.',
            thousandsseparator: window.groupseparator??',',
        }
    },
    setLocalization: function(){
        let objLocale = this.getLocalization();
        let localeId = "en";
        if(objLocale.thousandsseparator == "." && objLocale.decimalseparator == ","){
            localeId = "de"
        }

        DevExpress.localization.locale(localeId);
    },
    initGridRender: function(_gridType, _gridId, _label){
        let sourceData = this.getSourceJSON(_gridId);

        let options = this.getOptionJSON(_gridId);
        options.width = options.width||this.getWidth(_gridType, _gridId);
        options.height = options.height||this.getHeight(_gridType, _gridId);
        this.parseStringToFunc(options);
        
        this.dx[_gridId] = {
            id: _gridId,
            label: _label,
            type: _gridType,
            option: options
        };

        options.dataSource = sourceData;

        if(!options.onCellPrepared){
            options.onCellPrepared = (e) => {
                if(e.rowType == "data") {
                    let dxId = e.element[0].id;

                    let opEditting = _scvDx.getOption(dxId, "editing")

                    if(opEditting.allowUpdating == true && e.column.allowEditing == true){
                        e.cellElement.css("background-color", "#FFFFE0");
                    }

                    if(!!e.data.cellPreparedData) {
                        let cellPreparedData = e.data.cellPreparedData.find(_cell => _cell.dataField == e.column.dataField);
                        if(!!cellPreparedData){

                            if(!!cellPreparedData.style){
                                let style = cellPreparedData.style;
                            
                                Object.keys(style).forEach(ele => {
                                    if(!!style[ele]){
                                        e.cellElement[0].style[ele] = style[ele];
                                    }
                                })
                            }
                            
                            if(cellPreparedData.hidden == true){
                                e.cellElement[0].querySelector(".dx-editor-inline-block").hidden = true;
                            }
                        }
                    }
                }
            };
        }

        if(!options.onRowPrepared){
            options.onRowPrepared = (e) => {
                if(e.rowType == "data"){
                    if(!!e.data.rowPreparedData && !!e.data.rowPreparedData.style) {
                        let style = e.data.rowPreparedData.style;
                        Object.keys(style).forEach(ele => {
                            if(!!style[ele]){
                                e.rowElement[0].style[ele] = style[ele];
                            }
                        })
                    }
                }
            }
        }

        if(!options.customizeColumns){
            options.customizeColumns = (columns) => {
                $.each(columns, function (_, element) {
                    element.caption = element.caption.replaceAll('\r\n', '<br/>');
                    element.headerCellTemplate = function (header, info) {
                        if(!!info.column.headerStyle) {
                            let style = info.column.headerStyle;
                            Object.keys(style).forEach(ele => {
                                if(!!style[ele]){
                                    let objCss = {};
                                    objCss[ele] = style[ele];
                                    header.parent().css(objCss);
                                    header.css(objCss);
                                }
                            })
                        }
                        
                        $('<div>').html(info.column.caption).appendTo(header);
                    };
                });
            }
        }

        if(_gridType == "grid" && options?.export?.enabled){
            options.onExporting = function(e) {
                let workbook = new ExcelJS.Workbook();
                let worksheet = workbook.addWorksheet(_label||'Report');
                DevExpress.excelExporter.exportDataGrid({
                    component: e.component,
                    worksheet: worksheet,
                    autoFilterEnabled: true
                }).then(function() {
                    workbook.xlsx.writeBuffer().then(function(buffer) {
                        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), _label+'.xlsx');
                    });
                });
                e.cancel = true;
            }
        }

        options.toolbar = options.toolbar||{};
        options.toolbar.items = options.toolbar.items||["groupPanel", "searchPanel", "exportButton","columnChooserButton"];

        if(options?._scv?.markAllButtons?.enabled){
            let objMarkAllButtons = options._scv.markAllButtons;

            options.toolbar = options.toolbar||{};
            options.toolbar.items = options.toolbar.items||["groupPanel", "searchPanel", "exportButton","columnChooserButton"];
            options.toolbar.items.unshift(
                {
                    location: 'before',
                    widget: 'dxButton',
                    options: {
                        text: objMarkAllButtons.textMarkAll,
                        onClick(e) {
                            let markField = objMarkAllButtons.dataField;
                            if(!markField) return;

                            let markFilters = objMarkAllButtons.markFilters;

                            let dxInstance = _scvDx.getInstanceDx(objMarkAllButtons.id);
                            let arrDataSource = [];
                            if(markFilters){
                                arrDataSource = dxInstance.getDataSource()._items;
                            }
                            else{
                                arrDataSource = dxInstance.getDataSource()._store._array;
                            }
                            
                            arrDataSource.forEach(_row =>{
                                if(_scvDx.dx[objMarkAllButtons.id].type == "grid"){
                                    _row[markField] = true;
                                }
                                else{
                                    _row.data[markField] = true;
                                }
                            })

                            dxInstance.refresh();
                            
                            _scvDx.callBackMarkAll({
                                dxInstance,
                                id: objMarkAllButtons.id,
                                type: "markall"
                            });
                        },
                    },
                },
                {
                    location: 'before',
                    widget: 'dxButton',
                    options: {
                        text: objMarkAllButtons.textUnmarkAll,
                        onClick(e) {
                            let markField = objMarkAllButtons.dataField;
                            if(!markField) return;

                            let markFilters = objMarkAllButtons.markFilters;

                            let dxInstance = _scvDx.getInstanceDx(objMarkAllButtons.id);
                            let arrDataSource = [];
                            if(markFilters){
                                arrDataSource = dxInstance.getDataSource()._items;
                            }
                            else{
                                arrDataSource = dxInstance.getDataSource()._store._array;
                            }
                            
                            arrDataSource.forEach(_row =>{
                                if(_scvDx.dx[objMarkAllButtons.id].type == "grid"){
                                    _row[markField] = false;
                                }
                                else{
                                    _row.data[markField] = false;
                                }
                            })
                            
                            dxInstance.refresh();

                            _scvDx.callBackMarkAll({
                                dxInstance,
                                id: objMarkAllButtons.id,
                                type: "unmarkall"
                            });
                        },
                    },
                }
            );
        }

        if(!!options._scv) delete options._scv;

        this.setLocalization();
        if(_gridType == "grid"){
            $('#' + _gridId).dxDataGrid(options);
        }
        else{
            $("#" + _gridId).dxTreeList(options);
        }

        _scvDx.resize(_gridId);
    },
    initChartRender: function(_chartId, _label){
    },
    initPivotGridRender: function(_gridId, _label){
        let sourceData = this.getSourceJSON(_gridId);

        let options = this.getOptionJSON(_gridId);
        options.width = options.width||this.getWidth("pivotgrid", _gridId);
        options.height = options.height||this.getHeight("pivotgrid", _gridId);
        this.parseStringToFunc(options);
        
        this.dx[_gridId] = {
            id: _gridId,
            label: _label,
            type: "pivotgrid",
            option: {...options}
        };

        options.dataSource = sourceData;
        options.dataSource.fields = options.fields||[];

        if(!!options._scv) delete options._scv;

        this.setLocalization();

        $('#' + _gridId).dxPivotGrid(options);
    },
    initFileManagerRender: function(_fileManagerId, _label){
        let sourceData = this.getSourceJSON(_fileManagerId);
        
        let options = this.getOptionJSON(_fileManagerId);
        options.width = options.width||this.getWidth("filemanager", _fileManagerId);
        options.height = options.height||this.getHeight("filemanager", _fileManagerId);
        this.parseStringToFunc(options);
        
        this.dx[_fileManagerId] = {
            id: _fileManagerId,
            label: _label,
            type: "filemanager",
            option: {...options}
        };

        options.fileSystemProvider = sourceData;

        if(!!options._scv) delete options._scv;

        this.setLocalization();

        $('#' + _fileManagerId).dxFileManager(options);
    },
    initTabRender: function(_tabId, _isRenderContent = true){
        let sourceData = this.getSourceJSON(_tabId);

        sourceData.forEach(objDxOfTab => {
            if(["grid", "treegrid"].includes(objDxOfTab.type)){
                this.initGridRender(objDxOfTab.type, objDxOfTab.id, objDxOfTab.label);
            }
            else if("pivotgrid" == objDxOfTab.type){
                this.initPivotGridRender(objDxOfTab.id, objDxOfTab.label);
            }
            else if(objDxOfTab.type == "chart"){
                this.initChartRender(objDxOfTab.id, objDxOfTab.label);
            }
        });

        let options = this.getOptionJSON(_tabId);
        
        this.parseStringToFunc(options);

        this.dx[_tabId] = {
            id: _tabId,
            type: "tabs",
            option: options
        };

        options.dataSource = sourceData;
        options.selectedItem = sourceData[0];

        options.onSelectionChanged = function(e){
            let listTab = e.component.option().items;
            let selectedItem = e.component.option().selectedItem;

            listTab.forEach(objTab =>{
                if(objTab.id == selectedItem.id){
                    $("#" + objTab.panelId).show();
                }
                else{
                    $("#" + objTab.panelId).hide();
                }
            });

            if(selectedItem.type == "pivotgrid"){
                _scvDx.getInstanceDx(selectedItem.id)._windowResizeCallBack();
            }
        }

        if(!!options._scv) delete options._scv;

        $('.widget-wrapper').width(this.getWidth("tabs", _tabId));
        $('.widget-wrapper').toggleClass('strict-width', true);
        $('#' + _tabId).dxTabs(options);
    },
    initSplitterRender : function(_splitterId){
        let sourceData = this.getSourceJSON(_splitterId);
        let options = this.getOptionJSON(_splitterId);
        
        options.width = options.width||this.getWidth("splitter");
        options.height = options.height||this.getHeight("splitter");

        this.parseStringToFunc(options);

        this.dx[_splitterId] = {
            id: _splitterId,
            type: "splitter",
            option: options
        };

        options.items = options.items||[];
        let lstDxOfSplitter = [];

        options.items.forEach((objItem, index) => {
            if(index >= sourceData.length) return;

            let objDxOfSplitter = sourceData[index];

            objItem.template = function(data, index, element) {
                return `<div id="${objDxOfSplitter.panelId}" class="pane-content"><div id="${objDxOfSplitter.id}"></div></div>`;
            };

            lstDxOfSplitter.push({...objDxOfSplitter});
        });

        if(!!options._scv) delete options._scv;

        $('#' + _splitterId).dxSplitter(options);

        lstDxOfSplitter.forEach(objDxOfSplitter => {
            if(["grid", "treegrid"].includes(objDxOfSplitter.type)){
                this.initGridRender(objDxOfSplitter.type, objDxOfSplitter.id, objDxOfSplitter.label);
            }
            else if("pivotgrid" == objDxOfSplitter.type){
                this.initPivotGridRender(objDxOfSplitter.id, objDxOfSplitter.label);
            }
        });
    },
    initFormMobile: function() {
        let formMobileId = "dxFormMobile";

        let sourceData = this.getSourceJSON(formMobileId);
        let options = this.getOptionJSON(formMobileId);
        
        this.parseStringToFunc(options);

        let arrButton = options.buttons;
        arrButton.forEach(objButton =>{
            this.dx[objButton.id] = {...objButton};
            this.dx[objButton.id].instance = $('#' + objButton.id).dxButton({...objButton}).dxButton('instance');
        });

        let arrField = options.fields;
        arrField.forEach(objField => {
            this.dx[objField.id] = {...objField};

            let fieldInstance = null;

            let scvOptions = objField?._scv || {};

            if(["dxSelectBox", "dxTagBox", "dxDropDownBox", "dxRadioGroup"].includes(scvOptions.type)){
                if(!!scvOptions?.lookup){
                    objField.displayExpr = scvOptions?.lookup?.displayExpr || 'name';
                    objField.valueExpr = scvOptions?.lookup?.valueExpr || "id";
                    objField.dataSource = new DevExpress.data.ArrayStore({
                        data: scvOptions?.lookup?.data || [],
                        key: objField.valueExpr
                    });
                }

                if(scvOptions.type == "dxRadioGroup"){
                    objField.items = scvOptions?.lookup?.data || [];
                }

                if(scvOptions.type == "dxDropDownBox"){
                    objField.contentTemplate = function(e){
                        let value = e.component.option('value');
                        let lstValue = util.isArray(value) ? value : [value];

                        let $dataGrid = $('<div>').dxDataGrid({
                            dataSource: e.component.getDataSource(),
                            columns: scvOptions?.lookup?.columns || [],
                            keyExpr: scvOptions?.lookup?.valueExpr,
                            hoverStateEnabled: true,
                            paging: { enabled: true, pageSize: 50},
                            selection: { mode: scvOptions.isMulti ? 'multiple' : 'single' },
                            selectedRowKeys: lstValue,
                            height: '100%',
                            showBorders: true, showRowLines: true,
                            searchPanel: {visible: true},
                            toolbar: {
                                items: [
                                    {
                                        location: 'before',
                                        widget: 'dxButton',
                                        options: {
                                            text: "Close",
                                            onClick(eventButton) {
                                                e.component.close();
                                            },
                                        },
                                    },
                                    "searchPanel"
                                ]
                            },
                            onSelectionChanged(selectedItems) {
                                let keys = selectedItems.selectedRowKeys;

                                if(scvOptions.isMulti){
                                    e.component.option('value', keys);
                                }
                                else{
                                    e.component.option('value', keys.length ? keys[0] : null);
                                }
                            },
                        });
                        let dataGrid = $dataGrid.dxDataGrid('instance');

                        e.component.on('valueChanged', (args) => {
                            dataGrid.selectRows(args.value, false);

                            if(!scvOptions.isMulti){
                                e.component.close();
                            }
                        });

                        return $dataGrid;
                    }
                }
            }

            if(scvOptions.type == "dxTextBox"){
                fieldInstance = $('#' + objField.id).dxTextBox({...objField}).dxTextBox('instance');
            }
            else if(scvOptions.type == "dxSelectBox"){
                fieldInstance = $('#' + objField.id).dxSelectBox({...objField}).dxSelectBox('instance');
            }
            else if(scvOptions.type == "dxDateBox"){
                fieldInstance = $('#' + objField.id).dxDateBox({...objField}).dxDateBox('instance');
            }
            else if(scvOptions.type == "dxDateRangeBox"){
                fieldInstance = $('#' + objField.id).dxDateRangeBox({...objField}).dxDateRangeBox('instance');
            }
            else if(scvOptions.type == "dxCheckBox"){
                fieldInstance = $('#' + objField.id).dxCheckBox({...objField}).dxCheckBox('instance');
            }
            else if(scvOptions.type == "dxTextArea"){
                fieldInstance = $('#' + objField.id).dxTextArea({...objField}).dxTextArea('instance');
            }
            else if(scvOptions.type == "dxNumberBox"){
                fieldInstance = $('#' + objField.id).dxNumberBox({...objField}).dxNumberBox('instance');
            }
            else if(scvOptions.type == "dxAutocomplete"){
                fieldInstance = $('#' + objField.id).dxAutocomplete({...objField}).dxAutocomplete('instance');
            }
            else if(scvOptions.type == "dxColorBox"){
                fieldInstance = $('#' + objField.id).dxColorBox({...objField}).dxColorBox('instance');
            }
            else if(scvOptions.type == "dxDropDownBox"){
                fieldInstance = $('#' + objField.id).dxDropDownBox({...objField}).dxDropDownBox('instance');
            }
            else if(scvOptions.type == "dxSwitch"){
                fieldInstance = $('#' + objField.id).dxSwitch({...objField}).dxSwitch('instance');
            }
            else if(scvOptions.type == "dxTagBox"){
                fieldInstance = $('#' + objField.id).dxTagBox({...objField}).dxTagBox('instance');
            }
            else if(scvOptions.type == "dxRadioGroup"){
                fieldInstance = $('#' + objField.id).dxRadioGroup({...objField}).dxRadioGroup('instance');
            }

            this.dx[objField.id].instance = fieldInstance;
        })

        if(this.isFormMobile() && !this.isDeviceMobile()){
            //jQuery("#scvBodyFormMobileId").removeClass("container")
        }
    },
    getOptionJSON: function(_id){
        return JSON.parse(document.getElementById('option_' + _id)?.textContent ?? "{}");
    },
    getSourceJSON: function(_id){
        return JSON.parse(document.getElementById('source_' + _id)?.textContent ?? "{}");
    },
    getOption: function(_id){
        return this.dx[_id];
    },
    getListDx: function(){
        return Object.values(this.dx);
    },
    getInstanceDx: function(_id){
        let dxType = this.dx[_id].type;

        let dxIntansce = null;
        if(dxType == "grid"){
            dxIntansce = $("#" + _id).dxDataGrid("instance");
        }
        else if(dxType == "treegrid"){
            dxIntansce = $("#" + _id).dxTreeList("instance");
        }
        else if(dxType == "pivotgrid"){
            dxIntansce = $("#" + _id).dxPivotGrid("instance");
        }
        else if(dxType == "splitter"){
            dxIntansce = $("#" + _id).dxSplitter("instance");
        }
        else if(dxType == "filemanager"){
            dxIntansce = $("#" + _id).dxFileManager("instance");
        }

        return dxIntansce
    },
    setOption: function(_id, _key, _value){
        let dxIntansce = this.getInstanceDx(_id);
        
        dxIntansce.option(_key, _value);

        return dxIntansce;
    },
    getOption: function(_id, _key){
        let dxIntansce = this.getInstanceDx(_id);

        return dxIntansce.option(_key);
    },
    setDataSource: function(_id, _dataSource, _key = ""){
        if(this.dx[_id].type == "pivotgrid"){
            let fields = this.getOption(_id, "fields");
            return this.setOption(_id, "dataSource", {
                fields: fields,
                store: _dataSource
            });
        }
        else if(this.dx[_id].type == "filemanager"){
            return this.setOption(_id, "fileSystemProvider", _dataSource);
        }

        let objDataSource = {
            type: "array",
            data: _dataSource
        }
        if(!!_key){
            objDataSource.key = _key;
        }

        let store = new DevExpress.data.DataSource({
            store: objDataSource
        });
        
        return this.setOption(_id, "dataSource", store);
    },
    getDataSource: function(_id){
        if(this.dx[_id].type == "pivotgrid"){
            return this.getOption(_id, "dataSource").store;
        }
        else if(this.dx[_id].type == "filemanager"){
            return this.getOption(_id, "fileSystemProvider");
        }
        
        return this.getOption(_id, "dataSource")?._store?._array || [];
    },
    setColumns: function(_id, _columns){
        if(this.dx[_id].type == "filemanager"){
            let itemView = this.getOption(_id, "itemView");
            itemView.details.columns = _columns;

            return this.setOption(_id, "itemView", itemView);
        }
        return this.setOption(_id, "columns", _columns);
    },
    getColumns: function(_id){
        if(this.dx[_id].type == "filemanager"){
            let itemView = this.getOption(_id, "itemView");

            return itemView?.details?.columns ?? [];
        }
        return this.getOption(_id, "columns");
    },
    setFields: function(_id, _fields){
        let fields = this.setOption(_id, "fields", _fields);
        this.setDataSource(_id, []);

        return fields;
    },
    getFields: function(_id){
        return this.getOption(_id, "fields");
    },
    resize: function(_id){
        try{
            let dxType = _scvDx.dx[_id].type;
            if(["grid", "treegrid"].includes(dxType)){
                let allowColumnResizing = _scvDx.getOption(_id, "allowColumnResizing");
                if(!allowColumnResizing) return;
            }
            
            let sizeWidth = _scvDx.getWidth(dxType, _id);
            _scvDx.setOption(_id, "width", sizeWidth);
            _scvDx.getInstanceDx(_id)._windowResizeCallBack();
        }catch(e){}
        
        setTimeout(() => {_scvDx.resize(_id)}, 100);
    },
    callBackMarkAll: function(context){},
}

_initDx();

function _initDx(){
    if(!NS.form.isInited()){
        setTimeout(() => {_initDx()}, 100);
        return;
    }
}