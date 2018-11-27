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
	if (global.info) global.info.markTexturePack(1);
	out.modelpack = out.modelpack || new GFModelPack();
	let textures = out.modelpack.textures;
	for (let entry of header.entries) {
		data.offset = entry.address;
		let tex = new GFTexture(data);
		if (global.info) global.info.markTexture(tex);
		textures.push(tex);
	}
	return out;
};
// Parse Pak 2: Shiny Textures
PARSE_PAK[2] = function(data, header, out={}) {
	if (global.info) global.info.markTexturePack(2);
	out.modelpack = out.modelpack || new GFModelPack();
	let textures = out.modelpack.textures;
	for (let entry of header.entries) {
		data.offset = entry.address;
		let tex = new GFTexture(data);
		if (global.info) global.info.markTexture(tex);
		textures.push(tex);
	}
	return out;
};
// Parse Pak 3: Pokemon Amie Petting Texture Maps
PARSE_PAK[3] = function(data, header, out={}) {
	if (global.info) global.info.markTexturePack(3);
	out.modelpack = out.modelpack || new GFModelPack();
	let textures = out.modelpack.textures;
	for (let entry of header.entries) {
		if (data.readUint32(entry.address) === GFTexture.MAGIC_NUMBER) {
			data.offset = entry.address;
			let tex = new GFTexture(data);
			tex.isPetMap = true;
			if (global.info) global.info.markTexture(tex);
			textures.push(tex);
		}
		else {
			// Unknown information
			data.offset = entry.address;
			let info = [];
			while (data.offset <= entry.address + entry.length) {
				let name = data.readPaddedString(0x20);
				if (!name) break;
				let val = data.readUint8();
				info.push({ name, val });
			}
			out.modelpack.extra.push(info);
		}
	}
	return out;
};
// Parse Pak 4: Battle Animations
PARSE_PAK[4] = function(data, header, out={}) {
	if (header.entries.length !== 32) throw new ReferenceError('Invalid number of entries for Pack 4!');
	if (global.info) global.info.markAnimationPack(4);
	let motionpack = parseMotionPack(data, header, [
		'idle0', //0
		'idle0_fidget0',
		'idle0_fidget1', //?
		'appear_fall', //3
		'appear_fall_loop',
		'appear_land',
		'appear_hover', //6
		'mega_roar', //7
		'atk_phys0', //8
		'atk_phys1',
		'atk_phys2',
		'atk_phys3',
		'atk_sp0', //12
		'atk_sp1',
		'atk_sp2',
		'atk_sp3',
		'hit0', //16
		'faint', //17
	]);
	out.motionpacks = out.motionpacks || [];
	out.motionpacks.push(motionpack);
	return out;
};
// Parse Pak 5: PokemonAmie Animations
PARSE_PAK[5] = function(data, header, out={}) {
	if (header.entries.length !== 40) throw new ReferenceError('Invalid number of entries for Pack 5!');
	if (global.info) global.info.markAnimationPack(5);
	let motionpack = parseMotionPack(data, header, [
		'idle1', //0
		'intro_lookbehind1',
		'intro_lookbehind2',
		null,
		'sleep_in', //4
		'sleep_loop', //5
		'sleep_out', //6
		'intro_sleep_loop',
		'intro_sleep_return',
		'resp_unhappy', //9
		'idle1_confused',
		'idle1_cry',
		'resp_happy', //12
		'resp_happy_big',
		'idle1_lookaround',
		'idle1_fidget1',
		'idle1_fidget0', //16
		null,
		'intro_sad',
		'resp_happy_mild',
		'resp_hop',
		'resp_angry', //21
		'eat_in', //22
		'eat_loop',
		'eat_out',
		'high_five', //25
	]);
	out.motionpacks = out.motionpacks || [];
	out.motionpacks.push(motionpack);
	return out;
};
// Parse Pak 6: General Animations
PARSE_PAK[6] = function(data, header, out={}) {
	if (header.entries.length !== 27) throw new ReferenceError('Invalid number of entries for Pack 6!');
	if (global.info) global.info.markAnimationPack(6);
	let motionpack = parseMotionPack(data, header, [
		'idle2', //0
		null,
		'walkloop', //2
		'runloop', //3
		null,
		null,
		null,
		null,
		'run_in', //Brionne (1040) has these two animations
		'run_out',
		null, //10
		null,
		null,
	]);
	out.motionpacks = out.motionpacks || [];
	out.motionpacks.push(motionpack);
	return out;
};
// Parse Pak 7: Misc Animations
PARSE_PAK[7] = function(data, header, out={}) {
	if (header.entries.length !== 71) throw new ReferenceError('Invalid number of entries for Pack 7!');
	if (global.info) global.info.markAnimationPack(7);
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
	
	// Metadata 1
	data.offset = header.entries[0].address;
	if (header.entries[0].length !== 0x60) throw new TypeError('Invalid size for meta block 1!');
	{
		let meta = {};
		meta.unk01 = data.readUint32();
		meta.unk02 = data.readUint32();
		meta.unk03 = data.readUint32();
		meta.cameraLevel = data.readUint32(); //0 = small pokemon, 1 = medium, 2 = large+
		meta.boundingBoxMin = data.readVector3();
		meta.boundingBoxMax = data.readVector3();
		meta.unk07 = data.readVector3();
		meta.unk08 = data.readFloat32(); //always zero?
		meta.unk09 = data.readUint32(); //always zero?
		meta.unk10 = data.readUint16(); //32
		meta.unk11 = data.readUint16(); //32
		meta.unk12 = []; // An array of 1's and 0's in u16 form
		for (let i = 0; i < 16; i++) {
			meta.unk12.push(data.readUint16());
		}
		out.meta1 = meta;
	}
	
	// Metadata 2: Sprite Data, most likely (Koffing, Dewpider)
	data.offset = header.entries[1].address;
	{
		let meta = [];
		let num = data.readUint8();
		for (let i = 0; i < num; i++) {
			let info = {};
			info.name = data.readNullTerminatedString();
			info.unk01 = data.readUint8();
			data.realignToWord();
			info.unk02 = data.readVector3();
			info.unk03 = data.readUint32();
			meta.push(info);
		}
		out.meta2 = meta;
	}
	if (global.info) global.info.markMetadata(out);
	return out;
};

