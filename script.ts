import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

const demosSection = document.getElementById("demos");

let handLandmarker = undefined;
let runningMode = "IMAGE";
let enableWebcamButton: HTMLButtonElement;
let webcamRunning: Boolean = false;
let scoreA = 0;
let scoreB = 0;

// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createHandLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU"
    },
    runningMode: runningMode,
    numHands: 2
  });
  demosSection.classList.remove("invisible");
};
createHandLandmarker();

// Continuously grab image from webcam stream and detect it.

const video = document.getElementById("webcam") as HTMLVideoElement;
const canvasElement = document.getElementById(
  "output_canvas"
) as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext("2d");

// Check if webcam access is supported.
const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection.
function enableCam(event) {
  if (!handLandmarker) {
    console.log("Wait! objectDetector not loaded yet.");
    return;
  }

if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.style.display = "block"; // Show the button
} else {
    webcamRunning = true;
    enableWebcamButton.style.display = "none"; // Hide the button
}

  // getUsermedia parameters.
  const constraints = {
    video: true
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  });
}

let lastVideoTime = -1;
let results = undefined;
console.log(video);
async function predictWebcam() {
  canvasElement.style.width = video.videoWidth;;
  canvasElement.style.height = video.videoHeight;
  canvasElement.width = video.videoWidth;
  canvasElement.height = video.videoHeight;
  
  // Now let's start detecting the stream.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await handLandmarker.setOptions({ runningMode: "VIDEO" });
  }
  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    results = handLandmarker.detectForVideo(video, startTimeMs);
  }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
 if (results.multiHandLandmarks && results.multiHandedness) {
    for (let index = 0; index < results.multiHandLandmarks.length; index++) {
      const classification = results.multiHandedness[index];
      const landmarks = results.multiHandLandmarks[index];

      // Update the paddle's position based on the hand landmarks
      // Assume that landmarks[0] corresponds to the base of the hand
      if (classification.label === 'Left') {
        paddleA.y = landmarks[0].y * pongCanvas.height;
      } else if (classification.label === 'Right') {
        paddleB.y = landmarks[0].y * pongCanvas.height;
      }
    }
  }if (results.multiHandLandmarks && results.multiHandedness) {
    for (let index = 0; index < results.multiHandLandmarks.length; index++) {
      const classification = results.multiHandedness[index];
      const landmarks = results.multiHandLandmarks[index];

      // Update the paddle's position based on the hand landmarks
      // Assume that landmarks[0] corresponds to the base of the hand
      if (classification.label === 'Left') {
        paddleA.y = landmarks[0].y * pongCanvas.height;
      } else if (classification.label === 'Right') {
        paddleB.y = landmarks[0].y * pongCanvas.height;
      }
    }
  }
  canvasCtx.restore();

  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

// Create a new canvas context for the pong game
const pongCanvas = document.getElementById("pongCanvas") as HTMLCanvasElement;
const pongCtx = pongCanvas.getContext("2d");

// Define the pong paddles and ball
let paddleA = { x: 0, y: 0, width: 10, height: 50 };
let paddleB = { x: pongCanvas.width - 10, y: 0, width: 10, height: 50 };
let ball = { x: pongCanvas.width / 2, y: pongCanvas.height / 2, radius: 3, dx: 2, dy: 2 };


// Add a new function to update the game state and draw the pong game
function drawPong() {
  pongCtx.clearRect(0, 0, pongCanvas.width, pongCanvas.height);

  // Draw paddles
  pongCtx.fillRect(paddleA.x, paddleA.y, paddleA.width, paddleA.height);
  pongCtx.fillRect(paddleB.x, paddleB.y, paddleB.width, paddleB.height);

  // Update paddle positions based on hand landmarks
  if (results && results.landmarks) {
    const handLandmarks = results.landmarks;
    if (handLandmarks.length >= 2) {
      const indexFingerA = handLandmarks[0][8]; // Landmark of index finger for hand A
      const indexFingerB = handLandmarks[1][8]; // Landmark of index finger for hand B
      paddleA.y = indexFingerA.y * pongCanvas.height - paddleA.height / 2;
      paddleB.y = indexFingerB.y * pongCanvas.height - paddleB.height / 2;
    }
  }

  // Draw ball
  pongCtx.beginPath();
  pongCtx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  pongCtx.fill();

  // Move the ball
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Check ball collision with paddles
  if (
    ball.y + ball.radius >= paddleA.y &&
    ball.y - ball.radius <= paddleA.y + paddleA.height &&
    ball.x - ball.radius <= paddleA.x + paddleA.width
  ) {
    ball.dx = -ball.dx;
  } else if (ball.x - ball.radius < 0) {
    // Player B scores a point
    scoreB++;
    // Reset ball to center
    ball.x = pongCanvas.width / 2;
    ball.y = pongCanvas.height / 2;
  }

  if (
    ball.y + ball.radius >= paddleB.y &&
    ball.y - ball.radius <= paddleB.y + paddleB.height &&
    ball.x + ball.radius >= paddleB.x
  ) {
    ball.dx = -ball.dx;
  } else if (ball.x + ball.radius > pongCanvas.width) {
    // Player A scores a point
    scoreA++;
    // Reset ball to center
    ball.x = pongCanvas.width / 2;
    ball.y = pongCanvas.height / 2;
  }

  // Check ball collision with top and bottom walls
  if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= pongCanvas.height) {
    ball.dy = -ball.dy;
  }

  // Draw scores
  pongCtx.font = "10px Arial";
  pongCtx.fillStyle = "#0095DD";
  pongCtx.fillText("Player A: " + scoreA, 18, 20);
  pongCtx.fillText("Player B: " + scoreB, pongCanvas.width - 70, 20);

  // Call this function again to keep updating the game
  window.requestAnimationFrame(drawPong);
}

// Start the pong game
drawPong();


