from pathlib import Path
import hashlib
import json
import sys

assets, out = map(Path, sys.argv[1:])
out.mkdir(parents=True, exist_ok=True)
backup = out / 'original-js'
backup.mkdir()

def change(file, replacements):
    asset = assets / file
    text = asset.read_text()
    edited = text
    for before, after in replacements:
        assert edited.count(before) == 1, (file, before)
        edited = edited.replace(before, after)
    original = asset.read_bytes()
    (backup / file).write_bytes(original)
    encoded = edited.encode()
    asset.write_bytes(encoded)
    return dict(file=file, originalSHA256=hashlib.sha256(original).hexdigest(),
                observedSHA256=hashlib.sha256(encoded).hexdigest(),
                observedBytes=len(encoded))

mark = '''(stage,extra={})=>console.info("[S4 vue stage] "+JSON.stringify({stage,pageMs:performance.now(),timeOrigin:performance.timeOrigin,...extra}))'''
renderer = 'demo-renderer.B7Ear75z.js'
client = 'previewer-client.BhKnQCQC.js'
runtime = 'vue-runtime.B814raYV.js'
vue_file = 'vue.runtime.esm-bundler.CyM3F5Ti.js'
adapter = 'index.BRlmFWB_.js'

observed = [
    change(renderer, [
        (f'It=ne(()=>G(()=>import("./{adapter}"),__vite__mapDeps([5,1,2])),oe.vueAdapter)',
         f'It=ne(async()=>{{({mark})("vue-adapter-import-begin");const module=await G(()=>import("./{adapter}"),__vite__mapDeps([5,1,2]));({mark})("vue-adapter-import-return");return module}},oe.vueAdapter)'),
        (f'Nt=ne(()=>G(()=>import("./{runtime}"),__vite__mapDeps([6,4,1])),oe.vueRuntime)',
         f'Nt=ne(async()=>{{({mark})("vue-wrapper-import-begin");const module=await G(()=>import("./{runtime}"),__vite__mapDeps([6,4,1]));({mark})("vue-wrapper-import-return");return module}},oe.vueRuntime)'),
        ('const[{createVueAdapter:w},v]=await tt(()=>O(e,t));',
         '''const vuePreview=r.closest('[data-demo-id="demo-base-accordion"][data-initial-runtime="vue"]');'''
         f'''if(vuePreview)({mark})("vue-owner-runtime-join-begin",{{owner:vuePreview.dataset.previewerId}});'''
         'const[{createVueAdapter:w},v]=await tt(()=>O(e,t));'
         f'''if(vuePreview)({mark})("vue-owner-runtime-join-return",{{owner:vuePreview.dataset.previewerId,hasRuntime:!!v,ownsLease:O(e,t)}});'''),
    ]),
    change(client, [
        ('h!=="demo-base-accordion"||i!=="react"||console.info("[S4 react stage] "+JSON.stringify({stage:q,',
         'h!=="demo-base-accordion"||(i!=="react"&&i!=="vue")||console.info("[S4 "+i+" stage] "+JSON.stringify({stage:i==="vue"?"vue-owner-"+q:q,')
    ]),
    change(runtime, [
        (f'd=l(()=>n(()=>import("./{vue_file}"),[]),_.vue)',
         f'd=l(async()=>{{({mark})("vue-import-begin");const module=await n(()=>{{({mark})("vue-native-import-dispatch");return import("./{vue_file}")}},[]);({mark})("vue-import-return");return module}},_.vue)')
    ])
]
(out/'asset-overlays.json').write_text(json.dumps(observed,indent=2)+'\n')
graph_path=out/'runtime-artifact-imports.json'
graph=json.loads(graph_path.read_text())
graph['targets'].extend(
    dict(label=label,url='/_astro/'+file,preloads=[]) for label,file in
    [('vue-runtime-wrapper',runtime),('vue-runtime',vue_file),('adapter-vue',adapter),
     ('demo-renderer',renderer),('previewer-client',client)]
)
graph_path.write_text(json.dumps(graph,indent=2)+'\n')
