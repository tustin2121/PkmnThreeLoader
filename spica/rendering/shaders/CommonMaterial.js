// 
//

const { 
	ShaderMaterial, UniformsLib, UniformsUtils, ShaderLib, 
	Vector3, Matrix3, Color, Clock,
	TangentSpaceNormalMap, MultiplyOperation, BackSide,
} = require('three');

UniformsLib.pkmnCommon = {
	time: { value: 0 },
	rimEnable: { value: 0 },
	rimPower: { value: 8 },
	rimScale: { value: 0 },
	rimColor: { value: new Color( 0xffa500 ) },
	uvTransform2: { value: new Matrix3() },
	uvTransform3: { value: new Matrix3() },
};
UniformsLib.pkmnMultiMap = {
	detailMap: { value: null },
	overlayMap: { value: null },
};
UniformsLib.pkmnShadowPress = {
	shadowDirection: { value: new Vector3() },
};

class CommonMaterial extends ShaderMaterial {
	constructor(params) {
		super();
		
		this.type = 'CommonMaterial';
		
		this.coordMap = (params.coordMap||[]).slice();
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
		
		this.stencilTest = false;
		this.stencilFunc = null;
		this.stencilOp = null;
		
		//Subclass needs to call:
		//this.setValues(params);
	}
	
	register(obj) {
		obj.onBeforeRender = (renderer, scene, camera, geometry, material, group)=>{
			if (typeof material.onBeforeRender !== 'function') return;
			material.onBeforeRender({ renderer, scene, camera, geometry, material, group });
		};
		obj.onAfterRender = (renderer, scene, camera, geometry, material, group)=>{
			if (typeof material.onAfterRender !== 'function') return;
			material.onAfterRender({ renderer, scene, camera, geometry, material, group });
		};
	}
	
	onBeforeRender({ renderer, geometry, material }) {
		if (material.coordMap) {
			if (material.coordMap[0] && material.coordMap[0].indexOf('-')==-1 && material.uniforms.uvTransform) {
				let map = material[material.coordMap[0]];
				if (map.isWebGLRenderTarget) map = map.texture;
				// if (map.matrixAutoUpdate === true) map.updateMatrix();
				// material.uniforms.uvTransform.value.copy( map.matrix );
				CommonMaterial.setUVTransform(material.uniforms.uvTransform.value, map);
				material.defines['UV_'+material.coordMap[0].toUpperCase()] = 'vUv';
			}
			if (material.coordMap[1] && material.coordMap[1].indexOf('-')==-1 && material.uniforms.uvTransform2) {
				let map = material[material.coordMap[1]];
				if (map.isWebGLRenderTarget) map = map.texture;
				// if (map.matrixAutoUpdate === true) map.updateMatrix();
				// material.uniforms.uvTransform2.value.copy( map.matrix );
				CommonMaterial.setUVTransform(material.uniforms.uvTransform2.value, map);
				material.defines['UV_'+material.coordMap[1].toUpperCase()] = 'vUv2';
			}
			if (material.coordMap[2] && material.coordMap[2].indexOf('-')==-1 && material.uniforms.uvTransform3) {
				let map = material[material.coordMap[2]];
				if (map.isWebGLRenderTarget) map = map.texture;
				// if (map.matrixAutoUpdate === true) map.updateMatrix();
				// material.uniforms.uvTransform3.value.copy( map.matrix );
				CommonMaterial.setUVTransform(material.uniforms.uvTransform3.value, map);
				material.defines['UV_'+material.coordMap[2].toUpperCase()] = 'vUv3';
			}
		}
		
		if (material.uniforms.time) {
			material.uniforms.time.value = CommonMaterial.CLOCK.getElapsedTime();
		}
		
		if (geometry.attributes.uv2) {
			material.defines.USE_UV2 = true;
		}
		if (geometry.attributes.uv3) {
			material.defines.USE_UV3 = true;
		}
		
		if (material.stencilTest) {
			const gl = renderer.context;
			const stencil = renderer.state.buffers.stencil;
			
			stencil.setTest(true);
			stencil.setFunc(...material.stencilFunc);
			stencil.setOp(...material.stencilOp);
		}
	}
	
	onAfterRender({ renderer, material }) {
		if (material.stencilTest) {
			const gl = renderer.context;
			const stencil = renderer.state.buffers.stencil;
			
			stencil.setTest(false);
			stencil.setFunc( gl.ALWAYS, 1, 0xFF );
			stencil.setOp( gl.KEEP, gl.KEEP, gl.KEEP );
		}
	}
	
	/**
	 * 
	 * @param {GFMaterial} mat - Material to use in the transpilation
	 * @param {GFShader[]} shaders - Shader map
	 */
	static transpileShaders(mat, shaders) {
		const { VertShaderGenerator, FragShaderGenerator } = require('../shadergen');
		let opts = {
			vertexShader: null,
			geometryShader: null,
			fragmentShader: null,
		};
		try {
			// Transpile and apply Shaders
			if (mat.vtxShaderName && shaders[mat.vtxShaderName]) {
				let shader = shaders[mat.vtxShaderName];
				let gen = new VertShaderGenerator(shader.toShaderBinary());
				opts.vertexShader = { name:mat.vtxShaderName, code: gen.getVtxShader() };
			}
			if (mat.geomShaderName) {
				opts.geometryShader = { name:mat.geomShaderName, code:'exists' };
			}
			if (mat.fragShaderName && shaders[mat.fragShaderName]) {
				let shader = shaders[mat.fragShaderName];
				let gen = new FragShaderGenerator(shader.toShaderBinary(), { shader, mat });
				opts.fragmentShader = { name:mat.fragShaderName, code: gen.getFragShader() };
			}
		} catch (e) {
			console.error('ERROR TRANSPILING SHADERS:', e);
		} finally {
			return opts;
		}
	}
	
	/**
	 * Sets a UV matrix from the given texture, bypassing Matrix3.setUvTransform(). This method 
	 * uses a different formula than setUvTransform(), scaling the tx value with the scale value.
	 * @param {THREE.Matrix3} matrix - Matrix to set
	 * @param {THREE.Texture} map - Texture to set from
	 */
	static setUVTransform(matrix, map) {
		let { x:tx, y:ty } = map.offset;
		let { x:sx, y:sy } = map.repeat;
		let { x:cx, y:cy } = map.center;
		let c = Math.cos(map.rotation);
		let s = Math.sin(map.rotation);
		
		matrix.set(
			 sx * c,  sx * s,  -sx * (( c * cx + s * cy ) + tx) + cx,
			-sy * s,  sy * c,  -sy * ((-s * cx + c * cy ) + ty) + cy,
			0, 0, 1,
		);
	}
	
	get rimPower(){ return this.uniforms.rimPower.value; }
	set rimPower(val){ this.uniforms.rimPower.value = val; }
	
	get rimScale(){ return this.uniforms.rimScale.value; }
	set rimScale(val){ this.uniforms.rimScale.value = val; }
	
	get alphaTestOp(){ return this.defines['OP_ALPHATEST']; }
	set alphaTestOp(val){ this.defines['OP_ALPHATEST'] = val; }
	
	// easy shortcuts to the proper maps, for animations
	get map0() { return this[this.coordMap[0]]; }
	get map1() { return this[this.coordMap[1]]; }
	get map2() { return this[this.coordMap[2]]; }
}
CommonMaterial.prototype.isPokemonCommonMaterial = true;
CommonMaterial.CLOCK = new Clock();

if (typeof console) console.CLOCK = CommonMaterial.CLOCK;

module.exports = { CommonMaterial };
