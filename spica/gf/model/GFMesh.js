// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Model/Mesh/GFMesh.cs

const { GFSection } = require('../GFSection');
const { PICACommandReader, PICARegister } = require('../../pica');
const {
	Vector4, PICAAttributeName, PICAFixedAttribute, PICAAttribute,
} = require('../../pica/commands');

const SCALES = [ 1/127, 1/255, 1/65535, 1 ];

class GFSubMesh {
	constructor(obj) {
		this.hash = null;
		this.name = null;
		
		this.boneIndicesCount = null;
		this.boneIndices = null;
		
		this.indicesCount = null;
		this.indicesLength = null;
		this.verticesCount = null;
		this.verticesLength = null;
		this.vertexStride = null;
		
		this.indices = null; // ushort[]
		this.rawBuffer = null; // byte[]
		
		Object.assign(this, obj);
		
		Object.defineProperties(this, {
			attributes: {
				value: [],
				enumerable: true,
				writable: false,
			},
			fixedAttributes: {
				value: [],
				enumerable: true,
				writable: false,
			}
		});
	}
}

class GFMesh {
	constructor(data) {
		this.submeshes = [];
		let meshSection = new GFSection(data);
		
		let pos = data.offset;
		this.hash = data.readUint32();
		this.name = data.readPaddedString(0x40);
		
		data.skip(4);
		
		this.boundingBoxMin = data.readVector4();
		this.boundingBoxMax = data.readVector4();
		let submeshCount = data.readUint32();
		this.boneIndiciesPerVertex = data.readInt32();
		data.skip(0x10); //padding
		
		// ???
		let cmdList = [];
		{
			let len, idx, count;
			do {
				len   = data.readUint32();
				idx   = data.readUint32();
				count = data.readUint32();
				data.skip(4);
				
				let cmds = new Array(len >> 2);
				for (let i = 0; i < cmds.length; i++) {
					cmds[i] = data.readUint32();
				}
				cmdList.push(cmds);
			} while (idx < count - 1);
		}
		
		// Add SubMesh with Hash, Name and Bone Indices
		// The rest is added latter (because the data is split inside the file) --gdkchan
		for (let i = 0; i < submeshCount; i++) {
			let hash = data.readUint32();
			let name = data.readIntLenString();
			let boneIndicesCount = data.readUint8();
			let boneIndices = new Array(0x1F);
			for (let bone = 0; bone < boneIndices.length; bone++) {
				boneIndices[bone] = data.readUint8();
			}
			boneIndices.length = boneIndicesCount;
			
			this.submeshes.push(new GFSubMesh({
				boneIndices, boneIndicesCount,
				
				verticesCount: data.readUint32(),
				indicesCount: data.readUint32(),
				verticesLength: data.readUint32(),
				indicesLength: data.readUint32(),
				
				hash, name,
			}));
		}
		
		for (let i = 0; i < submeshCount; i++) {
			let SM = this.submeshes[i];
			
			let enableCmds  = cmdList[i * 3 + 0];
			let disableCmds = cmdList[i * 3 + 1];
			let indexCmds   = cmdList[i * 3 + 2];
			
			let cmdReader;
			cmdReader = new PICACommandReader(enableCmds);
			
			let fixedIndex = 0;
			let fixed = new Array(12);
			for(let i = 0; i < fixed.length; i++) fixed[i] = [];
			
			/** @type {ulong} js doesn't do longs, so split into two ints */
			let bufferFormats_L = 0;
			let bufferFormats_H = 0;
			let bufferAttr_L = 0;
			let bufferAttr_H = 0;
			let bufferPermutation_L = 0;
			let bufferPermutation_H = 0;
			/** @type {int} */
			let attrCount = 0;
			let attrTotal = 0;
			let vertexStride = 0;
			
			while (cmdReader.hasCommand) {
				let cmd = cmdReader.getCommand();
				let param = cmd.parameters[0];
				
				switch (cmd.register) {
					case PICARegister.GPUREG_ATTRIBBUFFERS_FORMAT_LOW:  bufferFormats_L |= param; break;
					case PICARegister.GPUREG_ATTRIBBUFFERS_FORMAT_HIGH: bufferFormats_H |= param; break;
					case PICARegister.GPUREG_ATTRIBBUFFER0_CONFIG1: bufferAttr_L |= param; break;
					case PICARegister.GPUREG_ATTRIBBUFFER0_CONFIG2:
						bufferAttr_H |= (param & 0xFFFF);
						vertexStride = (param >> 16) & 0xFF;
						attrCount = (param >> 28);
						break;
					case PICARegister.GPUREG_FIXEDATTRIB_INDEX: fixedIndex = param; break;
					case PICARegister.GPUREG_FIXEDATTRIB_DATA0: fixed[fixedIndex][0] = param; break;
					case PICARegister.GPUREG_FIXEDATTRIB_DATA1: fixed[fixedIndex][1] = param; break;
					case PICARegister.GPUREG_FIXEDATTRIB_DATA2: fixed[fixedIndex][2] = param; break;
					case PICARegister.GPUREG_VSH_NUM_ATTR: attrTotal = (param + 1); break;
					case PICARegister.GPUREG_VSH_ATTRIBUTES_PERMUTATION_LOW:  bufferPermutation_L |= param; break;
					case PICARegister.GPUREG_VSH_ATTRIBUTES_PERMUTATION_HIGH: bufferPermutation_H |= param; break;
				}
			}
			for (let i = 0; i < fixed.length; i++) {
				let v = new Vector4();
				v.setFrom24Bits(...fixed[i]);
				fixed[i] = v;
			}
			
			for (let i = 0; i < attrCount; i++) {
				// if (((BufferFormats >> (48 + Index)) & 1) != 0)
				if (((bufferAttr_H >> (16 + i)) & 1) !== 0) {
					// PICAAttributeName Name = (PICAAttributeName)((BufferPermutation >> Index * 4) & 0xf);
					let name;
					if (i < 8) {
						name = (bufferPermutation_L >> ((i-0)*4));
					} else {
						name = (bufferPermutation_H >> ((i-8)*4));
					}
					
					let scale = (name === PICAAttributeName.Color || name === PICAAttributeName.BoneWeight)? SCALES[1] : 1;
					SM.fixedAttributes.push(new PICAFixedAttribute({
						name, value: fixed[i].multiplyScalar(scale),
					}));
				} else {
					let attrName, attrFmt;
					// int PermutationIdx = (int)((BufferAttributes  >> Index          * 4) & 0xf);
					// int AttributeName  = (int)((BufferPermutation >> PermutationIdx * 4) & 0xf);
					// int AttributeFmt   = (int)((BufferFormats     >> PermutationIdx * 4) & 0xf);
					let permIdx = ((i<8)? (bufferAttr_L >> (i*4)) : (bufferAttr_H >> ((i-8)*4))) & 0xF;
					if (permIdx<8) {
						attrName = (bufferPermutation_L >> permIdx*4) & 0xF;
						attrFmt  = (bufferFormats_L     >> permIdx*4) & 0xF;
					} else {
						permIdx -= 8;
						attrName = (bufferPermutation_H >> permIdx*4) & 0xF;
						attrFmt  = (bufferFormats_H     >> permIdx*4) & 0xF;
					}
					
					let attrib = new PICAAttribute({
						name : attrName,
						format : (attrFmt & 3),
						elements : (attrFmt >> 2) + 1,
						scale : SCALES[attrFmt & 3],
					});
					if (attrib.Name == PICAAttributeName.BoneIndex) attrib.scale = 1;
					SM.attributes.push(attrib);
				}
			}
			
			cmdReader = new PICACommandReader(indexCmds);
			let indexFmt = false;
			let primitiveCount = 0;
			
			while (cmdReader.hasCommand) {
				let cmd = cmdReader.getCommand();
				let param = cmd.parameters[0];
				switch (cmd.register) {
					case PICARegister.GPUREG_INDEXBUFFER_CONFIG: indexFmt = (param >> 31) !== 0; break;
					case PICARegister.GPUREG_NUMVERTICES: primitiveCount = param; break;
				}
			}
			SM.rawBuffer = data.readBytes(SM.verticesLength);
			SM.vertexStride = vertexStride;
			SM.indices = new Array(primitiveCount);
			
			{
				let pos0 = data.offset;
				for (let i = 0; i < primitiveCount; i++) {
					SM.indices[i] = (indexFmt)? data.readUint16() : data.readUint8();
				}
				data.offset = pos0 + SM.indicesLength;
			}
		}
		
		data.offset = pos + meshSection.length;
	}
}

module.exports = { GFMesh, GFSubMesh };
