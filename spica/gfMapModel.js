// https://github.com/gdkchan/SPICA/blob/master/SPICA.WinForms/Formats/GFL2OverWorld.cs

const { GFModelPack, GFMotionPack, GFModel, GFTexture, GFMotion, GFShader } = require('./gf');

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
			case GFModel.MAGIC_NUMBER:
				Object.assign(out, { model: new GFModel(data, "Model") });
				break;
			case GFTexture.MAGIC_NUMBER:
				Object.assign(out, { tex: new GFTexture(data) });
				break;
			case GFModelPack.MAGIC_NUMBER:
				Object.assign(out, { modelpack: new GFModelPack(data) });
				break;
			case GFShader.MAGIC_NUMBER:
				Object.assign(out, { modelpack: new GFShader(data) });
				break;
			case GFMotion.MAGIC_NUMBER: //parse to GFMotion and skeleton
				Object.assign(out, { motion: new GFMotion(data, 0) });
				break;
		}
	}
}

module.exports = { parse };