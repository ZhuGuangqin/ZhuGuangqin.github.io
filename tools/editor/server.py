#!/usr/bin/env python3
"""学术主页 · 本地内容编辑器

浏览器里管理站点内容：
  · 论文 / 著作 / 专利 / 学术会议 / 教学 / 科研项目 —— 显示隐藏、改字、删除
  · 首页与简历页 —— 逐板块编辑正文、增删板块
  · 侧栏与站点信息 —— 姓名、简介、邮箱、站点标题等

设计要点：
  * 只用 Python 标准库 + PyYAML
  * 只监听 127.0.0.1
  * "隐藏" 用 Jekyll 原生的 published: false，可逆，不删文件
  * 改 _config.yml 用逐行替换，保留原有注释与排版

启动：  python3 server.py
"""

import io
import json
import os
import re
import subprocess
import sys
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

try:
    import yaml
except ImportError:
    sys.exit(
        "缺少 PyYAML。请改用系统自带的解释器启动：\n"
        "    /usr/bin/python3 tools/editor/server.py"
    )

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(os.path.dirname(HERE))
PORT = int(os.environ.get("EDITOR_PORT", "8777"))

# (目录, category 过滤值或 None, 显示名, 简称)
SECTIONS = [
    ("_publications", "manuscripts", "论文", "期刊论文"),
    ("_publications", "books",       "著作与教材", "著作"),
    ("_publications", "patents",     "专利", "专利"),
    ("_talks",        None,          "学术会议", "会议"),
    ("_teaching",     None,          "教学", "教学"),
    ("_portfolio",    None,          "科研项目", "项目"),
]
EDITABLE_DIRS = {d for d, _, _, _ in SECTIONS}

# 可整页编辑的 Markdown 页面
PAGES = [("_pages/about.md", "首页"), ("_pages/cv.md", "简历页")]
PAGE_PATHS = {p for p, _ in PAGES}

CONFIG = "_config.yml"
CONFIG_FIELDS = [
    ("title",          "站点标题（浏览器标签与左上角）", "站点"),
    ("title_en",       "站点标题 · 英文",               "站点"),
    ("description",    "站点描述（搜索结果摘要）",       "站点"),
    ("author.name",    "侧栏姓名",                      "侧栏"),
    ("author.name_en", "侧栏姓名 · 英文",               "侧栏"),
    ("author.bio",     "侧栏简介",                      "侧栏"),
    ("author.bio_en",  "侧栏简介 · 英文",               "侧栏"),
    ("author.location", "所在地",                       "侧栏"),
    ("author.location_en", "所在地 · 英文",             "侧栏"),
    ("author.employer", "单位",                         "侧栏"),
    ("author.employer_en", "单位 · 英文",               "侧栏"),
    ("author.email",   "邮箱",                          "侧栏"),
    ("author.github",  "GitHub 用户名",                 "侧栏"),
]


# ==========================================================================
# 路径校验
# ==========================================================================
def safe_path(rel):
    rel = (rel or "").replace("\\", "/").lstrip("/")
    if ".." in rel:
        raise ValueError("不允许的路径：%s" % rel)
    top = rel.split("/", 1)[0]
    ok = (top in EDITABLE_DIRS and rel.endswith(".md")) or rel in PAGE_PATHS
    if not ok:
        raise ValueError("不允许的路径：%s" % rel)
    full = os.path.realpath(os.path.join(SITE, rel))
    if not full.startswith(os.path.realpath(SITE) + os.sep):
        raise ValueError("路径越界：%s" % rel)
    if not os.path.isfile(full):
        raise ValueError("文件不存在：%s" % rel)
    return full


# ==========================================================================
# 集合条目（论文 / 会议 / 教学 / 项目）
# ==========================================================================
def read_doc(path):
    raw = io.open(path, encoding="utf-8").read()
    if not raw.startswith("---"):
        return {}, raw
    parts = raw.split("---", 2)
    meta = yaml.safe_load(parts[1]) or {}
    body = parts[2].lstrip("\n") if len(parts) > 2 else ""
    return meta, body


