'use strict';

import logging from '../utils/logging';
import config from '../utils/config';
// @ts-ignore
import Dbfparser from '@episage/dbf-parser';
import fs from 'fs';

const NAMESPACE = 'ContactService';

type Contact = {
    name: string;
    vorname: string;
    tel: string;
    tel_dienst: string;
    tel_mobil: string;
    email: string;
};

class Contactservice {
    public async get_contacts_all(): Promise<Contact[] | undefined> {
        return new Promise(async (resolve, reject) => {
            if (!config.fwvv.enabled) {
                throw new Error(NAMESPACE + ' fwvv is not enabled');
            }

            const parser = Dbfparser(fs.createReadStream(config.fwvv.dat_folder + '/MITGLIED.DBF'));
            let list: Contact[] = [];

            parser.on('header', (h: any) => {
                //debug('dBase file header has been parsed');
                //debug(h);
            });

            parser.on('record', (record: any) => {
                if (record['@deleted'] == true) {
                    return;
                }

                if (record['@deleted'] == true) return;
                if (!record.TEL && !record.TEL_DIENST && !record.MOBIL_TEL) return;

                list.push({
                    name: record.NAME,
                    vorname: record.VORNAME,
                    tel: record.TEL,
                    tel_dienst: record.TEL_DIENST,
                    tel_mobil: record.MOBIL_TEL,
                    email: record.EMAIL
                });
            });

            parser.on('end', () => {
                resolve(list);
            });
        });
    }
}

const contactService = new Contactservice();

export { Contact, contactService };
