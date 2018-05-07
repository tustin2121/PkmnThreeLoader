// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/GFModelPack.cs

const { GFModel } = require('./model/GFModel');
const { GFTexture } = require('./texture/GFTexture');
const { GFShader } = require('./shader/GFShader');

class GFModelPack {
	constructor(data) {
		this.models = [];
		this.textures = [];
		this.unk2 = [];
		this.unk3 = [];
		this.shaders = [];
		
		if (!data) return this;
		
		let pos = data.offset;
		let magic = data.readUint32();
		if (magic != GFModelPack.MAGIC_NUMBER) throw new Error('Invalid header for GFModelPack');
		
		let counts = [];
		for (let i = 0; i < 5; i++) counts[i] = data.readUint32();
		this.sectionCounts = counts;
		let pointersAddr = data.offset;
		for (let sect = 0; sect < counts.length; sect++) {
			for (let entry = 0; entry < counts[sect]; entry++) {
				data.offset = pos + data.readUint32(pointersAddr + (entry * 4));
				let name = data.readByteLenString();
				let addr = data.readUint32();
				
				data.offset = pos + addr;
				switch(sect) {
					case 0: this.models.push(new GFModel(data, name)); break;
					case 1: this.textures.push(new GFTexture(data)); break;
					case 2: this.unk2.push(data.offset.toString(16)); break; //Unknown section
					case 3: this.unk3.push(data.offset.toString(16)); break; //Unknown section
					case 4: this.shaders.push(new GFShader(data)); break;
				}
			}
			pointersAddr += counts[sect] * 4;
		}
	}
}
Object.defineProperties(GFModelPack, {
	'MAGIC_NUMBER': { value:0x00010000, },
});

module.exports = { GFModelPack };