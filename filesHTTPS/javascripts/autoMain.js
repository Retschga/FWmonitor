let alarmClockInterval;

// ----------------  HILFSFUNKTIONEN ---------------- 

/**
 * Lädt Daten vom Server mit fetch API
 * @param  {String} 		_url    - Zu ladende URL
 * @param  {Array[String]}	_param  - GET Parameter
 * @param  {Boolean} 		_json   - Ist Antwort JSON
 * @return {Promise}
 */
function fetchWithParam(_url, _param, _json = true) {
	const controller = new AbortController();
	const signal = controller.signal;
	const timeout = 20000;

	return new Promise(async (resolve, reject) => {
		try {

			// Loader öffnen
			loading('Lade Daten...');

			// Zu ladende URL
			let url = new URL(_url, self.location.origin);

			// GET Parameter an URL anhängen
			Object.keys(_param).forEach(key => url.searchParams.append(key, _param[key]));		

			// FETCH Daten mit Timeout
			const timeoutId = setTimeout(() => controller.abort(), timeout);
			let response = await fetch(url, {
				credentials: 'same-origin',
				headers: { "Content-Type": "application/json; charset=utf-8" },
				signal
			})
			clearTimeout(timeoutId);
			if(_json) response = await response.json();

//			console.log(_url, _param);
//			console.log("response", response);

			// Loader schließen
			closeLoading();	
			
			// Promise beenden
			resolve(response);

		} catch (error) {
			console.log(error);			
			closeLoading();	
			reject(error);
		}
	});
}

/**
 * Geht eine Seite Zurück
 */
function goBack() {
	GPS_hasChanged = () => {};
	window.history.back();
	clearInterval(alarmClockInterval);
	clearInterval(einstellungenUpdateInterval);
}

// Icons Karte
var styleCache = {
	pillar: new ol.style.Style({image: new ol.style.Icon({src: "/images/map_marker_hydrant_ueberflur.png"})}),
	underground: new ol.style.Style({image: new ol.style.Icon({src: "/images/map_marker_hydrant_unterflur.png"})}),
	pond: new ol.style.Style({image: new ol.style.Icon({src: "/images/map_marker_openwater.png"})}),
	water_tank: new ol.style.Style({image: new ol.style.Icon({src: "/images/map_marker_tank.png"})}),
	rettPkt: new ol.style.Style({
		image: new ol.style.Icon({
			src: "/images/map_marker_rettPkt.png",
			scale: 0.1
		}),
	}),
	posMarker: new ol.style.Style({
		image: new ol.style.Icon({src: "/images/map_marker_pos.png",
		scale: 0.5
	})}),
	destMarker: new ol.style.Style({image: new ol.style.Icon({src: "/images/map_marker_finish.png"})}),
	circleDest: new ol.style.Style({image: new ol.style.Circle({
			radius: 30,
			stroke: new ol.style.Stroke({
				color: 'red',
			}), 
			fill: new ol.style.Fill({
				color: [255, 51, 51, 0.8]
			}),
		}),
	}),
	streetDest: new ol.style.Style({
		stroke: new ol.style.Stroke({
			width: 6,
			color: [245, 66, 87, 0.8]
		})
	}),
	route: new ol.style.Style({
		stroke: new ol.style.Stroke({
			width: 6,
			color: [47, 55, 82, 0.8]
		})
	}),
	helpline: new ol.style.Style({
		stroke: new ol.style.Stroke({
			width: 6,
			color: [35, 150, 232, 0.8]
		})
	}),
	circleOnRoute: new ol.style.Style({image: new ol.style.Circle({
			radius: 10,
			stroke: new ol.style.Stroke({
				color: 'red',
			}), 
			fill: new ol.style.Fill({
				color: [0, 204, 0, 0.8]
			}),
		}),
	}),
	circleNextInstr: new ol.style.Style({image: new ol.style.Circle({
			radius: 20,
			stroke: new ol.style.Stroke({
				color: 'red',
			}), 
			fill: new ol.style.Fill({
				color: [0, 204, 0, 0.6]
			}),
		}),
	}),
};

/**
 * Suche Style aus styleCache für dieses feature
 * @param {String} feature
 */
