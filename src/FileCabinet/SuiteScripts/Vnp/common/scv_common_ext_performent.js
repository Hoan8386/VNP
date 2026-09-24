/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  03 Mar 2026         Huy Pham			    Init, create file
 */
/**
 * @NApiVersion 2.1
 */
define([
    'N/runtime',
],
    (
        runtime,
    ) => {
        let objProcessPerformance = {};

        const startTime = (_processName) => {
            let val_start = Date.now();

            let processName = _processName || "Undefined Process";

            let currentScript = runtime.getCurrentScript();

            objProcessPerformance[processName] = {
                start: val_start,
                end: null,
                duration: "",
                remainingUsageStart: currentScript.getRemainingUsage(),
                remainingUsageEnd: null,
                usaged: 0,
            }

            return objProcessPerformance[processName];
        }

        const endTime = (_processName, _isLog = true) => {
            let val_end = Date.now();

            let processName = _processName || "Undefined Process";
            let objProcessCurrent = objProcessPerformance[processName];

            objProcessCurrent.end = val_end;

            let val_start = (objProcessPerformance[processName].start ?? 0) * 1;

            let duration = (val_end - val_start) + "ms";

            objProcessCurrent.duration = duration;

            let currentScript = runtime.getCurrentScript();
            objProcessCurrent.remainingUsageEnd = currentScript.getRemainingUsage();
            objProcessCurrent.usaged = objProcessCurrent.remainingUsageStart - objProcessCurrent.remainingUsageEnd;

            if(_isLog){
                try{
                    let logLevel = currentScript.logLevel ? currentScript.logLevel.toLowerCase() : "debug";
                
                    log[logLevel]("Performance Time: " + processName, "Duration: " + duration + ", Usage saved: " + objProcessCurrent.usaged);
                }
                catch(e){}
            }

            return objProcessCurrent;
        }

        return {
            startTime,
            endTime,
        }
    });
