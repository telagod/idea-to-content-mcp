# idea-to-content-mcp

一个基于 Model Context Protocol 的内容工作流 MCP, 用于把「创作想法」拆解成适配不同社交平台的结构化内容方案。

工具本身不写死文案模板, 而是通过精心设计的中文提示词驱动大模型, 由大模型完成多轮思考和「专家团队式」讨论, MCP 只负责结构约束和结果校验。

## 功能概览

- 支持平台: 抖音(`douyin`)、B站(`bilibili`)、小红书(`xiaohongshu`)、YouTube Shorts(`youtubeShorts`)、快手(`kuaishou`)
- 输入: 平台 + 想法 + 目标 + 受众 (+ 可选风格)
- 输出: 结构化的内容工作流计划(`Plan`), 包含:
  - 项目卡片: 项目名、受众、痛点、可见结果、AI 角色
  - 平台指南: 建议时长、画面比例、风格要点、必备要素
  - 多条选题: 每条含脚本(钩子/中段要点/结尾引导) + 分镜

## 安装与构建

```bash
npm install
npm run build
```

> 提示: 需要 Node 18+ (内置 `fetch`), 并且依赖包会从网络安装。

## 运行 MCP 服务器

设置 OpenAI 相关环境变量:

```bash
export OPENAI_API_KEY=你的key
export OPENAI_MODEL=gpt-4.1-mini   # 可选, 默认 gpt-4.1-mini
```

启动 MCP 服务器:

```bash
npm start
```

在支持 MCP 的宿主中注册该服务器, 示例(伪代码):

```json
{
  "servers": {
    "idea-to-content-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/idea-to-content-mcp/dist/index.js"
      ],
      "env": {
        "OPENAI_API_KEY": "sk-xxx-your-key",
        "OPENAI_MODEL": "gpt-4.1-mini"
      }
    }
  }
}
```

宿主侧即可调用工具 `planContent`:

```json
{
  "tool": "planContent",
  "arguments": {
    "platform": "douyin",
    "idea": "用AI做PubMed文献自动采集工具",
    "goal": "让科研党查文献更快、整理更省心",
    "audience": "医学科研学生和医生",
    "style": "偏实战、带一点故事感"
  }
}
```

返回值为一个符合 `Plan` 类型的 JSON 对象, 可用于继续生成口播稿、标题、封面文案等。

## 类型与质量

- 使用 TypeScript + `zod` 约束工具输入/输出结构
- MCP 内部通过提示词驱动大模型模拟「平台策略 + 编导 + 数据分析 + 陪跑教练」专家团队, 在一次调用中完成多轮内部思考, 最终只输出结构化结果

## 注意事项

- 不要在仓库中提交任何真实的 API Key
- 默认使用 OpenAI 接口, 如需适配其他模型服务, 可以在 `src/index.ts` 中替换 `callModel` 实现
