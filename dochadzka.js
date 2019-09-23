(function() {
    // Date.prototype.format() - By Chris West - MIT Licensed
    let D = "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday".split(","),
        M = "January,February,March,April,May,June,July,August,September,October,November,December".split(",");
    Date.prototype.format = function (format) {
        let me = this;
        return format.replace(/a|A|Z|S(SS)?|ss?|mm?|HH?|hh?|D{1,4}|M{1,4}|YY(YY)?|'([^']|'')*'/g, function (str) {
            let c1 = str.charAt(0),
                ret = str.charAt(0) == "'" ? (c1 = 0) || str.slice(1, -1).replace(/''/g, "'") : str == "a" ? (me.getHours() < 12 ? "am" : "pm") : str == "A" ? (me.getHours() < 12 ? "AM" : "PM") : str == "Z" ? (("+" + -me.getTimezoneOffset() / 60).replace(/^\D?(\D)/, "$1").replace(/^(.)(.)$/, "$10$2") + "00") : c1 == "S" ? me.getMilliseconds() : c1 == "s" ? me.getSeconds() : c1 == "H" ? me.getHours() : c1 == "h" ? (me.getHours() % 12) || 12 : (c1 == "D" && str.length > 2) ? D[me.getDay()].slice(0, str.length > 3 ? 9 : 3) : c1 == "D" ? me.getDate() : (c1 == "M" && str.length > 2) ? M[me.getMonth()].slice(0, str.length > 3 ? 9 : 3) : c1 == "m" ? me.getMinutes() : c1 == "M" ? me.getMonth() + 1 : ("" + me.getFullYear()).slice(-str.length);
            return c1 && str.length < 4 && ("" + ret).length < str.length ? ("00" + ret).slice(-str.length) : ret;
        });
    };
    Date.prototype.toHoursMins = function() {
        return this.toTimeString().slice(0,5);
    }
    Date.prototype.dateAdd = function(interval, units) {
        let ret = new Date(this); //don't change original date
        let checkRollover = function() { if(ret.getDate() != date.getDate()) ret.setDate(0);};
        switch(interval.toLowerCase()) {
            case 'year'   :  ret.setFullYear(ret.getFullYear() + units); checkRollover();  break;
            case 'quarter':  ret.setMonth(ret.getMonth() + 3*units); checkRollover();  break;
            case 'month'  :  ret.setMonth(ret.getMonth() + units); checkRollover();  break;
            case 'week'   :  ret.setDate(ret.getDate() + 7*units);  break;
            case 'day'    :  ret.setDate(ret.getDate() + units);  break;
            case 'hour'   :  ret.setTime(ret.getTime() + units*3600000);  break;
            case 'minute' :  ret.setTime(ret.getTime() + units*60000);  break;
            case 'second' :  ret.setTime(ret.getTime() + units*1000);  break;
            default       :  ret = undefined;  break;
        }
        return ret;
    };
    Date.prototype.addMinutes = function(minutes) {
        return this.dateAdd("minute", minutes);
    }
})();

let debug = false;

