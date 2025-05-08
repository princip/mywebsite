// script.js

// --- Configuration ---
const REVEAL_RADIUS = 100;
const BUBBLE_SLOW_FOLLOW_SPEED = 0.1;
const SWIPE_CLOSE_THRESHOLD_Y = 75;

// --- DOM Elements ---
const gallery = document.querySelector('.gallery');
const prevButton = document.getElementById('prev');
const nextButton = document.getElementById('next');
const colorRevealer = document.getElementById('color-revealer');
const slides = document.querySelectorAll('.slide'); // Should find 5 slides
const playerElement = document.getElementById('player');
const contactForm = document.getElementById('contact-form');
const workTrackListElement = document.getElementById('work-track-list');
const trackTitleElement = document.getElementById('track-title');

// --- State Variables ---
let currentVisualSlideIndex = 0; // Index of the currently VISIBLE slide
let currentGlobalTrackIndex = 0; // Index of the track playing from allUniqueTracks

let currentCanvas = null;
let currentCtx = null;
let currentColorCanvas = null;
let currentColorCtx = null;
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let revealerX = mouseX;
let revealerY = mouseY;
let animationFrameId = null;
const canvasData = new Map();
let touchStartY = 0;

// --- Background Images ---
const backgroundImages = {
  desktop: [ // MODIFIED: Now 4 distinct images for 5 slides (will cycle)
    'https://i.postimg.cc/j5dZWt7b/68550006.jpg',    // 1st image (index 0)
    'https://i.postimg.cc/90Dbpbbg/img0024.jpg',      // 2nd image (index 1)
    'https://i.postimg.cc/wTwHN6Mj/Photo07-7.jpg',   // 3rd image (index 2) - NEW
    'https://i.postimg.cc/RCYXFrCk/Photo40-40-01.jpg' // 4th image (index 3)
  ],
  mobile: [ // 11 images for mobile (8 unique provided + 3 repeated)
    'https://i.postimg.cc/BvQWzDj0/ali-abdul-rahman-l0-PVh-G5-Af5-E-unsplash.jpg',
    'https://i.postimg.cc/J4ZWHMf9/anurag-challa-w-A-hp-HEr-U-I-unsplash.jpg',
    'https://i.postimg.cc/0NWg1QSJ/bing-hui-yau-Y2-Vb-Sb-X49-R0-unsplash.jpg',
    'https://i.postimg.cc/VkFQ44Lg/h-co-XVVQNQphn-Eg-unsplash.jpg',
    'https://i.postimg.cc/zGNYn453/jei-lee-x-Z7k6-Jn-js-unsplash.jpg',
    'https://i.postimg.cc/T2Z6Pp4V/jonas-kaiser-X-d-Ya9-Y5l08-unsplash.jpg',
    'https://i.postimg.cc/506h4V5K/rafael-garcin-k-Wx9-LLNSQRQ-unsplash.jpg',
    'https://i.postimg.cc/4dqrnSBf/vivek-doshi-AZNIy-Tiiy-HU-unsplash.jpg',
    // Repeating the first 3 to make 11 total for mobile
    'https://i.postimg.cc/BvQWzDj0/ali-abdul-rahman-l0-PVh-G5-Af5-E-unsplash.jpg',
    'https://i.postimg.cc/J4ZWHMf9/anurag-challa-w-A-hp-HEr-U-I-unsplash.jpg',
    'https://i.postimg.cc/0NWg1QSJ/bing-hui-yau-Y2-Vb-Sb-X49-R0-unsplash.jpg'
  ]
};

// --- Audio Player Setup ---
const player = new Plyr(playerElement, {
  controls: ['play', 'rewind', 'fast-forward', 'progress', 'mute', 'volume'], // 'current-time' removed previously
  hideControls: false,
  i18n: {
    rewind: 'Previous Track',
    fastForward: 'Next Track',
  }
});

