# **Shigarami** - 依存関係互換性データベース

> **Effect-TS + Nix Store + MCP + HTTP API** で構築された、次世代の依存関係互換性管理システム

---

## 🚀 **プロジェクト概要**

`shigrami` は、JavaScript/TypeScript エコシステムの依存関係互換性を検証・管理するための包括的なツールです。

**特徴:**
- **インシデントグラフ**による複合条件の互換性検証
- **Nix Storeライク**なコンテンツアドレス可能なストレージ
- **Effect-TS**による型安全なアーキテクチャ
- **MCP (Model Context Protocol)** 対応のAIアシスタント連携
- **HTTP API**によるプログラム間連携

---

## 🏗️ **アーキテクチャ**

### **Effect-TSによる完全型安全アーキテクチャ**

```
shigrami (Effect-TS Core)
├── CLI Commands (Effect-TS)
│   ├── check-graph-effect     - インシデントグラフ検証
│   ├── stats-effect          - データベース統計
│   ├── search-effect         - 互換性データ検索
│   ├── export-effect         - データJSONエクスポート
│   ├── report-effect         - 互換性問題レポート
│   ├── resolve-effect        - 依存関係解決
│   ├── store-put-effect      - Nix Storeデータ保存
│   ├── store-get-effect      - Nix Storeデータ取得
│   ├── store-list-effect     - Nix Storeリスト表示
│   ├── store-stats-effect    - Nix Store統計表示
│   ├── fetch-compat          - リモートデータ取得
│   └── derivation-hash-effect - derivation hash計算
├── MCP Server (Effect-TS)
│   ├── search_compatibility tool
│   ├── get_compatibility_stats tool
│   └── report_compatibility_issue tool
├── Web Server (Effect-TS)
│   ├── GET /health - ヘルスチェック
│   ├── GET /stats  - 互換性統計
│   ├── GET /search - 互換性データ検索
│   └── POST /report - 問題レポートAPI
└── Core Services (Effect-TS)
    ├── CompatibilityDatabase
    ├── IncidenceGraphChecker
    └── NixStore
```

---

## 🎯 **主要技術**

### **Effect-TS (Type-Safe Functional Programming)**
```typescript
// 型安全なエラーハンドリング
export const checkGraphCommand = (
  options: CLIOptions,
): Effect.Effect<void, Error, FileSystem | IncidenceGraphChecker> =>
  Effect.gen(function* (_) {
    const fs = yield* _(FileSystem);
    const checker = yield* _(IncidenceGraphChecker);

    // 型安全なファイル読み込み
    const rulesContent = yield* _(fs.readFileString(rulesFile));
    const graph: IncidenceGraph = JSON.parse(rulesContent);

    // エラーハンドリング
    if (result.violations.length > 0) {
      yield* _(Console.error(`❌ Found ${result.violations.length} violations`));
      return yield* _(Effect.fail(new Error(`${result.violations.length} violations found`)));
    }

    yield* _(Console.log('✅ No compatibility violations found.'));
  });
```

### **インシデントグラフ (Hypergraph-based Compatibility)**
```json
{
  "meta": {
    "schema": 2,
    "name": "compat-incidence",
    "version": "2025.09.30",
    "source": "gh:org/compat-table",
    "envKey": "node20-linux-x64-glibc-2.35"
  },
  "v": {
    "packages": [
      {"id": "pkg:next@15"},
      {"id": "pkg:next-auth@5"},
      {"id": "pkg:react@>=18.2 <19"},
      {"id": "pkg:ts-node@<10.9.0"}
    ]
  },
  "e": [
    {"id": "rule:r1", "prio": 95, "reason": "Next15+NA5+TS5.5 ⇒ React18"}
  ],
  "i": [
    {"v": "pkg:next@15", "e": "rule:r1", "role": "ifAll"},
    {"v": "pkg:next-auth@5", "e": "rule:r1", "role": "ifAll"},
    {"v": "pkg:react@>=18.2 <19", "e": "rule:r1", "role": "then"}
  ]
}
```