function parseMotionPack(data, header, names) {
	let boneEntry = header.entries[header.entries.length - 14];
	
	// Check for extra data
	if (data.readUint32(boneEntry.address) === GFModelPack.MAGIC_NUMBER) {
		return parseExtraMotionPack(data, header, names);
	}
	
	let motionpack = new GFMotionPack();
	let animCount = header.entries.length;
	for (let i = 0; i < animCount; i++) {
		let entry = header.entries[i];
		if (entry.length === 0) continue;
		data.offset = entry.address;
		
		// if (data.offset + 4 > data.length) break;
		if (data.readUint32(data.offset) !== GFMotion.MAGIC_NUMBER) {
			motionpack.extradata[i] = { __addr:header.address, __len:header.length, magicNum:data.readUint32(data.offset) };
			continue;
		}
		// if (data.readUint32(data.offset) !== GFMotion.MAGIC_NUMBER) throw new TypeError('Illegal section parse!');
		
		let mot = new GFMotion(data, i);
		if (names) mot.name = names[i];
		if (global.info) global.info.markAnimation(i, mot);
		motionpack.push(mot);
	}
	return motionpack;
}

function parseExtraMotionPack(data, header, names) {
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
		if (global.info) global.info.markAnimation(i, mot);
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
				motionpack.extradata[i]._addr = entry.address;
			} break;
			case 1: // Eyes Expression Map (Right Eye / Head 1)
			case 2: // Eyes Expression Map (Left Eye / Head 2)
			case 3: // Eyes Expression Map (Head 3)
			case 4: // Mouth Expression Map (Head 1)
			case 5: // Mouth Expression Map (Head 2)
			case 6: // Mouth Expression Map (Head 3)
			{
				let mot = new GFMotion(data, i);
				motionpack.extradata[i] = mot;
			} break;
			case  7:
			case  8:
			case  9:
			case  10:
			{
				// Constant motion animation - run constantly under all other animations, and some animations can override.
				// Used for Koffing's smoke, Mega Steelix's crystals
				let mot = new GFMotion(data, i);
				motionpack.extradata[i] = mot;
				motionpack.extradata[i]._addr = entry.address;
			} break;
			case 11: {
				// Focus/Attachment Point Data!
				// This section has no header information, and the header can claim it to be
				// longer than the rest of the file allows.
				// This data is formatted into 0x30 length sections.
				// A Null-terminated 0x20 length string with a bone name.
				// Followed by 3 floats (An offset from the above bone)
				// Followed by 2 bytes (A and B) and 2 bytes of null padding.
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
	if (global.info) global.info.markXanim(motionpack.extradata);
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
	
	let pkmn = modelpack.toThree();
	
	//TODO motionpack
	
	return pkmn;
}

module.exports = { parse, parsePack:PARSE_PAK, toThree };