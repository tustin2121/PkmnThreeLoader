// main.js
//
/* global $, window, document, ViewerApp, ModelInfo, THREE */

let app = new ViewerApp();
let clock = new THREE.Clock();
let root = app.root;

////////////////////////////////////////////////////////////////////////////////////////////////////

window.addEventListener('resize', ()=>app.resize(), false);
app.resize();
raf(redraw);

function redraw() {
	const dt = clock.getDelta();
	app.redraw(dt);
	raf(redraw);
	
	if (window.gli) {
		let glext = app.renderer.context.getExtension('GLI_frame_terminator');
		if (glext) glext.frameTerminator();
	} 
}
