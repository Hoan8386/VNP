/**
 * Nội dung: 
 * + File này sử dụng trong client script
 * Version: 1.260918.3
 * =======================================================================================
 *  Date                Author                  Description
 *  08 Jun 2026         Phu Pham                Init & create file
 *  18 Sep 2026         Phu Pham                Fix lỗi không export được image ở header/footer word.
 */

// Polyfill to resolve "Cannot set property namespaceURI of Element" and "parameter 1 is not of type 'Node'" in docxtemplater & docxtemplater-image-module-free
(function() {
    try {
        const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'namespaceURI');
        if (desc && !desc.set) {
          	Object.defineProperty(Element.prototype, 'namespaceURI', {
				get: function() {
					return this._namespaceURI !== undefined ? this._namespaceURI : desc.get.call(this);
				},
				set: function(val) {
					this._namespaceURI = val;
				},
            	configurable: true
          	});
        }
    } catch (e) {
        console.warn("namespaceURI polyfill failed:", e);
    }

    try {
        if (typeof XMLSerializer !== 'undefined') {
            const origSerializeToString = XMLSerializer.prototype.serializeToString;
            XMLSerializer.prototype.serializeToString = function(node) {
                if (!node) return "";
                if (typeof Node !== 'undefined' && node instanceof Node) {
                    return origSerializeToString.call(this, node);
                }
                // Handle non-native DOM nodes (e.g. xmldom Document/Element from imagemodule) safely
                if (typeof node.toString === 'function') {
                    return node.toString();
                }
                return origSerializeToString.call(this, node);
            };
        }
    } catch (e) {
        console.warn("XMLSerializer polyfill failed:", e);
    }
})();

