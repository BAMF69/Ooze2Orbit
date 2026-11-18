import {it,expect} from 'vitest';
import {renderTarget} from '../src/core/renderQuality';
import {settingsLoad,settingsText} from '../src/core/settings';
it('renders4K at bounded auto or full high without changing logical coordinates',()=>{
 expect(renderTarget(3840,2160,640,360,1,'auto',false)).toEqual({width:2560,height:1440});
 expect(renderTarget(3840,2160,640,360,1,'high',false)).toEqual({width:3840,height:2160});
});
it('keeps older saves compatible and persists a valid quality choice',()=>{
 expect(settingsLoad('{"display":{"ui_scale":1}}').settings.display.render_quality).toBe('auto');
 expect(settingsLoad('{"display":{"render_quality":"invalid"}}').settings.display.render_quality).toBe('auto');
 const {settings}=settingsLoad('{"display":{"render_quality":"ultra"}}');
 expect(settingsLoad(settingsText(settings)).settings.display.render_quality).toBe('ultra');
});
it('caps phone density and hardware limits',()=>{
 const phone=renderTarget(375,812,360,780,3,'auto',true);expect(phone.width).toBeGreaterThan(700);expect(phone.width).toBeLessThanOrEqual(750);
 const limited=renderTarget(3840,2160,640,360,2,'ultra',false,2048);expect(limited.width).toBeLessThanOrEqual(2048);
});
