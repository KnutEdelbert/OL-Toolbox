/*jshint esversion: 8, multistr: true */
/* globals waitForKeyElements, OLCore */

// ==UserScript==
// @name           OnlineligaFriendlyHelper
// @namespace      https://greasyfork.org/de/users/577453
// @version        0.1.9
// @license        LGPLv3
// @description    Zusatzinfos für Friendlies für www.onlineliga.de (OFA)
// @author         KnutEdelbert
// @match          https://www.onlineliga.de
// @require        https://greasyfork.org/scripts/424896-olcore/code/OLCore.user.js
// @grant          GM_getValue
// @grant          GM_setValue
// @grant          GM_listValues
// @grant          GM_setClipboard
// ==/UserScript==

/*********************************************
 * 0.1.0 20.04.2021 Release
 * 0.1.1 21.04.2021 Friendly Blocker
 * 0.1.2 01.05.2021 Bugfix: Error on incomplete lineups
 * 0.1.3 18.05.2021 Add L-Zahl (MW Aufstellung/MW Liga)
 * 0.1.4 24.05.2021 L-Zahl for actual League Lineup
 * 0.1.5 03.06.2021 Bugfix: correct L-Zahl if player is not in squad
 * 0.1.6 08.07.2021 + freeText for Friendly Overview
                    + show free weeks
 * 0.1.7 12.07.2021 - show free weeks
                    + copy free weeks to clipboard
 * 0.1.8 13.07.2021 Bugfix: Handle L-Number, if team has no last league match (new user)
 * 0.1.9 14.07.2021 Bugfix: L-Number display
 *********************************************/
