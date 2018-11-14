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

class PokemonBaseMaterial extends CommonMaterial {
	constructor(params) {
		super(params);
		
		this.type = 'PokemonBaseMaterial';
		
		this.defines = Object.assign(this.defines, {
			'UV_MAP': 'vUv',
			'UV_ALPHAMAP': 'vUv',
			'UV_NORMALMAP': 'vUv',
			'UV_EMISSIVEMAP': 'vUv',
			'UV_ENVMAP': 'vUv',
		});
		this.uniforms = UniformsUtils.clone(ShaderLib.pkmnCommon.uniforms);
		
		this.defaultAttributeValues = Object.assign(this.defaultAttributeValues, {
			color: [1,1,1],
			normal: [0,1,0],
		});
		
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
		
		this.setValues(params);
	}
	
	// Because we can't get automatic support for this stuff from the renderer...
	onBeforeRender(renderer, scene, camera, geometry, material, group) {
		super.onBeforeRender(renderer, scene, camera, geometry, material, group);
		
		if (material.defines['UV_ALPHAMAP'] && material.defines['UV_NORMALMAP']) {
			material.defines['UV_ALPHAMAP'] = material.defines['UV_NORMALMAP'];
		}
	}
	
	/**
	 * 
	 * @param {GFMaterial} gfmat - Material to convert
	 * @param {GFTexture[]} textures - Hash of textures to use
	 */
	static fromGFMaterial(gfmat, textures) {
		let info = {
			fragmentShader: gfmat.fragShaderName,
			vertexShader: gfmat.vtxShaderName,
		};
		let opts = {
			name: gfmat.matName,
			color: gfmat.diffuseColor >> 8,
			emissive: gfmat.emissionColor >> 8,
			
			colorWrite: gfmat.colorBufferWrite,
			depthWrite: gfmat.depthBufferWrite,
			depthTest: gfmat.depthBufferRead,
			
			userData: info, //TODO: clear userData when saving off the pokemon
		};
		if (gfmat.alphaTest) Object.assign(opts, gfmat.alphaTest.toThree());
		if (gfmat.blendFunction) Object.assign(opts, gfmat.blendFunction.toThree());
		if (gfmat.colorOperation) Object.assign(opts, gfmat.colorOperation.toThree());
		
		// TexCoord[] holds the texture name to be used for this material
		// bumpTexture points to which of them is the bump/normal map
		// https://github.com/gdkchan/SPICA/blob/09d56f40581847e4a81a657c8f35af0ec64059ee/SPICA/Formats/GFL2/Model/GFModel.cs#L313
		if (gfmat.textureCoords) {
			opts.coordMap = new Array(3);
			info.texCoords = new Array(3);
			if (gfmat.textureCoords[0]) {
				let tc = gfmat.textureCoords[0].toThree();
				info.texCoords[0] = tc;
				opts.map = textures[tc.name].toThree(tc);
				opts.coordMap[0] = 'map';
			}
			if (gfmat.textureCoords[1]) {
				let tc = gfmat.textureCoords[1].toThree();
				info.texCoords[1] = tc;
				opts.coordMap[1] = 'unk1Map-'+tc.name;
			}
			if (gfmat.textureCoords[2]) {
				let tc = gfmat.textureCoords[2].toThree();
				info.texCoords[2] = tc;
				opts.coordMap[2] = 'unk2Map-'+tc.name;
			}
			if (gfmat.bumpTexture > -1) {
				let tc = info.texCoords[gfmat.bumpTexture];
				opts.normalMap = textures[tc.name].toThree(tc);
				opts.alphaMap = opts.normalMap;
				opts.coordMap[gfmat.bumpTexture] = 'normalMap';
			}
		}
		return new PokemonBaseMaterial(opts);
	}
}
PokemonBaseMaterial.prototype.isMeshPhongMaterial = true;
PokemonBaseMaterial.matchNames = ['PokeNormal','Poke'];

module.exports = { PokemonBaseMaterial };