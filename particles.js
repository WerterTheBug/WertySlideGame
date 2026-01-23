/* =====================
   PARTICLE SYSTEM
   Visual effects & trails
   ===================== */
class Particle {
    constructor(x, y, color, pType = "dust", size = 4, extra = null) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.type = pType;
        this.life = 1.0;
        this.extra = extra;
        this.angle = Math.random() * Math.PI * 2;
        this.angularVel = Math.random() * 0.2 - 0.1;
        this.gravity = 0;
        this.vx = Math.random() * 2 - 1;
        this.vy = Math.random() * 2 - 1;
        this.decay = 0.04;
        this.size = size;

        this._initializeByType();
    }

    _initializeByType() {
        const rand = (min, max) => Math.random() * (max - min) + min;
        const randInt = (min, max) => Math.floor(rand(min, max + 1));

        switch (this.type) {
            case "dust":
                this.size = randInt(4, 8);
                this.decay = 0.02;
                this.vx = rand(-0.5, 0.5);
                this.vy = rand(-0.5, 0.5);
                const shade = randInt(100, 180);
                this.color = [shade, shade, shade];
                break;
            case "ghost_trail":
                this.decay = 0.03;
                this.vx = 0;
                this.vy = -0.5;
                break;
            case "sparkle":
                this.size = randInt(4, 8);
                this.decay = 0.04;
                this.vx = 0;
                this.vy = rand(-0.5, -0.1);
                this.angularVel = rand(-0.2, 0.2);
                break;
            case "pixel":
                this.size = randInt(4, 8);
                this.decay = 0.03;
                this.vx = 0;
                this.vy = 0;
                const cVar = randInt(-50, 50);
                this.color = [
                    Math.max(0, Math.min(255, this.color[0] + cVar)),
                    Math.max(0, Math.min(255, this.color[1] + cVar)),
                    Math.max(0, Math.min(255, this.color[2] + cVar))
                ];
                break;
            case "bubbles":
                this.size = randInt(3, 8);
                this.decay = 0.015;
                this.vx = rand(-0.2, 0.2);
                this.vy = rand(-1.5, -0.5);
                break;
            case "hearts":
                this.size = randInt(5, 9);
                this.decay = 0.02;
                this.vx = rand(-0.3, 0.3);
                this.vy = rand(-1.0, -0.2);
                break;
            case "confetti":
                this.size = randInt(3, 6);
                this.decay = 0.01;
                this.color = [randInt(0, 200), randInt(0, 200), randInt(0, 200)];
                this.vx = rand(-2, 2);
                this.vy = rand(-4, -1);
                this.gravity = 0.2;
                this.angularVel = rand(-0.3, 0.3);
                break;
            case "fire":
                this.size = randInt(4, 9);
                this.decay = 0.04;
                this.vx = rand(-0.5, 0.5);
                this.vy = rand(-2, -0.5);
                break;
            case "lightning":
                this.size = randInt(2, 4);
                this.decay = 0.1;
                this.vx = rand(-1, 1);
                this.vy = rand(-1, 1);
                this.extra = Array(3).fill().map(() => [
                    this.x + randInt(-5, 5),
                    this.y + randInt(-5, 5)
                ]);
                break;
            case "spiral":
                this.size = 5;
                this.decay = 0.03;
                this.vx = 0;
                this.vy = 0;
                this.angularVel = 0.3;
                break;
            case "galaxy_trail":
                this.size = randInt(4, 7);
                this.decay = 0.025;
                this.vx = rand(-0.3, 0.3);
                this.vy = rand(-0.3, 0.3);
                this.angularVel = rand(-0.15, 0.15);
                const pals = [[0, 255, 255], [255, 0, 255], [138, 43, 226], [255, 255, 255]];
                this.color = pals[Math.floor(Math.random() * pals.length)];
                break;
            case "code":
                this.size = 10;
                this.decay = 0.02;
                this.vx = 0;
                this.vy = rand(1, 3);
                this.extra = Math.random() > 0.5 ? '0' : '1';
                break;
            case "void_smear":
                this.decay = 0.1;
                this.vx = 0;
                this.vy = 0;
                this.color = [0, 0, 0];
                break;
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life -= this.decay;
        this.angle += this.angularVel;

        if (this.type === "dust") {
            this.size += 0.1;
        } else if (this.type === "fire") {
            let [r, g, b] = this.color;
            if (g > 100) g -= 10;
            else if (g > 0) g -= 5;
            else {
                if (r > 100) r -= 10;
                if (b < 100) b += 5;
            }
            this.color = [Math.max(0, r), Math.max(0, g), Math.max(0, b)];
            this.size = Math.max(0, this.size - 0.2);
        } else if (this.type === "bubbles") {
            this.x += Math.sin(Date.now() * 0.01 + this.y) * 0.5;
        }
    }

    draw(ctx, offsetX, offsetY) {
        if (this.life <= 0) return;

        const dx = this.x + offsetX;
        const dy = this.y + offsetY;
        const alpha = this.life;

        ctx.save();

        if (this.type === "ghost_trail" && this.extra) {
            const scale = 1.0 + (1.0 - this.life) * 0.4;
            const w = this.extra.w * scale;
            const h = this.extra.h * scale;
           
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = `rgb(${this.extra.color.join(',')})`;
            ctx.fillRect(dx + (this.extra.w - w) / 2, dy + (this.extra.h - h) / 2, w, h);
        } else if (this.type === "code") {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${this.color.join(',')})`;
            ctx.font = "bold 10px Courier";
            ctx.fillText(this.extra, dx, dy);
        } else if (this.type === "hearts") {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${this.color.join(',')})`;
            const r = this.size / 2;
            ctx.beginPath();
            ctx.arc(dx, dy, r, 0, Math.PI * 2);
            ctx.arc(dx + r * 2, dy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(dx - r, dy);
            ctx.lineTo(dx + r * 3, dy);
            ctx.lineTo(dx + r * 1.5, dy + r * 3);
            ctx.closePath();
            ctx.fill();
        } else if (this.type === "sparkle") {
            const scale = Math.sin(this.life * Math.PI);
            const currSz = this.size * scale;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = `rgb(${this.color.join(',')})`;
            ctx.lineWidth = 2;
            ctx.translate(dx, dy);
            ctx.rotate(this.angle);
            ctx.beginPath();
            ctx.moveTo(-currSz * 1.5, 0);
            ctx.lineTo(currSz * 1.5, 0);
            ctx.moveTo(0, -currSz * 1.5);
            ctx.lineTo(0, currSz * 1.5);
            ctx.stroke();
        } else if (this.type === "confetti") {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${this.color.join(',')})`;
            ctx.translate(dx, dy);
            ctx.rotate(this.angle);
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else if (this.type === "bubbles") {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${this.color.join(',')})`;
            ctx.beginPath();
            ctx.arc(dx, dy, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            ctx.beginPath();
            ctx.arc(dx + this.size * 0.3, dy - this.size * 0.3, this.size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === "lightning" && this.extra) {
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = `rgb(${this.color.join(',')})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(dx, dy);
            for (const [px, py] of this.extra) {
                ctx.lineTo(px + offsetX, py + offsetY);
            }
            ctx.stroke();
        } else if (this.type === "spiral") {
            const maxRadius = 40;
            const radius = 5 + (1.0 - this.life) * maxRadius;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${this.color.join(',')})`;
            for (let i = 0; i < 2; i++) {
                const theta = this.angle + (i * Math.PI);
                const ox = Math.cos(theta) * radius;
                const oy = Math.sin(theta) * radius;
                ctx.beginPath();
                ctx.arc(dx + ox, dy + oy, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.type === "galaxy_trail") {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${this.color.join(',')})`;
            ctx.translate(dx, dy);
            ctx.rotate(this.angle);
            const outer = this.size;
            const inner = this.size * 0.3;
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const a1 = i * Math.PI / 2;
                ctx.lineTo(Math.cos(a1) * outer, Math.sin(a1) * outer);
                const a2 = i * Math.PI / 2 + Math.PI / 4;
                ctx.lineTo(Math.cos(a2) * inner, Math.sin(a2) * inner);
            }
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === "void_smear") {
            const currSize = this.size * this.life;
            if (currSize > 0) {
                ctx.globalAlpha = 1;
                ctx.fillStyle = 'rgb(0, 0, 0)';
                ctx.fillRect(dx - currSize / 2, dy - currSize / 2, currSize, currSize);
            }
        } else if (this.type === "pixel") {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${this.color.join(',')})`;
            ctx.fillRect(dx - this.size / 2, dy - this.size / 2, this.size, this.size);
        } else {
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${this.color.join(',')})`;
            ctx.beginPath();
            ctx.arc(dx, dy, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
