"""Export the selected brand artwork, PS5 shell art, and vector intro frames."""
from pathlib import Path
import copy
import json
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from io import BytesIO
from PIL import Image
import resvg_py
from brand_svg import flatten,tag

APP=Path(__file__).resolve().parents[1]
ART=APP/'artwork/anyfin'
ASSETS=APP/'assets/brand'
SHELL=APP/'sce_sys'
for folder in (ASSETS,SHELL):folder.mkdir(parents=True,exist_ok=True)

def render(root,path,width,height,opaque=False):
    source=ET.tostring(root,encoding='unicode') if not isinstance(root,str) else root
    png=resvg_py.svg_to_bytes(svg_string=source,width=width,height=height,skip_system_fonts=True)
    image=Image.open(BytesIO(png))
    if opaque:image=image.convert('RGB')
    image.save(path)

# Match the held landing expression exactly, while keeping the approved body.
icon=ET.parse(ART/'icon.svg').getroot()
for n in list(icon.iter()):
    if n.tag==tag('ellipse') and n.get('cx') in ('395','614','402','619'):
        for parent in icon.iter():
            if n in list(parent):parent.remove(n);break
mouth=next(n for n in icon.iter() if n.tag==tag('path') and n.get('d','').startswith('M511 398'))
mouth.set('d','M502 398Q529 436 551 391')
body=next(n for n in icon if n.tag==tag('g'))
for cx,cy,rx,ry in [(373,399,23,10),(635,369,19,9)]:
    ET.SubElement(body,tag('ellipse'),dict(cx=str(cx),cy=str(cy),rx=str(rx),ry=str(ry),fill='#F299D0',opacity='.46',transform=f'rotate(-8 {cx} {cy})'))
for d in ['M371 360Q394 320 419 354','M596 332Q613 296 632 326']:
    ET.SubElement(body,tag('path'),{'d':d,'fill':'none','stroke':'#6338A4','stroke-width':'12','stroke-linecap':'round'})
ET.ElementTree(icon).write(ASSETS/'icon.svg',encoding='unicode')
render(icon,SHELL/'icon0.png',512,512,True)
render((ART/'splash.svg').read_text(),SHELL/'pic1.png',1920,1080,True)
render((ART/'splash.svg').read_text(),SHELL/'pic0.png',1920,1080,True)
render((ART/'wordmark.svg').read_text(),ASSETS/'wordmark.png',1120,376)

# Keep the full-screen backdrop and aura still; only the small foreground updates.
background=ET.parse(ART/'splash.svg').getroot()
for n in list(background):
    if n.tag==tag('g') and n.get('id')!='afterglow':background.remove(n)
    elif n.get('id')=='afterglow':
        for child in list(n):
            if child.get('fill')!='url(#aura)':n.remove(child)
render(background,ASSETS/'intro-background.png',1920,1080,True)

scene=ET.parse(ART/'scene.svg').getroot()
# Native radial gradients cannot stretch into an ellipse. Bake only this soft
# light at its 4K display size; the mascot itself remains animated vector art.
ground=ET.Element(tag('svg'),{'viewBox':'85 439 350 56','width':'700','height':'112'})
ground.append(copy.deepcopy(scene.find(tag('defs'))))
ground.append(copy.deepcopy(next(n for n in scene.iter() if n.get('id')=='ground-layer')))
render(ground,ASSETS/'intro-ground.png',700,112)
# Sources/timing live with the app; no reference to the art workspace at runtime.
program="import {poseAt} from './timeline.mjs';console.log(JSON.stringify(Array.from({length:241},(_,i)=>poseAt(i*1000/60))));"
poses=json.loads(subprocess.check_output(['node','--input-type=module','-e',program],cwd=ART,text=True))
with tempfile.TemporaryDirectory(prefix='anyfin-brand-') as temp:
    paths=[]
    ground_frames=[]
    for i,pose in enumerate(poses):
        light=pose['ground-layer']
        sx,sy=map(float,re.search(r'scale\(([^)]+)\)',light['transform']).group(1).split())
        ground_frames.append({'opacity':light['opacity'],'x':964-175*sx,'y':653-28*sy,'width':350*sx,'height':56*sy})
        root=copy.deepcopy(scene)
        nodes={n.get('id'):n for n in root.iter() if n.get('id')}
        for name,attrs in pose.items():
            for key,value in attrs.items():nodes[name].set(key,str(value))
        for child in list(root):
            if child.tag!=tag('defs') and child.get('id')!='afterglow':root.remove(child)
        parent=nodes['afterglow'];parent.remove(nodes['aura-layer'])
        parent.remove(nodes['ground-layer'])
        output=flatten(root,(520,70,900,730))
        path=Path(temp)/f'{i:03}.svg';path.write_text(output);paths.append(str(path))
    (Path(temp)/'ground.json').write_text(json.dumps(ground_frames))
    subprocess.run(['node',str(APP/'tools/bake-brand.mjs'),temp],check=True)
print('Exported happy icon, static shell art, wordmark and native vector intro.')
