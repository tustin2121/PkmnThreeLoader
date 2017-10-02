// https://github.com/gdkchan/SPICA/blob/master/SPICA.WinForms/Formats/GFPkmnModel.cs

const { Skeleton } = require('three');
const { GFModelPack, GFMotionPack, GFModel, GFTexture, GFMotion, GFShader } = require('./gf');
const GFPackage = require('./gfPackage');

// const MAGIC_MODEL 	= 0x15122117;
// const MAGIC_TEX 	= 0x15041213;
// const MAGIC_MOTION 	= 0x00060000;
const MAGIC_BCH 	= 0x00484342;

/**
 * @param {BufferedReader} data
 * @param {GFPackageHeader} header
 */
function parse(data, header, out={}) {
	data.offset = header.entries[0].address;
	let magicNum = data.readUint32();
	
	switch(magicNum) {
		case GFModelPack.MAGIC_NUMBER: {
			let modelpack = out.modelpack || new GFModelPack();
			
			// High Poly Pokemon model
			data.offset = header.entries[0].addr;
			modelpack.models.push(new GFModel(data, "PM_HighPoly"));
			
			// Low Poly Pokemon model
			data.offset = header.entries[1].addr;
			modelpack.models.push(new GFModel(data, "PM_LowPoly"));
			
			// Pokemon Shader package
			data.offset = header.entries[2].addr;
			let psHeader = GFPackage.parseHeader(data);
			
			for (let entry of psHeader.entries) {
				data.offset = entry.addr;
				modelpack.shaders.push(new GFShader(data));
			}
			
			// More shaders
			data.offset = header.entries[3].addr;
			let pcHeader = GFPackage.parseHeader(data);
			if (pcHeader) {
				for (let entry of pcHeader.entries) {
					data.offset = entry.addr;
					modelpack.shaders.push(new GFShader(data));
				}
			}
			out.modelpack = modelpack;
		} break;
		case GFTexture.MAGIC_NUMBER: {
			out.modelpack = out.modelpack || new GFModelPack();
			let textures = out.modelpack.textures;
			for (let entry of header.entries) {
				data.offset = entry.addr;
				textures.push(new GFTexture(data));
			}
		} break;
		case GFMotion.MAGIC_NUMBER: {
			let motionpack = new GFMotionPack();
			// out.animations = [];
			// out.skeleton = new Skeleton();
			
			for (let i = 0; i < header.entries.length; i++) {
				let entry = header.entries[i];
				data.offset = entry.addr;
				
				if (data.offset + 4 > data.length) break;
				if (data.readUint32(data.offset) !== GFMotion.MAGIC_NUMBER) continue;
				
				let mot = new GFMotion(data, i);
				motionpack.push(mot);
			}
			out.motionpacks = out.motionpacks || [];
			out.motionpacks.push(motionpack);
		} break;
		case MAGIC_BCH: {
			throw new TypeError('XY/ORAS BCH format not supported.');
			//TODO ?
		} break;
	}
	return out;
}

module.exports = { parse };