var styleFunction = function(feature) {
	let icon = feature.get('title');
	let style = styleCache[icon];
	if (!style) {
		style = styleCache.destMarker;
	}
	return style;
};


// ----------------  ALARM ----------------
var alarm_map = null;
var alarm_map_moved = false;
var alarm_map_pos = null;
var alarm_navAktiv = false;
var alarm_mapCenter = () => {};

/**
 * Erstellt die OpenLayers3 Karte
 * @param {Point} 	dest			- {lat: , lng: } Punkt 			
 * @param {Object}	hydrantenCache 	- Standorte der Hydranten
 * @param {Boolean} center 			- Karte auf Ziel zentrieren
 * @return {Object} - {view, map}
 */
function createMap(dest, hydrantenCache, center = false) {
	let tileLayer_OpenTopoMap;
	// Karten Controls
	let control_attribution = new ol.control.Attribution({
		collapsible: false,
	});
	let control_fullscreen = new ol.control.FullScreen({
		source: 'mapid',
	});
	let btnCenter = /*@__PURE__*/(function (Control) {
		function btnCenter(opt_options) {
			var options = opt_options || {};
	
			var button = document.createElement('button');
			button.innerHTML = '';
			button.className = 'icon ion-pinpoint';
	
			var element = document.createElement('div');
			element.className = 'ol-center ol-unselectable ol-control';
			element.appendChild(button);
	
			Control.call(this, {
				element: element,
				target: options.target,
			});
	
			button.addEventListener('click', this.handleCenter.bind(this), false);
		}
	
		if ( Control ) btnCenter.__proto__ = Control;
		btnCenter.prototype = Object.create( Control && Control.prototype );
		btnCenter.prototype.constructor = btnCenter;
	
		btnCenter.prototype.handleCenter = function handleRotateNorth () {
			alarm_map_moved = false;
			alarm_mapCenter();
			setTimeout(function(){ 
				alarm_map_moved = false;
			}, 50);			
		};
	
		return btnCenter;
	}(ol.control.Control));
	let btnSwitchMap = /*@__PURE__*/(function (Control) {
		function btnSwitchMap(opt_options) {
			var options = opt_options || {};
	
			var button = document.createElement('button');
			button.innerHTML = '';
			button.className = 'icon ion-map';
	
			var element = document.createElement('div');
			element.className = 'ol-center2 ol-unselectable ol-control';
			element.appendChild(button);
	
			Control.call(this, {
				element: element,
				target: options.target,
			});
	
			button.addEventListener('click', this.handleCenter.bind(this), false);
		}
	
		if ( Control ) btnSwitchMap.__proto__ = Control;
		btnSwitchMap.prototype = Object.create( Control && Control.prototype );
		btnSwitchMap.prototype.constructor = btnSwitchMap;
	
		btnSwitchMap.prototype.handleCenter = function handleRotateNorth () {
			tileLayer_OpenTopoMap.setVisible(!tileLayer_OpenTopoMap.getVisible());
		};
	
		return btnSwitchMap;
	}(ol.control.Control));

	// Karte View
	let view = new ol.View({
		center: ol.proj.fromLonLat([dest.lng, dest.lat]),
		zoom: 14
	});		

	let layers = [];

	// Kartenlayer Hydranten
	let tileLayer_OSM = new ol.layer.Tile({
		source: new ol.source.OSM({
			url: 'https://{a-c}.tile.openstreetmap.de/{z}/{x}/{y}.png'
		}),
		preload: 18
	})
	let tileLayer_Hillshade = new ol.layer.Tile({
		source: new ol.source.XYZ({
			url: 'https://{a-c}.tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png',
			attributions: ['© wmflabs']
		}),
		preload: 16,
		maxZoom: 16, // visible at zoom levels 14 and below
	})	
	tileLayer_OpenTopoMap = new ol.layer.Tile({
		source: new ol.source.XYZ({
			url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
			attributions: ['© OpenTopoMap']
		}),
		preload: 17,
	})

	let vectorSource_hydrant = new ol.source.Vector({
		features: new ol.format.GeoJSON({
				featureProjection: 'EPSG:3857',
				dataProjection: 'EPSG:4326'}
			).readFeatures({
			'type': 'FeatureCollection',
			'features': hydrantenCache
		}),
	});
	let vectorLayer_hydrant = new ol.layer.Vector ({
		source: vectorSource_hydrant,
		style: styleFunction,
	});	

	layers.push(tileLayer_OSM);
	layers.push(tileLayer_Hillshade);
	layers.push(tileLayer_OpenTopoMap);
	layers.push(vectorLayer_hydrant);


	// Karte erstellen
	var map = new ol.Map({
		target: 'mapid',
		layers: layers,
		controls: ol.control.defaults({attribution: false}).extend([
			control_attribution,
			control_fullscreen,
			new btnCenter(),
			new btnSwitchMap(),
        ]),
		view: view
	});
	alarm_map = map;

	// Zoom event
	view.on('change:resolution', function (e) {
		zoom = this.getZoom();
		if(hydrantenCache != undefined) {
			if (zoom >=15) {
				vectorLayer_hydrant.setVisible(true);
			}
			else if (zoom < 15) {
				vectorLayer_hydrant.setVisible(false);
			}
		}
	});

	// Move Event
	map.on("moveend", function(e){
		alarm_map_moved = true;
	});

	if(center) {
		alarm_map_pos = [dest.lng, dest.lat];
		alarm_mapCenter = () => {
			view.setZoom(15);
			view.setCenter(ol.proj.transform(alarm_map_pos, 'EPSG:4326', 'EPSG:3857'));
		}
		setTimeout(function(){ 
			alarm_mapCenter(); 
		}, 1500);
	}

	setTimeout(function(){ 
		tileLayer_OpenTopoMap.setVisible(false);
	}, 1500);

	return {view, map};
}
// Forst Rettungspunkte
let rettPkt = null;
async function loadForstRettPkt(map) {
	let response = await fetchWithParam('rettPunkte.geojson', {});

	for(let i = 0; i < response.features.length; i++) {
		response.features[i].properties.title = 'rettPkt';
	}

	console.log("Forst", response);

	let layer = new ol.layer.Vector({
		source: new ol.source.Vector({
			features: new ol.format.GeoJSON({
				featureProjection: 'EPSG:3857',
				dataProjection: 'EPSG:4326'}
			).readFeatures( response ),
		}),
		style: styleFunction,
	});
	map.addLayer(layer);	
}