const _scvDocxJS = {
	logoSize: [200, 200],
	modules: [],
    initClient: function() {
        // Kiểm tra an toàn trước khi gọi NS.form
        if (typeof NS !== 'undefined' && NS.form && typeof NS.form.isInited === 'function') {
            if(!NS.form.isInited()){
                setTimeout(() => {this.initClient()}, 100);
                return;
            }
        }
    },

	loadFile: async function(url) {
		return new Promise((resolve, reject) => {
			PizZipUtils.getBinaryContent(url, (error, content) => {
				if (error) {
					reject(error);
				} else {
					resolve(content);
				}
			});
		});
	},

	downloadDocxBuffer: function(options) {
		if(!options.templateBuffer) return;
		const zip = new PizZip(options.templateBuffer);

        // Tự động bổ sung các file .xml.rels còn thiếu (ví dụ word/_rels/header1.xml.rels)
        // để tránh lỗi ImageModule / XMLSerializer serializeToString khi chèn hình ảnh vào header/footer
        this.ensureRelsFiles(zip);

        const docxtemplaterClass = window.docxtemplater || (typeof docxtemplater !== 'undefined' ? docxtemplater : null);
        if (!docxtemplaterClass) {
            console.error("docxtemplater library is not loaded. Please include docxtemplater.js");
            return;
        }

        const doc = new docxtemplaterClass(zip, {
          parser: this.parser,
          modules: this.modules,
          paragraphLoop: true,
          linebreaks: true
        });

        // Render document
        try {
            doc.render(options.objResult);
        } catch (error) {
            console.error("Error during doc.render:", error);
            if (error.properties && Array.isArray(error.properties.errors)) {
                const errorMessages = error.properties.errors.map(function(e) {
                    return e.properties ? e.properties.explanation : e.message;
                }).join("\n");
                console.error("docxtemplater error details:\n" + errorMessages);
            }
            throw error;
        }

        // Generate binary ZIP file
        const outputBlob = doc.getZip().generate({
          type: "blob",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        });

        // Trigger download
        saveAs(outputBlob, options.fileName);

        // Giải phóng bộ nhớ & tránh tích lũy module cho lần xuất file tiếp theo
        this.modules = [];
	},

    ensureRelsFiles: function(zip) {
        if (!zip || !zip.files) return;
        const emptyRelsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
        for (const fileName in zip.files) {
            const match = fileName.match(/^word\/(header\d*|footer\d*|document\d*)\.xml$/);
            if (match) {
                const relsPath = 'word/_rels/' + match[1] + '.xml.rels';
                if (!zip.file(relsPath)) {
                    zip.file(relsPath, emptyRelsXml);
                }
            }
        }
    },

	addImageModule: function(getSizeImage) {
        // Reset mảng modules trước khi thêm mới để tránh trùng lặp khi chạy nhiều lần trên 1 page session
        this.modules = [];

		const imageOptions = {
			centered: false,
			fileType: "docx",
			getImage: function(tagValue) {
				return _scvDocxJS.base64ToBuffer(tagValue);
			},
			getSize: function(imgBuffer, imgValue, tagName, meta) {
				return _scvDocxJS.logoSize;
			}
		};

		if(typeof getSizeImage === "function") {
			imageOptions.getSize = getSizeImage;
		}

        const ImageModuleClass = window.ImageModule || (typeof ImageModule !== 'undefined' ? ImageModule : null);
        if (!ImageModuleClass) {
            console.error("ImageModule library is not loaded. Please include imagemodule-docx.js");
            return;
        }

		const imageModule = new ImageModuleClass(imageOptions);
		this.modules.push(imageModule);
	},

	// Helper functions to convert base64 to Uint8Array for image module safely
    base64ToBuffer: function(dataUrl) {
        try {
            if (!dataUrl) return new Uint8Array(0);

            const parts = dataUrl.split(',');
            const base64 = parts.length > 1 ? parts[1] : parts[0];
            const binaryString = window.atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);

            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        } catch (e) {
            console.error("Error converting base64 to buffer: ", e);
            return new Uint8Array(0); // Trả về buffer trống thay vì làm crash toàn bộ JS
        }
    },

	// Setup pure JavaScript custom parser (evaluates users[0].name, users.length > 3, etc.)
	parser: function(tag) {
		tag = tag.replace(/^\s+|\s+$/g, "");
		if (tag === '.') {
			return {
				get: function(scope) { return scope; }
			};
		}

		let fn;
		try {
			fn = new Function("scope", "with(scope || {}) { try { return " + tag + "; } catch(e) { return ''; } }");
		} catch (err) {
			console.warn("Could not compile expression:", tag, err);
			fn = function(scope) { return scope ? scope[tag] : ''; };
		}

		return {
			get: function(scope) {
				try {
					const val = fn(scope);
					return (val === undefined || val === null) ? "" : val;
				} catch (e) {
					return "";
				}
			}
		};
	},

	// 
	getImageDataFromUrl: async function(url, maxWidth = 200, key) {
		let imgBase64 = await this.getBlobFileUrl(url);
		let dims = await this.getImageDimensions(imgBase64);

		const ratio = maxWidth / dims.width;
		let logoSize = [maxWidth, Math.round(dims.height * ratio)];

		return { base64: imgBase64, size: logoSize, key };
	},
    
    // Tạo blob file từ file URL
	getBlobFileUrl: async function (url) {
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
            }
            
            const blob = await response.blob();
            const reader = new FileReader();
    
            return new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error fetching the URL:', error);
            throw error;
        }
    },

    // Lấy kích thước width và height của hình ảnh (Base64 hoặc URL)
    getImageDimensions: async function(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = function() {
                resolve({
                    width: this.naturalWidth,
                    height: this.naturalHeight
                });
            };
            img.onerror = function(err) {
                reject(new Error("Không thể đọc kích thước hình ảnh."));
            };
            img.src = src;
        });
    }
};

try{
	_scvDocxJS.initClient();
}
catch(e){
	console.log("Error initializing _scvDocxJS:", e.message);
}
