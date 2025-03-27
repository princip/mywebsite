// script.js

// --- Configuration ---
const REVEAL_RADIUS = 100; // Corresponds to half of the 200px bubble width
const BUBBLE_SLOW_FOLLOW_SPEED = 0.015; // Original slow speed

// --- DOM Elements ---
const gallery = document.querySelector('.gallery');
const prevButton = document.getElementById('prev');
const nextButton = document.getElementById('next');
const colorRevealer = document.getElementById('color-revealer');
const slides = document.querySelectorAll('.slide');
const playerElement = document.getElementById('player');
const contactForm = document.getElementById('contact-form');

// --- State Variables ---
let currentSlideIndex = 0;
let currentTrackIndex = 0;
let currentCanvas = null;
let currentCtx = null;
let currentColorCanvas = null; // Offscreen canvas for color image
let currentColorCtx = null;
// let isDrawing = false; // Not needed
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let revealerX = mouseX;
let revealerY = mouseY;
let animationFrameId = null;
const canvasData = new Map(); // To store canvas info for each slide

// --- Background Images ---
const backgroundImages = {
  desktop: [
    'https://i.postimg.cc/wjpNzzLf/DP119115.jpg',
    'https://i.postimg.cc/kgq2ZcPL/Pieter-Bruegel-the-Elder-The-Peasant-Dance-WGA3499.jpg',
    'https://i.postimg.cc/Sj0yWykw/a-scene-on-the-ice-1967-3-1.jpg'
  ],
  mobile: [
    'https://i.postimg.cc/kMSDgZnk/Vermeer-Woman-with-a-Lute-near-a-window.jpg',
    'https://i.postimg.cc/gJCJKyKS/Vermeer-The-concert.jpg',
    'https://i.postimg.cc/bNqNLck2/Johannes-Vermeer-Lady-at-the-Virginal-with-a-Gentleman-The-Music-Lesson-Google-Art-Project.jpg'
  ]
};

// --- Audio Player Setup ---
const player = new Plyr(playerElement, {
  controls: ['play', 'previous', 'next', 'progress', 'current-time', 'mute', 'volume'],
  hideControls: false
});

const slideTracks = [
  [
    "https://princip.github.io/mp3/Website_Solar_Eclipse_no8.mp3",
    "https://princip.github.io/mp3/Website_Attird_with_Stars.mp3"
  ],
  [
    "https://princip.github.io/mp3/Website_Oh_Tilda.mp3",
    "https://princip.github.io/mp3/Website_Solar_Eclipse_no8.mp3"
  ],
  [
    "https://princip.github.io/mp3/Website_Attird_with_Stars.mp3",
    "https://princip.github.io/mp3/Website_Oh_Tilda.mp3"
  ]
];

function getImageUrlForSlide(index) {
  const isMobile = window.innerWidth <= 768;
  const imageSet = isMobile ? backgroundImages.mobile : backgroundImages.desktop;
  return imageSet[index % imageSet.length];
}

function loadTrack(slideIdx, trackIdx) {
  if (!slideTracks[slideIdx] || !slideTracks[slideIdx][trackIdx]) {
    console.error(`Track not found for slide ${slideIdx}, track ${trackIdx}`);
    return;
  }
  const url = slideTracks[slideIdx][trackIdx];
  player.source = {
    type: 'audio',
    sources: [{ src: url, type: 'audio/mp3' }]
  };
  // player.play(); // Decide if you want auto-play on load
  const filename = url.substring(url.lastIndexOf('/') + 1);
  const title = filename.replace("Website_", "").replace(/_/g, " ").replace(".mp3", "");
  document.getElementById('track-title').textContent = title;
}

function changeTrack(slideIdx) {
  currentSlideIndex = slideIdx;
  currentTrackIndex = 0;
  loadTrack(currentSlideIndex, currentTrackIndex);
}

player.on('ended', () => {
  currentTrackIndex = (currentTrackIndex + 1) % slideTracks[currentSlideIndex].length;
  loadTrack(currentSlideIndex, currentTrackIndex);
  player.play();
});

