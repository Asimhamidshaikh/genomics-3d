// 1. Core Variables
let scene, camera, renderer, controls;
const container = document.getElementById('canvas-container');

// 2. Initialize 3D Environment
function init() {
  // Create Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f19); // Dark space background

  // Create Camera (Field of View, Aspect Ratio, Near plane, Far plane)
  camera = new THREE.PerspectiveCamera(
    60, 
    container.clientWidth / container.clientHeight, 
    0.1, 
    1000
  );
  camera.position.set(0, 0, 40);

  // Create WebGL Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Add Interactive Orbit Controls (rotate with left-click, pan with right-click, zoom with scroll)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Add Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(20, 40, 20);
  scene.add(dirLight);

  // Add Window Resize Listener
  window.addEventListener('resize', onWindowResize);

  // Start Animation Loop
  animate();
}

// 3. Render Loop (Runs continuous updates at 60 FPS)
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// 4. Handle Window Resizing
function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// Run initialization on load
init();

