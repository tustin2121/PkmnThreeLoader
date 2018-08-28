// GFEffectMot
// Effects that are triggered during an animation, such as ground shake upon landing.

class GFMotEffect {
	constructor(data) {
		this.name = null;
		this.values = [];
		if (!data) return this;
		
		this.name = data.readByteLenString();
		let frameCount = data.readUint32();
		for (let i = 0; i < frameCount; i++) {
			this.values.push({
				frame: data.readUint32(),
				value: data.readFloat32(),
			});
		}
	}
	
	calcAnimHash() {
		let hash = this.name.split('').reduce((prev,curr)=> (((prev << 5) - prev) + curr.charCodeAt(0))|0, 0);
		hash = ((hash << 5) * (this.values.length))|0;
		// hash = this.values.reduce(GFMotKeyFrame.hashCode, hash); //TODO?
		return hash;
	}
}

class GFEffectMot {
	constructor(data, frameCount) {
		this.tracks = [];
		if (!data) return this;
		
		let trackCount = data.readUint32();
		for (let i = 0; i < trackCount; i++) {
			this.tracks.push(new GFMotEffect(data));
		}
	}
	
	calcAnimHash() {
		let hash = (this.tracks.length * 41) % 0xFFFFFFFF;
		for (let vis of this.tracks) {
			hash ^= vis.calcAnimHash();
		}
		return hash;
	}
}

module.exports = { GFMotEffect, GFEffectMot };