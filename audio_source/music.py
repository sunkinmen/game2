from dsp import *
import numpy as np
# ---- instruments (return mono arrays) ----
def flute(f,d,vol=1.0):
    n=int(SR*d); t=np.arange(n)/SR; vib=np.sin(2*np.pi*5.4*t)*np.clip((t-.12)/.2,0,1)*.012
    ph=np.cumsum(2*np.pi*f*(1+vib)/SR); x=np.sin(ph)+.28*np.sin(2*ph)+.1*np.sin(3*ph)
    br=bp(nz(d),f*1.5,f*5,1)*.12; e=np.minimum(1,t/.04)*np.minimum(1,(d-t)/.06)
    return (x+br)*e*vol
def suona(f,d,vol=1.0):
    n=int(SR*d); t=np.arange(n)/SR; vib=np.sin(2*np.pi*5.8*t)*np.clip((t-.08)/.15,0,1)*.018
    ph=np.cumsum(2*np.pi*f*(1+vib)/SR); x=2*((ph/(2*np.pi))%1)-1; x=np.tanh(x*1.6)
    x=bp(x,500,3200,1)*1.4+bp(x,1000,1300,2)*.8
    e=np.minimum(1,t/.02)*np.minimum(1,(d-t)/.05)*(1+.25*np.exp(-t/.06)); return x*e*vol*.7
def erhu(f,d,vol=1.0):
    n=int(SR*d); t=np.arange(n)/SR; vib=np.sin(2*np.pi*5.0*t)*np.clip((t-.1)/.25,0,1)*.014
    ph=np.cumsum(2*np.pi*f*(1+vib)/SR); x=2*((ph/(2*np.pi))%1)-1; x=lp(x,2600,2)+.5*bp(x,700,900,2)
    e=np.minimum(1,t/.06)*np.minimum(1,(d-t)/.08); return x*e*vol*.55
def synlead(f,d,vol=1.0):
    n=int(SR*d); t=np.arange(n)/SR; x=(saw(f*1.004,d)+saw(f*.996,d)+.5*sq(f,d,.4))/2.5
    x=lp(x,3600,2); e=np.minimum(1,t/.008)*np.exp(-t/(d*1.2))*np.minimum(1,(d-t)/.04); return x*e*vol*.8
LEADS={'triangle':flute,'square':suona,'sawtooth':erhu,'synth':synlead}
def bassn(f,d,vol=1.0):
    n=int(SR*d); t=np.arange(n)/SR; sw=saw(f,d); x=lp(sw,380,2)*.8+lp(sw,1800,2)*np.exp(-t/.08)*.7+np.sin(2*np.pi*f*t)*.9
    e=np.minimum(1,t/.006)*np.minimum(1,(d-t)/.03)*np.exp(-t/(d*1.6)); return np.tanh(x*1.2)*e*vol*.8
def padn(f,d,vol=1.0):
    n=int(SR*d); t=np.arange(n)/SR; x=sum(saw(f*(1+k*.0035),d) for k in (-2,-1,0,1,2))/5
    x=lp(x,1500,2); e=np.minimum(1,t/.35)*np.minimum(1,(d-t)/.5); return x*e*vol*.5
def kick(vol=1.0): d=.28; x=sweep(150,45,d)*env(int(d*SR),.001,.12,0,.01,4); x[:int(.004*SR)]+=hp(nz(.004),2000)[:int(.004*SR)]*.4; return x*vol
def snare(vol=1.0): d=.22; return pad(mix(bp(nz(d),1500,7500,1)*env(int(d*SR),.001,.08,0,.02,4)*.8,sine(190,d)*env(int(d*SR),.001,.05,0,0,6)*.6),int(d*SR))*vol
def hat(vol=1.0,open_=False): d=.22 if open_ else .05; return hp(nz(d),7000,2)*env(int(d*SR),.0005,d*.4,0,.01,5)*vol*.5
def taiko(vol=1.0,low=True):
    d=.55; f0,f1=(130,48) if low else (210,95); return pad(mix(sweep(f0,f1,d*.7)*env(int(d*SR*.7),.002,.3,0,.05,3),lp(nz(.06),1600)*env(int(.06*SR),.001,.02,0,0,5)*.5),int(d*SR))*vol
