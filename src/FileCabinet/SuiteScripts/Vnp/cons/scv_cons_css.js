/**
 * Nội dung: 
 * =======================================================================================
 *  Date                Author                  Description
 *  08 Nov 2024         Huy Pham			    Init, create file, move from Adv
 */
define(['./scv_cons_color.js'],
    function(constColor) {
        const LOADING = `
        .scvLoader {
            width: 100px; height: 100px; 
            border: 8px solid ${constColor.GREY[300]}; 
            border-bottom-color: ${constColor.LIGHT_BLUE[700]};
            border-radius: 50%; display: inline-block; box-sizing: border-box; position: fixed;
            transform: translate(-50%, -50%); animation: scvRotationLoading 1s linear infinite;
        }
        .scvProgessStatus {
            position: fixed; top: 50%; left: 50%; font-size: 12px; transform: translate(-50%, -50%);
        }
        .scvMainLoader {
            position: fixed; top: 0; left: 0; height: 100%; width: 100%; z-index: 9999;
            display: flex; justify-content:center; align-items:center; 
            flex-direction: column; background-color: rgba(255, 255, 255, 0.85);
        }
        @keyframes scvRotationLoading {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }`;
        return {
            LOADING
        };
        
    });
    