/* jshint esversion: 10, multistr: true */
/* globals waitForKeyElements, OLCore, olGUI, olTransferList, olOverlayWindow */

// ==UserScript==
// @name           OnlineligaTransferHelper
// @namespace      https://greasyfork.org/de/users/577453
// @version        0.1.4
// @license        LGPLv3
// @description    Helfer für Transfers bei www.onlineliga.de (OFA)
// @author         KnutEdelbert
// @match          https://www.onlineliga.de
// @require        https://greasyfork.org/scripts/424896-olcore/code/OLCore.user.js
// @grant          GM_addStyle
// @grant          GM_getValue
// @grant          GM_setValue
// @grant          GM_deleteValue
// @grant          GM_listValues
// ==/UserScript==

/*********************************************
 * 0.1.0 20.04.2021 Release
 * 0.1.1 29.04.2021 + Transferdetails from Tais Helper
 * 0.1.2 03.06.2021 + reoffer Trades
 * 0.1.3 28.07.2021 Hotfix
 * 0.1.4 04.08.2021 mobile support for renew offers
 *********************************************/
(function() {
    'use strict';

    const $ = unsafeWindow.jQuery;
    const api = OLCore.Api;

    /***
     * Transferfilter
     ***/

    const Filter = {};

     // CSS Styles
    Filter.setCSS = function (){
        GM_addStyle('#tlmanager_controls { vertical-align:middle; padding:2px; font-family: Roboto,sans-serif; font-size: 13pt; border: 3px solid #000; border-radius: 4px; display: ' + Filter.ctrlPanelDisplay + '; width:100%}');
        GM_addStyle('#tlmanager_controls span { margin-left:6px; margin-right:6px;}');
        GM_addStyle('#tlmanager_controls > div.tlmanager_div { vertical-align:middle; display:inline-block;margin-left:6px; margin-right:6px;}');
        GM_addStyle('.tlmanager-button { margin-left:5px; margin-bottom:2px; padding:0; display: inline-block; width:32px; height:32px; vertical-align:middle; text-align:center;}');
        GM_addStyle('.tlmanager-button span { background-color: #000 }');
        GM_addStyle('.tlmanager-prompt {background: #fff}');
        GM_addStyle('.tlmanager-about { float:right; line-height:2; margin-right:2px; }');
        GM_addStyle('.tlmanager-about > span { vertical-align:middle;}');
        //CSS for Selects
        GM_addStyle("#tlmanager_controls select { \
-moz-appearance: none; \
-webkit-appearance: none; \
appearance: none; \
border: 1px solid #000; \
border-radius: 4px; \
padding-left: 5px; \
width: 355px; \
height: 100%; \
color: #000;}");

        GM_addStyle('div.tlmanager_select-wrapper { display: inline-block; position:relative; width: 350px; height: 35px;}');

        GM_addStyle("div.tlmanager_select-wrapper::before \
{ \
content:''; \
display: inline-block; \
width: 35px; \
height: 35px; \
position: absolute; \
background-color: black; \
border-radius: 2px; \
top: -0px; \
right: -4px; \
border-top-right-radius: 5px; \
border-bottom-right-radius: 5px; \
pointer-events: none; \
}");

        GM_addStyle("div.tlmanager_select-wrapper::after { \
content:''; \
display: inline-block; \
border-top: 8px dashed; \
border-top: 8px solid; \
border-right: 8px solid transparent; \
border-left: 8px solid transparent; \
position: absolute; \
color: white; \
left: 328px; \
top: 14px; \
pointer-events: none; \
}");
    };

    // Steuerelemente erzeugen
    Filter.createControls = function(){

        function getAttributeSelector() {
            return olGUI.getBootstrapDeviceSize() == 'ol-xs' ? '#dropdownTransferListPlayerAttributes2' : '#dropdownTransferListPlayerAttributes';
        }

        //Transferfee-Filter erzeugen
        function setTransferFeeFilter(valueFrom, valueTo){
            const filterBase = $("#playerAttributeFiltertransferFee");
            const tfInput = filterBase.find(".ol-double-slider");
            const tfTo = tfInput.attr("data-slider-max");
            const tfFrom = tfInput.attr("data-slider-min");
            tfInput.bootstrapSlider('destroy');
            const tfInputClone = tfInput.clone();
            tfInput.remove();
            filterBase.find(".ol-player-attribute-filter-from").after(tfInputClone);

            tfInputClone.attr("data-slider-step", 1);
            tfInputClone.attr("data-slider-value", ("[" + (valueFrom || tfFrom) + "," + (valueTo || tfTo) + "]"));

            tfInputClone.bootstrapSlider( {} );
            tfInputClone.bootstrapSlider().on("slideStop", function(ev){
                olTransferList.search();
            });

            tfInputClone.bootstrapSlider('refresh');
            tfInputClone.trigger("change");

            const tfToInput = $('#playerAttributeFiltertransferFee').find(".ol-double-slider-input-to");
            $(tfToInput).val(olGUI.numberWithPoints(valueTo || tfTo));
            $(tfToInput).attr("data-target", "#transferFeeSlider");
            $(tfToInput).attr("data-min", tfFrom);
            $(tfToInput).attr("data-max", tfTo);
            const tfFromInput = $('#playerAttributeFiltertransferFee').find(".ol-double-slider-input-from");
            $(tfFromInput).val(olGUI.numberWithPoints(valueFrom || tfFrom));
            $(tfFromInput).attr("data-target", "#transferFeeSlider");
            $(tfFromInput).attr("data-min", tfFrom);
            $(tfFromInput).attr("data-max", tfTo);
            return;
        }

        // Filter zurücksetzen
        function resetFilter(){
            setTransferFeeFilter();
            $("#olTransferListFilterList").find(".ol-tranfer-list-filter").each(
                (index,filter) => {
                    if (filter.id === "playerAttributeFilterpreferredFoot"){
                        olTransferList.updateDropdown();
                        $('#playerAttributeFilterpreferredFoot').insertAfter('#olTransferListFilterList').hide();
                    } else {
                        filter.remove();
                    }
                    olTransferList.updateDropdown();
                }
            );
        }

        // Filter erzeugen
        function buildFilter(attrId, value){
            if(attrId == -1)
            {
                return;
            }
            //++currentFilterCount;
            const li = $("#attrFilterId" + attrId);
            const name = li.text();

            const ended = $('#checkboxOffersEnded').is(':checked') ? true : false;

            const fromActive = li.attr("data-from-active");
            const toActive = li.attr("data-to-active");
            const fromEnded = li.attr("data-from-ended");
            const toEnded = li.attr("data-to-ended");

            const from = li.attr("data-from" + (ended ? '-ended' : '-active'));
            const to = li.attr("data-to" + (ended ? '-ended' : '-active'));
            const unit = li.attr("data-unit");

            let valueFrom;
            let valueTo;

            if (/^\d+,\d+$/.test(value)){
                valueFrom = value.split(",")[0];
                valueTo = value.split(",")[1];
            }

            // Fußfilter (Rechter Fuß/Linker Fuß/beidfüßig)
            if(attrId === "preferredFoot")
            {
                const filterBase = $('#playerAttributeFilterpreferredFoot');
                const input = filterBase.find(".ol-slider");
                input.bootstrapSlider('destroy');
                const inputClone = input.clone();
                input.remove();
                filterBase.find(".ol-player-attribute-filter-from").after(inputClone);

                if (value){
                    inputClone.attr("data-slider-value", (value));
                    inputClone.attr("value", value);
                    inputClone.attr("data-value", value);
                    inputClone.val(value);
                }
                inputClone.bootstrapSlider({ scale: 'linear' });
                inputClone.bootstrapSlider().on("change", function(ev)
                {
                    const val = parseInt(inputClone.val());
                    const labels = inputClone.attr('data-labels').split(',');
                    $('#preferredFootLabel').html(labels[val + 1]);
                    olTransferList.search();
                });
                $('#playerAttributeFilterpreferredFoot').appendTo('#olTransferListFilterList').show();
                if (value) {
                    const labels = inputClone.attr('data-labels').split(',');
                    const valueText = labels[parseInt(value,10) + 1];
                    $('#preferredFootLabel').html(valueText);
                }
                olTransferList.updateDropdown();
                return;
            }

            // Transferfee Filter
            if(attrId === "transferFee"){
                setTransferFeeFilter(valueFrom, valueTo);
                return;
            }

            // bestehender Attributfilter
            if($("#playerAttributeFilter" + attrId).length > 0){
                const filterBase = $("#playerAttributeFilter" + attrId);
                const input = filterBase.find(".ol-slider");
                input.attr("data-slider-value", ("[" + (valueFrom || from) + "," + (valueTo || to) + "]"));
                if (value){
                    input.attr("value", value);
                    input.attr("data-value", value);
                    input.val(value);
                }
                if (valueTo){
                    const toInput = $("#playerAttributeFilter" + attrId).find(".ol-double-slider-input-to");
                    $(toInput).val(olGUI.numberWithPoints(valueTo));
                }
                if (valueFrom){
                    const fromInput = $("#playerAttributeFilter" + attrId).find(".ol-double-slider-input-from");
                    $(fromInput).val(olGUI.numberWithPoints(valueFrom));
                }
                const sliderMin = filterBase.find(".min-slider-handle");
                let valueMax = 0;
                if (sliderMin){
                    valueMax = parseInt(sliderMin.attr("aria-valuemax"),10);
                    const minPercent = (valueFrom/(valueMax*100)).toFixed(4);
                    sliderMin.css("left", minPercent+"%");
                    sliderMin.attr("aria-valuenow", valueFrom);
                }
                const sliderMax = filterBase.find(".max-slider-handle");
                if (sliderMax){
                    valueMax = sliderMax.attr("aria-valuemax");
                    const maxPercent = (valueTo/(valueMax*100)).toFixed(4);
                    sliderMax.css("left", maxPercent+"%");
                    sliderMax.attr("aria-valuenow", valueTo);
                }
                olTransferList.updateDropdown();
                return;
            }

            // neuer Attributfilter
            const inputId = attrId + "slider";
            $("#playerAttributeFilterTemplate").show();
            const clone = $("#playerAttributeFilterTemplate").clone();
            $("#playerAttributeFilterTemplate").hide();
            clone.attr("id", "playerAttributeFilter" + attrId);
            clone.attr("data-attr-id", attrId);
            clone.find(".ol-player-attribute-filter-name").text(name);
            clone.find(".ol-double-slider-label-unit").text(unit);
            $("#olTransferListFilterList").append(clone);

            const input = clone.find(".ol-double-slider");
            input.attr("id", inputId);
            input.attr("data-slider-min-ended", fromEnded);
            input.attr("data-slider-max-ended", toEnded);
            input.attr("data-slider-min-active", fromActive);
            input.attr("data-slider-max-active", toActive);
            input.attr("data-slider-min", from);
            input.attr('data-attribute-id', attrId);
            input.attr("data-slider-max", to);
            input.attr("data-slider-step", 1);
            input.attr("data-slider-value", ("[" + (valueFrom || from) + "," + (valueTo || to) + "]"));
            if (value){
                input.attr("value", value);
                input.attr("data-value", value);
            }
            input.bootstrapSlider( (Math.abs(to) > 1000) ? { scale: 'logarithmic' } : {} );
            input.bootstrapSlider().on("slideStop", function(ev)
            {
                olTransferList.search();
            });
            input.trigger("change");

            const toInput = $("#playerAttributeFilter" + attrId).find(".ol-double-slider-input-to");
            $(toInput).val(olGUI.numberWithPoints(valueTo || to));
            $(toInput).attr("data-target", "#" + inputId);
            $(toInput).attr("data-min", from);
            $(toInput).attr("data-max", to);
            const fromInput = $("#playerAttributeFilter" + attrId).find(".ol-double-slider-input-from");
            $(fromInput).val(olGUI.numberWithPoints(valueFrom || from));
            $(fromInput).attr("data-target", "#" + inputId);
            $(fromInput).attr("data-min", from);
            $(fromInput).attr("data-max", to);
            const sliderMin = $("#playerAttributeFilter" + attrId).find(".min-slider-handle");
            if (sliderMin){
                sliderMin.attr("aria-valuenow", valueFrom);
            }
            const sliderMax = $("#playerAttributeFilter" + attrId).find(".max-slider-handle");
            if (sliderMax){
                sliderMax.attr("aria-valuenow", valueTo);
            }
            olTransferList.updateDropdown();
            // Weiteres Anlegen von Filtern verhindern
            const filterCount = $("div.player-attribute-filter-container div.ol-tranfer-list-filter[data-attr-id]:visible").length;
            if (!olGUI.isPremiumUser() && filterCount > 0){
                $('.transfer-filter-content-click-area').addClass('disabled').parent().addClass('premium-locked');
            } else if (filterCount > 2){
                $('.transfer-filter-content-click-area').addClass('disabled').parent().addClass('premium-locked');
            }
        }

        function evt_clickSave(){

            const actEntry = $('#tlmanager_selSaved').val() !== '' ? $('#tlmanager_selSaved option:selected').text() : '';
            const newEntry = prompt("Speichern unter", actEntry);
            if (newEntry){
                const filterPosition = $("#dropdownPlayerPosition").dropdown().value();
                const freeAgents = $("input#checkboxFreeAgents").is(':checked') ? 1 : 0;
                const offersEnded = $("input#checkboxOffersEnded").is(':checked') ? 1 : 0;
                const liquidity = $("input#checkboxLiquidity").is(':checked') ? 1 : 0;

                const filterValues = [];
                $(".ol-tranfer-list-filter[data-attr-id]").each(function(index, element){
                    element = $(element);
                    if(element.css("display") !== "none") {
                        const data_attr_id = element.attr("data-attr-id");
                        let value;
                        if(element.find(".ol-double-slider").length > 0){
                            value = element.find(".ol-double-slider").val().split(",");
                        } else {
                            value = element.find(".ol-slider").val();
                        }
                        filterValues.push(`${data_attr_id}:${value}`);
                    }
                });

                let sortValue = "";
                let sortToggle = "";

                const sortElem = $("div.olTableHeaderColumnToggle").filter((i,c) => $(c).is(":visible") && ($(c).attr("data-toggle") === "asc" || $(c).attr("data-toggle") === "desc"))[0];

                if(sortElem){
                    sortValue = $(sortElem).attr("data-value");
                    sortToggle = $(sortElem).attr("data-toggle");
                }

                const sortAttr = $(getAttributeSelector()).dropdown().value();

                const filterValueString = `${filterPosition}:${freeAgents}:${offersEnded}:${liquidity}:${sortValue}:${sortToggle}:${sortAttr}#${filterValues.join("#")}`;
                const entryVal = `ListManagerEntry|${newEntry.replace("|","_")}`;

                var matchingValue = $('#tlmanager_selSaved option').filter(function () {
                    return this.value.toLowerCase() === entryVal.toLowerCase();
                } ).attr('value');

                if (matchingValue){
                    GM_setValue(matchingValue, filterValueString);
                    $("#tlmanager_selSaved option[value='" + matchingValue + "']").text(newEntry);
                } else {
                    GM_setValue(entryVal, filterValueString);
                    $('#tlmanager_selSaved')
                        .append($("<option />")
                                .attr("value", entryVal)
                                .text(newEntry));
                }
                $('#tlmanager_selSaved').val(matchingValue || entryVal);
            } else if (newEntry === ''){
                alert("Name darf nicht leer sein");
            }
        }

        function evt_clickDel(){
            if (confirm("Eintrag löschen?")){
                const selectedValue = $('#tlmanager_selSaved').val();
                $("#tlmanager_selSaved option[value='" + selectedValue + "']").remove();
                GM_deleteValue(selectedValue);
                $('#tlmanager_selSaved').val('');
                $("#dropdownPlayerPosition").dropdown().selectByValue(0);
                $('#tlmanager_selSaved').trigger('change');
            }
        }

        function evt_clickDelAll(){
            if (confirm("Alle Einträge löschen?") && confirm("Wirklich ALLE ALLE Einträge löschen?")){
                for (const v of GM_listValues()){
                    if (v.startsWith('ListManagerEntry|')){
                        $("#tlmanager_selSaved option[value='" + v + "']").remove();
                        GM_deleteValue(v);
                    }
                }
                $('#tlmanager_selSaved').val('');
                $("#dropdownPlayerPosition").dropdown().selectByValue(0);
                $('#tlmanager_selSaved').trigger('change');
            }
        }

        function evt_loadFilter(){
            const selectedValue = $('#tlmanager_selSaved').val();
            resetFilter();
            if (selectedValue === "") {
                $("#dropdownPlayerPosition").dropdown().selectByValue(0);
                olTransferList.updateDropdown();
                olTransferList.search();
                return;
            }
            const storedFilter = GM_getValue(selectedValue);
            if (!storedFilter){
                alert(`Konnte Filter ${selectedValue} nicht laden`);
                return;
            }
            const filterValues = storedFilter.split("#");
            const subFilters = filterValues[0].split(":");

            const playerPosition = parseInt(subFilters[0],10);
            const freeAgents = parseInt(subFilters[1],10);
            const offersEnded = parseInt(subFilters[2],10);
            const liquidity = parseInt(subFilters[3],10);

            $("#dropdownPlayerPosition").dropdown().selectByValue(playerPosition);
            $("input#checkboxFreeAgents").prop('checked', freeAgents === 1);
            $("input#checkboxOffersEnded").prop('checked', offersEnded === 1);
            $("input#checkboxLiquidity").prop('checked', liquidity === 1);

            if (subFilters[4].length > 0){
                olTransferList.sort.by = subFilters[4];
            }

            if (subFilters[5].length > 0){
                olTransferList.sort.sorting = subFilters[5];
                $(".olTableHeaderColumnToggle").attr("data-toggle", "none");
                $(".olTableHeaderColumnToggle[data-value='" + subFilters[4] + "']").attr("data-toggle", subFilters[5]);
            }

            $(getAttributeSelector()).dropdown().selectByValue(subFilters[6]);

            for (let i = 1; i < filterValues.length; i++){
                const v = filterValues[i];
                const attrId = v.split(":")[0];
                const value = v.split(":")[1];
                buildFilter(attrId, value);
            }
            olTransferList.search();
        }

        if ($('#tlmanager_controls').length > 0) {
            return;
        }
        const ctrlTLManager = $('<div class="tlmanager_div" id="tlmanager_controls"><span id="spnTLManagerLabel">Transferlisten-Manager </span><span id="spnTLManagerVersion">v.'+GM_info.script.version+'</span></div>');
        //$("div#transferListContent").prepend(ctrlTLManager);
        ctrlTLManager.insertBefore("div#transferListContent");
        const selSaved = $('<select id="tlmanager_selSaved"></select>');
        const selSavedWrapper = $('<div class="tlmanager_select-wrapper"></div>');
        selSavedWrapper.append(selSaved);
        ctrlTLManager.append(selSavedWrapper);
        const divAbout = $('<div class="tlmanager-about"> &copy; <div style="display:inline" class="ol-user-name " onclick="messageSystem.openChatWithUser(19787);"> KnutEdelbert <div class=" msg-icon-class"><span class="icon-ol-speechbubble-icon liveticker-contact"></span></div></div></div>');
        const btnDel = $('<button title="Löschen" class="ol-button ol-button-rectangle tlmanager-button" id="btnTlmanagerDel" style="background:red"><span id="tlmanager_IconDel" class="fa fa-trash-o" style="background:red"></span></button>');
        const btnDelAll = $('<button title="Alle Löschen" class="ol-button ol-button-rectangle tlmanager-button" id="btnTlmanagerDelAll" style="background:darkred"><span id="tlmanager_IconDelAll" class="fa fa-trash" style="background:darkred"></span></button>');
        const btnLoad = $('<button title="Neu Laden" class="ol-button ol-button-rectangle tlmanager-button" id="btnTlmanagerLoad" style="margin-left:10px;"><span id="tlmanager_IconLoad" class="fa fa-refresh"></span></button>');
        const btnSave = $('<button title="Speichern" class="ol-button ol-button-rectangle tlmanager-button" id="btnTlmanagerSave"><span id="tlmanager_IconSave" class="fa fa-floppy-o"></span></button>');
        ctrlTLManager.append(btnLoad);
        ctrlTLManager.append(btnSave);
        ctrlTLManager.append(btnDel);
        ctrlTLManager.append(btnDelAll);
        ctrlTLManager.append(divAbout);
        btnSave.click(evt_clickSave);
        btnDel.click(evt_clickDel);
        btnDelAll.click(evt_clickDelAll);
        btnLoad.click(evt_loadFilter);
        const savedValues = GM_listValues().filter(v => {return v.startsWith("ListManagerEntry|");});
        $('#tlmanager_selSaved')
                .append($("<option />")
                        .attr("value", "")
                        .text(" -- Auswahl -- "));
        for (const val of savedValues){
            const selValue = val.split("|")[1];
            $('#tlmanager_selSaved')
                .append($("<option />")
                        .attr("value", val)
                        .text(selValue));
        }
        $('#tlmanager_selSaved').change(evt_loadFilter);
    };

    Filter.startTLM = function (){
        Filter.createControls();
    };

    /***
     * Einkaufspreis
     ***/

    const Offer = {};

    Offer.setCSS = function(){
        GM_addStyle(".ToolboxOfferRenew:hover { background: #DDDDFF; }");
    };

    Offer.showPurchasePrice = async function (){
        $("div#purchasePrice").remove();
        let playerId = Offer.tmpPlayerId;
        playerId = playerId || parseInt($("div#dropdownPlayerIds").attr("data-value"), 10);
        const hist = await api.getTransferHistory(playerId);
        if (hist.length){
            const lastHist = hist[0];
            const pPrice = lastHist.transferFeeText ? lastHist.transferFeeText : " n/a ";
            const ekSpan = lastHist.transferFeeText? `<span title="Saison ${lastHist.season} Spieltag ${lastHist.matchDay}">(${lastHist.season}/${lastHist.matchDay})</span>` : "";
            $(`<div id="purchasePrice" class="player-transfer-market-value text-left"><span class="uppercase" titke="Einkaufspreis">EK-Preis:</span> <span id="marketValue">${pPrice}${ekSpan}</span></div>`).insertAfter("div.player-transfer-market-value.text-left");
        }
        Offer.tmpPlayerId = undefined;
    };

    Offer.createRenewOffer = function(offer){

        const offerClick = offer.attr("onclick");
        const offerId = offerClick ? parseInt(offerClick.match(/showPlayerView\s*\((\d+)\s*,/)[1],10) : 0;
        if (offerId === 0){
            return;
        }

        function renewOffer(event){
            event.preventDefault();
            event.stopPropagation();
            async function showOffer(){
                const offerData = await OLCore.Api.getOffer(offerId);
                Offer.tmpPlayerId = offerData.playerId;
                const li = $(`#player${offerData.playerId}`);
                if (li.length === 0){
                    alert("Spieler nicht auswählbar (schon angeboten/nicht mehr im Kader?)");
                    return;
                }
                const dataOfferPlayer = JSON.parse(li.attr("data-offer-player"));
                const marketValue = dataOfferPlayer.marketValue;
                dataOfferPlayer.marketValue = offerData.minFee;
                li.attr("data-offer-player", JSON.stringify(dataOfferPlayer));
                olTransferList.onClickCreateOfferOverviewPlayer(offerData.playerId);
                $("div#dropdownPlayerIds > button > span.ol-dropdown-text").html(li.find("span.contract-player-lineup.team-overview-player-lineup-mark").parent().html());
                $('#marketValue').html(olGUI.numberWithPoints(marketValue));
                dataOfferPlayer.marketValue = marketValue;
                li.attr("data-offer-player", JSON.stringify(dataOfferPlayer));
                //await Offer.showPurchasePrice(offerData.playerId);
            }
            olOverlayWindow.load('transferlist/getcreateofferoverlayview', null, showOffer);
        }

        const renewButton = $(`<div style="float:left;margin-top:-3px;margin-right:-5px;" title="Angebot wiederholen" class="ToolboxOfferRenew" id="renew${offerId}"><span id="tlmanager_IconLoad" class="fa fa-refresh fa-lg"></span></div>`);
        offer.find(`div.icon-red_cross`).before(renewButton);
        const renewButtonMobile = $(`<div style="display:inline-block;position:absolute;left:-20px;" title="Angebot wiederholen" class="ToolboxOfferRenew" id="renewMobile${offerId}"><span id="tlmanager_IconLoad" class="fa fa-refresh fa-lg"></span></div>`);
        offer.next().next().find(`div.icon-red_cross`).before(renewButtonMobile);
        renewButton.click(renewOffer);
        renewButtonMobile.click(renewOffer);
    };

    /***
     * Zusatzdaten für Trades
     ***/

    const Details = {};

    Details.showPlayerSpecificDataOnTrades = function()
    {
        var playerId = OLCore.convertNumber($("#playerView #playerViewContent .player-view-head .player-steckbrief").attr("onclick"),true);
        if(playerId)
        {
            $.get("https://www.onlineliga.de/player/overview?playerId=" + playerId,function(data){
                if(data){
                    var oldBirthdate = parseInt(OLCore.convertNumber($(data).find(".playeroverviewtablestriped div:nth-child(5) div:nth-child(2) div:nth-child(2)").first().text()),10);
                    var field = $(".player-view-detail div.row:nth-child(1) div.player-attr-unit").first();
                    var fieldMobile = $(".player-view-detail div.player-attr-unit").eq(6);
                    field.html(field.html() + "<div style='font-size:10pt'>Woche: " + (oldBirthdate - 1 || 44) + "</div>");
                    fieldMobile.html(fieldMobile.html() + "<div style='font-size:10pt'>Woche: " + (oldBirthdate - 1 || 44) + "</div>");

                    var overAllStats = $(data).find(".player-info-stats-mobile div.col-xs-4").first().text().replace(/ /g,'').trim();
                    var fieldStats = $(".player-view-detail div.row:nth-child(1) div.player-attr").eq(1).parent();
                    var fieldSmall = $(".player-view-detail div.player-attr").eq(6).parent();
                    var fieldMobileStats = $(".hidden-xs div.player-attr").eq(5).parent();

                    fieldStats.prepend("<span style='font-size:10pt;'>" + overAllStats + "</span>");
                    fieldSmall.prepend("<span style='font-size:10pt;'>" + overAllStats + "</span>");
                    fieldMobileStats.prepend("<span style='font-size:10pt;'>" + overAllStats + "</span>");


                    var cardsAllStats = $(data).find(".player-info-stats-mobile div.col-xs-3").first().text().replace(/ /g,'').trim();
                    var fieldCardStats = $(".player-view-detail div.row:nth-child(1) div.player-attr").eq(2);
                    var fieldSmallCardStats = $(".player-view-detail div.player-attr").eq(9);
                    var fieldMobileCardStats = $(".hidden-xs div.player-attr").eq(6);
                    var fielInfoCardStats = $(".player-view-detail div.row:nth-child(1) div.player-attr-unit").eq(2);
                    var fieldInfoMobileCardStats = $(".player-view-detail div.player-attr-unit").eq(13);
                    var fieldInfoSmall = $(".player-view-detail div.player-attr-unit").eq(10);

                    //Seasoncards
                    var cardData = $(data).find(".player-cards-this-season span");
                    var yellow = 0;
                    var yellowRed = 0;
                    var red = 0;
                    for(var i = 0; i < cardData.length; i=i+2)
                    {
                        if(cardData.eq(i).hasClass("icon-lineup_icon_yellow")){
                            yellow = OLCore.convertNumber(cardData.eq(i+1).html(),true);
                        }
                        else if(cardData.eq(i).hasClass("icon-lineup_icon_yellowred")){
                            yellowRed = OLCore.convertNumber(cardData.eq(i+1).html(),true);
                        }
                        else if(cardData.eq(i).hasClass("icon-lineup_icon_red")){
                            red = OLCore.convertNumber(cardData.eq(i+1).html(),true);
                        }
                    }

                    fielInfoCardStats.html("(G/GR/R)");
                    fieldInfoMobileCardStats.html("(G/GR/R)");
                    fieldInfoSmall.html("(G/GR/R)");
                    fieldCardStats.html(yellow + "/" + yellowRed + "/" + red);
                    fieldSmallCardStats.html(yellow + "/" + yellowRed + "/" + red);
                    fieldMobileCardStats.html(yellow + "/" + yellowRed + "/" + red);
                    //Allcards
                    fieldCardStats.parent().prepend("<span style='font-size:10pt;'>" + cardsAllStats + "</span>");
                    fieldSmallCardStats.parent().prepend("<span style='font-size:10pt;'>" + cardsAllStats + "</span>");
                    fieldMobileCardStats.parent().prepend("<span style='font-size:10pt;'>" + cardsAllStats + "</span>");
                }
            });
        }
    };

    Details.showAssistsOnTrades = function()
    {

        var playerId = OLCore.convertNumber($("#playerView #playerViewContent .player-view-head .player-steckbrief").attr("onclick"), true);
        var userId = $('#transferListContent .ol-user-name').attr("onclick");
        var teamLink = "https://www.onlineliga.de/team/overview/squad?userId=";
        if(userId && playerId)
        {
         userId = OLCore.convertNumber(userId.convertNumber,true);
         $.get(teamLink + userId, function(data){
             if(data){
                 var contentAdd = $(data).find("span[onclick*='"+playerId+"']").first().parent().parent().parent().children().eq(4).html();
                 var field = $(".player-view-detail div.row:nth-child(1) div.player-attr").eq(1);
                 var infoField = $(".player-view-detail div.row:nth-child(1) div.player-attr-unit").eq(1);
                 var fieldMobile = $(".hidden-xs div.player-attr").eq(5);
                 var infoFieldMobile = $(".hidden-xs div.player-attr-unit").eq(6);
                 var fieldSmall = $(".player-view-detail div.player-attr").eq(6);
                 var infoFieldSmall = $(".player-view-detail div.player-attr-unit").eq(7);

                 field.html(contentAdd);
                 fieldMobile.html(contentAdd);
                 fieldSmall.html(contentAdd);

                 infoField.html(infoField.html().trim() + "/Vorl.");
                 infoFieldMobile.html(infoFieldMobile.html().trim() + "/Vorl.");
                 infoFieldSmall.html(infoFieldSmall.html().trim() + "/Vorl.");

                 infoField.css("font-size","10pt");
                 infoFieldMobile.css("font-size","10pt");
                 infoFieldSmall.css("font-size","10pt");
             }
         });
        }
    };

    Details.showTradeDetails = function ()
    {
        Details.showAssistsOnTrades();
        Details.showPlayerSpecificDataOnTrades();
    };

    function init(){

        Offer.setCSS();
        Filter.ctrlPanelDisplay = GM_getValue('tlmanager_ctrlPanelDisplay') || 'inline-block';
        Filter.setCSS();

        function WFKE_Details_showTradeDetails(){
            Details.showTradeDetails();
        }

        OLCore.waitForKeyElements(
            //"div#transferListCreateOfferOverlayPlayerDetailContainer > div.ol-player-details.ol-player-details-selected",
            "div.row.create-offer-overlay-content-wrapper div#dropdownPlayerIds span.ol-dropdown-text > span.contract-player-lineup",
            function(){ Offer.showPurchasePrice(); }
        );

        OLCore.waitForKeyElements (
            "div.transferlist-headline",
            Filter.startTLM
        );

        OLCore.waitForKeyElements(
            "div#playerViewContent",
            WFKE_Details_showTradeDetails
        );

        OLCore.waitForKeyElements(
            "div.ol-offer-ended.ol-offer-not-accepted",
            Offer.createRenewOffer
        );

    }

    if (!window.OLToolboxActivated) {
       init();
    } else {
        window.OnlineligaTransferHelper = {
            init : init
        };
    }

})();

