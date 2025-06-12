function updateClock() {
  let now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes().toString().padStart(2, "0");
  let seconds = now.getSeconds().toString().padStart(2, "0");
  let timeType = "AM";

  if (hours >= 12) {
    timeType = "PM";
    if (hours > 12) {
      hours = hours - 12;
    }
  } else {
    timeType = "AM";
  }
  if (hours == 0) {
    hours = 12;
  }

  hours = hours.toString().padStart(2, "0");

  document.getElementById("clock").innerHTML = `
    <span class="time">${hours}:${minutes}:${seconds}</span>
    <span class="small-am-pm">${timeType}</span>
`;
}
// date start
function updateDate() {
  let options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  };

  let bangladeshTime = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Dhaka",
  });

  let bangladeshDate = new Date(bangladeshTime).toLocaleDateString(
    "bn-BD",
    options
  );
  document.getElementById("date").innerText = `${bangladeshDate} খ্রিষ্টাব্দ`;
  dateToday("date_today", "bangla");

  // 🔹 আরবি তারিখ বাংলা ভাষায় দেখানো
  let bangladeshIslamicDate = new Date();
  bangladeshIslamicDate.setDate(bangladeshIslamicDate.getDate() - 1);

  let islamicDate = new Intl.DateTimeFormat("bn-TN-u-ca-islamic", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(bangladeshIslamicDate);

  islamicDate = islamicDate.replace("যুগ", "হিজরি");
  islamicDate = islamicDate.replace("খ্রিস্টপূর্ব", "হিজরি");
  islamicDate = islamicDate.replace("জানুয়ারি", "মুহাররম");
  islamicDate = islamicDate.replace("ফেব্রুয়ারি", "সফর");
  islamicDate = islamicDate.replace("মার্চ", "রবিউল আউয়াল");
  islamicDate = islamicDate.replace("এপ্রিল", "রবিউস সানি");
  islamicDate = islamicDate.replace("মে", "জমাদিউল আউয়াল");
  islamicDate = islamicDate.replace("জুন", "জমাদিউস সানি");
  islamicDate = islamicDate.replace("জুলাই", "রজব");
  islamicDate = islamicDate.replace("অগাস্ট", "শাবান");
  islamicDate = islamicDate.replace("সেপ্টেম্বর", "রমজান");
  islamicDate = islamicDate.replace("অক্টোবর", "শাওয়াল");
  islamicDate = islamicDate.replace("নভেম্বর", "জিলকদ");
  islamicDate = islamicDate.replace("ডিসেম্বর", "জিলহজ");

  document.getElementById("arabicDateBangla").innerText = `${islamicDate}`;
}

function updateTime() {
  updateClock();
  updateDate();
}

// date end
function toggleFullscreen() {
  let clock = document.getElementById("clock");
  if (!document.fullscreenElement) {
    if (clock.requestFullscreen) {
      clock.requestFullscreen();
    } else if (clock.mozRequestFullScreen) {
      clock.mozRequestFullScreen();
    } else if (clock.webkitRequestFullscreen) {
      clock.webkitRequestFullscreen();
    } else if (clock.msRequestFullscreen) {
      clock.msRequestFullscreen();
    }
    clock.classList.add("fullscreen");
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
    clock.classList.remove("fullscreen");
  }
}
// Detect fullscreen exit (handles ESC key & manual exit)
document.addEventListener("fullscreenchange", function () {
  if (!document.fullscreenElement) {
    document.getElementById("clock").classList.remove("fullscreen");
  }
});

setInterval(updateTime, 1000);
updateTime();

