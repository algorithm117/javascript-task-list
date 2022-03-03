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
  let { taskTitle, taskTime, taskDate } = task;

  const sameDay = checkForSameDay(taskDate);

  // create notification only on day task is due
  if (sameDay) {
    const setTimeoutMilliseconds =
      calculateMilliseconds(taskDate, taskTime);

    // set notification for future tasks and not past tasks
    if (setTimeoutMilliseconds >= 0) {
      createSetTimeoutForNotification(
        taskTitle,
        setTimeoutMilliseconds
      );
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

function calculateMilliseconds(
  taskDate,
  taskTime
) {
  const numberOfMillisecondsInOneMinute =
    60 * 1000;
  const numberOfMillisecondsInOneHour =
    60 * 60 * 1000;

  let dateStr = `${taskDate.replaceAll(
    '/',
    '-'
  )}T${taskTime}:00`;
  const dateForTask = new Date(dateStr);
  const taskDateMilliseconds =
    (dateForTask.getHours() % 12) *
      numberOfMillisecondsInOneHour +
    dateForTask.getMinutes() *
      numberOfMillisecondsInOneMinute;

  const dateNow = new Date();

  // Need to mod by 12 since user input for hours in HTML form is restricted to values between 0 - 12
  const currentTimeMilliseconds =
    (dateNow.getHours() % 12) *
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
  setTimeoutMilliseconds
) {
  setTimeout(() => {
    let title = taskTitle;
    let options = {
      body: "It's time to start your task!",
      icon: './bell.png',
      timestamp: new Date().toLocaleDateString(),
    };
    let notification = new Notification(
      title,
      options
    );

    // vibration api
    navigator.vibrate =
      navigator.vibrate ||
      navigator.webkitVibrate ||
      navigator.mozVibrate ||
      navigator.msVibrate;

    if (navigator.vibrate) {
      navigator.vibrate([
        50, 100, 50, 100, 50, 100, 400, 100, 300,
        100, 350, 50, 200, 100, 100, 50, 600,
      ]);
    }
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

  transaction.oncomplete = () => {
    createLog('All tasks successfully loaded');
  };

  let store = transaction.objectStore(
    'magicalTasksStore'
  );

  let getAllTasksRequest = store.getAll();

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
  let date = new Date(task.taskDate);

  let li = `<li data-taskid=${
    task.id
  }><span class="task-title">${
    task.taskTitle
  }</span> <span class="right-arrow-span"><img src="arrows.png" alt="right arrow" class="arrow-icon" /></span> <span class="task-time">${
    task.taskTime
  } <span class="am-pm">${
    task.amOrPM
  }</span>,</span> <span class="task-date">${
    daysOfTheWeek[date.getDay()]
  } ${date.toLocaleDateString()}</span> <span class="delete-span"><img src="cross.png" alt="cross sign" class="delete-task-icon" /></span></li>`;

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

  let task = {
    taskTitle,
    taskTime,
    taskDate,
    amOrPM,
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
  let li = document.createElement('li');
  li.textContent = 'You have no tasks';

  let span = document.createElement('span');
  span.classList.add('confetti-icon');

  let img = document.createElement('img');
  img.setAttribute('src', 'confetti.png');
  img.setAttribute('alt', 'confetti');

  span.appendChild(img);

  li.appendChild(span);

  tasksUl.appendChild(li);
}

// ************** MUSCIC PLAYER *****************

const musicPlayerContainer =
  document.querySelector('#music-player');
const playPauseIconContainer =
  document.querySelector('#play-icon');
const muteIconContainer =
  document.querySelector('#mute-icon');
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

playOrPauseAnimation.goToAndStop(14, true);

let playOrPauseState = 'play';
let muteState = 'mute';

playPauseIconContainer.addEventListener(
  'click',
  () => {
    if (playOrPauseState === 'play') {
      audio.play();
      playOrPauseState = 'pause';
      playOrPauseAnimation.playSegments(
        [14, 27],
        true
      );
    } else {
      audio.pause();
      playOrPauseState = 'play';
      playOrPauseAnimation.playSegments(
        [0, 14],
        true
      );
    }
  }
);

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
  const bufferedAmount = audio.buffered.end(
    audio.buffered.length - 1
  );
  musicPlayerContainer.style.setProperty(
    '--buffered-width',
    `${Math.floor(
      (bufferedAmount / seekSlider.max) * 100
    )}%`
  );
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
    volumeContainer.textContent =
      volumeSlider.value;
    musicPlayerContainer.style.setProperty(
      '--volume-width',
      `${volumeSlider.value}%`
    );
  }
};

// we know metadata for audio has surely been loaded since loadedmetadata event can fire faster than event listener can be added if the browser loads the metadata quicker than usual. So, this conditional statement handles that case.
if (audio.readyState > 0) {
  displayDuration();
  setSliderMaxAttribute();
} else {
  audio.addEventListener('loadedmetadata', () => {
    displayDuration();
    setSliderMaxAttribute();
  });
}

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

// timeupdate event is fired when audio.currentTime property is updated
audio.addEventListener('timeupdate', () => {
  seekSlider.value = Math.floor(
    audio.currentTime
  );
});

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

// ************** Startup DB *****************
IDB();
