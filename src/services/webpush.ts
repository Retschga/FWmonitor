'use strict';

import webpush from 'web-push';
import { AlarmRow } from '../models/alarm';
import userService from './user';
import groupService from './group';
import globalEvents from '../utils/globalEvents';
import logging from '../utils/logging';
import config from '../utils/config';

const NAMESPACE = 'Webpush_Service';

type NotificationAction = {
    action: string;
    title: string;
};

type NotificationMessage = {
    alerts: number;
    title: string;
    text: string;
    tag: string;
    silent: boolean;
    timestamp: string;
    notAfter: string;
    actions: NotificationAction[];
};

class WebpushService {
    constructor() {
        if (this.enabled()) {
            logging.info(NAMESPACE, 'Enabled');
            webpush.setVapidDetails(
                'mailto:' + config.app.vapid_mail,
                config.app.vapid_public || '',
                config.app.vapid_private || ''
            );

            // Software Notification
            globalEvents.on('softwareinfo', async (text: string) => {
                logging.debug(NAMESPACE, 'Sende Softwareinfo');

                const users = await userService.find({
                    softwareInfo: true,
                    '>appNotifications': 0
                });

                for (let i = 0; i < users.length; i++) {
                    const user = users[i];

                    const notAfter = new Date();
                    notAfter.setTime(notAfter.getTime() + 60 * 60 * 1000);

                    const message: NotificationMessage = {
                        alerts: 1,
                        title: 'Software Info',
                        text: text,
                        tag: 'SoftwareInfo',
                        silent: false,
                        timestamp: new Date().toISOString(),
                        notAfter: notAfter.toISOString(),
                        actions: []
                    };

                    this.notify(user.id, JSON.parse(user.appNotificationsSubscription), message);
                }
            });

            // Alarm Notification
            globalEvents.on('alarm', async (alarm: AlarmRow) => {
                if (!config.alarm.app) {
                    logging.warn(
                        NAMESPACE,
                        'App-Alarmierung deaktiviert! --> Keine Benachrichtigung'
                    );
                    return;
                }

                logging.debug(NAMESPACE, 'Sende Alarm');

                const users = await userService.find_all_approved();
                const groups = await groupService.find_all();

                for (let i = 0; i < users.length; i++) {
                    const user = users[i];
                    const group = groups.find((element) => element.id == user.group);

                    const notAfter = new Date();
                    notAfter.setTime(notAfter.getTime() + 2 * 60 * 1000);

                    // Kombialarm
                    let alarmtype = 'ALARM';
                    if (config.alarmfields.KOMBIALARM_REGEX) {
                        const kombi_regex = new RegExp(config.alarmfields.KOMBIALARM_REGEX);
                        if (alarm.cars1 == '' && kombi_regex.test(alarm.cars2)) {
                            const kombi_name = alarm.cars2.match(kombi_regex);
                            alarmtype = 'KOMBIALARM mit ' + kombi_name;
                        }
                    }

                    const title =
                        alarmtype +
                        ': ' +
                        (group?.pattern.indexOf('{{EINSATZSTICHWORT}}') != -1
                            ? alarm.einsatzstichwort
                            : '') +
                        (group?.pattern.indexOf('{{SCHLAGWORT}}') != -1
                            ? ' ' + alarm.schlagwort
                            : '');

                    const text =
                        (group?.pattern.indexOf('{{STRASSE}}') != -1 ? alarm.strasse : '') +
                        (group?.pattern.indexOf('{{ORT}}') != -1 ? ' ' + alarm.ort : '');

                    const message: NotificationMessage = {
                        alerts: user.appNotifications,
                        title: title,
                        text: text,
                        tag: 'Alarm' + alarm.date,
                        silent: false,
                        timestamp: new Date().toISOString(),
                        notAfter: notAfter.toISOString(),
                        actions: [
                            {
                                action:
                                    '{"url":"notificationaction/userstatus/' +
                                    user.id +
                                    '", "parameter": {"alarmid":"' +
                                    alarm.id +
                                    '", "value":"1"}}',
                                title: '👍 KOMME'
                            },
                            {
                                action:
                                    '{"url":"notificationaction/userstatus/' +
                                    user.id +
                                    '", "parameter": {"alarmid":"' +
                                    alarm.id +
                                    '", "value":"0"}}',
                                title: '👎 KOMME NICHT'
                            }
                        ]
                    };

                    this.notify(user.id, JSON.parse(user.appNotificationsSubscription), message);
                }
            });

            // Drucker Papier Notification
            globalEvents.on('paperstatus-change', async (status: boolean) => {
                logging.debug(NAMESPACE, 'Sende Papierstatus');

                const users = await userService.find({
                    drucker: true
                });

                for (let i = 0; i < users.length; i++) {
                    const user = users[i];

                    const notAfter = new Date();
                    notAfter.setTime(notAfter.getTime() + 2 * 60 * 1000);

                    const message: NotificationMessage = {
                        alerts: 1,
                        title: 'Drucker Info',
                        text: 'Papierstatus: ' + (status ? 'voll' : 'leer'),
                        tag: 'DruckerInfo',
                        silent: false,
                        timestamp: new Date().toISOString(),
                        notAfter: notAfter.toISOString(),
                        actions: []
                    };

                    await this.notify(
                        user.id,
                        JSON.parse(user.appNotificationsSubscription),
                        message
                    );
                }
            });
        } else {
            logging.warn(NAMESPACE, 'Not enabled');
        }
    }

    private enabled(): boolean {
        return config.app.vapid_private && config.app.vapid_public && config.app.vapid_mail
            ? true
            : false;
    }

    public notify(userid: number, subscription: string[], dataToSend: NotificationMessage) {
        if (!this.enabled) throw new Error(NAMESPACE + ' Not Enabled');

        logging.debug(NAMESPACE, 'Notify', { userid, dataToSend, subscription });
        logging.debug(NAMESPACE, 'Subscriptions:', subscription.length);

        for (let i = 0; i < subscription.length; i++) {
            webpush
                .sendNotification(JSON.parse(subscription[i]), JSON.stringify(dataToSend))
                .catch((err) => {
                    if (err.statusCode === 404 || err.statusCode === 410) {
                        subscription.splice(i, 1);
                        userService.update_notifications_app(
                            userid,
                            0,
                            JSON.stringify(subscription)
                        );
                        return false;
                    } else {
                        throw err;
                    }
                });
        }
    }
}

export default new WebpushService();
