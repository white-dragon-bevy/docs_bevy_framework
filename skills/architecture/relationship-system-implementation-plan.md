# Relationship System 实现计划

## 📋 目标

完全按照 Rust Bevy 0.16 的 Relationship 系统实现 TypeScript 版本，包括：
- Relationship + RelationshipTarget Trait 设计
- Component Hooks 自动维护
- 延迟命令系统 (EntityCommands)
- 多种集合类型支持（1对多、1对1）
- linked_spawn 级联删除

## 🗂️ 文件结构

```
src/bevy_ecs/
├── relationship/
│   ├── index.ts                          # 导出所有公开 API
│   ├── relationship-source-collection.ts  # 集合接口和实现
│   ├── relationship.ts                    # Relationship 接口
│   ├── relationship-target.ts             # RelationshipTarget 接口
│   ├── define-relationship.ts             # defineRelationship 工厂函数
│   ├── entity-commands.ts                 # EntityCommands 封装
│   └── __tests__/
│       ├── relationship-source-collection.spec.ts
│       ├── one-to-many.spec.ts
│       ├── one-to-one.spec.ts
│       ├── linked-spawn.spec.ts
│       └── custom-relationship.spec.ts
├── component-hooks.ts                     # 扩展 RelationshipHookMode
└── hierarchy.ts                           # 迁移到新 API
```

---

## 📝 详细实现步骤

### 阶段 1: RelationshipSourceCollection 接口和集合类型

**文件**: `src/bevy_ecs/relationship/relationship-source-collection.ts`

**对应 Rust**: `bevy_ecs/src/relationship/relationship_source_collection.rs`

**核心接口**:
```typescript
/**
 * 关系源实体集合的抽象接口
 * 对应 Rust Bevy 的 RelationshipSourceCollection trait
 */
export interface RelationshipSourceCollection {
    /**
     * 添加实体到集合
     * @returns 是否成功添加（对于 Set 类型，重复添加返回 false）
     */
    add(entity: AnyEntity): boolean;

    /**
     * 从集合中移除实体
     * @returns 是否找到并移除
     */
    remove(entity: AnyEntity): boolean;

    /**
     * 迭代集合中的所有实体
     */
    iter(): IterableIterator<AnyEntity>;

    /**
     * 集合长度
     */
    len(): number;

    /**
     * 清空集合
     */
    clear(): void;

    /**
     * 是否为空
     */
    isEmpty(): boolean;

    /**
     * ⭐ 关键：1对1关系支持
     * 对于 1对1 关系，返回需要在添加新实体前移除的旧实体
     * 对于 1对多 关系，返回 undefined
     */
    sourceToRemoveBeforeAdd(): AnyEntity | undefined;

    /**
     * 批量添加
     */
    extendFromIter(entities: Iterable<AnyEntity>): void;
}
```

**实现的集合类型**:

1. **VecCollection** (1对多, 有序)
```typescript
export class VecCollection implements RelationshipSourceCollection {
    private entities: Array<AnyEntity> = [];

    sourceToRemoveBeforeAdd(): undefined {
        return undefined; // 允许多个
    }
    // ... 其他实现
}
```

2. **EntityCollection** (1对1)
```typescript
export class EntityCollection implements RelationshipSourceCollection {
    private entity: AnyEntity = 0 as AnyEntity;

    sourceToRemoveBeforeAdd(): AnyEntity | undefined {
        return this.entity !== (0 as AnyEntity) ? this.entity : undefined;
    }
    // ... 其他实现
}
```

3. **SetCollection** (1对多, 无序, 去重)
```typescript
export class SetCollection implements RelationshipSourceCollection {
    private entities: Set<AnyEntity> = new Set();
    // ... 实现
}
```

**预计时间**: 1 天

---

### 阶段 2: 延迟命令系统 (EntityCommands)

**文件**: `src/bevy_ecs/relationship/entity-commands.ts`

**对应 Rust**: `bevy_ecs/src/system/commands/mod.rs`

