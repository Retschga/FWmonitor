'use strict';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Dbfparser from '@episage/dbf-parser';
import config from '../utils/config';
import fs from 'fs';

const NAMESPACE = 'Contact_Service';

type Contact = {
    name: string;
    vorname: string;
    tel: string;
    tel_dienst: string;
    tel_mobil: string;
    email: string;
};

class Contactservice {
    private async get_contacts_fwvvMitglied(): Promise<Contact[] | undefined> {
        return new Promise((resolve) => {
            if (!config.fwvv.enabled) {
                throw new Error(NAMESPACE + ' fwvv is not enabled');
            }

            const list: Contact[] = [];

            const parser_mitglied = Dbfparser(
                fs.createReadStream(config.fwvv.dat_folder + '/MITGLIED.DBF')
            );
            /*  parser.on('header', (h: undefined) => {
                //debug('dBase file header has been parsed');
                //debug(h);
            }); */

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parser_mitglied.on('record', (record: any) => {
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
            parser_mitglied.on('end', () => {
                resolve(list);
            });
        });
    }

    private async get_contacts_fwvvAdressen(): Promise<Contact[] | undefined> {
        return new Promise((resolve) => {
            if (!config.fwvv.enabled) {
                throw new Error(NAMESPACE + ' fwvv is not enabled');
            }

            const list: Contact[] = [];

            const parser_adressen = Dbfparser(
                fs.createReadStream(config.fwvv.dat_folder + '/ADRESSE.DBF')
            );
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parser_adressen.on('record', (record: any) => {
                if (record['@deleted'] == true) return;
                if (!record.TELEFON1 && !record.TELEFON2 && !record.MOBIL_TEL) return;

                list.push({
                    name: record.NAME,
                    vorname: record.VORNAME,
                    tel: record.TELEFON1,
                    tel_dienst: record.TELEFON2,
                    tel_mobil: record.MOBIL_TEL,
                    email: record.EMAIL
                });
            });
            parser_adressen.on('end', () => {
                resolve(list);
            });
        });
    }

    public async get_contacts_all(): Promise<Contact[] | undefined> {
        const list: Contact[] = [];
        const list1 = await this.get_contacts_fwvvMitglied();
        if (list1) list.push(...list1);
        const list2 = await this.get_contacts_fwvvAdressen();
        if (list2) list.push(...list2);
        return list;
    }
}

const contactService = new Contactservice();

export { Contact, contactService };
