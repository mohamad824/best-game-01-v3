// Input controller for Star Shepherd — pointer placement and dragging
// on the canvas, plus the full keyboard map. Converts client pixels
// into world coordinates and reports intent; placement rules live in
// well-placement.js and game flow lives in the main loop.

export function attachPointerControls(canvas, handlers) {
  function toWorldCoordinates(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  canvas.addEventListener("pointerdown", (event) => {
    const point = toWorldCoordinates(event);
    handlers.onPress(point.x, point.y, event.button);
  });
  canvas.addEventListener("pointermove", (event) => {
    const point = toWorldCoordinates(event);
    handlers.onMove(point.x, point.y);
  });
  window.addEventListener("pointerup", (event) => {
    const point = toWorldCoordinates(event);
    handlers.onRelease(point.x, point.y);
  });
  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    const point = toWorldCoordinates(event);
    handlers.onRightClick(point.x, point.y);
  });
  canvas.addEventListener("pointerleave", () => handlers.onLeave());
}

export function attachKeyboardControls(handlers) {
  window.addEventListener("keydown", (event) => {
    if (event.repeat && event.code !== "ArrowLeft" && event.code !== "ArrowRight"
      && event.code !== "ArrowUp" && event.code !== "ArrowDown") {
      return;
    }
    switch (event.code) {
      case "Space":
      case "Enter":
        event.preventDefault();
        handlers.onLaunch();
        break;
      case "KeyR":
        handlers.onRestartLevel();
        break;
      case "KeyP":
      case "Escape":
        handlers.onTogglePause();
        break;
      case "KeyM":
        handlers.onToggleMute();
        break;
      case "Delete":
      case "Backspace":
      case "KeyX":
        handlers.onRemoveWell();
        break;
      case "ArrowLeft":
        event.preventDefault();
        handlers.onNudge(-1, 0, event.shiftKey);
        break;
      case "ArrowRight":
        event.preventDefault();
        handlers.onNudge(1, 0, event.shiftKey);
        break;
      case "ArrowUp":
        event.preventDefault();
        handlers.onNudge(0, -1, event.shiftKey);
        break;
      case "ArrowDown":
        event.preventDefault();
        handlers.onNudge(0, 1, event.shiftKey);
        break;
      default: {
        const digit = /^Digit(\d)$/.exec(event.code);
        if (digit) {
          const levelNumber = digit[1] === "0" ? 10 : Number(digit[1]);
          handlers.onJumpToLevel(levelNumber - 1);
        }
        break;
      }
    }
  });
}
