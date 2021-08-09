/*jshint esversion: 8, multistr: true */
/* globals waitForKeyElements, OLCore */

// ==UserScript==
// @name           OnlineligaBaseHelper
// @namespace      https://greasyfork.org/de/users/577453
// @version        0.1.6
// @license        LGPLv3
// @description    Allgemeine Zusatzfunktionen für www.onlineliga.de (OFA)
// @author         Tai Kahar/ KnutEdelbert
// @match          https://www.onlineliga.de
// @require        https://greasyfork.org/scripts/424896-olcore/code/OLCore.user.js
// @grant          GM_addStyle
// ==/UserScript==

/*********************************************
 * 0.1.0 29.04.2021 Release
 * 0.1.1 02.05.2021 Bugfix: Geburtstag wurde nicht angezeigt
 * 0.1.2 12.05.2021 display youtube inline
 * 0.1.3 13.05.2021 Number of teams
 * 0.1.4 19.05.2021 highlight Matchdaytable special ranks
 * 0.1.5 19.05.2021 highlight Matchdaytable special ranks for every league Level
 * 0.1.6.14.07.2021 fix finance display on top bar for ch/at
 *********************************************/
(function() {
    'use strict';
    const $ = unsafeWindow.jQuery;

    let budgetLoaded = false;

    function budgetOverview()
    {
        if(!budgetLoaded){
            $.get("/office/finance",function(data){
                var financeData = $(data).find(".finance-account-overview-box .row div div:nth-child(1)");
                var bankBalance = OLCore.num2Cur(OLCore.getNum(financeData.eq(0).text()));
                var dispo = OLCore.num2Cur(OLCore.getNum(financeData.eq(1).text()));
                var allBalance = $(".ol-nav-liquid-funds").html();

                var liquidFundsElement = $(".ol-nav-liquid-funds").first();
                if(liquidFundsElement.text() != "XXX.XXX"){
                    $(".ol-nav-liquid-funds").parent().prepend(`<div style='font-size: 10pt;top:-18px;position:relative;margin-bottom:-20px;color:grey;'>Konto ${bankBalance} | Dispo ${dispo}</div>`);
                }
            });
            budgetLoaded = true;
        }
    }

    function correctBirthDate()
    {
        $(".playeroverviewtablestriped div:nth-child(5) div:nth-child(2) div:nth-child(2)").first().css("display","none");
        var oldBirthdate = parseInt(OLCore.convertNumber($(".playeroverviewtablestriped div:nth-child(5) div:nth-child(2) div:nth-child(2)").first().text()),10);

        $(".playeroverviewtablestriped div:nth-child(5) div:nth-child(2) div:nth-child(2)").first().html("Woche " + (oldBirthdate - 1 || 44) + " vorher: " + oldBirthdate);
        $(".playeroverviewtablestriped div:nth-child(5) div:nth-child(2) div:nth-child(2)").first().css("display","block");
    }

    function teamInfoLinks(){
        $('.infotext p:contains("youtube")').detach().prependTo('.infotext');
        $('.infotext p:contains("youtube")').html(function(i, html) {
            return html.replace(/(?:https:\/\/|http:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/g,'<iframe width="100%" height="400px" src="https://www.youtube.com/embed/$1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>');
        });
    }

    function teamNumber(){

        if($('.menu-button-wrapper .active').text() == 'Bundeslandranking')
        {
            var sumTeams = sumNumbers($('.ol-statistics-ranking-teams').not('.hidden-lg '));
            var sumPoints = sumNumbers($('.col-lg-5.ol-statistics-ranking-points').not('.hidden-lg '));

            $('#ol-ranking-content').prepend('<div class="sumPointsTeams"></div>');
            $('.sumPointsTeams').html('Summe Teams: ' + sumTeams + '<br /> Summe Punkte: ' + sumPoints);
        }

        function sumNumbers(items)
        {
            var sum = 0;
            items.each(function() {
                var points = Number($(this).html().replace('.','').replace(',','.'));
                if(points)
                {
                    sum += points;
                }
            });
            return sum;
        }

    }

    function highlightMatchdayTable(){

        $("style#ToolboxMatchdayTableHighlight").remove();

        if ($('button.ol-button-toggle.active:contains("Gesamt")').length){
            const leagueLevel = parseInt($("div#dropdown-matchday-table-league-level-matchdayTable").attr("data-value"), 10);

            const secondCSS = [];
            secondCSS[0] = "";
            secondCSS[1] = "table.table > tbody > tr#ol-td:nth-child(2) {background-color:rgba(189, 237, 131, 0.1);  border-bottom: 1px solid black;}";
            secondCSS[2] = secondCSS[1];
            secondCSS[3] = "";
            secondCSS[4] = "table.table > tbody > tr#ol-td:nth-child(2), table.table > tbody > tr#ol-td:nth-child(3) {background-color:rgba(189, 237, 131, 0.1);}" +
                           "\r\ntable.table > tbody > tr#ol-td:nth-child(3) { border-bottom: 1px solid black;}";
            secondCSS[5] = secondCSS[4];

            const disclaimer = [];
            disclaimer[0] = "Die erste Linie markiert den Meister und die zweite Linie die Abstiegsplätze.";
            disclaimer[1] = "Die erste Linie markiert den Meister, die zweite Linie einen weiteren Aufstiegsplatz und die dritte Linie die Abstiegsplätze.";
            disclaimer[2] = "Die erste Linie markiert den Meister, die zweite Linie einen weiteren <b>eventuellen</b> Aufstiegsplatz und die dritte Linie die Abstiegsplätze.<br/>Die tatsächliche Anzahl der Aufstiegssplätze kann abweichen.";
            disclaimer[3] = "Die erste Linie markiert den Meister und die zweite Linie die Abstiegsplätze.";
            disclaimer[4] = "Die erste Linie markiert den Meister, die zweite Linie weitere <b>eventuelle</b> Aufstiegs-/Qualifikationsplätze und die dritte Linie die Abstiegsplätze.<br/>Die tatsächliche Anzahl der Aufstiegs-/Qualifikationsplätze kann abweichen.";
            disclaimer[5] = "Die erste Linie markiert den Meister und die zweite Linie weitere <b>eventuelle</b> Aufstiegs-/Qualifikationsplätze.<br/>Die tatsächliche Anzahl der Aufstiegs-/Qualifikationsplätze kann abweichen.";

            const lastCSS = leagueLevel === 6 ? "" : `table.table > tbody > tr#ol-td:nth-child(15) {border-top: 1px solid black}
  table.table > tbody > tr#ol-td:nth-child(15),
  table.table > tbody > tr#ol-td:nth-child(16),
  table.table > tbody > tr#ol-td:nth-child(17),
  table.table > tbody > tr#ol-td:nth-child(18) {background-color:rgba(255, 0, 0, 0.1);}`;

            OLCore.addStyle(`
  table.table > tbody > tr#ol-td:first-child {background-color:rgba(46, 171, 0, 0.1); border-bottom: 1px solid black;}
  ${secondCSS[leagueLevel-1]}
  ${lastCSS}`, "ToolboxMatchdayTableHighlight");

            $("div#leagueNavWrapper-matchdayTable").next().children("div#ol-table-content").children().eq(0).children().eq(2).before(`<div>${disclaimer[leagueLevel-1]}</div>`);
        }
    }

    function init(){

        OLCore.waitForKeyElements(
            ".playeroverviewtablestriped",
            correctBirthDate
        );

        OLCore.waitForKeyElements(
            ".ol-player-budget",
            budgetOverview
        );

        OLCore.waitForKeyElements(
            "div.team-overview-info",
            teamInfoLinks
        );

        OLCore.waitForKeyElements(
            "div#ol-ranking-content > div.row",
            teamNumber,
            true
        );

        OLCore.waitForKeyElements(
            "tr#ol-td",
            highlightMatchdayTable,
            true
        );
    }

    if (!window.OLToolboxActivated) {
       init();
    } else {
        window.OnlineligaBaseHelper = {
            init : init
        };
    }

})();