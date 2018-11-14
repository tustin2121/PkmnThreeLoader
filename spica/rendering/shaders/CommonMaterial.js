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
UniformsLib.pkmnMultiMap = {
	detailMap: { value: null },
	overlayMap: { value: null },
};

class CommonMaterial extends ShaderMaterial {
	constructor(params) {
		super();
		
		this.type = 'CommonMaterial';
		
		this.coordMap = params.userData.coordMap.slice();
		this.defines = {
			'OP_ALPHATEST': '<',
			'USE_UV2': false,
			'USE_UV3': false,
			'UV_MAP': 'vUv',
		};
		this.uniforms = {}; //should be set in subclasses
		
		this.defaultAttributeValues = {
			uv: [0,0],
			uv2: [0,0],
			uv3: [0,0],
		};
		
		this.vertexShader = '';
		this.fragmentShader = '';
		
		//Subclass needs to call:
		//this.setValues(params);
	}
	
	register(obj) {
		obj.onBeforeRender = (...params)=>this.onBeforeRender(...params);
	}
	
	onBeforeRender(renderer, scene, camera, geometry, material, group) {
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

module.exports = { CommonMaterial };
