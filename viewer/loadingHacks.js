
function findAnimTrack(name, mot) {
	if (mot.skeletonAnimation) {
		for (let b of mot.skeletonAnimation.bones) {
			if (b.name === name) return b;
		}
	}
	if (mot.materialAnimation) {
		for (let b of mot.materialAnimation.materials) {
			if (b.name === name) return b;
		}
	}
	if (mot.visibilityAnimation) {
		for (let b of mot.visibilityAnimation.visibilities) {
			if (b.name === name) return b;
		}
	}
	if (mot.effectTriggers) {
		for (let b of mot.effectTriggers.tracks) {
			if (b.name === name) return b;
		}
	}
	return null;
}


const OBJ = {
	megasteelix(files) {
		[
			...files[4].motionpacks[0].animations, files[4].motionpacks[0].extradata[7],
			...files[5].motionpacks[0].animations, files[5].motionpacks[0].extradata[7],
			...files[6].motionpacks[0].animations, files[6].motionpacks[0].extradata[7],
			...files[7].motionpacks[0].animations, files[7].motionpacks[0].extradata[7],
		].forEach(mot=>{
			zeroPosition(findAnimTrack("FeelerG3", mot));
			zeroPosition(findAnimTrack("FeelerI3", mot));
			zeroPosition(findAnimTrack("FeelerK3", mot));
			zeroPosition(findAnimTrack("FeelerM3", mot));
			zeroPosition(findAnimTrack("FeelerO3", mot));
			zeroPosition(findAnimTrack("FeelerQ3", mot));
		});
		return;
		function zeroPosition(track) {
			if (!track || !track.transX) return;
			track.transX.push({ frame:0, value:0, slope:0 });
			track.transY.push({ frame:0, value:0, slope:0 });
			track.transZ.push({ frame:0, value:0, slope:0 });
		}
	},
	vivillion(files) {
		//TODO rename vivillion skins to a generic name
		//TODO remove all visibility tracks for all other variations of vivillion,
		// and rename the remaining to the generic name
		
	},
};


module.exports = function(name, files) {
	if (typeof OBJ[name] === 'function') {
		OBJ[name](files);
	}
};