// Function to handle popup opening and closing
function handlePopup() {
  const fiveAyat = document.getElementById("fiveAyat");
  const popup = document.getElementById("popup");
  const closePopup = document.getElementById("closePopup");
  const popupContent = document.querySelector(".popup-content");
  const webPageFrame = document.querySelector("#webPageFrame");
  const zikir = document.querySelector("#zikir");
  const password = document.querySelector("#password");
  const yt = document.querySelector("#yt");

  // Function to toggle the popup
  function togglePopup() {
    if (popup.style.display === "flex") {
      popup.style.display = "none"; // Hide the popup
    } else {
      popup.style.display = "flex"; // Show the popup
    }
  }

  // Open the popup when "X" is clicked
  fiveAyat.addEventListener("click", function () {
    webPageFrame.src = "daily-quran-ayahs.html";
    togglePopup();
  });
  zikir.addEventListener("click", function () {
    webPageFrame.src = "zikir.html";
    togglePopup();
  });
  password.addEventListener("click", function () {
    webPageFrame.src = "password.html";
    togglePopup();
  });
  yt.addEventListener("click", function () {
    webPageFrame.src = "yt-video-keeper.html";
    togglePopup();
  });
  // zikir.addEventListener("click", togglePopup("zikir.html"));

  // Close the popup when the close button is clicked
  closePopup.addEventListener("click", togglePopup);

  // Close the popup when the ESC key or space bar is pressed
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      popup.style.display = "none";
    }
  });

  // Close the popup if the user clicks outside the popup content area
  popup.addEventListener("click", function (event) {
    if (!popupContent.contains(event.target)) {
      popup.style.display = "none"; // Hide the popup
    }
  });
}

// Call the function when the document is ready
document.addEventListener("DOMContentLoaded", handlePopup);
