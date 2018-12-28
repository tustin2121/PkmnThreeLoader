// exportapp.js
//
/* global $, window, document, SPICA, THREE */

if (!Object.hasOwnProperty(THREE.Vector3.prototype, 'toString')) {
	THREE.Vector3.prototype.toString = function(){
		return `Vector3(${this.x}, ${this.y}, ${this.z})`;
	};
}

let raf = window.requestAnimationFrame;

class ExportApp {
	constructor() {
		this.$view = $('#view');
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setClearColor(new THREE.Color(0x325d82), 1.0);
		this.$view.append(this.renderer.domElement);
		
		if (window.gli) {
			/* global gli */
			window.addEventListener('load', ()=>{
				new gli.host.HostUI(gli.host.inspectContext(this.renderer.domElement, this.renderer.context));
				raf = window.requestAnimationFrame;
			});
		}

		this.scene = new THREE.Scene();
		this.scene.add(new THREE.GridHelper(200, 20));
		{
			let x = new THREE.AxesHelper(50);
			x.name = 'AxisHelper';
			this.scene.add(x);
		}
		// this.scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 1.0));
		this.dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
		this.dirLight.position.set(1, 2, 1);
		this.scene.add(this.dirLight);

		this.camera = new THREE.PerspectiveCamera(45, 1, 0.5, 100000);
		this.camera.position.set(0, 200, 200);
		this.scene.add(this.camera);

		this.root = new THREE.Object3D();
		this.root.name = 'Root';
		this.scene.add(this.root);

		this.debugNodes = {};
		this.animMixer = null;
		this.currAnim = null;
		// this.expressionAnims = [];

		this.trackball = new THREE.OrbitControls(this.camera, this.renderer.domElement);
		global.loadedFiles = null;

		this.updateFns = [];
		
		let self = this;
		$('#props > nav > li').on('click', function(){
			$('#props .selected').removeClass('selected');
			$('#props > section').removeClass().addClass(this.className);
			$('#props [name='+$(this).attr('name')+']').addClass('selected');
			self.resetView();
		});
		
		this.init_loadTab();
		this.init_modelTab();
		this.init_shaderTab();
		this.init_animTab();
		
		this.clearDisplay();
	}
	
	get appMode(){ return $('html')[0].className; }
	set appMode(val) { $('html').removeClass().addClass(val); }
	
	resize() {
		this.camera.aspect = this.$view.innerWidth() / this.$view.innerHeight();
		this.camera.updateProjectionMatrix();
		
		this.renderer.setSize(this.$view.innerWidth(), this.$view.innerHeight(), true);
	}
	redraw(dt) {
		if (this.animMixer) {
			this.animMixer.update(dt);
			this.updateFns.forEach(x=>x(dt));
		}
		this.trackball.update();
		this.renderer.render(this.scene, this.camera);
	}
	
	populateSidebar() {
		let info = global.info;
		switch (this.appMode) {
			case 'model':
				this.populate_modelTab(info);
				this.populate_textureTab(info);
				this.populate_boneTab(info);
				this.populate_animTab(info);
				this.populate_xanimTab(info);
				this.populate_shadersTab(info);
				this.populate_metaTab(info);
				break;
			case 'export':
				//TODO
				break;
		}
	}
	
	addDebugNode(name, node) {
		this.debugNodes[name] = node;
		let ui = $(`#props input[debugVis=${name}]`);
		if (ui.length) {
			node.visible = ui.is(':checked');
		} else {
			node.visible = true;
		}
	}
	
	///////////////////////////////////////////////////////////////////////////
	// 3D Display
	
	resetView() {
		$('#view > canvas').show();
		$('#view > div').empty().hide();
	}
	
	clearDisplay() {
		global.loadedFiles = null;
		this.root.remove(...this.root.children);
		this.debugNodes = {};
		this.updateFns = [];
		this.resetView();
		$('#pokemonDisplayOpts input').prop('disabled', true);
	}
	
	async displayModel(model) {
		this.root.add(model.toThree());
	}
	
	async displayModelpack(pak) {
		this.root.add(await pak.toThree());
		
		if (this.root.children[0] && this.root.children[0].children[0] && this.root.children[0].children[0].skeleton) {
			let node = new THREE.SkeletonHelper(this.root.children[0].children[0].skeleton.bones[0]);
			node.name = 'Mon Skeleton';
			node.visible = $('#props input[name=poptSkeleton]').is(':checked');
			this.root.add(node);
			this.debugNodes['skeletonHelper'] = node;
			global.info.markSkeleton(this.root.children[0].children[0].skeleton.bones);
		}
	}
	
	async displayPokemonModel() {
		// Clear any previous pokemon models currently residing in the scene
		this.root.remove(...this.root.children);
		this.debugNodes = {};
		
		let paks = global.loadedFiles;
		let mon = SPICA.gfPkmnModel.toThree(paks);
		this.root.add(mon);
	}
	
	
	

	playAnimation({ clip }={}) {
		
	}
}