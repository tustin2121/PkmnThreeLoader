// ShaderOutput.js

const ShaderOutputRegName = {
	Position : 0,
    QuatNormal : 1,
    Color : 2,
    TexCoord0 : 3,
    TexCoord0W : 4,
    TexCoord1 : 5,
    TexCoord2 : 6,
    Invalid7 : 7,
    View : 8,
    Generic : 9,
    InvalidA : 10,
    InvalidB : 11,
    InvalidC : 12,
    InvalidD : 13,
    InvalidE : 14,
    InvalidF : 15,
};

class ShaderOutputReg {
    /**
     * 
     * @param {ShaderOutputRegName} name 
     * @param {uint} mask 
     */
	constructor({ name='', mask=0 }={}) {
        /** @type {number} ShaderOutputRegName */
        this.name = name; 
        /** @type {uint} */
		this.mask = mask;
    }
    
    get nameStr() {
        return Object.entries(ShaderOutputRegName).filter(x=>x[1] == this.name)[0][0];
        // [0] (first object in array) [0] (key name of entry)
    }
}

module.exports = { ShaderOutputReg, ShaderOutputRegName };