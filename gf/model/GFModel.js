// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Model/GFModel.cs

const { GFSection } = require('../GFSection');
const { GFBone } = require('./GFBone');
const { GF_LUT } = require('./GF_LUT');
const { GFMaterial } = require('./GFMaterial');
const { GFMesh } = require('./GFMesh');

function readHashTable(data) {
	let count = data.readUint32();
	let values = new Array(count);
	for (let i = 0; i < count; i++) {
		let hash = data.readUint32();
		let str = data.readPaddedString(0x40);
		str.hash = hash;
		values[i] = str;
	}
	return values;
}

class GFModel {
	constructor(data, name) {
		this.skeleton = [];
		this.luts = [];
		this.materials = [];
		this.meshes = [];
		
		this.name = name;
		let magicNum = data.readUint32(); //0x15122117 ?
		let shaderCount = data.readUint32();
		data.skipPadding();
		
		let modelSection = new GFSection(data);
		let shaderNames = readHashTable(data);
		let lutNames = readHashTable(data);
		let matNames = readHashTable(data);
		let meshNames = readHashTable(data);
		
		this.boundingBoxMin = data.readVector4();
		this.boundingBoxMax = data.readVector4();
		this.transform = data.readMatrix4();
		
		{ // Unknown data
			let len = data.readUint32();
			let off = data.readUint32();
			data.skip(8); //skip padding
			data.skip(off + len);
		}
		{ // Bones
			let num = data.readUint32();
			data.skip(0xC); //Skip padding
			for (let i = 0; i < num; i++) {
				this.skeleton.push(new GFBone(data));
			}
		}
		data.skipPadding();
		{ // LUTs
			let num = data.readUint32();
			let len = data.readUint32();
			data.skipPadding();
			for (let i = 0; i < num; i++) {
				this.luts.push(new GF_LUT(data, `Sampler_${this.name}_${i}`, len));
			}
		}
		// Materials
		for (let i = 0; i < matNames.length; i++) {
			this.materials.push(new GFMaterial(data));
		}
		// Meshes
		for (let i = 0; i < meshNames.length; i++) {
			this.meshes.push(new GFMesh(data));
		}
	}
}
Object.defineProperties(GFModel, {
	'MAGIC_NUMBER': { value:0x15122117, },
});

module.exports = { GFModel };