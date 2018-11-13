// 
//

const { 
	ShaderMaterial, UniformsLib, UniformsUtils, ShaderLib, 
	Vector2, Matrix3, Color, 
	TangentSpaceNormalMap, MultiplyOperation, BackSide,
} = require('three');

UniformsLib.pkmnCommon = {
	uvTransform2: { value: new Matrix3() },
	uvTransform3: { value: new Matrix3() },
};

ShaderLib['pkmnCommon'] = {
	uniforms: UniformsUtils.merge([
		UniformsLib.common,
		UniformsLib.specularmap,
		UniformsLib.envmap,
		UniformsLib.aomap,
		UniformsLib.lightmap,
		UniformsLib.fog,
		UniformsLib.pkmnCommon,
	]),
	
	vertexShader: require('./Battlefield.vtx.glsl'),
	fragmentShader: require('./Battlefield.frg.glsl'),
};

class BattlefieldCommonMaterial extends ShaderMaterial {
	constructor(params) {
		super();
		
		this.type = 'BattlefieldCommonMaterial';
		
		this.coordMap = params.userData.coordMap.slice();
		this.defines = {
			'OP_ALPHATEST': '<',
			'USE_UV2': false,
			'USE_UV3': false,
			'UV_MAP': 'vUv',
			'UV_ALPHAMAP': 'vUv',
			'UV_NORMALMAP': 'vUv',
			'UV_EMISSIVEMAP': 'vUv',
			'UV_ENVMAP': 'vUv',
		};
		this.uniforms = UniformsUtils.clone(ShaderLib.pkmnCommon.uniforms);
		
		this.defaultAttributeValues = {
			color: [1,1,1],
			normal: [0,1,0],
			uv: [0,0],
			uv2: [0,0],
			uv3: [0,0],
		};
		
		this.vertexShader = ShaderLib.pkmnCommon.vertexShader;
		this.fragmentShader = ShaderLib.pkmnCommon.fragmentShader;
		
		this.color = new Color( 0xffffff ); // diffuse
		this.specular = new Color( 0x111111 );
		this.shininess = 30;

		this.map = null;

		this.lightMap = null;
		this.lightMapIntensity = 1.0;

		this.aoMap = null;
		this.aoMapIntensity = 1.0;

		this.emissive = new Color( 0x000000 );
		this.emissiveIntensity = 1.0;
		this.emissiveMap = null;

		this.bumpMap = null;
		this.bumpScale = 1;

		this.normalMap = null;
		this.normalMapType = TangentSpaceNormalMap;
		this.normalScale = new Vector2( 1, 1 );

		this.displacementMap = null;
		this.displacementScale = 1;
		this.displacementBias = 0;

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
		this.morphNormals = false;
		this.lights = true;
		
		this.refUvMap = null;

		this.setValues(params);
	}
	
	register(obj) {
		obj.onBeforeRender = BattlefieldCommonMaterial.onBeforeRender
	}
	
	// Because we can't get automatic support for this stuff from the renderer...
	static onBeforeRender(renderer, scene, camera, geometry, material, group) {
		let uniforms = material.uniforms;
		
		if (material.coordMap) {
			if (material.coordMap[0] && material.coordMap[0].indexOf('-')==-1 && material.uniforms.uvTransform) {
				let map = material[material.coordMap[0]];
				if (map.isWebGLRenderTarget) map = map.texture;
				if (map.matrixAutoUpdate === true) map.updateMatrix();
				material.uniforms.uvTransform.value.copy( map.matrix );
				material.defines['UV_'+material.coordMap[0].toUpperCase()] = 'vUv';
			}
			if (material.coordMap[1] && material.coordMap[1].indexOf('-')==-1 && material.uniforms.uvTransform2) {
				let map = material[material.coordMap[1]];
				if (map.isWebGLRenderTarget) map = map.texture;
				if (map.matrixAutoUpdate === true) map.updateMatrix();
				material.uniforms.uvTransform2.value.copy( map.matrix );
				material.defines['UV_'+material.coordMap[1].toUpperCase()] = 'vUv2';
			}
			if (material.coordMap[2] && material.coordMap[2].indexOf('-')==-1 && material.uniforms.uvTransform3) {
				let map = material[material.coordMap[2]];
				if (map.isWebGLRenderTarget) map = map.texture;
				if (map.matrixAutoUpdate === true) map.updateMatrix();
				material.uniforms.uvTransform3.value.copy( map.matrix );
				material.defines['UV_'+material.coordMap[2].toUpperCase()] = 'vUv3';
			}
		}
		
		if (material.defines['UV_ALPHAMAP'] && material.defines['UV_NORMALMAP']) {
			material.defines['UV_ALPHAMAP'] = material.defines['UV_NORMALMAP'];
		}
		
		if (geometry.attributes.uv2) {
			material.defines.USE_UV2 = true;
		}
		if (geometry.attributes.uv3) {
			material.defines.USE_UV3 = true;
		}
	}
	
	get alphaTestOp(){ return this.defines['OP_ALPHATEST']; }
	set alphaTestOp(val){ this.defines['OP_ALPHATEST'] = val; }
	
	// easy shortcuts to the proper maps, for animations
	get map0() { return this[this.coordMap[0]]; }
	get map1() { return this[this.coordMap[1]]; }
	get map2() { return this[this.coordMap[2]]; }
	
}
BattlefieldCommonMaterial.matchNames = ['BattleFieldShader'];

module.exports = { BattlefieldCommonMaterial };