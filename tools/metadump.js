// metadump.js
// Dumps out some data from the meta files in a folder.

const fs = require('fs');
const path = require('path');
const ByteBuffer = require("bytebuffer");
const BufferedReader = require('../spica/BufferedReader');
const GFPackage = require('../spica/gfPackage');

const HOME = process.argv[2];
const OUT = fs.createWriteStream('./METADUMP.csv');

const files = fs.readdirSync(HOME);
for (const file of files) {
	let reader;
	try {
		let data = fs.readFileSync(path.join(HOME, file));
		data = ByteBuffer.wrap(data, 'binary', ByteBuffer.LITTLE_ENDIAN);
		reader = new BufferedReader(data);
	} catch (e) {
		console.error(e);
		continue;
	}
	
	let header = GFPackage.parseHeader(reader);
	if (header.entries.length !== 2) throw new ReferenceError('Invalid number of entries for Pack 8!');
	reader.offset = header.entries[0].address;
	if (header.entries[0].length !== 0x60) throw new TypeError('Invalid size for meta block 1!');
	
	let line = '';
	line += `${reader.readUint32()}, ${reader.readUint32()}, ${reader.readUint32()}, ${reader.readUint32()}, `;
	line += `${reader.readFloat32()}, ${reader.readFloat32()}, ${reader.readFloat32()}, `;
	line += `${reader.readFloat32()}, ${reader.readFloat32()}, ${reader.readFloat32()}, `;
	line += `${reader.readFloat32()}, ${reader.readFloat32()}, ${reader.readFloat32()}, `;
	line += `${reader.readFloat32()}, ${reader.readUint32()}, ${reader.readUint16()}, ${reader.readUint16()}, `;
	line += `flags, `;
	for (let i = 0; i < 16; i++) {
		line += `${reader.readUint16()}, `;
	}
	line += `${file}\n`;
	OUT.write(line);
}
OUT.end();