// --- Music Data ---
const allUniqueTracks = [
  { url: "https://princip.github.io/mp3/Website_Delta.mp3", title: "Delta" },
  { url: "https://princip.github.io/mp3/Website_Oh_Tilda.mp3", title: "Oh Tilda" },
  { url: "https://princip.github.io/mp3/Website_R_Is_For_Rain.mp3", title: "R is for Rain" },
  { url: "https://princip.github.io/mp3/Website_Mikro_Enthymio.mp3", title: "Mikro Enthymio" },
  { url: "https://princip.github.io/mp3/Website_Solar_Eclipse_no8.mp3", title: "Solar Eclipse no.8" }
];

const slideToTrackMapping = [0, 1, 2, 3, 4];

function getImageUrlForSlide(index) {
  const isMobile = window.innerWidth <= 768;
  const imageSet = isMobile ? backgroundImages.mobile : backgroundImages.desktop;
  return imageSet[index % imageSet.length];
}

function loadGlobalTrack(globalTrackIdx, playImmediately = true) {
  if (!allUniqueTracks[globalTrackIdx]) {
    console.error(`Global track not found for index ${globalTrackIdx}`);
    trackTitleElement.textContent = "Error: Track not found";
    return;
  }
  currentGlobalTrackIndex = globalTrackIdx;
  const track = allUniqueTracks[currentGlobalTrackIndex];

  player.source = {
    type: 'audio',
    sources: [{ src: track.url, type: 'audio/mp3' }]
  };
  trackTitleElement.textContent = track.title;
  updateWorkSheetHighlightByGlobalIndex(currentGlobalTrackIndex);

  if (playImmediately) {
    player.play().catch(e => console.warn("Autoplay after loadGlobalTrack failed:", e));
  }
}

player.on('ended', () => {
  let nextTrackIndex = (currentGlobalTrackIndex + 1) % allUniqueTracks.length;
  loadGlobalTrack(nextTrackIndex, true);
});

document.addEventListener('plyr.control.pressed', event => {
    if (event.detail.controlEl) {
        const controlName = event.detail.controlEl.getAttribute('data-plyr');
        
        if (controlName === 'rewind' || controlName === 'fast-forward') {
            return; 
        }
    }
});

player.on('ready', (event) => {
    const plyrInstance = event.detail.plyr;
    const controlsElement = plyrInstance.elements.controls;

    if (controlsElement) {
        const rewindButton = controlsElement.querySelector('button[data-plyr="rewind"]');
        const fastForwardButton = controlsElement.querySelector('button[data-plyr="fast-forward"]');

        if (rewindButton) {
            rewindButton.addEventListener('click', (e) => {
                e.preventDefault(); 
                e.stopPropagation();
                let newGlobalTrackIdx = (currentGlobalTrackIndex - 1 + allUniqueTracks.length) % allUniqueTracks.length;
                loadGlobalTrack(newGlobalTrackIdx, true);
            });
        } else {
            console.warn('Plyr rewind button (Previous Track) not found on ready.');
        }

        if (fastForwardButton) {
            fastForwardButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                let newGlobalTrackIdx = (currentGlobalTrackIndex + 1) % allUniqueTracks.length;
                loadGlobalTrack(newGlobalTrackIdx, true);
            });
        } else {
            console.warn('Plyr fast-forward button (Next Track) not found on ready.');
        }
    } else {
        console.warn('Plyr controls element not found on ready. Cannot attach custom skip handlers.');
    }
});


