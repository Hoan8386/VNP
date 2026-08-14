define([],
	
	() => {
		
		const addIconButtonExport = (form, arrButton, fieldId) =>{
			if(arrButton.length === 0) return;
			let htmlField = form.addField({
				id: fieldId,
				label: "html",
				type: "INLINEHTML",
			});
			htmlField.defaultValue = getScriptAddIcon(arrButton);
		}
		
		const addClassBtnSubmit = (form, btnId) => {
			let htmlField = form.addField({
				id: 'custpage_add_classlist_' + onGenCodeRandom(),
				label: "html",
				type: "INLINEHTML",
			});
			htmlField.defaultValue = `<script>
				let btnSubmit = document.getElementById("${btnId}");
				let btnSecondId = 'secondary' + '${btnId}';

				if (btnSubmit && btnSubmit.tagName === 'BUTTON') {
					btnSubmit.setAttribute('data-button-type', 'primary')
				}
				else {
					btnSubmit = document.getElementById("tr_${btnId}");
					btnSubmit.classList.add('pgBntB');

					btnSecondId = 'tr_secondary' + '${btnId}';
				}

				addClassSubmitBtn(btnSecondId);

				function addClassSubmitBtn(buttonId) {
					const btnSecond = document.getElementById(buttonId);
					if(!btnSecond) {
						setTimeout(() => addClassSubmitBtn(buttonId), 500);
					} else {
						if (btnSecond.tagName === 'BUTTON') {
							btnSecond.setAttribute('data-button-type', 'primary')
						}
						else {
							btnSecond.classList.add('pgBntB');
						}
					}
				}
			</script>`;
		}
		
		const getScriptAddIcon = (arrButton) => {
			// id, export_type
			let jsonData = JSON.stringify(arrButton);
			let render = '<script>\n';
					render += `
				const sprite_image = '/images/sprite-list.png';
				const scvListButton = JSON.parse('${jsonData}');

				scvListButton.forEach(({ id, export_type }) => {
					const buttonElement = document.getElementById(id);
					if (buttonElement) {
					   customAddIconBtn(buttonElement, export_type);
					   processItemIcon(id, export_type);
					}
				});

				function customAddIconBtn(buttonElement, iconType) {
					const buttonValue = buttonElement.value;
					setButtonStyle(buttonElement);
					setIconStyle(buttonElement, iconType);
					buttonElement.value = buttonValue;
						}
				function setButtonStyle(buttonElement) {
					buttonElement.style.setProperty('padding-left', '23px', 'important');
					buttonElement.style.setProperty('background', 'url('+ sprite_image +')', 'important');
					buttonElement.style.setProperty('background-repeat', 'no-repeat', 'important');
					buttonElement.style.setProperty('background-position-x', '-48px', 'important');
					buttonElement.style.setProperty('background-position-y', '-596px', 'important');
				}
				function setIconStyle(buttonElement, iconType) {
					switch (iconType) {
					  case 'PDF':
						buttonElement.style.setProperty('background-position-y', '-546px', 'important');
						break;
					  case 'EXCEL':
						buttonElement.style.setProperty('background-position-y', '-496px', 'important');
						break;
					  case 'WORD':
						buttonElement.style.setProperty('background-position-y', '-646px', 'important');
						break;
					  case 'SEARCH':
						buttonElement.style.setProperty('background-position-y', '-44px', 'important');
						buttonElement.style.setProperty('background-position-x', '-46px', 'important');
						break;
					}
				}
				function processItemIcon(buttonId, iconType) {
					const buttonElement = document.getElementById('secondary' + buttonId);
					if (!buttonElement) {
					  setTimeout(() => processItemIcon(buttonId, iconType), 500);
					} else {
					  customAddIconBtn(buttonElement, iconType);
			}
				}
			`;
			render += '</script>\n';
			return render;
		}
		
		const onGenCodeRandom = () =>{
			return "" + Math.round(Math.random()*1000) + ("" +Date.now());
		}

		return {
			addIconButtonExport,
			addClassBtnSubmit,
		};
	});
