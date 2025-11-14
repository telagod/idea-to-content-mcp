import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

type Platform = "douyin" | "bilibili" | "xiaohongshu" | "youtubeShorts" | "kuaishou";

type IdeaInput = {
  platform: Platform;
  idea: string;
  goal: string;
  audience: string;
  style?: string;
};

type Hook = {
  text: string;
  focus: string;
};

type StepPoint = {
  text: string;
  emphasis: string;
};

type Outro = {
  text: string;
  callToAction: string;
};

type Script = {
  hook: Hook;
  body: StepPoint[];
  outro: Outro;
};

type Shot = {
  order: number;
  type: "screen" | "talking" | "broll" | "text";
  description: string;
  approximateSeconds: number;
};

type Topic = {
  title: string;
  angle: string;
  script: Script;
  shots: Shot[];
};

type ProjectCard = {
  name: string;
  audience: string;
  pain: string;
  visibleResult: string;
  aiRole: string;
};

type PlatformGuide = {
  name: string;
  duration: string;
  ratio: string;
  styleTips: string[];
  mustHave: string[];
};

type Plan = {
  project: ProjectCard;
  platformGuide: PlatformGuide;
  topics: Topic[];
};

type ToolArgs = {
  platform?: Platform;
  idea: string;
  goal: string;
  audience: string;
  style?: string;
};

const schemaInput = z.object({
  platform: z.enum(["douyin", "bilibili", "xiaohongshu", "youtubeShorts", "kuaishou"]).default("douyin"),
  idea: z.string().min(5),
  goal: z.string().min(3),
  audience: z.string().min(2),
  style: z.string().optional()
});

const schemaOutput: z.ZodType<Plan> = z.object({
  project: z.object({
    name: z.string(),
    audience: z.string(),
    pain: z.string(),
    visibleResult: z.string(),
    aiRole: z.string()
  }),
  platformGuide: z.object({
    name: z.string(),
    duration: z.string(),
    ratio: z.string(),
    styleTips: z.array(z.string()),
    mustHave: z.array(z.string())
  }),
  topics: z.array(
    z.object({
      title: z.string(),
      angle: z.string(),
      script: z.object({
        hook: z.object({
          text: z.string(),
          focus: z.string()
        }),
        body: z.array(
          z.object({
            text: z.string(),
            emphasis: z.string()
          })
        ),
        outro: z.object({
          text: z.string(),
          callToAction: z.string()
        })
      }),
      shots: z.array(
        z.object({
          order: z.number(),
          type: z.enum(["screen", "talking", "broll", "text"]),
          description: z.string(),
          approximateSeconds: z.number()
        })
      )
    })
  )
});

const getPlatformHint = (p: Platform): string => {
  if (p === "douyin") {
    return "平台: 抖音。核心要求: 30-90秒竖屏, 前3秒给出强结果或强对比, 大字幕+快节奏, 强调效率提升、爽点和具体结果数字。";
  }

  if (p === "bilibili") {
    return "平台: B站。核心要求: 3-10分钟为主, 可以适度讲原理和踩坑故事, 需要有清晰结构和小结, 标题和封面突出項目名和结果。";
  }

  if (p === "xiaohongshu") {
    return "平台: 小红书。核心要求: 30-120秒竖屏短视频或图文, 标题偏「经验分享/避坑指南」, 强调步骤清单和可收藏性, 兼顾情绪表达。";
  }

  if (p === "youtubeShorts") {
    return "平台: YouTube Shorts。核心要求: 15-60秒极短竖屏, 1秒内给出视觉冲击或强信息, 结构极简, 只讲一个记忆点, 可以考虑中英文。";
  }

  return "平台: 快手。核心要求: 30-90秒竖屏, 语言口语化接地气, 多用真实场景录屏+人像, 强故事感, 少堆术语。";
};

