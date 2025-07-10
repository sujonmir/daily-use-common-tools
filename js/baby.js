/**
 * Main script to initialize page functionalities after the DOM is fully loaded.
 * This includes setting up the age counter and the image popup modal.
 */
document.addEventListener("DOMContentLoaded", () => {
  // --- Configuration ---
  const AGE_COUNTER_CONFIG = {
    startDate: "2025-03-29T00:00:00",
    weekElementId: "p-week",
    dayElementId: "p-day",
    updateInterval: 3600000, // 1 hour in milliseconds
  };

  const POPUP_TRIGGER_SELECTOR = ".img-trigger";

  // --- Initialization ---
  createAgeCounter(AGE_COUNTER_CONFIG);
  setupImagePopup(POPUP_TRIGGER_SELECTOR);
});

/**
 * Creates and manages a dynamic counter that displays weeks and days since a start date.
 * @param {object} config - The configuration object for the counter.
 * @param {string} config.startDate - The starting date in "YYYY-MM-DDTHH:MM:SS" format.
 * @param {string} config.weekElementId - The ID of the HTML element to display weeks.
 * @param {string} config.dayElementId - The ID of the HTML element to display days.
 * @param {number} config.updateInterval - How often to update the counter, in milliseconds.
 */
function createAgeCounter(config) {
  // Get DOM elements once for better performance
  const weekElement = document.getElementById(config.weekElementId);
  const dayElement = document.getElementById(config.dayElementId);

  // Check if elements exist before proceeding
  if (!weekElement || !dayElement) {
    console.error("Counter elements not found. Please check your HTML IDs.");
    return;
  }

  const startDate = new Date(config.startDate);
  const MS_PER_DAY = 1000 * 60 * 60 * 24; // Milliseconds in a day

  function updateDisplay() {
    const now = new Date();
    const differenceInMs = now - startDate;

    if (differenceInMs < 0) {
      weekElement.textContent = "0";
      dayElement.textContent = "0";
      return;
    }

    const totalDays = Math.floor(differenceInMs / MS_PER_DAY);
    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;

    weekElement.textContent = weeks;
    dayElement.textContent = days;
    document.getElementById("ageInDays").innerText = `${totalDays} Days`; // Update age in days
  }

  // Run once immediately on page load
  updateDisplay();

  // Then, set it to update periodically
  setInterval(updateDisplay, config.updateInterval);
}

/**
 * Initializes a modal popup for any image matching the provided selector.
 * Can handle multiple trigger images on the same page.
 * @param {string} triggerSelector - The CSS selector for the clickable image(s).
 */
function setupImagePopup(triggerSelector) {
  // Get modal elements
  const modal = document.getElementById("imageModal");
  const modalImage = document.getElementById("modalImage");
  const closeButton = document.querySelector(".modal-close-btn");
  const triggerImages = document.querySelectorAll(triggerSelector);

  // Check if essential modal elements exist
  if (!modal || !modalImage || !closeButton) {
    console.error(
      "Modal HTML structure is missing. Please add the #imageModal div."
    );
    return;
  }

  // Function to handle Escape key press
  const handleEscKey = (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  };

  const openModal = (event) => {
    const clickedImage = event.currentTarget;
    modalImage.src = clickedImage.src; // Use the src from the image that was clicked
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
    // Add Esc key listener only when modal is open
    document.addEventListener("keydown", handleEscKey);
  };

  const closeModal = () => {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
    // Remove Esc key listener for performance and to prevent conflicts
    document.removeEventListener("keydown", handleEscKey);
  };

  // Attach click listener to each trigger image
  triggerImages.forEach((img) => img.addEventListener("click", openModal));

  // Attach listeners for closing the modal
  closeButton.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      // Close only if the dark overlay is clicked
      closeModal();
    }
  });
}
