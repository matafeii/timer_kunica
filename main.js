// === VIDEO BACKGROUND SETUP ===
const videoBg = document.getElementById('video-bg');
let videoLoaded = false;
let youtubePlayer = null;

// YouTube video ID for fireplace (relaxing fire)
const FIREPLACE_VIDEO_ID = 'u5Q1pNcf6C4'; // Cozy fireplace with crackling fire

// Make these functions global so they can be called from HTML
window.initYouTubePlayer = function() {
    if (typeof YT !== 'undefined' && YT.Player) {
        youtubePlayer = new YT.Player('youtube-player', {
            videoId: FIREPLACE_VIDEO_ID,
            playerVars: {
                'autoplay': 1,
                'loop': 1,
                'playlist': FIREPLACE_VIDEO_ID,
                'mute': 1,
                'controls': 0,
                'showinfo': 0,
                'rel': 0,
                'iv_load_policy': 3,
                'enablejsapi': 1,
                'origin': window.location.origin
            },
            events: {
                'onReady': onYouTubePlayerReady,
                'onError': onYouTubePlayerError
            }
        });
    }
};

function onYouTubePlayerReady(event) {
    videoLoaded = true;
    event.target.playVideo();
    // Darken the video with CSS filter
    setTimeout(() => {
        const playerEl = document.getElementById('youtube-player');
        if (playerEl) {
            const iframe = playerEl.querySelector('iframe');
            if (iframe) {
                iframe.style.filter = 'brightness(0.4) contrast(1.2) saturate(0.8)';
            }
        }
    }, 1000);
}

function onYouTubePlayerError(event) {
    console.log('YouTube player error, falling back to video');
    document.getElementById('youtube-bg-container').style.display = 'none';
    videoBg.style.display = 'block';
}

// Fallback - если видео не загрузится, используем Three.js сцену
videoBg.addEventListener('error', () => {
    console.log('Video failed to load, using 3D scene only');
    videoBg.style.display = 'none';
});

// Список видео для разных состояний (fallback)
const nightVideos = [
    'https://assets.mixkit.co/videos/preview/mixkit-night-sky-with-stars-and-clouds-24064-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-clouds-and-blue-sky-2404-large.mp4'
];

const celebrationVideos = [
    'https://assets.mixkit.co/videos/preview/mixkit-fireworks-exploding-in-the-sky-1058-large.mp4',
    'https://assets.mixkit.co/videos/preview/mixkit-celebration-with-confetti-4432-large.mp4'
];

let currentVideoIndex = 0;

function loadVideo(src) {
    videoBg.src = src;
    videoBg.load();
}

videoBg.addEventListener('loadeddata', () => {
    videoLoaded = true;
    videoBg.play().catch(e => console.log('Autoplay blocked'));
});

// Fallback - если видео не загрузится, используем Three.js сцену
videoBg.addEventListener('error', () => {
    console.log('Video failed to load, using 3D scene only');
    videoBg.style.display = 'none';
});

// === THREE.JS 3D SCENE ===
let scene, camera, renderer, composer;
let particles = [];
let isTimerRunning = false;
let transitionProgress = 0;
let clock = new THREE.Clock();

function init3DScene() {
    const container = document.getElementById("canvas-container");
    
    // Scene
    scene = new THREE.Scene();
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
    camera.position.set(0, 20, 100);
    camera.lookAt(0, 10, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Post-processing
    composer = new THREE.EffectComposer(renderer);
    const renderPass = new THREE.RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.8,  // strength
        0.5,  // radius
        0.7   // threshold
    );
    composer.addPass(bloomPass);

    // Create scene elements
    createNebulaBackground();
    createStarField();
    createFloatingParticles();
    createCitySilhouette();
    createMoonWithGlow();
    createLights();
    
    // Start animation
    animate();
}

