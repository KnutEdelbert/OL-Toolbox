/* jshint esversion: 10, multistr: true */
/* globals OLCore */

// ==UserScript==
// @name           OnlineligaTrainingHelper
// @namespace      https://greasyfork.org/de/users/577453
// @version        0.1.0
// @license        LGPLv3
// @description    Helfer für das Training bei www.onlineliga.de (OFA)
// @author         KnutEdelbert
// @match          https://www.onlineliga.de
// @require        https://greasyfork.org/scripts/424896-olcore/code/OLCore.user.js
// ==/UserScript==

/*********************************************
 * 0.1.0 22.04.2021 Release
 *********************************************/
(function() {
    'use strict';

    const $ = unsafeWindow.jQuery;
    const api = OLCore.Api;

    function groupInfo(){
        const trainingData = $("div#training-timetable-week_plan");

        const matchColumn = trainingData.find('div.ol-training-day[data-day = "saturday0"]').find('div.ol-training-day-column[data-day = "saturday0"]:first-child > div.ol-training-weektable-matchblock[data-matchid]');

        const playerApps = {};

        const matchUsages = matchColumn.find('div.ol-training-weektable-matchblock-usages-row.ol-training-weektable-matchblock-usages-row-other');
        matchUsages.each(function(i,el){
            const spanClick = $(el).find('span.player-quick-overview-launcher').attr("onclick");
            const matchPlayerIdMatch = spanClick.match(/{'?playerId'?:\s*(\d+)\s*}/);
            const minutes = parseInt($(el).children(".ol-training-weektable-matchblock-usages-cell-minutes").text(),10) || 0;
            if (matchPlayerIdMatch){
                const playerId = parseInt(matchPlayerIdMatch[1],10);
                if (!playerApps[playerId]){
                    playerApps[playerId] = [0,0];
                }
                playerApps[playerId][0] += minutes;
            }
        });

        const friendlyColumn = trainingData.find('div.ol-training-day[data-day = "friendly"]').find('div.ol-training-day-column[data-day = "friendly"]:first-child > div.ol-training-weektable-matchblock[data-matchState]');
        const friendlyUsages = friendlyColumn.find('div.ol-training-weektable-matchblock-usages-row.ol-training-weektable-matchblock-usages-row-other');
        friendlyUsages.each(function(i,el){
            const spanClick = $(el).find('span.player-quick-overview-launcher').attr("onclick");
            const friendlyPlayerIdMatch = spanClick.match(/{'?playerId'?:\s*(\d+)\s*}/);
            const minutes = parseInt($(el).children(".ol-training-weektable-matchblock-usages-cell-minutes").text(),10) || 0 ;
            if (friendlyPlayerIdMatch){
                const playerId = parseInt(friendlyPlayerIdMatch[1],10);
                if (!playerApps[playerId]){
                    playerApps[playerId] = [0,0];
                }
                playerApps[playerId][1] += minutes;
            }
        });

        $("div#allGroupRows").find("div.row.group-row").each(function(i,row){
            const playerId = $(row).attr("data-playerid");
            if (playerApps[playerId]){
                const pa = playerApps[playerId];
                $(row).find("div.training-group-lf-mark").before(`<div style="display:inline-block;position:absolute;right:60px;">${pa[0]||0}'+${pa[1]||0}'</div>`);
            }
        });
    }

    function init(){
        OLCore.waitForKeyElements (
            "div.trainingEditGroup.ol-overlay-window-content",
            groupInfo
        );
    }

    if (!window.OLToolboxActivated) {
       init();
    } else {
        window.OnlineligaTrainingHelper = {
            init : init
        };
    }

})();

