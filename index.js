
const fs = require('fs');
const path = require('path');
const ByteBuffer = require("bytebuffer");
const BufferedReader = require('./BufferedReader');
const GFPackage = require('./gfPackage');

function open(file) {
	return new Promise(function(resolve, reject) {
		if (typeof file === 'string') {
			if (file.startsWith('http')) {
				// interptet as url
				let http = require('http');
				if (file.startsWith('https')) http = require('https');
				http.get(file, (res)=>{
					let err;
					if (res.statusCode !== 200) {
						err = new Error(`Request failed. ${res.statusCode}`);
					}
					if (err) {
						res.resume();
						return reject(err);
					}
					
					let data = [];
					res.on('data', (chunk)=>data.push(chunk));
					res.on('end', ()=>{
						let buf = ByteBuffer.concat(data, 'binary', ByteBuffer.LITTLE_ENDIAN);
						return resolve(buf);
					});
				});
			}
			else {
				// interpret as path
				fs.readFile(path.join(__dirname, "../../", file), (err, data)=>{
					if (err) return reject(err);
					resolve(ByteBuffer.wrap(data, 'binary', ByteBuffer.LITTLE_ENDIAN));
				});
			}
		} else if (file instanceof Buffer || ArrayBuffer.isView(file)) {
			resolve(ByteBuffer.wrap(file, 'binary', ByteBuffer.LITTLE_ENDIAN));
		} else {
			reject(new TypeError('file is not a supported type'));
		}
	})
	.then((data)=>{
		let reader = new BufferedReader(data);
		let magicNumber = reader.readUint32(0);
		let header = GFPackage.parseHeader(reader);
		if (header) {
			switch (header.magic) {
				case 'CM': return require('./gfCharacterModel').parse(reader, header);
				case 'PC': return require('./gfPkmnModel').parse(reader, header);
				default: throw new Error(`Unknown header '${header.magic}' !`);
			}
		} else {
			switch (magicNumber) {
				case 0x00010000: break; //parse to GFModelPack
				case 0x00060000:
					//parse to GFMotion and skeleton
					break;
			}
			throw new Error('Invalid file type!');
		}
	});
}

module.exports = { open };