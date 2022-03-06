// since the notificationIsSet property is set once and persisted by the database, if you currently close your application, the setTimeout function will not register again for the notification, however the notificationIsSet property will still be true in the database. Just be aware of this behavior while testing.

// ************** GLOBAL VARIABLES/SELECTORS SECTION *****************

const displayTasksDiv = document.querySelector(
  '.display-tasks'
);
const tasksUl = document.querySelector('.tasks');
const taskForm =
  document.querySelector('#task-form');

const logsUl = document.querySelector('.logs');

const btnClear =
  document.querySelector('.btn-clear');

let db = null,
  objectStore = null,
  DBOpenReq = null;

// ************** LOGS SECTION *****************

function createLog(logMessage) {
  let message = document.createElement('li');
  message.textContent = logMessage;

  logsUl.appendChild(message);
}

// ************** NOTIFICATION SECTION *****************

function getPermission() {
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      createLog(
        'Notification permission granted'
      );
    } else {
      Notification.requestPermission()
        .then((response) => {
          createLog(
            'Notification permission granted'
          );
        })
        .catch((error) => {
          createLog('Requesting permisson error');
        });
    }
  }
}

function setNotification(task) {
  let { taskTitle, taskTime, taskDate, amOrPM } =
    task;

  const sameDay = checkForSameDay(taskDate);

  // only create notification day of task.
  if (sameDay) {
    // set notification if there was not one previously set.
    if (!task.notificationIsSet) {
      const setTimeoutMilliseconds =
        calculateMilliseconds(
          taskDate,
          taskTime,
          amOrPM
        );

      // set notification for future tasks and not past tasks
      if (setTimeoutMilliseconds >= 0) {
        updateTaskNotificationSetProperty(task);
        createSetTimeoutForNotification(
          taskTitle,
          setTimeoutMilliseconds,
          task
        );
      }
    }
  }
}

function checkForSameDay(taskDate) {
  taskDate = new Date(taskDate);
  const currentDate = new Date();

  const utc1 = Date.UTC(
    taskDate.getFullYear(),
    taskDate.getMonth(),
    taskDate.getDate()
  );

  const utc2 = Date.UTC(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate()
  );

  return utc1 - utc2 === 0;
}

function updateTaskNotificationSetProperty(task) {
  task.notificationIsSet = true;
  updateTaskInDatabase(task);
}

function calculateMilliseconds(
  taskDate,
  taskTime,
  amOrPM
) {
  const numberOfMillisecondsInOneMinute =
    60 * 1000;
  const numberOfMillisecondsInOneHour =
    60 * 60 * 1000;

  const dateNow = new Date();

  const dateForTask = createDateFromDateAndTime(
    taskDate,
    taskTime
  );

  let hours = setHours(dateForTask, amOrPM);

  let taskDateMilliseconds =
    hours * numberOfMillisecondsInOneHour +
    dateForTask.getMinutes() *
      numberOfMillisecondsInOneMinute;

  // Need to mod by 12 since user input for hours in HTML form is restricted to values between 0 - 12
  const currentTimeMilliseconds =
    dateNow.getHours() *
      numberOfMillisecondsInOneHour +
    dateNow.getMinutes() *
      numberOfMillisecondsInOneMinute;

  const setTimeoutMilliseconds =
    taskDateMilliseconds -
    currentTimeMilliseconds;

  return setTimeoutMilliseconds;
}

function createSetTimeoutForNotification(
  taskTitle,
  setTimeoutMilliseconds,
  task
) {
  setTimeout(() => {
    let title = taskTitle;
    let options = {
      body: "It's time to start your task!",
      icon: 'images/bell.png',
      timestamp: new Date().toLocaleDateString(),
    };
    let notification = new Notification(
      title,
      options
    );

    notification.onclose = () => {
      setTimeout(() => {
        deleteExpiredTasksFromDatabase(task);
      }, 3000);
    };
  }, setTimeoutMilliseconds);
}

// ************** DB SECTION *****************