/**
 * Erstellt die Alarmkarte
 * @param {Object} response - Die Antwort von der Alarm GET Anfrage
 */
var alarm_setupMap = function(response) {

	// Zielkoordinaten
	let dest = {lat:response.lat, lng:response.lng};
	
	let ret = createMap(dest, response.hydrantenCache, true);
	let view = ret.view;
	let map = ret.map;

	// Kartenlayer Ziel
	if(response.gebaeudeCache) {
		let layer = new ol.layer.Vector({
			source: new ol.source.Vector({
				features: [
					new ol.Feature({
						geometry: new ol.geom.Point(ol.proj.fromLonLat([dest.lng, dest.lat])),
						'title': 'circleDest'
					})				
				]
			}),
			style: styleFunction,
		});
		map.addLayer(layer);	

		if(response.gebaeudeCache.length < 5) {
			alarm_mapCenter = () => {
				view.setZoom(15);
				view.setCenter(ol.proj.transform([dest.lng, dest.lat], 'EPSG:4326', 'EPSG:3857'));
			}
			alarm_mapCenter();
		}	
	} else if(response.strassenCache) {	
		response.strassenCache = response.strassenCache[0].map(function(l) {
			return l.reverse();
		}); 		  
		var polyline = new ol.geom.LineString(response.strassenCache);
		polyline.transform('EPSG:4326', 'EPSG:3857');

		let layer = new ol.layer.Vector({
			source: new ol.source.Vector({
				features: [
					new ol.Feature({
						'title': 'streetDest',
						geometry: polyline
					})				
				]
			}),
			style: styleFunction,
		});
		map.addLayer(layer);	

		alarm_mapCenter = () => {
			view.fit(polyline, {padding: [80, 80, 80, 80]});
		}
		alarm_mapCenter();
	}

	// Forst Rettungspunkte
	loadForstRettPkt(map);

	polylinePoints = null;
	instructions = null;
	if(response.routeCache) {
		nav_parseJSON(JSON.parse(response.routeCache));
	}

	// Gibt es Route ?
	if(polylinePoints) {
		// OpenLayers uses [lon, lat], not [lat, lon] for coordinates
		polylinePoints.map(function(l) {
			return l.reverse();
		});
		var route = new ol.geom.LineString(polylinePoints)
		.transform('EPSG:4326', 'EPSG:3857');
		polylinePoints.map(function(l) {
			return l.reverse();
		});
		
		var routeFeature = new ol.Feature({
			'title': 'route',
			geometry: route
		});
		var posMarker = new ol.Feature({
			'title': 'posMarker',
			geometry: new ol.geom.Point(ol.proj.fromLonLat([GPS_now.lng, GPS_now.lat])),
		});	
		var helpline = new ol.Feature({
			'title': 'circleOnRoute',
			geometry: new ol.geom.Point(ol.proj.fromLonLat([GPS_now.lng, GPS_now.lat])),
		});
		var nextMarker = new ol.Feature({
			'title': 'circleNextInstr',
			geometry: new ol.geom.Point(ol.proj.fromLonLat([GPS_now.lng, GPS_now.lat])),
		});

		let layer = new ol.layer.Vector({
			source: new ol.source.Vector({
				features: [routeFeature, posMarker, helpline, nextMarker]
			}),
			style: styleFunction,
		});
		map.addLayer(layer);	

		console.log("Instructions", instructions);
		GPS_hasChanged = () => {	
			console.log("GPS change", alarm_map_moved);	
			
			if(!alarm_navAktiv) return;

			let pos = {lat:GPS_now.lat, lng:GPS_now.lng};		
			alarm_map_pos = [pos.lng, pos.lat];
			posMarker.setGeometry(pos ? new ol.geom.Point(ol.proj.fromLonLat(alarm_map_pos)) : null);
			
			let near = nav_nearestTo(pos, 0, 5000);
			let nextInstruction = instructions[near.instructionsIndex];
			let tPos = {lat:polylinePoints[nextInstruction.way_points[1]][0], lng: polylinePoints[nextInstruction.way_points[1]][1]}
			let tDist = nav_geo_distance(tPos, pos);
			console.log("near", near);
			console.log("Next Instruction", nextInstruction);
			console.log("Abstand Next Instruction", nav_geo_distance(tPos, pos))

			helpline.setGeometry(pos ? new ol.geom.Point(ol.proj.fromLonLat([near.point.lng, near.point.lat])) : null);
			nextMarker.setGeometry(pos ? new ol.geom.Point(ol.proj.fromLonLat(polylinePoints[nextInstruction.way_points[1]].reverse())) : null);

			let alertOpen = false;
			// Nächste Instruktion anzeigen ab x Punkte Abstand		
			if(tDist < 100) {
				document.getElementById("autoAlarm_instr").innerHTML = nextInstruction.instruction;
				if(alertOpen)
					closeAlert('my-custom-id-alert');
				alertOpen = true;
				alert({
					id: 'my-custom-id-alert',
					title:'Route - ' + `In ${tDist} Metern:`,
					template: 'template-alert-custom',
					width:'90%',
					buttons:[
						{
							label: 'OK',
							onclick: () => {alertOpen = false; closeAlert('my-custom-id-alert')},
						}
					]
				});
			} else if(alertOpen) {
				closeAlert('my-custom-id-alert');
				alertOpen = false;
			}			

			if(alarm_map_moved) return;

			alarm_mapCenter = () => {
				view.setZoom(15);
				view.setCenter(ol.proj.transform(alarm_map_pos, 'EPSG:4326', 'EPSG:3857'));
				setTimeout(function(){ 
					alarm_map_moved = false;
				}, 50);	
			}
		
			alarm_map_moved = false;
			alarm_mapCenter();
		};
		setTimeout(function(){alarm_map_moved = false; GPS_hasChanged(); }, 3000);
	}
	
};

