/*jshint esversion: 8, multistr: true */
/* globals OLCore */

// ==UserScript==
// @name           OnlineligaOfficeHelper
// @namespace      https://greasyfork.org/de/users/577453
// @version        0.1.0
// @license        LGPLv3
// @description    Helper for office of onlineliga.*
// @author         TobSob / KnutEdelbert
// @match          https://www.onlineliga.de
// @require        https://greasyfork.org/scripts/424896-olcore/code/OLCore.user.js
// @grant          GM_listValues
// @grant          GM_setValue
// @grant          GM_getValue
// @grant          GM_deleteValue
// @grant          GM_addStyle
// @description Helper function for office of www.onlineliga.de
// ==/UserScript==

/*********************************************
 * 0.1.0 12.08.2021 Release
 *********************************************/
(function() {
    'use strict';
    const $ = unsafeWindow.jQuery;

    const Sponsor = {};
    const sponsors = {};
    var seasonValueMin = Number.MAX_VALUE;
    var seasonValueMax = 0;
    var seasonValuePromotedMin = Number.MAX_VALUE;
    var seasonValuePromotedMax = 0;
    /* @author: TobSob */
    Sponsor.calculateSponsorsBonuses = function() {
        seasonValueMin = Number.MAX_VALUE;
        seasonValueMax = 0;
        var i = 0;
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
                const victories = parseInt($('#calcsponsor_victories').val());
                const placement = parseInt($('#calcsponsor_placement').val());
                GM_setValue( "victories", victories )
                GM_setValue( "placement", placement )
                if(key === "Antrittsprämie") {
                    seasonValue += value*34;
                }
                else if(key.includes("Siegprämie")){
                    seasonValue += value*victories;
                }
                else if(key.includes("Meisterprämie")){
                    seasonValue += value*(placement > 1 ? 0 : 1);
                }
                else if(key.includes("Platzierungsprämie")){
                    seasonValue += value*(18-placement);
                }
                else if(key.includes("Nicht-Abstiegsprämie")){
                    seasonValue += value*(placement > 14 ? 0 : 1);
                }
                else if(key.includes("Aufstiegsprämie")){
                    seasonValuePromoted = value;
                }
            }
            seasonValuePromoted += seasonValue;
            var paragraphString = OLCore.num2Cur(seasonValue);
            if(seasonValuePromoted !== seasonValue && !isNaN(seasonValuePromoted)){
                paragraphString += '</span> / <span id="sponsor-seasonvaluepromoted-'+i+'" style="width: fit-content">'+OLCore.num2Cur(seasonValuePromoted)+'*';
            }
            $(this).after('<div class="sponsor-seasonvalue" style="bottom: 25px; position: relative; left: 5px; width: fit-content">Prämie-Saison: <span id="sponsor-seasonvalue-'+i+'" style="width: fit-content">'+ paragraphString +'</span>');
            sponsors[i] = [seasonValue, seasonValuePromoted];
            i = i+1;
            seasonValueMax = Math.max(seasonValueMax, seasonValue);
            seasonValueMin = Math.min(seasonValueMin, seasonValue);
            seasonValuePromotedMax = Math.max(seasonValuePromotedMax, seasonValuePromoted);
            seasonValuePromotedMin = Math.min(seasonValuePromotedMin, seasonValuePromoted);
        });
        for(var key in sponsors) {
            var value = (sponsors[key][0] - seasonValueMin) / seasonValueMax;
            $("#sponsor-seasonvalue-"+key).css('background-color',getColor(value));
            value = (sponsors[key][1] - seasonValuePromotedMin) / seasonValuePromotedMax;
            $("#sponsor-seasonvaluepromoted-"+key).css('background-color',getColor(value));
        }
    };

    function getColor(value){
        var hue=((value)*120).toString(10);
        return ["hsla(",hue,",100%,50%,0.4)"].join("");
    }

    /* @author: TobSob */
    function generateSponsorCalcDiv() {

        $("li#filter-base a,li#filter-promotion a,li#filter-champion a,li#filter-remain a,li#filter-placement a,li#filter-win a").bind( "click", function() { OLCore.waitForKeyElements ( "div.sponsor-pool-row", Sponsor.calculateSponsorsBonuses,);});
        const initVict = GM_getValue( "victories", 10 )
        const initPlacem = GM_getValue( "placement", 10 )
        const cl = OLCore.Base.teamColorNumber;
        $('#ol-root').append(`<div style="background-color: transparent;" class="sponsor-calc-div">
        <span class="sponsor-calc-input ol-state-primary-text-color-${cl}">Siege</span> \n<input class="sponsor-calc-input ol-state-primary-text-color-${cl}" placeholder="Siege" type="number" max="34" min="0" id="calcsponsor_victories" value="`+initVict+`"/></br>
        <span class="sponsor-calc-input ol-state-primary-text-color-${cl}9">Platzierung</span> \n<input class="sponsor-calc-input ol-state-primary-text-color-${cl}" placeholder="Platzierung" type="number" max="18" min="1" id="calcsponsor_placement" value="`+initPlacem+`"/></br>
        <input class="sponsor-calc-input bid-button ol-state-primary-color-${cl}" id="calcSponsorBtn" type="button"  value="Prämien Kalkulieren"/></br>
        <span class="sponsor-calc-input ol-state-primary-text-color-${cl}">* Prämie mit Aufstiegsprämie</span> </div>`);
        $("div.sponsor-calc-div > input").on("keyup", Sponsor.calculateSponsorsBonuses);

        const myBtn = document.querySelector ("#calcSponsorBtn");
        if (myBtn) {
            myBtn.addEventListener ("click", Sponsor.calculateSponsorsBonuses , false);
        }
    }

    function init(){
        OLCore.waitForKeyElements (
            "div#sponsorContainer",
            generateSponsorCalcDiv,
        );
        GM_addStyle('* .sponsor-calc-div { position: fixed; bottom:50%;right: 20px; text-decoration: none; color: #000000;background-color: rgba(235, 235, 235, 0.80);font-size: 12px;padding: 1em;} .sponsor-calc-input { width:100%; margin: 5px }');
    }

    if (!window.OLToolboxActivated) {
       init();
    } else {
        window.OnlineligaOfficeHelper = {
            init : init
        };
    }

})();