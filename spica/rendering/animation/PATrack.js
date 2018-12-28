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
		this.slopes = (slopes)?AnimationUtils.convertArray(slopes, this._slopeBufferType) : null;
		/** @type {string}  */
		this.interpolation = interpolation;
	}
	
	shift(){ return this; } //TODO
	scale(){ return this; } //TODO 
	trim(){ return this; } //TODO 
	validate(){ return this; } //TODO 
	optimize(){ return this; } //TODO 
	
	toJson() {
		let json = {
			name: this.name,
			valueType: this.valueType,
			interpoation: this.interpolation,
			times: AnimationUtils.convertArray(this.times, Array),
			values: AnimationUtils.convertArray(this.values, Array),
			slopes: (this.slopes)?AnimationUtils.convertArray(this.slopes, Array):null,
		};
		return json;
	}
	
	static parse(json) {
		if (json.valueType === undefined) throw new Error(`PATrack: track valueType undefined!`);
		
		let trackClass = PATrack.getClassForValueType(json.valueType);
		//TODO flatten?
		
		return new trackClass(json);
	}
	
	static getClassForValueType(typeName) {
		switch (typeName.toLowerCase()) {
			case 'scalar':
			case 'double':
			case 'float':
			case 'number':
			case 'integer':
				return PANumberTrack;
			case 'vector':
			case 'vector2':
			case 'vector3':
			case 'vector4':
				return PAVectorTrack;
			case 'color':
				return PAColorTrack;
			case 'quaternion':
				return PAQuaternionTrack;
			case 'bool':
			case 'boolean':
				return PABooleanTrack;
			case 'string':
				return PAStringTrack;
		}
		throw new Error(`Unsupported track type: ${typeName}`);
	}
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