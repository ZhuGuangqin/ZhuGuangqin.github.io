# 祝广钦 · 学术主页

基于 [Academic Pages](https://github.com/academicpages/academicpages.github.io) 模板（Jekyll + GitHub Pages）制作，
已填入本人的教育背景、论文、著作、学术会议、教学与科研项目。

站点地址（配置好后）：<https://zhuguangqin.github.io>

---

## 一、发布到 GitHub Pages

已经配置好的字段（`_config.yml`）：

| 字段 | 值 |
| --- | --- |
| `url` | `https://zhuguangqin.github.io` |
| `baseurl` | `""`（空） |
| `repository` | `ZhuGuangqin/ZhuGuangqin.github.io` |
| `locale` | `zh-CN` |

发布步骤：

1. 在 GitHub 上新建一个仓库，**仓库名必须叫 `ZhuGuangqin.github.io`**（用户名 + `.github.io`）。
   只有用这个名字，网址才是 `https://zhuguangqin.github.io/`，`baseurl` 才能留空。
   > 如果你想起别的仓库名（例如 `academic-homepage`），那网址会变成
   > `https://zhuguangqin.github.io/academic-homepage/`，此时必须把 `baseurl` 改成 `"/academic-homepage"`。
2. 在本目录执行：

   ```bash
   git init
   git add .
   git commit -m "建立学术主页"
   git branch -M main
   git remote add origin https://github.com/ZhuGuangqin/ZhuGuangqin.github.io.git
   git push -u origin main
   ```

3. 到仓库 **Settings → Pages**，确认 Source 是 `Deploy from a branch`、分支 `main`、目录 `/ (root)`。
4. 等 1–3 分钟，访问 <https://zhuguangqin.github.io>。构建失败会在仓库的 **Actions** 标签页里报错。

---

## 二、上线前请替换 / 确认的东西

| 项目 | 位置 | 说明 |
| --- | --- | --- |
| **头像** | `images/profile.png` | 现在还是模板自带的占位图，请换成你的照片（正方形，建议 ≥ 400×400） |
| 会议日期 | `_talks/jiujie-*.md` 等 3 个文件 | 第九届系统科学大会、北京中医协会年会的**日期我没有**，front matter 里没写 `date`，页面上就不显示日期。知道后补一行 `date: 2025-11-01` 即可 |
| 学术主页链接 | `_config.yml` 的 `author:` 段 | Google Scholar / ORCID / ResearchGate 我留空了。有账号就填上 URL，图标会自动出现在左侧栏 |
| 论文全文 | `files/` | 目前是空目录。把 PDF 放进去，然后在对应论文里加 `paperurl: '/files/xxx.pdf'`，列表里就会出现「Download Paper」 |
| 博客 | `_posts/` | 只有一篇《本站建成》占位，可以删掉或替换成真内容 |

> **关于论文作者署名**：你给的清单里有 6 篇的作者列表显示为「等」，没有直接出现你的名字
> （《中医杂志》《中华中医药杂志》《中医药学报》《环球中医药》等）。我按你提供的原文照录，
> 没有改动作者顺序。如果其中某几篇你并非作者，请在 `_publications/` 里删掉对应文件。

---

## 三、日常怎么改内容

| 想改什么 | 改哪里 |
| --- | --- |
| 首页自我介绍、研究方向 | `_pages/about.md` |
| 顶部导航栏目 | `_data/navigation.yml` |
| 站点标题、侧栏简介、邮箱 | `_config.yml` |
| 加一篇论文 | 在 `_publications/` 新建 `年-月-日-短名.md`，照抄现有文件的 front matter |
| 加一次学术会议 | 在 `_talks/` 新建文件 |
| 加一个科研项目 | 在 `_portfolio/` 新建文件 |
| 加一门课 / 教改项目 | 在 `_teaching/` 新建文件 |
| 网页简历 | `_pages/cv.md`（论文/会议/教学三节会自动从上面几个目录生成，不用手写） |

论文的 `category` 决定它在「论文」页归到哪一组，可选值定义在 `_config.yml` 的
`publication_category`：`books`（著作与教材）、`manuscripts`（期刊论文）、`conferences`（会议论文）。

直接用 GitHub 网页也能改：打开文件 → 点铅笔图标 → 提交，站点会自动重新构建。

> 📖 **完整的新增/修改/删除操作手册见 [`docs/如何更新内容.md`](docs/如何更新内容.md)**
> —— 含每种内容的 front matter 模板、四条容易踩的坑、常见任务速查、出问题怎么回退。

---

## 四、本地预览（可选）

需要 Ruby ≥ 3.0。本机系统 Ruby 是 2.6.10，**装不了** Jekyll（`ffi` 等依赖要求 Ruby ≥ 3.0）。

装了 Homebrew 之后：

```bash
brew install ruby
echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
cd 学术主页
bundle install
bundle exec jekyll serve -l -H 127.0.0.1
```

然后打开 <http://127.0.0.1:4000>。改了 `_config.yml` 需要重启服务，改内容会自动刷新。

不装 Ruby 也完全没问题：GitHub Pages 在云端用 Ruby 3 构建，本地只是方便预览。

---

## 五、目录结构

```
学术主页/
├── _config.yml            # 站点总配置（标题、作者、配色、论文分组）
├── _data/navigation.yml   # 顶部导航
├── _pages/                # 首页、简历、以及各栏目的落地页
├── _publications/         # 23 条：16 篇期刊论文 + 7 部著作教材
├── _talks/                # 6 条：学术会议口头汇报与壁报
├── _teaching/             # 4 条：教改项目、志愿服务教学、教材编写
├── _portfolio/            # 8 条：科研项目
├── _posts/                # 博客
├── images/                # 头像与站点图标
├── files/                 # 放论文 PDF 等附件
└── Gemfile                # 本地预览用的依赖
```

模板原始说明见 `AGENTS.md`，模板主页 <https://academicpages.github.io>。
