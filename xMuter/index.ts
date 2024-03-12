
import { SAXStream } from 'sax';
import * as XMuterInterfaces from './intefaces';
import { SaxPromises } from './saxp';

const defaultParams: Partial<XMuterInterfaces.XMuterParams> = {
    ident: true,
};

class XMuter extends SaxPromises {
    //#region attributes

    protected params: XMuterInterfaces.XMuterParams;
    protected xmlOutput: any;

    protected taskList: XMuterInterfaces.XMuterTask[] = [];
    // TODO: atributo para nao armazenar os values das subtags
    protected updatedNodeData = {};

    protected tagContentList: XMuterInterfaces.TagContentList = {};
    protected lastTaskOpenedNode: string = '';
    protected lastTaskClosedNode: string = '';
    protected captureValuesFromChildNodes = false;

    //#endregion attributes

    constructor(params_: Partial<XMuterInterfaces.XMuterParams>) {
        const params = { ...defaultParams, ...params_ };
        super();
        this.checkParams(params);
        this.setParams(params as XMuterInterfaces.XMuterParams);
    }

    protected checkParams(params: Partial<XMuterInterfaces.XMuterParams>) {
        if (!params.inputStream) {
            throw new Error('xmlInputStream is required');
        }

        if (!params.outputStream) {
            throw new Error('xmlOutputStream is required');
        }
    }

    protected setParams(params: XMuterInterfaces.XMuterParams) {
        this.params = params;
        this.ident = params.ident;
    }

    //#region coreMethods

    async run() {
        this._initializeSaxParser();
        this._initializeStreams();
        await this._addEventListeners();
    }

    protected async _initializeStreams() {
        this.xmlInput = this.params.inputStream;
        this.xmlOutput = this.params.outputStream;

        this.xmlOutput.on('drain', () => {
            this.xmlInput.resume();
        });
    }

    protected _initializeSaxParser() {
        this.parser = new SAXStream(true, {});
    }

    protected _runSaxParser() {
        this.xmlInput.pipe(this.parser);
    }

    protected _writeOutput(text) {
        const test = this.xmlOutput.write(text);

        if (!test) {
            this.xmlInput.pause();
        }
    }

    changeTag(name: string, processNodeCallback: XMuterInterfaces.processNodeCallback): void {
        this.taskList.push({
            name: name,
            processNodeCallback,
        });
    }

    //#endregion coreMethods

    //#region events

    protected _eventOpenTag(node: XMuterInterfaces.MyNode) {
        this.lastOpenedAddedText = false;

        const task = this._findTask(node.name);
        this.tagContentList[node.name] = { node };

        if (!task) this.writeOpenNode(node);
        else this._executeOpenTagTask(node, task);

        this.lastOpenedNode = node.name;
    }

    protected _eventText(text: string) {
        const isNewLineEvent = this.isTextANewLine(text);
        let newContent = this.tagContentList[this.lastTaskOpenedNode]?.newContent;

        if (isNewLineEvent && this.params.ident) return;
        if (!isNewLineEvent) {
            this.lastOpenedAddedText = true;

            if (this.captureValuesFromChildNodes) {
                newContent = this._updateNewNodeContent(this.lastTaskOpenedNode, text, this.lastOpenedNode);
                if (newContent.values?.value) text = newContent.values?.value;
            }
        }

        this.writeNodeValue(text);
    }

    protected _eventCloseTag(name: string) {
        const task = this._findTask(name);
        const { node } = this.tagContentList[name];

        if (!task) {
            this.writeCloseNode(node);
            delete this.tagContentList[name];
        } else {
            this._executeCloseTagTask(task, node);
        }

        this.lastOpenedAddedText = false;
    }

    protected _eventStreamEnd() {
        this.xmlOutput.end();
    }

    //#endregion events

    //#region mainMethods

    protected _findTask(name: string) {
        return this.taskList.find((task) => task.name === name);
    }

    protected _executeOpenTagTask(node: XMuterInterfaces.MyNode, task: XMuterInterfaces.XMuterTask) {
        const newContentNode = this._createNewNodeContent(task, node);

        if (newContentNode.captureValuesFromChildNodes) this.captureValuesFromChildNodes = true;
        this.writeOpenNode(newContentNode);

        this.lastTaskOpenedNode = node.name;
    }

    protected _createNewNodeContent(task: XMuterInterfaces.XMuterTask, node?: XMuterInterfaces.MyNode) {
        const callback = (values: any = {}) =>
            task.processNodeCallback(
                node.name,
                node.attributes as {
                    [key: string]: string;
                },
                values,
            );
        const data = callback();

        const newNodeContent: XMuterInterfaces.NodeElement = {};
        newNodeContent.name = node.name;
        newNodeContent.newName = data.newName || node.name;
        newNodeContent.attributes = data.attributes || node.attributes;
        newNodeContent.values = { ...data.values };
        newNodeContent.childNodes = data.childNodes;
        newNodeContent.captureValuesFromChildNodes = !!data.captureValuesFromChildNodes;
        newNodeContent.beforeTagOpenWrite = data.beforeTagOpenWrite;
        newNodeContent.afterTagOpenWrite = data.afterTagOpenWrite;
        newNodeContent.beforeTagCloseWrite = data.beforeTagCloseWrite;
        newNodeContent.afterTagCloseWrite = data.afterTagCloseWrite;
        newNodeContent.updateChildNodes = (values_) => {
            const { childNodes, values } = callback(values_);
            if (values) newNodeContent.values = values;
            newNodeContent.childNodes = childNodes;
        };

        return (this.tagContentList[node.name]['newContent'] = newNodeContent);
    }

    protected _updateNewNodeContent(name: string, childValue, childName) {
        const newContent = this.tagContentList[this.lastTaskOpenedNode].newContent;
        newContent.values[childName] = childValue;
        newContent.updateChildNodes(newContent.values);

        return newContent;
    }

    protected _executeCloseTagTask(task: XMuterInterfaces.XMuterTask, node: XMuterInterfaces.MyNode) {
        const newNodeContent = this.tagContentList[node.name].newContent;


        this._writeChildNodes(newNodeContent);

        this.captureValuesFromChildNodes = false;
        delete this.tagContentList[node.name];
        this.updatedNodeData = {};

        this.lastTaskClosedNode = node.name;
        this.writeCloseNode(newNodeContent);
    }

    //#end region mainMethods
}

export default XMuter;
