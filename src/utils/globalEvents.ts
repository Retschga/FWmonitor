import { EventEmitter } from 'events';
import logging from '../utils/logging';

const NAMESPACE = 'GlobalEvents';

class GlobalEvents extends EventEmitter {
    public emit(event: string | symbol, ...args: any[]) {
        logging.debug(NAMESPACE, String(event) + ' emitted');
        return super.emit(event, ...args);
    }
}

const globalEvents = new GlobalEvents();

export default globalEvents;
