// --- script.js - Refactored for Best Practices ---

// --- CONFIGURATION ---
const CONFIG = {
    INITIAL_REVEAL_RADIUS: 100,
    MAX_REVEAL_RADIUS_MULTIPLIER: 1.2,
    MIN_REVEAL_RADIUS_MULTIPLIER: 0.05,
    BUBBLE_RESIZE_SENSITIVITY: 0.3,
    BUBBLE_SIZE_LERP_SPEED: 0.08,
    BUBBLE_FOLLOW_LERP_SPEED: 0.1,
    MOUSE_IDLE_TIMEOUT: 150,
    SWIPE_CLOSE_THRESHOLD_Y: 75,
    MOBILE_BREAKPOINT: 768,
    AUDIO_FADE_IN_DURATION: 4140,
    INITIAL_PLAY_DELAY: 3500,
    INITIAL_VOLUME: 0.8,
    FORM_FEEDBACK_DURATION: 5000,
    FORM_VALIDATION_DURATION: 2500,
};

// --- DATA (Separated from logic for maintainability) ---
const backgroundImages = {
    desktop: ['https://i.postimg.cc/MGr5s3CL/1.webp', 'https://i.postimg.cc/FKKGVXBc/2.webp', 'https://i.postimg.cc/W1T5tkm5/3.webp', 'https://i.postimg.cc/d1bBFktm/4.webp', 'https://i.postimg.cc/TwL9BqG3/5.webp', 'https://i.postimg.cc/QCcqd8FL/6.webp'],
    mobile: ['https://i.postimg.cc/J4RVL9kH/1.webp', 'https://i.postimg.cc/9Qf64Z1W/2.webp', 'https://i.postimg.cc/sDKFDwY6/3.webp', 'https://i.postimg.cc/rp07jTv3/4.webp', 'https://i.postimg.cc/g2Bf3jB3/5.webp', 'https://i.postimg.cc/Bvrkwy36/6.webp', 'https://i.postimg.cc/PJhcdwPn/7.webp', 'https://i.postimg.cc/FFg8DDBr/8.webp', 'https://i.postimg.cc/nzqg8kV1/9.webp', 'https://i.postimg.cc/Wznyz1kF/10.webp', 'https://i.postimg.cc/5NsGMjJD/11.webp', 'https://i.postimg.cc/HsYKKXqQ/12.webp', 'https://i.postimg.cc/cL6z1Z4C/13.webp', 'https://i.postimg.cc/cLjbrjrm/14.webp', 'https://i.postimg.cc/rprYWJ4L/15.webp', 'https://i.postimg.cc/1t17Kq0V/16.webp', 'https://i.postimg.cc/8ctyDX2L/17.webp', 'https://i.postimg.cc/G2P7gmz7/18.webp', 'https://i.postimg.cc/SRyZBbvy/19.webp', 'https://i.postimg.cc/yYpfb5XH/20.webp', 'https://i.postimg.cc/BZg7xtjt/21.webp', 'https://i.postimg.cc/ZK57jZNH/22.webp', 'https://i.postimg.cc/NjWdgHzC/23.webp', 'https://i.postimg.cc/NjyNq4pr/24.webp', 'https://i.postimg.cc/DzLBmzVv/25.webp', 'https://i.postimg.cc/Y0q3Xfv0/26.webp', 'https://i.postimg.cc/9M219jVG/27.webp', 'https://i.postimg.cc/4d1PbFNj/28.webp']
};
const allUniqueTracks = [{ url: "https://princip.github.io/mp3/Website_Delta.mp3", title: "Delta" }, { url: "https://princip.github.io/mp3/Website_Oh_Tilda.mp3", title: "Oh Tilda" }, { url: "https://princip.github.io/mp3/Website_R_Is_For_Rain.mp3", title: "R is for Rain" }, { url: "https://princip.github.io/mp3/Website_Mikro_Enthymio.mp3", title: "Mikro Enthymio" }, { url: "https://princip.github.io/mp3/Website_Solar_Eclipse_no8.mp3", title: "Solar Eclipse no.8" }, ];