const buildPrompt = (x: IdeaInput): string => {
  const hint = getPlatformHint(x.platform);
  const style = x.style ?? "未特别指定, 默认兼顾专业、易懂和适度情绪张力";

  const prompt =
    `你是一个由多名专家组成的社交平台内容团队, 团队成员包括:\n` +
    `- 平台策略专家: 深入理解抖音、B站、小红书、YouTube Shorts、快手等平台的推荐机制和用户行为。\n` +
    `- 内容总监/编导: 擅长把抽象想法拆解成选题、脚本和分镜。\n` +
    `- 数据分析师: 善于从历史经验和常见数据趋势中判断哪些内容更容易起量。\n` +
    `- 创作者陪跑教练: 关注创作者执行难度、可持续输出和账号长期成长。\n\n` +
    `你们需要协同工作, 帮助另一个大模型把一个创作想法拆解成「符合平台特点的内容工作流」, 直接产出可以执行的选题+脚本+分镜方案。\n\n` +
    `【思考方式要求】\n` +
    `1. 你们要在内部进行多轮思考和讨论, 先各自从自己的专业视角给出看法, 再收敛成统一方案。\n` +
    `2. 你们要主动识别目前信息中可能不够充分的地方, 在内部假设已经向创作者追问并得到合理补全后再做决策。\n` +
    `3. 所有思考过程和讨论过程都只在你们内部进行, 最终对外只给出一个结构化的 JSON 结果, 不要在输出中暴露推理过程或讨论内容。\n\n` +
    `【当前平台】\n` +
    `${hint}\n\n` +
    `【用户项目背景】\n` +
    `- 核心想法: ${x.idea}\n` +
    `- 内容目标: ${x.goal}\n` +
    `- 目标人群: ${x.audience}\n` +
    `- 风格偏好: ${style}\n\n` +
    `【你的任务】\n` +
    `你需要输出一个 JSON 对象, 结构必须严格符合下面的 TypeScript 类型 Plan:\n\n` +
    `type Plan = {\n` +
    `  project: {\n` +
    `    name: string;           // 项目名, 便于用户和观众一眼看懂\n` +
    `    audience: string;       // 目标受众, 尽可能具体\n` +
    `    pain: string;           // 该项目要解决的核心痛点, 用通俗中文描述\n` +
    `    visibleResult: string;  // 视频里可以「看到」的结果形式(界面/数字/对比等)\n` +
    `    aiRole: string;         // AI 在项目里的角色和价值, 用1-2句话说明\n` +
    `  };\n` +
    `  platformGuide: {\n` +
    `    name: string;           // 平台中文名\n` +
    `    duration: string;       // 建议单条内容时长区间\n` +
    `    ratio: string;          // 建议画面比例\n` +
    `    styleTips: string[];    // 3-6条风格建议, 针对当前平台\n` +
    `    mustHave: string[];     // 每条内容必须包含的要素\n` +
    `  };\n` +
    `  topics: {\n` +
    `    title: string;          // 这个选题的工作标题\n` +
    `    angle: string;          // 选题角度标记, 如: efficiency/experiment/story/tutorial\n` +
    `    script: {\n` +
    `      hook: { text: string; focus: string; };  // 开头钩子文案 + 钩子侧重点\n` +
    `      body: { text: string; emphasis: string; }[]; // 中段拆解要点, 每条一句话\n` +
    `      outro: { text: string; callToAction: string; }; // 结尾总结+行动号召\n` +
    `    };\n` +
    `    shots: {\n` +
    `      order: number;                // 镜头顺序\n` +
    `      type: "screen"|"talking"|"broll"|"text"; // 镜头类型\n` +
    `      description: string;          // 镜头画面要呈现的内容\n` +
    `      approximateSeconds: number;   // 推荐时长(整数秒)\n` +
    `    }[];\n` +
    `  }[];\n` +
    `};\n\n` +
    `【内容要求】\n` +
    `1. 所有文案必须用自然简体中文, 兼顾专业和易懂, 避免堆砌术语。\n` +
    `2. topics 至少输出 4 个, 且尽量覆盖以下4种角度:\n` +
    `   - 效率对比(efficiency): 强调「以前怎么做/现在怎么做」, 对比时间或步骤。\n` +
    `   - 实测结果(experiment): 描述真实使用或实测结果, 强调「我真用了」。\n` +
    `   - 故事设定(story): 讲这个想法从脑洞到成品的过程和故事感。\n` +
    `   - 三步教学(tutorial): 用最多三步把核心做法讲清楚, 降低尝试门槛。\n` +
    `3. 每个 hook.text 要适合在 3 秒内说完, 信息密度高、有记忆点。\n` +
    `4. body 数组中, 每个元素负责一个独立信息点, text 是讲给观众听的, emphasis 是写给创作者看的「强调点」说明。\n` +
    `5. outro 既要完成总结, 也要自然地引导观众做出一种行为(评论/关注/收藏/三连/订阅等), 要和当前平台习惯匹配。\n` +
    `6. shots 要形成一个完整的可执行分镜, 通常包含: 开头钩子 -> 问题/痛点 -> AI/工具过程 -> 结果展示 -> 结尾号召。\n` +
    `7. approximateSeconds 要结合当前平台的节奏, 确保总时长落在平台推荐区间内。\n` +
    `8. 请充分发挥「专家团队」的创造力和理解力, 不要机械套模板, 要根据项目特点和平台氛围主动调整结构和重点。\n` +
    `9. 如果从你们的专业判断看, 某些常规做法不适合当前项目, 可以在 Plan 中给出更有针对性的变体, 但仍需符合 Plan 的类型约束。\n\n` +
    `【输出格式要求】\n` +
    `- 只输出一个符合 Plan 结构的 JSON 对象。\n` +
    `- 不要输出任何额外说明文字。\n` +
    `- 字段名必须与 Plan 类型中的字段完全一致。\n`;

  return prompt;
};

const callModel = async (prompt: string): Promise<Plan> => {
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    throw new Error("OPENAI_API_KEY 未配置, 无法调用模型生成内容工作流计划");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "你是一个严格遵守输出 JSON 结构的内容编导助手。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`调用模型失败: ${text}`);
  }

  const json = (await res.json()) as {
    choices: { message?: { content?: string } }[];
  };

  const content = json.choices[0]?.message?.content;

  if (!content) {
    throw new Error("模型返回内容为空");
  }

  const data = JSON.parse(content) as unknown;
  const plan = schemaOutput.parse(data);

  return plan;
};

const main = async (): Promise<void> => {
  const server = new McpServer(
    {
      name: "idea-to-content-mcp",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.registerTool(
    "planContent",
    {
      description:
        "为给定平台(抖音/B站/小红书/YouTube Shorts/快手)和创作想法, 生成一个高质量的内容工作流计划: 项目卡片+平台指南+多条选题+每条的脚本与分镜。实现方式是通过精心设计的提示词调用大模型完成拆解, MCP 本身只做结构约束与结果校验, 以充分发挥大模型的理解与创造能力。",
      inputSchema: schemaInput,
      outputSchema: schemaOutput
    },
    async (input: ToolArgs) => {
      const data: IdeaInput = {
        platform: input.platform ?? "douyin",
        idea: input.idea,
        goal: input.goal,
        audience: input.audience,
        style: input.style
      };

      const prompt = buildPrompt(data);
      const plan = await callModel(prompt);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(plan, null, 2)
          }
        ],
        structuredContent: plan
      };
    }
  );

  const t = new StdioServerTransport();
  await server.connect(t);
};

void main();
