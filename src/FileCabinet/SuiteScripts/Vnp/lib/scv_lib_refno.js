define([],

    function () {
        const addRefNo = (rec, triggerType) => {
            if (triggerType === 'delete') return;

            const slItem = 'item';
            const lc = rec.getLineCount(slItem);
            let refNo = 0;
            for (let i = 0; i < lc; i++) {
                const ref_no = rec.getSublistValue({sublistId: slItem, fieldId: 'custcol_scv_ref_no', line: i}) * 1;
                if (ref_no > refNo) refNo = ref_no;
            }

            refNo += 1;
            for (let i = 0; i < lc; i++) {
                const ref_no = rec.getSublistValue({sublistId: slItem, fieldId: 'custcol_scv_ref_no', line: i});
                if (!ref_no) {
                    rec.setSublistValue({sublistId: slItem, fieldId: 'custcol_scv_ref_no', line: i, value: refNo});
                    refNo += 1;
                }
            }
        }

        return {
            addRefNo: addRefNo,
        };

    });