// --- Canvas Initialization ---
function initSlideCanvas(slideElement, index, forceReload = false) {
    const canvas = slideElement.querySelector('.background-canvas');
    if (!canvas) return false;

    if (forceReload && canvasData.has(slideElement)) {
        const oldData = canvasData.get(slideElement);
        if (oldData.ctx) oldData.ctx.clearRect(0, 0, oldData.canvas.width, oldData.canvas.height);
        if (oldData.colorCtx) oldData.colorCtx.clearRect(0, 0, oldData.colorCanvas.width, oldData.colorCanvas.height);
        canvasData.delete(slideElement);
    }

    if (canvasData.has(slideElement) && !forceReload) {
        const data = canvasData.get(slideElement);
        if (index === currentVisualSlideIndex) {
            currentCanvas = data.canvas;
            currentCtx = data.ctx;
            currentColorCanvas = data.colorCanvas;
            currentColorCtx = data.colorCtx;
        }
        return true;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const colorCanvas = document.createElement('canvas');
    const colorCtx = colorCanvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "Anonymous";

    const slideDataEntry = { canvas, ctx, colorCanvas, colorCtx, img: null };
    canvasData.set(slideElement, slideDataEntry);

    img.onload = () => {
        slideDataEntry.img = img;
        sizeAndDrawInitial(slideElement, img);
        if (index === currentVisualSlideIndex) {
            currentCanvas = canvas; currentCtx = ctx;
            currentColorCanvas = colorCanvas; currentColorCtx = colorCtx;
            if (!isMobileDevice() && currentCtx && currentColorCanvas && currentColorCtx) {
                startRevealAnimation();
            }
        }
    };
    img.onerror = (err) => {
        console.error(`Failed to load image for slide ${index}:`, getImageUrlForSlide(index), err);
        sizeAndDrawInitial(slideElement, null);
        if (index === currentVisualSlideIndex) {
            currentCanvas = canvas; currentCtx = ctx;
            currentColorCanvas = colorCanvas; currentColorCtx = colorCtx;
            if (!isMobileDevice() && currentCtx) startRevealAnimation();
        }
    };
    img.src = getImageUrlForSlide(index);
    return false;
}

function sizeAndDrawInitial(slideElement, img) {
    const data = canvasData.get(slideElement);
    if (!data || !data.canvas || !data.ctx || !data.colorCanvas || !data.colorCtx) {
        const fallbackCanvas = slideElement.querySelector('.background-canvas');
        if (fallbackCanvas) {
            const fallbackCtx = fallbackCanvas.getContext('2d');
            fallbackCanvas.width = slideElement.offsetWidth || window.innerWidth;
            fallbackCanvas.height = slideElement.offsetHeight || window.innerHeight;
            if (fallbackCtx) {
                 fallbackCtx.fillStyle = '#1a1a1a';
                 fallbackCtx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
            }
        }
        return;
    }

    const { canvas, ctx, colorCanvas, colorCtx } = data;
    const containerWidth = slideElement.offsetWidth || window.innerWidth;
    const containerHeight = slideElement.offsetHeight || window.innerHeight;

    if (canvas.width !== containerWidth || canvas.height !== containerHeight || canvas.width === 0) {
        canvas.width = containerWidth;
        canvas.height = containerHeight;
    }
    if (colorCanvas.width !== containerWidth || colorCanvas.height !== containerHeight || colorCanvas.width === 0) {
        colorCanvas.width = containerWidth;
        colorCanvas.height = containerHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    colorCtx.clearRect(0, 0, colorCanvas.width, colorCanvas.height);

    if (!img || !img.complete || typeof img.naturalWidth === "undefined" || img.naturalWidth === 0) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = canvas.width / canvas.height;
    let drawWidth, drawHeight, drawX, drawY;

    if (imgAspect > containerAspect) {
        drawHeight = canvas.height; drawWidth = drawHeight * imgAspect;
        drawX = (canvas.width - drawWidth) / 2; drawY = 0;
    } else {
        drawWidth = canvas.width; drawHeight = drawWidth / imgAspect;
        drawX = 0; drawY = (canvas.height - drawHeight) / 2;
    }

    colorCtx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

    if (!isMobileDevice()) {
        ctx.filter = 'grayscale(100%)';
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.filter = 'none';
    } else {
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }
}

// --- Reveal Animation Loop ---
function revealLoop() {
  if (!isMobileDevice()) {
    const lerpAmount = BUBBLE_SLOW_FOLLOW_SPEED;
    revealerX += (mouseX - revealerX) * lerpAmount;
    revealerY += (mouseY - revealerY) * lerpAmount;
    colorRevealer.style.transform = `translate(${revealerX}px, ${revealerY}px) translate(-50%, -50%)`;
  }

  if (isMobileDevice() || !currentCtx || !currentColorCanvas || !currentColorCtx) {
    animationFrameId = requestAnimationFrame(revealLoop);
    return;
  }

  currentCtx.save();
  currentCtx.beginPath();
  currentCtx.arc(revealerX, revealerY, REVEAL_RADIUS, 0, Math.PI * 2);
  currentCtx.clip();

  const sx = revealerX - REVEAL_RADIUS;
  const sy = revealerY - REVEAL_RADIUS;
  const sWidth = REVEAL_RADIUS * 2;
  const sHeight = REVEAL_RADIUS * 2;

  const clampedSx = Math.max(0, Math.min(sx, currentColorCanvas.width - 1));
  const clampedSy = Math.max(0, Math.min(sy, currentColorCanvas.height - 1));
  let clampedSWidth = sWidth;
  if (clampedSx + clampedSWidth > currentColorCanvas.width) clampedSWidth = currentColorCanvas.width - clampedSx;
  let clampedSHeight = sHeight;
  if (clampedSy + clampedSHeight > currentColorCanvas.height) clampedSHeight = currentColorCanvas.height - clampedSy;

  if (clampedSWidth > 0 && clampedSHeight > 0) {
    try {
      currentCtx.drawImage(currentColorCanvas, clampedSx, clampedSy, clampedSWidth, clampedSHeight, clampedSx, clampedSy, clampedSWidth, clampedSHeight);
    } catch (e) { console.error("Error drawing image in revealLoop:", e); }
  }
  currentCtx.restore();
  animationFrameId = requestAnimationFrame(revealLoop);
}

// --- Slide Visual Navigation ONLY ---
function showSlideVisuals(targetVisualIndex) {
  if (targetVisualIndex === currentVisualSlideIndex && slides[targetVisualIndex].classList.contains('current-slide') && canvasData.has(slides[targetVisualIndex])) {
    if (!isMobileDevice() && currentCtx && currentColorCanvas && currentColorCtx && !animationFrameId) startRevealAnimation();
    return;
  }
  currentVisualSlideIndex = targetVisualIndex;

  slides.forEach((slide, i) => {
    if (i === currentVisualSlideIndex) {
      slide.classList.add('current-slide');
      initSlideCanvas(slide, i, false);
    } else {
      slide.classList.remove('current-slide');
    }
  });

  if (!isMobileDevice()) {
    if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
    const activeSlideData = canvasData.get(slides[currentVisualSlideIndex]);
    if (activeSlideData && activeSlideData.ctx && activeSlideData.colorCanvas && activeSlideData.colorCtx) {
        currentCanvas = activeSlideData.canvas; currentCtx = activeSlideData.ctx;
        currentColorCanvas = activeSlideData.colorCanvas; currentColorCtx = activeSlideData.colorCtx;
        startRevealAnimation();
    }
  } else {
    if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
    colorRevealer.style.opacity = '0';
  }
}

prevButton.addEventListener('click', () => {
  const newVisualSlideIndex = (currentVisualSlideIndex - 1 + slides.length) % slides.length;
  showSlideVisuals(newVisualSlideIndex);
});

nextButton.addEventListener('click', () => {
  const newVisualSlideIndex = (currentVisualSlideIndex + 1) % slides.length;
  showSlideVisuals(newVisualSlideIndex);
});

// --- Bottom Sheets ---
const sheets = { about: document.getElementById('about-sheet'), work: document.getElementById('work-sheet'), contact: document.getElementById('contact-sheet')};
let activeSheet = null;
document.querySelectorAll('.sheet-close').forEach(btn => btn.addEventListener('click', closeAllSheets));
document.getElementById('about-btn').addEventListener('click', () => toggleSheet('about'));
document.getElementById('work-btn').addEventListener('click', () => toggleSheet('work'));
document.getElementById('contact-btn').addEventListener('click', () => toggleSheet('contact'));

function toggleSheet(sheetName) {
  const sheetElement = sheets[sheetName];
  const isVisible = sheetElement.classList.contains('visible');
  closeAllSheets();
  if (!isVisible) {
    sheetElement.classList.add('visible'); activeSheet = sheetElement;
    const focusable = sheetElement.querySelectorAll('h2, li[tabindex="0"], input, textarea, button, .sheet-close');
    if (focusable.length) focusable[0].focus();
  }
}
function closeAllSheets() { Object.values(sheets).forEach(s => s.classList.remove('visible')); activeSheet = null; }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && activeSheet) closeAllSheets(); });

