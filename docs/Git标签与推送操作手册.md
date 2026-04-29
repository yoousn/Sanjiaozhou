# Git 版本标签 (Tag) 操作指南

## 1. 基础流程 (最常用)

| 步骤 | 命令 | 说明 |
| :--- | :--- | :--- |
| **打标签** | `git tag -a v1.0.7 -m "版本备注"` | 在本地给当前代码贴上版本号 |
| **推标签** | `git push origin v1.0.7` | 将该版本号同步到 GitHub 云端 |
| **推所有** | `git push origin --tags` | 一次性推送本地所有未上传的标签 |

## 2. 进阶管理 (改错与删除)

### 本地操作
- **查看所有标签**: `git tag`
- **查看某个标签详情**: `git show v1.0.7`
- **删除本地标签**: `git tag -d v1.0.7`

### 远程操作 (GitHub)
- **删除云端标签**: `git push origin --delete v1.0.7`

## 3. 常见问题 FAQ

### Q: 推送的是 ZIP 压缩包吗？
**A:** 不是。Git 推送的是代码的**版本数据**。当你推送到 GitHub 后，GitHub 会自动根据你的 Tag 生成对应的 ZIP 压缩包供他人下载，你不需要手动上传 ZIP。

### Q: 为什么我 Push 了代码，GitHub 的 Release 还是空的？
**A:** 因为 `git push` 默认只推代码流，不推标签。必须执行 `git push origin [标签名]`，GitHub 才会触发 Release/Tag 页面的更新。

### Q: 标签可以打在过去的代码上吗？
**A:** 可以。如果你忘了打标签，可以先用 `git log --oneline` 找到之前的提交 ID (比如 `f211f48`)，然后执行：
`git tag -a v1.0.6 f211f48 -m "补打旧版本"`