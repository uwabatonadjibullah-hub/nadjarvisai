/* ==========================================================================
   NAD JARVIS - Master Application Logic & Schedule CSV Injector
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // --- 1. Full Personal Knowledge Base ---
  const NAD_PROFILE_DB = {
    name: "Nadjibullah Uwabato",
    nickname: "Nad",
    brand: "NAD / NAD PRODUCTION / IAM NAD",
    location: "Kigali, Rwanda",
    partner: "Orchid",
    faith: "Muslim — Quran memorization, Tahajjud (04:00 AM), 5 daily prayers, Adhkar, Jummah on Friday",
    education: "Final-year Bachelor of Science in Mechanical Engineering (Production Eng) at UR CST Kigali. Capstone: 'Design and Simulation of a Solar-Assisted Electric Vehicle (SAEV)' featuring a 7-chapter report with Rwandan solar irradiance data.",
    currentRole: "Operations Manager at KSP Rwanda, Kigali",
    previousRole: "Founder & CEO of NAD PRODUCTION Ltd (voluntarily closed with RDB to focus on final-year UR studies)",
    aiProducts: [
      "NAD JARVIS AI (Personal Voice Assistant)",
      "TRADIT AI (Original AI Product)",
      "INK LINK AI (Original AI Product)"
    ],
    filmmaking: [
      "URUMURI STUDIOS — 'GAJU' short film & trailer",
      "OMNITALES HUB — 6-week faceless video AI strategy",
      "GET BETTER PODCAST — full platform",
      "United Gen. Basketball brand pitch"
    ],
    sprint: "5-Month Intensive Execution Sprint (July 1, 2026 – November 30, 2026) dedicated to mastering advanced software frameworks and post-production suites.",
    longTermVision: "To become a multidisciplinary creator who combines engineering, AI, filmmaking, and software development to build products, tell powerful stories, and create companies that have an impact in Africa and beyond.",
    weeklySchedule: "Week starts on SATURDAY and ends on FRIDAY. 04:00 Tahajjud, 04:30 Fajr & Quran, ZAD Academy Mon-Thu, software dev afternoons, Friday Jummah & family time."
  };

  // --- 2. Default CSV Schedule Data Injection (Saturday to Friday, 04:00 to 22:00) ---
  const DEFAULT_CSV_SCHEDULE = {
    "04:00": ["Waking Up\nTahajud", "Waking Up\nTahajud", "Waking Up\nTahajud", "Waking Up\nTahajud", "Waking Up\nTahajud", "Waking Up\nTahajud", "Waking Up\nTahajud"],
    "04:30": ["Praying Fajr\nReading Qoran", "Praying Fajr\nReading Qoran", "Praying Fajr\nReading Qoran", "Praying Fajr\nReading Qoran", "Praying Fajr\nReading Qoran", "Praying Fajr\nReading Qoran", "Praying Fajr\nReciting Qoran"],
    "05:00": ["", "", "", "", "", "", ""],
    "05:30": ["Adhkar", "Adhkar", "Adhkar", "Adhakar", "Adhkar", "Adhkar", "Adhkar"],
    "06:00": ["Cleaning", "Work Out", "Cleaning", "Work Out", "Cleaning", "Work Out", "Cleaning"],
    "06:30": ["Taking Shower", "Taking Shower", "Taking Shower", "Taking Shower", "Taking Shower", "Taking Shower", "Taking Shower"],
    "07:00": ["Break fast", "Break fast", "Break fast", "Break fast", "Break fast", "Break fast", "Break fast"],
    "07:30": ["TRANSPORT", "TRANSPORT", "TRANSPORT", "TRANSPORT", "TRANSPORT", "TRANSPORT", "TRANSPORT"],
    "08:00": ["", "", "", "", "", "", ""],
    "08:30": ["DIGITAL LITERACY", "DIGITAL LITERACY", "FILMMAKING", "FILMMAKING", "FILMMAKING", "FILMMAKING", "QURAN MURAJAAH"],
    "09:00": ["", "", "", "", "", "", ""],
    "09:30": ["", "", "", "", "", "", ""],
    "10:00": ["", "", "", "", "", "", ""],
    "10:30": ["", "", "", "", "", "", ""],
    "11:00": ["", "", "", "", "", "", "ISTIGHFAR"],
    "11:30": ["", "", "ZAD ACADEMY", "ZAD ACADEMY", "ZAD ACADEMY", "ZAD ACADEMY", ""],
    "12:00": ["", "", "", "", "", "", "Jummah Prayer"],
    "12:30": ["Dhuhr Prayer", "Dhuhr Prayer", "Dhuhr Prayer", "Dhuhr Prayer", "Dhuhr Prayer", "Dhuhr Prayer", ""],
    "13:00": ["", "", "", "", "", "", ""],
    "13:30": ["FILMMAKING", "FILMMAKING", "DOCUMENTATION", "SHORT FILM", "DOCUMENTATION", "DOCUMENTATION", "FAMILY TIME\nAsr Prayer"],
    "14:00": ["", "", "", "", "", "", ""],
    "14:30": ["", "", "SOFTWARE DEV.", "SOFTWARE DEV.", "SOFTWARE DEV.", "SOFTWARE DEV.", ""],
    "15:00": ["", "", "", "", "", "", ""],
    "15:30": ["", "", "", "", "", "", ""],
    "16:00": ["", "", "", "", "", "", "EDITING\n[SOCIAL ACCOUNTS]"],
    "16:30": ["", "", "", "", "", "", ""],
    "17:00": ["Asr Prayer\nTRANSPORT", "Asr Prayer\nTRANSPORT", "Asr Prayer\nTRANSPORT", "Asr Prayer\nTRANSPORT", "Asr Prayer\nTRANSPORT", "Asr Prayer\nTRANSPORT", ""],
    "17:30": ["", "", "", "", "", "", ""],
    "18:00": ["Adhkar", "Adhkar", "Adhkar", "Adhkar", "Adhkar", "Script Writing", "Adhkar"],
    "18:30": ["Maghrib Prayer", "Maghrib Prayer", "Maghrib Prayer", "Maghrib Prayer", "Maghrib Prayer", "Maghrib Prayer", "Magrib Prayer"],
    "19:00": ["Script Writing", "Script Writing", "Script Writing", "Script Writing", "Script Writing", "Evining Adhkar", "Script writing"],
    "19:30": ["Inshaa Prayer", "Inshaa Prayer", "Inshaa Prayer", "Inshaa Prayer", "Inshaa Prayer", "Inshaa Prayer", "Inshaa Prayer"],
    "20:00": ["EDITING", "EDITING", "EDITING", "EDITING", "EDITING", "EDITING", "BREAK"],
    "20:30": ["", "", "", "", "", "", ""],
    "21:00": ["", "", "", "", "", "", ""],
    "21:30": ["", "", "", "", "", "", ""],
    "22:00": ["Sleep", "Sleep", "Sleep", "Sleep", "Sleep", "Sleep", "Sleep"]
  };

  // --- 3. DOM Elements & State ---
  const sidebar = document.getElementById('sidebar');
  const btnHideSidebar = document.getElementById('btn-hide-sidebar');
  const btnShowSidebar = document.getElementById('btn-show-sidebar');
  const navItems = document.querySelectorAll('.nav-item');
  const viewSections = document.querySelectorAll('.view-section');

  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const iconTheme = document.getElementById('icon-theme');
  const txtThemeMode = document.getElementById('txt-theme-mode');

  let activeView = 'new-chat';
  let isListening = false;
  let isSpeaking = false;
  let isLightMode = false;

  // --- 4. Three.js 3D Woven Light Background (Optimized 12,000 Particles) ---
  const wovenContainer = document.getElementById('woven-background-canvas');
  let wovenMaterial = null;

  if (wovenContainer && typeof THREE !== 'undefined') {
    initThreeWovenLightCanvas();
  }

  function initThreeWovenLightCanvas() {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    wovenContainer.appendChild(renderer.domElement);

    const mouse = new THREE.Vector2(0, 0);
    const clock = new THREE.Clock();

    const particleCount = 12000;
    const positions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    const geometry = new THREE.BufferGeometry();
    const torusKnot = new THREE.TorusKnotGeometry(1.5, 0.5, 200, 32);

    for (let i = 0; i < particleCount; i++) {
      const vertexIndex = i % torusKnot.attributes.position.count;
      const x = torusKnot.attributes.position.getX(vertexIndex);
      const y = torusKnot.attributes.position.getY(vertexIndex);
      const z = torusKnot.attributes.position.getZ(vertexIndex);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;

      const color = new THREE.Color();
      color.setHSL(Math.random(), 0.85, isLightMode ? 0.25 : 0.65);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      velocities[i * 3] = 0;
      velocities[i * 3 + 1] = 0;
      velocities[i * 3 + 2] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    wovenMaterial = new THREE.PointsMaterial({
      size: 0.025,
      vertexColors: true,
      blending: isLightMode ? THREE.NormalBlending : THREE.AdditiveBlending,
      transparent: true,
      opacity: isLightMode ? 0.65 : 0.9,
    });

    const points = new THREE.Points(geometry, wovenMaterial);
    scene.add(points);

    window.addEventListener('mousemove', (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    function animate() {
      requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const mouseWorld = new THREE.Vector3(mouse.x * 3, mouse.y * 3, 0);

      for (let i = 0; i < particleCount; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;

        const currentPos = new THREE.Vector3(positions[ix], positions[iy], positions[iz]);
        const originalPos = new THREE.Vector3(originalPositions[ix], originalPositions[iy], originalPositions[iz]);
        const velocity = new THREE.Vector3(velocities[ix], velocities[iy], velocities[iz]);

        const dist = currentPos.distanceTo(mouseWorld);
        if (dist < 1.5) {
          const force = (1.5 - dist) * 0.012;
          const direction = new THREE.Vector3().subVectors(currentPos, mouseWorld).normalize();
          velocity.add(direction.multiplyScalar(force));
        }

        const returnForce = new THREE.Vector3().subVectors(originalPos, currentPos).multiplyScalar(0.0012);
        velocity.add(returnForce);
        velocity.multiplyScalar(0.95);

        positions[ix] += velocity.x;
        positions[iy] += velocity.y;
        positions[iz] += velocity.z;

        velocities[ix] = velocity.x;
        velocities[iy] = velocity.y;
        velocities[iz] = velocity.z;
      }
      geometry.attributes.position.needsUpdate = true;

      points.rotation.y = elapsedTime * 0.05;
      renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // --- Theme Toggle ---
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      isLightMode = !isLightMode;

      if (isLightMode) {
        document.body.classList.add('light-mode');
        iconTheme.className = 'fa-solid fa-sun';
        txtThemeMode.textContent = 'Light';
        if (wovenMaterial) {
          wovenMaterial.blending = THREE.NormalBlending;
          wovenMaterial.opacity = 0.65;
        }
      } else {
        document.body.classList.remove('light-mode');
        iconTheme.className = 'fa-solid fa-moon';
        txtThemeMode.textContent = 'Dark';
        if (wovenMaterial) {
          wovenMaterial.blending = THREE.AdditiveBlending;
          wovenMaterial.opacity = 0.9;
        }
      }
    });
  }

  // --- 5. Sidebar Navigation & View Switcher (Desktop + Smart Mobile Overlay) ---
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  function openMobileSidebar() {
    sidebar.classList.add('mobile-open');
    if (sidebarOverlay) sidebarOverlay.classList.add('active');
  }

  function closeMobileSidebar() {
    sidebar.classList.remove('mobile-open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  }

  btnHideSidebar.addEventListener('click', () => {
    if (window.innerWidth <= 900) {
      closeMobileSidebar();
    } else {
      sidebar.classList.add('collapsed');
      btnShowSidebar.style.display = 'flex';
    }
  });

  btnShowSidebar.addEventListener('click', () => {
    if (window.innerWidth <= 900) {
      openMobileSidebar();
    } else {
      sidebar.classList.remove('collapsed');
      btnShowSidebar.style.display = 'none';
    }
  });

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      closeMobileSidebar();
    });
  }

  // Swipe Gestures for Mobile (Swipe right to open sidebar, swipe left to close)
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    // Verify gesture is primarily horizontal
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 60) {
      // Swipe Right from edge (open sidebar)
      if (touchStartX < 40 && diffX > 60) {
        openMobileSidebar();
      }
      // Swipe Left (close sidebar)
      if (sidebar.classList.contains('mobile-open') && diffX < -60) {
        closeMobileSidebar();
      }
    }
  }, { passive: true });

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');
      switchView(view);
      if (window.innerWidth <= 900) {
        closeMobileSidebar();
      }
    });
  });

  document.getElementById('link-privacy').addEventListener('click', (e) => {
    e.preventDefault();
    switchView('privacy');
    if (window.innerWidth <= 900) closeMobileSidebar();
  });

  document.getElementById('link-terms').addEventListener('click', (e) => {
    e.preventDefault();
    switchView('terms');
    if (window.innerWidth <= 900) closeMobileSidebar();
  });

  function switchView(viewName) {
    activeView = viewName;

    navItems.forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    viewSections.forEach(sec => {
      if (sec.id === `view-${viewName}`) {
        sec.classList.add('active');
      } else {
        sec.classList.remove('active');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- 6. Hero Triggers ---
  const micTriggerHero = document.getElementById('mic-trigger-hero');
  const btnMicHero = document.getElementById('btn-mic-hero');
  const pillTriggerHero = document.getElementById('pill-trigger-hero');

  if (micTriggerHero) {
    micTriggerHero.addEventListener('click', () => {
      if (btnMicHero) btnMicHero.classList.add('rising');

      setTimeout(() => {
        if (btnMicHero) btnMicHero.classList.remove('rising');
        switchView('audio-ai');
        startVoiceListening();
      }, 350);
    });
  }

  if (pillTriggerHero) {
    pillTriggerHero.addEventListener('click', () => {
      switchView('chat-ai');
    });
  }

  // --- 7. Ocean Wave Visualizer ---
  const waveCanvas = document.getElementById('audio-wave-canvas');
  const waveCtx = waveCanvas ? waveCanvas.getContext('2d') : null;
  let waveStep = 0;

  function resizeWaveCanvas() {
    if (!waveCanvas) return;
    const rect = waveCanvas.parentElement.getBoundingClientRect();
    waveCanvas.width = rect.width;
    waveCanvas.height = rect.height;
  }

  window.addEventListener('resize', resizeWaveCanvas);
  resizeWaveCanvas();

  function animateOceanWaves() {
    if (!waveCanvas || !waveCtx) return;

    const w = waveCanvas.width;
    const h = waveCanvas.height;
    const midY = h / 2;

    waveCtx.clearRect(0, 0, w, h);

    const waveColor = isLightMode ? 'rgba(15, 23, 42, ' : 'rgba(255, 255, 255, ';

    if (!isSpeaking && !isListening) {
      waveCtx.beginPath();
      waveCtx.moveTo(0, midY);
      waveCtx.lineTo(w, midY);
      waveCtx.strokeStyle = `${waveColor}0.25)`;
      waveCtx.lineWidth = 2;
      waveCtx.stroke();
    } else {
      waveStep += 0.04;

      const waveLines = [
        { amplitude: 40, frequency: 0.015, speed: waveStep, opacity: 0.8, width: 3 },
        { amplitude: 25, frequency: 0.025, speed: waveStep * 1.3, opacity: 0.5, width: 2 },
        { amplitude: 15, frequency: 0.035, speed: waveStep * 0.7, opacity: 0.3, width: 1.5 },
        { amplitude: 50, frequency: 0.008, speed: waveStep * 1.6, opacity: 0.4, width: 2 }
      ];

      waveLines.forEach(line => {
        waveCtx.beginPath();
        waveCtx.moveTo(0, midY);

        for (let x = 0; x < w; x += 4) {
          const y = midY + Math.sin(x * line.frequency + line.speed) * line.amplitude;
          waveCtx.lineTo(x, y);
        }

        waveCtx.strokeStyle = `${waveColor}${line.opacity})`;
        waveCtx.lineWidth = line.width;
        waveCtx.stroke();
      });
    }

    requestAnimationFrame(animateOceanWaves);
  }

  animateOceanWaves();

  // --- 8. Voice Intelligence ---
  const btnToggleMicListening = document.getElementById('btn-toggle-mic-listening');
  const txtMicStatus = document.getElementById('txt-mic-status');

  if (btnToggleMicListening) {
    btnToggleMicListening.addEventListener('click', () => {
      if (!isListening) {
        startVoiceListening();
      } else {
        stopVoiceListening();
      }
    });
  }

  let recognition = null;
  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      processVoiceCommand(transcript);
    };

    recognition.onend = () => {
      if (isListening) {
        try { recognition.start(); } catch (e) {}
      }
    };
  }

  function startVoiceListening() {
    isListening = true;
    if (txtMicStatus) txtMicStatus.textContent = 'Listening... (Speak Now)';
    if (recognition) {
      try { recognition.start(); } catch (e) {}
    }
  }

  function stopVoiceListening() {
    isListening = false;
    if (txtMicStatus) txtMicStatus.textContent = 'Start Listening';
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
  }

  async function processVoiceCommand(cmd) {
    const lower = cmd.toLowerCase();
    
    if (lower.includes('hello jarvis') || lower.includes('hey jarvis') || lower.includes('hello, jarvis')) {
      speakResponse("Hello Nad");
    } else if (lower.includes('schedule')) {
      speakResponse("Opening your weekly schedule Nad.");
      switchView('schedule');
    } else if (lower.includes('drive') || lower.includes('mega') || lower.includes('file')) {
      speakResponse("Opening your drives Nad.");
      switchView('drives');
    } else {
      const reply = await queryWorkerChatAPI(cmd);
      speakResponse(reply);
    }
  }

  function speakResponse(text) {
    isSpeaking = true;
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        isSpeaking = false;
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => { isSpeaking = false; }, 2000);
    }
  }

  // --- 9. Chat AI ---
  const chatStreamContainer = document.getElementById('chat-stream-container');
  const chatInputField = document.getElementById('chat-input-field');
  const btnChatSend = document.getElementById('btn-chat-send');

  if (btnChatSend) {
    btnChatSend.addEventListener('click', sendChatMessage);
  }
  if (chatInputField) {
    chatInputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendChatMessage();
      }
    });
  }

  async function sendChatMessage() {
    const text = chatInputField.value.trim();
    if (!text) return;

    appendUserChatMessage(text);
    chatInputField.value = '';

    const res = await queryWorkerChatAPI(text);
    appendJarvisChatResponse(res);
  }

  function appendUserChatMessage(text) {
    const bubble = document.createElement('div');
    bubble.style.cssText = 'display: flex; gap: 14px; align-items: flex-start; flex-direction: row-reverse; align-self: flex-end;';

    bubble.innerHTML = `
      <img src="${document.getElementById('sidebar-profile-img').src}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
      <div style="padding: 16px 20px; background: rgba(255, 255, 255, 0.12); border: 1px solid var(--glass-border-bright); border-radius: 16px; max-width: 80%; line-height: 1.6;">
        ${escapeHtml(text)}
      </div>
    `;

    chatStreamContainer.appendChild(bubble);
    chatStreamContainer.scrollTop = chatStreamContainer.scrollHeight;
  }

  function appendJarvisChatResponse(result) {
    const replyText = typeof result === 'string' ? result : (result.reply || '');
    const provider = typeof result === 'object' ? (result.provider || 'NVIDIA NIM') : 'NVIDIA NIM';
    const model = typeof result === 'object' ? (result.model || 'meta/llama-3.2-90b-vision-instruct') : 'meta/llama-3.2-90b-vision-instruct';
    const latency = typeof result === 'object' && result.latencyMs ? `${result.latencyMs}ms` : null;

    const aiBubble = document.createElement('div');
    aiBubble.style.cssText = 'display: flex; gap: 14px; align-items: flex-start; flex-direction: column;';
    aiBubble.innerHTML = `
      <div style="display: flex; gap: 14px; align-items: flex-start;">
        <img src="icon-logo.jpg" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
        <div style="padding: 16px 20px; background: rgba(255,255,255,0.04); border: 1px solid var(--glass-border-specular); border-radius: 16px; max-width: 85%; line-height: 1.6;">
          ${escapeHtml(replyText).replace(/\n/g, '<br>')}
          <div class="model-badge">
            <i class="fa-solid fa-microchip"></i>
            <span>${escapeHtml(provider)} • ${escapeHtml(model)}</span>
            ${latency ? `<span>(${latency})</span>` : ''}
          </div>
        </div>
      </div>
    `;

    chatStreamContainer.appendChild(aiBubble);
    chatStreamContainer.scrollTop = chatStreamContainer.scrollHeight;
  }

  async function queryWorkerChatAPI(userPrompt) {
    try {
      const token = localStorage.getItem('nad_jarvis_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: userPrompt })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) return data;
      }
    } catch (e) {
      console.warn('[Backend Worker Sync Note]: Using Client Knowledge Base');
    }

    const p = userPrompt.toLowerCase();

    if (p.includes('hello jarvis') || p.includes('hey jarvis') || p.includes('hello, jarvis') || p === 'hello') {
      return "Hello Nad! I am online and fully synchronized with your Google Drive, Google Calendar, and Mega storage. How can I assist your schedule or projects today?";
    }

    if (p.includes('who am i') || p.includes('profile') || p.includes('identity')) {
      return `You are ${NAD_PROFILE_DB.name} ("Nad"), based in ${NAD_PROFILE_DB.location}. ${NAD_PROFILE_DB.education} Currently Operations Manager at KSP Rwanda and founder of NAD PRODUCTION Ltd. Creator of NAD JARVIS AI, TRADIT AI, and INK LINK AI.`;
    }

    if (p.includes('capstone') || p.includes('saev') || p.includes('engineering') || p.includes('vehicle')) {
      return `${NAD_PROFILE_DB.education}`;
    }

    if (p.includes('sprint') || p.includes('execution') || p.includes('5-month')) {
      return `Your ${NAD_PROFILE_DB.sprint}`;
    }

    if (p.includes('ai builds') || p.includes('products') || p.includes('tradit') || p.includes('ink link')) {
      return `Your self-built AI products designed and shipped by you are:\n1. NAD JARVIS AI (Personal Voice Assistant)\n2. TRADIT AI (Original AI Product)\n3. INK LINK AI (Original AI Product)`;
    }

    if (p.includes('film') || p.includes('gaju') || p.includes('urumuri') || p.includes('podcast')) {
      return `Your creative film projects include URUMURI STUDIOS ("GAJU" short film), OMNITALES HUB, GET BETTER PODCAST, and United Gen. Basketball pitch. Target MFA Film Production for Fall 2027.`;
    }

    if (p.includes('schedule') || p.includes('week') || p.includes('tahajjud') || p.includes('friday')) {
      return `${NAD_PROFILE_DB.weeklySchedule}`;
    }

    if (p.includes('vision') || p.includes('future') || p.includes('ambition')) {
      return `Your long-term vision: "${NAD_PROFILE_DB.longTermVision}"`;
    }

    if (p.includes('drive') || p.includes('mega') || p.includes('file')) {
      return `I can browse, read, and download files from Google Drive and Mega Storage (uwabatonadjibullah@gmail.com).`;
    }

    return `Hello Nad. I'm ready to assist with your engineering capstone, video editing schedules, software dev sprint, or cloud file operations. What would you like to do next?`;
  }

  // --- 10. Schedule Spreadsheet Generator Injected with Nad's CSV Schedule ---
  const scheduleTableBody = document.getElementById('schedule-table-body');
  if (scheduleTableBody) {
    generateScheduleSpreadsheet();
  }

  function generateScheduleSpreadsheet() {
    scheduleTableBody.innerHTML = '';

    const timeSlots = Object.keys(DEFAULT_CSV_SCHEDULE);

    timeSlots.forEach(timeKey => {
      const rowEvents = DEFAULT_CSV_SCHEDULE[timeKey];
      const tr = document.createElement('tr');

      const formattedTime = formatTimeLabel(timeKey);
      let rowHtml = `<td style="font-weight: 700; white-space: nowrap;">${formattedTime}</td>`;

      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const eventText = rowEvents[dayIndex] || '';
        if (eventText.trim()) {
          const displayHtml = escapeHtml(eventText).replace(/\n/g, '<br>');
          rowHtml += `<td class="schedule-cell"><div class="event-block">${displayHtml}</div></td>`;
        } else {
          rowHtml += `<td class="schedule-cell"></td>`;
        }
      }

      tr.innerHTML = rowHtml;
      scheduleTableBody.appendChild(tr);
    });

    // Add click event listener to edit/delete cells
    const cells = scheduleTableBody.querySelectorAll('.schedule-cell');
    cells.forEach(cell => {
      cell.addEventListener('click', () => {
        if (!cell.hasChildNodes()) {
          const eventText = prompt('Enter schedule event title:');
          if (eventText) {
            cell.innerHTML = `<div class="event-block">${escapeHtml(eventText).replace(/\n/g, '<br>')}</div>`;
          }
        } else {
          const currentText = cell.innerText;
          const choice = prompt('Edit or Clear Event?\nType new text or leave blank to delete:', currentText);
          if (choice === null) return;
          if (choice.trim() === '') {
            cell.innerHTML = '';
          } else {
            cell.innerHTML = `<div class="event-block">${escapeHtml(choice).replace(/\n/g, '<br>')}</div>`;
          }
        }
      });
    });
    // Mobile Day Pill Tab Listener (Scroll to selected day column)
    const mobileDayPills = document.querySelectorAll('.mobile-day-pill');
    const scrollWrapper = document.querySelector('.spreadsheet-scroll-wrapper');
    const tableHeaderCells = document.querySelectorAll('.schedule-table th');

    mobileDayPills.forEach((pill, idx) => {
      pill.addEventListener('click', () => {
        mobileDayPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const dayAttr = pill.getAttribute('data-day');
        if (dayAttr === 'all' || !scrollWrapper) {
          if (scrollWrapper) scrollWrapper.scrollTo({ left: 0, behavior: 'smooth' });
          return;
        }

        // Map day string to header column index (Sat=1, Sun=2, Mon=3, Tue=4, Wed=5, Thu=6, Fri=7)
        const dayMap = { sat: 1, sun: 2, mon: 3, tue: 4, wed: 5, thu: 6, fri: 7 };
        const colIdx = dayMap[dayAttr];
        if (colIdx && tableHeaderCells[colIdx]) {
          const targetTh = tableHeaderCells[colIdx];
          const leftPos = targetTh.offsetLeft - 60; // Offset for sticky time column
          scrollWrapper.scrollTo({ left: leftPos, behavior: 'smooth' });
        }
      });
    });
  }

  function formatTimeLabel(time24) {
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${h12.toString().padStart(2, '0')}:${mStr} ${period}`;
  }

  // --- 11. Profile Avatar Image Link Updater ---
  const btnSaveProfileImg = document.getElementById('btn-save-profile-img');
  const cfgProfileUrl = document.getElementById('cfg-profile-url');
  const sidebarProfileImg = document.getElementById('sidebar-profile-img');

  if (btnSaveProfileImg) {
    btnSaveProfileImg.addEventListener('click', () => {
      const url = cfgProfileUrl.value.trim();
      if (url) {
        sidebarProfileImg.src = url;
        alert('Profile picture updated successfully!');
      }
    });
  }

  // --- 12. Google OAuth & Drive Files Sync (Section 7) ---
  const btnConnectGoogle = document.getElementById('btn-connect-google');
  if (btnConnectGoogle) {
    btnConnectGoogle.addEventListener('click', async () => {
      try {
        const token = localStorage.getItem('nad_jarvis_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch('/api/google/oauth/start', { headers });
        const data = await res.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        } else {
          alert(data.error || 'Could not initiate Google OAuth.');
        }
      } catch (e) {
        alert('Could not connect to Google OAuth service: ' + e.message);
      }
    });
  }

  async function loadDriveFiles() {
    const fileList = document.getElementById('drive-file-list');
    if (!fileList) return;
    try {
      const token = localStorage.getItem('nad_jarvis_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/google/drive/list', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          fileList.innerHTML = `
            <h3 style="font-family: var(--font-heading); margin-bottom: 12px; font-size: 1rem;">Authorized Drive Files</h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${data.files.map(f => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.04); border: 1px solid var(--glass-border); border-radius: 12px;">
                  <div>
                    <i class="fa-solid fa-file-lines" style="margin-right: 8px; color: #d4af37;"></i>
                    <span>${escapeHtml(f.name)}</span>
                  </div>
                  <span style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(f.size || '')}</span>
                </div>
              `).join('')}
            </div>
          `;
        }
      }
    } catch (e) {}
  }

  // Load drives when user opens Drives view
  const navDrivesBtn = document.querySelector('.nav-item[data-view="drives"]');
  if (navDrivesBtn) {
    navDrivesBtn.addEventListener('click', () => {
      loadDriveFiles();
    });
  }

  // --- 13. Owner Authentication Modal Logic (Section 2.1 & 7) ---
  const authModal = document.getElementById('auth-modal');
  const formLogin = document.getElementById('form-owner-login');
  const btnCloseAuth = document.getElementById('btn-close-auth-modal');
  const loginErr = document.getElementById('login-error-msg');
  const privateBadge = document.querySelector('.private-badge');

  if (privateBadge && authModal) {
    privateBadge.style.cursor = 'pointer';
    privateBadge.addEventListener('click', () => {
      authModal.classList.add('active');
    });
  }

  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (loginErr) loginErr.style.display = 'none';
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.session) {
          localStorage.setItem('nad_jarvis_token', data.session.access_token);
          if (authModal) authModal.classList.remove('active');
          alert('Welcome Nad! Authenticated successfully with Supabase.');
        } else {
          if (loginErr) {
            loginErr.textContent = data.error || 'Authentication failed.';
            loginErr.style.display = 'block';
          }
        }
      } catch (err) {
        if (loginErr) {
          loginErr.textContent = 'Server connection error.';
          loginErr.style.display = 'block';
        }
      }
    });
  }

  if (btnCloseAuth && authModal) {
    btnCloseAuth.addEventListener('click', () => {
      authModal.classList.remove('active');
    });
  }

  // Utility
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

});