def write_doc(path, meta, body):
    fm = yaml.safe_dump(meta, allow_unicode=True, sort_keys=False,
                        default_flow_style=False, width=4096)
    io.open(path, "w", encoding="utf-8").write("---\n" + fm + "---\n\n" + body)


def item_of(rel, meta):
    return {
        "path": rel,
        "title": str(meta.get("title", "")),
        "title_en": str(meta.get("title_en", "")),
        "venue": str(meta.get("venue", "")),
        "venue_en": str(meta.get("venue_en", "")),
        "type": str(meta.get("type", "")),
        "date": str(meta.get("date", ""))[:10],
        "hidden": meta.get("published") is False,
        "has_pdf": bool(meta.get("paperurl")),
    }


def collect():
    out = []
    for directory, category, label, kind in SECTIONS:
        items = []
        d = os.path.join(SITE, directory)
        if os.path.isdir(d):
            for name in sorted(os.listdir(d)):
                if not name.endswith(".md"):
                    continue
                rel = "%s/%s" % (directory, name)
                meta, _ = read_doc(os.path.join(SITE, rel))
                if category is not None and meta.get("category") != category:
                    continue
                if category is None and meta.get("category") == "patents":
                    continue
                items.append(item_of(rel, meta))
            items.sort(key=lambda x: x["date"], reverse=True)
        out.append({"dir": directory, "label": label, "kind": kind, "items": items})
    return out


# ==========================================================================
# 页面（首页 / 简历页）：按 "## 标题" 切成板块
# ==========================================================================
SETEXT_RE = re.compile(r"^([=\-])\1{2,}\s*$")


def parse_blocks(path):
    """把页面切成板块。两种标题写法都认：
         ATX     ——  ## 标题
         Setext  ——  标题 + 下一行是 ==== 或 ----
    """
    raw = io.open(path, encoding="utf-8").read()
    if raw.startswith("---"):
        parts = raw.split("---", 2)
        front = "---" + parts[1] + "---\n"
        body = parts[2] if len(parts) > 2 else ""
    else:
        front, body = "", raw

    lines = body.splitlines()
    raw_blocks = []
    cur = {"heading": None, "hstyle": None, "lines": []}
    i = 0
    while i < len(lines):
        line = lines[i]
        nxt = lines[i + 1] if i + 1 < len(lines) else ""

        if line.startswith("## ") and not line.startswith("### "):
            raw_blocks.append(cur)
            cur = {"heading": line[3:].strip(), "hstyle": "##", "lines": []}
            i += 1
            continue

        m = SETEXT_RE.match(nxt)
        if line.strip() and m:
            raw_blocks.append(cur)
            cur = {"heading": line.strip(), "hstyle": m.group(1), "lines": []}
            i += 2
            continue

        cur["lines"].append(line)
        i += 1
    raw_blocks.append(cur)

    out = []
    for i, b in enumerate(raw_blocks):
        text = "\n".join(b["lines"]).strip()
        if b["heading"] is None and not text:
            continue
        out.append({
            "index": i,
            "heading": b["heading"],
            "hstyle": b["hstyle"],
            "text": text,
            # 含 Liquid 标签的板块（简历页的自动列表）只读，避免改坏模板
            "locked": ("{%" in text) or ("{{" in text),
        })
    return front, out


def write_blocks(path, front, blocks):
    chunks = []
    for b in blocks:
        head = (b.get("heading") or "").strip()
        text = (b.get("text") or "").strip()
        if head:
            style = b.get("hstyle")
            if style in ("=", "-"):
                chunks.append(head)
                chunks.append(style * 6)
            else:
                chunks.append("## " + head)
            chunks.append("")
        if text:
            chunks.append(text)
            chunks.append("")
    body = "\n".join(chunks).rstrip()
    io.open(path, "w", encoding="utf-8").write(front + "\n" + body + "\n")


def load_pages():
    pages = []
    for rel, label in PAGES:
        full = os.path.join(SITE, rel)
        if not os.path.isfile(full):
            continue
        _, blocks = parse_blocks(full)
        pages.append({"path": rel, "label": label, "blocks": blocks})
    return pages


