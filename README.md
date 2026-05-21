# 车辆资产盘点照片归档工具

一个可直接部署到 GitHub Pages 的静态车辆资产盘点照片归档工具。

## 功能

- 保留原站 UI 和归档流程
- 上传每台车的车架号、车牌号、车身侧面 3 张照片
- 选择归档根目录后自动创建分类文件夹并重命名归档
- 支持车辆信息库、批量文件夹处理和归档历史
- 支持可选视觉大模型 API 识别 VIN，未配置或调用失败时自动回退本地 OCR
- 本地 OCR 使用多轮图像预处理、VIN 字符白名单和校验位排序，提高车架号提取稳定性

## 本地预览

```bash
python -m http.server 5173
```

打开 `http://localhost:5173`。

## 部署

将 `index.html`、`车辆资产盘点工具.html` 和 `README.md` 推送到 GitHub Pages 仓库即可。

## 部署

把 `index.html`、`styles.css`、`app.js` 推送到 GitHub Pages 对应仓库即可。
