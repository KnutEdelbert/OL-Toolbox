/*jshint esversion: 8, multistr: true */
/* globals OLCore */

// ==UserScript==
// @name           OnlineligaOfficeHelper
// @namespace      https://greasyfork.org/de/users/577453
// @version        0.1.0
// @license        LGPLv3
// @description
// @author         KnutEdelbert
// @match          https://www.onlineliga.de
// @require        https://greasyfork.org/scripts/424896-olcore/code/OLCore.user.js
// @grant          GM_listValues
// @grant          GM_setValue
// @grant          GM_getValue
// @grant          GM_deleteValue
// ==/UserScript==

/*********************************************
 * 0.1.0 12.08.2021 Release
 *********************************************/
(function() {
    'use strict';
    const $ = unsafeWindow.jQuery;

    const Sponsor = {};

    Sponsor.calculateSponsorsBonuses = function() {
        $('.sponsor-seasonvalue').remove();
        $('div.sponsor-info-details-wrapper').each(function() {
            const valueDict = {}
            $(this).find('div.sponsor-bonus-value').each(function() {
                valueDict[$(this).next("div.sponsor-bonus-category").html()] = $(this).html();
            });
            var seasonValue = 0;
            var seasonValuePromoted = 0;
            for(var key in valueDict){
                var valueString = valueDict[key];
                valueString = valueString.replace(/ |,|\.|€|CHF/g,"");
                const value = parseInt(valueString);
                const wins = parseInt($('#calcsponsor_victories').val())
                const placement = parseInt($('#calcsponsor_placement').val())
                if(key === "Antrittsprämie") {
                    seasonValue += value*34;
                }
                else if(key === "Siegprämie"){
                    seasonValue += value*wins;
                }
                else if(key === "Meisterprämie"){
                    seasonValue += value*(placement > 1 ? 0 : 1);
                }
                else if(key === "Platzierungsprämie "){
                    seasonValue += value*(18-placement);
                }
                else if(key === "Nicht-Abstiegsprämie  *"){
                    seasonValue += value*(placement > 14 ? 0 : 1);
                }
                else if(key === "Aufstiegsprämie "){
                    seasonValuePromoted = value;
                }
            }
            seasonValuePromoted += seasonValue;
            var paragraphString = 'Prämie-Saison: '+seasonValue;
            if(seasonValuePromoted !== seasonValue && !isNaN(seasonValuePromoted)){
                paragraphString += ' / '+seasonValuePromoted+'*';
            }
            $(this).after('<div class="sponsor-seasonvalue" style="bottom: 22px; position: relative; left: 5px;"><p>'+ paragraphString +'</p></div>');
        });
    };

    function generateSponsorCalcDiv() {
        const cl = OLCore.Base.teamColorNumber;
        $('#ol-root').append(`<div style="background-color: transparent;" class="sponsor-calc-div">
        <span class="sponsor-calc-input ol-state-primary-text-color-${cl}">Siege</span> \n<input class="sponsor-calc-input ol-state-primary-text-color-${cl}" placeholder="Siege" type="number" max="34" min="0" id="calcsponsor_victories" value="10"/></br>
        <span class="sponsor-calc-input ol-state-primary-text-color-${cl}9">Platzierung</span> \n<input class="sponsor-calc-input ol-state-primary-text-color-${cl}" placeholder="Platzierung" type="number" max="18" min="1" id="calcsponsor_placement" value="1"/></br>
        <!--input class="sponsor-calc-input bid-button ol-state-primary-color-${cl}" id="calcSponsorBtn" type="button"  value="Prämien Kalkulieren"/></br-->
        <span class="sponsor-calc-input ol-state-primary-text-color-${cl}">* Prämie mit Aufstiegsprämie</span> </div>`);
        $("div.sponsor-calc-div > input").on("keydown", Sponsor.calculateSponsorsBonuses);
        /*
        const myBtn = document.querySelector ("#calcSponsorBtn");
        if (myBtn) {
            myBtn.addEventListener ("click", Sponsor.calculateSponsorsBonuses , false);
        }
        */
    };

    OLCore.waitForKeyElements (
        "div#sponsorContainer",
        generateSponsorCalcDiv,
    );

})();