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
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, this.rect.x + this.rect.w / 2, this.rect.y + this.rect.h / 2);
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