function createNebulaBackground() {
    // Animated nebula using custom shader
    const nebulaGeometry = new THREE.SphereGeometry(1200, 64, 64);
    const nebulaMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            color1: { value: new THREE.Color(0x1a0033) },
            color2: { value: new THREE.Color(0x000066) },
            color3: { value: new THREE.Color(0x330033) }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            void main() {
                vUv = uv;
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 color1;
            uniform vec3 color2;
            uniform vec3 color3;
            varying vec2 vUv;
            varying vec3 vPosition;
            
            // Simplex noise function
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
            
            float snoise(vec3 v) {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                vec3 i  = floor(v + dot(v, C.yyy));
                vec3 x0 = v - i + dot(i, C.xxx);
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min(g.xyz, l.zxy);
                vec3 i2 = max(g.xyz, l.zxy);
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                i = mod289(i);
                vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                float n_ = 0.142857142857;
                vec3 ns = n_ * D.wyz - D.xzx;
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_);
                vec4 x = x_ *ns.x + ns.yyyy;
                vec4 y = y_ *ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                vec4 b0 = vec4(x.xy, y.xy);
                vec4 b1 = vec4(x.zw, y.zw);
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                vec3 p0 = vec3(a0.xy, h.x);
                vec3 p1 = vec3(a0.zw, h.y);
                vec3 p2 = vec3(a1.xy, h.z);
                vec3 p3 = vec3(a1.zw, h.w);
                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
                p0 *= norm.x;
                p1 *= norm.y;
                p2 *= norm.z;
                p3 *= norm.w;
                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
            }
            
            void main() {
                vec3 pos = vPosition * 0.002 + time * 0.02;
                float n = snoise(pos) * 0.5 + 0.5;
                float n2 = snoise(pos * 2.0 + 100.0) * 0.5 + 0.5;
                
                vec3 color = mix(color1, color2, n);
                color = mix(color, color3, n2 * 0.5);
                
                // Add stars
                float star = pow(snoise(vPosition * 0.01), 20.0) * 2.0;
                color += vec3(star);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.BackSide
    });
    
    const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
    nebula.userData.material = nebulaMaterial;
    scene.add(nebula);
}