player.on('next', () => {
  currentTrackIndex = (currentTrackIndex + 1) % slideTracks[currentSlideIndex].length;
  loadTrack(currentSlideIndex, currentTrackIndex);
  player.play();
});

player.on('previous', () => {
  currentTrackIndex = (currentTrackIndex - 1 + slideTracks[currentSlideIndex].length) % slideTracks[currentSlideIndex].length;
  loadTrack(currentSlideIndex, currentTrackIndex);
  player.play();
});


// --- Canvas Initialization ---
function initSlideCanvas(slideElement, index, forceReload = false) {
    const canvas = slideElement.querySelector('.background-canvas');
    if (!canvas) return;

    if(forceReload && canvasData.has(slideElement)) {
        const oldData = canvasData.get(slideElement);
        oldData.ctx.clearRect(0, 0, oldData.canvas.width, oldData.canvas.height);
        canvasData.delete(slideElement);
    }

    if (canvasData.has(slideElement) && !forceReload) {
        const data = canvasData.get(slideElement);
        currentCanvas = data.canvas;
        currentCtx = data.ctx;
        currentColorCanvas = data.colorCanvas;
        currentColorCtx = data.colorCtx;
        return;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const colorCanvas = document.createElement('canvas');
    const colorCtx = colorCanvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
        const data = { canvas, ctx, colorCanvas, colorCtx, img };
        canvasData.set(slideElement, data);
        sizeAndDrawInitial(slideElement, img);

        if (index === currentSlideIndex) {
            currentCanvas = canvas;
            currentCtx = ctx;
            currentColorCanvas = colorCanvas;
            currentColorCtx = colorCtx;
        }
    };
    img.onerror = (err) => {
        console.error(`Failed to load image for slide ${index}:`, getImageUrlForSlide(index), err);
        ctx.fillStyle = '#222'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    img.src = getImageUrlForSlide(index);
}

function sizeAndDrawInitial(slideElement, img) {
    const data = canvasData.get(slideElement);
    if (!data || !img || !img.naturalWidth) return;

    const { canvas, ctx, colorCanvas, colorCtx } = data;
    const containerWidth = slideElement.offsetWidth;
    const containerHeight = slideElement.offsetHeight;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = containerWidth / containerHeight;
    let drawWidth, drawHeight, drawX, drawY;

    if (imgAspect > containerAspect) {
        drawHeight = containerHeight; drawWidth = drawHeight * imgAspect;
        drawX = (containerWidth - drawWidth) / 2; drawY = 0;
    } else {
        drawWidth = containerWidth; drawHeight = drawWidth / imgAspect;
        drawX = 0; drawY = (containerHeight - drawHeight) / 2;
    }

    canvas.width = containerWidth; canvas.height = containerHeight;
    colorCanvas.width = containerWidth; colorCanvas.height = containerHeight;

    colorCtx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    ctx.filter = 'grayscale(100%)';
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    ctx.filter = 'none';
}

// --- Reveal Animation Loop --- <<<<<<< UPDATED MOVEMENT SPEED HERE
function revealLoop() {
  if (!currentCtx || !currentColorCanvas || isMobileDevice()) {
    animationFrameId = requestAnimationFrame(revealLoop);
    return;
  }

  // Smooth follow for the visual bubble - USING ORIGINAL SLOW SPEED
  const lerpAmount = BUBBLE_SLOW_FOLLOW_SPEED; // = 0.015
  revealerX += (mouseX - revealerX) * lerpAmount;
  revealerY += (mouseY - revealerY) * lerpAmount;
  // Update position using transform
  colorRevealer.style.transform = `translate(${revealerX}px, ${revealerY}px) translate(-50%, -50%)`;

  // --- Precise Canvas Drawing Logic (Keep as is) ---
  const drawX = revealerX;
  const drawY = revealerY;
  const radius = REVEAL_RADIUS; // Use the configured radius

  currentCtx.save();
  currentCtx.beginPath();
  currentCtx.arc(drawX, drawY, radius, 0, Math.PI * 2);
  currentCtx.clip();

  const sx = drawX - radius;
  const sy = drawY - radius;
  const sWidth = radius * 2;
  const sHeight = radius * 2;
  const dx = sx;
  const dy = sy;
  const dWidth = sWidth;
  const dHeight = sHeight;

  currentCtx.drawImage(
      currentColorCanvas,
      sx, sy, sWidth, sHeight,
      dx, dy, dWidth, dHeight
  );

  currentCtx.restore();
  // --- End Canvas Drawing Logic ---

  animationFrameId = requestAnimationFrame(revealLoop);
}


// --- Slide Navigation ---
function showSlide(index) {
  if (index === currentSlideIndex && canvasData.has(slides[index])) {
       const data = canvasData.get(slides[index]);
        currentCanvas = data.canvas; currentCtx = data.ctx;
        currentColorCanvas = data.colorCanvas; currentColorCtx = data.colorCtx;
      return;
  }

  slides.forEach((slide, i) => {
    if (i === index) {
      slide.classList.add('current-slide');
      initSlideCanvas(slide, index); // Ensure canvas ready
    } else {
      slide.classList.remove('current-slide');
    }
  });

  const oldSlideIndex = currentSlideIndex;
  currentSlideIndex = index;

  if(oldSlideIndex !== currentSlideIndex) {
      changeTrack(currentSlideIndex); // Change music if slide changed
  }

  if (!animationFrameId && !isMobileDevice()) {
      startRevealAnimation();
  }
}

prevButton.addEventListener('click', () => {
  const newIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
  showSlide(newIndex);
});

nextButton.addEventListener('click', () => {
  const newIndex = (currentSlideIndex + 1) % slides.length;
  showSlide(newIndex);
});


// --- Bottom Sheets ---
const sheets = {
  about: document.getElementById('about-sheet'),
  work: document.getElementById('work-sheet'),
  contact: document.getElementById('contact-sheet')
};

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
  }
}

