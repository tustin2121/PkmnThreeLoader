// https://github.com/gdkchan/SPICA/blob/master/SPICA.WinForms/Formats/GFPkmnModel.cs

const { GFModelPack, GFMotionPack, GFModel, GFTexture, GFMotion, GFShader } = require('./gf');
const GFPackage = require('./gfPackage');

const MAGIC_BCH 	= 0x00484342;

const PARSE_PAK = [];
// Parse Pak 0: Model
PARSE_PAK[0] = function(data, header, out={}) {
	if (header.entries.length !== 5) throw new ReferenceError('Invalid number of entries for Pack 0!');
	let modelpack = out.modelpack || new GFModelPack();
	
	// High Poly Pokemon model
	data.offset = header.entries[0].address;
	modelpack.models.push(new GFModel(data, "PM_HighPoly"));
	
	// Low Poly Pokemon model
	data.offset = header.entries[1].address;
	modelpack.models.push(new GFModel(data, "PM_LowPoly"));
	
	// Pokemon Shader package
	data.offset = header.entries[2].address;
	let psHeader = GFPackage.parseHeader(data);
	
	for (let entry of psHeader.entries) {
		data.offset = entry.address;
		modelpack.shaders.push(new GFShader(data));
	}
	
	// More shaders
	data.offset = header.entries[3].address;
	let pcHeader = GFPackage.parseHeader(data);
	if (pcHeader) {
		for (let entry of pcHeader.entries) {
			data.offset = entry.address;
			modelpack.shaders.push(new GFShader(data));
		}
	}
	out.modelpack = modelpack;
	return out;
};
// Parse Pak 1: Normal Textures
PARSE_PAK[1] = function(data, header, out={}) {
	out.modelpack = out.modelpack || new GFModelPack();
	let textures = out.modelpack.textures;
	for (let entry of header.entries) {
		data.offset = entry.address;
		textures.push(new GFTexture(data));
	}
	return out;
};
// Parse Pak 2: Shiny Textures
PARSE_PAK[2] = PARSE_PAK[1];
// Parse Pak 3: Pokemon Amie Textures
PARSE_PAK[3] = PARSE_PAK[1];
// Parse Pak 4: Battle Animations
PARSE_PAK[4] = function(data, header, out={}) {
	if (header.entries.length !== 32) throw new ReferenceError('Invalid number of entries for Pack 4!');
	let motionpack = parseMotionPack(data, header, [
		'idle0', //0
		'idle0_fidget0',
		null,
		'appear_fall', //3
		'appear_fall_loop',
		'appear_land',
		'appear_hover', //6
		'mega_roar', //7
		'physatk0', //8
		'physatk1',
		'physatk2',
		'physatk3',
		'splatk0', //12
		'splatk1',
		'splatk2',
		'splatk3',
		'hit0', //16
		'faint', //17
		null,
		'exp_reye', //19
		'exp_leye',
		null,
		'exp_mouth', //22
		null,
		null,
		'const_overlay', //25
		null,
		null,
		null, // 28
	]);
	out.motionpacks = out.motionpacks || [];
	out.motionpacks.push(motionpack);
	return out;
};
// Parse Pak 5: PokemonAmie Animations
PARSE_PAK[5] = function(data, header, out={}) {
	if (header.entries.length !== 40) throw new ReferenceError('Invalid number of entries for Pack 5!');
	let motionpack = parseMotionPack(data, header, [
		'idle1', //0
		null,
		null,
		null,
		'sleep_in', //4
		'sleep_loop', //5
		'sleep_out', //6
		'sleep_intro_loop',
		'sleep_intro_return',
		'resp_unhappy', //9
		'idle1_confused',
		'idle1_cry',
		'resp_happy', //12
		'resp_happy2',
		'idle1_fidget2',
		'idle1_fidget3',
		'idle1_fidget0', //16
		null,
		null,
		null,
		null,
		'resp_angry', //21
		'eat_in', //22
		'eat_loop',
		'eat_out',
		'high_five', //25
		null,
		'exp_reye', //27
		'exp_leye',
		null,
		'exp_mouth', //30
		null,
		null,
		'const_overlay', //25
		null,
		null,
		null, // 28
	]);
	out.motionpacks = out.motionpacks || [];
	out.motionpacks.push(motionpack);
	return out;
};
// Parse Pak 6: General Animations
PARSE_PAK[6] = function(data, header, out={}) {
	if (header.entries.length !== 27) throw new ReferenceError('Invalid number of entries for Pack 6!');
	let motionpack = parseMotionPack(data, header, [
		'idle2', //0
		null,
		'walkloop', //2
		'runloop', //3
		null,
		null,
		null,
		null,
		null,
		null,
		null, //10
		null,
		null,
		null,
		'exp_reye', //14
		'exp_leye',
		null,
		'exp_mouth', //17
		null,
		null,
		'const_overlay', //25
		null,
		null,
		null, // 28
	]);
	out.motionpacks = out.motionpacks || [];
	out.motionpacks.push(motionpack);
	return out;
};
// Parse Pak 7: Misc Animations
PARSE_PAK[7] = function(data, header, out={}) {
	if (header.entries.length !== 71) throw new ReferenceError('Invalid number of entries for Pack 7!');
	let motionpack = parseMotionPack(data, header, [
		null, //0
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null, //10
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null, //20
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null, //30
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null, //40
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null, //50
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null, //60
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		null, //70
	]);
	out.motionpacks = out.motionpacks || [];
	out.motionpacks.push(motionpack);
	return out;
};
// Parse Pak 8: Extra Items
PARSE_PAK[8] = function(data, header, out={}) {
	if (header.entries.length !== 2) throw new ReferenceError('Invalid number of entries for Pack 8!');
	return out;
};



