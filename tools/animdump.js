// metadump.js
// Dumps out some data from the meta files in a folder.

const fs = require('fs');
const path = require('path');
const ByteBuffer = require("bytebuffer");
const BufferedReader = require('../spica/BufferedReader');
const GFPackage = require('../spica/gfPackage');

const HOME = process.argv[2];
const OUT = fs.createWriteStream('./ANIMDUMP.csv');

const files = fs.readdirSync(HOME);
for (const file of files) {
	let pak;
	try {
		let data = fs.readFileSync(path.join(HOME, file));
		data = ByteBuffer.wrap(data, 'binary', ByteBuffer.LITTLE_ENDIAN);
		data = new BufferedReader(data);
		if (data.length === 0) throw 'Empty File';
		let header = GFPackage.parseHeader(data);
		if (header.entries.length === 0) throw 'No Entries';
		let animCount = header.entries.length-14;
		let line = `${file}, `;
		
		for (let i = 0; i < 14; i++) {
			let entry = header.entries[animCount+i];
			line += `${entry.length}, `;
		}
		line += `|, `;
		
		let entry = header.entries[animCount+0];
		if (entry.length) {
			data.offset = entry.address;
			let xd = new BufferedReader(data.readBytes(entry.length));
			
			let magic = xd.readUint32();
			magic = ('00000000'+magic.toString(16)).slice(-8);
			line += `0x${magic}, `;
			
			while (xd.offset < xd.length) {
				let i = xd.readUint32(xd.offset);
				let f = xd.readFloat32(xd.offset);
				let s = xd.readPaddedString(64, xd.offset);
				if (/^[a-zA-Z0-9]+$/.test(s)) {
					line += `${s}, `;
					xd.skip(64);
				} else if (f.toString().indexOf('e') > 0) {
					line += `${i}, `;
					xd.skip(4);
				} else {
					line += `${f}, `;
					xd.skip(4);
				}
			}
		}
		line += '\n'
		OUT.write(line);
	} catch (e) {
		let reason = (typeof e === 'string')?e : 'ERROR';
		OUT.write(`${file}, ${reason}\n`);
		console.error(e);
		continue;
	}
	
	// if (OUTS === null) {
	// 	OUTS = [];
	// 	for (let i = 0; i < pak.animations.length; i++) {
	// 		OUTS[i] = fs.createWriteStream(`./ANIMDUMP/MOT_${i}.csv`)
	// 	}
	// }
	
	// for (let i = 0; i < pak.animations.length; i++) {
	// 	const anim = pak.animations[i];
	// 	let line = ``;
	// 	line += `${anim..readUint32()}, `;
	// 	line += `${file}\n`;
	// 	OUTS[i].write(line);
	// }
	// let line = '';
	// line += `${reader.readUint32()}, ${reader.readUint32()}, ${reader.readUint32()}, ${reader.readUint32()}, `;
	// line += `${reader.readFloat32()}, ${reader.readFloat32()}, ${reader.readFloat32()}, `;
	// line += `${reader.readFloat32()}, ${reader.readFloat32()}, ${reader.readFloat32()}, `;
	// line += `${reader.readFloat32()}, ${reader.readFloat32()}, ${reader.readFloat32()}, `;
	// line += `${reader.readFloat32()}, ${reader.readUint32()}, ${reader.readUint16()}, ${reader.readUint16()}, `;
	// line += `flags, `;
	// for (let i = 0; i < 16; i++) {
	// 	line += `${reader.readUint16()}, `;
	// }
	// line += `${reader.readUint8()}, `;
	// line += `${file}\n`;
	// OUT.write(line);
}
OUT.end();