/**
 * Startfunktion Seite Alarm
 * @param {Integer} id - ID des zu ladenden Alarms
 */
async function alarm_loadAlarm(id) { 
	try {
		// Rücksetze Navigation aktiv
		alarm_navAktiv = false;

		// Rufe Alarm ab
		let response = await fetchWithParam('app/api/alarm', {id: id});

		// Alarm Farbe und Icon
		let color = "red-600";
		let icon = "ion-fireball";
		if(response.color == "3") {
			color = 'green';
			icon = "ion-information-circled";
		}
		else if(response.color == "2") {
			color = 'blue';
			icon = "ion-settings";
		} 
		else if(response.color == "1") {
			color = 'orange';
			icon = "ion-ios-medkit-outline";
		} 			
		document.getElementById("alarm_einsatzstichwort_cont").classList.add(color);
		document.getElementById("alarm_einsatzstichwort_icon").classList.add(icon);

		// Stichwort
		if(response.einsatzstichwort != undefined) {
			document.getElementById("alarm_einsatzstichwort").innerHTML = response.einsatzstichwort ;
		} else {
			document.getElementById("alarm_einsatzstichwort").classList.add('hidden');
		}

		// Schlagwort
		if(response.schlagwort != undefined) {
			document.getElementById("alarm_schlagwort").innerHTML = response.schlagwort ;
		} else {
			document.getElementById("alarm_schlagwort").classList.add('hidden');
		}

		// Strasse
		if(response.schlagwort != undefined) {
			document.getElementById("alarm_strasse").innerHTML = response.strasse ;
		} else {
			document.getElementById("alarm_strasse_cont").classList.add('hidden');
		}

		// Ortsteil
		if(response.schlagwort != undefined) {
			document.getElementById("alarm_ortsteil").innerHTML = response.ortsteil ;
		} else {
			document.getElementById("alarm_ortsteil_cont").classList.add('hidden');
		}

		// Ort
		if(response.schlagwort != undefined) {
			document.getElementById("alarm_ort").innerHTML = response.ort ;
		} else {
			document.getElementById("alarm_ort_cont").classList.add('hidden');
		}

		// Objekt
		if(response.schlagwort != undefined) {
			document.getElementById("alarm_objekt").innerHTML = response.objekt ;
		} else {
			document.getElementById("alarm_objekt_cont").classList.add('hidden');
		}

		// Bemerkung
		if(response.schlagwort != undefined) {
			document.getElementById("alarm_bemerkung").innerHTML = response.bemerkung ;
		} else {
			document.getElementById("alarm_bemerkung_cont").classList.add('hidden');
		}

		// Autos eigen
		if(response.cars1 != undefined) {
			document.getElementById("alarm_cars1").innerHTML = response.cars1.toString().replace(/,/g, "<br>") ;
		} else {
			document.getElementById("alarm_cars1_cont").classList.add('hidden');
		}

		// Autos andere
		if(response.cars2 != undefined) {
			document.getElementById("alarm_cars2").innerHTML = response.cars2.toString().replace(/,/g, "<br>") ;
		} else {
			document.getElementById("alarm_cars2_cont").classList.add('hidden');
		}

		// Karte
		if(response.map != false && response.lat != undefined && response.lng != undefined) {
			// Eingebettete Karte
			alarm_setupMap(response);
		} else {
			// Keine Karte
			document.getElementById("mapid_cont").classList.add('hidden');
			document.getElementById("alarm_mapLink_cont").classList.add('hidden');
		}

		// Uhranzeige
		alarmClockInterval = setInterval(() => {
			var d = new Date();
			var time = d.toLocaleTimeString();
			document.getElementById('currenttime').innerHTML = time;
			ticken();
		}, 1000);  

		// Anzeige Alarmzeit
		var startDate = new Date(response.date);			
		function ticken(){
			var stunden, minuten, sekunden;
			var StundenZahl, MinutenZahl, SekundenZahl;
			var heute;

			heute = new Date();
			StundenZahl = startDate.getHours();
			MinutenZahl = startDate.getMinutes();
			SekundenZahl = startDate.getSeconds();
			
			stunden = StundenZahl+":";
			if (MinutenZahl < 10) {minuten = "0" + MinutenZahl + ":";}
				else {minuten = MinutenZahl + "";}
			zeit = stunden + minuten + " Uhr";
			var alarmzeit = zeit;
			
			
			var diff = heute.getTime() - startDate.getTime();
			var tag = Math.floor(diff / (1000*60*60*24));
			diff = diff % (1000*60*60*24);
			var std = Math.floor(diff / (1000*60*60));
			diff = diff % (1000*60*60);
			var MinutenZahl = Math.floor(diff / (1000*60));
			diff = diff % (1000*60);
			var SekundenZahl = Math.floor(diff / 1000);
			
			stunden = "";
			if (std > 0) {stunden = std+"h ";}
			if (MinutenZahl < 10) {minuten = "0" + MinutenZahl + "m ";}
				else {minuten = MinutenZahl + "m ";}
			if (SekundenZahl < 10) {sekunden = "0" + SekundenZahl + "s ";}
				else {sekunden = SekundenZahl + "s ";}
			zeit = stunden + minuten + sekunden;
			
			//elapsedtime.innerHTML = zeit;
			document.getElementById('elapsedtime').innerHTML = zeit;
		}
		
		setTimeout(function(){ document.getElementById('tabKarte').classList.remove('active');}, 300);
		
	} catch (error) {
		console.log(error);	
		alert("Alarm konnte nicht geladen werden.");
	}
}