**核心设计**:
```typescript
/**
 * 实体命令构建器 - 链式调用 API
 * 对应 Rust Bevy 的 EntityCommands
 */
export class EntityCommands {
    constructor(
        private readonly commandBuffer: CommandBuffer,
        private readonly entity: AnyEntity,
    ) {}

    /**
     * 插入组件（替换现有组件）
     */
    insert<T extends AnyComponent>(component: T): this {
        this.commandBuffer.addComponent(this.entity, component);
        return this;
    }

    /**
     * 移除组件
     */
    remove<T>(componentType: ComponentCtor<T>): this {
        this.commandBuffer.removeComponent(this.entity, componentType);
        return this;
    }

    /**
     * 尝试移除组件（不存在时不报错）
     */
    tryRemove<T>(componentType: ComponentCtor<T>): this {
        this.commandBuffer.queue({
            type: "try_remove_component",
            entityId: this.entity,
            componentType,
        });
        return this;
    }

    /**
     * 销毁实体
     */
    despawn(): void {
        this.commandBuffer.despawn(this.entity);
    }

    /**
     * 尝试销毁实体（不存在时不报错）
     */
    tryDespawn(): void {
        this.commandBuffer.queue({
            type: "try_despawn",
            entityId: this.entity,
        });
    }

    /**
     * Entry API - 条件插入/修改组件
     */
    entry<T extends AnyComponent>(
        componentType: ComponentCtor<T>,
    ): ComponentEntry<T> {
        return new ComponentEntry(this.commandBuffer, this.entity, componentType);
    }

    /**
     * 获取实体 ID
     */
    id(): AnyEntity {
        return this.entity;
    }
}

/**
 * 组件条目 - 支持 and_modify / or_insert 模式
 */
export class ComponentEntry<T extends AnyComponent> {
    constructor(
        private readonly commandBuffer: CommandBuffer,
        private readonly entity: AnyEntity,
        private readonly componentType: ComponentCtor<T>,
    ) {}

    /**
     * 如果组件存在，执行修改
     */
    andModify(modifier: (component: T) => void): this {
        this.commandBuffer.queue({
            type: "modify_component",
            entityId: this.entity,
            componentType: this.componentType,
            modifier,
        });
        return this;
    }

    /**
     * 如果组件不存在，插入默认值
     */
    orInsert(component: T): void {
        this.commandBuffer.queue({
            type: "or_insert_component",
            entityId: this.entity,
            component,
        });
    }

    /**
     * 如果组件不存在，通过工厂函数插入
     */
    orInsertWith(factory: () => T): void {
        this.commandBuffer.queue({
            type: "or_insert_with_component",
            entityId: this.entity,
            componentType: this.componentType,
            factory,
        });
    }
}

/**
 * Commands 扩展 - 添加 entity() 方法
 */
export class Commands {
    constructor(private readonly commandBuffer: CommandBuffer) {}

    /**
     * 获取实体的命令构建器
     */
    entity(entityId: AnyEntity): EntityCommands {
        return new EntityCommands(this.commandBuffer, entityId);
    }

    /**
     * 获取实体的命令构建器（实体不存在时返回 undefined）
     */
    getEntity(entityId: AnyEntity): EntityCommands | undefined {
        // 在 flush 时检查实体是否存在
        return new EntityCommands(this.commandBuffer, entityId);
    }

    /**
     * 生成新实体
     */
    spawn(...components: AnyComponent[]): EntityCommands {
        const entityId = this.commandBuffer.spawn(...components);
        return new EntityCommands(this.commandBuffer, entityId);
    }

    /**
     * 添加通用命令
     */
    queue(command: Command): void {
        this.commandBuffer.queue(command);
    }
}
```

**扩展 CommandBuffer**:
```typescript
// 在 command-buffer.ts 中添加
export class CommandBuffer {
    // ... 现有代码

    /**
     * 获取 Commands 封装
     */
    commands(): Commands {
        return new Commands(this);
    }

    /**
     * 执行延迟命令（在 Hook 中使用）
     */
    queueDeferred(callback: (world: World) => void): void {
        this.queue({
            type: "deferred_callback",
            callback,
        });
    }
}
```

**预计时间**: 2 天

---

### 阶段 3: Relationship 和 RelationshipTarget 接口

**文件**:
- `src/bevy_ecs/relationship/relationship.ts`
- `src/bevy_ecs/relationship/relationship-target.ts`

**对应 Rust**: `bevy_ecs/src/relationship/mod.rs:76-317`

