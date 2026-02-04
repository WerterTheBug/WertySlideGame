/* =====================
   CONFIGURATION & CONSTANTS
   ===================== */
const WINDOW_WIDTH = 800;
const WINDOW_HEIGHT = 600;
const FPS = 60;

const STATE_MENU = "menu";
const STATE_SHOP = "shop";
const STATE_INFO = "info";
const STATE_MISSIONS = "missions";
const STATE_PLAYING = "playing";
const STATE_GAMEOVER = "gameover";

const SKINS = {
    'default': {name: "Classic", color: [0, 0, 255], level_req: 0},
    'crimson': {name: "Crimson", color: [220, 53, 69], level_req: 3},
    'emerald': {name: "Emerald", color: [40, 167, 69], level_req: 5},
    'gold': {name: "Gold", color: [255, 193, 7], border: [0, 0, 0], level_req: 8},
    'shadow': {name: "Shadow", color: [50, 50, 50], border: [0, 0, 0], level_req: 10},
    'ice': {name: "Frost", color: [13, 202, 240], level_req: 12},
    'sunset': {name: "Sunset", color: [253, 126, 20], level_req: 15},
    'midnight': {name: "Midnight", color: [25, 25, 112], border: [138, 43, 226], level_req: 18},
    'mint': {name: "Mint", color: [152, 251, 152], border: [0, 0, 0], level_req: 20},
    'rose': {name: "Rose Gold", color: [255, 105, 180], border: [0, 0, 0], level_req: 22},
    'neon': {name: "Neon", color: [57, 255, 20], type: 'pulse_glow', level_req: 25},
    'galaxy': {name: "Galaxy", color: [72, 61, 139], type: 'galaxy', level_req: 30},
    'reactive': {name: "Reactive", color: [200, 200, 200], level_req: 35, type: 'reactive'},
    'prism': {name: "Prism", color: [255, 255, 255], level_req: 40, type: 'prism'},
    'ghost': {name: "Phantom", color: [200, 255, 255], level_req: 45, type: 'ghost_glitch'},
    'rainbow': {name: "Rainbow", color: [255, 255, 255], level_req: 50, type: 'rainbow'},
    'void': {name: "Void", color: [0, 0, 0], border: [0, 0, 0], level_req: 60, type: 'void_smear'},
    'chrome': {name: "Chrome", color: [192, 192, 192], type: 'liquid_chrome', level_req: 70}
};

const TRAILS = {
    'none': {name: "None", cost: 0, type: 'none'},
    'dust': {name: "Dust", cost: 50, type: 'dust', color: [150, 150, 150]},
    'sparkle': {name: "Sparkle", cost: 150, type: 'sparkle', color: [255, 215, 0]},
    'pixel': {name: "Pixel", cost: 250, type: 'pixel', color: [0, 0, 255]},
    'bubbles': {name: "Bubbles", cost: 400, type: 'bubbles', color: [0, 200, 255]},
    'fire': {name: "Flame", cost: 600, type: 'fire', color: [255, 100, 0]},
    'hearts': {name: "Hearts", cost: 800, type: 'hearts', color: [255, 105, 180]},
    'confetti': {name: "Confetti", cost: 1000, type: 'confetti', color: null},
    'lightning': {name: "Lightning", cost: 1500, type: 'lightning', color: [255, 220, 0]},
    'ghost': {name: "Echo", cost: 2000, type: 'ghost_trail', color: null},
    'spiral': {name: "Spiral", cost: 2500, type: 'spiral', color: [138, 43, 226]},
    'matrix': {name: "Matrix", cost: 3000, type: 'code', color: [0, 180, 0]},
    'galaxy': {name: "Stardust", cost: 4000, type: 'galaxy_trail', color: null}
};

const ANIMATIONS = {
    'none': {name: "Slide", cost: 0},
    'bounce': {name: "Bounce", cost: 300},
    'squish': {name: "Squish", cost: 500},
    'spin': {name: "Spin", cost: 700},
    'pulse': {name: "Pulse", cost: 900},
    'wobble': {name: "Wobble", cost: 1200},
    'stretch': {name: "Stretch", cost: 1500},
    'flip': {name: "Flip", cost: 1800},
    'wave': {name: "Wave", cost: 2200},
    'heavy': {name: "Heavy", cost: 2500}
};

const LEVEL_SKINS = {
    'default': {
        name: "Clean", cost: 0, quirk: null,
        colors: {bg: [255, 255, 255], wall: [0, 0, 0], floor: [245, 245, 245], text: [0, 0, 0], border: [0, 0, 0], lava: [255, 0, 0], end: [0, 255, 0]}
    },
    'dark': {
        name: "Dark Mode", cost: 500, quirk: null,
        colors: {bg: [20, 20, 20], wall: [200, 200, 200], floor: [40, 40, 40], text: [255, 255, 255], border: [100, 100, 100], lava: [200, 50, 50], end: [50, 200, 50]}
    },
    'retro': {
        name: "Terminal", cost: 1000, quirk: 'scanlines',
        colors: {bg: [0, 10, 0], wall: [0, 255, 0], floor: [0, 40, 0], text: [0, 255, 0], border: [0, 150, 0], lava: [255, 100, 0], end: [0, 255, 255]}
    },
    'blueprint': {
        name: "Blueprint", cost: 1500, quirk: 'grid',
        colors: {bg: [0, 50, 150], wall: [255, 255, 255], floor: [0, 60, 180], text: [255, 255, 255], border: [255, 255, 255], lava: [255, 100, 100], end: [100, 255, 100]}
    },
    'candy': {
        name: "Candy", cost: 2000, quirk: 'polka',
        colors: {bg: [255, 240, 245], wall: [255, 105, 180], floor: [255, 250, 250], text: [150, 50, 150], border: [255, 20, 147], lava: [255, 50, 50], end: [50, 200, 200]}
    },
    'space': {
        name: "Cosmos", cost: 3000, quirk: 'stars',
        colors: {bg: [10, 10, 30], wall: [100, 100, 180], floor: [20, 20, 50], text: [200, 200, 255], border: [80, 80, 150], lava: [255, 50, 100], end: [50, 255, 255]}
    },
    'neon_city': {
        name: "Cyber", cost: 4000, quirk: 'vignette',
        colors: {bg: [10, 0, 20], wall: [255, 0, 255], floor: [20, 0, 40], text: [0, 255, 255], border: [0, 255, 255], lava: [255, 255, 0], end: [0, 255, 255]}
    },
    'slime': {
        name: "Ooze", cost: 5000, quirk: 'bounce_walls',
        colors: {bg: [20, 40, 20], wall: [100, 220, 100], floor: [30, 60, 30], text: [150, 255, 150], border: [50, 150, 50], lava: [150, 0, 150], end: [200, 255, 255]}
    },
    'glitch': {
        name: "Corrupt", cost: 7500, quirk: 'glitch_walls',
        colors: {bg: [10, 10, 10], wall: [255, 0, 255], floor: [20, 20, 30], text: [0, 255, 0], border: [0, 255, 255], lava: [255, 255, 255], end: [0, 0, 255]}
    },
    'luxury': {
        name: "Luxury", cost: 10000, quirk: 'shimmer',
        colors: {bg: [40, 40, 40], wall: [255, 215, 0], floor: [30, 30, 30], text: [255, 215, 0], border: [255, 255, 255], lava: [255, 50, 50], end: [255, 255, 255]}
    }
};
