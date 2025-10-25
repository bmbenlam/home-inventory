// Configuration constants
const DEFAULT_CONFIG = {
    clientId: '',
    spreadsheetId: '',
    sheetName: 'Master',
    rotationInterval: 60,
    tableRows: 10,
    weights: {
        expired: 50,
        soon: 25,
        medium: 15,
        later: 7,
        fresh: 3
    }
};

const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

// Utility functions
const loadConfig = () => {
    const saved = localStorage.getItem('inventoryDashboardSettings');
    if (saved) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
    return DEFAULT_CONFIG;
};

const saveConfig = (config) => {
    localStorage.setItem('inventoryDashboardSettings', JSON.stringify(config));
};

const parseDate = (dateStr) => {
    if (!dateStr || dateStr.trim() === '') return null;
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
};

const formatDate = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

const getExpiryStatus = (daysUntilExpiry) => {
    if (daysUntilExpiry <= 7) return { status: 'expired', label: 'EXPIRED / EXPIRING SOON' };
    if (daysUntilExpiry <= 30) return { status: 'warning', label: 'EXPIRING WITHIN 1 MONTH' };
    if (daysUntilExpiry <= 90) return { status: 'caution', label: 'EXPIRING WITHIN 3 MONTHS' };
    if (daysUntilExpiry <= 180) return { status: 'good', label: 'EXPIRING WITHIN 6 MONTHS' };
    return { status: 'fresh', label: 'FRESH' };
};

const getExpiryCategory = (daysUntilExpiry) => {
    if (daysUntilExpiry <= 7) return 'expired';
    if (daysUntilExpiry <= 30) return 'soon';
    if (daysUntilExpiry <= 90) return 'medium';
    if (daysUntilExpiry <= 180) return 'later';
    return 'fresh';
};

const weightedRandomSelect = (items, weights) => {
    const categorized = items.reduce((acc, item) => {
        const category = getExpiryCategory(getDaysUntilExpiry(item.expiryDate));
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
    }, {});

    const pool = [];
    Object.keys(weights).forEach(category => {
        const categoryItems = categorized[category] || [];
        const weight = weights[category] || 0;
        for (let i = 0; i < weight; i++) {
            pool.push(...categoryItems);
        }
    });

    if (pool.length === 0) return items[0];
    
    return pool[Math.floor(Math.random() * pool.length)];
};