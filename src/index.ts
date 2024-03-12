import XMuter from '../xMuter/index';
import fs from 'fs';

const readStream = fs.createReadStream('./sample/sample.xml');
const writeStream = fs.createWriteStream('./sample/sample_final.xml');

const xMuter = new XMuter({
    inputStream: readStream,
    outputStream: writeStream
});

//change simple tag value
xMuter.changeTag('editora', (nodeName, attributes, values) => {
    if (values.editora == 'HarperCollins') {
        values.value = 'newValue';
    }
    return {
        values: values,
        captureValuesFromChildNodes: true
    };
});

//Adding childNodes
const newValues = {
    "O Guia do Mochileiro das Galáxias": "newData 1",
    "O Senhor dos Anéis: A Sociedade do Anel": "newData 2",
    "Orgulho e Preconceito": "newData 3",
};

xMuter.changeTag('livro', (nodeName, attributes, values) => {
    return {
        childNodes: [
            {
                name: 'newData',
                values: { value: newValues[attributes['titulo']] }
            }
        ],
    };
});

xMuter.changeTag('autores', (nodename, attributes, values) => {
    return {
        newName: 'oldAutores',
        afterTagCloseWrite(node, instance) {
            instance.writeTag({
                name: 'tagAfterClose',
                childNodes: [
                    {
                        name: 'subTag',
                        values: { value: 'testValue' }
                    }
                ]
            });
        },
        captureValuesFromChildNodes: true
    };
});


async function run() {
    await xMuter.run();
}

run();