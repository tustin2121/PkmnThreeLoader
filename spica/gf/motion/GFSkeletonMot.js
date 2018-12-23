// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Motion/GFSkeletonMot.cs

const { GFMotKeyFrame } = require('./GFMotKeyFrame');

class GFMotBoneTransform {
	constructor(data, name, frameCount) {
		this.name = name || '';
		this._flags = 0;
		this.isAxisAngle = false;
		/** @type {List<GtMotKeyFrame} */
		this.scaleX = [];
		this.scaleY = [];
		this.scaleZ = [];
		this.rotX = [];
		this.rotY = [];
		this.rotZ = [];
		this.transX = [];
		this.transY = [];
		this.transZ = [];
		
		if (!data) return this;
		let flags = data.readUint32();
		let len = data.readUint32();
		let end = data.offset + len;
		
		if (console.PARSE_DEBUG) console.PARSE_DEBUG['motType'] = 'Skeletal';
		if (console.PARSE_DEBUG) console.PARSE_DEBUG['name'] = name;
		
		// this._flags = ('00000000000000000000000000000000'+(flags).toString(2)).slice(-32);
		this._flags = ('00000'+(flags >> 27).toString(2)).slice(-5);
		this.isAxisAngle = (flags >> 31) === 0;
		for (let i = 0; i < 9; i++) {
			if (console.PARSE_DEBUG) console.PARSE_DEBUG['channel'] = ['scaleX','scaleY','scaleZ','rotX','rotY','rotZ','transX','transY','transZ'][i];
			switch(i) {
				case 0: GFMotKeyFrame.setList(this.scaleX, data, flags, frameCount, end-data.offset); break;
				case 1: GFMotKeyFrame.setList(this.scaleY, data, flags, frameCount, end-data.offset); break;
				case 2: GFMotKeyFrame.setList(this.scaleZ, data, flags, frameCount, end-data.offset); break;
				
				case 3: GFMotKeyFrame.setList(this.rotX, data, flags, frameCount, end-data.offset); break;
				case 4: GFMotKeyFrame.setList(this.rotY, data, flags, frameCount, end-data.offset); break;
				case 5: GFMotKeyFrame.setList(this.rotZ, data, flags, frameCount, end-data.offset); break;
				
				case 6: GFMotKeyFrame.setList(this.transX, data, flags, frameCount, end-data.offset); break;
				case 7: GFMotKeyFrame.setList(this.transY, data, flags, frameCount, end-data.offset); break;
				case 8: GFMotKeyFrame.setList(this.transZ, data, flags, frameCount, end-data.offset); break;
			}
			flags >>= 3;
		}
		if (console.PARSE_DEBUG && data.offset < end) {
			console.log(`[${console.PARSE_DEBUG.motType} ${console.PARSE_DEBUG.animNum}] Remaining data for '${console.PARSE_DEBUG.name}': `, data.readBytes(len));
		}
	}
	
	calcAnimHash() {
		let hash = this.name.split('').reduce((prev,curr)=> (((prev << 5) - prev) + curr.charCodeAt(0))|0, 0);
		if (this.isAxisAngle) hash = (hash << 5)|0;
		hash = this.scaleX.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.scaleY.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.scaleZ.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.rotX.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.rotY.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.rotZ.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.transX.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.transY.reduce(GFMotKeyFrame.hashCode, hash);
		hash = this.transZ.reduce(GFMotKeyFrame.hashCode, hash);
		return hash;
	}
	
	calcFrameHash(frame) {
		let hash = 0;
		const props = [ 
			this.scaleX, this.scaleY, this.scaleZ, 
			this.rotX, this.rotY, this.rotZ, 
			this.transX, this.transY, this.transZ, 
		];
		for (let prop of props) {
			if (!prop || !prop.length) continue; //skip prop
			let closestFrame = null;
			for (let f of prop) {
				if (f.frame === frame) { closestFrame = f; break; }
				if (closestFrame === null) { closestFrame = f; continue; }
				if (Math.abs(f.frame - frame) < Math.abs(closestFrame.frame - frame)) { closestFrame = f; continue; }
			}
			if (closestFrame === null) continue; //skip prop
			hash = GFMotKeyFrame.hashCode(hash, closestFrame);
		}
		return hash;
	}
	