function createStarField() {
    // Glowing stars
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 3000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 600 + Math.random() * 400;
        
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.cos(phi);
        positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
        
        // Random star colors (white, blue, yellow)
        const colorChoice = Math.random();
        if (colorChoice < 0.7) {
            colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
        } else if (colorChoice < 0.85) {
            colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 1;
        } else {
            colors[i * 3] = 1; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 0.6;
        }
        
        sizes[i] = Math.random() * 3 + 1;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            varying float vSize;
            void main() {
                vColor = color;
                vSize = size;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (400.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec3 vColor;
            varying float vSize;
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                alpha *= 0.6 + 0.4 * sin(time * 3.0 + vSize * 5.0);
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const starField = new THREE.Points(starGeometry, starMaterial);
    starField.userData.material = starMaterial;
    scene.add(starField);
    particles.push({ mesh: starField, type: 'stars' });
}

function createFloatingParticles() {
    // Floating magical particles
    const particleCount = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 400;
        positions[i * 3 + 1] = Math.random() * 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
        
        // Glowing colors (green, pink, blue)
        const colorChoice = Math.random();
        if (colorChoice < 0.33) {
            colors[i * 3] = 0; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 0.5;
        } else if (colorChoice < 0.66) {
            colors[i * 3] = 1; colors[i * 3 + 1] = 0.2; colors[i * 3 + 2] = 0.5;
        } else {
            colors[i * 3] = 0.2; colors[i * 3 + 1] = 0.5; colors[i * 3 + 2] = 1;
        }
        
        velocities.push({
            x: (Math.random() - 0.5) * 0.3,
            y: Math.random() * 0.5 + 0.2,
            z: (Math.random() - 0.5) * 0.3
        });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 3,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const particleSystem = new THREE.Points(geometry, material);
    particleSystem.userData = { velocities, type: 'floating' };
    scene.add(particleSystem);
    particles.push({ mesh: particleSystem, type: 'floating' });
}

function createCitySilhouette() {
    // Distant city buildings
    const buildingCount = 40;
    
    for (let i = 0; i < buildingCount; i++) {
        const width = Math.random() * 20 + 10;
        const height = Math.random() * 100 + 30;
        const depth = Math.random() * 20 + 10;

        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshBasicMaterial({
            color: 0x0a0a15,
            transparent: true,
            opacity: 0.8
        });

        const building = new THREE.Mesh(geometry, material);
        
        const angle = (i / buildingCount) * Math.PI * 2;
        const radius = 200 + Math.random() * 100;
        building.position.x = Math.cos(angle) * radius;
        building.position.z = Math.sin(angle) * radius - 100;
        building.position.y = height / 2 - 30;

        // Add glowing windows
        addCityLights(building, width, height, depth);
        
        scene.add(building);
    }
}

function addCityLights(building, width, height, depth) {
    const windowRows = Math.floor(height / 8);
    const windowCols = Math.floor(width / 5);
    
    for (let row = 0; row < windowRows; row++) {
        for (let col = 0; col < windowCols; col++) {
            if (Math.random() > 0.4) {
                const windowGeom = new THREE.PlaneGeometry(2, 3);
                const windowMat = new THREE.MeshBasicMaterial({
                    color: Math.random() > 0.5 ? 0xffaa44 : 0x4488ff,
                    transparent: true,
                    opacity: Math.random() * 0.6 + 0.2
                });
                const windowMesh = new THREE.Mesh(windowGeom, windowMat);
                windowMesh.position.x = (col - windowCols / 2) * 5;
                windowMesh.position.y = (row - windowRows / 2) * 8;
                windowMesh.position.z = depth / 2 + 0.1;
                building.add(windowMesh);
            }
        }
    }
}

function createMoonWithGlow() {
    // Main moon
    const moonGeometry = new THREE.SphereGeometry(20, 64, 64);
    const moonMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffee
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(250, 250, -400);
    scene.add(moon);

    // Multiple glow layers
    for (let i = 1; i <= 5; i++) {
        const glowGeometry = new THREE.SphereGeometry(20 + i * 8, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffcc,
            transparent: true,
            opacity: 0.1 / i
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        moon.add(glow);
    }

    // Moon craters (using bump map simulation)
    const craterGeometry = new THREE.SphereGeometry(20.1, 64, 64);
    const craterMaterial = new THREE.MeshStandardMaterial({
        color: 0xdddddd,
        roughness: 1,
        metalness: 0
    });
    const craterMoon = new THREE.Mesh(craterGeometry, craterMaterial);
    moon.add(craterMoon);
}

function createLights() {
    // Ambient
    const ambient = new THREE.AmbientLight(0x222244, 0.4);
    scene.add(ambient);

    // Moon light
    const moonLight = new THREE.DirectionalLight(0x6666ff, 0.6);
    moonLight.position.set(250, 250, -400);
    moonLight.castShadow = true;
    scene.add(moonLight);

    // Colored point lights
    const colors = [0xff0066, 0x00ff66, 0x6600ff, 0xff6600];
    colors.forEach((color, i) => {
        const light = new THREE.PointLight(color, 0.4, 300);
        const angle = (i / colors.length) * Math.PI * 2;
        light.position.set(
            Math.cos(angle) * 150,
            50 + Math.sin(i) * 30,
            Math.sin(angle) * 150 - 50
        );
        scene.add(light);
    });
}

function animate() {
    requestAnimationFrame(animate);
    
    const time = clock.getElapsedTime();
    const delta = clock.getDelta();

    // Camera gentle movement
    if (!isTimerRunning) {
        camera.position.x = Math.sin(time * 0.2) * 15;
        camera.position.y = 20 + Math.sin(time * 0.15) * 8;
        camera.lookAt(0, 10, 0);
    }

    // Animate particles
    particles.forEach(p => {
        if (p.type === 'stars') {
            p.mesh.userData.material.uniforms.time.value = time;
            p.mesh.rotation.y = time * 0.02;
        } else if (p.type === 'floating') {
            const positions = p.mesh.geometry.attributes.position.array;
            const velocities = p.mesh.userData.velocities;
            
            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3] += velocities[i].x;
                positions[i * 3 + 1] += velocities[i].y;
                positions[i * 3 + 2] += velocities[i].z;
                
                // Reset particles that go too high
                if (positions[i * 3 + 1] > 200) {
                    positions[i * 3 + 1] = 0;
                    positions[i * 3] = (Math.random() - 0.5) * 400;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
                }
            }
            p.mesh.geometry.attributes.position.needsUpdate = true;
        }
    });

    // Animate nebula
    scene.children.forEach(child => {
        if (child.userData.material && child.userData.material.uniforms && child.userData.material.uniforms.time) {
            child.userData.material.uniforms.time.value = time;
        }
    });

    // Render with post-processing
    composer.render();
}

// Celebration effects
function triggerCelebration() {
    createFireworks();
    createConfetti();
    
    // Change video background
    if (videoLoaded) {
        videoBg.src = celebrationVideos[Math.floor(Math.random() * celebrationVideos.length)];
        videoBg.style.filter = 'brightness(0.8) contrast(1.2) saturate(1.3)';
    }
    
    // Increase bloom
    composer.passes[1].strength = 1.5;
    
    // Camera effect
    let cameraZoom = 100;
    const zoomInterval = setInterval(() => {
        cameraZoom -= 0.5;
        camera.position.z = cameraZoom;
        if (cameraZoom <= 60) clearInterval(zoomInterval);
    }, 50);
}

function createFireworks() {
    const container = document.getElementById('celebration-container');
    
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            createSingleFirework();
        }, i * 400);
    }
}

