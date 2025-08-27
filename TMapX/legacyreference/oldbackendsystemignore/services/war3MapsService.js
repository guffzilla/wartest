const fs = require('fs');
const path = require('path');

class War3MapsService {
    constructor() {
        this.mapsData = null;
        this.loadMapsData();
    }

    loadMapsData() {
        try {
            const dataPath = path.join(__dirname, '../../war3_maps_data.json');
            const rawData = fs.readFileSync(dataPath, 'utf8');
            this.mapsData = JSON.parse(rawData);
            console.log(`✅ Loaded ${this.mapsData.length} War3 maps from database`);
        } catch (error) {
            console.error('❌ Error loading War3 maps data:', error.message);
            this.mapsData = [];
        }
    }

    // Get all maps with optional filtering and pagination
    getAllMaps(options = {}) {
        const {
            page = 1,
            limit = 20,
            type = null,
            search = null,
            sortBy = 'name',
            sortOrder = 'asc'
        } = options;

        let filteredMaps = [...this.mapsData];

        // Filter by type
        if (type && type !== 'all') {
            filteredMaps = filteredMaps.filter(map => 
                map.type.toLowerCase() === type.toLowerCase()
            );
        }

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            filteredMaps = filteredMaps.filter(map =>
                map.name.toLowerCase().includes(searchLower) ||
                map.filename.toLowerCase().includes(searchLower)
            );
        }

        // Sort maps
        filteredMaps.sort((a, b) => {
            let aVal = a[sortBy] || '';
            let bVal = b[sortBy] || '';
            
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (sortOrder === 'desc') {
                return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
        });

        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedMaps = filteredMaps.slice(startIndex, endIndex);

        return {
            maps: paginatedMaps,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(filteredMaps.length / limit),
                totalMaps: filteredMaps.length,
                hasNext: endIndex < filteredMaps.length,
                hasPrev: page > 1
            }
        };
    }

    // Get a single map by ID
    getMapById(id) {
        return this.mapsData.find(map => map.id === id) || null;
    }

    // Get maps by type
    getMapsByType(type) {
        return this.mapsData.filter(map => 
            map.type.toLowerCase() === type.toLowerCase()
        );
    }

    // Get map statistics
    getMapStats() {
        const stats = {
            totalMaps: this.mapsData.length,
            mapTypes: {},
            withThumbnails: 0,
            totalSize: 0,
            averageSize: 0
        };

        this.mapsData.forEach(map => {
            // Count by type
            const type = map.type || 'Unknown';
            stats.mapTypes[type] = (stats.mapTypes[type] || 0) + 1;

            // Count thumbnails
            if (map.has_thumbnail) {
                stats.withThumbnails++;
            }

            // Calculate size stats
            stats.totalSize += map.size || 0;
        });

        stats.averageSize = Math.round(stats.totalSize / this.mapsData.length);
        stats.thumbnailPercentage = Math.round((stats.withThumbnails / this.mapsData.length) * 100);

        return stats;
    }

    // Search maps
    searchMaps(query, limit = 10) {
        if (!query || query.trim().length < 2) {
            return [];
        }

        const searchLower = query.toLowerCase();
        const results = this.mapsData.filter(map =>
            map.name.toLowerCase().includes(searchLower) ||
            map.filename.toLowerCase().includes(searchLower)
        ).slice(0, limit);

        return results;
    }

    // Get featured/popular maps (for now, just return some random ones)
    getFeaturedMaps(count = 6) {
        const shuffled = [...this.mapsData].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // Get recent maps (based on filename patterns that might indicate dates)
    getRecentMaps(count = 10) {
        // Sort by filename to get more recent looking maps first
        const sorted = [...this.mapsData].sort((a, b) => 
            b.filename.localeCompare(a.filename)
        );
        return sorted.slice(0, count);
    }

    // Get available map types
    getMapTypes() {
        const types = new Set();
        this.mapsData.forEach(map => {
            if (map.type) {
                types.add(map.type);
            }
        });
        return Array.from(types).sort();
    }

    // Reload data (useful for development)
    reloadData() {
        this.loadMapsData();
        return this.mapsData.length;
    }
}

module.exports = new War3MapsService(); 