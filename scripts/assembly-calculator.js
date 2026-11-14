(() => {
  "use strict";

  const arithmetic = {
    add: {
      instruction: "add eax, edi", destination: "val_sum",
      calculate: (left, right) => left + right,
      explanation: "Add EDI to EAX."
    },
    subtract: {
      instruction: "sub eax, edi", destination: "val_sub",
      calculate: (left, right) => left - right,
      explanation: "Subtract EDI from EAX."
    },
    multiply: {
      instruction: "imul eax, edi", destination: "val_mul",
      calculate: (left, right) => left * right,
      explanation: "Multiply EAX by EDI as signed integers."
    }
  };

  function parseOperand(text) {
    const trimmed = text.trim();
    if (!/^[+-]?\d+$/.test(trimmed)) return null;
    const value = Number(trimmed);
    return Math.abs(value) <= 9999 ? value || 0 : null;
  }

  // Each frame captures the tracked registers after the instruction.
  // ESI and EDI already hold the operands and stay fixed across the trace.
  function buildTrace(operation, left, right) {
    const frames = [{
      instruction: "mov eax, esi", explanation: "Copy the first number from ESI into EAX.",
      eax: left, edx: null
    }];
    const arithmeticStep = arithmetic[operation];
    if (arithmeticStep) {
      const result = arithmeticStep.calculate(left, right) || 0;
      frames.push({
        instruction: arithmeticStep.instruction, explanation: arithmeticStep.explanation,
        eax: result, edx: null
      }, {
        instruction: `mov [${arithmeticStep.destination}], eax`,
        explanation: "Save the result from EAX. The registers keep their values.",
        eax: result, edx: null
      });
      return { result, frames };
    }

    // CDQ fills EDX with the sign bits of EAX before signed division.
    const highBits = left < 0 ? -1 : 0;
    frames.push({
      instruction: "cdq", explanation: "Sign extend EAX into EDX:EAX to prepare the dividend.",
      eax: left, edx: highBits
    });
    if (right === 0) {
      frames.push({
        instruction: "idiv edi", explanation: "Divide by zero. IDIV faults before writing a quotient or remainder.",
        eax: left, edx: highBits
      });
      return { result: null, frames };
    }
    const quotient = Math.trunc(left / right) || 0;
    const remainder = (left % right) || 0;
    frames.push({
      instruction: "idiv edi", explanation: "Write the quotient to EAX and the remainder to EDX.",
      eax: quotient, edx: remainder
    }, {
      instruction: "mov [val_div], eax", explanation: "Save the quotient from EAX. The remainder stays in EDX.",
      eax: quotient, edx: remainder
    });
    return { result: quotient, frames };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { parseOperand, buildTrace };
  }
  if (typeof document === "undefined") return;

  const calculator = document.getElementById("assembly-calculator");
  if (!calculator) return;
  const inputs = [
    calculator.querySelector("#assembly-left"),
    calculator.querySelector("#assembly-right")
  ];
  const operationButtons = [...calculator.querySelectorAll("[data-assembly-operation]")];
  const instructionList = calculator.querySelector("#assembly-instructions");
  const registers = Object.fromEntries(
    [...calculator.querySelectorAll("[data-register]")].map(register => [register.dataset.register, register])
  );
  const status = calculator.querySelector("#assembly-step-status");
  const runStatus = calculator.querySelector("#assembly-run-status");
  const error = calculator.querySelector("#assembly-error");
  const previous = calculator.querySelector("#assembly-previous");
  const next = calculator.querySelector("#assembly-next");
  let traces;
  let lastOperands;
  let operation = "add";
  let step = 0;

  function renderStep() {
    const frames = traces[operation].frames;
    const frame = frames[step];
    [...instructionList.children].forEach((instruction, index) => {
      if (index === step) instruction.setAttribute("aria-current", "step");
      else instruction.removeAttribute("aria-current");
    });
    registers.eax.textContent = frame.eax;
    registers.edx.textContent = frame.edx ?? "Untracked";
    status.textContent = `Step ${step + 1} of ${frames.length}. ${frame.explanation}`;
    previous.disabled = step === 0;
    next.disabled = step === frames.length - 1;
  }

  function showTrace() {
    const instructions = traces[operation].frames.map(frame => {
      const item = document.createElement("li");
      const code = document.createElement("code");
      code.textContent = frame.instruction;
      item.append(code);
      return item;
    });
    instructionList.replaceChildren(...instructions);
    operationButtons.forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.assemblyOperation === operation));
    });
    step = 0;
    renderStep();
  }

  function calculate() {
    const operands = inputs.map(input => parseOperand(input.value));
    inputs.forEach((input, index) => {
      if (operands[index] === null) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    });
    const invalidIndex = operands.indexOf(null);
    if (invalidIndex !== -1) {
      error.textContent = "Enter whole numbers from −9,999 to 9,999. Showing the last calculation.";
      inputs[invalidIndex].focus();
      return;
    }

    error.textContent = "";
    lastOperands = operands;
    runStatus.textContent = "";
    traces = {};
    operationButtons.forEach(button => {
      const key = button.dataset.assemblyOperation;
      const trace = buildTrace(key, ...operands);
      traces[key] = trace;
      button.querySelector("[data-assembly-result]").textContent = trace.result ?? "Divide by zero";
    });
    registers.esi.textContent = operands[0];
    registers.edi.textContent = operands[1];
    showTrace();
  }

  // Keep the existing trace available for inspection after an input changes,
  // with its operands visible so it cannot be mistaken for a new calculation.
  inputs.forEach(input => {
    input.addEventListener("input", () => {
      input.removeAttribute("aria-invalid");
      error.textContent = "";
      if (!lastOperands) return;
      const changed = inputs.some((field, index) => parseOperand(field.value) !== lastOperands[index]);
      const message = changed
        ? `Inputs changed. Results and trace still use ${lastOperands[0]} and ${lastOperands[1]}. Run calculation to update.`
        : "";
      if (runStatus.textContent !== message) runStatus.textContent = message;
    });
  });

  calculator.querySelector("form").addEventListener("submit", event => {
    event.preventDefault();
    calculate();
  });
  operationButtons.forEach(button => {
    button.addEventListener("click", () => {
      operation = button.dataset.assemblyOperation;
      showTrace();
    });
  });
  previous.addEventListener("click", () => {
    step--;
    renderStep();
  });
  next.addEventListener("click", () => {
    step++;
    renderStep();
  });

  calculate();
  calculator.hidden = false;
})();