// --- STATE MANAGEMENT ---
const state = {
    slides: [],
    currentVisualSlideIndex: 0,
    currentGlobalTrackIndex: 0,
    experienceHasStarted: false,
    volumeFadeInterval: null,
    initialPlayTimeout: null,
    animationFrameId: null,
    canvasData: new Map(),
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
    revealerX: window.innerWidth / 2,
    revealerY: window.innerHeight / 2,
    isMouseMoving: false,
    mouseMoveTimeout: null,
    touchStartY: 0,
    isPinching: false,
    initialPinchDistance: 0,
    pinchStartRadius: 0,
    currentRevealRadius: CONFIG.INITIAL_REVEAL_RADIUS,
    targetRevealRadius: CONFIG.INITIAL_REVEAL_RADIUS,
    activeSheet: null,
    contactFormTimeoutId: null,
};

// --- DOM ELEMENT REFERENCES ---
const DOM = {
    body: document.body,
    gallery: document.querySelector('.gallery'),
    prevButton: document.getElementById('prev'),
    nextButton: document.getElementById('next'),
    colorRevealer: document.getElementById('color-revealer'),
    playerElement: document.getElementById('player'),
    contactForm: document.getElementById('contact-form'),
    workTrackListElement: document.getElementById('work-track-list'),
    trackTitleElement: document.getElementById('track-title'),
    unmuteOverlay: document.getElementById('unmute-overlay'),
    resetBtn: document.getElementById('reset-btn'),
    sheetButtons: {
        about: document.getElementById('about-btn'),
        work: document.getElementById('work-btn'),
        contact: document.getElementById('contact-btn'),
    },
    sheets: {
        about: document.getElementById('about-sheet'),
        work: document.getElementById('work-sheet'),
        contact: document.getElementById('contact-sheet'),
    },
};

// --- UTILITY FUNCTIONS ---
const UTILS = {
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => { clearTimeout(timeout); func(...args); };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    isMobileLayout: () => window.innerWidth <= CONFIG.MOBILE_BREAKPOINT,
    isTouchDevice: () => window.matchMedia('(pointer: coarse)').matches,
    lerp: (start, end, amt) => (1 - amt) * start + amt * end,
};

// --- CORE APPLICATION LOGIC ---

function initAudioPlayer() {
    const player = new Plyr(DOM.playerElement, {
        controls: ['play', 'rewind', 'fast-forward', 'progress', 'mute', 'volume'],
        hideControls: false,
        i18n: { rewind: 'Previous Track', fastForward: 'Next Track' }
    });
    state.player = player;
    player.on('ready', (event) => {
        const controlsElement = event.detail.plyr.elements.controls;
        if (!controlsElement) return;
        controlsElement.querySelector('button[data-plyr="rewind"]')?.addEventListener('click', handlePrevTrack);
        controlsElement.querySelector('button[data-plyr="fast-forward"]')?.addEventListener('click', handleNextTrack);

        // --- START: MODIFICATION FOR USER VOLUME INTERRUPTION ---
        const volumeContainer = controlsElement.querySelector('.plyr__volume');
        if (volumeContainer) {
            const interruptVolumeFade = () => {
                // If the automatic volume fade-in is currently running, stop it.
                if (state.volumeFadeInterval) {
                    clearInterval(state.volumeFadeInterval);
                    state.volumeFadeInterval = null;
                }
            };
            // 'pointerdown' is a modern event that handles mouse, touch, and pen clicks/taps,
            // making it ideal for detecting the start of a user interaction with the volume controls.
            volumeContainer.addEventListener('pointerdown', interruptVolumeFade);
        }
        // --- END: MODIFICATION FOR USER VOLUME INTERRUPTION ---
    });
    player.on('ended', handleNextTrack);
    player.on('play', () => {
        if (state.initialPlayTimeout) {
            clearTimeout(state.initialPlayTimeout);
            state.initialPlayTimeout = null;
            fadeVolumeIn(CONFIG.INITIAL_VOLUME, 1000);
        }
    });
}

