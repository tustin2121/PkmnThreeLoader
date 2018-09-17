// main.js
//
/* global $, window, document, hljs */
const SPICA = global.SPICA = require('../spica');
const THREE = global.THREE = require('three');
require('./OrbitControls');

if (!Object.hasOwnProperty(THREE.Vector3.prototype, 'toString')) {
	THREE.Vector3.prototype.toString = function(){
		return `Vector3(${this.x}, ${this.y}, ${this.z})`;
	};
}

let raf = window.requestAnimationFrame;

let renderer = new THREE.WebGLRenderer();
renderer.setClearColor(new THREE.Color(0x325d82), 1.0);
document.getElementById('view').appendChild(renderer.domElement);

if (window.gli) {
	window.addEventListener('load', ()=>{
		new gli.host.HostUI(gli.host.inspectContext(renderer.domElement, renderer.context));
		raf = window.requestAnimationFrame;
	});
}

let scene = new THREE.Scene();
scene.add(new THREE.GridHelper(200, 20));
scene.add(new THREE.AxesHelper(50));

let camera = new THREE.PerspectiveCamera(45, 1, 0.5, 100000);
camera.position.set(0, 200, 200);
scene.add(camera);

let root = new THREE.Object3D();
scene.add(root);

let debugNodes = {};
let animclock = new THREE.Clock();
let animMixer = null;
let currAnim = null;
let expressionAnims = [];

let trackball = new THREE.OrbitControls(camera, renderer.domElement);
global.loadedFiles = null;

hljs.configure({
	// tabReplace: '<span class="tab">\t</span>',
});

// global.ttestNode = new THREE.Object3D();
// scene.add(global.ttestNode);
//
// global.textureTests = {
// 	$el : $('<div name="textureTests">').appendTo('#view'),
// 	submit(tex) {
// 		let canvas = $(`<canvas name="${tex.name}" width="${tex.image.width}" height="${tex.image.height}">`);
// 		let ctx = canvas[0].getContext('2d');
// 		ctx.imageSmoothingEnabled = false;
// 		let data = tex.image.data;
// 		if (data.length % 4 !== 0) console.log('Data not divisible by 4!');
// 		for (let i = 0; i < data.length; i += 4) {
// 			let a = data[i + 3];
// 			let r = data[i + 0];
// 			let g = data[i + 1];
// 			let b = data[i + 2];
// 			ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
// 			let x = (i>>2)%tex.image.width;
// 			let y = tex.image.height - 1 - Math.floor((i>>2)/tex.image.width);
// 			ctx.fillRect(x, y, 1, 1);
// 		}
// 		this.$el.append(canvas);
// 		//////////////////////////////////////////////
// 		/*
// 		let geom = new THREE.PlaneGeometry(tex.image.width, tex.image.height, 8, 8);
// 		let mat = new THREE.MeshBasicMaterial();
// 		mat.map = tex;
// 		let mesh = new THREE.Mesh(geom, mat);
// 		mesh.position.z = global.ttestNode.children.length * 10;
// 		global.ttestNode.add(mesh); //*/
// 	},
// };

////////////////////////////////////////////////////////////////////////////////////////////////////
// Side Pane Info

