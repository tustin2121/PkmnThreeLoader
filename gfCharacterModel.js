// https://github.com/gdkchan/SPICA/blob/master/SPICA.WinForms/Formats/GFCharaModel.cs

const { GFModelPack } = require('./gf/GFModelPack');

/**
 * @param data BufferedReader
 * @param header GFPackageHeader
 */
function parse(data, header) {
	let out;
	
	// Load Model
	data.offset = header.entries[0].address;
	let modelpack = new GFModelPack(data);
	out = modelpack.toThreeObj();
	
	// Load Animation
	data.offset = header.entries[1].address;
	let motionpack = new GFMotionPack(data);
	
	for (let motion of motionpack) {
		let sklAnim = motion.toThreeSkeletalAnim(modelpack.models[0].skeleton);
		let matAnim = motion.toThreeMaterialAnim();
		let visAnim = motion.toThreeVisibilityAnim();
		
		if (sklAnim) {
			sklAnim.name = `SkelMotion_${motion.index}`;
			out.skeletonAnimations.add(sklAnim);
		}
		if (matAnim) {
			matAnim.name = `MatMotion_${motion.index}`;
			out.materialAnimations.add(matAnim);
		}
		if (visAnim) {
			visAnim.name = `VisMotion_${motion.index}`;
			out.visibilityAnimations.add(visAnim);
		}
	}
	return out;
}


module.exports = { parse };