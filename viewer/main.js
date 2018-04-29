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

////////////////////////////////////////////////////////////////////////////////////////////////////

window.addEventListener('resize', resize, false);
resize();
raf(redraw);

$('#props > nav > li').on('click', function(){
	$('#props .selected').removeClass('selected');
	$('#props .'+this.className).addClass('selected');
});
// $('#props input[type=file]').on('change', function(){
//
// });
$('#props input[name=pkmnFile0]').on('change', function(){
	if (!$('#props input[name=pkmnFileAuto]').is(':checked')) return;
	fillPkmnFilePaths($(this).val());
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
	
	if (comp.name === '0') {
		for (let i = 1; i < 8; i++) {
			let npath = PATH.format( Object.assign({}, comp, { name:`${i}`}) );
			if (!fs.existsSync(npath)) continue;
			$(`#props input[name=pkmnFile${i}]`).val(npath);
		}
		return;
	}
	else if (comp.name.endsWith('0')) {
		const name = comp.name.slice(0, -1);
		for (let i = 1; i < 8; i++) {
			let npath = PATH.format( Object.assign({}, comp, { name:`${name}${i}`}) );
			if (!fs.existsSync(npath)) continue;
			$(`#props input[name=pkmnFile${i}]`).val(npath);
		}
		return;
	}
	else if (comp.dir.endsWith(folders[0])) {
		const dir = comp.dir.slice(0, -(folders[0].length));
		for (let i = 1; i < 8; i++) {
			let npath = PATH.format( Object.assign({}, comp, { dir:`${dir}${folders[i]}`}) );
			if (!fs.existsSync(npath)) continue;
			$(`#props input[name=pkmnFile${i}]`).val(npath);
		}
	}
	//TODO handle folders above
}