// ----------------  ALTE ALARME ----------------
var alteAlarme_offset = 0;

/**
 * Startfunktion Seite alte Alarme
 * @param {Integer} count - Anzahl der zu ladenden Alarme
 */
async function alteAlarme_loadAlarm(count) {	
	try {

		// Late Alarme
		let response = await fetchWithParam('/app/api/alarmList', {offset:alteAlarme_offset, count: count});
		alteAlarme_offset += count;

		// Erstelle für jeden Alarm ein Listenelement
		for(let i = 0; i < response.length; i++) {
			
			// Prüfen ob weitere Alarme verfügbar
			if(response[i][0] == undefined) {
				document.getElementById("alteAlarme_loadMore").classList.add('hidden');
				return;
			}	

			// Alarm Farbe erstellen
			let color = "border-red";
			if(response[i][6] == "3")
				color = 'border-green';
			else if(response[i][6] == "2")
				color = 'border-blue';
			else if(response[i][6] == "1")
				color = 'border-orange';

			// Alarm Datum  String erstellen
			var d = new Date(response[i][3]);			
			var options = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
			var time = d.toLocaleTimeString();
			var date = d.toLocaleDateString('de-DE', options);

			// Alarm Element erstellen
			let newDiv = document.createElement("div");				
			newDiv.className = `item white mark margin-button shadow ${color}`;

			newDiv.innerHTML = `<h2>
									<strong>${response[i][4]} - ${response[i][0]}</strong>
								</h2>
								<p class="text-grey">${response[i][1]} - ${response[i][2]}</p>
								<p class="text-green">${date} ${time}</p>
								<i class="icon ion-android-open right" style="padding-right: 2em;"></i>`;

			var currentDiv = document.getElementById("alteAlarme_loadMore"); 
            document.getElementById("alteAlarme_list").insertBefore(newDiv, currentDiv); 
            
            newDiv.onclick = () => {openPage('/app/filesHTTPS/autoAlarm', response[i][5], alarm_loadAlarm);};
		}
		
	} catch (error) {
		console.log(error);	
		alert("Alarme konnten nicht geladen werden.");
	}
}


