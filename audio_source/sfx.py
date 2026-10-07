from dsp import *
def rr(v): return np.random.default_rng(100+v)
def thump(f0,f1,d,v=0,amp=1.0): return sweep(f0,f1,d)*env(int(SR*d),.002,d*.45,0,.01,4)*amp
def crack(d,lo,hi,v=0,amp=1.0,q=2): x=bp(nz(d,rr(v)),lo,hi,q); return x*env(len(x),.001,d*.35,0,.005,5)*amp
def hit_l(v=0):
    p=1+.06*(v-1); a=mix(crack(.09,1500*p,5200,v,.9),thump(230*p,95,.1,v,.75),hp(nz(.02,rr(v)),4000)*env(int(.02*SR),.0005,.01,0,0,5)*.4)
    return norm(pad(a,int(.14*SR)),.85)
def hit_m(v=0):
    p=1+.05*(v-1); a=mix(crack(.14,900*p,4200,v,.9),thump(180*p,55,.2,v,1.0),thump(520,140,.05,v,.3),lp(nz(.2,rr(v+3)),700)*env(int(.2*SR),.002,.06,0,.02,5)*.5)
    return norm(pad(a,int(.24*SR)),.9)
def hit_h(v=0):
    p=1+.04*(v-1); a=mix(crack(.22,500*p,3500,v,1.0),thump(120*p,32,.4,v,1.2),thump(300,70,.1,v,.5),lp(nz(.35,rr(v+5)),500)*env(int(.35*SR),.002,.12,0,.05,4)*.7)
    a=fm_noise(a*1.4,1.0); return norm(pad(a,int(.5*SR)),.95)
def block(v=0):
    p=1+.04*(v-1); n=int(.22*SR); t=np.arange(n)/SR; x=np.zeros(n)
    for f,g,tau in [(780,1,.07),(1230,.8,.05),(1810,.6,.04),(2490,.4,.03),(3350,.25,.02)]: x+=g*np.sin(2*np.pi*f*p*t)*np.exp(-t/tau)
    x=x*.4; x[:int(.05*SR)]+=crack(.05,2500,9000,v,.8); x+=pad(thump(160,80,.08,v,.4),n)
    return norm(x,.8)
def block_ex(v=0):
    b=block(v); x=pad(b,int(.35*SR))*1.0; t=t_(.35); x+= .45*(np.sin(2*np.pi*(1500+800*np.exp(-t*12))*t)*np.exp(-t/.12))
    return norm(x,.88)
