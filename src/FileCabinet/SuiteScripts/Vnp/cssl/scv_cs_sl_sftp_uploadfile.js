/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([],

    function () {

        /**
         * Function to be executed after page is initialized.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
         *
         * @since 2015.2
         */
        function pageInit(scriptContext) {

        }

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */
        function saveRecord(scriptContext) {
            let loadingMessage = document.createElement('div');
            loadingMessage.id = 'loadingMessage';
            loadingMessage.style.position = 'fixed';
            loadingMessage.style.top = '50%';
            loadingMessage.style.left = '50%';
            loadingMessage.style.transform = 'translate(-50%, -50%)';
            loadingMessage.style.zIndex = '1000';
            loadingMessage.style.backgroundColor = 'white';
            loadingMessage.style.padding = '20px';
            loadingMessage.style.border = '1px solid #000';
            loadingMessage.style.borderRadius = '15px'; // Bo góc cho hình vuông
            loadingMessage.style.display = 'flex';
            loadingMessage.style.alignItems = 'center';
            loadingMessage.style.gap = '10px'; // Khoảng cách giữa vòng xoay và chữ "Please wait"

            // Tạo phần tử vòng xoay
            let spinner = document.createElement('div');
            spinner.style.width = '24px';
            spinner.style.height = '24px';
            spinner.style.border = '4px solid #ccc';
            spinner.style.borderTop = '4px solid #000';
            spinner.style.borderRadius = '50%';
            spinner.style.animation = 'spin 1s linear infinite';

            // Thêm vòng xoay và thông báo vào trong loadingMessage
            loadingMessage.appendChild(spinner);
            loadingMessage.innerHTML += 'Please wait...';

            // Thêm loadingMessage vào trang
            document.body.appendChild(loadingMessage);

            // CSS cho hiệu ứng xoay
            let style = document.createElement('style');
            style.innerHTML = `
			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}
		`;
            document.head.appendChild(style);
            return true;
        }

        return {
            pageInit: pageInit,
            saveRecord: saveRecord
        };

    });