$(document).ready(function() {
    let newElement = $("<span></span>");

    let getNow = function() {
        return new Date();
    };
    let types = Object.freeze({ in: "Príchod", out: "Odchod" });

    let getNormDate = function(dateString) {
        let nowYear = getNow().getFullYear();
        let split = dateString.split('.');
        let timeSplit = split[2].split(":");
        let date = new Date(nowYear,
                            parseInt(split[1]) - 1,
                            parseInt(split[0]),
                            parseInt(timeSplit[0]),
                            parseInt(timeSplit[1]));
        return date;
    };

    let timeStringToMinutes = function(timeString) {
        let m = 1;
        if (timeString.charAt(0) == '-') {
            m = -1;
            timeString = timeString.substring(1);
        }
        let parts = timeString.split(":");
        return (m * (parseInt(parts[0]) * 60 + parseInt(parts[1])));
    };

    let pad = function(n) {
        return ("0" + n).slice(-2);
    };

    let toHoursMins = function(minutes, positive) {
        let sign = minutes > 0 ? (positive ? "+" : "") : (minutes < 0 ? "-" : "");
        let hours = Math.floor(Math.abs(minutes / 60));
        let mins = Math.abs(minutes % 60);
        return sign + hours + ':' + pad(mins);
    };

    let saldoSum = 0;
    let totalWorked = 0;
    let workDays = 0;
    let dayMins = 8 * 60;
    let worked = 0;

    let shouldParse = $("ol.breadcrumb").text().includes("Hromadný výkazDenné dáta");

    if (shouldParse) {
        let outputelement = $("#ctl00_phContent_ctl00_gridView_DXFooterRow").find("td:nth-child(6)");
        //let originalSaldo =  timeStringToMinutes(outputelement.text());
        let today = new Date();
        let rows = $("#gridView_DXMainTable tr.dxgvDataRow_Aktion3");
        rows.each(function() {
            let dateText = $(this).find('td:nth-child(2)').text().split(' ')[1];
            let startText = $(this).find('td:nth-child(3)').text();
            let workedText = $(this).find('td:nth-child(5)').text();
            let saldoText = $(this).find('td:nth-child(6)').text();
            let homeOfficeText = $(this).find('td:nth-child(7)').text();
            let breakText = $(this).find('td:nth-child(8)').text();

            if (dateText != today.format("DD.MM.")) {
                if (workedText && workedText.length > 4) {
                    workDays += 1;
                    totalWorked += timeStringToMinutes(workedText);
                }
                if (saldoText && saldoText.length > 4) {
                    saldoSum += timeStringToMinutes(saldoText);
                }
            }
            //saldoSum = totalWorked - (workDays * dayMins); //this does not work with half-days

            if (dateText == today.format("DD.MM.")) {
                let start, out,
                    worked = 0;
                let breakNotice = "";
                //if no nomeoffice and you haven't been on lunch break add a notice to "left to work today"
                if (homeOfficeText.length < 4 && breakText.length < 4) {
                    breakNotice += " <b>+00:30</b> for unclaimed lunch-break";
                }

                //if homeoffice on first half of day, add to worked!
                if (homeOfficeText.length > 4) {
                    worked += (timeStringToMinutes(homeOfficeText) * 60 * 1000);
                }

                let todayStart = getNormDate(dateText + " " + startText);

                let endElement = $(this).find('td:nth-child(4)');
                endElement.trigger('mouseover');

                setTimeout(function() {
                    let elm = $(".GTTPr_NormalView");
                    let date = today.format("DD.MM.");

                    let single = $(".GTTPr_NormalView").find(".GTTPr_Date:contains(" + date + ")");
                    let rows = single.parent().find("tr");
                    rows.each(function(index, row) {
                        let time = $(this).find("td:nth-child(1)").text();
                        let type = $(this).find("td:nth-child(2)").text();
                        let rowDateTime = getNormDate(dateText + " " + time);

                        if (type == types.out && index == 0) return true; //when you leave after midnight previous day :)

                        if (type == types.in) {
                            if (out) {
                                out = undefined;
                            } else if (index === 0) {
                                start = todayStart;
                            }
                            start = rowDateTime;
                        } else if (type == types.out) {
                            worked += rowDateTime - start;
                            out = rowDateTime;
                        }
                        console.log(`${time} ${type} ${toHoursMins(worked/1000/60)} (${worked/1000/60})`);
                    });
                    if (!out) { //compute with getNow()
                        worked += getNow() - start;
                    } else {
                        //add final saldo (we're out of work)
                        saldoSum += timeStringToMinutes(saldoText);
                    };

                    let originalText = newElement.html();
                    let workedMinsToday = Math.floor(worked / 1000 / 60);
                    let now = getNow();
                    console.log(`${now.toHoursMins()} Aktuálne ${toHoursMins(workedMinsToday)} (${workedMinsToday})`);
                    let saldoNow = out ? saldoSum : saldoSum + workedMinsToday - dayMins;

                    let leftToWorkToday = workedMinsToday >= dayMins ? 0 : dayMins - workedMinsToday;
                    let completeDayAt = now.addMinutes(dayMins - workedMinsToday);
                    let completeDayWithSaldo = completeDayAt.addMinutes(-1*saldoSum);
                    newElement.html(`${originalText}<br>`
                                    + `New saldo if you leave now: <b> ${toHoursMins(saldoNow, true)}</b><br>`
                                    + `8h day in <b> ${toHoursMins(leftToWorkToday)}</b> at ${completeDayAt.toHoursMins()}`
                                    + ` (0 total saldo at ${now.addMinutes(-1*saldoNow).toHoursMins()})`
                                    + ` ${breakNotice}`);

                }, 1000);

            }
            // console.log(dayMins - todayWorked / 1000 / 60);
        });

        newElement.insertAfter($(".pinedtotop").first());
        let originalText = newElement.html();
        if (debug) {
            newElement.html(`${originalText} total worked: ${toHoursMins(totalWorked)} in work days ${workDays}`);
            originalText = newElement.html();
        }
        newElement.html(originalText + "<br/>Saldo except today: <b>" + toHoursMins(saldoSum, true) + "</b>");
    }
});