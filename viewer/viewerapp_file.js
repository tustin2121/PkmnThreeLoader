// viewerapp_files.js
//
/* global $, window, document, ViewerApp, ModelInfo, SPICA, THREE */

Object.assign(ViewerApp.prototype, {
	init_loadTab() {
		let self = this;
		$('#props .file').on('dblclick', function(){
			let chooser = $('#fileChooser');
			chooser.unbind('change').val('').on('change', ()=>{
				let file = chooser.val();
				$(this).val(file);
				if ($(this).attr('name') === 'loadPkmnFile0') {
					if (!$('#props input[name=loadPkmnFileAuto]').is(':checked')) return;
					self.fillPkmnFilePaths(file);
				}
			});
			chooser.trigger('click');
		});
		
		$('#props button[name=loadPkmnFileBtn]').on('click', ()=>this.loadPokemonFiles());
		$('#props button[name=loadTrainerBtn]').on('click', ()=>this.loadTrainerFiles());
		$('#props button[name=loadBattleFileBtn]').on('click', ()=>this.loadBattleFiles());
		$('#props button[name=loadOtherFileBtn]').on('click', ()=>this.loadOtherFile());
	},
	
	async loadPokemonFiles() {
		global.info = new ModelInfo('pokemon');
		this.clearDisplay();
		this.appMode = 'model';
		let filenames = new Array(9);
		for (let i = 0; i <= 8; i++) {
			let file = $(`#props input[name=loadPkmnFile${i}]`).val();
			console.log(i, file);
			if (!file) continue;
			filenames[i] = file;
		}
		global.loadedFiles = await SPICA.openPokemonPack(filenames);
		let loadHack = $('#props select[name=hackName]').val();
		if (loadHack) {
			require('./loadingHacks')(loadHack, global.loadedFiles);
		}
		for (let i = 0; i <= 8; i++) {
			console.log(i, global.loadedFiles[i]);
		}
		this.displayPokemonModel();
		this.populateSidebar();
	},
	
	async loadTrainerFiles() {
		let ttype = $(`#props input[name=loadTrainerType]:checked`).val();
		
		global.info = new ModelInfo(ttype); //trainer or overworld
		this.clearDisplay();
		this.appMode = 'model';
		let filename = $(`#props input[name=loadTrainer0]`).val();
		global.info.markTexturePack(0);
		global.loadedFiles = await SPICA.open(filename);
		console.log(global.loadedFiles);
		if (global.loadedFiles.modelpack) {
			await this.displayModelpack(global.loadedFiles.modelpack);
		}
		if (global.loadedFiles.motionpack) {
			this.animMixer = new THREE.AnimationMixer(root.children[0].children[0]);
		}
		this.populateSidebar();
	},
	
	async loadBattleFiles() {
		global.info = new ModelInfo('battlefield');
		this.clearDisplay();
		this.appMode = 'model';
		let filename = $(`#props input[name=loadBattleFile0]`).val();
		global.loadedFiles = await SPICA.open(filename);
		console.log(global.loadedFiles);
		if (global.loadedFiles.modelpack) {
			await this.displayModelpack(global.loadedFiles.modelpack[0]);
		}
		if (global.loadedFiles.motionpack) {
			this.animMixer = new THREE.AnimationMixer(root.children[0].children[0]);
		}
		this.populateSidebar();
	},
	
	async loadOtherFile() {
		global.info = new ModelInfo();
		this.clearDisplay();
		this.appMode = 'model';
		let filename = $(`#props input[name=loadOtherFile0]`).val();
		global.loadedFiles = await SPICA.open(filename);
		console.log(global.loadedFiles);
		if (global.loadedFiles.modelpack) {
			this.displayModelpack(global.loadedFiles.modelpack[0]);
		}
		if (global.loadedFiles.motion) {
			global.info.markAnimationPack(0);
			for (let anim of global.loadedFiles.motion) {
				global.info.markAnimation(anim.index, anim);
			}
		}
		this.populateSidebar();
	},
	
	fillPkmnFilePaths(file0) {
		if (typeof file0 !== 'string' || !file0) return;
		const fs = require('fs');
		const PATH = require('path');
		
		const folders = [
			'1 (Model)', '2 (Tex)', '3 (Shiny Tex)', '4 (Amie Tex)', '5 (Fight Anim)',
			'6 (Amie Anim)', '7 (Basic Anim)', '8 (Misc Anim)', '9 (Extra)',
		];
		let comp = PATH.parse(file0);
		delete comp.base;
		
		let pathset = [];
		if (comp.name === '0') {
			for (let i = 1; i <= 8; i++) pathset.push( Object.assign({}, comp, { name:`${i}`}) );
		}
		else if (comp.name.endsWith('0')) {
			const name = comp.name.slice(0, -1);
			for (let i = 1; i <= 8; i++) pathset.push( Object.assign({}, comp, { name:`${name}${i}`}) );
		}
		else if (comp.name === '1') {
			for (let i = 2; i <= 9; i++) pathset.push( Object.assign({}, comp, { name:`${i}`}) );
		}
		else if (comp.name.endsWith('1')) {
			const name = comp.name.slice(0, -1);
			for (let i = 2; i <= 9; i++) pathset.push( Object.assign({}, comp, { name:`${name}${i}`}) );
		}
		else if (comp.dir.endsWith(folders[0])) {
			const dir = comp.dir.slice(0, -(folders[0].length));
			for (let i = 1; i <= 8; i++) pathset.push( Object.assign({}, comp, { dir:`${dir}${folders[i]}`}) );
		}
		
		if (pathset.length === 0) return;
		pathset.map(x=> PATH.format(x) ).forEach((val, i)=>{
			if (!fs.existsSync(val)) return; //skip
			$(`#props .file[name=loadPkmnFile${i+1}]`).val(val);
		});
	},
});