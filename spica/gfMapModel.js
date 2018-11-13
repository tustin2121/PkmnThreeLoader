// https://github.com/gdkchan/SPICA/blob/master/SPICA.WinForms/Formats/GFL2OverWorld.cs

const { GFModelPack, GFMotionPack, GFModel, GFTexture, GFMotion, GFShader } = require('./gf');

const MOTION_NAMES = [
	null, //model data
	null, //1
	null,
	null,
	null,
	null, //5
	null,
	null,
	null,
	null,
	null, //10
	null,
	null,
	null,
	null,
	null, //15
	null,
	null,
	null,
	null,
	null, //20
	null,
	null,
	null,
	null,
	null, //25
	null,
	null,
	null,
	null, //29
];

/**
 * @param data BufferedReader
 * @param header GFPackageHeader
 */
function parse(data, header, out={}) {
	for (let i = 0; i < header.entries.length; i++) {
		let entry = header.entries[i];
		if (entry.length === 0) continue; //empty section, skip
		
		data.offset = entry.address;
		let magicNumber = data.readUint32(entry.address);
		switch (magicNumber) {
			case GFModelPack.MAGIC_NUMBER: {
				if (!out.modelpack) out.modelpack = [];
				let pak = new GFModelPack(data);
				out.modelpack.push(pak);
				if (global.info) {
					for (let tex of pak.textures) global.info.markTexture(tex);
				}
			} break;
			case GFMotion.MAGIC_NUMBER: { //parse to GFMotion and skeleton
				if (!out.motionpack) {
					out.motionpack = new GFMotionPack();
					if (global.info) global.info.markAnimationPack(0);
				}
				let mot = new GFMotion(data, i);
				mot.name = MOTION_NAMES[i];
				if (global.info) global.info.markAnimation(i, mot);
				out.motionpack.push(mot);
			} break;
			
			
			default: {
				if (!out.other) out.other = [];
				let d = data.readBytes(entry.length);
				d._addr = entry.address
				out.other.push(d);
			} break;
			case GFModel.MAGIC_NUMBER:
				if (!out.model) out.model = [];
				out.model.push(new GFModel(data, "Model"));
				break;
			case GFTexture.MAGIC_NUMBER:
				if (!out.tex) out.tex = [];
				out.tex.push(new GFTexture(data));
				break;
			case GFShader.MAGIC_NUMBER:
				if (!out.shader) out.shader = [];
				out.shader.push(new GFShader(data));
				break;
			
		}
	}
}

module.exports = { parse };