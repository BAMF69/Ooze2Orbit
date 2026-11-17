"""Measure significant alpha and optical anchors without altering any generated PNG.

Gutters are detected from alpha occupancy rather than assuming equal-cell boundaries. New rigs are first-pass
body-specific fits; detailed attachment review is explicitly deferred. Requires Pillow/numpy in the dev env.
"""
from pathlib import Path
import copy
import json
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
ART=ROOT/'public/assets/art'
FAMILIES=('aggressive','adaptable','cautious')
DIETS=('herbivore','omnivore','carnivore')

def gutter(occupancy,expected,radius):
    start=max(1,int(expected-radius));end=min(len(occupancy)-1,int(expected+radius))
    empty=np.where(occupancy[start:end]==0)[0]
    if not len(empty):
        best=int(np.argmin(occupancy[start:end]))+start
        if occupancy[best]>3:raise ValueError(f'No safe gutter near {expected}: {occupancy[best]} pixels')
        return best
    groups=np.split(empty,np.where(np.diff(empty)>1)[0]+1)
    group=max(groups,key=len)
    return start+int(np.median(group))

def measure(path):
    a=np.array(Image.open(path).convert('RGBA'));h,w=a.shape[:2];mask=a[:,:,3]>32
    rows=[0,gutter(mask.sum(1),h/3,h*.12),gutter(mask.sum(1),h*2/3,h*.12),h]
    result=[]
    for row in range(3):
        top,bottom=rows[row:row+2];density=mask[top:bottom].sum(0)
        columns=[0]+[gutter(density,w*n/4,w*.065) for n in range(1,4)]+[w]
        for col in range(4):
            left,right=columns[col:col+2];tile=a[top:bottom,left:right];yy,xx=np.where(tile[:,:,3]>32)
            x=left+int(xx.min());y=top+int(yy.min());cw=int(xx.max()-xx.min()+1);ch=int(yy.max()-yy.min()+1)
            if cw>376 or ch>376:raise ValueError(f'{path.name} oversized {row}/{col}: {cw}x{ch}')
            if x<=0 or y<=0 or x+cw>=w or y+ch>=h:raise ValueError(f'{path.name} clipped outer silhouette')
            cut=a[y:y+ch,x:x+cw];rgb=cut[:,:,:3].astype(float);r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
            eye=(r>g*1.45)&(b>g*1.5)&(b>r*.72)&(b>55)&(cut[:,:,3]>128)
            if row==1:eye[:,:int(cw*.55)]=False
            if row==2:
                band=cut[:max(8,int(ch*.08)),:,3]>128;ey,ex=np.where(band)
                head=[float(np.median(ex)),float(np.median(ey))]
            else:
                ey,ex=np.where(eye)
                if len(ex)<5:raise ValueError(f'{path.name} missing cyclops eye {row}/{col}')
                head=[float(np.median(ex)),float(np.median(ey))]
            result.append({'rect':[x,y,cw,ch],'head':head})
    return a,result

def align(group):
    # One optical anchor per view, shared across all diet palettes and poses of a form.
    for row in range(3):
        desired=(192,190) if row==0 else (300,167) if row==1 else (192,70)
        chosen=[]
        for axis in range(2):
            lower=[];upper=[]
            for _,records in group.values():
                for item in records[row*4:row*4+4]:
                    relative=item['head'][axis];size=item['rect'][2+axis]
                    lower.append(4+relative);upper.append(380-size+relative)
            lo,hi=max(lower),min(upper)
            if lo>hi:raise ValueError(f'Inconsistent pose scale: anchor interval {lo}..{hi}')
            chosen.append(min(hi,max(lo,desired[axis])))
        for _,records in group.values():
            for item in records[row*4:row*4+4]:item['offset']=[round(chosen[n]-item['head'][n],2) for n in range(2)]

def tail_and_spines(a,items):
    tails=[];spines={'side':[],'back':[]}
    for i,item in enumerate(items):
        x,y,w,h=item['rect'];ox,oy=item['offset'];tile=a[y:y+h,x:x+w];mask=tile[:,:,3]>128;row=i//4
        tip=mask.copy()
        if row==0:tip[int(h*.18):]=False
        elif row==1:tip[:,int(w*.18):]=False
        else:tip[:int(h*.85)]=False
        yy,xx=np.where(tip);tails.append([round((ox+float(np.median(xx)))/3,2),round((oy+float(np.median(yy)))/3,2)])
        if row==1:
            head=(ox+item['head'][0])/3
            end=max(ox/3+8,head-55);points=[]
            for lx in np.linspace(head-6,end,7):
                cx=round(lx*3-ox);samples=[]
                for sx in range(max(0,cx-2),min(w,cx+3)):
                    hits=np.where(mask[:,sx])[0]
                    if len(hits):samples.append(int(hits[0]))
                if not samples:raise ValueError('Missing dorsal silhouette sample')
                points.append([round(float(lx),2),round((oy+float(np.median(samples))+5)/3,2)])
            spines['side'].append(points)
        elif row==2:
            head_x=(ox+item['head'][0])/3;start=(oy+item['head'][1])/3+8
            end=min((oy+h*.72)/3,start+54);previous=head_x*3-ox;points=[]
            for ly in np.linspace(start,end,7):
                sy=min(h-1,max(0,round(ly*3-oy)));hits=np.where(mask[sy])[0]
                groups=[v for v in np.split(hits,np.where(np.diff(hits)>1)[0]+1) if len(v)>2]
                if not groups:raise ValueError('Missing rear dorsal sample')
                part=min(groups,key=lambda v:abs(float(np.median(v))-previous));previous=float(np.median(part))
                points.append([round((ox+previous)/3,2),round(float(ly),2)])
            spines['back'].append(points)
    return tails,spines

