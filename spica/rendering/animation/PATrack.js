//

const { AnimationUtils } = require('three');

class PATrack {
	constructor({ name, times, values, slopes, interpolation }) {
		if (name === undefined) throw new ReferenceError('PATrack: track name is required!');
		if (times === undefined || times.length === 0) throw new ReferenceError('PATrack: no keyframes are defined!');
		/** @type {string} */
		this.name = name;
		/** @type {Float32Array} */
		this.times = AnimationUtils.convertArray(times, this._timeBufferType);
		/** @type {Float32Array} */
		this.values = AnimationUtils.convertArray(values, this._valueBufferType);
		/** @type {Float32Array} */
		this.slopes = AnimationUtils.convertArray(slopes, this._slopeBufferType);
		
		//TODO interpoation
	}
	
	//TODO shift()
	//TODO scale()
	//TODO trim()
	//TODO validate()
	//TODO optimize()
}
PATrack.prototype.valueType = 'undefined';
PATrack.prototype._timeBufferType = Float32Array;
PATrack.prototype._valueBufferType = Float32Array;
PATrack.prototype._slopeBufferType = Float32Array;
PATrack.prototype._defaultInterpolation = 'linear';


class PANumberTrack {
	constructor(opts) {
		super(opts);
	}
}
PANumberTrack.prototype.valueType = 'number';


class PAVectorTrack {
	constructor(opts) {
		super(opts);
	}
}
PAVectorTrack.prototype.valueType = 'vector';


class PAColorTrack {
	constructor(opts) {
		super(opts);
	}
}
PAColorTrack.prototype.valueType = 'color';


class PAQuaternionTrack {
	constructor(opts) {
		super(opts);
	}
}
PAQuaternionTrack.prototype.valueType = 'quaternion';
PAQuaternionTrack.prototype._defaultInterpolation = 'linear';


class PAStringTrack {
	constructor(opts) {
		super(opts);
	}
}
PAStringTrack.prototype.valueType = 'string';
PAStringTrack.prototype._valueBufferType = Array;
PAStringTrack.prototype._defaultInterpolation = 'discrete';


class PABooleanTrack {
	constructor(opts) {
		super(opts);
	}
}
PABooleanTrack.prototype.valueType = 'bool';
PABooleanTrack.prototype._valueBufferType = Array; //TODO UInt8Array
PABooleanTrack.prototype._defaultInterpolation = 'discrete';


module.exports = { 
	PATrack, 
	PANumberTrack, PAVectorTrack, PAColorTrack,
	PAQuaternionTrack, PAStringTrack, PABooleanTrack,
};