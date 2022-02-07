'use strict';

import * as CalendarGroupsModel from '../models/calendarGroup';
import * as CalendarModel from '../models/calendar';

import config from '../utils/config';
import globalEvents from '../utils/globalEvents';
import ical from 'node-ical';
import logging from '../utils/logging';

const NAMESPACE = 'Calendar_Service';

interface CalendarGroup {
    id: number;
    name: string;
}

interface CalendarElement {
    id: number;
    summary: string;
    start: Date | undefined;
    end: Date | undefined;
    location: string;
    remind: Date | undefined;
    group: CalendarGroup[];
}

class CalendarService {
    /**
     * Sorts earliest to latest
     * @param {*} a Element 1
     * @param {*} b Element 2
     */
    private sortByDate(a: CalendarElement, b: CalendarElement) {
        if (!b.start) return 1;
        if (!a.start) return -1;
        return +new Date(a.start) - +new Date(b.start);
    }

    /**
     * Entferne Gruppenpatterns aus Terminnamen
     * @param {String} str Terminname
     */
    private removePattern(str: string) {
        let ret = String(str);
        ret = ret.replace(/{{[^}]*}}/gi, '');
        return ret;
    }

    /**
     * Erstellt aus einer Datenbankreihe ein Kalenderelement
     */
    private createCalendarElementsFromRows(
        dbElements: CalendarModel.CalendarRow[],
        calendarGroups: CalendarGroupsModel.CalendarGroupRow[]
    ): CalendarElement[] {
        const calendarElements: CalendarElement[] = [];

        for (let i = 0; i < dbElements.length; i++) {
            const element = dbElements[i];

            // Kalendergruppen
            const groupNumbers =
                element.group != null && element.group != '' ? element.group.split('|') : [];
            const groupArray: CalendarGroup[] = [];

            for (let i = 0; i < groupNumbers.length; i++) {
                groupArray.push({
                    id: calendarGroups[Number(groupNumbers[i]) - 1].id,
                    name: calendarGroups[Number(groupNumbers[i]) - 1].name
                });
            }
            if (groupArray.length < 1) {
                groupArray.push({
                    id: 1,
                    name: calendarGroups[0].name
                });
            }

            const calendarElement: CalendarElement = {
                id: element.id,
                summary: element.summary,
                start: element.start != null ? new Date(element.start) : undefined,
                end: undefined,
                location: '',
                remind: element.remind != null ? new Date(element.remind) : undefined,
                group: groupArray
            };
            calendarElements.push(calendarElement);
        }

        calendarElements.sort(this.sortByDate);

        return calendarElements;
    }

    private async get_ical(
        onlyFuture: boolean = true,
        calendarGroups: CalendarGroupsModel.CalendarGroupRow[]
    ) {
        if (!config.common.ical_url) return;

        try {
            const calendarElements: CalendarElement[] = [];
            const data = await ical.async.fromURL(config.common.ical_url);

            Object.keys(data).forEach((key) => {
                const entry = data[key];

                if (!entry.summary) return;

                if (onlyFuture && new Date(String(entry.start)).getTime() < Date.now()) return;

                // Gruppen auslesen
                const group = [];
                for (let i = 0; i < calendarGroups.length; i++) {
                    if (String(entry.summary).indexOf(calendarGroups[i].pattern) != -1) {
                        group.push({
                            id: calendarGroups[i].id,
                            name: calendarGroups[i].name
                        });
                    }
                }
                // Keine Gruppe angegeben -> alle
                if (group.length < 1) {
                    group.push({
                        id: calendarGroups[0].id,
                        name: calendarGroups[0].name
                    });
                }

                // Termin speichern
                const calendarElement: CalendarElement = {
                    id: -1,
                    summary: this.removePattern(String(entry.summary)),
                    start: new Date(String(entry.start)),
                    end: new Date(String(entry.end)),
                    location: String(entry.location),
                    remind: undefined,
                    group: group
                };

                calendarElements.push(calendarElement);
            });

            return calendarElements;
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }

    public async find_id(id: number): Promise<CalendarElement[]> {
        const calendarGroups = await CalendarGroupsModel.model.find();
        const dbElements = await CalendarModel.model.find({ id: id });

        const calendarElements = this.createCalendarElementsFromRows(dbElements, calendarGroups);

        return calendarElements;
    }

    public async find_all(): Promise<CalendarElement[]> {
        const calendarGroups = await CalendarGroupsModel.model.find();
        const dbElements = await CalendarModel.model.find({}, undefined, undefined);

        const calendarElements = this.createCalendarElementsFromRows(dbElements, calendarGroups);

        const calendarElements2 = await this.get_ical(false, calendarGroups);
        if (calendarElements2) {
            for (let i = 0; i < calendarElements2.length; i++)
                calendarElements.push(calendarElements2[i]);
            calendarElements.sort(this.sortByDate);
        }

        return calendarElements;
    }

    public async find_all_upcoming(): Promise<CalendarElement[] | undefined> {
        const now = new Date();
        const calendarGroups = await CalendarGroupsModel.model.find();
        const dbElements = await CalendarModel.model.find({ 'start>=': now.toISOString() });
        const icalElements = await this.get_ical(true, calendarGroups);

        if (dbElements.length < 1 && (!icalElements || icalElements?.length < 1)) return;
        const calendarElements = this.createCalendarElementsFromRows(dbElements, calendarGroups);

        if (icalElements) {
            for (let i = 0; i < icalElements.length; i++) calendarElements.push(icalElements[i]);
            calendarElements.sort(this.sortByDate);
        }

        return calendarElements;
    }

    public async create(
        summary: string,
        start: Date,
        remind: Date | undefined,
        group: string | undefined
    ) {
        logging.debug(NAMESPACE, 'create', { summary, start, remind, group });
        const affectedRows = await CalendarModel.model.insert({
            summary: summary,
            start: start ? start.toISOString() : undefined,
            remind: remind ? remind.toISOString() : undefined,
            group: group
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' create - No rows changed');
        }

        globalEvents.emit('calendar-change');
    }

    public async delete(id: number) {
        logging.debug(NAMESPACE, 'delete', id);

        if (id < 0) {
            throw new Error(NAMESPACE + ' update - Entry is from ICAL -> cannot be updated');
        }

        const affectedRows = await CalendarModel.model.delete(id);

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' delete - No rows changed');
        }

        globalEvents.emit('calendar-change');
    }

    public async update(id: number, summary: string, start: Date, remind: Date, group: string) {
        logging.debug(NAMESPACE, 'update', { id, summary, start, remind, group });

        if (id < 0) {
            throw new Error(NAMESPACE + ' update - Entry is from ICAL -> cannot be updated');
        }

        const affectedRows = await CalendarModel.model.update(id, {
            summary: summary,
            start: start.toISOString(),
            remind: remind.toISOString(),
            group: group
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update - No rows changed');
        }

        globalEvents.emit('calendar-change');
    }

    public init() {
        let lastTime = new Date();

        setInterval(async () => {
            logging.debug(NAMESPACE, 'Terminerinnerung CHECK...');

            const termine = await this.find_all_upcoming();
            if (!termine) return;

            const date_now = new Date();

            for (let i = 0; i < termine.length; i++) {
                const termin = termine[i];

                if (termin.remind != undefined) {
                    // Erinnerungs-Datum zwischen letzter Überprüfung und jetzt

                    const timeRemind = new Date(termin.remind).getTime();

                    if (lastTime.getTime() < timeRemind && timeRemind < date_now.getTime()) {
                        logging.debug(NAMESPACE, 'Terminerinnerung: ', termin);
                        globalEvents.emit('calendar-remind', termin);
                    }
                }
            }
            lastTime = date_now;
        }, 60000);
    }
}

const calendarService = new CalendarService();

export { calendarService, CalendarElement, CalendarGroup };
