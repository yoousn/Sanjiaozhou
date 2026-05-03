# 项目硬规则

## 项目目标
- 最终交付目标是可稳定运行并可持续部署的网站
- 本地开发地址固定为 `127.0.0.1:3000`
- 当前项目由 Express 与 Vite 共同启动，服务端入口为 [server.ts](../server.ts)

## 采集流程
当前主流程以自动采集为主，相关入口、模型配置和日志状态必须保持稳定可用。

## 采集链路绝对约束
1. 默认模型固定为 `openai/gpt-oss-120b`
2. 搜索阶段必须显示实时日志状态，禁止只有 loading
3. 采集时不能触发页面刷新或弹窗闪退
4. 同枪数据必须合并，单枪最多保留 5 条
5. `locked` 状态的配置不能被新采集覆盖
6. 全链路必须杜绝中文乱码
7. 确认加入网站阶段只允许直接提取已选视频数据，不允许重新触发搜索

## 配置与数据安全
- 运行态数据必须保留在服务器 `runtime/`，禁止发布代码时覆盖真实数据
- API Key、图床 Token、Cookie 等敏感信息必须使用环境变量或运行态文件，禁止写入代码和文档
- 正式版本更新说明只写入 [release-notes.md](release-notes.md)
- 版本规则见 [versioning.md](versioning.md)
- 部署规则见 [deployment.md](deployment.md)
- 性能优化方案见 [optimization-plan.md](optimization-plan.md)
