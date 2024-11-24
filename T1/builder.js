import * as THREE from 'three';
import KeyboardState from '../libs/util/KeyboardState.js'

// Variáveis globais
let scene, camera, renderer, orbitControls, firstPersonControls;
let gridHelper, currentVoxel, voxelTypes, currentVoxelTypeIndex;
const voxelSize = 1.0;
const planeSize = 10;
const voxels = {}; // Estrutura para armazenar voxels com chave como 'x,y,z'
let keyboard;

// Função para alinhar a posição ao grid (centro dos voxels)
function snapToGrid(value, size) {
    return Math.round((value - size / 2) / size) * size + size / 2;
}

// Inicialização do ambiente
function init() {

    // Cena
    scene = new THREE.Scene();

    // Câmera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Ajuste da posição da câmera para estar mais próxima e diretamente alinhada com o grid
    camera.position.set(planeSize / 2, planeSize, planeSize * 1.5); // Centralizada em X, elevada em Y, afastada em Z
    camera.lookAt(planeSize / 2, 0, planeSize / 2); // Olhando para o centro do grid

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Adicionar o renderer ao div 'webgl-output'
    const webglOutput = document.getElementById('webgl-output');
    webglOutput.appendChild(renderer.domElement);

    // Configurar o GridHelper alinhado a partir de um canto
    gridHelper = new THREE.GridHelper(planeSize, planeSize);
    // Deslocar a grade para que comece no ponto (0,0,0)
    gridHelper.position.x = planeSize / 2;
    gridHelper.position.z = planeSize / 2;
    scene.add(gridHelper);

    // Indicação da posição atual com cubo wireframe
    const geometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);
    const wireframe = new THREE.WireframeGeometry(geometry);
    currentVoxel = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({ color: 0xff0000 }));
    // Posicionar o currentVoxel no canto inicial da grade
    currentVoxel.position.set(voxelSize / 2, voxelSize / 2, voxelSize / 2);
    scene.add(currentVoxel);

    // Iluminação básica
    initDefaultBasicLight(scene);

    // Definição dos tipos de voxels
    defineVoxelTypes();
    currentVoxelTypeIndex = 0; // Inicia com o primeiro tipo de voxel
    updateCurrentVoxelIndicator();

    // Inicializar o teclado
    keyboard = new KeyboardState();

    // Interface de controle
    createGUI();

    // Ajuste de redimensionamento da janela
    window.addEventListener('resize', onWindowResize, false);

    // Iniciar animação
    animate();

    // Eventos de teclado
    window.addEventListener("keydown", handleKeyPress);
}

// Definição dos tipos de voxels com cores distintas
function defineVoxelTypes() {
    voxelTypes = [
        { name: 'Tipo 1', color: 0x00ff00 }, // Verde
        { name: 'Tipo 2', color: 0x0000ff }, // Azul
        { name: 'Tipo 3', color: 0xff0000 }, // Vermelho
        { name: 'Tipo 4', color: 0xffff00 }, // Amarelo
        { name: 'Tipo 5', color: 0xff00ff }  // Magenta
    ];
    // Se houver uma função para definir materiais padrão, chame-a aqui
    // setDefaultMaterial(voxelTypes.map(v => v.color));
}

// Função para inicializar iluminação básica
function initDefaultBasicLight(scene) {
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(planeSize / 2, planeSize * 2, planeSize * 2); // Ajuste da posição da luz para coincidir com a nova posição da câmera
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040); // Luz ambiente suave
    scene.add(ambientLight);
}

// Criação da interface GUI para salvar e carregar modelos
function createGUI() {
    // Já temos os botões no HTML; apenas garantimos que as funções estejam disponíveis globalmente
    window.saveModel = saveModel;
    window.loadModel = loadModel;
}

// Manipulação de redimensionamento da janela
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (orbitControls) orbitControls.update();
    if (firstPersonControls) {
        firstPersonControls.handleResize();
    }
}

function handleKeyPress(event) {
    const moveDistance = voxelSize;

    switch (event.key) {
        case "ArrowUp":
            currentVoxel.position.z -= moveDistance;
            break;
        case "ArrowDown":
            currentVoxel.position.z += moveDistance;
            break;
        case "ArrowLeft":
            currentVoxel.position.x -= moveDistance;
            break;
        case "ArrowRight":
            currentVoxel.position.x += moveDistance;
            break;
        case "PageUp":
            currentVoxel.position.y += moveDistance;
            break;
        case "PageDown":
            if (currentVoxel.position.y - moveDistance >= voxelSize / 2) {
                currentVoxel.position.y -= moveDistance;
            }
            break;
        case "q":
        case "Q":
            addVoxel();
            break;
        case "e":
        case "E":
            removeVoxel();
            break;
        case ".":
            nextVoxelType();
            break;
        case ",":
            previousVoxelType();
            break;
    }

    // Alinhar a posição aos centros dos voxels (0.5, 1.5, 2.5, ...)
    currentVoxel.position.x = snapToGrid(currentVoxel.position.x, voxelSize);
    currentVoxel.position.y = snapToGrid(currentVoxel.position.y, voxelSize);
    currentVoxel.position.z = snapToGrid(currentVoxel.position.z, voxelSize);

    // Limitar dentro dos limites do grid
    const minPosition = voxelSize / 2;
    const maxPosition = planeSize - voxelSize / 2;

    currentVoxel.position.x = THREE.MathUtils.clamp(
        currentVoxel.position.x,
        minPosition,
        maxPosition
    );
    currentVoxel.position.y = THREE.MathUtils.clamp(
        currentVoxel.position.y,
        voxelSize / 2,
        planeSize // Permitir que o voxel suba até o topo da grade
    );
    currentVoxel.position.z = THREE.MathUtils.clamp(
        currentVoxel.position.z,
        minPosition,
        maxPosition
    );
}

