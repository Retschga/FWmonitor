'use strict';

// Modul Alarmverarbeitung FAX

// ---------------- Textsuche ----------------
function searchElement(start, end, data) {
    var s = data.search(start);
    if (s >= 0) {
        s += start.length;
        var e = data.slice(s).search(end);
        var elem = data.slice(s, s + e);
        return elem;
    }
    return null;
}

// ---------------- Fax Suchworte (RegEx) ----------------
// Filtert Teil aus dem Fax zwischen Filter Beginn und Filter Ende (\n ist eu Zeile)
exports.EINSATZSTICHWORT = "-/-"; 				// Variable
exports.s_EINSATZSTICHWORT = "Stichwort : ";	// Filter Beginn
exports.e_EINSATZSTICHWORT = "\n";				// Filter Ende

exports.SCHLAGWORT = "-/-";						// Variable
exports.s_SCHLAGWORT = "Schlagw. : ";			// Filter Beginn
exports.e_SCHLAGWORT = "\n";					// Filter Ende

exports.OBJEKT = "-/-";							// Variable
exports.s_OBJEKT = "Objekt : ";					// Filter Beginn
exports.e_OBJEKT = "\n";						// Filter Ende

exports.BEMERKUNG = "-/-";						// Variable
exports.s_BEMERKUNG = "BEMERKUNG";				// Filter Beginn
exports.e_BEMERKUNG = "EINSATZHINWEIS";			// Filter Ende

exports.STRASSE = "-/-";						// Variable
exports.s_STRASSE = "Straße : ";				// Filter Beginn
exports.e_STRASSE = "\n";						// Filter Ende

exports.ORTSTEIL = "-/-";						// Variable
exports.s_ORTSTEIL = "Ortsteil : ";				// Filter Beginn
exports.e_ORTSTEIL = "\n";						// Filter Ende

exports.ORT = "-/-";							// Variable
exports.s_ORT = "Gemeinde : ";					// Filter Beginn
exports.e_ORT = "\n";							// Filter Ende

exports.EINSATZMITTEL = "";						// Variable
exports.s_EINSATZMITTEL = "EINSATZMITTEL";		// Filter Beginn
exports.e_EINSATZMITTEL = "BEMERKUNG";			// Filter Ende

exports.cars1 = [];								// Variable Fahrzeuge eigen
exports.cars2 = [];								// Variable Fahrzeuge andere
exports.s_CAR = "Name : ";						// Filter Beginn
exports.e_CAR = "\n";							// Filter Ende
exports.CAR1 = process.env.FW_NAME;				// Filter um als eigenes Fahrzeug erkannt zu weden (aus .env)


// ---------------- Fax Ersetzungen ----------------
exports.replaceData = function(data) {
    data = data.replace(/[—_*`]/g, '-');

    return data;
}

// ---------------- Fax Datenauswertung ----------------
exports.parseData = function(data) {
    // Variablen leeren
    this.EINSATZSTICHWORT = "-/-";
    this.SCHLAGWORT = "-/-";
    this.OBJEKT = "-/-";
    this.BEMERKUNG = "-/-";
    this.STRASSE = "-/-";
    this.ORTSTEIL = "-/-";
    this.ORT = "-/-";
    this.EINSATZMITTEL = "-/-";
    this.cars1 = [];
    this.cars2 = [];

    this.EINSATZSTICHWORT = searchElement(this.s_EINSATZSTICHWORT, this.e_EINSATZSTICHWORT, data);
    if(this.EINSATZSTICHWORT == null) this.EINSATZSTICHWORT = "";
    
    this.SCHLAGWORT = searchElement(this.s_SCHLAGWORT, this.e_SCHLAGWORT, data);
    if(this.SCHLAGWORT == null) this.SCHLAGWORT = "";
    this.SCHLAGWORT = this.SCHLAGWORT.replace('#', ' ');
    this.SCHLAGWORT = this.SCHLAGWORT.substr(this.SCHLAGWORT.search('#'));
    this.SCHLAGWORT = this.SCHLAGWORT.replace(/#/g, ' ');
    
    this.OBJEKT = searchElement(this.s_OBJEKT, this.e_OBJEKT, data);
    if(this.OBJEKT == null) this.OBJEKT = "";
    
    this.BEMERKUNG = searchElement(this.s_BEMERKUNG, this.e_BEMERKUNG, data);
    if(this.BEMERKUNG == null) this.BEMERKUNG = "";
    this.BEMERKUNG = this.BEMERKUNG.replace(/-/g, '');
    
    this.STRASSE = searchElement(this.s_STRASSE, this.e_STRASSE, data);
    if(this.STRASSE == null) this.STRASSE = "";
    
    this.ORTSTEIL = searchElement(this.s_ORTSTEIL, this.e_ORTSTEIL, data);
    if(this.ORTSTEIL == null) this.ORTSTEIL = "";
    
    this.ORT = searchElement(this.s_ORT, this.e_ORT, data);
    if(this.ORT == null) this.ORT = "";
    
    this.EINSATZMITTEL = searchElement(this.s_EINSATZMITTEL, this.e_EINSATZMITTEL, data);
    if(this.EINSATZMITTEL == null) this.EINSATZMITTEL = "";
    this.EINSATZMITTEL = this.EINSATZMITTEL.replace(/-/g, '');

    var cars = this.EINSATZMITTEL.split("\n");
    for (let i in cars) {
        var c = searchElement(this.s_CAR, this.e_CAR, cars[i] + "\n");

        var regex = RegExp(this.CAR1, 'gi');
        
        if (c != null) {                    
            if (regex.test(cars[i])) 
                this.cars1.push(c);
            else
                this.cars2.push(c);
        }
    }
}