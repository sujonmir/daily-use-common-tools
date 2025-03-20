let timerInterval; // Global variable to store the interval ID
let isTimerRunning = false; // Global variable to track timer state
let timerType = ""; // Global variable to store the selected timer type
let minutesInput = document.getElementById("minutesInput");
// Function to handle timer type change
function handleTimerTypeChange() {
  const timerTypeSelect = document.getElementById("timerType");
  const fixedTimeInput = document.getElementById("fixedTimeInput");
  const endTimeInputSection = document.getElementById("endTimeInputSection");

  timerType = timerTypeSelect.value;

  if (timerType === "fixedTime") {
    fixedTimeInput.style.display = "block";
    endTimeInputSection.style.display = "none";
  } else if (timerType === "endTime") {
    fixedTimeInput.style.display = "none";
    endTimeInputSection.style.display = "block";
  } else {
    fixedTimeInput.style.display = "none";
    endTimeInputSection.style.display = "none";
  }
}

// Function to toggle timer
function toggleTimer() {
  const button = document.getElementById("timerController");

  if (isTimerRunning) {
    // Reset the timer and input fields
    clearInterval(timerInterval);
    document.getElementById("timer").innerHTML = "00:00:00";
    button.textContent = "Start Timer";
    isTimerRunning = false;

    // Reset input fields based on the selected timer type
    if (timerType === "fixedTime") {
      document.getElementById("minutesInput").value = ""; // Clear Fixed Time input
    } else if (timerType === "endTime") {
      document.getElementById("endTimeInput").value = ""; // Clear End Time input
    }
  } else {
    // Start the timer based on the selected type
    if (timerType === "fixedTime") {
      const minutesInput = document.getElementById("minutesInput").value;
      if (!minutesInput || minutesInput <= 0) {
        alert("Please enter a valid number of minutes.");
        return;
      }

      const now = new Date().getTime();
      const endTimestamp = now + parseInt(minutesInput) * 60 * 1000 + 999;

      startTimer(endTimestamp);
    } else if (timerType === "endTime") {
      const endTime = document.getElementById("endTimeInput").value;
      if (!endTime) {
        alert("Please select a date and time.");
        return;
      }

      const endTimestamp = new Date(endTime).getTime();
      startTimer(endTimestamp);
    } else {
      alert("Please select a timer method.");
      return;
    }

    button.textContent = "Reset Timer";
    isTimerRunning = true;
  }
}

// function for fixed time start
minutesInput.addEventListener("keydown", function (event) {
  if (event.code === "Enter") {
    toggleTimer();
  }
});

// function for fixed time end

// Function to start the timer
function startTimer(endTimestamp) {
  function updateTimer() {
    const now = new Date().getTime();
    const timeLeft = endTimestamp - now;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      document.getElementById("timer").innerHTML = "Time's Up!";
      document.getElementById("timerController").textContent = "Start Timer";
      isTimerRunning = false;
      playBeepSound(); // Call your existing beep sound function
      return;
    }

    const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((timeLeft / (1000 * 60)) % 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor((timeLeft / 1000) % 60)
      .toString()
      .padStart(2, "0");

    document.getElementById(
      "timer"
    ).innerHTML = `${hours}:${minutes}:${seconds}`;
  }

  clearInterval(timerInterval); // Clear any existing interval
  updateTimer(); // Update timer immediately
  timerInterval = setInterval(updateTimer, 1000); // Start the interval
}

function toggleTimerFullscreen() {
  let timer = document.getElementById("timer");

  if (!document.fullscreenElement) {
    if (timer.requestFullscreen) {
      timer.requestFullscreen();
    } else if (timer.mozRequestFullScreen) {
      timer.mozRequestFullScreen();
    } else if (timer.webkitRequestFullscreen) {
      timer.webkitRequestFullscreen();
    } else if (timer.msRequestFullscreen) {
      timer.msRequestFullscreen();
    }
    timer.classList.add("timer-fullscreen");
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
    timer.classList.remove("timer-fullscreen");
  }
}
// Detect fullscreen exit (handles ESC key & manual exit)
document.addEventListener("fullscreenchange", function () {
  if (!document.fullscreenElement) {
    document.getElementById("timer").classList.remove("timer-fullscreen");
  }
});

// 🔊 Beep Sound Function
function playBeepSound() {
  let count = 0;
  let ringTone = "media/audio/beep-07a.wav"; // Ensure this path is correct
  let audio = new Audio(ringTone); // Create a new Audio object

  let beepInterval = setInterval(() => {
    if (count < 30) {
      audio.play(); // Play the audio
      count++;
      if (!document.fullscreenElement && count >= 2) {
        if (timer.requestFullscreen) {
          clearInterval(beepInterval);
        }
      }
    } else {
      clearInterval(beepInterval); // Stop the interval after 30 beeps
    }
  }, 500); // Beep every 500ms (0.5 seconds)
}
