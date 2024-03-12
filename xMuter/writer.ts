import { NodeElement, processNodeCallback } from './intefaces';
import { size } from 'lodash';

export abstract class XmlWriter {
    protected abstract xmlOutput;
    protected abstract xmlInput;

    protected identPosition = 0;
    protected ident: boolean = false;

    protected lastOpenedNode: string = '';
    protected lastClosedNode: string = '';
    protected lastOpenedAddedText: boolean = false;
    protected isSelfClosedNode = false;

    abstract changeTag(name: string, processNodeCallback: processNodeCallback): void;

    protected abstract _writeOutput(text: string);


    protected _writeSelfClosedNode(node: NodeElement) {
        this._writeOutput(`<${node.name} />`);
    }

    protected _generateOpenNode(node: NodeElement, attributes: string, isSelfClosed = false) {
        const name = node.newName || node.name;
        return `<${name}${attributes}${isSelfClosed ? ' /' : ''}>`;
    }

    protected _nodeIsSelfClosed(node: any) {
        return node.selfClosed || node.isSelfClosing;
    }

    protected _writeOpenNode(node: NodeElement) {
        const isSelfClosed = this._nodeIsSelfClosed(node);
        const attributes = this.generateNodeAttributes(node);

        if (this.ident) this._addIdentation(this.identPosition, this.ident);
        this._writeOutput(this._generateOpenNode(node, attributes, isSelfClosed));

        if (!isSelfClosed) this.identPosition++;
    }

    writeOpenNode(node: NodeElement) {
        if (node.beforeTagOpenWrite) node.beforeTagOpenWrite(node, this);
        this.lastOpenedNode = node.name;
        this._writeOpenNode(node);
        if (node.afterTagOpenWrite) node.afterTagOpenWrite(node, this);
    }

    protected isTextANewLine(text: string) {
        return text.indexOf('\n') === 0 && !text?.trim();
    }

    protected generateNodeAttributes(node: NodeElement) {
        if (!size(node.attributes)) return '';

        let attributes = '';
        for (const [key, value] of Object.entries(node.attributes)) {
            attributes += ` ${key}="${value}"`;
        }
        return attributes;
    }

    protected _generateCloseNode(node: NodeElement) {
        const name = node.newName || node.name;
        return `</${name}>`;
    }

    protected _writeCloseNode(node: NodeElement) {
        const isSelfClosed = this._nodeIsSelfClosed(node);
        if (isSelfClosed) return;

        this.identPosition--;
        if (this.lastOpenedNode !== this.lastClosedNode) this._addIdentation(this.identPosition, this.ident);
        this._writeOutput(this._generateCloseNode(node));
    }

    writeCloseNode(node: NodeElement) {
        if (node.beforeTagCloseWrite) node.beforeTagCloseWrite(node, this);
        this.lastClosedNode = node.name;
        this._writeCloseNode(node);
        if (node.afterTagCloseWrite) node.afterTagCloseWrite(node, this);
    }

    protected writeNodeValue(text) {
        this._writeOutput(`${text || ''}`);
    }

    writeTag(node: NodeElement) {
        this.writeOpenNode(node);
        if (this._nodeIsSelfClosed(node)) return;

        this._writeNodeContent(node);
        this.writeCloseNode(node);
    }

    protected _writeNodeContent(node: NodeElement) {
        if (this._nodeHasValue(node)) {
            this.writeNodeValue(node.values.value);
            return;
        }

        this._writeChildNodes(node);
    }

    protected _writeChildNodes(node: NodeElement) {
        if (!this._nodeIsSelfClosed(node) && this._nodeHasChildNodes(node)) {
            node.childNodes.forEach((childNode) => {
                this.writeTag(childNode);
            });
        }
    }

    protected _nodeHasChildNodes(node: NodeElement) {
        return node.childNodes?.length > 0;
    }

    protected _nodeHasValue(node: NodeElement) {
        return !!node.values && size(node.values) > 0;
    }

    protected _replicateIdentation() {
        this._addIdentation(this.identPosition);
    }

    protected _addIdentation(ident = 1, breakLineBefore = false) {
        const size = ident * 4;
        if (breakLineBefore) this._breakLine();
        if (size) this._writeOutput(''.padEnd(size, ' '));
    }

    protected _breakLine() {
        this._writeOutput('\n');
    }
}
