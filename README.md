# puyo-game

ブラウザで遊べる最大4人対戦のぷよぷよです。

## 機能

- 最大4人のリアルタイムオンライン対戦
- ルームコードを共有するだけで手軽に参加
- チェーンを決めるとおじゃまぷよが他の全プレイヤーに送られる
- 最後まで生き残ったプレイヤーの勝利

## 操作方法

| キー | 操作 |
|------|------|
| ← → | 左右移動 |
| ↓ | ソフトドロップ |
| Space | ハードドロップ |
| Z | 左回転 |
| X | 右回転 |

## ローカルで動かす

ターミナルを2つ開いて実行してください。

```bash
# ターミナル1: WebSocketサーバー
npx partykit dev

# ターミナル2: Next.jsサーバー
npm run dev
```

`http://localhost:3000` をブラウザの複数タブで開くとマルチ対戦を試せます。

## 技術スタック

- [Next.js 16](https://nextjs.org/) — フロントエンド
- [Partykit](https://www.partykit.io/) — WebSocketサーバー（ルーム管理・おじゃま中継）
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)

## デプロイ

```bash
# PartykitサーバーをVercelとは別にデプロイ
npx partykit deploy

# .env.local を本番のPartykitホストに更新
NEXT_PUBLIC_PARTYKIT_HOST=multi-puyo.<your-username>.partykit.dev

# VercelにNext.jsをデプロイ
vercel --prod
```
