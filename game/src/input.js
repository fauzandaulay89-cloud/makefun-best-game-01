// Keyboard + mouse state, kept in one place so the world never reads
// raw DOM events. Movement keys, firing, and the one-shot action keys
// (start, restart, pause, nova, mute) are all exposed here.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mousePressed = false;
    this.canvas = canvas;

    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
      if (!event.repeat) this.pressed.add(event.key.toLowerCase());
      this.keys.add(event.key.toLowerCase());
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    canvas.addEventListener('mousemove', (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
      this.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
    });
    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) {
        this.mouseDown = true;
        this.mousePressed = true;
      }
      if (event.button === 2) this.pressed.add('nova');
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouseDown = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });
  }

  // True while the key is held.
  down(...names) {
    return names.some((name) => this.keys.has(name));
  }

  // True only on the frame the key went down; consumed at end of frame.
  hit(...names) {
    return names.some((name) => this.pressed.has(name));
  }

  get firing() {
    return this.mouseDown || this.keys.has(' ') || this.keys.has('j');
  }

  get moveX() {
    let x = 0;
    if (this.down('a', 'arrowleft')) x -= 1;
    if (this.down('d', 'arrowright')) x += 1;
    return x;
  }

  get moveY() {
    let y = 0;
    if (this.down('w', 'arrowup')) y -= 1;
    if (this.down('s', 'arrowdown')) y += 1;
    return y;
  }

  endFrame() {
    this.pressed.clear();
    this.mousePressed = false;
  }
}