# ==========================================================================
# _config.yml：逐行替换，保留注释
# ==========================================================================
def _block_span(text, block):
    m = re.search(r"^%s:[ \t]*$" % re.escape(block), text, re.M)
    if not m:
        return None
    start = m.end()
    m2 = re.search(r"^\S", text[start:], re.M)
    return (start, start + m2.start() if m2 else len(text))


def _line_pattern(key, indented):
    lead = r"[ \t]+" if indented else r""
    return re.compile(r"^(%s%s[ \t]*:[ \t]*(?:&\w+[ \t]+)?)(.*)$" % (lead, re.escape(key)), re.M)


def load_config():
    text = io.open(os.path.join(SITE, CONFIG), encoding="utf-8").read()
    fields = []
    for key, label, group in CONFIG_FIELDS:
        if "." in key:
            blk, k = key.split(".", 1)
            span = _block_span(text, blk)
            seg, indented = (text[span[0]:span[1]], True) if span else ("", True)
        else:
            k, seg, indented = key, text, False
        m = _line_pattern(k, indented).search(seg)
        raw = (m.group(2) or "").strip() if m else ""
        raw = re.sub(r'^"(.*)"$', r"\1", raw)
        raw = re.sub(r"^'(.*)'$", r"\1", raw)
        fields.append({"key": key, "label": label, "group": group, "value": raw})
    return fields


def save_config(values):
    path = os.path.join(SITE, CONFIG)
    text = io.open(path, encoding="utf-8").read()
    changed = 0
    for key, value in (values or {}).items():
        entry = next((f for f in CONFIG_FIELDS if f[0] == key), None)
        if entry is None:
            continue
        q = '"%s"' % str(value).replace("\\", "\\\\").replace('"', '\\"')
        if "." in key:
            blk, k = key.split(".", 1)
            span = _block_span(text, blk)
            if not span:
                continue
            seg = text[span[0]:span[1]]
            new_seg, n = _line_pattern(k, True).subn(lambda m: m.group(1) + q, seg, count=1)
            text = text[:span[0]] + new_seg + text[span[1]:]
            changed += n
        else:
            text, n = _line_pattern(key, False).subn(lambda m: m.group(1) + q, text, count=1)
            changed += n
    io.open(path, "w", encoding="utf-8").write(text)
    return changed


# ==========================================================================
# git
# ==========================================================================
def git_env():
    env = dict(os.environ)
    env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:" + env.get("PATH", "")
    return env


def git(*args, timeout=300):
    p = subprocess.run(["git"] + list(args), cwd=SITE, env=git_env(),
                       stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout)
    return p.returncode, p.stdout.decode("utf-8", "replace").strip()


