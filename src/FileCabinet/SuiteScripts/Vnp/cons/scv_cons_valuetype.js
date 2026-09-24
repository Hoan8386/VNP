/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  11 Sep 2026         Huy Pham                Init & create file, Deploy chức năng Custom Import, from ms.Tâm(https://app.clickup.com/t/3773072/14yhnhmfg32)
 */
define(['N/format'
],
    (format
    ) => {
        const TYPE = "customlist_scv_import_valuetype";
    
        const Records = {
            PK: {
                ID: 1,
                NAME: "Primary Key"
            },
            Unique: {
                ID: 2,
                NAME: "Unique Import"
            },
            Text: {
                ID: 3,
                NAME: "Text Name"
            },
            Value: {
                ID: 4,
                NAME: "Value/ID"
            },
            Date: {
                ID: 5,
                NAME: "Date"
            },
            CheckBox: {
                ID: 6,
                NAME: "Checkbox"
            },
            TransactionTransformFrom: {
                ID: 7,
                NAME: "TransactionTransform From (Internal ID)"
            }
        }

        const formatDataValueType = (_valueType, _valueInput) =>{
            if(_valueType == Records.Date.ID){
                if(typeof(_valueInput) == "string"){
                    return format.parse({value: _valueInput, type: "date"});
                }
            }
            else if(_valueType == Records.CheckBox.ID){
                let str_valueInput = _valueInput.toString().toLowerCase().trim();
                if(["yes", "1", "true", "t"].includes(str_valueInput)){
                    return true;
                }
                else if(["no", "0", "false", "f"].includes(str_valueInput)){
                    return false;
                }
            }

            return _valueInput;
        }

        return {
            TYPE,
            Records,
            formatDataValueType
        };
        
    });
    