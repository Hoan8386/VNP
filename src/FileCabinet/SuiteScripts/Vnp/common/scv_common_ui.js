/**
 * @NApiVersion 2.1
 */
define([],
    
    () => {

        // add icon cho các nút có format là ['custpage_scv_btn']_[fileType] trong đó filetype được định nghĩa bên dưới
        const addIconToButton = (form, id) => {
                form.addField({
                        id: id ? id : 'custpage_scv_field_add_icons_to_buttons',
                        type: 'INLINEHTML',
                        label: 'Add icons to buttons'
                }).defaultValue = `<script>
                        const urlPdfIcon = "https://img.icons8.com/office/24/pdf.png";
                        const urlExcelIcon = "https://img.icons8.com/color/24/microsoft-excel-2019--v1.png";
                        const urlWordIcon = 'https://img.icons8.com/color/24/microsoft-word-2019--v2.png';

                        const PRINT_TYPE={
                           "pdf": urlPdfIcon,
                           "excel": urlExcelIcon,
                           "word": urlWordIcon,
                        }
                        const addIconToButtonVer2 = () => {
                            document.querySelectorAll('[id^=custpage_scv_btn]').forEach((button) => {
                                addIconToButton(button.id);
                            });
                            document.querySelectorAll('[id^=secondarycustpage_scv_btn]').forEach((button) => {
                                addIconToButton(button.id);
                            });
                        }

                        const addIconToButton = (buttonId) => {
                           Object.keys(PRINT_TYPE).forEach((printType) => {
                                let iconUrl;
                           if (buttonId.includes(printType.toLowerCase())) {
                               iconUrl = PRINT_TYPE[printType];
                               const buttonElement = document.getElementById(buttonId);// Get the button by ID
                            if (buttonElement) {
                                //Set the button's style for Excel icon
                                buttonElement.style.setProperty('padding-left', '24px', 'important'); // Add padding
                                buttonElement.style.setProperty('background-image', \`url('\${iconUrl}')\`, 'important'); // Set background image
                                buttonElement.style.setProperty('background-repeat', 'no-repeat', 'important'); // Prevent background repeat
                            }
                            }
                           });
                          }
                        
                        addIconToButtonVer2();
                 
                    </script>`;
        }



        return {
            addIconToButton
        }

    });
