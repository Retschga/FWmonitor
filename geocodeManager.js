// Modul Alarmverarbeitung
module.exports = function () {
	
	const axios = require('axios');
	var diffmatch = require('./diff_match_patch.js');

    var geobing = require('geobing');	
    geobing.setKey(process.env.GEOBING_KEY);
	
	const Nominatim = require('nominatim-geocoder')
	const geocoder = new Nominatim()
	
	
	function geocodeBing(searchString) {
		return new Promise((resolve, reject) => {			
			
			 geobing.getCoordinates(searchString, function (err, coordinates) {
				
				if (err) reject(err);
				resolve(coordinates);
				
			});			
		})
	}
    
	async function geocode(searchString, isAddress, OBJEKT, ORT) {
		
		var ret = {lat: 0, lng: 0, isAddress: isAddress};
		
		console.log('[GeocodeManager] Suche: ', searchString);	
		
		// Bing Geocode
		await geocodeBing( searchString )
			.then((response) => {
				console.log('[GeocodeManager] [GeoBing] lat: ', response.lat, 'lng: ', response.lng);	
				
				ret.lat = response.lat;
				ret.lng = response.lng;
			})
			.catch((error) => {
				console.log(error)
			})
		
		
		// OSM Nominatim
		await geocoder.search( { q: searchString } )
			.then((response) => {
				console.log('[GeocodeManager] [Nominatim]');	
				console.log(response)
				
				if(response.length > 0 && response[0].class=='place') {
					ret.lat = response[0].lat;
					ret.lng = response[0].lon;
					ret.isAddress = true;
					
					console.log('[GeocodeManager] Benutze Nominatim Koordinaten');
				}
			})
			.catch((error) => {
				console.log(error)
			})
			
		// OSM Objektsuche
		if(!ret.isAddress) {
			
			// Objekt Substring
			OBJEKT = OBJEKT.substring(OBJEKT.indexOf(' '));
			OBJEKT = OBJEKT.substring(OBJEKT.indexOf(' '));
			
			// Charakter ersetzen
			OBJEKT = OBJEKT.replace(/1/g, 'l');
			
			
			// Overpass Objektabfrage
			console.log('[GeocodeManager] Durchsuche OSM Gebaude und Objekte');
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
					
					;
					
					var dmp = new diffmatch.diff_match_patch();

					dmp.Match_Distance = 100000000;
					dmp.Match_Threshold = 0.3;
					
					if(csvDat[i] != "") {
					
						var linearr = csvDat[i].split('|');
						
						for(var j = 2; j <= 3; j++) {
							
							var pattern = linearr[j].substring(0,31);

							var match = dmp.match_main(OBJEKT, pattern, 0);

							if (match == -1) {
								;
							} else {
								var quote = OBJEKT.substring(match, match + pattern.length);
								ret.lat = linearr[0];
								ret.lng = linearr[1];
								ret.isAddress = true;
								
								console.log("Match: ", csvDat[i], "  --> " , quote)
								console.log('[GeocodeManager] Benutze OSm Objekt Koordinaten');
							}
							
						}
						
					}
					
				}
			  })
			  .catch(error => {
				console.log(error);
			  });
			
		}
		
		console.log('[GeocodeManager] Ergebnis: ', ret);
		return ret;
	}


    return {
        geocode: geocode
    }; 

}