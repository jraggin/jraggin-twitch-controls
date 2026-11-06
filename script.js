
// ============================================
// JRAGGIN TWITCH CONTROLS
// SCENE CONTROL SYSTEM
// ============================================

// -----------------------------
// FIREBASE CONFIGURATION
// -----------------------------

const firebaseConfig = {
  apiKey: "AIzaSyDFC_FzA8r_TD03grYSGGfFubsE90xdU2s",
  authDomain: "twitch-knobs.firebaseapp.com",
  databaseURL: "https://twitch-knobs-default-rtdb.firebaseio.com",
  projectId: "twitch-knobs",
  storageBucket: "twitch-knobs.firebasestorage.app",
  messagingSenderId: "172717259045",
  appId: "1:172717259045:web:1f1c901facb66410fc82cc"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.database();

console.log("Jraggin Twitch Controls connected");

// -----------------------------
// SCENE CONFIGURATION
// -----------------------------

const scenes = [
  { id: 1, name: "Pub of Many Paths", note: 48 },
  { id: 2, name: "Kreg on a Cliff", note: 49 },
  { id: 3, name: "Late Nite Jraggin", note: 50 },
  { id: 4, name: "Mouth of the Beast", note: 51 },
  { id: 5, name: "Field", note: 52 },
  { id: 6, name: "The Nothing", note: 53 }
];

// -----------------------------
// SETTINGS
// -----------------------------

const COOLDOWN_MS = 10000;

const COMMAND_PATH = "sceneControls/command";
const COOLDOWN_PATH = "sceneControls/cooldown";

// -----------------------------
// HTML ELEMENTS
// -----------------------------

const app = document.getElementById("app");

const sceneSection = document.createElement("section");
sceneSection.id = "scene-section";

const heading = document.createElement("h2");
heading.textContent = "CHOOSE YOUR BACKGROUND";

const description = document.createElement("p");
description.className = "scene-description";
description.textContent = "Choose the visual world for the stream.";

const buttonGrid = document.createElement("div");
buttonGrid.id = "scene-buttons";

const status = document.createElement("div");
status.id = "scene-status";
status.textContent = "Connecting...";

const cooldownDisplay = document.createElement("div");
cooldownDisplay.id = "cooldown-display";

sceneSection.appendChild(heading);
sceneSection.appendChild(description);
sceneSection.appendChild(buttonGrid);
sceneSection.appendChild(status);
sceneSection.appendChild(cooldownDisplay);

app.appendChild(sceneSection);

// -----------------------------
// CREATE SCENE BUTTONS
// -----------------------------

const buttons = {};

scenes.forEach(scene => {

  const button = document.createElement("button");

  button.className = "scene-button";
  button.textContent = scene.name;

  button.addEventListener("click", () => {
    selectScene(scene);
  });

  buttonGrid.appendChild(button);

  buttons[scene.id] = button;

});

// -----------------------------
// GLOBAL COOLDOWN DISPLAY
// -----------------------------

let cooldownUntil = 0;

function updateCooldownDisplay() {

  const remaining = cooldownUntil - Date.now();

  if (remaining > 0) {

    const seconds = Math.ceil(remaining / 1000);

    cooldownDisplay.textContent =
      `Please wait ${seconds} seconds before another scene change.`;

    Object.values(buttons).forEach(button => {
      button.disabled = true;
    });

  } else {

    cooldownDisplay.textContent = "";

    Object.values(buttons).forEach(button => {
      button.disabled = false;
    });

  }

}

// -----------------------------
// LISTEN FOR GLOBAL COOLDOWN
// -----------------------------

db.ref(COOLDOWN_PATH).on("value", snapshot => {

  const data = snapshot.val();

  cooldownUntil = data && data.until
    ? Number(data.until)
    : 0;

  updateCooldownDisplay();

  if (cooldownTimer) {
    clearInterval(cooldownTimer);
  }

  cooldownTimer = setInterval(updateCooldownDisplay, 250);

});

let cooldownTimer = null;

// -----------------------------
// SCENE SELECTION
// -----------------------------

async function selectScene(scene) {

  const now = Date.now();

  status.textContent = "Requesting scene change...";

  // Reserve the shared cooldown atomically.
  // Only one viewer can reserve it at a time.

  try {

    const cooldownRef = db.ref(COOLDOWN_PATH);

    const result = await cooldownRef.transaction(current => {

      const currentUntil = current && current.until
        ? Number(current.until)
        : 0;

      if (currentUntil > now) {
        return;
      }

      return {
        until: now + COOLDOWN_MS,
        scene: scene.id
      };

    });

    if (!result.committed) {

      status.textContent = "Someone just changed the scene!";

      return;

    }

    cooldownUntil = Number(result.snapshot.val().until);

    updateCooldownDisplay();

    // -----------------------------
    // SEND SCENE COMMAND
    // -----------------------------

    const command = {
      scene: scene.id,
      name: scene.name,
      note: scene.note,
      requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    await db.ref(COMMAND_PATH).set(command);

    status.textContent = `Selected: ${scene.name}`;

    console.log("Scene command sent:", command);

  } catch (error) {

    console.error("Scene selection error:", error);

    status.textContent = "Connection error. Please try again.";

  }

}

// -----------------------------
// INITIAL STATUS
// -----------------------------

db.ref(".info/connected").on("value", snapshot => {

  if (snapshot.val() === true) {
    status.textContent = "Connected — choose a background!";
  } else {
    status.textContent = "Connecting to Firebase...";
  }

});
