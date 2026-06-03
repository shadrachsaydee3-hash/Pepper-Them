/* PEPPER THEM - MULTIMEDIA MUSIC PLAYER */

document.addEventListener('DOMContentLoaded', () => {
  const tracksGrid = document.getElementById('music-tracks-grid');
  const searchInput = document.getElementById('track-search');
  
  // Sticky Bottom Player Elements
  const playerBar = document.querySelector('.audio-player-bar');
  const playerPlayBtn = document.querySelector('.player-btn-play i');
  const playerPrevBtn = document.querySelector('.player-btn-prev');
  const playerNextBtn = document.querySelector('.player-btn-next');
  const playerCover = document.querySelector('.player-cover');
  const playerTitle = document.querySelector('.player-title');
  const playerArtist = document.querySelector('.player-artist');
  
  const timeStart = document.querySelector('.time-start');
  const timeEnd = document.querySelector('.time-end');
  const progressContainer = document.querySelector('.progress-slider-container');
  const progressFill = document.querySelector('.progress-slider-fill');
  const progressHandle = document.querySelector('.progress-slider-handle');
  
  const volumeBtn = document.querySelector('.volume-btn');
  const volumeContainer = document.querySelector('.volume-slider-container');
  const volumeFill = document.querySelector('.volume-slider-fill');

  let tracks = [];
  let playlist = []; // Active list of tracks (can be filtered)
  let currentIndex = -1;
  let currentHowl = null;
  let isVolumeMuted = false;
  let previousVolume = 0.8;

  // Load Tracks Database
  fetch('assets/data/tracks.json')
    .then(response => {
      if (!response.ok) throw new Error('Failed to fetch tracks.json');
      return response.json();
    })
    .then(data => {
      tracks = data;
      playlist = [...tracks];
      renderTracks(playlist);
      initPlayerControls();
    })
    .catch(err => {
      console.error('Error loading tracks database:', err);
      if (tracksGrid) {
        tracksGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--accent-red); padding: 40px;">Failed to load music files. Please try again.</div>`;
      }
    });

  // Render music track cards in grid
  function renderTracks(trackList) {
    if (!tracksGrid) return;
    tracksGrid.innerHTML = '';

    if (trackList.length === 0) {
      tracksGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">No tracks found matching your search.</div>`;
      return;
    }

    trackList.forEach((track, index) => {
      const card = document.createElement('div');
      
      // Determine if this is the active playing track
      const isCurrentActive = currentIndex !== -1 && playlist[currentIndex] && playlist[currentIndex].src === track.src;
      const activeClass = isCurrentActive && currentHowl && currentHowl.playing() ? 'active-playing' : '';
      
      card.className = `track-card ${activeClass} reveal reveal-scale`;
      card.style.transitionDelay = `${(index % 4) * 100}ms`;
      card.dataset.src = track.src;

      card.innerHTML = `
        <div class="track-cover-wrapper">
          <img class="track-cover" src="${track.cover}" alt="${track.trackTitle}" loading="lazy">
          <div class="track-overlay">
            <button class="play-icon-btn">
              <i class="${activeClass ? 'fas fa-pause' : 'fas fa-play'}"></i>
            </button>
          </div>
        </div>
        <div class="track-details">
          <h3 class="track-title" title="${track.trackTitle}">${track.trackTitle}</h3>
          <p class="track-artist">${track.artist}</p>
          <div class="track-meta">
            <span class="track-genre">${track.genre}</span>
            <span><i class="far fa-clock"></i> ${track.duration}</span>
          </div>
        </div>
      `;

      // Handle card click
      card.addEventListener('click', () => {
        // Map card to its position in active playlist
        const trackIndex = playlist.findIndex(t => t.src === track.src);
        if (trackIndex !== -1) {
          if (trackIndex === currentIndex && currentHowl) {
            togglePlay();
          } else {
            playTrack(trackIndex);
          }
        }
      });

      tracksGrid.appendChild(card);
      
      // Trigger animations
      setTimeout(() => {
        card.classList.add('revealed');
      }, 50);
    });
  }

  // Setup live search filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      
      playlist = tracks.filter(track => {
        return track.trackTitle.toLowerCase().includes(query) || 
               track.artist.toLowerCase().includes(query) ||
               track.genre.toLowerCase().includes(query);
      });
      
      renderTracks(playlist);
      
      // Maintain visual active state on search filter if playing
      if (currentHowl && currentIndex !== -1) {
        syncCardPlayingStates();
      }
    });
  }

  // Play a track from index in active playlist
  function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;

    // Remove active highlight from previous card
    removeCardPlayingStates();

    // If there is a current playing sound, stop and unload it
    if (currentHowl) {
      currentHowl.stop();
      currentHowl.unload();
    }

    currentIndex = index;
    const track = playlist[currentIndex];

    // Update Bottom Player Static Details
    if (playerCover) playerCover.src = track.cover;
    if (playerTitle) playerTitle.textContent = track.trackTitle;
    if (playerArtist) playerArtist.textContent = track.artist;
    if (timeStart) timeStart.textContent = '0:00';
    if (timeEnd) timeEnd.textContent = track.duration;
    
    // Set Slider values to zero
    if (progressFill) progressFill.style.width = '0%';
    if (progressHandle) progressHandle.style.left = '0%';

    // Initialize Howler Instance
    currentHowl = new Howl({
      src: [track.src],
      html5: true, // stream audio files via HTML5 audio tag (handles larger files & CORS)
      volume: previousVolume,
      onplay: () => {
        if (playerPlayBtn) {
          playerPlayBtn.className = 'fas fa-pause';
        }
        syncCardPlayingStates();
        requestAnimationFrame(updatePlaybackProgress);
      },
      onpause: () => {
        if (playerPlayBtn) {
          playerPlayBtn.className = 'fas fa-play';
        }
        syncCardPlayingStates();
      },
      onstop: () => {
        if (playerPlayBtn) {
          playerPlayBtn.className = 'fas fa-play';
        }
        syncCardPlayingStates();
      },
      onend: () => {
        nextTrack();
      },
      onloaderror: (id, err) => {
        console.error('Audio load error:', err);
      },
      onplayerror: (id, err) => {
        console.error('Audio playback error:', err);
        // Autoplay bypass
        currentHowl.once('unlock', () => {
          currentHowl.play();
        });
      }
    });

    currentHowl.play();

    // Slide bottom bar up if hidden
    if (playerBar && !playerBar.classList.contains('active')) {
      playerBar.classList.add('active');
    }
  }

  // Toggle Play / Pause state
  function togglePlay() {
    if (currentIndex === -1 && playlist.length > 0) {
      playTrack(0);
      return;
    }

    if (!currentHowl) return;

    if (currentHowl.playing()) {
      currentHowl.pause();
    } else {
      currentHowl.play();
    }
  }

  // Next Track
  function nextTrack() {
    if (playlist.length === 0) return;
    let nextIndex = currentIndex + 1;
    if (nextIndex >= playlist.length) {
      nextIndex = 0; // loop back to first
    }
    playTrack(nextIndex);
  }

  // Previous Track
  function prevTrack() {
    if (playlist.length === 0) return;
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = playlist.length - 1; // loop to last
    }
    playTrack(prevIndex);
  }

  // Update card highlights in grid
  function syncCardPlayingStates() {
    if (currentIndex === -1 || !playlist[currentIndex]) return;
    
    const activeTrack = playlist[currentIndex];
    const cards = document.querySelectorAll('.track-card');
    const isPlaying = currentHowl && currentHowl.playing();

    cards.forEach(card => {
      const cardSrc = card.dataset.src;
      const playIcon = card.querySelector('.play-icon-btn i');
      
      if (cardSrc === activeTrack.src) {
        if (isPlaying) {
          card.classList.add('active-playing');
          if (playIcon) playIcon.className = 'fas fa-pause';
        } else {
          card.classList.remove('active-playing');
          if (playIcon) playIcon.className = 'fas fa-play';
        }
      } else {
        card.classList.remove('active-playing');
        if (playIcon) playIcon.className = 'fas fa-play';
      }
    });
  }

  function removeCardPlayingStates() {
    const cards = document.querySelectorAll('.track-card');
    cards.forEach(card => {
      card.classList.remove('active-playing');
      const playIcon = card.querySelector('.play-icon-btn i');
      if (playIcon) playIcon.className = 'fas fa-play';
    });
  }

  // Progress Bar Seek & Animation Updates
  function updatePlaybackProgress() {
    if (!currentHowl || !currentHowl.playing()) return;

    const seek = currentHowl.seek() || 0;
    const duration = currentHowl.duration() || 0;
    
    if (duration > 0) {
      const progressPercent = (seek / duration) * 100;
      
      if (progressFill) progressFill.style.width = `${progressPercent}%`;
      if (progressHandle) progressHandle.style.left = `${progressPercent}%`;
      if (timeStart) timeStart.textContent = formatTime(seek);
    }
    
    // Request next animation frame
    requestAnimationFrame(updatePlaybackProgress);
  }

  // Format seconds to mm:ss format
  function formatTime(secs) {
    const minutes = Math.floor(secs / 60) || 0;
    const seconds = Math.floor(secs - minutes * 60) || 0;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }

  // Connect player control triggers
  function initPlayerControls() {
    if (playerPlayBtn) {
      playerPlayBtn.parentElement.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlay();
      });
    }

    if (playerPrevBtn) {
      playerPrevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        prevTrack();
      });
    }

    if (playerNextBtn) {
      playerNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nextTrack();
      });
    }

    // Scrubber click to seek
    if (progressContainer) {
      progressContainer.addEventListener('click', (e) => {
        if (!currentHowl) return;
        
        const rect = progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const clickPercent = Math.max(0, Math.min(1, clickX / width));
        
        const duration = currentHowl.duration();
        if (duration > 0) {
          currentHowl.seek(duration * clickPercent);
          
          // Update slider immediately for snappy feedback
          if (progressFill) progressFill.style.width = `${clickPercent * 100}%`;
          if (progressHandle) progressHandle.style.left = `${clickPercent * 100}%`;
          if (timeStart) timeStart.textContent = formatTime(duration * clickPercent);
        }
      });
    }

    // Volume Adjustment Controls
    if (volumeContainer) {
      volumeContainer.addEventListener('click', (e) => {
        const rect = volumeContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const volumePercent = Math.max(0, Math.min(1, clickX / width));
        
        setVolumeLevel(volumePercent);
      });
    }

    if (volumeBtn) {
      volumeBtn.addEventListener('click', () => {
        if (isVolumeMuted) {
          setVolumeLevel(previousVolume);
          isVolumeMuted = false;
        } else {
          previousVolume = currentHowl ? currentHowl.volume() : previousVolume;
          setVolumeLevel(0);
          isVolumeMuted = true;
        }
      });
    }
  }

  function setVolumeLevel(val) {
    if (currentHowl) {
      currentHowl.volume(val);
    }
    
    // Update volume fill width
    if (volumeFill) {
      volumeFill.style.width = `${val * 100}%`;
    }

    // Update volume icon
    if (volumeBtn) {
      if (val === 0) {
        volumeBtn.className = 'fas fa-volume-mute volume-btn';
      } else if (val < 0.4) {
        volumeBtn.className = 'fas fa-volume-down volume-btn';
      } else {
        volumeBtn.className = 'fas fa-volume-up volume-btn';
      }
    }

    if (val > 0) {
      previousVolume = val;
      isVolumeMuted = false;
    }
  }
});
