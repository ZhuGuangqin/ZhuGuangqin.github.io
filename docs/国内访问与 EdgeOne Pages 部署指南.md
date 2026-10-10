# 自定义域名与 EdgeOne 发布说明

主域名：<https://zhuguangqin.com>  
备用入口：<https://zhuguangqin.github.io>  
源码仓库：<https://github.com/ZhuGuangqin/ZhuGuangqin.github.io>

## 方案与边界

GitHub Pages 在不同运营商、地区和时段的可达性可能不同。本次没有进行足够的网络测量，不能把访问失败确定为某一种 DNS、IP 或 TLS 干扰，也不能承诺换域名即可解决。

本方案把生成后的网页另行部署到 EdgeOne，使用独立域名作为主入口。域名已经实名认证，但尚未取得 ICP 备案号，因此使用「全球可用区（不含中国大陆）」。它不使用中国大陆节点，国内访问仍受跨境网络质量影响，不能保证所有线路或固定延迟。

[EdgeOne 官方说明](https://edgeone.cloud.tencent.com/pages/document/175191784523485184)指出，该区域可绑定未备案的自定义域名；平台提供的默认项目域名在中国大陆访问存在限制。包含中国大陆的加速区域仍需要备案。

## 发布结构

```text
GitHub main
  ├─ GitHub Pages 原有构建 → zhuguangqin.github.io
  └─ GitHub Actions：Ruby / Jekyll 构建并检查 → EdgeOne → zhuguangqin.com
```

正式 EdgeOne 项目：`zhuguangqin-homepage`，直接上传类型，项目 ID `makers-bol4h3llzhaj`。

此前的 `zhuguangqin-academic` 是 Git 导入项目。其默认环境没有 Bundler，日志出现 `bundle: command not found`；不配置构建时发布的只是源码。官方 CLI 要求已有项目为直接上传类型，因此正式发布改用新项目。

页面资源与站内导航使用同源相对路径；canonical、sitemap、分享卡片使用 `https://zhuguangqin.com`。主入口故障时，GitHub Pages 的 CSS、脚本、图片与下载不会因此依赖主域名。

## 自动部署

实际配置以 [deploy-edgeone.yml](../.github/workflows/deploy-edgeone.yml) 为准，不在文档复制第二份易过期的脚本。

- `main` 推送和手动运行触发部署；同组新任务取消过期任务。
- Ruby 3.2、已提交的 `Gemfile.lock` 和 Bundler 缓存用于构建。
- 使用 `bundle exec jekyll build --safe --trace`，接近 GitHub Pages 的构建方式。
- `scripts/verify-site-output.py` 检查首页、论文、Know Me、实验室及试玩页的资源文件与 canonical，并检查文件数量和单文件大小。
- 固定 CLI `edgeone@1.6.41`，使用 `makers deploy`，通过 `EDGEONE_PAGES_API_REGION=china` 指向腾讯云中国站账号；`--area overseas` 选择不含中国大陆的区域。
- `--skip-ai-gateway-sync` 跳过与本站无关的 AI Gateway 配置。
- GitHub 仓库 Secret 名称为 `EDGEONE_API_TOKEN`。缺少凭据会明确失败，不会用绿色状态掩盖未部署。
- Token 只能保存在 Secret 中，不能提交到仓库或写入日志。账号 Token 的权限以创建时控制台显示为准。

## 域名与 HTTPS

在阿里云云解析管理 `zhuguangqin.com`。EdgeOne 域名归属验证使用 `edgeonereclaim` TXT 记录。自定义域名的 CNAME 必须使用该正式项目控制台给出的实际目标，不能把默认预览域名直接当作 CNAME。

如添加 `www`，必须先在 EdgeOne 单独绑定，再按控制台给出的目标解析；需要统一网址时可配置跳转。DNS 解析与 HTTPS 证书是两个独立步骤，均须检查生效状态。

## 日常更新与验收

照常修改文件并推送 `main`，在仓库 Actions 中检查构建和部署都成功。检查：

1. 主域名 HTTPS 正常，无证书警告。
2. 首页、论文、Know Me、实验室均能加载样式与脚本。
3. 论文 PDF 可以打开，实验室可以启动。
4. GitHub Pages 备用入口仍能独立加载资源。
5. 用关闭 VPN 的手机流量和家庭网络分别访问。控制台部署成功不等于已经验证各地网络可达性。

如果 Actions 提示 Token 过期，更新仓库 Secret 后重新运行。如果本机 Git 凭据不允许修改 workflow，可在 GitHub 网页编辑同一个文件，不必扩大本机凭据权限。

## 回退

暂停 EdgeOne workflow 可停止该平台更新，不影响 GitHub Pages。DNS 回退应指向已经验证可用的托管入口。无需删除项目或源码。若正式主域名更换，再同步调整 `_config.yml` 中的 `url` 和作者链接。
