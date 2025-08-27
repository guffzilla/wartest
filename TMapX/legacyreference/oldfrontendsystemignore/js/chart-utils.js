/**
 * Warcraft Arena Chart Utilities
 * Provides consistent Chart.js theming and helper functions
 */

// Warcraft Arena Chart Themes and Colors
window.WarcraftChartTheme = {
    colors: {
        alliance: '#2563EB',
        horde: '#DC2626',
        neutral: '#6B7280',
        human: '#3B82F6',
        orc: '#EF4444',
        undead: '#8B5CF6',
        nightelf: '#10B981',
        gold: '#D4AF37',
        silver: '#C0C0C0',
        bronze: '#CD7F32',
        primary: '#D4AF37',
        secondary: '#D1D5DB',
        muted: '#9CA3AF',
        background: 'rgba(30, 30, 30, 0.9)',
        border: '#374151'
    },

    gradients: {
        alliance: ['#2563EB', '#1D4ED8'],
        horde: ['#DC2626', '#B91C1C'],
        neutral: ['#6B7280', '#4B5563'],
        gold: ['#D4AF37', '#B8941F']
    },

    fonts: {
        primary: "'Inter', sans-serif",
        display: "'Cinzel', serif"
    }
};

// Global Chart.js Configuration
window.setupWarcraftChartDefaults = function() {
    if (typeof Chart === 'undefined') {

        return;}

    const theme = window.WarcraftChartTheme;

    // Set global defaults
    Chart.defaults.font.family = theme.fonts.primary;
    Chart.defaults.font.size = 12;
    Chart.defaults.color = theme.colors.secondary;
    Chart.defaults.backgroundColor = 'rgba(212, 175, 55, 0.1)';
    Chart.defaults.borderColor = 'rgba(212, 175, 55, 0.3)';
    
    // Legend defaults
    Chart.defaults.plugins.legend.labels.color = theme.colors.secondary;
    Chart.defaults.plugins.legend.labels.font = {
        family: theme.fonts.display,
        size: 12
    };

    // Grid and scale defaults
    Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.1)';
    Chart.defaults.scale.ticks.color = theme.colors.secondary;

    
};

// Common Chart Options
window.getWarcraftChartOptions = function(type = 'default') {
    const theme = window.WarcraftChartTheme;
    
    const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            tooltip: {
                backgroundColor: theme.colors.background,
                titleColor: theme.colors.primary,
                bodyColor: theme.colors.secondary,
                borderColor: theme.colors.primary,
                borderWidth: 1,
                titleFont: {
                    family: theme.fonts.display,
                    size: 14
                },
                bodyFont: {
                    family: theme.fonts.primary,
                    size: 12
                }
            }
        }
    };

    const options = {
        pie: {
            ...baseOptions,
            plugins: {
                ...baseOptions.plugins,
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            family: theme.fonts.display,
                            size: 11
                        },
                        color: theme.colors.secondary
                    }
                }
            }
        },

        doughnut: {
            ...baseOptions,
            cutout: '60%',
            plugins: {
                ...baseOptions.plugins,
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            family: theme.fonts.display,
                            size: 12
                        },
                        color: theme.colors.secondary
                    }
                }
            }
        },

        bar: {
            ...baseOptions,
            plugins: {
                ...baseOptions.plugins,
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: theme.colors.secondary,
                        font: {
                            family: theme.fonts.primary
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: theme.colors.secondary,
                        font: {
                            family: theme.fonts.primary
                        }
                    }
                }
            }
        },

        line: {
            ...baseOptions,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                ...baseOptions.plugins,
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: theme.colors.secondary,
                        font: {
                            family: theme.fonts.primary
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: theme.colors.secondary,
                        font: {
                            family: theme.fonts.primary
                        }
                    }
                }
            }
        }
    };

    return options[type] || baseOptions;};

// Race-specific colors
window.getRaceColors = function() {
    const theme = window.WarcraftChartTheme;
    return {
        human: {
            bg: theme.colors.human,
            border: theme.colors.human + 'CC'
        },
        orc: {
            bg: theme.colors.orc,
            border: theme.colors.orc + 'CC'
        },
        undead: {
            bg: theme.colors.undead,
            border: theme.colors.undead + 'CC'
        },
        nightelf: {
            bg: theme.colors.nightelf,
            border: theme.colors.nightelf + 'CC'
        },
        random: {
            bg: theme.colors.neutral,
            border: theme.colors.neutral + 'CC'
        }
    };};

// Rank-based colors
window.getRankColors = function() {
    const theme = window.WarcraftChartTheme;
    return {
        bronze: theme.colors.bronze,
        silver: theme.colors.silver,
        gold: theme.colors.gold,
        platinum: '#E5E7EB',
        diamond: '#60A5FA',
        master: '#8B5CF6',
        grandmaster: theme.colors.primary
    };};

// Chart creation helpers for existing implementations
window.createWarcraftChart = function(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') {

        return null;}

    const ctx = canvas.getContext('2d');
    
    // Merge with default options
    const options = window.getWarcraftChartOptions(config.type);
    const mergedConfig = {
        ...config,
        options: {
            ...options,
            ...config.options
        }
    };

    return new Chart(ctx, mergedConfig);};

// Percentage formatter for tooltips
window.formatPercentageTooltip = function(context) {
    const label = context.label || '';
    const value = context.raw || 0;
    const total = context.dataset.data.reduce((a, b) => a + b, 0);
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    return `${label}: ${value} (${percentage}%)`;};

// Win rate formatter
window.formatWinRateTooltip = function(context) {
    return `${context.raw.toFixed(1)}%`;};

// Chart cleanup utility
window.destroyChart = function(chartInstance) {
    if (chartInstance && typeof chartInstance.destroy === 'function') {
        chartInstance.destroy();
    }
};

// Utility to update existing charts with new data
window.updateChartData = function(chartInstance, newData) {
    if (!chartInstance) return;chartInstance.data = newData;
    chartInstance.update('active');
};

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    // Setup defaults when Chart.js is available
    if (typeof Chart !== 'undefined') {
        window.setupWarcraftChartDefaults();
    } else {
        // Try again after a short delay in case Chart.js loads asynchronously
        setTimeout(() => {
            if (typeof Chart !== 'undefined') {
                window.setupWarcraftChartDefaults();
            }
        }, 100);
    }
});

 