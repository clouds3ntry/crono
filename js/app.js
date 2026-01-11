console.log('app.js loaded successfully');

// Initialize immediately when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function initApp() {
    console.log('Initializing app...');
    try {
        new CronManager();
    } catch (error) {
        console.error('Error:', error);
    }
}

// Cron Expression Validator and Manager
class CronManager {
    constructor() {
        console.log('CronManager constructor called');
        
        // Check if all required elements exist
        this.cronInput = document.getElementById('cron-input');
        this.validationStatus = document.getElementById('validation-status');
        this.humanReadable = document.getElementById('human-readable');
        this.nextRunsList = document.getElementById('next-runs-list');
        this.nextRunsSection = document.getElementById('next-runs-section');
        this.fieldLegend = document.getElementById('field-legend');
        this.copyBtn = document.getElementById('copy-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.timezoneLabel = document.getElementById('timezone-label');
        
        // Log missing elements
        if (!this.cronInput) console.error('Missing: cron-input');
        if (!this.validationStatus) console.error('Missing: validation-status');
        if (!this.humanReadable) console.error('Missing: human-readable');
        if (!this.nextRunsList) console.error('Missing: next-runs-list');
        if (!this.nextRunsSection) console.error('Missing: next-runs-section');
        if (!this.fieldLegend) console.error('Missing: field-legend');
        if (!this.copyBtn) console.error('Missing: copy-btn');
        if (!this.resetBtn) console.error('Missing: reset-btn');
        if (!this.timezoneLabel) console.error('Missing: timezone-label');
        
        this.builderInputs = {
            minute: document.getElementById('minute-input'),
            hour: document.getElementById('hour-input'),
            day: document.getElementById('day-input'),
            month: document.getElementById('month-input'),
            weekday: document.getElementById('weekday-input')
        };
        
        // Log missing builder inputs
        Object.entries(this.builderInputs).forEach(([key, element]) => {
            if (!element) console.error(`Missing builder input: ${key}-input`);
        });
        
        this.presetButtons = document.querySelectorAll('[data-preset]');
        console.log(`Found ${this.presetButtons.length} preset buttons`);
        
        this.init();
    }
    
    init() {
        console.log('Init called');
        
        // Only proceed if essential elements exist
        if (!this.cronInput || !this.validationStatus) {
            console.error('Essential elements missing, cannot initialize');
            return;
        }
        
        this.updateTimezoneLabel();
        
        // Add event listeners with null checks
        if (this.cronInput) {
            this.cronInput.addEventListener('input', () => this.handleCronChange());
        }
        if (this.copyBtn) {
            this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        }
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.resetToDefaults());
        }
        
        // Builder inputs
        Object.values(this.builderInputs).forEach(input => {
            if (input) {
                input.addEventListener('input', () => this.handleBuilderChange());
            }
        });
        
