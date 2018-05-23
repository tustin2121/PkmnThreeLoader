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
	
	calcAnimHash() {
		let hash = this.name.split('').reduce((prev,curr)=> (((prev << 5) - prev) + curr.charCodeAt(0))|0, 0);
		hash = ((hash << 5) * (this.unitIndex+1))|0;
		hash = this.scaleX.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.scaleY.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.rotX.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.transX.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.transY.reduce(GFMotKeyFrame.hashCode, hash);
		return hash;
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
	
	calcAnimHash() {
		let hash = (this.materials.length * 23) % 0xFFFFFFFF;
		for (let mat of this.materials) {
			hash ^= mat.calcAnimHash();
		}
		return hash;
	}
	
	toThreeTracks(frameCount) {
		const { VectorKeyframeTrack, NumberKeyframeTrack } = require('three');
		
		let tracks = [];
		for (let mat of this.materials) {
			tracks.push(...makeTrack   (`${this.name}.repeat`, mat.scaleX, mat.scaleY));
			tracks.push(...makeNumTrack(`${this.name}.rotation`, mat.rotX));
			tracks.push(...makeTrack   (`${this.name}.offset`, mat.transX, mat.transY));
		}
		return tracks;
		
		function makeTrack(path, vx, vy, vz) {
			let num = 0;
			if (vx.length) num++;
			if (vy.length) num++;
        
			if (num === 0) return [];
			// if (num !== 2) {
				let tracks = [];
				if (vx.length) tracks.push(makeNumTrack(`${path}.x`, vx));
				if (vy.length) tracks.push(makeNumTrack(`${path}.y`, vy));
				return tracks;
			// }
			//TODO VectorKeyframeTrack?
		}
		
		function makeNumTrack(path, vt) {
			let times=[], values=[];
			for (let frame of vt) {
				times.push(frame.frame);
				values.push(frame.value);
				//TODO frame.slope; ???
			}
			let track = new NumberKeyframeTrack(path, times, values);
		}
	}
}

module.exports = { GFMaterialMot, GFMotUVTransform };