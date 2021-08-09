/*jshint esversion: 6, multistr: true */
/* globals waitForKeyElements, OLCore, OnlineligaFriendlyHelper, OnlineligaTrainingsIntense,
   OnlineligaTransferHelper, OnlineligaTrainingHelper, OnlineligaNLZHelper, OnlineligaBaseHelper,
   OnlineligaMatchdayHelper, OnlineligaLineupHelper */

// ==UserScript==
// @name           Onlineliga Toolbox
// @namespace      https://greasyfork.org/de/users/577453
// @version        0.6.0
// @license        LGPLv3
// @description    Sammlung von Tools for www.onlineliga.de (OFA)
// @author         KnutEdelbert
// @match          https://www.onlineliga.de
// @match          https://www.onlineliga.at
// @match          https://www.onlineliga.ch
// @require        https://greasyfork.org/scripts/424909-onlineligatoolboxdetector/code/OnlineligaToolboxDetector.user.js
// @require        https://greasyfork.org/scripts/424896-olcore/code/OLCore.user.js
// @require        https://greasyfork.org/scripts/425292-onlineligafriendlyhelper/code/OnlineligaFriendlyHelper.user.js
// @require        https://greasyfork.org/scripts/425296-onlineligatransferhelper/code/OnlineligaTransferHelper.user.js
// @require        https://greasyfork.org/scripts/427987-onlineligamatchdayhelper/code/OnlineligaMatchdayHelper.user.js
// @require        https://greasyfork.org/scripts/424399-onlineliga-trainingshelfer/code/Onlineliga%20-%20Trainingshelfer.user.js
// @require        https://greasyfork.org/scripts/425413-onlineligatraininghelper/code/OnlineligaTrainingHelper.user.js
// @require        https://greasyfork.org/scripts/429614-onlineligalineuphelper/code/OnlineligaLineupHelper.user.js
// @require        https://greasyfork.org/scripts/425709-onlineliganlzhelper/code/OnlineligaNLZHelper.user.js?011
// @require        https://greasyfork.org/scripts/425710-onlineligabasehelper/code/OnlineligaBaseHelper.user.js
// @grant          GM_addStyle
// @grant          GM_setValue
// @grant          GM_getValue
// @grant          GM_deleteValue
// @grant          GM_listValues
// @grant          GM_setClipboard
// ==/UserScript==

/*********************************************
 * 0.1.0 11.04.2021 Release
 * 0.2.0 12.04.2021 + OnlineligaTopPlayer
 * 0.3.0 12.04.2021 + TrainingsIntense
 * 0.4.0 25.04.2021 + OnlineligaFriendlyHelper
                    + OnlineligaTransferHelper
                    + OnlineligaTrainingHelper
 * 0.5.0 29.04.2021 + OnlineligaNLZHelper
                    + OnlineligaBaseHelper
                    + OnlineligaTransferHelper - Zusatzinfos
 * 0.5.1 09.05.2021 Hotfix OLCore
 * 0.5.2 09.05.2021 YouthPlayer revelation
 * 0.5.3 24.06.2021 add support for *.at and *.ch
 * 0.5.4 04.07.2021 + OnlineligaMatchdayHelper (replaces OnlineligaTopPlayer)
 * 0.6.0 21.07.2021 + OnlineligaLineupHelper
 *********************************************/
(function(){

    const revealYouthPlayer = false;

    const enableFriendlyHelper = true;
    const enableTrainingsIntense = true;
    const enableTransferHelper = true;
    const enableTrainingHelper = true;
    const enableNLZHelper = true;
    const enableBaseHelper = true;
    const enableMatchdayHelper = true;
    const enableLineupHelper = true;

    if (enableFriendlyHelper && window.OnlineligaFriendlyHelper){
        OnlineligaFriendlyHelper.init();
    }

    if (enableTrainingsIntense && window.OnlineligaTrainingsIntense){
        OnlineligaTrainingsIntense.init();
    }

    if (enableTrainingHelper && window.OnlineligaTrainingHelper){
        OnlineligaTrainingHelper.init();
    }

    if (enableTransferHelper && window.OnlineligaTransferHelper){
        OnlineligaTransferHelper.init();
    }

    if (enableNLZHelper && window.OnlineligaNLZHelper){
        OnlineligaNLZHelper.init(revealYouthPlayer);
    }

    if (enableBaseHelper && window.OnlineligaBaseHelper){
        OnlineligaBaseHelper.init();
    }

    if (enableLineupHelper && window.OnlineligaLineupHelper){
        OnlineligaLineupHelper.init();
    }

    if (enableMatchdayHelper && window.OnlineligaMatchdayHelper){
        OnlineligaMatchdayHelper.init();
    }

})();