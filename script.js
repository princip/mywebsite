// script.js
document.getElementById('contact-form').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const formData = new FormData(this);
  const name = formData.get('name');
  const email = formData.get('email');
  const message = formData.get('message');
  
  const subject = `New message from ${name}`;
  const body = `Name: ${name}%0D%0AEmail: ${email}%0D%0A%0D%0AMessage:%0D%0A${message}`;
  
  window.location.href = `mailto:louis@louispapalouis.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  alert('Your message has been sent!');
  closeAllSheets();
});

const gallery = document.querySelector('.gallery');
const prevButton = document.getElementById('prev');
const nextButton = document.getElementById('next');
const player = new Plyr('#player', {
  controls: ['play', 'previous', 'next', 'progress', 'current-time', 'mute', 'volume'],
  hideControls: false
});

let currentIndex = 0;
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

let currentTrackIndex = 0;
let currentSlideIndex = 0;
let direction = 1;

function loadTrack(slideIndex, trackIndex) {
  player.source = {
    type: 'audio',
    sources: [{
      src: slideTracks[slideIndex][trackIndex],
      type: 'audio/mp3'
    }]
  };
  player.play();
  const url = slideTracks[slideIndex][trackIndex];
  const filename = url.substring(url.lastIndexOf('/') + 1);
  const title = filename.replace("Website_", "").replace(/_/g, " ").replace(".mp3", "");
  document.getElementById('track-title').textContent = title;
}

player.on('next', () => {
  currentTrackIndex = (currentTrackIndex + 1) % slideTracks[currentSlideIndex].length;
  loadTrack(currentSlideIndex, currentTrackIndex);
});

player.on('previous', () => {
  currentTrackIndex = (currentTrackIndex - 1 + slideTracks[currentSlideIndex].length) % slideTracks[currentSlideIndex].length;
  loadTrack(currentSlideIndex, currentTrackIndex);
});

function changeTrack(slideIndex) {
  currentSlideIndex = slideIndex;
  currentTrackIndex = 0;
  loadTrack(currentSlideIndex, currentTrackIndex);
}

function showSlide(index) {
  const slides = document.querySelectorAll('.slide');

  // Remove the 'current-slide' class from all slides
  slides.forEach(slide => {
    slide.classList.remove('current-slide');
    slide.style.display = 'none'; // Hide the slide
  });

  // Add the 'current-slide' class to the selected slide
  slides[index].classList.add('current-slide');
  slides[index].style.display = 'block'; // Show the selected slide

  currentIndex = index; // Update the current index
}

prevButton.addEventListener('click', () => {
  direction = -1;
  currentIndex = (currentIndex - 1 + 3) % 3;
  showSlide(currentIndex);
  changeTrack(currentIndex);
});

nextButton.addEventListener('click', () => {
  direction = 1;
  currentIndex = (currentIndex + 1) % 3;
  showSlide(currentIndex);
  changeTrack(currentIndex);
});

const sheets = {
  about: document.getElementById('about-sheet'),
  work: document.getElementById('work-sheet'),
  contact: document.getElementById('contact-sheet')
};

// Add close button functionality
document.querySelectorAll('.sheet-close').forEach(closeBtn => {
  closeBtn.addEventListener('click', closeAllSheets);
});

document.getElementById('about-btn').addEventListener('click', () => toggleSheet('about'));
document.getElementById('work-btn').addEventListener('click', () => toggleSheet('work'));
document.getElementById('contact-btn').addEventListener('click', () => toggleSheet('contact'));

function toggleSheet(sheet) {
  if (sheets[sheet].classList.contains('visible')) {
    closeAllSheets();
  } else {
    closeAllSheets();
    sheets[sheet].classList.add('visible');
  }
}

function closeAllSheets() {
  Object.values(sheets).forEach(sheet => {
    sheet.classList.remove('visible');
  });
}

// Initialize first track and slide
changeTrack(0);
showSlide(0);