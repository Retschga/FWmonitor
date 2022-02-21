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
			if(response.status == 401) {
				window.location.href = '/app/login.html';
				return null;
			}
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
}

/**
 * Erzeigt ein Intervall und bindet dieses an die Lebensdauer eines DOM-Elements
 * @param {String}   elementId 	DOM-Element ID
 * @param {Function} callback  	Callback
 * @param {Integer}  time 		Intervall in ms
 */
var createIntervalOnElement = function(elementId, callback, time){
    let interval;
    interval = setInterval(function(){
        if(document.getElementById(elementId) == null){
            clearInterval(interval);
        }else{
            callback();
        }
    },time);
};

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

// Icons Karte
var styleCache = {
	pipe: new ol.style.Style({image: new ol.style.Icon({src: "/images/map_marker_hydrant_pipe.png"})}),
	wall: new ol.style.Style({image: new ol.style.Icon({src: "/images/map_marker_hydrant_wall.png"})}),
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
	// let tileLayer_Hillshade = new ol.layer.Tile({
	// 	source: new ol.source.XYZ({
	// 		url: 'https://{a-c}.tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png',
	// 		attributions: ['© wmflabs']
	// 	}),
	// 	preload: 16,
	// 	maxZoom: 16, // visible at zoom levels 14 and below
	// })	
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
	// layers.push(tileLayer_Hillshade);
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
			//view.setZoom(15);
			view.setCenter(ol.proj.transform(alarm_map_pos, 'EPSG:4326', 'EPSG:3857'));
			alarm_map_moved = false;
			setTimeout(function(){ 
				alarm_map_moved = false;
			}, 50);
			console.log("MAP CENTER 1", alarm_map_pos, alarm_map_moved);
		}
		alarm_mapCenter(); 
	}

	setTimeout(function(){ 
		tileLayer_OpenTopoMap.setVisible(false);
	}, 1500);

	return {view, map};
}
// Forst Rettungspunkte
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

	console.log("Alarm dest: ", dest);
	
	// Karte erstellen
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
				//view.setZoom(15);
				view.setCenter(ol.proj.transform([dest.lng, dest.lat], 'EPSG:4326', 'EPSG:3857'));
				alarm_map_moved = false;
				setTimeout(function(){ 
					alarm_map_moved = false;
				}, 50);
				console.log("MAP CENTER 2", alarm_map_pos, alarm_map_moved);
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
			alarm_map_moved = false;
			setTimeout(function(){ 
				alarm_map_moved = false;
			}, 50);
			console.log("MAP CENTER 3", alarm_map_pos, alarm_map_moved);
		}
		alarm_mapCenter();
	}

	// Forst Rettungspunkte
	loadForstRettPkt(map);

	// Route laden
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

		let alertOpen = -1;		

		GPS_hasChanged = () => {	
			console.log("GPS change", alarm_map_moved);	

			let pos = {lat:GPS_now.lat, lng:GPS_now.lng};	
			if(pos.lng == 0 || pos.lat == 0) return;				
			alarm_map_pos = [pos.lng, pos.lat];
			posMarker.setGeometry(pos.lat != 0 ? new ol.geom.Point(ol.proj.fromLonLat(alarm_map_pos)) : null);
			

			let near = nav_nearestTo(pos, 0, 5000);
			helpline.setGeometry(pos.lat != 0 ? new ol.geom.Point(ol.proj.fromLonLat([near.point.lng, near.point.lat])) : null);

			let nextInstruction = instructions[near.instructionsIndex];
			let tPos = {lat:0, lng:0}
			let tDist = 9999999999999999;
			if(nextInstruction) {
				tPos = {lat:polylinePoints[nextInstruction.way_points[1]][0], lng: polylinePoints[nextInstruction.way_points[1]][1]}
				tDist = nav_geo_distance(tPos, pos);
				console.log("near", near);
				console.log("Next Instruction", nextInstruction);
				console.log("Abstand Next Instruction", nav_geo_distance(tPos, pos))			
				nextMarker.setGeometry(pos.lat != 0 ? new ol.geom.Point(ol.proj.fromLonLat(polylinePoints[nextInstruction.way_points[1]].reverse())) : null);
			}

			if(alarm_navAktiv != true) return;
			
			// Nächste Instruktion anzeigen ab x Punkte Abstand		
			if(tDist < 100) {
				document.getElementById("autoAlarm_instr").innerHTML = nextInstruction.instruction;
				if(alertOpen != near.instructionsIndex)
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
				alertOpen = near.instructionsIndex;
			}			

			if(alarm_map_moved) return;

			alarm_mapCenter = () => {
				//view.setZoom(15);
				view.setCenter(ol.proj.transform(alarm_map_pos, 'EPSG:4326', 'EPSG:3857'));
				alarm_map_moved = false;
				setTimeout(function(){ 
					alarm_map_moved = false;
				}, 50);
				console.log("MAP CENTER 4", alarm_map_pos, alarm_map_moved);
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
		createIntervalOnElement('autoAlarm', () => {
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

		// Alte Alarme laden
		let response = await fetchWithParam('/app/api/alarm/list', {offset:alteAlarme_offset, count: count});
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
			
			// Klick Event hinzufügen
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
		console.log('Map neupositionieren', alarm_map_pos, alarm_map_moved);				
		posMarker.setGeometry(pos.lat != 0 ? new ol.geom.Point(ol.proj.fromLonLat(alarm_map_pos)) : null);
		if(alarm_map_moved) return;
		alarm_mapCenter();
	};

	// Warnung
	if (GPS_now.lng == 0 && fwHausPos != "") {
		alert("GPS Position nicht gefunden! > verwende FW Haus Koordinaten!");
	}

}


// ----------------  GPS ---------------- 

/**
 * Startfunktion Seite GPS
 */
function gps_load() {
	if (GPS_now.lng == 0) {
		alert("GPS Position nicht gefunden!");
		return;
	}

	// Anzeigen updaten
	gps_update();

	// Bei GPS-change Anzeigen updaten
	GPS_hasChanged = () => {		
		gps_update();
	};
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
	let precision = GPS_now.precision.substring(1, GPS_now.precision.length -2).split(',');
	document.getElementById("gps_latlng_precision").innerHTML = "Pos: ±" + Math.round(precision[0]) + " m  Höhe: ±" + Math.round(precision[1]) + " m";
	document.getElementById("gps_speed").innerHTML = Math.round(parseInt(GPS_now.speed) * 3.6) + " km/h";
	document.getElementById("gps_alt").innerHTML = Math.round(GPS_now.alt) + " m";
	document.getElementById("gps_alt_min").innerHTML = "(" + Math.round(GPS_alt_min) + " m, ";
	document.getElementById("gps_alt_max").innerHTML = Math.round(GPS_alt_max) + " m)";
	document.getElementById("gps_climb").innerHTML = Math.round(GPS_now.climb) + " m/s";
	document.getElementById("gps_sats").innerHTML = GPS_now.sats;
	if (parseInt(GPS_dist_sum) < 5000) {
		document.getElementById("gps_distance").innerHTML = Math.round(GPS_dist_sum) + " m";
	} else {
		document.getElementById("gps_distance").innerHTML = Math.round(GPS_dist_sum/1000) + " km";
	}

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


// ---------------- Einstellungen ------------
var einstellungen_networks = [];
/**
 * Startfunktion Seite Einstellungen
 */
function einstellungen_load() {

	// Eventlistener für Virtual-Keyboard zu den inputs hinzufügen
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

	// Updateintervall erzeugen
	createIntervalOnElement('page_autoEinstellungen', () => {
		einstellungen_loadInfo();
	}, 2000 )	

	// Hostname
	document.getElementById("sett_hostname").value = status_hostname;

	// Auswertung der eingestellten Netzwerke aus der wpa_supplicant.conf
	einstellungen_networks = [];
	let lineArray = status_wpaSupp.split('\n');
	for(let i = 0;i < lineArray.length;i++){
		let line = lineArray[i];
		if(line.indexOf('ssid') != -1) {
			let tmp = line.split('=').pop();
			console.log(tmp);
			einstellungen_networks.push({'ssid': String(tmp).replace(/\"/g, '')});
		}
		if(line.indexOf('psk') != -1) {
			let tmp = line.split('=').pop();
			console.log(tmp);
			einstellungen_networks[einstellungen_networks.length -1]['psk'] =  String(tmp).replace(/\"/g, '');
		}
		if(line.indexOf('priority') != -1) {
			let tmp = line.split('=').pop();
			console.log(tmp);
			einstellungen_networks[einstellungen_networks.length -1]['priority'] = parseInt( String(tmp).replace(/\"/g, '') );
		}
	}

	// Gefundene Netzwerke anzeigen
	if(einstellungen_networks.length != 2) {
		alert("Fehler: Mehr als 2 oder weniger als 2 konfigurierte Netzwerke gefunden");
		return;
	}
	if(einstellungen_networks.length == 2) {
		// Netzwerke anhand Priorität sortieren
		if(einstellungen_networks[0]['priority'] < einstellungen_networks[1]['priority']) {
			let tmp = einstellungen_networks[0];
			einstellungen_networks[0] = einstellungen_networks[1];
			einstellungen_networks[1] = tmp;
		}
		// Input-Felder ausfüllen
		document.getElementById("sett_nw1_ssid").value = String(einstellungen_networks[0]['ssid']);
		document.getElementById("sett_nw1_psk").value = String(einstellungen_networks[0]['psk']);
		document.getElementById("sett_nw2_ssid").value = String(einstellungen_networks[1]['ssid']);
		document.getElementById("sett_nw2_psk").value = String(einstellungen_networks[1]['psk']);		
	} 		
}

/**
 * Updatet die Anzeige
 */
function einstellungen_loadInfo() {
	// CPU Status
	document.getElementById("sett_cpuTemp").value = status_cpuTemp + '°C';
	document.getElementById("sett_mem").value = status_memFree + "MB / " + status_memTotal + "MB";
	document.getElementById("sett_cpuUsage").value = (100 - parseInt(status_cpuIdle)) + '%';

	// Verbundenes Netzwerk
	if(einstellungen_networks.length == 2) {
		status_connWlan = String(status_connWlan).replace(/\"/g, '');
		if( einstellungen_networks[0]['ssid'].valueOf().trim() == status_connWlan.valueOf().trim() ) {
			document.getElementById("sett_nw1").classList.add('highlight');
			document.getElementById("sett_nw2").classList.remove('highlight');
		} else if( einstellungen_networks[1]['ssid'].valueOf().trim() == status_connWlan.valueOf().trim() ) {
			document.getElementById("sett_nw1").classList.remove('highlight');
			document.getElementById("sett_nw2").classList.add('highlight');
		} else {
			document.getElementById("sett_nw1").classList.remove('highlight');
			document.getElementById("sett_nw2").classList.remove('highlight');
		}
	}

	document.getElementById("sett_usbtether_status").value = status_usbtether == true ? "verbunden" : "getrennt";
	if(status_usbtether == true) {
		document.getElementById("sett_usbtether").classList.add('highlight');
	} else {
		document.getElementById("sett_usbtether").classList.remove('highlight');			
	}
}


async function einstellungen_save() {
	try {
		loading('Speichern...');
		let data = `setWpaSupp:network={\nssid=\"${document.getElementById("sett_nw1_ssid").value}\"\npsk=\"${document.getElementById("sett_nw1_psk").value}\"\npriority=20\n}\nnetwork={\nssid=\"${document.getElementById("sett_nw2_ssid").value}\"\npsk=\"${document.getElementById("sett_nw2_psk").value}\"\npriority=10\n}`;
		console.log("sende Daten...", data);
		wsSteuer.send(data);
	} catch (error) {
		closeLoading();
		alert('Daten konnten nicht gespeichert werden!');
	}
}


function navigation_load() {
	// Eventlistener für Virtual-Keyboard zu den inputs hinzufügen
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
}





function beep() {
    var snd = new  Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");  
    snd.play();
}