const IDB = function () {
  db = null;
  objectStore = null;
  DBOpenReq = indexedDB.open('MagicalTasksDB', 1);

  DBOpenReq.addEventListener('error', (error) => {
    createLog('Error in opening database');
  });

  DBOpenReq.addEventListener(
    'success',
    (event) => {
      db = event.target.result;
      createLog('Database successfully opened');
      buildList();
    }
  );

  DBOpenReq.addEventListener(
    'upgradeneeded',
    (event) => {
      db = event.target.result;

      if (
        !db.objectStoreNames.contains(
          'magicalTasksStore'
        )
      ) {
        db.createObjectStore(
          'magicalTasksStore',
          { keyPath: 'id', autoIncrement: true }
        );
      }
    }
  );
};

function buildList() {
  const tasksList = readTasksFromDatabase();

  tasksList.onsuccess = () => {
    const tasks = tasksList.result;

    if (tasks.length > 0) {
      tasksUl.innerHTML = '';
      if (tasks.length > 4) {
        displayTasksDiv.classList.add('active');
      }
      tasks.forEach((task) => {
        appendTaskToList(task);
        setNotification(task);
      });
    } else {
      buildNoTaskLi();
    }
  };
}

function readTasksFromDatabase() {
  let transaction = makeNewTransaction(
    'magicalTasksStore',
    'readonly'
  );

  let store = transaction.objectStore(
    'magicalTasksStore'
  );

  let getAllTasksRequest = store.getAll();

  transaction.oncomplete = () => {
    createLog('All tasks successfully loaded');
  };

  getAllTasksRequest.onerror = () => {
    createLog('Error retrieving all tasks');
  };

  return getAllTasksRequest;
}

const daysOfTheWeek = [
  'Sun',
  'Mon',
  'Tues',
  'Wed',
  'Thur',
  'Fri',
  'Sat',
];

function appendTaskToList(task) {
  const expiredTaskDate =
    checkForExpiredTaskDateAndTime(
      task.taskDate,
      task.taskTime,
      task.amOrPM
    );

  // do not append task to list if it has expired & delete from database.
  if (expiredTaskDate) {
    deleteExpiredTasksFromDatabase(task);
    return;
  }

  let date = new Date(task.taskDate);

  let li = `<li data-taskid=${
    task.id
  }><span class="task-title">${
    task.taskTitle
  }</span> <span class="right-arrow-span"><img src="images/arrows.png" alt="right arrow" class="arrow-icon" /></span> <span class="task-time">${
    task.taskTime
  } <span class="am-pm">${
    task.amOrPM
  }</span>,</span> <span class="task-date">${
    daysOfTheWeek[date.getDay()]
  } ${date.toLocaleDateString()}</span> <span class="delete-span"><img src="images/cross.png" alt="cross sign" class="delete-task-icon" /></span></li>`;

  tasksUl.insertAdjacentHTML('afterbegin', li);

  document
    .querySelector('.delete-span')
    .addEventListener(
      'click',
      deleteTaskFromDatabase
    );
}

function makeNewTransaction(storeName, mode) {
  let transaction = db.transaction(
    storeName,
    mode
  );
  transaction.addEventListener(
    'error',
    (error) => {
      createLog('Error in making transaction');
    }
  );

  return transaction;
}

function addTaskToDatabase(task) {
  let transaction = makeNewTransaction(
    'magicalTasksStore',
    'readwrite'
  );

  let store = transaction.objectStore(
    'magicalTasksStore'
  );
  let request = store.add(task);

  request.onsuccess = () => {
    createLog('Successfully added task');
  };

  request.onerror = () => {
    createLog('Failed to add task');
  };

  transaction.oncomplete = () => {
    appendTaskToList(task);
    clearFormInput();
    buildList();
  };
}

function updateTaskInDatabase(task) {
  let transaction = makeNewTransaction(
    'magicalTasksStore',
    'readwrite'
  );

  let store = transaction.objectStore(
    'magicalTasksStore'
  );

  let request = store.put(task);

  request.onsuccess = () => {
    createLog('Successfully updated task');
  };

  request.onerror = () => {
    createLog('Error updating task');
  };
}

function deleteExpiredTasksFromDatabase(task) {
  const taskId = task.id;

  let transaction = makeNewTransaction(
    'magicalTasksStore',
    'readwrite'
  );

  let store = transaction.objectStore(
    'magicalTasksStore'
  );

  let request = store.delete(taskId);

  request.onsuccess = () => {
    createLog('Successfully deleted task');
    buildList();
  };

  request.onerror = () => {
    createLog('Error deleting task');
  };
}

