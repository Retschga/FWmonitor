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

function goBack() {
	window.history.back();
	closeLoading();	closeLoading();	closeLoading();	closeLoading();	
}

var parseKalenderSummary = function(summary) {
	// Terminname in Text und Icon aufreilen
	let text = summary.substring(2);
	let icon = summary.substring(0,4);
	if(icon.match(/[A-Z0-9äöüÄÖÜß]/i) != null) {
		icon = summary.substring(0,2);
		if(icon.match(/[A-Z0-9äöüÄÖÜß]/i) != null) {
			text = icon + text;
			kalenderBearbeiten_hasIcon = false;
		}
	}
	return {text: text, icon: icon};
}

async function loadKalendergruppen() {
	let response = await fetchWithParam('app/api/kalender/gruppen', {});
	return response; 
}

async function loadAlarmgruppen() {
	let response = await fetchWithParam('app/api/alarm/gruppen', {});
	return response; 
}

async function createKalenderElement(_response, _id, edit = false, editID) {
	// Datum String erstellen
	let m, h, mm, hh;
	if(_response.start == '' || _response.start == 'Z') {
		d = '##';
		m = '##';
		hh = '##';
		mm = '##';
	} else {
		let dat = new Date(_response.start);
		m = dat.getMonth();
		m += 1;
		if (m < 10)
			m = "0" + m;
		d = dat.getDate();
		if (d < 10)
			d = "0" + d;

		hh = dat.getHours();
		if (hh < 10)
			hh = "0" + hh;
		mm = dat.getMinutes();
		if (mm < 10)
			mm = "0" + mm;
	}
					

	
	let textIcon = parseKalenderSummary(_response.summary);
	let text = textIcon.text;
	let icon = textIcon.icon;

	// Badge erstellen
	let badge = "";
	for(let j = 0; j < _response.group.length; j++) {
		//console.log(_response.group);
		if(_response.group[j].id==1)
			badge += '<span class="text-small green radius padding">'+_response.group[j].name+'</span>';
		else
			badge += '<span class="text-small green-300 radius padding">'+_response.group[j].name+'</span>';
	}

	// Kalenderelement erstellen
	let newDiv = document.createElement("div");	
	newDiv.className = 'item';
	newDiv.innerHTML += `<div class="row">
							<div class="col-10">		
								<div class="left">
									<div class="icon-circle text-red border-grey-400">${icon}</div>
								</div>
							</div>
							<div class="col-67">
								<h2 class="text-grey-700 text-strong">${text}</h2>
							</div>
							<div class="col">
								<div class="right align-right text-small">
									<ul>
										<p class="text-orange-900 text-strong">${d}.${m}.</p>
										<li class="text-green text-strong">${hh}:${mm}</li> 								
									</ul>
								</div>
								<div class="clear"></div>
							</div>
						</div> 
						<div class="row">
							<div class="col-10">			
								<div class="left">
									<div class="icon-circle text-red border-grey-400" style="visibility: hidden"></div>
								</div>
							</div>
							<div class="col-67">
								${badge}
							</div>
							${ edit ? 
							`<div class="col-10 item">
								<div class="buttons-group full small align-right">
									<button class="blue icon-text small radius-left" onclick="openPage('filesHTTPS/appKalenderBearbeiten', {id: ${editID}, callback: () => {kalender_loadKalender()}}, kalenderBearbeiten_load);">
										&nbsp;<i class="icon ion-edit"></i>
									</button>
									<button class="red icon-text small radius-right" onclick="kalenderBearbeiten_loeschen(${editID});">
										&nbsp;<i class="icon ion-trash-b"></i>
									</button>
								</div>
							</div>`
							: ''
							}
						</div>`;			
	document.getElementById(_id).appendChild(newDiv); 
}

function loadCollapsibles() {
	let coll = document.getElementsByClassName("collapsible");
	let i;

	for (i = 0; i < coll.length; i++) {
		if(coll[i].dataset.collevent == true) continue;
		coll[i].dataset.collevent = true;

		coll[i].addEventListener("click", function() {
			this.classList.toggle("active");
			let content = this.nextElementSibling;
			if (content.style.display === "block") {
				content.style.display = "none";
			} else {
				content.style.display = "block";
			}
		});
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
	posMarker: new ol.style.Style({image: new ol.style.Icon({src: "/images/map_marker_pos.png"})}),
	destMarker: new ol.style.Style({image: new ol.style.Icon({src: "/images/map_marker_finish.png"})}),
	circleDest: new ol.style.Style({image: new ol.style.Circle({
			radius: 30,
			stroke: new ol.style.Stroke({
				color: 'red',
			}), 
			fill: new ol.style.Fill({
				color: '#3399CCBB',
			}),
		}),
	}),
	streetDest: new ol.style.Style({
		stroke: new ol.style.Stroke({
			width: 6,
			color: [245, 66, 87, 0.8]
		})
	}),
};

var styleFunction = function(feature) {
	let icon = feature.get('title');
	let style = styleCache[icon];
	if (!style) {
		style = styleCache.destMarker;
	}
	return style;
};


// ----------------  INDEX ---------------- 

var index_userKalenderGruppen;
async function index_loadKalender() {

	try {

		let response = await fetchWithParam('app/api/kalender', {});

		document.getElementById("index_kalender").innerHTML = "";

		// Für alle Termine
		for(let i = 0; i < response.length; i++) {
			
			let send = false;
			// Prüfe ob Termin die Gruppe des Benutzers enthät
			if(response[i].group.length > 0) {
				for(let j = 0; j < response[i].group.length; j++) {
					if(String(index_userKalenderGruppen).indexOf(response[i].group[j].id) != -1) {
						send = true;
					}
				}
			} else { 
				// Keine Gruppe -> Alle
				send = true;
			}

			// Termin enthält Gruppe nicht -> nächster Termin
			if(!send) {
				continue;
			}

			// Erstelle Kalender element
			createKalenderElement(response[i], 'index_kalender');

			// Termin gefunden -> Ende
			break;
		}
		
	} catch (error) {
		console.log(error);	
		alert("Kalender konnte nicht geladen werden.");
	}
		
}

async function index_loadStatus() {
	try {

		let response = await fetchWithParam('app/api/status', {});

		// Verfügbarkeit anzeigen
		if(response.status == 1) {
			document.getElementById("index_status_verf").innerHTML = "Verfügbar";
			document.getElementById("index_status_verf").className = 'green-200 border-green';
		} else {
			document.getElementById("index_status_verf").innerHTML = "Nicht Verfügbar";
			document.getElementById("index_status_verf").className = 'red-200 border-red';
		}

		// Ausbildungen anzeigen
		if(response.stAGT)
			document.getElementById("index_AGT").classList.remove('hidden');
		if(response.stMA)
			document.getElementById("index_MA").classList.remove('hidden');
		if(response.stGRF)
			document.getElementById("index_GRF").classList.remove('hidden');
		if(response.stZUGF)
			document.getElementById("index_ZUGF").classList.remove('hidden');

		// Kalendergruppen speichern
		index_userKalenderGruppen = response.kalenderGroups;

    } catch (error) {
		console.log(error);	
		alert("Status konnte nicht geladen werden.");
	}
}


// ----------------  ALTE ALARME ---------------- 

var alteAlarme_offset = 0;
async function alteAlarme_loadAlarm(count) {	
	try {

		if (count < 0) {
			alteAlarme_offset = 0;
			count = count * -1;
		}

		let response = await fetchWithParam('app/api/alarm/list', {offset:alteAlarme_offset, count: count});
		alteAlarme_offset += count;

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
			newDiv.className = 'item white mark margin-button shadow ' + color;
			newDiv.innerHTML += '<h2><strong>'+response[i][4]+' - '+response[i][0]+'</strong></h2>';
			newDiv.innerHTML += '<p class="text-grey">'+response[i][1]+' - '+response[i][2]+'</p>';
			newDiv.innerHTML += '<p class="text-green">'+date+' '+time+'</p>';			
			var currentDiv = document.getElementById("alteAlarme_loadMore"); 
			document.getElementById("alteAlarme_list").insertBefore(newDiv, currentDiv); 
		}
		
	} catch (error) {
		console.log(error);	
		alert("Alarme konnten nicht geladen werden.");
	}
}


