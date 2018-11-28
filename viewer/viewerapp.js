// viewerapp.js
//
/* global $, window, document, SPICA, THREE */

if (!Object.hasOwnProperty(THREE.Vector3.prototype, 'toString')) {
	THREE.Vector3.prototype.toString = function(){
		return `Vector3(${this.x}, ${this.y}, ${this.z})`;
	};
}

let raf = window.requestAnimationFrame;

class ViewerApp {
	constructor() {
		this.$view = $('#view');
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setClearColor(new THREE.Color(0x325d82), 1.0);
		this.$view.append(this.renderer.domElement);
		
		if (window.gli) {
			window.addEventListener('load', ()=>{
				new gli.host.HostUI(gli.host.inspectContext(this.renderer.domElement, this.renderer.context));
				raf = window.requestAnimationFrame;
			});
		}

		this.scene = new THREE.Scene();
		this.scene.add(new THREE.GridHelper(200, 20));
		this.scene.add(new THREE.AxesHelper(50));
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
		this.populate_modelTab(info);
		this.populate_textureTab(info);
		this.populate_boneTab(info);
		this.populate_animTab(info);
		this.populate_xanimTab(info);
		this.populate_shadersTab(info);
		this.populate_metaTab(info);
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
		root.add(model.toThree());
	}
	
	async displayModelpack(pak) {
		root.add(await pak.toThree());
		
		if (root.children[0] && root.children[0].children[0] && root.children[0].children[0].skeleton) {
			let node = new THREE.SkeletonHelper(root.children[0].children[0].skeleton.bones[0]);
			node.name = 'Mon Skeleton';
			node.visible = $('#props input[name=poptSkeleton]').is(':checked');
			root.add(node);
			this.debugNodes['skeletonHelper'] = node;
			global.info.markSkeleton(root.children[0].children[0].skeleton.bones);
		}
	}
	
	async displayPokemonModel() {
		let paks = global.loadedFiles;
		$('#pokemonDisplayOpts').show();
		$('#modelList').hide();
		$('#pokemonDisplayOpts input').prop('disabled', false);
		{
			let combined = new SPICA.gf.GFModelPack();
			combined.merge(paks[0].modelpack);
			let val = $(`#props input[name=poptColor]:checked`).val();
			switch (val) {
				case 'normal': combined.merge(paks[1].modelpack); break;
				case 'shiny': combined.merge(paks[2].modelpack); break;
				case 'shadow': combined.merge(paks[3].modelpack); break;
			}
			let mon = await combined.toThreePokemon();
			mon.name = "Pokemon";
			if (mon.children[1]) {
				this.debugNodes['shadowModel'] = mon.children[1];
				mon.children[1].visible = $('#props input[name=poptShadow]').is(':checked');;
			}
			mon.shadowLight = this.dirLight;
			this.root.add(mon);
			
			this.animMixer = mon.animMixer;
			{
				let node = new THREE.SkeletonHelper(mon.skeleton.bones[0]);
				node.name = 'Mon Skeleton';
				node.visible = $('#props input[name=poptSkeleton]').is(':checked');
				this.root.add(node);
				this.debugNodes['skeletonHelper'] = node;
				global.info.markSkeleton(mon.children[0].skeleton.bones);
			}
		}{
			let node = new THREE.Group();
			node.name = 'Meta Info';
			{
				let point = new THREE.Mesh(new THREE.SphereBufferGeometry(), new THREE.MeshBasicMaterial());
				point.position.copy(paks[8].meta1.unk07);
				node.add(point);
			}{
				let box = new THREE.Box3(paks[8].meta1.boundingBoxMin, paks[8].meta1.boundingBoxMax);
				let help = new THREE.Box3Helper(box);
				node.add(help);
			}
			node.visible = $('#props input[name=poptMeta]').is(':checked');
			this.root.add(node);
			this.debugNodes['metaHelper'] = node;
		}{
			let box = new THREE.Box3(paks[0].modelpack.models[0].boundingBoxMin, paks[0].modelpack.models[0].boundingBoxMax);
			let help = new THREE.Box3Helper(box, 0x00FF00);
			help.name = 'Model Boundries';
			help.visible = $('#props input[name=poptModelBound]').is(':checked');
			this.root.add(help);
			this.debugNodes['boundingHelper'] = help;
		}
		this.populateSidebar();
	}

	playAnimation({ clip }={}) {
		if (this.currAnim) {
			this.currAnim.stop();
			this.currAnim.enable = false;
			this.currAnim = null;
		}
		if (!clip) return;
		this.currAnim = this.animMixer.clipAction(clip);
		this.currAnim.play();
	}
}