function deleteTaskFromDatabase(event) {
  const li = event.target.closest('li');

  const taskId = Number(li.dataset.taskid);

  let transaction = makeNewTransaction(
    'magicalTasksStore',
    'readwrite'
  );

  let store = transaction.objectStore(
    'magicalTasksStore'
  );

  let request = store.delete(taskId);

  request.onsuccess = () => {
    createLog('Successfully deleted task');
    li.remove();
    buildList();
  };

  request.onerror = () => {
    createLog('Error deleting task');
  };
}

// ************** EVENT HANDLERS SECTION *****************

let monthsMap = new Map([
  ['January', '01'],
  ['February', '02'],
  ['March', '03'],
  ['April', '04'],
  ['May', '05'],
  ['June', '06'],
  ['July', '07'],
  ['August', '08'],
  ['September', '09'],
  ['October', '10'],
  ['November', '11'],
  ['December', '12'],
]);

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();

  let taskTitle = document
    .querySelector('.task-title-input')
    .value.trim();
  let hours = document
    .querySelector('.task-hours')
    .value.padStart(2, '0');
  let minutes = document
    .querySelector('.task-minutes')
    .value.padStart(2, '0');
  let day = document.querySelector(
    '.select-day'
  ).value;
  let month = document.querySelector(
    '.select-month'
  ).value;
  let year = document.querySelector(
    '.select-year'
  ).value;

  let amOrPM =
    document.querySelector('#am-pm').value;

  let taskDate = `${year}/${monthsMap.get(
    month
  )}/${day}`;

  let taskTime = `${hours}:${minutes}`;

  const expiredTaskDate =
    checkForExpiredTaskDateAndTime(
      taskDate,
      taskTime,
      amOrPM
    );

  if (expiredTaskDate) {
    clearFormInput();
    createLog(
      'Error! Please enter future date/time for task.'
    );
    return;
  }

  let task = {
    taskTitle,
    taskTime,
    taskDate,
    amOrPM,
    notificationIsSet: false,
  };

  getPermission();

  addTaskToDatabase(task);
});

btnClear.addEventListener('click', function (e) {
  let transaction = makeNewTransaction(
    'magicalTasksStore',
    'readwrite'
  );

  transaction.oncomplete = () => {
    createLog('All tasks cleared');
  };

  let store = transaction.objectStore(
    'magicalTasksStore'
  );

  store.clear();

  transaction.onerror = () => {
    createLog('Error clearing all tasks');
  };

  cleanUpUI();
});

// ************** UTILITY FUNCTIONS SECTION *****************

function clearFormInput() {
  taskForm.reset();
}

function cleanUpUI() {
  tasksUl.innerHTML = '';

  buildNoTaskLi();

  displayTasksDiv.classList.remove('active');
}

function buildNoTaskLi() {
  // clear out everything to make every task is cleared from the list.
  tasksUl.innerHTML = '';

  let li = document.createElement('li');
  li.textContent = 'You have no tasks!';

  let span = document.createElement('span');
  span.classList.add('confetti-icon');

  const danceAnimation = lottie.loadAnimation({
    container: span,
    path: 'https://assets2.lottiefiles.com/packages/lf20_6dvhclex.json',
    renderer: 'svg',
    loop: true,
    autoplay: true,
    name: 'Confetti Animation',
  });

  danceAnimation.setSpeed(0.8);

  li.appendChild(span);

  tasksUl.appendChild(li);
}

function createDateFromDateAndTime(date, time) {
  let dateStr = `${date.replaceAll(
    '/',
    '-'
  )}T${time}:00`;
  const dateForTask = new Date(dateStr);

  return dateForTask;
}

