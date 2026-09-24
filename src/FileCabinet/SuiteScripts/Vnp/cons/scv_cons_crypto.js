/**
 * Nội dung: Xử lý các crypto
 * + N/crypto/random - random.generateUUID(): (12 Jun 2025) đang tốn Governance 5 unit cho mỗi lần,
 *          chứ không phải none như NS mô tả
 * Version: 1.260528.7
 * =======================================================================================
 *  Date                Author                  Description
 *  12 Jun 2025         Huy Pham                Init & create file
 */
define([
    '../olib/crypto-js.js',
],
function(
    CryptoJS,
) {
	
	const RECORDS = {
        _N:{
            pgp: null,
            crypto: null,
        },
    }

    const initModulServer = () =>{
        require(['N/pgp', 'N/crypto'], function (_pgp, _crypto)
        {
            RECORDS._N.pgp = RECORDS._N.pgp ?? _pgp;
            RECORDS._N.crypto = RECORDS._N.crypto ?? _crypto;
        });
	}

    /**
     * 
     * @param {*} _secretKey : _secretKey.public (M)
     * @param {*} _content (M)
     * @returns 
     */
    const encryptPGP = (_secretKey = {
        public: "",
        private: "",
        private_pwd: "",
    }, _content) =>{

        let N_pgp = RECORDS._N.pgp;
        if(!N_pgp){
            initModulServer();
            N_pgp = RECORDS._N.pgp;
        }

        let msgData = N_pgp.createMessageData({
            content: _content
        });

        let optionEncrypt = {
            encryptionKeys: N_pgp.loadKeyFromSecret({
                secret: { 
                    scriptId: _secretKey.public
                }
            })
        };
        if(!!_secretKey.private && !!_secretKey.private_pwd){
            optionEncrypt.signingKeys = N_pgp.loadKeyFromSecret({
                secret: {
                    scriptId: _secretKey.private
                },
                password: {
                    scriptId: _secretKey.private_pwd
                }
            })
        }

        let msgEncrypt = msgData.encrypt(optionEncrypt);

        return msgEncrypt.asArmored();
    }

    /**
     * 
     * @param {*} _secretKey : _secretKey.private (M), _secretKey.private_pwd (M)
     * @param {*} _contentEncrypt (M) 
     * @param {*} _config (O)
     * @returns 
     */
    const decryptPGP = (_secretKey = {
        public: "",
        private: "",
        private_pwd: "",
    }, 
    _contentEncrypt, _config) => {

        let N_pgp = RECORDS._N.pgp;
        if(!N_pgp){
            initModulServer();
            N_pgp = RECORDS._N.pgp;
        }

        let msgParse = N_pgp.parseMessage({
            value: _contentEncrypt
        });

        let optionDecrypt = {
            decryptionKeys: N_pgp.loadKeyFromSecret({
                secret: {
                    scriptId: _secretKey.private
                },
                password: {
                    scriptId: _secretKey.private_pwd
                }
            })
        };
        if(!!_secretKey.public){
            optionDecrypt.verificationKeys = N_pgp.loadKeyFromSecret({
                secret: { 
                    scriptId: _secretKey.public
                }
            });
        }
        if(!!_config){
            optionDecrypt.config = N_pgp.createConfig(_config)
        }

        let msgDecrypt = msgParse.decrypt(optionDecrypt);

        return msgDecrypt.getText()
    }

    const cipherFinal = (optionSecretKey, {
        input = "",

        inputEncoding = "",
        outputEncoding = "",
        algorithm = "",
        padding = "",
    }) =>{
        let N_crypto = RECORDS._N.crypto;

        //#region Default Value
        if(!N_crypto){
            initModulServer();
            N_crypto = RECORDS._N.crypto;
        }

        let objCipher = {
            key: getSecretKey(optionSecretKey),
            algorithm: algorithm || N_crypto.EncryptionAlg.AES,
            padding: padding || N_crypto.Padding.PKCS5Padding,
        };
        let objUpdate = {
            input: input,
            inputEncoding: inputEncoding || N_crypto.Encoding.UTF_8,
        };
        let objFinal = {
            outputEncoding: outputEncoding || N_crypto.Encoding.HEX,
        };
        //#endregion

        let cipher = N_crypto.createCipher(objCipher);
        cipher.update(objUpdate);

        return cipher.final(objFinal);
    }

    const decipherFinal = (optionSecretKey, {
        iv = "",
        input = "",

        inputEncoding = "",
        outputEncoding = "",
        algorithm = "",
        padding = "",
    }) =>{
        let N_crypto = RECORDS._N.crypto;

        //#region Default Value
        if(!N_crypto){
            initModulServer();
            N_crypto = RECORDS._N.crypto;
        }

        let objDecipher = {
            iv: iv,
            key: getSecretKey(optionSecretKey),
            algorithm: algorithm || N_crypto.EncryptionAlg.AES,
            padding: padding || N_crypto.Padding.PKCS5Padding,
        };
        let objUpdate = {
            input: input,
            inputEncoding: inputEncoding || N_crypto.Encoding.HEX
        };
        let objFinal = {
            outputEncoding: outputEncoding || N_crypto.Encoding.UTF_8,
        }
        //#endregion
        
        let decipher = N_crypto.createDecipher(objDecipher);

        decipher.update(objUpdate);

        return decipher.final(objFinal);
    }

    const hashDigest = ({
        input = "",

        algorithm = "",
        inputEncoding = "",
        outputEncoding = "",
    }) =>{
        let N_crypto = RECORDS._N.crypto;

        if(!N_crypto){
            initModulServer();
            N_crypto = RECORDS._N.crypto;
        }

        let objHash = {
            algorithm: algorithm || N_crypto.HashAlg.SHA256
        };
        let objUpdate = {
            input: input,
            inputEncoding: inputEncoding || N_crypto.Encoding.UTF_8,
        };
        let objDigest = {
            outputEncoding: outputEncoding || "BASE_64"
        }

        let objResHash = N_crypto.createHash(objHash);

        objResHash.update(objUpdate);

        return objResHash.digest(objDigest);
    }

    const hmacDigest = (optionSecretKey, {
        input = "",

        algorithm = "",
        inputEncoding = "",
        outputEncoding = "",
    }) =>{
        let N_crypto = RECORDS._N.crypto;

        if(!N_crypto){
            initModulServer();
            N_crypto = RECORDS._N.crypto;
        }

        let objHmac = {
            key: getSecretKey(optionSecretKey),
            algorithm: algorithm || N_crypto.HashAlg.SHA256
        };
        let objUpdate = {
            input: input,
            inputEncoding: inputEncoding || N_crypto.Encoding.UTF_8,
        };
        let objDigest = {
            outputEncoding: outputEncoding || "BASE_64"
        }

        let objResHmac = N_crypto.createHmac(objHmac);

        objResHmac.update(objUpdate);

        return objResHmac.digest(objDigest);
    }

    const getSecretKey = (optionSecretKey) =>{
        optionSecretKey.encoding = optionSecretKey.encoding || "UTF_8";

        return RECORDS._N.crypto.createSecretKey(optionSecretKey);
    }
    
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * HuyPQ 20260528 TO-DO: Phần này sau sẽ sẽ chuyển sang dùng Cipher/Decipher
     * @param {*} value 
     * @param {*} isDecrypt 
     * @param {*} keySecret 
     * @returns 
     */
    const handlePasswordsSafely = (value, isDecrypt, keySecret) => {
		if(!value) return '';

		if(!isDecrypt) {
			return CryptoJS.AES.encrypt(value, keySecret).toString();
		}

		let decrypted = CryptoJS.AES.decrypt(value, keySecret);

		return decrypted.toString(CryptoJS.enc.Utf8);
	}

    const hasCurlyBraces = (value = "") => {
        return /[{}]/.test(value);
    }

    const uuidv7 = () => {
        let timestamp = Date.now();
        
        let tsHex = timestamp.toString(16).padStart(12, '0');

        function randomHex(length) {
            let result = '';
            for (let i = 0; i < length; i++) {
                result += Math.floor(Math.random() * 16).toString(16);
            }
            return result;
        }

        let part1 = tsHex.substring(0, 8);
        let part2 = tsHex.substring(8, 12);

        let part3 = '7' + randomHex(3);
        
        let variant = (8 + Math.floor(Math.random() * 4)).toString(16);
        let part4 = variant + randomHex(3);

        let part5 = randomHex(12);

        return part1 + '-' + part2 + '-' + part3 + '-' + part4 + '-' + part5;
    }

    return {
		RECORDS,
        initModulServer,
        encryptPGP,
        decryptPGP,
        cipherFinal,
        decipherFinal,
        hashDigest,
        hmacDigest,

        generateUUID,
        uuidv7,
        handlePasswordsSafely,
        hasCurlyBraces,
    };
    
});
