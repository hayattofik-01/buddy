/**
 * Detects if the user is using an in-app browser that may have OAuth restrictions
 */
export const isInAppBrowser = (): boolean => {
    if (typeof window === 'undefined' || !window.navigator) {
        return false;
    }

    const userAgent = window.navigator.userAgent || window.navigator.vendor || '';

    // LinkedIn in-app browser
    if (userAgent.includes('LinkedInApp')) {
        return true;
    }

    // Facebook/Meta in-app browser
    if (userAgent.includes('FBAN') || userAgent.includes('FBAV') || userAgent.includes('FB_IAB')) {
        return true;
    }

    // Instagram in-app browser
    if (userAgent.includes('Instagram')) {
        return true;
    }

    // Twitter in-app browser
    if (userAgent.includes('Twitter')) {
        return true;
    }

    // Snapchat in-app browser
    if (userAgent.includes('Snapchat')) {
        return true;
    }

    // TikTok in-app browser
    if (userAgent.includes('BytedanceWebview') || userAgent.includes('musical_ly')) {
        return true;
    }

    // WeChat in-app browser
    if (userAgent.includes('MicroMessenger')) {
        return true;
    }

    // Line in-app browser
    if (userAgent.includes('Line')) {
        return true;
    }

    return false;
};

/**
 * Gets the name of the in-app browser being used
 */
export const getInAppBrowserName = (): string | null => {
    if (typeof window === 'undefined' || !window.navigator) {
        return null;
    }

    const userAgent = window.navigator.userAgent || window.navigator.vendor || '';

    if (userAgent.includes('LinkedInApp')) return 'LinkedIn';
    if (userAgent.includes('FBAN') || userAgent.includes('FBAV') || userAgent.includes('FB_IAB')) return 'Facebook';
    if (userAgent.includes('Instagram')) return 'Instagram';
    if (userAgent.includes('Twitter')) return 'Twitter';
    if (userAgent.includes('Snapchat')) return 'Snapchat';
    if (userAgent.includes('BytedanceWebview') || userAgent.includes('musical_ly')) return 'TikTok';
    if (userAgent.includes('MicroMessenger')) return 'WeChat';
    if (userAgent.includes('Line')) return 'Line';

    return null;
};

/**
 * Copies the current URL to clipboard
 */
export const copyCurrentUrl = async (): Promise<boolean> => {
    try {
        const url = window.location.href;

        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url);
            return true;
        }

        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        return successful;
    } catch (error) {
        console.error('Failed to copy URL:', error);
        return false;
    }
};
