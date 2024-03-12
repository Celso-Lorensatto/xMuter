import { bind } from 'lodash';
import { Tag as saxTag, SAXParser, SAXStream } from 'sax';

import { XmlWriter } from './writer';
import { MyNode } from './intefaces';

export abstract class SaxPromises extends XmlWriter {
    protected catchError: any = null;
    protected parser: SAXStream;
    protected xmlInput: any;
    protected rejectTimeout: number = 5000;
    protected rejectTimer: any;

    protected abstract _eventOpenTag(node: MyNode);
    protected abstract _eventText(text: string);
    protected abstract _eventCloseTag(name: string);
    protected abstract _eventStreamEnd();
    protected abstract _runSaxParser();

    protected async _catchWrapper(fn, reject, ...args) {
        try {
            this.clearRejectTimer();
            if (this.catchError) return;

            await bind(fn, this)(...args);
        } catch (err) {
            this.catchError = err;
            this.setRejectTimer(reject);
        }
    }

    protected setRejectTimer(reject) {
        setTimeout(() => {
            reject(this.catchError);
        }, this.rejectTimeout);
    }

    protected clearRejectTimer() {
        clearTimeout(this.rejectTimer);
    }

    protected async _addEventListeners() {
        return new Promise((resolve, reject) => {
            let rejected = false;
            const rejectOnce = (err) => {
                if (rejected) return;
                rejected = true;
                this.clearRejectTimer();
                reject(err);
            };

            this.parser.on('opentag', (node) => this._catchWrapper(this._eventOpenTag, rejectOnce, node));
            this.parser.on('text', (text) => this._catchWrapper(this._eventText, rejectOnce, text));
            this.parser.on('closetag', (name) => this._catchWrapper(this._eventCloseTag, rejectOnce, name));
            this.parser.on('end', () => {
                this._catchWrapper(this._eventStreamEnd, rejectOnce);

                if (this.catchError) {
                    rejectOnce(this.catchError);
                    return;
                }

                this.clearRejectTimer();
                this.xmlOutput.end();

                // Limpe os recursos após o término do stream
                resolve({});
            });

            this.parser.on('error', (err) => {
                rejectOnce(err);
            });

            this._runSaxParser();
        });
    }
}
