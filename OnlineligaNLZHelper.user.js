/*jshint esversion: 8, multistr: true */
/* globals OLCore */

// ==UserScript==
// @name           OnlineligaNLZHelper
// @namespace      https://greasyfork.org/de/users/577453
// @version        0.1.6
// @license        LGPLv3
// @description    Zusatzinfos für NLZ für www.onlineliga.de (OFA)
// @author         Tai Kahar/ KnutEdelbert
// @match          https://www.onlineliga.de
// @require        https://greasyfork.org/scripts/424896-olcore/code/OLCore.user.js
// @grant          GM_setClipboard
// @grant          GM_addStyle
// ==/UserScript==

/*********************************************
 * 0.1.0 29.04.2021 Release
 * 0.1.1 10.05.2021 hide NLZ Youth Player
 * 0.1.2 12.05.2021 show accumulated progress
                    Excel Export for Torny's list
 * 0.1.3 22.06.2021 Fix Excel Export Format
 * 0.1.4 05.07.2021 Bugfix for non existing Invests
 * 0.1.5 05.08.2021 Add country to Excel Export
                    Support different currency formats
 * 0.1.6 05.08.2021 Bugfix staff value
 *********************************************/
(function() {
    'use strict';
    const $ = unsafeWindow.jQuery;


    function correctYouthEfficiency()
    {

        function whichTransitionAnimationEvent(){
            const el = document.createElement('fakeelement');
            const transitions = {
                'WebkitTransition' :'webkitTransitionEnd',
                'MozTransition'    :'transitionend',
                'MSTransition'     :'msTransitionEnd',
                'OTransition'      :'oTransitionEnd',
                'transition'       :'transitionEnd',
                'animation'        :'animationEnd',
                'WebkitAnimation'  :'webkitAnimationEnd',
                'oAnimation'       :'oAnimationEnd',
                'MSAnimation'      :'MSAnimationEnd',
            };

            for(const t in transitions){
                if( el.style[t] !== undefined ){
                    return transitions[t];
                }
            }
        }

        $("#progressBar").one(whichTransitionAnimationEvent(), function(){
            const academyPercent = Math.floor(parseFloat(OLCore.convertNumber($("#progressBarYouthAcademy").attr("style"))) * 100) / 100;
            const staffPercent = Math.floor(parseFloat(OLCore.convertNumber($("#progressBarStaff").attr("style"))) * 100) / 100;
            const scoutingPercent = Math.floor(parseFloat(OLCore.convertNumber($("#progressBarScouting").attr("style"))) * 100) / 100;

            $("#progressBarValue span:first-child").html(Math.floor(parseFloat($(".ol-progressbar-large").attr("data-value")) * 100) / 100 + "%");
            $("#progressBarYouthAcademy").attr("title",academyPercent + "%");
            $("#progressBarYouthAcademy").append("<span style='top: 4px;'>" + academyPercent + "% </span>");
            $("#progressBarStaff").attr("title",staffPercent + "%");
            $("#progressBarStaff").append("<span style='top: 4px;'>" + staffPercent + "% </span>");
            $("#progressBarScouting").attr("title",scoutingPercent + "%");
            $("#progressBarScouting").append("<span style='top: 4px;'>" + scoutingPercent + "% </span>");
        });
    }

    function hideYouthPlayer(){

        let divIdx = 0;
        const hideElems = [];

        $("div#youthPlayerHeader").text("Nachwuchsspieler");
        $("div#youthStaffContent > div.row:last-child").css("min-height","350px");

        $("div.youth-player-new-player-table").each(function(i,row){
            $(row).hide();
            hideElems.push(row);
            $(row).find("div.row").children("div").each(function(j, div){
                $(div).hide();
                hideElems.push(div);
            });
            divIdx = 0;
        });

        function showElems(){
            if (divIdx < hideElems.length){
                $(hideElems[divIdx++]).show();
            }
        }

        $("div#youthPlayerHeader").append(`<button class="ol-button-state ol-button-state ol-state-primary-color-${OLCore.Base.teamColorNumber}" style="margin-left:50px" type="button" id="NLZHelper_reveal">Spieler-Werte Aufdecken</button>`);

        $("button#NLZHelper_reveal").on("click", showElems);
    }

    function showRealProgress(){
        const pbStaff = $("div#moduleStaff div.ol-tile-progress-bar");
        const staffProgress = pbStaff.attr("style") ? OLCore.round(parseFloat(pbStaff.attr("style").replace(/width\s*:\s*/,'')),2) : 0;
        pbStaff.parent().before(`<div class="ol-tile-sub" style="margin-top:20px;">Kumulierte Einarbeitung: ${staffProgress}%</div>`);
        pbStaff.parent().css("margin-top","5px");

        const pbScouting = $("div#moduleScouting div.ol-tile-progress-bar");
        const scoutingProgress = pbScouting.attr("style") ? OLCore.round(parseFloat(pbScouting.attr("style").replace(/width\s*:\s*/,'')),2) : 0;
        pbScouting.parent().before(`<div class="ol-tile-sub" style="margin-top:20px;">Kumulierte Einarbeitung: ${scoutingProgress}%</div>`);
        pbScouting.parent().css("margin-top","5px");

        const pbAcademy = $("div#moduleAcademy div.ol-tile-progress-bar");
        const academyProgress = pbAcademy.attr("style") ? OLCore.round(parseFloat(pbAcademy.attr("style").replace(/width\s*:\s*/,'')),2) : 0;
        pbAcademy.parent().before(`<div class="ol-tile-sub" style="margin-top:5px;">Effizienz: ${academyProgress}%</div>`);
        pbAcademy.parent().css("margin-top","5px");
    }

    function createExport(){

        async function exportNLZ(){

            const exportData = [];
            const tld2country = {at: 'AT', ch: 'CH', de:'D'};

            const academyData = await OLCore.Api.NLZ.getAcademy();
            const pbAcademy = $("div#moduleAcademy div.ol-tile-progress-bar");
            const pbStaff = $("div#moduleStaff div.ol-tile-progress-bar");
            const pbScouting = $("div#moduleScouting div.ol-tile-progress-bar");

            const manager = OLCore.Base.userName;
            const team = OLCore.Base.teamName;
            const country = tld2country[OLCore.I18n.topLevelDomain];
            const season = OLCore.Base.week > 37 ? OLCore.Base.season+1 : OLCore.Base.season;
            const leagueLevel = OLCore.Base.leagueLevel;
            const efficiency = parseFloat($("div#progressBarValue").children("span").eq(0).text());
            const lastEfficiency = "";
            const LZFinish = academyData.acadamy.value || OLCore.getNum($("#moduleAcademy").find(".ol-tile-sub:contains('Einmalige Kosten')").prev().text()) || 0;
            const LZEfficiency = pbAcademy.length ? OLCore.round(parseFloat(pbAcademy.attr("style").replace(/width\s*:\s*/,'')),0) : 0;
            const LZExtension = academyData.extension ? academyData.extension.value : "";
            const LZExtensionProgress = academyData.extension ? academyData.extension.progress : "";
            const staffCont = $("div#moduleStaff div.ol-tile-expenditure");
            const staff = staffCont.length ? OLCore.getNum($("div#moduleStaff div.ol-tile-expenditure").children("div.ol-tile-header").text()) : 0;
            const staffProgress = (pbStaff.length ? OLCore.round(parseFloat(pbStaff.attr("style").replace(/width\s*:\s*/,'')),0) : 0) + '%';
            const scoutingCont = $("div#moduleScouting div.ol-tile-expenditure");
            const scouting = scoutingCont.length ? OLCore.getNum($("div#moduleScouting div.ol-tile-expenditure").children("div.ol-tile-header").text()) : 0;
            const scoutingProgress = (pbScouting.length ? OLCore.round(parseFloat(pbScouting.attr("style").replace(/width\s*:\s*/,'')),0) : 0) + '%';
            const count = $("div.youth-player-new-player-table").length;

            for (const row of $("div.youth-player-new-player-table")) {

                const strengthDiv = $(row).find("div.ol-youthplayer-overall-value").eq(0);
                const talentDiv = strengthDiv.prev();
                const positionDiv = $(row).find("div.youth-player-position").eq(0);
                const ageDiv = positionDiv.prev();
                const youthPlayerId = $(row).attr("onclick").match(/{\s*youthPlayerId'?\s*:\s*(\d+)\s*}/)[1];
                const playerData = youthPlayerId > 0 ? await OLCore.Api.NLZ.getYouthPlayer(youthPlayerId) : null;

                const playerName = $(row).find("span.ol-full-name").text();
                const positions = positionDiv.text().split(",");
                const pos1 = positions.length ? positions[0].trim(): "";
                const pos2 = positions.length > 1 ? positions[1].trim(): "";
                const pos3 = positions.length > 2 ? positions[2].trim(): "";
                const age = OLCore.getNum(ageDiv.text());
                const marketvalue = OLCore.getNum($(row).find("div.youth-player-marketvalue").text().replace(/\./g,''));
                const overall = OLCore.getNum(strengthDiv.children().eq(0).attr("data-current-value"));
                const talent = OLCore.getNum(talentDiv.find("span.ol-value-bar-small-label-value").text());
                const salary = playerData.salary;
                const playerType = pos1 === "TW" ? "TW" : "FS";

                exportData.push(
                  `${manager}\t${team}\t${country}\t${season}\t${leagueLevel}\t${efficiency}\t\t${LZFinish}\t${LZEfficiency}\t${LZExtension}\t${LZExtensionProgress}\t${staff}\t${staffProgress}\t${scouting}\t${scoutingProgress}\t${playerName}\t${pos1}\t${pos2}\t${pos3}\t${age}\t${overall}\t${talent}\t\t\t${salary}\t\t\t${count}\t${playerType}\t${marketvalue}`
                );

            }
            GM_setClipboard(exportData.join("\r\n"));
            const msg = count === 0? "Keine Spielerdaten gefunden" : "Spielerdaten in die Zwischenablage kopiert";
            $(`<div id="NLZ_Export_popup" class="NLZ_Export_popup">${msg}</div>`).dialog({
                classes: {},
                hide: { effect: "fade" },
                show: { effect: "fade" },
                open: function(event, ui) {
                    setTimeout(function(){
                        $('#NLZ_Export_popup').dialog('close');
                        $('#NLZ_Export_popup').remove();
                    }, 1000);
                }
            });
        }

        $("div#youthPlayerHeader").append(`<button class="ol-button-state ol-button-state ol-state-primary-color-${OLCore.Base.teamColorNumber}" style="margin-left:50px" type="button" id="NLZ_XLS_Export">Excel-Export</button>`);
        $("button#NLZ_XLS_Export").on("click", exportNLZ);
    }

    function run(hideYP){
        if (hideYP) { hideYouthPlayer(); }
        correctYouthEfficiency();
        showRealProgress();
        createExport();
    }

    function init(hideYP){

        GM_addStyle(".ui-dialog { z-index: 1000 !important ;}");
        GM_addStyle(".NLZ_Export_popup {width:auto; height: auto; opacity: 0.9; font-weight: bold; font-size: 20pt; color: white; background-color:grey; border: 1px solid grey; border-radius: 20px; vertical-align: middle; text-align:center; padding:20px;}");

        OLCore.waitForKeyElements (
            "div#youthPlayerHeader",
            function(){ run(hideYP); }
        );

    }

    if (!window.OLToolboxActivated) {
        const hideYP = false;
        init(hideYP);
    } else {
        window.OnlineligaNLZHelper = {
            init : init
        };
    }

})();