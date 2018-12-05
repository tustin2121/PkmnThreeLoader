// https://github.com/gdkchan/SPICA/blob/master/SPICA.WinForms/Formats/GFCharaModel.cs

const { GFModelPack } = require('./gf/GFModelPack');
const { GFMotionPack } = require('./gf/GFMotionPack');

const TRAINER_ANIMS = [
	'intro_still', //0
	'pokeball_throw',
	'idle_command',
	'end_still',
	'idle0',
	'idle0_fidget0', //5
	'intro_anim0',
	'intro_anim1',
	'end_anim0',
	null,
	'intro_throw', //10
	'intro_unused0',
	'intro_unused1',
	'end_anim1',
];

const OVERWORLD_ANIMS = [
	'idle0', //0
	'walk',
	'run',
	null,
	null,
	null, //5
	null,
	'talk_in',
	'talk_loop',
	'talk_out',
	null, //10
	null,
	null,
	null,
	null,
	null, //15
	null,
	'wave',
	null,
	null,
	'hand_chin', //20
	null,
	null,
	'hands_hips',
	null,
	null, //25
	null,
	null,
	null,
	null,
	'turn_right', //30
	'turn_left',
	null,
	null,
	null,
	null, //35
	null,
	null,
	null,
	null,
	null, //40
	null,
	null,
	null,
	null,
	null, //45
	null,
	null,
	null,
	null,
	null, //50
	null,
	'sit_idle0',
	null,
	'sit_talk_in',
	'sit_talk_loop', //55
	'sit_talk_out',
	null,
	null,
	null,
	null, //60
	null,
	null,
	null,
	null,
	null, //65
	null,
	null,
	null,
	null,
	null, //70
	null, 
	'alolan_wave', 
	null, 
	null, 
	null, //75
	null, 
	null, 
	null, 
	'tr_search0',
	'tr_search1', //80
	'tr_dancerspin', 
	'tr_stretch_leftright',
	'tr_stretch_down',
	'tr_quickspin', 
	'tr_punching', //85
	'tr_karate', 
	null, //pokecenter_idle
	'tr_sprinting', //pokecenter_bow
	'tr_situps', //pokecenter_give
	null, //90 //pokecenter_take
	null, 
	null, 
	null, 
	'tr_balltoss', 
	null, //95
	null,
	'tr_ready', 
	null, 
	null, 
	null, //100
	null, 
	null, 
	null, 
	null, 
	null, //105
	null, 
	null, 
	null, 
	null, 
	null, //110
	null, 
	null, 
	null, 
	null, 
	null, //115
	null, 
	null, 
	null, 
	null, 
	'tr_lookaround_skull', //120
	null, 
	null, 
	'lookaround', 
	'speaking', 
	'excited_talk', //125
	'excited_jumping', 
	'splayed', 
	'sleep0', 
	'sleep1', 
	null, //130
	null, 
	null, 
	null, 
	'crouch_idle0', 
	null, //135
];

/**
 * @param data BufferedReader
 * @param header GFPackageHeader
 */
function parse(data, header, out={}) {
	// Load Model
	data.offset = header.entries[0].address;
	let modelpack = new GFModelPack(data);
	
	// Load Animation
	let anims = [];
	if (global.info) {
		switch (global.info.type) {
			case 'trainer': anims = TRAINER_ANIMS; break;
			case 'overworld': anims = OVERWORLD_ANIMS; break;
		}
	}
	data.offset = header.entries[1].address;
	let motionpack = new GFMotionPack(data, anims);
	
	if (global.info) {
		global.info.markTexturePack(0);
		modelpack.textures.forEach(x=>global.info.markTexture(x));
	}
	
	out = Object.assign(out, { 
		modelpack, 
		motionpack: [motionpack],
	});
	return out;
}


module.exports = { parse };