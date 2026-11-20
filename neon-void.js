import { setupStardust } from './stardust.js';

const MAX_TILT_DEGREES = 5;
const MAX_ORBIT_PIXELS = 9;
const MAX_MAGNET_PIXELS = 4;
const EGG_ACTIVATIONS = 4;
const EGG_CADENCE_MS = 2500;
const EGG_GLOW_MS = 1000;
const EGG_MESSAGE_MS = 2800;
const RIPPLE_MS = 900;
const EGG_MESSAGE = 'Curiosity unlocked.';

const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const pointerPreference = window.matchMedia('(pointer: fine)');

const portraitStates = new Set();
const magnetStates = new Set();
const pendingPortraits = new Set();
const pendingMagnets = new Set();
const rippleStops = new Set();

let frameRequest = 0;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const allowsMotion = () => pointerPreference.matches && !motionPreference.matches;

const isTouch = event => event.pointerType === 'touch';

function fieldStrength(wrapper) {
    const value = Number.parseFloat(getComputedStyle(wrapper).getPropertyValue('--field-strength'));
    return Number.isFinite(value) ? Math.max(0, value) : 1;
}

function scheduleFrame() {
    if (!frameRequest) frameRequest = requestAnimationFrame(runFrame);
}

function cancelFrame() {
    if (!frameRequest) return;
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
}

function clearPointerEffects() {
    pendingPortraits.clear();
    pendingMagnets.clear();
    cancelFrame();
    for (const state of portraitStates) state.reset();
    for (const state of magnetStates) state.reset();
}

function runFrame() {
    frameRequest = 0;
    if (!allowsMotion()) {
        clearPointerEffects();
        return;
    }

    const portraitsToUpdate = [...pendingPortraits];
    pendingPortraits.clear();
    for (const state of portraitsToUpdate) state.apply();

    const magnetsToUpdate = [...pendingMagnets];
    pendingMagnets.clear();
    for (const state of magnetsToUpdate) state.apply();
}

function setPortraitTilt(wrapper, tiltX, tiltY, orbitX, orbitY) {
    wrapper.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
    wrapper.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
    wrapper.style.setProperty('--orbit-x', `${orbitX.toFixed(2)}px`);
    wrapper.style.setProperty('--orbit-y', `${orbitY.toFixed(2)}px`);
}

function resetPortraitTilt(wrapper) {
    setPortraitTilt(wrapper, 0, 0, 0, 0);
}

