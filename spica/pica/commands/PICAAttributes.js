//

const PICAFragOpMode = {
	Default : 0,
	Gas : 1,
	Shadow : 3,
};

const PICAAttributeFormat = {
	Byte : 0,
	Ubyte : 1,
	Short : 2,
	Float : 3,
};

const PICAAttributeName = {
	Position 		: 0,
	Normal 			: 1,
	Tangent 		: 2,
	Color 			: 3,
	TexCoord0 		: 4,
	TexCoord1 		: 5,
	TexCoord2 		: 6,
	BoneIndex 		: 7,
	BoneWeight 		: 8,
	UserAttribute0 	: 9,
	UserAttribute1 	: 10,
	UserAttribute2 	: 11,
	UserAttribute3 	: 12,
	UserAttribute4 	: 13,
	UserAttribute5 	: 14,
	UserAttribute6 	: 15,
	UserAttribute7 	: 16,
	UserAttribute8 	: 17,
	UserAttribute9 	: 18,
	UserAttribute10 : 19,
	UserAttribute11 : 20,
	Interleave 		: 21,
};

class PICAAttribute {
	constructor({ name, format, elements, scale }) {
		/** @type {PICAAttributeName} */	this.name = name;
		/** @type {PICAAttributeFormat} */	this.format = format;
		/** @type {int} */					this.elements = elements;
		/** @type {float} */				this.scale = scale;
	}
	
	static getAttributes(...names) {
		let output = []; /** @type {List<PICAAttribute>} */
		for (let name of names) {
			switch (name) {
				case PICAAttributeName.Position:
				case PICAAttributeName.Normal:
				case PICAAttributeName.Tangent:
					output.push(new PICAAttribute({
						name,
						format: PICAAttributeFormat.Float,
						elements: 3,
						scale: 1,
					}));
					break;
				
				case PICAAttributeName.TexCoord0:
				case PICAAttributeName.TexCoord1:
				case PICAAttributeName.TexCoord2:
					output.push(new PICAAttribute({
						name,
						format: PICAAttributeFormat.Float,
						elements: 2,
						scale: 1,
					}));
					break;
				
				case PICAAttributeName.Color:
					output.push(new PICAAttribute({
						name,
						format: PICAAttributeFormat.Ubyte,
						elements: 4,
						scale: (1.0 / 255.0),
					}));
					break;
				case PICAAttributeName.BoneIndex:
					output.push(new PICAAttribute({
						name,
						format: PICAAttributeFormat.Ubyte,
						elements: 4,
						scale: 1,
					}));
					break;
				case PICAAttributeName.BoneWeight:
					output.push(new PICAAttribute({
						name,
						format: PICAAttributeFormat.Ubyte,
						elements: 4,
						scale: 0.01,
					}));
					break;
			}
		}
		return output;
	}
}

class PICAFixedAttribute {
	constructor({ name, value }) {
		/** @type {PICAAttributeName} */
		this.name = name;
		/** @type {PICAVectorFloat24} */
		this.value = value;
	}
}

module.exports = {
	PICAAttribute,
	PICAAttributeFormat,
	PICAAttributeName,
	PICAFixedAttribute,
	PICAFragOpMode,
};