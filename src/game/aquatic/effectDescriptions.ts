import type { I18n } from '../../core/i18n';
// Current derived totals account for inherited levels, parts and body thickness.
import { maxHp, movement, ramDamage, type AqCreature } from './creature';
import { AQ, type AqStat } from './tuning';
export function upgradeEffect(c: AqCreature, s: AqStat, i: I18n): string {
  switch (s) {
    case 'attack': return i.t('effect.aq.attack', { damage: ramDamage(c), per: AQ.stats.attackPerLevel, mult: AQ.stats.dashRamMult });
    case 'speed': return i.t('effect.aq.speed', { speed: Math.round(movement(c).maxSpeed), per: AQ.stats.speedPerLevel * 100 });
    case 'defense': return i.t('effect.aq.defense', { percent: Math.round(Math.max(0,1-AQ.stats.defensePerLevel*c.ups.defense)*100), per: AQ.stats.defensePerLevel*100 });
    case 'mobility': return i.t('effect.aq.mobility', { seconds: movement(c).spoolS.toFixed(2) });
    case 'health': return i.t('effect.aq.health', { hp: maxHp(c), per: AQ.stats.hpPerLevel });
  }
}