function setupPortrait(wrapper) {
    const trigger = wrapper.querySelector('[data-portrait-trigger]');
    const message = wrapper.querySelector('[data-portrait-message]');

    // The overlay is the real control, so it must be available to keyboard
    // users and screen readers regardless of the motion preference.
    if (trigger) trigger.hidden = false;

    let point = null;
    let rippleTimer = 0;
    let eggTimer = 0;
    let messageTimer = 0;
    let rippleToken = 0;
    let eggToken = 0;
    let activations = [];

    const state = {
        apply() {
            if (!point || !allowsMotion()) return;

            const rect = wrapper.getBoundingClientRect();
            if (!rect.width || !rect.height) return;

            const nx = clamp(((point.x - rect.left) / rect.width) * 2 - 1, -1, 1);
            const ny = clamp(((point.y - rect.top) / rect.height) * 2 - 1, -1, 1);
            const strength = fieldStrength(wrapper);
            const tiltX = clamp(-ny * MAX_TILT_DEGREES * strength, -MAX_TILT_DEGREES, MAX_TILT_DEGREES);
            const tiltY = clamp(nx * MAX_TILT_DEGREES * strength, -MAX_TILT_DEGREES, MAX_TILT_DEGREES);
            const orbitX = clamp(nx * MAX_ORBIT_PIXELS * strength, -MAX_ORBIT_PIXELS, MAX_ORBIT_PIXELS);
            const orbitY = clamp(ny * MAX_ORBIT_PIXELS * strength, -MAX_ORBIT_PIXELS, MAX_ORBIT_PIXELS);

            setPortraitTilt(wrapper, tiltX, tiltY, orbitX, orbitY);
        },

        reset() {
            point = null;
            resetPortraitTilt(wrapper);
        }
    };

    function trackPointer(event) {
        if (isTouch(event) || !allowsMotion()) return;
        point = { x: event.clientX, y: event.clientY };
        pendingPortraits.add(state);
        scheduleFrame();
    }

    function releasePointer() {
        pendingPortraits.delete(state);
        state.reset();
    }

    function startRipple() {
        if (motionPreference.matches) return;

        const token = ++rippleToken;
        wrapper.removeAttribute('data-ripple');
        void wrapper.offsetWidth;
        wrapper.setAttribute('data-ripple', '');
        window.clearTimeout(rippleTimer);
        rippleTimer = window.setTimeout(() => {
            if (token === rippleToken) wrapper.removeAttribute('data-ripple');
        }, RIPPLE_MS);
    }

    function stopRipple() {
        rippleToken += 1;
        window.clearTimeout(rippleTimer);
        rippleTimer = 0;
        wrapper.removeAttribute('data-ripple');
    }

    function revealEgg() {
        const token = ++eggToken;

        if (message) {
            window.clearTimeout(messageTimer);
            message.textContent = EGG_MESSAGE;
            messageTimer = window.setTimeout(() => {
                if (token === eggToken) message.textContent = '';
            }, EGG_MESSAGE_MS);
        }

        wrapper.removeAttribute('data-egg');
        void wrapper.offsetWidth;
        wrapper.setAttribute('data-egg', '');
        window.clearTimeout(eggTimer);
        eggTimer = window.setTimeout(() => {
            if (token === eggToken) wrapper.removeAttribute('data-egg');
        }, EGG_GLOW_MS);
    }

    function activate() {
        const now = performance.now();
        activations = activations.filter(time => now - time <= EGG_CADENCE_MS);
        activations.push(now);
        if (activations.length < EGG_ACTIVATIONS) return;

        activations = [];
        revealEgg();
    }

    function onTriggerPointerDown(event) {
        if (event.button !== 0) return;
        if (event.pointerType === 'touch' || event.pointerType === 'pen') startRipple();
    }

    wrapper.addEventListener('pointerenter', trackPointer, { passive: true });
    wrapper.addEventListener('pointermove', trackPointer, { passive: true });
    wrapper.addEventListener('pointerleave', releasePointer, { passive: true });
    wrapper.addEventListener('pointercancel', releasePointer, { passive: true });

    if (trigger) {
        trigger.addEventListener('pointerdown', onTriggerPointerDown, { passive: true });
        trigger.addEventListener('click', activate);
    }

    portraitStates.add(state);
    rippleStops.add(stopRipple);
}

function setupMagnet(link) {
    let point = null;

    const state = {
        apply() {
            if (!point || !allowsMotion()) return;

            const rect = link.getBoundingClientRect();
            if (!rect.width || !rect.height) return;

            const nx = clamp(((point.x - rect.left) / rect.width) * 2 - 1, -1, 1);
            const ny = clamp(((point.y - rect.top) / rect.height) * 2 - 1, -1, 1);
            const offsetX = clamp(nx * MAX_MAGNET_PIXELS, -MAX_MAGNET_PIXELS, MAX_MAGNET_PIXELS);
            const offsetY = clamp(ny * MAX_MAGNET_PIXELS, -MAX_MAGNET_PIXELS, MAX_MAGNET_PIXELS);

            link.style.setProperty('--magnet-x', `${offsetX.toFixed(2)}px`);
            link.style.setProperty('--magnet-y', `${offsetY.toFixed(2)}px`);
        },

        reset() {
            point = null;
            link.style.setProperty('--magnet-x', '0px');
            link.style.setProperty('--magnet-y', '0px');
        }
    };

    function trackPointer(event) {
        if (isTouch(event) || !allowsMotion()) return;
        point = { x: event.clientX, y: event.clientY };
        pendingMagnets.add(state);
        scheduleFrame();
    }

    function releasePointer() {
        pendingMagnets.delete(state);
        state.reset();
    }

    link.addEventListener('pointerenter', trackPointer, { passive: true });
    link.addEventListener('pointermove', trackPointer, { passive: true });
    link.addEventListener('pointerleave', releasePointer, { passive: true });
    link.addEventListener('pointercancel', releasePointer, { passive: true });

    magnetStates.add(state);
}

function onPreferenceChange() {
    if (!allowsMotion()) clearPointerEffects();

    if (motionPreference.matches) {
        for (const stop of rippleStops) stop();
    }
}

function init() {
    for (const wrapper of document.querySelectorAll('[data-portrait]')) setupPortrait(wrapper);
    for (const link of document.querySelectorAll('[data-magnet]')) setupMagnet(link);
    setupStardust(motionPreference);

    motionPreference.addEventListener('change', onPreferenceChange);
    pointerPreference.addEventListener('change', onPreferenceChange);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
