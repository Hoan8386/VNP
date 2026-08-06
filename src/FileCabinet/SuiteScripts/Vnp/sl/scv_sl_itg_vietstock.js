/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['../common/scv_common_itg_vietstock.js'],

    (vietStock) => {

        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        const onRequest = (scriptContext) => {
            let parameters = scriptContext.request.parameters;
            let type = parameters.type;
            let projectId = parameters.projectId;
            let stockCode = parameters.stockCode;
            let marketPriceId = null;

            try {
                if (type === vietStock.SyncType.STOCK_TRADING) {
                    let config = vietStock.getVietstockConfigByQuery();
                    marketPriceId = vietStock.syncStockTrading(config.baseurl, {}, stockCode, projectId);
                }
            } catch (e) {
                log.error('onRequest error', e);
            }

            scriptContext.response.setHeader({name: 'Content-Type', value: 'application/json'});
            scriptContext.response.write(JSON.stringify({marketPriceId}));
        }

        return {onRequest}

    });