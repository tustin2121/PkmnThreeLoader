module.exports = Object.assign({}, ...[
	require('./GfSection'),
	require('./GFModelPack'),
	require('./GFMotionPack'),
	
	// Shortcuts
	require('./model/GFModel'),
	require('./motion/GFMotion'),
	require('./shader/GFShader'),
	require('./texture/GFTexture'),
]);