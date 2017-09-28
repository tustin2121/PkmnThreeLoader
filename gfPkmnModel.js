// https://github.com/gdkchan/SPICA/blob/master/SPICA.WinForms/Formats/GFPkmnModel.cs

const { Skeleton } = require('three');
const { GFModelPack } = require('./gf');
const { GFModel } = require('./gf/model');
const { GFShader } = require('./gf/shader');
const { GFTexture } = require('./gf/texture');
const { GFPackage } = require('./gfPackage');

const MAGIC_MODEL 	= 0x15122117;
const MAGIC_TEX 	= 0x15041213;
const MAGIC_MOTION 	= 0x00060000;
const MAGIC_BCH 	= 0x00484342;

/**
 * @param {BufferedReader} data
 * @param {GFPackageHeader} header
 */
function parse(data, header) {
	let out = {};
	
	data.offset = header.entries[0].address;
	let magicNum = data.readUint32();
	
	switch(magicNum) {
		case GFModelPack.MAGIC_NUMBER: {
			let modelpack = new GFModelPack();
			
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
			out.model = modelpack;
		} break;
		case GFTexture.MAGIC_NUMBER: {
			out.textures = [];
			for (let entry of psHeader.entries) {
				data.offset = entry.addr;
				out.textures.push(new GFTexture(data));
			}
		} break;
		case MAGIC_MOTION: {
			out.skeletonAnimations = [];
			out.materialAnimations = [];
			out.visibilityAnimations = [];
			out.skeleton = new Skeleton();
			
			
		} break;
		case MAGIC_BCH: {
			//TODO ?
		} break;
	}
	return out;
}