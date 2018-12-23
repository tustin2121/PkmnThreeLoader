// 
const { Math:Math3 } = require('three');
const { PATrack } = require('./PATrack');

/**
 * A set of tracks that represent an animation.
 */
class PAClip {
	constructor(name, duration, tracks) {
		this.name = name;
		this.tracks = tracks;
		this.duration = (duration !== undefined)? duration : -1;
		
		this.uuid = Math3.generateUUID();
		
		if (this.duration < 0) this.resetDuration();
	}
	
	resetDuration() {
		let duration = 0;
		for (let track of this.tracks) {
			duration = Math.max(duration, track.times[track.times.length-1]);
		}
		this.duration = duration;
		return this;
	}
	
	trim() {
		for (let track of this.tracks) {
			track.trim(0, this.duration);
		}
		return this;
	}
	optimize() {
		for (let track of this.tracks) {
			track.optimize();
		}
		return this;
	}
	
	validate() {
		let valid = true;
		for (let track of this.tracks) {
			valid &= track.validate();
		}
		return valid;
	}
	
	toJson() {
		let json = {
			name: this.name,
			duration: this.duration,
			uuid: this.uuid,
			tracks: [],
		};
		for (let track of this.tracks) {
			json.tracks.push(track.toJson());
		}
		return json;
	}
	
	static parse(json) {
		let frameTime = 1.0 / (json.fps||1.0);
		let tracks = [];
		for (let track of json.tracks) {
			tracks.push(PATrack.parse(track).scale(frameTime));
		}
		
		return new PAClip(json.name, json.duration, tracks);
	}
}

module.exports = { PAClip };