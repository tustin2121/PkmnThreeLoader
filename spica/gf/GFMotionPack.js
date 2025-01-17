// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/GFMotionPack.cs

const { GFMotion } = require('./motion');
const { GFModelPack } = require('./GFModelPack');

class GFMotionPack {
	constructor(data, names) {
		this.animations = []; /** @type {List<GFMotion>} */
		this.extradata = []; //new Array(14);
		
		if (!data) return;
		
		let animsCount = data.readUint32();
		let pos = data.offset;
		for (let i = 0; i < animsCount; i++) {
			data.offset = pos + (i * 4);
			let addr = data.readUint32();
			if (addr === 0) continue;
			data.offset = pos + addr;
			let mot = new GFMotion(data, i);
			if (names) mot.name = names[i];
			if (global.info) global.info.markAnimation(i, mot);
			this.animations.push(mot);
		}
	}
	
	get(index) { return this.animations[index]; }
	set(index, val) { this.animations[index] = val; }
	[Symbol.iterator]() { return this.animations[Symbol.iterator](); }
	
	push(...items) { this.animations.push(...items); }
	
}

module.exports = { GFMotionPack };