def gongn(vol=1.0):
    d=2.2; t=np.arange(int(SR*d))/SR
    x=sum(g*np.sin(2*np.pi*f*t)*np.exp(-t/tau) for f,g,tau in [(196,1,1.1),(293,.6,.9),(397,.45,.7),(520,.3,.5)]); return x*np.minimum(1,t/.004)*vol*.7
def clap(vol=1.0): d=.15; return bp(nz(d),900,3500,1)*env(int(d*SR),.002,.05,0,.03,4)*vol*.7
def block_wood(vol=1.0): d=.08; return sine(1100,d)*env(int(d*SR),.0005,.03,0,0,5)*vol*.4
def place(buf, sig, t, g=1.0, pan=0.0):
    i=int(t*SR); 
    if i>=buf.shape[1]: return
    j=min(buf.shape[1], i+len(sig)); seg=sig[:j-i]
    buf[0,i:j]+=seg*g*(1-max(0,pan)); buf[1,i:j]+=seg*g*(1+min(0,pan))
def mid(m): return 440*2**((m-69)/12)
# ---- composition ----
class Cfg(dict): __getattr__=dict.get
def phrase_rhythms(r):
    T=[[1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,0,0],[1,0,1,0, 0,1,0,0, 1,0,1,0, 1,0,0,0],[1,0,0,0, 1,0,1,0, 0,0,1,0, 1,0,0,0],[1,0,1,1, 0,0,1,0, 1,0,0,0, 1,0,1,0]]
    return T[r.integers(len(T))]
