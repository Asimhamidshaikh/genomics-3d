let scene, camera, renderer, controls;
let dnaGroup;
let raycaster, mouse;
let selectedNode = null;
let dnaData = []; // Array storing sequence data for mutation/inspection

const container = document.getElementById('canvas-container');
const btnGenerate = document.getElementById('btn-generate');
const btnMutate = document.getElementById('btn-mutate');
const metricBP = document.getElementById('metric-bp');
const metricStatus = document.getElementById('metric-status');

const inspectPos = document.getElementById('inspect-pos');
const inspectBase = document.getElementById('inspect-base');
const inspectPair = document.getElementById('inspect-pair');

const BASE_COLORS = {
  A: 0x3b82f6,
  T: 0xef4444,
  C: 0xeab308,
  G: 0x22c55e
};

const BASE_NAMES = {
  A: 'Adenine',
  T: 'Thymine',
  C: 'Cytosine',
  G: 'Guanine'
};

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f19);

  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 0, 50);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // Raycaster for mouse interaction
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight1.position.set(20, 40, 20);
  scene.add(dirLight1);

  dnaGroup = new THREE.Group();
  scene.add(dnaGroup);

  btnGenerate.addEventListener('click', () => generateDNA(30));
  btnMutate.addEventListener('click', mutateSelectedBase);
  window.addEventListener('click', onCanvasClick);
  window.addEventListener('resize', onWindowResize);

  generateDNA(30);
  animate();
}

function generateDNA(numPairs = 30) {
  while (dnaGroup.children.length > 0) {
    const obj = dnaGroup.children.pop();
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  }

  dnaData = [];
  deselectNode();

  const radius = 6;
  const heightStep = 1.5;
  const twistAngle = 0.4;

  const strand1Points = [];
  const strand2Points = [];
  const bases = ['A', 'T', 'C', 'G'];
  const complementary = { A: 'T', T: 'A', C: 'G', G: 'C' };

  for (let i = 0; i < numPairs; i++) {
    const y = (i - numPairs / 2) * heightStep;
    const angle = i * twistAngle;

    const pos1 = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    const pos2 = new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius);

    strand1Points.push(pos1);
    strand2Points.push(pos2);

    const base1 = bases[Math.floor(Math.random() * bases.length)];
    const base2 = complementary[base1];

    dnaData.push({ index: i, base1, base2, pos1, pos2 });
    createBasePair(pos1, pos2, base1, base2, i);
  }

  createBackboneTube(strand1Points, 0x38bdf8);
  createBackboneTube(strand2Points, 0x818cf8);

  metricBP.textContent = numPairs;
  metricStatus.textContent = 'Active';
}

function createBackboneTube(points, colorHex) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 100, 0.4, 8, false);
  const material = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3 });
  dnaGroup.add(new THREE.Mesh(geometry, material));
}

function createBasePair(p1, p2, base1, base2, index) {
  const sphereGeom = new THREE.SphereGeometry(0.7, 16, 16);

  // Strand 1 Sphere Node
  const mat1 = new THREE.MeshStandardMaterial({ color: BASE_COLORS[base1] });
  const node1 = new THREE.Mesh(sphereGeom, mat1);
  node1.position.copy(p1);
  node1.userData = { index, base: base1, pair: base2, strand: 1 };
  dnaGroup.add(node1);

  // Strand 2 Sphere Node
  const mat2 = new THREE.MeshStandardMaterial({ color: BASE_COLORS[base2] });
  const node2 = new THREE.Mesh(sphereGeom, mat2);
  node2.position.copy(p2);
  node2.userData = { index, base: base2, pair: base1, strand: 2 };
  dnaGroup.add(node2);
}

// Interactivity: Raycasting on Canvas Click
function onCanvasClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(dnaGroup.children);

  const sphere = intersects.find(item => item.object.geometry.type === 'SphereGeometry');

  if (sphere) {
    selectNode(sphere.object);
  }
}

function selectNode(node) {
  deselectNode();
  selectedNode = node;
  selectedNode.material.emissive.setHex(0xffff00); // Glow yellow

  const data = selectedNode.userData;
  inspectPos.textContent = `BP #${data.index + 1}`;
  inspectBase.textContent = `${BASE_NAMES[data.base]} (${data.base})`;
  inspectPair.textContent = `${BASE_NAMES[data.pair]} (${data.pair})`;
  btnMutate.disabled = false;
}

function deselectNode() {
  if (selectedNode) {
    selectedNode.material.emissive.setHex(0x000000);
    selectedNode = null;
  }
  inspectPos.textContent = 'None';
  inspectBase.textContent = '--';
  inspectPair.textContent = '--';
  btnMutate.disabled = true;
}

// Point Mutation logic
function mutateSelectedBase() {
  if (!selectedNode) return;

  const data = selectedNode.userData;
  const bases = ['A', 'T', 'C', 'G'].filter(b => b !== data.base);
  const newBase = bases[Math.floor(Math.random() * bases.length)];

  data.base = newBase;
  selectedNode.material.color.setHex(BASE_COLORS[newBase]);

  inspectBase.textContent = `${BASE_NAMES[newBase]} (${newBase}) [MUTATED]`;
}

function animate() {
  requestAnimationFrame(animate);
  if (dnaGroup) dnaGroup.rotation.y += 0.003;
  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

init();
