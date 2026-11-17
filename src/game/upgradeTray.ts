// A quarter-height native purchase rail; the rest of the habitat stays visible and undimmed.
import type * as Phaser from 'phaser';
import type { I18n } from '../core/i18n';
import { node } from './cell/responsiveUi';
const openTrays = new Set<HTMLElement>();
export class UpgradeTray {
  readonly notice = node('p', '', 'upgrade-tray-notice');
  readonly balance = node('small', '', 'upgrade-tray-balance');
  readonly rail = node('div', '', 'upgrade-rail');
  constructor(private scene: Phaser.Scene, private root: HTMLElement, i: I18n, count: number, close: () => void) {
    root.classList.add('upgrade-quarter'); root.style.setProperty('--upgrade-count',String(count));
    const panel = node('section', '', 'cell-dialog upgrade-tray-panel'), header = node('header', '', 'upgrade-tray-header');
    panel.setAttribute('role','region'); panel.setAttribute('aria-label',i.t('cell.ui.upgrades'));
    header.append(node('h2', i.t('cell.ui.upgrades')), this.notice, this.balance);
    const exit = node('button', '×', 'upgrade-tray-close'); exit.setAttribute('aria-label',i.t('cell.ui.up_close')); exit.title=i.t('cell.ui.up_close'); exit.onclick=close;
    panel.append(header, this.rail, exit); root.append(panel);
    scene.events.once('shutdown', () => this.show(false));
  }
  show(open: boolean): void {
    this.root.hidden = !open;
    if (open) openTrays.add(this.root); else openTrays.delete(this.root);
    document.body.classList.toggle('organic-upgrades-open', [...openTrays].some(n=>n.isConnected));
    document.dispatchEvent(new CustomEvent('organic-upgrades-change',{detail:{scene:this.scene,root:this.root,open}}));
  }
}