function fadeVolumeIn(targetVolume, duration) {
    if (state.volumeFadeInterval) clearInterval(state.volumeFadeInterval);
    state.player.volume = 0;
    const steps = 50;
    const intervalTime = duration / steps;
    const volumeIncrement = targetVolume / steps;
    state.volumeFadeInterval = setInterval(() => {
        const newVolume = state.player.volume + volumeIncrement;
        if (newVolume < targetVolume) {
            state.player.volume = newVolume;
        } else {
            state.player.volume = targetVolume;
            clearInterval(state.volumeFadeInterval);
            state.volumeFadeInterval = null;
        }
    }, intervalTime);
}

function loadGlobalTrack(globalTrackIdx, playImmediately = true) {
    if (playImmediately && state.experienceHasStarted) {
        if (state.volumeFadeInterval) {
            clearInterval(state.volumeFadeInterval);
            state.volumeFadeInterval = null;
        }
        state.player.volume = 1.0;
        state.player.muted = false;
    }
    state.currentGlobalTrackIndex = globalTrackIdx;
    const track = allUniqueTracks[state.currentGlobalTrackIndex];
    if (!track) {
        console.error(`Global track not found for index ${globalTrackIdx}`);
        DOM.trackTitleElement.textContent = "Error: Track not found";
        return;
    }
    state.player.source = { type: 'audio', sources: [{ src: track.url, type: 'audio/mp3' }] };
    DOM.trackTitleElement.textContent = track.title;
    updateWorkSheetHighlight(state.currentGlobalTrackIndex);
    if (playImmediately) {
        state.player.play().catch(e => console.warn("Autoplay failed:", e));
    }
}

function handleNextTrack() {
    let nextTrackIndex = (state.currentGlobalTrackIndex + 1) % allUniqueTracks.length;
    loadGlobalTrack(nextTrackIndex, true);
}

function handlePrevTrack() {
    let prevTrackIndex = (state.currentGlobalTrackIndex - 1 + allUniqueTracks.length) % allUniqueTracks.length;
    loadGlobalTrack(prevTrackIndex, true);
}

function initGallery() {
    DOM.gallery.innerHTML = '';
    const imagesToUse = UTILS.isMobileLayout() ? backgroundImages.mobile : backgroundImages.desktop;
    imagesToUse.forEach((_, i) => {
        const slide = document.createElement('div');
        slide.className = 'slide';
        slide.id = `slide${i + 1}`;
        const canvas = document.createElement('canvas');
        canvas.className = 'background-canvas';
        slide.appendChild(canvas);
        DOM.gallery.appendChild(slide);
    });
    state.slides = document.querySelectorAll('.slide');
}

function getImageUrlForSlide(index) {
    const imageSet = UTILS.isMobileLayout() ? backgroundImages.mobile : backgroundImages.desktop;
    return imageSet[index % imageSet.length];
}

function initSlideCanvas(slideElement, index, forceReload = false) {
    const canvas = slideElement.querySelector('.background-canvas');
    if (!canvas) return;
    if (forceReload && state.canvasData.has(slideElement)) {
        state.canvasData.delete(slideElement);
    }
    if (state.canvasData.has(slideElement)) return;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const colorCanvas = document.createElement('canvas');
    const colorCtx = colorCanvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "Anonymous";
    
    const slideDataEntry = { canvas, ctx, colorCanvas, colorCtx, img: null };
    state.canvasData.set(slideElement, slideDataEntry);
    
    img.onload = () => {
        slideDataEntry.img = img;
        sizeAndDrawInitial(slideElement, img);
        if (index === state.currentVisualSlideIndex && state.experienceHasStarted) {
            startRevealAnimation();
        }
    };
    
    // BEST PRACTICE: Robust error handling for image loading.
    // If an image fails to load, draw a fallback background instead of showing a broken state.
    img.onerror = (err) => {
        console.error(`Failed to load image for slide ${index}:`, getImageUrlForSlide(index), err);
        sizeAndDrawInitial(slideElement, null); // Pass null to trigger fallback drawing.
    };
    
    img.src = getImageUrlForSlide(index);
}

