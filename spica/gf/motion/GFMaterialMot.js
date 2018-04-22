// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Motion/GFMaterialMot.cs

const { GFMotKeyFrame } = require('./GFMotKeyFrame');

class GFMotUVTransform {
	constructor(data, name, frameCount) {
		this.name = name || '';
		this.unitIndex = 0;
		/** @type {List<GtMotKeyFrame} */
		this.scaleX = [];
		this.scaleY = [];
		this.rotX = [];
		this.transX = [];
		this.transY = [];
		
		if (!data) return this;
		this.unitIndex = data.readUint32();
		
		let flags = data.readUint32();
		let len = data.readUint32();
		
		if (console.PARSE_DEBUG) console.PARSE_DEBUG['motType'] = 'Material';
		if (console.PARSE_DEBUG) console.PARSE_DEBUG['name'] = name;
		
		for (let i = 0; i < 5; i++) {
			if (console.PARSE_DEBUG) console.PARSE_DEBUG['channel'] = ['scaleU','scaleV','rot','transU','transV'][i];
			switch(i) {
				case 0: GFMotKeyFrame.setList(this.scaleX, data, flags, frameCount, len); break;
				case 1: GFMotKeyFrame.setList(this.scaleY, data, flags, frameCount, len); break;
				
				case 2: GFMotKeyFrame.setList(this.rotX, data, flags, frameCount, len); break;
				
				case 3: GFMotKeyFrame.setList(this.transX, data, flags, frameCount, len); break;
				case 4: GFMotKeyFrame.setList(this.transY, data, flags, frameCount, len); break;
			}
			flags >>= 3;
		}
	}
}

class GFMaterialMot {
	constructor(data, frameCount, len) {
		this.materials = []; /** @type {List<GFMotUVTransform>} */
		if (!data) return this;
		
		let matNameCount = data.readInt32();
		let matNameLen = data.readUint32();
		let units = new Array(matNameCount); /** @type {uint[]} */
		
		for (let i = 0; i < matNameCount; i++) {
			units[i] = data.readUint32();
		}
		
		let pos = data.offset;
		let matNames = data.readStringArray(matNameCount);
		data.offset = pos + matNameLen;
		
		for (let i = 0; i < matNames.length; i++) {
			for (let unit = 0; unit < units[i]; unit++) {
				this.materials.push(new GFMotUVTransform(data, matNames[i], frameCount));
			}
		}
	}
}

module.exports = { GFMaterialMot, GFMotUVTransform };