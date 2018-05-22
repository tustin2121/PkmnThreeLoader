// main.js
//
/* global $, window, document, hljs */
const SPICA = global.SPICA = require('../spica');
const THREE = global.THREE = require('three');
require('./OrbitControls');

const raf = window.requestAnimationFrame;

let renderer = new THREE.WebGLRenderer();
renderer.setClearColor(new THREE.Color(0x325d82), 1.0);
document.getElementById('view').appendChild(renderer.domElement);

let scene = new THREE.Scene();
scene.add(new THREE.GridHelper(200, 20));
scene.add(new THREE.AxesHelper(50));

let camera = new THREE.PerspectiveCamera(45, 1, 0.5, 100000);
camera.position.set(200, 200, 0);
scene.add(camera);

let root = new THREE.Object3D();
scene.add(root);

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
		this.texpak = [];
		this.currTexpak = null;
		this.luts = [];
		this.shaders = [];
	},
	populateSidebar() {
		$('#texturePackList').empty();
		for (let [i, val] of this.texpak.entries()){
			if (!val) continue;
			let $p = $(`<ul name="Texture Pack ${i}">`);
			for (let [name, texInfo] of Object.entries(val)) {
				let $t = $(`<li>${texInfo.tex.name}</li>`).appendTo($p);
				$t.on('dblclick', ()=>{
					displayTexture(texInfo.canvas);
					texInfo.tex.decodeData().then(x=>{
						texInfo.repaint();
					});
				});
			}
			$('#texturePackList').append($p);
		}
		
		
	},
	
	texpak: [],
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
		// let data = await SPICA.open(file);
		// global.loadedFiles[i] = data;
		// console.log(i, data);
	}
	global.loadedFiles = await SPICA.openPokemonPack(filenames);
	for (let i = 0; i <= 8; i++) {
		console.log(i, global.loadedFiles[i]);
	}
	displayPokemonModel();
});
$('#props input[name=poptShadow]').on('click', function(){
	//TODO: Implement in shader?
	// https://gamedev.stackexchange.com/questions/27252/draw-a-projection-of-a-mesh-on-a-surface
	// https://en.wikibooks.org/wiki/GLSL_Programming/Unity/Shadows_on_Planes
	displayPokemonModel();
});
$('#props input[name=poptMeta]').on('click', function(){
	displayPokemonModel();
});
$('#props input[name=poptModelBound]').on('click', function(){
	displayPokemonModel();
});
$('#props input[name=poptColor]').on('click', function(){
	displayPokemonModel();
});
$('#props button[name=loadOtherFileBtn]').on('click', async function(){
	clearDisplay();
	let filename = $(`#props input[name=loadOtherFile0]`).val();
	global.loadedFiles = await SPICA.open(filename);
	if (global.loadedFiles.modelpack
		&& global.loadedFiles.modelpack.models
		&& global.loadedFiles.modelpack.models[0])
	{
		displayModel(global.loadedFiles.modelpack.models[0]); //TODO just display modelpack
	}
});

function resize() {
	let view = $('#view');
	
	camera.aspect = view.innerWidth() / view.innerHeight();
	camera.updateProjectionMatrix();
	
	renderer.setSize(view.innerWidth(), view.innerHeight(), true);
}
function redraw() {
	trackball.update();
	renderer.render(scene, camera);
	raf(redraw);
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
		mon.children[1].visible = false;
		root.add(mon); //TODO modelpack instead of model
	}
	if ($('#props input[name=poptMeta]').is(':checked')) {
		{
			let point = new THREE.Mesh(new THREE.SphereBufferGeometry(), new THREE.MeshBasicMaterial());
			point.position.copy(paks[8].meta1.unk07);
			root.add(point);
		}{
			let box = new THREE.Box3(paks[8].meta1.boundingBoxMin, paks[8].meta1.boundingBoxMax);
			let help = new THREE.Box3Helper(box);
			root.add(help);
		}
	}
	if ($('#props input[name=poptModelBound]').is(':checked')) {
		let box = new THREE.Box3(paks[0].modelpack.models[0].boundingBoxMin, paks[0].modelpack.models[0].boundingBoxMax);
		let help = new THREE.Box3Helper(box, 0x00FF00);
		root.add(help);
	}
	global.info.populateSidebar();
}



clearDisplay();