function sizeAndDrawInitial(slideElement, img) {
    const data = state.canvasData.get(slideElement);
    if (!data?.canvas || !data.ctx) return;
    const { canvas, ctx, colorCanvas, colorCtx } = data;
    const dpr = window.devicePixelRatio || 1;
    const { offsetWidth: containerWidth, offsetHeight: containerHeight } = slideElement;
    const physicalWidth = containerWidth * dpr;
    const physicalHeight = containerHeight * dpr;
    
    if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
        canvas.width = physicalWidth;
        canvas.height = physicalHeight;
        colorCanvas.width = physicalWidth;
        colorCanvas.height = physicalHeight;
    }
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    colorCtx.clearRect(0, 0, colorCanvas.width, colorCanvas.height);

    // BEST PRACTICE: If img is null (due to loading error) or invalid, draw a solid fallback.
    if (!img || !img.complete || img.naturalWidth === 0) {
        ctx.fillStyle = '#1a1a1a'; // Matches body background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = canvas.width / canvas.height;
    let drawWidth, drawHeight, drawX, drawY;
    if (imgAspect > canvasAspect) { // Image is wider than canvas
        drawHeight = canvas.height;
        drawWidth = drawHeight * imgAspect;
        drawX = (canvas.width - drawWidth) / 2;
        drawY = 0;
    } else { // Image is taller than or same aspect as canvas
        drawWidth = canvas.width;
        drawHeight = drawWidth / imgAspect;
        drawX = 0;
        drawY = (canvas.height - drawHeight) / 2;
    }
    
    colorCtx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    ctx.filter = 'grayscale(100%)';
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    ctx.filter = 'none';
}


function revealLoop() {
    const data = state.canvasData.get(state.slides[state.currentVisualSlideIndex]);
    const isBubbleStatic = Math.abs(state.targetRevealRadius - state.currentRevealRadius) < 0.1;
    if (!state.isMouseMoving && !state.isPinching && isBubbleStatic) {
        state.animationFrameId = requestAnimationFrame(revealLoop);
        return;
    }
    
    state.revealerX = UTILS.lerp(state.revealerX, state.mouseX, CONFIG.BUBBLE_FOLLOW_LERP_SPEED);
    state.revealerY = UTILS.lerp(state.revealerY, state.mouseY, CONFIG.BUBBLE_FOLLOW_LERP_SPEED);
    state.currentRevealRadius = UTILS.lerp(state.currentRevealRadius, state.targetRevealRadius, CONFIG.BUBBLE_SIZE_LERP_SPEED);
    
    updateBubbleSize();
    DOM.colorRevealer.style.transform = `translate(${state.revealerX}px, ${state.revealerY}px) translate(-50%, -50%)`;
    
    if (!data?.ctx || !data.colorCanvas) {
        state.animationFrameId = requestAnimationFrame(revealLoop);
        return;
    }
    
    const { ctx, colorCanvas } = data;
    const dpr = window.devicePixelRatio || 1;
    const physicalRevealerX = state.revealerX * dpr;
    const physicalRevealerY = state.revealerY * dpr;
    const physicalRadius = state.currentRevealRadius * dpr;

    ctx.save();
    ctx.beginPath();
    ctx.arc(physicalRevealerX, physicalRevealerY, physicalRadius, 0, Math.PI * 2);
    ctx.clip();
    try {
        ctx.drawImage(colorCanvas, 0, 0);
    } catch (e) {
        console.error("Error drawing image in revealLoop:", e);
    }
    ctx.restore();
    
    state.animationFrameId = requestAnimationFrame(revealLoop);
}

function startRevealAnimation() {
    if (state.animationFrameId) cancelAnimationFrame(state.animationFrameId);
    if (state.canvasData.has(state.slides[state.currentVisualSlideIndex])) {
        state.animationFrameId = requestAnimationFrame(revealLoop);
    }
}

function stopRevealAnimation() {
    if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId);
        state.animationFrameId = null;
    }
}

function showSlide(targetIndex) {
    if (targetIndex === state.currentVisualSlideIndex && state.slides[targetIndex].classList.contains('current-slide')) return;
    
    stopRevealAnimation();
    state.currentVisualSlideIndex = targetIndex;
    
    state.slides.forEach((slide, i) => {
        slide.classList.toggle('current-slide', i === state.currentVisualSlideIndex);
        if (i === state.currentVisualSlideIndex) {
            initSlideCanvas(slide, i, false);
        }
    });
    
    if (state.experienceHasStarted) startRevealAnimation();
    preloadNeighborSlides(state.currentVisualSlideIndex);
}