# ==========================================================================
# HTTP
# ==========================================================================
class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send_json(self, obj, code=200):
        payload = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def read_body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n).decode("utf-8")) if n else {}

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            html = io.open(os.path.join(HERE, "index.html"), encoding="utf-8").read().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(html)))
            self.end_headers()
            self.wfile.write(html)
            return
        if self.path == "/api/items":
            code, last = git("log", "-1", "--pretty=%h %s")
            _, dirty = git("status", "--porcelain")
            self.send_json({
                "sections": collect(),
                "pages": load_pages(),
                "config": load_config(),
                "site": SITE,
                "last_commit": last if code == 0 else "",
                "dirty": len([l for l in dirty.splitlines() if l.strip()]),
            })
            return
        self.send_json({"error": "not found"}, 404)

    def do_POST(self):
        try:
            body = self.read_body()
            if self.path == "/api/save":
                return self.api_save(body)
            if self.path == "/api/delete":
                return self.api_delete(body)
            if self.path == "/api/page":
                return self.api_page(body)
            if self.path == "/api/config":
                return self.api_config(body)
            if self.path == "/api/publish":
                return self.api_publish(body)
        except ValueError as exc:
            return self.send_json({"error": str(exc)}, 400)
        except Exception as exc:
            return self.send_json({"error": "%s: %s" % (type(exc).__name__, exc)}, 500)
        self.send_json({"error": "not found"}, 404)

    # ---- api ----
    def api_save(self, body):
        saved = 0
        for ch in body.get("changes") or []:
            full = safe_path(ch["path"])
            meta, text = read_doc(full)
            for key in ("title", "title_en", "venue", "venue_en", "date"):
                if key in ch and ch[key] is not None:
                    v = str(ch[key]).strip()
                    if v:
                        meta[key] = v
                    elif key in meta:
                        del meta[key]
            if "hidden" in ch:
                if ch["hidden"]:
                    meta["published"] = False
                else:
                    meta.pop("published", None)
            write_doc(full, meta, text)
            saved += 1
        return self.send_json({"ok": True, "saved": saved})

    def api_delete(self, body):
        os.remove(safe_path(body["path"]))
        return self.send_json({"ok": True})

    def api_page(self, body):
        rel = body["path"]
        if rel not in PAGE_PATHS:
            raise ValueError("不允许编辑该页面：%s" % rel)
        full = safe_path(rel)
        front, old = parse_blocks(full)
        locked = {b["index"]: b for b in old if b["locked"]}

        rebuilt, present = [], set()
        for b in body.get("blocks") or []:
            if b.get("locked"):
                idx = b.get("index")
                if idx in locked:
                    rebuilt.append(locked[idx])      # 原样放回，不信任前端传来的内容
                    present.add(idx)
                continue
            rebuilt.append({
                "heading": (b.get("heading") or "").strip(),
                "hstyle": b.get("hstyle") or "##",
                "text": b.get("text") or "",
            })
        # 前端漏传的只读板块补回末尾，保证模板逻辑不丢
        for idx, blk in locked.items():
            if idx not in present:
                rebuilt.append(blk)

        write_blocks(full, front, rebuilt)
        return self.send_json({"ok": True, "blocks": len(rebuilt)})

    def api_config(self, body):
        n = save_config(body.get("values") or {})
        return self.send_json({"ok": True, "changed": n})

    def api_publish(self, body):
        msg = (body.get("message") or "").strip() or "通过网页编辑器更新内容"
        code, out = git("add", "-A")
        if code != 0:
            return self.send_json({"error": "git add 失败：\n" + out}, 500)
        _, out = git("status", "--porcelain")
        if not out.strip():
            return self.send_json({"ok": True, "message": "没有需要发布的变化。"})
        code, out = git("commit", "-m", msg)
        if code != 0:
            return self.send_json({"error": "git commit 失败：\n" + out}, 500)
        code, out = git("push")
        if code != 0:
            return self.send_json({
                "error": "已保存并提交到本地，但**推送到 GitHub 失败**：\n\n" + out +
                         "\n\n常见原因与处理：\n"
                         "· 网络问题 —— 稍后再点一次「发布到网站」即可。\n"
                         "· 凭据未配置 —— 终端里运行一次  gh auth login  或  gh auth setup-git。\n"
                         "· 编辑器是被别的受限程序启动的 —— 关掉它，改为双击 "
                         "tools/editor/启动编辑器.command 重新启动后再发布。\n\n"
                         "你的修改已经存在电脑上，不会丢。"
            }, 500)
        return self.send_json({
            "ok": True,
            "message": "已推送。GitHub Pages 正在重新构建，约 1–2 分钟后访问\n"
                       "https://zhuguangqin.github.io 即可看到更新。\n\n" + out,
        })


def main():
    if not os.path.isdir(os.path.join(SITE, "_publications")):
        sys.exit("没找到站点目录，server.py 应位于 <站点>/tools/editor/ 下。")
    url = "http://127.0.0.1:%d/" % PORT
    print("学术主页 · 内容编辑器")
    print("=" * 58)
    print("站点目录: %s" % SITE)
    print("界面地址: %s" % url)
    print()
    print("按 Ctrl+C 停止。")
    print("=" * 58)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    try:
        webbrowser.open(url)
    except Exception:
        pass
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。")


if __name__ == "__main__":
    main()
