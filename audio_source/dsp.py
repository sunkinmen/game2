import numpy as np
from scipy.signal import lfilter, butter, sosfilt, fftconvolve
SR = 44100
rng = np.random.default_rng(7)
def t_(d): return np.arange(int(SR*d))/SR
def nz(d, r=None): return (r or rng).uniform(-1,1,int(SR*d))
def bp(x, lo, hi, order=2):
    lo=max(20,lo); hi=min(SR/2-100,hi)
    return sosfilt(butter(order,[lo,hi],'band',fs=SR,output='sos'),x)
def lp(x, f, order=2): return sosfilt(butter(order,min(f,SR/2-100),'low',fs=SR,output='sos'),x)
def hp(x, f, order=2): return sosfilt(butter(order,max(20,f),'high',fs=SR,output='sos'),x)
def env(n, a=.005, d=.1, s=0.0, r=0.0, curve=3.0):
    """a: attack sec, d: decay seconds to level s, r: release at end"""
    e=np.zeros(n); na=max(1,int(a*SR)); nd=int(d*SR); nr=int(r*SR)
    e[:min(na,n)]=np.linspace(0,1,min(na,n),endpoint=False)
    i=na
    if i<n:
        m=min(nd,n-i); e[i:i+m]=s+(1-s)*np.exp(-curve*np.arange(m)/max(1,nd)); i+=m
        if i<n: e[i:]=s*(1 if s>0 else 0)
    if nr>0 and nr<n: e[-nr:]*=np.linspace(1,0,nr)
    return e
def sweep(f0,f1,d,exp=True):
    n=int(SR*d); t=np.arange(n)/SR
    f=f0*(f1/f0)**(t/d) if exp else f0+(f1-f0)*t/d
    return np.sin(2*np.pi*np.cumsum(f)/SR)
def sine(f,d,ph=0): t=t_(d); return np.sin(2*np.pi*f*t+ph)
def saw(f,d):
    t=t_(d); return 2*((f*t)%1.0)-1
def sq(f,d,w=.5): t=t_(d); return np.where((f*t)%1.0<w,1.0,-1.0)
def fm_noise(x, drive=1.0): return np.tanh(x*drive)
def norm(x, peak=.9):
    m=np.max(np.abs(x))+1e-9; return x*(peak/m)
def pad(x,n): 
    if len(x)>=n: return x[:n]
    return np.concatenate([x,np.zeros(n-len(x))])
def mix(*xs):
    n=max(len(x) for x in xs); o=np.zeros(n)
    for x in xs: o[:len(x)]+=x
    return o
def delay_add(base, sig, t, g=1.0):
    i=int(t*SR); n=max(len(base), i+len(sig)); o=np.zeros(n); o[:len(base)]=base; o[i:i+len(sig)]+=sig*g; return o
def reverb_ir(sec=1.6, tau=.45, seed=3, bright=5000):
    r=np.random.default_rng(seed); n=int(SR*sec); t=np.arange(n)/SR
    L=lp(r.uniform(-1,1,n)*np.exp(-t/tau),bright); R=lp(r.uniform(-1,1,n)*np.exp(-t/tau),bright)
    L[:int(.012*SR)]*=np.linspace(0,1,int(.012*SR)); R[:int(.012*SR)]*=np.linspace(0,1,int(.012*SR))
    return L/np.sqrt(np.sum(L**2)), R/np.sqrt(np.sum(R**2))
def pluck(f, d, bright=.5, g=.996, seed=None):
    r=np.random.default_rng(seed if seed is not None else int(f*10)); N=int(round(SR/f)); n=int(SR*d)
    ex=np.zeros(n); b=r.uniform(-1,1,N); b=lp(b,max(800,f*8*bright+1500),1); ex[:N]=b*np.hanning(N*2)[N:][::-1]*0+b
    a=np.zeros(N+2); a[0]=1; a[N]=-g*.5; a[N+1]=-g*.5
    y=lfilter([1.0],a,ex); return y/(np.max(np.abs(y))+1e-9)