	/**
	 * @type {List<>} keyframes
	 * @type {float} frame
	 */
	static getFrameValue(keyframes, frame) {
		//https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Motion/GFMotBoneTransform.cs#L74
		if (keyframes.length === 1) return keyframes[0].value;
		if (keyframes.length < 2) return 0;
		
		let LHS = keyframes.filter(x=> x.frame <= frame).pop();
		let RHS = keyframes.filter(x=> x.frame >= frame).shift();
		
		if (LHS.frame === RHS.frame) return LHS.value;
		let framediff = frame - LHS.frame;
		let weight = framediff / (RHS.frame - LHS.frame);
		
		// Hermite interpolation
		let res = LHS.value + (LHS.value - RHS.value) * (2 * weight - 3) * weight * weight;
		res += (framediff * (weight - 1)) * (LHS.slope * (weight - 1) + RHS.slope * weight);
		return res;
	}
	
	
}

class GFSkeletonMot {
	constructor(data, frameCount) {
		this.bones = []; /** @type {List<GFMotBoneTransform>} */
		if (!data) return this;
		
		let boneNameCount = data.readInt32();
		let boneNameLen = data.readUint32();
		let pos = data.offset;
		let boneNames = data.readStringArray(boneNameCount);
		data.offset = pos + boneNameLen;
		for (let name of boneNames) {
			this.bones.push(new GFMotBoneTransform(data, name, frameCount));
		}
	}
	
	calcAnimHash() {
		let hash = (this.bones.length * 17) % 0xFFFFFFFF;
		for (let bone of this.bones) {
			hash ^= bone.calcAnimHash();
		}
		return hash;
	}
	
	calcFrameHash(frame) {
		let hash = (this.bones.length * 17) % 0xFFFFFFFF;
		for (let bone of this.bones) {
			hash ^= bone.calcFrameHash(frame);
		}
		return hash;
	}
	
	toThreeTracks(frameCount) {
		const { VectorKeyframeTrack, NumberKeyframeTrack, QuaternionKeyframeTrack, Quaternion, Vector3, Euler } = require('three');
		
		let tracks = [];
		for (let bone of this.bones) {
			tracks.push(...makeTrack(`.bones[${bone.name}].scale`, bone.scaleX, bone.scaleY, bone.scaleZ));
			tracks.push(...makeRotationTrack(`.bones[${bone.name}].quaternion`, bone));
			tracks.push(...makeTrack(`.bones[${bone.name}].position`, bone.transX, bone.transY, bone.transZ));
		}
		return tracks;
		
		function makeRotationTrack(path, bone) {
			const q = new Quaternion();
			const v = new Vector3();
			const e = new Euler();
			
			if (!bone.rotX.length && !bone.rotY.length && !bone.rotZ.length) return [];
			let vals = [], times = [];
			
			for (let i = 0; i < frameCount; i++) {
				v.x = GFMotBoneTransform.getFrameValue(bone.rotX, i);
				v.y = GFMotBoneTransform.getFrameValue(bone.rotY, i);
				v.z = GFMotBoneTransform.getFrameValue(bone.rotZ, i);
				
				// Note from gdkchan:
				// When the game uses Axis Angle for rotation, I believe that the original Euler rotation can be ignored,
                // because otherwise we would need to either convert Euler to Axis Angle or Axis to Euler,
				// and both conversions are pretty expensive. The vector is already halved as a optimization (needs * 2).
				if (bone.isAxisAngle) {
					let angle = v.length() * 2;
					if (angle > 0) {
						q.setFromAxisAngle(v.normalize(), angle);
					} else {
						q.set(0, 0, 0, 1); //set to identity
					}
				} else {
					e.setFromVector3(v, 'ZYX');
					q.setFromEuler(e);
				}
				times.push(i/30);
				vals.push(q.x, q.y, q.z, q.w);
			}
			return [new QuaternionKeyframeTrack(path, times, vals)];
		}
		
		function makeTrack(path, vx, vy, vz) {
			let tracks = [];
			if (vx.length) tracks.push(makeNumTrack(`${path}[x]`, vx));
			if (vy.length) tracks.push(makeNumTrack(`${path}[y]`, vy));
			if (vz.length) tracks.push(makeNumTrack(`${path}[z]`, vz));
			return tracks;
		}
		
		function makeNumTrack(path, vt) {
			let times=[], values=[];
			for (let frame of vt) {
				times.push(frame.frame/30);
				values.push(frame.value);
				//TODO frame.slope; ???
			}
			let track = new NumberKeyframeTrack(path, times, values);
			return track;
		}
	}
	
