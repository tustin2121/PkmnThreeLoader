// modelinfo.js
// An encapsulation about info about the model, to be put into global.info
/* global $, window, document */

class DisplayTexture {
	constructor(tex) {
		this.tex = tex;
		this.$canvas = $(`<canvas name="${tex.name}" width="${tex.width}" height="${tex.height}">`);
		this._painted = false;
	}
	
	repaint() {
		if (this._painted) return;
		let ctx = this.$canvas[0].getContext('2d');
		ctx.imageSmoothingEnabled = false;
		let data = this.tex.buffer;
		if (data.length % 4 !== 0) console.log('Data not divisible by 4!');
		for (let i = 0; i < data.length; i += 4) {
			let a = data[i + 3];
			let r = data[i + 0];
			let g = data[i + 1];
			let b = data[i + 2];
			ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
			let x = (i>>2)%this.tex.width;
			let y = this.tex.height - 1 - Math.floor((i>>2)/this.tex.width);
			ctx.fillRect(x, y, 1, 1);
		}
		this._painted = true;
	}
}

class ModelInfo {
	constructor(type='other') {
		this.type = type;
		this.texpak = [{}];
		this.currTexpak = this.texpak[0];
		this.animpak = [{ a:[], x:[] }];
		this.currAnimpak = this.animpak[0];
		this.luts = [];
		this.metadata = {};
		this.bones = [];
	}
	
	get isPokemon(){ return this.type === 'pokemon'; }
	get isBattlefield(){ return this.type === 'battlefield'; }
	get isTrainer(){ return this.type === 'trainer'; }
	get isOverworldModel(){ return this.type === 'overworld'; }
	
	markTexturePack(num) {
		this.currTexpak = this.texpak[num] = {};
	}
	markTexture(tex) {
		this.currTexpak[`${tex.name}`] = new DisplayTexture(tex);
	}
	
	markAnimationPack(num) {
		this.currAnimpak = this.animpak[num] = { a:[], x:[] };
	}
	markAnimation(i, anim) {
		this.currAnimpak.a[i] = { anim };
	}
	markXanim(xanim) {
		if (!xanim || !xanim.length) return;
		this.currAnimpak.x = xanim.slice();
	}
	
	markSkeleton(bones) {
		if (this.bones.length) return; //only mark once
		this.bones = bones;
	}
	
	markLUT(lut) {
		
	}
	markMetadata(data) {
		this.metadata = data;
	}
}