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
    elapsedTime = 0,
    timerInterval;
  let running = false;

  function updateTime() {
    if (!running) return;
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

    document.getElementById("hours_stopwatch").innerText = hrs;
    document.getElementById("minutes_stopwatch").innerText = min;
    document.getElementById("seconds_stopwatch").innerText = sec;
    document.getElementById("milliseconds_stopwatch").innerText = ms;

    timerInterval = requestAnimationFrame(updateTime);
  }

  document
    .getElementById("start_stopwatch")
    .addEventListener("click", function () {
      if (!running) {
        startTime = Date.now() - elapsedTime;
        running = true;
        updateTime();
      }
    });

  document
    .getElementById("stop_stopwatch")
    .addEventListener("click", function () {
      running = false;
      cancelAnimationFrame(timerInterval);
    });

  document
    .getElementById("reset_stopwatch")
    .addEventListener("click", function () {
      running = false;
      elapsedTime = 0;
      cancelAnimationFrame(timerInterval);
      document.getElementById("hours_stopwatch").innerText = "00";
      document.getElementById("minutes_stopwatch").innerText = "00";
      document.getElementById("seconds_stopwatch").innerText = "00";
      document.getElementById("milliseconds_stopwatch").innerText = "000";
    });
})();
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