        // Preset buttons
        this.presetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Preset clicked:', btn.dataset.preset);
                this.applyPreset(btn.dataset.preset);
            });
        });
        
        // Initial update
        this.handleCronChange();
        console.log('Initialization complete');
    }
    
    validateCron(expression) {
        const parts = expression.trim().split(/\s+/);
        if (parts.length !== 5) return { valid: false, error: 'Must have exactly 5 fields' };
        
        const [minute, hour, day, month, weekday] = parts;
        
        const validations = [
            { field: minute, name: 'minute', min: 0, max: 59 },
            { field: hour, name: 'hour', min: 0, max: 23 },
            { field: day, name: 'day', min: 1, max: 31 },
            { field: month, name: 'month', min: 1, max: 12 },
            { field: weekday, name: 'weekday', min: 0, max: 6 }
        ];
        
        for (const { field, name, min, max } of validations) {
            const result = this.validateField(field, min, max, name);
            if (!result.valid) return result;
        }
        
        return { valid: true };
    }
    
    updateTimezoneLabel() {
        if (!this.timezoneLabel) {
            console.log('Timezone label not found, skipping update');
            return;
        }
        try {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const cityName = timezone.split('/').pop().replace('_', ' ').toUpperCase();
            this.timezoneLabel.textContent = `LOCAL TIME (${cityName})`;
        } catch (err) {
            this.timezoneLabel.textContent = 'LOCAL TIME';
        }
    }
    
    validateField(field, min, max, name) {
        if (field === '*') return { valid: true };
        
        if (field.includes('/')) {
            const [range, step] = field.split('/');
            if (range !== '*' && !this.validateRange(range, min, max)) {
                return { valid: false, error: `Invalid ${name} range: ${range}` };
            }
            const stepNum = parseInt(step);
            if (isNaN(stepNum) || stepNum <= 0) {
                return { valid: false, error: `Invalid ${name} step: ${step}` };
            }
            return { valid: true };
        }
        
        if (field.includes('-')) {
            return this.validateRange(field, min, max) ? 
                { valid: true } : 
                { valid: false, error: `Invalid ${name} range: ${field}` };
        }
        
        if (field.includes(',')) {
            const values = field.split(',');
            for (const value of values) {
                if (!this.validateSingleValue(value.trim(), min, max)) {
                    return { valid: false, error: `Invalid ${name} value: ${value}` };
                }
            }
            return { valid: true };
        }
        
        return this.validateSingleValue(field, min, max) ? 
            { valid: true } : 
            { valid: false, error: `Invalid ${name} value: ${field}` };
    }
    
    validateRange(range, min, max) {
        const [start, end] = range.split('-').map(v => parseInt(v));
        return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
    }
    
    validateSingleValue(value, min, max) {
        const num = parseInt(value);
        return !isNaN(num) && num >= min && num <= max;
    }
    
    generateHumanReadable(expression) {
        const [minute, hour, day, month, weekday] = expression.split(/\s+/);
        
        let text = 'At ';
        
        if (minute === '*') {
            text += 'every minute';
        } else if (minute.includes('/')) {
            const step = minute.split('/')[1];
            text += `every ${step} minutes`;
        } else if (minute.includes(',')) {
            const values = minute.split(',');
            text += `minute ${values.join(', ')}`;
        } else {
            text += `minute ${minute}`;
        }
        
        if (hour !== '*') {
            if (hour.includes(',')) {
                text += ` past hour ${hour}`;
            } else {
                text += ` past hour ${hour}`;
            }
        }
        
        if (weekday !== '*') {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            if (weekday === '1-5') {
                text += ', on weekdays (Monday through Friday)';
            } else if (weekday.includes('-')) {
                const [start, end] = weekday.split('-').map(d => parseInt(d));
                text += `, from ${days[start]} through ${days[end]}`;
            } else if (weekday.includes(',')) {
                const dayNames = weekday.split(',').map(d => days[parseInt(d)]);
                text += `, on ${dayNames.join(', ')}`;
            } else {
                text += `, on ${days[parseInt(weekday)]}`;
            }
        } else if (day !== '*') {
            text += `, on day ${day} of the month`;
        }
        
        if (month !== '*') {
            const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
            if (month.includes(',')) {
                const monthNames = month.split(',').map(m => months[parseInt(m)]);
                text += `, in ${monthNames.join(', ')}`;
            } else {
                text += `, in ${months[parseInt(month)]}`;
            }
        }
        
        return text + '.';
    }
    
    calculateNextRuns(expression) {
        const [minute, hour, day, month, weekday] = expression.split(/\s+/);
        const now = new Date();
        const runs = [];
        
        for (let i = 0; i < 100 && runs.length < 5; i++) {
            const testDate = new Date(now.getTime() + i * 60000);
            
            if (this.matchesCron(testDate, { minute, hour, day, month, weekday })) {
                runs.push(testDate);
            }
        }
        
        return runs;
    }
    
    matchesCron(date, cron) {
        const minute = date.getMinutes();
        const hour = date.getHours();
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const weekday = date.getDay();
        
        return this.matchesField(minute, cron.minute, 0, 59) &&
               this.matchesField(hour, cron.hour, 0, 23) &&
               this.matchesField(day, cron.day, 1, 31) &&
               this.matchesField(month, cron.month, 1, 12) &&
               this.matchesField(weekday, cron.weekday, 0, 6);
    }
    
    matchesField(value, pattern, min, max) {
        if (pattern === '*') return true;
        
        if (pattern.includes('/')) {
            const [range, step] = pattern.split('/');
            const stepNum = parseInt(step);
            if (range === '*') {
                return value % stepNum === 0;
            }
            const [start, end] = range.split('-').map(v => parseInt(v));
            return value >= start && value <= end && (value - start) % stepNum === 0;
        }
        
        if (pattern.includes('-')) {
            const [start, end] = pattern.split('-').map(v => parseInt(v));
            return value >= start && value <= end;
        }
        
        if (pattern.includes(',')) {
            return pattern.split(',').map(v => parseInt(v)).includes(value);
        }
        
        return value === parseInt(pattern);
    }
    
    updateValidationStatus(isValid, error = '') {
        if (isValid) {
            this.validationStatus.className = 'inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20';
            this.validationStatus.innerHTML = '<i data-lucide="check-circle-2" class="w-3 h-3"></i>Valid Expression';
            this.cronInput.classList.remove('error');
            this.cronInput.classList.add('valid');
        } else {
            this.validationStatus.className = 'inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20';
            this.validationStatus.innerHTML = `<i data-lucide="x-circle" class="w-3 h-3"></i>${error || 'Invalid Expression'}`;
            this.cronInput.classList.add('error');
            this.cronInput.classList.remove('valid');
        }
        lucide.createIcons();
    }
    
    updateFieldLegend(expression) {
        const parts = expression.split(/\s+/);
        if (parts.length === 5) {
            const labels = ['min', 'hour', 'day', 'month', 'week'];
            this.fieldLegend.innerHTML = parts.map((part, i) => 
                `<div class="text-center"><span class="text-slate-200 font-medium">${part}</span><br>${labels[i]}</div>`
            ).join('');
        }
    }
    
    updateNextRuns(expression) {
        const validation = this.validateCron(expression);
        if (!validation.valid) {
            this.nextRunsSection.classList.add('hidden');
            return;
        }
        
        this.nextRunsSection.classList.remove('hidden');
        const runs = this.calculateNextRuns(expression);
        
        this.nextRunsList.innerHTML = runs.map(date => {
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString();
            return `
                <li class="px-3 py-2 rounded-md hover:bg-slate-700/50 flex justify-between items-center text-sm group cursor-default transition-colors">
                    <span class="text-slate-400 font-mono">${dateStr}</span>
                    <span class="text-slate-200 font-medium font-mono group-hover:text-primary-400">${timeStr}</span>
                </li>
            `;
        }).join('');
    }
    
    updateBuilderFromCron(expression) {
        const parts = expression.split(/\s+/);
        if (parts.length === 5) {
            const [minute, hour, day, month, weekday] = parts;
            this.builderInputs.minute.value = minute;
            this.builderInputs.hour.value = hour;
            this.builderInputs.day.value = day;
            this.builderInputs.month.value = month;
            this.builderInputs.weekday.value = weekday;
        }
    }
    
    updatePresetButtons(expression) {
        this.presetButtons.forEach(btn => {
            if (btn.dataset.preset === expression) {
                btn.className = 'px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium rounded-md shadow-sm ring-2 ring-offset-2 ring-offset-slate-900 ring-slate-700';
            } else {
                btn.className = 'px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-slate-600 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-md transition-all shadow-sm';
            }
        });
    }
    
    handleCronChange() {
        const expression = this.cronInput.value.trim();
        const validation = this.validateCron(expression);
        
        this.updateValidationStatus(validation.valid, validation.error);
        this.updateFieldLegend(expression);
        this.updateBuilderFromCron(expression);
        this.updatePresetButtons(expression);
        
        if (validation.valid) {
            this.humanReadable.textContent = this.generateHumanReadable(expression);
            this.updateNextRuns(expression);
        } else {
            this.humanReadable.textContent = 'Please enter a valid cron expression to see the description.';
            this.nextRunsSection.classList.add('hidden');
        }
    }
    
    handleBuilderChange() {
        const expression = Object.values(this.builderInputs).map(input => input.value).join(' ');
        this.cronInput.value = expression;
        this.handleCronChange();
    }
    
    applyPreset(preset) {
        this.cronInput.value = preset;
        this.handleCronChange();
    }
    
    resetToDefaults() {
        const defaultExpression = '* * * * *';
        this.cronInput.value = defaultExpression;
        this.handleCronChange();
    }
    
    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.cronInput.value);
            this.showCopyFeedback();
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = this.cronInput.value;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showCopyFeedback();
        }
    }
    
    showCopyFeedback() {
        const originalIcon = this.copyBtn.innerHTML;
        const originalTitle = this.copyBtn.title;
        
        // Show copied state
        this.copyBtn.innerHTML = '<i data-lucide="check" class="w-5 h-5"></i>';
        this.copyBtn.title = 'Copied!';
        this.copyBtn.classList.add('text-emerald-400');
        lucide.createIcons();
        
        // Reset after 2 seconds
        setTimeout(() => {
            this.copyBtn.innerHTML = originalIcon;
            this.copyBtn.title = originalTitle || 'Copy to clipboard';
            this.copyBtn.classList.remove('text-emerald-400');
            lucide.createIcons();
        }, 2000);
    }
}