function checkForExpiredTaskDateAndTime(
  date,
  time,
  amOrPM
) {
  let dateForTask = createDateFromDateAndTime(
    date,
    time
  );

  const currentDate = new Date();

  let dateForTaskHours = setHours(
    dateForTask,
    amOrPM
  );

  if (
    dateForTask.getFullYear() <
    currentDate.getFullYear()
  ) {
    return true;
  } else if (
    dateForTask.getMonth() <
    currentDate.getMonth()
  ) {
    return true;
  } else if (
    dateForTask.getDate() < currentDate.getDate()
  ) {
    return true;
  } else if (
    dateForTaskHours < currentDate.getHours()
  ) {
    return true;
  }

  return (
    dateForTask.getMinutes() <
    currentDate.getMinutes()
  );
}

function setHours(date, amOrPM) {
  let hours = date.getHours();

  if (amOrPM === 'PM') {
    hours = hours + 12;
  } else if (date.getHours() > 11) {
    hours = hours - 12;
  }

  return hours;
}

// ************** SET DATE INPUTS ON FORM *****************
{
  const selectDay = document.querySelector(
    '.select-day'
  );
  const selectMonth = document.querySelector(
    '.select-month'
  );
  const selectYear = document.querySelector(
    '.select-year'
  );

  const currentDate = new Date();

  const day = currentDate.getDate();
  setSelectedAttribute(selectDay, day);

  // add one since months are zero-indexed based.
  const month = currentDate.getMonth() + 1;
  findAndSetMonthSelectedAttribute(
    selectMonth,
    month
  );

  const year = currentDate.getFullYear();
  setSelectedAttribute(selectYear, year);
}

function setSelectedAttribute(
  selectElement,
  inputValue
) {
  for (const option of selectElement.options) {
    if (inputValue == option.value) {
      option.setAttribute('selected', 'selected');
      break;
    }
  }
}

function findAndSetMonthSelectedAttribute(
  selectMonth,
  month
) {
  let monthName = 'January';
  for (const [
    currentMonthName,
    currentMonthIndex,
  ] of monthsMap.entries()) {
    if (month == currentMonthIndex) {
      monthName = currentMonthName;
      break;
    }
  }

  setSelectedAttribute(selectMonth, monthName);
}

// ************** MUSIC PLAYER *****************
let songs = [
  "music/haven't_reached_the_start_line.mp3",
  'music/lemon_water.mp3',
  'music/strangers_wolfs_rain.mp3',
  'music/support_system.mp3',
  'music/the_day_before.mp3',
  'music/underground_river.mp3',
  'music/warm_heart.mp3',
];

let currentSongIndex = 0;

const musicPlayerContainer =
  document.querySelector('#music-player');
const playPauseIconContainer =
  document.querySelector('#play-icon');
const muteIconContainer =
  document.querySelector('#mute-icon');
const prevIconContainer =
  document.querySelector('#prev-icon');
const nextIconContainer =
  document.querySelector('#next-icon');
const audio = document.querySelector('audio');
const durationContainer =
  document.querySelector('#duration');
const currentTimeContainer =
  document.querySelector('#current-time');
const volumeContainer = document.querySelector(
  '#volume-output'
);
const seekSlider = document.querySelector(
  '#seek-slider'
);
const volumeSlider = document.querySelector(
  '#volume-slider'
);

const playOrPauseAnimation = lottie.loadAnimation(
  {
    container: playPauseIconContainer,
    path: 'https://maxst.icons8.com/vue-static/landings/animated-icons/icons/pause/pause.json',
    renderer: 'svg',
    loop: false,
    autoplay: false,
    name: 'Play/Pause Animation',
  }
);

const muteAnimation = lottie.loadAnimation({
  container: muteIconContainer,
  path: 'https://maxst.icons8.com/vue-static/landings/animated-icons/icons/mute/mute.json',
  renderer: 'svg',
  loop: false,
  autoplay: false,
  name: 'Mute/Unmute Animation',
});

const prevAnimation = lottie.loadAnimation({
  container: prevIconContainer,
  path: 'https://maxst.icons8.com/vue-static/landings/animated-icons/icons/skip-backwards/skip-backwards.json',
  renderer: 'svg',
  loop: false,
  autoplay: false,
  name: 'Previous Button Animation',
});

const nextAnimation = lottie.loadAnimation({
  container: nextIconContainer,
  path: 'https://maxst.icons8.com/vue-static/landings/animated-icons/icons/skip-forwards/skip-forwards.json',
  renderer: 'svg',
  loop: false,
  autoplay: false,
  name: 'Next Button Animation',
});

