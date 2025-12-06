import { state } from '../core/state.js';

export function renderLabel() {
    const header = document.querySelector('.header');
    const contentlabel = document.getElementById('content-label');
    const hour = new Date().getHours();
    const name = state.settings.userName || 'my Friend';
    let text = 'New Tab Ultra';

    header.style.display = state.settings.displayLabel ? 'block' : 'none';

    header.setAttribute("label-position", state.settings.labelPosition);

    contentlabel.setAttribute("label-style", state.settings.labelStyle);

    switch (state.settings.labelContent) {
        case 'time':
            text = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            break;
        case 'date':
            text = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
            break;
        case 'greetings':
            const helloOptions = [
                `Hello, ${name}`,
                `Hi, ${name}`,
                `Welcome back, ${name}`,
                `Look who it is, ${name}!`,
                `Hey there, ${name}`,
                `Nice to see you, ${name}`
            ];
            text = helloOptions[Math.floor(Math.random() * helloOptions.length)];
            break;
        case 'timeOfDay':
            if (hour >= 4 && hour < 12) {
                text = `Good morning, ${name}`;
            } else if (hour >= 12 && hour < 18) {
                text = `Good afternoon, ${name}`;
            } else if (hour >= 18 && hour < 20) {
                text = `Good evening, ${name}`;
            } else {
                text = `Good night, ${name}`;
            }
            break;
    }
    contentlabel.textContent = text;

}