// main.js
//

const SPICA = global.SPICA = require('../spica');
const THREE = global.THREE = require('three');
require('./OrbitControls');

const raf = window.requestAnimationFrame;

let renderer = new THREE.WebGLRenderer();
renderer.setClearColor(new THREE.Color(0x325d82), 1.0);
document.getElementById('view').appendChild(renderer.domElement);

let scene = new THREE.Scene();
scene.add(new THREE.GridHelper(20, 20));
scene.add(new THREE.AxesHelper(5));

let camera = new THREE.PerspectiveCamera(45, 1, 0.5, 1000);
camera.position.set(20, 20, 16);
scene.add(camera);

let root = new THREE.Object3D();
scene.add(root);

let trackball = new THREE.OrbitControls(camera, renderer.domElement);
global.loadedFiles = null;

////////////////////////////////////////////////////////////////////////////////////////////////////

window.addEventListener('resize', resize, false);
resize();
raf(redraw);

$('#props > nav > li').on('click', function(){
	$('#props .selected').removeClass('selected');
	$('#props .'+this.className).addClass('selected');
});
$('#props .file').on('dblclick', function(){
	let chooser = $('#fileChooser');
	chooser.unbind('change').val('').on('change', ()=>{
		let file = chooser.val();
		$(this).val(file);
		if ($(this).attr('name') === 'pkmnFile0') {
			if (!$('#props input[name=pkmnFileAuto]').is(':checked')) return;
			fillPkmnFilePaths(file);
		}
	});
	chooser.trigger('click');
});
$('#props button[name=loadPkmnFile]').on('click', async function(){
	global.loadedFiles = null;
	let filenames = new Array(9);
	for (let i = 0; i <= 8; i++) {
		let file = $(`#props input[name=pkmnFile${i}]`).val();
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
		$(`#props .file[name=pkmnFile${i+1}]`).val(val);
	});
}