def provisional_rig(template,family,form,group,tails,spines):
    rig=copy.deepcopy(template);rig['id']=f'aquatic.{family}.f{form}.v1';rig['family']=family
    rig['forms']={str(form):{'label':f'{family.capitalize()} form {form}','artStatus':'authored'}}
    rig['poseLandmarks']={'tail.fin':tails}
    rig['paths']['spine.dorsal']['points']={diet:spines[diet] for diet in DIETS}
    rig['attachmentStatus']='provisional'
    _,items=group['omnivore']
    heads={view:[(items[row*4+1]['offset'][axis]+items[row*4+1]['head'][axis])/3 for axis in range(2)]
           for row,view in enumerate(('front','side','back'))}
    # Author a coarse body-specific fit, keeping precise organ refinement out of this maturation pass.
    offsets={'mouth.lower':(0,7),'mouth.upper':(0,5),'mouth.corner.left':(-4,7),'mouth.corner.right':(4,7),
             'shoulder.left':(-8,15),'shoulder.right':(8,15),'pelvis.left':(-8,27),'pelvis.right':(8,27),
             'flank.left':(-5,10),'flank.right':(5,10),'abdomen':(0,20),'ventral.left':(-7,30),'ventral.right':(7,30),'armor.front':(0,13)}
    side_offsets={'mouth.lower':(4,3),'mouth.upper':(4,1),'mouth.corner.left':(2,3),'mouth.corner.right':(6,3),
                  'shoulder.left':(-20,12),'shoulder.right':(-20,12),'pelvis.left':(-35,17),'pelvis.right':(-35,17),
                  'flank.left':(-13,8),'flank.right':(-10,8),'abdomen':(-30,12),'ventral.left':(-25,14),'ventral.right':(-29,14)}
    broad=.75 if family=='adaptable' else 1.5 if family=='cautious' else 1.2
    for name,definition in rig['sockets'].items():
        if name=='tail.fin':continue
        definition.pop('poseOffsets',None);positions={}
        for view in definition.get('positions',{}):
            hx,hy=heads[view]
            if view=='side':dx,dy=side_offsets[name]
            elif view=='front':dx,dy=offsets[name];dx*=broad
            else:
                dx,dy=offsets[name];dx*=broad;dy={'shoulder.left':20,'shoulder.right':20,'pelvis.left':32,'pelvis.right':32,'flank.left':23,'flank.right':23,'abdomen':27,'ventral.left':39,'ventral.right':39}.get(name,dy)
            positions[view]=[round(hx+dx,2),round(hy+dy,2)]
        definition['positions']=positions
    return rig

def main():
    legacy=json.loads((ROOT/'src/game/aquatic/avatarFrames.json').read_text())
    template=json.loads((ROOT/'docs/art/aquatic_rig_template_v1.json').read_text())
    profiles={};audit=[]
    for family in FAMILIES:
        for form in range(1,5):
            if family=='adaptable' and form==3:
                bodies={diet:{'key':f'aqAdaptable-{diet}HD','file':f'aquatic_adaptable_{diet}_motion_v1.png','rects':legacy['bodies'][diet],'offsets':legacy['offsets'][diet]} for diet in DIETS}
                rig=copy.deepcopy(template);rig['forms']={'3':{'label':'Mature adaptable','artStatus':'authored'}}
            else:
                version=2 if family=='adaptable' and form==2 else 1
                group={diet:measure(ART/f'aquatic_{family}_f{form}_{diet}_motion_v{version}.png') for diet in DIETS};align(group)
                bodies={};tails={};spines={}
                for diet,(a,items) in group.items():
                    bodies[diet]={'key':f'aqBody-{family}-f{form}-{diet}HD','file':f'aquatic_{family}_f{form}_{diet}_motion_v{version}.png',
                                  'rects':[item['rect'] for item in items],'offsets':[item['offset'] for item in items]}
                    tails[diet],spines[diet]=tail_and_spines(a,items)
                    audit.append({'family':family,'form':form,'diet':diet,'frames':len(items),'size':[a.shape[1],a.shape[0]]})
                rig=provisional_rig(template,family,form,group,tails,spines)
            profiles[f'{family}:{form}']={'family':family,'form':form,'label':f'{family.capitalize()} · form {form}',
                'bodies':bodies,'rig':rig,'attachmentStatus':'provisional'}
    (ROOT/'src/game/aquatic/evolutionBodies.json').write_text(json.dumps({'version':1,'profiles':profiles},indent=2)+'\n',newline='\n')
    (ROOT/'docs/art/AQUATIC_EVOLUTION_FRAME_AUDIT.json').write_text(json.dumps(audit,indent=2)+'\n',newline='\n')
    print(f'Measured {len(profiles)} maturation profiles / 36 diet sheets / 432 frames. Original PNGs unchanged.')

if __name__=='__main__':main()
