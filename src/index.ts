// Library Imports
import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";

// Class Imports
import { Timer } from "./Classes/timer";
import { TimerManager } from "./Classes/timerManager";
import { UserManager } from "./Classes/userManager";

// Handler Imports
import { joinTimer } from "./handlers/joinTimer";
import { getUser } from "./handlers/getUser";
import { makeTimer } from "./handlers/makeTimer";

// SQLite Database
import db from "./database";
import { User } from "./Classes/user";
import { ClientState } from "./Classes/clientState";

// Dummy Test State 
const dummyPlug = {
  timer: {
    id: "abc",
    name: "Juppun Souji",
    duration: 10000,
    startTime: 0,
    owner: {
      id: "1",
      name: "Paul",
    },
    users: [
      { id: "1", name: "Paul" },
      { id: "2", name: "Whit" },
      { id: "3", name: "Christine" },
      { id: "4", name: "Angela" },
      { id: "5", name: "Molly" },
    ],
    pingQueue: [],
    deletedAt: 0,
  },
  user: {
    id: "1",
    name: "Paul",
  }
}

// Instantiate the timer and user managers
const timerManager = new TimerManager(db);
const userManager = new UserManager(db);

// Instantiate the websocket
const websocket = new Elysia()
  .ws("/ws", {
    // Validate incoming message shape
    open(ws) {
      console.log("websocket connection opened with id: " + ws.id);
      const providedTimerId = ws.data.query.timerId;
      // If the timerId was provided in the URL, join the timer
      if (providedTimerId) {
        // Join existing timer
        const timer = timerManager.getTimer(providedTimerId);
        if (timer) {
          ws.subscribe(providedTimerId);
          const user = new User(db);
          userManager.addUser(user);
          user.websocketId = ws.id;
          timerManager.addUserToTimer(user, timer.id);
          const clientState = new ClientState(user, timer).getAsObject();
          ws.send({ // send to the client that just connected
            type: 'JOINED_TIMER',
            payload: clientState,
            timerId: timer.id
          });
          ws.publish(providedTimerId, { // send to all other clients in the timer
            type: 'JOINED_TIMER',
            payload: clientState,
            timerId: timer.id
          });
        } else {
          // TODO: Handle the case of an invalid timerId in a way
          // that is more useful to the user
          ws.send({ error: `Timer ${providedTimerId} not found` });
        }
      } else {
        // Create new timer
        const user = new User(db);
        userManager.addUser(user);
        const timer = timerManager.createTimer(user);
        user.websocketId = ws.id;
        timer.setDurationInMinutes(10);
        const clientState = new ClientState(user, timer).getAsObject();
        ws.send({
          type: 'INITIAL_STATE',
          payload: clientState,
          timerId: timer.id
        });
        ws.subscribe(timer.id);
      }
    },

    message(ws, message) {
      console.log("got websocket message: " + message);
      if (message.type === 'UPDATE_TIMER') {
        const timerId = message.payload.timerId;
        ws.publish(timerId, message);
      }
      // ws.send(dummyPlug);
    },

    close(ws) {
      console.log("websocket connection closed");
      const user = userManager.getUserByWebsocketId(ws.id);
      console.log("removing user: ", user?.name);
      if (user) {
        timerManager.removeUserFromTimer(user, user.timerId);
        userManager.removeUser(userManager.getUserByWebsocketId(ws.id)?.id ?? '');
      }

      // TODO: Remove user from timer

      // TODO: broadcast updated timer state to other usersn
    }
  });

const app = new Elysia()
  .use(swagger())
  // load the managers into the app state
  .decorate("timerManager", timerManager)
  .decorate("userManager", userManager)
  .decorate("db", db)
  /* 
    Anyone visiting the site gets the frontend
   */
  .get("/", () => {
    console.log("index.html requested");
    return Bun.file("./frontend/dist/index.html");
  })
  .get("/js/App.js", () => {
    console.log("App.js requested");
    return Bun.file("./frontend/public/js/App.js");
  })
  .get("/styles.css", () => {
    console.log("styles.css requested");
    return Bun.file("./frontend/public/styles.css");
  })

  /* When the client requests a user identity, we should give them one */
  .get("/get-user", getUser)

  /* When the client requests to make a timer, they give us their user id 
  and we make a timer for them and tell them its id*/
  .get("/make-timer/:userId", makeTimer)

  /* When the client provides a timerId, we should join them to that timer, making a new user
  in the process */
  .get("/timers/:timerId", () => {
    console.log("Timer Join requested");
    return Bun.file("./frontend/dist/index.html");
  })  /* Use a websocket to send updates to the client about the timer */
  .use(websocket)
  // .get("/timers/:id/users", getUsersForTimer)
  // .put("/timers/:id/start", startTimer)
  // .put("/timers/:id/stop", stopTimer)
  .listen(3000);

console.log(
  `🦊 Timer server is running at ${app.server?.hostname}:${app.server?.port}`,
);
