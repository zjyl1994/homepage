const ORBIT_TILT = -0.46;
const ORBIT_SQUASH = 0.68;
const TILT_X = Math.cos(ORBIT_TILT);
const TILT_Y = Math.sin(ORBIT_TILT);

function createTrajectories(width, height, x, y, orbit, compact) {
    let seed = 19094;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    const columns = compact ? 6 : 12;
    const rows = compact ? 7 : 8;
    const particles = [];

    // One mote per cell keeps the opening sweep spread across the viewport.
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
            const entryX = (column + 0.18 + random() * 0.64) / columns;
            const entryY = (row + 0.18 + random() * 0.64) / rows;
            const dx = entryX * width - x;
            const dy = entryY * height - y;
            const u = dx * TILT_X + dy * TILT_Y;
            const v = (dy * TILT_X - dx * TILT_Y) / ORBIT_SQUASH;
            const bright = random() < 0.23;
            particles.push({
                entryX,
                entryY,
                angle: Math.atan2(v, u),
                distance: Math.hypot(u, v),
                orbit: orbit * (0.82 + random() * 0.48),
                turn: 0.75 + random() * 0.62,
                delay: random() * 0.22,
                size: bright ? 1.35 + random() * 0.74 : 0.68 + random() * 0.5,
                light: bright ? 0.82 : 0.35 + random() * 0.22,
                color: bright && random() > 0.6 ? 2 : column % 3 === 0 ? 1 : 0,
            });
        }
    }
    return particles;
}

function project(particle, time, x, y, out) {
    const drift = time * time * (3 - 2 * time);
    const distance = particle.distance + (particle.orbit - particle.distance) * drift;
    const angle = particle.angle + drift * particle.turn;
    const u = distance * Math.cos(angle);
    const v = distance * Math.sin(angle) * ORBIT_SQUASH;
    out.x = x + u * TILT_X - v * TILT_Y;
    out.y = y + u * TILT_Y + v * TILT_X;
}