**Relationship 接口**:
```typescript
/**
 * 关系组件接口
 * 对应 Rust Bevy 的 Relationship trait
 */
export interface Relationship<TTarget extends RelationshipTarget<any>> {
    /**
     * 获取关系指向的目标实体
     */
    readonly entity: AnyEntity;

    /**
     * 对应的 RelationshipTarget 类型
     */
    readonly __relationshipTarget: TTarget;
}

/**
 * RelationshipTarget 接口
 * 对应 Rust Bevy 的 RelationshipTarget trait
 */
export interface RelationshipTarget<TRel extends Relationship<any>> {
    /**
     * 是否级联删除（linked_spawn）
     */
    readonly __linkedSpawn: boolean;

    /**
     * 对应的 Relationship 类型
     */
    readonly __relationship: TRel;

    /**
     * 存储源实体的集合
     */
    readonly collection: RelationshipSourceCollection;
}
```

**RelationshipHookMode 枚举**:
```typescript
// 在 component-hooks.ts 中添加
/**
 * 关系钩子模式
 * 对应 Rust Bevy 的 RelationshipHookMode
 */
export enum RelationshipHookMode {
    /** 总是运行关系钩子 */
    Run = "Run",
    /** 只在非 linked_spawn 时运行 */
    RunIfNotLinked = "RunIfNotLinked",
    /** 跳过关系钩子 */
    Skip = "Skip",
}

/**
 * 扩展 HookContext
 */
export interface HookContext {
    readonly hookType: HookType;
    readonly entity: AnyEntity;
    readonly isRecursive: boolean;

    // 新增：关系钩子模式
    readonly relationshipHookMode?: RelationshipHookMode;
}
```

**预计时间**: 1 天

---

### 阶段 4: defineRelationship 函数核心逻辑

**文件**: `src/bevy_ecs/relationship/define-relationship.ts`

**对应 Rust**: `bevy_ecs/src/relationship/mod.rs:101-167` (on_insert hook)

