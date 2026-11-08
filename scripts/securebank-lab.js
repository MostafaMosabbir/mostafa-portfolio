(() => {
  "use strict";

  const lab = document.getElementById("securebank-lab");
  if (!lab) return;

  // This diagram illustrates the planned policy. Findings record the Packet Tracer run separately.
  const paths = {
    guestWeb: {
      from: "guest", to: "dmz", verdict: "allow",
      detail: "R1 permits Guest HTTP to the DMZ web server."
    },
    guestStaff: {
      from: "guest", to: "staff", verdict: "block",
      detail: "R1 drops the ping at the Guest traffic rule."
    },
    dmzStaff: {
      from: "dmz", to: "staff", verdict: "block",
      detail: "R1 drops a DMZ-initiated ping to Staff."
    },
    adminSsh: {
      from: "admin", to: "router", verdict: "allow",
      detail: "R1 accepts SSH from the Admin workstation."
    },
    staffSsh: {
      from: "staff", to: "router", verdict: "block",
      detail: "R1 rejects SSH from Staff at the management access rule."
    }
  };
  const network = lab.querySelector("[data-network]");
  const verdictLabel = lab.querySelector("[data-verdict-label]");
  const routeDetail = lab.querySelector("[data-route-detail]");
  const buttons = lab.querySelectorAll("[data-path]");
  const devices = lab.querySelectorAll("[data-node]");

  function showPath(key) {
    const { from, to, verdict, detail } = paths[key];
    const destinationState = verdict === "allow" ? "arrival" : "blocked";

    buttons.forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.path === key));
    });
    devices.forEach(device => {
      const node = device.dataset.node;
      let state = "";
      if (node === from) state = "source";
      if (node === to) state = destinationState;
      device.dataset.state = state;

      // Each switch branch follows the state of its endpoint.
      const branch = device.closest("li");
      if (branch) branch.dataset.state = state;
    });
    network.dataset.verdict = verdict;
    verdictLabel.textContent = verdict === "allow" ? "Expected allow" : "Expected block";
    routeDetail.textContent = detail;
  }

  buttons.forEach(button => {
    button.addEventListener("click", () => showPath(button.dataset.path));
  });
  showPath("guestWeb");
  lab.hidden = false;
})();
