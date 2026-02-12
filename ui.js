/* =====================
   UI BUTTON CLASS
   Menu & shop buttons
   ===================== */
class Button {
    constructor(text, x, y, w, h, func, style = "primary") {
        this.rect = {x, y, w, h};
        this.text = text;
        this.func = func;
        this.style = style;
        this.isHovered = false;
        this.textColor = [0, 0, 0];

        if (style === "primary") {
            this.color = [0, 0, 0];
            this.hoverColor = [50, 50, 50];
            this.textColor = [255, 255, 255];
        } else if (style === "danger") {
            this.color = [200, 0, 0];
            this.hoverColor = [150, 0, 0];
            this.textColor = [255, 255, 255];
        } else {
            this.color = [255, 255, 255];
            this.hoverColor = [240, 240, 240];
            this.textColor = [0, 0, 0];
        }
    }

    draw(ctx, fontSize = 18) {
        const currentColor = this.isHovered ? this.hoverColor : this.color;
       
        ctx.fillStyle = `rgb(${currentColor.join(',')})`;
        ctx.fillRect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
       
        ctx.strokeStyle = 'rgb(0, 0, 0)';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
       
        ctx.fillStyle = `rgb(${this.textColor.join(',')})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const text = String(this.text ?? "");
        const lines = text.split('\n');
        if (lines.length === 1) {
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillText(lines[0], this.rect.x + this.rect.w / 2, this.rect.y + this.rect.h / 2);
        } else {
            const mainSize = fontSize;
            const subSize = Math.max(10, fontSize - 4);
            const totalH = mainSize + subSize;
            let y = this.rect.y + this.rect.h / 2 - totalH / 2 + mainSize * 0.1;
            ctx.font = `bold ${mainSize}px Arial`;
            ctx.fillText(lines[0], this.rect.x + this.rect.w / 2, y);
            ctx.font = `${subSize}px Arial`;
            ctx.fillText(lines.slice(1).join(' '), this.rect.x + this.rect.w / 2, y + mainSize);
        }
    }

    checkHover(x, y) {
        this.isHovered = x >= this.rect.x && x <= this.rect.x + this.rect.w &&
                         y >= this.rect.y && y <= this.rect.y + this.rect.h;
    }

    checkClick(x, y) {
        if (this.isHovered && this.func) {
            this.func();
        }
    }
}
