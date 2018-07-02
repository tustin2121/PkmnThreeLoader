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
	
	toThree() {
		const { Bone } = require('three');
		let bone = new Bone();
		bone.userData.flags = this.flags;
		bone.name = this.name;
		bone.position.copy(this.translation);
		bone.rotation.setFromVector3(this.rotation, "ZYX");
		bone.scale.copy(this.scale);
		return bone;
	}
}
module.exports = { GFBone };