// script.js

// --- Configuration ---
const REVEAL_RADIUS = 100; // Corresponds to half of the 200px bubble width
const BUBBLE_SLOW_FOLLOW_SPEED = 0.1;

// --- DOM Elements ---
const gallery = document.querySelector('.gallery');
const prevButton = document.getElementById('prev');
const nextButton = document.getElementById('next');
const colorRevealer = document.getElementById('color-revealer');
const slides = document.querySelectorAll('.slide');
const playerElement = document.getElementById('player');
const contactForm = document.getElementById('contact-form');
const workTrackListElement = document.getElementById('work-track-list');
const trackTitleElement = document.getElementById('track-title');

// --- State Variables ---
let currentSlideIndex = 0;
let currentTrackIndexInSlide = 0; // Index of the track within the current slide's playlist
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

// --- Background Images ---
const backgroundImages = {
  desktop: [
    'https://i.postimg.cc/j5dZWt7b/68550006.jpg',
    'https://i.postimg.cc/90Dbpbbg/img0024.jpg',
    'https://i.postimg.cc/RCYXFrCk/Photo40-40-01.jpg'
  ],
  mobile: [
    'https://i.postimg.cc/FRMpTc69/atsadawut-chaiseeha-Mv3m-Ep-WDh-SM-unsplash.jpg',
    'https://i.postimg.cc/nrqkgr8q/matt-palmer-WHJ1-Va-Qp-Psg-unsplash.jpg',
    'https://i.postimg.cc/dQC4LH7D/wolf-zimmermann-6sf5rf8-QYFE-unsplash.jpg'
  ]
};

// --- Audio Player Setup ---
const player = new Plyr(playerElement, {
  controls: ['play', 'previous', 'next', 'progress', 'current-time', 'mute', 'volume'],
  hideControls: false
});

// --- Music Order ---
const slideTracks = [
  [ // Slide 0 Tracks (Index 0)
    { url: "https://princip.github.io/mp3/Website_Delta.mp3", title: "Delta" },
    { url: "https://princip.github.io/mp3/Website_Oh_Tilda.mp3", title: "Oh Tilda" },
    { url: "https://princip.github.io/mp3/Website_R_Is_For_Rain.mp3", title: "R is for Rain" },
    { url: "https://princip.github.io/mp3/Website_Goumas.mp3", title: "Goumas" } // <-- NEW TRACK ADDED HERE
  ],
  [ // Slide 1 Tracks (Index 1)
    { url: "https://princip.github.io/mp3/Website_Oh_Tilda.mp3", title: "Oh Tilda" },
    { url: "https://princip.github.io/mp3/Website_Solar_Eclipse_no8.mp3", title: "Solar Eclipse no.8" }
  ],
  [ // Slide 2 Tracks (Index 2)
    { url: "https://princip.github.io/mp3/Website_Solar_Eclipse_no8.mp3", title: "Solar Eclipse no.8" },
    { url: "https://princip.github.io/mp3/Website_Delta.mp3", title: "Delta" }
  ]
];

function getImageUrlForSlide(index) {
  const isMobile = window.innerWidth <= 768;
  const imageSet = isMobile ? backgroundImages.mobile : backgroundImages.desktop;
  return imageSet[index % imageSet.length];
}

function loadTrack(slideIdx, trackIdxInSlide) {
  if (!slideTracks[slideIdx] || !slideTracks[slideIdx][trackIdxInSlide]) {
    console.error(`Track not found for slide ${slideIdx}, track ${trackIdxInSlide}`);
    trackTitleElement.textContent = "Error: Track not found";
    return;
  }
  const track = slideTracks[slideIdx][trackIdxInSlide];
  player.source = {
    type: 'audio',
    sources: [{ src: track.url, type: 'audio/mp3' }]
  };
  trackTitleElement.textContent = track.title;
  updateWorkSheetHighlight(slideIdx, trackIdxInSlide);
}

