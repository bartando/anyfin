// Compile prepared SVG paths with the framework's existing native vector baker.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const app=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const er=resolve(app,'../react-on-anything/.deps/embeddedReact/bridges/quickjs/js');
const {svgToVector}=await import(pathToFileURL(er+'/assets/bake-svg.mjs'));
const {VOP_SHAPE,VOP_MOVE,VOP_LINE,VOP_QUAD,VOP_CUBIC,PAINT_STRIDE}=await import(pathToFileURL(er+'/src/embedded-react/svg-ops.js'));
const widths={[VOP_SHAPE]:1,[VOP_MOVE]:2,[VOP_LINE]:2,[VOP_QUAD]:4,[VOP_CUBIC]:6};
const shapesOf=vec=>{
  const shapes=[];let shape;
  for(let i=0;i<vec.ops.length;){
    const op=vec.ops[i],n=1+(widths[op]??0);
    if(op===VOP_SHAPE){shape=[];shapes.push(shape);}
    shape.push(...vec.ops.slice(i,i+n));i+=n;
  }
  return shapes;
};
function layers(vec){
  const result=[];let layer;
  const start=()=>{layer={kind:'vector',ops:[],paints:[],gradients:[],width:vec.width,height:vec.height};result.push(layer);};
  start();
  for(const shape of shapesOf(vec)){
    const paint=vec.paints.slice(shape[1]*PAINT_STRIDE,(shape[1]+1)*PAINT_STRIDE);
    const count=Number(paint[7]>0)+Number(paint[8]>0);
    if(layer.ops.length+shape.length>1024||layer.paints.length/PAINT_STRIDE>=16||layer.gradients.length+count>8)start();
    if(shape.length>1024)throw Error('Brand shape exceeds the native vector tape limit');
    for(const at of [7,8])if(paint[at]){layer.gradients.push(vec.gradients[paint[at]-1]);paint[at]=layer.gradients.length;}
    layer.ops.push(VOP_SHAPE,layer.paints.length/PAINT_STRIDE,...shape.slice(2));layer.paints.push(...paint);
  }
  return result;
}
const groundFrames=JSON.parse(await readFile(resolve(process.argv[2],'ground.json'),'utf8'));
const unique=[],ground=[],frames=[],seen=new Map();
for(let i=0;i<=240;i++){
  const {dropped,...vec}=await svgToVector(await readFile(resolve(process.argv[2],String(i).padStart(3,'0')+'.svg'),'utf8'));
  if(dropped.length)throw Error('Unsupported native brand features: '+dropped.join(', '));
  const sources=layers(vec);
  const key=JSON.stringify({sources,ground:groundFrames[i]},(_,value)=>typeof value==='number'?Math.round(value*1000)/1000:value);
  if(!seen.has(key)){
    seen.set(key,unique.length);
    const pose=JSON.parse(key);unique.push(pose.sources);ground.push(pose.ground);
  }
  frames.push(seen.get(key));
}
const data={fps:60,duration:4000,box:{x:520,y:70,width:900,height:730},frames,sources:unique,ground};
await writeFile(resolve(app,'assets/brand/intro-frames.json'),JSON.stringify(data));
console.log(`${unique.length} distinct vector poses, ${Math.max(...unique.map(x=>x.length))} layers, ${(JSON.stringify(data).length/1024/1024).toFixed(2)} MiB`);
