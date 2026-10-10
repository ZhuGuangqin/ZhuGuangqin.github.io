# 让主页在国内也能打开：域名 + EdgeOne Pages 部署指南

站点地址（现状）：<https://zhuguangqin.github.io>
仓库地址：<https://github.com/ZhuGuangqin/ZhuGuangqin.github.io>

---

## 一、为什么国内必须开 VPN

不是站点内容的问题，是 `*.github.io` 这个域名在境内本身就不可达，被三层机制叠着掐：

| 层面 | 表现 |
| --- | --- |
| DNS 污染 | 查询 `zhuguangqin.github.io` 常返回伪造 IP 或超时 |
| IP 段干扰 | GitHub Pages 走 Fastly，A 记录 `185.199.108.153 / .109.153 / .110.153 / .111.153` 被丢包、被 RST |
| SNI 阻断 | HTTPS 握手时域名是**明文**，命中关键字过滤就重置连接 |

第三层是关键：**所以改 hosts 文件通常没用**，很多人 IP 写对了照样打不开。

> ⚠️ **买域名再 CNAME 回 GitHub Pages 是不能解决问题的**：封的是 IP 段 + SNI 关键字，
> 解析出来还是那几个被干扰的 IP。必须把静态文件放到国内的平台/节点上。

**最终采用的结构**（两端都留，互不影响）：

```
本地或 GitHub 网页改内容
        │  git push
        ▼
GitHub 仓库（main）
        ├─► GitHub 原生 Jekyll 构建 ──► zhuguangqin.github.io   （国外访问、Google 收录）
        └─► GitHub Actions 构建 ─────► EdgeOne Pages ──► 你的域名（国内直连，无需备案）
```

已经写好的 workflow：`.github/workflows/deploy-edgeone.yml`

- 只在 `main` 推送时触发，也会**手动触发**（Actions 页面 → Run workflow）
- **不接管** GitHub Pages，它挂了也不影响 github.io 的更新
- 没配 `EDGEONE_API_TOKEN` 时自动跳过部署步骤，不会让仓库报红

---

## 二、你需要手动做的一次性配置

下面 7 步是网页操作，做完之后日常更新内容**不用再管**，照旧 `git push` 就行。

### 第 1 步：买一个域名

- 建议 `.com`（其次 `.cn`）。约 ¥30–80/年。
- 不建议 `.top` / `.xyz` 或免费二级域名：部分运营商有白名单机制，可能被单独墙掉。
- 在腾讯云 / 阿里云买最省事（DNS 解析和后续备案都在同一个控制台）。买完记得做**实名认证**，一般 1–2 天通过。

### 第 2 步：登录 EdgeOne Pages 控制台

<https://console.cloud.tencent.com/edgeone/makers>

用微信/QQ 注册腾讯云账号即可。免费版官方称长期可用（额度以控制台显示为准）。

### 第 3 步：新建项目（**这一步最关键，别跳过**）

点「新建项目」，**项目名填 `zhuguangqin-academic`**，然后选加速区域：

| 加速区域 | 要不要备案 | 选它吗 |
| --- | --- | --- |
| 中国大陆可用区 | **要**备案 | 暂时不选 |
| 全球可用区（含中国大陆） | **要**备案 | 暂时不选 |
| **全球可用区（不含中国大陆）** | **不要**备案 | ✅ **选这个** |

> ⚠️ 选「不含中国大陆」时，EdgeOne 送给你的**默认项目域名在大陆访问会返回 401**——
> 这是平台的内容合规限制，所以**必须绑自己的域名**（第 6 步）才能在国内打开。
> 依据：<https://edgeone.cloud.tencent.com/pages/document/175191784523485184>

### 第 4 步：生成 API Token

控制台 → Pages → **设置（Settings）→ API Token → 创建 Token**（直达链接 <https://console.cloud.tencent.com/edgeone/pages?tab=settings>）。

> ⚠️ Token 是**账户级权限**，只在创建时显示一次，请立刻复制保存。
> 它只能放进 GitHub 的 Secret，**绝不能写进仓库文件、不能发给任何人**。

### 第 5 步：把 Token 存进 GitHub 仓库

1. 打开 <https://github.com/ZhuGuangqin/ZhuGuangqin.github.io/settings/secrets/actions>
2. 点 **New repository secret**
3. Name 填 `EDGEONE_API_TOKEN`（必须一字不差），Secret 粘贴上一步的 Token
4. 点 **Add secret**

配好之后，往 `main` 推一次代码，去仓库 **Actions** 标签页看 `Build & Deploy to EdgeOne Pages` 是否变绿。

### 第 6 步：绑定你的域名

EdgeOne Pages 项目 → **域名管理 → 添加自定义域名**，填你要用的域名：

- 想用 `zhuguangqin.com` → 添加 `zhuguangqin.com`
- 想用 `www.zhuguangqin.com` → 添加 `www.zhuguangqin.com`
- 建议两个都加，其中一个做 301 跳转到另一个

