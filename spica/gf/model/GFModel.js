// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Model/GFModel.cs

const { GFSection } = require('../GFSection');
const { GFBone } = require('./GFBone');
const { GF_LUT } = require('./GF_LUT');
const { GFMaterial } = require('./GFMaterial');
const { GFMesh } = require('./GFMesh');
const { GFHashName } = require('./GFHashName');
const { PICAAttributeName, PICAAttributeFormat } = require('../../pica/commands');

function readHashTable(data) {
	let count = data.readUint32();
	let values = new Array(count);
	for (let i = 0; i < count; i++) {
		values[i] = new GFHashName({
			hash : data.readUint32(),
			name : data.readPaddedString(0x40),
		});
		// let hash = data.readUint32();
		// let str = data.readPaddedString(0x40);
		// str = new String(str); //jshint ignore:line
		// str.hash = hash;
		// values[i] = str;
	}
	return values;
}

class GFModel {
	constructor(data, name) {
		this.unkDat = [];
		this.skeleton = [];
		this.luts = [];
		this.materials = [];
		this.meshes = [];
		
		this.name = name;
		let magicNum = data.readUint32(); //0x15122117 ?
		if (magicNum !== GFModel.MAGIC_NUMBER) throw new ReferenceError('Magic Number does not match!');
		let shaderCount = data.readUint32();
		data.skipPadding();
		
		let modelSection = new GFSection(data);
		let shaderNames = readHashTable(data);
		let lutNames = readHashTable(data);
		let matNames = readHashTable(data);
		let meshNames = readHashTable(data);
		
		this.boundingBoxMin = data.readVector4();
		this.boundingBoxMax = data.readVector4();
		this.transform = data.readMatrix4();
		
		{ // Unknown data
			let len = data.readUint32();
			let off = data.readUint32();
			this.unkDat.push({ off, len, __addr:data.offset.toString(16) });
			data.skip(8); //skip padding
			data.skip(off + len);
		}
		{ // Bones
			let num = data.readUint32();
			data.skip(0xC); //Skip padding
			for (let i = 0; i < num; i++) {
				this.skeleton.push(new GFBone(data));
			}
		}
		data.skipPadding();
		{ // LUTs
			let num = data.readUint32();
			let len = data.readUint32();
			data.skipPadding();
			for (let i = 0; i < num; i++) {
				let m = new GF_LUT(data, `Sampler_${this.name}_${i}`, len);
				m.name = lutNames[i].valueOf();
				this.luts.push(m);
			}
		}
		// Materials
		for (let i = 0; i < matNames.length; i++) {
			let m = new GFMaterial(data);
			m.name = matNames[i].valueOf();
			this.materials.push(m);
		}
		// Meshes
		for (let i = 0; i < meshNames.length; i++) {
			let m = new GFMesh(data);
			m.name = meshNames[i].valueOf();
			this.meshes.push(m);
		}
	}
	
