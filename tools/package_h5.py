"""Create a byte-preserving TapTap H5 ZIP from this repository's runtime files."""
from pathlib import Path, PurePosixPath
from html.parser import HTMLParser
from datetime import datetime, timezone, timedelta
import argparse
import hashlib
import json
import re
import zipfile


ROOT = Path(__file__).resolve().parents[1]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def local_path(base, value):
    value = value.split('#', 1)[0].split('?', 1)[0]
    if not value or value.startswith('data:'):
        return None
    require(not re.match(r'^(?:[a-zA-Z][\w+.-]*:|/|\\)', value), f'Non-relative resource: {value}')
    require('\\' not in value, f'Use URL forward slashes: {value}')
    resolved = (base / value).resolve()
    require(resolved.is_relative_to(ROOT), f'Resource leaves the game folder: {value}')
    require(resolved.is_file(), f'Missing resource: {value}')
    cursor = ROOT
    for part in resolved.relative_to(ROOT).parts:
        require(part in {entry.name for entry in cursor.iterdir()}, f'Filename case mismatch: {value}')
        cursor /= part
    return resolved.relative_to(ROOT).as_posix()


class EntryParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.resources = []
        self.scripts = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        for key in ('src', 'href'):
            if key in attrs:
                path = local_path(ROOT, attrs[key])
                if path:
                    self.resources.append(path)
        if tag == 'script' and attrs.get('src'):
            self.scripts.append(attrs['src'])


def build(version, release_date):
    require(re.fullmatch(r'\d+\.\d+\.\d+', version), 'Version must be x.y.z, for example 0.1.0')
    require(re.fullmatch(r'\d{8}', release_date), 'Date must be YYYYMMDD')
    candidates = [ROOT / 'index.html']
    for folder in ('src', 'assets'):
        require((ROOT / folder).is_dir(), f'Missing folder: {folder}')
        candidates.extend(p for p in (ROOT / folder).rglob('*') if p.is_file())
    require(all(not p.is_symlink() for p in candidates), 'Runtime symlinks are not supported')
    files = {p.relative_to(ROOT).as_posix(): p.read_bytes() for p in sorted(candidates)}
    require('index.html' in files, 'Missing index.html')
    html = files['index.html'].decode('utf-8-sig')
    parser = EntryParser()
    parser.feed(html)
    require(parser.scripts and parser.scripts[-1] == 'src/game.js', 'Game initialization must load after its data modules')
    require('src/expanded-story.js' in parser.scripts, 'Expanded story module is missing')
    refs = set(parser.resources)
    for css in (ROOT / 'src').rglob('*.css'):
        for value in re.findall(r'url\(\s*[\'"]?([^\s)\'\"]+)', css.read_text(encoding='utf-8-sig')):
            path = local_path(css.parent, value)
            if path:
                refs.add(path)
    game = files['src/game.js'].decode('utf-8-sig')
    for value in re.findall(r'[\'"]([\w./-]+\.(?:png|jpg|jpeg|gif|svg|webp|mp3|ogg|wav|woff2?))[\'"]', game):
        refs.add(local_path(ROOT / 'assets', value))
    for name, data in files.items():
        if name.startswith('src/') and name.endswith('.js'):
            text = data.decode('utf-8-sig')
            require(not re.search(r'\b(?:fetch|WebSocket|XMLHttpRequest|EventSource)\s*\(', text), f'Unexpected network API in {name}')
            require(not re.search(r'[\'"][A-Za-z]:[\\/]', text), f'Absolute machine path in {name}')
    assets = files['src/assets.js'].decode('utf-8-sig')
    assets = json.JSONDecoder().raw_decode(assets.split('root.GameAssets=', 1)[1].lstrip())[0]
    for name, metadata in assets.items():
        path = local_path(ROOT / 'assets', name)
        refs.add(path)
        if metadata.get('sha256'):
            require(sha(files[path]) == metadata['sha256'], f'Original image metadata mismatch: {name}')
    require(all(path in files for path in refs), 'A referenced resource was omitted from the package')
    require('game.json' not in files, 'H5 packages must not be detected as Tap mini-games')
    output = ROOT / 'dist'
    output.mkdir(exist_ok=True)
    stem = f'jg-h5-v{version}-{release_date}'
    final = output / f'{stem}.zip'
    temporary = output / f'{stem}.zip.part'
    manifest_path = output / f'{stem}.manifest.json'
    require(not final.exists() and not temporary.exists() and not manifest_path.exists(), 'Release already exists; use a new version instead of overwriting it')
    with zipfile.ZipFile(temporary, 'x', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        archive.writestr('jg/', b'')
        for name, data in files.items():
            archive.writestr('jg/' + name, data)
    with zipfile.ZipFile(temporary) as archive:
        require(archive.testzip() is None, 'ZIP CRC validation failed')
        require({PurePosixPath(p).parts[0] for p in archive.namelist()} == {'jg'}, 'ZIP must contain a single ASCII top-level folder')
        require('jg/index.html' in archive.namelist(), 'Missing packaged entry')
        for name, data in files.items():
            require(archive.read('jg/' + name) == data, f'Packaged bytes differ: {name}')
            require((ROOT / name).read_bytes() == data, f'Source changed while packaging; rebuild with a new version: {name}')
    require(temporary.stat().st_size <= 300_000_000, 'H5 ZIP exceeds the 300 MB upload limit')
    temporary.rename(final)
    manifest = {
        'version': version,
        'date': release_date,
        'archive': final.name,
        'entry': 'jg/index.html',
        'sha256': sha(final.read_bytes()),
        'zipBytes': final.stat().st_size,
        'uncompressedBytes': sum(map(len, files.values())),
        'fileCount': len(files),
        'assetCount': sum(n.startswith('assets/') for n in files),
        'checkedResourceCount': len(refs),
        'preservedOriginalAssets': True,
        'files': [{'path': 'jg/' + name, 'bytes': len(data), 'sha256': sha(data)} for name, data in files.items()],
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: v for k, v in manifest.items() if k != 'files'}, ensure_ascii=False, indent=2))
    return final


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--version', required=True)
    parser.add_argument('--date', default=datetime.now(timezone(timedelta(hours=8))).strftime('%Y%m%d'))
    args = parser.parse_args()
    build(args.version, args.date)
