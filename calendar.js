module.exports = function () {

    // Sorts earliest to latest
    function sortByDate(a, b) {
        return new Date(a.start) - new Date(b.start);
    }

    function getCalendarString() {
        return new Promise(resolve => {
            var ical = require('node-ical');
            ical.fromURL(process.env.ICAL_LINK, {}, function (err, data) {
                if (err) console.log(err);

                var result = [];
                Object.keys(data).forEach(function (key) {
                    var entry = data[key];
                    if (entry.summary) {
                        var oKeys = Object.keys(entry);
                        var remind = undefined;

                        if (entry[oKeys[oKeys.length - 1]].type != undefined && entry[oKeys[oKeys.length - 1]].type == "VALARM") {

                            var trig = entry[oKeys[oKeys.length - 1]].toString();
                            var h = trig.substring(trig.indexOf("T"), trig.indexOf("H"));
                            var m = trig.substring(trig.indexOf("H"), trig.indexOf("M"));

                            remind = new Date();
                            remind.setHours(remind.getHours() - h);
                            remind.setMinutes(remind.getMinutes() - m);
                        }
                       

                        result.push({
                            summary: entry.summary,
                            start: entry.start,
                            end: entry.end,
                            location: entry.location,
                            remind: remind
                        });
                    }
                });
                result.sort(sortByDate);
                var termine = "";
                for (let i in result) {
                    var k = result[i];
                    if (new Date(k.start) > Date.now()) {                        
                        var m = new Date(k.start).getMonth();
                        m += 1;
                        if (m < 10)
                            m = "0" + m;
                        var d = new Date(k.start).getDate();
                        if (d < 10)
                            d = "0" + d;

                        var hh = new Date(k.start).getHours();
                        if (hh < 10)
                            hh = "0" + hh;
                        var mm = new Date(k.start).getMinutes();
                        if (mm < 10)
                            mm = "0" + mm;
                        termine += `${d}.${m} ${hh}:${mm} - ${k.summary} ${k.location}\n`;
                    }
                }
                resolve(termine);
            }); 
        });
    }

    function getCalendarRemind() {
        return new Promise(resolve => {
            var ical = require('node-ical');
            ical.fromURL(process.env.ICAL_LINK, {}, function (err, data) {
                if (err) console.log(err);

                var result = [];
                Object.keys(data).forEach(function (key) {
                    var entry = data[key];
                    if (entry.summary) {
                        var oKeys = Object.keys(entry);
                        var remind = undefined;

                        if (entry[oKeys[oKeys.length - 1]].type != undefined && entry[oKeys[oKeys.length - 1]].type == "VALARM") {
		
                            var trig = entry[oKeys[oKeys.length - 1]].trigger;
							var d = trig.substring(trig.indexOf("P")+1, trig.indexOf("D"));
                            var h = trig.substring(trig.indexOf("T")+1, trig.indexOf("H"));
                            var m = trig.substring(trig.indexOf("H")+1, trig.indexOf("M"));
							
							var dateOffset = d*(24*60*60*1000) + h*(60*60*1000) + m*(60*1000);
							
                            //console.log(m);
                            
                            remind = new Date(entry.start);
							remind.setTime(remind.getTime() - dateOffset);
							//remind.setDate(remind.getDate() - d);
                            //remind.setHours(remind.getHours() - h);
                            //remind.setMinutes(remind.getMinutes() - m);
                        }


                        result.push({
                            summary: entry.summary,
                            start: entry.start,
                            end: entry.end,
                            location: entry.location,
                            remind: remind
                        });
                    }
                });
                result.sort(sortByDate);
   
                resolve(result);
            });
        });
    }

    return {
        getCalendarString: getCalendarString,
        getCalendarRemind: getCalendarRemind
    }; 
}