(function() {
    'use strict';
    const $ = unsafeWindow.jQuery;
    const api = OLCore.Api;
    const uid = OLCore.Base.userId;

    async function showTeamInfo(event){
        let userId;
        const parentDiv = event.currentTarget.parentNode;
        const offerRow = parentDiv.parentNode.parentNode;
        const spanClick = $(parentDiv).find('span.ol-team-name').attr("onclick");
        const userIdMatch = spanClick.match(/{\s*'?userId'?\s*:\s*(\d+)\s*}/);
        let lineup11Value = 0;
        let lineupAllValue = 0;

        if (userIdMatch){
            userId = userIdMatch[1];

            const squadData = await OLCore.Api.getSquad(userId);

            const F11Value = squadData.friendlyLineup().map(l => l.value).reduce((a,b) => a+b,0);
            const leagueValue = squadData.leagueLineup().map(l => l.value).reduce((a,b) => a+b,0);
            const average11Value = Math.round(F11Value/11);
            const averageTeam = Math.round(squadData.playerArr.map(l => l.value).reduce((a,b) => a+b)/squadData.playerArr.length);
            const averagePercent = Math.round(average11Value/averageTeam*100);

            const lastMatch = await getLastMatch(userId);
            const lastLineupValue = lastMatch ? squadData.playerArr
            .filter(p => lastMatch.lineup.map(l => l.playerId).includes(p.id))
            .map(a => a.value)
            .reduce((pv, cv) => pv + cv, 0) : 0;

            $(`<div style="font-size:12px;margin-left:20px;white-space:nobreak;" class="OnlineligaFriendlyInfoDisplay">
                <span style="white-space:nowrap;" title="&Oslash; MW Aufstellung zu &Oslash; MW Team (&quot;T-Zahl&quot;)">T: ${averagePercent}%</span>
                <br/><span style="white-space:nowrap;" title="MW Aufstellung zu MW letzte Ligaaufstellung (aktuelle Ligaaufstellung) (&quot;L-Zahl&quot;)">L: ${Math.round(F11Value*100/lastLineupValue)}% (${Math.round(F11Value*100/leagueValue)}%)</span>
                </div>`).appendTo($(offerRow).children().eq(1));

        }
    }

    async function getLastMatch(userId){
        const lastMatchSeason = OLCore.Base.matchDay === 1 ? OLCore.Base.season - 1: OLCore.Base.season;
        const teamHistory = await api.getTeamHistory(userId, lastMatchSeason);
        if (!teamHistory.lastMatch){
            return null;
        }
        const matchLineup = await api.getMatchLineup(teamHistory.lastMatch.season, teamHistory.lastMatch.id, userId);

        return matchLineup;
    }

    async function showSquadInfo(teamView){
        if ($("div.OnlineligaFriendlyInfoDisplay2").length){
            return;
        }
        let lineup11Value = 0;
        let squadValue = 0;
        let squadSize = 0;
        const userId = teamView ? uid : parseInt(window.location.href.match(/userId=(\d+)/)[1],10);
        const squadData = await OLCore.Api.getSquad(userId);

        const F11Value = squadData.friendlyLineup().map(l => l.value).reduce((a,b) => a+b,0);
        const leagueValue = squadData.leagueLineup().map(l => l.value).reduce((a,b) => a+b,0);
        const average11Value = Math.round(F11Value/11);
        const averageTeam = Math.round(squadData.playerArr.map(l => l.value).reduce((a,b) => a+b)/squadData.playerArr.length);
        const averagePercent = Math.round(average11Value/averageTeam*100);


        const header = $("div.ol-scroll-overlay-parent.menu-scroll-wrapper");
        header.append(`<div style="font-size:12px;margin-left:20px;display:inline-block;" class="OnlineligaFriendlyInfoDisplay2">
                <span style="white-space:nowrap;">F11-schnitt: ${OLCore.euroValue(average11Value)} <br/> Team-schnitt: ${OLCore.euroValue(averageTeam)} <br/> F11 / Team: ${averagePercent}%</span></div>`);

        const lastMatch = await getLastMatch(userId);
        const lastLineupValue = lastMatch ? squadData.playerArr
        .filter(p => lastMatch.lineup.map(l => l.playerId).includes(p.id))
        .map(a => a.value)
        .reduce((pv, cv) => pv + cv, 0) : 0;

        header.append(`<div style="font-size:12px;margin-left:20px;display:inline-block;" class="OnlineligaFriendlyInfoDisplay2">
                 <span style="white-space:nowrap;">MW letztes Liga-Spiel: ${OLCore.euroValue(lastLineupValue)} <br/> F11 / Letztes Ligaspiel (L-Zahl): ${Math.round(F11Value*100/lastLineupValue)}% (${Math.round(F11Value*100/leagueValue)}%)</span></div>`);

    }

    async function showInfo(){

        if ($("div.ol-team-settings-pitch-wrapper").length === 0){
            return;
        }

        const userIdCont = $("div#matchdayresult > div.ol-page-content > div.row.ol-paragraph-2 > div > a[onclick]");
        const userId0 = parseInt($(userIdCont[0]).attr("onclick").match(/\s*'?userId'?\s*:\s*(\d+)\s*}/)[1], 10);
        const userId1 = parseInt($(userIdCont[1]).attr("onclick").match(/\s*'?userId'?\s*:\s*(\d+)\s*}/)[1], 10);

        const squadData0 = await api.getSquad(userId0);
        const squadData1 = await api.getSquad(userId1);

        const teamData0 = {
                "teamAvg" : Math.round(squadData0.teamVal / squadData0.playerArr.length),
                "top11" : squadData0.playerArr
            .sort((a,b) => b.value - a.value)
            .slice(0,11)
            .map(a => a.value)
            .reduce((pv, cv) => pv + cv, 0),
                "lineupVal": 0
        };
        const teamData1 = {
                "teamAvg" : Math.round(squadData1.teamVal / squadData1.playerArr.length),
                "top11" : squadData1.playerArr
            .sort((a,b) => b.value - a.value)
            .slice(0,11)
            .map(a => a.value)
            .reduce((pv, cv) => pv + cv, 0),
                "lineupVal": 0
        };

        const pitches = $("div#matchContent div.ol-team-settings-pitch-position-wrapper");
        const pitch0 = pitches[0];
        const pitch1 = pitches[1];
        const players0 = [];
        const players1 = [];

        $(pitch0).find("div.ol-pitch-position").each(function(i,e){
            const playerId = parseInt(
                e.parentNode.localName === "a" ?
                (e.parentNode.hasAttribute("onclick") ? $(e.parentNode).attr("onclick").match(/\s*'?playerId'?\s*:\s*(\d+)\s*}/)[1] : 0) :
                $(e).find("div[data-player-id]").attr("data-player-id"),10);
            if (playerId > 0 && squadData0.playerObj[playerId]){
                players0.push(playerId);
                teamData0.lineupVal += squadData0.playerObj[playerId].value || 0;
            }
        });
        $(pitch1).find("div.ol-pitch-position").each(function(i,e){
            const playerId = parseInt(
                e.parentNode.localName === "a" ?
                (e.parentNode.hasAttribute("onclick") ? $(e.parentNode).attr("onclick").match(/\s*'?playerId'?\s*:\s*(\d+)\s*}/)[1] : 0) :
                $(e).find("div[data-player-id]").attr("data-player-id"),10);
            if (playerId > 0 && squadData1.playerObj[playerId]){
                players1.push(playerId);
                teamData1.lineupVal += squadData1.playerObj[playerId].value || 0;
            }
        });

        teamData0.lineupAvg = Math.round(teamData0.lineupVal/11,0);
        teamData0.top11Avg = Math.round(teamData0.top11/11,0);
        teamData0.lineupPercent11 = Math.round(teamData0.lineupVal*100/teamData0.top11,0);
        teamData0.lineupPercentAll = Math.round(teamData0.lineupVal*100/squadData0.teamVal,0);
        teamData0.lineupPercentAvg11 = Math.round(teamData0.lineupAvg*100/teamData0.top11Avg,0);
        teamData0.lineupPercentT = Math.round(teamData0.lineupAvg*100/teamData0.teamAvg,0);

        teamData1.lineupAvg = Math.round(teamData1.lineupVal/11,0);
        teamData1.top11Avg = Math.round(teamData1.top11/11,0);
        teamData1.lineupPercent11 = Math.round(teamData1.lineupVal*100/teamData1.top11,0);
        teamData1.lineupPercentAll = Math.round(teamData1.lineupVal*100/squadData1.teamVal,0);
        teamData1.lineupPercentAvg11 = Math.round(teamData1.lineupAvg*100/teamData1.top11Avg,0);
        teamData1.lineupPercentT = Math.round(teamData1.lineupAvg*100/teamData1.teamAvg,0);

        $(pitch0).append(`<div class="lineupinfo_percentLineup" style="top: 0%" title="&Oslash; MW Aufstellung zu &Oslash; MW Kader">${teamData0.lineupPercentT}%</div>`);
        $(pitch0).append(`<div class="lineupinfo_percentLineup" style="top: 5%" title="MW Aufstellung zu MW Top 11 (nach MW)">${teamData0.lineupPercent11}%</div>`);
        $(pitch0).append(`<div class="lineupinfo_percentLineup" style="top: 10%" title="MW Aufstellung zu MW Kader">${teamData0.lineupPercentAll}%</div>`);
        $(pitch0).append(`<div class="lineupinfo_percentLineup" style="top: 0%; right:0%;" title="&Oslash; MW Team">${OLCore.euroValue(teamData0.teamAvg)}</div>`);
        $(pitch0).append(`<div class="lineupinfo_percentLineup" style="top: 5%; right:0%;" title="&Oslash; MW Aufstellung">${OLCore.euroValue(teamData0.lineupAvg)}</div>`);
        $(pitch0).append(`<div class="lineupinfo_percentLineup" style="top: 10%; right:0%;" title="&Oslash; MW Top 11 (nach MW)">${OLCore.euroValue(teamData0.top11Avg)}</div>`);
        $(pitch0).append(`<div class="lineupinfo_percentLineup" style="top: 15%; right:0%;" title="MW Aufstellung">${OLCore.euroValue(teamData0.lineupVal)}</div>`);
        $(pitch0).append(`<div class="lineupinfo_percentLineup" style="top: 20%; right:0%;" title="MW Team">${OLCore.euroValue(squadData0.teamVal)}</div>`);

        $(pitch1).append(`<div class="lineupinfo_percentLineup" style="top: 0%" title="&Oslash; MW Aufstellung zu &Oslash; MW Kader">${teamData1.lineupPercentT}%</div>`);
        $(pitch1).append(`<div class="lineupinfo_percentLineup" style="top: 5%" title="MW Aufstellung zu MW Top 11 (nach MW)">${teamData1.lineupPercent11}%</div>`);
        $(pitch1).append(`<div class="lineupinfo_percentLineup" style="top: 10%" title="MW Aufstellung zu MW Kader">${teamData1.lineupPercentAll}%</div>`);
        $(pitch1).append(`<div class="lineupinfo_percentLineup" style="top: 0%; right:0%;" title="&Oslash; MW Team">${OLCore.euroValue(teamData1.teamAvg)}</div>`);
        $(pitch1).append(`<div class="lineupinfo_percentLineup" style="top: 5%; right:0%;" title="&Oslash; MW Aufstellung">${OLCore.euroValue(teamData1.lineupAvg)}</div>`);
        $(pitch1).append(`<div class="lineupinfo_percentLineup" style="top: 10%; right:0%;" title="&Oslash; MW Top 11 (nach MW)">${OLCore.euroValue(teamData1.top11Avg)}</div>`);
        $(pitch1).append(`<div class="lineupinfo_percentLineup" style="top: 15%; right:0%;" title="MW Aufstellung">${OLCore.euroValue(teamData1.lineupVal)}</div>`);
        $(pitch1).append(`<div class="lineupinfo_percentLineup" style="top: 20%; right:0%;" title="MW Team">${OLCore.euroValue(squadData1.teamVal)}</div>`);


        const teamInfo0 = await api.getTeamInfo(userId0);
        const teamInfo1 = await api.getTeamInfo(userId1);
        teamInfo0.lastMatch = teamInfo0.lastMatch || {};
        teamInfo1.lastMatch = teamInfo1.lastMatch || {};
        const matchLineup0 = await api.getMatchLineup(teamInfo0.lastMatch.season, teamInfo0.lastMatch.id, userId0);
        const matchLineup1 = await api.getMatchLineup(teamInfo1.lastMatch.season, teamInfo1.lastMatch.id, userId1);

        const missing0 = matchLineup0.lineup.filter(m => !squadData0.playerArr.map(p => p.id).includes(m.playerId)).map(m => m.playerId);
        const missing1 = matchLineup1.lineup.filter(m => !squadData1.playerArr.map(p => p.id).includes(m.playerId)).map(m => m.playerId);

        let lastLineupValue0 = squadData0.playerArr
        .filter(p => matchLineup0.lineup.map(l => l.playerId).includes(p.id))
        .map(a => a.value)
        .reduce((pv, cv) => pv + cv, 0);

        for (const m of missing0){
            const po = await OLCore.Api.getPlayerOverview(m);
            lastLineupValue0 += po.marketValue;
        }

        let lastLineupValue1 = squadData1.playerArr
        .filter(p => matchLineup1.lineup.map(l => l.playerId).includes(p.id))
        .map(a => a.value)
        .reduce((pv, cv) => pv + cv, 0);

        for (const m of missing1){
            const po = await OLCore.Api.getPlayerOverview(m);
            lastLineupValue1 += po.marketValue;
        }

        const actLeagueLineupValue0 = squadData0.leagueLineup()
        .map(a => a.value)
        .reduce((pv, cv) => pv + cv, 0);

        const actLeagueLineupValue1 = squadData1.leagueLineup()
        .map(a => a.value)
        .reduce((pv, cv) => pv + cv, 0);

        const L0 = [matchLineup0.lineup.length ? Math.round(teamData0.lineupVal*100/lastLineupValue0)+'%' : '-', Math.round(teamData0.lineupVal*100/actLeagueLineupValue0)+'%'];
        const L1 = [matchLineup1.lineup.length ? Math.round(teamData1.lineupVal*100/lastLineupValue1)+'%' : '-', Math.round(teamData1.lineupVal*100/actLeagueLineupValue1)+'%'];

        $(pitch0).append(`<div class="lineupinfo_percentLineup" style="top: 15%" title="MW Aufstellung zu MW letzte Ligaaufstellung (aktuelle Ligaaufstellung) (L-Zahl)">${L0[0]} (${L0[1]})</div>`);
        $(pitch1).append(`<div class="lineupinfo_percentLineup" style="top: 15%" title="MW Aufstellung zu MW letzte Ligaaufstellung (aktuelle Ligaaufstellung) (L-Zahl)">${L1[0]} (${L1[1]})</div>`);

    }

    function showBlocker(){

        let keyUpHandle;
        const freeDays = [];

        function evt_copyFreeWeeks(){
            freeDays.sort();
            $("#FriendlyHelperFreeDays").remove();
            let fDays = [];
            let check = 0;
            let f = [];
            let i = 0;
            for (const fd of freeDays){
                const season = Math.floor(fd/100);
                const week = fd % 100;
                if (season !== check){
                    if (fDays.length) {
                        fDays[i] += f.join(", ");
                        i++;
                        f = [];
                    }
                    fDays.push(`S${season}: `);
                    check = season;
                }
                f.push(week);
            }
            if (fDays.length){
                fDays[i] += f.join(", ");
            }
            GM_setClipboard(fDays.join(" - "));
            OLCore.info("Daten in die Zwischenablage kopiert");
        }

        function showFreeDays(){
            freeDays.sort();
            $("#FriendlyHelperFreeDays").remove();
            let fDays = [];
            let check = 0;
            let f = [];
            let i = 0;
            for (const fd of freeDays){
                const season = Math.floor(fd/100);
                const week = fd % 100;
                if (season !== check){
                    if (fDays.length) {
                        fDays[i] += f.join(", ");
                        i++;
                        f = [];
                    }
                    fDays.push(`S${season}: `);
                    check = season;
                }
                f.push(week);
            }
            if (fDays.length){
                fDays[i] += f.join(", ");
            }
            $("div#olFriendlyOffersContent").find("div.ol-2-table-headline").append(`<span style="margin-left:10px;font-size:smaller;float:right;" id="FriendlyHelperFreeDays">Freie Wochen ${fDays.join(" - ")}</span>`);
        }

        function evt_saveBlocker(evt){

            const inp = evt.currentTarget;

            function writeBlocker(){
                const dayId = parseInt(inp.id.replace("friendlyBlocker",""),10);
                if (inp.value){
                    if (freeDays.includes(dayId)) {
                        freeDays.splice(freeDays.indexOf(dayId),1);
                    }
                } else {
                    if (!freeDays.includes(dayId)){
                        freeDays.push(dayId);
                    }
                }
                GM_setValue(inp.id, inp.value);
                //showFreeDays();
            }

            if (keyUpHandle){
                window.clearTimeout(keyUpHandle);
            }
            keyUpHandle = window.setTimeout(writeBlocker, 1000);
        }

        function evt_saveFreeText(){

            const inp = $("#FriendlyHelperFreeText")[0];

            function writeFreeText(){
                GM_setValue(inp.id, inp.value);
            }

            if (keyUpHandle){
                window.clearTimeout(keyUpHandle);
            }
            keyUpHandle = window.setTimeout(writeFreeText, 1000);

        }

        let season = OLCore.Base.season;
        let newSeason = 0;
        let freeText = "";

        const listValues = GM_listValues();
        const firstId = (season * 100) + parseInt($("div.ol-friendly-offers-table-col-time > span > span")[0].innerText, 10);
        for (const val of listValues.filter(v => /^friendlyBlocker\d+$/.test(v))){
            const dayId = parseInt(val.replace("friendlyBlocker",""), 10);
            if (dayId < firstId){
                GM_deleteValue(val);
            }
        }

        $("div.ol-2-table-rows").children().each(function(i,e){
            const row = $(e);
            if (row.hasClass("ol-season-seperator")){
                season = parseInt(row.find("span.ol-title").text().replace("Saison ",""),10);
            }
            if (row.hasClass("ol-friendly-offers-table-row-empty")){
                const week = parseInt(row.find("div.ol-friendly-offers-table-col-time > span > span").text(),10);
                const dayId = (season * 100) + week;
                const blockerValue = GM_getValue(`friendlyBlocker${dayId}`) || '';
                $(`<input style="margin-left:10px;color:black;width:50%" class="friendlyBlockerInput" id="friendlyBlocker${dayId}" value="${blockerValue}" />`).insertAfter(row.children("div").eq(1).children().eq(0));
                if (blockerValue === ""){
                    freeDays.push(dayId);
                }
            }
        });
        //showFreeDays();
        $("div.ol-2-table-rows").on('keydown','input.friendlyBlockerInput',evt_saveBlocker);
        freeText = GM_getValue("FriendlyHelperFreeText") || "";
        $("div.ol-2-table-rows").after(`<div><textarea rows="10" style="width:100%; font-size:11pt;" id="FriendlyHelperFreeText">${freeText}</textarea></div>`);
        $("#FriendlyHelperFreeText").on('keydown',evt_saveFreeText);
        $("div#olFriendlyOffersContent").find("div.ol-2-table-headline").append(`<button style="display:inline; float:right;" class="ol-button ol-button-copy" id="btnCopyFreeWeeks" title="Freie Wochen in Zwischenablage kopieren"><span class="fa fa-clipboard" /></button>`);
        $("#btnCopyFreeWeeks").on('click',evt_copyFreeWeeks);
    }

    function run(){
        OLCore.addStyle("div.lineupinfo_percentLineup {position:absolute;}","OLI_LineupDiv");
        showInfo();
    }

    function applyBadgeClick(){
        $("div#olFriendlyRequestsContent").on('click','span.user-badge',showTeamInfo);
    }

    function init(){

        // FriendlyBlocker
        OLCore.waitForKeyElements (
            "div#olFriendlyOffersContent",
            showBlocker
        );

        // Info at friendly offers
        OLCore.waitForKeyElements (
            "div#olFriendlyRequestsContent",
            applyBadgeClick
        );

        // Info on own squad page
        OLCore.waitForKeyElements (
            "div#teamSquad",
            function() { showSquadInfo(true); },
        );

        // Info on every squad page
        OLCore.waitForKeyElements (
            //"button#toggleButtonSquad.active",
            "div.team-overview-squad-row",
            function() { showSquadInfo(); },
            true
        );

        //Info on lineup
        OLCore.waitForKeyElements(
            "div.row > div.statistics-lineup-wrapper:first-child",
            run
        );

    }


    if (!window.OLToolboxActivated) {
       init();
    } else {
        window.OnlineligaFriendlyHelper = {
            init : init
        };
    }

})();