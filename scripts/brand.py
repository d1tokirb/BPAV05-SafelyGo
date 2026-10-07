"""Original SafelyGo shield and route mark; no third-party image assets."""
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]/'mobile/assets'
def mark(size,background,scale=.7):
    image=Image.new('RGBA',(size,size),background)
    d=ImageDraw.Draw(image)
    # Shield follows a campus journey, with the three nodes marking shared progress.
    k=size*scale; x=(size-k)/2; y=(size-k)/2
    def p(a,b):return(x+a*k,y+b*k)
    d.polygon([p(.12,.1),p(.5,0),p(.88,.1),p(.84,.56),p(.7,.78),p(.5,.96),p(.3,.78),p(.16,.56)],fill='#FFFFFF')
    d.line([p(.35,.28),p(.59,.28),p(.59,.48),p(.41,.48),p(.41,.68)],fill='#174CCB',width=max(2,int(k*.055)),joint='curve')
    for a,b in [(.35,.28),(.59,.48),(.41,.68)]:
        r=k*.058;cx,cy=p(a,b);d.ellipse((cx-r,cy-r,cx+r,cy+r),fill='#174CCB')
    return image
mark(1024,'#174CCB').save(root/'icon.png')
mark(1024,(0,0,0,0),.6).save(root/'adaptive-icon.png')
mark(512,'#174CCB').save(root/'splash-icon.png')
mark(64,'#174CCB').save(root/'favicon.png')
