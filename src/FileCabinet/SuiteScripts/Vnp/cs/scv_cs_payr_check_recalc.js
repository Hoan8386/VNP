/**
 *
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define([], () => {

    const pageInit = (scriptContext) => {
        try {
            if (scriptContext.mode !== 'create') return;

            const params = new URLSearchParams(window.location.search);
            if (params.get('check_recalc') !== 'T') return;

            const recalcButton = document.getElementById('recalc');
            if (recalcButton) recalcButton.click();
        } catch (e) {
            console.log('pageInit scv_cs_payr_check_recalc:' + JSON.stringify(e));
        }
    };

    return {pageInit};
});
