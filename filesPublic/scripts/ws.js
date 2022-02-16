/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable no-undef */
'use strict';

/**
 * Websocket State zu Text
 */
function ws_stateToText(state) {
    if (state == 0) return 'CONNECTING';
    if (state == 1) return 'OPEN';
    if (state == 2) return 'CLOSING';
    if (state == 3) return 'CLOSED';
    return state;
}

/**
 * https://stackoverflow.com/questions/29881957/websocket-connection-timeout
 * inits a websocket by a given url, returned promise resolves with initialized websocket, rejects after failure/timeout.
 *
 * @param url the websocket url to init
 * @param existingWebsocket if passed and this passed websocket is already open, this existingWebsocket is resolved, no additional websocket is opened
 * @param timeoutMs the timeout in milliseconds for opening the websocket
 * @param numberOfRetries the number of times initializing the socket should be retried, if not specified or 0, no retries are made
 *        and a failure/timeout causes rejection of the returned promise
 * @return {Promise}
 */
function ws_init(url, existingWebsocket, timeoutMs, numberOfRetries) {
    timeoutMs = timeoutMs ? timeoutMs : 1500;
    numberOfRetries = numberOfRetries ? numberOfRetries : 0;
    var hasReturned = false;
    var hasResolved = false;
    const promise = new Promise((resolve, reject) => {
        setTimeout(function () {
            if (!hasReturned) {
                console.info('opening websocket timed out: ' + url);
                rejectInternal();
            }
        }, timeoutMs);

        if (!existingWebsocket || existingWebsocket.readyState != existingWebsocket.OPEN) {
            if (existingWebsocket) {
                existingWebsocket.close();
            }
            console.info('new WebSocket - url: ' + url);
            const websocket = new WebSocket(url);
            websocket.onopen = function () {
                console.info('websocket onopen - url: ' + url);
                if (hasResolved) {
                    websocket.close();
                } else {
                    console.info('websocket to opened! url: ' + url);
                    resolve(websocket);
                }
            };
            websocket.onclose = function () {
                console.info('websocket closed! url: ' + url);
                rejectInternal();
            };
            websocket.onerror = function () {
                console.info('websocket error! url: ' + url);
                rejectInternal();
            };
        } else {
            resolve(existingWebsocket);
        }

        function rejectInternal() {
            if (numberOfRetries <= 0 && numberOfRetries > -1) {
                reject();
            } else if (!hasReturned) {
                hasReturned = true;

                console.info(
                    'retrying connection to websocket! url: ' +
                        url +
                        ', remaining retries: ' +
                        (numberOfRetries - 1)
                );
                setTimeout(() => {
                    ws_init(url, null, timeoutMs, numberOfRetries - 1).then(resolve, reject);
                }, 100);
            }
        }
    });
    promise.then(
        function () {
            console.error(url + ' resolve');

            hasReturned = true;
            hasResolved = true;
        },
        function () {
            console.error(url + ' reject');

            hasReturned = true;
        }
    );
    return promise;
}
