(function () {
    if (typeof Game === "undefined") return;

    Game.prototype.handleBattleListClick = function (x, y) {
        if (this.battleTab === "items") {
            const {panel, listX, listY, rowH, items} = this.getBattleGachaItemListLayout();
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
        }
    };

    Game.prototype.handleBattleFightClick = function (x, y) {
        if (!this.battleState.awaitingTarget) return;
        for (const btn of this.battleButtons) {
            if (this.isPointInRect(x, y, btn.rect)) return;
        }
        const {panel, enemyX, baseY, spacingY} = this.getBattleCombatLayout();
        const wobble = Math.sin(Date.now() / 120) * 4;
        const bandTop = baseY - 20;
        const bandHeight = 90;
        if (x < enemyX - 40) return;
        for (let i = 0; i < 3; i++) {
            const bandY = bandTop + i * spacingY - wobble;
            if (y >= bandY && y <= bandY + bandHeight) {
                if ((this.battleState.enemyHealths?.[i] ?? 1) <= 0) return;
                const skinIdx = this.battleState.pendingSkinIndex ?? 0;
                this.performPlayerAttack(skinIdx, i);
                return;
            }
        }
    };

    Game.prototype.initBattleTeam = function () {
        if (!Array.isArray(this.battleTeam)) this.battleTeam = [];
        while (this.battleTeam.length < 3) {
            this.battleTeam.push({
                skinKey: "default",
                items: [null, null]
            });
        }
        this.battleTeam = this.battleTeam.slice(0, 3);
        this.saveBattleTeam();
    };

    Game.prototype.saveBattleTeam = function () {
        this.dataManager.data.battle_team = this.battleTeam;
        this.dataManager.save();
    };

    Game.prototype.saveBattleLevel = function () {
        this.dataManager.data.battle_level = this.battleLevel;
        this.dataManager.save();
    };

    Game.prototype.getBattleItemByRef = function (itemRef) {
        if (!itemRef) return null;
        const byId = this.gachaItems.find(it => it.id === itemRef);
        if (byId) return byId;
        const byType = this.gachaItems.find(it => it.type === itemRef);
        if (byType) return byType;
        return {type: itemRef, level: 1};
    };

    Game.prototype.ensureBattleItemIds = function () {
        const usedIds = new Set();
        let changed = false;
        for (const slot of this.battleTeam) {
            if (!slot || !Array.isArray(slot.items)) continue;
            for (let i = 0; i < slot.items.length; i++) {
                const ref = slot.items[i];
                if (!ref) continue;
                const byId = this.gachaItems.find(it => it.id === ref);
                if (byId) {
                    if (!usedIds.has(byId.id)) {
                        usedIds.add(byId.id);
                        continue;
                    }
                    const candidates = this.gachaItems
                        .filter(it => it.type === byId.type && !usedIds.has(it.id))
                        .sort((a, b) => (b.level || 1) - (a.level || 1));
                    if (candidates.length) {
                        slot.items[i] = candidates[0].id;
                        usedIds.add(candidates[0].id);
                        changed = true;
                    } else {
                        slot.items[i] = null;
                        changed = true;
                    }
                    continue;
                }
                const candidates = this.gachaItems
                    .filter(it => it.type === ref && !usedIds.has(it.id))
                    .sort((a, b) => (b.level || 1) - (a.level || 1));
                if (candidates.length) {
                    slot.items[i] = candidates[0].id;
                    usedIds.add(candidates[0].id);
                    changed = true;
                } else {
                    slot.items[i] = null;
                    changed = true;
                }
            }
        }
        if (changed) {
            this.saveBattleTeam();
        }
    };

    Game.prototype.getSkinBattlePower = function (skinKey) {
        const skin = SKINS[skinKey] || SKINS.default;
        const base = 5 + Math.floor((skin.level_req || 0) / 10);
        const bonus = skin.gacha ? 6 : 0;
        return base + bonus;
    };

    Game.prototype.getItemBattlePower = function (itemKey, level = 1) {
        const item = GACHA_ITEMS[itemKey];
        return item ? item.power * Math.max(1, level) : 0;
    };

    Game.prototype.getBattleSlotItemPower = function (slot) {
        return (slot.items || []).reduce((sum, itemRef) => {
            const item = this.getBattleItemByRef(itemRef);
            if (!item) return sum;
            const level = item.level || 1;
            return sum + this.getItemBattlePower(item.type, level);
        }, 0);
    };

    Game.prototype.getBattleItemModifiers = function (slot) {
        let attackMult = 1;
        let healthMult = 1;
        let attackBonus = 0;
        let healthBonus = 0;
        for (const itemRef of (slot.items || [])) {
            const item = this.getBattleItemByRef(itemRef);
            if (!item) continue;
            const meta = GACHA_ITEMS[item.type];
            if (!meta) continue;
            const level = item.level || 1;
            if (Number.isFinite(meta.attackMult)) attackMult *= meta.attackMult;
            if (Number.isFinite(meta.healthMult)) healthMult *= meta.healthMult;
            if (Number.isFinite(meta.attackBonus)) attackBonus += meta.attackBonus * level;
            if (Number.isFinite(meta.healthBonus)) healthBonus += meta.healthBonus * level;
        }
        return {attackMult, healthMult, attackBonus, healthBonus};
    };

    Game.prototype.getItemEffectSummary = function (itemKey, level = 1) {
        const meta = GACHA_ITEMS[itemKey];
        if (!meta) return "";
        const parts = [];
        if (Number.isFinite(meta.attackMult) && meta.attackMult !== 1) {
            parts.push(`Atk x${meta.attackMult.toFixed(2)}`);
        }
        if (Number.isFinite(meta.healthMult) && meta.healthMult !== 1) {
            parts.push(`HP x${meta.healthMult.toFixed(2)}`);
        }
        if (Number.isFinite(meta.attackBonus) && meta.attackBonus !== 0) {
            parts.push(`Atk +${Math.round(meta.attackBonus * level)}`);
        }
        if (Number.isFinite(meta.healthBonus) && meta.healthBonus !== 0) {
            parts.push(`HP +${Math.round(meta.healthBonus * level)}`);
        }
        return parts.join(" ");
    };

    Game.prototype.getBattlePlayerStats = function () {
        return this.battleTeam.map((slot) => {
            const skinPower = this.getSkinBattlePower(slot.skinKey);
            const itemPower = this.getBattleSlotItemPower(slot);
            const baseAttack = Math.max(2, Math.round(skinPower * 2 + itemPower * 1.4));
            const baseHealth = Math.max(20, Math.round(40 + skinPower * 6 + itemPower * 4));
            const mods = this.getBattleItemModifiers(slot);
            const attack = Math.max(1, Math.round((baseAttack + mods.attackBonus) * mods.attackMult));
            const maxHealth = Math.max(1, Math.round((baseHealth + mods.healthBonus) * mods.healthMult));
            return {attack, maxHealth, skinPower, itemPower};
        });
    };

    Game.prototype.getHighestHealthIndex = function (healths) {
        let best = -1;
        let bestHp = -1;
        for (let i = 0; i < healths.length; i++) {
            if (healths[i] > bestHp) {
                bestHp = healths[i];
                best = i;
            }
        }
        return best;
    };

    Game.prototype.getBattleCombatLayout = function () {
        const panel = this.getBattlePanelRect();
        const allyX = panel.x + 80;
        const enemyX = panel.x + panel.w - 200;
        const baseY = panel.y + 120;
        const spacingY = 90;
        return {panel, allyX, enemyX, baseY, spacingY};
    };

    Game.prototype.startAttackAnimation = function (attackerType, attackerIndex, defenderType, defenderIndex) {
        this.battleState.attackAnim = {
            active: true,
            startAt: Date.now(),
            duration: 380,
            attackerType,
            attackerIndex,
            defenderType,
            defenderIndex
        };
    };

    Game.prototype.resolveBattle = function () {
        // Deprecated by turn-based combat.
    };

    Game.prototype.startBattle = function () {
        if (this.battleState.inProgress) return;
        this.ensureBattleItemIds();
        this.battleResult = "";
        this.battleButtons = this.battleButtons.filter(btn => btn.text === "BACK");
        const now = Date.now();
        const playerStats = this.getBattlePlayerStats();
        const existingHealths = this.battleState.playerHealths;
        const maxHealths = playerStats.map(s => s.maxHealth);
        let playerHealths = maxHealths.slice();
        if (Array.isArray(existingHealths) && existingHealths.length === 3) {
            playerHealths = existingHealths.map((hp, idx) => Math.max(0, Math.min(hp, maxHealths[idx])));
        }

        const enemies = Array(3).fill().map(() => {
            const maxHealth = Math.round(35 + this.battleLevel * 10 + Math.random() * 12);
            const damage = Math.round(6 + this.battleLevel * 3 + Math.random() * 4);
            const color = [200 + Math.random() * 55, 60 + Math.random() * 60, 60 + Math.random() * 60];
            return {maxHealth, health: maxHealth, damage, color};
        });

        this.battleState = {
            inProgress: true,
            startAt: now,
            duration: 4500,
            enemies,
            resolved: false,
            pendingContinue: false,
            nextBattleAt: 0,
            turnIndex: 0,
            turnStartedAt: now,
            turnDuration: this.battleState.turnDuration || 900,
            playerHealths,
            playerMaxHealths: maxHealths,
            enemyHealths: enemies.map(e => e.health),
            enemyMaxHealths: enemies.map(e => e.maxHealth),
            autoTarget: this.battleState.autoTarget || false,
            playerTargets: Array.isArray(this.battleState.playerTargets) ? this.battleState.playerTargets.slice(0, 3) : [0, 0, 0],
            awaitingTarget: false,
            pendingSkinIndex: Number.isFinite(this.battleState.pendingSkinIndex) ? this.battleState.pendingSkinIndex : 0
        };
        this.createBattleUI();
    };

    Game.prototype.updateBattle = function () {
        const now = Date.now();
        if (this.battleState.inProgress && !this.battleState.resolved) {
            if (!this.battleState.awaitingTarget && now - this.battleState.turnStartedAt >= this.battleState.turnDuration) {
                this.processBattleTurn();
            }
        }
        if (!this.battleState.inProgress && this.battleState.pendingContinue && now >= this.battleState.nextBattleAt) {
            this.battleState.pendingContinue = false;
            this.startBattle();
        }
    };

    Game.prototype.processBattleTurn = function () {
        const state = this.battleState;
        const now = Date.now();
        const playerStats = this.getBattlePlayerStats();
        const players = state.playerHealths || [0, 0, 0];
        const enemies = state.enemyHealths || [0, 0, 0];

        const allPlayersDown = players.every(hp => hp <= 0);
        const allEnemiesDown = enemies.every(hp => hp <= 0);
        if (allPlayersDown || allEnemiesDown) {
            this.finishBattle(allEnemiesDown);
            return;
        }

        let attempts = 0;
        while (attempts < 6) {
            const idx = state.turnIndex % 6;
            state.turnIndex += 1;
            attempts += 1;

            if (idx < 3) {
                if (players[idx] <= 0) continue;
                if (!state.autoTarget) {
                    state.awaitingTarget = true;
                    state.pendingSkinIndex = idx;
                    state.turnStartedAt = now;
                    return;
                }
                const targetIdx = this.getHighestHealthIndex(enemies);
                if (targetIdx < 0) break;
                const dmg = playerStats[idx].attack;
                enemies[targetIdx] = Math.max(0, enemies[targetIdx] - dmg);
                this.startAttackAnimation("player", idx, "enemy", targetIdx);
                break;
            } else {
                const eIdx = idx - 3;
                if (enemies[eIdx] <= 0) continue;
                const targetIdx = this.getHighestHealthIndex(players);
                if (targetIdx < 0) break;
                const dmg = state.enemies[eIdx]?.damage || 5;
                players[targetIdx] = Math.max(0, players[targetIdx] - dmg);
                this.startAttackAnimation("enemy", eIdx, "player", targetIdx);
                break;
            }
        }

        state.playerHealths = players;
        state.enemyHealths = enemies;
        state.turnStartedAt = now;

        if (players.every(hp => hp <= 0)) {
            this.finishBattle(false);
            return;
        }
        if (enemies.every(hp => hp <= 0)) {
            this.finishBattle(true);
        }
    };

    Game.prototype.finishBattle = function (victory) {
        const now = Date.now();
        if (victory) {
            const reward = Math.max(1, Math.floor(this.battleLevel / 6) + Math.floor(Math.random() * 3));
            this.dataManager.data.tickets = (this.dataManager.data.tickets || 0) + reward;
            this.dataManager.save();
            this.battleResult = `Victory! +${reward} tickets`;
            this.battleLevel += 1;
            this.saveBattleLevel();
            this.battleState.pendingContinue = true;
            this.battleState.nextBattleAt = now + 700;
        } else {
            this.battleResult = "Defeat... try again";
            this.battleLevel = 1;
            this.saveBattleLevel();
            this.battleState.autoTarget = false;
            this.battleState.playerTargets = [0, 0, 0];
            this.battleState.playerHealths = null;
            this.battleState.awaitingTarget = false;
        }
        this.battleState.inProgress = false;
        this.battleState.resolved = true;
        if (!this.battleState.pendingContinue) {
            this.createBattleUI();
        }
    };

    Game.prototype.performPlayerAttack = function (playerIndex, targetIndex) {
        const state = this.battleState;
        const playerStats = this.getBattlePlayerStats();
        const enemies = state.enemyHealths || [0, 0, 0];
        if (!enemies[targetIndex] || enemies[targetIndex] <= 0) return;
        const dmg = playerStats[playerIndex]?.attack || 0;
        enemies[targetIndex] = Math.max(0, enemies[targetIndex] - dmg);
        this.startAttackAnimation("player", playerIndex, "enemy", targetIndex);
        state.enemyHealths = enemies;
        state.awaitingTarget = false;
        state.turnStartedAt = Date.now();
        if (enemies.every(hp => hp <= 0)) {
            this.finishBattle(true);
        }
    };

    Game.prototype.openBattleSelect = function (slotIndex, type, itemIndex = 0) {
        this.battleSelect = {active: true, slotIndex, type, itemIndex, selectionType: type};
        this.createBattleUI();
    };

    Game.prototype.resetBattleRun = function (resetLevel = true) {
        this.battleState.inProgress = false;
        this.battleState.pendingContinue = false;
        this.battleState.autoTarget = false;
        this.battleState.playerTargets = [0, 0, 0];
        this.battleState.awaitingTarget = false;
        this.battleState.pendingSkinIndex = 0;
        this.battleState.playerHealths = null;
        this.battleState.playerMaxHealths = null;
        this.battleState.enemyHealths = null;
        this.battleState.enemyMaxHealths = null;
        this.battleState.enemies = [];
        this.battleState.attackAnim = {active: false, startAt: 0, duration: 380, attackerType: "player", attackerIndex: 0, defenderType: "enemy", defenderIndex: 0};
        this.battleResult = "";
        if (resetLevel) {
            this.battleLevel = 1;
            this.saveBattleLevel();
        }
    };

    Game.prototype.createBattleUI = function () {
        this.battleButtons = [];
        const panel = {x: 60, y: 60, w: WINDOW_WIDTH - 120, h: WINDOW_HEIGHT - 120};

        this.ensureBattleItemIds();

        this.battleButtons.push(new Button("BACK", panel.x + 20, panel.y + 20, 80, 40,
            () => {
                this.resetBattleRun(true);
                this.battleSelect.active = false;
                this.state = STATE_MENU;
                this.clearPracticeGhostTrace();
            }, "outline"));

        if (this.battleState.inProgress) {
            this.battleButtons.push(new Button("LEAVE", panel.x + panel.w - 120, panel.y + 20, 90, 40,
                () => {
                    this.resetBattleRun(true);
                    this.battleSelect.active = false;
                    this.createBattleUI();
                }, "outline"));

            const autoLabel = this.battleState.autoTarget ? "AUTO TARGET: ON" : "AUTO TARGET: OFF";
            this.battleButtons.push(new Button(autoLabel, panel.x + 20, panel.y + 20, 170, 30,
                () => {
                    this.battleState.autoTarget = !this.battleState.autoTarget;
                    this.battleState.awaitingTarget = false;
                    this.createBattleUI();
                }, "outline"));
        } else {
            this.battleButtons.push(new Button("FIGHT", panel.x + panel.w - 120, panel.y + 20, 90, 40,
                () => { this.startBattle(); }, "primary"));
        }

        if (!this.battleState.inProgress && !this.battleSelect.active) {
            if (!["team", "item_gacha", "items"].includes(this.battleTab)) {
                this.battleTab = "team";
            }
            const tabs = [["TEAM", "team"], ["ITEM GACHA", "item_gacha"], ["ITEMS", "items"]];
            let tabX = panel.x + 120;
            for (const [label, key] of tabs) {
                const style = this.battleTab === key ? "primary" : "outline";
                this.battleButtons.push(new Button(label, tabX, panel.y + 20, 130, 40,
                    () => {
                        this.battleTab = key;
                        this.selectedGachaItemIds.clear();
                        this.createBattleUI();
                    }, style));
                tabX += 140;
            }
        }

        if (!this.battleState.inProgress && this.battleSelect.active) {
            const select = this.battleSelect;
            const listX = panel.x + 20;
            const listY = panel.y + 90;
            const colW = 220;
            const rowH = 46;
            const maxRows = 6;

            let choices = select.type === "skin"
                ? this.getUnlockedSkinsList()
                : [null, ...this.gachaItems];

            if (select.type === "item") {
                const usedIds = new Set();
                this.battleTeam.forEach((slot, idx) => {
                    (slot.items || []).forEach((itemRef, itemIdx) => {
                        if (idx === select.slotIndex && itemIdx === select.itemIndex) return;
                        if (!itemRef) return;
                        const item = this.getBattleItemByRef(itemRef);
                        if (item?.id) usedIds.add(item.id);
                    });
                });
                choices = choices.filter(item => {
                    if (item === null) return true;
                    return item?.id ? !usedIds.has(item.id) : true;
                });
            }

            for (let i = 0; i < choices.length; i++) {
                const col = Math.floor(i / maxRows);
                const row = i % maxRows;
                const x = listX + col * colW;
                const y = listY + row * rowH;
                const entry = choices[i];
                let label = "None";
                if (select.type === "skin") {
                    const skin = SKINS[entry] || SKINS.default;
                    label = skin.name;
                } else if (entry && entry.type) {
                    const item = GACHA_ITEMS[entry.type];
                    const level = entry.level || 1;
                    const effect = this.getItemEffectSummary(entry.type, level);
                    label = item ? `${item.name} Lv.${level}${effect ? `\n${effect}` : ""}` : entry.type;
                }
                this.battleButtons.push(new Button(label, x, y, 200, 38,
                    () => {
                        const slot = this.battleTeam[select.slotIndex];
                        if (select.type === "skin") {
                            slot.skinKey = entry || "default";
                        } else {
                            slot.items[select.itemIndex] = entry ? entry.id : null;
                        }
                        this.saveBattleTeam();
                        this.battleSelect.active = false;
                        this.createBattleUI();
                    }, "outline"));
            }
        } else if (!this.battleState.inProgress) {
            if (this.battleTab === "item_gacha") {
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
                this.battleButtons.push(new Button("SPIN ITEM", spinX, spinY, spinW, 44,
                    () => this.spinGachaItem(this.gachaSpend || 0), "primary"));
                return;
            }
            if (this.battleTab === "items") {
                const tickets = this.dataManager.data.tickets || 0;
                this.itemMergeSpend = Math.max(0, Math.min(this.itemMergeSpend || 0, tickets));

                const mergeItemsAction = this.selectedGachaItemIds.size >= 2 ? () => this.mergeGachaItems() : null;
                this.battleButtons.push(new Button("MERGE", panel.x + panel.w - 120, panel.y + 80, 90, 40,
                    mergeItemsAction, "outline"));

                const listY = panel.y + 230;
                const owned = this.gachaItems.slice(-6).reverse();
                for (let i = 0; i < owned.length; i++) {
                    const item = owned[i];
                    const btnY = listY + i * 26;
                    this.battleButtons.push(new Button("SELL", panel.x + panel.w - 140, btnY, 80, 22,
                        () => this.sellGachaItem(item.id), "danger"));
                }
                return;
            }
            const listX = panel.x + 20;
            const listY = panel.y + 90;
            const rowH = 110;

            for (let i = 0; i < this.battleTeam.length; i++) {
                const slot = this.battleTeam[i];
                const skin = SKINS[slot.skinKey] || SKINS.default;
                const itemARef = slot.items[0];
                const itemBRef = slot.items[1];
                const itemAObj = this.getBattleItemByRef(itemARef);
                const itemBObj = this.getBattleItemByRef(itemBRef);
                const itemA = itemAObj ? GACHA_ITEMS[itemAObj.type] : null;
                const itemB = itemBObj ? GACHA_ITEMS[itemBObj.type] : null;
                const itemALvl = itemAObj ? (itemAObj.level || 1) : 1;
                const itemBLvl = itemBObj ? (itemBObj.level || 1) : 1;
                const rowY = listY + i * rowH;
                this.battleButtons.push(new Button(skin.name, listX, rowY, 110, 40,
                    () => this.openBattleSelect(i, "skin"), "outline"));

                this.battleButtons.push(new Button(itemA ? `${itemA.name} Lv.${itemALvl}` : "Item A", listX + 190, rowY, 140, 40,
                    () => this.openBattleSelect(i, "item", 0), "outline"));

                this.battleButtons.push(new Button(itemB ? `${itemB.name} Lv.${itemBLvl}` : "Item B", listX + 370, rowY, 140, 40,
                    () => this.openBattleSelect(i, "item", 1), "outline"));
            }
        }
    };
})();
