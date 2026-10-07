#!/usr/bin/env python3
"""学术主页 · 本地内容编辑器

在浏览器里管理站点内容：显示/隐藏条目、改标题与来源、删除、一键发布。

设计要点：
  * 只用 Python 标准库 + PyYAML，不需要安装任何东西
  * 只监听 127.0.0.1，不对外网开放
  * "隐藏" 用 Jekyll 原生的 `published: false`，可逆，不删文件
  * 只能改动 _publications / _talks / _teaching / _portfolio 四个目录里的 .md

启动：  python3 server.py          （然后浏览器打开它打印的地址）
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
        "缺少 PyYAML。请先运行：  /usr/bin/python3 -m pip install --user pyyaml\n"
        "或者直接用系统自带的 python3（它已包含 PyYAML）：/usr/bin/python3 server.py"
    )

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(os.path.dirname(HERE))          # 站点根目录
PORT = int(os.environ.get("EDITOR_PORT", "8777"))

# (目录, category 过滤值或 None, 显示名)  —— 顺序即界面顺序
SECTIONS = [
    ("_publications", "manuscripts", "论文", "期刊论文"),
    ("_publications", "books",       "著作与教材", "著作"),
    ("_publications", "patents",     "专利", "专利"),
    ("_talks",        None,          "学术会议", "会议"),
    ("_teaching",     None,          "教学", "教学"),
    ("_portfolio",    None,          "科研项目", "项目"),
]

EDITABLE_DIRS = {d for d, _, _, _ in SECTIONS}


# --------------------------------------------------------------------------
# 读写
# --------------------------------------------------------------------------
def read_doc(path):
    raw = io.open(path, encoding="utf-8").read()
    if not raw.startswith("---"):
        return {}, raw
    parts = raw.split("---", 2)
    meta = yaml.safe_load(parts[1]) or {}
    body = parts[2].lstrip("\n") if len(parts) > 2 else ""
    return meta, body


def write_doc(path, meta, body):
    fm = yaml.safe_dump(
        meta, allow_unicode=True, sort_keys=False, default_flow_style=False, width=4096
    )
    io.open(path, "w", encoding="utf-8").write("---\n" + fm + "---\n\n" + body)


def safe_path(rel):
    """把相对路径解析成站点内 .md 文件的绝对路径，越界就拒绝。"""
    rel = (rel or "").replace("\\", "/").lstrip("/")
    top = rel.split("/", 1)[0]
    if top not in EDITABLE_DIRS or not rel.endswith(".md") or ".." in rel:
        raise ValueError("不允许的路径：%s" % rel)
    full = os.path.realpath(os.path.join(SITE, rel))
    if not full.startswith(os.path.realpath(SITE) + os.sep):
        raise ValueError("路径越界：%s" % rel)
    if not os.path.isfile(full):
        raise ValueError("文件不存在：%s" % rel)
    return full


def item_of(rel, meta):
    """把一个文档整理成界面需要的字段。"""
    return {
        "path": rel,
        "title": str(meta.get("title", "")),
        "venue": str(meta.get("venue", "")),
        "type": str(meta.get("type", "")),
        "date": str(meta.get("date", ""))[:10],
        "citation": str(meta.get("citation", "")),
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


# --------------------------------------------------------------------------
# git
# --------------------------------------------------------------------------
def git_env():
    env = dict(os.environ)
    env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:" + env.get("PATH", "")
    return env


def git(*args, timeout=120):
    p = subprocess.run(
        ["git"] + list(args), cwd=SITE, env=git_env(),
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout,
    )
    return p.returncode, p.stdout.decode("utf-8", "replace").strip()


# --------------------------------------------------------------------------
# HTTP
# --------------------------------------------------------------------------
class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):          # 安静点
        pass

    # --- helpers ---
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

    # --- routes ---
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
                "site": SITE,
                "last_commit": last if code == 0 else "",
                "dirty": len([l for l in dirty.splitlines() if l.strip()]),
            })
            return
        self.send_json({"error": "not found"}, 404)

    def do_POST(self):
        try:
            body = self.read_body()
        except Exception as exc:
            return self.send_json({"error": "请求体解析失败：%s" % exc}, 400)

        try:
            if self.path == "/api/save":
                return self.api_save(body)
            if self.path == "/api/delete":
                return self.api_delete(body)
            if self.path == "/api/publish":
                return self.api_publish(body)
        except ValueError as exc:
            return self.send_json({"error": str(exc)}, 400)
        except Exception as exc:
            return self.send_json({"error": "%s: %s" % (type(exc).__name__, exc)}, 500)
        self.send_json({"error": "not found"}, 404)

    # --- api ---
    def api_save(self, body):
        """批量保存：{changes:[{path, title?, venue?, date?, hidden?}]}"""
        saved = 0
        for ch in body.get("changes") or []:
            full = safe_path(ch["path"])
            meta, text = read_doc(full)
            for key in ("title", "venue", "date"):
                if key in ch and ch[key] is not None:
                    v = str(ch[key]).strip()
                    if key == "date" and v:
                        meta[key] = v          # 保持 YYYY-MM-DD 字符串，YAML 会写成日期
                    elif v:
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
        code, out = git("status", "--porcelain")
        return self.send_json({"ok": True, "saved": saved, "dirty": len(out.splitlines()) if code == 0 else 0})

    def api_delete(self, body):
        full = safe_path(body["path"])
        os.remove(full)
        return self.send_json({"ok": True, "deleted": body["path"]})

    def api_publish(self, body):
        msg = (body.get("message") or "").strip() or "通过网页编辑器更新内容"
        code, out = git("add", "-A")
        if code != 0:
            return self.send_json({"error": "git add 失败：\n" + out}, 500)
        code, out = git("status", "--porcelain")
        if not out.strip():
            return self.send_json({"ok": True, "message": "没有需要发布的变化。"})
        code, out = git("commit", "-m", msg)
        if code != 0:
            return self.send_json({"error": "git commit 失败：\n" + out}, 500)
        code, out = git("push", timeout=300)
        if code != 0:
            return self.send_json({
                "error": "已提交到本地，但推送到 GitHub 失败：\n" + out +
                         "\n\n（网络问题可以稍后再点一次「发布」）"
            }, 500)
        return self.send_json({
            "ok": True,
            "message": "已推送。GitHub Pages 正在重新构建，约 1–2 分钟后访问\n"
                       "https://zhuguangqin.github.io 即可看到更新。\n\n" + out,
        })


def main():
    if not os.path.isdir(os.path.join(SITE, "_publications")):
        sys.exit("没找到站点目录，server.py 应该放在 <站点>/tools/editor/ 下。")

    url = "http://127.0.0.1:%d/" % PORT
    print("学术主页 · 内容编辑器")
    print("=" * 56)
    print("站点目录: %s" % SITE)
    print("界面地址: %s" % url)
    print()
    print("按 Ctrl+C 停止。")
    print("=" * 56)

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
