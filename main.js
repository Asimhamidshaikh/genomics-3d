let scene, camera, renderer, controls;
let dnaGroup;
let raycaster, mouse;
let selectedNode = null;
let dnaData = [];

const container = document.getElementById('canvas-container');
const btnGenerate = document.getElementById('btn-generate');
const btnMutate = document.getElementById('btn-mutate');
const btnLoadFasta = document.getElementById('btn-load-fasta');
const btnExportPdb = document.getElementById('btn-export-pdb');
const fastaInput = document.getElementById('fasta-input');

const metricBP = document.getElementById('metric-bp');
const metricStatus = document.getElementById('metric-status');
const inspectPos = document.getElementById('inspect-pos');
const inspectBase = document.getElementById('inspect-base');
const inspectPair = document.getElementById('inspect-pair');

const BASE_COLORS = { A: 0x3b82f6, T: 0xef4444, C: 0xeab308, G: 0x22c55e };
const BASE_NAMES = { A: 'Adenine', T: 'Thymine', C: 'Cytosine', G: 'Guanine' };

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

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(20, 40, 20);
  scene.add(dirLight);

  dnaGroup = new THREE.Group();
  scene.add(dnaGroup);

  btnGenerate.addEventListener('click', () => generateRandomDNA(30));
  btnLoadFasta.addEventListener('click', loadFastaSequence);
  btnMutate.addEventListener('click', mutateSelectedBase);
  btnExportPdb.addEventListener('click', exportToPDB);
  window.addEventListener('click', onCanvasClick);
  window.addEventListener('resize', onWindowResize);

  generateRandomDNA(30);
  animate();
}

function generateRandomDNA(numPairs = 30) {
  const bases = ['A', 'T', 'C', 'G'];
  let seq = '';
  for (let i = 0; i < numPairs; i++) {
    seq += bases[Math.floor(Math.random() * bases.length)];
  }
  buildDNAFromSequence(seq);
}

function loadFastaSequence() {
  const rawStr = fastaInput.value.trim().toUpperCase().replace(/[^ATCG]/g, '');
  if (rawStr.length === 0) {
    alert('Please enter a valid DNA sequence (using letters A, T, C, G).');
    return;
  }
  buildDNAFromSequence(rawStr);
}

function buildDNAFromSequence(sequence) {
  while (dnaGroup.children.length > 0) {
    const obj = dnaGroup.children.pop();
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  }

  dnaData = [];
  deselectNode();

  const numPairs = sequence.length;
  const radius = 6;
  const heightStep = 1.5;
  const twistAngle = 0.4;

  const strand1Points = [];
  const strand2Points = [];
  const complementary = { A: 'T', T: 'A', C: 'G', G: 'C' };

  for (let i = 0; i < numPairs; i++) {
    const y = (i - numPairs / 2) * heightStep;
    const angle = i * twistAngle;

    const pos1 = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    const pos2 = new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius);

    strand1Points.push(pos1);
    strand2Points.push(pos2);

    const base1 = sequence[i];
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
  const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

  const dist = p1.distanceTo(midpoint);
  
  const geom1 = new THREE.CylinderGeometry(0.2, 0.2, dist, 8);
  geom1.translate(0, dist / 2, 0);
  geom1.rotateX(Math.PI / 2);
  const mat1 = new THREE.MeshStandardMaterial({ color: BASE_COLORS[base1] });
  const mesh1 = new THREE.Mesh(geom1, mat1);
  mesh1.position.copy(p1);
  mesh1.lookAt(midpoint);
  dnaGroup.add(mesh1);

  const geom2 = new THREE.CylinderGeometry(0.2, 0.2, dist, 8);
  geom2.translate(0, dist / 2, 0);
  geom2.rotateX(Math.PI / 2);
  const mat2 = new THREE.MeshStandardMaterial({ color: BASE_COLORS[base2] });
  const mesh2 = new THREE.Mesh(geom2, mat2);
  mesh2.position.copy(p2);
  mesh2.lookAt(midpoint);
  dnaGroup.add(mesh2);

  const node1 = new THREE.Mesh(sphereGeom, mat1);
  node1.position.copy(p1);
  node1.userData = { index, base: base1, pair: base2, strand: 1 };
  dnaGroup.add(node1);

  const node2 = new THREE.Mesh(sphereGeom, mat2);
  node2.position.copy(p2);
  node2.userData = { index, base: base2, pair: base1, strand: 2 };
  dnaGroup.add(node2);
}

function onCanvasClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(dnaGroup.children);
  const sphere = intersects.find(item => item.object.geometry.type === 'SphereGeometry');

  if (sphere) selectNode(sphere.object);
}

function selectNode(node) {
  deselectNode();
  selectedNode = node;
  selectedNode.material.emissive.setHex(0xffff00);

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

function mutateSelectedBase() {
  if (!selectedNode) return;
  const data = selectedNode.userData;
  const bases = ['A', 'T', 'C', 'G'].filter(b => b !== data.base);
  const newBase = bases[Math.floor(Math.random() * bases.length)];

  data.base = newBase;
  selectedNode.material.color.setHex(BASE_COLORS[newBase]);
  inspectBase.textContent = `${BASE_NAMES[newBase]} (${newBase}) [MUTATED]`;
}

// Export structural dataset as standard .PDB file
function exportToPDB() {
  if (dnaData.length === 0) return;

  let pdbOutput = 'HEADER    HELIX3D GENERATED DNA STRUCTURE\n';
  let atomIndex = 1;

  dnaData.forEach((item, i) => {
    const resName = item.base1.padStart(3, ' ');
    const x1 = item.pos1.x.toFixed(3).padStart(8, ' ');
    const y1 = item.pos1.y.toFixed(3).padStart(8, ' ');
    const z1 = item.pos1.z.toFixed(3).padStart(8, ' ');
    
    // ATOM format line for Strand 1
    pdbOutput += `ATOM  ${atomIndex.toString().padStart(5, ' ')}  P   ${resName} A${(i+1).toString().padStart(4, ' ')}    ${x1}${y1}${z1}  1.00  0.00           P\n`;
    atomIndex++;
  });

  const blob = new Blob([pdbOutput], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'dna_structure.pdb';
  link.click();
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