function parseMotionPack(data, header, names) {
	let motionpack = new GFMotionPack();
	let animCount = header.entries.length - 14;
	// Animations are of variable length at the front
	for (let i = 0; i < animCount; i++) {
		let entry = header.entries[i];
		if (entry.length === 0) continue;
		data.offset = entry.address;
		
		// if (data.offset + 4 > data.length) break;
		// if (data.readUint32(data.offset) !== GFMotion.MAGIC_NUMBER) continue;
		if (data.readUint32(data.offset) !== GFMotion.MAGIC_NUMBER) throw new TypeError('Illegal section parse!');
		
		let mot = new GFMotion(data, i);
		if (names) mot.name = names[i];
		motionpack.push(mot);
	}
	// Extra sections include more meta data
	for (let i = 0; i < 14; i++) {
		let entry = header.entries[animCount+i];
		if (entry.length === 0) continue;
		data.offset = entry.address;
		
		switch (i) {
			case 0: {
				// This is a "Model Pack", but does not have enough data to constitute a whole model pack.
				// Plus the pack always has a bunch of sections 2 and 3, which are unknown.
				// It has a bone name that is 0x40 long (null padded), followed by 1 int and 5 floats.
				motionpack.extradata[i] = data.readBytes(entry.length);
			} break;
			case 1: // Right/Both Eye Expression Map
			case 2: // Left Eye Expression Map
			case 3: // ?
			case 4: // Mouth Expression Map
			{
				let mot = new GFMotion(data, i);
				motionpack.extradata[i] = mot;
			} break;
			case 5: motionpack.extradata[i] = true; break; //Unknown, no examples yet
			case 6: motionpack.extradata[i] = true; break; //Unknown, no examples yet
			case 7: {
				// Constant motion animation - run constantly under all other animations, and some animations can override.
				// Used for Koffing's smoke, Mega Steelix's crystals
				let mot = new GFMotion(data, i);
				motionpack.extradata[i] = mot;
			} break;
			case  8: motionpack.extradata[i] = true; break; //Unknown, no examples yet
			case  9: motionpack.extradata[i] = true; break; //Unknown, no examples yet
			case 10: motionpack.extradata[i] = true; break; //Unknown, no examples yet
			case 11: {
				// Possibly IK Data
				// This section has no header information, and the header can claim it to be
				// longer than the rest of the file allows.
				// This data is formatted into 0x30 length sections.
				// A Null-terminated 0x20 length string with a bone name.
				// Followed by 3 floats (which is often integer values).
				// Followed by 2 bytes and 2 bytes of null padding.
				let info = [];
				while (data.offset < entry.address + entry.length && data.offset + 0x30 < data.length) {
					let name = data.readPaddedString(0x20);
					if (!name) break; //No more data
					let e = {
						name,
						x: data.readFloat32(),
						y: data.readFloat32(),
						z: data.readFloat32(),
						a: data.readUint8(),
						b: data.readUint8(),
					};
					data.skipPadding();
					info.push(e);
				}
				motionpack.extradata[i] = info;
			} break;
			case 12: motionpack.extradata[i] = true; break; //Unknown, no examples yet
			case 13: motionpack.extradata[i] = true; break; //Unknown, no examples yet
		}
	}
	return motionpack;
}

/**
 * @param {BufferedReader} data
 * @param {GFPackageHeader} header
 */
function parse(data, header, out={}) {
	data.offset = header.entries[0].address;
	let magicNum = data.readUint32();
	
	switch(magicNum) {
		case GFModel.MAGIC_NUMBER: return PARSE_PAK[0](data,header,out);
		case GFTexture.MAGIC_NUMBER: return PARSE_PAK[1](data,header,out);
		case GFMotion.MAGIC_NUMBER: {
			let motionpack = parseMotionPack(data, header);
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

/**
 *
 */
function toThree({ modelpack, motionpacks }) {
	if (!modelpack) throw new ReferenceError('No modelpack provided!');
	if (!modelpack.models || modelpack.models.length !== 2) throw new ReferenceError('No models provided!');
	if (!modelpack.shaders || !modelpack.shaders.length) throw new ReferenceError('No shaders provided!');
	if (!modelpack.textures || !modelpack.textures.length) throw new ReferenceError('No textures provided!');
	
	const {
		Object3D, BufferGeometry, SkinnedMesh, Skeleton,
	} = require('three');
	
	let pkmn = new Object3D();
	
	for (let gfModel of modelpack.models){
		// Transpile Shaders
		let vShaders = {}, fShaders = {};
		for (let gfShader of gfModel.shaders) {
			
		}
		
		// Pull out materials
		let mats = {};
		for (let gfMat of gfModel.materials) {
			let mat = gfMat.toThree();
			mats[mat.name] = mat;
			let opts = {
				name: gfMat.matName,
				transparent: gfMat.alphaTest.enabled,
			};
			
		}
		
		for (let gfMesh of gfModel.submeshes) {
			
		}
		
		
		let geom = new BufferGeometry();
		
		
		
		mainMesh = new SkinnedMesh();
	}
	
	
	
	
}

module.exports = { parse, parsePack:PARSE_PAK, toThree };