playOrPauseAnimation.goToAndStop(14, true);

let playOrPauseState = 'play';
let muteState = 'mute';

let reqAnimationFrame = null;
const whilePlaying = () => {
  seekSlider.value = Math.floor(
    audio.currentTime
  );
  // update seekSlider values appropriately when user interacts with slider while audio is playing.
  const currentDuration = calculateTime(
    seekSlider.value
  );
  currentTimeContainer.textContent =
    currentDuration;
  musicPlayerContainer.style.setProperty(
    '--seek-width',
    `${
      (seekSlider.value / seekSlider.max) * 100
    }%`
  );
  reqAnimationFrame =
    window.requestAnimationFrame(whilePlaying);
};

playPauseIconContainer.addEventListener(
  'click',
  () => {
    if (playOrPauseState === 'play') {
      if ('mediaSession' in navigator) {
        updateMediaSessionMetadata();
      }
      audio.play();
      playOrPauseAnimation.playSegments(
        [14, 27],
        true
      );
      // window.requestAnimationFrame() is asynchronous
      // starts process to update slider when music is playing
      window.requestAnimationFrame(whilePlaying);
      playOrPauseState = 'pause';
    } else {
      // stops process to update slider when music is paused because user cannot interact with slider while music is playing.
      audio.pause();
      playOrPauseAnimation.playSegments(
        [0, 14],
        true
      );
      window.cancelAnimationFrame(
        reqAnimationFrame
      );
      playOrPauseState = 'play';
    }
  }
);

muteIconContainer.addEventListener(
  'click',
  () => {
    if (muteState === 'mute') {
      muteAnimation.playSegments([0, 15], true);
      muteState = 'unmute';
      audio.muted = true;
    } else {
      muteAnimation.playSegments([15, 25], true);
      muteState = 'mute';
      audio.muted = false;
    }
  }
);

prevIconContainer.addEventListener(
  'click',
  () => {
    prevSong();
    prevAnimation.playSegments([10, 28], true);
    playNewSong();
    audio.play();
  }
);

const prevSong = () => {
  currentSongIndex--;
  checkCurrentSongIndex(currentSongIndex);
  audio.setAttribute(
    'src',
    `${songs[currentSongIndex]}`
  );
};

nextIconContainer.addEventListener(
  'click',
  () => {
    nextSong();
    nextAnimation.playSegments([10, 28], true);
    playNewSong();
    audio.play();
  }
);

const nextSong = () => {
  currentSongIndex++;
  checkCurrentSongIndex(currentSongIndex);
  audio.setAttribute(
    'src',
    `${songs[currentSongIndex]}`
  );
};

audio.onended = () => {
  nextSong();
  updateMediaSessionMetadata();
  audio.play();
};

function checkCurrentSongIndex(songIndex) {
  if (songIndex >= songs.length) {
    currentSongIndex = 0;
  } else if (songIndex < 0) {
    currentSongIndex = songs.length - 1;
  }

  return;
}

// handle interacting with slider when audio is PLAYING
seekSlider.addEventListener('input', () => {
  const currentDuration = calculateTime(
    seekSlider.value
  );
  currentTimeContainer.textContent =
    currentDuration;

  if (!audio.paused) {
    window.cancelAnimationFrame(
      reqAnimationFrame
    );
  }
});

// change event fired once user lets go of the slider ( thumb ) on range input element. If audio was playing before user interacted with slider, then this restart the process of playing the animation once user lets go of the thumb.
seekSlider.addEventListener('change', () => {
  audio.currentTime = seekSlider.value;
  if (!audio.paused) {
    window.requestAnimationFrame(whilePlaying);
  }
});

const displayDuration = () => {
  // audio.duration returns a value in seconds.
  durationContainer.textContent = calculateTime(
    audio.duration
  );
};

const setSliderMaxAttribute = () => {
  seekSlider.setAttribute(
    'max',
    Math.floor(audio.duration)
  );
};

const displayBufferedAmount = () => {
  try {
    const bufferedAmount = audio.buffered.end(
      audio.buffered.length - 1
    );
    musicPlayerContainer.style.setProperty(
      '--buffered-width',
      `${
        (bufferedAmount / seekSlider.max) * 100
      }%`
    );
  } catch (err) {
    console.log('Buffer error: ' + err);
  }
};

