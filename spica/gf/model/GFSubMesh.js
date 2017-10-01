// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Model/Mesh/GFSubMesh.cs

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
module.exports = { GFSubMesh };
