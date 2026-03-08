# CyberHamster
## 项目开发规范与架构文档：Node-Based Media Processing Pipeline

### 一、 项目概述

本项目，CyberHamster，是一个用于批量压缩、精简图片和视频文件的自动化桌面/本地网络服务工具。
系统采用 **有向无环图 (DAG) 的节点式管道架构**，允许用户通过前端可视化连线配置处理逻辑。本项目特色功能是支持利用文件元数据进行状态追踪和防重复执行，而不是完全依赖管理数据库。
引擎在处理一个文件前，除了在软件本身数据库读取已处理的标记以外，还支持不依赖数据库的元数据方式。首先读取元数据。如果文件符合特定条件（如压缩率不达标撤销操作），则在原文件的 XMP 中写入自定义标签。下次扫描到该文件时，读取到此标记则直接跳过。


### 二、 技术栈选型

* **前端 (Frontend)**: Angular + TypeScript
* **节点可视化DAG 框架**: [Rete.js](https://retejs.org/) 
* **UI 组件库**: [ng-zorro](https://ng.ant.design)。


* **后端 (Backend & Execution)**: Python 3.10+
* **Web 框架**: FastAPI (提供 RESTful API，轻量、异步，并负责提供静态前端页面代理)。
* **核心引擎**: 自建 Python DAG 执行器。
* **数据库**: 使用SQLite


* **底层处理依赖 (CLI Tools)**:
* 图片处理: `ImageMagick` 或 `libavif`。
* 视频/音频处理: `FFmpeg`。
* 元数据读写: `ExifTool`。



### 三、 核心系统架构设计

#### 1. Python 后端职责

* **静态文件托管**: FastAPI 挂载 Angular 编译后的 `dist` 目录，通过浏览器访问。
* **API 接口**: 在/api/路径下提供ajax接口和前台交互。
* **任务调度**: 扫描或者监视目标文件夹，将符合条件的文件加入队列。
* **DAG 执行引擎**:
* 解析 JSON 格式的节点图。
* 维护一个上下文对象，包含当前文件元数据、当前工作目录等。
* 按照拓扑排序执行节点（调用ffmpeg等），根据条件节点的布尔返回值决定后续分支。
* 插件/模块系统：可扩展性的灵魂，支持新增节点类型	
* **配置管理**: 将节点配置、软件设置、文件标记等信息保存到SQLite数据库

#### 2. Angular 前端职责

* **工作流编辑器**: 使用 Rete.js 渲染拖拽节点。节点包括：
* `Input Node` (指定扫描目录和后缀过滤)。
* `Action Node` (执行具体 FFmpeg/ImageMagick 命令、写入标记)。
* `Condition Node` (评估大小、读取元数据判断)。
* `Output Node` (覆盖原文件、丢弃临时文件)。

* **控制台面板**: 实时通过 WebSocket (FastAPI WebSockets) 接收后端的处理日志和进度，并渲染在前端页面上。
* **软件设置**: 调整软件的选项。


#### 日常场景 1 的节点映射 (JPG 转 AVIF 并检查)

前端将生成以下 JSON 拓扑图传递给后端：

1. **ReadInputNode**: 扫描 `.jpg`，读取元数据。如果元数据包含 `Processed=True`，结束。
2. **ConvertNode**: 调用图片工具，将 `current_file_path` 转换为 `.avif`，输出到系统临时目录，更新 `current_file_path`。
3. **CalculateCompressionNode**: 计算 `(临时文件大小 / original_size)`，将结果存入上下文。
4. **ConditionNode (阈值判断)**: 判断压缩率 `< 0.80`？
* **True 分支** -> **FileOperationNode (替换)**: 将临时文件移动并覆盖原文件，原文件扩展名更改。
* **False 分支** -> **FileOperationNode (清理)**: 删除临时 AVIF。 -> **MetadataWriteNode**: 调用 `ExifTool`，向原 JPG 写入 `XMP:ProcessingStatus="LowCompression_Skipped"`。



#### 日常场景 2 的节点映射 (MP4 音频精简)

1. **ReadInputNode**: 扫描 `.mp4`。
2. **FFmpegActionNode**:
* 输入参数模板：`-map 0:v -map 0:a:0 -c:v copy -c:a aac -b:a 128k`
* 后端执行此命令，输出至临时文件。
3. **FileOperationNode**: 用临时文件覆盖原 `.mp4` 文件。
4. **MetadataWriteNode**: 写入元数据标记 `Processed=True`，防止二次压制。

---

### 五、 阶段实施建议 (Phases of Development)

1. **Phase 1: 核心执行引擎与底层封装 (Python)**
* 编写 `FileContext` 类。
* 封装对 `ffmpeg`、`exiftool` 的 `subprocess` 调用，确保能捕获 stdout 日志。
* 使用场景 1 和场景 2 的 DAG 逻辑设计和编写执行引擎规则，并做成单元测试，确保执行逻辑走通。


2. **Phase 2: 后端服务化 (FastAPI)**
* 搭建 FastAPI 框架，编写处理 JSON 管道数据的解析器，将其转化为后端的 Node 实例连线。
* 建立 WebSocket 频道用于推送终端标准输出日志。


3. **Phase 3: 前端可视化 (Angular + Rete.js)**
* 初始化 Angular 项目。
* 集成 Rete.js，定义 `Input`, `Command`, `Condition` 几种基础可视节点。
* 实现加载和保存DAG并和FastAPI后端交互的功能。