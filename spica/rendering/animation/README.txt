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

