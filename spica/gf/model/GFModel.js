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
		require('three/examples/js/utils/BufferGeometryUtils'); //need this first
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
			let boneNames = {};
			for (let i = 0; i < this.skeleton.length; i++) {
				let bone = this.skeleton[i]
				if (bone.isModelRoot && i !== 0) continue; //skip
				let b = bone.toThree();
				bones.push(b); 
				boneNames[b.name] = b;
				
				if (bone.parent) {
					boneNames[bone.parent].add(b);
				}
			}
			if (!bones.length) return null;
			bones[0].updateMatrixWorld(true); //force matrixWorld update, so zero-pose is correct on bind() below
			return new Skeleton(bones);
		})();
		if (skeleton) {
			skeleton.calculateInverses();
			// obj.userData.skeleton = skeleton;
			obj.skeleton = skeleton;
			// obj.add(skeleton.bones[0]);
		}
		
		// Materials
		let mats = {};
		obj.mapNames = {};
		for (let gfMat of this.materials) {
			mats[gfMat.matName] = gfMat;
		}
		
		// Meshes
		let meshes = [];
		for (let gfMesh of this.meshes) {
			let meshSkinned = false;
			let matNames = [];
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
				if (!boned && gfSub.boneIndices && gfSub.boneIndices.length > 0 && gfSub.boneIndices.length < 4) {
					// Some pokemon have an entire mesh as a rigid part. To save space, they didn't define 
					// an attribute for bone indexes for these meshes, since it'd just be the same bone for the whole thing.
					// We need to add the bone as an attribute, however, if we want the mesh to stick with the bone's movement
					let a = new Uint8Array(gfSub.verticesCount * 4)
					for (let i = 0; i < gfSub.verticesCount; i++) {
						a[(i*4)+0] = gfSub.boneIndices[0] || 255;
						a[(i*4)+1] = gfSub.boneIndices[1] || 255;
						a[(i*4)+2] = gfSub.boneIndices[2] || 255;
						a[(i*4)+3] = gfSub.boneIndices[3] || 255;
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
				matNames.push(gfSub.matName);
				meshSkinned |= skinned;
			}
			let useGroups = !matNames.every(x=>x===matNames[0]);
			let geom;
			try {
				geom = GFModel.mergeBufferGeometries(geoms, useGroups);
			} catch (e) {
				geom = GFModel.attemptCorrectBufferGeometries(geoms, useGroups);
			}
			if (!geom) throw new ReferenceError('Could not merge geometries!');
			
			geom.boundingBox = new Box3(gfMesh.boundingBoxMax, gfMesh.boundingBoxMin);
			geom.computeBoundingSphere();
			
			let meshMats = useGroups? matNames.map(x=>mats[x]) : mats[matNames[0]];
			let mesh;
			if (meshSkinned && skeleton) {
				mesh = new SkinnedMesh(geom, meshMats);
				mesh.bindMode = 'detached';
				// mesh.bind(skeleton, obj.matrixWorld);
				mesh.bind(skeleton, skeleton.bones[0].matrixWorld);
			}
			else {
				mesh = new Mesh(geom, meshMats);
			}
			mesh.name = gfMesh.name;
			obj.add(mesh);
		}
		return obj;
	}
	
	static attemptCorrectBufferGeometries(geometries, useGroups) {
		const { BufferAttribute } = require('three');
		let attributesUsed = {};
		
		for (let geom of geometries) {
			// gather attributes, exit early if they're different
			for (let name in geom.attributes) {
				attributesUsed[name] = geom.attributes[name].array.constructor;
			}
		}
		for (let geom of geometries) {
			for (let name in attributesUsed) {
				if (geom.attributes[name]) continue;
				if (name === 'uv2' && geom.attributes['uv']) {
					geom.attributes['uv2'] = geom.attributes['uv'];
					continue;
				}
				if (name === 'uv3' && geom.attributes['uv']) {
					geom.attributes['uv3'] = geom.attributes['uv'];
					continue;
				}
				if (name === 'normal' && geom.attributes['position']) {
					const CLASS = attributesUsed['normal'];
					const NUM = geom.attributes['position'].count;
					const array = new CLASS(NUM * 3);
					for (let i = 0; i < NUM; i++) {
						array[(i*3)+1] = 1.0;
					}
					geom.attributes['normal'] = new BufferAttribute(array, 3, false);
					continue;
				}
				if (name === 'color' && geom.attributes['position']) {
					const CLASS = attributesUsed['color'];
					const NUM = geom.attributes['position'].count;
					const array = new CLASS(NUM * 4);
					array.fill(0xFF);
					geom.attributes['color'] = new BufferAttribute(array, 4, false);
					continue;
				}
			}
		}
		
		return GFModel.mergeBufferGeometries(geometries, useGroups);
	}
	
	// Below copied and modified from BufferGeometryUtils
	
	/**
	 * @param  {Array<THREE.BufferGeometry>} geometries
	 * @return {THREE.BufferGeometry}
	 */
	static mergeBufferGeometries(geometries, useGroups) {
		const { BufferGeometry } = require('three');
		
		let isIndexed = geometries[0].index !== null;

		let attributesUsed = new Set( Object.keys( geometries[0].attributes ) );
		let morphAttributesUsed = new Set( Object.keys( geometries[0].morphAttributes ) );

		let attributes = {};
		let morphAttributes = {};

		let mergedGeometry = new BufferGeometry();
		let offset = 0;

		for (let i = 0; i < geometries.length; ++i) {
			let geometry = geometries[i];

			// ensure that all geometries are indexed, or none
			if (isIndexed !== (geometry.index !== null)) throw new TypeError(`Could not merge geometries: Geometry ${i} is${isIndexed?'':' not'} indexed!`);

			// gather attributes, exit early if they're different
			for (let name in geometry.attributes) {
				if (!attributesUsed.has(name)) throw new TypeError(`Could not merge geometries: Geometry ${i} has extranious '${name}' attribute!`);
				if (attributes[name] === undefined) attributes[name] = [];
				attributes[name].push(geometry.attributes[name]);
			}

			// gather morph attributes, exit early if they're different
			for (let name in geometry.morphAttributes) {
				if (!morphAttributesUsed.has(name)) throw new TypeError(`Could not merge geometries: Geometry ${i} has extranious '${name}' morph attribute!`);
				if (morphAttributes[name] === undefined) morphAttributes[name] = [];
				morphAttributes[name].push(geometry.morphAttributes[name]);
			}

			// gather .userData
			mergedGeometry.userData.mergedUserData = mergedGeometry.userData.mergedUserData || [];
			mergedGeometry.userData.mergedUserData.push(geometry.userData);

			if (useGroups) {
				let count;
				if (isIndexed) {
					count = geometry.index.count;
				} else if (geometry.attributes.position !== undefined) {
					count = geometry.attributes.position.count;
				} else {
					throw new TypeError(`Could not merge geometries: Geometry ${i} has nothing to form groups from!`);
				}
				mergedGeometry.addGroup(offset, count, i);
				offset += count;
			}
		}

		// merge indices
		if (isIndexed) {
			let indexOffset = 0;
			let mergedIndex = [];
			for (let i = 0; i < geometries.length; ++ i) {
				let index = geometries[i].index;
				for (let j = 0; j < index.count; ++ j) {
					mergedIndex.push(index.getX(j) + indexOffset);
				}
				indexOffset += geometries[i].attributes.position.count;
			}
			mergedGeometry.setIndex(mergedIndex);
		}

		// merge attributes
		for (let name in attributes) {
			let mergedAttribute = GFModel.mergeBufferAttributes(attributes[name]);
			// if (!mergedAttribute) return null;
			mergedGeometry.addAttribute(name, mergedAttribute);
		}

		// merge morph attributes

		for (let name in morphAttributes) {
			let numMorphTargets = morphAttributes[name][0].length;
			if (numMorphTargets === 0) break;

			mergedGeometry.morphAttributes = mergedGeometry.morphAttributes || {};
			mergedGeometry.morphAttributes[name] = [];

			for (let i = 0; i < numMorphTargets; ++ i) {
				let morphAttributesToMerge = [];
				for (let j = 0; j < morphAttributes[name].length; ++ j) {
					morphAttributesToMerge.push(morphAttributes[name][j][i]);
				}
				let mergedMorphAttribute = GFModel.mergeBufferAttributes(morphAttributesToMerge);
				// if (! mergedMorphAttribute) return null;
				mergedGeometry.morphAttributes[name].push(mergedMorphAttribute);
			}
		}
		return mergedGeometry;
	}

	/**
	 * @param {Array<THREE.BufferAttribute>} attributes
	 * @return {THREE.BufferAttribute}
	 */
	static mergeBufferAttributes (attributes) {
		const { BufferAttribute } = require('three');
		
		let TypedArray;
		let itemSize;
		let normalized;
		let arrayLength = 0;

		for (let i = 0; i < attributes.length; ++ i) {
			let attribute = attributes[i];
			if (attribute.isInterleavedBufferAttribute) throw new TypeError(`Could not merge geometries: Geometry ${i} has interleaved attribute!`);
			if (TypedArray === undefined) TypedArray = attribute.array.constructor;
			if (TypedArray !== attribute.array.constructor) throw new TypeError(`Could not merge geometries: Geometry ${i} attribute does not match type!`);
			if (itemSize === undefined) itemSize = attribute.itemSize;
			if (itemSize !== attribute.itemSize) throw new TypeError(`Could not merge geometries: Geometry ${i} attribute does not match item size!`);
			if (normalized === undefined) normalized = attribute.normalized;
			if (normalized !== attribute.normalized) throw new TypeError(`Could not merge geometries: Geometry ${i} attribute does not match normalized flag!`);
			arrayLength += attribute.array.length;
		}

		let array = new TypedArray(arrayLength);
		let offset = 0;
		for (let i = 0; i < attributes.length; ++ i) {
			array.set(attributes[i].array, offset);
			offset += attributes[i].array.length;
		}
		return new BufferAttribute(array, itemSize, normalized);
	}
}
Object.defineProperties(GFModel, {
	'MAGIC_NUMBER': { value:0x15122117, },
});

module.exports = { GFModel };