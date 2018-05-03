// https://github.com/gdkchan/SPICA/tree/master/SPICA.Rendering/Shaders
module.exports = Object.assign({}, ...[
	require('./FragShaderGenerator'),
	require('./GeomShaderGenerator'),
	require('./VertShaderGenerator'),
]);