function preloadNeighborSlides(currentIndex) {
    const offsets = [-2, -1, 1, 2];
    const totalSlides = state.slides.length;
    offsets.forEach(offset => {
        const targetIndex = (currentIndex + offset + totalSlides) % totalSlides;
        const slideElement = state.slides[targetIndex];
        if (slideElement && !state.canvasData.has(slideElement)) {
            initSlideCanvas(slideElement, targetIndex, false);
        }
    });
}

function handleNavButtonClick(direction) {
    const newIndex = (state.currentVisualSlideIndex + direction + state.slides.length) % state.slides.length;
    showSlide(newIndex);
}

function toggleSheet(sheetName) {
    const sheetElement = DOM.sheets[sheetName];
    const isVisible = sheetElement.classList.contains('visible');
    
    closeAllSheets();
    
    if (!isVisible) {
        sheetElement.classList.add('visible');
        state.activeSheet = sheetElement;
        // BEST PRACTICE: Defensive coding. Optional chaining `?.` prevents errors if the selector finds no match.
        sheetElement.querySelector('h2, li[tabindex="0"], input, textarea, button, .sheet-close')?.focus();
    }
}

function closeAllSheets() {
    if (state.activeSheet === DOM.sheets.contact) {
        resetContactForm();
    }
    Object.values(DOM.sheets).forEach(s => s.classList.remove('visible'));
    state.activeSheet = null;
}


// --- Contact Form Logic ---
// BEST PRACTICE: Using a declarative state machine for the form UI.
// This centralizes UI updates, making the code cleaner and less prone to bugs.
function setContactFormState(formState) {
    const submitButton = DOM.contactForm.querySelector('button[type="submit"]');
    const feedbackEl = DOM.contactForm.querySelector('.form-feedback');

    // Reset to base state first
    submitButton.disabled = false;
    submitButton.classList.remove('feedback-active');
    feedbackEl.classList.remove('visible', 'success', 'error');

    if (state.contactFormTimeoutId) {
        clearTimeout(state.contactFormTimeoutId);
    }

    switch (formState) {
        case 'sending':
            submitButton.disabled = true;
            submitButton.textContent = 'Sending...';
            break;

        case 'success':
            submitButton.disabled = true;
            submitButton.classList.add('feedback-active');
            submitButton.textContent = 'Thank you! Your message has been sent.';
            state.contactFormTimeoutId = setTimeout(() => setContactFormState('idle'), CONFIG.FORM_FEEDBACK_DURATION);
            break;

        case 'validationError':
            submitButton.disabled = true;
            submitButton.classList.add('feedback-active');
            submitButton.textContent = "Oops! looks like some info’s missing.";
            state.contactFormTimeoutId = setTimeout(() => setContactFormState('idle'), CONFIG.FORM_VALIDATION_DURATION);
            break;
        
        case 'serverError':
            // Use the dedicated feedback div for critical errors
            feedbackEl.textContent = 'Sorry, an error occurred. Please try again.';
            feedbackEl.classList.add('error', 'visible');
            setContactFormState('idle'); // Reset button so user can retry
            break;

        case 'idle':
        default:
            submitButton.disabled = false;
            submitButton.textContent = 'Send';
            break;
    }
}

function resetContactForm() {
    if (!DOM.contactForm) return;
    DOM.contactForm.reset();
    setContactFormState('idle');
}

function handleContactFormSubmit(e) {
    e.preventDefault();
    setContactFormState('sending');

    const fd = new FormData(DOM.contactForm);
    const workerUrl = 'https://contact-form-handler.louiloui.workers.dev';

    fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(fd)),
    })
    .then(response => {
        if (!response.ok) {
            // Try to parse the error message from the server response
            return response.json().then(err => { throw new Error(err.error || `Server error: ${response.status}`) });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            DOM.contactForm.reset();
            setContactFormState('success');
        } else {
            // This case handles successful requests that return a logical error
            throw new Error(data.error || 'An unknown logical error occurred.');
        }
    })
    .catch(error => {
        console.error('Form Submission Error:', error);
        if (error.message && error.message.includes('Missing required fields')) {
            setContactFormState('validationError');
        } else {
            setContactFormState('serverError');
        }
    });
}