global.info = {
	clear() {
		this.texpak = [{}];
		this.currTexpak = this.texpak[0];
		this.animpak = [[]];
		this.currAnimpak = this.animpak[0];
		this.luts = [];
		this.shaders = [];
		this.metadata = {};
		this.bones = [];
	},
	populateSidebar() {
		$('.xanims > div').hide();
		const self = this;
		expressionAnims = [];
		for (let [i, val] of this.texpak.entries()){
			$(`#texList${i}`).empty().hide();
			if (!val || !Object.keys(val).length) continue;
			let $p = $(`#texList${i}`).show();
			for (let [name, texInfo] of Object.entries(val)) {
				let $t = $(`<li>${texInfo.tex.name}</li>`).appendTo($p);
				$t.on('dblclick', ()=>{
					displayTexture(texInfo.canvas);
					texInfo.tex.decodeData().then(x=>{
						texInfo.repaint();
					});
				});
			}
		}
		let animHashes = new Map();
		for (let [i, pak] of this.animpak.entries()) {
			$(`#animList${i}`).empty().hide();
			if (!pak) continue;
			let { a, x } = pak;
			if (a && a.length) {
				let $p = $(`#animList${i}`).show();
				for (let [num, animInfo] of Object.entries(a)) {
					if (!animInfo.clip) {
						animInfo.clip = animInfo.anim.toThree();
						animInfo.hash = animInfo.anim.calcAnimHash();
					}
					
					let $t = $(`<li slot="${num}">${animInfo.anim.name || '[unnamed_'+i+':'+num+']'}</li>`).appendTo($p);
					if (animHashes.has(animInfo.hash)) {
						$t.append(`<span class="dup">dup of '${animHashes.get(animInfo.hash)}'</span>`);
					} else {
						animHashes.set(animInfo.hash, animInfo.anim.name);
					}
					$t.on('dblclick', ()=>{
						playAnimation(animInfo);
					});
				}
			}
			if (x && x.length) {
				for (let num = 0; num < x.length; num++) {
					let xanim = x[num];
					if (!xanim) {
						$(`#xanimExp${num}`).empty();
						continue;
					}
					if (xanim.toThree) {
						x[num] = xanim = xanim.toThree();
					}
					switch (num) {
						case 1: // Eye expressions
						case 2: 
						case 3: 
							_eyeExpressionBlock(num, xanim);
							break;
						case 4: // Mouth expressions
						case 5: 
						case 6: 
							_mouthExpressionBlock(num, xanim);
							break;
						case 7:
							_constantMotionBlock(num, xanim);
							break;
						case 11:
							_extraPoints(num, xanim);
							break;
					}
				}
				$('#xanimPresets').show();
				$('#xanimPresets [name=preExp]').on('click', function(e) {
					let vals = $(this).val().split('-');
					
					$(`.xanims input[name=eye1][value=${vals[0]*10}]`).click();
					$(`.xanims input[name=eye2][value=${vals[0]*10}]`).click();
					$(`.xanims input[name=eye3][value=${vals[0]*10}]`).click();
					$(`.xanims input[name=mouth4][value=${vals[1]*10}]`).click();
					$(`.xanims input[name=mouth5][value=${vals[1]*10}]`).click();
					$(`.xanims input[name=mouth6][value=${vals[1]*10}]`).click();
				});
			}
		}
		$('#boneList').empty();
		for (let bone of this.bones) {
			let $t = $(`<li>${bone.name}</li>`).appendTo('#boneList');
		}
		{
			let { meta1, meta2 } = this.metadata;
			if (meta1) {
				$('#metaList1 [name=meta1_01]').val(meta1.unk01);
				$('#metaList1 [name=meta1_02]').val(meta1.unk02);
				$('#metaList1 [name=meta1_03]').val(meta1.unk03);
				$('#metaList1 [name=meta1_04]').val(meta1.cameraLevel);
				$('#metaList1 [name=meta1_05]').val(meta1.boundingBoxMin);
				$('#metaList1 [name=meta1_06]').val(meta1.boundingBoxMax);
				$('#metaList1 [name=meta1_07]').val(meta1.unk07);
				$('#metaList1 [name=meta1_08]').val(meta1.unk08);
				$('#metaList1 [name=meta1_09]').val(meta1.unk09);
				$('#metaList1 [name=meta1_10]').val(meta1.unk10);
				$('#metaList1 [name=meta1_11]').val(meta1.unk11);
				for (let i = 0; i < meta1.unk12.length; i++) {
					$(`#metaList1 [name=meta1_field${i.toString(16)}]`).prop('checked', meta1.unk12[i] !== 0);
					$(`#metaList1 [name=meta1_field${i.toString(16)}]`).prop('indeterminate', meta1.unk12[i] !== 0 && meta1.unk12[i] !== 1);
				}
			}
			if (meta2) {
				for (let i = 0; i < meta2.length; i++) {
					
				}
			}
		}
		return;
		
		function _eyeExpressionBlock(num, anim) {
			if (expressionAnims[num]) return; //do only once
			expressionAnims[num] = animMixer.clipAction(anim);
			expressionAnims[num].reset().play();
			expressionAnims[num].paused = true;
			expressionAnims[num].enabled = false;
			let $div = $(`#xanimExp${num}`).empty().show();
			$div.append(`<label><input name="eye${num}" type="radio" value="0" checked/> Neutral</label>`);
			$div.append(`<label><input name="eye${num}" type="radio" value="10"/> Half-Blink</label>`);
			$div.append(`<label><input name="eye${num}" type="radio" value="20"/> Blink</label>`);
			$div.append(`<label><input name="eye${num}" type="radio" value="30"/> Pained</label>`);
			$div.append(`<label><input name="eye${num}" type="radio" value="40"/> Determined</label>`);
			$div.append(`<label><input name="eye${num}" type="radio" value="50"/> Pleased</label>`);
			$div.append(`<label><input name="eye${num}" type="radio" value="60"/> Sad</label>`);
			$div.append(`<label><input name="eye${num}" type="radio" value="70"/> Crossed</label>`);
			$div.find(`input[name=eye${num}]`).on('click', function(e) {
				expressionAnims[num].time = (parseInt($(this).val(),10)) / 30;
				expressionAnims[num].enabled = (expressionAnims[num].time > 0);
			});
		}
		function _mouthExpressionBlock(num, anim) {
			if (expressionAnims[num]) return; //do only once
			expressionAnims[num] = animMixer.clipAction(anim);
			expressionAnims[num].reset().play();
			expressionAnims[num].paused = true;
			expressionAnims[num].enabled = false;
			let $div = $(`#xanimExp${num}`).empty().show();
			$div.append(`<label><input name="mouth${num}" type="radio" value="0" checked/> Neutral</label>`);
			$div.append(`<label><input name="mouth${num}" type="radio" value="10"/> Half-Open</label>`);
			$div.append(`<label><input name="mouth${num}" type="radio" value="20"/> Open</label>`);
			$div.append(`<label><input name="mouth${num}" type="radio" value="30"/> Chew</label>`);
			$div.append(`<label><input name="mouth${num}" type="radio" value="40"/> Bite</label>`);
			$div.append(`<label><input name="mouth${num}" type="radio" value="50"/> Sad</label>`);
			$div.append(`<label><input name="mouth${num}" type="radio" value="60"/> [Unsupported]</label>`);
			$div.append(`<label><input name="mouth${num}" type="radio" value="70"/> [Unsupported]</label>`);
			$div.find(`input[name=mouth${num}]`).on('click', function(e) {
				expressionAnims[num].time = (parseInt($(this).val(),10)) / 30;
				expressionAnims[num].enabled = (expressionAnims[num].time > 0);
			});
		}
		function _constantMotionBlock(num, anim) {
			if (expressionAnims[num]) return; //do only once
			expressionAnims[num] = animMixer.clipAction(anim);
			$(`#xanimConst`).show();
			$(`#xanimConst [name=xanimRunConst]`).on('click', function(e){
				let b = $(this).is(':checked');
				if (b) {
					expressionAnims[num].enabled = true;
					expressionAnims[num].reset().play();
				} else {
					expressionAnims[num].enabled = false;
					expressionAnims[num].stop();
				}
			});
		}
		function _extraPoints(num, info) {
			if (expressionAnims[num]) return; //do only once
			expressionAnims[num] = [];
			let $div = $('#xanimInfo').empty().show();
			for (let i = 0; i < info.length; i++) {
				let row = info[i];
				let $t = $(`<li slot="${row.a}/${row.b}"><label><input type='checkbox'/> ${row.name}<span class="dup"></span></br>(${row.x},${row.y},${row.z})</label></li>`);
				switch (row.a) {
					case 0: $t.find('.dup').text(`Head Focus`); break;
					case 1: $t.find('.dup').text(`Top of Head`); break;
					case 2: $t.find('.dup').text(`Eye`); break;
					case 3: $t.find('.dup').text(`Mouth`); break;
					case 4: $t.find('.dup').text(`???`); break;
					case 5: $t.find('.dup').text(`Center of Mon`); break;
					case 6: $t.find('.dup').text(`Sp0 Beam Origin`); break;
					case 7: $t.find('.dup').text(`Hand Attach`); break;
					case 8: $t.find('.dup').text(`End of Tail`); break;
					case 9: $t.find('.dup').text(`Ground Contact`); break;
					case 10: $t.find('.dup').text(`Phys0 Contact`); break;
					case 11: $t.find('.dup').text(`Phys1 Contact`); break;
					case 12: $t.find('.dup').text(`Phys2 Contact(?)`); break;
					case 13: $t.find('.dup').text(`Phys3 Contact(?)`); break;
					case 14: $t.find('.dup').text(`Pokeball Hover`); break;
					case 15: $t.find('.dup').text(`Sp1 Origin`); break;
					case 16: $t.find('.dup').text(`Sp2 Origin`); break;
					case 17: $t.find('.dup').text(`Sp3 Origin`); break;
					case 18: $t.find('.dup').text(`???`); break;
					default: $t.find('.dup').text(`[Unknown]`); break;
				}
				let bone = (()=>{
					for (let b of self.bones) {
						if (b.name === row.name) return b;
					}
					return null;
				})();
				if (bone) {
					let point = new THREE.Mesh(new THREE.SphereBufferGeometry(), new THREE.MeshBasicMaterial());
					point.renderOrder = 10;
					point.position.set(row.x, row.y, row.z);
					point.visible = false;
					point.material.depthTest = false;
					bone.add(point);
					
					expressionAnims[num][i] = point;
					$t.find('input').on('click', function(e){
						expressionAnims[num][i].visible = $(this).is(':checked');
					});
				} else {
					$t.find('input').prop('disabled', true);
				}
				$t.appendTo($div);
			}
			
		}
	},
	
	texpak: null,
	currTexpak: null,
	markTexturePack(num) {
		this.currTexpak = this.texpak[num] = {};
	},
	markTexture(tex) {
		let canvas = $(`<canvas name="${tex.name}" width="${tex.width}" height="${tex.height}">`);
		this.currTexpak[`${tex.name}`] = { tex, canvas,
			_painted: false,
			repaint() {
				if (this._painted) return;
				let ctx = canvas[0].getContext('2d');
				ctx.imageSmoothingEnabled = false;
				let data = tex.buffer;
				if (data.length % 4 !== 0) console.log('Data not divisible by 4!');
				for (let i = 0; i < data.length; i += 4) {
					let a = data[i + 3];
					let r = data[i + 0];
					let g = data[i + 1];
					let b = data[i + 2];
					ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
					let x = (i>>2)%tex.width;
					let y = tex.height - 1 - Math.floor((i>>2)/tex.width);
					ctx.fillRect(x, y, 1, 1);
				}
				this._painted = true;
			}
		};
	},
	
	animpak: null,
	currAnimpak: null,
	markAnimationPack(num) {
		this.currAnimpak = this.animpak[num] = { a:[], x:[] };
	},
	markAnimation(i, anim) {
		// let clip = anim.toThree();
		// this.currAnimpak.a[i] = { anim, clip, hash:anim.calcAnimHash() };
		this.currAnimpak.a[i] = { anim };
	},
	markXanim(xanim) {
		if (!xanim || !xanim.length) return;
		this.currAnimpak.x = xanim;
		// this.currAnimpak.x = xanim.map(x=>{
		// 	if (x.toThree) return x.toThree();
		// 	return x;
		// });
	},
	
	bones: [],
	markSkeleton(bones) {
		if (!this.bones.length) {
			this.bones = bones;
		} else {
			
		}
	},
	
	luts: {},
	markLUT(lut) {
		
	},
	
	shaders: {},
	markShader(shader) {
		// code:
		// let lines = string.split( '\n' );
		
		
		
		function findError(errorInfo) {
			//gl.getShaderInfoLog( shader )
			//ERROR: 0:277: '<' : wrong operand types - no operation '<' exists that takes a left-hand operand of type 'highp float' and a right operand of type 'const int' (or there is no acceptable conversion)
		}
	},
	
	metadata: {},
	markMetadata(data) {
		this.metadata = data;
	},
};

