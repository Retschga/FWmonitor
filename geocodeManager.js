'use strict';

// Modul Alarmverarbeitung
module.exports = function () {
	
	// ----------------  STANDARD LIBRARIES ---------------- 
	const axios = require('axios');
	const debug = require('debug')('geocodeManager');
	const csv = require('csv-parser')
	const fs = require('fs')
	
	// ----------------  DIFFMATCH ---------------- 
	var diffmatch = require('./diff_match_patch.js');

	// ----------------  BING GEOCODE ---------------- 
    var geobing = require('geobing');	
    geobing.setKey(process.env.GEOBING_KEY);
	
	// ----------------  Nominatim GEOCODE ---------------- 
	const Nominatim = require('nominatim-geocoder')
	const geocoder = new Nominatim()
	
	

	// Bing Geocode
	function geocodeBing(searchString) {
		return new Promise((resolve, reject) => {
			 geobing.getCoordinates(searchString, function (err, coordinates) {
				if (err) reject(err);
				resolve(coordinates);
			});			
		});
	}

	// Suche nach Objekt in OSM
	async function overpassObjects(ORT, OBJEKT) {
		var ret = {};

		if (OBJEKT == "") return ret;

		// Objekt Substring
		OBJEKT = OBJEKT.substring(OBJEKT.indexOf(' '));
		OBJEKT = OBJEKT.substring(OBJEKT.indexOf(' '));
		
		// Charakter ersetzen
		OBJEKT = OBJEKT.replace(/1/g, 'l');
		
		// Overpass Objektabfrage
		debug('Durchsuche OSM Gebaude und Objekte');
		var overpassObjektUrl = "http://overpass-api.de/api/interpreter?data="+
			'[out:csv(::lat, ::lon, name; false; "|")][timeout:25];' + 
			'area[admin_level][name="' + ORT + '"]->.searchArea; (' + 
			'node["building"]["name"](area.searchArea);' + 
			'way["building"]["name"](area.searchArea);' + 
			'relation["building"]["name"](area.searchArea);' + 
			'node["amenity"]["name"](area.searchArea);' + 
			'way["amenity"]["name"](area.searchArea);' + 
			'relation["amenity"]["name"](area.searchArea);' + 
			");out body center;";			
			
		await axios.get(overpassObjektUrl)
		.then(response => {
			var csvDat = response.data.split('\n');
			
			for(var i = 0; i < csvDat.length; i++) {
				var dmp = new diffmatch.diff_match_patch();
				dmp.Match_Distance = 100000000;
				dmp.Match_Threshold = 0.3;
				
				if(csvDat[i] != "") {				
					var linearr = csvDat[i].split('|');					
					for(var j = 2; j <= 3; j++) {
						if(linearr[j] != undefined) {
							var pattern = linearr[j].substring(0,31);
							var match = dmp.match_main(OBJEKT, pattern, 0);
							if (match != -1) {
								var quote = OBJEKT.substring(match, match + pattern.length);
								debug('Match: ', csvDat[i], "  --> " , quote);

								ret.lat = linearr[0];
								ret.lng = linearr[1];
								ret.isAddress = true;
							}
						}							
					}					
				}				
			}
		})
		.catch((err) => { console.error('[GeocodeManager] [Objektsuche] Fehler ', err) });		
		
		return ret;
	}

	// Suche nach Bahnübergang
	async function bahnuebergaenge(OBJEKT) {
		return new Promise(async (resolve, reject) => {
			const results = [];
			let s = OBJEKT.split(' ');
			s = s[s.length -1];
 
			fs.createReadStream('bahnuebergaenge.csv')
			.pipe(csv({ separator: ';' }))
			.on('data', (data) => {
				if(data['BEZEICHNUNG'].indexOf(s) != -1) {
					results.push(data)
				}
			})
			.on('end', () => {
				debug(results);
				if(results.length == 1) {
					debug("Bahnübergang gefunden");
					resolve(results[0]);					
					// [
					//   { NAME: 'Daffy Duck', AGE: '24' },
					//   { NAME: 'Bugs Bunny', AGE: '22' }
					// ]
				} else {
					reject("Bahnübergang nicht gefunden");
				}
			});
		});		
	}
	
	// Geocode Adresse
	async function geocode(searchString, isAddress, OBJEKT, ORT) {		
		var ret = {lat: 0, lng: 0, isAddress: isAddress};	
		var isHighway = false;	
		debug('Suche: ', searchString);	

		if(OBJEKT.toLowerCase().indexOf('bahn') != -1) {
			await bahnuebergaenge( OBJEKT )
			.then((response) => {
				debug("Response", response);	
				if(response) {							
					ret.lat = response['GEOGR_BREITE'].replace(',', '.');
					ret.lng = response['GEOGR_LAENGE'].replace(',', '.');
					ret.isAddress = true;
					debug('Ergebnis: Bahnübergang ', ret);
				}
			})
			.catch((err) => { console.error('[GeocodeManager] [Bahnübergang] Fehler ', err) });
		}
		if(ret.lat != 0) return ret;

		// Bing Geocode
		await geocodeBing( searchString )
		.then((response) => {
			debug('[GeoBing] lat: ', response.lat, 'lng: ', response.lng);				
			ret.lat = response.lat;
			ret.lng = response.lng;
		})
		.catch((err) => { console.error('[GeocodeManager] [GeoBing] Fehler ', err) });
				
		// OSM Nominatim
		await geocoder.search( { q: searchString } )
		.then((response) => {
			debug('[Nominatim] ', response);	
			
			if(response.length > 0 && 
				response[0].class=='place'
			) {
				ret.lat = response[0].lat;
				ret.lng = response[0].lon;
				ret.isAddress = true;
				
				debug('Benutze Nominatim Koordinaten');
			}

			if(response.length > 0 && 
				response[0].class=='highway' &&
				!isAddress
			) {
				ret.lat = response[0].lat;
				ret.lng = response[0].lon;
				ret.isAddress = false;
				isHighway = true;
				
				debug('Benutze Nominatim Koordinaten');
			}			
		})
		.catch((err) => { console.error('[GeocodeManager] [Nominatim] Fehler ', err) });
			
		// OSM Objektsuche
		if(!ret.isAddress && !isHighway) {
			
			let r = await overpassObjects(ORT, OBJEKT);
			
			if(r.isAddress) {				
				debug('Benutze OSM Objekt Koordinaten');
				ret = r;
			}
		}
		
		debug('Ergebnis: ', ret);
		return ret;
	}

	
    return {
        geocode
    }; 
}