import sys,os,json,subprocess,wave
sys.path.insert(0,'.')
from music import *
import sfx
import numpy as np, scipy.io.wavfile as wf
OUT='/mnt/user-data/outputs/Taipei_Fight/assets/audio'; os.makedirs(OUT,exist_ok=True)
TMP='/home/claude/work/audio/tmp'; os.makedirs(TMP,exist_ok=True)
A=[0,2,4,7,9]; M=[0,3,5,7,10]; H=[0,2,3,7,8]; P=[0,1,5,7,8]
TR={
 'menu':Cfg(bpm=96,root=57,sc=A,dr='sparse',lead='triangle',prog=[0,-3,-5,-2],bass='long',padv=1.0,pluck=.9,pluckp=[0,4,8,12],taiko=True,wet=.24),
 'sel': Cfg(bpm=112,root=55,sc=M,dr='rock',lead='square',prog=[0,0,-2,-4],bass='rock',padv=.5,pluck=.5,pluckp=[0,3,6,8,11,14],taiko=True,wet=.16),
 'st0': Cfg(bpm=128,root=60,sc=A,dr='four',lead='sawtooth',leadi='synth',prog=[0,-3,-5,-7],bass='eighth',padv=.5,pluck=.5,pluckp=[2,6,10,14],taiko=False,wet=.14,swing=True),
 'st1': Cfg(bpm=118,root=52,sc=[0,2,5,7,9],dr='march',lead='square',prog=[0,5,-2,3],bass='quarter',padv=.4,pluck=.7,pluckp=[0,2,4,6,8,10,12,14],taiko=True,wet=.15),
 'st2': Cfg(bpm=104,root=55,sc=M,dr='sparse',lead='triangle',prog=[0,-2,-4,-2],bass='long',padv=.9,pluck=.8,pluckp=[0,3,6,8,11,14],taiko=True,wet=.22),
 'st3': Cfg(bpm=124,root=59,sc=A,dr='four',lead='sawtooth',leadi='synth',prog=[0,-5,-3,-7],bass='eighth',padv=.5,pluck=.4,pluckp=[2,6,10,14],taiko=False,wet=.14,swing=True),
 'st4': Cfg(bpm=84,root=53,sc=A,dr='sparse',lead='triangle',prog=[0,-3,-7,-5],bass='long',padv=1.0,pluck=1.0,pluckp=[0,2,4,6,8,10,12,14],taiko=False,wet=.26),
 'st5': Cfg(bpm=90,root=57,sc=M,dr='sparse',lead='sawtooth',prog=[0,-4,-2,-5],bass='quarter',padv=.8,pluck=.7,pluckp=[0,4,8,12],taiko=True,wet=.22),
 'st6': Cfg(bpm=132,root=62,sc=H,dr='rock',lead='sawtooth',leadi='synth',prog=[0,0,-2,3],bass='rock',padv=.4,pluck=.4,pluckp=[0,3,6,8,11,14],taiko=True,wet=.14),
 'st7': Cfg(bpm=140,root=50,sc=P,dr='rock',lead='square',prog=[0,0,-4,-2],bass='eighth',padv=.6,pluck=.5,pluckp=[0,3,6,8,11,14],taiko=True,wet=.16),
}
def enc(wav,out,br,ch=None):
    cmd=['ffmpeg','-y','-loglevel','error','-i',wav,'-c:a','aac','-b:a',br]
    if ch: cmd+=['-ac',str(ch)]
    subprocess.check_call(cmd+[out])
    o2=out[:-4]+'.ogg'; c2=['ffmpeg','-y','-loglevel','error','-i',wav,'-c:a','libvorbis','-q:a','3']
    if ch: c2+=['-ac',str(ch)]
    subprocess.check_call(c2+[o2])
info={}
only=sys.argv[1:] 
for i,(name,cfg) in enumerate(TR.items()):
    if only and name not in only: continue
    o,body=render_track(name,cfg,11+i*7); w=f'{TMP}/{name}.wav'; wf.write(w,SR,(o.T*32767).astype('int16')); enc(w,f'{OUT}/{name}.m4a','88k')
    info[name]={'body':body,'bpm':cfg.bpm,'dur':o.shape[1]/SR}; print(name,round(body,2),os.path.getsize(f'{OUT}/{name}.m4a')//1024,'KB',flush=True)
if not only:
    # SFX sprite (mono 32k WAV, 16-bit) with 80ms gaps
    SR2=32000; from scipy.signal import resample_poly
    parts=[]; idx={}; pos=0.0
    for k,(f,n) in sfx.SFX.items():
        vs=[]
        for v in range(n):
            a=f(v); a=resample_poly(a,SR2,SR); a=np.concatenate([a,np.zeros(int(.04*SR2))]); fade=int(.004*SR2); a[-int(.04*SR2)-fade:-int(.04*SR2)]*=np.linspace(1,0,fade)
            idx_name=k if n==1 else f'{k}~{v}'; idx[idx_name]=[round(pos,4),round((len(a)-int(.04*SR2))/SR2,4)]; parts.append(a); pos+=len(a)/SR2
    allv=np.concatenate(parts)*.95; wf.write(f'{OUT}/sfx.wav',SR2,(np.clip(allv,-1,1)*32767).astype('int16'))
    json.dump({'sr':SR2,'clips':idx},open(f'{OUT}/sfx.json','w'),separators=(',',':'),ensure_ascii=False)
    print('sfx',len(idx),'clips',round(pos,1),'s',os.path.getsize(f'{OUT}/sfx.wav')//1024,'KB')
    # calibration file for decoder-delay measurement: silence then a click at exactly 1.0 s
    c=np.zeros(int(1.5*SR)); c[SR:SR+40]=.9; wf.write(f'{TMP}/cal.wav',SR,(c*32767).astype('int16')); enc(f'{TMP}/cal.wav',f'{OUT}/cal.m4a','64k',1)
    json.dump(info,open(f'{OUT}/music.json','w'))
