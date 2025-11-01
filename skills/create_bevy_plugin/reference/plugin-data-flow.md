# **Bevy 插件数据流文档格式规范**

## **1. 目的**

为确保项目中所有 white-dragon-bevy 插件都具备清晰、统一和易于理解的数据流文档，特此制定本规范。遵循此规范有助于降低模块间的沟通成本，加速新成员的上手速度，并使系统架构一目了然。

所有插件的开发者在完成功能开发后，都应按照此规范撰写对应的数据流 .md 文档。

## **2. 规范格式模板**

请复制以下 Markdown 模板，并替换其中的占位符内容。

```markdown
# [插件名] 插件 数据流

## 核心公共接口 (Contracts)

**消息 (Message)** - [消息A]: [消费/生产], [用途简述]  
- [消息B]: [消费/生产], [用途简述]

**事件 (Event)** - [事件A]: [消费/生产],[用途简述]  
- [事件B]: [消费/生产],[用途简述]

**组件 (Component)** - [组件A]: [用途简述]  
- [组件B]: [用途简述]

## 数据流说明 (Data Flow Description)

**主流程 ([流程名])** 1. **[[系统A]]** ([Schedule Timing], [Authority/RunIn]): [行为描述，说明监听了什么消息或条件]。
2. **[[系统B]]** ([Schedule Timing], [Authority/RunIn]): [行为描述，说明修改了什么组件或生产了什么新消息]。

**流程二 ([流程名])** 1. **[[系统C]]** ([Schedule Timing], [Authority/RunIn]): [行为描述]。
2. **[[系统D]]** ([Schedule Timing], [Authority/RunIn]): [行为描述]。

## 测试契约 (Test Fixture Contract)

**初始化要求 (Initialization Requirement)** - [要求A]: [描述运行该插件功能的最小 ECS 状态或环境要求]。
- [要求B]: [描述所需的核心依赖插件]。

**关键断言 (Key Assertions)** - [断言A]: [输入 X 后，期待组件 Y 变为 Z]。
- [断言B]: [输入 A 后，期待生产 B 消息/事件]。
```

## **3. 各部分说明**

### **3.1 核心公共接口 (Contracts)**

此部分定义了插件的“公共API”，即它如何与外部世界交互。

  * **消息 (Message)**:
      * **消费**: 表示该插件会**监听并处理**这类消息。这是插件的**输入**。
      * **生产**: 表示该插件的系统会**创建并发送**这类消息。这是插件的**输出**。
  * **组件 (Component)**:
      * 只列出该插件**核心维护**的，或希望**暴露给其他插件查询**的组件。

### **3.2 数据流说明 (Data Flow Description) （核心修改区域）**

此部分是核心，它清晰地描述了数据是如何在插件内部的各个系统间流转的。

  * **流程**: 每个独立的业务逻辑都应作为一个独立的流程进行说明（如：Buff添加、Buff移除）。
  * **步骤**:
      * 每个步骤都必须以 **\[\[系统名\]\]** 开头，明确指出是哪个 System 在执行该操作。
      * **调度时机 (Schedule Timing)**：使用括号注明系统被安排在哪个 Bevy Schedule 中运行。
          * **取值示例**: `PreUpdate`, `Update`, `PostUpdate`, `FixedUpdate` 或插件自定义的 Schedule。
      * **网络权限 (Authority / RunIn)**：使用括号注明该系统在哪种网络环境中运行。
          * **取值示例**: `ServerOnly`, `ClientOnly`, `Both`。
      * 行为描述应简洁明了，说明该系统“做了什么”，例如“监听 XXXMessage”或“修改 YYYComponent”。


## **4. 优秀示例：Buff 插件（已完全更新）**

以下是 buff-plugin 遵循本规范撰写的范例，已包含**调度时机 (Schedule Timing)**、**网络权限 (Authority / RunIn)** 和**测试契约 (Test Fixture Contract)**，可供参考。

```markdown
# Buff 插件 数据流

## 核心公共接口 (Contracts)

**消息 (Message)**

* ApplyBuffMessage: 消费, 触发新增/刷新Buff业务
* RemoveBuffMessage: 消费, 触发移除Buff业务
* DamageMessage: 生产
* HealMessage: 生产

**组件 (Component)**

* BuffComponent: 内部维护所有Buff状态
* DirtyBuffComponent (Marker): 标记 BuffComponent 需要同步给客户端

## 数据流说明 (Data Flow Description)

**主流程 (Buff效果触发与应用)**

1. **[[apply_buff_system]]** (Update, ServerOnly): 监听 ApplyBuffMessage，为目标实体添加/更新 BuffComponent 内的状态，并附带 DirtyBuffComponent 标记。
2. **[[buff_tick_system]]** (FixedUpdate, ServerOnly): 在 FixedUpdate 轮询 BuffComponent，检查 Buff 效果（如 dot/hot），生产 DamageMessage 或 HealMessage。

**流程二 (Buff持续时间管理)**

1. **[[update_buff_duration_system]]** (Update, ServerOnly): 轮询所有 BuffComponent，检查其持续时间。如果到期，移除该 Buff，并更新 DirtyBuffComponent 标记。
2. **[[remove_buff_system]]** (Update, ServerOnly): 监听 RemoveBuffMessage，直接移除目标实体 BuffComponent 中指定的 Buff，并更新 DirtyBuffComponent 标记。

**流程三 (属性修饰计算)**

1. **[[recalculate_stat_modifier_system]]** (PostUpdate, ServerOnly): 监听 BuffComponent 的变动。根据 BuffComponent 的数据，实时计算并更新 **StatsModifierResource**（一个 Resource）。
2. **[[replication_system]]** (Last, ServerOnly): 读取 DirtyBuffComponent 标记的实体，将 BuffComponent 数据同步给所有客户端，完成后移除 DirtyBuffComponent。
