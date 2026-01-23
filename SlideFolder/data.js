/* =====================
   DATA MANAGER
   Handles game saves & loads
   ===================== */
class DataManager {
    constructor() {
        this.data = {
            high_level: 1,
            high_level_practice: 1,
            points: 0,
            equipped_skin: "default",
            equipped_trail: "none",
            equipped_anim: "none",
            equipped_level_skin: "default",
            unlocked_trails: ["none"],
            unlocked_anims: ["none"],
            unlocked_level_skins: ["default"]
        };
        this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem('slide_game_data');
            if (saved) {
                Object.assign(this.data, JSON.parse(saved));
            }
        } catch (e) {}
    }

    save() {
        try {
            localStorage.setItem('slide_game_data', JSON.stringify(this.data));
        } catch (e) {}
    }
}
