document.addEventListener('DOMContentLoaded', () => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) return;

    const root = document.documentElement;

    // 卡片跟随鼠标的高光
    document.querySelectorAll('.card').forEach((card) => {
        card.addEventListener('mousemove', (event) => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
            card.style.setProperty('--my', `${event.clientY - rect.top}px`);
        });

        card.addEventListener('mouseleave', () => {
            card.style.removeProperty('--mx');
            card.style.removeProperty('--my');
        });
    });

    // 背景光球跟随鼠标轻微视差（CSS transition 负责平滑）
    window.addEventListener('mousemove', (event) => {
        const x = (event.clientX / window.innerWidth - 0.5) * -40;
        const y = (event.clientY / window.innerHeight - 0.5) * -40;
        root.style.setProperty('--pointer-x', `${x}px`);
        root.style.setProperty('--pointer-y', `${y}px`);
    }, { passive: true });
});
