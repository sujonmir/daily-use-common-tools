// Function to update the counter
function updateAgeCounter() {
  // 1. SET THE STARTING DATE
  // Format: YYYY-MM-DDTHH:MM:SS
  const startDate = new Date("2025-03-29T00:00:00");

  // 2. GET THE CURRENT DATE AND TIME
  const now = new Date();

  // 3. CALCULATE THE DIFFERENCE IN MILLISECONDS
  const differenceInMs = now - startDate;

  // Get the target HTML elements
  const weekElement = document.getElementById("p-week");
  const dayElement = document.getElementById("p-day");

  // Handle case where the start date is in the future
  if (differenceInMs < 0) {
    weekElement.textContent = "0";
    dayElement.textContent = "0";
    return; // Stop the function here
  }

  // 4. CONVERT MILLISECONDS TO DAYS
  // (1000ms * 60s * 60min * 24hr)
  const totalDays = Math.floor(differenceInMs / (1000 * 60 * 60 * 24));

  // 5. CALCULATE WEEKS AND REMAINING DAYS
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;

  // 6. UPDATE THE HTML CONTENT
  weekElement.textContent = `${weeks}`;
  dayElement.textContent = `${days}`;
}

// Run the function once when the page loads
updateAgeCounter();

// Optional: Set the function to run every hour to keep it updated without a page refresh
// 1000ms * 60s * 60min = 3,600,000 milliseconds (1 hour)
setInterval(updateAgeCounter, 3600000);
