/* =====================
   MAIN GAME CLASS
   Core game logic
   ===================== */
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
       
        this.dataManager = new DataManager();
        if (this.dataManager.resetNotice) {
            alert(this.dataManager.resetNotice);
        }
        if (!Array.isArray(this.dataManager.data.unlocked_gacha_skins)) {
            this.dataManager.data.unlocked_gacha_skins = [];
        }
        if (!Array.isArray(this.dataManager.data.gacha_items)) {
            this.dataManager.data.gacha_items = [];
        }
        if (!Array.isArray(this.dataManager.data.battle_team)) {
            this.dataManager.data.battle_team = [];
        }
        if (!Number.isFinite(this.dataManager.data.battle_level)) {
            this.dataManager.data.battle_level = 1;
        }
       
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
        this.missionButtons = [];
        this.battleButtons = [];
        this.missions = [];
        this.missionTemplates = this.buildMissionTemplates();
        this.missionsTab = "missions";
        this.boostButtons = [];
        this.boostTemplates = this.buildBoostTemplates();
        this.boosts = Array.isArray(this.dataManager.data.boosts) ? this.dataManager.data.boosts : [];
        this.equippedBoosts = Array.isArray(this.dataManager.data.equipped_boosts) ? this.dataManager.data.equipped_boosts : [];
        this.gachaSpend = 10;
        this.mergeSpend = 0;
        this.itemMergeSpend = 0;
        this.isDraggingGachaSlider = false;
        this.activeSlider = null;
        this.gachaAnim = {
            active: false,
            startAt: 0,
            revealAt: 0,
            endAt: 0,
            revealed: false,
            boostList: [],
            skinKey: null,
            itemList: [],
            rewardType: "boost",
            spend: 0
        };
        this.gachaItems = Array.isArray(this.dataManager.data.gacha_items) ? this.dataManager.data.gacha_items : [];
        this.selectedGachaItemIds = new Set();
        this.battleTeam = Array.isArray(this.dataManager.data.battle_team) ? this.dataManager.data.battle_team : [];
        this.battleResult = "";
        this.battleLevel = this.dataManager.data.battle_level || 1;
        this.battleTab = "team";
        this.battleState = {
            inProgress: false,
            startAt: 0,
            duration: 4000,
            enemies: [],
            resolved: false,
            pendingContinue: false,
            nextBattleAt: 0,
            turnIndex: 0,
            turnStartedAt: 0,
            turnDuration: 900,
            playerHealths: null,
            playerMaxHealths: null,
            enemyHealths: null,
            enemyMaxHealths: null,
            autoTarget: false,
            playerTargets: [0, 0, 0],
            awaitingTarget: false,
            pendingSkinIndex: 0,
            attackAnim: {active: false, startAt: 0, duration: 380, attackerType: "player", attackerIndex: 0, defenderType: "enemy", defenderIndex: 0}
        };
        this.battleSelect = {
            active: false,
            slotIndex: 0,
            type: "skin",
            itemIndex: 0
        };
        this.ticketPickupSpawns = [];
        this.ticketPickups = [];
        this.mergeAnim = {
            active: false,
            startAt: 0,
            duration: 600,
            fromIndexMap: {},
            originIndex: 0
        };
        this.selectedBoostIds = new Set();

        this.shakeOffset = [0, 0];
        this.lastMoveDir = [0, 0];
        this.gameStartTime = Date.now();
        
        this.isPaused = false;
        this.pausedPlayerGridPos = null;
        this.pausedPlayerPixelPos = null;
        this.pausedLavaCells = null;
        this.practiceGhostTrace = [];
        this.lavaFreezePickups = [];
        this.lavaFreezePickupSpawns = [];
        this.lavaFrozenUntil = 0;
        this.pauseStartedAt = null;

        this.setupInput();
        this.createMenuUI();
        this.initMissions();
        this.initBoosts();
        this.initBattleTeam();
        this.initLevel();
       
        this.lastTime = Date.now();
        this.gameLoop();
    }

    setupInput() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.activeSlider && ((this.state === STATE_MISSIONS && ["gacha", "gacha_items", "inventory"].includes(this.missionsTab) && (!this.gachaAnim.active || this.missionsTab === "inventory"))
                || (this.state === STATE_BATTLE && ["item_gacha", "items"].includes(this.battleTab)))) {
                this.updateGachaSliderFromX(x, this.activeSlider);
            }
           
            if ([STATE_MENU, STATE_SHOP, STATE_INFO, STATE_MISSIONS, STATE_GAMEOVER, STATE_BATTLE].includes(this.state)) {
                if (this.state === STATE_MISSIONS && this.gachaAnim.active) return;
                const btnList = this.state === STATE_MENU
                    ? this.menuButtons
                    : (this.state === STATE_INFO
                        ? this.infoButtons
                        : (this.state === STATE_MISSIONS
                            ? this.missionButtons
                            : (this.state === STATE_BATTLE
                                ? this.battleButtons
                                : this.shopButtons)));
                btnList.forEach(btn => btn.checkHover(x, y));
            }
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
           
            if ([STATE_MENU, STATE_SHOP, STATE_INFO, STATE_MISSIONS, STATE_GAMEOVER, STATE_BATTLE].includes(this.state)) {
                const btnList = this.state === STATE_MENU
                    ? this.menuButtons
                    : (this.state === STATE_INFO
                        ? this.infoButtons
                        : (this.state === STATE_MISSIONS
                            ? this.missionButtons
                            : (this.state === STATE_BATTLE
                                ? this.battleButtons
                                : this.shopButtons)));
                if (this.state === STATE_BATTLE && this.battleState.inProgress) {
                    btnList.filter(btn => ["LEAVE", "AUTO TARGET: ON", "AUTO TARGET: OFF"].includes(btn.text))
                        .forEach(btn => btn.checkClick(x, y));
                } else {
                    btnList.forEach(btn => btn.checkClick(x, y));
                }
            }

            if (this.state === STATE_MISSIONS && !this.gachaAnim.active) {
                this.handleMissionListClick(x, y);
            } else if (this.state === STATE_BATTLE && !this.battleState.inProgress && !this.battleSelect.active) {
                this.handleBattleListClick(x, y);
            } else if (this.state === STATE_BATTLE && this.battleState.inProgress) {
                this.handleBattleFightClick(x, y);
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            const inMissionTabs = this.state === STATE_MISSIONS && ["gacha", "gacha_items", "inventory"].includes(this.missionsTab);
            const inBattleTabs = this.state === STATE_BATTLE && ["item_gacha", "items"].includes(this.battleTab);
            if (!inMissionTabs && !inBattleTabs) return;
            if (this.state === STATE_MISSIONS && this.gachaAnim.active && this.missionsTab !== "inventory") return;
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (this.state === STATE_BATTLE ? this.battleTab === "item_gacha" : true) {
                const slider = this.state === STATE_BATTLE ? this.getBattleGachaSliderRect() : this.getGachaSliderRect();
                if (x >= slider.x && x <= slider.x + slider.w && y >= slider.y - 8 && y <= slider.y + slider.h + 8) {
                    this.isDraggingGachaSlider = true;
                    if (this.state === STATE_BATTLE) {
                        this.activeSlider = "gacha";
                    } else {
                        this.activeSlider = this.missionsTab === "inventory" ? "merge" : "gacha";
                    }
                    this.updateGachaSliderFromX(x, this.activeSlider);
                    return;
                }
            }
            if (this.state === STATE_MISSIONS && this.missionsTab === "gacha_items") {
                const mergeSlider = this.getGachaItemMergeSliderRect();
                if (x >= mergeSlider.x && x <= mergeSlider.x + mergeSlider.w && y >= mergeSlider.y - 8 && y <= mergeSlider.y + mergeSlider.h + 8) {
                    this.isDraggingGachaSlider = true;
                    this.activeSlider = "item_merge";
                    this.updateGachaSliderFromX(x, this.activeSlider);
                }
            } else if (this.state === STATE_BATTLE && this.battleTab === "items") {
                const mergeSlider = this.getBattleItemMergeSliderRect();
                if (x >= mergeSlider.x && x <= mergeSlider.x + mergeSlider.w && y >= mergeSlider.y - 8 && y <= mergeSlider.y + mergeSlider.h + 8) {
                    this.isDraggingGachaSlider = true;
                    this.activeSlider = "item_merge";
                    this.updateGachaSliderFromX(x, this.activeSlider);
                }
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDraggingGachaSlider = false;
            this.activeSlider = null;
        });

        document.addEventListener('keydown', (e) => {
            if (this.state === STATE_MENU && e.key === ' ') {
                this.startGame();
            } else if (this.state === STATE_INFO && (e.key === ' ' || e.key === 'Escape')) {
                this.state = STATE_MENU;
                this.clearPracticeGhostTrace();
            } else if (this.state === STATE_MISSIONS && (e.key === ' ' || e.key === 'Escape')) {
                this.state = STATE_MENU;
                this.clearPracticeGhostTrace();
            } else if (this.state === STATE_GAMEOVER && e.key === ' ') {
                this.state = STATE_MENU;
                this.clearPracticeGhostTrace();
            } else if (this.state === STATE_GAMEOVER && (e.key === 'r' || e.key === 'R') && e.shiftKey) {
                // Reroll level: regenerate maze, enter practice mode
                this.rerollLevel();
            } else if (this.state === STATE_GAMEOVER && (e.key === 'r' || e.key === 'R')) {
                this.restartLevel();
            } else if (this.state === STATE_PLAYING && e.key === 'Escape') {
                if (this.isPaused) {
                    this.isPaused = false;
                    this.state = STATE_MENU;
                    this.clearPracticeGhostTrace();
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
                        if (this.pauseStartedAt) {
                            const pausedMs = Date.now() - this.pauseStartedAt;
                            this.lavaFrozenUntil += pausedMs;
                            this.pauseStartedAt = null;
                        }
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
                    this._appendPracticeGhostPointFromPixel(this.moveStartPos);

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
            this.pauseStartedAt = Date.now();
            if (this.practice_mode) {
                this.clearPracticeGhostTrace();
            }
        } else {
            this.isPaused = false;
            this.playerGridPos = [...this.pausedPlayerGridPos];
            this.playerPixelPos = [...this.pausedPlayerPixelPos];
            this.lavaCells = new Set(this.pausedLavaCells);
            this.pausedPlayerGridPos = null;
            this.pausedPlayerPixelPos = null;
            this.pausedLavaCells = null;
            if (this.pauseStartedAt) {
                const pausedMs = Date.now() - this.pauseStartedAt;
                this.lavaFrozenUntil += pausedMs;
                this.pauseStartedAt = null;
            }
        }
    }

    _appendPracticeGhostPointFromPixel(pxPos) {
        if (!this.practice_mode || !this.isPaused) return;
        const cx = pxPos[0] + this.tileW / 2;
        const cy = pxPos[1] + this.tileH / 2;
        const last = this.practiceGhostTrace[this.practiceGhostTrace.length - 1];
        if (!last || last[0] !== cx || last[1] !== cy) {
            this.practiceGhostTrace.push([cx, cy]);
        }
    }

    clearPracticeGhostTrace() {
        this.practiceGhostTrace = [];
    }

    isPointInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
    }

    getMissionPanelRect() {
        return {x: 40, y: 40, w: WINDOW_WIDTH - 80, h: WINDOW_HEIGHT - 80};
    }

    getBattlePanelRect() {
        return {x: 60, y: 60, w: WINDOW_WIDTH - 120, h: WINDOW_HEIGHT - 120};
    }

    getGachaItemListLayout() {
        const panel = this.getMissionPanelRect();
        const listX = panel.x + 40;
        const listY = panel.y + 350;
        const rowH = 34;
        const items = this.gachaItems.slice(-6).reverse();
        return {panel, listX, listY, rowH, items};
    }

    getBattleGachaItemListLayout() {
        const panel = this.getBattlePanelRect();
        const listX = panel.x + 40;
        const listY = panel.y + 230;
        const rowH = 34;
        const items = this.gachaItems.slice(-6).reverse();
        return {panel, listX, listY, rowH, items};
    }

    getBoostListLayout() {
        const panel = this.getMissionPanelRect();
        const listX = panel.x + 20;
        const listY = panel.y + 230;
        const rowH = 52;
        const listW = panel.w - 40;
        const boosts = this.boosts.slice(0, 6);
        return {panel, listX, listY, rowH, listW, boosts};
    }

    toggleGachaItemSelection(itemId) {
        if (this.selectedGachaItemIds.has(itemId)) this.selectedGachaItemIds.delete(itemId);
        else this.selectedGachaItemIds.add(itemId);
        if (this.state === STATE_MISSIONS) {
            this.createMissionUI();
        } else if (this.state === STATE_BATTLE) {
            this.createBattleUI();
        }
    }

    toggleBoostSelection(boostId) {
        if (this.selectedBoostIds.has(boostId)) this.selectedBoostIds.delete(boostId);
        else this.selectedBoostIds.add(boostId);
        if (this.state === STATE_MISSIONS) {
            this.createMissionUI();
        }
    }

    handleMissionListClick(x, y) {
        if (this.missionsTab === "gacha_items") {
            const {panel, listX, listY, rowH, items} = this.getGachaItemListLayout();
            const sellBtnX = panel.x + panel.w - 140;
            const sellBtnW = 80;
            const sellBtnH = 22;
            const rowMaxX = panel.x + panel.w - 160;
            for (let i = 0; i < items.length; i++) {
                const rowY = listY + i * rowH;
                const rowRect = {x: listX - 6, y: rowY - 2, w: rowMaxX - (listX - 6), h: rowH};
                const sellRect = {x: sellBtnX, y: rowY, w: sellBtnW, h: sellBtnH};
                if (this.isPointInRect(x, y, sellRect)) return;
                if (this.isPointInRect(x, y, rowRect)) {
                    this.toggleGachaItemSelection(items[i].id);
                    return;
                }
            }
        } else if (this.missionsTab === "inventory" && !this.mergeAnim.active) {
            const {listX, listY, rowH, listW, boosts} = this.getBoostListLayout();
            for (let i = 0; i < boosts.length; i++) {
                const rowY = listY + i * rowH;
                const rowRect = {x: listX, y: rowY, w: listW, h: rowH};
                const equipRect = {x: listX + listW - 210, y: rowY + 6, w: 90, h: 26};
                const sellRect = {x: listX + listW - 110, y: rowY + 6, w: 90, h: 26};
                if (this.isPointInRect(x, y, equipRect) || this.isPointInRect(x, y, sellRect)) return;
                if (this.isPointInRect(x, y, rowRect)) {
                    this.toggleBoostSelection(boosts[i].id);
                    return;
                }
            }
        }
    }

    createMenuUI() {
        const btnW = 200, btnH = 50;
        const cx = WINDOW_WIDTH / 2 - btnW / 2;
        const startY = 320;
        const spacing = 60;

        this.menuButtons = [
            new Button("🎟️", 20, 20, 48, 48, () => this.openMissions(), "outline"),
            new Button("🥊", 76, 20, 48, 48, () => this.openBattle(), "outline"),
            new Button("START", cx, startY, btnW, btnH, () => this.startGame(), "primary"),
            new Button("PRACTICE", cx, startY + spacing, btnW, btnH, () => this.startPractice(), "red_black"),
            new Button("SHOP", cx, startY + spacing * 2, btnW, btnH, () => this.openShop(), "outline"),
            new Button("INFO", cx, startY + spacing * 3, btnW, btnH, () => { this.state = STATE_INFO; }, "outline")
        ];
        
        this.infoButtons = [
            new Button("BACK", WINDOW_WIDTH / 2 - 100, WINDOW_HEIGHT - 80, 200, 50, () => { this.state = STATE_MENU; this.clearPracticeGhostTrace(); }, "primary")
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
        this.clearPracticeGhostTrace();
    }

    openMissions() {
        this.state = STATE_MISSIONS;
        if (!this.missionsTab) this.missionsTab = "missions";
        this.createMissionUI();
        this.clearPracticeGhostTrace();
    }

    openBattle() {
        this.state = STATE_BATTLE;
        this.battleSelect.active = false;
        if (!this.battleTab) this.battleTab = "team";
        this.createBattleUI();
        this.clearPracticeGhostTrace();
    }

    buildMissionTemplates() {
        return [
            {
                type: "complete_levels",
                title: "Level Climber",
                difficultyTargets: {easy: [2, 4], medium: [5, 7], hard: [8, 12], epic: [13, 18]},
                description: (t) => `Complete ${t} levels`,
                rewardFactor: (t) => t * 2
            },
            {
                type: "reach_level",
                title: "New Heights",
                difficultyTargets: {easy: [5, 8], medium: [10, 14], hard: [16, 22], epic: [25, 35]},
                description: (t) => `Reach level ${t}`,
                rewardFactor: (t) => t
            },
            {
                type: "collect_freeze",
                title: "Ice Collector",
                difficultyTargets: {easy: [1, 2], medium: [3, 5], hard: [6, 8], epic: [9, 12]},
                description: (t) => `Collect ${t} freeze pickups`,
                rewardFactor: (t) => t * 3
            },
            {
                type: "slide_moves",
                title: "Slide Master",
                difficultyTargets: {easy: [10, 20], medium: [30, 50], hard: [60, 100], epic: [120, 180]},
                description: (t) => `Make ${t} slides`,
                rewardFactor: (t) => Math.round(t / 4)
            },
            {
                type: "play_time",
                title: "Time On Ice",
                difficultyTargets: {easy: [60, 120], medium: [180, 300], hard: [420, 600], epic: [720, 900]},
                description: (t) => `Play for ${t} seconds`,
                rewardFactor: (t) => Math.round(t / 30)
            },
            {
                type: "practice_levels",
                title: "Practice Pays",
                difficultyTargets: {easy: [2, 3], medium: [4, 6], hard: [7, 10], epic: [12, 16]},
                description: (t) => `Complete ${t} practice levels`,
                rewardFactor: (t) => t * 2
            },
            {
                type: "styled_slides",
                title: "Style Points",
                difficultyTargets: {easy: [15, 25], medium: [40, 60], hard: [80, 120], epic: [150, 220]},
                description: (t) => `Make ${t} slides`,
                rewardFactor: (t) => Math.round(t / 5),
                requirementOptions: this.getAllCosmeticRequirements()
            },
            {
                type: "styled_time",
                title: "Iconic Chill",
                difficultyTargets: {easy: [60, 120], medium: [180, 300], hard: [420, 600], epic: [720, 900]},
                description: (t) => `Play for ${t} seconds`,
                rewardFactor: (t) => Math.round(t / 35),
                requirementOptions: this.getAllCosmeticRequirements()
            }
        ];
    }

    initMissions() {
        const saved = this.dataManager.data.missions;
        if (Array.isArray(saved) && saved.length) {
            this.missions = saved.slice(0, 3);
            while (this.missions.length < 3) {
                const typesInUse = this.missions.map(m => m.type);
                this.missions.push(this.generateMission(typesInUse));
            }
            this.saveMissions();
        } else {
            this.missions = this.generateMissionSet(3);
            this.saveMissions();
        }
    }

    buildBoostTemplates() {
        return {
            lava_slow: {
                name: "Lava Slow",
                description: (lvl) => `Lava spreads slower (Lv ${lvl})`
            },
            lava_delay: {
                name: "Lava Delay",
                description: (lvl) => `Longer lava start (Lv ${lvl})`
            },
            freeze_count: {
                name: "Extra Freezes",
                description: (lvl) => `More freeze pickups (Lv ${lvl})`
            },
            freeze_duration: {
                name: "Freeze Time",
                description: (lvl) => `Longer freeze time (Lv ${lvl})`
            },
            ticket_luck: {
                name: "Ticket Luck",
                description: (lvl) => `Higher ticket spawn + value (Lv ${lvl})`
            }
        };
    }

    initBoosts() {
        if (!Array.isArray(this.boosts)) this.boosts = [];
        if (!Array.isArray(this.equippedBoosts)) this.equippedBoosts = [];
        this.equippedBoosts = this.equippedBoosts.filter(id => this.boosts.some(b => b.id === id));
        this.saveBoosts();
    }

    saveGachaItems() {
        this.dataManager.data.gacha_items = this.gachaItems;
        this.dataManager.save();
    }

    getUnlockedSkinsList() {
        const unlocked = [];
        for (const [key, skin] of Object.entries(SKINS)) {
            if (!skin) continue;
            if (skin.gacha) {
                if (this.dataManager.data.unlocked_gacha_skins.includes(key)) unlocked.push(key);
            } else if (skin.level_req < 30) {
                if (this.dataManager.data.high_level >= skin.level_req) unlocked.push(key);
            } else {
                if (Math.max(this.dataManager.data.high_level, this.dataManager.data.high_level_practice) >= skin.level_req) {
                    unlocked.push(key);
                }
            }
        }
        if (!unlocked.includes("default")) unlocked.unshift("default");
        return unlocked;
    }

    getOwnedGachaItemKeys() {
        return this.gachaItems.map(item => item.type).filter(type => type && GACHA_ITEMS[type]);
    }

    rollGachaItem(spend) {
        const pool = Object.keys(GACHA_ITEMS);
        const itemKey = pool[Math.floor(Math.random() * pool.length)] || "charm_spark";
        const level = this.getGachaBoostLevel(spend);
        return {
            id: `${Date.now()}_${Math.floor(Math.random() * 100000)}`,
            type: itemKey,
            level
        };
    }

    getExpectedGachaItemValue(spend) {
        const items = Object.values(GACHA_ITEMS);
        const avgPower = items.length ? items.reduce((sum, item) => sum + item.power, 0) / items.length : 1;
        const probs = this.getGachaBoostProbabilities(spend);
        const expectedLevel = probs.reduce((sum, p, idx) => sum + p * (idx + 1), 0);
        return Math.max(1, avgPower * expectedLevel);
    }

    rollGachaItemRewards(spend) {
        const expectedValue = this.getExpectedGachaItemValue(spend);
        const targetRatio = this.getGachaTargetReturnRatio(spend);
        const chance = Math.min(0.98, (targetRatio * spend) / expectedValue);
        if (Math.random() > chance) return [];
        return [this.rollGachaItem(spend)];
    }

    spinGachaItem(amount) {
        const tickets = this.dataManager.data.tickets || 0;
        const spend = Math.max(0, Math.min(amount, tickets));
        if (spend <= 0 || this.gachaAnim.active) return;
        this.dataManager.data.tickets = tickets - spend;
        this.dataManager.save();
        if (this.dataManager.data.tickets <= 0) {
            this.gachaSpend = 0;
        } else {
            this.gachaSpend = Math.min(this.gachaSpend, this.dataManager.data.tickets);
        }

        const itemList = this.rollGachaItemRewards(spend);
        this.startGachaAnimation(spend, {itemList, rewardType: "item"});
    }

    getGachaItemSellValue(itemKey, level = 1) {
        const safeLevel = Math.max(1, level || 1);
        return Math.max(3, Math.round(3 + safeLevel * 4));
    }

    sellGachaItem(itemId) {
        const idx = this.gachaItems.findIndex(item => item.id === itemId);
        if (idx === -1) return;
        const item = this.gachaItems[idx];
        const value = this.getGachaItemSellValue(item.type, item.level || 1);
        this.dataManager.data.tickets = (this.dataManager.data.tickets || 0) + value;
        this.gachaItems.splice(idx, 1);
        this.selectedGachaItemIds.delete(itemId);
        this.saveGachaItems();
        this.createMissionUI();
    }

    mergeGachaItems() {
        let merged = false;
        const selectedIds = new Set(this.selectedGachaItemIds);
        const candidates = selectedIds.size
            ? this.gachaItems.filter(item => selectedIds.has(item.id))
            : [];
        if (candidates.length < 2) return;
        const tickets = this.dataManager.data.tickets || 0;
        const spend = Math.max(0, Math.min(this.itemMergeSpend || 0, tickets));
        const byType = {};
        for (const item of candidates) {
            if (!byType[item.type]) byType[item.type] = [];
            byType[item.type].push(item);
        }
        let mergeCount = 0;
        for (const type of Object.keys(byType)) {
            mergeCount += Math.floor(byType[type].length / 2);
        }
        const bonusPerMerge = mergeCount > 0 ? (spend / mergeCount) : 0;

        const newItems = [];
        const usedIds = new Set();
        for (const type of Object.keys(byType)) {
            const group = byType[type].slice().sort((a, b) => (b.level || 1) - (a.level || 1));
            while (group.length >= 2) {
                const a = group.shift();
                const b = group.shift();
                if (usedIds.has(a.id) || usedIds.has(b.id)) continue;
                usedIds.add(a.id);
                usedIds.add(b.id);
                const newLevel = this.rollMergedBoostLevel([a.level || 1, b.level || 1], bonusPerMerge);
                newItems.push({id: `${Date.now()}_${Math.floor(Math.random() * 100000)}`, type, level: newLevel});
                merged = true;
            }
        }

        if (merged) {
            this.gachaItems = this.gachaItems.filter(it => !usedIds.has(it.id));
            this.gachaItems.push(...newItems);
            this.selectedGachaItemIds.clear();
            if (spend > 0) {
                this.dataManager.data.tickets = tickets - spend;
                this.dataManager.save();
            }
            if (this.dataManager.data.tickets <= 0) {
                this.itemMergeSpend = 0;
            } else {
                this.itemMergeSpend = Math.min(this.itemMergeSpend, this.dataManager.data.tickets);
            }
            this.saveGachaItems();
            this.createMissionUI();
            if (this.state === STATE_BATTLE) {
                this.createBattleUI();
            }
        }
    }

    saveBoosts() {
        this.dataManager.data.boosts = this.boosts;
        this.dataManager.data.equipped_boosts = this.equippedBoosts;
        this.dataManager.save();
    }

    getBoostEffects() {
        const effects = {
            lavaIntervalMultiplier: 1,
            lavaDelayBonus: 0,
            freezeCountBonus: 0,
            freezeDurationMultiplier: 1,
            ticketSpawnBonus: 0,
            ticketValueBonus: 0
        };
        for (const id of this.equippedBoosts) {
            const boost = this.boosts.find(b => b.id === id);
            if (!boost) continue;
            const lvl = boost.level || 1;
            if (boost.type === "lava_slow") {
                effects.lavaIntervalMultiplier += 0.08 * lvl;
            } else if (boost.type === "lava_delay") {
                effects.lavaDelayBonus += 15 * lvl;
            } else if (boost.type === "freeze_count") {
                effects.freezeCountBonus += Math.max(1, Math.floor(lvl / 2));
            } else if (boost.type === "freeze_duration") {
                effects.freezeDurationMultiplier += 0.12 * lvl;
            } else if (boost.type === "ticket_luck") {
                effects.ticketSpawnBonus += 0.02 * lvl;
                effects.ticketValueBonus += 0.12 * lvl;
            }
        }
        return effects;
    }

    getTicketPickupValue() {
        const boostEffects = this.getBoostEffects();
        const levelValue = 1 + Math.floor(this.level / 5);
        const bonus = Math.round(levelValue * boostEffects.ticketValueBonus);
        return Math.max(1, levelValue + bonus);
    }

    getBoostName(boost) {
        const template = this.boostTemplates[boost.type];
        const base = template ? template.name : "Boost";
        return `${base} Lv.${boost.level}`;
    }

    getBoostDescription(boost) {
        const template = this.boostTemplates[boost.type];
        if (!template) return `Lv ${boost.level}`;
        return template.description(boost.level);
    }

    getGachaSliderRect() {
        const panel = {x: 40, y: 40, w: WINDOW_WIDTH - 80, h: WINDOW_HEIGHT - 80};
        return {x: panel.x + 60, y: panel.y + 150, w: panel.w - 120, h: 10};
    }

    getBattleGachaSliderRect() {
        const panel = this.getBattlePanelRect();
        return {x: panel.x + 60, y: panel.y + 150, w: panel.w - 120, h: 10};
    }

    getGachaItemMergeSliderRect() {
        const panel = {x: 40, y: 40, w: WINDOW_WIDTH - 80, h: WINDOW_HEIGHT - 80};
        return {x: panel.x + 60, y: panel.y + 300, w: panel.w - 120, h: 10};
    }

    getBattleItemMergeSliderRect() {
        const panel = this.getBattlePanelRect();
        return {x: panel.x + 60, y: panel.y + 175, w: panel.w - 120, h: 10};
    }

    updateGachaSliderFromX(x, sliderType = null) {
        const tickets = this.dataManager.data.tickets || 0;
        const type = sliderType || this.activeSlider || "gacha";
        const slider = type === "item_merge"
            ? (this.state === STATE_BATTLE ? this.getBattleItemMergeSliderRect() : this.getGachaItemMergeSliderRect())
            : (this.state === STATE_BATTLE ? this.getBattleGachaSliderRect() : this.getGachaSliderRect());
        const isMerge = this.state === STATE_MISSIONS && this.missionsTab === "inventory" && type === "merge";
        const isItemMerge = (this.state === STATE_MISSIONS && this.missionsTab === "gacha_items" && type === "item_merge")
            || (this.state === STATE_BATTLE && this.battleTab === "items" && type === "item_merge");
        const minValue = (isMerge || isItemMerge) ? 0 : (tickets > 0 ? 1 : 0);
        const maxValue = (isMerge || isItemMerge) ? Math.max(0, tickets) : Math.max(1, tickets);
        const pct = Math.max(0, Math.min(1, (x - slider.x) / slider.w));
        const value = Math.round(minValue + pct * (maxValue - minValue));
        if (isMerge) {
            this.mergeSpend = Math.max(minValue, Math.min(value, maxValue));
        } else if (isItemMerge) {
            this.itemMergeSpend = Math.max(minValue, Math.min(value, maxValue));
        } else {
            this.gachaSpend = Math.max(minValue, Math.min(value, maxValue));
        }
    }

    spinGacha(amount) {
        const tickets = this.dataManager.data.tickets || 0;
        const spend = Math.max(0, Math.min(amount, tickets));
        if (spend <= 0 || this.gachaAnim.active) return;
        this.dataManager.data.tickets = tickets - spend;
        this.dataManager.save();

        if (this.dataManager.data.tickets <= 0) {
            this.gachaSpend = 0;
        } else {
            this.gachaSpend = Math.min(this.gachaSpend, this.dataManager.data.tickets);
        }

        const reward = this.rollGachaRewards(spend);
        this.startGachaAnimation(spend, reward);
    }

    startGachaAnimation(spend, reward) {
        const now = Date.now();
        this.gachaAnim = {
            active: true,
            startAt: now,
            revealAt: now + 900,
            endAt: now + 2300,
            revealed: false,
            boostList: Array.isArray(reward?.boostList) ? reward.boostList : [],
            skinKey: reward?.skinKey || null,
            itemList: Array.isArray(reward?.itemList) ? reward.itemList : [],
            rewardType: reward?.rewardType || (reward?.itemList ? "item" : (reward?.skinKey ? "skin" : "boost")),
            spend
        };
    }

    updateGachaAnimation() {
        if (!this.gachaAnim.active) return;
        const now = Date.now();
        if (!this.gachaAnim.revealed && now >= this.gachaAnim.revealAt) {
            this.gachaAnim.revealed = true;
            if (this.gachaAnim.skinKey) {
                if (!this.dataManager.data.unlocked_gacha_skins.includes(this.gachaAnim.skinKey)) {
                    this.dataManager.data.unlocked_gacha_skins.push(this.gachaAnim.skinKey);
                }
                this.dataManager.save();
                this.createMissionUI();
                if (this.state === STATE_BATTLE) {
                    this.createBattleUI();
                }
            }
            if (this.gachaAnim.boostList.length) {
                for (const boost of this.gachaAnim.boostList) {
                    this.addBoost(boost);
                }
                this.saveBoosts();
                this.createMissionUI();
                if (this.state === STATE_BATTLE) {
                    this.createBattleUI();
                }
            }
            if (this.gachaAnim.itemList.length) {
                this.gachaItems.push(...this.gachaAnim.itemList);
                this.saveGachaItems();
                this.createMissionUI();
                if (this.state === STATE_BATTLE) {
                    this.createBattleUI();
                }
            }
        }
        if (now >= this.gachaAnim.endAt) {
            this.gachaAnim.active = false;
            this.gachaAnim.boostList = [];
            this.gachaAnim.skinKey = null;
            this.gachaAnim.itemList = [];
            this.gachaAnim.rewardType = "boost";
            this.gachaAnim.spend = 0;
            this.gachaAnim.revealed = false;
        }
    }

    getUnownedGachaSkins() {
        return Object.keys(SKINS).filter(key => {
            const skin = SKINS[key];
            return skin && skin.gacha && !this.dataManager.data.unlocked_gacha_skins.includes(key);
        });
    }

    rollGachaRewards(spend) {
        const unowned = this.getUnownedGachaSkins();
        const skinChance = Math.min(0.25, 0.04 + Math.log10(spend + 1) * 0.05);
        if (unowned.length && Math.random() < skinChance) {
            const key = unowned[Math.floor(Math.random() * unowned.length)];
            return {skinKey: key, boostList: []};
        }
        return {skinKey: null, boostList: this.rollGachaBoosts(spend)};
    }


    getBoostSellValue(level) {
        return Math.max(2, Math.round(3 + (level || 1) * 4));
    }

    getGachaBoostProbabilities(spend) {
        const power = Math.min(1, Math.log10(spend + 1) / 2);
        const thresholds = [0.55, 0.82, 0.94, 0.985];
        const bonus = power * 0.25;
        const adj = thresholds.map(t => Math.max(0.15, t - bonus));

        const p1 = Math.max(0, Math.min(1, adj[0]));
        const p2 = Math.max(0, Math.min(1, adj[1] - adj[0]));
        const p3 = Math.max(0, Math.min(1, adj[2] - adj[1]));
        const p4 = Math.max(0, Math.min(1, adj[3] - adj[2]));
        const p5 = Math.max(0, 1 - adj[3]);
        return [p1, p2, p3, p4, p5];
    }

    getExpectedGachaBoostValue(spend) {
        const probs = this.getGachaBoostProbabilities(spend);
        const levels = [1, 2, 3, 4, 5];
        let expected = 0;
        for (let i = 0; i < levels.length; i++) {
            expected += probs[i] * this.getBoostSellValue(levels[i]);
        }
        return expected;
    }

    getGachaTargetReturnRatio(spend) {
        const safeSpend = Math.max(0, spend);
        const ratio = 1 - (10 / (safeSpend + 10));
        return Math.max(0, Math.min(0.999, ratio));
    }

    rollGachaBoosts(spend) {
        const expectedBoostValue = this.getExpectedGachaBoostValue(spend);
        if (expectedBoostValue <= 0) return [];

        const targetRatio = this.getGachaTargetReturnRatio(spend);
        const chance = Math.min(0.98, (targetRatio * spend) / expectedBoostValue);
        if (Math.random() > chance) return [];

        const types = Object.keys(this.boostTemplates);
        const level = this.getGachaBoostLevel(spend);
        const type = types[Math.floor(Math.random() * types.length)];
        return [{type, level}];
    }

    getGachaBoostLevel(spend) {
        const power = Math.min(1, Math.log10(spend + 1) / 2);
        const roll = Math.random();
        const thresholds = [0.55, 0.82, 0.94, 0.985];
        const bonus = power * 0.25;
        const adj = thresholds.map(t => Math.max(0.15, t - bonus));
        let baseLevel = 1;
        if (roll < adj[0]) baseLevel = 1;
        else if (roll < adj[1]) baseLevel = 2;
        else if (roll < adj[2]) baseLevel = 3;
        else if (roll < adj[3]) baseLevel = 4;
        else baseLevel = 5;

        const extra = Math.max(0, Math.floor(Math.log10(spend + 1)) - 1);
        const minLevel = 1 + Math.floor(Math.log10(spend + 1));
        return Math.max(baseLevel + extra, minLevel);
    }

    addBoost({type, level}) {
        this.boosts.push({
            id: `${Date.now()}_${Math.floor(Math.random() * 100000)}`,
            type,
            level: Math.max(1, Math.min(level || 1, 10))
        });
    }

    mergeBoosts(selectedIds = null, ticketSpend = 0) {
        const oldBoosts = this.boosts.slice();
        const mergeSteps = [];
        const selectedSet = selectedIds ? new Set(selectedIds) : null;
        const candidates = selectedSet ? this.boosts.filter(b => selectedSet.has(b.id)) : [];

        if (selectedSet && candidates.length < 2) {
            return {merged: false, oldBoosts, newBoosts: this.boosts.slice(), mergeSteps};
        }

        const byType = {};
        for (const boost of candidates) {
            if (!byType[boost.type]) byType[boost.type] = [];
            byType[boost.type].push(boost);
        }

        let merged = false;
        let mergeCount = 0;
        for (const type of Object.keys(byType)) {
            const groupSize = byType[type].length;
            if (groupSize >= 2) mergeCount += (groupSize - 1);
        }
        const bonusPerMerge = mergeCount > 0 ? (ticketSpend / mergeCount) : 0;
        for (const type of Object.keys(byType)) {
            const group = byType[type].slice().sort((a, b) => (b.level || 1) - (a.level || 1));
            if (group.length < 2) continue;

            const removeIds = new Set(group.map(boost => boost.id));
            this.boosts = this.boosts.filter(b => !removeIds.has(b.id));

            while (group.length >= 2) {
                const b1 = group.shift();
                const b2 = group.shift();
                const mergedLevel = this.rollMergedBoostLevel([b1.level || 1, b2.level || 1], bonusPerMerge);
                const mergedBoost = {id: `${Date.now()}_${Math.floor(Math.random() * 100000)}`, type, level: mergedLevel};
                mergeSteps.push({fromIds: [b1.id, b2.id], toId: mergedBoost.id});
                group.push(mergedBoost);
                group.sort((a, b) => (b.level || 1) - (a.level || 1));
                merged = true;
            }

            if (group.length === 1) {
                const finalBoost = group[0];
                this.boosts.push({
                    id: finalBoost.id || `${Date.now()}_${Math.floor(Math.random() * 100000)}`,
                    type,
                    level: Math.max(1, Math.min(finalBoost.level || 1, 10))
                });
            }
        }

        if (merged) {
            this.equippedBoosts = this.equippedBoosts.filter(id => this.boosts.some(b => b.id === id));
            this.saveBoosts();
            if (this.state === STATE_MISSIONS) {
                this.createMissionUI();
            }
        }
        return {merged, oldBoosts, newBoosts: this.boosts.slice(), mergeSteps};
    }

    rollMergedBoostLevel(levels, bonusValue = 0) {
        const totalValue = levels.reduce((sum, lvl) => sum + Math.pow(2, Math.max(1, lvl)), 0) + Math.max(0, bonusValue);
        let remaining = totalValue;
        let achieved = 0;
        for (let lvl = 1; lvl <= 10; lvl++) {
            const cost = Math.random() * Math.pow(2, lvl);
            if (cost <= remaining) {
                remaining -= cost;
                achieved = lvl;
            } else {
                break;
            }
        }
        return Math.max(1, achieved);
    }

    startMergeAnimation() {
        if (this.mergeAnim.active) return;
        const tickets = this.dataManager.data.tickets || 0;
        const spend = Math.max(0, Math.min(this.mergeSpend || 0, tickets));
        const {merged, oldBoosts, newBoosts, mergeSteps} = this.mergeBoosts(this.selectedBoostIds, spend);
        if (!merged) return;

        if (spend > 0) {
            this.dataManager.data.tickets = tickets - spend;
            this.dataManager.save();
        }

        this.selectedBoostIds.clear();
        if (this.dataManager.data.tickets <= 0) {
            this.mergeSpend = 0;
        } else {
            this.mergeSpend = Math.min(this.mergeSpend, this.dataManager.data.tickets);
        }

        const fromIndexMap = {};
        const oldBoostById = {};
        oldBoosts.forEach((b, idx) => {
            fromIndexMap[b.id] = idx;
            oldBoostById[b.id] = b;
        });
        const toIndexMap = {};
        newBoosts.forEach((b, idx) => {
            toIndexMap[b.id] = idx;
        });

        const originIndex = Math.floor(Math.min(newBoosts.length, 6) / 2);
        this.mergeAnim = {
            active: true,
            startAt: Date.now(),
            duration: 700,
            fromIndexMap,
            originIndex,
            oldBoostById,
            toIndexMap,
            mergeSteps
        };
    }

    equipBoost(boostId) {
        if (this.equippedBoosts.includes(boostId)) return;
        if (this.equippedBoosts.length >= 3) return;
        this.equippedBoosts.push(boostId);
        this.saveBoosts();
        if (this.state === STATE_MISSIONS) {
            this.createMissionUI();
        }
    }

    unequipBoost(boostId) {
        this.equippedBoosts = this.equippedBoosts.filter(id => id !== boostId);
        this.saveBoosts();
        if (this.state === STATE_MISSIONS) {
            this.createMissionUI();
        }
    }

    sellBoost(boostId) {
        const idx = this.boosts.findIndex(b => b.id === boostId);
        if (idx === -1) return;
        const boost = this.boosts[idx];
        const value = this.getBoostSellValue(boost.level || 1);
        this.dataManager.data.tickets = (this.dataManager.data.tickets || 0) + value;
        this.boosts.splice(idx, 1);
        this.selectedBoostIds.delete(boostId);
        this.equippedBoosts = this.equippedBoosts.filter(id => id !== boostId);
        this.saveBoosts();
        if (this.state === STATE_MISSIONS) {
            this.createMissionUI();
        }
    }

    getGachaSkinSellValue(key) {
        const skin = SKINS[key];
        if (skin && Number.isFinite(skin.sell_value)) return Math.max(1, Math.round(skin.sell_value));
        return 20;
    }

    sellGachaSkin(key) {
        if (!this.dataManager.data.unlocked_gacha_skins.includes(key)) return;
        if (this.dataManager.data.equipped_skin === key) {
            this.dataManager.data.equipped_skin = "default";
        }
        const value = this.getGachaSkinSellValue(key);
        this.dataManager.data.tickets = (this.dataManager.data.tickets || 0) + value;
        this.dataManager.data.unlocked_gacha_skins = this.dataManager.data.unlocked_gacha_skins.filter(k => k !== key);
        this.dataManager.save();
        if (this.state === STATE_MISSIONS) {
            this.createMissionUI();
        }
    }

    generateMissionSet(count) {
        const list = [];
        while (list.length < count) {
            const typesInUse = list.map(m => m.type);
            list.push(this.generateMission(typesInUse));
        }
        return list;
    }

    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    pickDifficultyKey() {
        const roll = Math.random();
        if (roll < 0.45) return "easy";
        if (roll < 0.75) return "medium";
        if (roll < 0.93) return "hard";
        return "epic";
    }

    getDifficultyConfig(key) {
        const map = {
            easy: {label: "Easy", baseReward: 4, perUnit: 1.0},
            medium: {label: "Medium", baseReward: 8, perUnit: 1.6},
            hard: {label: "Hard", baseReward: 14, perUnit: 2.3},
            epic: {label: "Epic", baseReward: 22, perUnit: 3.2}
        };
        return map[key] || map.easy;
    }

    getAllCosmeticRequirements() {
        const requirements = [];
        for (const [key, skin] of Object.entries(SKINS)) {
            if (key === "default") continue;
            requirements.push({type: skin?.gacha ? "gacha_skin" : "skin", key});
        }
        for (const key of Object.keys(TRAILS)) {
            if (key === "none") continue;
            requirements.push({type: "trail", key});
        }
        for (const key of Object.keys(ANIMATIONS)) {
            if (key === "none") continue;
            requirements.push({type: "anim", key});
        }
        for (const key of Object.keys(LEVEL_SKINS)) {
            if (key === "default") continue;
            requirements.push({type: "level_skin", key});
        }
        return requirements;
    }

    generateMission(excludedTypes = []) {
        let template = null;
        const pool = this.missionTemplates.filter(t => !excludedTypes.includes(t.type));
        if (pool.length > 0) {
            template = pool[Math.floor(Math.random() * pool.length)];
        } else {
            template = this.missionTemplates[Math.floor(Math.random() * this.missionTemplates.length)];
        }

        const difficultyKey = this.pickDifficultyKey();
        const range = template.difficultyTargets[difficultyKey] || template.difficultyTargets.easy;
        const target = this.getRandomInt(range[0], range[1]);
        const diff = this.getDifficultyConfig(difficultyKey);
        const rewardFactor = template.rewardFactor(target);
        let reward = Math.max(3, Math.round(diff.baseReward + diff.perUnit * rewardFactor));

        let requirement = null;
        if (Array.isArray(template.requirementOptions) && template.requirementOptions.length) {
            requirement = template.requirementOptions[Math.floor(Math.random() * template.requirementOptions.length)];
        } else if (template.requirement) {
            requirement = template.requirement;
        }

        const requirementText = requirement ? this.getRequirementText(requirement) : "";
        const baseDescription = template.description(target);
        const description = requirementText ? `${baseDescription} (${requirementText})` : baseDescription;

        if (requirement) {
            reward = Math.max(3, Math.round(reward * 1.5));
        }

        return {
            id: `${Date.now()}_${Math.floor(Math.random() * 100000)}`,
            type: template.type,
            title: template.title,
            description,
            target,
            progress: 0,
            difficulty: diff.label,
            reward,
            completed: false,
            requirement
        };
    }

    getRequirementText(requirement) {
        if (!requirement) return "";
        const key = requirement.key;
        if (requirement.type === "skin" || requirement.type === "gacha_skin") {
            const skin = SKINS[key];
            return skin ? `Equip ${skin.name}` : `Equip ${key}`;
        }
        if (requirement.type === "trail") {
            const trail = TRAILS[key];
            return trail ? `Use ${trail.name} trail` : `Use ${key} trail`;
        }
        if (requirement.type === "anim") {
            const anim = ANIMATIONS[key];
            return anim ? `Use ${anim.name} move` : `Use ${key} move`;
        }
        if (requirement.type === "level_skin") {
            const lvlSkin = LEVEL_SKINS[key];
            return lvlSkin ? `Use ${lvlSkin.name} theme` : `Use ${key} theme`;
        }
        return "Equip required cosmetic";
    }

    isRequirementMet(requirement) {
        if (!requirement) return true;
        if (requirement.type === "skin" || requirement.type === "gacha_skin") {
            return this.dataManager.data.equipped_skin === requirement.key;
        }
        if (requirement.type === "trail") {
            return this.dataManager.data.equipped_trail === requirement.key;
        }
        if (requirement.type === "anim") {
            return this.dataManager.data.equipped_anim === requirement.key;
        }
        if (requirement.type === "level_skin") {
            return this.dataManager.data.equipped_level_skin === requirement.key;
        }
        return false;
    }

    replaceMission(index) {
        const usedTypes = this.missions.filter((_, i) => i !== index).map(m => m.type);
        this.missions[index] = this.generateMission(usedTypes);
        this.saveMissions();
    }

    saveMissions() {
        this.dataManager.data.missions = this.missions;
        this.dataManager.save();
    }

    rerollMissions() {
        this.missions = this.generateMissionSet(3);
        this.saveMissions();
        if (this.state === STATE_MISSIONS) {
            this.createMissionUI();
        }
    }

    updateMissionProgress(type, amount, setValue = false) {
        let changed = false;
        for (const mission of this.missions) {
            if (mission.type !== type) continue;
            if (!this.isRequirementMet(mission.requirement)) continue;
            if (setValue) {
                if (amount > mission.progress) {
                    mission.progress = amount;
                    changed = true;
                }
            } else {
                mission.progress += amount;
                changed = true;
            }
            if (mission.progress >= mission.target) {
                mission.progress = mission.target;
                mission.completed = true;
            }
        }
        if (changed) {
            this.saveMissions();
            if (this.state === STATE_MISSIONS) {
                this.createMissionUI();
            }
        }
    }

    createMissionUI() {
        this.missionButtons = [];
        const panel = {x: 40, y: 40, w: WINDOW_WIDTH - 80, h: WINDOW_HEIGHT - 80};

        if (this.missionsTab === "gacha_items") {
            this.missionsTab = "gacha";
        }

        this.missionButtons.push(new Button("BACK", panel.x + 20, panel.y + 20, 80, 40,
            () => { this.state = STATE_MENU; this.clearPracticeGhostTrace(); }, "outline"));

        const tabs = [["MISSIONS", "missions"], ["GACHA", "gacha"], ["INVENTORY", "inventory"]];
        let tabX = panel.x + 120;
        for (const [label, key] of tabs) {
            const style = this.missionsTab === key ? "primary" : "outline";
            this.missionButtons.push(new Button(label, tabX, panel.y + 20, 120, 40,
                () => {
                    this.missionsTab = key;
                    this.selectedGachaItemIds.clear();
                    this.selectedBoostIds.clear();
                    this.createMissionUI();
                }, style));
            tabX += 130;
        }

        if (this.missionsTab === "missions") {
            const cardH = 110;
            const cardGap = 18;
            const startY = panel.y + 90;
            for (let i = 0; i < this.missions.length; i++) {
                const cardY = startY + i * (cardH + cardGap);
                const buttonText = this.missions[i].completed ? "COLLECT" : "ACTIVE";
                const btnStyle = this.missions[i].completed ? "primary" : "outline";
                const btnX = panel.x + panel.w - 140;
                const btnY = cardY + 30;
                const action = this.missions[i].completed ? (() => {
                    const reward = this.missions[i].reward;
                    this.dataManager.data.tickets = (this.dataManager.data.tickets || 0) + reward;
                    this.replaceMission(i);
                    this.createMissionUI();
                }) : null;
                this.missionButtons.push(new Button(buttonText, btnX, btnY, 110, 45, action, btnStyle));
            }
        } else if (this.missionsTab === "gacha") {
            const tickets = this.dataManager.data.tickets || 0;
            if (tickets > 0) {
                if (!this.gachaSpend || this.gachaSpend < 1) {
                    this.gachaSpend = Math.min(10, tickets);
                }
            } else {
                this.gachaSpend = 0;
            }

            const spinX = panel.x + 60;
            const spinW = panel.w - 120;
            const spinY = panel.y + 210;
            this.missionButtons.push(new Button("SPIN", spinX, spinY, spinW, 44,
                () => this.spinGacha(this.gachaSpend || 0), "primary"));
        } else if (this.missionsTab === "gacha_items") {
            const tickets = this.dataManager.data.tickets || 0;
            if (tickets > 0) {
                if (!this.gachaSpend || this.gachaSpend < 1) {
                    this.gachaSpend = Math.min(10, tickets);
                }
            } else {
                this.gachaSpend = 0;
            }
            this.itemMergeSpend = Math.max(0, Math.min(this.itemMergeSpend || 0, tickets));

            const spinX = panel.x + 60;
            const spinW = panel.w - 120;
            const spinY = panel.y + 210;
            this.missionButtons.push(new Button("SPIN ITEM", spinX, spinY, spinW, 44,
                () => this.spinGachaItem(this.gachaSpend || 0), "primary"));

            const mergeItemsAction = this.selectedGachaItemIds.size >= 2 ? () => this.mergeGachaItems() : null;
            this.missionButtons.push(new Button("MERGE ITEMS", spinX, spinY + 60, spinW, 36,
                mergeItemsAction, "outline"));

            const listY = panel.y + 350;
            const owned = this.gachaItems.slice(-6).reverse();
            for (let i = 0; i < owned.length; i++) {
                const item = owned[i];
                const btnY = listY + i * 26;
                this.missionButtons.push(new Button("SELL", panel.x + panel.w - 140, btnY, 80, 22,
                    () => this.sellGachaItem(item.id), "danger"));
            }
        } else if (this.missionsTab === "inventory") {
            const tickets = this.dataManager.data.tickets || 0;
            this.mergeSpend = Math.max(0, Math.min(this.mergeSpend || 0, tickets));
            const listStartY = panel.y + 230;
            const rowH = 52;
            const listX = panel.x + 20;
            const listW = panel.w - 40;
            const mergeAction = (this.mergeAnim.active || this.selectedBoostIds.size < 2) ? null : () => this.startMergeAnimation();
            const mergeStyle = this.mergeAnim.active ? "outline" : "outline";
            this.missionButtons.push(new Button("MERGE", panel.x + panel.w - 120, panel.y + 20, 90, 40,
                mergeAction, mergeStyle));

            const listCount = Math.min(this.boosts.length, 6);
            if (!this.mergeAnim.active) {
                for (let i = 0; i < listCount; i++) {
                    const boost = this.boosts[i];
                    const isEquipped = this.equippedBoosts.includes(boost.id);
                    const rowY = listStartY + i * rowH;
                    const equipText = isEquipped ? "UNEQUIP" : "EQUIP";
                    const equipStyle = isEquipped ? "primary" : "outline";
                    this.missionButtons.push(new Button(equipText, listX + listW - 210, rowY + 6, 90, 26,
                        () => {
                            if (isEquipped) this.unequipBoost(boost.id);
                            else this.equipBoost(boost.id);
                        }, equipStyle));
                    this.missionButtons.push(new Button("SELL", listX + listW - 110, rowY + 6, 90, 26,
                        () => this.sellBoost(boost.id), "danger"));
                }
            }

            const gachaSkins = this.dataManager.data.unlocked_gacha_skins || [];
            const skinStartY = listStartY + listCount * rowH + 30;
            const skinRowH = 44;
            const skinCount = Math.min(gachaSkins.length, 4);
            if (!this.mergeAnim.active) {
                for (let i = 0; i < skinCount; i++) {
                    const skinKey = gachaSkins[i];
                    const rowY = skinStartY + i * skinRowH;
                    const equipped = this.dataManager.data.equipped_skin === skinKey;
                    const equipText = equipped ? "UNEQUIP" : "EQUIP";
                    const equipStyle = equipped ? "primary" : "outline";
                    this.missionButtons.push(new Button(equipText, listX + listW - 210, rowY + 6, 90, 26,
                        () => {
                            if (equipped) this.dataManager.data.equipped_skin = "default";
                            else this.dataManager.data.equipped_skin = skinKey;
                            this.dataManager.save();
                            this.createMissionUI();
                        }, equipStyle));
                    this.missionButtons.push(new Button("SELL", listX + listW - 110, rowY + 6, 90, 26,
                        () => this.sellGachaSkin(skinKey), "danger"));
                }
            }
        }
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
        this.clearPracticeGhostTrace();
        this.lavaFrozenUntil = 0;
        this.lavaFreezePickups = this.lavaFreezePickupSpawns.map(p => p ? [...p] : null).filter(p => p);
        this.ticketPickups = this.ticketPickupSpawns.map(p => p ? [...p] : null).filter(p => p);
    }

    rerollLevel() {
        // Practice mode, regenerate fresh maze for same level
        this.practice_mode = true;
        this.gameStartTime = Date.now();
        this.initLevel();
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
        const boostEffects = this.getBoostEffects();
        this.lavaStartDelay = 120 + boostEffects.lavaDelayBonus;
        this.levelFrameCount = 0;

        const startInterval = Math.max(2.0, 25.0 - this.level * 1.0);
        this.baseLavaInterval = startInterval;
        this.currentLavaInterval = startInterval * boostEffects.lavaIntervalMultiplier;
        this.clearPracticeGhostTrace();

        this.lavaFrozenUntil = 0;
        this.spawnLavaFreezePickups();
        this.lavaFreezePickups = this.lavaFreezePickupSpawns.map(p => p ? [...p] : null).filter(p => p);
        this.spawnTicketPickups();
        this.ticketPickups = this.ticketPickupSpawns.map(p => p ? [...p] : null).filter(p => p);
    }

    spawnTicketPickups() {
        const boostEffects = this.getBoostEffects();
        const baseChance = 0.08;
        const chance = Math.min(0.4, baseChance + boostEffects.ticketSpawnBonus);
        this.ticketPickupSpawns = [];
        if (Math.random() > chance) return;
        const reachable = this.getReachableOpenCells();
        const candidates = reachable.filter(([r, c]) => {
            if (r === this.mazeGen.start[0] && c === this.mazeGen.start[1]) return false;
            if (r === this.mazeGen.end[0] && c === this.mazeGen.end[1]) return false;
            return true;
        });
        if (candidates.length === 0) return;
        const idx = Math.floor(Math.random() * candidates.length);
        this.ticketPickupSpawns.push(candidates[idx]);
    }

    spawnLavaFreezePickups() {
        const boostEffects = this.getBoostEffects();
        const basePickups = Math.floor((this.level - 1) / 20) + 1;
        const numPickups = basePickups + boostEffects.freezeCountBonus;
        this.lavaFreezePickupSpawns = [];
        const reachable = this.getReachableOpenCells();
        const candidates = reachable.filter(([r, c]) => {
            if (r === this.mazeGen.start[0] && c === this.mazeGen.start[1]) return false;
            if (r === this.mazeGen.end[0] && c === this.mazeGen.end[1]) return false;
            return true;
        });
        if (candidates.length === 0) return;
        for (let i = 0; i < numPickups && candidates.length > 0; i++) {
            const idx = Math.floor(Math.random() * candidates.length);
            this.lavaFreezePickupSpawns.push(candidates[idx]);
            candidates.splice(idx, 1);
        }
    }

    getReachableOpenCells() {
        const rows = this.mazeGen.rows;
        const cols = this.mazeGen.cols;
        const visited = Array.from({length: rows}, () => Array(cols).fill(false));
        const q = [];
        const result = [];
        q.push(this.mazeGen.start);
        visited[this.mazeGen.start[0]][this.mazeGen.start[1]] = true;

        const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
        while (q.length) {
            const [r, c] = q.shift();
            if (this.grid[r][c] === 0) {
                result.push([r, c]);
            }
            for (const [dr, dc] of dirs) {
                const nr = r + dr, nc = c + dc;
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                if (visited[nr][nc]) continue;
                if (this.grid[nr][nc] === 1) continue;
                visited[nr][nc] = true;
                q.push([nr, nc]);
            }
        }
        return result;
    }

    isLavaFrozen() {
        return Date.now() < this.lavaFrozenUntil;
    }

    collectLavaFreeze(index) {
        const now = Date.now();
        const boostEffects = this.getBoostEffects();
        const addMs = Math.round(100 * this.level * boostEffects.freezeDurationMultiplier);
        const base = Math.max(now, this.lavaFrozenUntil);
        this.lavaFrozenUntil = base + addMs;
        this.lavaFreezePickups[index] = null;
        this.lavaFreezePickups = this.lavaFreezePickups.filter(p => p);
        this.updateMissionProgress("collect_freeze", 1);
    }

    collectTicketPickup(index) {
        this.ticketPickups[index] = null;
        this.ticketPickups = this.ticketPickups.filter(p => p);
        if (!this.practice_mode) {
            const value = this.getTicketPickupValue();
            this.dataManager.data.tickets = (this.dataManager.data.tickets || 0) + value;
            this.dataManager.save();
        }
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
                for (const pickup of this.lavaFreezePickups) {
                    if (pickup && pickup[0] === nextR && pickup[1] === nextC) {
                        [r, c] = [nextR, nextC];
                        return [r, c];
                    }
                }
                for (const pickup of this.ticketPickups) {
                    if (pickup && pickup[0] === nextR && pickup[1] === nextC) {
                        [r, c] = [nextR, nextC];
                        return [r, c];
                    }
                }
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
            if (this.practice_mode && this.isPaused) {
                this._appendPracticeGhostPointFromPixel(this.playerPixelPos);
            }
            this.triggerImpact();
            this.updateMissionProgress("slide_moves", 1);
            this.updateMissionProgress("styled_slides", 1);
        } else {
            const moveX = (dx / dist) * moveSpeed;
            const moveY = (dy / dist) * moveSpeed;
            this.playerPixelPos[0] += moveX;
            this.playerPixelPos[1] += moveY;
            if (this.practice_mode && this.isPaused) {
                this._appendPracticeGhostPointFromPixel(this.playerPixelPos);
            }
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
        if (this.isLavaFrozen()) return;
        if (!this.hasStartedMoving) return;
        this.levelFrameCount++;
        if (this.levelFrameCount < this.lavaStartDelay) return;
        if (this.lavaCells.size === 0) this.lavaCells.add(`${this.mazeGen.start[0]},${this.mazeGen.start[1]}`);

        if (this.levelFrameCount % 60 === 0) {
            const boostEffects = this.getBoostEffects();
            this.baseLavaInterval = Math.max(1.5, this.baseLavaInterval - 0.2);
            this.currentLavaInterval = this.baseLavaInterval * boostEffects.lavaIntervalMultiplier;
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
        for (let i = 0; i < this.lavaFreezePickups.length; i++) {
            if (this.lavaFreezePickups[i] && this.lavaFreezePickups[i][0] === this.playerGridPos[0] && this.lavaFreezePickups[i][1] === this.playerGridPos[1]) {
                this.collectLavaFreeze(i);
            }
        }

        for (let i = 0; i < this.ticketPickups.length; i++) {
            if (this.ticketPickups[i] && this.ticketPickups[i][0] === this.playerGridPos[0] && this.ticketPickups[i][1] === this.playerGridPos[1]) {
                this.collectTicketPickup(i);
            }
        }

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
            () => { this.state = STATE_MENU; this.clearPracticeGhostTrace(); }, "outline"));

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
            for (const [k, v] of Object.entries(SKINS)) {
                if (!v.gacha) items.push([k, v, 'skin']);
            }
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
                if (item.gacha) {
                    unlocked = this.dataManager.data.unlocked_gacha_skins.includes(key);
                    equipped = this.dataManager.data.equipped_skin === key;
                    txt = unlocked ? item.name : "GACHA";
                } else {
                    if (item.level_req < 30) {
                        unlocked = this.dataManager.data.high_level >= item.level_req;
                    } else {
                        unlocked = Math.max(this.dataManager.data.high_level, this.dataManager.data.high_level_practice) >= item.level_req;
                    }
                    equipped = this.dataManager.data.equipped_skin === key;
                    txt = unlocked ? item.name : `LVL ${item.level_req}`;
                }
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
                    if (i.gacha) {
                        unlocked = dm.data.unlocked_gacha_skins.includes(k);
                    } else if (i.level_req < 30) {
                        unlocked = dm.data.high_level >= i.level_req;
                    } else {
                        unlocked = Math.max(dm.data.high_level, dm.data.high_level_practice) >= i.level_req;
                    }
                    if (unlocked) dm.data.equipped_skin = k;
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

    drawGachaAnimation(panel, colors) {
        if (!this.gachaAnim.active) return;
        const now = Date.now();
        const {bg, floor, text, border} = colors;
        const cx = WINDOW_WIDTH / 2;
        const cy = WINDOW_HEIGHT / 2 + 20;

        const cardW = 360;
        const cardH = 200;
        const wobble = Math.sin((now - this.gachaAnim.startAt) / 90) * 0.03;
        const pulse = 1 + wobble;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        this.ctx.fillRect(panel.x, panel.y, panel.w, panel.h);

        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.scale(pulse, pulse);
        this.ctx.fillStyle = `rgb(${floor.join(',')})`;
        this.ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
        this.ctx.strokeStyle = `rgb(${border.join(',')})`;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(-cardW / 2, -cardH / 2, cardW, cardH);

        this.ctx.fillStyle = `rgb(${text.join(',')})`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        if (!this.gachaAnim.revealed) {
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillText('SPINNING...', 0, -40);
            this.ctx.font = 'bold 64px Arial';
            this.ctx.fillText('?', 0, 25);
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`Tickets Spent: ${this.gachaAnim.spend}`, 0, 70);
        } else if (this.gachaAnim.skinKey) {
            const skin = SKINS[this.gachaAnim.skinKey];
            const skinName = skin ? skin.name : "Gacha Skin";
            this.ctx.font = 'bold 22px Arial';
            this.ctx.fillText('NEW SKIN!', 0, -50);
            this.ctx.font = 'bold 18px Arial';
            this.ctx.fillText(skinName, 0, -10);
            this.ctx.font = '12px Arial';
            this.ctx.fillText('Added to inventory', 0, 20);
            this.ctx.fillText(`Tickets Spent: ${this.gachaAnim.spend}`, 0, 70);
        } else if (this.gachaAnim.itemList.length) {
            const primary = this.gachaAnim.itemList[0];
            const meta = GACHA_ITEMS[primary.type];
            const itemName = meta ? meta.name : primary.type;
            const itemLevel = primary.level || 1;
            const extraCount = this.gachaAnim.itemList.length - 1;
            this.ctx.font = 'bold 22px Arial';
            this.ctx.fillText('NEW ITEM!', 0, -50);
            this.ctx.font = 'bold 18px Arial';
            this.ctx.fillText(`${itemName} Lv.${itemLevel}`, 0, -10);
            this.ctx.font = '12px Arial';
            if (extraCount > 0) {
                this.ctx.fillText(`+${extraCount} more`, 0, 36);
            }
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`Tickets Spent: ${this.gachaAnim.spend}`, 0, 70);
        } else if (this.gachaAnim.boostList.length) {
            const primary = this.gachaAnim.boostList[0];
            const boostName = this.getBoostName(primary);
            const boostDesc = this.getBoostDescription(primary);
            const extraCount = this.gachaAnim.boostList.length - 1;
            this.ctx.font = 'bold 22px Arial';
            this.ctx.fillText('NEW BOOST!', 0, -50);
            this.ctx.font = 'bold 18px Arial';
            this.ctx.fillText(boostName, 0, -10);
            this.ctx.font = '12px Arial';
            this.ctx.fillText(boostDesc, 0, 20);
            if (extraCount > 0) {
                this.ctx.fillText(`+${extraCount} more`, 0, 38);
            }
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`Tickets Spent: ${this.gachaAnim.spend}`, 0, 70);
        } else {
            const label = this.gachaAnim.rewardType === "item" ? "NO ITEM" : "NO BOOST";
            this.ctx.font = 'bold 22px Arial';
            this.ctx.fillText(label, 0, -20);
            this.ctx.font = '12px Arial';
            this.ctx.fillText('Try again!', 0, 20);
            this.ctx.fillText(`Tickets Spent: ${this.gachaAnim.spend}`, 0, 70);
        }

        this.ctx.restore();
        this.ctx.globalAlpha = 1;
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

            this.ctx.fillStyle = `rgb(${cText.join(',')})`;
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(`Tickets: ${this.dataManager.data.tickets || 0}`, WINDOW_WIDTH - 20, 20);
            this.ctx.textAlign = 'left';

            for (const btn of this.menuButtons) {
                if (btn.text === "🎟️") {
                    btn.color = [20, 20, 20];
                    btn.hoverColor = [50, 50, 50];
                    btn.textColor = [220, 220, 220];
                } else if (btn.text === "INFO") {
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
                const fontSize = btn.text === "🎟️" ? 24 : 18;
                btn.draw(this.ctx, fontSize);
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
        } else if (this.state === STATE_MISSIONS) {
            for (let i = 0; i < WINDOW_WIDTH; i += 40) {
                this.ctx.strokeStyle = `rgb(${cFloor.join(',')})`;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(i, 0);
                this.ctx.lineTo(i, WINDOW_HEIGHT);
                this.ctx.stroke();
            }

            const panel = {x: 40, y: 40, w: WINDOW_WIDTH - 80, h: WINDOW_HEIGHT - 80};
            this.ctx.fillStyle = `rgb(${cBg.join(',')})`;
            this.ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
            this.ctx.strokeStyle = `rgb(${cBorder.join(',')})`;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);

            this.drawTextCentered("GACHA", 40, cText, -250);

            this.ctx.fillStyle = `rgb(${cText.join(',')})`;
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'right';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(`Tickets: ${this.dataManager.data.tickets || 0}`, panel.x + panel.w - 20, panel.y + 20);
            this.ctx.textAlign = 'left';

            if (this.missionsTab === "missions") {
                const cardH = 125;
                const cardGap = 18;
                const startY = panel.y + 90;
                for (let i = 0; i < this.missions.length; i++) {
                    const mission = this.missions[i];
                    const cardX = panel.x + 20;
                    const cardY = startY + i * (cardH + cardGap);
                    const cardW = panel.w - 40;

                    this.ctx.fillStyle = `rgb(${cFloor.join(',')})`;
                    this.ctx.fillRect(cardX, cardY, cardW, cardH);
                    this.ctx.strokeStyle = `rgb(${cBorder.join(',')})`;
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(cardX, cardY, cardW, cardH);

                    this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                    this.ctx.font = 'bold 18px Arial';
                    this.ctx.textAlign = 'left';
                    this.ctx.textBaseline = 'top';
                    this.ctx.fillText(mission.title, cardX + 14, cardY + 12);

                    this.ctx.font = '14px Arial';
                    this.ctx.fillText(mission.description, cardX + 14, cardY + 36);

                    const progressVal = Math.floor(mission.progress);
                    this.ctx.fillStyle = mission.completed ? 'rgb(0, 180, 0)' : `rgb(${cText.join(',')})`;
                    this.ctx.fillText(`Progress: ${progressVal}/${mission.target}`, cardX + 14, cardY + 72);

                    this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                    this.ctx.fillText(`Difficulty: ${mission.difficulty}`, cardX + 14, cardY + 94);

                    this.ctx.textAlign = 'right';
                    this.ctx.fillText(`Reward: ${mission.reward} tickets`, cardX + cardW - 16, cardY + 94);
                    this.ctx.textAlign = 'left';
                }
            } else if (this.missionsTab === "gacha") {
                this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                this.ctx.font = 'bold 20px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.textBaseline = 'top';
                this.ctx.fillText("BUY GACHA", panel.x + 40, panel.y + 90);
                this.ctx.font = '12px Arial';
                this.ctx.fillText("Spend more tickets for stronger boosts", panel.x + 40, panel.y + 118);

                const slider = this.getGachaSliderRect();
                const tickets = this.dataManager.data.tickets || 0;
                const minValue = tickets > 0 ? 1 : 0;
                const maxValue = Math.max(1, tickets);
                if (tickets === 0) this.gachaSpend = 0;

                this.ctx.strokeStyle = `rgb(${cBorder.join(',')})`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(slider.x, slider.y + slider.h / 2);
                this.ctx.lineTo(slider.x + slider.w, slider.y + slider.h / 2);
                this.ctx.stroke();

                const pct = maxValue === minValue ? 0 : (this.gachaSpend - minValue) / (maxValue - minValue);
                const knobX = slider.x + slider.w * Math.max(0, Math.min(1, pct));
                this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                this.ctx.beginPath();
                this.ctx.arc(knobX, slider.y + slider.h / 2, 8, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`Spend: ${this.gachaSpend}`, slider.x, slider.y + 18);
                this.ctx.textAlign = 'right';
                this.ctx.fillText(`Max: ${tickets}`, slider.x + slider.w, slider.y + 18);
                this.ctx.textAlign = 'left';
            } else if (this.missionsTab === "gacha_items") {
                this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                this.ctx.font = 'bold 20px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.textBaseline = 'top';
                this.ctx.fillText("GACHA ITEMS", panel.x + 40, panel.y + 90);
                this.ctx.font = '12px Arial';
                this.ctx.fillText("Spend tickets to pull battle items", panel.x + 40, panel.y + 118);

                const slider = this.getGachaSliderRect();
                const tickets = this.dataManager.data.tickets || 0;
                const minValue = tickets > 0 ? 1 : 0;
                const maxValue = Math.max(1, tickets);
                if (tickets === 0) this.gachaSpend = 0;

                this.ctx.strokeStyle = `rgb(${cBorder.join(',')})`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(slider.x, slider.y + slider.h / 2);
                this.ctx.lineTo(slider.x + slider.w, slider.y + slider.h / 2);
                this.ctx.stroke();

                const pct = maxValue === minValue ? 0 : (this.gachaSpend - minValue) / (maxValue - minValue);
                const knobX = slider.x + slider.w * Math.max(0, Math.min(1, pct));
                this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                this.ctx.beginPath();
                this.ctx.arc(knobX, slider.y + slider.h / 2, 8, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`Spend: ${this.gachaSpend}`, slider.x, slider.y + 18);
                this.ctx.textAlign = 'right';
                this.ctx.fillText(`Max: ${tickets}`, slider.x + slider.w, slider.y + 18);
                this.ctx.textAlign = 'left';

                this.ctx.font = 'bold 14px Arial';
                this.ctx.fillText("MERGE ITEMS", panel.x + 40, panel.y + 245);
                this.ctx.font = '12px Arial';
                this.ctx.fillText("Spend tickets to power item merges (1 ticket = 1 value)", panel.x + 40, panel.y + 265);

                const mergeSlider = this.getGachaItemMergeSliderRect();
                const mergeMinValue = 0;
                const mergeMaxValue = Math.max(0, tickets);
                if (tickets === 0) this.itemMergeSpend = 0;

                this.ctx.strokeStyle = `rgb(${cBorder.join(',')})`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(mergeSlider.x, mergeSlider.y + mergeSlider.h / 2);
                this.ctx.lineTo(mergeSlider.x + mergeSlider.w, mergeSlider.y + mergeSlider.h / 2);
                this.ctx.stroke();

                const mergePct = mergeMaxValue === mergeMinValue ? 0 : (this.itemMergeSpend - mergeMinValue) / (mergeMaxValue - mergeMinValue);
                const mergeKnobX = mergeSlider.x + mergeSlider.w * Math.max(0, Math.min(1, mergePct));
                this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                this.ctx.beginPath();
                this.ctx.arc(mergeKnobX, mergeSlider.y + mergeSlider.h / 2, 8, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`Spend: ${this.itemMergeSpend}`, mergeSlider.x, mergeSlider.y + 18);
                this.ctx.textAlign = 'right';
                this.ctx.fillText(`Max: ${tickets}`, mergeSlider.x + mergeSlider.w, mergeSlider.y + 18);
                this.ctx.textAlign = 'left';

                const listX = panel.x + 40;
                const listY = panel.y + 350;
                const rowH = 34;
                const owned = this.gachaItems.slice(-6).reverse();
                this.ctx.font = '12px Arial';
                for (let i = 0; i < owned.length; i++) {
                    const item = owned[i];
                    const meta = GACHA_ITEMS[item.type];
                    const label = meta ? `${meta.name} Lv.${item.level || 1}` : item.type;
                    if (this.selectedGachaItemIds.has(item.id)) {
                        const highlightX = listX - 6;
                        const highlightY = listY + i * rowH - 2;
                        const highlightW = panel.x + panel.w - 160 - highlightX;
                        this.ctx.fillStyle = 'rgba(0, 120, 255, 0.2)';
                        this.ctx.fillRect(highlightX, highlightY, Math.max(0, highlightW), rowH);
                        this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                    }
                    this.ctx.fillText(label, listX, listY + i * rowH);
                    const sub = this.getItemEffectSummary(item.type, item.level || 1);
                    if (sub) {
                        this.ctx.font = '10px Arial';
                        this.ctx.fillText(sub, listX, listY + i * rowH + 12);
                        this.ctx.font = '12px Arial';
                    }
                    const sellValue = this.getGachaItemSellValue(item.type, item.level || 1);
                    this.ctx.textAlign = 'right';
                    this.ctx.fillText(`Sell: ${sellValue}`, panel.x + panel.w - 10, listY + i * rowH);
                    this.ctx.textAlign = 'left';
                }
            } else if (this.missionsTab === "inventory") {
                this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                this.ctx.font = 'bold 18px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.textBaseline = 'top';
                this.ctx.fillText("BOOST INVENTORY", panel.x + 20, panel.y + 80);

                this.ctx.font = '12px Arial';
                this.ctx.fillText(`Equipped: ${this.equippedBoosts.length}/3`, panel.x + 20, panel.y + 102);

                this.ctx.font = 'bold 16px Arial';
                this.ctx.fillText("MERGE BOOSTS", panel.x + 20, panel.y + 120);
                this.ctx.font = '12px Arial';
                this.ctx.fillText("Spend tickets to power merges (1 ticket = 1 value)", panel.x + 20, panel.y + 140);

                const slider = this.getGachaSliderRect();
                const tickets = this.dataManager.data.tickets || 0;
                const minValue = 0;
                const maxValue = Math.max(0, tickets);
                if (tickets === 0) this.mergeSpend = 0;

                this.ctx.strokeStyle = `rgb(${cBorder.join(',')})`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(slider.x, slider.y + slider.h / 2);
                this.ctx.lineTo(slider.x + slider.w, slider.y + slider.h / 2);
                this.ctx.stroke();

                const pct = maxValue === minValue ? 0 : (this.mergeSpend - minValue) / (maxValue - minValue);
                const knobX = slider.x + slider.w * Math.max(0, Math.min(1, pct));
                this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                this.ctx.beginPath();
                this.ctx.arc(knobX, slider.y + slider.h / 2, 8, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'left';
                this.ctx.fillText(`Spend: ${this.mergeSpend}`, slider.x, slider.y + 18);
                this.ctx.textAlign = 'right';
                this.ctx.fillText(`Max: ${tickets}`, slider.x + slider.w, slider.y + 18);
                this.ctx.textAlign = 'left';

                const listStartY = panel.y + 230;
                const rowH = 52;
                const listX = panel.x + 20;
                const listW = panel.w - 40;
                const listCount = Math.min(this.boosts.length, 6);
                const now = Date.now();
                let animT = 1;
                if (this.mergeAnim.active) {
                    animT = Math.min(1, (now - this.mergeAnim.startAt) / this.mergeAnim.duration);
                    if (animT >= 1) {
                        this.mergeAnim.active = false;
                    }
                }
                const drawBoostRow = (boost, rowY) => {
                    if (this.selectedBoostIds.has(boost.id)) {
                        this.ctx.fillStyle = 'rgba(0, 120, 255, 0.2)';
                        this.ctx.fillRect(listX, rowY - 2, listW, rowH);
                    }
                    const isEquipped = this.equippedBoosts.includes(boost.id);
                    this.ctx.fillStyle = isEquipped ? 'rgb(0, 160, 0)' : `rgb(${cText.join(',')})`;
                    this.ctx.font = '12px Arial';
                    this.ctx.fillText(this.getBoostName(boost), listX, rowY + 4);
                    this.ctx.font = '10px Arial';
                    this.ctx.fillText(this.getBoostDescription(boost), listX, rowY + 18);

                    const sellValue = this.getBoostSellValue(boost.level || 1);
                    this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                    this.ctx.font = '10px Arial';
                    this.ctx.textAlign = 'right';
                    this.ctx.fillText(`Sell: ${sellValue}`, panel.x + panel.w - 10, rowY + 18);
                    this.ctx.textAlign = 'left';
                };

                if (!this.mergeAnim.active) {
                    for (let i = 0; i < listCount; i++) {
                        const boost = this.boosts[i];
                        const rowY = listStartY + i * rowH;
                        drawBoostRow(boost, rowY);
                    }
                } else {
                    const ease = animT * animT;
                    const mergedResultIds = new Set(this.mergeAnim.mergeSteps.map(step => step.toId));
                    const mergedSourceIds = new Set(this.mergeAnim.mergeSteps.flatMap(step => step.fromIds));

                    for (let i = 0; i < listCount; i++) {
                        const boost = this.boosts[i];
                        if (mergedResultIds.has(boost.id)) continue;
                        const rowY = listStartY + i * rowH;
                        drawBoostRow(boost, rowY);
                    }

                    for (const step of this.mergeAnim.mergeSteps) {
                        const [idA, idB] = step.fromIds;
                        const boostA = this.mergeAnim.oldBoostById[idA];
                        const boostB = this.mergeAnim.oldBoostById[idB];
                        if (!boostA || !boostB) continue;
                        const fromIndexA = this.mergeAnim.fromIndexMap[idA];
                        const fromIndexB = this.mergeAnim.fromIndexMap[idB];
                        const yA = listStartY + (fromIndexA ?? 0) * rowH;
                        const yB = listStartY + (fromIndexB ?? 0) * rowH;
                        const midY = (yA + yB) / 2;
                        const drawYA = yA + (midY - yA) * ease;
                        const drawYB = yB + (midY - yB) * ease;
                        if (animT < 1) {
                            drawBoostRow(boostA, drawYA);
                            drawBoostRow(boostB, drawYB);
                        }
                    }

                    if (animT >= 0.9) {
                        const alpha = Math.min(1, (animT - 0.9) / 0.1);
                        this.ctx.globalAlpha = alpha;
                        for (let i = 0; i < listCount; i++) {
                            const boost = this.boosts[i];
                            if (!mergedResultIds.has(boost.id)) continue;
                            const rowY = listStartY + i * rowH;
                            drawBoostRow(boost, rowY);
                        }
                        this.ctx.globalAlpha = 1;
                    }
                }

                const gachaSkins = this.dataManager.data.unlocked_gacha_skins || [];
                const skinStartY = listStartY + listCount * rowH + 30;
                const skinRowH = 44;
                if (gachaSkins.length) {
                    this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                    this.ctx.font = 'bold 12px Arial';
                    this.ctx.fillText("GACHA SKINS", listX, skinStartY - 18);
                }
                const skinCount = Math.min(gachaSkins.length, 4);
                for (let i = 0; i < skinCount; i++) {
                    const skinKey = gachaSkins[i];
                    const skin = SKINS[skinKey];
                    const rowY = skinStartY + i * skinRowH;
                    const isEquipped = this.dataManager.data.equipped_skin === skinKey;
                    this.ctx.fillStyle = isEquipped ? 'rgb(0, 160, 0)' : `rgb(${cText.join(',')})`;
                    this.ctx.font = '12px Arial';
                    this.ctx.fillText(skin ? skin.name : skinKey, listX, rowY + 4);
                    this.ctx.font = '10px Arial';
                    this.ctx.fillText('Gacha Skin', listX, rowY + 18);

                    const sellValue = this.getGachaSkinSellValue(skinKey);
                    this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                    this.ctx.font = '10px Arial';
                    this.ctx.textAlign = 'right';
                    this.ctx.fillText(`Sell: ${sellValue}`, panel.x + panel.w - 10, rowY + 18);
                    this.ctx.textAlign = 'left';
                }
            }

            for (const btn of this.missionButtons) {
                if (btn.style === "outline") {
                    btn.textColor = cText;
                    btn.color = cBg;
                }
                btn.draw(this.ctx, 14);
            }

            this.drawGachaAnimation(panel, {
                bg: cBg,
                floor: cFloor,
                text: cText,
                border: cBorder
            });
        } else if (this.state === STATE_BATTLE) {
            for (let i = 0; i < WINDOW_WIDTH; i += 40) {
                this.ctx.strokeStyle = `rgb(${cFloor.join(',')})`;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(i, 0);
                this.ctx.lineTo(i, WINDOW_HEIGHT);
                this.ctx.stroke();
            }

            const panel = {x: 60, y: 60, w: WINDOW_WIDTH - 120, h: WINDOW_HEIGHT - 120};
            this.ctx.fillStyle = `rgb(${cBg.join(',')})`;
            this.ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
            this.ctx.strokeStyle = `rgb(${cBorder.join(',')})`;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);

            this.drawTextCentered("AUTO BATTLE", 36, cText, -230);
            this.ctx.fillStyle = `rgb(${cText.join(',')})`;
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';

            if (this.battleState.inProgress) {
                this.ctx.font = 'bold 12px Arial';
                this.ctx.fillText(`Level: ${this.battleLevel}`, panel.x + 20, panel.y + 58);
                this.ctx.font = '12px Arial';
            }

            // Hide equipped summary text between battles and during selection.

            if (!this.battleState.inProgress && !this.battleSelect.active) {
                if (this.battleTab === "item_gacha") {
                    this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                    this.ctx.font = 'bold 20px Arial';
                    this.ctx.fillText("GACHA ITEMS", panel.x + 40, panel.y + 90);
                    this.ctx.font = '12px Arial';
                    this.ctx.fillText("Spend tickets to pull battle items", panel.x + 40, panel.y + 118);

                    const slider = this.getBattleGachaSliderRect();
                    const tickets = this.dataManager.data.tickets || 0;
                    const minValue = tickets > 0 ? 1 : 0;
                    const maxValue = Math.max(1, tickets);
                    if (tickets === 0) this.gachaSpend = 0;

                    this.ctx.strokeStyle = `rgb(${cBorder.join(',')})`;
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(slider.x, slider.y + slider.h / 2);
                    this.ctx.lineTo(slider.x + slider.w, slider.y + slider.h / 2);
                    this.ctx.stroke();

                    const pct = maxValue === minValue ? 0 : (this.gachaSpend - minValue) / (maxValue - minValue);
                    const knobX = slider.x + slider.w * Math.max(0, Math.min(1, pct));
                    this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                    this.ctx.beginPath();
                    this.ctx.arc(knobX, slider.y + slider.h / 2, 8, 0, Math.PI * 2);
                    this.ctx.fill();

                    this.ctx.font = '12px Arial';
                    this.ctx.textAlign = 'left';
                    this.ctx.fillText(`Spend: ${this.gachaSpend}`, slider.x, slider.y + 18);
                    this.ctx.textAlign = 'right';
                    this.ctx.fillText(`Max: ${tickets}`, slider.x + slider.w, slider.y + 18);
                    this.ctx.textAlign = 'left';
                } else if (this.battleTab === "items") {
                    this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                    this.ctx.font = 'bold 20px Arial';
                    this.ctx.fillText("GACHA ITEMS", panel.x + 40, panel.y + 90);
                    this.ctx.font = '12px Arial';
                    this.ctx.fillText("Spend tickets to pull battle items", panel.x + 40, panel.y + 118);

                    this.ctx.font = 'bold 14px Arial';
                    this.ctx.fillText("MERGE ITEMS", panel.x + 40, panel.y + 160);
                    this.ctx.font = '12px Arial';
                    this.ctx.fillText("Spend tickets to power item merges (1 ticket = 1 value)", panel.x + 40, panel.y + 180);

                    const mergeSlider = this.getBattleItemMergeSliderRect();
                    const tickets = this.dataManager.data.tickets || 0;
                    const mergeMinValue = 0;
                    const mergeMaxValue = Math.max(0, tickets);
                    if (tickets === 0) this.itemMergeSpend = 0;

                    this.ctx.strokeStyle = `rgb(${cBorder.join(',')})`;
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(mergeSlider.x, mergeSlider.y + mergeSlider.h / 2);
                    this.ctx.lineTo(mergeSlider.x + mergeSlider.w, mergeSlider.y + mergeSlider.h / 2);
                    this.ctx.stroke();

                    const mergePct = mergeMaxValue === mergeMinValue ? 0 : (this.itemMergeSpend - mergeMinValue) / (mergeMaxValue - mergeMinValue);
                    const mergeKnobX = mergeSlider.x + mergeSlider.w * Math.max(0, Math.min(1, mergePct));
                    this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                    this.ctx.beginPath();
                    this.ctx.arc(mergeKnobX, mergeSlider.y + mergeSlider.h / 2, 8, 0, Math.PI * 2);
                    this.ctx.fill();

                    this.ctx.font = '12px Arial';
                    this.ctx.textAlign = 'left';
                    this.ctx.fillText(`Spend: ${this.itemMergeSpend}`, mergeSlider.x, mergeSlider.y + 18);
                    this.ctx.textAlign = 'right';
                    this.ctx.fillText(`Max: ${tickets}`, mergeSlider.x + mergeSlider.w, mergeSlider.y + 18);
                    this.ctx.textAlign = 'left';

                    const listX = panel.x + 40;
                    const listY = panel.y + 230;
                    const rowH = 34;
                    const owned = this.gachaItems.slice(-6).reverse();
                    this.ctx.font = '12px Arial';
                    for (let i = 0; i < owned.length; i++) {
                        const item = owned[i];
                        const meta = GACHA_ITEMS[item.type];
                        const label = meta ? `${meta.name} Lv.${item.level || 1}` : item.type;
                        if (this.selectedGachaItemIds.has(item.id)) {
                            const highlightX = listX - 6;
                            const highlightY = listY + i * rowH - 2;
                            const highlightW = panel.x + panel.w - 160 - highlightX;
                            this.ctx.fillStyle = 'rgba(0, 120, 255, 0.2)';
                            this.ctx.fillRect(highlightX, highlightY, Math.max(0, highlightW), rowH);
                            this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                        }
                        this.ctx.fillText(label, listX, listY + i * rowH);
                        const sub = this.getItemEffectSummary(item.type, item.level || 1);
                        if (sub) {
                            this.ctx.font = '10px Arial';
                            this.ctx.fillText(sub, listX, listY + i * rowH + 12);
                            this.ctx.font = '12px Arial';
                        }
                        const sellValue = this.getGachaItemSellValue(item.type, item.level || 1);
                        this.ctx.textAlign = 'right';
                        this.ctx.fillText(`Sell: ${sellValue}`, panel.x + panel.w - 10, listY + i * rowH);
                        this.ctx.textAlign = 'left';
                    }
                }
            }

            const now = Date.now();
            const inProgress = this.battleState.inProgress;
            if (inProgress) {
                const progress = Math.min(1, (now - this.battleState.turnStartedAt) / this.battleState.turnDuration);
                const wobble = Math.sin(now / 120) * 4;

                const allyX = panel.x + 80;
                const enemyX = panel.x + panel.w - 200;
                const baseY = panel.y + 120;
                const spacingY = 90;
                const playerStats = this.getBattlePlayerStats();
                const activeSkin = this.battleState.awaitingTarget ? (this.battleState.pendingSkinIndex ?? -1) : -1;
                const anim = this.battleState.attackAnim || {active: false};
                let animT = 0;
                if (anim.active) {
                    animT = Math.min(1, (now - anim.startAt) / (anim.duration || 380));
                    if (animT >= 1) {
                        anim.active = false;
                    }
                }

                const getUnitPos = (type, idx) => {
                    const y = baseY + idx * spacingY + (type === "enemy" ? -wobble : wobble);
                    const x = type === "enemy" ? enemyX : allyX;
                    return {x, y};
                };

                const getAnimOffset = (type, idx) => {
                    if (!anim.active || anim.attackerType !== type || anim.attackerIndex !== idx) return {x: 0, y: 0};
                    const attacker = getUnitPos(anim.attackerType, anim.attackerIndex);
                    const defender = getUnitPos(anim.defenderType, anim.defenderIndex);
                    const dx = defender.x - attacker.x;
                    const dy = defender.y - attacker.y;
                    const ease = animT < 0.5 ? animT / 0.5 : (1 - animT) / 0.5;
                    const factor = 0.25 * Math.max(0, Math.min(1, ease));
                    return {x: dx * factor, y: dy * factor};
                };

                for (let i = 0; i < 3; i++) {
                    const slot = this.battleTeam[i];
                    const skin = SKINS[slot.skinKey] || SKINS.default;
                    const maxHp = this.battleState.playerMaxHealths?.[i] ?? playerStats[i].maxHealth;
                    const hp = this.battleState.playerHealths?.[i] ?? maxHp;
                    if (hp <= 0) continue;

                    const offset = getAnimOffset("player", i);
                    const y = baseY + i * spacingY + wobble + offset.y;
                    const x = allyX + offset.x;
                    this.ctx.fillStyle = `rgb(${skin.color.join(',')})`;
                    this.ctx.fillRect(x, y, 50, 50);
                    this.ctx.strokeStyle = 'rgb(0,0,0)';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(x, y, 50, 50);
                    if (i === activeSkin) {
                        this.ctx.strokeStyle = 'rgb(255, 215, 0)';
                        this.ctx.lineWidth = 3;
                        this.ctx.strokeRect(x - 3, y - 3, 56, 56);
                    }

                    const barW = 70;
                    const barH = 6;
                    this.ctx.fillStyle = 'rgb(80, 80, 80)';
                    this.ctx.fillRect(x - 10, y - 12, barW, barH);
                    this.ctx.fillStyle = 'rgb(0, 200, 0)';
                    this.ctx.fillRect(x - 10, y - 12, barW * Math.max(0, Math.min(1, hp / maxHp)), barH);
                }

                const enemies = this.battleState.enemies.length ? this.battleState.enemies : Array(3).fill().map(() => ({color: [200, 80, 80], maxHealth: 1}));
                for (let i = 0; i < 3; i++) {
                    const enemy = enemies[i] || enemies[0];
                    const offset = getAnimOffset("enemy", i);
                    const y = baseY + i * spacingY - wobble + offset.y;
                    const x = enemyX + offset.x;
                    const maxHp = this.battleState.enemyMaxHealths?.[i] ?? enemy.maxHealth ?? 1;
                    const hp = this.battleState.enemyHealths?.[i] ?? maxHp;
                    if (hp <= 0) continue;
                    const enemyColor = enemy.color || [200, 80, 80];
                    this.ctx.fillStyle = `rgb(${enemyColor.map(v => Math.floor(v)).join(',')})`;
                    this.ctx.fillRect(x, y, 50, 50);
                    this.ctx.strokeStyle = 'rgb(0,0,0)';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(x, y, 50, 50);
                    const barW = 70;
                    const barH = 6;
                    this.ctx.fillStyle = 'rgb(80, 80, 80)';
                    this.ctx.fillRect(x - 10, y - 12, barW, barH);
                    this.ctx.fillStyle = 'rgb(200, 60, 60)';
                    this.ctx.fillRect(x - 10, y - 12, barW * Math.max(0, Math.min(1, hp / maxHp)), barH);
                }

                if (anim.active && animT > 0.2 && animT < 0.8) {
                    const aPos = getUnitPos(anim.attackerType, anim.attackerIndex);
                    const dPos = getUnitPos(anim.defenderType, anim.defenderIndex);
                    const aOffset = getAnimOffset(anim.attackerType, anim.attackerIndex);
                    const dOffset = {x: 0, y: 0};
                    const ax = aPos.x + aOffset.x + 25;
                    const ay = aPos.y + aOffset.y + 25;
                    const dx = dPos.x + dOffset.x + 25;
                    const dy = dPos.y + dOffset.y + 25;
                    const negBg = cBg.map(v => 255 - v);
                    this.ctx.strokeStyle = `rgba(${negBg.join(',')}, 0.8)`;
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(ax, ay);
                    this.ctx.lineTo(dx, dy);
                    this.ctx.stroke();
                }

                this.ctx.fillStyle = 'rgb(80, 80, 80)';
                this.ctx.fillRect(panel.x + 80, panel.y + panel.h - 70, panel.w - 160, 8);
                this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                this.ctx.fillRect(panel.x + 80, panel.y + panel.h - 70, (panel.w - 160) * progress, 8);
                this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                this.ctx.font = 'bold 14px Arial';
                this.ctx.textAlign = 'center';
                if (this.battleState.awaitingTarget && !this.battleState.autoTarget) {
                    this.ctx.fillText("Select an enemy target", WINDOW_WIDTH / 2, panel.y + panel.h - 50);
                } else {
                    this.ctx.fillText("Next attack...", WINDOW_WIDTH / 2, panel.y + panel.h - 50);
                }
                this.ctx.textAlign = 'left';
            }

            if (this.battleResult) {
                this.ctx.fillStyle = `rgb(${cText.join(',')})`;
                this.ctx.font = 'bold 16px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(this.battleResult, WINDOW_WIDTH / 2, panel.y + panel.h - 40);
                this.ctx.textAlign = 'left';
            }

            for (const btn of this.battleButtons) {
                if (this.battleState.inProgress && !["LEAVE", "AUTO TARGET: ON", "AUTO TARGET: OFF"].includes(btn.text)) continue;
                if (btn.style === "outline") {
                    btn.textColor = cText;
                    btn.color = cBg;
                }
                btn.draw(this.ctx, 14);
            }

            if (this.gachaAnim.active && !this.battleState.inProgress && this.battleTab === "item_gacha") {
                this.drawGachaAnimation(panel, {
                    bg: cBg,
                    floor: cFloor,
                    text: cText,
                    border: cBorder
                });
            }
        } else if (this.state === STATE_GAMEOVER) {
            this.drawTextCentered("GAME OVER", 80, cLava, -50);
            this.drawTextCentered(`Level Reached: ${this.level}`, 18, cText, 20);
            this.drawTextCentered("SPACE: Menu | R: Restart | SHIFT+R: Reroll", 18, cBorder, 60);
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
Collect blue pickups to freeze lava for time proportional to your current level
Spin Gacha for random skins and boosts. Boosts can be equipped for various bonuses, or sold for tickets.
Complete missions to earn tickets and unlock more gacha rewards
Beat Level 20 to reroll missions and get new ones
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
                         let lavColor = cLava;
                         if (this.isLavaFrozen()) {
                             const flashState = Math.floor(Date.now() / 100) % 2;
                             if (flashState === 1) {
                                 lavColor = [255 - cLava[0], 255 - cLava[1], 255 - cLava[2]];
                             }
                         }
                         this.ctx.fillStyle = `rgb(${lavColor.join(',')})`;
                         this.ctx.fillRect(x, y, this.tileW, this.tileH);
                    }

                    for (const pickup of this.lavaFreezePickups) {
                         if (pickup && pickup[0] === r && pickup[1] === c) {
                             this.ctx.fillStyle = 'rgb(120, 200, 255)';
                             this.ctx.fillRect(x + this.tileW * 0.2, y + this.tileH * 0.2, this.tileW * 0.6, this.tileH * 0.6);
                             this.ctx.strokeStyle = 'rgb(255, 255, 255)';
                             this.ctx.lineWidth = 2;
                             this.ctx.strokeRect(x + this.tileW * 0.2, y + this.tileH * 0.2, this.tileW * 0.6, this.tileH * 0.6);
                             break;
                         }
                    }

                    for (const ticket of this.ticketPickups) {
                         if (ticket && ticket[0] === r && ticket[1] === c) {
                             this.ctx.fillStyle = 'rgb(255, 210, 80)';
                             this.ctx.fillRect(x + this.tileW * 0.25, y + this.tileH * 0.25, this.tileW * 0.5, this.tileH * 0.5);
                             this.ctx.strokeStyle = 'rgb(120, 80, 0)';
                             this.ctx.lineWidth = 2;
                             this.ctx.strokeRect(x + this.tileW * 0.25, y + this.tileH * 0.25, this.tileW * 0.5, this.tileH * 0.5);
                             this.ctx.fillStyle = 'rgb(80, 50, 0)';
                             this.ctx.font = 'bold 10px Arial';
                             this.ctx.textAlign = 'center';
                             this.ctx.textBaseline = 'middle';
                             this.ctx.fillText('T', x + this.tileW * 0.5, y + this.tileH * 0.5);
                             this.ctx.textAlign = 'left';
                             this.ctx.textBaseline = 'alphabetic';
                             break;
                         }
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

            if (this.practiceGhostTrace.length >= 2) {
                this.ctx.strokeStyle = 'rgb(255, 0, 0)';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(this.practiceGhostTrace[0][0] + sx, this.practiceGhostTrace[0][1] + sy);
                for (let i = 1; i < this.practiceGhostTrace.length; i++) {
                    this.ctx.lineTo(this.practiceGhostTrace[i][0] + sx, this.practiceGhostTrace[i][1] + sy);
                }
                this.ctx.stroke();
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
                this.ctx.fillStyle = 'rgb(100, 100, 100)';
                this.ctx.fillRect(WINDOW_WIDTH / 2 - 200, 30, 400, 10);
                let barColor = cLava;
                if (this.isLavaFrozen()) {
                    const flashState = Math.floor(Date.now() / 100) % 2;
                    if (flashState === 1) {
                        barColor = [255 - cLava[0], 255 - cLava[1], 255 - cLava[2]];
                    }
                }
                this.ctx.fillStyle = `rgb(${barColor.join(',')})`;
                this.ctx.fillRect(WINDOW_WIDTH / 2 - 200, 30, 400 * pct, 10);
            } else {
                this.drawTextCentered("RUN!", 40, [180, 50, 50], -250);
            }

            // Draw level display
            this.ctx.fillStyle = 'rgb(0, 50, 150)';
            this.ctx.font = 'bold 40px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(String(this.level), 20, 20);

            // Lava freeze timer indicator
            const currentTime = this.isPaused && this.pauseStartedAt ? this.pauseStartedAt : Date.now();
            const freezeRemaining = Math.max(0, this.lavaFrozenUntil - currentTime);
            if (freezeRemaining > 0) {
                const seconds = (freezeRemaining / 1000).toFixed(1);
                this.ctx.fillStyle = `rgb(${cLava.join(',')})`;
                this.ctx.font = 'bold 18px Arial';
                this.ctx.textAlign = 'right';
                this.ctx.textBaseline = 'top';
                this.ctx.fillText(`Lava Frozen: ${seconds}s`, WINDOW_WIDTH - 20, 20);
                this.ctx.textAlign = 'left';
            }

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
            if (!this.isPaused) {
                this.updateMissionProgress("play_time", delta / 1000);
                this.updateMissionProgress("styled_time", delta / 1000);
            }
            this.updatePlayerMovement();
            this.updateMisc();
            this.updateLava();
            this.checkCollisions();

            if (!this.isPaused && !this.isMoving && this.playerGridPos[0] === this.mazeGen.end[0] &&
                this.playerGridPos[1] === this.mazeGen.end[1]) {
                if (this.practice_mode) {
                    this.updateMissionProgress("practice_levels", 1);
                } else {
                    this.updateMissionProgress("complete_levels", 1);
                    this.dataManager.data.points += this.level * 10;
                }
                this.dataManager.save();
                if (!this.practice_mode && this.level === 20) {
                    const reroll = confirm("Reroll missions?");
                    if (reroll) {
                        this.rerollMissions();
                    }
                }
                this.level++;
                if (!this.practice_mode) {
                    this.updateMissionProgress("reach_level", this.level, true);
                }
                this.gameStartTime = Date.now();
                this.initLevel();
            }
        } else if (this.state === STATE_BATTLE) {
            this.updateBattle();
        }

        this.updateGachaAnimation();
        this.draw();

        setTimeout(() => this.gameLoop(), 1000 / FPS);
    }
}

// Start the game