////////////////////////////////////////////////////////////////////////////////////////////////////

window.addEventListener('resize', resize, false);
resize();
raf(redraw);

$('#props > nav > li').on('click', function(){
	$('#props .selected').removeClass('selected');
	$('#props .'+this.className).addClass('selected');
	resetView();
});
$('#props .file').on('dblclick', function(){
	let chooser = $('#fileChooser');
	chooser.unbind('change').val('').on('change', ()=>{
		let file = chooser.val();
		$(this).val(file);
		if ($(this).attr('name') === 'loadPkmnFile0') {
			if (!$('#props input[name=loadPkmnFileAuto]').is(':checked')) return;
			fillPkmnFilePaths(file);
		}
	});
	chooser.trigger('click');
});
$('#props button[name=loadPkmnFileBtn]').on('click', async function(){
	clearDisplay();
	let filenames = new Array(9);
	for (let i = 0; i <= 8; i++) {
		let file = $(`#props input[name=loadPkmnFile${i}]`).val();
		console.log(i, file);
		if (!file) continue;
		filenames[i] = file;
	}
	global.loadedFiles = await SPICA.openPokemonPack(filenames);
	let loadHack = $('#props select[name=hackName]').val();
	if (loadHack) {
		require('./loadingHacks')(loadHack, global.loadedFiles);
	}
	for (let i = 0; i <= 8; i++) {
		console.log(i, global.loadedFiles[i]);
	}
	displayPokemonModel();
});
$('#props button[name=loadOtherFileBtn]').on('click', async function(){
	clearDisplay();
	let filename = $(`#props input[name=loadOtherFile0]`).val();
	global.loadedFiles = await SPICA.open(filename);
	console.log(global.loadedFiles);
	if (global.loadedFiles.modelpack) {
		displayModelpack(global.loadedFiles.modelpack[0]);
	}
	if (global.loadedFiles.motion) {
		global.info.markAnimationPack(0);
		for (let anim of global.loadedFiles.motion) {
			global.info.markAnimation(anim.index, anim);
		}
	}
	global.info.populateSidebar();
});


