const tasksUl = document.querySelector('.tasks');
const taskForm =
  document.querySelector('#task-form');

const logsUl = document.querySelector('.logs');

let db = null,
  objectStore = null,
  DBOpenReq = null;

function getPermission() {
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      displayNotification();
    } else {
      Notification.requestPermission()
        .then((response) => {
          displayNotification();
        })
        .catch((error) => {
          createLog('Requesting permisson error');
        });
    }
  }
}

function displayNotification() {
  let title = 'Testing Notification';
  let options = {
    body: 'A magical wish!',
    timestamp: Date.now() + 100000,
  };

  let notification = new Notification(
    title,
    options
  );
}

const IDB = function () {
  db = null;
  objectStore = null;
  DBOpenReq = indexedDB.open('MagicalTasksDB', 1);

  DBOpenReq.addEventListener('error', (error) => {
    console.log(error);
  });

  DBOpenReq.addEventListener(
    'success',
    (event) => {
      db = event.target.result;
      console.log('success', db);
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
      } else {
        console.log('Object store exists');
      }
    }
  );
};

// TODO change to toaster icon API to display a log message for different events
function createLog(logMessage) {
  let message = document.createElement('li');
  message.textContent = logMessage;

  logsUl.appendChild(message);
}

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();

  getPermission();

  let [taskTitle, taskTime, taskDate] =
    document.querySelectorAll('input');
  taskTitle = taskTitle.value.trim();
  taskTime = taskTime.value;
  taskDate = taskDate.value;

  let magicalTask = {
    taskTitle,
    taskTime,
    taskDate,
  };

  let transaction = makeNewTransaction(
    'magicalTasksStore',
    'readwrite'
  );

  let store = transaction.objectStore(
    'magicalTasksStore'
  );
  let request = store.add(magicalTask);

  request.onsuccess = () => {
    createLog('Successfully added task');
  };

  request.onerror = () => {
    console.log(
      'There was an error adding the task'
    );
  };

  transaction.oncomplete = () => {
    // TODO: build task list if there are any tasks existing
    clearFormInput();
  };
});

function makeNewTransaction(storeName, mode) {
  let transaction = db.transaction(
    storeName,
    mode
  );
  transaction.addEventListener(
    'error',
    (error) => {
      console.log(error);
    }
  );

  return transaction;
}

function clearFormInput() {
  taskForm.reset();
}

IDB();
