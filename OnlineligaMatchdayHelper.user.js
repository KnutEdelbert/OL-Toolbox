/*jshint esversion: 8, multistr: true */
/* globals toggleButtonTopPlayerTotalChanged, OLCore */

// ==UserScript==
// @name           OnlineligaMatchdayHelper
// @namespace      https://greasyfork.org/de/users/577453
// @version        0.1.2
// @license        LGPLv3
// @description    Zusatzinfos für Spieltag/Tabelle bei Onlineliga.de
// @author         KnutEdelbert
// @match          https://www.onlineliga.de
// @require        https://greasyfork.org/scripts/424896-olcore/code/OLCore.user.js
// @grant          GM_listValues
// @grant          GM_setValue
// @grant          GM_getValue
// @grant          GM_deleteValue
// @grant          GM_setClipboard
// ==/UserScript==

/*********************************************
 * 0.1.0 20.06.2021 Release
 * 0.1.1 08.07.2021 + match export
 * 0.1.2 bugfix: init function
 *********************************************/
(function() {
    'use strict';
    const $ = unsafeWindow.jQuery;
    const api = OLCore.Api;

    const TopPlayer = {};
    const Match = {};

    TopPlayer.values = {};

    TopPlayer.resetValues = function(){
        TopPlayer.values = {
            lastRating : 0,
            standing : 1,
            lastMatchday : 0,
            lastLeague : 0,
            lastSeason : 0,
            lastTeam : 0,
            lastPosition : 0,
            filterActive : true
        };
    };

    TopPlayer.resetValues();

    TopPlayer.createFilterButton = function(elem){

        if ($("input#filter-topplayerFilter").length){
            return;
        }

        if ($("button#topPlayerSeasonButton.ol-button-toggle.active").length === 0){
            TopPlayer.resetValues();
            return;
        }

        function filterToggle(evt){
            if ($("button#topPlayerSeasonButton.ol-button-toggle.active").length === 0){
                return;
            }
            const isChecked = evt.currentTarget.checked;
            TopPlayer.values.filterActive = isChecked;
            TopPlayer.values.lastRating = 0;
            TopPlayer.values.standing = 1;
            toggleButtonTopPlayerTotalChanged(1);
        }

        TopPlayer.resetValues();

        $(` \
<div class="col-md-3 col-xs-12"><div style="margin-top: 23px;"><div id="navToggle"> \
    <div class="row"> \
        <div class="col-xs-12"> \
        <div id="buttonToggle-topplayerFilter" class="ol-checkbox-slider ol-checkbox slider" style="display: flex;"> \
            <label for="filter-topplayerFilter"> \
                <span class="ol-font-standard"> \
                    <span id="filter-topplayerFilter-1" class="filter-active" style="display: inline;">Filter (50%)</span> \
        <span id="filter-topplayerFilter-2" class="filter-not-active" style="display: none;">Filter (50%)</span> \
        </span> \
        <input id="filter-topplayerFilter" data-value="1" type="checkbox" value="1" name="optradio" onchange="$(\'#filter-topplayerFilter-1, #filter-topplayerFilter-2\').toggle(); $(this).val(($(this).val() % 2) + 1);" checked="" /> \
            <i style="display: inline-block;"/> \
                </label> \
        </div> \
        </div> \
    </div> \
</div>`).appendTo("div#leagueNavContent-matchdayTable.ol-league-nav-content > div.container-fluid > div.row.row-no-space:nth-child(3)");
        $("input#filter-topplayerFilter").on("click", filterToggle);
    };

    TopPlayer.filterRow = function(elem){
        if (!TopPlayer.values.filterActive || $("button#topPlayerSeasonButton.ol-button-toggle.active").length === 0){
            TopPlayer.values.resetValues();
            return;
        }
        const matchday = parseInt($("div#dropdown-matchday-table-matchday-matchdayTable").attr("data-value"),10);
        const league = $('div#dropdown-matchday-table-1-matchdayTable[data-default="Liga wählen"]').is(":visible") ?
              parseInt($("div#dropdown-matchday-table-1-matchdayTable").attr("data-value"),10) :
        $('div#dropdown-matchday-table-2-matchdayTable[data-default="Liga wählen"]').is(":visible") ?
              parseInt($("div#dropdown-matchday-table-2-matchdayTable").attr("data-value"),10) :
        $('div#dropdown-matchday-table-3-matchdayTable[data-default="Liga wählen"]').is(":visible") ?
              parseInt($("div#dropdown-matchday-table-3-matchdayTable").attr("data-value"),10) : 0;
        const season = parseInt($("div#dropdown-matchday-table-season-matchdayTable").attr("data-value"),10);
        const team = parseInt($("div#topPlayerTeamDropdown").attr("data-value"),10);
        const position = parseInt($("div#topPlayerPositionDropdown").attr("data-value"),10);


        if (matchday !== TopPlayer.values.lastMatchday ||
            league !== TopPlayer.values.lastLeague ||
            season !== TopPlayer.values.lastSeason ||
            team !== TopPlayer.values.lastTeam ||
            position !== TopPlayer.values.lastPosition){
            TopPlayer.values.lastRating = 0;
            TopPlayer.values.standing = 1;
            TopPlayer.values.lastMatchday = matchday;
            TopPlayer.values.lastLeague = league;
            TopPlayer.values.lastSeason = season;
            TopPlayer.values.lastTeam = team;
            TopPlayer.values.lastPosition = position;
        }
        const matches = parseInt(elem.find("div:nth-child(2) > div:nth-child(1) > div:nth-child(2)").text(),10);
        const rating = OLCore.getNum(elem.find("div:nth-child(2) > div:nth-child(1) > div:nth-child(3)").text());
        const standingDiv = elem.find("div:nth-child(1) > div:nth-child(1) > div:nth-child(1)");
        if (matchday && matches){
            if (matchday/2 > matches){
                elem.hide();
            } else {
                standingDiv.text(rating > TopPlayer.values.lastRating ? TopPlayer.values.standing.toString() : '...');
                TopPlayer.values.standing++;
                TopPlayer.values.lastRating = rating;
            }
        }
    };

    Match.exportData = async function(evt){

        const matchSeason = $(evt.currentTarget).attr("data-season");
        const matchDayWeek = $(evt.currentTarget).attr("data-matchDayWeek");
        const isFriendly = $(evt.currentTarget).attr("data-isFriendly") === "1";
        const searchParams = window.location.href.match(/season=(\d+)&matchId=(\d+)/);
        const matchDay = isFriendly ? OLCore.week2matchDay(matchDayWeek) : matchDayWeek;
        const week = isFriendly ? matchDayWeek : OLCore.matchDay2week(matchDayWeek);
        const matchType = isFriendly ? 'F' : 'L';
        if (!searchParams){
            return;
        }
        const rows = [];
        if (evt.shiftKey){
            //rows.push(`Saison\tSpieltag\tWoche\tTyp\tSpieler-ID\tName\tNote\tFormation\tPosition\tSpielerposition\tFremdposition\tEinsatzzeit\tEinwechslung\tAuswechslung\tTore\tVorlagen\tGelb\tGelb-Rot\tRot`);
            rows.push(`Saison\tSpieltag\tWoche\tTyp\tSpieler-ID\tName\tNote\tFormation\tPosition\tEinsatzzeit\tEinwechslung\tAuswechslung\tTore\tVorlagen\tGelb\tGelb-Rot\tRot`);
        }
        const season = parseInt(searchParams[1]);
        const matchId = parseInt(searchParams[2]);
        const stats = await api.getMatchStatistics(season, matchId, OLCore.Base.userId);
        const lineup = await api.getMatchLineup(season, matchId, OLCore.Base.userId);
        const squad = await api.getSquad(OLCore.Base.userId);
        let cols;
        for (const l of stats.own.lineup){
            const playerId = l.playerId;
            const playerData = stats.own.players[playerId];
            const lineupData = lineup.players[playerId];
            const formation = OLCore.Base.Formations[lineup.formation];
            const timeEnd = playerData.red || playerData.yellowred || playerData.out || stats.final;
            const timeStart = playerData.in || 0;
            const time = timeEnd - timeStart;
            cols = [];
            cols.push(matchSeason);
            cols.push(matchDay || '');
            cols.push(week);
            cols.push(matchType);
            cols.push(l.playerId);
            cols.push(l.playerName);
            cols.push(l.rating ? l.rating.toLocaleString(OLCore.I18n.lang) : '');
            cols.push(formation.short);
            cols.push(formation.positions[lineupData.position.id-1]);
            //cols.push(squad.playerObj[playerId].positions);
            //cols.push(lineupData.position.wrong ? 1 : 0);
            cols.push(time + "'");
            cols.push('');
            cols.push(playerData.out ? playerData.out + "'" : '');
            cols.push(playerData.goals ? playerData.goals : '');
            cols.push(playerData.assists ? playerData.assists : '');
            cols.push(playerData.yellow ? playerData.yellow + "'" : '');
            cols.push(playerData.yellowred ? playerData.yellowred + "'" : '');
            cols.push(playerData.red ? playerData.red + "'" : '');
            rows.push(cols.join("\t"));
        }
        for (const s of stats.own.substitutions){
            const playerId = s.in.id;
            const playerData = stats.own.players[playerId];
            const lineupData = lineup.players[playerId];
            const formation = OLCore.Base.Formations[lineup.formation];
            const timeEnd = playerData.red || playerData.yellowred || playerData.out || stats.final;
            const timeStart = playerData.in || 0;
            const time = timeEnd - timeStart;
            cols = [];
            cols.push(matchSeason);
            cols.push(matchDay || '');
            cols.push(week);
            cols.push(matchType);
            cols.push(playerId);
            cols.push(s.in.name);
            cols.push(s.in.rating ? s.in.rating.toLocaleString(OLCore.I18n.lang) : '');
            cols.push(formation.short);
            cols.push(formation.positions[lineupData.position.id-1]);
            //cols.push(squad.playerObj[playerId].positions);
            //cols.push(0);
            cols.push(time + "'");
            cols.push(playerData.in ? playerData.in + "'" : '');
            cols.push(playerData.out ? playerData.out + "'" : '');
            cols.push(playerData.goals ? playerData.goals : '');
            cols.push(playerData.assists ? playerData.assists : '');
            cols.push(playerData.yellow ? playerData.yellow + "'" : '');
            cols.push(playerData.yellowred ? playerData.yellowred + "'" : '');
            cols.push(playerData.red ? playerData.red + "'" : '');
            rows.push(cols.join("\t"));
        }
        GM_setClipboard(rows.join("\r\n"));
        OLCore.info("Daten in die Zwischenablage kopiert");
    };

    Match.createExport = function() {
        const matchSpan = $("div#matchdayresult div.ol-league-name > span[onclick]");
        const matchNums = OLCore.getNum(matchSpan.text().trim(), -1);
        const isFriendly = window.location.href.includes("/friendly?");
        //const matchClick = $("div#matchdayresult div.ol-league-name > span[onclick]").attr("onclick");
        //const gameMatchDayMatch = matchClick.match(/\s*'?season'?\s*:\s*(\d+),\s*'?matchday'?\s*:\s*(\d+)\s*/);
        let gameMatchDayWeek = 0;
        let gameSeason = 0;
        if (matchNums) {
            gameSeason = matchNums[0];
            gameMatchDayWeek = matchNums[1];
        }
        // Check, if match isn't played yet
        if ($("div.matchScore").text().trim() === ":"){
            return;
        }
        $(".menu-button-wrapper").append(`<button style="display:inline; float:right;" class="ol-button ol-button-copy" id="btnExportMatch" data-isFriendly="${isFriendly?1:0}" data-season="${gameSeason}" data-matchDayWeek="${gameMatchDayWeek}" title="Spieldaten in Zwischenablage kopieren (Shift halten für Überschriften)">Export</button>`);
        $("button#btnExportMatch").on("click", Match.exportData);
    };

    function init(){

        OLCore.waitForKeyElements (
            "button#topPlayerSeasonButton",
            TopPlayer.createFilterButton
        );

        //wait for the ticker page and start the ticker
        OLCore.waitForKeyElements (
            "div#topplayerTableContent > div.row.matchday-statistics-table",
            TopPlayer.filterRow
        );

        OLCore.waitForKeyElements (
            "div#matchdayresult",
            Match.createExport
        );

    }

    if (!window.OLToolboxActivated) {
       init();
    } else {
        window.OnlineligaMatchdayHelper = {
            init : init
        };
    }

})();