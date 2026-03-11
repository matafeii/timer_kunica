// === TESLA-STYLE 3D BACKGROUND ===
let scene, camera, renderer;
let particles, particleGeometry;
let particlePositions = [];
let particleVelocities = [];
let connections = [];
let mouseX = 0, mouseY = 0;
let targetX = 0, targetY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

function initTeslaBackground() {
    const container = document.getElementById('canvas-container');
    
    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.001);
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 3000);
    camera.position.z = 1000;
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true 
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);
    
    // Create particles (Tesla-style stars/particles)
    createTeslaParticles();
    
    // Create ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add mouse interaction
    document.addEventListener('mousemove', onDocumentMouseMove);
    window.addEventListener('resize', onWindowResize);
    
    // Start animation
    animateTeslaBackground();
}

function createTeslaParticles() {
    const particleCount = 2000;
    particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    // Color palette - Tesla style (white, blue, cyan, slight purple)
    const colorPalette = [
        new THREE.Color(0xffffff),  // White
        new THREE.Color(0x88ccff),  // Light blue
        new THREE.Color(0x00ffff),   // Cyan
        new THREE.Color(0xaa88ff),  // Light purple
        new THREE.Color(0x00ccff),  // Electric blue
    ];
    
    for (let i = 0; i < particleCount; i++) {
        // Random position in 3D space
        const x = Math.random() * 4000 - 2000;
        const y = Math.random() * 4000 - 2000;
        const z = Math.random() * 4000 - 2000;
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        // Random color from palette
        const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        // Random size
        sizes[i] = Math.random() * 4 + 1;
        
        // Store for animation
        particlePositions.push({ x, y, z });
        particleVelocities.push({
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2,
            z: (Math.random() - 0.5) * 2
        });
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Custom shader material for glowing particles
    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            pixelRatio: { value: renderer.getPixelRatio() }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float pixelRatio;
            
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha = pow(alpha, 1.5);
                
                // Glow effect
                vec3 glow = vColor * (1.0 + alpha * 0.5);
                gl_FragColor = vec4(glow, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    
    // Create connection lines between nearby particles
    createConnections();
}

function createConnections() {
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
    });
    
    // Store connection lines for animation
    connections = [];
}

function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) * 0.5;
    mouseY = (event.clientY - windowHalfY) * 0.5;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animateTeslaBackground() {
    requestAnimationFrame(animateTeslaBackground);
    
    const time = Date.now() * 0.001;
    
    // Smooth camera movement following mouse
    targetX += (mouseX - targetX) * 0.02;
    targetY += (mouseY - targetY) * 0.02;
    
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (-targetY - camera.position.y) * 0.05;
    camera.lookAt(scene.position);
    
    // Animate particles
    if (particles) {
        const positions = particles.geometry.attributes.position.array;
        
        for (let i = 0; i < particlePositions.length; i++) {
            // Update position with velocity
            particlePositions[i].x += particleVelocities[i].x;
            particlePositions[i].y += particleVelocities[i].y;
            particlePositions[i].z += particleVelocities[i].z;
            
            // Wrap around boundaries
            if (particlePositions[i].x > 2000) particlePositions[i].x = -2000;
            if (particlePositions[i].x < -2000) particlePositions[i].x = 2000;
            if (particlePositions[i].y > 2000) particlePositions[i].y = -2000;
            if (particlePositions[i].y < -2000) particlePositions[i].y = 2000;
            if (particlePositions[i].z > 2000) particlePositions[i].z = -2000;
            if (particlePositions[i].z < -2000) particlePositions[i].z = 2000;
            
            // Gentle wave motion
            particlePositions[i].y += Math.sin(time + i * 0.01) * 0.5;
            
            positions[i * 3] = particlePositions[i].x;
            positions[i * 3 + 1] = particlePositions[i].y;
            positions[i * 3 + 2] = particlePositions[i].z;
        }
        
        particles.geometry.attributes.position.needsUpdate = true;
        particles.rotation.y = time * 0.05;
        particles.rotation.x = Math.sin(time * 0.1) * 0.1;
    }
    
    renderer.render(scene, camera);
}

// Initialize Tesla-style background
initTeslaBackground();


// === TIMER LOGIC (unchanged) ===
let timerInterval = null;
let totalSeconds = 0;
let remainingSeconds = 0;
let isRunning = false;
let audioContext = null;

const display = document.getElementById("display");
const minutesInput = document.getElementById("minutes");
const secondsInput = document.getElementById("seconds");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const messageEl = document.getElementById("message");

function updateDisplay() {
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    display.textContent = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

window.startTimer = function() {
    if (isRunning) return;

    const mins = parseInt(minutesInput.value) || 0;
    const secs = parseInt(secondsInput.value) || 0;

    if (remainingSeconds === 0) {
        totalSeconds = mins * 60 + secs;
        remainingSeconds = totalSeconds;
    }

    if (remainingSeconds <= 0) {
        alert("Будь ласка, встановіть час таймера!");
        return;
    }

    isRunning = true;
    startBtn.disabled = true;
    stopBtn.disabled = false;
    minutesInput.disabled = true;
    secondsInput.disabled = true;

    timerInterval = setInterval(() => {
        remainingSeconds--;
        updateDisplay();

        if (remainingSeconds <= 0) {
            timerFinished();
        }
    }, 1000);
};

window.stopTimer = function() {
    if (!isRunning) return;

    clearInterval(timerInterval);
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
};

window.resetTimer = function() {
    stopTimer();
    remainingSeconds = 0;
    totalSeconds = 0;
    minutesInput.disabled = false;
    secondsInput.disabled = false;
    minutesInput.value = 25;
    secondsInput.value = 0;
    updateDisplay();
    messageEl.textContent = "";
    messageEl.classList.add("hidden");
    
    // Clear confetti
    const container = document.getElementById('celebration-container');
    container.innerHTML = '';
};

function timerFinished() {
    stopTimer();
    remainingSeconds = 0;
    updateDisplay();
    minutesInput.disabled = false;
    secondsInput.disabled = false;

    messageEl.textContent = "ВРЕМЯ ДЕЛАТЬ КУНИЦУ!";
    messageEl.classList.remove("hidden");

    playSiren();
    speakText();
}

function playSiren() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator1.type = "sine";
        oscillator2.type = "sine";

        oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator1.frequency.setValueAtTime(600, audioContext.currentTime + 0.25);
        oscillator1.frequency.setValueAtTime(800, audioContext.currentTime + 0.5);
        oscillator1.frequency.setValueAtTime(600, audioContext.currentTime + 0.75);

        oscillator2.frequency.setValueAtTime(820, audioContext.currentTime);
        oscillator2.frequency.setValueAtTime(620, audioContext.currentTime + 0.25);
        oscillator2.frequency.setValueAtTime(820, audioContext.currentTime + 0.5);
        oscillator2.frequency.setValueAtTime(620, audioContext.currentTime + 0.75);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 3);

        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 3);
        oscillator2.stop(audioContext.currentTime + 3);
    } catch (e) {
        console.log("Audio error:", e);
    }
}

function speakText() {
    if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance("ВРЕМЯ ДЕЛАТЬ КУНИЦУ!");
        utterance.lang = "ru-RU";
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

// Initialize display
updateDisplay();

