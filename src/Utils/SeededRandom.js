export class SeededRandom {
    constructor(seed) {
        this.seed = seed;
    }

    // Simple Linear Congruential Generator (LCG)
    // Returns a float between 0 and 1
    random() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
}
