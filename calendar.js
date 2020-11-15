'use strict';

// Modul Kalender
module.exports = function () {

    // ----------------  STANDARD LIBRARIES ---------------- 
    const ical = require('node-ical');
    const debug = require('debug')('calendar');

    // ----------------  Datenbank ---------------- 
	const db = require('./database')();



    // Sorts earliest to latest
    function sortByDate(a, b) {0
        if(b.start == '') return 1;
        if(a.start == '') return -1;
        return new Date(a.start) - new Date(b.start);
    }

    // Entferne Gruppenpatterns
    function removePattern(str) {
        let ret = String(str);
        ret = ret.replace(/{{[^}]*}}/gi, '');
        return ret;
    }


    // Lese Kalender im Pattern Format
    function getCalendarByPattern(getAll = false) {
        return new Promise(async (resolve, reject) => {

            let kalendergruppen = await db.getKalendergruppen().catch((err) => { console.error('[calendar] DB Fehler', err); reject(err); });            
            let kalender = await db.getKalender().catch((err) => { console.error('[calendar] DB Fehler', err); reject(err); });
            let result = [];

            for(let i = 0; i < kalender.length; i++) {
                let entry = kalender[i];

                // Ist in Zukunft
                if (getAll != true && new Date(entry.start) < Date.now()) continue; 

                if(entry.group != '')
                    entry.group = entry.group.split('|');
                else
                    entry.group = []; 

                // Gruppen auslesen
                let group = [];                                
                for(let i = 0; i < entry.group.length; i++) { 
                    group.push({id: entry.group, name: kalendergruppen[parseInt(entry.group)-1].name});
                }
                // Keine Gruppe angegeben -> alle
                if(group.length < 1) {
                    group.push({id: kalendergruppen[0].id, name: kalendergruppen[0].name});
                }

                if(entry.remind != '') 
                entry.remind = new Date(entry.remind);

                 // Termin speichern
                result.push({
                    summary: entry.summary,
                    start: entry.start,
                    end: '',
                    location: '',
                    remind: entry.remind,
                    group: group,
                    id: entry.id
                });   
            }
            
            if(process.env.ICAL_LINK != '') {
                ical.fromURL(process.env.ICAL_LINK, {}, function (err, data) {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }

                    
                    Object.keys(data).forEach(function (key) {
                        var entry = data[key];

                        // Hat Text
                        if (entry.summary) {

                            // Ist in Zukunft
                            if (new Date(entry.start) > Date.now() || getAll == true) {   
                                let oKeys = Object.keys(entry);                           

                                // Erinnerung auslesen
                                let remind = undefined;
                                if (entry[oKeys[oKeys.length - 1]].type != undefined && entry[oKeys[oKeys.length - 1]].type == "VALARM") {		
                                    var trig = entry[oKeys[oKeys.length - 1]].trigger;
                                    var d = trig.substring(trig.indexOf("P")+1, trig.indexOf("D"));
                                    var h = trig.substring(trig.indexOf("T")+1, trig.indexOf("H"));
                                    var m = trig.substring(trig.indexOf("H")+1, trig.indexOf("M"));  
                                    var dateOffset = d*(24*60*60*1000) + h*(60*60*1000) + m*(60*1000);
                                
                                    remind = new Date(entry.start);
                                    remind.setTime(remind.getTime() - dateOffset);
                                }

                                // Gruppen auslesen
                                let group = [];                       
                                for(let i = 0; i < kalendergruppen.length; i++) {
                                    if(entry.summary.indexOf(kalendergruppen[i].pattern) != -1) {
                                        group.push({id: kalendergruppen[i].id, name: kalendergruppen[i].name});
                                    }
                                }
                                // Keine Gruppe angegeben -> alle
                                if(group.length < 1) {
                                    group.push({id: kalendergruppen[0].id, name: kalendergruppen[0].name});
                                }

                                // Termin speichern
                                result.push({
                                    summary: removePattern(entry.summary),
                                    start: entry.start,
                                    end: entry.end,
                                    location: entry.location,
                                    remind: remind,
                                    group: group
                                });   
                            }                     
                        }
                    });
                    result.sort(sortByDate);
                    resolve(result);
                }); 
            } else {
                result.sort(sortByDate);
                    resolve(result);
            }
        });
    }

    // Wandelt Pattern zu String Format
    function getCalendarString() {
        return new Promise(async resolve => {
            let rows = await getCalendarByPattern().catch((err) => { console.error('[calendar] DB Fehler', err); reject(err); });
 
            var termine = [];
            for (let i in rows) {
                var k = rows[i];

                let grupp = "";
                for(let j = 0; j < k.group.length; j++) {
                    if(k.group[j].id != 1)
                        grupp += '[' + k.group[j].name + '] ';
                }
                    
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
                termine.push({string: `${d}.${m}. ${hh}:${mm} - ${k.summary} ${k.location} ${grupp}`, group: k.group});

            }
            resolve(termine);
        });
    }


    return {
        getCalendarString,
        getCalendarByPattern
    }; 
}