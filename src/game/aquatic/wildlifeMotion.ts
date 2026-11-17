// Whole painted poses keep the tentacles and bell connected throughout the swim cycle.
export function wildlifeFrame(clock:number,row:number,age:number,reduced:boolean,phase=0,jelly=false):number {
 const attackMs=jelly?600:220;
 const col=age<attackMs?3:reduced?1:[0,1,2,1][Math.floor((clock+phase)/(jelly?200:140))%4];
 return row*4+col;
}
