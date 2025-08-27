const axios = require('axios');

class CurrencyService {
  constructor() {
    // Cache exchange rates for 1 hour to avoid hitting API limits
    this.rateCache = new Map();
    this.cacheExpiry = 60 * 60 * 1000; // 1 hour in milliseconds
    
    // Free exchange rate API (no key required)
    this.apiUrl = 'https://api.exchangerate-api.com/v4/latest/CAD';
    
    // Base prices in CAD (what Square processes)
    this.basePricesCAD = {
      1: 6.75,   // Tier 1
      2: 13.50,  // Tier 2  
      3: 27.00,  // Tier 3
      4: 54.00   // Tier 4
    };
  }

  /**
   * Get cached exchange rates or fetch new ones
   */
  async getExchangeRates() {
    const cacheKey = 'rates';
    const cachedData = this.rateCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheExpiry) {
      console.log('💰 Using cached exchange rates');
      return cachedData.rates;
    }

    try {
      console.log('🌍 Fetching fresh exchange rates...');
      const response = await axios.get(this.apiUrl, { timeout: 3000 });
      
      if (response.data && response.data.rates) {
        const rates = response.data.rates;
        
        // Cache the rates
        this.rateCache.set(cacheKey, {
          rates: rates,
          timestamp: Date.now()
        });
        
        console.log('✅ Exchange rates updated:', {
          USD: rates.USD,
          EUR: rates.EUR,
          GBP: rates.GBP,
          JPY: rates.JPY
        });
        
        return rates;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch exchange rates, using fallback:', error.message);
      
      // Fallback rates (approximate but realistic as of 2024)
      const fallbackRates = {
        USD: 0.74,  // 1 CAD = 0.74 USD
        EUR: 0.68,  // 1 CAD = 0.68 EUR
        GBP: 0.58,  // 1 CAD = 0.58 GBP
        JPY: 108,   // 1 CAD = 108 JPY
        CAD: 1.0    // Base currency
      };
      
      // Cache fallback rates for a short time
      this.rateCache.set(cacheKey, {
        rates: fallbackRates,
        timestamp: Date.now()
      });
      
      return fallbackRates;
    }
  }

  /**
   * Convert CAD price to target currency for display
   */
  async convertPrice(cadPrice, targetCurrency) {
    if (targetCurrency === 'CAD') {
      return cadPrice;
    }

    const rates = await this.getExchangeRates();
    const rate = rates[targetCurrency];
    
    if (!rate) {
      console.warn(`Currency ${targetCurrency} not supported, showing CAD`);
      return cadPrice;
    }

    const convertedPrice = cadPrice * rate;
    
    // Round to appropriate decimal places
    if (targetCurrency === 'JPY') {
      return Math.round(convertedPrice); // No decimals for JPY
    } else {
      return Math.round(convertedPrice * 100) / 100; // 2 decimal places
    }
  }

  /**
   * Get pricing for all tiers in the specified currency
   */
  async getTierPricing(currency = 'CAD') {
    const pricing = {};
    
    for (const [tier, cadPrice] of Object.entries(this.basePricesCAD)) {
      const convertedPrice = await this.convertPrice(cadPrice, currency);
      pricing[tier] = {
        price: convertedPrice,
        currency: currency,
        cadPrice: cadPrice // Always keep CAD price for Square processing
      };
    }
    
    return pricing;
  }

  /**
   * Get currency symbol for display
   */
  getCurrencySymbol(currency) {
    const symbols = {
      'CAD': 'C$',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥'
    };
    return symbols[currency] || currency;
  }

