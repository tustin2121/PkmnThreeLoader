// https://github.com/gdkchan/SPICA/blob/master/SPICA.WinForms/Formats/GFPkmnModel.cs

const { GFModelPack } = require('./gf/GFModelPack');
const { GFModel } = require('./gf/model/GFModel');
const { GFShader } = require('./gf/shader/GFShader');
const { GFPackage } = require('./gfPackage');

const MAGIC_MODEL 	= 0x15122117;
const MAGIC_TEX 	= 0x15041213;
const MAGIC_MOTION 	= 0x00060000;
const MAGIC_BCH 	= 0x00484342;

/**
 * @param data BufferedReader
 * @param header GFPackageHeader
 */
function parse(data, header) {
	let out;
	
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
			out = modelpack.toThreeObj();
		} break;
		case MAGIC_TEX: {
			//TODO
		} break;
		case MAGIC_MOTION: {
			//TODO
		} break;
		case MAGIC_BCH: {
			//TODO ?
		} break;
	}
	return out;
}