function populateWorkSheet() {
    DOM.workTrackListElement.innerHTML = '';
    allUniqueTracks.forEach((track, globalIdx) => {
        const li = document.createElement('li');
        li.textContent = track.title;
        li.dataset.globalTrackIndex = globalIdx;
        li.setAttribute('role', 'button');
        li.setAttribute('tabindex', '0');
        li.addEventListener('click', () => loadGlobalTrack(globalIdx, true));
        li.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                loadGlobalTrack(globalIdx, true);
            }
        });
        DOM.workTrackListElement.appendChild(li);
    });
}

function updateWorkSheetHighlight(playingGlobalTrackIdx) {
    const allTrackItems = DOM.workTrackListElement.querySelectorAll('li');
    allTrackItems.forEach(item => {
        const isCurrent = parseInt(item.dataset.globalTrackIndex) === playingGlobalTrackIdx;
        item.classList.toggle('current-track-item', isCurrent);
        item.setAttribute('aria-current', isCurrent ? 'true' : 'false');
        if (isCurrent && DOM.sheets.work.classList.contains('visible')) {
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
}

function updateRevealerPosition(event) {
    let pageX, pageY, target;
    if (event.touches?.length > 0) {
        pageX = event.touches[0].pageX;
        pageY = event.touches[0].pageY;
        target = document.elementFromPoint(pageX, pageY);
    } else {
        pageX = event.pageX;
        pageY = event.pageY;
        target = event.target;
    }
    state.mouseX = pageX;
    state.mouseY = pageY;
    state.isMouseMoving = true;
    clearTimeout(state.mouseMoveTimeout);
    state.mouseMoveTimeout = setTimeout(() => { state.isMouseMoving = false; }, CONFIG.MOUSE_IDLE_TIMEOUT);
    
    // The selector for elements that should show the default system cursor
    const interactiveSelector = '.menu-button, .nav-button, .plyr, .sheet-content, .sheet-close, input, textarea, button, #work-track-list li, #unmute-overlay';
    const isOverInteractive = target?.closest(interactiveSelector);

    // Hide the custom cursor bubble when over an interactive element
    DOM.colorRevealer.style.opacity = isOverInteractive ? '0' : '1';
}

function updateBubbleSize() {
    if (!DOM.colorRevealer) return;
    const diameter = state.currentRevealRadius * 2;
    DOM.colorRevealer.style.width = `${diameter}px`;
    DOM.colorRevealer.style.height = `${diameter}px`;
}

function handleResize() {
    stopRevealAnimation();
    state.slides.forEach((slide, index) => initSlideCanvas(slide, index, true));
    setTimeout(() => {
        if (state.experienceHasStarted) startRevealAnimation();
    }, 100);
}

function handleBubbleResize(event) {
    if (!state.experienceHasStarted || UTILS.isTouchDevice()) return;
    if (event.target.closest('.sheet-content')) return;
    
    event.preventDefault();
    const delta = event.deltaY * CONFIG.BUBBLE_RESIZE_SENSITIVITY;
    const maxRadius = CONFIG.INITIAL_REVEAL_RADIUS * CONFIG.MAX_REVEAL_RADIUS_MULTIPLIER;
    const minRadius = CONFIG.INITIAL_REVEAL_RADIUS * CONFIG.MIN_REVEAL_RADIUS_MULTIPLIER;
    state.targetRevealRadius = Math.max(minRadius, Math.min(maxRadius, state.targetRevealRadius - delta));
}

function resetColorReveal() {
    closeAllSheets();
    const currentSlideElement = state.slides[state.currentVisualSlideIndex];
    const canvas = currentSlideElement?.querySelector('.background-canvas');
    if (!canvas) return;
    canvas.style.transition = 'opacity 0.4s ease-in-out';
    canvas.style.opacity = 0;
    canvas.addEventListener('transitionend', () => {
        initSlideCanvas(currentSlideElement, state.currentVisualSlideIndex, true);
        setTimeout(() => { canvas.style.opacity = 1; }, 50);
    }, { once: true });
}

function handleTouchStart(event) {
    if (event.touches.length === 2) {
        event.preventDefault();
        state.isPinching = true;
        const [t1, t2] = event.touches;
        state.initialPinchDistance = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
        state.pinchStartRadius = state.currentRevealRadius;
    } else {
        updateRevealerPosition(event);
    }
}

function handleTouchMove(event) {
    if (state.isPinching && event.touches.length === 2) {
        event.preventDefault();
        const [t1, t2] = event.touches;
        const currentPinchDistance = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
        const scaleFactor = currentPinchDistance / state.initialPinchDistance;
        const maxRadius = CONFIG.INITIAL_REVEAL_RADIUS * CONFIG.MAX_REVEAL_RADIUS_MULTIPLIER;
        const minRadius = CONFIG.INITIAL_REVEAL_RADIUS * CONFIG.MIN_REVEAL_RADIUS_MULTIPLIER;
        let newRadius = state.pinchStartRadius * scaleFactor;
        state.currentRevealRadius = Math.max(minRadius, Math.min(maxRadius, newRadius));
        state.targetRevealRadius = state.currentRevealRadius;
        updateBubbleSize();
    } else if (!state.isPinching) {
        updateRevealerPosition(event);
    }
}

function handleTouchEnd(event) {
    if (state.isPinching && event.touches.length < 2) {
        state.isPinching = false;
        state.initialPinchDistance = 0;
    }
}

function handleSheetTouchStart(event) {
    if (!UTILS.isTouchDevice() || !state.activeSheet) return;
    state.touchStartY = event.touches[0].clientY;
}

function handleSheetTouchEnd(event) {
    if (!UTILS.isTouchDevice() || !state.activeSheet || state.touchStartY === 0) return;
    const deltaY = event.changedTouches[0].clientY - state.touchStartY;
    if (deltaY > CONFIG.SWIPE_CLOSE_THRESHOLD_Y) {
        closeAllSheets();
    }
    state.touchStartY = 0;
}

function initEventListeners() {
    DOM.prevButton.addEventListener('click', () => handleNavButtonClick(-1));
    DOM.nextButton.addEventListener('click', () => handleNavButtonClick(1));
    Object.entries(DOM.sheetButtons).forEach(([name, button]) => {
        button.addEventListener('click', () => toggleSheet(name));
    });
    document.querySelectorAll('.sheet-close').forEach(btn => btn.addEventListener('click', closeAllSheets));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.activeSheet) closeAllSheets();
    });
    DOM.contactForm.addEventListener('submit', handleContactFormSubmit);
    document.addEventListener('mousemove', updateRevealerPosition);
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('resize', UTILS.debounce(handleResize, 250));
    document.addEventListener('wheel', handleBubbleResize, { passive: false });
    DOM.resetBtn?.addEventListener('click', resetColorReveal);
    Object.values(DOM.sheets).forEach(sheet => {
        sheet.addEventListener('touchstart', handleSheetTouchStart, { passive: true });
        sheet.addEventListener('touchend', handleSheetTouchEnd);
    });
}

function main() {
    initGallery();
    initAudioPlayer();
    initEventListeners();
    updateBubbleSize();
    populateWorkSheet();
    loadGlobalTrack(state.currentGlobalTrackIndex, false);
    showSlide(state.currentVisualSlideIndex);

    DOM.unmuteOverlay.addEventListener('click', () => {
        DOM.unmuteOverlay.classList.add('hidden');
        state.experienceHasStarted = true;
        DOM.body.classList.add('experience-started'); // Applies cursor: none
        startRevealAnimation();
        
        state.initialPlayTimeout = setTimeout(() => {
            state.player.play().catch(e => console.error("Auto-play failed:", e));
            fadeVolumeIn(CONFIG.INITIAL_VOLUME, CONFIG.AUDIO_FADE_IN_DURATION);
            state.initialPlayTimeout = null;
        }, CONFIG.INITIAL_PLAY_DELAY);
    }, { once: true });
}

document.addEventListener('DOMContentLoaded', main);
