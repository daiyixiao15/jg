"""Build lossless, tightly cropped inventory icons without changing source art."""
import json,re
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
game=(ROOT/'src/game.js').read_text(encoding='utf-8-sig')
block=re.search(r'const itemImages=\{([^}]+)\}',game)[1]
items=dict(re.findall(r"(\w+):'([^']+)'",block))
metadata=json.JSONDecoder().raw_decode((ROOT/'src/assets.js').read_text(encoding='utf-8-sig').split('root.GameAssets=',1)[1].lstrip())[0]
folder=ROOT/'assets/item-icons'
folder.mkdir(exist_ok=True)
original_bytes=0
for item,filename in items.items():
    source=ROOT/'assets'/filename
    image=Image.open(source).convert('RGBA')
    bounds=metadata.get(filename,{}).get('bounds') or image.getbbox()
    if bounds:image=image.crop(tuple(bounds))
    image.thumbnail((320,320),Image.Resampling.LANCZOS)
    image.save(folder/(item+'.webp'),format='WEBP',lossless=True,method=6)
    original_bytes+=source.stat().st_size
icon_bytes=sum(p.stat().st_size for p in folder.glob('*.webp'))
print(json.dumps({'count':len(items),'originalBytes':original_bytes,'iconBytes':icon_bytes,'reductionPercent':round((1-icon_bytes/original_bytes)*100,1)}))