// ----------------  KARTE ---------------- 

/**
 * Startfunktion Seite Karte
 */
async function karte_load() {

	// Prüfe ob GPS Position vorhanden
	if (GPS_now.lng == 0 && fwHausPos == "") {
		alert("GPS Position nicht gefunden!");
		goBack();
		return;
	}	
	let pos = {lat:GPS_now.lat, lng:GPS_now.lng};
	if (GPS_now.lng == 0 && fwHausPos != "") {
		let p = fwHausPos.split(',');
		pos = {lat:p[1], lng:p[0]};
		console.log("Keine GPS Position > verwende FW Haus", pos)
	}
	alarm_map_pos = [pos.lng, pos.lat];

	// Lade Hydrantendaten
	let hydrantenCache = await fetchWithParam('/app/api/hydranten.geojson', pos);

	// Erstelle Karte
	let ret = createMap(pos, hydrantenCache, true);	
	loadForstRettPkt(ret.map);
	
	// Positionsmarker zur Karte hinzufügen
	var posMarker = new ol.Feature({
		geometry: new ol.geom.Point(ol.proj.fromLonLat(alarm_map_pos)),
		'title': 'posMarker'
	});
	let layer = new ol.layer.Vector({
		source: new ol.source.Vector({
			features: [posMarker],
		}),
		style: styleFunction,
	});
	ret.map.addLayer(layer);
	//posMarker.rotate(Math.PI / 2.0, ol.proj.transform([-16,-22], 'EPSG:4326', 'EPSG:3857'));

	// Callback bei Positionsänderung
	GPS_hasChanged = () => {		
		let pos = {lat:GPS_now.lat, lng:GPS_now.lng};		
		alarm_map_pos = [pos.lng, pos.lat];
		if(alarm_map_moved) return;
		posMarker.setGeometry(pos ? new ol.geom.Point(ol.proj.fromLonLat(alarm_map_pos)) : null);
		alarm_mapCenter();
	};

	if (GPS_now.lng == 0 && fwHausPos != "") {
		alert("GPS Position nicht gefunden! > verwende FW Haus Koordinaten!");
	}

}


