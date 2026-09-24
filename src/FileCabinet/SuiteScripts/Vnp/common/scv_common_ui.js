/**
 * @NApiVersion 2.1
 */
define([],

    () => {

        // add icon cho các nút có format là ['custpage_scv_btn']_[fileType] trong đó filetype được định nghĩa bên dưới
        // Dùng sprite gốc của NetSuite (/images/sprite-list.png) để icon trùng khít với
        // các nút do lib/scv_lib_common_html.js -> addIconButtonExport() tạo ra.
        const addIconToButton = (form, id) => {
                form.addField({
                        id: id ? id : 'custpage_scv_field_add_icons_to_buttons',
                        type: 'INLINEHTML',
                        label: 'Add icons to buttons'
                }).defaultValue = `<script>
                        const SPRITE_IMAGE = '/images/sprite-list.png';
                        const SPRITE_POSITION_X = '-48px';

                        // Toạ độ y trên sprite /images/sprite-list.png (x luôn -48px).
                        // Lưới icon cách nhau 50px, phase -46 (…-846, -896, -946…).
                        // Bộ icon CŨ (nhạt, viền mảnh):  excel -496 | pdf -546 | doc trắng -596 | MÁY IN -646
                        // Bộ icon MỚI (đậm, logo thật): excel -846/-896 | WORD -946 | pdf -996 | doc xanh -1046
                        // -646 là máy in chứ không phải Word — nút KNKT từng trông như nút Print vì toạ độ này.
                        const PRINT_TYPE = {
                           "pdf": '-546px',
                           "excel": '-496px',
                           "word": '-946px',
                        }

                        const applySpriteIcon = (buttonElement, positionY) => {
                            const buttonValue = buttonElement.value;
                            buttonElement.style.setProperty('padding-left', '23px', 'important');
                            buttonElement.style.setProperty('background', \`url(\${SPRITE_IMAGE})\`, 'important');
                            buttonElement.style.setProperty('background-repeat', 'no-repeat', 'important');
                            buttonElement.style.setProperty('background-position-x', SPRITE_POSITION_X, 'important');
                            buttonElement.style.setProperty('background-position-y', positionY, 'important');
                            buttonElement.value = buttonValue;
                        }

                        const addIconToButton = (buttonId) => {
                           Object.keys(PRINT_TYPE).forEach((printType) => {
                            if (buttonId.includes(printType.toLowerCase())) {
                               const buttonElement = document.getElementById(buttonId);
                               if (buttonElement) {
                                   applySpriteIcon(buttonElement, PRINT_TYPE[printType]);
                               }
                            }
                           });
                          }

                        const addIconToButtonVer2 = () => {
                            document.querySelectorAll('[id^=custpage_scv_btn]').forEach((button) => {
                                addIconToButton(button.id);
                            });
                            document.querySelectorAll('[id^=secondarycustpage_scv_btn]').forEach((button) => {
                                addIconToButton(button.id);
                            });
                        }

                        // nút secondary (menu thu gọn) được NetSuite render trễ -> thử lại vài lần
                        let retryCount = 0;
                        const addIconWithRetry = () => {
                            addIconToButtonVer2();
                            if (retryCount++ < 10) setTimeout(addIconWithRetry, 500);
                        }

                        addIconWithRetry();

                    </script>`;
        }



        return {
            addIconToButton
        }

    });
