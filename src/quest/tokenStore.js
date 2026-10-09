import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const STORE_FILE = path.resolve('data/multiTokens.json');
const ALGORITHM = 'aes-256-gcm';

function deriveKey(secret) {
    return crypto.createHash('sha256').update(secret).digest();
}

function encrypt(text, key) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return JSON.stringify({
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        data: encrypted.toString('hex'),
    });
}

function decrypt(stored, key) {
    try {
        const { iv, tag, data } = JSON.parse(stored);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
        decipher.setAuthTag(Buffer.from(tag, 'hex'));
        return decipher.update(Buffer.from(data, 'hex')) + decipher.final('utf8');
    } catch {
        return null;
    }
}

export class MultiTokenStore {
    constructor(secret) {
        this.key = deriveKey(secret);
        this.data = {};
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(STORE_FILE)) {
                const raw = fs.readFileSync(STORE_FILE, 'utf8');
                this.data = JSON.parse(raw);
            }
        } catch (err) {
            console.error('[MultiTokenStore] Failed to load data:', err);
            this.data = {};
        }
    }

    save() {
        try {
            const dir = path.dirname(STORE_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(STORE_FILE, JSON.stringify(this.data, null, 2));
        } catch (err) {
            console.error('[MultiTokenStore] Failed to save data:', err);
        }
    }

    // User ke saare 5 slots laane ke liye
    getSlots(userId) {
        if (!this.data[userId]) {
            this.data[userId] = {
                activeSlot: 1,
                slots: {
                    1: null,
                    2: null,
                    3: null,
                    4: null,
                    5: null
                }
            };
        }
        return this.data[userId];
    }

    // Kisi specific slot mein token encrypt karke save karne ke liye
    saveToken(userId, slotNum, tokenInfo) {
        const userData = this.getSlots(userId);
        const isFirst = Object.values(userData.slots).every(s => s === null);
        
        const encryptedToken = encrypt(tokenInfo.token, this.key);

        userData.slots[slotNum] = {
            token: encryptedToken,
            username: tokenInfo.username,
            discordId: tokenInfo.discordId,
            accountAge: tokenInfo.accountAge,
            linkedAt: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            isActive: isFirst ? true : (userData.slots[slotNum]?.isActive ?? false)
        };
        
        if (isFirst) {
            userData.activeSlot = slotNum;
        }
        
        this.save();
    }

    // Kisi slot ko unlink/remove karne ke liye
    removeSlot(userId, slotNum) {
        const userData = this.getSlots(userId);
        if (userData.slots[slotNum]) {
            userData.slots[slotNum] = null;
            const remaining = Object.keys(userData.slots).filter(k => userData.slots[k] !== null);
            
            if (remaining.length > 0) {
                if (userData.activeSlot === Number(slotNum)) {
                    userData.activeSlot = Number(remaining[0]);
                    userData.slots[userData.activeSlot].isActive = true;
                }
            } else {
                userData.activeSlot = 1;
            }
            
            this.save();
            return true;
        }
        return false;
    }

    // Active slot switch karne ke liye
    setActiveSlot(userId, slotNum) {
        const userData = this.getSlots(userId);
        if (userData.slots[slotNum]) {
            Object.keys(userData.slots).forEach(k => {
                if (userData.slots[k]) {
                    userData.slots[k].isActive = (Number(k) === Number(slotNum));
                }
            });
            userData.activeSlot = Number(slotNum);
            this.save();
            return true;
        }
        return false;
    }

    // Current active decrypted token lene ke liye quest run karte waqt
    getActiveToken(userId) {
        const userData = this.getSlots(userId);
        const active = userData.slots[userData.activeSlot];
        if (!active || !active.token) return null;
        return decrypt(active.token, this.key);
    }
}
