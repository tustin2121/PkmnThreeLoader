// 
const { Math:Math3 } = require('three');

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
}

module.exports = { PAClip };