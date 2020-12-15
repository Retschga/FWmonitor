'use strict';

// Modul Kalender
module.exports = function () {

    // ----------------  STANDARD LIBRARIES ---------------- 
    const ical = require('node-ical');
    const debug = require('debug')('calendar');

    // ----------------  Datenbank ---------------- 
	const db = require('./database')();



    /**
     * Sorts earliest to latest
     * @param {*} a Element 1
     * @param {*} b Element 2
     */
    function sortByDate(a, b) {0
        if(b.start == '') return 1;
        if(a.start == '') return -1;
        return new Date(a.start) - new Date(b.start);
    }

    /**
     * Entferne Gruppenpatterns aus Terminname
     * @param {String} str Terminname
     */
    function removePattern(str) {
        let ret = String(str);
        ret = ret.replace(/{{[^}]*}}/gi, '');
        return ret;
    }

    /**
     * Lese Kalender im Pattern Format
     * @param {Boolean} getAll Gebe vergangene Einträge aus
     */
    function getCalendarByPattern(getAll = false) {
        return new Promise(async (resolve, reject) => {

            let rows_kalendergruppen = await db.getKalendergruppen().catch((err) => { console.error('[calendar] DB Fehler', err); reject(err); });            
            let rows_kalender = await db.getKalender().catch((err) => { console.error('[calendar] DB Fehler', err); reject(err); });
            let result = [];

            // DB Kalendereinträge
            for(let i = 0; i < rows_kalender.length; i++) {
                let entry = rows_kalender[i];

                // Ist Eintrag in der Zukunft
                if (getAll != true && new Date(entry.start) < Date.now()) continue; 

                // Hat Eintrag eine Gruppe
                if(entry.group != '')
                    entry.group = entry.group.split('|');
                else
                    entry.group = []; 

                // Eintragsgruppen auswerten
                let group = [];                                
                for(let i = 0; i < entry.group.length; i++) { 
                    group.push({id: entry.group, name: rows_kalendergruppen[parseInt(entry.group)-1].name});
                }
                // Keine Gruppe angegeben -> alle
                if(group.length < 1) {
                    group.push({id: rows_kalendergruppen[0].id, name: rows_kalendergruppen[0].name});
                }

                // Hat Eintrag eine Erinnerung gesetzt
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
            
            // ICAL Kalendereinträge
            if(process.env.ICAL_LINK != '') {
                ical.fromURL(process.env.ICAL_LINK, {}, function (err, data) {
                    if (err) {
                        console.error("ICAL Kalender Error: ", err);
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
                                for(let i = 0; i < rows_kalendergruppen.length; i++) {
                                    if(entry.summary.indexOf(rows_kalendergruppen[i].pattern) != -1) {
                                        group.push({id: rows_kalendergruppen[i].id, name: rows_kalendergruppen[i].name});
                                    }
                                }
                                // Keine Gruppe angegeben -> alle
                                if(group.length < 1) {
                                    group.push({id: rows_kalendergruppen[0].id, name: rows_kalendergruppen[0].name});
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

                    // Kalendereinträge sortieren
                    result.sort(sortByDate);

                    // Einträge zurückgeben
                    resolve(result);
                }); 
            } else {
                // Kalendereinträge sortiern
                result.sort(sortByDate);

                // Einträge zurückgeben
                resolve(result);
            }
        });
    }

    /**
     * Wandelt Pattern zu String Format
     */
    function getCalendarString() {
        return new Promise(async resolve => {

            // Kalender in Pattern Darstellung einlesen
            let list_Kalender = await getCalendarByPattern().catch((err) => { console.error('[calendar] DB Fehler', err); reject(err); });
 
            var termine = [];
            for (let i in list_Kalender) {
                var elem = list_Kalender[i];

                // Eintragsgruppen
                let grupp = "";
                for(let j = 0; j < elem.group.length; j++) {
                    if(elem.group[j].id != 1)
                        grupp += '[' + elem.group[j].name + '] ';
                }
                    
                // Eintragsdatum
                var m = new Date(elem.start).getMonth();
                m += 1;
                if (m < 10)
                    m = "0" + m;
                var d = new Date(elem.start).getDate();
                if (d < 10)
                    d = "0" + d;

                var hh = new Date(elem.start).getHours();
                if (hh < 10)
                    hh = "0" + hh;
                var mm = new Date(elem.start).getMinutes();
                if (mm < 10)
                    mm = "0" + mm;

                // Termin-String schreiben
                termine.push({string: `${d}.${m}. ${hh}:${mm} - ${elem.summary} ${elem.location} ${grupp}`, group: elem.group});

            }

            // Ergebnis zurückgeben
            resolve(termine);
        });
    }


    return {
        getCalendarString,
        getCalendarByPattern
    }; 
}