function changeSlideAndTrack(slideIdx, trackIdxInSlide = 0) {
  const oldSlideIndex = currentSlideIndex;
  currentSlideIndex = slideIdx;
  currentTrackIndexInSlide = trackIdxInSlide;

  showSlideVisuals(currentSlideIndex); // Update visuals

  // Load track for the new/current slide and track index
  loadTrack(currentSlideIndex, currentTrackIndexInSlide);

  if (sheets.work.classList.contains('visible')) {
    const currentTrackObject = slideTracks[currentSlideIndex][currentTrackIndexInSlide];
    if (currentTrackObject) {
        // Find the LI based on track URL as titles might not be unique enough if files are different
        const activeLi = workTrackListElement.querySelector(`li[data-track-url="${currentTrackObject.url}"]`);
        if (activeLi) {
            activeLi.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
  }
}


player.on('ended', () => {
  currentTrackIndexInSlide = (currentTrackIndexInSlide + 1) % slideTracks[currentSlideIndex].length;
  loadTrack(currentSlideIndex, currentTrackIndexInSlide);
  player.play().catch(e => console.warn("Autoplay after ended failed:", e));
});

document.addEventListener('plyr.control.pressed', event => {
    if (event.detail.plyr.playing && event.detail.controlEl) {
        const controlName = event.detail.controlEl.getAttribute('data-plyr');
        let newTrackIndex = currentTrackIndexInSlide;
        if (controlName === 'previous') {
            newTrackIndex = (currentTrackIndexInSlide - 1 + slideTracks[currentSlideIndex].length) % slideTracks[currentSlideIndex].length;
        } else if (controlName === 'next') {
            newTrackIndex = (currentTrackIndexInSlide + 1) % slideTracks[currentSlideIndex].length;
        }
        if (newTrackIndex !== currentTrackIndexInSlide) {
            currentTrackIndexInSlide = newTrackIndex;
            loadTrack(currentSlideIndex, currentTrackIndexInSlide);
            player.play().catch(e => console.warn("Play after prev/next track failed:", e));
        }
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
        if (index === currentSlideIndex) {
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

        if (index === currentSlideIndex) {
            currentCanvas = canvas;
            currentCtx = ctx;
            currentColorCanvas = colorCanvas;
            currentColorCtx = colorCtx;

            if (!isMobileDevice() && currentCtx && currentColorCanvas && currentColorCtx) {
                startRevealAnimation();
            }
        }
    };
    img.onerror = (err) => {
        console.error(`Failed to load image for slide ${index}:`, getImageUrlForSlide(index), err);
        sizeAndDrawInitial(slideElement, null);
        if (index === currentSlideIndex) {
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
                 fallbackCtx.fillStyle = '#222';
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
        ctx.fillStyle = '#222';
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
  if (clampedSx + clampedSWidth > currentColorCanvas.width) {
    clampedSWidth = currentColorCanvas.width - clampedSx;
  }
  let clampedSHeight = sHeight;
  if (clampedSy + clampedSHeight > currentColorCanvas.height) {
    clampedSHeight = currentColorCanvas.height - clampedSy;
  }

  const dx = clampedSx;
  const dy = clampedSy;
  const dWidth = clampedSWidth;
  const dHeight = clampedSHeight;

  if (clampedSWidth > 0 && clampedSHeight > 0) {
    try {
      currentCtx.drawImage(
          currentColorCanvas,
          clampedSx, clampedSy, clampedSWidth, clampedSHeight,
          dx, dy, dWidth, dHeight
      );
    } catch (e) {
      console.error("Error drawing image in revealLoop:", e);
    }
  }
  currentCtx.restore();

  animationFrameId = requestAnimationFrame(revealLoop);
}


// --- Slide Navigation (Visuals Only) ---
function showSlideVisuals(index) {
  if (index === currentSlideIndex && slides[index].classList.contains('current-slide') && canvasData.has(slides[index])) {
      if (!isMobileDevice() && currentCtx && currentColorCanvas && currentColorCtx && !animationFrameId) {
          startRevealAnimation();
      }
      return;
  }

  let contextsLikelyReady = false;
  slides.forEach((slide, i) => {
    if (i === index) {
      slide.classList.add('current-slide');
      contextsLikelyReady = initSlideCanvas(slide, i, false);
    } else {
      slide.classList.remove('current-slide');
    }
  });

  if (!isMobileDevice()) {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    const activeSlideData = canvasData.get(slides[index]);
    if (activeSlideData && activeSlideData.ctx && activeSlideData.colorCanvas && activeSlideData.colorCtx) {
        currentCanvas = activeSlideData.canvas;
        currentCtx = activeSlideData.ctx;
        currentColorCanvas = activeSlideData.colorCanvas;
        currentColorCtx = activeSlideData.colorCtx;
        startRevealAnimation();
    } else if (contextsLikelyReady && currentCtx && currentColorCanvas && currentColorCtx) {
        startRevealAnimation();
    }
  } else {
      if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
      }
      colorRevealer.style.opacity = '0';
  }
}

prevButton.addEventListener('click', () => {
  const newSlideIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
  changeSlideAndTrack(newSlideIndex);
});

nextButton.addEventListener('click', () => {
  const newSlideIndex = (currentSlideIndex + 1) % slides.length;
  changeSlideAndTrack(newSlideIndex);
});


// --- Bottom Sheets ---
const sheets = {
  about: document.getElementById('about-sheet'),
  work: document.getElementById('work-sheet'),
  contact: document.getElementById('contact-sheet')
};
let activeSheet = null;

document.querySelectorAll('.sheet-close').forEach(closeBtn => {
  closeBtn.addEventListener('click', closeAllSheets);
});

document.getElementById('about-btn').addEventListener('click', () => toggleSheet('about'));
document.getElementById('work-btn').addEventListener('click', () => toggleSheet('work'));
document.getElementById('contact-btn').addEventListener('click', () => toggleSheet('contact'));

function toggleSheet(sheetName) {
  const sheetElement = sheets[sheetName];
  const isVisible = sheetElement.classList.contains('visible');
  closeAllSheets();
  if (!isVisible) {
    sheetElement.classList.add('visible');
    activeSheet = sheetElement;
    const focusableElements = sheetElement.querySelectorAll('h2, li[tabindex="0"], input, textarea, button, .sheet-close');
    if (focusableElements.length > 0) {
        focusableElements[0].focus();
    }
  }
}

function closeAllSheets() {
  Object.values(sheets).forEach(sheet => {
    sheet.classList.remove('visible');
  });
  activeSheet = null;
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && activeSheet) {
    closeAllSheets();
  }
});

// --- Contact Form ---
contactForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const name = formData.get('name');
  const email = formData.get('email');
  const message = formData.get('message');
  const subject = `New message from ${name}`;
  const body = `Name: ${name}%0D%0AEmail: ${email}%0D%0A%0D%0AMessage:%0D%0A${message}`;
  window.location.href = `mailto:louis@louispapalouis.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  alert('Thank you! Attempting to open your email client.');
  closeAllSheets();
  this.reset();
});

// --- Work Sheet Population & Interaction ---
function populateWorkSheet() {
    workTrackListElement.innerHTML = ''; // Clear existing items
    const addedTrackTitles = new Set(); // Keep track of titles already added

    slideTracks.forEach((tracksInSlide, slideIdx) => {
        tracksInSlide.forEach((track, trackIdxInSlide) => {
            // Only add if this track title hasn't been added yet
            if (!addedTrackTitles.has(track.title)) {
                addedTrackTitles.add(track.title);

                const li = document.createElement('li');
                li.textContent = track.title;
                // These data attributes refer to the *first instance* of this track title
                li.dataset.slideIndex = slideIdx;
                li.dataset.trackIndexInSlide = trackIdxInSlide;
                li.dataset.trackUrl = track.url; // Store URL for reliable highlighting
                li.setAttribute('role', 'button');
                li.setAttribute('tabindex', '0');

                li.addEventListener('click', () => {
                    // When clicked, use the stored first instance slide/track index
                    handleWorkListItemClick(parseInt(li.dataset.slideIndex), parseInt(li.dataset.trackIndexInSlide));
                });
                li.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleWorkListItemClick(parseInt(li.dataset.slideIndex), parseInt(li.dataset.trackIndexInSlide));
                    }
                });
                workTrackListElement.appendChild(li);
            }
        });
    });
}

function handleWorkListItemClick(slideIdxForNavigation, trackIdxInSlideForNavigation) {
    // This function receives the slide/track index of the *first occurrence*
    // of the track title, as stored in the list item's data attributes.
    changeSlideAndTrack(slideIdxForNavigation, trackIdxInSlideForNavigation);
    player.play().catch(e => console.warn("Play from work list failed:", e));
}

function updateWorkSheetHighlight(playingSlideIdx, playingTrackIdxInSlide) {
    const allTrackItems = workTrackListElement.querySelectorAll('li');
    allTrackItems.forEach(item => {
        item.classList.remove('current-track-item');
        item.removeAttribute('aria-current');
    });

    // Get the URL of the currently playing track
    if (slideTracks[playingSlideIdx] && slideTracks[playingSlideIdx][playingTrackIdxInSlide]) {
        const currentTrackUrl = slideTracks[playingSlideIdx][playingTrackIdxInSlide].url;

        // Find the list item in the "Works" sheet that corresponds to this URL
        const currentTrackLi = workTrackListElement.querySelector(`li[data-track-url="${currentTrackUrl}"]`);
        if (currentTrackLi) {
            currentTrackLi.classList.add('current-track-item');
            currentTrackLi.setAttribute('aria-current', 'true');

            if (sheets.work.classList.contains('visible')) {
                 currentTrackLi.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }
}


// --- Event Listeners & Initialization ---
function startRevealAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (!isMobileDevice() && currentCtx && currentColorCanvas && currentColorCtx) {
        const computedStyle = window.getComputedStyle(colorRevealer);
        if (computedStyle.display !== 'none') {
            let isOverInteractive = false;
            const interactiveSelectors = '.menu-button, .nav-button, .plyr, .sheet-content, .sheet-close, input, textarea, button, #work-track-list li';
            let currentElement = document.elementFromPoint(mouseX, mouseY);
            while(currentElement) {
                if (currentElement.matches(interactiveSelectors)) {
                    isOverInteractive = true;
                    break;
                }
                currentElement = currentElement.parentElement;
            }
            colorRevealer.style.opacity = isOverInteractive ? '0' : '1';
        }
        animationFrameId = requestAnimationFrame(revealLoop);
    } else if (isMobileDevice()){
        colorRevealer.style.opacity = '0';
    }
}


function updateMousePosition(event) {
  mouseX = event.pageX;
  mouseY = event.pageY;
  const target = event.target;

  if (isMobileDevice()) {
      colorRevealer.style.opacity = '0';
      return;
  }
  if (target.closest('.menu-button, .nav-button, .plyr, .sheet-content, .sheet-close, input, textarea, button, #work-track-list li')) {
      colorRevealer.style.opacity = '0';
  } else {
      if (window.getComputedStyle(colorRevealer).display !== 'none' && (animationFrameId || (currentCtx && currentColorCanvas && currentColorCtx))) {
        colorRevealer.style.opacity = '1';
      }
  }
}

function updateTouchPosition(event) {
    if (event.touches.length > 0) {
        mouseX = event.touches[0].pageX;
        mouseY = event.touches[0].pageY;
    }
}

function handleResize() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    slides.forEach((slide, index) => {
        initSlideCanvas(slide, index, true);
    });

    const currentSlideElement = slides[currentSlideIndex];
    if (canvasData.has(currentSlideElement)) {
        const data = canvasData.get(currentSlideElement);
        if (data && (currentCanvas !== data.canvas || currentCtx !== data.ctx) ) {
            currentCanvas = data.canvas;
            currentCtx = data.ctx;
            currentColorCanvas = data.colorCanvas;
            currentColorCtx = data.colorCtx;
        }
    }
    if (!isMobileDevice() && currentCtx && currentColorCanvas && currentColorCtx && !animationFrameId) {
        startRevealAnimation();
    } else if (isMobileDevice()) {
        colorRevealer.style.opacity = '0';
    }
}


function isMobileDevice() {
    return window.innerWidth <= 768;
}


document.addEventListener('mousemove', updateMousePosition);
document.addEventListener('touchmove', updateTouchPosition, { passive: true });
document.addEventListener('touchstart', updateTouchPosition, { passive: true });
window.addEventListener('resize', handleResize);


// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
  populateWorkSheet();
  showSlideVisuals(currentSlideIndex);
  loadTrack(currentSlideIndex, currentTrackIndexInSlide);
});