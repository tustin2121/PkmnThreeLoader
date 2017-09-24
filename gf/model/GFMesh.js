// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Model/Mesh/GFMesh.cs

const { GFSection } = require('../GFSection');
const { GFSubMesh } = require('./GFSubMesh');

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
			
			//TODO PICACommandReader
		}
		
		data.offset = pos + meshSection.length;
	}
}
module.exports = { GFMesh };
