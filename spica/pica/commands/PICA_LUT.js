//

const PICALUTScale = {
	One : 0,
	Two : 1,
	Four : 2,
	Eight : 3,
	Quarter : 6,
	Half : 7,
};
PICALUTScale.toFloat = function(scale) {
	switch (scale) {
		case PICALUTScale.One:		return 1;
		case PICALUTScale.Two:		return 2;
		case PICALUTScale.Four:		return 4;
		case PICALUTScale.Eight:	return 8;
		case PICALUTScale.Quarter:	return 0.25;
		case PICALUTScale.Half:		return 0.50;
	}
	throw new TypeError(`Invalid scale value! ${scale}`);
};

const PICALUTInput = {
	CosNormalHalf : 0,
	CosViewHalf : 1,
	CosNormalView : 2,
	CosLightNormal : 3,
	CosLightSpot : 4,
	CosPhi : 5,
};

const PICALUTType = {
	Dist0    : 0,
	Dist1    : 1,
	Fresnel  : 3,
	ReflecR  : 4,
	ReflecG  : 5,
	ReflecB  : 6,
	Spec0    : 8,
	Spec1    : 9,
	Spec2    : 10,
	Spec3    : 11,
	Spec4    : 12,
	Spec5    : 13,
	Spec6    : 14,
	Spec7    : 15,
	DistAtt0 : 16,
	DistAtt1 : 17,
	DistAtt2 : 18,
	DistAtt3 : 19,
	DistAtt4 : 20,
	DistAtt5 : 21,
	DistAtt6 : 22,
	DistAtt7 : 23,
};

class PICALUTInAbs {
	constructor(param) {
		this.dist0		= (param & 0x00000002) === 0;
		this.dist1		= (param & 0x00000020) === 0;
		this.specular	= (param & 0x00000200) === 0;
		this.fresnel	= (param & 0x00002000) === 0;
		this.reflectR	= (param & 0x00020000) === 0;
		this.reflectG	= (param & 0x00200000) === 0;
		this.reflectB	= (param & 0x02000000) === 0;
	}
	//TODO ? https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/Commands/PICALUTInAbs.cs#L24
	toUint32() { throw new Error('Not implemented'); }
}

class PICALUTInScale {
	constructor(param) {
		/** @type {PICALUTScale} */
		this.dist0		= ((param >>  0) & 7);
		this.dist1		= ((param >>  4) & 7);
		this.specular	= ((param >>  8) & 7);
		this.fresnel	= ((param >> 12) & 7);
		this.reflectR	= ((param >> 16) & 7);
		this.reflectG	= ((param >> 20) & 7);
		this.reflectB	= ((param >> 24) & 7);
	}
	// TODO ? https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/Commands/PICALUTInScale.cs#L24
	toUint32() { throw new Error('Not implemented'); }
}

class PICALUTInSel {
	constructor(param) {
		/** @type {PICALUTInput} */
		this.dist0		= ((param >>  0) & 7);
		this.dist1		= ((param >>  4) & 7);
		this.specular	= ((param >>  8) & 7);
		this.fresnel	= ((param >> 12) & 7);
		this.reflectR	= ((param >> 16) & 7);
		this.reflectG	= ((param >> 20) & 7);
		this.reflectB	= ((param >> 24) & 7);
	}
	// TODO ? https://github.com/gdkchan/SPICA/blob/master/SPICA/PICA/Commands/PICALUTInSel.cs#L24
	toUint32() { throw new Error('Not implemented'); }
}

module.exports = {
	PICALUTInAbs,
	PICALUTInScale,
	PICALUTInSel,
	PICALUTScale,
	PICALUTInput,
	PICALUTType,
};