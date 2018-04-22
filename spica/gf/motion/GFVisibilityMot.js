//https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Motion/GFVisibilityMot.cs

class GFMotBoolean {
	constructor(data, name, frameCount) {
		this.name = name || '';
		/** @type {list<bool>} */
		this.values = [];
		
		if (!data) return this;
		let val = 0;
		for (let i = 0; i < frameCount; i++) {
			let bit = i & 7;
			if (bit === 0) val = data.readUint8();
			this.values.push((val & (1 << bit)) != 0);
		}
	}
}

class GFVisibilityMot {
	constructor(data, frameCount) {
		this.visibilities = [];
		if (!data) return this;
		
		let meshNameCount = data.readInt32();
		let meshNameLen = data.readUint32();
		let pos = data.offset;
		let meshNames = data.readStringArray(meshNameCount);
		data.offset = pos + meshNameLen;
		
		for (let name of meshNames) {
			this.visibilities.push(new GFMotBoolean(data, name, frameCount+1));
		}
	}
}

module.exports = { GFVisibilityMot, GFMotBoolean };