const showRangeProgress = (event) => {
  if (seekSlider === event.target) {
    const currentDuration = calculateTime(
      seekSlider.value
    );
    currentTimeContainer.textContent =
      currentDuration;
    musicPlayerContainer.style.setProperty(
      '--seek-width',
      `${Math.floor(
        (seekSlider.value / seekSlider.max) * 100
      )}%`
    );
  } else if (volumeSlider === event.target) {
    const volumeLevel = volumeSlider.value;
    // audio.volume property has a value between zero and one.
    audio.volume = volumeLevel / 100;
    volumeContainer.textContent = volumeLevel;
    musicPlayerContainer.style.setProperty(
      '--volume-width',
      `${volumeLevel}%`
    );
  }
};

// we know metadata for audio has surely been loaded since loadedmetadata event can fire faster than event listener can be added if the browser loads the metadata quicker than usual. So, this conditional statement handles that case.
const playNewSong = () => {
  if (audio.readyState > 0) {
    displayDuration();
    setSliderMaxAttribute();
  } else {
    audio.addEventListener(
      'loadedmetadata',
      () => {
        displayDuration();
        setSliderMaxAttribute();
      }
    );
  }
};

playNewSong();

function calculateTime(seconds) {
  const numberOfMinutes = Math.floor(
    seconds / 60
  );
  let numberOfSeconds = Math.floor(seconds % 60);

  numberOfSeconds =
    numberOfSeconds < 10
      ? `0${numberOfSeconds}`
      : numberOfSeconds;

  const timeString = `${numberOfMinutes}:${numberOfSeconds}`;

  return timeString;
}

audio.addEventListener(
  'progress',
  displayBufferedAmount
);

seekSlider.addEventListener(
  'input',
  showRangeProgress
);

seekSlider.addEventListener('change', () => {
  audio.currentTime = seekSlider.value;
});

volumeSlider.addEventListener(
  'input',
  showRangeProgress
);