function closeAllSheets() {
  Object.values(sheets).forEach(sheet => {
    sheet.classList.remove('visible');
  });
}

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


// --- Event Listeners & Initialization ---

function updateMousePosition(event) {
  mouseX = event.pageX;
  mouseY = event.pageY;
  const target = event.target;
  // Hide visual bubble if over interactive elements
  if (target.closest('.menu-button, .nav-button, .plyr, .sheet-content, .sheet-close, input, textarea, button')) {
      colorRevealer.style.opacity = '0';
  } else {
      // Only show if not explicitly hidden and on desktop
      if (!isMobileDevice()) {
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
    // Reset reveal on resize by redrawing initial state for all canvases
    slides.forEach((slide, index) => {
        if (canvasData.has(slide)) {
            const data = canvasData.get(slide);
            sizeAndDrawInitial(slide, data.img);
        } else if (index === currentSlideIndex) {
             initSlideCanvas(slide, index, true); // Force init if current wasn't ready
        }
    });
    // Update refs for current slide
     const currentSlideElement = slides[currentSlideIndex];
     if(canvasData.has(currentSlideElement)){
         const data = canvasData.get(currentSlideElement);
         currentCanvas = data.canvas; currentCtx = data.ctx;
         currentColorCanvas = data.colorCanvas; currentColorCtx = data.colorCtx;
     }
    // Restart animation
    setTimeout(startRevealAnimation, 100);
}

function isMobileDevice() {
    return window.innerWidth <= 768;
}

function startRevealAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    if (!isMobileDevice()) {
        // Check if opacity should be 1 (i.e. not currently hidden by hover)
        const currentOpacity = window.getComputedStyle(colorRevealer).opacity;
        if (currentOpacity === "1") {
             colorRevealer.style.opacity = '1'; // Ensure it stays visible if it should be
        }
        animationFrameId = requestAnimationFrame(revealLoop);
    } else {
        colorRevealer.style.opacity = '0';
    }
}

document.addEventListener('mousemove', updateMousePosition);
document.addEventListener('touchmove', updateTouchPosition, { passive: true });
document.addEventListener('touchstart', updateTouchPosition, { passive: true });
window.addEventListener('resize', handleResize);


// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
  showSlide(0); // Show first slide
  changeTrack(0); // Load music for first slide
  startRevealAnimation(); // Start animation
});