### **Nix Storeライクなストレージ**
```typescript
// コンテンツアドレス可能なストレージ
const hash = yield* _(
  Effect.tryPromise({
    try: () => store.storeResult(derivation, result),
    catch: (e) => new Error(`Failed to store data: ${e}`),
  }),
);

// ハッシュによるデータ取得
const entry = yield* _(
  Effect.tryPromise({
    try: () => store.getResult(hash),
    catch: (e) => new Error(`Failed to retrieve data: ${e}`),
  }),
);
```

---

## 🛠️ **使用方法**

### **CLI使用例**

```bash
# 互換性チェック
shigrami check-graph-effect --rules-file data/compat-incidence-graph.json

# データベース統計
shigrami stats-effect

# 互換性検索
shigrami search-effect --framework next --status fail

# データエクスポート
shigrami export-effect compatibility-data.json

# 問題レポート
shigrami report-effect --framework next@15.0.0 --status fail --error "Peer deps conflict"

# Nix Store操作
shigrami store-put-effect    # データ保存
shigrami store-get-effect <hash>  # データ取得
shigrami store-list-effect   # 保存データ一覧
shigrami store-stats-effect  # ストア統計

# 依存関係解決
shigrami resolve-effect

# derivation hash計算
shigrami derivation-hash-effect --framework next --framework-version 15.0.0

# HTTPデータ取得
shigrami fetch-compat https://api.example.com/compatibility
```

### **Experimental Commands (`kaito`)**
`kaito` enables reproducible compatibility experiments.

```bash
# 新しい実験設定ファイルを作成
shigrami kaito new "My React 19 Experiment" --framework react@19.0.0 --lib next@15.0.0

# 設定ファイルを使って実験を実行し、結果を報告
shigrami kaito run -c "My-React-19-Experiment.kaito.json" --report

# 直接コマンドラインで実験を実行し、結果を報告
shigrami kaito run --framework next@15.0.0 --react 19.0.0 --lib next-auth@5.0.0-beta.4 --report

# 特定の実験ハッシュのレポートを手動で生成
shigrami kaito report <experiment-hash>
```

### **MCPサーバー起動**
```bash
shigrami mcp
# AIアシスタントが利用可能なツール:
# - search_compatibility
# - get_compatibility_stats
# - report_compatibility_issue
```

### **Web APIサーバー起動**
```bash
shigrami dashboard --port 3000
# 利用可能なエンドポイント:
# GET  /health - ヘルスチェック
# GET  /stats  - 互換性統計
# GET  /search - データ検索
# POST /report - 問題レポート
```

---

## 🔬 **インシデントグラフ検証アルゴリズム**

1. **頂点 V**: パッケージ・環境・バージョン制約
2. **辺 E**: 互換性ルール（ハイパーエッジ）
3. **入接関係 I**: 役割付き接続 (`ifAll`/`ifAny`/`then`/`thenNot`/`scope`)

**線形時間検証 O(|I|):**
```typescript
// 各ルールについて
for (const rule of graph.e) {
  // 1. スコープチェック
  if (!scopeMatches(envKey)) continue;

  // 2. 前提条件チェック (ifAll/ifAny)
  const ifAllMet = ifAll.every(v => packageMatches(v));
  const ifAnyMet = ifAny.length === 0 || ifAny.some(v => packageMatches(v));

  if (!ifAllMet || !ifAnyMet) continue;

  // 3. 結論チェック (then/thenNot)
  if (!satisfiesThen()) {
    violations.push({ rule: rule.id, violation: details });
  }
}
```

---

## 📊 **データモデル**

