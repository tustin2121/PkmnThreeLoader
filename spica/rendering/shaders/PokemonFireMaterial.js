// 
//

const { 
	ShaderMaterial, UniformsLib, UniformsUtils, ShaderLib, 
	Vector2, Matrix3, Color, 
	TangentSpaceNormalMap, MultiplyOperation, BackSide,
} = require('three');

const { CommonMaterial } = require('./CommonMaterial');

ShaderLib['pkmnFire'] = {
	uniforms: UniformsUtils.merge([
		UniformsLib.points,
		UniformsLib.fog,
	]),
	
	vertexShader: require('./PokeFire.vtx.glsl'),
	fragmentShader: require('./PokeFire.frg.glsl'),
};

class PokemonFireMaterial extends CommonMaterial {
	constructor(params) {
		super(params);
		
		this.type = 'PokemonFireMaterial';
		this.parentModel = null;
		
		this.defines = Object.assign(this.defines, {});
		this.uniforms = UniformsUtils.clone(ShaderLib.pkmnFire.uniforms);
		
		this.defaultAttributeValues = Object.assign(this.defaultAttributeValues, {
			color: [1,1,1],
			normal: [0,1,0],
		});
		
		this.vertexShader = ShaderLib.pkmnFire.vertexShader;
		this.fragmentShader = ShaderLib.pkmnFire.fragmentShader;
		
		this.color = new Color( 0xffffff ); // diffuse

		this.map = null;

		this.size = 1;
		this.sizeAttenuation = true;

		this.skinning = false;
		this.morphTargets = false;
		this.morphNormals = false;
		this.lights = false;
		
		this.setValues(params);
	}
	
	// Because we can't get automatic support for this stuff from the renderer...
	onBeforeRender(args) {
		const { material } = args;
		super.onBeforeRender(args);
		
		if (material.defines['UV_ALPHAMAP'] && material.defines['UV_NORMALMAP']) {
			material.defines['UV_ALPHAMAP'] = material.defines['UV_NORMALMAP'];
		}
		if (material.parentModel) {
			if (material.uniforms.rimEnable) {
				material.uniforms.rimEnable.value = material.parentModel._zpowerEnable;
			}
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
			
			rimPower: gfmat.rimPower,
			rimScale: gfmat.rimScale,
			
			userData: info, //TODO: clear userData when saving off the pokemon
		};
		if (gfmat.alphaTest) Object.assign(opts, gfmat.alphaTest.toThree());
		if (gfmat.blendFunction) Object.assign(opts, gfmat.blendFunction.toThree());
		if (gfmat.colorOperation) Object.assign(opts, gfmat.colorOperation.toThree());
		if (gfmat.stencilTest && gfmat.stencilTest.enabled) {
			Object.assign(opts, gfmat.stencilTest.toThree());
			Object.assign(opts, gfmat.stencilOperation.toThree());
		}
		
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
		return new PokemonFireMaterial(opts);
	}
}
PokemonFireMaterial.prototype.isPokemonFireMaterial = true;
PokemonFireMaterial.prototype.isPointsMaterial = true;
PokemonFireMaterial.matchNames = ['PokeFire'];

module.exports = { PokemonFireMaterial };