// ************** MEDIA SESSION API *****************
if ('mediaSession' in navigator) {
  const metaDataArray = [
    new MediaMetadata({
      title: "Haven't Reached the Starting Line",
      artist: 'Yuki Hayashi & Asami Tachibana',
      album: 'Haikyuu!! To The Top OST',
      artwork: [
        {
          src: 'https://preview.redd.it/f4jtp6ruu2d51.jpg?auto=webp&s=ecc9844bf37b3c379f8599da0542af072ba2ad68',
          sizes: '800x600',
          type: 'image/jpg',
        },
      ],
    }),
    new MediaMetadata({
      title: 'Lemon Water',
      artist: 'Hiroyuki Komagata',
      artwork: [
        {
          src: 'https://i.ytimg.com/vi/aSPPdqKYfTk/maxresdefault.jpg',
          sizes: '1280x720',
          type: 'image/jpg',
        },
      ],
    }),
    new MediaMetadata({
      title: 'Strangers',
      artist: 'Yoko Kanno & Raj Ramayya',
      album: "Wolf's Rain OST",
      artwork: [
        {
          src: 'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/f8eb502e-a06d-4dd3-8b28-a02f7a011e39/dctks4o-c770fe2f-195e-46f5-93cb-ecaba2ac45e5.png/v1/fill/w_700,h_233,q_70,strp/heaven_s_not_enough_by_mayhw_dctks4o-350t.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9NTM0IiwicGF0aCI6IlwvZlwvZjhlYjUwMmUtYTA2ZC00ZGQzLThiMjgtYTAyZjdhMDExZTM5XC9kY3RrczRvLWM3NzBmZTJmLTE5NWUtNDZmNS05M2NiLWVjYWJhMmFjNDVlNS5wbmciLCJ3aWR0aCI6Ijw9MTYwMCJ9XV0sImF1ZCI6WyJ1cm46c2VydmljZTppbWFnZS5vcGVyYXRpb25zIl19.xvcpx1xPGLYXvoneBxgBfMc6bW4zzNenUKuxFdeT968',
          sizes: '700x233',
          type: 'image/jpg',
        },
      ],
    }),
    new MediaMetadata({
      title: 'Support System',
      artist: 'Yuki Hayashi & Asami Tachibana',
      album: 'Haikyuu!! To The Top OST',
      artwork: [
        {
          src: 'https://cdn.otakutale.com/wp-content/uploads/2019/11/Haikyuu-To-the-Top-Visual.jpg',
          sizes: '1000x1357',
          type: 'image/jpg',
        },
      ],
    }),
    new MediaMetadata({
      title: 'The Day Before',
      artist: 'Yuki Hayashi & Asami Tachibana',
      album: 'Haikyuu!! To The Top OST',
      artwork: [
        {
          src: 'https://i.ytimg.com/vi/0rZra7J2YWg/mqdefault.jpg',
          sizes: '320x180',
          type: 'image/jpg',
        },
      ],
    }),
    new MediaMetadata({
      title: 'The Underground River',
      artist: 'Kevin Penkin & Raj Ramayya',
      album: 'Made In Abyss OST',
      artwork: [
        {
          src: 'https://m.media-amazon.com/images/M/MV5BODNhNTYyODgtOWU5NS00Y2M4LTg5YzAtNzZlMTFiYjE0NTIxXkEyXkFqcGdeQXVyMzgxODM4NjM@._V1_FMjpg_UX1000_.jpg',
          sizes: '1000x1471',
          type: 'image/jpg',
        },
      ],
    }),
    new MediaMetadata({
      title: 'Warm Heart',
      artist: 'Kouki Yoshioka',
      artwork: [
        {
          src: 'https://f4.bcbits.com/img/a3394043904_10.jpg',
          sizes: '1200x1200',
          type: 'image/jpg',
        },
      ],
    }),
  ];

  const updatePositionState = () => {
    navigator.mediaSession.setPositionState({
      duration: audio.duration,
      playbackRate: audio.playbackRate,
      position: audio.currentTime,
    });
  };

  function updateMediaSessionMetadata() {
    navigator.mediaSession.metadata =
      metaDataArray[currentSongIndex];
  }

  const playHandler = () => {
    updateMediaSessionMetadata();
    playOrPauseAnimation.playSegments(
      [14, 27],
      true
    );
    playOrPauseState = 'pause';
    audio.play();
    updatePositionState();
  };

  const pauseHandler = () => {
    playOrPauseAnimation.playSegments(
      [0, 14],
      true
    );
    playOrPauseState = 'play';
    audio.pause();
    updatePositionState();
  };

  const previousTrackHandler = () => {
    prevAnimation.playSegments([10, 28], true);
    prevSong();
    updateMediaSessionMetadata();
    audio.play();
  };

  const nextTrackHandler = () => {
    nextAnimation.playSegments([10, 28], true);
    nextSong();
    updateMediaSessionMetadata();
    audio.play();
  };

  const seekBackwardHandler = (details) => {
    audio.currentTime =
      audio.currentTime -
      (details.seekOffset || 10);
    updatePositionState();
  };

  const seekForwardHandler = (details) => {
    audio.currentTime =
      audio.currentTime +
      (details.seekOffset || 10);
    updatePositionState();
  };

  const seekToHandler = (details) => {
    if (details.fastSeek && 'fastSeek' in audio) {
      audio.fastSeek(details.fastSeek);
      updatePositionState();
      return;
    }

    audio.currentTime = details.seekTime;
    updatePositionState();
  };

  const stopHandler = () => {
    audio.pause();
    audio.currentTime = 0;
  };

  const actionsAndHandlers = [
    ['play', playHandler],
    ['pause', pauseHandler],
    ['previoustrack', previousTrackHandler],
    ['nexttrack', nextTrackHandler],
    ['seekbackward', seekBackwardHandler],
    ['seekforward', seekForwardHandler],
    ['seekto', seekToHandler],
    ['stop', stopHandler],
  ];

  for (const [
    action,
    handler,
  ] of actionsAndHandlers) {
    try {
      navigator.mediaSession.setActionHandler(
        action,
        handler
      );
    } catch (err) {
      console.log(
        `The media session action, ${action}, is not supported`
      );
    }
  }
}

// ************** STARTUP DB *****************
IDB();
