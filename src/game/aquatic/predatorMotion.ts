// Presentation timing only: damage, pursuit and collision remain owned by the simulation.
export const PREDATOR_MOTION={frameMs:140,biteMs:320,openMs:220,lunge:.06};
export function predatorFrame(clock:number,viewRow:number,biteAge:number,reduced:boolean,phase=0):number {
  const column=biteAge<PREDATOR_MOTION.openMs?3:biteAge<PREDATOR_MOTION.biteMs?1:
    reduced?1:[0,1,2,1][Math.floor((clock+phase)/PREDATOR_MOTION.frameMs)%4];
  return viewRow*4+column;
}

// Hunting keeps the original cadence; passive jellyfish drift more slowly still.
export function swimRate(hunting:boolean,jelly=false):number { return jelly?.25:hunting?1:.5; }
