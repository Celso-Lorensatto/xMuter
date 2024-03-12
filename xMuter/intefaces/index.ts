import { XmlWriter } from '../writer';
import { Tag as saxTag } from 'sax';

export interface MyNode extends saxTag {

}

export interface TagContentList {
    [key: string]: TagContentItem;
}

export interface TagContentItem {
    node: MyNode;
    newContent?: NodeElement;
}

export interface XMuterParams {
    inputStream: NodeJS.ReadableStream;
    outputStream: NodeJS.WritableStream;
    ident: boolean;
}

export interface XMuterTask {
    name: string;
    processNodeCallback: processNodeCallback;
    options?: { recordOriginalNodeData?: boolean; };
}

export interface NodeElement {
    name?: string;
    newName?: string;
    attributes?: { [key: string]: string; };
    values?: { value?: string; } & { [key: string]: string; };
    selfClosed?: boolean;
    childNodes?: NodeElement[];
    keepOriginalChildNodes?: boolean;
    keepParentChildNodesAt?: 'inside' | 'outside';
    updateChildNodes?: any;
    captureValuesFromChildNodes?: boolean;
    // lifecycle
    beforeTagOpenWrite?: (node: NodeElement, instance: XmlWriter) => void;
    afterTagOpenWrite?: (node: NodeElement, instance: XmlWriter) => void;
    beforeTagCloseWrite?: (node: NodeElement, instance: XmlWriter) => void;
    afterTagCloseWrite?: (node: NodeElement, instance: XmlWriter) => void;
}

export interface xmlChangerContructorParams {
    xmlInput: string;
    xmlOutputDir: string;
}

export interface processNodeCallback {
    (nodeName: string, attributes: { [key: string]: string; }, values?: Record<string, any>): NodeElement;
}

export interface initializeFunction {
    (params: { xmlInput: string; xmlOutputDir: string; }): void;
}

export interface preRenderDataList {
    [key: string]: [
        {
            nodeName: string;
            attributes: string;
            value: string;
        },
    ];
}

