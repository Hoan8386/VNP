define([],
    () => {
        
        const PRIMARY_COLOR = "#000000";
        const PRIMARY_BG = "";
        const FONT_SIZE = "15px";
        const FONT_FAMILY = "'Times New Roman', Times, serif";
        
        const addFieldDxGridResult = (form, elemnetId) => {
            let resultGrp = addFieldGroup(form, "resultgrp_main", "Results");
            let custpage_grid_result = form.addField({
                id: 'custpage_grid_result', type: "inlinehtml", label: 'Result', container: resultGrp.id
            });
            custpage_grid_result.defaultValue = `<div style="margin-top: 8px;" id="${elemnetId}"></div>`;
        }
        
        const addFieldIncludeDxGrid = (form) => {
            let custpage_include_dxgrid = form.addField({
                id: 'custpage_include_dxgrid', type: "inlinehtml", label: 'Include DxGrid',
            });
            custpage_include_dxgrid.defaultValue = includeHtmlCustomDxGrid();
        }
        
        const renderDxGridResult = (data, columns, elemnetId) => {
            resizeGrid(elemnetId);
            let optionGrid = getOptionGrid();
            optionGrid.dataSource.store = data;
            optionGrid.columns = columns;
            
            $('#' + elemnetId).dxDataGrid(optionGrid);
        }
        
        const getOptionGrid = () => {
            return {
                dataSource: {
                    store: [], reshapeOnPush: true,
                },
                columns: [],
                columnResizingMode: "widget",
                showBorders: true,
                showColumnLines: true,
                showRowLines: true,
                allowColumnResizing: true,
                columnAutoWidth: true,
                repaintChangesOnly: true,
                wordWrapEnabled: true, // selection: "single",
                searchPanel: {visible: true},
                rowAlternationEnabled: false,
                paging: {pageSize: 500},
                loadPanel: {enabled: false},
                columnFixing: {enabled: true},
                pager: {
                    allowedPageSizes: [100, 200, 500, 1000],
                    showPageSizeSelector: true,
                    showInfo: true,
                    showNavigationButtons: true,
                },
                onCellPrepared: function (e) {
                    createFontReport(e.cellElement);
                    if (e.rowType === "data" && e.column.allowEditing === true) {
                        if (e.row.data?.level === 1) {
                            e.cellElement.css("font-weight", "bold");
                        }
                    }
                }
            };
        }
        
        const addFieldGroup = (form, id, label) => {
            let obj = {id: id, label: label}
            form.addFieldGroup(obj);
            return obj;
        }
        
        const includeHtmlCustomDxGrid = () => {
            let htmlDxGrid = `${includeLibaryExternalHtml()}`;
            htmlDxGrid += `${includeCustomCssForm()}`;
            htmlDxGrid += `${includeTagStyleHtml()}`;
            return htmlDxGrid;
        }
        
        const createTagLink = (link, name) => {
            return `<span>
            <a style="color: ${PRIMARY_COLOR}; text-decoration: underline;" href="${link}" target="_blank">${name}</a>    
        </span>`;
        }
        
        const createFontReport = (element) => {
            element.css("font-size", FONT_SIZE);
            element.css("font-family", FONT_FAMILY);
            element.css("color", PRIMARY_COLOR);
        }
        
        const includeLibaryExternalHtml = () => {
            return `
			<script type="text/javascript" src="https://code.jquery.com/jquery-3.5.1.min.js"></script>

			<link rel="stylesheet" href="https://cdn3.devexpress.com/jslib/21.2.15/css/dx.light.css" />
			<script type="text/javascript" src="https://cdn3.devexpress.com/jslib/21.2.15/js/dx.all.js"></script>

			<script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js"></script>
			<script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
		`;
        }
        
        const includeTagStyleHtml = () => {
            return `
		<style>
			.card {
				min-height: 35rem;
			}
	
			.dx-header-row {
				background-color: ${PRIMARY_BG} !important;
				vertical-align: bottom;
				color: ${PRIMARY_COLOR} !important;
				font-size: ${FONT_SIZE} !important;
				text-align: center!important;
				font-weight: bold !important;
			}
	
			td[role=columnheader] {
				text-align: center!important
			}
	
			.dx-datagrid-headers {
				position: sticky;
				top: 0px;
				background-color: white;
				z-index: 1000;
			}
			.dx-datagrid-headers .dx-datagrid-table .dx-row > td{
				border-bottom-width: 1px !important;
				border-bottom-style: solid !important;
				border-bottom-color: black !important;
	
				border-left-width: 1px !important;
				border-left-style: solid !important;
				border-left-color: black !important;
	
				border-right-width: 1px !important;
				border-right-style: solid !important;
				border-right-color: black !important;
	
				border-top-width: 1px !important;
				border-top-style: solid !important;
				border-top-color: black !important;
	
				border-width: 1px !important;
				border-style: solid !important;
				border-color: black !important;
			}
	
			.dx-data-row{
				
			}
			.dx-item-content.dx-tab-content {
				color: ${PRIMARY_COLOR} !important;
				font-weight: bold;
				font-size: ${FONT_SIZE} !important;
				font-family: ${FONT_FAMILY} !important;
			}
			.dx-datagrid-action.dx-cell-focus-disabled, .dx-placeholder {
				font-size: ${FONT_SIZE} !important;
				font-family: ${FONT_FAMILY} !important;
			}

			.dx-page-size, .dx-info, .dx-page {
				font-size: ${FONT_SIZE} !important;
				font-family: ${FONT_FAMILY} !important;
				color: ${PRIMARY_COLOR} !important;
			}

			.dx-cell-focus-disabled {
				
			}
			
			.dx-tabpanel > .dx-tabpanel-tabs .dx-tab {
				 border: 1px solid #E5E5E5;
			}
			.dx-row.dx-freespace-row.dx-column-lines {
				height: 0px !important;
			}
			.dx-searchbox .dx-texteditor-input {
				padding-left: 34px !important;
			}
		</style>
		`;
        }
        
        const includeCustomCssForm = () => {
            return `
			<style>
				.uir-button .pgBntG .bntBgB input[type=button] {
					
					color: ${PRIMARY_COLOR} !important;
				}
				.uir-button .pgBntG .bntBgB input[type=submit] {
				
				}
				.uir-button .pgBntB .bntBgB input[type=button] {
					color: #fff !important;
				}
				.pgBntY_sel *, .pgBntG_sel *, .pgBntGDis_sel *,
				.pgBntG, .pgBntG_sel,
				.fgroup_title.uir-field-group-title,
				.uir-record-type,
				.uir-page-title-firstline.uir-page-title-firstline-record, 
				.uir-label, .uir-input-text, .ns-menuitem a,
				.uir-popup-cal-nav-title, .uir-popup-cal-header-row > td, 
				.uir-popup-cal-cell-text, .uir-popup-cal-cell-text-light, .uir-popup-cal-cell,
				.dropdownInput, .dropdownNotSelected, .dropdownSelected {
					
					color: ${PRIMARY_COLOR} !important;
				}
				.fgroup_title.uir-field-group-title {
				
				}
				.dropdownDiv .dropdownSelected, 
				td.uir-popup-cal-cell-selected a,
				td.fgroup_title {
					background-color: ${PRIMARY_BG} !important;
				}
				.page-title-menu {
					display: none;
				}
			</style>
		`;
        }
        
        const resizeGrid = (_gridId) => {
            var windowWidth = window.innerWidth;
            $('#' + _gridId).css("width", (windowWidth - 70) + "px");
            $('#' + _gridId).css("max-width", (windowWidth - 70) + "px");
            setTimeout(function () {
                resizeGrid(_gridId)
            }, 100);
        }
        
        const formatNumber = (_num, _fixed = 2) => {
            if (typeof _num === 'number' && _num % 1 !== 0) {
                _num = _num.toFixed(_fixed);
            }
            var parts = _num.toString().split(".");
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join(".");
        }
        
        return {
            addFieldGroup,
            addFieldIncludeDxGrid,
            addFieldDxGridResult,
            includeHtmlCustomDxGrid,
            renderDxGridResult,
            getOptionGrid,
            createFontReport,
            createTagLink,
            resizeGrid,
            formatNumber
        };
    });