	toThree() {
		const {
			Skeleton, SkinnedMesh, Mesh, BufferGeometry, InterleavedBuffer,
			InterleavedBufferAttribute, BufferAttribute, Object3D, Box3,
		} = require('three');
		
		let obj = new Object3D();
		obj.name = this.name;
		
		// Skeleton
		let skeleton = (()=>{
			let bones = [];
			let boneNames = {};
			for (let bone of this.skeleton) {
				let b = bone.toThree();
				bones.push(b);
				boneNames[bone.name] = b;
				if (bone.parent) {
					// b.rotation.setFromVector3(boneNames[bone.parent].worldToLocal(b.rotation.toVector3()));
					boneNames[bone.parent].add(b);
				}
			}
			bones[0].updateMatrixWorld(true); //force matrixWorld update, so zero-pose is correct on bind() below
			return new Skeleton(bones);
		})();
		skeleton.calculateInverses();
		// obj.userData.skeleton = skeleton;
		obj.skeleton = skeleton;
		obj.add(skeleton.bones[0]);
		
		// Materials
		let mats = {};
		for (let gfMat of this.materials) {
			let mat = gfMat.toThree();
			mats[gfMat.matName] = mat;
		}
		
		// Meshes
		let meshes = [];
		for (let gfMesh of this.meshes) {
			for (let gfSub of gfMesh.submeshes) {
				let geom = new BufferGeometry();
				
				let bytebuf = new InterleavedBuffer(gfSub.rawBuffer.buffer, gfSub.vertexStride);
				let shortbuf = new InterleavedBuffer(new Int16Array(gfSub.rawBuffer.buffer.buffer), gfSub.vertexStride/2);
				let floatbuf = new InterleavedBuffer(new Float32Array(gfSub.rawBuffer.buffer.buffer), gfSub.vertexStride/4);
				
				if (bytebuf.count % 1 !== 0) { //Sometimes the stride doesn't divide evently...?
					console.warn('Stride does not divide evenly: ', bytebuf.count, ' => ', gfSub.verticesCount);
					bytebuf.count = gfSub.verticesCount;
					shortbuf.count = gfSub.verticesCount;
					floatbuf.count = gfSub.verticesCount;
				}
				
				let off = 0, skinned = false;
				for (let attr of gfSub.attributes) {
					let buf, size;
					switch (attr.format) {
						case PICAAttributeFormat.Byte: buf = bytebuf; size = 1; break;
						case PICAAttributeFormat.Ubyte: buf = bytebuf; size = 1; break;
						case PICAAttributeFormat.Short: buf = shortbuf; size = 2; break;
						case PICAAttributeFormat.Float: buf = floatbuf; size = 4; break;
					}
					let bufattr = new InterleavedBufferAttribute(buf, attr.elements, off/size, attr.scale !== 1);
					switch (attr.name) {
						case PICAAttributeName.Position:
							geom.addAttribute('position', bufattr);
							break;
						case PICAAttributeName.Normal:
							geom.addAttribute('normal', bufattr);
							break;
						case PICAAttributeName.Tangent:
							geom.addAttribute('tangent', bufattr);
							break;
						case PICAAttributeName.Color:
							geom.addAttribute('color', bufattr);
							break;
						case PICAAttributeName.TexCoord0:
							geom.addAttribute('uv', bufattr);
							break;
						case PICAAttributeName.TexCoord1:
							geom.addAttribute('uv2', bufattr);
							break;
						case PICAAttributeName.TexCoord2:
							geom.addAttribute('uv3', bufattr);
							break;
						case PICAAttributeName.BoneIndex: {
							// Convert index into boneIndices into bone indices
							for (let i = 0; i < gfSub.verticesCount; i++) {
								let x = gfSub.boneIndices[bufattr.getX(i)] || 255;
								let y = gfSub.boneIndices[bufattr.getY(i)] || 255;
								let z = gfSub.boneIndices[bufattr.getZ(i)] || 255;
								let w = gfSub.boneIndices[bufattr.getW(i)] || 255;
								bufattr.setXYZW(i, x, y, z, w);
							}
							bufattr.normalized = false;
							geom.addAttribute('skinIndex', bufattr);
						} break;
						case PICAAttributeName.BoneWeight:
							geom.addAttribute('skinWeight', bufattr);
							skinned = true;
							break;
						default:
							console.error('Unhandled attribute name!', attr.name);
							break;
					}
					off += size * attr.elements;
				}
				geom.setIndex(new BufferAttribute(new Uint32Array(gfSub.indices), 1, false));
				geom.boundingBox = new Box3(gfMesh.boundingBoxMax, gfMesh.boundingBoxMin);
				geom.computeBoundingSphere();
				
				let mesh;
				if (skinned) {
					mesh = new SkinnedMesh(geom, mats[gfSub.matName]);
					mesh.bindMode = 'detached';
					mesh.bind(skeleton, skeleton.bones[0].matrixWorld);
				}
				else {
					mesh = new Mesh(geom, mats[gfSub.matName]);
				}
				mesh.name = gfMesh.name;
				obj.add(mesh);
			}
		}
		return obj;
	}
}
Object.defineProperties(GFModel, {
	'MAGIC_NUMBER': { value:0x15122117, },
});

module.exports = { GFModel };