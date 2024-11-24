let sceneExec, cameraExec, rendererExec;

function initExecution() {
    sceneExec = new THREE.Scene();
    cameraExec = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    rendererExec = new THREE.WebGLRenderer();
    rendererExec.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(rendererExec.domElement);

    // Add map, trees, and other elements here
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 7.5);
    sceneExec.add(light);

    cameraExec.position.set(0, 10, 20);
    cameraExec.lookAt(0, 0, 0);
}

function animateExecution() {
    requestAnimationFrame(animateExecution);
    rendererExec.render(sceneExec, cameraExec);
}