def whoosh(v=0,big=False):
    d=.34 if big else .22; n=int(SR*d); t=np.arange(n)/SR; x=nz(d,rr(v)); k=t/d
    # sweep centre frequency by block filtering
    out=np.zeros(n); blocks=24; bl=n//blocks
    for i in range(blocks):
        c=(350 if big else 500)*( (3200 if big else 2600)/(350 if big else 500))**(i/blocks)
        seg=bp(x[i*bl:(i+1)*bl+bl//2 if i<blocks-1 else n],c*.6,c*1.6,2); out[i*bl:i*bl+len(seg)][:bl]+=seg[:bl]
    e=np.sin(np.pi*np.clip(k,0,1))**1.6; return norm(out*e,.6 if not big else .75)
def throw(v=0):
    w=pad(whoosh(v)*.6,int(.5*SR)); h=thump(150,45,.3,v,1.0)+pad(lp(nz(.2,rr(v)),800)*env(int(.2*SR),.002,.06,0,.02,4)*.8,int(.3*SR))
    return norm(mix(w,np.concatenate([np.zeros(int(.12*SR)),h])),.9)
def land(v=0):
    a=mix(thump(95,42,.16,v,1.0),lp(nz(.14,rr(v)),1100)*env(int(.14*SR),.003,.05,0,.02,4)*.6); return norm(pad(a,int(.2*SR)),.8)
def proj(v=0):
    d=.34; n=int(SR*d); t=np.arange(n)/SR; f=300*(1100/300)**(t/d); ph=np.cumsum(2*np.pi*f/SR)
    x=(np.sin(ph+2.2*np.sin(ph*.5))*.6+np.sin(ph*2)*.2)*np.sin(np.pi*np.clip(t/d,0,1))**.7
    x+=bp(nz(d,rr(v)),900,3500,2)*.25*np.sin(np.pi*np.clip(t/d,0,1)); return norm(x,.7)
def proj_hit(v=0):
    a=mix(crack(.16,600,5000,v,.9),thump(280,70,.2,v,.9)); t=t_(.3); a=pad(a,len(t))+.35*np.sin(2*np.pi*(1800+1200*np.exp(-t*20))*t)*np.exp(-t/.08)
    return norm(a,.85)
def gong(v=0):
    d=2.8; n=int(SR*d); t=np.arange(n)/SR; x=np.zeros(n)
    for f,g,tau in [(196,1,1.4),(293,.7,1.2),(397,.55,1.0),(520,.4,.8),(610,.3,.6),(843,.2,.45),(1130,.12,.3),(1580,.08,.2)]:
        x+=g*np.sin(2*np.pi*f*t+.3*np.sin(2*np.pi*f*.003*t))*np.exp(-t/tau)
    x[:int(.4*SR)]+=bp(nz(.4,rr(v)),1200,6000)*env(int(.4*SR),.001,.1,0,0,5)*.25
    x*=np.minimum(1,t/.004); return norm(x,.8)
def drum(v=0):
    d=.5; a=mix(thump(165,52,.35,v,1.0),lp(nz(.12,rr(v)),1400)*env(int(.12*SR),.001,.04,0,0,5)*.6,sine(95,d)*env(int(d*SR),.003,.2,0,.05,4)*.6)
    return norm(pad(a,int(d*SR)),.9)
def ko(v=0):
    h=hit_h(1); g=gong(0)[:int(2.2*SR)]; n=int(2.4*SR); t=np.arange(n)/SR
    f=700*(55/700)**np.clip(t/1.0,0,1); ph=np.cumsum(2*np.pi*f/SR); fall=lp(2*((ph/(2*np.pi))%1)-1,2400)*np.exp(-t/.5)*.35*(t<1.1)
    x=mix(pad(h,n),np.concatenate([np.zeros(int(.22*SR)),g])[:n]*.8,fall); return norm(x,.92)
def crowd(v=0):
    d=2.2; n=int(SR*d); t=np.arange(n)/SR; x=np.zeros(n)
    for i,(lo,hi,mod) in enumerate([(500,1400,3.1),(900,2600,4.3),(1500,3800,5.7),(300,900,2.3)]):
        y=bp(nz(d,rr(i+10)),lo,hi,2); x+=y*(.65+.35*np.sin(2*np.pi*mod*t+i))
    x*=np.minimum(1,t/.3)*np.minimum(1,(d-t)/.9)
    for k in range(14): # claps
        c=int(rr(k+30).uniform(.1,1.6)*SR); b=bp(nz(.03,rr(k+31)),1500,6000)*env(int(.03*SR),.0005,.01,0,0,5)
        x[c:c+len(b)]+=b*1.6
    return norm(x,.6)
def ult_go(v=0):
    d=.9; n=int(SR*d); t=np.arange(n)/SR; f=np.where(t<.6,110*(1500/110)**(t/.6),1500); ph=np.cumsum(2*np.pi*f/SR)
    r=lp(2*((ph/(2*np.pi))%1)-1,3500)*np.clip(t/.55,0,1)**1.6*(t<.62)*.5
    ns=bp(nz(d,rr(v)),300,6000,1)*np.clip(t/.55,0,1)**2*(t<.62)*.5
    boom=np.concatenate([np.zeros(int(.58*SR)),hit_h(2)]); g=np.concatenate([np.zeros(int(.6*SR)),gong(0)[:int(1.9*SR)]*.7])
    return norm(mix(r+ns,boom,g),.95)
def ex_go(v=0):
    d=.45; n=int(SR*d); t=np.arange(n)/SR; f=220*(1400/220)**np.clip(t/.25,0,1); ph=np.cumsum(2*np.pi*f/SR)
    x=lp(2*((ph/(2*np.pi))%1)-1,4000)*np.clip(t/.22,0,1)*np.exp(-np.clip(t-.25,0,9)/.06)*.45
    sp=bp(nz(d,rr(v)),700,6500,2)*np.clip(t/.22,0,1)**1.5*(t<.3)*.4
    ring=np.sin(2*np.pi*1320*t)*np.exp(-np.clip(t-.24,0,9)/.15)*(t>.24)*.4+np.sin(2*np.pi*1980*t)*np.exp(-np.clip(t-.24,0,9)/.1)*(t>.24)*.2
    return norm(x+sp+ring+pad(hit_m(1),n)*.5,.9)
def crush(v=0):
    h=hit_h(1); n=int(1.1*SR); glass=np.zeros(n)
    for k in range(18):
        f=rr(k+50).uniform(2200,7500); st=rr(k+80).uniform(0,.35); i=int(st*SR); tt=np.arange(n-i)/SR; glass[i:]+=np.sin(2*np.pi*f*tt)*np.exp(-tt/rr(k+60).uniform(.02,.09))*.12
    glass+=bp(nz(1.1,rr(2)),2500,9000,2)*env(n,.002,.25,0,.2,3)*.35
    sub=np.concatenate([np.zeros(int(.12*SR)),thump(95,28,.6,0,1.0)])
    return norm(mix(pad(h,n),glass,pad(sub,n)*.9),.95)
def counter(v=0):
    n=int(.4*SR); t=np.arange(n)/SR; x=np.zeros(n)
    for f,g in [(1320,1),(1760,.7),(2640,.5),(3520,.3)]: x+=g*np.sin(2*np.pi*f*t)*np.exp(-t/.14)
    x[:int(.04*SR)]+=crack(.04,3000,9000,v,1.0); x=x*.35+pad(hit_m(0),n)*.4; return norm(x,.88)
def blip(v=0): t=t_(.07); return norm((np.sin(2*np.pi*(900+500*t/.07)*t)+.3*np.sin(2*np.pi*1800*t))*env(len(t),.002,.03,0,.01,4),.5)
def ok(v=0):
    def n(f,d): t=t_(d); return (np.sin(2*np.pi*f*t)+.35*np.sin(2*np.pi*2*f*t))*env(len(t),.003,d*.5,0,.02,4)
    a=pad(n(660,.1),int(.28*SR)); b=np.concatenate([np.zeros(int(.07*SR)),n(990,.2)]); return norm(mix(a,b),.55)
def back(v=0): t=t_(.11); return norm(np.sin(2*np.pi*(520-180*t/.11)*t)*env(len(t),.002,.05,0,.01,4)+.25*np.sin(2*np.pi*(1040-360*t/.11)*t)*env(len(t),.002,.04,0,.01,4),.5)
def count(v=0): t=t_(.16); return norm((np.sin(2*np.pi*660*t)+.4*np.sin(2*np.pi*1320*t))*env(len(t),.003,.07,0,.03,4),.55)
def fight(v=0):
    def n(f,d,s): t=t_(d); return np.concatenate([np.zeros(int(s*SR)),(np.sin(2*np.pi*f*t)+.2*saw(f,d)+.3*np.sin(2*np.pi*2*f*t))*env(len(t),.004,d*.45,0,.04,3)])
    return norm(mix(n(880,.3,0),n(1320,.4,.1),pad(drum(0),int(.6*SR))*.9),.85)
def bell(v=0):
    d=1.2; t=t_(d); x=sum(g*np.sin(2*np.pi*f*t)*np.exp(-t/tau) for f,g,tau in [(1320,1,.5),(1980,.5,.35),(2640,.25,.25),(3380,.12,.15)]); return norm(x,.6)
def meter(v=0): t=t_(.22); f=600*(1500/600)**(t/.22); return norm(np.sin(np.cumsum(2*np.pi*f/SR))*env(len(t),.004,.1,0,.04,3)+.3*np.sin(np.cumsum(4*np.pi*f/SR))*env(len(t),.004,.08,0,.04,3),.55)
def jingle(v=0):
    notes=[523,659,784,1047,784,1047,1319]; out=np.zeros(int(1.4*SR))
    for i,f in enumerate(notes):
        d=.22 if i<6 else .6; t=t_(d); s=(np.sin(2*np.pi*f*t)+.4*sq(f,d,.5)*.5+.3*np.sin(2*np.pi*f*2*t))*env(len(t),.004,d*.5,0,.05,3)
        i0=int(i*.115*SR); out[i0:i0+len(s)]+=s*.5
    return norm(out,.6)
SFX={'hit_l':(hit_l,3),'hit_m':(hit_m,3),'hit_h':(hit_h,3),'block':(block,2),'block_ex':(block_ex,1),
 'whoosh':(lambda v:whoosh(v,False),3),'whoosh2':(lambda v:whoosh(v,True),2),'throw':(throw,1),'land':(land,2),'proj':(proj,2),'proj_hit':(proj_hit,2),
 'gong':(gong,1),'drum':(drum,2),'ko':(ko,1),'crowd':(crowd,1),'ult_go':(ult_go,1),'ex_go':(ex_go,1),'crush':(crush,1),'counter':(counter,1),
 'blip':(blip,1),'ok':(ok,1),'back':(back,1),'count':(count,1),'fight':(fight,1),'bell':(bell,1),'meter':(meter,1),'jingle':(jingle,1)}