**核心实现**:
```typescript
/**
 * 定义关系类型的配置
 */
export interface DefineRelationshipConfig<TCollection extends RelationshipSourceCollection> {
    /**
     * 是否级联删除（默认 false）
     */
    linkedSpawn?: boolean;

    /**
     * 集合类型构造函数（默认 VecCollection）
     */
    collectionType?: new () => TCollection;
}

/**
 * 定义关系返回值
 */
export interface RelationshipPair<
    TRelData extends object,
    TTargetData extends object,
    TCollection extends RelationshipSourceCollection,
> {
    /**
     * 关系组件构造函数
     */
    relationship: ComponentCtor<Relationship<any> & TRelData>;

    /**
     * 目标组件构造函数
     */
    target: ComponentCtor<RelationshipTarget<any> & TTargetData>;
}

/**
 * 定义一个新的关系类型（Bevy 风格）
 *
 * @example
 * ```typescript
 * const { relationship: Likes, target: LikedBy } = defineRelationship(
 *     "Likes",
 *     "LikedBy"
 * );
 *
 * world.spawn(Likes({ entity: alice }));
 *
 * for (const [fan] of world.query(LikedBy)) {
 *     print(`Fan: ${fan}`);
 * }
 * ```
 */
export function defineRelationship<
    TRelData extends object = {},
    TTargetData extends object = {},
    TCollection extends RelationshipSourceCollection = VecCollection,
>(
    relationshipName: string,
    targetName: string,
    config?: DefineRelationshipConfig<TCollection>,
): RelationshipPair<TRelData, TTargetData, TCollection> {
    const linkedSpawn = config?.linkedSpawn ?? false;
    const CollectionType = config?.collectionType ?? VecCollection;

    // 创建关系组件
    const Rel = component<Relationship<any> & TRelData>(relationshipName);

    // 创建目标组件
    const Target = component<RelationshipTarget<any> & TTargetData>(targetName);

    // ========== 注册 Relationship 的 on_insert hook ==========
    registerComponentHook(Rel, {
        onAdd: (world, entity, rel, context) => {
            // 检查关系钩子模式
            const mode = context?.relationshipHookMode ?? RelationshipHookMode.Run;
            if (mode === RelationshipHookMode.Skip) {
                return;
            }
            if (mode === RelationshipHookMode.RunIfNotLinked && linkedSpawn) {
                return;
            }

            const targetEntity = rel.entity;

            // 1. 检测自引用
            if (targetEntity === entity) {
                warn(
                    `${relationshipName}(${targetEntity}) relationship on entity ${entity} points to itself. ` +
                    `The invalid ${relationshipName} relationship has been removed.`
                );
                world.commands.entity(entity).remove(Rel);
                return;
            }

            // 2. 检查目标实体是否存在
            if (!world.contains(targetEntity)) {
                warn(
                    `${relationshipName}(${targetEntity}) relationship on entity ${entity} ` +
                    `relates to an entity that does not exist. ` +
                    `The invalid ${relationshipName} relationship has been removed.`
                );
                world.commands.entity(entity).remove(Rel);
                return;
            }

            // 3. 对于 1对1 关系，移除旧关系
            const currentTarget = world.get(targetEntity, Target);
            const sourceToRemove = currentTarget?.collection.sourceToRemoveBeforeAdd();
            if (sourceToRemove !== undefined) {
                world.commands.entity(sourceToRemove).tryRemove(Rel);
            }

            // 4. 添加到 Target 集合（使用 entry API）
            const commands = world.commands;
            commands
                .entity(targetEntity)
                .entry(Target)
                .andModify((target) => {
                    target.collection.add(entity);
                })
                .orInsertWith(() => {
                    const collection = new CollectionType();
                    collection.add(entity);
                    return {
                        collection,
                        __linkedSpawn: linkedSpawn,
                        __relationship: Rel,
                    } as any;
                });
        },

        // ========== on_replace hook (on_drop) ==========
        onRemove: (world, entity, rel, context) => {
            const mode = context?.relationshipHookMode ?? RelationshipHookMode.Run;
            if (mode === RelationshipHookMode.Skip) {
                return;
            }
            if (mode === RelationshipHookMode.RunIfNotLinked && linkedSpawn) {
                return;
            }

            const targetEntity = rel.entity;
            const targetEntityMut = world.get(targetEntity, Target);

            if (targetEntityMut) {
                // 从集合中移除
                targetEntityMut.collection.remove(entity);

                // 如果集合为空，移除 Target 组件
                if (targetEntityMut.collection.isEmpty()) {
                    world.commands.queueDeferred((deferredWorld) => {
                        // 需要再次检查是否为空（可能在 flush 期间有新增）
                        const target = deferredWorld.get(targetEntity, Target);
                        if (target && target.collection.isEmpty()) {
                            deferredWorld.remove(targetEntity, Target);
                        }
                    });
                }
            }
        },
    });

    // ========== 注册 RelationshipTarget 的 on_replace hook ==========
    registerComponentHook(Target, {
        onRemove: (world, entity, target, context) => {
            const mode = context?.relationshipHookMode ?? RelationshipHookMode.Run;
            if (mode === RelationshipHookMode.Skip || mode === RelationshipHookMode.RunIfNotLinked) {
                return; // RelationshipTarget 的 hook 更严格
            }

            // 移除所有源实体的关系
            for (const sourceEntity of target.collection.iter()) {
                world.commands.entity(sourceEntity).tryRemove(Rel);
            }
        },
    });

    // ========== 注册 RelationshipTarget 的 on_despawn hook (linked_spawn) ==========
    if (linkedSpawn) {
        registerComponentHook(Target, {
            onDespawn: (world, entity, target) => {
                // 级联删除所有相关实体
                for (const sourceEntity of target.collection.iter()) {
                    world.commands.entity(sourceEntity).tryDespawn();
                }
            },
        });
    }

    return {
        relationship: Rel,
        target: Target,
    };
}
```

**预计时间**: 3 天

---

### 阶段 5: 迁移 hierarchy.ts

**文件**: `src/bevy_ecs/hierarchy.ts`

**迁移方案**:
```typescript
// 使用新的 defineRelationship API
import { defineRelationship, VecCollection } from "./relationship";

/**
 * 父子关系：ChildOf + Children
 */
export const { relationship: ChildOf, target: Children } = defineRelationship<
    { /* 额外数据 */ },
    { /* 额外数据 */ },
    VecCollection
>(
    "ChildOf",
    "Children",
    { linkedSpawn: true }
);

// 删除旧的 HierarchyUtils，使用原生 Bevy API
// world.spawn(ChildOf({ entity: parent }))
// world.get(parent, Children)
```

**兼容层**（可选）:
```typescript
/**
 * 兼容旧 API 的工具函数
 * @deprecated 请使用 world.spawn(ChildOf(...)) 代替
 */
export class HierarchyUtils {
    static setParent(world: World, child: AnyEntity, parent: AnyEntity): void {
        world.insert(child, ChildOf({ entity: parent }));
    }

    static getChildren(world: World, parent: AnyEntity): readonly AnyEntity[] {
        const children = world.get(parent, Children);
        return children ? Array.from(children.collection.iter()) : [];
    }
}
```

**预计时间**: 1 天

---

### 阶段 6: 单元测试

