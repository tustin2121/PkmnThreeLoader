// index.js
//
function inNW() {
	try {
		const n = require('nw.gui');
		return !!n;
	} catch (ex) {
		return false;
	}
}

if (inNW()) {
	const nw = require('nw.gui');
	nw.open('viewer/index.html', {
		title: "3D Viewer",
		width: 640, height: 480,
		resizable: true,
	});
} else {
	console.log('TODO: something');
}
