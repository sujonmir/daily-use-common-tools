document.addEventListener("DOMContentLoaded", function () {
  // ===================================================================
  // 1. TOP CLOCK & DATE LOGIC
  // ===================================================================

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
    }
    if (hours == 0) {
      hours = 12;
    }

    hours = hours.toString().padStart(2, "0");

    const clockElement = document.getElementById("clock");
    if (clockElement) {
      clockElement.innerHTML = `
        <span class="time">${hours}:${minutes}:${seconds}</span>
        <span class="small-am-pm">${timeType}</span>
      `;
    }
  }

  function updateDate() {
    let options = { year: "numeric", month: "long", day: "numeric" };
    let bangladeshTime = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Dhaka",
    });
    let bangladeshDate = new Date(bangladeshTime).toLocaleDateString(
      "bn-BD",
      options
    );

    const dateElement = document.getElementById("date");
    if (dateElement) {
      dateElement.innerText = `${bangladeshDate} খ্রিষ্টাব্দ`;
    }

    let bangladeshWeekday = new Date(bangladeshTime).toLocaleDateString(
      "bn-BD",
      { weekday: "long" }
    );
    const weekDateElement = document.getElementById("WeekDate");
    if (weekDateElement) {
      weekDateElement.innerText = `${bangladeshWeekday}`;
    }

    let bangladeshIslamicDate = new Date();
    bangladeshIslamicDate.setDate(bangladeshIslamicDate.getDate() - 1);
    let islamicDate = new Intl.DateTimeFormat("bn-TN-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(bangladeshIslamicDate);
    islamicDate = islamicDate
      .replace(/যুগ|খ্রিস্টপূর্ব/g, "হিজরি")
      .replace("জানুয়ারি", "মুহাররম")
      .replace("ফেব্রুয়ারি", "সফর")
      .replace("মার্চ", "রবিউল আউয়াল")
      .replace("এপ্রিল", "রবিউস সানি")
      .replace("মে", "জমাদিউল আউয়াল")
      .replace("জুন", "জমাদিউস সানি")
      .replace("জুলাই", "রজব")
      .replace("অগাস্ট", "শাবান")
      .replace("সেপ্টেম্বর", "রমজান")
      .replace("অক্টোবর", "শাওয়াল")
      .replace("নভেম্বর", "জিলকদ")
      .replace("ডিসেম্বর", "জিলহজ");

    const arabicDateElement = document.getElementById("arabicDateBangla");
    if (arabicDateElement) {
      arabicDateElement.innerText = `${islamicDate}`;
    }
  }

  function updateTimeAndDate() {
    updateClock();
    updateDate();
  }

  // Set the interval for the main clock and date
  setInterval(updateTimeAndDate, 1000);
  updateTimeAndDate(); // Initial call

  // ===================================================================
  // 2. TOP CLOCK FULLSCREEN LOGIC (FIXED)
  // ===================================================================

  function toggleClockFullscreen() {
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
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  // Attach the event listener to the clock element
  const clockElement = document.getElementById("clock");
  if (clockElement) {
    clockElement.addEventListener("click", toggleClockFullscreen);
  }

  // Handle class changes on fullscreen state change
  document.addEventListener("fullscreenchange", function () {
    const clockElem = document.getElementById("clock");
    if (document.fullscreenElement === clockElem) {
      clockElem.classList.add("fullscreen");
    } else {
      clockElem.classList.remove("fullscreen");
    }
  });

  // ===================================================================
  // 3. STOPWATCH LOGIC
  // ===================================================================

  (function () {
    let startTime = 0;
    let elapsedTime = 0;
    let timerInterval;
    let running = false;

    const hoursDisplay = document.getElementById("hours_stopwatch");
    const minutesDisplay = document.getElementById("minutes_stopwatch");
    const secondsDisplay = document.getElementById("seconds_stopwatch");
    const msDisplay = document.getElementById("milliseconds_stopwatch");

    function updateDisplayFromTime(time) {
      let ms = Math.floor(time % 1000)
        .toString()
        .padStart(3, "0");
      let sec = Math.floor((time / 1000) % 60)
        .toString()
        .padStart(2, "0");
      let min = Math.floor((time / (1000 * 60)) % 60)
        .toString()
        .padStart(2, "0");
      let hrs = Math.floor((time / (1000 * 60 * 60)) % 24)
        .toString()
        .padStart(2, "0");

      if (hoursDisplay) hoursDisplay.innerText = hrs;
      if (minutesDisplay) minutesDisplay.innerText = min;
      if (secondsDisplay) secondsDisplay.innerText = sec;
      if (msDisplay) msDisplay.innerText = ms;
    }

    function updateStopwatchDisplay() {
      if (!running) return;
      const currentTotalTime = elapsedTime + (Date.now() - startTime);
      updateDisplayFromTime(currentTotalTime);
      requestAnimationFrame(updateStopwatchDisplay);
    }

    function initializeStopwatchState() {
      const savedTime = localStorage.getItem("stopwatchElapsedTime");
      elapsedTime = savedTime ? parseInt(savedTime, 10) : 0;
      updateDisplayFromTime(elapsedTime);
    }

    document
      .getElementById("start_stopwatch")
      .addEventListener("click", function () {
        if (!running) {
          running = true;
          startTime = Date.now();
          requestAnimationFrame(updateStopwatchDisplay);
        }
      });

    document
      .getElementById("stop_stopwatch")
      .addEventListener("click", function () {
        if (running) {
          running = false;
          elapsedTime += Date.now() - startTime;
          localStorage.setItem("stopwatchElapsedTime", elapsedTime.toString());
          if (timerInterval) cancelAnimationFrame(timerInterval);
        }
      });

    document
      .getElementById("reset_stopwatch")
      .addEventListener("click", function () {
        running = false;
        elapsedTime = 0;
        localStorage.removeItem("stopwatchElapsedTime");
        updateDisplayFromTime(0);
        if (timerInterval) cancelAnimationFrame(timerInterval);
      });

    initializeStopwatchState();
  })(); // End Stopwatch IIFE

  // ===================================================================
  // 4. STOPWATCH FULLSCREEN LOGIC (FIXED & RESTORED)
  // ===================================================================

  (function () {
    const stopwatchContainer = document.getElementById("stopwatch_container");
    const stopwatchSection = document.getElementById("stopwatch_section");
    if (!stopwatchContainer || !stopwatchSection) return;

    function toggleStopwatchFullScreen() {
      if (!document.fullscreenElement) {
        if (stopwatchSection.requestFullscreen) {
          stopwatchSection.requestFullscreen();
        } else if (stopwatchSection.mozRequestFullScreen) {
          stopwatchSection.mozRequestFullScreen();
        } else if (stopwatchSection.webkitRequestFullscreen) {
          stopwatchSection.webkitRequestFullscreen();
        } else if (stopwatchSection.msRequestFullscreen) {
          stopwatchSection.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }

    // RESTORED: This function now exists and is used.
    function exitStopwatchFullScreen() {
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

    // RESTORED: Your original logic to create and show the close button.
    function showCloseButton() {
      const closeButton = document.createElement("button");
      closeButton.innerHTML = "✖";
      closeButton.id = "closeFullscreenBtn";
      closeButton.onclick = exitStopwatchFullScreen; // It now calls the exit function
      stopwatchSection.appendChild(closeButton);
    }

    // RESTORED: Your original logic to remove the close button.
    function removeCloseButton() {
      const closeButton = document.getElementById("closeFullscreenBtn");
      if (closeButton) {
        closeButton.remove();
      }
    }

    function handleFullscreenChange() {
      if (document.fullscreenElement === stopwatchSection) {
        // When we enter fullscreen for the stopwatch
        stopwatchSection.classList.add("fullscreen-mode", "_watch");
        showCloseButton(); // Show the button
      } else {
        // When we exit fullscreen for any reason (button or ESC key)
        stopwatchSection.classList.remove("fullscreen-mode", "_watch");
        removeCloseButton(); // Remove the button
      }
    }

    stopwatchContainer.addEventListener("click", toggleStopwatchFullScreen);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
  })(); // End Stopwatch Fullscreen IIFE
}); // This is the closing bracket for the DOMContentLoaded listener
