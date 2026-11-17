// Eligible purchases only: capped stats never create a false ready signal.
export function purchaseMeters(points: {algae:number;meat:number}, offers: readonly {cost:number|null;pay:'algae'|'meat'|'either'}[]) {
  const costs: {algae:number|null;meat:number|null}={algae:null,meat:null}; const ready={algae:false,meat:false};let affordable=false;
  for(const offer of offers) { if(offer.cost===null) continue;
    const {cost,pay}=offer; if((pay==='either'?points.algae+points.meat:points[pay])>=cost) affordable=true;
    for(const kind of ['algae','meat'] as const) if(pay===kind||pay==='either') {
      const threshold=cost;
      if(pay==='either' ? points.algae+points.meat>=cost&&points[kind]>0 : points[kind]>=cost)ready[kind]=true;
      costs[kind]=Math.min(costs[kind]??Infinity,threshold);
    }
  }
  return {costs,affordable,ready};
}