// ----------------  ALARM ---------------- 
function createMap(dest, hydrantenCache, center = false) {
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
			alarm_mapCenter();
		};
	
		return btnCenter;
	}(ol.control.Control));

	// Karte View
	let view = new ol.View({
		center: ol.proj.fromLonLat([dest.lng, dest.lat]),
		zoom: 15
	});		

	let layers = [];

	// Kartenlayer Hydranten
	let tileLayer_OSM = new ol.layer.Tile({
		source: new ol.source.OSM({
			url: 'https://{a-c}.tile.openstreetmap.de/{z}/{x}/{y}.png'
		})
	})
	// let tileLayer_Hillshade = new ol.layer.Tile({
	// 	source: new ol.source.XYZ({
	// 		url: 'https://{a-c}.tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png',
	// 		attributions: ['© wmflabs']
	// 	})
	// })


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
	layers.push(vectorLayer_hydrant);


	// Karte erstellen
	var map = new ol.Map({
		target: 'mapid',
		layers: layers,
		controls: ol.control.defaults({attribution: false}).extend([
			control_attribution,
			control_fullscreen,
			new btnCenter()
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

	if(center) {
		alarm_mapCenter = () => {
			view.setZoom(15);
			view.setCenter(ol.proj.transform([dest.lng, dest.lat], 'EPSG:4326', 'EPSG:3857'));
		}
	}

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


var alarm_map = null;
var alarm_mapCenter = () => {};
var alarm_setupMap = function(response) {

	// Zielkoordinaten
	let dest = {lat:response.lat, lng:response.lng};
	
	let ret = createMap(dest, response.hydrantenCache);
	let view = ret.view;
	let map = ret.map;

	// Kartenlayer Ziel
	if(response.gebaeudeCache != undefined) {
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
};

async function alarm_loadAlarm(id) {
	try {

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

			// externe Kartenlinks
			document.getElementById("alarm_mapLink").href = "geo:" + response.lat + "," + response.lng;

			// Eingebettete Karte
			alarm_setupMap(response);

		} else {
			// Keine Karte
			document.getElementById("mapid_cont").classList.add('hidden');
			document.getElementById("alarm_mapLink_cont").classList.add('hidden');
		}
		
	} catch (error) {
		console.log(error);	
		alert("Alarm konnte nicht geladen werden.");
	}
}

async function alarm_rueck(val) {
	try {

		let response = await fetchWithParam('app/api/notificationResponse', {telegramID: TELEGRAMID, value: val});
		
		if(val=="kommeJa")
			document.getElementById("alarm_rueckmelung_ja").classList.remove('selectedButton');
		else
			document.getElementById("alarm_rueckmelung_ja").classList.add('selectedButton');

		if(val=="kommeNein")
			document.getElementById("alarm_rueckmelung_nein").classList.remove('selectedButton');
		else
			document.getElementById("alarm_rueckmelung_nein").classList.add('selectedButton');

		if(val=="kommeSpaeter")
			document.getElementById("alarm_rueckmelung_spaeter").classList.remove('selectedButton');
		else
			document.getElementById("alarm_rueckmelung_spaeter").classList.add('selectedButton');

	} catch (error) {
		console.log(error);	
		alert("Status konnte nicht gesendet werden.");
	}
}


// ----------------  KALENDER ---------------- 

async function kalender_loadKalender() {
	try {

		let response = await fetchWithParam('app/api/kalender', {});

		document.getElementById("kalender_list").innerHTML = '';

		let hasGroups = String(index_userKalenderGruppen).length > 1;

		if((KALENDER == true && hasGroups) || KALENDER_FULL == true) {
			document.getElementById("kalender_btnAdd").classList.remove('hidden');
		}

		for(let i = 0; i < response.length; i++) {	
			
			let edit = false;
			// Prüfe ob Termin die Gruppe des Benutzers enthät
			if(response[i].group.length > 0) {
				for(let j = 0; j < response[i].group.length; j++) {
					if(String(index_userKalenderGruppen).indexOf(response[i].group[j].id) != -1) {
						edit = true;
					}
				}
			} else { 
				// Keine Gruppe -> Alle
				edit = true;
			}
			
			// Erstelle Kalender element
			createKalenderElement(
				response[i], 'kalender_list', 
				((KALENDER == 1 && edit == true && hasGroups) || KALENDER_FULL == true) && (response[i].id ? true : false), 
				response[i].id
				);
		
		}

    } catch (error) {
		console.log(error);	
		alert("Kalender konnte nicht geladen werden.");
	}
}


// ----------------  KALENDER FULL ---------------- 

async function kalenderFull_loadKalender() {
	try {

		let response = await fetchWithParam('app/api/kalender', {getAll: true});

		document.getElementById("calendar").innerHTML = '';

		if(KALENDER == 1) {
			document.getElementById("kalender_btnAdd").classList.remove('hidden');
		}

		var data = [];

		for(let i = 0; i < response.length; i++) {			
			
			// Erstelle Kalender element
			//createKalenderElement(response[i], 'kalender_list', KALENDER == 1 && response[i].id ? true : false, response[i].id);

			data.push({ 
				date: moment(response[i].start), 
				eventName: response[i].summary, 
				calendar: "TEST", 
				color: 'blue' , 
				edit: (response[i].id ? true : false), 
				id: response[i].id
			});
		
		}

		  moment.locale('de'); 
		  var calendar = new Calendar('#calendar', data);

    } catch (error) {
		console.log(error);	
		alert("Kalender konnte nicht geladen werden.");
	}
}


// ----------------  STATISTIK ---------------- 

async function statistik_loadStatistik(year) {
	// Prüfe ob FWVV Anbindung aktiviert
	if(FWVV != 'true' && FWVV != true) {
		document.getElementById("statistik_fwvv").classList.add('hidden')
	}	
	document.getElementById("statistik_einsatzzeit").innerHTML = '<button class="red-600 full radius-left adius-right" onclick="statistik_loadEinsatzzeit()">aktualisieren</button>';

	// Aktuelles Jahr eintragen
	if(!year)
		year = document.getElementById("statistik_selectedYear").innerHTML = new Date().getFullYear();

	try {

		let response = await fetchWithParam('app/api/statistik', {'year': year});	

		let eins = 0;

		document.getElementById("statistik_list").innerHTML = '';

		for(let i = 0; i < response.length; i++) {

			eins += parseInt(response[i][0]);

			let newDiv = document.createElement("div");				
			newDiv.className = 'item';
			newDiv.style.cssText = "padding: 0.3em 1em"; 
			newDiv.innerHTML += '<div class="item row" style="padding:0">' +
								'<p class="col-20">'+response[i][0]+'</p>' +
								'<p class="col">'+response[i][1]+'</p>' +
								'</div>	';	
			document.getElementById("statistik_list").appendChild(newDiv); 
		
		}

		document.getElementById("statistik_stichworte").innerHTML = "Stichworte (" + eins + " Einsätze)";

    } catch (error) {
		console.log(error);	
		alert("Statistik konnte nicht geladen werden.");
	}
}

async function statistik_loadEinsatzzeit() {
	try {

		let response = await fetchWithParam('app/api/einsatzzeit', {'year': document.getElementById("statistik_selectedYear").innerHTML});

		document.getElementById("statistik_einsatzzeit").innerHTML = response.hour + ' Stunden ' + response.minute + ' Minuten (' + response.num + ' Einsätze)';

	} catch (error) {
		console.log(error);	
		alert("Einsatzzeit konnte nicht geladen werden.");
	}
}

function statistik_nextYear() {
	let elemSelectedYear = document.getElementById("statistik_selectedYear");	
	elemSelectedYear.innerHTML = parseInt(elemSelectedYear.innerHTML) + 1; 
	statistik_loadStatistik(elemSelectedYear.innerHTML);
}

function statistik_prevYear() {
	let elemSelectedYear = document.getElementById("statistik_selectedYear");	
	elemSelectedYear.innerHTML = parseInt(elemSelectedYear.innerHTML) - 1; 
	statistik_loadStatistik(elemSelectedYear.innerHTML);
}


// ----------------  VERFUEGBARKEIT ---------------- 

function verfuegbarkeit_load() {
	verfuegbarkeit_loadStatus();
	verfuegbarkeit_loadVerfuegbarkeitGesamt();
}

var verfuegbarkeit_status = '';
async function verfuegbarkeit_loadStatus() {
	try {

		let response = await fetchWithParam('app/api/status', {});

		verfuegbarkeit_status = response.status;
		if(response.status == 1) {
			document.getElementById("verfuegbarkeit_status_verf").innerHTML = "Verfügbar";
			document.getElementById("verfuegbarkeit_status_verf").className = 'green-200 border-green';
			document.getElementById("verfuegbarkeit_status_bis_container").classList.add('hidden')
		} else {
			document.getElementById("verfuegbarkeit_status_verf").innerHTML = "Nicht Verfügbar";
			document.getElementById("verfuegbarkeit_status_verf").className = 'red-200 border-red';
		}
		if(response.statusUntil != '') {
			document.getElementById("verfuegbarkeit_status_bis_container").classList.remove('hidden');
			let result = new Date(response.statusUntil);
			var options = {  year: 'numeric', month: '2-digit', day: '2-digit' };
			let time = result.toLocaleTimeString();
			let date = result.toLocaleDateString('de-DE', options);
			document.getElementById("verfuegbarkeit_status_bis").innerHTML = date + " - " + time.substring(0,5) + " Uhr";			
		} else {
			document.getElementById("verfuegbarkeit_status_bis_container").classList.add('hidden')
		}

	} catch (error) {
		console.log(error);	
		alert("Status konnte nicht geladen werden.");
	}
}

function verfuegbarkeit_toggleStatus() {
	if(verfuegbarkeit_status == 1) {
		verfuegbarkeit_status = 2;
		document.getElementById("verfuegbarkeit_selectDays").classList.remove('hidden');
		document.getElementById("verfuegbarkeit_statusanzeige").classList.add('hidden');;
	} else {
		verfuegbarkeit_status = 1;
		verfuegbarkeit_setStatus(verfuegbarkeit_status, '')
	}	
}

async function verfuegbarkeit_setStatus(status, days) {
	try {

		document.getElementById("verfuegbarkeit_selectDays").classList.add('hidden');

		let response = await fetchWithParam('app/api/verfuegbarkeit/set', {status: status, days: days}, false);
		
		verfuegbarkeit_load();
		index_loadStatus();
	
		closeLoading();
		document.getElementById("verfuegbarkeit_statusanzeige").classList.remove('hidden');

    } catch (error) {
		console.log(error);	
		alert("Status konnte nicht gesetzt werden.");
	}
}

var verfuegbarkeit_status = '';
async function verfuegbarkeit_loadVerfuegbarkeitGesamt() {
	try {

		if(!document.getElementById("numVerf")) return;

		let response = await fetchWithParam('app/api/verfuegbarkeit', {});
	
		document.getElementById("numVerf").innerHTML = response['numVerf'] + " Personen";
		document.getElementById("numNVerf").innerHTML = response['numNVerf'] + " Personen";

		let elem = document.getElementById("VerfNamen");
		elem.innerHTML = "";
		for(let i = 0; /*i < 5 &&*/ i < response['nameVerf'].length; i++) {
			let newElem = document.createElement("span");		
			newElem.style.cssText = "margin: 2px;";			
			newElem.className = 'text-small green radius padding';
			newElem.innerHTML = response['nameVerf'][i].replace(/\s/g, '&nbsp;') + " ";
			elem.appendChild(newElem); 
		}

		elem = document.getElementById("NVerfNamen");
		elem.innerHTML = "";
		for(let i = 0; /*i < 5 &&*/ i < response['nameNVerf'].length; i++) {
			let newElem = document.createElement("span");	
			newElem.style.cssText = "margin: 2px;";		
			newElem.className = 'text-small pink radius padding';
			newElem.innerHTML = response['nameNVerf'][i].replace(/\s/g, '&nbsp;') + " ";
			elem.appendChild(newElem); 
		}

    } catch (error) {
		console.log(error);	
		alert("Verfügbarkeit konnte nicht geladen werden.");
	}
}


// ----------------  EINSTELLUNGEN ---------------- 

function einstellungen_load() {
	einstellungen_loadStatus();
}

async function einstellungen_loadStatus() {
	try {

		let response = await fetchWithParam('app/api/status', {});

		if(response.sendRemembers == 1) {
			document.getElementById("einstellunge_erinnerungenCheck").checked = true;
		} else {
			document.getElementById("einstellunge_erinnerungenCheck").checked = false;
		}
		if(response.appNotifications != 0) {
			document.getElementById("einstellungen_notificationsCheck").checked = true;
			document.getElementById("einstellungen_notificationsCount").classList.remove('hidden');
			document.getElementById("einstellungen_notificationsSlider").value = response.appNotifications;
		} else {
			document.getElementById("einstellungen_notificationsCheck").checked = false;
			document.getElementById("einstellungen_notificationsCount").classList.add('hidden');
		}

		if(response.statusHidden == 1) {
			document.getElementById("einstellungen_statusHidden").checked = true;
		} else {
			document.getElementById("einstellungen_statusHidden").checked = false;
		}


    } catch (error) {
		console.log(error);	
		alert("Status konnte nicht geladen werden.");
	}
}

async function einstellungen_setErinnerungen() {
	try {

		let response = await fetchWithParam('app/api/benutzer/erinnerungen/set', {value: document.getElementById("einstellunge_erinnerungenCheck").checked}, false);

		einstellungen_loadStatus();

	} catch (error) {
		console.log(error);	
		alert("Erinnerungseinstellung konnte nicht gesetzt werden.");
	}
}

async function einstellungen_setNotifications() {
	try {

		if (Notification.permission !== "granted") {
			document.getElementById("einstellungen_notificationsCheck").checked = false;
			document.getElementById("einstellungen_notificationsCount").classList.add('hidden');
			alert("Berechtigung nicht vorhanden");
			return;
		}

		let params = {value: 0}

		if(document.getElementById("einstellungen_notificationsCheck").checked == true)
			params = {value: document.getElementById("einstellungen_notificationsSlider").value}

		let response = await fetchWithParam('app/api/benutzer/notifications/set', params, false);
	
		einstellungen_loadStatus();

    } catch (error) {
		console.log(error);	
		alert("Notification Einstellungen konnten nicht gesetzt werden.");
	}
}

async function einstellungen_setStatusHidden() {
	try {

		let response = await fetchWithParam('app/api/benutzer/statushidden/set', {value: document.getElementById("einstellungen_statusHidden").checked}, false);

		einstellungen_loadStatus();

	} catch (error) {
		console.log(error);	
		alert("Erinnerungseinstellung konnte nicht gesetzt werden.");
	}
}


// ----------------  BENUTZER ---------------- 

var benutzer_selectedFilter = 0;
function benutzer_filter(filter) {

 	ul = document.getElementById("benutzer_list");
 	li = ul.getElementsByClassName('item');

 	// Loop through all list items, and hide those who don't match the search query
 	for (i = 0; i < li.length; i++) {
		a = li[i].innerHTML;

		if (a.indexOf(filter.replace(/\s/g, '&nbsp;')) > -1) {
			li[i].style.display = "";
		} else {
			li[i].style.display = "none";
		}
 	}
}

async function benutzer_loadBenutzer() {

	try {

		let kalendergruppen = await loadKalendergruppen();
		let alarmgruppen = await loadAlarmgruppen();

		let response = await fetchWithParam('app/api/benutzer', {});

		let tempStr = 
						'<option value="">Filter: Alle</option>' +
						'<option value="Admin">Admin</option>' +
						'<option value="Drucker">Drucker Papierinfo</option>' +					
						'<option value="stAGT">Ausbildung: Atemschutz</option>' +
						'<option value="stMA">Ausbildung: Maschinist</option>' +
						'<option value="stGRF">Ausbildung: Gruppenführer</option>' +
						'<option value="stZUGF">Ausbildung: Zugführer</option>';
							
		for(let i = 0; i < alarmgruppen.length; i++) {
			tempStr += '<option value="'+alarmgruppen[i].name+'">Alarmgruppe: '+alarmgruppen[i].name+'</option>';
		}
		for(let i = 1; i < kalendergruppen.length; i++) {
			tempStr += '<option value="'+kalendergruppen[i].name+'">Kalendergruppe: '+kalendergruppen[i].name+'</option>';
		}
		document.getElementById("benutzer_filter").innerHTML = tempStr;

		document.getElementById("benutzer_list").innerHTML = "";
		for(let i = 0; i < response.length; i++) {
			
			let newDiv = document.createElement("div");		

			let kalGrString = "";
			let grupp = String(response[i].kalenderGroups).split('|');
			for(let j = 1; j < grupp.length; j++) {
				kalGrString += ' <span class="text-small green radius padding">'+kalendergruppen[grupp[j]-1].name.replace(/\s/g, '&nbsp;')+'</span><wbr>';
			}
			
			newDiv.className = 
					'item ' + 
					(response[i].status == '1' ? 'mark border-green ' : ' ') +
					(response[i].status == '2' ? 'mark border-red ' : ' ') +
					(response[i].status == '-1' ? 'red-200 ' : ' ') +
					(response[i].status == '-2' ? 'red-200 ' : ' ') +
					(response[i].allowed == '1' ? ' ' : 'blue-600 ');
			newDiv.innerHTML += 
					'<div class="row">' +
						'<h2 class="col-50" style="height: 1.5em;">'+response[i].name + ' ' + response[i].vorname +'</h2>' +
						'<div class="col img-1_5em" style="height: 1.5em;">' +
							'<div class="right">' +
								(response[i].stAGT=='1' ? '<img alt="stAGT" src="/images/AGT.png" />' : '') +
								(response[i].stMA=='1' ? '<img alt="stMA" src="/images/MA.png" />' : '') +
								(response[i].stGRF=='1' ? '<img alt="stGRF" src="/images/GRF.png" />' : '') +
								(response[i].stZUGF=='1' ? '<img alt="stZUGF" src="/images/ZUGF.png" />' : '') +
							'</div>' +
						'</div>' +
					'</div>' +
					'<div>' +
						'<span class="text-small blue radius padding">'+alarmgruppen[response[i].group-1].name.replace(/\s/g, '&nbsp;')+'</span>' +
						(response[i].admin=='1' ? '<span class="text-small red radius padding">Admin</span><wbr>' : '') +
						(response[i].drucker=='1' ? '<span class="text-small orange radius padding">Drucker</span><wbr>' : '') +
						(response[i].softwareInfo=='1' ? '<span class="text-small orange-400 radius padding">Softwareinfo</span><wbr>' : '') +
						(response[i].kalender=='1' ? '<span class="text-small blue-grey-400 radius padding">Kalender</span><wbr>' : '') +
						(response[i].kalender=='2' ? '<span class="text-small blue-grey-400 radius padding">Kalender</span><wbr>' : '') +
						kalGrString +
						(response[i].status == '-1' ? '<br>Telegr. Bot blockiert -> Benutzer muss /start an den Bot schreiben' : ' ') +
						(response[i].status == '-2' ? '<br>telegr. Benutzer gelöscht -> Benutzer muss /start an den Bot schreiben' : ' ') +
						(response[i].allowed != '1' ? '<br>Noch nicht freigegeben!' : ' ') +
					'</div>	';

			newDiv.addEventListener("click", () => {
				openPage('filesHTTPS/appBenutzerBearbeiten', {response: response[i], kalendergruppen: kalendergruppen, alarmgruppen: alarmgruppen}, benutzerBearbeiten_loadBenutzer);
			}); 
			
			document.getElementById("benutzer_list").appendChild(newDiv); 
		
		}

		if(benutzer_selectedFilter != 0) {
			document.getElementById("benutzer_filter").selectedIndex = benutzer_selectedFilter;
			benutzer_filter(document.getElementById("benutzer_filter").options[benutzer_selectedFilter].value);
		}

	} catch (error) {
		console.log(error);	
		alert("Benutzer konnte nicht geladen werden.");
	}   
}


// ----------------  BENUTZER BEARBEITEN ---------------- 

var benutzerBearbeiten_ID = undefined;
var benutzerBearbeiten_kalendergruppen = undefined;
var benutzerBearbeiten_alarmgruppen = undefined;
function benutzerBearbeiten_onChange() {
	let val = "1";
	for(let j = 1; j < benutzerBearbeiten_kalendergruppen.length; j++) {
		if(document.getElementById('benutzerBearbeiten_kalGr_'+j).checked) {
			val += '|' + benutzerBearbeiten_kalendergruppen[j].id;
		}
	}

	benutzerBearbeiten__setEinstellung('kalGr', val);	
};

function benutzerBearbeiten_loadBenutzer(data) {

	loadCollapsibles();

	let response = data.response;
	benutzerBearbeiten_kalendergruppen = data.kalendergruppen;
	benutzerBearbeiten_alarmgruppen = data.alarmgruppen;

	let tempStr = '';
	for(let i = 0; i < benutzerBearbeiten_alarmgruppen.length; i++) {
		tempStr += '<option value="'+i+'">'+benutzerBearbeiten_alarmgruppen[i].name+'</option>';
	}
	document.getElementById("benutzerBearbeiten_alarmgruppe").innerHTML = tempStr;

	if(response.allowed == '1') {
		document.getElementById("benutzerBearbeiten_einstellungen").classList.remove('hidden');
		document.getElementById("benutzerBearbeiten_btnFreigabe").classList.add('hidden');
		document.getElementById("benutzerBearbeiten_btnLoeschen").classList.remove('hidden');
	} else {
		document.getElementById("benutzerBearbeiten_einstellungen").classList.add('hidden');
		document.getElementById("benutzerBearbeiten_btnFreigabe").classList.remove('hidden');
		document.getElementById("benutzerBearbeiten_btnLoeschen").classList.remove('hidden');
	}
	

	benutzerBearbeiten_ID = response.id;
	document.getElementById("benutzerBearbeiten_name").innerHTML = response.name + ' ' + response.vorname;
	document.getElementById("benutzerBearbeiten_alarmgruppe").selectedIndex = response.group -1;
	document.getElementById("benutzerBearbeiten_admin").checked = response.admin=='1';
	document.getElementById("benutzerBearbeiten_kalender").selectedIndex = response.kalender;
	document.getElementById("benutzerBearbeiten_admin").disabled = response.telegramid == TELEGRAMID;
	document.getElementById("benutzerBearbeiten_drucker").checked =  response.drucker=='1';
	document.getElementById("benutzerBearbeiten_software").checked =  response.softwareInfo=='1';
	document.getElementById("benutzerBearbeiten_telefonliste").checked =  response.telefonliste=='1';
	document.getElementById("benutzerBearbeiten_erinnerung").checked = response.sendRemembers=='1';
	document.getElementById("benutzerBearbeiten_verfuegbar").checked = response.status=='1';
	document.getElementById("benutzerBearbeiten_statusHidden").checked = response.statusHidden=='1';
	document.getElementById("benutzerBearbeiten_stAGT").checked = response.stAGT=='1';
	document.getElementById("benutzerBearbeiten_stMA").checked = response.stMA=='1';
	document.getElementById("benutzerBearbeiten_stGRF").checked = response.stGRF=='1';
	document.getElementById("benutzerBearbeiten_stZUGF").checked = response.stZUGF=='1';

	 

	for(let j = 1; j < benutzerBearbeiten_kalendergruppen.length; j++) {
		let newDiv = document.createElement("div");	
		newDiv.className = 'item '; 
		newDiv.innerHTML +=  '<h2>'+benutzerBearbeiten_kalendergruppen[j].name+'</h2>' +
							'<div class="right">' +
								'<input id="benutzerBearbeiten_kalGr_'+j+'" type="checkbox" class="switch green" onchange="benutzerBearbeiten_onChange()">' +
							'</div>';

		document.getElementById("benutzerBearbeiten_kalendergruppenList").appendChild(newDiv); 

		if(String(response.kalenderGroups).indexOf(benutzerBearbeiten_kalendergruppen[j].id) != -1) {
			document.getElementById('benutzerBearbeiten_kalGr_'+j).checked = true;
		}

	}
	
}

async function benutzerBearbeiten__setEinstellung(setting, value, callback) {
	try {

		let response = await fetchWithParam('app/api/benutzer/einstellung/set', {id: benutzerBearbeiten_ID, setting: setting, value: value}, false);

		if(callback != undefined)
			callback();

	} catch (error) {
		console.log(error);	
		goBack();
		alert("Status konnte nicht geladen werden.");
	}
}

function benutzerBearbeiten__loeschen(){
	console.log(alert({
	  title:'Löschen',
	  message:'Benutzer wirklich löschen?',
	  class:'red',
	  buttons:[
		{
		  label: 'Ja',
		  class:'red-900',
		  onclick: function () {
			closeAlert();
			benutzerBearbeiten__setEinstellung('loeschen', '', () => {
				benutzer_loadBenutzer(); goBack();				
			});		
			
		  }
		},
		{
		  label:'Nein',
		  class:'text-white',
		  onclick: function () {
			closeAlert();
		  }
		}
	  ]
	}));
}


// ----------------  KALENDERGRUPPEN ---------------- 

var kalendergruppen_changed = false;
var kalendergruppen_count = false;
async function kalendergruppen_loadGruppen() {
	try {

		kalendergruppen_changed = false;
		let response = await loadKalendergruppen();
		
		document.getElementById("kalendergruppen_list").innerHTML = "";

		for(let i = 0; i < response.length; i++) {
			
			let newDiv = document.createElement("div");		
			let newDiv2 = document.createElement("div");	
			newDiv2.className = 'space';
									
			newDiv.className = 'list';
			newDiv.innerHTML += '<div class="item small-space grey-300 text-grey-700  label-fixed">' +
									'<label class="text-black">Name</label>' +
									'<input id="kalendergruppen_name_'+i+'" type="text" '+(i == 0 ? 'readonly' : '')+'>' +
								'</div>' +
								'<div class="item  label-fixed">' +
									'<label class="text-black">Pattern</label>' +
									'{{ <input id="kalendergruppen_pattern_'+i+'" type="text"  '+(i == 0 ? 'readonly' : '')+'> }}' +
								'</div>';

			
			document.getElementById("kalendergruppen_list").appendChild(newDiv); 
			document.getElementById("kalendergruppen_list").appendChild(newDiv2); 

			document.getElementById("kalendergruppen_name_"+i).value = response[i].name; 
			document.getElementById("kalendergruppen_pattern_"+i).value = response[i].pattern.replace(/[{}]/gi, ''); 

			document.getElementById("kalendergruppen_name_"+i).addEventListener("input", () => {
				kalendergruppen_changed = true;
			}); 
			document.getElementById("kalendergruppen_pattern_"+i).addEventListener("input", () => {
				kalendergruppen_changed = true;
			}); 

			kalendergruppen_count = i;
		}

	} catch (error) {
		console.log(error);	
		goBack();
		alert("Kalendergruppen konnten nicht geladen werden.");
	}
}

async function kalendergruppen_saveGruppen() {
	try {
	
		if(kalendergruppen_changed) {
			kalendergruppen_changed = false;

			let send = [];

			for(let i = 0; i <= kalendergruppen_count; i++) {
				send.push({
					id: (i+1),
					name: document.getElementById("kalendergruppen_name_"+i).value,
					pattern: '{{' + document.getElementById("kalendergruppen_pattern_"+i).value + '}}'
				});
			}

			var getUrl = window.location;
			var baseUrl = getUrl .protocol + "//" + getUrl.host + "/";
			var url = new URL('app/api/kalender/gruppen/set', baseUrl);

			let response = await fetch(url, {
				method: 'POST',
				credentials: 'same-origin',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify(send), // body data type must match "Content-Type" header,
			})

			kalendergruppen_loadGruppen();

		}

	} catch (error) {
		console.log(error);	
		alert("Kalendergruppen konnten nicht gespeichert werden.");
	}
}

// ----------------  ALARMGRUPPEN ---------------- 
var alarmgruppen_changed = false;
var alarmgruppen_count = false;
async function alarmgruppen_loadGruppen() {
	try {

		alarmgruppen_changed = false;

		let response = await loadAlarmgruppen();

		document.getElementById("alarmgruppen_list").innerHTML = "";
		for(let i = 0; i < response.length; i++) {

			if(!response[i].pattern) response[i].pattern = ''; 
			
			let newDiv = document.createElement("div");				
			let newDiv2 = document.createElement("div");	
			newDiv2.className = 'space';	
									
			newDiv.className = 'list';
			newDiv.innerHTML += `<div class="collapsible item small-space grey-300 text-grey-700  label-fixed">
									<button class="radius icon-text" tabindex="0">
										<i class="icon ion-chevron-down"></i> Gruppe: 
									</button>	
									<input id="alarmgruppen_name_${i}_disp" type="text" readonly disabled>								
								</div>
								<div class="collapsible-content">
									<div class="item">
										<h2>Name</h2>
										<div class="right">
											<label class="text-black hidden">Name</label>
											<input id="alarmgruppen_name_${i}" type="text" autofocus="false" tabindex="10">
										</div>
									</div>
									<div class="item">
										<h2>Einsatzstichwort</h2>
										<div class="right">
											<input id="alarmgruppen_einsatzstichwort_${i}" type="checkbox" class="switch green">
										</div>
									</div>
									<div class="item">
										<h2>Schlagwort</h2>
										<div class="right">
											<input id="alarmgruppen_schlagwort_${i}" type="checkbox" class="switch green">
										</div>
									</div>
									<div class="item">
										<h2>Objekt</h2>
										<div class="right">
											<input id="alarmgruppen_objekt_${i}" type="checkbox" class="switch green">
										</div>
									</div>
									<div class="item">
										<h2>Straße</h2>
										<div class="right">
											<input id="alarmgruppen_strasse_${i}" type="checkbox" class="switch green">
										</div>
									</div>
									<div class="item">
										<h2>Ortsteil</h2>
										<div class="right">
											<input id="alarmgruppen_ortsteil_${i}" type="checkbox" class="switch green">
										</div>
									</div>
									<div class="item">
										<h2>Ort</h2>
										<div class="right">
											<input id="alarmgruppen_ort_${i}" type="checkbox" class="switch green">
										</div>
									</div>
									<div class="item">
										<h2>Bemerkung</h2>
										<div class="right">
											<input id="alarmgruppen_bemerkung_${i}" type="checkbox" class="switch green">
										</div>
									</div>
									<div class="item">
										<h2>Einsatzmittel-eigen</h2>
										<div class="right">
											<input id="alarmgruppen_cars1_${i}" type="checkbox" class="switch green">
										</div>
									</div>
									<div class="item">
										<h2>Einsatzmittel-andere</h2>
										<div class="right">
											<input id="alarmgruppen_cars2_${i}" type="checkbox" class="switch green">
										</div>
									</div>
									<div class="item">
										<h2>Sende Fax</h2>
										<div class="right">
											<input id="alarmgruppen_fax_${i}" type="checkbox" class="switch green">
										</div>
									</div>
									<div class="item">
										<h2>Karte</h2>
										<div class="right">
											<input id="alarmgruppen_karte_${i}" type="checkbox" class="switch green">
										</div>
									</div>
									<div class="item">
										<h2>Hydrantenkarte</h2>
										<div class="right">
											<input id="alarmgruppen_karteemg_${i}" type="checkbox" class="switch green">
										</div>
									</div>
								</div>`;

			
			document.getElementById("alarmgruppen_list").appendChild(newDiv); 
			document.getElementById("alarmgruppen_list").appendChild(newDiv2); 

			document.getElementById("alarmgruppen_name_"+i+"_disp").value = response[i].name; 

			document.getElementById("alarmgruppen_name_"+i).value = response[i].name; 
			document.getElementById("alarmgruppen_name_"+i).addEventListener("input", () => {
				alarmgruppen_changed = true;
			}); 
			
			document.getElementById("alarmgruppen_einsatzstichwort_"+i).checked = response[i].pattern.indexOf('{{EINSATZSTICHWORT}}') != -1; 
			document.getElementById("alarmgruppen_einsatzstichwort_"+i).addEventListener("input", () => {
				alarmgruppen_changed = true;
			}); 	

			document.getElementById("alarmgruppen_schlagwort_"+i).checked = response[i].pattern.indexOf('{{SCHLAGWORT}}') != -1; 
			document.getElementById("alarmgruppen_schlagwort_"+i).addEventListener("input", () => {
				alarmgruppen_changed = true;
			}); 

			document.getElementById("alarmgruppen_objekt_"+i).checked = response[i].pattern.indexOf('{{OBJEKT}}') != -1; 
			document.getElementById("alarmgruppen_objekt_"+i).addEventListener("input", () => {
				alarmgruppen_changed = true;
			}); 

			document.getElementById("alarmgruppen_strasse_"+i).checked = response[i].pattern.indexOf('{{STRASSE}}') != -1; 
			document.getElementById("alarmgruppen_strasse_"+i).addEventListener("input", () => {
				alarmgruppen_changed = true;
			}); 

			document.getElementById("alarmgruppen_ortsteil_"+i).checked = response[i].pattern.indexOf('{{ORTSTEIL}}') != -1; 
			document.getElementById("alarmgruppen_ortsteil_"+i).addEventListener("input", () => {
				alarmgruppen_changed = true;
			}); 

			document.getElementById("alarmgruppen_ort_"+i).checked = response[i].pattern.indexOf('{{ORT}}') != -1; 
			document.getElementById("alarmgruppen_ort_"+i).addEventListener("input", () => {
				alarmgruppen_changed = true;
			}); 

			document.getElementById("alarmgruppen_bemerkung_"+i).checked = response[i].pattern.indexOf('{{BEMERKUNG}}') != -1; 
			document.getElementById("alarmgruppen_bemerkung_"+i).addEventListener("input", () => {
				alarmgruppen_changed = true;
			}); 

			document.getElementById("alarmgruppen_cars1_"+i).checked = response[i].pattern.indexOf('{{EINSATZMITTEL_EIGEN}}') != -1; 
			document.getElementById("alarmgruppen_cars1_"+i).addEventListener("input", () => {
				alarmgruppen_changed = true;
			}); 

			document.getElementById("alarmgruppen_cars2_"+i).checked = response[i].pattern.indexOf('{{EINSATZMITTEL_ANDERE}}') != -1; 
			document.getElementById("alarmgruppen_cars2_"+i).addEventListener("input", () => {
				alarmgruppen_changed = true;
			}); 

			document.getElementById("alarmgruppen_fax_"+i).checked = response[i].pattern.indexOf('{{FAX}}') != -1; 
			document.getElementById("alarmgruppen_fax_"+i).addEventListener("input", () => {
				alarmgruppen_changed = true;
			}); 

			document.getElementById("alarmgruppen_karte_"+i).checked = response[i].pattern.indexOf('{{KARTE}}') != -1; 
			document.getElementById("alarmgruppen_karte_"+i).addEventListener("input", () => {
				alarmgruppen_changed = true;
			}); 

			document.getElementById("alarmgruppen_karteemg_"+i).checked = response[i].pattern.indexOf('{{KARTE_EMG}}') != -1; 
			document.getElementById("alarmgruppen_karteemg_"+i).addEventListener("input", () => {
				alarmgruppen_changed = true;
			}); 

			alarmgruppen_count = i;
		
		}

		loadCollapsibles();

	} catch (error) {
		console.log(error);	
		goBack();
		alert("Alarmgruppen konnten nicht geladen werden.");
	}
}

async function alarmgruppen_saveGruppen() {
	try {
	
		if(alarmgruppen_changed) {
			alarmgruppen_changed = false;

			let send = [];

			for(let i = 0; i <= alarmgruppen_count; i++) {
				let pattern  = '';
				
				if(document.getElementById("alarmgruppen_einsatzstichwort_"+i).checked) {
					pattern += '   *{{EINSATZSTICHWORT}}*';
				}
				if(document.getElementById("alarmgruppen_karte_"+i).checked) {
					pattern += ' {{KARTE}}';
				}
				if(document.getElementById("alarmgruppen_karteemg_"+i).checked) {
					pattern += ' {{KARTE_EMG}}';
				}
				if(document.getElementById("alarmgruppen_fax_"+i).checked) {
					pattern += ' {{FAX}}';
				}
				pattern += '\n';
				if(document.getElementById("alarmgruppen_schlagwort_"+i).checked) {
					pattern += '_> {{SCHLAGWORT}}_' + '\n';
				}
				if(document.getElementById("alarmgruppen_objekt_"+i).checked) {
					pattern += '_> {{OBJEKT}}_' + '\n';
				}
				if(document.getElementById("alarmgruppen_strasse_"+i).checked) {
					pattern += '_> {{STRASSE}}_' + '\n';
				}
				if(document.getElementById("alarmgruppen_ortsteil_"+i).checked) {
					pattern += '_> {{ORTSTEIL}}_' + '\n';
				}
				if(document.getElementById("alarmgruppen_ort_"+i).checked) {
					pattern += '_> {{ORT}}_' + '\n';
				}
				if(document.getElementById("alarmgruppen_bemerkung_"+i).checked) {
					pattern += '{{newline}}' + '\n' + '*Bemerkung:*' + '\n' + '_{{BEMERKUNG}}_';
				}
				if(document.getElementById("alarmgruppen_cars1_"+i).checked) {
					pattern += '{{newline}}' + '\n' + '*Einsatzmittel:*' + '\n' + '_{{EINSATZMITTEL_EIGEN}}_';
				}
				if(document.getElementById("alarmgruppen_cars2_"+i).checked) {
					pattern += '\n' + '_{{EINSATZMITTEL_ANDERE}}_';
				}

				send.push({
					id: (i+1),
					name: document.getElementById("alarmgruppen_name_"+i).value,
					pattern: pattern
				});
			}
		
			var getUrl = window.location;
			var baseUrl = getUrl .protocol + "//" + getUrl.host + "/";
			var url = new URL('app/api/alarm/gruppen/set', baseUrl);

			let response = await fetch(url, {
				method: 'POST',
				credentials: 'same-origin',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify(send), // body data type must match "Content-Type" header,
			})
			
			alarmgruppen_loadGruppen();				

		}

	} catch (error) {
		console.log(error);	
		goBack();
		alert("Status konnte nicht geladen werden.");
	}
}


// ----------------  ALARMIERUNG ---------------- 
var alarmierung_ignoreNextAlarm = false;

function alarmierung_load() {
	alarmierung_loadIgnoreNextAlarm();
}

async function alarmierung_loadIgnoreNextAlarm() {
	try {

		let response = await fetchWithParam('app/api/alarm/ignorenext', {});

		console.log(response);
		if(response != false && response != 'false') {
			document.getElementById("alamierung_ignoreNext").checked = true;
			alarmierung_ignoreNextAlarm = true;
			document.getElementById("alarmierung_timeLeft").innerHTML = "noch " + response + "min";
		} else {
			document.getElementById("alamierung_ignoreNext").checked = false;
			alarmierung_ignoreNextAlarm = false;
		}		

	} catch (error) {
		console.log(error);	
		alert("Alarmierung konnte nicht geladen werden.");
	}
}

async function alarmierung_setIgnoreNextAlarm() {
	try {

		let response = await fetchWithParam('app/api/alarm/ignorenext/set',  {value: (!alarmierung_ignoreNextAlarm)}, false);

		alarmierung_loadIgnoreNextAlarm();
	
	} catch (error) {
		console.log(error);	
		alert("Alarmierung konnte nicht gespeichert werden.");
	}
}


// ----------------  PRAESENTATION ---------------- 

async function praesentation_load() {
	try {

		let response = await fetchWithParam('app/api/praesentationen', {});
		response = JSON.parse(response);

		document.getElementById("praesentation_list").innerHTML = "";

		for(let i = 0; i < response.length; i++) {
			
			let newDiv = document.createElement("div");		
									
			newDiv.className = 'item';
			newDiv.innerHTML += `<div class="label-fixed">
									<label class="text-black text-small">Name</label>
									<span class="text-small">${response[i]}</span>
								</div>`;

			
			document.getElementById("praesentation_list").appendChild(newDiv); 

			newDiv.addEventListener("click", () => {
				praesentation_action('load', response[i]);
			});
		}		

    } catch (error) {
		console.log(error);	
		goBack();
		alert("Präsentationen konnten nicht geladen werden.");
	}	
}

async function praesentation_action(action, value) {
	try {

		// GET Parameter
		let param = {};

		var audio = document.getElementById('praesentation_audio');
		console.log(audio);

		switch(action) {
			case 'load':	
				param = {'action': 'load', 'value': value};				
				audio.play()
				.then(_ => { praesentation_setupMediaSession() })
				.catch(error => { console.log(error) });				
				break;
			case 'play':
				audio.play()
				.then(_ => { praesentation_setupMediaSession() })
				.catch(error => { console.log(error) });
				param = {'action': 'play', 'value': ''};			
				break;
			case 'pause':	
				param = {'action': 'pause', 'value': ''};		
				audio.pause();				
				break;
			case 'prev':			
				param = {'action': 'prev', 'value': ''};	
				break;
			case 'next':			
				param = {'action': 'next', 'value': ''};	
				break;
			case 'end':			
				param = {'action': 'end', 'value': ''};	
				audio.pause();	
				if ('mediaSession' in navigator) {
					navigator.mediaSession.metadata = null;
				}
				break;
		}

		// Daten laden
		let response = await fetchWithParam('/app/api/praesentationen/action/set', param);

	} catch (error) {
		console.log(error);	
		goBack();
		alert("Aktion konnte nicht gesendet werden.");
	}	

}

function praesentation_setupMediaSession() {
	if ('mediaSession' in navigator) {
		navigator.mediaSession.metadata = new MediaMetadata({
		  title: 'Präsentation',
		  artist: 'test.pdf',
		  //album: 'Seite 1/5',
		  artwork: [
			{ src: '/icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
			{ src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
			{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
			{ src: '/icons/icon-192x192.png', sizes: '256x256', type: 'image/png' },
			{ src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
			{ src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
		  ]
		});
	  
		navigator.mediaSession.setActionHandler('play', function() { praesentation_action('play', '') });
		navigator.mediaSession.setActionHandler('pause', function() { praesentation_action('pause', '') });
		navigator.mediaSession.setActionHandler('previoustrack', function() { praesentation_action('prev', '') });
		navigator.mediaSession.setActionHandler('nexttrack', function() { praesentation_action('next', '') });
		navigator.mediaSession.setActionHandler('stop', function() { praesentation_action('end', '') });
	}
}


// ----------------  KALENDER BEARBEITEN ---------------- 
kalenderBearbeiten_hasIcon = true;
kalenderBearbeiten_id = -2;
kalenderBearbeiten_kalendergruppen = null;
kalenderBearbeiten_callback = () => {};

function kalenderBearbeiten_changeIcon(text) {
	document.getElementById("kalenderBearbeiten_eventIcon").innerHTML = text;
	kalenderBearbeiten_hasIcon = true;
}

let kalenderBearbeiten_evalDateTime = function() {
	let d1 = new Date(document.getElementById("kalenderBearbeiten_dateStart").value + 'Z');
	let d2 = new Date(document.getElementById("kalenderBearbeiten_dateRemind").value + 'Z');

	if (d1 < Date.now()) {
		document.getElementById("kalenderBearbeiten_dateStart_container").classList.add('red-500');
	} else {
		document.getElementById("kalenderBearbeiten_dateStart_container").classList.remove('red-500');
	}

	if (d2 > d1) {
		document.getElementById("kalenderBearbeiten_dateRemind_container").classList.add('red-500');
	} else {
		document.getElementById("kalenderBearbeiten_dateRemind_container").classList.remove('red-500');
	}
}


async function kalenderBearbeiten_load(obj) {

	id = obj.id;
	kalenderBearbeiten_callback = obj.callback;
	
	console.log("Load ID", id);

	try {

		let kalender = await fetchWithParam('app/api/kalender', {getAll: true});
		let kalendergruppen = await loadKalendergruppen();

		kalenderBearbeiten_id = id;
		kalenderBearbeiten_kalendergruppen = kalendergruppen;

		let event = null;
		for(let i = 0; i < kalender.length; i++) {
			if(kalender[i].id && kalender[i].id == id) {
				event = kalender[i];
				break;
			}
		}

		/*
		let event = { 
			summary: "📖 MTA Landkreisausbildung 2.1+2.2 in (noch offen) ", 
			start: "2020-09-14T17:00:00.000Z", 
			end: "2020-09-14T18:30:00.000Z", 
			location: '', 
			remind: "2020-09-14T11:00:00.000Z",
			group: [{id: 2, name: 'MTA1'}]
		}; */

		console.log('EVENT', event);

		let evalChecked = function() {
			let checked = false;
			for(let i = 1; i < kalendergruppen.length; i++) {	
				if(document.getElementById("kalenderBearbeiten_kalGrName_"+i).checked) checked = true;
			}

			if(KALENDER_FULL == false && !checked) {
				let userKalGroups = String(index_userKalenderGruppen).split('|');
				document.getElementById("kalenderBearbeiten_kalGrName_"+(parseInt(userKalGroups[1])-1)).checked = true;
				document.getElementById("kalenderBearbeiten_kalGrName_0").checked = false;
			} else {
				document.getElementById("kalenderBearbeiten_kalGrName_0").checked = !checked; 
			}
		}

		let textIcon = parseKalenderSummary(event.summary);
		let text = textIcon.text;
		let icon = textIcon.icon;
		
		if(icon == '' || !icon) {
			icon = '&nbsp;&nbsp;&nbsp;&nbsp;'
			kalenderBearbeiten_hasIcon = false;
		}
		
		document.getElementById("kalenderBearbeiten_eventName").innerHTML = text;
		document.getElementById("kalenderBearbeiten_eventIcon").innerHTML = icon;

		Number.prototype.AddZero= function(b,c){
			var  l= (String(b|| 10).length - String(this).length)+1;
			return l> 0? new Array(l).join(c|| '0')+this : this;
		}//to add zero to less than 10,

		let d = new Date(event.start);
		event.start= [d.getFullYear(),					
			(d.getMonth()+1).AddZero(),
			d.getDate().AddZero(),	].join('-') +'T' +
		   [d.getHours().AddZero(),
			d.getMinutes().AddZero()].join(':');
		
		d = new Date(event.remind);
		event.remind= [d.getFullYear(),					
			(d.getMonth()+1).AddZero(),
			d.getDate().AddZero(),	].join('-') +'T' +
		   [d.getHours().AddZero(),
			d.getMinutes().AddZero()].join(':');

		document.getElementById("kalenderBearbeiten_dateStart").value = event.start;
		document.getElementById("kalenderBearbeiten_dateRemind").value = event.remind;

		for(let i = 0; i < kalendergruppen.length; i++) {	
			
			let enabled = true;
			if(KALENDER_FULL == false && String(index_userKalenderGruppen).indexOf(kalendergruppen[i].id) == -1 && i != 0) {
				//continue;
				enabled = false;
			}
			
			let newDiv = document.createElement("div");		

			let disabled = (i == 0 || enabled == false) ? ' disabled' : '';
									
			newDiv.className = 'item label-fixed';
			newDiv.innerHTML += `<label>${kalendergruppen[i].name}</label>
								 <div class="right">
									 <input id="kalenderBearbeiten_kalGrName_${i}" type="checkbox" class="switch green" onchange="" ${disabled}>
							     </div>`;

			
			document.getElementById("kalenderBearbeiten_kalendergruppenList").appendChild(newDiv); 

			document.getElementById("kalenderBearbeiten_kalGrName_"+i).onchange = evalChecked;
		}

		for(let i = 0; i < event.group.length; i++) {		
			document.getElementById("kalenderBearbeiten_kalGrName_"+(parseInt(event.group[i].id)-1)).checked = true; 
		}		

		evalChecked();

		
		
	} catch (error) {
		console.log(error);	
		alert("Kalender konnte nicht geladen werden.");
	}
		
}

async function kalenderBearbeiten_save(newItem, callb) {
	try {

		if(callb != undefined) {
			kalenderBearbeiten_callback = kalender_loadKalender;
		}

		let send = {};
	
		if(!newItem) {
			kalendergruppen_changed = false;			

			let summary = document.getElementById("kalenderBearbeiten_eventName").innerHTML;
			if(kalenderBearbeiten_hasIcon) {
				summary = document.getElementById("kalenderBearbeiten_eventIcon").innerHTML + summary;
			}

			let group = '';
			for(let i = 1; i < kalenderBearbeiten_kalendergruppen.length; i++) {	
				if(document.getElementById("kalenderBearbeiten_kalGrName_"+i).checked) {
					group += '|' + (i+1);
				}
			}
			group = group.substring(1);

			send.id = kalenderBearbeiten_id;
			send.summary = summary;
			send.start = new Date(document.getElementById("kalenderBearbeiten_dateStart").value).toISOString();
			if (document.getElementById("kalenderBearbeiten_dateRemind").value != "") {
				send.remind = new Date(document.getElementById("kalenderBearbeiten_dateRemind").value).toISOString();
			} else {
				send.remind = "";
			}
			send.group = group;

		} else {
			send.id = -1;
			send.summary = '';
			send.start = '';
			send.remind = '';
			send.group = '';
		}

		var getUrl = window.location;
		var baseUrl = getUrl .protocol + "//" + getUrl.host + "/";
		var url = new URL('app/api/kalender/event/set', baseUrl);

		let response = await fetch(url, {
			method: 'POST',
			credentials: 'same-origin',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(send), // body data type must match "Content-Type" header,
		})

		kalenderBearbeiten_callback();


		

	} catch (error) {
		console.log(error);	
		alert("Kalender Termin konnte nicht gespeichert werden.");
	}
}

function kalenderBearbeiten_loeschen(id){
	console.log(alert({
	  title:'Löschen',
	  message:'Termin wirklich löschen?',
	  class:'red',
	  buttons:[
		{
		  label: 'Ja',
		  class:'red-900',
		  onclick: async function () {			
			try {
				closeAlert();
				await fetchWithParam('app/api/kalender/delete', {id: id}, false);
				kalender_loadKalender();
			} catch (error) {
				console.log(error);	
				alert("Kalender Termin konnte nicht gelöscht werden.");
			}						
		  }
		},
		{
		  label:'Nein',
		  class:'text-white',
		  onclick: function () {
			closeAlert();
		  }
		}
	  ]
	}));
}

function kalenderBearbeiten_copyErinnerung() {
	let val = document.getElementById("kalenderBearbeiten_dateStart").value;
	document.getElementById("kalenderBearbeiten_dateRemind").value = val;
}


// ----------------  HYDRANTENKARTE ---------------- 

async function hydrantenkarte_load() {
	if (!navigator.geolocation){
		alert("Geolokation wird von ihrem Browser nicht unterstützt");
		goBack();
		return;
	}

	var opts = {
		enableHighAccuracy: true,
		timeout: 5000,
		maximumAge: 4000
	};	


	async function success(position) {
		let latitude  = position.coords.latitude;
		let longitude = position.coords.longitude;
		let pos = {lat:latitude, lng:longitude};

		let hydrantenCache = await fetchWithParam('/app/api/hydranten.geojson', pos);

		let ret = createMap(pos, hydrantenCache, true);



		Number.prototype.toRad = function() {
			return this * Math.PI / 180;
		}
		
		Number.prototype.toDeg = function() {
			return this * 180 / Math.PI;
		}

		function moveCoord(coord, brng, dist) {
			dist = dist / 6371;  
			brng = brng.toRad();  
		 
			var lat1 = coord.lat.toRad(), lon1 = coord.lng.toRad();
		 
			var lat2 = Math.asin(Math.sin(lat1) * Math.cos(dist) + 
								 Math.cos(lat1) * Math.sin(dist) * Math.cos(brng));
		 
			var lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(dist) *
										 Math.cos(lat1), 
										 Math.cos(dist) - Math.sin(lat1) *
										 Math.sin(lat2));
		 
			if (isNaN(lat2) || isNaN(lon2)) return null;

			return {lat:lat2.toDeg(), lng:lon2.toDeg()};		
		 }

		let radius = 3.1;
		let p1 = moveCoord(pos, 0, radius);
		let p2 = moveCoord(pos, 90, radius);
		let p3 = moveCoord(pos, 180, radius);
		let p4 = moveCoord(pos, 270, radius);

		let boundingExtent  = new ol.extent.boundingExtent([[p1.lng, p1.lat], [p2.lng, p2.lat], [p3.lng, p3.lat], [p4.lng, p4.lat]]);
		boundingExtent = ol.proj.transformExtent(boundingExtent, ol.proj.get('EPSG:4326'), ol.proj.get('EPSG:3857'));

		ret.map.setView(
			new ol.View({
				center: ol.proj.fromLonLat([pos.lng, pos.lat]),
				extent: boundingExtent ,   
				zoom: ret.map.getView().getZoom()
			  })
			);
		
		loadForstRettPkt(ret.map);
	};

	function error(error) {
		let str = "?;"
		switch(error.code) {
			case error.PERMISSION_DENIED: str = "Keine Freigabe! -> Siehe System Einstellungen"; break;
			case error.POSITION_UNAVAILABLE: str = "Pos. nicht gefunden!"; break;
			case error.TIMEOUT: str = "Timeout"; break;
			default: str = "FEHLER"; break;
		}
		alert(`Es war nicht möglich Sie zu lokalisieren (${str})`);
	};

	navigator.geolocation.getCurrentPosition(success, error, opts);
}


// ----------------  Ver. GERÄTE ---------------- 

async function clients_load() {
	try {

		let response = await fetchWithParam('app/api/admin/clients/connected', {});
		
		document.getElementById("clients_list").innerHTML = "";

		for(let i = 0; i < response.length; i++) {
			try {				
				
				let dat = JSON.parse(response[i].type);
				let responseID = response[i].id;
				
				let newDiv = document.createElement("div");		
				let newDiv2 = document.createElement("div");
				let newDiv3 = document.createElement("div");	
				newDiv2.className = 'space';
				newDiv3.className = 'collapsible-content';

				newDiv.className = 'list';
				newDiv.innerHTML += `<div class="item collapsible small-space grey-300 text-grey-700  label-fixed">
										<label class="text-black">Name</label>
										<input id="clients_name_${i}" type="text" value="${dat.name}" readonly>
									</div>`
				newDiv3.innerHTML += `<div class="item  label-fixed">
										<label class="text-black">Info</label>
										<input class="" id="client_page_${i}" style="text-align:right;" value="${dat.info}" readonly>
									</div>`

				for(let j = 0; j < dat.actions.length; j++) {
					let elem = dat.actions[j];
					// Textanzeige
					if(elem.id == "-1") {
						newDiv3.innerHTML +=	`<div class="item  label-fixed">
												<label class="text-black">${elem.key}</label>
												<input class="" id="client_data_${i}" value="${elem.value}" style="text-align:right;" readonly>
											</div>`
					// Seite Reload
					} else if(elem.id == "0") {
						newDiv3.innerHTML += `<div class="item  label-fixed">
												<label class="text-black">Seite neu laden</label>
												<button class="red-400 small right" onclick="clients_action('${responseID}', 'reload', '');">Ausführen</button>
											</div>`
					// Wechsle zu Letzter Alarm
					} else if(elem.id == "1") {
						newDiv3.innerHTML +=	`<div class="item  label-fixed">
												<label class="text-black">Letzter Alarm anzeigen</label>
												<button class="red-400 small right" onclick="clients_action('${responseID}', 'letzteralarm', '');">Ausführen</button>
											</div>`
					// Diashow
					//} else if(elem.id == "2") {
					//	newDiv3.innerHTML +=	`<div class="item  label-fixed">
					//							<label class="text-black">Diashow</label>
					//							<button class="red-400 small right" onclick="">Ausführen</button>
					//						</div>`
					// Kalender Reload
					} else if(elem.id == "3") {
						newDiv3.innerHTML += `<div class="item  label-fixed">
												<label class="text-black">Kalender neu laden</label>
												<button class="red-400 small right" onclick="clients_action('${responseID}', 'kalReload', '');">Ausführen</button>
											</div>
											<div class="item  label-fixed">
												<label class="text-black">Kalender Elemente</label>
												<input class="red-400 right radius" id="client_kalElem_${i}" type="number" style="max-width:20vw; margin-right: 150px; font-size: 2em; text-align: center;" value="${elem.value}">
												<button class="red-400 small right" onclick="clients_action('${responseID}', 'kalElem', document.getElementById('client_kalElem_${i}').value);">Ausführen</button>
											</div>`
					// Wechsle zu Präsentations-Steuerung
					} else if(elem.id == "4") {
						newDiv3.innerHTML += `<div class="item  label-fixed">
												<label class="text-black">Präsentation</label>
												<button class="red-400 small right" onclick="openPage('filesHTTPS/appPraesentation', null, praesentation_load)">Ausführen</button>
											</div>`
					// Seite Zurück
					} else if(elem.id == "5") {
						newDiv3.innerHTML += `<div class="item  label-fixed">
												<label class="text-black">Zurück</label>
												<button class="red-400 small right" onclick="clients_action('${responseID}', 'zurueck', '');">Ausführen</button>
											</div>`
					// Neustart
					} else if(elem.id == "7") {
						newDiv3.innerHTML += `<div class="item  label-fixed">
												<label class="text-black">Neustart</label>
												<button class="red-400 small right" onclick="clients_action('${responseID}', 'restart', '');">Ausführen</button>
											</div>`
					// Update
					} else if(elem.id == "8") {
						newDiv3.innerHTML += `<div class="item  label-fixed">
												<label class="text-black">Version</label>
												<input class="" id="client_data_${i}" value="${elem.value}" style="margin-right: 10em; text-align:right;" readonly>
												<button class="red-400 small right" onclick="clients_action('${responseID}', 'updateScript', '');">Update</button>
											</div>`
					// GPS Position
					} else if(elem.id == "9") {
						newDiv3.innerHTML += `<div class="item  label-fixed">
												<label class="text-black">GPS Pos.</label>
												<input class="" id="client_data_${i}" value="${elem.value}" style="margin-right: 10em; text-align:right;" readonly>
												<button class="red-400 small right" onclick="location.href='geo:${elem.value}'">Karte</button>
											</div>`
					}					
				}	

				newDiv.appendChild(newDiv3); 
				document.getElementById("clients_list").appendChild(newDiv); 
				document.getElementById("clients_list").appendChild(newDiv2); 				

				/*document.getElementById("clients_name_"+i).addEventListener("input", () => {
					// Name speichern
				}); */

				
			} catch (error) {
				console.error(error);
			}
		}

		loadCollapsibles();

	} catch (error) {
		console.log(error);	
		goBack();
		alert("Geräte konnten nicht geladen werden.");
	}
}

async function clients_action(id, action, value) {
	try {

		// GET Parameter
		let param = {'id': id, 'action': action, 'value': value};

	
		// Daten laden
		let response = await fetchWithParam('/app/api/admin/clients/action/set', param);

		setTimeout(function(){ clients_load(); }, 1000);		

	} catch (error) {
		console.log(error);	
		goBack();
		alert("Aktion konnte nicht gesendet werden.");
	}	

}


// ----------------  Verfügbarkeit Pläne ---------------- 
vervuegbarkeitplaene_plans = {"plans": []};
async function vervuegbarkeitplaene_load() {

	try {

		let response = await fetchWithParam('app/api/verfuegbarkeit/plans', {});
		if(!response.statusPlans) return;
		response.statusPlans = JSON.parse(response.statusPlans);

		vervuegbarkeitplaene_plans = response.statusPlans;
		
		document.getElementById("verfuegbarkeitPlan_list").innerHTML = "";

		for(let i = 0; i < response.statusPlans["plans"].length; i++) {
			
			let newDiv = document.createElement("div");
			newDiv.className = 'list';
			newDiv.innerHTML += `<div class="item">
					<h2 
						class="icon ion-edit"
						onclick="openPage('filesHTTPS/appVerfuegbarkeitPlanBearbeiten', ${i}, vervuegbarkeitplaeneBearbeiten_load);"
					>&nbsp;&nbsp;${ response.statusPlans["plans"][i].name }</h2>
					<div class="right">
						<input 
							id="verfuegbarkeitPlan_plan_${i}" 
							type="checkbox" class="switch green" 
							onchange="vervuegbarkeitplaene_changeActive(${i}, this.checked)" 
							${response.statusPlans["plans"][i].active == true ? "checked" : ""}
						>
					</div>
				</div>`
			
			document.getElementById("verfuegbarkeitPlan_list").appendChild(newDiv); 
		}

	} catch (error) {
		console.log(error);	
		goBack();
		alert("Geräte konnten nicht geladen werden.");
	}
}

async function vervuegbarkeitplaene_changeActive(id, value) {
	try {
		if(
			vervuegbarkeitplaene_plans.plans[id]["from"] == ""
			|| vervuegbarkeitplaene_plans.plans[id]["to"] == ""
		) {
			document.getElementById("verfuegbarkeitPlan_plan_"+id).checked = false;
			return;
		}

		vervuegbarkeitplaene_plans.plans[id]["active"] = value;

		var getUrl = window.location;
		var baseUrl = getUrl .protocol + "//" + getUrl.host + "/";
		var url = new URL('app/api/verfuegbarkeit/plans/set', baseUrl);

		let response = await fetch(url, {
			method: 'POST',
			credentials: 'same-origin',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(vervuegbarkeitplaene_plans), // body data type must match "Content-Type" header,
		})

		setTimeout(function(){ vervuegbarkeitplaene_load(); }, 100);

	} catch (error) {
		console.log(error);	
		alert("Kalender Termin konnte nicht gespeichert werden.");
	}
}


// ----------------  Verfügbarkeit Pläne Bearbeiten ----------------
vervuegbarkeitplaeneBearbeiten_num = 0;
async function vervuegbarkeitplaeneBearbeiten_load(num) {
	try { 

		vervuegbarkeitplaeneBearbeiten_num = num;

		let response = await fetchWithParam('app/api/verfuegbarkeit/plans', {});
		if(!response.statusPlans) return;
		response.statusPlans = JSON.parse(response.statusPlans);
		
		vervuegbarkeitplaene_plans = response.statusPlans;

		document.getElementById("vervuegbarkeitplaeneBearbeiten_name").innerHTML = vervuegbarkeitplaene_plans["plans"][num]["name"];
		document.getElementById("vervuegbarkeitplaeneBearbeiten_start").value = vervuegbarkeitplaene_plans["plans"][num]["from"];
		document.getElementById("vervuegbarkeitplaeneBearbeiten_end").value = vervuegbarkeitplaene_plans["plans"][num]["to"];
		
		for(let i = 0; i < 7; i++) {
			document.getElementById("vervuegbarkeitplaeneBearbeiten_" +i).checked = vervuegbarkeitplaene_plans["plans"][num]["weekdays"][i];
		}
		

	} catch (error) {
		console.log(error);	
		goBack();
		alert("Geräte konnten nicht geladen werden.");
	}
}

async function vervuegbarkeitplaeneBearbeiten_save(action) {
	try {

		if(!action) {
			vervuegbarkeitplaene_plans.plans[vervuegbarkeitplaeneBearbeiten_num]["name"] = document.getElementById("vervuegbarkeitplaeneBearbeiten_name").innerHTML;
			vervuegbarkeitplaene_plans.plans[vervuegbarkeitplaeneBearbeiten_num]["from"] = document.getElementById("vervuegbarkeitplaeneBearbeiten_start").value;
			vervuegbarkeitplaene_plans.plans[vervuegbarkeitplaeneBearbeiten_num]["to"] = document.getElementById("vervuegbarkeitplaeneBearbeiten_end").value;

			for(let i = 0; i < 7; i++) {
				vervuegbarkeitplaene_plans.plans[vervuegbarkeitplaeneBearbeiten_num]["weekdays"][i] = document.getElementById("vervuegbarkeitplaeneBearbeiten_" +i).checked;
			}
		} else {
			vervuegbarkeitplaene_plans.plans.push(
				{"name": "NAME", "from":"", "to":"", "active": false, "weekdays": [false, false, false, false, false, false, false] }
			);			
		}

		var getUrl = window.location;
		var baseUrl = getUrl .protocol + "//" + getUrl.host + "/";
		var url = new URL('app/api/verfuegbarkeit/plans/set', baseUrl);

		let response = await fetch(url, {
			method: 'POST',
			credentials: 'same-origin',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(vervuegbarkeitplaene_plans), // body data type must match "Content-Type" header,
		})

		vervuegbarkeitplaene_load();

	} catch (error) {
		console.log(error);	
		alert("Kalender Termin konnte nicht gespeichert werden.");
	}
}

async function vervuegbarkeitplaeneBearbeiten_delete(action) {
	try {

		vervuegbarkeitplaene_plans.plans.splice(vervuegbarkeitplaeneBearbeiten_num, 1);

		var getUrl = window.location;
		var baseUrl = getUrl .protocol + "//" + getUrl.host + "/";
		var url = new URL('app/api/verfuegbarkeit/plans/set', baseUrl);

		let response = await fetch(url, {
			method: 'POST',
			credentials: 'same-origin',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify(vervuegbarkeitplaene_plans), // body data type must match "Content-Type" header,
		})

		vervuegbarkeitplaene_load();
		vervuegbarkeitplaene_load();
		goBack();


	} catch (error) {
		console.log(error);	
		alert("Kalender Termin konnte nicht gespeichert werden.");
	}
}


// ----------------  Diashow ----------------
async function diashow_load() {
	try { 

		let response = await fetchWithParam('app/api/diashow', {});

		console.log(response);

		//document.getElementById("slideshowFreig").innerHTML = "";
		//document.getElementById("slideshowNichtFreig").innerHTML = "";		

		// Freigegeben
		document.getElementById("slideshowFreig").querySelectorAll("[data-exist]")
		.forEach(elem => {
			elem.dataset.exist = '0';
		});
		for(let j = 0; j < response[0].length; j++) {
			let element = document.getElementById("slideshowFreig").querySelectorAll(`[data-src='${response[0][j]}']`)[0];
			console.log(element)
			if(element) {
				element.dataset.exist = '1';
				console.log("already existing" + element.dataset.src)
				continue;
			}

			let newDiv = document.createElement("div");		
			newDiv.className = 'border-grey-400 shadow radius spinner';
			newDiv.style = "width: 20%; min-width: 150px; min-height: 100px; position: relative; flex-grow: 1; margin: 4px; background-color: #363739;";
			newDiv.dataset.src = response[0][j];
			newDiv.dataset.exist = '1';
			newDiv.innerHTML += `
				<img alt="Bild ${j} lädt..." class="lazy" data-src="${response[0][j]}" style="position:relative;top: 50%; left:50%; transform:translate(-50%, -50%);"/>
				<div style="position:absolute; right:10px; bottom:10px;">
					<button class="red circle icon ion-close shadow" onclick="diashow_freigabeFalse('${response[0][j]}')" style="z-index: 1;"></button>
				</div>
				`;
			document.getElementById("slideshowFreig").appendChild(newDiv); 
		}
		document.getElementById("slideshowFreig").querySelectorAll("[data-exist='0']")
		.forEach(elem => {
			elem.remove();
		});

		// Nicht freigegeben
		document.getElementById("slideshowNichtFreig").querySelectorAll("[data-exist]")
		.forEach(elem => {
			elem.dataset.exist = '0';
		});
		for(let j = 0; j < response[1].length; j++) {
			let element = document.getElementById("slideshowNichtFreig").querySelectorAll(`[data-src='${response[1][j]}']`)[0];
			if(element) {
				element.dataset.exist = '1';
				continue;
			}

			let newDiv = document.createElement("div");		
			newDiv.className = 'border-grey-400 shadow radius spinner';
			newDiv.style = "width: 20%; min-width: 150px; min-height: 100px; position: relative; flex-grow: 1; margin: 4px;background-color: #363739;";
			newDiv.dataset.src = response[1][j];
			newDiv.dataset.exist = '1';
			newDiv.innerHTML += `
				<img alt="Bild ${j} lädt..." class="lazy" data-src="${response[1][j]}" style="position:relative;top: 50%; left:50%; transform:translate(-50%, -50%);"/>
				<div style="position:absolute; right:10px; bottom:10px;">
					<button class="green circle icon ion-checkmark" onclick="diashow_freigabeTrue('${response[1][j]}')" style="z-index: 1;"></button>
					<button class="red circle icon ion-close shadow" onclick="diashow_delete('${response[1][j]}')" style="z-index: 1;"></button>
				</div>
				`;
			document.getElementById("slideshowNichtFreig").appendChild(newDiv); 
		}
		document.getElementById("slideshowNichtFreig").querySelectorAll("[data-exist='0']")
		.forEach(elem => {
			elem.remove();
		});


		var lazyloadImages;    
		
		if ("IntersectionObserver" in window) {
			lazyloadImages = document.querySelectorAll(".lazy");
			var imageObserver = new IntersectionObserver(function(entries, observer) {
				entries.forEach(function(entry) {
				if (entry.isIntersecting) {
					var image = entry.target;
					image.src = image.dataset.src;
					image.classList.remove("lazy");
					imageObserver.unobserve(image);
				}
				});
			});
		
			lazyloadImages.forEach(function(image) {
				imageObserver.observe(image);
			});
		} else {  
			var lazyloadThrottleTimeout;
			lazyloadImages = document.querySelectorAll(".lazy");
			
			function lazyload () {
				if(lazyloadThrottleTimeout) {
				clearTimeout(lazyloadThrottleTimeout);
				}    
		
				lazyloadThrottleTimeout = setTimeout(function() {
				var scrollTop = window.pageYOffset;
				lazyloadImages.forEach(function(img) {
					if(img.offsetTop < (window.innerHeight + scrollTop)) {
						img.src = img.dataset.src;
						img.classList.remove('lazy');
					}
				});
				if(lazyloadImages.length == 0) { 
					document.removeEventListener("scroll", lazyload);
					window.removeEventListener("resize", lazyload);
					window.removeEventListener("orientationChange", lazyload);
				}
				}, 20);
			}
		
			document.addEventListener("scroll", lazyload);
			window.addEventListener("resize", lazyload);
			window.addEventListener("orientationChange", lazyload);
		}
		

	} catch (error) {
		console.log(error);	
		goBack();
		alert("Diashow konnten nicht geladen werden.");
	}
}

async function diashow_freigabeTrue(img) {
	try {

		var getUrl = window.location;
		var baseUrl = getUrl .protocol + "//" + getUrl.host + "/";
		var url = new URL('app/api/diashow/freigabe/set/true', baseUrl);

		let response = await fetch(url, {
			method: 'POST',
			credentials: 'same-origin',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({"src": img}), // body data type must match "Content-Type" header,
		})

		diashow_load();

	} catch (error) {
		console.log(error);	
		alert("Kalender Termin konnte nicht gespeichert werden.");
	}
}
async function diashow_freigabeFalse(img) {
	try {

		var getUrl = window.location;
		var baseUrl = getUrl .protocol + "//" + getUrl.host + "/";
		var url = new URL('app/api/diashow/freigabe/set/false', baseUrl);

		let response = await fetch(url, {
			method: 'POST',
			credentials: 'same-origin',
			headers: {'Content-Type': 'application/json'},
			body: JSON.stringify({"src": img}), // body data type must match "Content-Type" header,
		})

		diashow_load();

	} catch (error) {
		console.log(error);	
		alert("Kalender Termin konnte nicht gespeichert werden.");
	}
}
async function diashow_delete(img) {
	console.log(alert({
		title:'Löschen',
		message:'Bild wirklich löschen?',
		class:'red',
		buttons:[
		  {
			label: 'Ja',
			class:'red-900',
			onclick: async function () {
				closeAlert();			
				try {

					var getUrl = window.location;
					var baseUrl = getUrl .protocol + "//" + getUrl.host + "/";
					var url = new URL('app/api/diashow/freigabe/set/delete', baseUrl);
			
					let response = await fetch(url, {
						method: 'POST',
						credentials: 'same-origin',
						headers: {'Content-Type': 'application/json'},
						body: JSON.stringify({"src": img}), // body data type must match "Content-Type" header,
					})
			
					diashow_load();
			
				} catch (error) {
					console.log(error);	
					alert("Kalender Termin konnte nicht gespeichert werden.");
				}				
			}
		  },
		  {
			label:'Nein',
			class:'text-white',
			onclick: function () {
			  closeAlert();
			}
		  }
		]
	}));
	
}


// ----------------  Autos ----------------

auto_length = 0;

async function auto_loadAuto() {
	try {

		// https://stackoverflow.com/questions/4535963/how-can-i-add-an-unremovable-prefix-to-an-html-input-field
		// Util function
		function addFormatter (input, formatFn) {
			let oldValue = input.value;
			
			const handleInput = event => {
			const result = formatFn(input.value, oldValue, event);
			if (typeof result === 'string') {
				input.value = result;
			}
			
			oldValue = input.value;
			}
		
			handleInput();
			input.addEventListener("input", handleInput);
		}
		
		// Example implementation
		// HOF returning regex prefix formatter
		function regexPrefix (regex, prefix) {
			return (newValue, oldValue) => regex.test(newValue) ? newValue : (newValue ? oldValue : prefix);
		}		
		

		let response = await fetchWithParam('app/api/auto', {});
		
		document.getElementById("auto_list").innerHTML = "";

		auto_length = response.length;

		for(let i = 0; i < response.length; i++) {
			try {				
				
				let auto = response[i];
				
				let div_container_head = document.createElement("div");		
				let div_space = document.createElement("div");
				let div_container_body = document.createElement("div");

				div_space.className = 'space';				

				div_container_head.className = 'list';
				div_container_head.innerHTML += `<div class="item collapsible small-space grey-300 text-grey-700  label-fixed">
										<label class="text-black">Name</label>
										<input id="auto_name1_${auto.id}" type="text" value="${auto.name}" readonly>
										<button class="blue-grey-900 circle icon small ion-android-delete" onclick="deleteAuto(${auto.id});"></button>
										<button class="blue-grey-900 circle icon small ion-android-done-all" onclick="auto_speichern(${auto.id});"  style="margin-left:1em;"></button>
									</div>`

				div_container_body.className = 'collapsible-content';
				div_container_body.innerHTML += `<div class="item  label-fixed">
										<label class="text-black">Anzeigename</label>
										<input class="" id="auto_name2_${auto.id}" style="text-align:right;" value="${auto.name}">										
									</div>
									<div class="item  label-fixed">
										<label class="text-black">Benutzername</label>
										<input class="" id="auto_appBenutzer_${auto.id}" style="text-align:right;" value="${auto.appBenutzer}">
									</div>
									<div class="item  label-fixed">
										<label class="text-black">Passwort</label>
										<input class="" id="auto_appPasswort_${auto.id}" style="text-align:right;" value="********" readonly>
										<button class="blue-grey-900 circle icon small ion-android-sync" style='margin-left:1.5em;' onclick="auto_newPW(${auto.id});"></button>
									</div>`
	
				div_container_head.appendChild(div_container_body); 
				document.getElementById("auto_list").appendChild(div_container_head); 
				document.getElementById("auto_list").appendChild(div_space); 	
				
				// Apply formatter
				const input = document.getElementById(`auto_appBenutzer_${auto.id}`);
				addFormatter(input, regexPrefix(/^AUTO/, 'AUTO'));

				
			} catch (error) {
				console.error(error);
			}
		}

		loadCollapsibles();

	} catch (error) {
		console.log(error);	
		goBack();
		alert("Geräte konnten nicht geladen werden.");
	}
}

async function auto_newAuto() {
	try {		

		let response = await fetchWithParam('app/api/auto/add', {}, false);
		auto_loadAuto();

	} catch (error) {
		console.log(error);	
		alert("Einstellungen konnte nicht gespeichert werden.");
	}
}

async function deleteAuto(uid) {
	try {		

		console.log(alert({
			title:'Löschen',
			message:'Element wirklich löschen?',
			class:'red',
			buttons:[
			  {
				label: 'Ja',
				class:'red-900',
				onclick: async function () {
					closeAlert();			
					let response = await fetchWithParam('app/api/auto/delete', {id: uid}, false);
					auto_loadAuto();	
				}
			  },
			  {
				label:'Nein',
				class:'text-white',
				onclick: function () {
				  closeAlert();
				}
			  }
			]
		}));		

	} catch (error) {
		console.log(error);	
		alert("Einstellungen konnte nicht gespeichert werden.");
	}
}

async function auto_newPW(uid) {
	try {		

		let response = await fetchWithParam('app/api/auto/password/new', {id: uid});

		document.getElementById(`auto_appPasswort_${uid}`).value = response.pw;

	} catch (error) {
		console.log(error);	
		alert("Einstellungen konnte nicht gespeichert werden.");
	}
}

async function auto_speichern(uid) {
	try {

		const appname = document.getElementById(`auto_name2_${uid}`).value;
		const appBen = document.getElementById(`auto_appBenutzer_${uid}`).value;

		let response1 = await fetchWithParam('app/api/auto/einstellung/set', {id: uid, setting: 'name', value: appname}, false);
		let response2 = await fetchWithParam('app/api/auto/einstellung/set', {id: uid, setting: 'appBenutzer', value: appBen}, false);

		auto_loadAuto();

	} catch (error) {
		console.log(error);	
		alert("Einstellungen konnte nicht gespeichert werden.");
	}
}
