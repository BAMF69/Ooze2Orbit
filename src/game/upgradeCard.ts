import './upgradePolish.css';
// Stable native buttons preserve keyboard/controller focus as balances change.
import { node } from './cell/responsiveUi';
const SYMBOLS: Record<string, string> = { attack: '✦', speed: '➤', defense: '⬡', mobility: '↝', health: '♥' };
export function paintUpgradeCard(button: HTMLButtonElement, stat: string, title: string, level: number, cap: number,
  cost: string, effect: string, affordable: boolean, bonusLabel: string, displayCost = cost): void {
  if (!button.firstElementChild) {
    button.classList.add('upgrade-card'); button.dataset.stat = stat;
    button.append(node('span', SYMBOLS[stat], 'upgrade-symbol'), node('strong', '', 'upgrade-title'),
      node('span', '', 'upgrade-level'), node('span', '', 'upgrade-effect'), node('span', '', 'upgrade-cost'), node('span', '', 'upgrade-track'));
  }
  const set = (selector: string, text: string) => { const n = button.querySelector(selector)!; if (n.textContent !== text) n.textContent = text; };
  set('.upgrade-title', title); set('.upgrade-level', level > cap ? `${cap}+${level-cap}` : `${level}/${cap}`);
  button.title = [title, level > cap ? bonusLabel : `${level}/${cap}`, cost, effect].join(' · ');
  button.setAttribute('aria-label',button.title);
  set('.upgrade-effect', effect); set('.upgrade-cost', displayCost);
  (button.querySelector('.upgrade-track') as HTMLElement).style.setProperty('--level-fill', `${Math.min(1, level / cap) * 100}%`);
  button.classList.toggle('unaffordable', !affordable); button.classList.toggle('bonus-level', level > cap);
}
