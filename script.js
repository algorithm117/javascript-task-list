const audioPlayerContainer =
  document.querySelector(
    '#audio-player-container'
  );

const playIconContainer =
  document.querySelector('#play-icon');

const muteIconContainer =
  document.querySelector('#mute-icon');

const audioElement =
  document.querySelector('audio');

const durationContainer =
  document.querySelector('#duration');

const seekSlider = document.querySelector(
  '#seek-slider'
);

const volumeSlider = document.querySelector(
  '#volume-slider'
);

const currentTimeOnTrack = document.querySelector(
  '#current-time'
);
const currentVolumeLevel = document.querySelector(
  '#volume-output'
);

let playOrPauseSoundState = 'play';
let muteState = 'mute';

const playOrPauseAnimation = lottie.loadAnimation(
  {
    container: playIconContainer,
    path: 'https://maxst.icons8.com/vue-static/landings/animated-icons/icons/pause/pause.json',
    renderer: 'svg',
    loop: false,
    autoplay: false,
    name: 'Play Or Pause Animation',
  }
);

const muteAnimation = lottie.loadAnimation({
  container: muteIconContainer,
  path: 'https://maxst.icons8.com/vue-static/landings/animated-icons/icons/mute/mute.json',
  renderer: 'svg',
  loop: false,
  autoplay: false,
  name: 'Mute Animation',
});

playOrPauseAnimation.goToAndStop(14, true);
muteAnimation.goToAndStop(6, true);

let rAF = null;

const whilePlaying = () => {
  seekSlider.value = Math.floor(
    audioElement.currentTime
  );
  showRangeProgress(seekSlider);
  currentTimeOnTrack.textContent = calculateTime(
    Number(seekSlider.value)
  );
  // requestAnimationFrame is an asynchronous function and does not block our main thread.
  rAF = requestAnimationFrame(whilePlaying);
};

playIconContainer.addEventListener(
  'click',
  () => {
    if (playOrPauseSoundState === 'play') {
      audioElement.play();
      playOrPauseAnimation.playSegments(
        [14, 27],
        true
      );
      requestAnimationFrame(whilePlaying);
      playOrPauseSoundState = 'pause';
    } else {
      audioElement.pause();
      playOrPauseAnimation.playSegments(
        [0, 14],
        true
      );
      cancelAnimationFrame(rAF);
      playOrPauseSoundState = 'play';
    }
  }
);

muteIconContainer.addEventListener(
  'click',
  () => {
    if (muteState === 'mute') {
      muteAnimation.playSegments([6, 18], true);
      audioElement.muted = true;
      muteState = 'unmute';
    } else {
      muteAnimation.playSegments([18, 27], true);
      audioElement.muted = false;
      muteState = 'mute';
    }
  }
);

const showRangeProgress = (rangeInput) => {
  if (rangeInput === seekSlider)
    audioPlayerContainer.style.setProperty(
      '--seek-before-width',
      (rangeInput.value / rangeInput.max) * 100 +
        '%'
    );
  else
    audioPlayerContainer.style.setProperty(
      '--volume-before-width',
      (rangeInput.value / rangeInput.max) * 100 +
        '%'
    );
};

seekSlider.addEventListener('change', () => {
  audioElement.currentTime = seekSlider.value;
  if (!audioElement.paused) {
    requestAnimationFrame(whilePlaying);
  }
});

audioElement.addEventListener(
  'timeupdate',
  () => {
    seekSlider.value = Math.floor(
      audioElement.currentTime
    );
  }
);

seekSlider.addEventListener('input', (e) => {
  showRangeProgress(e.target);
  currentTimeOnTrack.textContent = calculateTime(
    Number(e.target.value)
  );
  if (!audioElement.paused) {
    cancelAnimationFrame(rAF);
  }
});

seekSlider.addEventListener('change', () => {
  audioElement.currentTime = seekSlider.value;
});

volumeSlider.addEventListener('input', (e) => {
  const value = e.target.value;
  showRangeProgress(e.target);
  currentVolumeLevel.textContent = value;
  audioElement.volume = value / 100;
});

const displayDuration = () => {
  // audio duration is given back in seconds, hence we need to convert it to the appropriate minutes:seconds form.
  durationContainer.textContent = calculateTime(
    audioElement.duration
  );

  audioElement.addEventListener(
    'progress',
    displayBufferedAmount
  );
};

const displayBufferedAmount = () => {
  const timeRangesObject = audioElement.buffered;
  const bufferedAmount = Math.floor(
    timeRangesObject.end(
      timeRangesObject.length - 1
    )
  );

  audioPlayerContainer.style.setProperty(
    '--buffered-width',
    `${(bufferedAmount / seekSlider.max) * 100}%`
  );
};

const setSeekSliderMaxAttribute = () => {
  seekSlider.setAttribute(
    'max',
    Math.floor(audioElement.duration)
  );
};

if (audioElement.readyState > 0) {
  displayDuration();
  setSeekSliderMaxAttribute();
} else {
  audioElement.addEventListener(
    'loadedmetadata',
    () => {
      displayDuration();
    }
  );
}

function calculateTime(duration) {
  if (!Number.isFinite(duration)) {
    return '00:00';
  }

  const numberOfSecondsInAMinute = 60;

  const numberOfMinutes = Math.floor(
    duration / 60
  );
  let numberOfSeconds = Math.floor(
    duration -
      numberOfMinutes * numberOfSecondsInAMinute
  );

  numberOfSeconds =
    numberOfSeconds < 10
      ? `0${numberOfSeconds}`
      : numberOfSeconds;

  return `${numberOfMinutes}:${numberOfSeconds}`;
}