// stopwatch start
(function () {
  let startTime = 0,
    elapsedTime = 0, // This will be initialized from localStorage
    timerInterval;
  let running = false;

  // --- Initialization code START ---
  function initializeStopwatchState() {
    // Get values from localStorage, providing defaults if they don't exist
    const savedHrsStr = localStorage.hours || "00";
    const savedMinStr = localStorage.minutes || "00";
    const savedSecStr = localStorage.seconds || "00";
    const savedMsStr = localStorage.milliSeconds || "000";

    // Convert saved strings to numbers
    const savedHrs = parseInt(savedHrsStr, 10);
    const savedMin = parseInt(savedMinStr, 10);
    const savedSec = parseInt(savedSecStr, 10);
    const savedMs = parseInt(savedMsStr, 10);

    // Calculate the initial elapsedTime in milliseconds
    // Check if parsed values are valid numbers, default to 0 if not
    elapsedTime =
      (isNaN(savedHrs) ? 0 : savedHrs * 3600000) +
      (isNaN(savedMin) ? 0 : savedMin * 60000) +
      (isNaN(savedSec) ? 0 : savedSec * 1000) +
      (isNaN(savedMs) ? 0 : savedMs);

    // Update the display immediately with the loaded values
    const hoursDisplay = document.getElementById("hours_stopwatch");
    const minutesDisplay = document.getElementById("minutes_stopwatch");
    const secondsDisplay = document.getElementById("seconds_stopwatch");
    const msDisplay = document.getElementById("milliseconds_stopwatch");

    if (hoursDisplay) hoursDisplay.innerText = savedHrsStr.padStart(2, "0");
    if (minutesDisplay) minutesDisplay.innerText = savedMinStr.padStart(2, "0");
    if (secondsDisplay) secondsDisplay.innerText = savedSecStr.padStart(2, "0");
    if (msDisplay) msDisplay.innerText = savedMsStr.padStart(3, "0");
  }

  // Run the initialization function when the script loads
  initializeStopwatchState();
  // --- Initialization code END ---

  // Keep your existing updateTime function as is
  function updateTime() {
    if (!running) return;
    // Recalculate based on startTime, elapsedTime updates internally
    elapsedTime = Date.now() - startTime;

    let ms = Math.floor(elapsedTime % 1000)
      .toString()
      .padStart(3, "0");
    let sec = Math.floor((elapsedTime / 1000) % 60)
      .toString()
      .padStart(2, "0");
    let min = Math.floor((elapsedTime / (1000 * 60)) % 60)
      .toString()
      .padStart(2, "0");
    let hrs = Math.floor((elapsedTime / (1000 * 60 * 60)) % 24)
      .toString()
      .padStart(2, "0");

    // Save to localStorage (as per your original code)
    localStorage.milliSeconds = ms;
    localStorage.seconds = sec;
    localStorage.minutes = min;
    localStorage.hours = hrs;

    // Update display from localStorage (as per your original code)
    const hoursDisplay = document.getElementById("hours_stopwatch");
    const minutesDisplay = document.getElementById("minutes_stopwatch");
    const secondsDisplay = document.getElementById("seconds_stopwatch");
    const msDisplay = document.getElementById("milliseconds_stopwatch");

    // Add checks in case elements don't exist yet when updateTime runs
    if (hoursDisplay) hoursDisplay.innerText = localStorage.hours;
    if (minutesDisplay) minutesDisplay.innerText = localStorage.minutes;
    if (secondsDisplay) secondsDisplay.innerText = localStorage.seconds;
    if (msDisplay) msDisplay.innerText = localStorage.milliSeconds;

    timerInterval = requestAnimationFrame(updateTime);
  }

  // Keep your existing start button listener - it already uses elapsedTime
  document
    .getElementById("start_stopwatch")
    .addEventListener("click", function () {
      if (!running) {
        // This line correctly uses the elapsedTime loaded during initialization
        startTime = Date.now() - elapsedTime;
        running = true;

        // Cancel any leftover frame requests before starting a new one
        // (Good practice to add)
        if (timerInterval) {
          cancelAnimationFrame(timerInterval);
        }
        updateTime(); // Start the update loop
      }
    });

  // Keep your existing stop button listener as is
  document
    .getElementById("stop_stopwatch")
    .addEventListener("click", function () {
      if (running) {
        // Check if running before stopping
        running = false;
        if (timerInterval) {
          // Check if timerInterval exists before cancelling
          cancelAnimationFrame(timerInterval);
          timerInterval = null; // Clear the interval ID
        }
        // Note: Your original stop handler didn't explicitly save to localStorage here.
        // The last values saved would be from the last execution of `updateTime`.
        // This might be slightly inaccurate if the stop button is clicked between frames.
        // If precise saving on stop is needed, add localStorage.setItem calls here.
      }
    });

  // Keep your existing reset button listener as is
  document
    .getElementById("reset_stopwatch")
    .addEventListener("click", function () {
      running = false;
      elapsedTime = 0; // Reset internal elapsed time
      // Reset startTime reference point (optional but good practice)
      startTime = Date.now();

      if (timerInterval) {
        // Check if timerInterval exists before cancelling
        cancelAnimationFrame(timerInterval);
        timerInterval = null; // Clear the interval ID
      }

      // Reset localStorage
      localStorage.hours = "00";
      localStorage.minutes = "00";
      localStorage.seconds = "00";
      localStorage.milliSeconds = "000";

      // Update display from the reset localStorage values
      const hoursDisplay = document.getElementById("hours_stopwatch");
      const minutesDisplay = document.getElementById("minutes_stopwatch");
      const secondsDisplay = document.getElementById("seconds_stopwatch");
      const msDisplay = document.getElementById("milliseconds_stopwatch");

      if (hoursDisplay) hoursDisplay.innerText = localStorage.hours;
      if (minutesDisplay) minutesDisplay.innerText = localStorage.minutes;
      if (secondsDisplay) secondsDisplay.innerText = localStorage.seconds;
      if (msDisplay) msDisplay.innerText = localStorage.milliSeconds;
    });
})(); // End Stopwatch IIFE

// stopwatch full screen funtionality (Keep this as is)
// stopwatch full screen funtionality
(function () {
  function toggleFullScreen() {
    const element = document.getElementById("stopwatch_section");

    if (!document.fullscreenElement) {
      // Enter full-screen mode
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
      }

      // Add full-screen mode classes
      element.classList.add("fullscreen-mode", "_watch");
      showCloseButton();
    }
  }

  function exitFullScreen() {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
    // Ensure UI resets after exiting full screen
    resetUI();
  }

  function resetUI() {
    const element = document.getElementById("stopwatch_section");
    element.classList.remove("fullscreen-mode", "_watch"); // Remove classes
    removeCloseButton(); // Remove close button
  }

  function showCloseButton() {
    const closeButton = document.createElement("button");
    closeButton.innerHTML = "✖";
    closeButton.id = "closeFullscreenBtn";
    closeButton.onclick = exitFullScreen;
    document.getElementById("stopwatch_section").appendChild(closeButton);
  }

  function removeCloseButton() {
    const closeButton = document.getElementById("closeFullscreenBtn");
    if (closeButton) {
      closeButton.remove();
    }
  }

  // Detect fullscreen exit (handles ESC key & manual exit)
  document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement) {
      resetUI();
    }
  });

  // Attach event listener to trigger full-screen mode
  document
    .getElementById("stopwatch_container")
    .addEventListener("click", toggleFullScreen);
})();
// stopwatch end
