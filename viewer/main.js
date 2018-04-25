// main.js
//

const SPICA = global.SPICA = require('../spica');
const THREE = global.THREE = require('three');
require('./OrbitControls');

const raf = window.requestAnimationFrame;

let renderer = new THREE.WebGLRenderer();
renderer.setClearColor(new THREE.Color(0x0000DD), 1.0);
document.getElementById('view').appendChild(renderer.domElement);

let scene = new THREE.Scene();
scene.add(new THREE.GridHelper(20, 20));
scene.add(new THREE.AxesHelper(5));

let camera = new THREE.PerspectiveCamera(45, 1, 0.5, 1000);
camera.position.set(10, 10, 0);
scene.add(camera);

let trackball = new THREE.OrbitControls(camera, renderer.domElement);

////////////////////////////////////////////////////////////////////////////////////////////////////

window.addEventListener( 'resize', resize, false );
resize();
raf(redraw);

function resize() {
	let view = document.getElementById('view');
	
	camera.aspect = view.clientWidth / view.clientHeight;
	camera.updateProjectionMatrix();
	
	renderer.setSize(view.clientWidth, view.clientHeight, true);
}
function redraw() {
	trackball.update();
	renderer.render(scene, camera);
	raf(redraw);
}