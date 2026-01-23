/* =====================
   MAIN GAME CLASS
   Core game logic
   ===================== */
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
       
        this.dataManager = new DataManager();
       
        this.baseCols = 21;
        this.baseRows = 15;
       
        this.state = STATE_MENU;
        this.level = 1;
        this.practice_mode = false;
        this.particles = [];
        this.themeStars = Array(50).fill().map(() => [
            Math.random() * WINDOW_WIDTH,
            Math.random() * WINDOW_HEIGHT,
            Math.floor(Math.random() * 3) + 1
        ]);

        this.squishScale = [1.0, 1.0];
        this.spinAngle = 0;
        this.pulseScale = 1.0;
        this.pulseOffset = 0.0;
        this.wobbleOffset = [0, 0];
        this.bounceY = 0;
        this.stretchScale = [1.0, 1.0];
        this.flipAngle = 0;
        this.waveTime = 0;

        this.moveSpeed = 60;
        this.currentMoveVelocity = 0;
        this.moveStartPos = [0, 0];

        this.hueTimer = 0;
        this.reactiveColor = [200, 200, 200];

        this.shopTab = "skins";
        this.menuButtons = [];
        this.shopButtons = [];

        this.shakeOffset = [0, 0];
        this.lastMoveDir = [0, 0];
        this.gameStartTime = Date.now();
        
        this.isPaused = false;
        this.pausedPlayerGridPos = null;
        this.pausedPlayerPixelPos = null;
        this.pausedLavaCells = null;

        this.setupInput();
        this.createMenuUI();
        this.initLevel();
       
        this.lastTime = Date.now();
        this.gameLoop();
    }

    setupInput() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
           
            if ([STATE_MENU, STATE_SHOP, STATE_INFO, STATE_GAMEOVER].includes(this.state)) {
                const btnList = this.state === STATE_MENU ? this.menuButtons : (this.state === STATE_INFO ? this.infoButtons : this.shopButtons);
                btnList.forEach(btn => btn.checkHover(x, y));
            }
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
           
            if ([STATE_MENU, STATE_SHOP, STATE_INFO, STATE_GAMEOVER].includes(this.state)) {
                const btnList = this.state === STATE_MENU ? this.menuButtons : (this.state === STATE_INFO ? this.infoButtons : this.shopButtons);
                btnList.forEach(btn => btn.checkClick(x, y));
            }
        });

        document.addEventListener('keydown', (e) => {
            if (this.state === STATE_MENU && e.key === ' ') {
                this.startGame();
            } else if (this.state === STATE_INFO && (e.key === ' ' || e.key === 'Escape')) {
                this.state = STATE_MENU;
            } else if (this.state === STATE_GAMEOVER && e.key === ' ') {
                this.state = STATE_MENU;
            } else if (this.state === STATE_GAMEOVER && (e.key === 'r' || e.key === 'R')) {
                this.restartLevel();
            } else if (this.state === STATE_PLAYING && e.key === 'Escape') {
                if (this.isPaused) {
                    this.isPaused = false;
                    this.state = STATE_MENU;
                }
            } else if (this.state === STATE_PLAYING && e.key === ' ') {
                e.preventDefault();
                this.togglePause();
            } else if (this.state === STATE_PLAYING && !this.isMoving && !this.isPaused) {
                let dr = 0, dc = 0;
                if (['ArrowUp', 'w', 'W'].includes(e.key)) dr = -1;
                else if (['ArrowDown', 's', 'S'].includes(e.key)) dr = 1;
                else if (['ArrowLeft', 'a', 'A'].includes(e.key)) dc = -1;
                else if (['ArrowRight', 'd', 'D'].includes(e.key)) dc = 1;

                if (dr !== 0 || dc !== 0) {
                    e.preventDefault();
                    this.hasStartedMoving = true;
                    this.currentMoveVelocity = this.dataManager.data.equipped_anim === 'heavy' ? 5 : this.moveSpeed;
                    this.moveStartPos = [...this.playerPixelPos];

                    const [targetR, targetC] = this.getTargetSlidePos(dr, dc);
                    if (targetR !== this.playerGridPos[0] || targetC !== this.playerGridPos[1]) {
                        this.playerGridPos = [targetR, targetC];
                        this.targetPixelPos = [targetC * this.tileW, targetR * this.tileH];
                        this.isMoving = true;
                        this.lastMoveDir = [dr, dc];
                    }
                }
            } else if (this.state === STATE_PLAYING && this.isPaused && this.practice_mode && !this.isMoving) {
                let dr = 0, dc = 0;
                if (['ArrowUp', 'w', 'W'].includes(e.key)) dr = -1;
                else if (['ArrowDown', 's', 'S'].includes(e.key)) dr = 1;
                else if (['ArrowLeft', 'a', 'A'].includes(e.key)) dc = -1;
                else if (['ArrowRight', 'd', 'D'].includes(e.key)) dc = 1;

                if (dr !== 0 || dc !== 0) {
                    e.preventDefault();
                    this.currentMoveVelocity = this.dataManager.data.equipped_anim === 'heavy' ? 5 : this.moveSpeed;
                    this.moveStartPos = [...this.playerPixelPos];

                    const [targetR, targetC] = this.getTargetSlidePos(dr, dc);
                    if (targetR !== this.playerGridPos[0] || targetC !== this.playerGridPos[1]) {
                        this.playerGridPos = [targetR, targetC];
                        this.targetPixelPos = [targetC * this.tileW, targetR * this.tileH];
                        this.isMoving = true;
                        this.lastMoveDir = [dr, dc];
                    }
                }
            }
        });
    }

    togglePause() {
        if (!this.isPaused) {
            this.isPaused = true;
            this.pausedPlayerGridPos = [...this.playerGridPos];
            this.pausedPlayerPixelPos = [...this.playerPixelPos];
            this.pausedLavaCells = new Set(this.lavaCells);
        } else {
            this.isPaused = false;
            this.playerGridPos = [...this.pausedPlayerGridPos];
            this.playerPixelPos = [...this.pausedPlayerPixelPos];
            this.lavaCells = new Set(this.pausedLavaCells);
            this.pausedPlayerGridPos = null;
            this.pausedPlayerPixelPos = null;
            this.pausedLavaCells = null;
        }
    }

    createMenuUI() {
        const btnW = 200, btnH = 50;
        const cx = WINDOW_WIDTH / 2 - btnW / 2;
        const startY = 320;
        const spacing = 60;

        this.menuButtons = [
            new Button("START", cx, startY, btnW, btnH, () => this.startGame(), "primary"),
            new Button("PRACTICE", cx, startY + spacing, btnW, btnH, () => this.startPractice(), "red_black"),
            new Button("SHOP", cx, startY + spacing * 2, btnW, btnH, () => this.openShop(), "outline"),
            new Button("INFO", cx, startY + spacing * 3, btnW, btnH, () => { this.state = STATE_INFO; }, "outline")
        ];
        
        this.infoButtons = [
            new Button("BACK", WINDOW_WIDTH / 2 - 100, WINDOW_HEIGHT - 80, 200, 50, () => { this.state = STATE_MENU; }, "primary")
        ];
    }

    startGame() {
        this.level = 1;
        this.practice_mode = false;
        this.gameStartTime = Date.now();
        this.initLevel();
        this.state = STATE_PLAYING;
    }

    startPractice() {
        this.level = 1;
        this.practice_mode = true;
        this.gameStartTime = Date.now();
        this.initLevel();
        this.state = STATE_PLAYING;
    }

    openShop() {
        this.state = STATE_SHOP;
        this.createShopUI();
    }

    quitGame() {
        this.dataManager.save();
        alert("Thanks for playing!");
    }

    restartLevel() {
        this.practice_mode = true;
        this.gameStartTime = Date.now();
        // Reset player to start without regenerating maze
        this.playerGridPos = [...this.mazeGen.start];
        const startX = this.playerGridPos[1] * this.tileW;
        const startY = this.playerGridPos[0] * this.tileH;
        this.playerPixelPos = [startX, startY];
        this.targetPixelPos = [startX, startY];
        this.isMoving = false;
        this.hasStartedMoving = false;
        this.lastMoveDir = [0, 0];
        this.shakeOffset = [0, 0];
        this.resetAnimations();
        this.lavaCells = new Set();
        this.lavaTimer = 0;
        this.levelFrameCount = 0;
        this.state = STATE_PLAYING;
    }

    initLevel() {
        const sizeBoost = Math.floor(this.level / 3) * 2;
        const cols = Math.min(this.baseCols + sizeBoost, 51);
        const rows = Math.min(this.baseRows + sizeBoost, 35);

        this.mazeGen = new MazeGenerator(cols, rows);
        this.mazeGen.generate();
        this.grid = this.mazeGen.grid;

        this.tileW = WINDOW_WIDTH / this.mazeGen.cols;
        this.tileH = WINDOW_HEIGHT / this.mazeGen.rows;

        this.playerGridPos = [...this.mazeGen.start];
        const startX = this.playerGridPos[1] * this.tileW;
        const startY = this.playerGridPos[0] * this.tileH;
        this.playerPixelPos = [startX, startY];
        this.targetPixelPos = [startX, startY];

        this.isMoving = false;
        this.hasStartedMoving = false;
        this.lastMoveDir = [0, 0];

        this.shakeOffset = [0, 0];
        this.resetAnimations();

        this.lavaCells = new Set();
        this.lavaTimer = 0;
        this.lavaStartDelay = 120;
        this.levelFrameCount = 0;

        const startInterval = Math.max(2.0, 25.0 - this.level * 1.0);
        this.currentLavaInterval = startInterval;
    }

    resetAnimations() {
        this.squishScale = [1.0, 1.0];
        this.spinAngle = 0;
        this.pulseScale = 1.0;
        this.pulseOffset = 0.0;
        this.wobbleOffset = [0, 0];
        this.bounceY = 0;
        this.stretchScale = [1.0, 1.0];
        this.flipAngle = 0;
        this.waveTime = 0;
    }

    getTargetSlidePos(dr, dc) {
        let [r, c] = this.playerGridPos;
        while (true) {
            const nextR = r + dr;
            const nextC = c + dc;
            if (nextR >= 0 && nextR < this.mazeGen.rows && nextC >= 0 && nextC < this.mazeGen.cols) {
                if (this.grid[nextR][nextC] === 1) break;
                [r, c] = [nextR, nextC];
                if (r === this.mazeGen.end[0] && c === this.mazeGen.end[1]) break;
            } else break;
        }
        return [r, c];
    }

    updatePlayerMovement() {
        const [currX, currY] = this.playerPixelPos;
        const [targetX, targetY] = this.targetPixelPos;

        const dx = targetX - currX;
        const dy = targetY - currY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (!this.isMoving) return;

        const animType = this.dataManager.data.equipped_anim;
        const skinName = this.dataManager.data.equipped_skin;
        const skin = SKINS[skinName] || SKINS.default;

        if (animType === 'squish') {
            if (Math.abs(dx) > Math.abs(dy)) this.squishScale = [1.3, 0.8];
            else this.squishScale = [0.8, 1.3];
        } else if (animType === 'spin') {
            this.spinAngle = (this.spinAngle + 40) % 360;
        } else if (animType === 'pulse') {
            this.pulseOffset = 0.3 * Math.sin(Date.now() * 0.03);
        } else if (animType === 'bounce') {
            const hopSpeed = 0.03;
            const hopVal = Math.abs(Math.sin(Date.now() * hopSpeed));
            this.bounceY = -hopVal * 30;
            const stretchFactor = 0.4 * hopVal;
            this.squishScale = [1.0 - stretchFactor, 1.0 + stretchFactor];
        } else if (animType === 'flip') {
            this.flipAngle = (this.flipAngle + 30) % 360;
        } else if (animType === 'wave') {
            this.waveTime += 0.6;
            const waveOffset = Math.sin(this.waveTime) * 30;
            if (Math.abs(dx) > Math.abs(dy)) {
                this.wobbleOffset = [0, waveOffset];
            } else {
                this.wobbleOffset = [waveOffset, 0];
            }
        } else if (animType === 'heavy') {
            if (this.currentMoveVelocity < 60) {
                this.currentMoveVelocity += 3;
            }
        }

        if (skin.type === 'void_smear') {
            if (Math.random() < 0.6) {
                const px = currX + this.tileW / 2;
                const py = currY + this.tileH / 2;
                this.particles.push(new Particle(px, py, [0, 0, 0], 'void_smear', this.tileW - 4));
            }
        }

        const trailName = this.dataManager.data.equipped_trail;
        const trailData = TRAILS[trailName];

        if (trailData && trailData.type !== 'none') {
            let spawnChance = 0.4;
            const tType = trailData.type;
            let tColor = trailData.color;

            if (tType === 'galaxy_trail') spawnChance = 0.8;
            else if (tType === 'spiral') {
                spawnChance = 0.6;
                tColor = this.getCurrentSkinColor();
            } else if (['ghost_trail', 'confetti'].includes(tType)) spawnChance = 0.2;

            if (Math.random() < spawnChance) {
                const px = currX + this.tileW / 2 + (Math.random() * 8 - 4);
                const py = currY + this.tileH / 2 + (Math.random() * 8 - 4);

                let extraData = null;
                if (tType === 'ghost_trail') {
                    const w = this.tileW - 4;
                    const h = this.tileH - 4;
                    extraData = {
                        w, h,
                        color: this.getCurrentSkinColor()
                    };
                }

                this.particles.push(new Particle(px, py, tColor, tType, 4, extraData));
            }
        }

        const moveSpeed = animType === 'heavy' ? this.currentMoveVelocity : this.moveSpeed;

        if (dist <= moveSpeed) {
            this.playerPixelPos = [targetX, targetY];
            this.isMoving = false;
            this.triggerImpact();
        } else {
            const moveX = (dx / dist) * moveSpeed;
            const moveY = (dy / dist) * moveSpeed;
            this.playerPixelPos[0] += moveX;
            this.playerPixelPos[1] += moveY;
        }
    }

    getCurrentSkinColor() {
        const skin = SKINS[this.dataManager.data.equipped_skin] || SKINS.default;
        let col = [...skin.color];

        if (skin.type === 'rainbow') {
            const [r, g, b] = this.hsvToRgb(this.hueTimer, 0.8, 1.0);
            col = [r, g, b];
        } else if (skin.type === 'reactive') {
            col = this.reactiveColor;
        } else if (skin.type === 'prism') {
            const [r, g, b] = this.hsvToRgb((this.hueTimer * 3) % 1.0, 0.5, 1.0);
            col = [r, g, b];
        } else if (skin.type === 'liquid_chrome') {
            const offset = Math.sin(Date.now() * 0.01) * 30;
            const val = 192 + offset;
            col = [val, val, val];
        }

        return col;
    }

    hsvToRgb(h, s, v) {
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        let r, g, b;
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    triggerImpact() {
        const [dr, dc] = this.lastMoveDir;
        let impactForce = 8;

        const animType = this.dataManager.data.equipped_anim;

        if (animType === 'heavy') impactForce = 25;

        this.shakeOffset = [dc * impactForce, dr * impactForce];

        if (animType === 'squish') {
            if (dc !== 0) this.squishScale = [0.5, 1.8];
            else this.squishScale = [1.8, 0.5];
        } else if (animType === 'pulse') {
            this.pulseScale = 0.5;
        } else if (animType === 'bounce') {
            this.bounceY = 0;
            this.squishScale = [1.3, 0.7];
        } else if (animType === 'stretch') {
            if (dc !== 0) this.stretchScale = [0.6, 1.4];
            else this.stretchScale = [1.4, 0.6];
        }

        const skin = SKINS[this.dataManager.data.equipped_skin];
        if (skin && skin.type === 'reactive') {
            this.reactiveColor = [
                Math.floor(Math.random() * 206) + 50,
                Math.floor(Math.random() * 206) + 50,
                Math.floor(Math.random() * 206) + 50
            ];
        }
    }

    updateMisc() {
        this.shakeOffset[0] *= 0.7;
        this.shakeOffset[1] *= 0.7;
        if (Math.abs(this.shakeOffset[0]) < 0.5) this.shakeOffset[0] = 0;
        if (Math.abs(this.shakeOffset[1]) < 0.5) this.shakeOffset[1] = 0;

        const animType = this.dataManager.data.equipped_anim;

        if (animType === 'wobble') {
            this.wobbleOffset = [Math.random() * 8 - 4, Math.random() * 8 - 4];
        } else {
            this.wobbleOffset[0] *= 0.8;
            this.wobbleOffset[1] *= 0.8;
        }

        this.pulseScale += (1.0 - this.pulseScale) * 0.1;

        if (!this.isMoving) {
            this.squishScale[0] += (1.0 - this.squishScale[0]) * 0.15;
            this.squishScale[1] += (1.0 - this.squishScale[1]) * 0.15;
            this.stretchScale[0] += (1.0 - this.stretchScale[0]) * 0.15;
            this.stretchScale[1] += (1.0 - this.stretchScale[1]) * 0.15;
            this.bounceY *= 0.8;
            this.spinAngle *= 0.9;
            if (Math.abs(this.spinAngle) < 1) this.spinAngle = 0;
        }

        this.hueTimer = (this.hueTimer + 0.01) % 1.0;
    }

    updateLava() {
        if (this.isPaused) return;
        if (!this.hasStartedMoving) return;
        this.levelFrameCount++;
        if (this.levelFrameCount < this.lavaStartDelay) return;
        if (this.lavaCells.size === 0) this.lavaCells.add(`${this.mazeGen.start[0]},${this.mazeGen.start[1]}`);

        if (this.levelFrameCount % 60 === 0) {
            this.currentLavaInterval = Math.max(1.5, this.currentLavaInterval - 0.2);
        }

        this.lavaTimer++;
        if (this.lavaTimer >= Math.floor(this.currentLavaInterval)) {
            this.lavaTimer = 0;
            const newLava = new Set();
            for (const key of this.lavaCells) {
                const [r, c] = key.split(',').map(Number);
                for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < this.mazeGen.rows && nc >= 0 && nc < this.mazeGen.cols) {
                        if (this.grid[nr][nc] === 0 && !this.lavaCells.has(`${nr},${nc}`)) {
                            newLava.add(`${nr},${nc}`);
                        }
                    }
                }
            }
            for (const key of newLava) {
                this.lavaCells.add(key);
            }
        }
    }

    checkCollisions() {
        if (this.isPaused) return;
        
        const key = `${this.playerGridPos[0]},${this.playerGridPos[1]}`;
        if (this.lavaCells.has(key)) {
            if (this.practice_mode) {
                this.dataManager.data.practice_deaths = (this.dataManager.data.practice_deaths || 0) + 1;
                if (this.level > this.dataManager.data.high_level_practice) {
                    this.dataManager.data.high_level_practice = this.level;
                }
            } else {
                if (this.level > this.dataManager.data.high_level) {
                    this.dataManager.data.high_level = this.level;
                }
            }
            this.dataManager.save();
            this.state = STATE_GAMEOVER;
        }
    }

    createShopUI() {
        this.shopButtons = [];

        const panelRect = {x: 100, y: 80, w: WINDOW_WIDTH - 200, h: WINDOW_HEIGHT - 160};

        this.shopButtons.push(new Button("BACK", panelRect.x + 20, panelRect.y + 20, 80, 40,
            () => { this.state = STATE_MENU; }, "outline"));

        const tabs = [["SKINS", "skins"], ["TRAILS", "trails"], ["MOVES", "moves"], ["THEMES", "level_skins"]];
        let tx = panelRect.x + 150;
        for (const [txt, val] of tabs) {
            const style = this.shopTab === val ? "primary" : "outline";
            this.shopButtons.push(new Button(txt, tx, panelRect.y + 20, 100, 40,
                ((v) => () => {
                    this.shopTab = v;
                    this.createShopUI();
                })(val), style));
            tx += 110;
        }

        let y = panelRect.y + 90;
        const items = [];

        if (this.shopTab === "skins") {
            for (const [k, v] of Object.entries(SKINS)) items.push([k, v, 'skin']);
        } else if (this.shopTab === "trails") {
            for (const [k, v] of Object.entries(TRAILS)) items.push([k, v, 'trail']);
        } else if (this.shopTab === "moves") {
            for (const [k, v] of Object.entries(ANIMATIONS)) items.push([k, v, 'anim']);
        } else if (this.shopTab === "level_skins") {
            for (const [k, v] of Object.entries(LEVEL_SKINS)) items.push([k, v, 'level_skin']);
        }

        let row = 0, col = 0;
        for (const [key, item, cat] of items) {
            let unlocked, equipped, txt;

            if (cat === 'skin') {
                if (item.level_req < 30) {
                    unlocked = this.dataManager.data.high_level >= item.level_req;
                } else {
                    unlocked = Math.max(this.dataManager.data.high_level, this.dataManager.data.high_level_practice) >= item.level_req;
                }
                equipped = this.dataManager.data.equipped_skin === key;
                txt = unlocked ? item.name : `LVL ${item.level_req}`;
            } else if (cat === 'trail') {
                unlocked = this.dataManager.data.unlocked_trails.includes(key);
                equipped = this.dataManager.data.equipped_trail === key;
                txt = unlocked ? item.name : `${item.cost}`;
            } else if (cat === 'anim') {
                unlocked = this.dataManager.data.unlocked_anims.includes(key);
                equipped = this.dataManager.data.equipped_anim === key;
                txt = unlocked ? item.name : `${item.cost}`;
            } else if (cat === 'level_skin') {
                unlocked = this.dataManager.data.unlocked_level_skins.includes(key);
                equipped = this.dataManager.data.equipped_level_skin === key;
                txt = unlocked ? item.name : `${item.cost}`;
            }

            if (equipped) txt = `[${txt}]`;

            const clickAction = ((k, i, c) => () => {
                const dm = this.dataManager;
                if (c === 'skin') {
                    let unlocked = false;
                    if (i.level_req < 30) {
                        unlocked = dm.data.high_level >= i.level_req;
                    } else {
                        unlocked = Math.max(dm.data.high_level, dm.data.high_level_practice) >= i.level_req;
                    }
                    if (unlocked) {
                        dm.data.equipped_skin = k;
                    }
                } else if (c === 'trail') {
                    if (dm.data.unlocked_trails.includes(k)) {
                        dm.data.equipped_trail = k;
                    } else if (dm.data.points >= i.cost) {
                        dm.data.points -= i.cost;
                        dm.data.unlocked_trails.push(k);
                        dm.data.equipped_trail = k;
                    }
                } else if (c === 'anim') {
                    if (dm.data.unlocked_anims.includes(k)) {
                        dm.data.equipped_anim = k;
                    } else if (dm.data.points >= i.cost) {
                        dm.data.points -= i.cost;
                        dm.data.unlocked_anims.push(k);
                        dm.data.equipped_anim = k;
                    }
                } else if (c === 'level_skin') {
                    if (dm.data.unlocked_level_skins.includes(k)) {
                        dm.data.equipped_level_skin = k;
                    } else if (dm.data.points >= i.cost) {
                        dm.data.points -= i.cost;
                        dm.data.unlocked_level_skins.push(k);
                        dm.data.equipped_level_skin = k;
                    }
                }
                dm.save();
                this.createShopUI();
            })(key, item, cat);

            let style = "outline";
            if ((cat === 'skin' && unlocked) || (cat !== 'skin' && unlocked)) {
                style = equipped ? "primary" : "outline";
            }

            const itemX = panelRect.x + 30 + col * 180;
            const itemY = y + row * 55;

            if (itemY < panelRect.y + panelRect.h - 70) {
                this.shopButtons.push(new Button(txt, itemX, itemY, 170, 45, clickAction, style));
            }

            col++;
            if (col >= 3) {
                col = 0;
                row++;
            }
        }
    }

    drawPlayer(sx, sy) {
        const col = this.getCurrentSkinColor();
        const skin = SKINS[this.dataManager.data.equipped_skin] || SKINS.default;

        // Flash effect for starting position - swap between color and negative color
        let displayCol = col;
        if (!this.hasStartedMoving) {
            const elapsedTime = Date.now() - this.gameStartTime;
            if (elapsedTime < 500) {
                const flashFreq = 50;
                if (Math.floor(elapsedTime / flashFreq) % 2 === 1) {
                    displayCol = [255 - col[0], 255 - col[1], 255 - col[2]];
                }
            }
        }

        if (this.dataManager.data.equipped_anim === 'stretch' && this.isMoving) {
            const headX = this.playerPixelPos[0] + this.tileW / 2 + sx;
            const headY = this.playerPixelPos[1] + this.tileH / 2 + sy;
            const startX = this.moveStartPos[0] + this.tileW / 2 + sx;
            const startY = this.moveStartPos[1] + this.tileH / 2 + sy;

            const dx = headX - startX;
            const dy = headY - startY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const maxLen = 150;
            let tailX = startX, tailY = startY;

            if (dist > maxLen) {
                const norm = dist > 0 ? 1.0 / dist : 0;
                tailX = headX - dx * norm * maxLen;
                tailY = headY - dy * norm * maxLen;
            }

            const rectLen = Math.sqrt((headX - tailX) ** 2 + (headY - tailY) ** 2);
            const rectW = this.tileW - 8;
            const angle = Math.atan2(dy, dx);

            this.ctx.save();
            this.ctx.translate((headX + tailX) / 2, (headY + tailY) / 2);
            this.ctx.rotate(angle);

            this.ctx.fillStyle = `rgb(${displayCol.join(',')})`;
            this.ctx.fillRect(-rectLen / 2 - rectW / 2, -rectW / 2, rectLen + rectW, rectW);

            if (skin.border) {
                this.ctx.strokeStyle = `rgb(${skin.border.join(',')})`;
                this.ctx.lineWidth = 3;
            } else {
                this.ctx.strokeStyle = 'rgb(0, 0, 0)';
                this.ctx.lineWidth = 2;
            }
            this.ctx.strokeRect(-rectLen / 2 - rectW / 2, -rectW / 2, rectLen + rectW, rectW);

            this.ctx.restore();

            const eyeSz = Math.max(2, Math.floor(rectW / 5));
            const eyeOffDist = 3;
            const eCx = headX + Math.cos(angle) * eyeOffDist;
            const eCy = headY + Math.sin(angle) * eyeOffDist;
            const perpX = -Math.sin(angle) * (rectW * 0.25);
            const perpY = Math.cos(angle) * (rectW * 0.25);

            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(eCx + perpX - eyeSz / 2, eCy + perpY - eyeSz / 2, eyeSz, eyeSz);
            this.ctx.fillRect(eCx - perpX - eyeSz / 2, eCy - perpY - eyeSz / 2, eyeSz, eyeSz);

            return;
        }

        const [px, py] = this.playerPixelPos;
        const baseW = this.tileW - 4;
        const baseH = this.tileH - 4;

        const pulseTotal = this.pulseScale + this.pulseOffset;
        let w = baseW * this.squishScale[0] * this.stretchScale[0] * pulseTotal;
        let h = baseH * this.squishScale[1] * this.stretchScale[1] * pulseTotal;

        if (this.flipAngle !== 0) {
            const scaleX = Math.abs(Math.cos(this.flipAngle * Math.PI / 180));
            w *= Math.max(0.1, scaleX);
        }

        const centerX = px + this.tileW / 2 + sx + this.wobbleOffset[0];
        const centerY = py + this.tileH / 2 + sy + this.wobbleOffset[1] + this.bounceY;

        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        if (this.spinAngle !== 0) {
            this.ctx.rotate(this.spinAngle * Math.PI / 180);
        }

        const skinType = skin.type;

        if (skinType === 'void_smear') {
            this.ctx.fillStyle = 'rgb(0, 0, 0)';
            this.ctx.fillRect(-w / 2, -h / 2, w, h);
            this.ctx.strokeStyle = 'rgb(30, 30, 30)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(-w / 2, -h / 2, w, h);
        } else if (skinType === 'liquid_chrome') {
            this.ctx.fillStyle = 'rgb(150, 150, 160)';
            this.ctx.fillRect(-w / 2, -h / 2, w, h);
            this.ctx.fillStyle = 'rgb(230, 230, 240)';
            this.ctx.fillRect(-w / 2, -h / 2, w, h / 2);

            const shinePos = (Date.now() / 3) % (w + h + 40) - 40;
            this.ctx.globalAlpha = 0.5;
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.moveTo(shinePos - w / 2, -h / 2);
            this.ctx.lineTo(shinePos + 15 - w / 2, -h / 2);
            this.ctx.lineTo(shinePos - 10 - w / 2, h / 2);
            this.ctx.lineTo(shinePos - 25 - w / 2, h / 2);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.globalAlpha = 1;

            this.ctx.strokeStyle = 'rgb(220, 220, 220)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(-w / 2, -h / 2, w, h);
        } else if (skinType === 'ghost_glitch') {
            const alpha = 150 + Math.sin(Date.now() * 0.005) * 50;

            if (Math.random() < 0.15) {
                const offX = Math.random() * 20 - 10;
                this.ctx.globalAlpha = 0.7;
                this.ctx.fillStyle = 'rgb(0, 255, 255)';
                this.ctx.fillRect(-w / 2 - offX, -h / 2, w, h);
                this.ctx.fillStyle = 'rgb(255, 0, 0)';
                this.ctx.fillRect(-w / 2 + offX, -h / 2, w, h);
                this.ctx.globalAlpha = 1;
            }

            this.ctx.globalAlpha = alpha / 255;
            this.ctx.fillStyle = `rgb(${skin.color.join(',')})`;
            this.ctx.fillRect(-w / 2, -h / 2, w, h);
            this.ctx.globalAlpha = 0.8;
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(-w / 2, -h / 2, w, h);
            this.ctx.globalAlpha = 1;
        } else {
            if (skinType === 'ghost') {
                this.ctx.globalAlpha = 0.6;
            }
            this.ctx.fillStyle = `rgb(${displayCol.join(',')})`;
            this.ctx.fillRect(-w / 2, -h / 2, w, h);
            this.ctx.globalAlpha = 1;

            if (skin.border) {
                this.ctx.strokeStyle = `rgb(${skin.border.join(',')})`;
                this.ctx.lineWidth = 3;
            } else {
                this.ctx.strokeStyle = 'rgb(0, 0, 0)';
                this.ctx.lineWidth = 2;
            }
            this.ctx.strokeRect(-w / 2, -h / 2, w, h);
        }

        const eyeSz = Math.max(2, Math.floor(Math.min(Math.abs(w), Math.abs(h)) / 5));
        const offX = this.lastMoveDir[1] * 3;
        const offY = this.lastMoveDir[0] * 3;
        const eyeY = -h / 6 + offY;
        const eyeLX = -w / 6 - eyeSz / 2 + offX;
        const eyeRX = w / 6 - eyeSz / 2 + offX;

        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(eyeLX, eyeY, eyeSz, eyeSz);
        this.ctx.fillRect(eyeRX, eyeY, eyeSz, eyeSz);

        this.ctx.restore();
        this.ctx.globalAlpha = 1;
    }

    drawTextCentered(text, fontSize, color, offsetY = 0) {
        this.ctx.fillStyle = `rgb(${color.join(',')})`;
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2 + offsetY);
    }

    drawMultilineTextCentered(text, fontSize, color, offsetY = 0, lineSpacing = 20) {
        this.ctx.fillStyle = `rgb(${color.join(',')})`;
        this.ctx.font = `${fontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const lines = text.split('\n');
        const totalHeight = (lines.length - 1) * lineSpacing;
        let y = WINDOW_HEIGHT / 2 + offsetY - totalHeight / 2;
        for (const line of lines) {
            this.ctx.fillText(line, WINDOW_WIDTH / 2, y);
            y += lineSpacing;
        }
    }

    draw() {
        const lvlSkinKey = this.dataManager.data.equipped_level_skin;
        const lvlSkin = LEVEL_SKINS[lvlSkinKey] || LEVEL_SKINS.default;

        const cBg = lvlSkin.colors.bg;
        const cWall = lvlSkin.colors.wall;
        const cFloor = lvlSkin.colors.floor;
        const cText = lvlSkin.colors.text;
        const cBorder = lvlSkin.colors.border;
        const cLava = lvlSkin.colors.lava;
        const cEnd = lvlSkin.colors.end;

        this.ctx.fillStyle = `rgb(${cBg.join(',')})`;
        this.ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);

        const quirk = lvlSkin.quirk;

        if (quirk === 'grid') {
            this.ctx.strokeStyle = `rgb(${cBorder.join(',')})`;
            this.ctx.lineWidth = 1;
            for (let x = 0; x < WINDOW_WIDTH; x += 40) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, WINDOW_HEIGHT);
                this.ctx.stroke();
            }
            for (let y = 0; y < WINDOW_HEIGHT; y += 40) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(WINDOW_WIDTH, y);
                this.ctx.stroke();
            }
        } else if (quirk === 'stars') {
            this.ctx.fillStyle = 'white';
            for (const [x, y, size] of this.themeStars) {
                this.ctx.beginPath();
                this.ctx.arc(x, y, size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else if (quirk === 'polka') {
            this.ctx.fillStyle = `rgb(${cBorder.join(',')})`;
            for (let x = 0; x < WINDOW_WIDTH; x += 60) {
                for (let y = 0; y < WINDOW_HEIGHT; y += 60) {
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 4, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }

        const [sx, sy] = this.shakeOffset;

        if (this.state === STATE_MENU) {
            if (quirk !== 'grid') {
                this.ctx.strokeStyle = `rgb(${cFloor.join(',')})`;
                this.ctx.lineWidth = 1;
                for (let i = 0; i < WINDOW_WIDTH; i += 40) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(i, 0);
                    this.ctx.lineTo(i, WINDOW_HEIGHT);
                    this.ctx.stroke();
                }
                for (let i = 0; i < WINDOW_HEIGHT; i += 40) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, i);
                    this.ctx.lineTo(WINDOW_WIDTH, i);
                    this.ctx.stroke();
                }
            }

            this.drawTextCentered("SLIDE", 80, cText, -150);
            this.drawTextCentered(`HIGH SCORE: ${this.dataManager.data.high_level}`, 18, cText, -90);
            const practiceDeaths = this.dataManager.data.practice_deaths || 0;
            this.drawTextCentered(`PRACTICE SCORE: ${this.dataManager.data.high_level_practice} | DEATHS: ${practiceDeaths}`, 18, cText, -70);
            this.drawTextCentered("You can unlock high tier skins (30+) in practice mode", 12, cBorder, -45);

            for (const btn of this.menuButtons) {
                if (btn.text === "INFO") {
                    btn.color = [60, 100, 40];
                    btn.hoverColor = [80, 130, 60];
                    btn.textColor = [150, 200, 100];
                } else if (btn.style === "red_black") {
                    btn.color = [0, 0, 0];
                    btn.hoverColor = [30, 30, 30];
                    btn.textColor = [255, 0, 0];
                } else if (btn.style === "outline") {
                    btn.textColor = [100, 150, 255];
                } else {
                    btn.textColor = [255, 200, 100];
                }
                btn.draw(this.ctx);
            }
        } else if (this.state === STATE_SHOP) {
            for (let i = 0; i < WINDOW_WIDTH; i += 40) {
                this.ctx.strokeStyle = `rgb(${cFloor.join(',')})`;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(i, 0);
                this.ctx.lineTo(i, WINDOW_HEIGHT);
                this.ctx.stroke();
            }

            const panel = {x: 100, y: 80, w: WINDOW_WIDTH - 200, h: WINDOW_HEIGHT - 160};
            this.ctx.fillStyle = `rgb(${cBg.join(',')})`;
            this.ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
            this.ctx.strokeStyle = `rgb(${cBorder.join(',')})`;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);

            this.drawTextCentered("SHOP", 40, cText, -275);
            this.drawTextCentered(`CREDITS: ${this.dataManager.data.points}`, 18, cText, -235);
            this.drawTextCentered("Skins with LVL 30+ require practice mode", 12, cBorder, 260);

            for (const btn of this.shopButtons) {
                if (btn.style === "outline") {
                    btn.textColor = cText;
                    btn.color = cBg;
                }
                btn.draw(this.ctx, 14);
            }
        } else if (this.state === STATE_GAMEOVER) {
            this.drawTextCentered("GAME OVER", 80, cLava, -50);
            this.drawTextCentered(`Level Reached: ${this.level}`, 18, cText, 20);
            this.drawTextCentered("Press SPACE for Menu or R to Restart", 18, cBorder, 60);
        } else if (this.state === STATE_INFO) {
            this.ctx.fillStyle = `rgb(${cBg.join(',')})`;
            this.ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);

            const panel = {x: 50, y: 50, w: WINDOW_WIDTH - 100, h: WINDOW_HEIGHT - 100};
            this.ctx.fillStyle = `rgb(${cBg.join(',')})`;
            this.ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
            this.ctx.strokeStyle = `rgb(${cBorder.join(',')})`;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);

            this.drawTextCentered("GAME INFO", 40, cText, -200);
            
            const infoText = `Use arrow keys or WASD to slide
Reach the green goal before the lava reaches you!
Collect cosmetics and unlock high-tier skins
Press R to restart a level and go into practice mode
Press space to pause the game
In practice mode, pausing disables lava and allows you to map out the maze
Press SPACE or ESC to go back`;
            this.drawMultilineTextCentered(infoText, 12, cText, 0, 20);

            for (const btn of this.infoButtons) {
                btn.textColor = [255, 255, 255];
                btn.draw(this.ctx);
            }
        } else if (this.state === STATE_PLAYING) {
            for (let r = 0; r < this.mazeGen.rows; r++) {
                for (let c = 0; c < this.mazeGen.cols; c++) {
                    const x = c * this.tileW + sx;
                    const y = r * this.tileH + sy;

                    if (this.grid[r][c] === 0) {
                        this.ctx.fillStyle = `rgb(${cFloor.join(',')})`;
                        this.ctx.fillRect(x, y, this.tileW, this.tileH);
                        if (quirk !== 'grid') {
                            this.ctx.strokeStyle = `rgb(${cBg.join(',')})`;
                            this.ctx.lineWidth = 1;
                            this.ctx.strokeRect(x, y, this.tileW, this.tileH);
                        }
                    } else {
                        if (quirk === 'bounce_walls') {
                            const bounce = Math.sin(Date.now() * 0.005 + (r + c) * 0.5) * 2;
                            const [px, py] = this.playerPixelPos;
                            const wallCx = c * this.tileW + this.tileW / 2;
                            const wallCy = r * this.tileH + this.tileH / 2;
                            const dist = Math.sqrt((px + this.tileW / 2 - wallCx) ** 2 + (py + this.tileH / 2 - wallCy) ** 2);
                            const push = dist < 80 ? (80 - dist) * 0.1 : 0;
                            const drawW = this.tileW + bounce + push;
                            const drawH = this.tileH + bounce + push;
                            const drawX = x - (drawW - this.tileW) / 2;
                            const drawY = y - (drawH - this.tileH) / 2;
                            this.ctx.fillStyle = `rgb(${cWall.join(',')})`;
                            this.ctx.fillRect(drawX, drawY, drawW, drawH);
                            this.ctx.strokeStyle = `rgb(${cBorder.join(',')})`;
                            this.ctx.lineWidth = 2;
                            this.ctx.strokeRect(drawX, drawY, drawW, drawH);
                        } else if (quirk === 'glitch_walls') {
                            let drawX = x, drawY = y;
                            let tempC = cWall;
                            if (Math.random() < 0.05) {
                                drawX += Math.random() * 8 - 4;
                                drawY += Math.random() * 8 - 4;
                                tempC = [Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), Math.floor(Math.random() * 256)];
                            }
                            this.ctx.fillStyle = `rgb(${tempC.join(',')})`;
                            this.ctx.fillRect(drawX, drawY, this.tileW, this.tileH);
                            this.ctx.strokeStyle = `rgb(${cBorder.join(',')})`;
                            this.ctx.lineWidth = 1;
                            this.ctx.strokeRect(drawX, drawY, this.tileW, this.tileH);
                        } else if (quirk === 'shimmer') {
                            this.ctx.fillStyle = `rgb(${cWall.join(',')})`;
                            this.ctx.fillRect(x, y, this.tileW, this.tileH);
                            this.ctx.strokeStyle = `rgb(${cBorder.join(',')})`;
                            this.ctx.lineWidth = 1;
                            this.ctx.strokeRect(x, y, this.tileW, this.tileH);

                            const shinePos = (Date.now() / 2) % (WINDOW_WIDTH + WINDOW_HEIGHT);
                            const centerVal = c * this.tileW + r * this.tileH;
                            if (Math.abs(centerVal - shinePos) < 50) {
                                this.ctx.globalAlpha = 0.6;
                                this.ctx.strokeStyle = 'white';
                                this.ctx.lineWidth = 10;
                                this.ctx.beginPath();
                                this.ctx.moveTo(x, y + this.tileH);
                                this.ctx.lineTo(x + this.tileW, y);
                                this.ctx.stroke();
                                this.ctx.globalAlpha = 1;
                            }
                        } else {
                            this.ctx.fillStyle = `rgb(${cWall.join(',')})`;
                            this.ctx.fillRect(x, y, this.tileW, this.tileH);
                            if (quirk === 'grid') {
                                this.ctx.strokeStyle = `rgb(${cBorder.join(',')})`;
                                this.ctx.lineWidth = 1;
                                this.ctx.strokeRect(x, y, this.tileW, this.tileH);
                            }
                        }
                    }

                    if (this.lavaCells.has(`${r},${c}`)) {
                        this.ctx.fillStyle = `rgb(${cLava.join(',')})`;
                        this.ctx.fillRect(x, y, this.tileW, this.tileH);
                    }

                    if (r === this.mazeGen.end[0] && c === this.mazeGen.end[1]) {
                        this.ctx.fillStyle = `rgb(${cEnd.join(',')})`;
                        this.ctx.fillRect(x, y, this.tileW, this.tileH);
                    }
                }
            }

            for (const p of this.particles) {
                p.update();
            }
            this.particles = this.particles.filter(p => p.life > 0);
            for (const p of this.particles) {
                p.draw(this.ctx, sx, sy);
            }

            this.drawPlayer(sx, sy);

            if (quirk === 'scanlines') {
                for (let y = 0; y < WINDOW_HEIGHT; y += 4) {
                    this.ctx.globalAlpha = 0.2;
                    this.ctx.fillStyle = 'rgb(0, 20, 0)';
                    this.ctx.fillRect(0, y, WINDOW_WIDTH, 2);
                    this.ctx.globalAlpha = 1;
                }
            }

            if (!this.hasStartedMoving) {
                this.drawTextCentered("PLAN ROUTE", 40, [0, 50, 150], -250);
            } else if (this.levelFrameCount < this.lavaStartDelay) {
                const pct = (this.lavaStartDelay - this.levelFrameCount) / this.lavaStartDelay;
                const barW = 400;
                this.ctx.fillStyle = 'rgb(100, 100, 100)';
                this.ctx.fillRect(WINDOW_WIDTH / 2 - barW / 2, 30, barW, 10);
                this.ctx.fillStyle = `rgb(${cLava.join(',')})`;
                this.ctx.fillRect(WINDOW_WIDTH / 2 - barW / 2, 30, barW * pct, 10);
            } else {
                this.drawTextCentered("RUN!", 40, [180, 50, 50], -250);
            }

            // Draw level display
            this.ctx.fillStyle = 'rgb(0, 50, 150)';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(String(this.level), 20, 20);

            // Draw practice mode indicator
            if (this.practice_mode) {
                this.ctx.fillStyle = `rgb(${cLava.join(',')})`;
                this.ctx.font = 'bold 16px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.textBaseline = 'top';
                this.ctx.fillText("[PRACTICE MODE]", 20, 65);
            }
            // Draw pause overlay and indicator
            if (this.isPaused) {
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);
                
                if (this.practice_mode) {
                    this.ctx.fillStyle = 'rgb(200, 150, 255)';
                    this.ctx.font = 'bold 40px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText("practice ghost", WINDOW_WIDTH / 2, 180);
                } else {
                    this.drawTextCentered("PAUSED", 60, [200, 200, 200], 0);
                }
                this.drawTextCentered("ESC to exit", 16, [150, 150, 150], 100);
            }
        }
    }

    gameLoop() {
        const now = Date.now();
        const delta = now - this.lastTime;
        this.lastTime = now;

        if (this.state === STATE_PLAYING) {
            this.updatePlayerMovement();
            this.updateMisc();
            this.updateLava();
            this.checkCollisions();

            if (!this.isPaused && !this.isMoving && this.playerGridPos[0] === this.mazeGen.end[0] &&
                this.playerGridPos[1] === this.mazeGen.end[1]) {
                if (!this.practice_mode) {
                    this.dataManager.data.points += this.level * 10;
                }
                this.dataManager.save();
                this.level++;
                this.gameStartTime = Date.now();
                this.initLevel();
            }
        }

        this.draw();

        setTimeout(() => this.gameLoop(), 1000 / FPS);
    }
}

// Start the game
new Game();