然后按控制台给的提示，去域名 DNS 处加解析记录（通常是加一条 **CNAME** 指向 EdgeOne 给的地址；如果域名 NS 直接托管给 EdgeOne，它会自动配好）。

> 💡 「不含中国大陆」的加速区域添加自定义域名**不需要工信部备案**，直接在 DNS 加 CNAME 即可，证书由 EdgeOne 自动签发（几分钟到半小时）。

### 第 7 步：改一处配置（很重要，别忘）

打开 `_config.yml` 第 17 行，把 `url` 换成新域名：

```yaml
# 改之前
url                      : "https://zhuguangqin.github.io"
# 改之后（示例，换成你自己的域名）
url                      : "https://zhuguangqin.com"
```

**为什么必须改**：`url` 决定站点生成的 canonical 链接、sitemap 和分享卡片地址。
不改的话，搜索引擎会认为"正式版本"是打不开的 github.io，百度收录会失败，微信/微博里分享出去的卡片也会指向打不开的地址。

顺手把这两处的站点地址也改掉（可选，但建议）：

- `README.md` 第 6 行、第 16 行
- `_data/authors.yml` 第 7 行的 `uri`

---

## 三、改完之后怎么验证

| 要验证的 | 怎么做 | 期望结果 |
| --- | --- | --- |
| Actions 是否成功 | 仓库 Actions 标签页 | 两个 job 都打勾，最后一步显示部署成功 |
| 国外入口没被搞坏 | 访问 <https://zhuguangqin.github.io> | 照旧能打开 |
| 国内入口 | **关掉 VPN**，手机用 4G/5G 流量访问新域名 | 能打开，首页动效正常 |
| 多线路可用性 | <https://www.boce.com/> 或 <https://www.itdog.cn/> 输入新域名拨测 | 全国大部分省份绿色，平均响应 1 秒内 |
| PDF 能下载 | 打开「论文」页，点任意一篇的 PDF | 能下载（15 个 PDF 在 `files/`，会一起部署过去） |
| 证书 | 浏览器地址栏看小锁 | 有效证书，无警告 |

> 💡 拨测工具本身偶尔抽风，多测两个再下结论；个别地区（如泉州）历来特殊，一两个红点可以忽略。

**让国内搜得到**：新域名上线后，去 [百度搜索资源平台](https://ziyuan.baidu.com/) 添加站点、验证归属、提交 sitemap（`https://你的域名/sitemap.xml`）。这一步对学术主页被国内同行搜到很有用，`github.io` 在百度那边收录极差。

---

## 四、常见坑

| 现象 | 原因 / 处理 |
| --- | --- |
| 默认项目域名国内返回 **401** | 这是「不含中国大陆」加速区域的正常限制，绑了自定义域名就好了 |
| 自定义域名打不开、提示证书错误 | 证书还在签发，等 10–30 分钟；仍不行就在域名管理里点重新签发 |
| 部署报 `auth error` / token 无效 | Token 复制不全或已过期，去控制台重新生成再更新 Secret |
| Actions 里部署步骤显示"跳过部署" | `EDGEONE_API_TOKEN` 这个 Secret 名字拼错了，或没保存成功 |
| 构建报 `_site/index.html 缺失` | Jekyll 构建失败，往上翻日志看 `--trace` 的报错行 |
| 页面样式丢失 | 检查 `_config.yml` 的 `baseurl` 是否仍为 `""`（域名在根目录时必须是空） |
| 想同时用 GitHub Pages 的自定义域名 | **别做**。DNS 已经指向 EdgeOne，再在 GitHub Pages 里填同一个自定义域名会导致证书签发失败 |

---

## 五、想更快怎么办（可选，以后再说）

1. **备案后升级到国内节点**（最稳最快）：个人可以备案，免费，约 1–20 个工作日，需要域名在国内注册商实名 + 一台境内云资源。备案通过后把项目的加速区域切到「全球可用区（含中国大陆）」，国内延迟能降到 50 ms 左右。
2. **给论文 PDF 加 DOI**：把 `files/` 里的 PDF 传到 [Zenodo](https://zenodo.org/) 或 [Figshare](https://figshare.com/)，拿到 DOI 后替换论文页的下载链接。既多一条国内可访问的通道，也让每篇文章有一个可被正式引用的版本。
3. **加速 CI**：现在每次构建都要现场装 gem（约 1–3 分钟）。哪天嫌慢，可以在 workflow 里加 `actions/cache` 缓存 `vendor/bundle`。

---

## 六、出问题怎么退回去

整个改动是可逆的，任何一步都能单独撤销：

- **只停掉国内入口**：删除 `.github/workflows/deploy-edgeone.yml`（或在 Actions 页面点 Disable workflow），GitHub Pages 完全不受影响。
- **换回原状**：把 `_config.yml` 的 `url` 改回 `https://zhuguangqin.github.io`，DNS 记录删掉即可。
- **EdgeOne 侧**：控制台删除项目，不影响 GitHub 仓库和 github.io。
