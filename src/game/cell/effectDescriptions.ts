import type { I18n } from '../../core/i18n';
// Player-facing effects derived from the same rules used by movement and collisions.
import { TUNING, type UpgradeStat, type PartKind } from './tuning';
import { bumpDamage, maxSpeed, spoolTime, type Creature } from './rules';
export function upgradeEffect(c: Creature, s: UpgradeStat, i: I18n): string {
  switch (s) {
    case 'attack': return i.t('effect.cell.attack', { damage: bumpDamage(c), per: TUNING.attackPerLevel });
    case 'speed': return i.t('effect.cell.speed', { speed: Math.round(maxSpeed(c)), per: TUNING.speedPerLevel * 100 });
    case 'defense': return i.t('effect.cell.defense');
    case 'mobility': return i.t('effect.cell.mobility', { seconds: spoolTime(c).toFixed(2) });
  }
}
export function partEffect(p: PartKind, i: I18n): string {
  switch (p) {
    case 'spikes': return i.t('effect.part.spikes', { damage: TUNING.spikeDamageBonus });
    case 'shell': return i.t('effect.part.shell', { percent: Math.round((1-TUNING.shellLossMult)*100) });
    case 'mouth': return i.t('effect.part.mouth', { mult: TUNING.mouthFoodMult, radius: TUNING.mouthPullRadius });
  }
}
