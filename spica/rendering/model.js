// https://github.com/gdkchan/SPICA/blob/6ffdfdc1ddf3b3614b9fda457ef9717194d6cf34/SPICA.Rendering/Model.cs

const THREE = require('three');
const {
	Object3D, SkinnedMesh, BufferGeometry, Skeleton, Texture,
	InterleavedBuffer, InterleavedBufferAttribute,
} = require('three');
const { GFTextureFormat } = require('../gf/texture');
const { PICAAttributeFormat, PICAAttributeName } = require('../pica/commands');

/**
 * @param {GFModel} gf_model
 */
function convertModel(gf_model) {
	for (let gf_mesh of gf_model.meshes) {
		let t_mesh = convertMesh(gf_mesh);
		// let nVerts = gf_mesh.submeshes.
		//
		// let t_geom = new BufferGeometry();
		//
		// for (let gf_submesh of gf_mesh.submeshes) {
		//
		//
		//
		// 	let t_mat;
		//
		// 	let t_submesh = new SkinnedMesh(t_geom, t_mat);
		// }
		// let t_mesh = new SkinnedMesh();
	}
}

function convertMesh(gf_mesh, pack) {
	let skeleton, mats, geom, mesh;
	{
		let boneHash = {};
		skeleton = [];
		for (let gf_bone of gf_mesh.skeleton) {
			let t_bone = new THREE.Bone();
			t_bone.name = gf_bone.name;
			t_bone.position = gf_bone.translation;
			t_bone.setFromVector3(gf_bone.rotation);
			t_bone.scale = gf_bone.scale;
			t_bone.userData.flags = gf_bone.flags; //???
			if (gf_bone.parent) {
				boneHash[gf_bone.parent].add(t_bone);
			}
			boneHash[gf_bone.name] = t_bone;
			skeleton.push(t_bone);
		}
		skeleton = new Skeleton(skeleton);
	}
	
	mats = {};
	for (let gf_mat of gf_mesh.materials) {
		// TODO ShaderMaterial
		let mat = { name: gf_mat.matName.trim() };
		{
			let gf_tc = gf_mat.textureCoords[0];
			let gf_tex;
			for (let t of pack.textures) {
				if (t.name === gf_tex.name) {
					gf_tex = pack.textures;
					break;
				}
			}
			let t_tex = {};
			let format = GFTextureFormat.convert3(gf_tex.format);
			let t_mat = new THREE.DataTexture(gf_tex, gf_tex.width, gf_tex.height, format.format, format.type);
			t_mat.wrapS = GFTextureWrap.convert3(gf_tc.wrapU);
			t_mat.wrapT = GFTextureWrap.convert3(gf_tc.wrapV);
			t_mat.mapping = GFTextureMappingType.convert3(gf_tc.mappingType);
			t_mat.magFilter = GFMagFilter.convert3(gf_tc.magFilter);
			t_mat.minFilter = GFMinFilter.convert3(gf_tc.minFilter);
			t_mat.repeat.set(gf_tc.scale);
			t_mat.offset.set(gf_tc.translation);
			// Note: no THREE.js equivilant for gf_tc.rotation
			mat.map = t_mat;
		}
		mat = new THREE.MeshBasicMaterial(mat);
		mats[mat.name] = mat;
	}
	
	for (let gf_sub of gf_mesh.submeshes) {
		let vbo = (()=>{
			let f = gf_sub.attributes[0].format;
			for (let i = 1; i < gf_sub.attributes.length; i++) {
				if (gf_sub.attributes[i].format !== f) throw new TypeError('VBO is not all the same format!');
			}
			switch (f) {
				case PICAAttributeFormat.Byte:  return new Int8Array(gf_sub.rawBuffer.buffer);
				case PICAAttributeFormat.Ubyte: return new Uint8Array(gf_sub.rawBuffer.buffer);
				case PICAAttributeFormat.Short: return new Int16Array(gf_sub.rawBuffer.buffer);
				case PICAAttributeFormat.Float: return new Float32Array(gf_sub.rawBuffer.buffer);
			}
			throw new TypeError('Invalid VBO format!');
		})();
		
		let interBuffer = new InterleavedBuffer(vbo, gf_sub.vertexStride);
		let geom = new BufferGeometry();
		let attrOff = 0;
		for (let attr of gf_sub.attributes) {
			let t_attr = _scale(new InterleavedBufferAttribute(interBuffer, attr.elements, attrOff), attr.scale);
			switch (attr.name) {
				case PICAAttributeName.Position:	geom.addAttribute('position', t_attr); break;
				case PICAAttributeName.Normal:		geom.addAttribute('normal', t_attr); break;
				case PICAAttributeName.Tangent:		geom.addAttribute('tangent', t_attr); break;
				case PICAAttributeName.Color:		geom.addAttribute('color', t_attr); break;
				case PICAAttributeName.TexCoord0:	geom.addAttribute('uv', t_attr); break;
				case PICAAttributeName.TexCoord1:	geom.addAttribute('uv2', t_attr); break;
				case PICAAttributeName.TexCoord2:	geom.addAttribute('uv3', t_attr); break;
				case PICAAttributeName.BoneIndex:	geom.addAttribute('skinIndices', t_attr); break;
				case PICAAttributeName.BoneWeight:	geom.addAttribute('skinWeights', t_attr); break;
			}
			attrOff += attr.elements;
		}
		geom.setIndex(gf_sub.indices);
		
	}
	
	let t_mesh = {};
	
	return t_mesh;
	
	/** Scales an InterleavedBufferAttribute. */
	function _scale(buffAttr, scale) {
		if (scale === 1) return buffAttr;
		for (let i = 0; i < buffAttr.count; i++) {
			buffAttr.setX( buffAttr.getX(i) * scale );
			if (buffAttr.itemSize < 2) continue;
			buffAttr.setY( buffAttr.getY(i) * scale );
			if (buffAttr.itemSize < 3) continue;
			buffAttr.setZ( buffAttr.getZ(i) * scale );
			if (buffAttr.itemSize < 4) continue;
			buffAttr.setW( buffAttr.getW(i) * scale );
		}
		return buffAttr;
	}
}

module.exports = { convertModel };