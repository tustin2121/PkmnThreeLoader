// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/GFMotionPack.cs

const { GFMotion } = require('./motion');

class GFMotionPack {
	constructor(data) {
		this.animations = []; /** @type {List<GFMotion>} */
		
		if (!data) return;
		
		let animsCount = data.readUint32();
		let pos = data.offset;
		for (let i = 0; i < animsCount; i++) {
			data.offset = pos + (i * 4);
			let addr = data.readUint32();
			if (addr === 0) continue;
			data.offset = pos + addr;
			this.animations.push(new GFMotion(data, i));
		}
	}
	
	get(index) { return this.animations[index]; }
	set(index, val) { this.animations[index] = val; }
	[Symbol.iterator]() { return this.animations[Symbol.iterator](); }
	
	push(...items) { this.animations.push(...items); }
}

module.exports = { GFMotionPack };