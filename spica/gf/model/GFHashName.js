// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Model/GFHashName.cs

const BufferedReader = require('../../BufferedReader');

class GFHashName {
	constructor(data) {
		if (data instanceof BufferedReader) {
			this.hash = data.readUint32();
			this.name = data.readByteLenString();
		} else {
			this.hash = data.hash;
			this.name = data.name;
		}
	}
	toString() { return this.name; }
	valueOf() { return this.name; }
}
module.exports = { GFHashName };