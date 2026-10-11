"""Flatten this mascot's uses and clips into vector paths for the native SVG baker.

Build-time only: Skia path operations preserve curves instead of tracing pixels.
Unsupported elements fail explicitly; this is not a general SVG renderer.
"""
import copy
import math
import re
import xml.etree.ElementTree as ET
from fontTools.misc.transform import Transform
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.svgLib.path import parse_path
import pathops

NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
def tag(name): return '{'+NS+'}'+name

def matrix(value=''):
    result = Transform()
    for name, text in re.findall(r'(\w+)\(([^)]*)\)', value):
        a = [float(v) for v in re.split(r'[ ,]+', text.strip())]
        if name == 'matrix': part = Transform(*a)
        elif name == 'translate': part = Transform().translate(a[0], a[1] if len(a)>1 else 0)
        elif name == 'scale': part = Transform().scale(a[0], a[1] if len(a)>1 else a[0])
        elif name == 'rotate':
            x,y = a[1:] if len(a)>1 else (0,0)
            part = Transform().translate(x,y).rotate(math.radians(a[0])).translate(-x,-y)
        else: raise ValueError('Unsupported brand transform: '+name)
        result = result.transform(part)
    return result

def geometry(node):
    a=node.attrib; name=node.tag.split('}')[-1]
    if name=='path': d=a.get('d','')
    elif name=='ellipse':
        x,y,rx,ry=[float(a.get(k,0)) for k in ('cx','cy','rx','ry')]
        d=f'M{x-rx} {y}A{rx} {ry} 0 1 0 {x+rx} {y}A{rx} {ry} 0 1 0 {x-rx} {y}Z'
    else: raise ValueError('Unsupported brand shape: '+name)
    p=pathops.Path()
    if d:parse_path(d,p.getPen())
    return p

def flatten(root, crop):
    ids={n.get('id'):n for n in root.iter() if n.get('id')}
    out=ET.Element(tag('svg'),{'viewBox':' '.join(map(str,crop)), 'width':str(crop[2]),'height':str(crop[3])})
    defs=ET.SubElement(out,tag('defs'))
    def dereference(node):
        if node.tag==tag('use'):
            target=copy.deepcopy(ids[node.get('href')[1:]])
            target.attrib.update({k:v for k,v in node.attrib.items() if k!='href'})
            return target
        return node
    def paint(value, opacity, trans, bounds):
        if not value.startswith('url('):return value,None
        grad=copy.deepcopy(ids[value[5:-1]])
        if grad.tag not in (tag('linearGradient'),tag('radialGradient')):raise ValueError('Unsupported gradient '+value)
        x1,y1,x2,y2=bounds
        units=Transform() if grad.get('gradientUnits')=='userSpaceOnUse' else Transform(x2-x1,0,0,y2-y1,x1,y1)
        gm=trans.transform(units).transform(matrix(grad.get('gradientTransform','')))
        grad.set('gradientUnits','userSpaceOnUse')
        grad.set('gradientTransform','matrix('+ ' '.join(map(str,gm))+')')
        if grad.tag==tag('radialGradient'):
            for k in ('cx','cy','r'):
                if k not in grad.attrib:grad.set(k,'.5')
        for stop in grad:
            stop.set('stop-opacity',str(float(stop.get('stop-opacity',1))*opacity))
        gid='paint-'+str(len(defs));grad.set('id',gid);defs.append(grad)
        return 'url(#'+gid+')',grad
    def walk(node, trans=Transform(), opacity=1, clips=(), inherited=None):
        node=dereference(node);a=node.attrib;name=node.tag.split('}')[-1]
        opacity*=float(a.get('opacity',1))
        if opacity < .001:return
        if name in ('defs','title','desc'):return
        trans=trans.transform(matrix(a.get('transform','')))
        style=dict(inherited or {})
        for k in ('fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','fill-opacity','stroke-opacity','fill-rule'):
            if k in a:style[k]=a[k]
        if a.get('clip-path'):
            clip=ids[a['clip-path'][5:-1]]
            assert len(clip)==1,'Expected one mascot clip shape'
            path=geometry(dereference(clip[0])).transform(*trans)
            clips=(*clips,path)
        if name in ('g','svg'):
            for child in node:walk(child,trans,opacity,clips,style)
            return
        path=geometry(node)
        if not len(path):return
        bounds=path.bounds
        for kind in ('fill','stroke'):
            color=style.get(kind,'black' if kind=='fill' else 'none')
            alpha=opacity*float(style.get(kind+'-opacity',1))
            if color=='none' or alpha<.001:continue
            painted=pathops.Path(path)
            if kind=='stroke':
                width=float(style.get('stroke-width',1))
                if width<=0:continue
                cap={'round':pathops.LineCap.ROUND_CAP,'butt':pathops.LineCap.BUTT_CAP,'square':pathops.LineCap.SQUARE_CAP}[style.get('stroke-linecap','butt')]
                join={'round':pathops.LineJoin.ROUND_JOIN,'miter':pathops.LineJoin.MITER_JOIN,'bevel':pathops.LineJoin.BEVEL_JOIN}[style.get('stroke-linejoin','miter')]
                painted.stroke(width,cap,join,4)
                painted.convertConicsToQuads(.01)
            painted=painted.transform(*trans)
            for clip in clips:painted=pathops.op(painted,clip,pathops.PathOp.INTERSECTION)
            if not len(painted):continue
            pen=SVGPathPen(None);painted.draw(pen)
            fill,gradient=paint(color,alpha,trans,bounds)
            attrs={'d':pen.getCommands(),'fill':fill}
            if gradient is None:attrs['opacity']=str(alpha)
            attrs['fill-rule']=style.get('fill-rule','nonzero')
            ET.SubElement(out,tag('path'),attrs)
    walk(root)
    return ET.tostring(out,encoding='unicode')