### **互換性問題 (CompatibilityIssue)**
```typescript
interface CompatibilityIssue {
  id: string;                    // 一意ID (ハッシュ生成)
  framework: string;            // フレームワーク名
  version: string;              // フレームワークバージョン
  react?: string;               // Reactバージョン
  node?: string;                // Node.jsバージョン
  packageManager?: string;      // パッケージマネージャ
  libs?: Record<string, string>; // 追加ライブラリ
  status: 'pass' | 'fail' | 'warn'; // 互換性ステータス
  error?: string;               // エラーメッセージ
  workaround?: string;         // 回避策
  reportedAt: string;          // 報告日時
  verified: boolean;           // 検証済みフラグ
  source: 'manual' | 'api' | 'mcp'; // 報告元
}
```

### **Derivation (Nixライク)**
```typescript
interface CompatibilityDerivation {
  framework: { name: string; version: string };
  react?: string;
  node?: string;
  packageManager?: string;
  libraries?: Record<string, string>;
  environment?: {
    os?: string;
    arch?: string;
    timeout?: number;
  };
  testScript: string;
}
```

---

## 🧪 **テスト・検証**

### **動作確認済み機能**
- ✅ Effect-TS CLIコマンド (12個)
- ✅ MCPサーバー (3つのツール)
- ✅ Webサーバー (4つのエンドポイント)
- ✅ インシデントグラフ検証
- ✅ Nix Storeライクストレージ
- ✅ 型安全なエラーハンドリング
- ✅ `kaito`コマンド (実験の実行、設定ファイルの生成、結果報告)

### **テスト実行例**
```bash
# 互換性違反の検出
$ node dist/index.js check-graph-effect --rules-file data/compat-incidence-graph.json
🔎 Running incidence graph check for project at: /path/to/project
   Found 6 total dependencies.
   Using environment key: env:node20-linux-x64-glibc-2.35

❌ Found 2 compatibility violation(s):
{
  "violations": [
    {
      "rule": "rule:r1",
      "because": { "ifAll": ["pkg:next@15", "pkg:next-auth@5", "pkg:typescript@5.5.x"] },
      "found": "react@19.0.0",
      "suggest": [],
      "prio": 95
    }
  ]
}
```

---

## 🎯 **設計原則**

### **SOLID原則の適用**
- **Single Responsibility**: 各サービスが単一責任
- **Open/Closed**: 新しい検証ルール追加が容易
- **Liskov Substitution**: インターフェース実装の互換性
- **Interface Segregation**: 最小限のインターフェース
- **Dependency Inversion**: 高レベルモジュールが低レベルに依存しない

### **Merkle DAGアーキテクチャ**
```
story.jsonnet (Root)
├── data.jsonnet (Data Layer)
├── cli.jsonnet (CLI Layer)
├── mcp.jsonnet (MCP Layer)
├── web.jsonnet (Web Layer)
└── store.jsonnet (Storage Layer)
```

---

## 🚀 **今後の拡張**

### **Phase 1: コアルール拡張**
- [ ] より多くのフレームワーク互換性ルール追加
- [ ] CI/CD統合による自動検証
- [ ] コミュニティコントリビューション体制

### **Phase 2: 分散アーキテクチャ**
- [ ] 複数ノード間でのストア同期
- [ ] P2Pネットワークによるデータ共有
- [ ] ブロックチェーンによる改ざん検知

### **Phase 3: AI統合強化**
- [ ] MCPツールの高度化
- [ ] 機械学習による互換性予測
- [ ] 自動ワークアラウンド提案

---

## 🤝 **コントリビューション**

### **開発環境構築**
```bash
git clone https://github.com/junkawasaki/shigrami.git
cd shigrami
npm install
npm run build
```

### **テスト実行**
```bash
npm test
npm run check:graph  # クイック互換性チェック
```

### **Issue報告**
- **バグ**: GitHub Issuesで詳細報告
- **機能要望**: 明確なユースケースとともに
- **互換性問題**: `shigrami report-effect` で直接報告

---

## 📄 **ライセンス**

Apache License 2.0

---

**「依存関係の地雷を踏まない世界へ」** - shigaramiは、開発者の時間を節約し、より良いソフトウェアを構築するためのツールです。

*Built with Effect-TS, inspired by Nix, powered by functional programming.* 🚀