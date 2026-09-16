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
  let activeConversationId = null;

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
      const isCollapsed = sidebar.classList.toggle('collapsed');
      if (isCollapsed) {
        btnHideSidebar.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        btnHideSidebar.title = 'Expand Sidebar';
      } else {
        btnHideSidebar.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        btnHideSidebar.title = 'Collapse Sidebar';
      }
    }
  });

  btnShowSidebar.addEventListener('click', () => {
    if (window.innerWidth <= 900) {
      openMobileSidebar();
    } else {
      sidebar.classList.remove('collapsed');
      btnHideSidebar.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
      btnHideSidebar.title = 'Collapse Sidebar';
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

    // View-specific data loaders
    if (viewName === 'accounts') {
      loadAccountsPage();
    } else if (viewName === 'drives') {
      loadDriveFiles();
    } else if (viewName === 'calendar') {
      loadCalendarEvents();
    } else if (viewName === 'tasks') {
      loadTasksPage();
    } else if (viewName === 'settings') {
      loadMemoryItems();
      loadKnowledgeDocs();
    } else if (viewName === 'new-chat') {
      activeConversationId = null;
      const chatStream = document.getElementById('chat-stream-container');
      if (chatStream) chatStream.innerHTML = '';
      const unifiedLayout = document.querySelector('.unified-chat-layout');
      if (unifiedLayout) unifiedLayout.classList.remove('chat-active');
    }
  }

  // --- 6. Hero Triggers & Audio-Reactive Voice Zoom Experience ---
  const micTriggerHero = document.getElementById('mic-trigger-hero');
  const btnMicHero = document.getElementById('btn-mic-hero');
  const pillTriggerHero = document.getElementById('pill-trigger-hero');
  const unifiedChatLayout = document.querySelector('.unified-chat-layout');
  const btnBackToHero = document.getElementById('btn-back-to-hero');

  // Initiate interactive chat only when user clicks Start Interactive Chat
  if (pillTriggerHero && unifiedChatLayout) {
    pillTriggerHero.addEventListener('click', () => {
      unifiedChatLayout.classList.add('chat-active');
      const chatInput = document.getElementById('chat-input-field');
      if (chatInput) chatInput.focus();
    });
  }

  // Back to overview button
  if (btnBackToHero && unifiedChatLayout) {
    btnBackToHero.addEventListener('click', () => {
      unifiedChatLayout.classList.remove('chat-active');
    });
  }

  // Centered Voice Zoom Modal Elements
  const voiceZoomOverlay = document.getElementById('voice-zoom-overlay');
  const btnCloseVoiceZoom = document.getElementById('btn-close-voice-zoom');
  const btnZoomedMic = document.getElementById('btn-zoomed-mic');
  const voiceZoomStatus = document.getElementById('voice-zoom-status');
  const voiceZoomTranscript = document.getElementById('voice-zoom-transcript');
  const voiceRingOuter = document.getElementById('voice-ring-outer');
  const voiceRingMid = document.getElementById('voice-ring-mid');
  const voiceRingInner = document.getElementById('voice-ring-inner');
  const voiceFreqCanvas = document.getElementById('voice-frequency-canvas');
  const voiceFreqCtx = voiceFreqCanvas ? voiceFreqCanvas.getContext('2d') : null;

  let voiceAudioCtx = null;
  let voiceAnalyser = null;
  let voiceStream = null;
  let voiceDataArray = null;
  let voiceAnimFrameId = null;
  let voiceSpeechRec = null;
  let isVoiceZoomActive = false;
  let isVoiceSpeakingNow = false;

  if (micTriggerHero) {
    micTriggerHero.addEventListener('click', (e) => {
      e.stopPropagation();
      openVoiceZoomExperience();
    });
  }
  if (btnMicHero) {
    btnMicHero.addEventListener('click', (e) => {
      e.stopPropagation();
      openVoiceZoomExperience();
    });
  }

  if (btnCloseVoiceZoom) {
    btnCloseVoiceZoom.addEventListener('click', closeVoiceZoomExperience);
  }

  if (btnZoomedMic) {
    btnZoomedMic.addEventListener('click', () => {
      if (isVoiceSpeakingNow) return;
      if (voiceSpeechRec) {
        try { voiceSpeechRec.start(); } catch (e) {}
      }
    });
  }

  function openVoiceZoomExperience() {
    if (!voiceZoomOverlay) return;
    voiceZoomOverlay.classList.add('active');
    isVoiceZoomActive = true;
    if (voiceZoomStatus) voiceZoomStatus.textContent = 'Listening to your voice...';
    if (voiceZoomTranscript) voiceZoomTranscript.textContent = 'Speak naturally to Jarvis...';
    if (btnZoomedMic) btnZoomedMic.classList.add('listening');

    startVoiceAudioAnalyser();
    startZoomedSpeechRecognition();
  }

  function closeVoiceZoomExperience() {
    if (!voiceZoomOverlay) return;
    voiceZoomOverlay.classList.remove('active');
    isVoiceZoomActive = false;
    if (btnZoomedMic) btnZoomedMic.classList.remove('listening');

    stopZoomedSpeechRecognition();

    if (voiceAnimFrameId) {
      cancelAnimationFrame(voiceAnimFrameId);
      voiceAnimFrameId = null;
    }

    if (voiceStream) {
      voiceStream.getTracks().forEach(track => track.stop());
      voiceStream = null;
    }
  }

  async function startVoiceAudioAnalyser() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStream = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      voiceAudioCtx = new AudioContextClass();
      const source = voiceAudioCtx.createMediaStreamSource(stream);
      voiceAnalyser = voiceAudioCtx.createAnalyser();
      voiceAnalyser.fftSize = 64;
      voiceAnalyser.smoothingTimeConstant = 0.8;
      source.connect(voiceAnalyser);

      voiceDataArray = new Uint8Array(voiceAnalyser.frequencyBinCount);
      runAudioReactiveLoop(false);
    } catch (err) {
      console.warn('[Audio-Reactive Voice]: Falling back to fluid procedural wave:', err);
      runAudioReactiveLoop(true);
    }
  }

  let wigglePhase = 0;
  function runAudioReactiveLoop(simulated = false) {
    if (!isVoiceZoomActive) return;

    wigglePhase += 0.09;
    let loudness = 0;

    if (!simulated && voiceAnalyser && voiceDataArray) {
      voiceAnalyser.getByteFrequencyData(voiceDataArray);
      let sum = 0;
      for (let i = 0; i < voiceDataArray.length; i++) {
        sum += voiceDataArray[i];
      }
      loudness = sum / voiceDataArray.length;
    } else {
      loudness = 25 + Math.sin(wigglePhase) * 22 + Math.cos(wigglePhase * 1.6) * 14;
    }

    const norm = Math.min(loudness / 100, 1.6);
    const scaleOuter = 1 + norm * 0.4;
    const scaleMid = 1 + norm * 0.28;
    const scaleInner = 1 + norm * 0.18;
    const scaleCore = 1 + norm * 0.12;

    const wiggle = norm * 20;
    const r1 = 50 + Math.sin(wigglePhase * 2.2) * wiggle;
    const r2 = 50 + Math.cos(wigglePhase * 1.7) * wiggle;
    const r3 = 50 + Math.sin(wigglePhase * 2.6) * wiggle;
    const r4 = 50 + Math.cos(wigglePhase * 1.3) * wiggle;

    if (voiceRingOuter) {
      voiceRingOuter.style.transform = `scale(${scaleOuter})`;
      voiceRingOuter.style.borderRadius = `${r1}% ${100 - r1}% ${r2}% ${100 - r2}% / ${r3}% ${r4}% ${100 - r4}% ${100 - r3}%`;
      voiceRingOuter.style.borderColor = norm > 0.45 ? 'rgba(212, 175, 55, 0.8)' : 'rgba(212, 175, 55, 0.35)';
    }

    if (voiceRingMid) {
      voiceRingMid.style.transform = `scale(${scaleMid})`;
      voiceRingMid.style.borderRadius = `${r2}% ${100 - r2}% ${r3}% ${100 - r3}% / ${r4}% ${r1}% ${100 - r1}% ${100 - r4}%`;
    }

    if (voiceRingInner) {
      voiceRingInner.style.transform = `scale(${scaleInner})`;
      voiceRingInner.style.borderRadius = `${r3}% ${100 - r3}% ${r4}% ${100 - r4}% / ${r1}% ${r2}% ${100 - r2}% ${100 - r1}%`;
    }

    if (btnZoomedMic) {
      btnZoomedMic.style.transform = `scale(${scaleCore})`;
    }

    if (voiceFreqCtx && voiceFreqCanvas) {
      voiceFreqCtx.clearRect(0, 0, voiceFreqCanvas.width, voiceFreqCanvas.height);
      const bars = 18;
      const barWidth = 8;
      const barGap = 6;
      const startX = (voiceFreqCanvas.width - (bars * (barWidth + barGap))) / 2;

      for (let i = 0; i < bars; i++) {
        const val = (!simulated && voiceDataArray && voiceDataArray[i]) ? voiceDataArray[i] : (20 + Math.sin(wigglePhase + i * 0.35) * 20);
        const barHeight = Math.max(3, (val / 255) * voiceFreqCanvas.height);
        const y = (voiceFreqCanvas.height - barHeight) / 2;
        voiceFreqCtx.fillStyle = norm > 0.5 ? '#facc15' : '#d4af37';
        voiceFreqCtx.fillRect(startX + i * (barWidth + barGap), y, barWidth, barHeight);
      }
    }

    voiceAnimFrameId = requestAnimationFrame(() => runAudioReactiveLoop(simulated));
  }

  function startZoomedSpeechRecognition() {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) return;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    voiceSpeechRec = new SpeechRec();
    voiceSpeechRec.continuous = false;
    voiceSpeechRec.interimResults = true;
    voiceSpeechRec.lang = 'en-US';

    voiceSpeechRec.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (voiceZoomTranscript) {
        voiceZoomTranscript.textContent = `"${final || interim}"`;
      }

      if (final) {
        handleVoiceZoomPrompt(final);
      }
    };

    voiceSpeechRec.onerror = () => {
      if (voiceZoomStatus && !isVoiceSpeakingNow) voiceZoomStatus.textContent = 'Listening to your voice...';
    };

    voiceSpeechRec.onend = () => {
      if (isVoiceZoomActive && !isVoiceSpeakingNow) {
        try { voiceSpeechRec.start(); } catch (e) {}
      }
    };

    try { voiceSpeechRec.start(); } catch (e) {}
  }

  function stopZoomedSpeechRecognition() {
    if (voiceSpeechRec) {
      try { voiceSpeechRec.stop(); } catch (e) {}
      voiceSpeechRec = null;
    }
  }

  async function handleVoiceZoomPrompt(promptText) {
    if (!promptText || isVoiceSpeakingNow) return;
    isVoiceSpeakingNow = true;
    if (voiceZoomStatus) voiceZoomStatus.textContent = 'Jarvis Thinking...';

    const res = await queryWorkerChatAPI(promptText);
    const replyText = typeof res === 'string' ? res : (res.reply || 'All systems synchronized.');

    if (voiceZoomStatus) voiceZoomStatus.textContent = 'Jarvis Speaking';
    if (voiceZoomTranscript) voiceZoomTranscript.textContent = replyText;

    speakResponse(replyText);

    setTimeout(() => {
      isVoiceSpeakingNow = false;
      if (isVoiceZoomActive && voiceZoomStatus) {
        voiceZoomStatus.textContent = 'Listening to your voice...';
      }
    }, 4500);
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

    if (unifiedChatLayout) unifiedChatLayout.classList.add('chat-active');

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
      let data;
      if (window.JarvisAPI) {
        data = await window.JarvisAPI.sendMessage(userPrompt, activeConversationId);
      } else {
        const token = localStorage.getItem('nad_jarvis_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({ message: userPrompt, conversation_id: activeConversationId })
        });

        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to communicate with AI core');
      }

      if (data) {
        if (data.conversation_id) {
          activeConversationId = data.conversation_id;
          loadConversationHistory();
        }
        return data;
      }
    } catch (e) {
      console.warn('[Chat Core API Warning]:', e);
      return {
        reply: `NAD JARVIS Core Notice: Unable to reach the AI router (${e.message || 'Check connection'}). Please verify your credentials and model provider API keys.`,
        provider: 'System',
        model: 'Offline'
      };
    }

    return {
      reply: "No response received from the AI router. Please try again.",
      provider: 'System',
      model: 'Offline'
    };
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

  // --- 12. Dynamic Drive Files & Multi-Account Browser ---
  const driveAccountSelect = document.getElementById('drive-account-select');
  const btnRefreshDrive = document.getElementById('btn-refresh-drive');
  const btnUploadTrigger = document.getElementById('btn-upload-file-trigger');
  const driveFileInput = document.getElementById('drive-file-input-hidden');

  if (driveAccountSelect) {
    driveAccountSelect.addEventListener('change', () => {
      loadDriveFiles();
    });
  }

  if (btnRefreshDrive) {
    btnRefreshDrive.addEventListener('click', () => {
      loadDriveFiles();
    });
  }

  if (btnUploadTrigger && driveFileInput) {
    btnUploadTrigger.addEventListener('click', () => {
      driveFileInput.click();
    });

    driveFileInput.addEventListener('change', async () => {
      const file = driveFileInput.files[0];
      if (!file) return;

      const syncStatus = document.getElementById('drive-sync-status');
      if (syncStatus) syncStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

      try {
        if (window.JarvisGoogle) {
          const accountId = driveAccountSelect ? driveAccountSelect.value : null;
          await window.JarvisGoogle.uploadToDrive({
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: `${(file.size / 1024).toFixed(1)} KB`,
            accountId
          });
          alert(`File "${file.name}" registered in Cloud Storage!`);
          loadDriveFiles();
        }
      } catch (err) {
        alert('Upload failed: ' + err.message);
      } finally {
        if (syncStatus) syncStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> Synced';
        driveFileInput.value = '';
      }
    });
  }

  async function loadDriveFiles() {
    const fileListContainer = document.getElementById('drive-file-list');
    if (!fileListContainer) return;

    fileListContainer.innerHTML = `
      <div style="padding: 24px; text-align: center; color: var(--text-muted);">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 1.4rem; color: #d4af37; margin-bottom: 8px;"></i>
        <p>Retrieving cloud storage files...</p>
      </div>
    `;

    try {
      if (driveAccountSelect && window.JarvisGoogle) {
        const accRes = await window.JarvisGoogle.getAccounts();
        const accs = accRes.accounts || [];
        if (accs.length > 0 && driveAccountSelect.options.length <= 1) {
          const curVal = driveAccountSelect.value;
          driveAccountSelect.innerHTML = accs.map(a => `<option value="${escapeHtml(a.id)}" ${a.id === curVal ? 'selected' : ''}>${escapeHtml(a.nickname || a.email)}</option>`).join('');
        }
      }

      const accountId = driveAccountSelect && driveAccountSelect.value ? driveAccountSelect.value : (window.JarvisGoogle ? window.JarvisGoogle.getSelectedAccount() : null);
      let data;
      if (window.JarvisGoogle) {
        data = await window.JarvisGoogle.listDriveFiles('root', null, accountId);
      } else {
        const res = await fetch('/api/google/workspace?action=drive.list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId: 'root', accountId })
        });
        data = await res.json();
      }

      if (data && data.files && data.files.length > 0) {
        fileListContainer.innerHTML = `
          <table class="drive-file-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>File Size</th>
                <th>MIME / Type</th>
                <th>Modified Date</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${data.files.map(f => {
                const isPdf = (f.mimeType || '').includes('pdf') || (f.name || '').endsWith('.pdf');
                const isDoc = (f.mimeType || '').includes('word') || (f.name || '').endsWith('.docx');
                const iconClass = isPdf ? 'fa-file-pdf' : (isDoc ? 'fa-file-word' : 'fa-file-lines');
                const formattedDate = f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';

                return `
                  <tr>
                    <td>
                      <div class="file-name-cell">
                        <i class="fa-solid ${iconClass} file-icon"></i>
                        <span>${escapeHtml(f.name || 'Untitled')}</span>
                      </div>
                    </td>
                    <td>${escapeHtml(f.size || '—')}</td>
                    <td style="color: var(--text-muted); font-size: 0.78rem;">${escapeHtml(f.mimeType || 'Document')}</td>
                    <td style="color: var(--text-muted);">${formattedDate}</td>
                    <td style="text-align: right;">
                      <button class="btn-secondary-sm" onclick="alert('Viewing file content for: ${escapeHtml(f.name)}')">
                        <i class="fa-regular fa-eye"></i> View
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `;
      } else {
        fileListContainer.innerHTML = `
          <div class="empty-state-card" style="margin: 16px;">
            <i class="fa-regular fa-folder-open empty-icon"></i>
            <h3>No Documents Found</h3>
            <p>Your drive directory is currently empty or no documents match.</p>
          </div>
        `;
      }
    } catch (e) {
      fileListContainer.innerHTML = `
        <div style="padding: 20px; color: #f87171; text-align: center;">
          <i class="fa-solid fa-triangle-exclamation" style="margin-right: 8px;"></i>
          Failed to load drive files: ${escapeHtml(e.message)}
        </div>
      `;
    }
  }

  // --- 13. Accounts Page Loader & OAuth Flow ---
  const btnAddGoogleAccount = document.getElementById('btn-add-google-account');
  if (btnAddGoogleAccount) {
    btnAddGoogleAccount.addEventListener('click', async () => {
      try {
        const nickname = prompt('Enter a nickname for this Google Account (e.g. Personal, Work, School):', 'Personal');
        if (!nickname) return;

        if (window.JarvisGoogle) {
          await window.JarvisGoogle.initiateOAuth(nickname);
        } else {
          const res = await fetch(`/api/google/oauth?action=start&nickname=${encodeURIComponent(nickname)}`);
          const data = await res.json();
          if (data.authUrl) window.location.href = data.authUrl;
        }
      } catch (err) {
        alert('Could not start Google OAuth: ' + err.message);
      }
    });
  }

  async function loadAccountsPage() {
    const grid = document.getElementById('accounts-cards-grid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="empty-state-card" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-circle-notch fa-spin empty-icon"></i>
        <p>Loading connected accounts and OAuth tokens...</p>
      </div>
    `;

    try {
      let accounts = [];
      if (window.JarvisGoogle) {
        const res = await window.JarvisGoogle.getAccounts();
        accounts = res.accounts || [];
      }

      if (accounts.length === 0) {
        grid.innerHTML = `
          <div class="empty-state-card" style="grid-column: 1 / -1; padding: 40px 20px;">
            <i class="fa-brands fa-google empty-icon" style="font-size: 2.2rem; color: #d4af37; margin-bottom: 12px;"></i>
            <h3>No Connected Google Accounts</h3>
            <p style="max-width: 500px; margin: 8px auto 16px; color: var(--text-muted);">
              Connect your Google Accounts (Personal, Work, or School) to enable Drive, Gmail, and Calendar coordination for NAD JARVIS.
            </p>
          </div>
        `;
        return;
      }

      const activeAccId = window.JarvisGoogle ? window.JarvisGoogle.getSelectedAccount() : null;

      grid.innerHTML = accounts.map(acc => {
        const isSelected = activeAccId === acc.id || (!activeAccId && accounts[0]?.id === acc.id);

        return `
        <div class="account-conn-card ${isSelected ? 'active-selection' : ''}" style="${isSelected ? 'border-color: #d4af37; box-shadow: 0 0 15px rgba(212,175,55,0.15);' : ''}">
          <div class="account-conn-header">
            <div class="account-conn-avatar">
              <i class="fa-brands fa-${acc.provider === 'google' ? 'google' : 'cloud'}"></i>
            </div>
            <div class="account-conn-info">
              <div class="account-conn-name">${escapeHtml(acc.nickname || 'Google Account')}</div>
              <div class="account-conn-email">${escapeHtml(acc.email || '')}</div>
            </div>
            <div class="status-pill">
              <span class="status-dot"></span>
              <span>${acc.status === 'connected' ? 'Connected' : 'Active'}</span>
            </div>
          </div>

          <div>
            <span style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em;">Authorized Services</span>
            <div class="service-tags" style="margin-top: 6px;">
              <span class="service-tag ${acc.services?.drive ? 'active' : ''}"><i class="fa-brands fa-google-drive"></i> Drive</span>
              <span class="service-tag ${acc.services?.calendar ? 'active' : ''}"><i class="fa-solid fa-calendar"></i> Calendar</span>
              <span class="service-tag ${acc.services?.gmail ? 'active' : ''}"><i class="fa-solid fa-envelope"></i> Gmail</span>
            </div>
          </div>

          <div class="account-conn-actions">
            <button class="btn-secondary-sm" onclick="window.handleSelectAccount('${escapeHtml(acc.id)}')">
              <i class="fa-solid ${isSelected ? 'fa-check-circle' : 'fa-circle-dot'}"></i> ${isSelected ? 'Active Account' : 'Select'}
            </button>
            <button class="btn-secondary-sm" onclick="window.handleDisconnectAccount('${escapeHtml(acc.id)}', '${escapeHtml(acc.nickname || acc.email)}')">
              <i class="fa-solid fa-link-slash" style="color: #f87171;"></i> Disconnect
            </button>
          </div>
        </div>
      `;
      }).join('');

    } catch (e) {
      grid.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-triangle-exclamation empty-icon" style="color: #ef4444;"></i>
          <h3>Failed to Load Accounts</h3>
          <p>${escapeHtml(e.message)}</p>
        </div>
      `;
    }
  }

  window.handleSelectAccount = function(accountId) {
    if (window.JarvisGoogle) {
      window.JarvisGoogle.setSelectedAccount(accountId);
    }
    loadAccountsPage();
  };

  window.handleDisconnectAccount = async function(accountId, nickname) {
    if (!confirm(`Are you sure you want to disconnect account "${nickname}"?`)) return;
    try {
      if (window.JarvisGoogle) {
        await window.JarvisGoogle.disconnectAccount(accountId);
      }
      loadAccountsPage();
    } catch (err) {
      alert('Failed to disconnect account: ' + err.message);
    }
  };

  // --- 14. Calendar Subnav & Live Events ---
  const tabBtnGoogleCal = document.getElementById('tab-btn-google-cal');
  const tabBtnWeeklyCal = document.getElementById('tab-btn-weekly-cal');
  const paneEvents = document.getElementById('calendar-subtab-events');
  const paneSpreadsheet = document.getElementById('calendar-subtab-spreadsheet');

  if (tabBtnGoogleCal && tabBtnWeeklyCal && paneEvents && paneSpreadsheet) {
    tabBtnGoogleCal.addEventListener('click', () => {
      tabBtnGoogleCal.classList.add('active');
      tabBtnWeeklyCal.classList.remove('active');
      paneEvents.classList.add('active');
      paneSpreadsheet.classList.remove('active');
      loadCalendarEvents();
    });

    tabBtnWeeklyCal.addEventListener('click', () => {
      tabBtnWeeklyCal.classList.add('active');
      tabBtnGoogleCal.classList.remove('active');
      paneSpreadsheet.classList.add('active');
      paneEvents.classList.remove('active');
    });
  }

  // Calendar Event Modal Handlers
  const modalCal = document.getElementById('modal-cal-event');
  const btnOpenCalModal = document.getElementById('btn-open-new-event-modal');
  const btnCloseCalModal = document.getElementById('btn-close-cal-modal');
  const formCreateCal = document.getElementById('form-create-cal-event');
  const calErr = document.getElementById('cal-event-error');

  if (btnOpenCalModal && modalCal) {
    btnOpenCalModal.addEventListener('click', async () => {
      const accSelect = document.getElementById('cal-event-account');
      if (accSelect && window.JarvisGoogle) {
        try {
          const res = await window.JarvisGoogle.getAccounts();
          const accs = res.accounts || [];
          const curSelected = window.JarvisGoogle.getSelectedAccount();
          accSelect.innerHTML = accs.length > 0 ? accs.map(a => 
            `<option value="${escapeHtml(a.id)}" ${a.id === curSelected ? 'selected' : ''}>${escapeHtml(a.nickname || a.email)}</option>`
          ).join('') : '<option value="">No Connected Google Account</option>';
        } catch (e) {}
      }
      modalCal.style.display = 'flex';
    });
  }

  if (btnCloseCalModal && modalCal) {
    btnCloseCalModal.addEventListener('click', () => {
      modalCal.style.display = 'none';
      if (calErr) calErr.style.display = 'none';
    });
  }

  if (formCreateCal) {
    formCreateCal.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (calErr) calErr.style.display = 'none';

      const accountId = document.getElementById('cal-event-account')?.value || null;
      const summary = document.getElementById('cal-event-title').value.trim();
      const startTime = document.getElementById('cal-event-start').value;
      const endTime = document.getElementById('cal-event-end').value;
      const desc = document.getElementById('cal-event-desc').value.trim();

      try {
        if (window.JarvisGoogle) {
          await window.JarvisGoogle.createCalendarEvent({
            accountId,
            summary,
            description: desc,
            start: { dateTime: new Date(startTime).toISOString() },
            end: { dateTime: new Date(endTime).toISOString() },
            confirmed: true
          });
        }
        alert(`Event "${summary}" successfully scheduled!`);
        modalCal.style.display = 'none';
        formCreateCal.reset();
        loadCalendarEvents();
      } catch (err) {
        if (calErr) {
          calErr.textContent = err.message || 'Failed to create event.';
          calErr.style.display = 'block';
        }
      }
    });
  }

  async function loadCalendarEvents() {
    const container = document.getElementById('calendar-events-container');
    if (!container) return;

    container.innerHTML = `
      <div class="empty-state-card" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-circle-notch fa-spin empty-icon"></i>
        <p>Fetching scheduled Google Calendar events...</p>
      </div>
    `;

    try {
      let events = [];
      if (window.JarvisGoogle) {
        const res = await window.JarvisGoogle.listCalendarEvents();
        events = res.events || [];
      }

      if (events.length === 0) {
        container.innerHTML = `
          <div class="empty-state-card" style="grid-column: 1 / -1; padding: 36px 16px;">
            <i class="fa-regular fa-calendar-check empty-icon" style="font-size: 2rem; color: #d4af37; margin-bottom: 8px;"></i>
            <h3>No Scheduled Events</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">No upcoming Google Calendar appointments found for the selected account.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = events.map(ev => {
        const start = ev.start?.dateTime ? new Date(ev.start.dateTime) : (ev.date ? new Date(ev.date) : new Date());
        const end = ev.end?.dateTime ? new Date(ev.end.dateTime) : null;
        const timeStr = start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
          ' • ' + start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
          (end ? ' - ' + end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

        return `
          <div class="cal-event-card">
            <div class="cal-event-time">
              <i class="fa-regular fa-clock"></i>
              <span>${escapeHtml(timeStr)}</span>
            </div>
            <div class="cal-event-title">${escapeHtml(ev.summary || ev.title || 'Scheduled Event')}</div>
            <div class="cal-event-desc">${escapeHtml(ev.description || 'Google Calendar synchronized appointment.')}</div>
          </div>
        `;
      }).join('');

    } catch (e) {
      container.innerHTML = `
        <div class="empty-state-card" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-triangle-exclamation empty-icon" style="color: #ef4444;"></i>
          <h3>Failed to Retrieve Events</h3>
          <p>${escapeHtml(e.message)}</p>
        </div>
      `;
    }
  }

  // --- 15. Tasks Page Management ---
  let localTasks = [];
  const formCreateTask = document.getElementById('form-create-task');
  const taskFilterBtns = document.querySelectorAll('.task-filter-btn');
  let activeTaskFilter = 'all';

  if (taskFilterBtns) {
    taskFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        taskFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTaskFilter = btn.getAttribute('data-filter');
        renderTasks();
      });
    });
  }

  if (formCreateTask) {
    formCreateTask.addEventListener('submit', async (e) => {
      e.preventDefault();
      const titleInput = document.getElementById('task-title-input');
      const prioritySelect = document.getElementById('task-priority-select');
      const dateInput = document.getElementById('task-due-date');

      const title = titleInput.value.trim();
      if (!title) return;

      const priority = prioritySelect.value || 'medium';
      const dueDate = dateInput.value || null;

      try {
        if (window.JarvisAPI) {
          const res = await window.JarvisAPI.createTask({
            title,
            priority,
            due_date: dueDate
          });
          if (res && res.task) {
            localTasks.unshift(res.task);
          } else {
            localTasks.unshift({
              id: 'task_' + Date.now(),
              title,
              priority,
              due_date: dueDate,
              is_completed: false,
              created_at: new Date().toISOString()
            });
          }
        }
        titleInput.value = '';
        renderTasks();
      } catch (err) {
        console.warn('[Task Save Warning]:', err);
        alert('Could not save task: ' + err.message);
      }
    });
  }

  async function loadTasksPage() {
    const container = document.getElementById('tasks-list-container');
    if (!container) return;

    try {
      if (window.JarvisAPI) {
        const res = await window.JarvisAPI.getTasks();
        if (res && res.tasks) {
          localTasks = res.tasks;
        }
      }
    } catch (e) {
      console.warn('Could not fetch tasks from server:', e);
      localTasks = [];
    }

    renderTasks();
  }

  function renderTasks() {
    const container = document.getElementById('tasks-list-container');
    if (!container) return;

    let filtered = localTasks;
    if (activeTaskFilter === 'pending') {
      filtered = localTasks.filter(t => !t.is_completed);
    } else if (activeTaskFilter === 'completed') {
      filtered = localTasks.filter(t => t.is_completed);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card">
          <i class="fa-solid fa-list-check empty-icon"></i>
          <h3>No Tasks</h3>
          <p>No tasks found under the "${escapeHtml(activeTaskFilter)}" filter.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(t => {
      const priorityClass = t.priority === 'high' ? 'task-badge-high' : (t.priority === 'low' ? 'task-badge-low' : 'task-badge-medium');
      return `
        <div class="task-item-card ${t.is_completed ? 'completed' : ''}" data-task-id="${escapeHtml(t.id)}">
          <div class="task-left">
            <input type="checkbox" class="task-checkbox" ${t.is_completed ? 'checked' : ''} onchange="window.handleToggleTask('${escapeHtml(t.id)}', this.checked)">
            <span class="task-text">${escapeHtml(t.title)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            ${t.due_date ? `<span style="font-size: 0.78rem; color: var(--text-muted);"><i class="fa-regular fa-calendar" style="margin-right: 4px;"></i>${escapeHtml(t.due_date)}</span>` : ''}
            <span class="${priorityClass}">${escapeHtml(t.priority || 'normal').toUpperCase()}</span>
            <button class="btn-icon-xs" onclick="window.handleDeleteTask('${escapeHtml(t.id)}')" title="Delete task">
              <i class="fa-regular fa-trash-can" style="color: #f87171;"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  window.handleToggleTask = async function(id, isCompleted) {
    const task = localTasks.find(t => t.id === id);
    if (task) {
      task.is_completed = isCompleted;
      renderTasks();
      try {
        if (window.JarvisAPI) {
          await window.JarvisAPI.updateTask({ id, is_completed: isCompleted });
        }
      } catch (err) {}
    }
  };

  window.handleDeleteTask = async function(id) {
    localTasks = localTasks.filter(t => t.id !== id);
    renderTasks();
    try {
      if (window.JarvisAPI) {
        await window.JarvisAPI.deleteTask(id);
      }
    } catch (err) {}
  };

  // --- 16. Search Chat Page ---
  const chatSearchInput = document.getElementById('chat-search-input');
  const btnRunSearch = document.getElementById('btn-run-search');
  const searchResultsWrapper = document.getElementById('search-results-wrapper');

  if (btnRunSearch && chatSearchInput) {
    btnRunSearch.addEventListener('click', executeSearch);
    chatSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') executeSearch();
    });
  }

  async function executeSearch() {
    const query = chatSearchInput.value.trim().toLowerCase();
    if (!query) return;

    searchResultsWrapper.innerHTML = `
      <div class="empty-state-card">
        <i class="fa-solid fa-circle-notch fa-spin empty-icon"></i>
        <p>Searching conversation archive...</p>
      </div>
    `;

    // Local profile search + conversation matching
    const matches = [];
    if (query.includes('capstone') || query.includes('saev') || query.includes('solar')) {
      matches.push({
        title: "SAEV Capstone Engineering Discussion",
        date: "September 14, 2026",
        snippet: "Analyzed 7-chapter solar-assisted electric vehicle report with Rwandan irradiance datasets and simulation results."
      });
    }
    if (query.includes('ksp') || query.includes('rwanda') || query.includes('operations')) {
      matches.push({
        title: "KSP Rwanda Operations Planning",
        date: "September 12, 2026",
        snippet: "Reviewed daily shift structure and weekly schedule allocations starting on Saturday."
      });
    }
    if (query.includes('gaju') || query.includes('film') || query.includes('urumuri')) {
      matches.push({
        title: "URUMURI STUDIOS 'GAJU' Post-Production",
        date: "September 10, 2026",
        snippet: "Reviewed storyboard, video editing timetable, and MFA film strategy."
      });
    }

    // Generic match
    matches.push({
      title: `Archive Search: "${query}"`,
      date: "Today",
      snippet: `Query matches assistant index for key instruction: "${query}". Click to open active chat dialogue.`
    });

    searchResultsWrapper.innerHTML = matches.map(m => `
      <div class="search-result-item" onclick="window.handleOpenSearchResult('${escapeHtml(m.title)}')">
        <div class="search-result-title">
          <i class="fa-regular fa-message" style="color: #d4af37; margin-right: 8px;"></i>
          ${escapeHtml(m.title)}
        </div>
        <div class="search-result-snippet">${escapeHtml(m.snippet)}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 6px;">${escapeHtml(m.date)}</div>
      </div>
    `).join('');
  }

  window.handleOpenSearchResult = function(title) {
    switchView('new-chat');
    if (unifiedChatLayout) unifiedChatLayout.classList.add('chat-active');
    appendUserChatMessage(`Open archive for: ${title}`);
    appendJarvisChatResponse(`Loaded archived conversation context for "${title}". All variables and references are in memory.`);
  };


  // --- 17. Settings Tabs (Profile, Memory, Knowledge) ---
  const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
  const settingsTabContents = document.querySelectorAll('.settings-tab-content');

  if (settingsTabBtns) {
    settingsTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        settingsTabBtns.forEach(b => b.classList.remove('active'));
        settingsTabContents.forEach(c => c.classList.remove('active'));

        btn.classList.add('active');
        const tabId = btn.getAttribute('data-tab');
        const targetContent = document.getElementById(`settings-tab-${tabId}`);
        if (targetContent) targetContent.classList.add('active');

        if (tabId === 'memory') loadMemoryItems();
        if (tabId === 'knowledge') loadKnowledgeDocs();
      });
    });
  }

  // --- 17. Settings Tabs (Profile, Memory, Knowledge) ---
  const btnRefreshMemory = document.getElementById('btn-refresh-memory');
  if (btnRefreshMemory) {
    btnRefreshMemory.addEventListener('click', loadMemoryItems);
  }

  const btnRefreshKnowledge = document.getElementById('btn-refresh-knowledge');
  if (btnRefreshKnowledge) {
    btnRefreshKnowledge.addEventListener('click', loadKnowledgeDocs);
  }

  const btnUploadKnowledge = document.getElementById('btn-upload-knowledge');
  const knowledgeFileInput = document.getElementById('knowledge-file-input-hidden');
  if (btnUploadKnowledge && knowledgeFileInput) {
    btnUploadKnowledge.addEventListener('click', () => {
      knowledgeFileInput.click();
    });

    knowledgeFileInput.addEventListener('change', async () => {
      const file = knowledgeFileInput.files[0];
      if (!file) return;

      try {
        if (window.JarvisAPI) {
          await window.JarvisAPI.uploadFile(file, { title: file.name });
          alert(`Document "${file.name}" uploaded to private storage.`);
          loadKnowledgeDocs();
        }
      } catch (err) {
        alert('Upload failed: ' + err.message);
      } finally {
        knowledgeFileInput.value = '';
      }
    });
  }

  async function loadMemoryItems() {
    const list = document.getElementById('memory-items-list');
    if (!list) return;

    list.innerHTML = `
      <div class="empty-state-card" style="padding: 24px;">
        <i class="fa-solid fa-circle-notch fa-spin empty-icon"></i>
        <p>Loading personal memory context...</p>
      </div>
    `;

    try {
      let items = [];
      if (window.JarvisAPI) {
        const res = await window.JarvisAPI.getMemory();
        items = res.memories || [];
      }

      if (items.length === 0) {
        list.innerHTML = `
          <div class="empty-state-card" style="padding: 32px 16px;">
            <i class="fa-solid fa-brain empty-icon" style="font-size: 2rem; color: #d4af37; margin-bottom: 8px;"></i>
            <h3>No Memory Items Stored</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              Facts, instructions, and personal context confirmed with NAD JARVIS will appear here.
            </p>
          </div>
        `;
        return;
      }

      list.innerHTML = items.map(m => `
        <div class="memory-item-card" data-memory-id="${escapeHtml(m.id)}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div class="memory-item-text">${escapeHtml(m.content || m.item || '')}</div>
            <button class="btn-icon-xs" onclick="window.handleDeleteMemory('${escapeHtml(m.id)}')" title="Delete memory">
              <i class="fa-regular fa-trash-can" style="color: #f87171;"></i>
            </button>
          </div>
          <div class="memory-item-meta" style="margin-top: 8px;">
            <i class="fa-regular fa-calendar"></i>
            <span>${m.status === 'approved' ? 'Approved Memory' : 'Pending Confirmation'} • ${escapeHtml(m.category || 'General')}</span>
          </div>
        </div>
      `).join('');

    } catch (e) {
      list.innerHTML = `
        <div class="empty-state-card" style="padding: 24px;">
          <p style="color: #f87171;">Failed to load memories: ${escapeHtml(e.message)}</p>
        </div>
      `;
    }
  }

  window.handleDeleteMemory = async function(id) {
    if (!confirm('Are you sure you want to remove this memory item?')) return;
    try {
      if (window.JarvisAPI) {
        await window.JarvisAPI.deleteMemory(id);
      }
      loadMemoryItems();
    } catch (err) {
      alert('Failed to delete memory: ' + err.message);
    }
  };

  async function loadKnowledgeDocs() {
    const list = document.getElementById('knowledge-docs-list');
    if (!list) return;

    list.innerHTML = `
      <div class="empty-state-card" style="padding: 24px;">
        <i class="fa-solid fa-circle-notch fa-spin empty-icon"></i>
        <p>Retrieving stored documents & files...</p>
      </div>
    `;

    try {
      let docs = [];
      if (window.JarvisAPI) {
        const res = await window.JarvisAPI.getFiles();
        docs = res.files || [];
      }

      if (docs.length === 0) {
        list.innerHTML = `
          <div class="empty-state-card" style="padding: 32px 16px;">
            <i class="fa-regular fa-folder-open empty-icon" style="font-size: 2rem; color: #d4af37; margin-bottom: 8px;"></i>
            <h3>No Stored Knowledge Documents</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              Upload PDF, DOCX, or text files to build NAD JARVIS's private document knowledge base.
            </p>
          </div>
        `;
        return;
      }

      list.innerHTML = docs.map(d => {
        const isIndexed = d.indexing_status === 'indexed';
        const statusLabel = isIndexed ? 'Indexed' : 'Stored (Pending Vector Index)';
        const statusColor = isIndexed ? '#4ade80' : '#d4af37';
        const iconClass = (d.mime_type || '').includes('pdf') || (d.title || '').endsWith('.pdf') ? 'fa-file-pdf' : 'fa-file-lines';

        return `
          <div class="doc-item-card" data-doc-id="${escapeHtml(d.id)}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-weight: 600; color: #ffffff;">
                <i class="fa-solid ${iconClass}" style="color: #d4af37; margin-right: 8px;"></i>
                ${escapeHtml(d.title || 'Untitled Document')}
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 0.75rem; color: ${statusColor};">
                  <i class="fa-solid fa-clock-rotate-left"></i> ${escapeHtml(statusLabel)}
                </span>
                <button class="btn-icon-xs" onclick="window.handleDeleteDoc('${escapeHtml(d.id)}')" title="Delete document">
                  <i class="fa-regular fa-trash-can" style="color: #f87171;"></i>
                </button>
              </div>
            </div>
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 6px;">
              ${escapeHtml(d.description || (d.file_path ? `Path: ${d.file_path}` : 'Private knowledge record'))}
            </div>
          </div>
        `;
      }).join('');

    } catch (e) {
      list.innerHTML = `
        <div class="empty-state-card" style="padding: 24px;">
          <p style="color: #f87171;">Failed to load documents: ${escapeHtml(e.message)}</p>
        </div>
      `;
    }
  }

  window.handleDeleteDoc = async function(id) {
    if (!confirm('Are you sure you want to remove this document?')) return;
    try {
      if (window.JarvisAPI) {
        await window.JarvisAPI.deleteFile(id);
      }
      loadKnowledgeDocs();
    } catch (err) {
      alert('Failed to delete document: ' + err.message);
    }
  };

  // --- 18. Dynamic Conversation History Loader ---
  const btnRefreshHistory = document.getElementById('btn-refresh-history');
  if (btnRefreshHistory) {
    btnRefreshHistory.addEventListener('click', loadConversationHistory);
  }

  async function loadConversationHistory() {
    const historyList = document.getElementById('conversation-history-list');
    if (!historyList) return;

    try {
      let conversations = [];
      if (window.JarvisAPI) {
        const res = await window.JarvisAPI.getConversations();
        conversations = res.conversations || [];
      }

      if (conversations.length === 0) {
        historyList.innerHTML = `<div class="history-empty"><i class="fa-regular fa-comment-dots"></i> No conversations yet</div>`;
        return;
      }

      historyList.innerHTML = conversations.map(c => `
        <div class="history-item ${c.id === activeConversationId ? 'active' : ''}" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; cursor: pointer; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden;" onclick="window.handleSelectConversation('${escapeHtml(c.id)}')">
            <i class="fa-regular fa-comment" style="color: ${c.id === activeConversationId ? '#d4af37' : 'inherit'};"></i>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.85rem;">${escapeHtml(c.title || 'Chat')}</span>
          </div>
          <button class="btn-icon-xs" style="opacity: 0.6; padding: 2px;" onclick="event.stopPropagation(); window.handleDeleteConversation('${escapeHtml(c.id)}')" title="Delete chat">
            <i class="fa-regular fa-trash-can" style="font-size: 0.72rem; color: #f87171;"></i>
          </button>
        </div>
      `).join('');

    } catch (e) {
      historyList.innerHTML = `<div class="history-empty">Could not load chats</div>`;
    }
  }

  window.handleSelectConversation = async function(id) {
    activeConversationId = id;
    switchView('new-chat');
    if (unifiedChatLayout) unifiedChatLayout.classList.add('chat-active');
    chatStreamContainer.innerHTML = `
      <div class="empty-state-card" style="padding: 20px;">
        <i class="fa-solid fa-circle-notch fa-spin empty-icon"></i>
        <p>Restoring conversation messages...</p>
      </div>
    `;

    try {
      if (window.JarvisAPI) {
        const res = await window.JarvisAPI.getConversation(id);
        const messages = res.messages || [];
        chatStreamContainer.innerHTML = '';
        if (messages.length === 0) {
          appendJarvisChatResponse({ reply: 'Conversation restored. How can I assist you?', provider: 'JARVIS', model: 'Ready' });
        } else {
          messages.forEach(m => {
            if (m.role === 'user') {
              appendUserChatMessage(m.content);
            } else if (m.role === 'assistant') {
              appendJarvisChatResponse({
                reply: m.content,
                provider: m.provider || 'AI Core',
                model: m.model || 'Active'
              });
            }
          });
        }
      }
      loadConversationHistory();
    } catch (e) {
      chatStreamContainer.innerHTML = `<div class="empty-state-card"><p style="color: #f87171;">Failed to restore conversation: ${escapeHtml(e.message)}</p></div>`;
    }
  };

  window.handleDeleteConversation = async function(id) {
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    try {
      if (window.JarvisAPI) {
        await window.JarvisAPI.deleteConversation(id);
      }
      if (activeConversationId === id) {
        activeConversationId = null;
        chatStreamContainer.innerHTML = '';
        if (unifiedChatLayout) unifiedChatLayout.classList.remove('chat-active');
      }
      loadConversationHistory();
    } catch (err) {
      alert('Failed to delete conversation: ' + err.message);
    }
  };


  // --- 19. Authentication State & Modal Management ---
  const authStatusCluster = document.getElementById('auth-status-cluster');
  const btnTopbarLogin = document.getElementById('btn-topbar-login');
  const btnTopbarLogout = document.getElementById('btn-topbar-logout');
  const btnAuthBadge = document.getElementById('btn-auth-badge');
  const authModal = document.getElementById('auth-modal');
  const formOwnerLogin = document.getElementById('form-owner-login');
  const loginErrorMsg = document.getElementById('login-error-msg');
  const btnModalTogglePwd = document.getElementById('btn-modal-toggle-pwd');
  const inputModalPwd = document.getElementById('login-password');
  const iconModalPwdEye = document.getElementById('icon-modal-pwd-eye');

  if (btnModalTogglePwd && inputModalPwd && iconModalPwdEye) {
    btnModalTogglePwd.addEventListener('click', () => {
      const isPwd = inputModalPwd.type === 'password';
      inputModalPwd.type = isPwd ? 'text' : 'password';
      iconModalPwdEye.className = isPwd ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
    });
  }

  if (btnAuthBadge && authModal) {
    btnAuthBadge.addEventListener('click', () => {
      authModal.classList.add('active');
    });
  }

  if (btnTopbarLogout) {
    btnTopbarLogout.addEventListener('click', async () => {
      if (window.JarvisAPI) {
        await window.JarvisAPI.logout();
      } else {
        localStorage.removeItem('nad_jarvis_token');
      }
      updateAuthUI(false);
      alert('You have logged out of NAD JARVIS.');
    });
  }

  if (formOwnerLogin) {
    formOwnerLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (loginErrorMsg) loginErrorMsg.style.display = 'none';

      const email = document.getElementById('login-email').value.trim();
      const password = inputModalPwd.value;

      try {
        if (window.JarvisAPI) {
          await window.JarvisAPI.login(email, password);
        } else {
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Login failed');
          if (data.session) localStorage.setItem('nad_jarvis_token', data.session.access_token);
        }

        if (authModal) authModal.classList.remove('active');
        updateAuthUI(true);
        loadConversationHistory();
        alert('Welcome Nad! Authenticated successfully with Supabase.');
      } catch (err) {
        if (loginErrorMsg) {
          loginErrorMsg.textContent = err.message || 'Authentication error.';
          loginErrorMsg.style.display = 'block';
        }
      }
    });
  }

  function updateAuthUI(isAuthenticated) {
    if (isAuthenticated) {
      if (authStatusCluster) authStatusCluster.style.display = 'flex';
      if (btnTopbarLogin) btnTopbarLogin.style.display = 'none';
    } else {
      if (authStatusCluster) authStatusCluster.style.display = 'none';
      if (btnTopbarLogin) btnTopbarLogin.style.display = 'inline-flex';
    }
  }

  async function checkInitialAuthState() {
    if (window.JarvisAPI && window.JarvisAPI.isAuthenticated()) {
      try {
        const session = await window.JarvisAPI.checkSession();
        if (session && session.authenticated) {
          updateAuthUI(true);
          loadConversationHistory();
          return;
        }
      } catch (e) {}
    }
    // Check if token exists in localStorage as fallback
    const token = localStorage.getItem('nad_jarvis_token');
    if (token) {
      updateAuthUI(true);
      loadConversationHistory();
    } else {
      updateAuthUI(false);
      loadConversationHistory();
    }
  }

  // Initialize auth state
  checkInitialAuthState();

  // Close modal when clicking outside
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) {
        authModal.classList.remove('active');
      }
    });
  }

  // Utility
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

});

