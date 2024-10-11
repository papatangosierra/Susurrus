// Library Imports
import { Elysia, t } from "elysia";
import { swagger } from "@elysiajs/swagger";

// Class Imports
import { Timer } from "./Classes/timer";
import { TimerManager } from "./Classes/timerManager";

import { UserManager } from "./Classes/userManager";

// Handler Imports
import { createTimerAsOwner } from "./handlers/createTimerAsOwner";
import { joinTimer } from "./handlers/joinTimer";
import { getUser } from "./handlers/getUser";
import db from "./database";

// Instantiate the timer and user managers
const timerManager = new TimerManager(db);
const userManager = new UserManager(db);

const app = new Elysia()
  .use(swagger())
  // load the timer manager into the app state
  .decorate("timerManager", timerManager)
  .decorate("userManager", userManager)
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
  // .get("/user/:id", getUser)
  // .post("/timers", createTimer)
  .get("/timers/:timerId", joinTimer)
  // .get("/timers/:id/users", getUsersForTimer)
  // .put("/timers/:id/start", startTimer)
  // .put("/timers/:id/stop", stopTimer)
  .listen(3000);

console.log(
  `🦊 Timer server is running at ${app.server?.hostname}:${app.server?.port}`,
);
