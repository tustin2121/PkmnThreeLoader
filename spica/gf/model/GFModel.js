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
		require('three/examples/js/BufferGeometryUtils'); //need this first
		const {
			Skeleton, SkinnedMesh, Mesh, BufferGeometry, InterleavedBuffer,
			InterleavedBufferAttribute, BufferAttribute, Object3D, Box3,
			BufferGeometryUtils,
		} = require('three');
		
		let obj = new Object3D();
		obj.name = this.name;
		
		// Skeleton
		let skeleton = (()=>{
			let bones = [];
			let scaleBones = [];
			let boneNames = {};
			for (let i = 0; i < this.skeleton.length; i++) {
				let bone = this.skeleton[i]
				if (bone.isModelRoot && i !== 0) continue; //skip
				let b = bone.toThree();
				let sb = b.userData.scaleBone;
				bones.push(b); 
				boneNames[b.name] = b;
				scaleBones.push(sb);
				boneNames[sb.name] = sb;
				
				if (!bone.useLocalScale) {
					[ b, sb ] = [ sb, b ]; //swap bones, so scale modifies the main bone
				}
				b.add(sb);
				
				if (bone.parent) {
					// b.rotation.setFromVector3(boneNames[bone.parent].worldToLocal(b.rotation.toVector3()));
					boneNames[bone.parent].add(b);
				}
			}
			bones[0].updateMatrixWorld(true); //force matrixWorld update, so zero-pose is correct on bind() below
			return new Skeleton([...scaleBones, ...bones]);
		})();
		skeleton.calculateInverses();
		// obj.userData.skeleton = skeleton;
		obj.skeleton = skeleton;
		obj.add(skeleton.bones[0]);
		
		// Materials
		let mats = {};
		obj.mapNames = {};
		for (let gfMat of this.materials) {
			let mat = gfMat.toThree();
			mats[gfMat.matName] = mat;
			obj.mapNames[gfMat.matName] = mat.map;
		}
		
		// Meshes
		let meshes = [];
		for (let gfMesh of this.meshes) {
			let meshSkinned = false;
			let matName = '';
			let geoms = [];
			for (let gfSub of gfMesh.submeshes) {
				let boned = false, skinned = false;
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
				
				// Parse Explicitly Defined Attributes
				let off = 0;
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
						case PICAAttributeName.Position: {
							let a = new Float32Array(gfSub.verticesCount * 3);
							for (let i = 0; i < gfSub.verticesCount; i++) {
								a[(i*3)+0] = bufattr.getX(i);
								a[(i*3)+1] = bufattr.getY(i);
								a[(i*3)+2] = bufattr.getZ(i);
							}
							bufattr = new BufferAttribute(a, 3, false);
							geom.addAttribute('position', bufattr);
						} break;
						case PICAAttributeName.Normal: {
							let a = new Float32Array(gfSub.verticesCount * 3);
							for (let i = 0; i < gfSub.verticesCount; i++) {
								a[(i*3)+0] = bufattr.getX(i);
								a[(i*3)+1] = bufattr.getY(i);
								a[(i*3)+2] = bufattr.getZ(i);
							}
							bufattr = new BufferAttribute(a, 3, false);
							geom.addAttribute('normal', bufattr);
						} break;
						case PICAAttributeName.Tangent: {
							let a = new Float32Array(gfSub.verticesCount * 3);
							for (let i = 0; i < gfSub.verticesCount; i++) {
								a[(i*3)+0] = bufattr.getX(i);
								a[(i*3)+1] = bufattr.getY(i);
								a[(i*3)+2] = bufattr.getZ(i);
							}
							bufattr = new BufferAttribute(a, 3, false);
							geom.addAttribute('tangent', bufattr);
						} break;
						case PICAAttributeName.Color: {
							let a = new Uint8Array(gfSub.verticesCount * 4)
							for (let i = 0; i < gfSub.verticesCount; i++) {
								a[(i*4)+0] = gfSub.boneIndices[bufattr.getX(i)] || 255;
								a[(i*4)+1] = gfSub.boneIndices[bufattr.getY(i)] || 255;
								a[(i*4)+2] = gfSub.boneIndices[bufattr.getZ(i)] || 255;
								a[(i*4)+3] = gfSub.boneIndices[bufattr.getW(i)] || 255;
							}
							bufattr = new BufferAttribute(a, 4, false);
							geom.addAttribute('color', bufattr);
						} break;
						case PICAAttributeName.TexCoord0: {
							let a = new Float32Array(gfSub.verticesCount * 2);
							for (let i = 0; i < gfSub.verticesCount; i++) {
								a[(i*2)+0] = bufattr.getX(i);
								a[(i*2)+1] = bufattr.getY(i);
							}
							bufattr = new BufferAttribute(a, 2, false);
							geom.addAttribute('uv', bufattr);
						} break;
						case PICAAttributeName.TexCoord1: {
							let a = new Float32Array(gfSub.verticesCount * 2);
							for (let i = 0; i < gfSub.verticesCount; i++) {
								a[(i*2)+0] = bufattr.getX(i);
								a[(i*2)+1] = bufattr.getY(i);
							}
							bufattr = new BufferAttribute(a, 2, false);
							geom.addAttribute('uv2', bufattr);
						} break;
						case PICAAttributeName.TexCoord2: {
							let a = new Float32Array(gfSub.verticesCount * 2);
							for (let i = 0; i < gfSub.verticesCount; i++) {
								a[(i*2)+0] = bufattr.getX(i);
								a[(i*2)+1] = bufattr.getY(i);
							}
							bufattr = new BufferAttribute(a, 2, false);
							geom.addAttribute('uv3', bufattr);
						} break;
						case PICAAttributeName.BoneIndex: {
							// Convert index into boneIndices into bone indices
							let a = new Uint8Array(gfSub.verticesCount * 4)
							for (let i = 0; i < gfSub.verticesCount; i++) {
								a[(i*4)+0] = gfSub.boneIndices[bufattr.getX(i)] || 255;
								a[(i*4)+1] = gfSub.boneIndices[bufattr.getY(i)] || 255;
								a[(i*4)+2] = gfSub.boneIndices[bufattr.getZ(i)] || 255;
								a[(i*4)+3] = gfSub.boneIndices[bufattr.getW(i)] || 255;
							}
							bufattr = new BufferAttribute(a, 4, false);
							geom.addAttribute('skinIndex', bufattr);
							boned = true;
						} break;
						case PICAAttributeName.BoneWeight: {
							let a = new Float32Array(gfSub.verticesCount * 4);
							for (let i = 0; i < gfSub.verticesCount; i++) {
								a[(i*4)+0] = bufattr.getX(i) / 255;
								a[(i*4)+1] = bufattr.getY(i) / 255;
								a[(i*4)+2] = bufattr.getZ(i) / 255;
								a[(i*4)+3] = bufattr.getW(i) / 255;
							}
							bufattr = new BufferAttribute(a, 4, true);
							geom.addAttribute('skinWeight', bufattr);
							skinned = true;
						} break;
						default:
							console.error('Unhandled attribute name!', attr.name);
							break;
					}
					off += size * attr.elements;
				}
				geom.setIndex(new BufferAttribute(new Uint32Array(gfSub.indices), 1, false));
				
				// Parse Implied Attributes
				if (gfSub.boneIndices && gfSub.boneIndices.length == 1) {
					// Some pokemon have an entire mesh as a rigid part. To save space, they didn't define 
					// an attribute for bone indexes for these meshes, since it'd just be the same bone for the whole thing.
					// We need to add the bone as an attribute, however, if we want the mesh to stick with the bone's movement
					let a = new Uint8Array(gfSub.verticesCount * 4)
					for (let i = 0; i < gfSub.verticesCount; i++) {
						a[(i*4)+0] = gfSub.boneIndices[0];
						a[(i*4)+1] = 255;
						a[(i*4)+2] = 255;
						a[(i*4)+3] = 255;
					}
					let bufattr = new BufferAttribute(a, 4, false);
					geom.addAttribute('skinIndex', bufattr);
					boned = true;
				}
				if (boned && !skinned) { 
					// Some pokemon have rigid parts, and so those meshes have bone indexes, but not skin weights.
					// We need to add rigid, single-bone skin weights for them.
					let a = new Float32Array(gfSub.verticesCount * 4);
					for (let i = 0; i < gfSub.verticesCount; i++) {
						a[(i*4)+0] = 1;
						a[(i*4)+1] = 0;
						a[(i*4)+2] = 0;
						a[(i*4)+3] = 0;
					}
					let bufattr = new BufferAttribute(a, 4, true);
					geom.addAttribute('skinWeight', bufattr);
					skinned = true;
				}
				
				geoms.push(geom);
				matName = gfSub.matName;
				meshSkinned |= skinned;
			}
			let geom = BufferGeometryUtils.mergeBufferGeometries(geoms);
			if (!geom) throw new ReferenceError('Could not merge geometries!');
			
			geom.boundingBox = new Box3(gfMesh.boundingBoxMax, gfMesh.boundingBoxMin);
			geom.computeBoundingSphere();
			
			let mesh;
			if (meshSkinned) {
				mats[matName].skinning = true;
				mesh = new SkinnedMesh(geom, mats[matName]);
				mesh.bindMode = 'detached';
				// mesh.bind(skeleton, obj.matrixWorld);
				mesh.bind(skeleton, skeleton.bones[0].matrixWorld);
			}
			else {
				mesh = new Mesh(geom, mats[matName]);
			}
			mesh.name = gfMesh.name;
			obj.add(mesh);
		}
		return obj;
	}
}
Object.defineProperties(GFModel, {
	'MAGIC_NUMBER': { value:0x15122117, },
});

module.exports = { GFModel };