def make_melody(cfg, rg):
    sc=cfg.sc; nsc=len(sc); bars=16; steps=bars*16; mel=[-99]*steps
    def pitch_of(idx): return cfg.root+sc[idx%nsc]+12*(idx//nsc)
    m1=phrase_rhythms(rg); m2=phrase_rhythms(rg)
    base=nsc*1+2  # start around an octave above root
    def build(rhythm, start, end_idx, density=1.0, up=0):
        out=[]; idx=start
        for s in range(32):  # two bars
            on=rhythm[s%16]
            if on and rg.random()<density:
                if s%4==0: idx=idx+int(rg.choice([-2,-1,0,1,2]))
                else: idx=idx+int(rg.choice([-1,0,1,1,-1,2]))
                idx=max(nsc, min(nsc*2+4, idx)); out.append(idx+up)
            else: out.append(-99)
        # cadence
        for k in range(31,-1,-1):
            if out[k]!=-99: out[k]=end_idx; break
        return out
    ph=[build(m1,base,base+1), build(m1,base+1,base), build(m2,base+2,base+3), build(m1,base,nsc)]
    # B section: higher and denser
    pb=[build(m2,base+3,base+4,1.0,2), build(m2,base+4,base+2,1.0,2), build(m1,base+2,base+3,1.0,2), build(m1,base+1,nsc,1.0,0)]
    for i,pp in enumerate(ph+pb):
        mel[i*32:(i+1)*32]=pp
    return mel
def render_track(name, cfg, seed):
    rg=np.random.default_rng(seed); bpm=cfg.bpm; spb=60/bpm/4; bars=16; body=bars*16*spb; tail=2.2
    N=int((body+tail)*SR); buf=np.zeros((2,N)); sc=cfg.sc; root=cfg.root; prog=cfg.prog; dr=cfg.dr
    mel=make_melody(cfg,rg); lead=LEADS[cfg.get('leadi') or cfg.lead]
    nsc=len(sc)
    def npitch(idx,off=0): return root+off+sc[idx%nsc]+12*(idx//nsc)
    for step in range(bars*16):
        b=step//16; s=step%16; off=prog[b%4]; t=step*spb+(spb*.07 if s&1 and cfg.swing else 0); sect=1 if b>=8 else 0
        # lead
        L=mel[step]
        if L!=-99:
            nxt=step+1; dur=spb
            while nxt<bars*16 and mel[nxt]==-99 and nxt-step<8: dur+=spb; nxt+=1
            place(buf,lead(mid(npitch(L,off)+12*cfg.get('lo',0)),min(dur*.92,2.0)),t,.46,.15)
        # bass
        bs=cfg.bass
        if bs=='eighth' and s%2==0: place(buf,bassn(mid(root+off-24+(12 if s%8==6 else 0)),spb*1.8),t,.34)
        elif bs=='rock' and (s%4==0 or s==10 or s==14): place(buf,bassn(mid(root+off-24+(7 if s in(10,14) else 0)),spb*(3.2 if s%4==0 else 1.6)),t,.34)
        elif bs=='quarter' and s%4==0: place(buf,bassn(mid(root+off-24),spb*3.4),t,.32)
        elif bs=='long' and s==0: place(buf,bassn(mid(root+off-24),spb*15.5),t,.32)
        # pad (once per bar)
        if cfg.padv and s==0:
            for k,iv in enumerate((0,sc[2],sc[4] if nsc>4 else 7)): place(buf,padn(mid(root+off-12+iv),spb*16.2),t,cfg.padv*.22,(-.4,0,.4)[k])
        # pluck arp
        if cfg.pluck:
            pat=cfg.pluckp
            if s in pat:
                ci=[0,2,4,2,1,3,4,3][pat.index(s)%8]; place(buf,pluck(mid(npitch(ci+nsc,off)+12*cfg.get('po',0)),1.1,.6)*np.minimum(1,np.arange(int(1.1*SR))/200),t,cfg.pluck*.34,-.3 if (pat.index(s)%2) else .3)
        # drums
        dvol=1.0 if sect else .85
        if dr=='four':
            if s%4==0: place(buf,kick(),t,.62*dvol)
            if s in(4,12): place(buf,snare(),t,.55*dvol); place(buf,clap(),t,.25)
            if s%2==0: place(buf,hat(1,s%8==6),t,.35*dvol,.2)
            if sect and s in(7,15): place(buf,hat(1,True),t,.25)
        elif dr=='rock':
            if s in(0,8,10) or (sect and s==6): place(buf,kick(),t,.62*dvol)
            if s in(4,12): place(buf,snare(),t,.65*dvol)
            if s%2==0: place(buf,hat(1,False),t,.32*dvol,.2)
        elif dr=='march':
            if s%8==0: place(buf,kick(),t,.85*dvol)
            if s in(4,12): place(buf,snare(),t,.5*dvol)
            if s%4==2: place(buf,block_wood(),t,.5,-.2)
            if sect and s%2==0: place(buf,hat(),t,.25,.2)
        else:  # sparse
            if s==0: place(buf,taiko(),t,.85*dvol)
            if s==8: place(buf,taiko(low=False),t,.55*dvol)
            if s==12 and sect: place(buf,snare(),t,.35)
            if s%4==2 and sect: place(buf,hat(),t,.22,.2)
        # chinese percussion accents
        if cfg.taiko and s==0 and b%4==0: place(buf,taiko(1.0),t,.7)
        if s==0 and b in(0,8): place(buf,gongn(),t,.5,.1)
        if b%8==7 and s>=12 and cfg.taiko and s%2==0: place(buf,taiko(1.0,low=(s<14)),t,.55)   # fill
    # reverb + master
    iL,iR=reverb_ir(1.8,.5+cfg.get('wet',0)*0,seed)
    wetL=fftconvolve(buf[0],iL)[:N]; wetR=fftconvolve(buf[1],iR)[:N]; w=cfg.get('wet',.18)
    out=np.stack([buf[0]*(1-w*.5)+wetL*w*2.2, buf[1]*(1-w*.5)+wetR*w*2.2])
    out=np.tanh(out*1.1)
    # gentle high-pass/low-pass
    out=np.stack([hp(out[0],35,1),hp(out[1],35,1)])
    rms=np.sqrt((out**2).mean()); out=out*(10**(-16.5/20)/rms); out=np.tanh(out/.95)*.95
    return out.astype(np.float32), body
