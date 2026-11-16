import {it,expect} from 'vitest';
import {playerPose,bodyWidth,visualRank} from '../src/game/aquatic/playerMotion';
import {creatureFromLineage} from '../src/game/aquatic/creature';
const moving={speed:120,dash:false,airborne:false,rising:false,stunned:false};
it('selects swim, attack, dash, breach and stun with deliberate priority',()=>{
 expect(playerPose(moving,Infinity,320,false,2)).toMatchObject({state:'swim',column:2});
 expect(playerPose(moving,10,320,false,2)).toMatchObject({state:'attack',column:3});
 expect(playerPose({...moving,dash:true},10,320,false,2)).toMatchObject({state:'dash',column:1,width:.82});
 expect(playerPose({...moving,airborne:true,rising:true},10,320,false,2)).toMatchObject({state:'breach',row:1,tilt:-1.05});
 expect(playerPose({...moving,stunned:true},10,320,false,2).state).toBe('stunned');
});
it('retains action cues with reduced motion and slows idle swimming',()=>{
 expect(playerPose(moving,Infinity,320,true,2).column).toBe(1);
 expect(playerPose({...moving,airborne:true},Infinity,320,true,2).tilt).toBe(0);
 expect(playerPose({...moving,speed:0},Infinity,320,false,2).rate).toBe(.25);
});
it('bounds visual stat ranks and adds visible bulk with health',()=>{
 const c=creatureFromLineage(null,'herbivore');expect(visualRank(99)).toBe(5);
 expect(bodyWidth({...c,ups:{...c.ups,health:10}})).toBeGreaterThan(bodyWidth(c));
 expect(bodyWidth({...c,ups:{...c.ups,speed:10}})).toBeLessThan(bodyWidth(c));
});
