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
	
	calcAnimHash() {
		let hash = this.name.split('').reduce((prev,curr)=> (((prev << 5) - prev) + curr.charCodeAt(0))|0, 0);
		hash = ((hash << 5) * (this.values.length))|0;
		// hash = this.values.reduce(GFMotKeyFrame.hashCode, hash); //TODO?
		return hash;
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
	
	calcAnimHash() {
		let hash = (this.visibilities.length * 41) % 0xFFFFFFFF;
		for (let vis of this.visibilities) {
			hash ^= vis.calcAnimHash();
		}
		return hash;
	}
	
	toThreeTracks(frameCount) {
		const { BooleanKeyframeTrack } = require('three');
		
		let tracks = [];
		for (let vis of this.visibilities) {
			tracks.push(makeBoolTrack(`${vis.name}.visible`, vis.values));
		}
		return tracks;
		
		function makeBoolTrack(path, vt) {
			let times=[], values=[];
			let val = undefined;
			for (let i = 0; i < vt.length; i++) {
				if (val === vt[i]) continue;
				times.push(i/30);
				values.push(vt[i]);
				val = vt[i];
			}
			let track = new BooleanKeyframeTrack(path, times, values);
			return track;
		}
	}
	
	toPATracks(frameCount) {
		const { PABooleanTrack } = require('../../rendering/animation/PATrack');
		
		let tracks = [];
		for (let vis of this.visibilities) {
			tracks.push(makeBoolTrack(`.vis[${vis.name}]`, vis.values));
		}
		return tracks;
		
		function makeBoolTrack(name, vt) {
			let times=[], values=[];
			let val = undefined;
			for (let i = 0; i < vt.length; i++) {
				if (val === vt[i]) continue;
				times.push(i/30);
				values.push(vt[i]);
				val = vt[i];
			}
			let track = new PABooleanTrack({ name, times, values });
			return track;
		}
	}
}

module.exports = { GFVisibilityMot, GFMotBoolean };