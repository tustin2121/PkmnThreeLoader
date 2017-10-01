// https://github.com/gdkchan/SPICA/blob/master/SPICA/Formats/GFL2/Model/GFLUT.cs

const { PICACommandReader, PICARegister } = require('../../pica');

class GF_LUT {
	constructor(data, samplerName, len) {
		this.type = 0; /** @type {PICALUTType} */
		this._table = new Array(256); /** @type {float} */
		this.hash = 0;
		this.name = '';
		
		if (!data) return this;
		
		this.hash = data.readUint32();
		this.name = samplerName;
		
		data.skip(0xC);
		let commands = new Array(len >> 2);
		for (let i = 0; i < commands.length; i++) {
			commands[i] = data.readUint32();
		}
		
		let idx = 0;
		let cmdReader = new PICACommandReader(commands);
		while (cmdReader.hasCommand) {
			let cmd = cmdReader.getCommand();
			if (cmd.register === PICARegister.GPUREG_LIGHTING_LUT_INDEX) {
				idx = cmd.parameters[0] & 0xFF;
			}
			else if (
				cmd.register >= PICARegister.GPUREG_LIGHTING_LUT_DATA0 &&
				cmd.register <= PICARegister.GPUREG_LIGHTING_LUT_DATA7
			) {
				for (let param of cmd.parameters) {
					this._table[idx++] = (param & 0xFFF) / 0xFFF;
				}
			}
		}
	}
	
	get table() { return this._table; }
	set table(val) {
		if (!Array.isArray(val)) throw new TypeError('Table must be an array!');
		if (val.length != 256) throw new RangeError('Table must be exactly 256 long!');
		this._table = val;
	}
}
module.exports = { GF_LUT };