'use strict';


// ----------------  WEB PUSH NOTIFICATIONS ---------------- 
const webpush = require('web-push');
const publicVapidKey = process.env.VAPID_PUBLIC;
const privateVapidKey = process.env.VAPID_PRIVATE;

if (process.env.APP_DNS != "")
	webpush.setVapidDetails('mailto:' + process.env.VAPID_EMAIL, publicVapidKey, privateVapidKey);

// ----------------  Datenbank ---------------- 
const db = require('./database')();


/**
 * Versendet Notifications an die WebApp
 * @param {String} titel 
 * @param {String} text 
 * @param {String} tag 
 * @param {Boolean} silent 
 * @param {String} timestamp 
 * @param {String} zeigeBis 
 * @param {Boolean} isAlarm 
 * @param {[String]} actions 
 * @param {[String]} groups 
 */
function notify(titel, text, tag, silent, timestamp, zeigeBis, isAlarm, actions, groups) {

	if (process.env.APP_DNS == "") {
		console.err("[WebNotifications] APP ist deaktiviert");
		return;
	}

	const triggerPushMsg = function (subscription, dataToSend, telegramid) {
		return webpush.sendNotification(subscription, dataToSend)
			.catch((err) => {
				if (err.statusCode === 404 || err.statusCode === 410) {
					console.log('Subscription has expired or is no longer valid: ', err);
					return db.setUserNotificationsSubscription(telegramid, '');
				} else {
					throw err;
				}
			});

	};
	//    console.log(titel, text, tag, silent, timestamp, zeigeBis, isAlarm, actions, groups);
	var dataToSend = {
		titel: titel,
		text: text,
		tag: tag,
		silent: silent,
		timestamp: timestamp,
		zeigeBis: zeigeBis,
		notificationAnzahl: 1,
		actions: actions
	};

	return db.getUserNotificationsSubscription()
		.then(function (subscriptions) {
			let promiseChain = Promise.resolve();

			for (let i = 0; i < subscriptions.length; i++) {
				if (subscriptions[i].appNotifications != 0 && subscriptions[i].endpoint != "") {

					let freigabe = false;
					if (groups != undefined && groups.length > 0) {
						for (let gr in groups) {
							switch (groups[gr]) {
								case "drucker":
									if (subscriptions[i].drucker == '1') { freigabe = true; } break;
								case "admin":
									if (subscriptions[i].admin == '1') { freigabe = true; } break;
								case "stAGT":
									if (subscriptions[i].stAGT == '1') { freigabe = true; } break;
								case "stMA":
									if (subscriptions[i].stMA == '1') { freigabe = true; } break;
								case "stGRF":
									if (subscriptions[i].stGRF == '1') { freigabe = true; } break;
								case "stZUGF":
									if (subscriptions[i].stZUGF == '1') { freigabe = true; } break;
								case "alarm1":
									if (subscriptions[i].group == '1') { freigabe = true; } break;
								case "alarm2":
									if (subscriptions[i].group == '2') { freigabe = true; } break;
								case "alarm3":
									if (subscriptions[i].group == '3') { freigabe = true; } break;
								case "alarm4":
									if (subscriptions[i].group == '4') { freigabe = true; } break;
								case "alarm5":
									if (subscriptions[i].group == '5') { freigabe = true; } break;
								default:
									if (subscriptions[i].telegramid == groups[gr]) { freigabe = true; } break;
							}
						}
					} else {
						freigabe = true;
					}

					if (freigabe) {
						const subscription = JSON.parse(subscriptions[i].endpoint);
						if (isAlarm == true) {
							dataToSend.notificationAnzahl = subscriptions[i].appNotifications;
						}
						promiseChain = promiseChain.then(() => {
							return triggerPushMsg(subscription, JSON.stringify(dataToSend), subscriptions[i].telegramid);
						});
					}
				}
			}

			return promiseChain;
		})
		.then(() => {
			return true;
		})
		
		.catch(function (err) {
			console.error(err);
			return false;
		});
}

/**
 * Speichert die Subscription eines Users
 * @param {Integer} telegramID 
 * @param {String} subscription 
 */
function subscribe(telegramID, subscription) {

	if (process.env.APP_DNS == "") {
		console.err("[WebNotifications] APP ist deaktiviert");
		return;
	}

	return db.setUserNotificationsSubscription(telegramID, subscription)
		.then(function (subscriptionId) {
			return true;
		})
		.catch(function (err) {
			return false;
		});
}




module.exports = {
	notify,
	subscribe
};