// --- Contact Form ---
contactForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const fd = new FormData(this);
  const mailtoLink = `mailto:louis@louispapalouis.com?subject=${encodeURIComponent(`New message from ${fd.get('name')}`)}&body=${encodeURIComponent(`Name: ${fd.get('name')}%0D%0AEmail: ${fd.get('email')}%0D%0A%0D%0AMessage:%0D%0A${fd.get('message')}`)}`;
  window.location.href = mailtoLink;
  alert('Thank you for reaching out!.');
  closeAllSheets(); this.reset();
});

// --- Work Sheet Population & Interaction ---
function populateWorkSheet() {
    workTrackListElement.innerHTML = '';
    allUniqueTracks.forEach((track, globalIdx) => {
        const li = document.createElement('li');
        li.textContent = track.title;
        li.dataset.globalTrackIndex = globalIdx;
        const associatedSlide = slideToTrackMapping.findIndex(trackMapIdx => trackMapIdx === globalIdx);
        li.dataset.associatedSlideIndex = associatedSlide !== -1 ? associatedSlide : 0;
        li.setAttribute('role', 'button');
        li.setAttribute('tabindex', '0');
        li.addEventListener('click', () => handleWorkListItemClick(
            parseInt(li.dataset.globalTrackIndex),
            parseInt(li.dataset.associatedSlideIndex)
        ));
        li.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleWorkListItemClick(
                    parseInt(li.dataset.globalTrackIndex),
                    parseInt(li.dataset.associatedSlideIndex)
                );
            }
        });
        workTrackListElement.appendChild(li);
    });
}