function createSingleFirework() {
    const particleCount = 150;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const startX = (Math.random() - 0.5) * 300;
    const startZ = (Math.random() - 0.5) * 200 - 100;
    const startY = Math.random() * 150 + 80;
    
    const hue = Math.random();
    const color = new THREE.Color().setHSL(hue, 1, 0.6);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = startX;
        positions[i * 3 + 1] = startY;
        positions[i * 3 + 2] = startZ;
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 5,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
    });

    const firework = new THREE.Points(geometry, material);
    
    // Calculate velocities
    const velocities = [];
    for (let i = 0; i < particleCount; i++) {
        const speed = Math.random() * 4 + 2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        velocities.push({
            x: speed * Math.sin(phi) * Math.cos(theta),
            y: speed * Math.cos(phi) - 1,
            z: speed * Math.sin(phi) * Math.sin(theta)
        });
    }
    
    firework.userData = { velocities, life: 1 };
    scene.add(firework);

    function animateFirework() {
        if (firework.userData.life <= 0) {
            scene.remove(firework);
            return;
        }

        const positions = firework.geometry.attributes.position.array;
        const vels = firework.userData.velocities;
        
        for (let i = 0; i < positions.length / 3; i++) {
            positions[i * 3] += vels[i].x;
            positions[i * 3 + 1] += vels[i].y;
            positions[i * 3 + 2] += vels[i].z;
            vels[i].y -= 0.03;
        }
        
        firework.userData.life -= 0.015;
        firework.material.opacity = firework.userData.life;
        firework.geometry.attributes.position.needsUpdate = true;
        
        requestAnimationFrame(animateFirework);
    }
    
    animateFirework();
}

function createConfetti() {
    const colors = [0xe94560, 0x00ff88, 0xf39c12, 0x00aaff, 0xff00ff, 0xffff00];
    const container = document.getElementById('celebration-container');
    
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: absolute;
            width: ${Math.random() * 10 + 5}px;
            height: ${Math.random() * 10 + 5}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}%;
            top: -20px;
            opacity: ${Math.random() * 0.5 + 0.5};
            transform: rotate(${Math.random() * 360}deg);
            animation: confettiFall ${Math.random() * 3 + 2}s linear forwards;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes confettiFall {
                to {
                    top: 110vh;
                    transform: rotate(${Math.random() * 720}deg) translateX(${Math.random() * 200 - 100}px);
                }
            }
        `;
        document.head.appendChild(style);
        container.appendChild(confetti);
        
        setTimeout(() => confetti.remove(), 5000);
    }
}

// Handle resize
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize scene
init3DScene();


// ============================================
// === TIMER LOGIC ===
// ============================================

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
const mainContainer = document.getElementById("mainContainer");

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
    isTimerRunning = true;
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
    isTimerRunning = false;
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
    
    // Reset scene
    camera.position.set(0, 20, 100);
    composer.passes[1].strength = 0.8;
    
    // Reset video
    if (videoLoaded) {
        videoBg.src = nightVideos[0];
        videoBg.style.filter = 'brightness(0.4) contrast(1.1) saturate(0.8)';
    }
    
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
    triggerCelebration();
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

        setTimeout(() => playSirenPart(2), 3500);
        setTimeout(() => playSirenPart(1), 7000);
    } catch (e) {
        console.log("Audio error:", e);
    }
}

function playSirenPart(repeat) {
    if (repeat <= 0) return;

    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc1.type = "sine";
    osc2.type = "sine";

    osc1.frequency.setValueAtTime(800, audioContext.currentTime);
    osc1.frequency.setValueAtTime(600, audioContext.currentTime + 0.25);
    osc1.frequency.setValueAtTime(800, audioContext.currentTime + 0.5);
    osc1.frequency.setValueAtTime(600, audioContext.currentTime + 0.75);

    osc2.frequency.setValueAtTime(820, audioContext.currentTime);
    osc2.frequency.setValueAtTime(620, audioContext.currentTime + 0.25);
    osc2.frequency.setValueAtTime(820, audioContext.currentTime + 0.5);
    osc2.frequency.setValueAtTime(620, audioContext.currentTime + 0.75);

    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 3);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audioContext.destination);

    osc1.start();
    osc2.start();
    osc1.stop(audioContext.currentTime + 3);
    osc2.stop(audioContext.currentTime + 3);
}

function speakText() {
    if ("speechSynthesis" in window) {
        speakOnce(0);
        speakOnce(3000);
        speakOnce(6000);
    }
}

function speakOnce(delay) {
    setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance("ВРЕМЯ ДЕЛАТЬ КУНИЦУ!");
        utterance.lang = "ru-RU";
        utterance.rate = 0.9;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
    }, delay);
}

// Initialize display
updateDisplay();

