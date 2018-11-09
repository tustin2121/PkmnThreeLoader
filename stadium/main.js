//

const raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame;

class Stadium {
	constructor() {
		let scene = this.scene = new THREE.Scene();
		scene.background = new THREE.Color(0x505050);
		
		this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10000);
		this.camera.position.set(0,100,300);
		this.camera.lookAt(0,0,0);
		scene.add(this.camera);
		{
			let light = new THREE.HemisphereLight(0xFFFFFF, 0x444444);
			light.position.set(1,1,1);
			scene.add(light);
		}{
			let geom = new THREE.CircleBufferGeometry(400, 16);
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
			mesh.position.set(0,-1,400);
			mesh.name = 'p1Base';
			mesh.add(new THREE.GridHelper(200, 20, 0xFF4444, 0xFF8888));
			scene.add(mesh);
		}{
			let geom = new THREE.CircleBufferGeometry(100, 16);
			geom.rotateX(-Math.PI/2);
			let mat = new THREE.MeshPhongMaterial({ color:0xCCCCFF, });
			let mesh = new THREE.Mesh(geom, mat);
			mesh.position.set(0,-1,-400);
			mesh.name = 'p2Base';
			mesh.add(new THREE.GridHelper(200, 20, 0x4444FF, 0x8888FF));
			scene.add(mesh);
		}
		scene.add(new THREE.AxesHelper(20));
	}
}

class StadiumApp {
	constructor() {
		let renderer = this.renderer = new THREE.WebGLRenderer({ antialias:true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(window.innerWidth, window.innerHeight);
		// renderer.vr.enabled = true; //When true, sets camera to (0,1.6,0) always (in WebVRManager)
		
		this.stadiumScene = new Stadium();
		this.activeCamera = this.stadiumScene.camera;
		this.trackball = new THREE.OrbitControls(this.activeCamera);
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
