// ======= PASSWORD HASHING UTILITY =======
// Using browser-compatible hashing with SubtleCrypto API

/**
 * Hash a password using PBKDF2 with SHA-256
 * Returns a string in format: salt:hash
 */
async function hashPassword(password) {
    try {
        // Generate a random salt
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        
        // Convert password to ArrayBuffer
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        
        // Import password as a key
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveBits']
        );
        
        // Derive bits using PBKDF2
        const hashBuffer = await window.crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            256
        );
        
        // Convert to base64 for storage
        const saltBase64 = arrayBufferToBase64(salt);
        const hashBase64 = arrayBufferToBase64(hashBuffer);
        
        return `${saltBase64}:${hashBase64}`;
    } catch (error) {
        console.error("Error hashing password:", error);
        throw new Error("Failed to hash password");
    }
}

/**
 * Verify a password against a stored hash
 * @param {string} password - The password to verify
 * @param {string} storedHash - The stored hash in format salt:hash
 * @returns {Promise<boolean>} - True if password matches
 */
async function verifyPassword(password, storedHash) {
    try {
        // Split stored hash into salt and hash
        const parts = storedHash.split(':');
        if (parts.length !== 2) {
            console.error("Invalid stored hash format");
            return false;
        }
        
        const saltBase64 = parts[0];
        const storedHashBase64 = parts[1];
        
        // Convert salt back to ArrayBuffer
        const salt = base64ToArrayBuffer(saltBase64);
        
        // Convert password to ArrayBuffer
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        
        // Import password as a key
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveBits']
        );
        
        // Derive bits using same parameters
        const hashBuffer = await window.crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            256
        );
        
        // Convert to base64 and compare
        const hashBase64 = arrayBufferToBase64(hashBuffer);
        
        return hashBase64 === storedHashBase64;
    } catch (error) {
        console.error("Error verifying password:", error);
        return false;
    }
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// Make functions globally available
window.hashPassword = hashPassword;
window.verifyPassword = verifyPassword;

