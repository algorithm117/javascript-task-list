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
          setTimeoutMilliseconds
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
  setTimeoutMilliseconds
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

  // do not append task to list if it has expired.
  if (expiredTaskDate) {
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

// ************** Startup DB *****************
IDB();