// ----------------  GPS ---------------- 

/**
 * Gibt das subDokument eines HTML Elements zurück
 * @param {HTMLelement} embedding_element 
 */
function getSubDocument(embedding_element) {
	if (embedding_element.contentDocument) {
	  return embedding_element.contentDocument;
	}
	else {
	  var subdoc = null;
	  try {
		subdoc = embedding_element.getSVGDocument();
	  } catch(e) {}
	  return subdoc;
	}
}

/**
 * Updatet die Anzeige
 */
function gps_update() {
	// Steigungsanzeige
	if(GPS_now.climb > 0) {
		document.getElementById("gps_carIcon").classList.add('rot-up');
		document.getElementById("gps_carIcon").classList.remove('rot-down');
		document.getElementById("gps_carIcon").classList.remove('rot-none');
	} else if(GPS_now.climb > 0) {
		document.getElementById("gps_carIcon").classList.remove('rot-up');
		document.getElementById("gps_carIcon").classList.add('rot-down');
		document.getElementById("gps_carIcon").classList.remove('rot-none');			
	} else {
		document.getElementById("gps_carIcon").classList.remove('rot-up');
		document.getElementById("gps_carIcon").classList.remove('rot-down');
		document.getElementById("gps_carIcon").classList.add('rot-none');
	}

	// Werte
	document.getElementById("gps_latlng").innerHTML = GPS_now.lat + "<br>" + GPS_now.lng;
	let prec = GPS_now.precision.substring(1, GPS_now.precision.length -2).split(',');
	document.getElementById("gps_latlng_precision").innerHTML = "Pos: ±" + Math.round(prec[0]) + " m  Höhe: ±" + Math.round(prec[1]) + " m";
	document.getElementById("gps_speed").innerHTML = Math.round(parseInt(GPS_now.speed) / 3600) + " km/h";
	document.getElementById("gps_alt").innerHTML = Math.round(GPS_now.alt) + " m";
	document.getElementById("gps_alt_min").innerHTML = "(" + Math.round(GPS_alt_min) + " m, ";
	document.getElementById("gps_alt_max").innerHTML = Math.round(GPS_alt_max) + " m)";
	document.getElementById("gps_climb").innerHTML = Math.round(GPS_now.climb) + " m/s";
	document.getElementById("gps_sats").innerHTML = GPS_now.sats;
	document.getElementById("gps_distance").innerHTML = Math.round(GPS_dist_sum) + " km";

	// Kompass
	setTimeout(function(){ 
		var translateValue = "";
		var to = {property: GPS_now.track};

		var compass = document.getElementById("gps_compass");
		console.log(compass);
		console.log(getSubDocument(compass));
		compass = getSubDocument(compass).getElementById('compassNeedle');
		
		compass.setAttribute("transform", translateValue + " rotate(" + to.property + ", 250, 250)");
	}, 500);
}

/**
 * Startfunktion Seite GPS
 */
