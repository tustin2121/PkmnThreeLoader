// metadump.js
// Dumps out some data from the meta files in a folder.

const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const ByteBuffer = require("bytebuffer");
const BufferedReader = require('../spica/BufferedReader');
const GFPackage = require('../spica/gfPackage');
const { GFMotionPack } = require('../spica/gf/GFMotionPack');
const { GFMotion } = require('../spica/gf/motion/GFMotion');

const HOME = process.argv[2];
let OUTS = null;

mkdirp.sync('ANIMDUMP');

const files = fs.readdirSync(HOME);
for (const file of files) {
	let pak;
	try {
		let data = fs.readFileSync(path.join(HOME, file));
		data = ByteBuffer.wrap(data, 'binary', ByteBuffer.LITTLE_ENDIAN);
		data = new BufferedReader(data);
		pak = new GFMotionPack(data);
	} catch (e) {
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
// OUT.end();