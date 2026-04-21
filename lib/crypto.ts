import crypto from 'crypto';

// Use a distinct secret for encryption, fallback to JWT_SECRET if not set (not recommended for prod but safe for now)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-insecure-secret-key-change-me';
const IV_LENGTH = 16; // For AES, this is always 16

function getCipherKey(key: string) {
    // Ensure key is 32 bytes for aes-256-cbc
    return crypto.createHash('sha256').update(String(key)).digest();
}

export function encrypt(text: string): string {
    if (!text) return text;

    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getCipherKey(ENCRYPTION_KEY);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
    if (!text) return text;

    const textParts = text.split(':');
    if (textParts.length < 2) return text; // Not encrypted or invalid format

    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const key = getCipherKey(ENCRYPTION_KEY);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
}
