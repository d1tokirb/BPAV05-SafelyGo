"""Create a source ZIP without credentials, dependencies or generated build output."""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[1]
out=root/'output/submission/SafelyGo-source.zip'
out.parent.mkdir(parents=True,exist_ok=True)
excluded={'.git','node_modules','.expo','.mail','dist','tmp','output','android','ios','.playwright-cli'}
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as archive:
    for p in sorted(root.rglob('*')):
        rel=p.relative_to(root)
        if not p.is_file() or excluded.intersection(rel.parts): continue
        if p.name.startswith('.env') and p.name!='.env.example': continue
        if p.name.endswith('.log') or p.name=='.DS_Store': continue
        archive.write(p,Path('SafelyGo')/rel)
print(out)
