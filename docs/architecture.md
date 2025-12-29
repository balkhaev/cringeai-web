# Архитектура Trender

## Общая схема системы

```mermaid
graph TB
    subgraph Client["Frontend (Next.js :3000)"]
        WEB[Web App]
    end

    subgraph Server["Backend (Hono :3001)"]
        API[REST API Routes]
        WS[WebSocket]

        subgraph Workers["BullMQ Workers"]
            SW[Scrape Worker]
            PW[Pipeline Worker]
            VW[Video Gen Worker]
            SCW[Scene Gen Worker]
        end
    end

    subgraph Python["Python Services"]
        SCRP[Scrapper :8001<br/>Instaloader]
        VF[Video-Frames :8002<br/>FFmpeg + PySceneDetect]
    end

    subgraph Infrastructure["Infrastructure (Docker)"]
        PG[(PostgreSQL)]
        RD[(Redis)]
        S3[(MinIO S3)]
    end

    subgraph External["External APIs"]
        GEM[Google Gemini<br/>AI Analysis]
        KLING[Kling AI<br/>Video Generation]
        GPT[OpenAI<br/>Prompt Enhancement]
    end

    WEB <-->|HTTP/WS| API
    WEB <-->|Real-time| WS

    API --> RD
    API --> PG

    SW --> SCRP
    SW --> S3
    PW --> VF
    PW --> GEM
    VW --> KLING
    VW --> GPT
    VW --> S3
    SCW --> KLING
    SCW --> S3

    Workers --> RD
    Workers --> PG
```

## Потоки данных

### 1. Скачивание и анализ рила

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Server
    participant R as Redis Queue
    participant SC as Scrapper
    participant VF as Video-Frames
    participant G as Gemini AI
    participant S3 as MinIO
    participant DB as PostgreSQL

    C->>A: POST /api/reels (URL)
    A->>DB: Create Reel (status: scraped)
    A->>R: Add to SCRAPE_QUEUE
    A-->>C: 202 Accepted

    R->>SC: Job: download video
    SC->>SC: Instaloader download
    SC-->>R: Video bytes

    R->>S3: Upload video
    R->>DB: Update Reel (status: downloaded)
    R->>R: Add to PIPELINE_QUEUE

    R->>VF: Detect scenes
    VF->>VF: PySceneDetect
    VF-->>R: Scene timestamps

    R->>G: Analyze video
    G-->>R: Elements JSON

    R->>DB: Create Template + VideoAnalysis
    R->>DB: Update Reel (status: analyzed)
    R-->>C: WebSocket: analysis complete
```

### 2. Генерация видео

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API Server
    participant R as Redis Queue
    participant GPT as OpenAI
    participant K as Kling AI
    participant S3 as MinIO
    participant DB as PostgreSQL

    C->>A: POST /api/generate
    A->>DB: Create VideoGeneration (pending)
    A->>R: Add to VIDEO_GEN_QUEUE
    A-->>C: 202 + generationId

    R->>GPT: Enhance prompt
    GPT-->>R: Improved prompt
    R->>DB: Update (status: enhancing)

    R->>K: Start generation task
    K-->>R: taskId
    R->>DB: Update (status: processing)

    loop Poll until complete
        R->>K: Check status
        K-->>R: Progress %
        R-->>C: WebSocket: progress
    end

    K-->>R: Video URL
    R->>S3: Upload result
    R->>DB: Update (status: completed)
    R-->>C: WebSocket: done
```

## Система очередей

```mermaid
graph LR
    subgraph Queues["Redis Queues (BullMQ)"]
        SQ[SCRAPE_QUEUE<br/>Download Instagram]
        PQ[PIPELINE_QUEUE<br/>Analyze video]
        VQ[VIDEO_GEN_QUEUE<br/>Full video gen]
        SCQ[SCENE_GEN_QUEUE<br/>Scene-by-scene]
    end

    subgraph Actions["Pipeline Actions"]
        D[download]
        A[analyze]
        AF[analyze-frames]
        AS[analyze-scenes]
    end

    SQ --> PQ
    PQ --> D
    PQ --> A
    PQ --> AF
    PQ --> AS

    A --> VQ
    AS --> SCQ
```

## Модель данных

```mermaid
erDiagram
    Reel ||--o| Template : has
    Template ||--o| VideoAnalysis : has
    VideoAnalysis ||--o{ VideoGeneration : generates
    VideoAnalysis ||--o{ VideoScene : contains
    VideoAnalysis ||--o{ VideoElement : contains
    VideoScene ||--o{ SceneGeneration : generates
    VideoElement ||--o{ ElementAppearance : appears_in

    Reel {
        string id PK
        string url
        string s3Key
        string status
    }

    Template {
        string id PK
        string reelId FK
        string analysisId FK
    }

    VideoAnalysis {
        string id PK
        json elements
        boolean hasScenes
        int scenesCount
    }

    VideoGeneration {
        string id PK
        string analysisId FK
        string status
        string s3Key
        string klingTaskId
    }

    VideoScene {
        string id PK
        float startTime
        float endTime
    }
```

## Компоненты и порты

| Сервис | Порт | Технология | Назначение |
|--------|------|------------|------------|
| web | 3000 | Next.js 16 | Frontend UI |
| server | 3001 | Hono | REST API + Workers |
| scrapper | 8001 | FastAPI | Instagram download |
| video-frames | 8002 | FastAPI | Video processing |
| PostgreSQL | 5432 | - | Database |
| Redis | 6379 | - | Queue broker |
| MinIO | 9000/9001 | - | S3 storage |

## Статусы

### Reel
```
scraped → downloading → downloaded → analyzing → analyzed
                                  ↘ failed
```

### VideoGeneration
```
pending → enhancing → processing → downloading → uploading → completed
                                            ↘ failed
```