$('#props input[name=poptShadow]').on('click', function(){
	//TODO: Implement in shader?
	// https://gamedev.stackexchange.com/questions/27252/draw-a-projection-of-a-mesh-on-a-surface
	// https://en.wikibooks.org/wiki/GLSL_Programming/Unity/Shadows_on_Planes
	displayPokemonModel();
});
$('#props input[name=poptMeta]').on('click', function(){
	// displayPokemonModel();
	if (debugNodes['metaHelper']) debugNodes['metaHelper'].visible = $(this).is(':checked');
});
$('#props input[name=poptModelBound]').on('click', function(){
	// displayPokemonModel();
	if (debugNodes['boundingHelper']) debugNodes['boundingHelper'].visible = $(this).is(':checked');
});
$('#props input[name=poptSkeleton]').on('click', function(){
	// displayPokemonModel();
	if (debugNodes['skeletonHelper']) debugNodes['skeletonHelper'].visible = $(this).is(':checked');
});
$('#props input[name=poptColor]').on('click', function(){
	displayPokemonModel();
});
$('#animStop').on('dblclick', function(){
	// if (animMixer) animMixer.stopAllAction();
	playAnimation();
});

function resize() {
	let view = $('#view');
	
	camera.aspect = view.innerWidth() / view.innerHeight();
	camera.updateProjectionMatrix();
	
	renderer.setSize(view.innerWidth(), view.innerHeight(), true);
}
function redraw() {
	const dt = animclock.getDelta();
	if (animMixer) animMixer.update(dt);
	trackball.update();
	renderer.render(scene, camera);
	raf(redraw);
	
	if (window.gli) {
		let glext = renderer.context.getExtension('GLI_frame_terminator');
		if (glext) glext.frameTerminator();
	} 
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Loading

function fillPkmnFilePaths(file0) {
	if (typeof file0 !== 'string' || !file0) return;
	const fs = require('fs');
	const PATH = require('path');
	
	const folders = [
		'1 (Model)', '2 (Tex)', '3 (Shiny Tex)', '4 (Amie Tex)', '5 (Fight Anim)',
		'6 (Amie Anim)', '7 (Basic Anim)', '8 (Misc Anim)', '9 (Extra)',
	];
	let comp = PATH.parse(file0);
	delete comp.base;
	
	let pathset = [];
	if (comp.name === '0') {
		for (let i = 1; i <= 8; i++) pathset.push( Object.assign({}, comp, { name:`${i}`}) );
	}
	else if (comp.name.endsWith('0')) {
		const name = comp.name.slice(0, -1);
		for (let i = 1; i <= 8; i++) pathset.push( Object.assign({}, comp, { name:`${name}${i}`}) );
	}
	else if (comp.name === '1') {
		for (let i = 2; i <= 9; i++) pathset.push( Object.assign({}, comp, { name:`${i}`}) );
	}
	else if (comp.name.endsWith('1')) {
		const name = comp.name.slice(0, -1);
		for (let i = 2; i <= 9; i++) pathset.push( Object.assign({}, comp, { name:`${name}${i}`}) );
	}
	else if (comp.dir.endsWith(folders[0])) {
		const dir = comp.dir.slice(0, -(folders[0].length));
		for (let i = 1; i <= 8; i++) pathset.push( Object.assign({}, comp, { dir:`${dir}${folders[i]}`}) );
	}
	
	if (pathset.length === 0) return;
	pathset.map(x=> PATH.format(x) ).forEach((val, i)=>{
		if (!fs.existsSync(val)) return; //skip
		$(`#props .file[name=loadPkmnFile${i+1}]`).val(val);
	});
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Display

/*not-async*/ function clearDisplay() {
	global.loadedFiles = null;
	root.remove(...root.children);
	global.info.clear();
	resetView();
	$('#pokemonDisplayOpts input').prop('disabled', true);
}
function resetView() {
	$('#view > canvas').show();
	$('#view > div').empty().hide();
}
function displayTexture(canvas) {
	$('#view > canvas').hide();
	$('#textureView').show().empty().append(canvas);
}
function displayShader(code, errorLog) {
	code = code.split('\n');
	let $d = $('<div>');
	for (let line of code) {
		// console.log('Line: '+line);
		let $line = $('<line>');
		line = hljs.highlight('GLSL', line).value;
		line = line.replace(/\t/g, '<span class="hljs-tab">&nbsp;</span>');
		if (line === '') line = '&nbsp';
		// console.log('Out: '+line);
		$line.html(line).appendTo($d);
	}
	
	if (errorLog) {
		let res = /^ERROR: (\d+):(\d+):/i.exec(errorLog);
		let row = res[2];
		let $err = $('<error>').text(errorLog).attr('locx', res[1]);
		$d.find(`line:nth-child(${row})`).after($err);
	}
	
	$('#view > canvas').hide();
	$('#shaderView').show().empty().append($d);
}
async function displayModel(model) {
	root.add(model.toThree());
}
async function displayModelpack(pak) {
	root.add(await pak.toThree());
}
async function displayPokemonModel() {
	debugNodes = {};
	let paks = global.loadedFiles;
	root.remove(...root.children);
	$('#pokemonDisplayOpts').show();
	$('#modelList').hide();
	$('#pokemonDisplayOpts input').prop('disabled', false);
	{
		let combined = new SPICA.gf.GFModelPack();
		combined.merge(paks[0].modelpack);
		let val = $(`#props input[name=poptColor]:checked`).val();
		switch (val) {
			case 'normal': combined.merge(paks[1].modelpack); break;
			case 'shiny': combined.merge(paks[2].modelpack); break;
			case 'shadow': combined.merge(paks[3].modelpack); break;
		}
		let mon = await combined.toThree();
		mon.name = "Pokemon";
		if (mon.children[1]) mon.children[1].visible = false;
		// mon.children[0].children.forEach(x=>x.visible = false);
		root.add(mon); //TODO modelpack instead of model
		
		animMixer = new THREE.AnimationMixer(mon.children[0]);
		// animMixer.timeScale = 30;
		{
			let node = new THREE.SkeletonHelper(mon.children[0].skeleton.bones[0]);
			node.visible = $('#props input[name=poptSkeleton]').is(':checked');
			root.add(node);
			debugNodes['skeletonHelper'] = node;
			global.info.markSkeleton(mon.children[0].skeleton.bones);
		}
	}{
		let node = new THREE.Group();
		{
			let point = new THREE.Mesh(new THREE.SphereBufferGeometry(), new THREE.MeshBasicMaterial());
			point.position.copy(paks[8].meta1.unk07);
			node.add(point);
		}{
			let box = new THREE.Box3(paks[8].meta1.boundingBoxMin, paks[8].meta1.boundingBoxMax);
			let help = new THREE.Box3Helper(box);
			node.add(help);
		}
		node.visible = $('#props input[name=poptMeta]').is(':checked');
		root.add(node);
		debugNodes['metaHelper'] = node;
	}{
		let box = new THREE.Box3(paks[0].modelpack.models[0].boundingBoxMin, paks[0].modelpack.models[0].boundingBoxMax);
		let help = new THREE.Box3Helper(box, 0x00FF00);
		help.visible = $('#props input[name=poptModelBound]').is(':checked');
		root.add(help);
		debugNodes['boundingHelper'] = help;
	}
	global.info.populateSidebar();
}

function playAnimation({ clip }={}) {
	if (currAnim) {
		currAnim.stop();
		currAnim.enable = false;
		currAnim = null;
	}
	if (!clip) return;
	currAnim = animMixer.clipAction(clip);
	currAnim.play();
}


clearDisplay();