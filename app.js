// ************** SELECTORS SECTION *****************

const displayTasksDiv = document.querySelector(
  '.display-tasks'
);
const tasksUl = document.querySelector('.tasks');
const taskForm =
  document.querySelector('#task-form');

const logsUl = document.querySelector('.logs');

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

  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  taskDate = new Date(formatDate(taskDate));

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

  const sameDay = utc1 - utc2;

  // create notification only on day task is due
  if (sameDay === 0) {
    let taskDateMilliseconds =
      Number(taskTime.split(':')[0]) *
        60 *
        60 *
        1000 +
      Number(taskTime.split(':')[1]) * 60 * 1000;

    let dateNow = new Date();
    let currentTimeMilliseconds =
      dateNow.getHours() * 60 * 60 * 1000 +
      dateNow.getMinutes() * 60 * 1000;

    let setTimeoutMilliseconds =
      taskDateMilliseconds -
      currentTimeMilliseconds;

    // set notification for future tasks and not past tasks
    if (setTimeoutMilliseconds >= 0) {
      setTimeout(() => {
        let title = taskTitle;
        let options = {
          body: "It's time to start your task!",
          icon: './bell.png',
          timestamp:
            new Date().toLocaleDateString(),
        };
        let notification = new Notification(
          title,
          options
        );
      }, setTimeoutMilliseconds);
    }
  }
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

function appendTaskToList(task) {
  let li = `<li><span class="task-title">${
    task.taskTitle
  }</span> <span class="right-arrow-span"><img src="arrows.png" alt="right arrow" class="arrow-icon" /></span> <span class="task-time">${
    task.taskTime
  },</span> <span class="task-date">${new Date(
    formatDate(task.taskDate)
  ).toLocaleDateString()}</span> <span class="task-/li>`;

  tasksUl.insertAdjacentHTML('afterbegin', li);
}

function formatDate(dateString) {
  let [year, month, day] = dateString.split('-');
  let formattedDate = [month, day, year].join(
    '-'
  );

  return formattedDate;
}

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();

  let [taskTitle, taskTime, taskDate] =
    document.querySelectorAll('input');
  taskTitle = taskTitle.value.trim();
  taskTime = taskTime.value;
  taskDate = taskDate.value;

  let task = {
    taskTitle,
    taskTime,
    taskDate,
  };

  getPermission();

  addTaskToDatabase(task);
});

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

function clearFormInput() {
  taskForm.reset();
}

IDB();
