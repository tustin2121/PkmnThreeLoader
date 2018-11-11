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
		const { VectorKeyframeTrack, NumberKeyframeTrack, InterpolateDiscrete } = require('three');
		
		const unitTrans = ['map', 'alphaMap', 'normalMap'];
		let tracks = [];
		for (let mat of this.materials) {
			let coord = unitTrans[mat.unitIndex];
			let tn = `${mat.name}_OptMesh.material[${coord}]`;
			if (mat.scaleX.length) tracks.push(makeNumTrack(`${tn}.repeat[x]`, mat.scaleX));
			if (mat.scaleY.length) tracks.push(makeNumTrack(`${tn}.repeat[y]`, mat.scaleY));
			if (mat.rotX.length) tracks.push(makeNumTrack(`${tn}.rotation`, mat.rotX));
			if (mat.transX.length) tracks.push(makeStepTrack(`${tn}.offset[x]`, mat.transX, { trans:-1, multi:2 }));
			if (mat.transY.length) tracks.push(makeStepTrack(`${tn}.offset[y]`, mat.transY, { trans:0 }));
		}
		return tracks;
		
		//*
		function makeStepTrack(path, vt, { trans=0, multi=1 }) {
			let times=[], values=[];
			for (let frame of vt) {
				times.push(frame.frame/30);
				values.push(((1-frame.value)*multi)+trans);
				//TODO frame.slope; ???
			}
			let track = new NumberKeyframeTrack(path, times, values);
			track.setInterpolation(InterpolateDiscrete);
			return track;
		}
		/*/
		function makeStepTrack(path, vt, adjust=0) {
			if (vt.length < 4) return makeNumTrack(path, vt, adjust);
			
			let newVt = [vt[0]];
			let isStep = true, hasStep = false;
			for (let i = 4; i < vt.length; i++) {
				let shouldTest = true;
				shouldTest &= (vt[i-0].frame === vt[i-1].frame+1) && (vt[i-0].value === vt[i-1].value);
				shouldTest &= (vt[i-1].frame === vt[i-2].frame+1) && (vt[i-1].value != vt[i-2].value);
				shouldTest &= (vt[i-2].frame === vt[i-3].frame+1) && (vt[i-2].value === vt[i-3].value);
				
				console.log('makeStepTrack 1', vt[i-0], vt[i-1], vt[i-2], vt[i-3], shouldTest);
				
				if (shouldTest) {
					hasStep = true;
					isStep &= (Math.abs(vt[i-0].slope) < 0.001);
					isStep &= (Math.abs(vt[i-1].slope) > 0.01);
					isStep &= (Math.abs(vt[i-2].slope) > 0.01);
					isStep &= (Math.abs(vt[i-3].slope) < 0.001);
				} else {
					newVt.push(vt[i-2]);
				}
			}
			console.log('makeStepTrack 2', isStep, hasStep);
			if (!isStep || !hasStep) return makeNumTrack(path, vt, adjust);
			let track = makeNumTrack(path, newVt, adjust);
			track.setInterpolation(InterpolateDiscrete);
			console.log('makeStepTrack 3', track);
			return track;
		}
		//*/
		function makeNumTrack(path, vt, adjust=0) {
			let times=[], values=[];
			for (let frame of vt) {
				times.push(frame.frame/30);
				values.push(frame.value+adjust);
				//TODO frame.slope; ???
			}
			let track = new NumberKeyframeTrack(path, times, values);
			return track;
		}
	}
}

module.exports = { GFMaterialMot, GFMotUVTransform };