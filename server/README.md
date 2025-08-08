# Quoridor Server

Socket.IOを使用したQuoridorゲーム用サーバー

## サーバー起動方法

```bash
cd server
npm start
```

または開発モード（自動再起動）:
```bash
npm run dev
```

サーバーは `http://localhost:3001` で起動します。

## 機能

- ルーム作成・参加
- リアルタイムでの移動・壁配置の同期
- ゲーム状態管理
- 勝敗判定
- プレイヤー切断処理

## APIエンドポイント

- `GET /` - サーバー状態確認

## Socket.IOイベント

### クライアント → サーバー
- `create-room` - 新しいルーム作成
- `join-room` - ルーム参加
- `player-move` - プレイヤー移動
- `wall-placed` - 壁配置
- `reset-game` - ゲームリセット

### サーバー → クライアント
- `room-joined` - ルーム参加完了
- `player-move` - 他プレイヤーの移動通知
- `wall-placed` - 他プレイヤーの壁配置通知
- `game-state` - ゲーム状態更新
- `error` - エラー通知