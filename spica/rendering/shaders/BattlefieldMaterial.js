// 
//

const { 
	ShaderMaterial, UniformsLib, UniformsUtils, ShaderLib, 
	Vector2, Matrix3, Color, 
	TangentSpaceNormalMap, MultiplyOperation, BackSide,
} = require('three');

const { CommonMaterial } = require('./CommonMaterial');

ShaderLib['pkmnCommon'] = {
	uniforms: UniformsUtils.merge([
		UniformsLib.common,
		UniformsLib.specularmap,
		UniformsLib.envmap,
		UniformsLib.lightmap,
		UniformsLib.fog,
		UniformsLib.pkmnCommon,
		UniformsLib.pkmnMultiMap,
	]),
	
	vertexShader: require('./Battlefield.vtx.glsl'),
	fragmentShader: require('./Battlefield.frg.glsl'),
};

class BattlefieldMaterial extends CommonMaterial {
	constructor(params) {
		super(params);
		
		this.type = 'BattlefieldMaterial';
		
		this.defines = Object.assign(this.defines, {
			'TEX_BLEND_FUNC': 'texDefaultBlend',
			'USE_DETAILMAP': false,
			'USE_OVERLAYMAP': false,
			'UV_MAP': 'vUv',
			'UV_ALPHAMAP': 'vUv',
			'UV_ENVMAP': 'vUv',
		});
		this.uniforms = UniformsUtils.clone(ShaderLib.pkmnCommon.uniforms);
		
		this.defaultAttributeValues = Object.assign(this.defaultAttributeValues, {
			color: [1,1,1],
			normal: [0,1,0],
		});
		
		this.vertexShader = ShaderLib.pkmnCommon.vertexShader;
		this.fragmentShader = ShaderLib.pkmnCommon.fragmentShader;
		
		this.color = new Color( 0xffffff ); // emissive

		this.map = null;
		this.detailMap = null;
		this.overlayMap = null;

		this.lightMap = null;
		this.lightMapIntensity = 1.0;

		this.specularMap = null;

		this.alphaMap = null;

		this.envMap = null;
		this.combine = MultiplyOperation;
		this.reflectivity = 1;
		this.refractionRatio = 0.98;

		this.wireframe = false;
		this.wireframeLinewidth = 1;
		this.wireframeLinecap = 'round';
		this.wireframeLinejoin = 'round';

		this.skinning = false;
		this.morphTargets = false;

		this.lights = true;

		this.setValues(params);
	}
	
	// Because we can't get automatic support for this stuff from the renderer...
	onBeforeRender(renderer, scene, camera, geometry, material, group) {
		super.onBeforeRender(renderer, scene, camera, geometry, material, group);
		
		if (material.detailMap) {
			material.uniforms.detailMap.value = material.detailMap;
		}
		if (material.overlayMap) {
			material.uniforms.overlayMap.value = material.overlayMap;
		}
		material.defines['USE_DETAILMAP'] = !!material.detailMap;
		material.defines['USE_OVERLAYMAP'] = !!material.overlayMap;
	}
	
	
}
BattlefieldMaterial.prototype.isMeshBasicMaterial = true;
BattlefieldMaterial.matchNames = ['BattleFieldShader'];

module.exports = { BattlefieldMaterial };