let z1 = document.getElementById("z1");
let z2 = document.getElementById("z2");
let z3 = document.getElementById("z3");
let z4 = document.getElementById("z4");
let z5 = document.getElementById("z5");
let totalCount = document.querySelector("#totalCount");
let msg = document.getElementById("errorMsg");
let zikrCounts = JSON.parse(localStorage.getItem("zikrCounts")) || {
  subhanallah: 0,
  alhamdulillah: 0,
  la_ilaha_illallah: 0,
  astaghfirullah: 0,
  allahu: 0,
  total: 0,
};

function updateDisplay() {
  for (let key in zikrCounts) {
    if (key !== "total") {
      document.getElementById(key).textContent = zikrCounts[key];
    }
  }
  totalCount.textContent = zikrCounts.total;
}
function keyText(key) {
  let zikrNames = {
    subhanallah: "সুবাহান আল্লাহ",
    alhamdulillah: "আলহামদুলিল্লাহ",
    la_ilaha_illallah: "লা-ইলাহা ইল্লাল্লাহ",
    astaghfirullah: "আস্তাগফিরুল্লাহ",
    allahu: "আল্লাহু",
  };
  return zikrNames[key] || "error";
}
function counter() {
  let selectedZikr = document.querySelector("input[name='zikr']:checked");

  if (selectedZikr) {
    let key = selectedZikr.value;
    zikrCounts[key]++;
    zikrCounts.total++;
    localStorage.setItem("zikrCounts", JSON.stringify(zikrCounts));
    msg.innerHTML = `<span style="color: green;">আপনি এই মুহুর্তে "<big>${keyText(
      key
    )}</big>" জিকিরটিতে মশগুল আছেন।</big>`;
    if (zikrCounts[key] % 33 === 0) {
      playBeepSound();
    }

    updateDisplay();
  } else {
    msg.innerHTML = `<span style="color: red;">অনুগ্রহ করে প্রথমে একটি জিকির সিলেক্ট করুন</span>`;
  }
}

document.addEventListener("keydown", function (event) {
  if (event.code === "Space") {
    counter();
    createPressRipple();
  }
});
totalCount.addEventListener("click", function (e) {
  counter();
  let rect = this.getBoundingClientRect();
  createRipple(e.clientX - rect.left - 10, e.clientY - rect.top - 10);
});
console.log(typeof counter, typeof createRipple);
updateDisplay();

// 🔊 Beep Sound Function
function playBeepSound() {
  let ringTone = "media/audio/beep-07a.wav";
  let audio = new Audio(ringTone);

  audio.play().catch((error) => {
    console.log("Audio playback failed:", error);
  });
}

// change style of radio button
function defaultColor() {
  z1.style.color = "#000";
  z1.style.background = "#fff";
  z2.style.color = "#000";
  z2.style.background = "#fff";
  z3.style.color = "#000";
  z3.style.background = "#fff";
  z4.style.color = "#000";
  z4.style.background = "#fff";
  z5.style.color = "#000";
  z5.style.background = "#fff";
}
document.addEventListener("click", function () {
  defaultColor();
  const selectedRadio = document.querySelector("input[name='zikr']:checked");
  const nextElement = selectedRadio?.nextElementSibling;
  if (selectedRadio) {
    nextElement.style.background = "#222";
    nextElement.style.color = "#fff";
  }
});

function createRipple(x, y) {
  let ripple = document.createElement("span");
  ripple.classList.add("ripple");
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  totalCount.appendChild(ripple);
  setTimeout(() => {
    ripple.remove();
  }, 600);
}
// ✅ রিপল তৈরি করা ফাংশন (বৃত্তের চারপাশে)
function createPressRipple() {
  let ripple = document.createElement("span");
  ripple.classList.add("ripple2");

  let rect = totalCount.getBoundingClientRect();

  // 🔹 বৃত্তের চারপাশে এলোমেলো অবস্থান তৈরি
  let angle = Math.random() * 2 * Math.PI; // এলোমেলো কোণ (0 থেকে 360 ডিগ্রি)
  let radius = rect.width / 2 + 20; // বৃত্তের ব্যাসার্ধের একটু বাইরে

  let x = Math.cos(angle) * radius + rect.width / 2;
  let y = Math.sin(angle) * radius + rect.height / 2;

  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  totalCount.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 600);
}
