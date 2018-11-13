//
const raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame;

const CAM_NEAR_PLANE = 0.1;
const CAM_FAR_PLANE = 5000;

class Stadium {
	constructor() {
		let scene = this.scene = new THREE.Scene();
		scene.background = new THREE.Color(0x505050);
		
		this._allCams = [];
		
		{ // Cameras
			let cam = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, CAM_NEAR_PLANE, 100000);
			cam.name = 'DebugCamera';
			cam.position.set(500,300,0);
			cam.lookAt(0,0,0);
			cam.layers.enable(0); // Default Layer
			cam.layers.enable(1); // VR Left Eye Only Layer
			cam.layers.enable(2); // VR Right Eye Only Layer
			cam.layers.enable(3); // Debug Layer
			scene.add(cam);
			this._allCams.push(cam);
			this.debugCam = cam;
		}{
			let cam = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, CAM_NEAR_PLANE, CAM_FAR_PLANE);
			cam.name = 'BehindCamera';
			cam.position.set(100,100,400);
			cam.lookAt(0,0,0);
			cam.layers.enable(0);
			scene.add(cam);
			this._allCams.push(cam);
			this.behindCam = cam;
			let helper = new THREE.CameraHelper(cam);
			helper.layers.mask = 1<<3; // Debug Layer only
			scene.add(helper);
		}{
			let cam = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, CAM_NEAR_PLANE, CAM_FAR_PLANE);
			cam.name = 'WanderCam';
			cam.position.set(100,100,400);
			cam.lookAt(0,0,0);
			cam.layers.enable(0);
			scene.add(cam);
			this._allCams.push(cam);
			this.wanderCam = cam;
			let helper = new THREE.CameraHelper(cam);
			helper.layers.mask = 1<<3; // Debug Layer only
			scene.add(helper);
		}
		
		{ // VR Stage
			let vrStage = new THREE.Group();
			vrStage.name = 'VRStage';
			vrStage.scale.set(100,100,100);
			
			let stage = new THREE.LineSegments(
				new THREE.BoxLineGeometry(3.00, 2.00, 2.00, 9, 6, 6),
				new THREE.LineBasicMaterial({ color:0x808080, }),
			);
			stage.geometry.translate( 0, 1.00, 0 );
			stage.layers.mask = 1<<3; // Debug Layer only
			vrStage.add(stage);
			
			let cam = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 50);
			cam.name = 'VRCamera';
			cam.position.set(0,1.6,0);
			vrStage.add(cam);
			this._allCams.push(cam);
			this.vrCam = cam;
			
			scene.add(vrStage);
			
			let helper = new THREE.CameraHelper(cam);
			helper.layers.mask = 1<<3; // Debug Layer only
			scene.add(helper);
		}
		
		// this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, CAM_NEAR_PLANE, CAM_FAR_PLANE);
		// this.camera.position.set(0,100,300);
		// this.camera.lookAt(0,0,0);
		// scene.add(this.camera);
		{
			let light = new THREE.HemisphereLight(0xFFFFFF, 0x444444);
			light.position.set(1,1,1);
			scene.add(light);
		}{
			let geom = new THREE.CircleBufferGeometry(500, 16);
			geom.rotateX(-Math.PI/2);
			let mat = new THREE.MeshPhongMaterial({ color:0xCCCCCC, });
			let mesh = new THREE.Mesh(geom, mat);
			mesh.name = 'Arena';
			mesh.position.set(0,-2,0);
			scene.add(mesh);
		}{
			let geom = new THREE.CircleBufferGeometry(100, 16);
			geom.rotateX(-Math.PI/2);
			let mat = new THREE.MeshPhongMaterial({ color:0xFFCCCC, });
			let mesh = new THREE.Mesh(geom, mat);
			mesh.position.set(0,-1,200);
			mesh.name = 'p1Base';
			mesh.add(new THREE.GridHelper(200, 20, 0xFF4444, 0xFF8888));
			scene.add(mesh);
		}{
			let geom = new THREE.CircleBufferGeometry(100, 16);
			geom.rotateX(-Math.PI/2);
			let mat = new THREE.MeshPhongMaterial({ color:0xCCCCFF, });
			let mesh = new THREE.Mesh(geom, mat);
			mesh.position.set(0,-1,-200);
			mesh.name = 'p2Base';
			mesh.add(new THREE.GridHelper(200, 20, 0x4444FF, 0x8888FF));
			scene.add(mesh);
		}
		scene.add(new THREE.AxesHelper(20));
	}
	
	resize() {
		let aspect = window.innerWidth / window.innerHeight;
		this._allCams.forEach(x=>{
			x.aspect = aspect;
			x.updateProjectionMatrix();
		});
	}
	
	setBattler(battler, side, pos) {
		
	}
}

class StadiumApp {
	constructor() {
		let renderer = this.renderer = new THREE.WebGLRenderer({ antialias:true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		// renderer.vr.enabled = true; //When true, sets camera to (0,1.6,0) always (in WebVRManager)
		
		this.stadiumScene = new Stadium();
		this.activeCamera = this.stadiumScene.debugCam;
		this.trackball = new THREE.OrbitControls(this.stadiumScene.debugCam);
	}
	
	render() {
		// this.trackball.update();
		this.renderer.render(this.stadiumScene.scene, this.activeCamera);
		raf(()=>this.render());
	}
}

const container = document.getElementById('container');
const APP = new StadiumApp();

container.appendChild(APP.renderer.domElement);

APP.render();