async function gps_load() {
	if (GPS_now.lng == 0) {
		alert("GPS Position nicht gefunden!");
		return;
	}

	gps_update();

	GPS_hasChanged = () => {
		
		gps_update();

	};

}



// ---------------- Einstellungen ------------
var einstellungenUpdateInterval = null;
function einstellungen_load() {
	Array.from(document.querySelectorAll('.input')).forEach(function(element) {
		element.addEventListener("focusin", event => {
			keyboard.setInput(element.value);
			keyboard.focusedElement = element;
	
			document.querySelector(".simple-keyboard").classList.add('simple-keyboard-show');	
			document.querySelector(".page").classList.add('pageWithKeyboard');			
			
			element.style.background = 'pink';
		});
		element.addEventListener("focusout", event => {		
			element.style.background = '';
		});		
	});

	einstellungenUpdateInterval = setInterval(function(){ einstellungen_loadInfo(); }, 2000);	

	let networks = [];
	let tempLines = status_wpaSupp.split('\n');
	for(let i = 0;i < tempLines.length;i++){
		let line = tempLines[i];
		if(line.indexOf('ssid') != -1) {
			let tmp = line.split('=').pop();
			console.log(tmp);
			networks.push({'ssid': String(tmp).replace(/\"/g, '')});
		}
		if(line.indexOf('psk') != -1) {
			let tmp = line.split('=').pop();
			console.log(tmp);
			networks[networks.length -1]['psk'] =  String(tmp).replace(/\"/g, '');
		}
		if(line.indexOf('priority') != -1) {
			let tmp = line.split('=').pop();
			console.log(tmp);
			networks[networks.length -1]['priority'] = parseInt( String(tmp).replace(/\"/g, '') );
		}
	}
	if(networks.length > 2) {
		alert("Fehler: Mehr als 2 konfigurierte Netzwerke gefunden");
		return;
	}
	if(networks.length > 1) {
		if(networks[0]['priority'] < networks[1]['priority']) {
			let tmp = networks[0];
			networks[0] = networks[1];
			networks[1] = tmp;
		}
		document.getElementById("sett_nw1_ssid").value = String(networks[0]['ssid']);
		document.getElementById("sett_nw1_psk").value = String(networks[0]['psk']);
		document.getElementById("sett_nw2_ssid").value = String(networks[1]['ssid']);
		document.getElementById("sett_nw2_psk").value = String(networks[1]['psk']);

		status_connWlan = String(status_connWlan).replace(/\"/g, '');

		console.log("SSIDs", networks[0]['ssid'], networks[1]['ssid'] );
		console.log("Connected to " + String(status_connWlan).replace(/\"/g, ''));
		console.log(networks[0]['ssid'], status_connWlan, networks[0]['ssid'].valueOf().trim() == status_connWlan.valueOf().trim())
		console.log(networks[1]['ssid'], status_connWlan, networks[1]['ssid'].valueOf().trim() == status_connWlan.valueOf().trim())

		if( networks[0]['ssid'].valueOf().trim() == status_connWlan.valueOf().trim() ) {
			document.getElementById("sett_nw1").classList.add('highlight');
			document.getElementById("sett_nw2").classList.remove('highlight');
		} else if( networks[1]['ssid'].valueOf().trim() == status_connWlan.valueOf().trim() ) {
			document.getElementById("sett_nw1").classList.remove('highlight');
			document.getElementById("sett_nw2").classList.add('highlight');
		}
	} else if (networks.length > 0) {
		document.getElementById("sett_nw2_ssid").value = networks[0]['ssid'];
		document.getElementById("sett_nw2_psk").value = networks[0]['psk'];

		if( networks[0]['ssid'].valueOf().trim() == status_connWlan.valueOf().trim() ) {
			document.getElementById("sett_nw2").classList.add('highlight');
		} else  {
			document.getElementById("sett_nw2").classList.remove('highlight');
		}
	}
		
}
function einstellungen_loadInfo() {
	document.getElementById("sett_cpuTemp").value = status_cpuTemp + '°C';
	document.getElementById("sett_mem").value = status_memFree + "MB / " + status_memTotal + "MB";
	document.getElementById("sett_cpuUsage").value = (100 - parseInt(status_cpuIdle)) + '%';
}