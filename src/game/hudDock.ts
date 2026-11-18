// Stable organic HUD tabs; scene adapters retain all gameplay and purchase ownership.
import './hudDock.css';
import type * as Phaser from 'phaser';
import type { I18n } from '../core/i18n';
import { node } from './cell/responsiveUi';
import { shell } from '../shell/app';
import { installIllustratedHud } from './illustratedHud';
let owner: HudDock | undefined;
let playBottomPx = 0;
export class HudDock {
  private active: 'growth'|'upgrades'|'info' = 'growth';
  get infoOpen():boolean { return this.active==='info'; }
  private upgradeButton!:HTMLButtonElement;
  private dashMeter=node('progress','','dock-dash-meter');
  private resourceMeters={algae:node('progress'),meat:node('progress')};
  private resourceLabels={algae:node('span'),meat:node('span')};
  private illustratedHud: ReturnType<typeof installIllustratedHud>;
  readonly advance=node('button','','dock-advance');
  constructor(scene:Phaser.Scene,private i:I18n,options:{root:HTMLElement;growth:HTMLElement;status:HTMLElement;
    inventory:HTMLElement;details:HTMLDetailsElement;hints:HTMLElement;upgrade:()=>void;commands?:HTMLElement;advance?:()=>void}) {
    owner=this;
    const {root,growth,status,inventory,details,hints}=options;
    root.classList.add('compact-organic-hud');growth.classList.add('hud-dock');
    root.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')shell.input.use('touch');});
    root.addEventListener('click',e=>{if(e instanceof MouseEvent&&e.detail>0&&e.target instanceof HTMLElement)e.target.closest<HTMLElement>('button')?.blur();});
    const header=node('div','','dock-header'),tabs=node('div','','dock-tabs'),content=node('div','','dock-content');
    const growthPanel=node('section','','dock-growth-panel'),infoPanel=node('section','','dock-info-panel');
    const growthTab=node('button',i.t('hud.growth'),'dock-growth-tab'),upgrade=node('button',i.t('cell.ui.upgrades'),'dock-upgrade');
    const infoTab=node('button',i.t('hud.info'),'dock-info-tab');infoTab.title=i.t('hud.info_label');infoTab.setAttribute('aria-label',i.t('hud.info_label'));
    this.upgradeButton=upgrade;
    tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',i.t('hud.tabs'));
    const buttons={growth:growthTab,upgrades:upgrade,info:infoTab};
    for(const button of Object.values(buttons))button.setAttribute('role','tab');
    let upgradeRoot:HTMLElement|undefined;
    const select=(tab:typeof this.active)=>{
      this.active=tab;growth.dataset.tab=tab;root.dataset.hudTab=tab;
      growthPanel.hidden=false;infoPanel.hidden=tab!=='info';content.hidden=tab==='growth';
      for(const [name,button] of Object.entries(buttons)){button.setAttribute('aria-selected',String(name===tab));button.setAttribute('aria-pressed',String(name===tab));}
    };
    const leaveUpgrades=()=>{if(upgradeRoot&&!upgradeRoot.hidden)options.upgrade();};
    growthTab.onclick=()=>{leaveUpgrades();shell.input.clearMenuInput();select('growth');};
    infoTab.onclick=()=>{leaveUpgrades();shell.input.clearMenuInput();select('info');};
    upgrade.onclick=()=>{if(this.active!=='upgrades')options.upgrade();};
    this.advance.textContent=i.t('hud.evolve');this.advance.hidden=true;this.advance.onclick=()=>options.advance?.();
    const upgradeChange=(event:Event)=>{const d=(event as CustomEvent).detail;if(d.scene!==scene)return;
      upgradeRoot=d.root;content.append(d.root);if(d.open)select('upgrades');else if(this.active==='upgrades')select('growth');};
    document.addEventListener('organic-upgrades-change',upgradeChange);
    tabs.append(growthTab,upgrade,infoTab);header.append(tabs,this.advance);
    const center=node('div','','dock-center'),dash=node('label',i.t('display.dash'),'dock-dash'),middle=node('div','','dock-middle');
    this.dashMeter.max=1;this.dashMeter.value=1;this.dashMeter.setAttribute('aria-label',i.t('hud.dash_ready'));dash.append(this.dashMeter);middle.append(dash);
    for(const kind of ['algae','meat'] as const){const label=node('label','','dock-resource '+kind);this.resourceMeters[kind].max=1;label.append(this.resourceLabels[kind],this.resourceMeters[kind]);center.append(label);}
    center.append(middle);
    if(options.commands){const gardener=node('button',i.t('display.gardener'),'dock-gardener');gardener.onclick=()=>{shell.input.clearMenuInput();shell.input.inject('lens');};middle.append(gardener);}
    growthPanel.append(...[...growth.children]);
    const guide=node('section','','dock-guide-controls'),effects=node('section','','dock-guide-details');
    hints.classList.add('dock-hints');guide.append(node('h3',i.t('hud.controls')),hints);if(options.commands)guide.append(options.commands);
    effects.append(node('h3',i.t('display.details')),...[...details.children].filter(n=>n.tagName!=='SUMMARY'));details.remove();
    const browser=node('div','','dock-browser-actions'),pause=node('button',i.t('action.pause'));
    pause.onclick=()=>document.querySelector<HTMLButtonElement>('.cell-toolbar [data-tr="action.pause"]')?.click();
    const full=node('button'),help=node('p',i.t('hud.safari_help'),'dock-install-help');help.hidden=true;
    full.onclick=()=>{if(document.fullscreenEnabled)document.querySelector<HTMLButtonElement>('.cell-toolbar [data-tr^="display."]')?.click();else {leaveUpgrades();select('info');help.hidden=false;}};
    browser.append(pause,full);guide.append(browser,help);infoPanel.append(guide,effects);
    content.classList.add('dock-floating');content.append(infoPanel);
    const statusGroup=node('aside','','dock-status-group'),vitals=root.querySelector<HTMLElement>('.aquatic-vitals');
    if(vitals)statusGroup.append(vitals);statusGroup.append(center,status);
    root.append(statusGroup,content);growth.append(header,growthPanel);
    select('growth');
    const system=node('div','','dock-system'),topPause=node('button','Ⅱ','organic-pause');topPause.title=i.t('action.pause');topPause.setAttribute('aria-label',topPause.title);topPause.onclick=()=>pause.click();const topFull=node('button','','organic-fullscreen');system.append(topPause,topFull);root.append(system);topFull.onclick=()=>full.click();
    const refreshFull=()=>{const on=!!document.fullscreenElement;
      full.textContent=i.t(document.fullscreenEnabled?(on?'display.exit_fullscreen':'display.fullscreen'):'hud.install');
      topFull.hidden=false;topFull.classList.toggle('is-fullscreen',on);
      const fullLabel=topFull.querySelector('.proof-original-system');if(fullLabel)fullLabel.textContent=on?'⤡':'⛶';else topFull.textContent=on?'⤡':'⛶';topFull.title=i.t(document.fullscreenEnabled?(on?'display.exit_fullscreen':'display.fullscreen'):'hud.install');topFull.setAttribute('aria-label',topFull.title);};
    refreshFull();document.addEventListener('fullscreenchange',refreshFull);window.addEventListener('resize',refreshFull);
    const bar=node('div','','hud-inventory');inventory.classList.add('dock-parts');bar.append(inventory);root.append(bar);
    this.illustratedHud=installIllustratedHud(scene,root,growth,statusGroup);
    const measure=()=>{if(owner!==this)return;const bounds=growth.getBoundingClientRect();
      document.body.style.setProperty('--organic-dock-height',`${Math.ceil(bounds.height)}px`);document.body.style.setProperty('--organic-inventory-height',`${Math.ceil(bar.getBoundingClientRect().height)}px`);playBottomPx=bounds.top-12;};
    const resize=new ResizeObserver(measure);resize.observe(growth);resize.observe(bar);window.addEventListener('resize',measure);window.visualViewport?.addEventListener('resize',measure);
    scene.events.once('shutdown',()=>{resize.disconnect();document.removeEventListener('organic-upgrades-change',upgradeChange);document.removeEventListener('fullscreenchange',refreshFull);window.removeEventListener('resize',refreshFull);window.removeEventListener('resize',measure);window.visualViewport?.removeEventListener('resize',measure);
      if(owner===this){document.body.style.removeProperty('--organic-dock-height');document.body.style.removeProperty('--organic-inventory-height');playBottomPx=0;owner=undefined;}
    });
  }
  meters(points: {algae:number;meat:number}, costs: {algae:number|null;meat:number|null}, affordable:boolean, cooldown:number, duration:number, readiness?: {algae:boolean;meat:boolean}): void {
    this.upgradeButton.classList.toggle('purchase-ready',affordable);
    this.advance.classList.toggle('evolution-ready',!this.advance.hidden);
    for(const kind of ['algae','meat'] as const) { const cost=costs[kind], value=points[kind], ready=readiness?.[kind] ?? (cost!==null&&value>=cost);
      const fullLabel=`${this.i.t(kind==='algae'?'cell.hud_plant':'cell.hud_meat',{n:Math.floor(value)})}${cost===null?'':` / ${cost}`}`;
      this.resourceLabels[kind].textContent=this.illustratedHud?`${Math.floor(value)}${cost===null?'':`/${cost}`}`:fullLabel;
      this.resourceMeters[kind].parentElement!.setAttribute('aria-label',fullLabel);
      this.resourceMeters[kind].value=cost===null?0:Math.min(1,value/cost); this.resourceMeters[kind].parentElement!.classList.toggle('purchase-ready',ready);
    }
    this.dashMeter.parentElement!.title=this.dashMeter.title;
    this.dashMeter.value=duration>0?Math.max(0,1-cooldown/duration):0; this.dashMeter.title=duration<=0?this.i.t('hud.dash_locked'):cooldown>0?this.i.t('hud.recharge',{seconds:cooldown.toFixed(1)}):this.i.t('hud.ready');
    this.illustratedHud?.dash(duration<=0?'—':cooldown>0?`${cooldown.toFixed(1)}s`:this.i.t('hud.ready'),duration>0);
  }
}
/** Keep the behind-view swimmer above the CSS dock, including short Safari landscape windows. */
export function organicPlayBottom(logicalHeight: number): number {
  const height = window.visualViewport?.height ?? innerHeight;
  const dockBottom = owner && playBottomPx ? playBottomPx : height - 102;
  const bottom = dockBottom; // Every tab now uses the same measured compact frame.
  return logicalHeight * Math.max(0, bottom / height);
}
