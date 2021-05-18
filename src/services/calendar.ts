'use strict';

import logging from '../utils/logging';
import * as CalendarModel from '../models/calendar';
import * as CalendarGroupsModel from '../models/calendarGroup';

const NAMESPACE = 'CalendarService';

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
        0;
        if (!b.start) return 1;
        if (!a.start) return -1;
        return +new Date(a.start) - +new Date(b.start);
    }

    /**
     * Entferne Gruppenpatterns aus Terminname
     * @param {String} str Terminname
     */
    private removePattern(str: string) {
        let ret = String(str);
        ret = ret.replace(/{{[^}]*}}/gi, '');
        return ret;
    }

    private createCalendarElementsFromRows(
        dbElements: CalendarModel.CalendarRow[],
        calendarGroups: CalendarGroupsModel.CalendarGroupRow[]
    ) {
        let calendarElements: CalendarElement[] = [];

        for (let i = 0; i < dbElements.length; i++) {
            const element = dbElements[i];

            // Kalendergruppen
            const groupNumbers =
                element.group != null && element.group != '' ? element.group.split('|') : [];
            let groupArray: CalendarGroup[] = [];

            for (let i = 0; i < groupNumbers.length; i++) {
                groupArray.push({
                    id: Number(element.group),
                    name: calendarGroups[Number(element.group) - 1].name
                });
            }
            if (groupArray.length < 1) {
                groupArray.push({
                    id: 1,
                    name: calendarGroups[0].name
                });
            }

            const calendarElement: CalendarElement = {
                id: i,
                summary: element.summary,
                start: element.start != null ? element.start : undefined,
                end: undefined,
                location: '',
                remind: element.remind != null ? element.remind : undefined,
                group: groupArray
            };
            calendarElements.push(calendarElement);
        }
        return calendarElements;
    }

    public async find_all(): Promise<CalendarElement[]> {
        const calendarGroups = await CalendarGroupsModel.model.find();
        const dbElements = await CalendarModel.model.find();

        const calendarElements = this.createCalendarElementsFromRows(dbElements, calendarGroups);

        // TODO read from ICAL
        return calendarElements;
    }

    public async find_all_upcoming(limit: number = -1): Promise<CalendarElement[] | undefined> {
        let now = new Date();
        const calendarGroups = await CalendarGroupsModel.model.find();
        let dbElements = await CalendarModel.model.find({ 'start>=': now.toISOString() });
        if (dbElements.length < 1) return;

        const calendarElements = this.createCalendarElementsFromRows(dbElements, calendarGroups);

        // TODO read from ICAL
        return calendarElements;
    }

    public async create(
        summary: String,
        start: Date,
        remind: Date | undefined,
        group: String | undefined
    ) {
        logging.debug(NAMESPACE, 'create', { summary, start, remind, group });
        let affectedRows = await CalendarModel.model.insert({
            summary: summary,
            start: start,
            remind: remind,
            group: group
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' create - No rows changed');
        }
    }

    public async delete(id: number) {
        logging.debug(NAMESPACE, 'delete', id);

        if (id < 0) {
            throw new Error(NAMESPACE + ' update - Entry is from ICAL -> cannot be updated');
        }

        let affectedRows = await CalendarModel.model.delete(id);

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' delete - No rows changed');
        }
    }

    public async update(id: number, summary: String, start: Date, remind: Date, group: String) {
        logging.debug(NAMESPACE, 'update', { id, summary, start, remind, group });

        if (id < 0) {
            throw new Error(NAMESPACE + ' update - Entry is from ICAL -> cannot be updated');
        }

        let affectedRows = await CalendarModel.model.update(id, {
            summary: summary,
            start: start,
            remind: remind,
            group: group
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update - No rows changed');
        }
    }
}

const calendarService = new CalendarService();

export { calendarService, CalendarElement, CalendarGroup };
