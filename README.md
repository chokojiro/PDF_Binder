### 目的
ブラウザ上でPDFの結合・分割を直接行えるアプリです。サーバーは不要で、すべての処理はユーザーのデバイス内で完結します。

---

### 要件
- **クライアントサイド完結**: サーバーとの通信は不要。PDFの処理はすべてブラウザ上で実行します。
- **ファイル入力**: ローカルPCからのファイル選択に加え、Google Driveからの直接読み込みに対応します。
- **PDF結合**: 複数のPDFファイルを結合し、1つのPDFとしてダウンロード。ドラッグ&ドロップで結合順序を変更できます。
- **PDF分割**: 1つのPDFを指定したページ範囲やページ単位で分割し、個別のPDFとしてダウンロードします。
- **開発環境**: **GitHub Codespaces**を利用し、ブラウザだけで開発から公開までを完結させます。
- **公開方法**: **GitHub Pages**を使用してウェブアプリとして公開します。

---

### 技術構成
- **開発**: GitHub Codespaces
- **公開**: GitHub Pages
- **フロントエンド**: **HTML, CSS, JavaScript**
- **PDF処理ライブラリ**: **PDF-lib.js** (PDFの結合・分割機能) および **PDF.js** (PDFのプレビュー機能)
<!-- - **Google Drive連携**: **Google Identity Services ライブラリ**を使用して、Google Drive APIへのアクセスを実装します。 -->

---

### アプリケーションのファイル構成
- `index.html`: アプリのUIを構成するメインファイルです。
- `style.css`: UIの見た目を整えるためのCSSファイルです。
- `script.js`: PDFの処理ロジック、Google Drive連携、UIイベント処理など、アプリの核心となるJavaScriptコードです。
- `lib/`: 外部ライブラリを配置するディレクトリ。ここに `pdf-lib.min.js` と `pdf.min.js` を格納します。


### to Do
必須機能の実装
<!-- Google Drive連携の実装 📍
Google Cloud PlatformでAPIキーとクライアントIDを取得する。
取得したキーをscript.tsに設定する。
google-drive-pickerボタンがクリックされた際に、Googleの認証フローを開始し、ファイルピッカーを表示するロジックを実装する。
ピッカーで選択されたファイルをダウンロードし、handleFiles関数に渡す処理を記述する。 -->

GitHub Pagesへの公開 🚀

開発が完了したコードをGitHubリポジトリにプッシュする。
リポジトリの Settings > Pages から、main（またはmaster）ブランチをソースとして選択し、サイトを公開する。

