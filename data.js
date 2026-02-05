/* =====================
   DATA MANAGER
   Handles game saves & loads
   ===================== */
class DataManager {
    constructor() {
        this.saveKey = 'slide_game_data';
        this.hashSalt = 'slide_v1_salt';
        this.resetNotice = null;
        this.data = {
            high_level: 1,
            high_level_practice: 1,
            points: 0,
            tickets: 0,
            missions: [],
            boosts: [],
            equipped_boosts: [],
            equipped_skin: "default",
            equipped_trail: "none",
            equipped_anim: "none",
            equipped_level_skin: "default",
            unlocked_trails: ["none"],
            unlocked_anims: ["none"],
            unlocked_level_skins: ["default"],
            unlocked_gacha_skins: []
        };
        this.load();
    }

    resetToDefaults(reason = "Save data was reset.") {
        this.data = {
            high_level: 1,
            high_level_practice: 1,
            points: 0,
            tickets: 0,
            missions: [],
            boosts: [],
            equipped_boosts: [],
            equipped_skin: "default",
            equipped_trail: "none",
            equipped_anim: "none",
            equipped_level_skin: "default",
            unlocked_trails: ["none"],
            unlocked_anims: ["none"],
            unlocked_level_skins: ["default"],
            unlocked_gacha_skins: []
        };
        this.resetNotice = reason;
        this.save();
    }

    hashString(str) {
        let hash = 2166136261;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16);
    }

    computeHash(data) {
        const payload = JSON.stringify(data);
        return this.hashString(`${this.hashSalt}|${payload}`);
    }

    load() {
        try {
            const saved = localStorage.getItem(this.saveKey);
            if (!saved) return;
            const parsed = JSON.parse(saved);

            if (parsed && typeof parsed === 'object' && parsed.data && parsed.hash) {
                const expected = this.computeHash(parsed.data);
                if (expected === parsed.hash) {
                    Object.assign(this.data, parsed.data);
                } else {
                    this.resetToDefaults("Save data was reset because it appears to be modified or corrupted.");
                }
            } else {
                Object.assign(this.data, parsed);
            }
        } catch (e) {
            this.resetToDefaults("Save data was reset because it could not be loaded.");
        }
    }

    save() {
        try {
            const hash = this.computeHash(this.data);
            const wrapped = { data: this.data, hash };
            localStorage.setItem(this.saveKey, JSON.stringify(wrapped));
        } catch (e) {}
    }
}
