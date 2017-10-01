// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/GFSection.cs

class GFSection {
	constructor(data) {
		if (typeof data === 'string') {
			this.magic = data;
			this.length = 0;
		} else {
			this.magic = data.readPaddedString(8);
			this.length = data.readUint32();
			// this.padding = data.readUint32();
			data.offset += 4; //skip padding
		}
	}
	
	static skipPadding(data) {
		while((data.offset & 0xF) != 0) data.offset++;
	}
}

module.exports = { GFSection };