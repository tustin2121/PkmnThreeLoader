The following are goals of the animation system rewrite:

- Several clips need to play in sequence in order to make some 
  actions. It's not just one clip = one action.
- Some clips have events that get triggered on certain frames,
  which the old system doesn't support.
- Some clips need to overlay on top of other clips, though the
  use of Unity-like "avatars" (animation masks), or effectiveness
  tracks.
- The original data has slope information which the Three.js
  animation system does not support.


Layering:
The animations are layered in such a way where they can override 
one another. Individual animations or tracks can determine how their
animation data should be blended over the zero pose. The default 
is "replace", but it can be "additive" as well. 
- Layer 0 - Output
- Layer 1 - Zero Pose
- Layer 2 - Contstant Animation
- Layer 3 - Normal Animation 1
- Layer 4 - Normal Animation 2 (fading animation)
- Layer 5 - IK Animation
- Layer 6 - Emotion Animation


update(dt)
-> goes through all tracks of all active animations
  -> Calculates output of each track for each animation, puts them in layer matrix
  -> Loops through all properties object matrixies
	-> calculates the final value
	-> assigns final values to object properties
  
