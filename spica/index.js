
const fs = require('fs');
const path = require('path');
const ByteBuffer = require("bytebuffer");
const BufferedReader = require('./BufferedReader');
const GFPackage = require('./gfPackage');

const { GFModelPack, GFModel, GFTexture, GFMotion, GFShader } = require('./gf');

function parse(data, out={}) {
	let reader = new BufferedReader(data);
	let magicNumber = reader.readUint32(0);
	let header = GFPackage.parseHeader(reader);
	if (header) {
		switch (header.magic) {
			case 'CM': return require('./gfCharacterModel').parse(reader, header, out);
			case 'BG': return require('./gfMapModel').parse(reader, header, out);
			case 'PC': return require('./gfPkmnModel').parse(reader, header, out);
			default: throw new Error(`Unknown header '${header.magic}' !`);
		}
	} else {
		reader.offset -= 2; //undo magic number offset
		switch (magicNumber) {
			case GFModel.MAGIC_NUMBER:
				return Object.assign(out, { model: [new GFModel(reader, "Model")] });
			case GFTexture.MAGIC_NUMBER:
				return Object.assign(out, { tex: [new GFTexture(reader)] });
			case GFModelPack.MAGIC_NUMBER:
				return Object.assign(out, { modelpack: [new GFModelPack(reader)] });
			case GFShader.MAGIC_NUMBER:
				return Object.assign(out, { shader: [new GFShader(reader)] });
			case GFMotion.MAGIC_NUMBER:
				//parse to GFMotion and skeleton
				return Object.assign(out, { motion: [new GFMotion(reader, 0)] });
		}
		throw new Error('Invalid file type!');
	}
}
function parseAll(files) {
	if (Array.isArray(files)) {
		return Promise.all( files.map((x)=>Promise.resolve(x).then(parse)) );
	} else {
		return Promise.resolve(files).then(parse);
	}
}

function load(file) {
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
				if (!path.isAbsolute(file)) file = path.join(__dirname, "../../", file);
				fs.readFile(file, (err, data)=>{
					if (err) return reject(err);
					resolve(ByteBuffer.wrap(data, 'binary', ByteBuffer.LITTLE_ENDIAN));
				});
			}
		} else if (file instanceof Buffer || ArrayBuffer.isView(file)) {
			resolve(ByteBuffer.wrap(file, 'binary', ByteBuffer.LITTLE_ENDIAN));
		} else {
			reject(new TypeError('file is not a supported type'));
		}
	});
}
function loadAll(files) {
	if (Array.isArray(files)) {
		return Promise.all(files.map((x)=>{ return load(x).then(parse); }));
	} else {
		return load(files).then(parse);
	}
}

function open(root, files) {
	if (files === undefined && root !== undefined) {
		files = root;
		root = '';
	}
	if (!Array.isArray(files)) files = [files];
	files = files.map(x=>path.join(root, x));
	return Promise
		.all( files.map((x)=>load(x)) )
		.then((fs)=>{
			let out = {};
			fs.forEach( x=>parse(x, out) );
			return out;
		});
}

function openPokemonPack(files) {
	if (!Array.isArray(files) || files.length !== 9) throw new TypeError('Must supply an array of 9 file names!');
	files = files.map((x,i)=>{
		if (!x) return Promise.resolve({});
		return load(x).then(data=>{
			let reader = new BufferedReader(data);
			let header = GFPackage.parseHeader(reader);
			let out = {};
			try {
				require('./gfPkmnModel').parsePack[i](reader, header, out);
			} catch (e) {
				console.error(`Error parsing pack ${i}!`, e);
				console.error(`Last reader location: ${reader.offset.toString(16)}`);
				return out;
			}
			return out;
		});
	});
	return Promise.all(files);
}

module.exports = { load, loadAll, parse, parseAll, open, openPokemonPack, gf:require('./gf') };

/*
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
				case GFModel.MAGIC_NUMBER:
					return new GFModel(data, "Model");
				case GFTexture.MAGIC_NUMBER:
					return new GFTexture(data);
				case GFModelPack.MAGIC_NUMBER:
				 	return new GFModelPack(data);
				case GFMotion.MAGIC_NUMBER:
					//parse to GFMotion and skeleton
					return new GFMotion(data, 0);
			}
			throw new Error('Invalid file type!');
		}
	});
}

module.exports = { open }; */