function handleWorkListItemClick(globalTrackIdxToPlay, associatedSlideIdx) {
    loadGlobalTrack(globalTrackIdxToPlay, true);
    showSlideVisuals(associatedSlideIdx);
}

function updateWorkSheetHighlightByGlobalIndex(playingGlobalTrackIdx) {
    const allTrackItems = workTrackListElement.querySelectorAll('li');
    allTrackItems.forEach(item => {
        item.classList.remove('current-track-item');
        item.removeAttribute('aria-current');
        if (parseInt(item.dataset.globalTrackIndex) === playingGlobalTrackIdx) {
            item.classList.add('current-track-item');
            item.setAttribute('aria-current', 'true');
            if (sheets.work.classList.contains('visible')) {
                 item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    });
}

// --- SWIPE TO CLOSE LOGIC (MOBILE) ---
function handleSheetTouchStart(event) {
    if (!isMobileDevice() || !activeSheet || !activeSheet.classList.contains('visible')) { touchStartY = 0; return; }
    if (event.target.closest('.sheet-content') && event.target.closest('.sheet-content').scrollHeight > event.target.closest('.sheet-content').clientHeight) {}
    touchStartY = event.touches[0].clientY;
}
function handleSheetTouchMove(event) {
    if (!isMobileDevice() || !activeSheet || !activeSheet.classList.contains('visible') || touchStartY === 0) return;
    const deltaY = event.touches[0].clientY - touchStartY;
    const sheetContent = activeSheet.querySelector('.sheet-content');
    if (sheetContent) { if (deltaY < 0 && sheetContent.scrollTop > 0) return; }
}
function handleSheetTouchEnd(event) {
    if (!isMobileDevice() || !activeSheet || !activeSheet.classList.contains('visible') || touchStartY === 0) return;
    if ((event.changedTouches[0].clientY - touchStartY) > SWIPE_CLOSE_THRESHOLD_Y) closeAllSheets();
    touchStartY = 0;
}

// --- Event Listeners & Initialization ---
function startRevealAnimation() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
    if (!isMobileDevice() && currentCtx && currentColorCanvas && currentColorCtx) {
        const revealerStyle = window.getComputedStyle(colorRevealer);
        if (revealerStyle.display !== 'none') {
            let overInteractive = false;
            const interactive = '.menu-button, .nav-button, .plyr, .sheet-content, .sheet-close, input, textarea, button, #work-track-list li';
            for (let el = document.elementFromPoint(mouseX, mouseY); el; el = el.parentElement) {
                if (el.matches(interactive)) { overInteractive = true; break; }
            }
            colorRevealer.style.opacity = overInteractive ? '0' : '1';
        }
        animationFrameId = requestAnimationFrame(revealLoop);
    } else if (isMobileDevice()) { colorRevealer.style.opacity = '0'; }
}
function updateMousePosition(event) {
  mouseX = event.pageX; mouseY = event.pageY;
  if (isMobileDevice()) { colorRevealer.style.opacity = '0'; return; }
  const target = event.target;
  const interactive = '.menu-button, .nav-button, .plyr, .sheet-content, .sheet-close, input, textarea, button, #work-track-list li';
  colorRevealer.style.opacity = target.closest(interactive) ? '0' :
    (window.getComputedStyle(colorRevealer).display !== 'none' && (animationFrameId || (currentCtx && currentColorCanvas && currentColorCtx))) ? '1' : '0';
}
function updateTouchPosition(event) { if (event.touches.length > 0) { mouseX = event.touches[0].pageX; mouseY = event.touches[0].pageY; }}

function handleResize() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
    slides.forEach((slide, index) => initSlideCanvas(slide, index, true));

    const currentSlideEl = slides[currentVisualSlideIndex];
    if (canvasData.has(currentSlideEl)) {
        const data = canvasData.get(currentSlideEl);
        if (data && (currentCanvas !== data.canvas || currentCtx !== data.ctx || currentColorCanvas !== data.colorCanvas || currentColorCtx !== data.colorCtx) ) {
            currentCanvas = data.canvas; currentCtx = data.ctx;
            currentColorCanvas = data.colorCanvas; currentColorCtx = data.colorCtx;
        }
    }
    if (!isMobileDevice() && currentCtx && currentColorCanvas && currentColorCtx && !animationFrameId) startRevealAnimation();
    else if (isMobileDevice()) colorRevealer.style.opacity = '0';
}
function isMobileDevice() { return window.innerWidth <= 768; }

document.addEventListener('mousemove', updateMousePosition);
document.addEventListener('touchmove', updateTouchPosition, { passive: true });
document.addEventListener('touchstart', updateTouchPosition, { passive: true });
window.addEventListener('resize', handleResize);

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
  populateWorkSheet();
  loadGlobalTrack(currentGlobalTrackIndex, false); 
  showSlideVisuals(currentVisualSlideIndex);

  Object.values(sheets).forEach(sheet => {
    sheet.addEventListener('touchstart', handleSheetTouchStart, { passive: true });
    sheet.addEventListener('touchmove', handleSheetTouchMove, { passive: true });
    sheet.addEventListener('touchend', handleSheetTouchEnd);
  });
});
