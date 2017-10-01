// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Model/GFLUT.cs

class GF_LUT {
	constructor(data, samplerName, len) {
		this._table = new Array(256);
		
		this.hash = data.readUint32();
		this.name = samplerName;
		
		dara.skip(0xC);
		let commands = new Array(len >> 2);
		for (let i = 0; i < commands.length; i++) {
			commands[i] = data.readUint32();
		}
		
		let idx = 0;
		//TODO PICACommandReader
	}
	
	get table() { return this._table; }
	set table(val) {
		if (!Array.isArray(val)) throw new TypeError('Table must be an array!');
		if (val.length != 256) throw new RangeError('Table must be exactly 256 long!');
		this._table = val;
	}
}
module.exports = { GF_LUT };