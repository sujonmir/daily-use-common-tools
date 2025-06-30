const caOvPayingIn = document.getElementById("ca-ov-paying-in");
const caOvPayingOut = document.getElementById("ca-ov-paying-out");
const caOvPayingSubmit = document.getElementById("ca-ov-paying-submit");
const caOvIn = document.getElementById("ca-ov-in");
const caOvOut = document.getElementById("ca-ov-out");
const caOvSubmit = document.getElementById("ca-ov-submit");
const caPIn = document.getElementById("ca-p-in");
const caPOut = document.getElementById("ca-p-out");
const caPSubmit = document.getElementById("ca-p-submit");
const caPcaIn = document.getElementById("ca-pca-in");
const caPcaOut = document.getElementById("ca-pca-out");
const caPcaSubmit = document.getElementById("ca-pca-submit");
const caAoIn = document.getElementById("ca-ao-in");
const caAoOut = document.getElementById("ca-ao-out");
const caAoSubmit = document.getElementById("ca-ao-submit");
const dfOvIn = document.getElementById("df-ov-in");
const dfOvOut = document.getElementById("df-ov-out");
const dfOvSubmit = document.getElementById("df-ov-submit");
const dfPIn = document.getElementById("df-p-in");
const dfPOut = document.getElementById("df-p-out");
const dfPSubmit = document.getElementById("df-p-submit");

caOvPayingSubmit.addEventListener("click", function (e) {
  e.preventDefault();
  if (caOvPayingIn.value === "") {
    caOvPayingIn.focus();
    return;
  }
  let payingGoal = Number.parseInt(caOvPayingIn.value);
  let output = Math.ceil((((100 * payingGoal) / 40) * 100) / 80);
  caOvPayingOut.innerText = `$${output}`;
});
caOvSubmit.addEventListener("click", function (e) {
  e.preventDefault();
  if (caOvIn.value === "") {
    caOvIn.focus();
    return;
  }
  let profitGoal = Number.parseInt(caOvIn.value);
  let output = Math.ceil((((100 * profitGoal) / 60) * 100) / 80);
  caOvOut.innerText = `$${output}`;
});
caPSubmit.addEventListener("click", function (e) {
  e.preventDefault();
  if (caPIn.value === "") {
    caPIn.focus();
    return;
  }
  let orderVol = Number.parseInt(caPIn.value);
  let output = Math.floor(orderVol * 0.8 * 0.6);
  caPOut.innerText = `$${output}`;
});
caPcaSubmit.addEventListener("click", function (e) {
  e.preventDefault();
  if (caPcaIn.value === "") {
    caPcaIn.focus();
    return;
  }
  let orderVol = Number.parseInt(caPcaIn.value);
  let output = Math.floor(orderVol * 0.4);
  caPcaOut.innerText = `$${output}`;
});
caAoSubmit.addEventListener("click", function (e) {
  e.preventDefault();
  if (caAoIn.value === "") {
    caAoIn.focus();
    return;
  }
  let orderVol = Number.parseInt(caAoIn.value);
  let output = Math.floor(orderVol * 0.8 * 0.4);
  caAoOut.innerText = `$${output}`;
});
dfOvSubmit.addEventListener("click", function (e) {
  e.preventDefault();
  if (dfOvIn.value === "") {
    dfOvIn.focus();
    return;
  }
  let profitGoal = Number.parseInt(dfOvIn.value);
  let output = Math.ceil((100 * profitGoal) / 80);
  dfOvOut.innerText = `$${output}`;
});
dfPSubmit.addEventListener("click", function (e) {
  e.preventDefault();
  if (dfPIn.value === "") {
    dfPIn.focus();
    return;
  }
  let orderVol = Number.parseInt(dfPIn.value);
  let output = Math.floor(orderVol * 0.8);
  dfPOut.innerText = `$${output}`;
});