// Função para adicionar um voxel no local atual
function addVoxel() {
    const posKey = `${currentVoxel.position.x},${currentVoxel.position.y},${currentVoxel.position.z}`;
    if (voxels[posKey]) {
        // Voxel já existe neste local
        return;
    }

    const voxelType = voxelTypes[currentVoxelTypeIndex];
    const material = new THREE.MeshBasicMaterial({ color: voxelType.color });
    const voxel = new THREE.Mesh(
        new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize),
        material
    );
    voxel.position.copy(currentVoxel.position);
    scene.add(voxel);

    // Armazenar voxel na estrutura
    voxels[posKey] = voxel;
}

// Função para remover um voxel no local atual
function removeVoxel() {
    const posKey = `${currentVoxel.position.x},${currentVoxel.position.y},${currentVoxel.position.z}`;
    const voxel = voxels[posKey];
    if (voxel) {
        scene.remove(voxel);
        delete voxels[posKey];
    }
}

// Funções para alternar tipos de voxel
function nextVoxelType() {
    currentVoxelTypeIndex = (currentVoxelTypeIndex + 1) % voxelTypes.length;
    updateCurrentVoxelIndicator();
}

function previousVoxelType() {
    currentVoxelTypeIndex = (currentVoxelTypeIndex - 1 + voxelTypes.length) % voxelTypes.length;
    updateCurrentVoxelIndicator();
}

// Atualizar a indicação do tipo de voxel atual
function updateCurrentVoxelIndicator() {
    const indicator = document.getElementById("current-voxel-color");
    if (indicator && voxelTypes[currentVoxelTypeIndex]) {
        const colorHex = voxelTypes[currentVoxelTypeIndex].color.toString(16).padStart(6, '0');
        indicator.style.backgroundColor = `#${colorHex}`;
    }
}

// Função para salvar o modelo de voxels em um arquivo JSON
function saveModel() {
    const saveName = document.getElementById("save-name").value.trim();
    if (!saveName) {
        alert("Por favor, insira um nome para o arquivo.");
        return;
    }

    const voxelData = Object.keys(voxels).map(key => {
        const [x, y, z] = key.split(',').map(Number);
        const type = voxelTypes.findIndex(v => v.color === voxels[key].material.color.getHex());
        return { x, y, z, type };
    });

    const data = JSON.stringify(voxelData, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = saveName.endsWith('.json') ? saveName : `${saveName}.json`;
    link.click();
}

// Função para carregar o modelo de voxels de um arquivo JSON selecionado pelo usuário
function loadModel() {
    const fileInput = document.getElementById("load-file");
    const file = fileInput.files[0];
    if (!file) {
        alert("Por favor, selecione um arquivo JSON para carregar.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            // Validar a estrutura dos dados
            if (!Array.isArray(data)) {
                throw new Error("Formato inválido: esperado um array de voxels.");
            }

            // Remover todos os voxels atuais
            for (const key in voxels) {
                scene.remove(voxels[key]);
            }
            for (const key in voxels) {
                delete voxels[key];
            }

            // Adicionar voxels carregados
            data.forEach(voxelData => {
                const { x, y, z, type } = voxelData;
                if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number' || typeof type !== 'number') {
                    throw new Error("Formato inválido: cada voxel deve ter x, y, z e type como números.");
                }
                const color = voxelTypes[type] ? voxelTypes[type].color : 0xffffff;
                const material = new THREE.MeshBasicMaterial({ color });
                const voxel = new THREE.Mesh(new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize), material);
                voxel.position.set(x, y, z);
                scene.add(voxel);
                const posKey = `${x},${y},${z}`;
                voxels[posKey] = voxel;
            });

            alert("Modelo carregado com sucesso!");
        } catch (err) {
            console.error(err);
            alert("Erro ao carregar o arquivo: " + err.message);
        }
    };

    reader.onerror = function() {
        console.error("Erro ao ler o arquivo.");
        alert("Erro ao ler o arquivo.");
    };

    reader.readAsText(file);
}

// Função de animação
function animate() {
    requestAnimationFrame(animate);

    renderer.render(scene, camera);
}

// Inicializar a cena quando a página carregar
window.onload = init;
