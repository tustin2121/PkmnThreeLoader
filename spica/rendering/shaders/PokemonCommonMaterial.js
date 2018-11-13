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
		UniformsLib.emissivemap,
		UniformsLib.bumpmap,
		UniformsLib.normalmap,
		UniformsLib.displacementmap,
		UniformsLib.gradientmap,
		UniformsLib.fog,
		UniformsLib.lights,
		{
			emissive: { value: new Color( 0x000000 ) },
			specular: { value: new Color( 0x111111 ) },
			shininess: { value: 30 }
		},
		UniformsLib.pkmnCommon,
	]),
	
	vertexShader: require('./PokeCommon.vtx.glsl'),
	fragmentShader: require('./PokeCommon.frg.glsl'),
};

class PokemonCommonMaterial extends ShaderMaterial {
	constructor(params) {
		super();
		
		this.type = 'PokemonCommonMaterial';
		
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
		obj.onBeforeRender = PokemonCommonMaterial.onBeforeRender
	}
	
	// Because we can't get automatic support for this stuff from the renderer...
	static onBeforeRender(renderer, scene, camera, geometry, material, group) {
		let uniforms = material.uniforms;
		/*
		uniforms.opacity.value = material.opacity;
		if ( material.color ) {
			uniforms.diffuse.value = material.color;
		}
		if ( material.emissive ) {
			uniforms.emissive.value.copy( material.emissive ).multiplyScalar( material.emissiveIntensity );
		}
		if ( material.map ) {
			uniforms.map.value = material.map;
		}
		if ( material.alphaMap ) {
			uniforms.alphaMap.value = material.alphaMap;
		}
		if ( material.specularMap ) {
			uniforms.specularMap.value = material.specularMap;
		}
		if ( material.envMap ) {
			uniforms.envMap.value = material.envMap;
			// don't flip CubeTexture envMaps, flip everything else:
			//  WebGLRenderTargetCube will be flipped for backwards compatibility
			//  WebGLRenderTargetCube.texture will be flipped because it's a Texture and NOT a CubeTexture
			// this check must be handled differently, or removed entirely, if WebGLRenderTargetCube uses a CubeTexture in the future
			uniforms.flipEnvMap.value = ( ! ( material.envMap && material.envMap.isCubeTexture ) ) ? 1 : - 1;

			uniforms.reflectivity.value = material.reflectivity;
			uniforms.refractionRatio.value = material.refractionRatio;

			// uniforms.maxMipLevel.value = properties.get( material.envMap ).__maxMipLevel; //?!?!?!?!?!?!?!?!?!?!?!?! WebGLRenderer, line 2000
		}
		if ( material.lightMap ) {
			uniforms.lightMap.value = material.lightMap;
			uniforms.lightMapIntensity.value = material.lightMapIntensity;
		}
		if ( material.aoMap ) {
			uniforms.aoMap.value = material.aoMap;
			uniforms.aoMapIntensity.value = material.aoMapIntensity;
		}
		
		uniforms.specular.value = material.specular;
		uniforms.shininess.value = Math.max( material.shininess, 1e-4 ); // to prevent pow( 0.0, 0.0 )

		if ( material.emissiveMap ) {
			uniforms.emissiveMap.value = material.emissiveMap;
		}

		if ( material.bumpMap ) {
			uniforms.bumpMap.value = material.bumpMap;
			uniforms.bumpScale.value = material.bumpScale;
			if ( material.side === BackSide ) uniforms.bumpScale.value *= - 1;
		}

		if ( material.normalMap ) {
			uniforms.normalMap.value = material.normalMap;
			uniforms.normalScale.value.copy( material.normalScale );
			if ( material.side === BackSide ) uniforms.normalScale.value.negate();
		}

		if ( material.displacementMap ) {
			uniforms.displacementMap.value = material.displacementMap;
			uniforms.displacementScale.value = material.displacementScale;
			uniforms.displacementBias.value = material.displacementBias;
		}
		
		if ( material.gradientMap ) {
			uniforms.gradientMap.value = material.gradientMap;
		}
		//*/
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
	
	/*
	get color(){ return this.uniforms.diffuse.value; }
	set color(val){ this.uniforms.diffuse.value = val; }
	
	get map(){ return this.uniforms.map.value; }
	set map(val){ this.uniforms.map.value = val; }
	
	get alphaMap(){ return this.uniforms.alphaMap.value; }
	set alphaMap(val){ this.uniforms.alphaMap.value = val; }
	
	get specularMap(){ return this.uniforms.specularMap.value; }
	set specularMap(val){ this.uniforms.specularMap.value = val; }
	
	get emissiveMap(){ return this.uniforms.emissiveMap.value; }
	set emissiveMap(val){ this.uniforms.emissiveMap.value = val; }
	
	get normalMap(){ return this.uniforms.normalMap.value; }
	set normalMap(val){ this.uniforms.normalMap.value = val; }
	
	get normalScale(){ return this.uniforms.normalScale.value; }
	set normalScale(val){ this.uniforms.normalScale.value = val; }
	
	get displacementMap(){ return this.uniforms.displacementMap.value; }
	set displacementMap(val){ this.uniforms.displacementMap.value = val; }
	
	get displacementScale(){ return this.uniforms.displacementScale.value; }
	set displacementScale(val){ this.uniforms.displacementScale.value = val; }
	
	get displacementBias(){ return this.uniforms.displacementBias.value; }
	set displacementBias(val){ this.uniforms.displacementBias.value = val; }
	
	get envMap(){ return this.uniforms.envMap.value; }
	set envMap(val){ 
		this.uniforms.envMap.value = val; 
		this.uniforms.flipEnvMap.value = (!(val && val.isCubeTexture)) ? 1 : -1;
		this.uniforms.maxMipLevel.value = 0; //?!?!?!?!?!?!?!?!?!?!?!?!
		// WebGLRenderer, line 2000
	}
	
	get reflectivity(){ return this.uniforms.reflectivity.value; }
	set reflectivity(val){ this.uniforms.reflectivity.value = val; }
	
	get refractionRatio(){ return this.uniforms.refractionRatio.value; }
	set refractionRatio(val){ this.uniforms.refractionRatio.value = val; }
	
	get lightMap(){ return this.uniforms.lightMap.value; }
	set lightMap(val){ this.uniforms.lightMap.value = val; }
	
	get lightMapIntensity(){ return this.uniforms.lightMapIntensity.value; }
	set lightMapIntensity(val){ this.uniforms.lightMapIntensity.value = val; }
	
	get aoMap(){ return this.uniforms.aoMap.value; }
	set aoMap(val){ this.uniforms.aoMap.value = val; }
	
	get aoMapIntensity(){ return this.uniforms.aoMapIntensity.value; }
	set aoMapIntensity(val){ this.uniforms.aoMapIntensity.value = val; }
	*/
}
PokemonCommonMaterial.prototype.isMeshPhongMaterial = true;
PokemonCommonMaterial.matchNames = ['PokeNormal','Poke'];

module.exports = { PokemonCommonMaterial };