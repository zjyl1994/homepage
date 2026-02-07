document.addEventListener('DOMContentLoaded', () => {
    const titleElement = document.getElementById('title');
    const textToType = "zjyl1994";
    const typingSpeed = 150; // 毫秒/字符
    const startDelay = 800; // 等待淡入动画稍作进行后再开始

    titleElement.classList.add('typing-cursor');

    let charIndex = 0;

    function typeWriter() {
        if (charIndex < textToType.length) {
            titleElement.textContent += textToType.charAt(charIndex);
            charIndex++;
            setTimeout(typeWriter, typingSpeed);
        } else {
            // 打字结束，启用 Glitch 效果
            titleElement.classList.add('glitch-effect');
        }
    }

    setTimeout(typeWriter, startDelay);

    // 粒子背景特效
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let particlesArray;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.directionX = (Math.random() * 0.4) - 0.2;
            this.directionY = (Math.random() * 0.4) - 0.2;
            this.size = Math.random() * 2 + 1;
        }

        update() {
            if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
            if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;
            this.x += this.directionX;
            this.y += this.directionY;
        }

        draw(color) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }
    }

    function init() {
        particlesArray = [];
        const numberOfParticles = (canvas.width * canvas.height) / 15000;
        for (let i = 0; i < numberOfParticles; i++) {
            particlesArray.push(new Particle());
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const particleColor = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
        const lineColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
            particlesArray[i].draw(particleColor);

            for (let j = i; j < particlesArray.length; j++) {
                const dx = particlesArray[i].x - particlesArray[j].x;
                const dy = particlesArray[i].y - particlesArray[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 100) {
                    ctx.beginPath();
                    ctx.strokeStyle = lineColor;
                    ctx.lineWidth = 1;
                    ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                    ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    init();
    animate();

    window.addEventListener('resize', () => {
        resizeCanvas();
        init();
    });
});