export function setupStardust(motionPreference) {
    const canvas = document.querySelector('.stardust');
    const control = document.querySelector('.stardust-control');
    const portrait = document.querySelector('[data-portrait]');
    const trigger = portrait?.querySelector('[data-portrait-trigger]');
    if (!canvas || !control || !portrait || !trigger) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const forcedColors = window.matchMedia('(forced-colors: active)');
    const allowed = () => !motionPreference.matches && !forcedColors.matches;
    const style = getComputedStyle(canvas);
    const palette = ['--violet', '--ice', '--paper'].map(token => style.getPropertyValue(token).trim());
    const head = { x: 0, y: 0 };
    const trail = { x: 0, y: 0 };
    let frame = 0;
    let lastPaint;
    let elapsed = 0;
    let paused = false;
    let view;
    let needsResize = true;
    let sweep = allowed() ? { start: 0, duration: 2900, outward: false } : null;

    function fitViewport() {
        const { width, height } = canvas.getBoundingClientRect();
        if (!width || !height) return null;

        const box = portrait.getBoundingClientRect();
        const originX = box.left + box.width / 2;
        const originY = box.top + box.height / 2;
        const compact = width < 720;
        const density = Math.min(window.devicePixelRatio || 1, compact ? 1.25 : 1.5,
            Math.sqrt(2_500_000 / (width * height)));
        canvas.width = Math.round(width * density);
        canvas.height = Math.round(height * density);
        context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
        context.lineCap = 'round';
        return {
            width, height, originX, originY, trailLimit: compact ? 27 : 45,
            particles: createTrajectories(width, height, originX, originY, box.width * 0.53, compact),
        };
    }

    function drawDrift(opacity) {
        const { width, height, particles } = view;
        for (const particle of particles) {
            const travel = elapsed * (0.000005 + 0.000009 * particle.turn);
            const x = (particle.entryX + travel) % 1;
            const y = ((particle.entryY - travel * 0.71) % 1 + 1) % 1;
            const edge = Math.min(1, x * 20, (1 - x) * 20, y * 20, (1 - y) * 20);
            context.fillStyle = palette[particle.color];
            context.globalAlpha = particle.light * opacity * edge * 0.86;
            context.beginPath();
            context.arc(x * width, y * height, particle.size * 0.86, 0, 2 * Math.PI);
            context.fill();
        }
    }

    function drawSweep(time) {
        const { originX, originY, trailLimit, particles } = view;
        for (const particle of particles) {
            const progress = (time - particle.delay) / (1 - particle.delay);
            if (progress <= 0) continue;
            const opacity = particle.light * Math.min(progress * 8, (1 - progress) * 3.4, 1);
            const previous = Math.max(0, progress - 0.085);
            project(particle, sweep.outward ? 1 - progress : progress, originX, originY, head);
            project(particle, sweep.outward ? 1 - previous : previous, originX, originY, trail);

            const dx = trail.x - head.x;
            const dy = trail.y - head.y;
            const limit = Math.min(1, trailLimit / (Math.hypot(dx, dy) || 1));
            context.strokeStyle = context.fillStyle = palette[particle.color];
            context.globalAlpha = opacity * 0.42;
            context.lineWidth = particle.size * 0.72;
            context.beginPath();
            context.moveTo(head.x + dx * limit, head.y + dy * limit);
            context.lineTo(head.x, head.y);
            context.stroke();
            context.globalAlpha = opacity;
            context.beginPath();
            context.arc(head.x, head.y, particle.size, 0, 2 * Math.PI);
            context.fill();
        }
    }

    function schedule() {
        if (!frame && allowed() && !document.hidden && (!paused || needsResize)) {
            frame = requestAnimationFrame(paint);
        }
    }

    function paint(now) {
        frame = 0;
        if (!allowed() || document.hidden) {
            sync();
            return;
        }
        const delta = lastPaint === undefined ? 0 : now - lastPaint;
        if (needsResize || lastPaint === undefined || delta >= 30) {
            if (!paused) elapsed += Math.min(delta, 80);
            lastPaint = now;
            if (needsResize) {
                needsResize = false;
                view = fitViewport();
            }
            if (!view) return;

            const time = sweep ? (elapsed - sweep.start) / sweep.duration : 1;
            if (time >= 1) sweep = null;
            context.clearRect(0, 0, view.width, view.height);
            // Keep the sky quiet under the first sweep, then bring the drifting stars forward.
            drawDrift(sweep && !sweep.outward ? 0.24 + 0.76 * Math.max(0, (time - 0.55) / 0.45) : 1);
            if (sweep) drawSweep(time);
        }
        schedule();
    }

    function stop() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        lastPaint = undefined;
    }

    function sync() {
        control.hidden = !allowed();
        if (control.hidden) {
            stop();
            canvas.hidden = true;
            canvas.width = canvas.height = 1;
            sweep = null;
            view = null;
            return;
        }
        if (document.hidden) {
            stop();
            return;
        }
        if (canvas.hidden) {
            canvas.hidden = false;
            needsResize = true;
        }
        if (paused) stop();
        schedule();
    }

    control.addEventListener('click', () => {
        paused = !paused;
        control.toggleAttribute('data-paused', paused);
        const label = paused ? 'Resume stardust' : 'Pause stardust';
        control.setAttribute('aria-label', label);
        control.title = label;
        sync();
    });
    motionPreference.addEventListener('change', sync);
    forcedColors.addEventListener('change', sync);
    window.addEventListener('resize', () => {
        needsResize = true;
        schedule();
    }, { passive: true });
    document.addEventListener('visibilitychange', sync);
    trigger.addEventListener('click', () => {
        if (!paused && allowed() && !sweep) {
            sweep = { start: elapsed, duration: 1850, outward: true };
            needsResize = true;
            schedule();
        }
    });
    sync();
}
