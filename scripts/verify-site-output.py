"""Validate deployable Jekyll output without depending on either public host."""
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = []
        self.canonicals = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ("script", "img") and attrs.get("src"):
            self.assets.append(attrs["src"])
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.assets.append(attrs["href"])
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonicals.append(attrs["href"])


def verify(root):
    hosts = {"zhuguangqin.com", "www.zhuguangqin.com", "zhuguangqin.github.io"}
    for name in ("index.html", "publications/index.html", "cv/index.html",
                 "labs/index.html", "labs/demos/index.html"):
        page = Page()
        page.feed((root / name).read_text(encoding="utf-8"))
        assert page.canonicals == ["https://zhuguangqin.com/" + name.removesuffix("index.html")], name
        for asset in page.assets:
            url = urlsplit(asset)
            assert url.hostname not in hosts, f"{name}: asset depends on another entrance: {asset}"
            if asset.startswith("/") and not asset.startswith("//"):
                path = root / unquote(url.path).lstrip("/")
                assert path.is_file(), f"{name}: missing asset {asset}"
        print(f"Verified {name}: same-origin resources and canonical URL")
    files = [path for path in root.rglob("*") if path.is_file()]
    assert len(files) <= 20000, "EdgeOne file-count limit exceeded"
    assert all(path.stat().st_size <= 25 * 1024 * 1024 for path in files), "File exceeds 25 MiB"
    print(f"Ready to deploy: {len(files)} files")


if __name__ == "__main__":
    verify(Path(sys.argv[1] if len(sys.argv) > 1 else "_site"))
