// ========== АУДИО СИСТЕМА ==========

const AudioSystem = {
    context: null,
    
    init() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
    },
    
    play(type, volume = 0.3) {
        if (!this.context) this.init();
        
        const o = this.context.createOscillator();
        const g = this.context.createGain();
        o.connect(g);
        g.connect(this.context.destination);
        g.gain.value = volume;
        
        switch(type) {
            case 'shot':
                o.type = 'sawtooth';
                o.frequency.value = 80;
                g.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
                o.start();
                o.stop(this.context.currentTime + 0.3);
                break;
                
            case 'rapidfire':
                o.type = 'square';
                o.frequency.value = 150;
                g.gain.value = 0.2;
                g.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);
                o.start();
                o.stop(this.context.currentTime + 0.1);
                break;
                
            case 'bigshot':
                o.type = 'sawtooth';
                o.frequency.value = 40;
                g.gain.value = 0.5;
                g.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.5);
                o.start();
                o.stop(this.context.currentTime + 0.5);
                break;
                
            case 'hit':
                o.type = 'square';
                o.frequency.value = 200;
                g.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.15);
                o.start();
                o.stop(this.context.currentTime + 0.15);
                break;
                
            case 'rico':
                o.type = 'sine';
                o.frequency.value = 2000;
                o.frequency.exponentialRampToValueAtTime(4000, this.context.currentTime + 0.2);
                g.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
                o.start();
                o.stop(this.context.currentTime + 0.3);
                break;
                
            case 'boom':
                o.type = 'sawtooth';
                o.frequency.value = 30;
                g.gain.value = 0.6;
                g.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.8);
                o.start();
                o.stop(this.context.currentTime + 0.8);
                break;
                
            case 'eng':
                o.type = 'sawtooth';
                o.frequency.value = 35 + Math.random() * 10;
                g.gain.value = 0.04;
                g.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);
                o.start();
                o.stop(this.context.currentTime + 0.1);
                break;
        }
    }
};

// Сокращённая функция для совместимости
function snd(type, volume) {
    AudioSystem.play(type, volume);
}