**测试文件结构**:
```
src/bevy_ecs/relationship/__tests__/
├── relationship-source-collection.spec.ts  # 集合类型测试
├── one-to-many.spec.ts                     # 1对多关系测试
├── one-to-one.spec.ts                      # 1对1关系测试
├── linked-spawn.spec.ts                    # 级联删除测试
├── self-reference.spec.ts                  # 自引用检测测试
├── invalid-target.spec.ts                  # 无效目标检测测试
└── hierarchy-migration.spec.ts             # hierarchy 迁移测试
```

**测试覆盖率目标**: ≥90%

**关键测试用例**:
1. 基础关系创建和自动同步
2. 1对1 关系的自动替换
3. linked_spawn 级联删除
4. 自引用检测和移除
5. 无效目标检测和移除
6. RelationshipHookMode 各模式
7. 批量操作（spawn_batch）
8. 循环依赖检测

**预计时间**: 3 天

---

### 阶段 7: 文档和示例

**文档文件**:
```
docs/
├── api/
│   └── relationship.md                # API 文档
├── guides/
│   └── relationship-system.md         # 使用指南
└── examples/
    ├── custom-relationship.md         # 自定义关系示例
    ├── one-to-one-relationship.md     # 1对1关系示例
    └── hierarchy-usage.md             # 层次系统使用
```

**示例代码**:
```typescript
// example: custom-relationship.ts
import { defineRelationship } from "bevy_ecs/relationship";

// 定义 Likes 关系
const { relationship: Likes, target: LikedBy } = defineRelationship(
    "Likes",
    "LikedBy"
);

// 使用
const alice = world.spawn();
const bob = world.spawn(Likes({ entity: alice }));
const charlie = world.spawn(Likes({ entity: alice }));

// 查询谁喜欢 Alice
const likedBy = world.get(alice, LikedBy);
if (likedBy) {
    for (const fan of likedBy.collection.iter()) {
        print(`Alice is liked by: ${fan}`);
    }
}
```

**预计时间**: 2 天

---

## 📅 时间估算

| 阶段 | 任务 | 预计时间 |
|------|------|---------|
| 1 | RelationshipSourceCollection | 1 天 |
| 2 | EntityCommands | 2 天 |
| 3 | Relationship 接口 | 1 天 |
| 4 | defineRelationship 实现 | 3 天 |
| 5 | hierarchy.ts 迁移 | 1 天 |
| 6 | 单元测试 | 3 天 |
| 7 | 文档和示例 | 2 天 |
| **总计** | | **13 天** |

考虑 Buffer 时间（调试、重构、代码审查）: **+3 天**

**最终估算**: **15-18 工作日（约 3 周）**

---

## 🎯 成功标准

### 功能完整性
- [ ] ✅ 支持 1对多关系（Vec/Set）
- [ ] ✅ 支持 1对1关系（Entity）
- [ ] ✅ 自动同步 Relationship 和 RelationshipTarget
- [ ] ✅ linked_spawn 级联删除
- [ ] ✅ 自引用检测
- [ ] ✅ 无效目标检测
- [ ] ✅ RelationshipHookMode 支持

### API 一致性
- [ ] ✅ 与 Rust Bevy 0.16 API 高度一致
- [ ] ✅ 类型安全的 TypeScript 实现
- [ ] ✅ 链式调用 API（EntityCommands）

### 测试覆盖率
- [ ] ✅ 单元测试覆盖率 ≥90%
- [ ] ✅ 所有 Rust 测试用例移植
- [ ] ✅ 无已知 Bug

### 文档完整性
- [ ] ✅ API 参考文档
- [ ] ✅ 使用指南
- [ ] ✅ 示例代码

---

## ⚠️ 风险与缓解

### 风险 1: TypeScript 类型推导限制
**缓解**: 使用泛型约束和类型辅助函数

### 风险 2: Matter ECS 的单线程限制
**缓解**: 使用延迟命令（CommandBuffer）模拟异步执行

### 风险 3: 现有代码的兼容性
**缓解**: 提供兼容层（HierarchyUtils）渐进式迁移

---

## 📚 参考资源

- [Rust Bevy 0.16 Relationship 源码](D:/projects/white-dragon-bevy/bevy_framework/bevy-origin/crates/bevy_ecs/src/relationship/)
- [Bevy Relationship 示例](D:/projects/white-dragon-bevy/bevy_framework/bevy-origin/examples/ecs/relationships.rs)
- [Matter ECS 文档](https://eryn.io/matter/)