  /**
   * Detect user currency using multi-layer approach (like major e-commerce sites)
   */
  detectUserCurrency(req) {
    // Layer 1: Check for explicit user preference (cookies, query params)
    const urlCurrency = req.query?.currency;
    if (urlCurrency && this.isValidCurrency(urlCurrency)) {
      console.log(`💰 Currency from URL parameter: ${urlCurrency}`);
      return urlCurrency;
    }

    // Layer 2: Check cookies for previous preference
    const cookieCurrency = req.cookies?.preferred_currency;
    if (cookieCurrency && this.isValidCurrency(cookieCurrency)) {
      console.log(`🍪 Currency from cookie: ${cookieCurrency}`);
      return cookieCurrency;
    }

    // Layer 3: IP Geolocation (most reliable for e-commerce)
    const countryFromIP = this.detectCountryFromIP(req);
    if (countryFromIP) {
      const currencyFromCountry = this.getCurrencyByCountry(countryFromIP);
      console.log(`🌍 Currency from IP geolocation: ${currencyFromCountry} (country: ${countryFromIP})`);
      return currencyFromCountry;
    }

    // Layer 4: Accept-Language header (fallback)
    const acceptLanguage = req.headers?.['accept-language'] || '';
    
    if (acceptLanguage.includes('en-CA') || acceptLanguage.includes('fr-CA')) {
      console.log(`🇨🇦 Currency from Accept-Language (Canadian): CAD`);
      return 'CAD';
    }
    if (acceptLanguage.includes('en-US')) {
      console.log(`🇺🇸 Currency from Accept-Language (US): USD`);
      return 'USD';
    }
    if (acceptLanguage.includes('en-GB')) {
      console.log(`🇬🇧 Currency from Accept-Language (UK): GBP`);
      return 'GBP';
    }
    if (acceptLanguage.includes('de') || acceptLanguage.includes('fr-FR') || acceptLanguage.includes('es')) {
      console.log(`🇪🇺 Currency from Accept-Language (EU): EUR`);
      return 'EUR';
    }
    if (acceptLanguage.includes('ja')) {
      console.log(`🇯🇵 Currency from Accept-Language (Japan): JPY`);
      return 'JPY';
    }

    // Layer 5: Default to CAD for Canadian business
    console.log(`🏠 Using default currency: CAD`);
    return 'CAD';
  }

  /**
   * Detect country from IP address (simplified version)
   */
  detectCountryFromIP(req) {
    // Get client IP address
    const clientIP = req.ip || 
                    req.connection?.remoteAddress || 
                    req.socket?.remoteAddress ||
                    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                    req.headers['x-real-ip'];

    console.log(`🔍 Client IP: ${clientIP}`);

    // For localhost/development, assume Canadian
    if (!clientIP || clientIP === '127.0.0.1' || clientIP === '::1' || clientIP.startsWith('192.168.') || clientIP.startsWith('10.')) {
      console.log(`🏠 Localhost detected, assuming Canada`);
      return 'CA';
    }

    // TODO: Integrate with IP geolocation service
    // For now, return null to fall back to Accept-Language
    // In production, you'd use services like:
    // - MaxMind GeoIP2
    // - IPinfo.io
    // - ip-api.com
    // - CloudFlare's CF-IPCountry header
    
    return null;
  }

  /**
   * Get currency by country code
   */
  getCurrencyByCountry(countryCode) {
    const currencyMap = {
      'US': 'USD',
      'CA': 'CAD', 
      'GB': 'GBP',
      'AU': 'AUD',
      'JP': 'JPY',
      'DE': 'EUR',
      'FR': 'EUR',
      'IT': 'EUR',
      'ES': 'EUR',
      'NL': 'EUR',
      'BE': 'EUR',
      'AT': 'EUR',
      'PT': 'EUR',
      'IE': 'EUR',
      'FI': 'EUR',
      'GR': 'EUR',
      'LU': 'EUR',
      'MT': 'EUR',
      'CY': 'EUR',
      'SK': 'EUR',
      'SI': 'EUR',
      'EE': 'EUR',
      'LV': 'EUR',
      'LT': 'EUR'
    };
    
    return currencyMap[countryCode] || 'USD';
  }

  /**
   * Validate currency code
   */
  isValidCurrency(currency) {
    const validCurrencies = ['CAD', 'USD', 'EUR', 'GBP', 'JPY', 'AUD'];
    return validCurrencies.includes(currency?.toUpperCase());
  }

  /**
   * Format price for display
   */
  formatPrice(price, currency) {
    const symbol = this.getCurrencySymbol(currency);
    
    if (currency === 'JPY') {
      return `${symbol}${Math.round(price)}`;
    } else {
      return `${symbol}${price.toFixed(2)}`;
    }
  }
}

module.exports = new CurrencyService(); 