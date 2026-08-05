/**
 * @NApiVersion 2.1
 */
define(['N/config'],

    (config) => {

        const userPreferences = () => {
            let params = {};
            let loadConfig = config.load({
                type: config.Type.USER_PREFERENCES
            });
            params.dateformat = loadConfig.getValue({fieldId: 'DATEFORMAT'});
            params.timezone = loadConfig.getValue({fieldId: 'TIMEZONE'});
            return params;
        }

        return {userPreferences}

    });
