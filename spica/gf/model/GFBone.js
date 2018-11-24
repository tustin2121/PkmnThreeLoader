// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Model/GFBone.cs

class GFBone {
	constructor(data) {
		this.name = data.readByteLenString();
		this.parent = data.readByteLenString();
		this.flags = data.readUint8();
		
		this.scale = data.readVector3();
		this.rotation = data.readVector3();
		this.translation = data.readVector3();
	}
	
	/** If scaling animations on this bone should affect only this bone and not the hierarchy below it. */
	get useLocalScale() { return !!(this.flags & 0x1); }
	/** If this bone is a root bone (which will not be moved by animations). */
	get isRoot() { return !!(this.flags & 0x2); }
	/** If this bone is not a part of the skeleton, but rather a model node that can be pruned. */
	get isModelRoot() {
		if (!this.isRoot) return false;
		if (!/^pm\d{4}_\d{2}_/i.test(this.name)) return false;
		return true;
	}
	
	toThree() {
		const { Bone } = require('three');
		let bone = new Bone();
		bone.name = this.name;
		bone.position.copy(this.translation);
		bone.rotation.setFromVector3(this.rotation, "ZYX");
		bone.scale.copy(this.scale);
		if (this.useLocalScale) {
			// Apply special matrix composition for local scale bones
			bone.updateMatrix = updateMatrixCompensate;
		}
		
		bone.userData.flags = this.flags;
		bone.userData.useLocalScale = this.useLocalScale;
		return bone;
	}
}

// Scale compensation for bones
const { Vector3, Matrix4 } = require('three');
const IDENTITY = new Vector3(1,1,1);
const VEC = new Vector3(1,1,1);
const MAT = new Matrix4();
function updateMatrixCompensate() {
	let pScale = (this.parent)? this.parent.scale : IDENTITY;
	this.matrix.compose(VEC.multiplyVectors(pScale, this.position), this.quaternion, this.scale);
	MAT.makeScale( 1 / pScale.x, 1 / pScale.y, 1 / pScale.z, );
	this.matrix.premultiply(MAT);
	this.matrixWorldNeedsUpdate = true;
}

module.exports = { GFBone };