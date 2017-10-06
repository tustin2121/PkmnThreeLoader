// https://github.com/gdkchan/SPICA/blob/6ffdfdc1ddf3b3614b9fda457ef9717194d6cf34/SPICA.Rendering/Model.cs

const THREE = require('three');
const { Object3D, SkinnedMesh, BufferGeometry, Skeleton } = require('three');
const { GFTextureFormat } = require('../gf/texture');

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
	
	for (let gf_mat of gf_mesh.materials) {
		// TODO ShaderMaterial
		let mat = {};
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
			mat.map = new THREE.DataTexture();
		}
		mat = new THREE.MeshBasicMaterial(mat)
	}
	
	let t_mesh = {};
	
	return t_mesh;
}

module.exports = { convertModel };