	toPATracks(frameCount) {
		const { Quaternion, Vector3, Euler } = require('three');
		const { PAQuaternionTrack, PANumberTrack } = require('../../rendering/animation/PATrack');
		
		let tracks = [];
		for (let bone of this.bones) {
			tracks.push(...makeTrack(`.bones[${bone.name}].scale`, bone.scaleX, bone.scaleY, bone.scaleZ));
			tracks.push(...makeRotationTrack(`.bones[${bone.name}].quaternion`, bone));
			tracks.push(...makeTrack(`.bones[${bone.name}].position`, bone.transX, bone.transY, bone.transZ));
		}
		return tracks;
		
		function makeRotationTrack(names, bone) {
			const q = new Quaternion();
			const v = new Vector3();
			const e = new Euler();
			
			if (!bone.rotX.length && !bone.rotY.length && !bone.rotZ.length) return [];
			let vals = [], times = [];
			
			for (let i = 0; i < frameCount; i++) {
				v.x = GFMotBoneTransform.getFrameValue(bone.rotX, i);
				v.y = GFMotBoneTransform.getFrameValue(bone.rotY, i);
				v.z = GFMotBoneTransform.getFrameValue(bone.rotZ, i);
				
				// Note from gdkchan:
				// When the game uses Axis Angle for rotation, I believe that the original Euler rotation can be ignored,
                // because otherwise we would need to either convert Euler to Axis Angle or Axis to Euler,
				// and both conversions are pretty expensive. The vector is already halved as a optimization (needs * 2).
				if (bone.isAxisAngle) {
					let angle = v.length() * 2;
					if (angle > 0) {
						q.setFromAxisAngle(v.normalize(), angle);
					} else {
						q.set(0, 0, 0, 1); //set to identity
					}
				} else {
					e.setFromVector3(v, 'ZYX');
					q.setFromEuler(e);
				}
				times.push(i/30);
				vals.push(q.x, q.y, q.z, q.w);
			}
			return [new PAQuaternionTrack({ names, times, values:vals })];
		}
		
		function makeTrack(path, vx, vy, vz) {
			let tracks = [];
			if (vx.length) tracks.push(makeNumTrack(`${path}[x]`, vx));
			if (vy.length) tracks.push(makeNumTrack(`${path}[y]`, vy));
			if (vz.length) tracks.push(makeNumTrack(`${path}[z]`, vz));
			return tracks;
		}
		
		function makeNumTrack(name, vt, adjust=0) {
			let times=[], values=[], slopes=[];
			for (let frame of vt) {
				times.push(frame.frame/30);
				values.push(frame.value+adjust);
				slopes.push(frame.slope);
			}
			let track = new PANumberTrack({ name, times, values, slopes });
			return track;
		}
	}
}

module.exports = { GFSkeletonMot, GFMotBoneTransform };