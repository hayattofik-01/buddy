/**
 * Social group link validation utilities
 * Validates URLs from WhatsApp, Telegram, Facebook, and Instagram
 */

export type SocialPlatform = 'whatsapp' | 'telegram' | 'facebook' | 'instagram' | null;

interface SocialGroupLink {
    url: string;
    platform: SocialPlatform;
    isValid: boolean;
    error?: string;
}

/**
 * Validates and detects social platform from URL
 */
export const validateSocialGroupLink = (url: string): SocialGroupLink => {
    if (!url || url.trim() === '') {
        return { url: '', platform: null, isValid: true }; // Empty is valid (optional field)
    }

    const trimmedUrl = url.trim();

    // WhatsApp validation
    if (trimmedUrl.includes('whatsapp.com') || trimmedUrl.includes('wa.me')) {
        const whatsappPatterns = [
            /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+$/,
            /^https:\/\/wa\.me\/[0-9]+$/,
        ];

        const isValid = whatsappPatterns.some(pattern => pattern.test(trimmedUrl));

        return {
            url: trimmedUrl,
            platform: 'whatsapp',
            isValid,
            error: isValid ? undefined : 'Invalid WhatsApp group link. Use format: https://chat.whatsapp.com/...',
        };
    }

    // Telegram validation
    if (trimmedUrl.includes('t.me') || trimmedUrl.includes('telegram.me')) {
        const telegramPatterns = [
            /^https:\/\/t\.me\/[A-Za-z0-9_]+$/,
            /^https:\/\/t\.me\/joinchat\/[A-Za-z0-9_-]+$/,
            /^https:\/\/telegram\.me\/[A-Za-z0-9_]+$/,
        ];

        const isValid = telegramPatterns.some(pattern => pattern.test(trimmedUrl));

        return {
            url: trimmedUrl,
            platform: 'telegram',
            isValid,
            error: isValid ? undefined : 'Invalid Telegram group link. Use format: https://t.me/...',
        };
    }

    // Facebook validation
    if (trimmedUrl.includes('facebook.com') || trimmedUrl.includes('fb.com')) {
        const facebookPatterns = [
            /^https:\/\/(www\.)?facebook\.com\/groups\/[A-Za-z0-9.]+\/?$/,
            /^https:\/\/(www\.)?fb\.com\/groups\/[A-Za-z0-9.]+\/?$/,
        ];

        const isValid = facebookPatterns.some(pattern => pattern.test(trimmedUrl));

        return {
            url: trimmedUrl,
            platform: 'facebook',
            isValid,
            error: isValid ? undefined : 'Invalid Facebook group link. Use format: https://facebook.com/groups/...',
        };
    }

    // Instagram validation
    if (trimmedUrl.includes('instagram.com')) {
        // Instagram doesn't have group links, but we can validate profile links
        const instagramPattern = /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/;

        const isValid = instagramPattern.test(trimmedUrl);

        return {
            url: trimmedUrl,
            platform: 'instagram',
            isValid,
            error: isValid ? undefined : 'Invalid Instagram link. Use format: https://instagram.com/username',
        };
    }

    // If URL doesn't match any platform
    return {
        url: trimmedUrl,
        platform: null,
        isValid: false,
        error: 'Only WhatsApp, Telegram, Facebook, and Instagram links are allowed',
    };
};

/**
 * Get platform icon name for lucide-react
 */
export const getPlatformIcon = (platform: SocialPlatform): string => {
    switch (platform) {
        case 'whatsapp':
            return 'MessageCircle'; // WhatsApp-like icon
        case 'telegram':
            return 'Send'; // Telegram-like icon
        case 'facebook':
            return 'Users'; // Facebook groups icon
        case 'instagram':
            return 'Instagram'; // Instagram icon
        default:
            return 'Link';
    }
};

/**
 * Get platform display name
 */
export const getPlatformName = (platform: SocialPlatform): string => {
    switch (platform) {
        case 'whatsapp':
            return 'WhatsApp';
        case 'telegram':
            return 'Telegram';
        case 'facebook':
            return 'Facebook';
        case 'instagram':
            return 'Instagram';
        default:
            return 'Social';
    }
};

/**
 * Get platform color for styling
 */
export const getPlatformColor = (platform: SocialPlatform): string => {
    switch (platform) {
        case 'whatsapp':
            return 'text-green-600 hover:text-green-700';
        case 'telegram':
            return 'text-blue-500 hover:text-blue-600';
        case 'facebook':
            return 'text-blue-600 hover:text-blue-700';
        case 'instagram':
            return 'text-pink-600 hover:text-pink-700';
        default:
            return 'text-gray-600 hover:text-gray-700';
    }
};
