// 1. Core Variables
let scene, camera, renderer, controls;
let dnaGroup; // Group container to hold all 3D DNA elements

const container = document.getElementById('canvas-container');
const btnGenerate = document.getElementById('btn-generate');
const metricBP = document.getElementById('metric-bp');
const metricStatus = document.getElementById('metric-status');

// Color palette for Nucleotide Base Pairs
const BASE_COLORS = {
  A: 0x3b82f6, // Adenine (Blue)
  T: 0xef4444, // Thymine (Red)
  C: 0xeab308, // Cytosine (Yellow)
  G: 0x22c55e  // Guanine (Green)
};

// 2. Initialize 3D Environment
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f19);

  camera = new THREE.PerspectiveCamera(
    60, 
    container.clientWidth / container.clientHeight, 
    0.1, 
    1000
  );
  camera.position.set(0, 0, 50);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Lighting setup
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight1.position.set(20, 40, 20);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.5); // Soft blue rim light
  dirLight2.position.set(-20, -40, -20);
  scene.add(dirLight2);

  // Initialize DNA Group container
  dnaGroup = new THREE.Group();
  scene.add(dnaGroup);

  // Setup Event Listeners
  btnGenerate.addEventListener('click', () => generateDNA(30));
  window.addEventListener('resize', onWindowResize);

  // Generate initial DNA strand
  generateDNA(30);

  animate();
}

// 3. Procedural 3D DNA Helix Generator Algorithm
function generateDNA(numPairs = 30) {
  // Clear existing DNA meshes from the scene
  while (dnaGroup.children.length > 0) {
    const obj = dnaGroup.children.pop();
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  }

  metricStatus.textContent = 'Generating...';
  metricStatus.className = 'value';

  const radius = 6;
  const heightStep = 1.5;
  const twistAngle = 0.4; // Radians per step

  const strand1Points = [];
  const strand2Points = [];

  const bases = ['A', 'T', 'C', 'G'];
  const complementary = { A: 'T', T: 'A', C: 'G', G: 'C' };

  for (let i = 0; i < numPairs; i++) {
    const y = (i - numPairs / 2) * heightStep;
    const angle = i * twistAngle;

    // Parametric helical positions
    const x1 = Math.cos(angle) * radius;
    const z1 = Math.sin(angle) * radius;

    const x2 = Math.cos(angle + Math.PI) * radius;
    const z2 = Math.sin(angle + Math.PI) * radius;

    const pos1 = new THREE.Vector3(x1, y, z1);
    const pos2 = new THREE.Vector3(x2, y, z2);

    strand1Points.push(pos1);
    strand2Points.push(pos2);

    // Pick random base pair (A-T or C-G)
    const base1 = bases[Math.floor(Math.random() * bases.length)];
    const base2 = complementary[base1];

    // Create Base Pair connecting rungs
    createBasePair(pos1, pos2, base1, base2);
  }

  // Build 3D Backbone Tubes
  createBackboneTube(strand1Points, 0x38bdf8); // Strand 1 cyan
  createBackboneTube(strand2Points, 0x818cf8); // Strand 2 indigo

  // Update UI Metrics
  metricBP.textContent = numPairs;
  metricStatus.textContent = 'Active';
  metricStatus.className = 'value text-green';
}

// Helper: Create 3D Backbone Strand
function createBackboneTube(points, colorHex) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 100, 0.4, 8, false);
  const material = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.3,
    metalness: 0.2
  });
  const tube = new THREE.Mesh(geometry, material);
  dnaGroup.add(tube);
}

// Helper: Create Color-Coded Base Pair Spheres & Connectors
function createBasePair(p1, p2, base1, base2) {
  const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

  // Half-rung 1
  const geom1 = new THREE.CylinderGeometry(0.25, 0.25, p1.distanceTo(midpoint), 8);
  geom1.translate(0, p1.distanceTo(midpoint) / 2, 0);
  geom1.rotateX(Math.PI / 2);

  const mat1 = new THREE.MeshStandardMaterial({ color: BASE_COLORS[base1] });
  const mesh1 = new THREE.Mesh(geom1, mat1);
  mesh1.position.copy(p1);
  mesh1.lookAt(midpoint);
  dnaGroup.add(mesh1);

  // Half-rung 2
  const geom2 = new THREE.CylinderGeometry(0.25, 0.25, p2.distanceTo(midpoint), 8);
  geom2.translate(0, p2.distanceTo(midpoint) / 2, 0);
  geom2.rotateX(Math.PI / 2);

  const mat2 = new THREE.MeshStandardMaterial({ color: BASE_COLORS[base2] });
  const mesh2 = new THREE.Mesh(geom2, mat2);
  mesh2.position.copy(p2);
  mesh2.lookAt(midpoint);
  dnaGroup.add(mesh2);

  // Nucleotide node spheres
  const sphereGeom = new THREE.SphereGeometry(0.6, 16, 16);
  const node1 = new THREE.Mesh(sphereGeom, mat1);
  node1.position.copy(p1);
  dnaGroup.add(node1);

  const node2 = new THREE.Mesh(sphereGeom, mat2);
  node2.position.copy(p2);
  dnaGroup.add(node2);
}

// 4. Render Loop with Continuous Auto-Rotation
function animate() {
  requestAnimationFrame(animate);

  // Slowly spin the double helix for a dynamic cinematic view
  if (dnaGroup) {
    dnaGroup.rotation.y += 0.005;
  }

  controls.update();
  renderer.render(scene, camera);
}

// 5. Handle Window Resizing
function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

init();
  
